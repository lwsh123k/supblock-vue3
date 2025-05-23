<template>
    <div class="my-10">
        <!-- 进度条 -->
        <el-steps :active="activeStep" simple finish-status="success">
            <el-step
                v-for="number in totalStep"
                :key="number"
                :title="'Step ' + number"
                @click.native="toStep(number - 1)"></el-step>
        </el-steps>

        <!-- 表格展示 -->
        <div class="table-container relative mt-10">
            <el-table :data="datas[activeStep]">
                <el-table-column prop="role" label="role">
                    <template #default="{ row }">
                        <span v-if="row.role === 'appliacnt'" class="">{{
                            'appliacnt ' +
                            `(${
                                oneChainTempAccount.selectedAccount[activeStep]?.address
                                    ? processLongString(oneChainTempAccount.selectedAccount[activeStep].address)
                                    : 'wait for login'
                            })`
                        }}</span>
                        <span v-else>{{
                            'relay ' +
                            '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
                            `(${relays[activeStep].realNameAccount ? processLongString(relays[activeStep].realNameAccount) : 'wait for selection'})`
                        }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="randomText" label="randon num">
                    <template #default="scope">
                        <!-- 条件为false时就正常显示文本 -->
                        <input type="text" v-if="scope.row.role === 'appliacnt'" v-model="scope.row.randomText" />
                    </template>
                </el-table-column>
                <el-table-column prop="executionTime" label="execution round" placeholder=""></el-table-column>
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
                <el-table-column prop="status" label="status">
                    <template #default="scope">
                        {{ activeStep === chainLength ? 'no need fair integer generation' : scope.row.status }}
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <!-- 控制按钮 -->
        <div class="mt-10 flex items-center">
            <el-button
                @click="prev"
                :disabled="activeStep === 0"
                size="large"
                class="nav-btn"
                :class="{ 'nav-btn-disabled': activeStep === 0 }">
                Previous
            </el-button>

            <el-button
                type="primary"
                @click="next"
                :disabled="activeStep === totalStep"
                size="large"
                class="nav-btn ml-4"
                :class="{ 'nav-btn-disabled': activeStep === totalStep }">
                Next
            </el-button>

            <!-- relays数组第一个relay为validator, 所以与b数组索引错开 -->
            <span v-if="relays[activeStep + 1].relayNumber != -2" class="ml-14 text-2xl">{{ nextRelayMessage }}</span>

            <div class="ml-auto">
                <div v-if="activeStep <= chainLength - 1">
                    <el-button @click="chainInit" v-if="activeStep === 0" size="large" class="action-btn mr-5">
                        Chain Init
                    </el-button>

                    <el-button type="primary" @click="uploadHashAndListen" class="action-btn mr-5" size="large">
                        Generate Random & Upload Hash
                    </el-button>

                    <el-button type="success" @click="uploadRandomNum" class="action-btn" size="large">
                        Upload Random Number
                    </el-button>
                </div>
                <div v-else-if="activeStep == chainLength">
                    <el-button type="primary" @click="appSendFinalData(chainId)" class="action-btn mr-5" size="large">
                        Send to Validator
                    </el-button>

                    <el-button
                        type="primary"
                        @click="verifyTokenAndReset(chainId)"
                        class="action-btn mr-5"
                        size="large">
                        Verify Token
                    </el-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getCurrentBlockTime, getFairIntGen } from '@/ethers/contract';
import { provider } from '@/ethers/provider';
import { listenResHash, stopableListenResNum, stopableListenResReupload } from '@/ethers/timedListen';
import { getHash, getRandom } from '@/ethers/util';
import { appSendInitData, send2Extension } from '@/socket/applicantEvent';
import { useApplicantStore } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';
import { ethers, Wallet } from 'ethers';
import { computed, onBeforeMount, onMounted, reactive, readonly, ref, watch, watchEffect } from 'vue';
import type { DataItem, PublicKey, RelayAccount, toApplicantSigned } from './types';
import { appSendFinalData } from '@/socket/applicantEvent';
import { verifyTokenAndReset } from '@/views/FairIntegerGen/verifyTokenAndReset';

