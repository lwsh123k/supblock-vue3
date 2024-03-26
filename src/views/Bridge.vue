<template>
    <div class="my-20">
        <h1 class="my-20 text-center text-3xl">Fair Integer Generation Response</h1>

        <!-- 表格展示 -->
        <div class="table-container mt-30 relative">
            <el-table :data="combinedData[activeStep]">
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
import { getCurrentBlockTime, getFairIntGen } from '@/ethers/contract';
import FiContractInteract from '@/ethers/fairIntGen';
import { provider } from '@/ethers/provider';
import { listenReqNum, listenResHash } from '@/ethers/timedListen';
import { getRandom } from '@/ethers/util';
import { useEventListenStore } from '@/stores/modules/eventListen';
import { useLoginStore } from '@/stores/modules/login';
import { Wallet } from 'ethers';
import { addAbortListener } from 'events';
import { write } from 'fs';
import { storeToRefs } from 'pinia';
import { computed, onBeforeMount, reactive, ref, watchEffect } from 'vue';

const popoverVisible = ref(true);
const loginStore = useLoginStore();
const { chainLength, accountInfo, validatorAccount, sendInfo } = loginStore;
const { dataToApplicant, dataFromApplicant } = useEventListenStore();
const totalStep = chainLength + 3;

// 使用计算属性合并
const combinedData = computed(() => {
    // 确保在 a 和 b 的长度之间取较小的一个，以防数组长度不等
    let minLength = Math.min(dataFromApplicant.length, dataToApplicant.length);
    let combined = [];
    for (let i = 0; i < minLength; i++) {
        combined.push([dataFromApplicant[i], dataToApplicant[i]]);
    }
    activeStep.value = minLength - 1;
    return combined;
});

// 切换当前正在和哪个applicant进行通话
const activeStep = ref(0);
function toggleApplicant() {
    // do something
}

// 响应者上传hash, 并且监听对方随机数上传
async function uploadHashAndListen() {
    let step = activeStep.value;
    let { key: privateKey, address: addressB } = accountInfo.anonymousAccount;
    let addressA = dataFromApplicant[step].from;

    // 创建合约实例
    const readOnlyFair = await getFairIntGen();
    const wallet = new Wallet(privateKey, provider);
    let writeFair = readOnlyFair.connect(wallet);

    await getCurrentBlockTime();

    // 生成随机数
    console.log(addressA);
    let result = await writeFair.getResExecuteTime(addressA);
    let tA = result[0].toNumber();
    let tB = result[1].toNumber();
    let dataIndex = result[2].toNumber(); // 插入位置的下标
    let { ni, ri, hash } = getRandom(tA, tB);
    dataFromApplicant[step].executionTime = tA;
    dataToApplicant[step].executionTime = tB;
    dataToApplicant[step].hash = hash;
    dataToApplicant[step].r = ri;
    dataToApplicant[step].randomNum = ni;
    dataToApplicant[step].index = dataIndex;
    dataToApplicant[step].status = 'hash正在上传';

    //上传hash
    await writeFair.setResHash(addressA, hash);
    dataToApplicant[step].status = 'hash已上传';

    // 定时监听随机数
    try {
        let { from: addressA, to: addressB, index } = dataFromApplicant[step];
        let result = await listenReqNum(addressA, addressB);
        console.log('监听到了随机数', result);
        dataFromApplicant[step].randomNum = result.ni;
        dataFromApplicant[step].r = result.ri;
        dataFromApplicant[step].executionTime = result.t;
        dataFromApplicant[step].status = '随机数已上传';
    } catch (error) {
        console.log('没有监听到', error);
        // 重传
        dataFromApplicant[step].status = '未在30s内上传随机数';
        let { ni, ri, hash } = getRandom(tA, tB);
        let index = dataFromApplicant[step].index;
        await writeFair.reuploadNum(addressA, index, 1, ni, ri);
        dataToApplicant[step].randomNum += '/' + ni;
        dataToApplicant[step].r += '/' + ri;
        dataToApplicant[step].status = '随机数已重新上传';
        // 给下一个relay发消息
    }
}

// 随机数上传
async function uploadRandomNum() {
    try {
        let step = activeStep.value;
        let { key: privateKey } = accountInfo.anonymousAccount;

        // 创建合约实例
        const readOnlyFair = await getFairIntGen();
        const wallet = new Wallet(privateKey, provider);
        let writeFair = readOnlyFair.connect(wallet);
        let addressA = dataFromApplicant[step].from;
        await writeFair.setResInfo(
            addressA,
            dataToApplicant[step].randomNum as number,
            dataToApplicant[step].r as string
        );
        dataToApplicant[step].status = '随机数已上传';
    } catch (error) {
        console.log(error);
    }
}

// 使用watch监听state的改变, 如果state显示双方都上传完成, 就给下一个relay发信息
watchEffect(async () => {
    for (let i = 0; i < dataFromApplicant.length; i++) {
        if (
            dataFromApplicant[i].status === '随机数已上传' &&
            dataToApplicant[i] &&
            dataToApplicant[i].status === '随机数已上传'
        ) {
            try {
                // 创建合约实例
                let { key: privateKey } = accountInfo.anonymousAccount;
                const readOnlyFair = await getFairIntGen();
                const wallet = new Wallet(privateKey, provider);
                let writeFair = readOnlyFair.connect(wallet);
                // 随机数检查
                let { from: addressA, index } = dataFromApplicant[i];
                let res = await writeFair.UnifiedInspection(addressA, index, 1);
                if (res === false) {
                    console.log('随机数错误');
                    // 重传
                    let from = dataFromApplicant[i].from;
                    let [tA, tB, index] = await writeFair.getResExecuteTime(from);
                    let { ni, ri, hash } = getRandom(tA.toNumber(), tB.toNumber());
                    await writeFair.reuploadNum(from, index, 1, ni, ri);
                    dataToApplicant[i].randomNum += '/' + ni;
                    dataToApplicant[i].r = ri;
                    dataToApplicant[i].status = '随机数已重新上传';
                } else console.log('随机数正确 ');
            } catch (error) {
                console.log(error);
            }
        }
    }
});
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
