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
                <el-table-column prop="randomText" label="randon num">
                    <template #default="scope">
                        <!-- 条件为false时就正常显示文本 -->
                        <input type="text" v-if="scope.row.role === 'appliacnt'" v-model="scope.row.randomText" />
                    </template>
                </el-table-column>
                <el-table-column prop="executionTime" label="execution time" placeholder=""></el-table-column>
                <el-table-column prop="r" label="r">
                    <template #default="scope">
                        {{ processLongString(scope.row.r) }}
                    </template>
                </el-table-column>
                <el-table-column prop="hash" label="hash">
                    <template #default="scope">
                        {{ processLongString(scope.row.hash) }}
                    </template>
                </el-table-column>
                <el-table-column prop="status" label="status"></el-table-column>
            </el-table>
            <!-- <div class="absolute -bottom-16 right-0">
                <el-button type="primary" @click="uploadHash" class="mr-5" size="large">生成随机数并上传hash</el-button>
                <el-button type="success" @click="uploadRandomNum" size="large">上传随机数</el-button>
            </div> -->
        </div>

        <!-- 控制按钮 -->
        <div class="mt-10 flex items-center">
            <el-button @click="prev" :disabled="activeStep === 0" size="large">上一步</el-button>
            <el-button type="primary" @click="next" :disabled="activeStep === totalStep" size="large">下一步</el-button>
            <span v-if="relays[activeStep + 1].index != -1" class="ml-14 text-2xl"
                >next relay: {{ relays[activeStep + 1].index }}</span
            >

            <div class="ml-auto">
                <el-button type="primary" @click="uploadHashAndListen" class="mr-5" size="large"
                    >生成随机数并上传hash</el-button
                >
                <el-button type="success" @click="uploadRandomNum" size="large">上传随机数</el-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getAccountInfo } from '@/api';
import { getCurrentBlockTime, getFairIntGen } from '@/ethers/contract';
import { provider } from '@/ethers/provider';
import { listenResHash, stopableListenResNum, stopableListenResReupload } from '@/ethers/timedListen';
import { getRandom } from '@/ethers/util';
import { useApplicantStore } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';
import { Wallet } from 'ethers';
import { storeToRefs } from 'pinia';
import { onBeforeMount, onMounted, reactive, readonly, ref, watch, watchEffect } from 'vue';

// 从store中导入数据
let applicantStore = useApplicantStore();
let datas = applicantStore.datas;
let relays = applicantStore.relays;
const { resetCurrentStep } = applicantStore;
const loginStore = useLoginStore();
const { chainLength, accountInfo, validatorAccount, sendInfo } = loginStore;
const totalStep = chainLength + 3;

const popoverVisible = ref(true);
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
const currentStep = ref(0); // 当前和哪一个relay生成随机数
async function uploadHashAndListen() {
    // 只能上传对应的
    if (activeStep.value != currentStep.value) return;
    let step = currentStep.value;
    resetCurrentStep(step);
    // 选择使用哪个账号上传hash, 和谁交互
    let { key: privateKey, address: addressA } = accountInfo.selectedAccount[step];
    let addressB = (await getRelayNumber(step)).address;
    console.log(addressB);
    // 创建合约实例
    const readOnlyFair = await getFairIntGen();
    let writeFair = readOnlyFair.connect(new Wallet(privateKey, provider));

    console.log(writeFair.provider);
    await getCurrentBlockTime();

    // 生成随机数
    let result = await writeFair.getReqExecuteTime(addressB);
    let tA = result[0].toNumber();
    let tB = result[1].toNumber();
    let dataIndex = result[2].toNumber(); // 插入位置的下标
    let { ni, ri, hash } = getRandom(tA, tB);
    datas[step][0].address = addressA;
    datas[step][0].executionTime = tA;
    datas[step][1].executionTime = tB;
    datas[step][1].address = addressB;
    datas[step][0].hash = hash;
    datas[step][0].r = ri;
    datas[step][0].randomNumBefore = ni;
    datas[step][0].dataIndex = dataIndex;
    datas[step][0].status = 'hash正在上传';
    // 提前保存值, 检查自身正确性
    datas[step][0].randomNumAfter = ni;
    datas[step][0].isUpload = false;
    datas[step][0].isReupload = false;
    // 更新表格
    datas[step][0].randomText = ni.toString();

    //上传hash
    await writeFair.setReqHash(addressB, hash);
    datas[step][0].status = 'hash已上传';

    // 开启监听
    // 使用封装的函数
    const hashPromise = listenResHash(addressA, addressB);
    const { p: numPromise, rejectAndCleanup } = await stopableListenResNum(addressA, addressB);
    const { p: reuploadPromise, rejectAndCleanup: reuploadReject } = await stopableListenResReupload(
        addressA,
        addressB
    );

    // 同时监听hash和随机数
    hashPromise
        .then((resHash) => {
            datas[step][1].hash = resHash.infoHashB;
            datas[step][1].status = 'hash已上传';
            // ??
        })
        .catch((error) => {
            // hashPromise失败，就停止numPromise
            datas[step][1].status = '未在30s内上传hash';
            console.log(error);
            rejectAndCleanup('hash not upload, reject listen upload');
            reuploadReject('hash not upload, reject listen reupload');
        });

    numPromise
        .then((resNum) => {
            let { ni, ri, t } = resNum;
            datas[step][1].randomNumBefore = ni;
            datas[step][1].r = ri;
            datas[step][1].executionTime = t;
            datas[step][1].status = '随机数已上传';
            datas[step][1].randomText = ni.toString();
            console.log('监听到relay随机数');
        })
        .catch(async (error: Error) => {
            // 超时 && 自己已上传 && 上传的是对的
            if (
                error.message === 'not upload random num' &&
                datas[step][0].isUpload === true &&
                datas[step][0].randomNumBefore === datas[step][0].randomNumAfter
            ) {
                datas[step][1].status = '未在30s内上传随机数';
                // 重传
                let { ni, ri, hash } = getRandom(tA, tB);
                datas[step][0].randomNumAfter = Number(ni);
                await writeFair.reuploadNum(addressB, dataIndex, 0, ni, ri);
                datas[step][0].randomText = datas[step][0].randomNumBefore + ' / ' + ni;
                // 更改状态
                datas[step][0].status = '随机数已重新上传';
                datas[step][0].isReupload = true;
                // 设置下一个relay编号, 给下一个relay发消息
                currentStep.value++;
                relays[currentStep.value].index = ni;
            }
        });

    reuploadPromise
        .then((resReuploadNum) => {
            let { ni } = resReuploadNum;
            currentStep.value++;
            relays[currentStep.value].index = ni;
            // 给下一个relay发消息
        })
        .catch((error: Error) => {
            console.log('没有监听到随机数重传');
        });
}