// receive data from parent component
const props = defineProps<{
    datas: DataItem[][];
    relays: RelayAccount[];
    oneChainSendInfo: {
        r: string[];
        b: number[];
        hashForward: string[];
        hashBackward: string[];
    };
    oneChainTempAccount: {
        selectedNum: number[];
        selectedAccount: {
            key: string;
            address: string;
        }[];
    };
    oneChainInfoHash: string[];
    chainId: number; // 标识这是第几条链
}>();

const { datas, relays, oneChainSendInfo, oneChainTempAccount, chainId, oneChainInfoHash } = props;
// console.log(props);

// 从store中导入数据
let applicantStore = useApplicantStore();
const { resetCurrentStep, setNextRelayAnonymousAccount } = applicantStore;
const loginStore = useLoginStore();
const { chainLength, validatorAccount } = loginStore;
const totalStep = chainLength + 1;

// 页数跳转, 显示数据
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

// chian init
let isChainInitDisabled = ref(false);
function chainInit() {
    try {
        isChainInitDisabled.value = true;
        let appTemp0Address = oneChainTempAccount.selectedAccount[0].address;
        appSendInitData(chainId, appTemp0Address);
    } catch (error) {
        console.log(error);
    }
}

// hash上传
let { relayIndex } = applicantStore;
async function uploadHashAndListen() {
    let currentStep = relayIndex[chainId]; // interact with which relay of which chain id

    // 只能上传对应的
    if (activeStep.value != currentStep) return;
    let step = currentStep;
    resetCurrentStep(datas, step);
    // applicant: temp account, relay:real name account
    let { key: privateKey, address: addressA } = oneChainTempAccount.selectedAccount[step];
    let addressB = relays[step].realNameAccount;
    console.log(`hash upload. applicant account: ${addressA}, relay real name account: ${addressB}`);
    // 创建合约实例
    const readOnlyFair = await getFairIntGen();
    let writeFair = readOnlyFair.connect(new Wallet(privateKey, provider));

    // await getCurrentBlockTime();

    // 生成随机数
    let result = await writeFair.getReqExecuteTime(addressB);
    let tA = result[0].toNumber();
    let tB = result[1].toNumber();
    let dataIndex = result[2].toNumber(); // 插入位置的下标
    let { ni, ri, hash } = getRandom(tA, tB);
    datas[step][0].address = addressA;
    datas[step][0].executionTime = tA.toString(); // execution time应该是0, 如果在使用新选择的temp account
    datas[step][1].executionTime = tB.toString();
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
    // 保存info hash, 在之后applicant -> relay使用
    oneChainInfoHash[step] = hash;

    // send to server when hash uploads
    let b = oneChainSendInfo.b[currentStep];
    await send2Extension(addressA, addressB, hash, b, chainId, step);

    //上传hash
    let hashUploadPromise = writeFair.setReqHash(addressB, hash);

    // 开启监听
    // 使用封装的函数
    const hashPromise = listenResHash(addressA, addressB);
    const { p: numPromise, rejectAndCleanup } = await stopableListenResNum(addressA, addressB);
    const { p: reuploadPromise, rejectAndCleanup: reuploadReject } = await stopableListenResReupload(
        addressA,
        addressB
    );

    console.log(`setup listener: addressA=${addressA}, addressB=${addressB}, step=${step}`);

    // 同时监听hash和随机数
    hashPromise
        .then((resHash) => {
            datas[step][1].hash = resHash.infoHashB;
            // 如果先监听到随机数上传就取消设置该字段
            if (datas[step][1].status !== '随机数已上传') datas[step][1].status = 'hash已上传';
            console.log('监听到relay hash', resHash);
        })
        .catch((error) => {
            // 防止hash没监听到, 但随机数监听到
            if (datas[step][1].status !== '随机数已上传') datas[step][1].status = '未在30s内上传hash';
            console.log('hash监听错误:', error);
            // hashPromise失败，就停止numPromise
            rejectAndCleanup('hash not upload, reject listen upload');
            reuploadReject('hash not upload, reject listen reupload');
        });

    numPromise
        .then((resNum) => {
            let { ni, ri, t } = resNum;
            datas[step][1].hash = resNum.hashB;
            datas[step][1].randomNumBefore = ni;
            datas[step][1].randomNumAfter = ni;
            datas[step][1].r = ri;
            datas[step][1].executionTime = t.toString();
            datas[step][1].status = '随机数已上传';
            datas[step][1].randomText = ni.toString();
            console.log('监听到relay随机数', resNum);
        })
        .catch(async (error: Error) => {
            // 超时 && 自己已上传 && 自己上传的是对的
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
                // set next relay number, update next relay info
                await setNextRelayAnonymousAccount(chainId, ++currentStep, ni, 'event listening A');
            }
        });

    // 检测对方重传
    reuploadPromise
        .then(async (resReuploadNum) => {
            let { ni } = resReuploadNum;
            console.log(`relay reupload: from=${resReuploadNum.from}, to=${resReuploadNum.to}, ni=${ni}`);
            datas[step][1].randomNumAfter = ni;
            datas[step][1].status = '随机数已重新上传';
            datas[step][1].randomText = datas[step][1].randomNumBefore + ' / ' + ni.toString();
            datas[step][1].isReupload = true;
            await setNextRelayAnonymousAccount(chainId, ++currentStep, ni, 'event listening A');
        })
        .catch((error: Error) => {
            if (error.message === 'not upload reupload random num') {
                console.log('重传监听超时');
            } else if (error.message === 'hash not upload, reject listen reupload') {
                console.log('由于hash未上传，取消了重传监听');
            } else {
                console.log('重传监听发生其他错误:', error);
            }
        });

    await hashUploadPromise; // 等待hash上传完成
    console.log('hash upload success:', hash);
    datas[step][0].status = 'hash已上传';
}

