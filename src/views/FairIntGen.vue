<template>
    <div class="my-10">
        <h1 class="my-5 text-center text-3xl">Fair Integer Generation Request</h1>

        <!-- 进度条 -->
        <el-steps :active="activeStep" finish-status="success">
            <el-step v-for="number in totalStep" :key="number" @click.native="toStep(number - 1)"></el-step>
        </el-steps>

        <!-- 表格展示 -->
        <div class="table-container relative mt-10">
            <el-table :data="datas[activeStep]">
                <el-table-column prop="role" label="role">
                    <template #default="{ row }">
                        <span class="">{{ row.role }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="randomNum" label="randon num">
                    <template #default="scope">
                        <!-- 条件为false时就正常显示文本 -->
                        <input type="text" v-if="scope.row.role === 'appliacnt'" v-model="scope.row.randomNum" />
                    </template>
                </el-table-column>
                <el-table-column prop="executionTime" label="execution time" placeholder=""></el-table-column>
                <el-table-column prop="r" label="r"></el-table-column>
                <el-table-column prop="hash" label="hash"></el-table-column>
                <el-table-column prop="status" label="status"></el-table-column>
            </el-table>
            <!-- <div class="absolute -bottom-16 right-0">
                <el-button type="primary" @click="uploadHash" class="mr-5" size="large">生成随机数并上传hash</el-button>
                <el-button type="success" @click="uploadRandomNum" size="large">上传随机数</el-button>
            </div> -->
        </div>

        <!-- 控制按钮 -->
        <div class="mt-10">
            <el-button @click="prev" :disabled="activeStep === 0" size="large">上一步</el-button>
            <el-button type="primary" @click="next" :disabled="activeStep === totalStep" size="large">下一步</el-button>
            <div class="float-right">
                <el-button type="primary" @click="uploadHashAndListen" class="mr-5" size="large"
                    >生成随机数并上传hash</el-button
                >
                <el-button type="success" @click="uploadRandomNum" size="large">上传随机数</el-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getCurrentBlockTime, getFairIntGen } from '@/ethers/contract';
import FiContractInteract from '@/ethers/fairIntGen';
import { provider } from '@/ethers/provider';
import { listenReqNum, listenResHash, stopableListenResNum } from '@/ethers/timedListen';
import { generateRandomBytes, getHash, getRandom } from '@/ethers/util';
import { useLoginStore } from '@/stores/modules/login';
import { Wallet } from 'ethers';
import { storeToRefs } from 'pinia';
import { onBeforeMount, onMounted, reactive, readonly, ref, watch, watchEffect } from 'vue';

// 定义一个接口来描述表格中的每一项
interface DataItem {
    role: string;
    randomNum: number | string;
    executionTime: number | string;
    r: string;
    hash: string;
    status: string;
    dataIndex: number | null;
}
let datas = reactive<DataItem[][]>([]); // 表格数据项, 在挂载之前赋值
const popoverVisible = ref(true);
const loginStore = useLoginStore();
const { chainLength, accountInfo, validatorAccount, sendInfo } = loginStore;

const totalStep = chainLength + 3;

// 页数跳转
const activeStep = ref(0);
function toStep(number: number) {
    activeStep.value = number;
}
function next() {
    if (activeStep.value < totalStep) {
        activeStep.value++;
    }
}
function prev() {
    if (activeStep.value > 0) {
        activeStep.value--;
    }
}

// hash上传
const currentStep = ref(0); // 当前正在和谁交互
async function uploadHashAndListen() {
    // 选择使用哪个账号上传hash, 和谁交互
    let { key: privateKey, address: addressA } = accountInfo.selectedAccount[currentStep.value];
    let addressB = validatorAccount;
    console.log(addressB);
    // 创建合约实例
    const readOnlyFair = await getFairIntGen();
    const wallet = new Wallet(privateKey, provider);
    let writeFair = readOnlyFair.connect(wallet);

    await getCurrentBlockTime();

    // 生成随机数
    let result = await writeFair.getReqExecuteTime(addressB);
    let tA = result[0].toNumber();
    let tB = result[1].toNumber();
    let dataIndex = result[2].toNumber(); // 插入位置的下标
    let { ni, ri, hash } = getRandom(tA, tB);
    datas[currentStep.value][0].executionTime = tA;
    datas[currentStep.value][1].executionTime = tB;
    datas[currentStep.value][0].hash = hash;
    datas[currentStep.value][0].r = ri;
    datas[currentStep.value][0].randomNum = ni;
    datas[currentStep.value][0].dataIndex = dataIndex;
    datas[currentStep.value][0].status = 'hash正在上传';

    //上传hash
    await writeFair.setReqHash(addressB, hash);
    datas[currentStep.value][0].status = 'hash已上传';

    // 开启监听
    // 使用封装的函数
    const hashPromise = listenResHash(addressA, addressB);
    const { p: numPromise, rejectAndCleanup } = await stopableListenResNum(addressA, addressB);

    // 同时监听hash和随机数
    hashPromise
        .then((resHash) => {
            datas[currentStep.value][1].hash = resHash.infoHashB;
            datas[currentStep.value][1].status = 'hash已上传';
        })
        .catch((error) => {
            // hashPromise失败，就停止numPromise
            datas[currentStep.value][1].status = '未在30s内上传hash';
            console.log(error);
            rejectAndCleanup('hash not upload');
        });

    numPromise
        .then((resNum) => {
            let { ni, ri, t } = resNum;
            datas[currentStep.value][1].randomNum = ni;
            datas[currentStep.value][1].r = ri;
            datas[currentStep.value][1].executionTime = t;
            datas[currentStep.value][1].status = '随机数已上传';
            console.log('Promise2 resolved successfully.');
        })
        .catch(async (error: Error) => {
            // 超时
            if (error.message === 'not upload random num') {
                datas[currentStep.value][1].status = '未在30s内上传随机数';
                // 重传
                let { ni, ri, hash } = getRandom(tA, tB);
                await writeFair.reuploadNum(addressB, dataIndex, 0, ni, ri);
                datas[currentStep.value][0].randomNum += ' / ' + ni;
                datas[currentStep.value][0].status = '随机数已重新上传';
                // 给下一个relay发消息
            }
        });
}

