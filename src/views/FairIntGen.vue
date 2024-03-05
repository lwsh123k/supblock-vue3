<template>
    <div class="my-10">
        <h1 class="my-5 text-center text-3xl">Fair Integer Generation Status</h1>

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
                <el-button type="primary" @click="uploadHash" class="mr-5" size="large">生成随机数并上传hash</el-button>
                <el-button type="success" @click="uploadRandomNum" size="large">上传随机数</el-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import FiContractInteract from '@/ethers/fairIntGen';
import { useLoginStore } from '@/stores/login';
import { storeToRefs } from 'pinia';
import { reactive, ref } from 'vue';

const popoverVisible = ref(true);
const loginStore = useLoginStore();
const { chainLength, accountInfo, validatorAccount, sendInfo } = loginStore;

const totalStep = chainLength + 3;
const fiContractInteract = new FiContractInteract();
const datas = reactive([
    [
        {
            role: 'appliacnt',
            randomNum: Math.floor(Math.random() * 100),
            executionTime: '5',
            r: '11111111111445ad',
            status: '成功'
        },
        {
            role: 'relay',
            randomNum: Math.floor(Math.random() * 100),
            executionTime: '5',
            r: '1111111111111254',
            status: '成功'
        }
    ],
    [
        {
            role: '用户',
            randomNum: Math.floor(Math.random() * 100),
            executionTime: '2024-01-15 10:05:00',
            r: 3,
            status: '失败'
        }
    ],
    [
        {
            role: '访客',
            randomNum: Math.floor(Math.random() * 100),
            executionTime: '2024-01-15 10:10:00',
            r: 4,
            status: '进行中'
        }
    ]
]);

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
async function uploadHash() {
    // 使用选择的账号连接合约
    let { key, address: addressA } = accountInfo.selectedAccount[currentStep.value];
    let addressB = validatorAccount;
    // 生成随机数并上传hash
    let instance = fiContractInteract;
    instance.setKey(key);
    let randomObj = await instance.generateRandon(addressA); //暂时为验证者账号
    console.log(randomObj);
    datas[currentStep.value].splice(0, 1, randomObj);
    await instance.setReqHash(addressB, randomObj.hash);
    datas[currentStep.value][0].status = 'hash已上传';
}
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