// 随机数上传
async function uploadRandomNum() {
    // 特殊情况: 在进行完某一步之后, 点击回到之前的页面, 点击随机数上传
    let step = activeStep.value;

    if (datas[step][0].hash === '') return; // hash未上传, 直接返回
    if (datas[step][0].isReupload === true || datas[step][0].isUpload === true) return; // 已经上传随机数, 直接返回

    try {
        // 选择使用哪个账号上传hash, 和谁交互
        let { key: privateKey, address: addressA } = oneChainTempAccount.selectedAccount[step];
        let addressB = relays[step].realNameAccount; // 与relay实名账户进行公平随机数生成

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

// 检查随机数是否正确
// watchEffect自动跟踪ref变量
watchEffect(async () => {
    for (let i = 0; i < datas.length; i++) {
        // 检查都上传时, 对方是否上传错误. 需要满足: 自己上传了 && 自己上传的是对的 && 之前没有重传过 && 之前没有检查过
        if (
            datas[i][0].status === '随机数已上传' &&
            datas[i][1].status === '随机数已上传' &&
            !datas[i][1].hash &&
            datas[i][0].isUpload === true &&
            datas[i][0].randomNumBefore === datas[i][0].randomNumAfter &&
            datas[i][0].isReupload === false &&
            !datas[i][0].hasChecked
        ) {
            console.log('random num check...');
            // fair integer check
            let hash = getHash(
                datas[i][1].randomNumBefore,
                Number(datas[i][0].executionTime),
                Number(datas[i][1].executionTime),
                datas[i][1].r
            );
            let result = hash === datas[i][1].hash;
            // console.log(hash, result);
            // let result = await readOnlyFair.UnifiedInspection(addressA, addressB, datas[i][0].dataIndex as number, 0);

            // 判断是否重传
            if (result === false) {
                console.log('随机数错误', 'data info:', {
                    'hash received': datas[i][1].hash,
                    'hash calculated': hash,
                    'relay random num': datas[i][1].randomNumBefore,
                    'appliacnt exec time': Number(datas[i][0].executionTime),
                    'relay exec time': Number(datas[i][1].executionTime),
                    'relay r': datas[i][1].r
                });
                // applicant: temp account, relay: anonymous account
                let { key: privateKey, address: addressA } = oneChainTempAccount.selectedAccount[i];
                let addressB = relays[i].realNameAccount; // 与relay实名账户进行公平随机数生成
                const readOnlyFair = await getFairIntGen();
                const wallet = new Wallet(privateKey, provider);
                let writeFair = readOnlyFair.connect(wallet);

                // regenerate random num
                let {
                    ni: niReuploaded,
                    ri,
                    hash: regeneratedHash
                } = getRandom(Number(datas[i][0].executionTime), Number(datas[i][1].executionTime));
                datas[i][0].randomNumAfter = niReuploaded;
                await writeFair.reuploadNum(addressB, datas[i][0].dataIndex as number, 0, niReuploaded, ri);
                // 更改状态
                datas[i][0].randomText = datas[i][0].randomNumBefore + ' / ' + niReuploaded;
                datas[i][0].status = '随机数已重新上传';
                datas[i][0].isReupload = true;
                // 设置next relay
                let nextStep = i + 1;
                await setNextRelayAnonymousAccount(chainId, nextStep, niReuploaded, 'event listening B');
            } else {
                let selectedNum = (datas[i][0].randomNumBefore + datas[i][1].randomNumBefore) % 99;
                let nextStep = i + 1;
                await setNextRelayAnonymousAccount(chainId, nextStep, selectedNum, 'event listening B');
                console.log('随机数正确 ');
            }

            datas[i][0].hasChecked = true;
        }
    }
});

// 处理长字符串
function processLongString(str: string, startLength = 5, endLength = 3) {
    const maxLength = startLength + endLength + 3; // 加上3是因为省略号也占用长度
    if (str.length > maxLength) {
        return str.substring(0, startLength) + '...' + str.substring(str.length - endLength);
    }
    return str;
}

// 展示选出的随机数
const nextRelayMessage = computed(() => {
    let step = activeStep.value;

    // the last one has no next relay
    if (step === chainLength + 2) {
        return '';
    } else {
        if (relays[activeStep.value + 1].relayNumber == -2)
            return ''; // not selected relay
        else if (relays[activeStep.value + 1].relayNumber == -1)
            return 'next relay: validator'; // relay is validator
        // selected relay
        else {
            let numA = datas[activeStep.value][0].randomNumAfter,
                numB = datas[activeStep.value][1].randomNumAfter;
            // 一方重传, 另一方按0计算
            numB = datas[activeStep.value][0].isReupload ? 0 : numB;
            numA = datas[activeStep.value][1].isReupload ? 0 : numA;
            return (
                `next relay: (fair integer: ${numA} + ${numB} + ` +
                `blinding number: ${oneChainSendInfo.b[activeStep.value]}) % 99 + 1 = ` +
                `${((relays[activeStep.value + 1].relayFairInteger + oneChainSendInfo.b[activeStep.value]) % 99) + 1}`
            );
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

/* 导航按钮样式 */
.nav-btn {
    min-width: 100px;
    font-weight: 500;
    border-radius: 8px;
    transition: all 0.3s ease;
    background: #95a5a6; /* 柔和的灰蓝色 */
    color: white;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-btn:hover:not(.nav-btn-disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    background: #7f8c8d; /* 更深的灰蓝色 */
}

.nav-btn-disabled {
    background: #e4e7ed !important; /* Element Plus 禁用灰色 */
    cursor: not-allowed;
    opacity: 0.7;
}

/* Previous 按钮特殊样式 */
.nav-btn:not([type='primary']) {
    background: #34495e; /* 深蓝灰色 */
}

.nav-btn:not([type='primary']):hover:not(.nav-btn-disabled) {
    background: #2c3e50; /* 更深的蓝灰色 */
}

/* Next 按钮特殊样式 */
.nav-btn[type='primary'] {
    background: #3498db; /* 明亮的蓝色 */
}

.nav-btn[type='primary']:hover:not(.nav-btn-disabled) {
    background: #2980b9; /* 更深的蓝色 */
}

/* 操作按钮样式 */
.action-btn {
    min-width: 120px;
    font-weight: 500;
    border-radius: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Chain Init 按钮 */
.action-btn[type='default'] {
    background: #909399; /* Element Plus 灰色 */
    color: white;
}

.action-btn[type='default']:hover {
    background: #737579;
}

/* Generate Random & Upload Hash 按钮 */
.action-btn[type='primary'] {
    background: #409eff; /* Element Plus 蓝色 */
    border-color: #409eff;
}

.action-btn[type='primary']:hover {
    background: #337ecc;
    border-color: #337ecc;
}

/* Upload Random Number 按钮 */
.action-btn[type='success'] {
    background: #67c23a; /* Element Plus 绿色 */
    border-color: #67c23a;
}

.action-btn[type='success']:hover {
    background: #529b2e;
    border-color: #529b2e;
}

.action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
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

/* 右下角显示按钮 */
.table-container {
    position: relative;
}
</style>