// 随机数上传
async function uploadRandomNum() {
    let step = currentStep.value;
    // 选择使用哪个账号上传hash, 和谁交互
    let { key: privateKey, address: addressA } = accountInfo.selectedAccount[step];
    let addressB = validatorAccount;

    // 创建合约实例
    const readOnlyFair = await getFairIntGen();
    const wallet = new Wallet(privateKey, provider);
    let writeFair = readOnlyFair.connect(wallet);
    await writeFair.setReqInfo(addressB, datas[step][0].randomNum, datas[step][0].r);
    datas[step][0].status = '随机数已上传';
}

// 监听status改变
// watchEffect自动跟踪ref变量
watchEffect(async () => {
    for (let i = 0; i < datas.length; i++) {
        if (datas[i][0].status === '随机数已上传' && datas[i][1].status === '随机数已上传') {
            // 创建合约实例
            let { key: privateKey, address: addressA } = accountInfo.selectedAccount[currentStep.value];
            let addressB = validatorAccount;
            const readOnlyFair = await getFairIntGen();
            const wallet = new Wallet(privateKey);
            let writeFair = readOnlyFair.connect(wallet);
            // 随机数检查
            let result = await readOnlyFair.UnifiedInspection(addressB, datas[i][0].dataIndex as number, 0);
            // 判断是否重传
            if (result === false) {
                console.log('随机数错误');
                let { ni, ri, hash } = getRandom(
                    datas[i][0].executionTime as number,
                    datas[i][1].executionTime as number
                );
                await writeFair.reuploadNum(addressB, datas[i][0].dataIndex as number, 0, ni, ri);
                if (typeof datas[currentStep.value][0].randomNum === 'string') {
                    datas[currentStep.value][0].randomNum += ' / ' + ni;
                }
                datas[currentStep.value][0].status = '随机数已重新上传';
            } else console.log('随机数正确 ');
        }
    }
});
// 使用第几个账号, 和谁交互
function getRelayInfo(current: number) {
    let addressB;
    if (current === 0 || current === totalStep - 1 || current === totalStep - 2) addressB = validatorAccount;
    else {
        addressB = 0;
    }
    return {
        addressA: accountInfo.selectedAccount[current].address,
        keyA: accountInfo.selectedAccount[current].key,
        addressB
    };
}

// 使用watch监听state的改变, 如果state显示双方都上传完成, 就给下一个relay发信息

// 挂载之前, 初始胡表格数值
onBeforeMount(() => {
    for (let i = 0; i < 6; i++) {
        datas.push([
            {
                role: 'appliacnt',
                randomNum: '',
                executionTime: '',
                r: '',
                hash: '',
                dataIndex: null,
                status: ''
            },
            {
                role: 'relay',
                randomNum: '',
                executionTime: '',
                r: '',
                hash: '',
                dataIndex: null,
                status: ''
            }
        ]);
    }
});

onMounted(async () => {});
</script>

<style scoped>
.el-header {
    background-color: #b3c0d1;
    color: white;
    line-height: 60px;
    margin: 20px auto;
    width: 99%;
    text-align: center;
}
/* 移除 Element Plus 表格的所有边框线 */
:deep(.el-table th, .el-table td) {
    /* border: none !important; */
    padding: 25px 0px;
    font-size: 20px;
    /* line-height: 35px; */
    font-weight: normal;
    color: black;
}
:deep(.el-table td) {
    border: none !important;
    padding: 23px 0px;
    font-size: 20px;
}
/* 设置 Element Plus 表格行高 */
/* :deep(.el-table .el-table__row) {
    height: 100px;
} */
/* 右下角显示按钮 */
.table-container {
    position: relative;
}
/* .table-buttons {
    position: absolute;
    right: 0px;
    bottom: -60px;
    margin: 10px;
} */
</style>
@/stores/modules/login
