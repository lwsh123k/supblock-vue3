<template>
    <div id="bridge-id" class="my-20">
        <h1 class="my-20 text-center text-3xl">Fair Integer Generation Response</h1>

        <!-- 表格展示 -->
        <div class="table-container mt-30 relative">
            <el-table :data="combinedData[activeStep]">
                <el-table-column prop="role" label="role">
                    <template #default="{ row }">
                        <span class="">{{ row.role }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="randomText" label="randon num">
                    <template #default="scope">
                        <!-- 条件为false时就正常显示文本 -->
                        <input type="text" v-if="scope.row.role === 'relay'" v-model="scope.row.randomText" />
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
        </div>

        <!-- 控制按钮 -->
        <div class="mt-10">
            <div class="float-right">
                <el-switch
                    v-model="useFakeData"
                    inline-prompt
                    id="fabricate-data"
                    class="custom-switch mr-5"
                    active-text="使用伪造数据"
                    inactive-text="使用真实数据"
                    active-color="#ff4949"
                    inactive-color="#13ce66" />
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
import { provider } from '@/ethers/provider';
import { listenReqNum, listenResHash } from '@/ethers/timedListen';
import { getRandom } from '@/ethers/util';
import { useRelayStore } from '@/stores/modules/relay';
import { useLoginStore } from '@/stores/modules/login';
import { Wallet } from 'ethers';
import { computed, onBeforeMount, reactive, ref, toRef, toRefs, watchEffect } from 'vue';

const popoverVisible = ref(true);
const loginStore = useLoginStore();
const { chainLength, allAccountInfo, validatorAccount, sendInfo } = loginStore;
const relayStore = useRelayStore();
const dataToApplicant = relayStore.dataToApplicant; // 取引用, 保持reactive
const dataFromApplicant = relayStore.dataFromApplicant;
const useFakeData = toRef(relayStore, 'useFakeData');

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

// 处理长字符串
function processLongString(str: string | null, startLength = 4, endLength = 3) {
    if (str === null) return;
    const maxLength = startLength + endLength + 3; // 加上3是因为省略号也占用长度
    if (str.length > maxLength) {
        return str.substring(0, startLength) + '...' + str.substring(str.length - endLength);
    }
    return str;
}

// 响应者上传hash, 并且监听对方随机数上传
async function uploadHashAndListen() {
    let step = activeStep.value;
    // 额外判断, 防止误点, 判断对方是否已经上传hash 或者 已经上传过随机数
    if (!dataFromApplicant[step]?.hash || dataToApplicant[step]?.isUpload) return;

    let { key: privateKey, address: addressB } = allAccountInfo.anonymousAccount;
    let addressA = dataFromApplicant[step].from;

    // 创建合约实例
    const readOnlyFair = await getFairIntGen();
    const wallet = new Wallet(privateKey, provider);
    let writeFair = readOnlyFair.connect(wallet);

    await getCurrentBlockTime();

    // 生成随机数
    let { tA, tB, index: dataIndex } = dataFromApplicant[step];
    let { ni, ri, hash } = getRandom(tA, tB);
    dataToApplicant[step].executionTime = tB;
    dataToApplicant[step].hash = hash;
    dataToApplicant[step].r = ri;
    dataToApplicant[step].randomNumBefore = ni;
    dataToApplicant[step].index = dataIndex;
    dataToApplicant[step].status = 'hash正在上传';

    // 提前保存值, 检查自身正确性
    dataToApplicant[step].randomNumAfter = ni;
    dataToApplicant[step].isUpload = false;
    dataToApplicant[step].isReupload = false;
    dataToApplicant[step].randomText = ni.toString();

    //上传hash
    await writeFair.setResHash(addressA, hash);
    dataToApplicant[step].status = 'hash已上传';

    // 定时监听随机数
    try {
        let result = await listenReqNum(addressA, addressB);
        console.log('监听到了随机数', result);
        dataFromApplicant[step].randomNum = result.ni;
        console.log(dataFromApplicant[step].randomNum);
        dataFromApplicant[step].r = result.ri;
        dataFromApplicant[step].tA = result.t;
        dataFromApplicant[step].status = '随机数已上传';
    } catch (error) {
        console.log('没有监听到', error);
        // 超时 && 自己已上传 && 上传的是对的
        if (
            dataToApplicant[step].isUpload &&
            dataToApplicant[step].randomNumBefore === dataToApplicant[step].randomNumAfter
        ) {
            // 重传
            dataFromApplicant[step].status = '未在30s内上传随机数';
            let { ni: niReuploaded, ri, hash } = getRandom(tA, tB);
            let index = dataFromApplicant[step].index;
            console.log(`random num reupload, appliacnt address: ${addressA}, onchain array index: ${index}`);
            await writeFair.reuploadNum(addressA, index, 1, niReuploaded, ri);
            // 改变状态
            dataToApplicant[step].randomText = ni.toString() + '/' + niReuploaded;
            // dataToApplicant[step].r += '/' + ri;
            dataToApplicant[step].status = '随机数已重新上传';
            dataToApplicant[step].isReupload = true;
            // 给下一个relay发消息
        }
    }
}

// 随机数上传
async function uploadRandomNum() {
    try {
        let step = activeStep.value;
        let { key: privateKey } = allAccountInfo.anonymousAccount;

        // 创建合约实例
        const readOnlyFair = await getFairIntGen();
        const wallet = new Wallet(privateKey, provider);
        let writeFair = readOnlyFair.connect(wallet);
        let addressA = dataFromApplicant[step].from;
        dataToApplicant[step].randomNumAfter = Number(dataToApplicant[step].randomText); // 上传修改后的数据
        await writeFair.setResInfo(
            addressA,
            dataToApplicant[step].randomNumAfter as number,
            dataToApplicant[step].r as string
        );

        // 改变状态
        dataToApplicant[step].status =
            dataToApplicant[step].randomNumBefore === dataToApplicant[step].randomNumAfter
                ? '随机数已上传'
                : '随机数错误';
        dataToApplicant[step].isUpload = true;
    } catch (error) {
        console.log(error);
    }
}

// 使用watch监听state的改变, 如果state显示双方都上传完成, 就给下一个relay发信息
watchEffect(async () => {
    for (let i = 0; i < dataFromApplicant.length; i++) {
        // 自己上传了 && 自己上传的是对的 && 之前没有重传过
        if (
            dataFromApplicant[i].status === '随机数已上传' &&
            dataToApplicant[i].status === '随机数已上传' &&
            dataToApplicant[i].isUpload === true &&
            dataToApplicant[i].randomNumBefore === dataToApplicant[i].randomNumAfter &&
            dataToApplicant[i].isReupload === false &&
            dataToApplicant[i].hasChecked === false
        ) {
            console.log(11111111111111);
            try {
                // 创建合约实例
                let { key: privateKey, address: myAddress } = allAccountInfo.anonymousAccount;
                const readOnlyFair = await getFairIntGen();
                const wallet = new Wallet(privateKey, provider);
                let writeFair = readOnlyFair.connect(wallet);
                // 随机数检查
                let { from: addressA, index, tA, tB } = dataFromApplicant[i];
                let res = await writeFair.callStatic.UnifiedInspection(addressA, myAddress, index, 1);
                if (res === false) {
                    console.log('随机数错误');
                    // 重传
                    let { ni: niReuploaded, ri, hash } = getRandom(tA, tB);
                    dataToApplicant[i].randomNumAfter = niReuploaded;
                    await writeFair.reuploadNum(addressA, index, 1, niReuploaded, ri);
                    // 改变状态
                    dataToApplicant[i].randomText = dataToApplicant[i].randomNumBefore + '/' + niReuploaded;
                    dataToApplicant[i].r = ri;
                    dataToApplicant[i].status = '随机数已重新上传';
                    dataToApplicant[i].isReupload = true;
                } else console.log('随机数正确 ');

                dataToApplicant[i].hasChecked === true;
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

/* 开关按钮样式 */
.custom-switch :deep(.el-switch__label) {
    color: #833274;
    font-weight: bold;
}

.custom-switch :deep(.el-switch__core) {
    width: 120px; /* 宽度 */
    height: 40px; /* 高度 */
}
.custom-switch :deep(.el-switch__button) {
    width: 28px; /* 按钮宽度 */
    height: 28px; /* 按钮高度 */
}
</style>
