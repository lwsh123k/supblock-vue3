<template>
    <div class="my-20">
        <h1 class="my-20 text-center text-3xl">Fair Integer Generation Response</h1>

        <!-- 表格展示 -->
        <div class="table-container mt-30 relative">
            <el-table :data="receivedData[activeStep]">
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
import FiContractInteract from '@/ethers/fairIntGen';
import { listenReqNum, listenResHash } from '@/ethers/timedListen';
import { useLoginStore } from '@/stores/login';
import { storeToRefs } from 'pinia';
import { onBeforeMount, reactive, ref } from 'vue';

// 定义一个接口来描述表格中的每一项
interface DataItem {
    role: string;
    randomNum: number | string;
    executionTime: number | string;
    r: string;
    hash: string;
    status: string;
}
let receivedData = reactive<DataItem[][]>([]); // 表格数据项, 在挂载之前赋值
const popoverVisible = ref(true);
const loginStore = useLoginStore();
const { chainLength, accountInfo, validatorAccount, sendInfo } = loginStore;

const totalStep = chainLength + 3;
const fiContractInteract = new FiContractInteract();

// 切换当前正在和哪个applicant进行通话
const activeStep = ref(0);
function toggleApplicant() {
    // do something
}

// hash上传
const currentStep = ref(0); // 当前正在和谁交互
async function uploadHashAndListen() {
    // 使用选择的账号连接合约, 上传hash
    let { key, address: addressA } = accountInfo.selectedAccount[currentStep.value];
    let addressB = validatorAccount;
    // 生成随机数并上传hash
    let instance = fiContractInteract;
    instance.setKey(key);
    let randomObj = await instance.generateRandon(addressA); //暂时为验证者账号
    console.log(randomObj);
    receivedData[currentStep.value].splice(0, 1, randomObj);
    await instance.setReqHash(addressB, randomObj.hash);
    receivedData[currentStep.value][0].status = 'hash已上传';

    // 监听对方, 只需要监听随机数
    try {
        let resNum = await listenReqNum(addressA, addressB);
        let { ni, ri, t } = resNum;
        receivedData[currentStep.value][0].randomNum = ni;
        receivedData[currentStep.value][0].r = ri;
        receivedData[currentStep.value][0].executionTime = t;
        receivedData[currentStep.value][0].status = '随机数已上传';
    } catch (reason) {
        if (reason === 'not upload hash') receivedData[currentStep.value][1].status = reason;
        else if (reason === 'not upload random num') {
            receivedData[currentStep.value][1].status = reason;
            // state=4, 请求者正确, 响应者超时
        }

        console.log(reason);
    }
}

// 使用watch监听state的改变, 如果state显示双方都上传完成, 就给下一个relay发信息

// 挂载之前, 初始胡表格数值
onBeforeMount(() => {
    for (let i = 0; i < 6; i++) {
        receivedData.push([
            {
                role: 'appliacnt',
                randomNum: '---',
                executionTime: '---',
                r: '...',
                hash: '---',
                status: '---'
            },
            {
                role: 'relay',
                randomNum: '---',
                executionTime: '---',
                r: '---',
                hash: '---',
                status: '---'
            }
        ]);
    }
});

// 随机数上传
async function uploadRandomNum() {}
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