// 随机数上传
async function uploadRandomNum() {
    // 特殊情况: 在进行完某一步之后, 点击回到之前的页面, 点击随机数上传
    let step = activeStep.value;

    if (datas[step][0].hash === '') return; // hash未上传, 直接返回
    if (datas[step][0].isReupload === true || datas[step][0].isUpload === true) return; // 已经上传随机数, 直接返回

    try {
        // 选择使用哪个账号上传hash, 和谁交互
        let { key: privateKey, address: addressA } = accountInfo.selectedAccount[step];
        let addressB = (await getRelayNumber(step)).address;

        // 创建合约实例
        const readOnlyFair = await getFairIntGen();
        const wallet = new Wallet(privateKey, provider);
        let writeFair = readOnlyFair.connect(wallet);
        datas[step][0].randomNumAfter = Number(datas[step][0].randomText); // 上传修改后的数据
        await writeFair.setReqInfo(addressB, datas[step][0].randomNumAfter!, datas[step][0].r);

        // 更改状态
        datas[step][0].status =
            datas[step][0].randomNumBefore === datas[step][0].randomNumAfter ? '随机数已上传' : '随机数错误';
        datas[step][0].isUpload = true;
    } catch (e) {
        console.log(e);
    }
}

// 监听status改变
// watchEffect自动跟踪ref变量
watchEffect(async () => {
    for (let i = 0; i < datas.length; i++) {
        // 检查都上传时, 对方是否上传错误: 自己上传了 && 自己上传的是对的 && 之前没有重传过
        // 每一次都会执行全部for循环, 还是只会改变变化的部分??????
        if (
            datas[i][0].status === '随机数已上传' &&
            datas[i][1].status === '随机数已上传' &&
            datas[i][0].isUpload === true &&
            datas[i][0].randomNumBefore === datas[i][0].randomNumAfter &&
            datas[i][0].isReupload === false
        ) {
            // 创建合约实例
            let { key: privateKey, address: addressA } = accountInfo.selectedAccount[i];
            let addressB = validatorAccount;
            const readOnlyFair = await getFairIntGen();
            const wallet = new Wallet(privateKey, provider);
            let writeFair = readOnlyFair.connect(wallet);
            // 随机数检查: 对方上传正确 || 已重新上传 返回true
            let result = await readOnlyFair.UnifiedInspection(addressA, addressB, datas[i][0].dataIndex as number, 0);
            // 判断是否重传
            if (result === false) {
                console.log('随机数错误');
                let { ni, ri, hash } = getRandom(
                    datas[i][0].executionTime as number,
                    datas[i][1].executionTime as number
                );
                datas[i][0].randomNumAfter = ni;
                await writeFair.reuploadNum(addressB, datas[i][0].dataIndex as number, 0, ni, ri);
                // 更改状态
                datas[i][0].randomText = datas[i][0].randomNumBefore + ' / ' + ni;
                datas[i][0].status = '随机数已重新上传';
                datas[i][0].isReupload = true;
                // 设置next relay
                currentStep.value++;
                relays[currentStep.value].index = ni;
            } else {
                currentStep.value++;
                relays[currentStep.value].index = (datas[i][0].randomNumBefore + datas[i][1].randomNumBefore) % 100;
                console.log('随机数正确 ');
            }
        }
    }
});

// 使用第几个账号, 和谁交互
async function getRelayNumber(current: number) {
    let result;
    if (current === 0 || current === totalStep - 1 || current === totalStep - 2) {
        result = {
            relayNumber: 0,
            publicKey:
                '0x374462096f4ccdc90b97c0201d0ad8ff67da224026dc20e61c107f577db537d049648511e4e922ce74a0ff7494eeac72317e60a48cb2a71af21e4e2258fcca36',
            address: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba'
        };
    } else {
        let relayNumber = relays[current].index;
        let accountInfo = await getAccountInfo(relayNumber);
        result = { relayNumber, ...accountInfo };
    }
    return result;
}

// 处理长字符串
function processLongString(str: string, startLength = 5, endLength = 3) {
    const maxLength = startLength + endLength + 3; // 加上3是因为省略号也占用长度
    if (str.length > maxLength) {
        return str.substring(0, startLength) + '...' + str.substring(str.length - endLength);
    }
    return str;
}
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
