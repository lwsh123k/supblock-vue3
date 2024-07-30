<template>
    <div class="my-10">
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
                <template v-slot:empty>
                    <tr>
                        <td colspan="6" style="text-align: center; color: gray">no need fair integer generation</td>
                    </tr>
                </template>
            </el-table>
        </div>

        <!-- 控制按钮 -->
        <div class="mt-10 flex items-center">
            <el-button @click="prev" :disabled="activeStep === 0" size="large">上一步</el-button>
            <el-button type="primary" @click="next" :disabled="activeStep === totalStep" size="large">下一步</el-button>
            <!-- relays数组第一个relay为validator, 所以与b数组索引错开 -->
            <span v-if="relays[activeStep + 1].relayNumber != -2" class="ml-14 text-2xl">{{ nextRelayMessage }}</span>

            <div class="ml-auto">
                <el-button @click="chainInit" v-if="activeStep === 0" size="large" class="mr-5">chain init</el-button>
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
import { listenResHash, stopableListenResNum, stopableListenResReupload } from '@/ethers/timedListen';
import { getHash, getRandom } from '@/ethers/util';
import { socketMap } from '@/socket';
import { appSendInitData } from '@/socket/chainData';
import { useApplicantStore } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';
import { ethers, Wallet } from 'ethers';
import { storeToRefs } from 'pinia';
import { computed, onBeforeMount, onMounted, reactive, readonly, ref, watch, watchEffect } from 'vue';
import { setNextRelayInfo } from './updateNextRelay';
import type { DataItem, RelayAccount } from './types';

// receive data from parent component
const props = defineProps<{
    datas: DataItem[][];
    relays: RelayAccount[];
}>();

const { datas, relays } = props;
console.log(props);

// 从store中导入数据
let applicantStore = useApplicantStore();
const { resetCurrentStep } = applicantStore;
const loginStore = useLoginStore();
const { chainLength, accountInfo, validatorAccount, sendInfo } = loginStore;
const totalStep = chainLength + 3;

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
function chainInit() {
    let tempAddress0 = accountInfo.selectedAccount[0].address;
    let socket0 = socketMap.get(tempAddress0);
    if (socket0) appSendInitData(socket0);
    else throw new Error('socket not found when chain initialize');
}

// hash上传
let { relayIndex } = storeToRefs(applicantStore);
async function uploadHashAndListen() {
    let currentStep = relayIndex.value; // interact with which relay

    // 只能上传对应的
    if (activeStep.value != currentStep) return;
    let step = currentStep;
    resetCurrentStep(step);
    // applicant: temp account, relay: anonymous account
    let { key: privateKey, address: addressA } = accountInfo.selectedAccount[step];
    let addressB = relays[step].anonymousAccount;
    console.log(`applicant interacting with ${addressB}: hash upload`);
    // 创建合约实例
    const readOnlyFair = await getFairIntGen();
    let writeFair = readOnlyFair.connect(new Wallet(privateKey, provider));

    await getCurrentBlockTime();

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

    //上传hash
    console.log(hash);
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
            datas[step][1].randomNumAfter = ni;
            datas[step][1].r = ri;
            datas[step][1].executionTime = t.toString();
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
                // set next relay number, update next relay info
                await setNextRelayInfo(relays, ++currentStep, ni);
            }
        });

    // 检测对方重传
    reuploadPromise
        .then(async (resReuploadNum) => {
            let { ni } = resReuploadNum;
            datas[step][1].randomNumAfter = ni;
            datas[step][1].status = '随机数已重新上传';
            datas[step][1].randomText = datas[step][1].randomNumBefore + ' / ' + ni.toString();
            console.log('监听到relay重传随机数');
            await setNextRelayInfo(relays, ++currentStep, ni);
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
        let addressB = relays[step].anonymousAccount;

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
            datas[i][0].isUpload === true &&
            datas[i][0].randomNumBefore === datas[i][0].randomNumAfter &&
            datas[i][0].isReupload === false &&
            !datas[i][0].hasChecked
        ) {
            console.log('random num check...');
            // fair integer check
            const hash = getHash(
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
                console.log('随机数错误');
                // applicant: temp account, relay: anonymous account
                let { key: privateKey, address: addressA } = accountInfo.selectedAccount[i];
                let addressB = relays[i].anonymousAccount;
                const readOnlyFair = await getFairIntGen();
                const wallet = new Wallet(privateKey, provider);
                let writeFair = readOnlyFair.connect(wallet);

                // regenerate random num
                let {
                    ni: niReuploaded,
                    ri,
                    hash
                } = getRandom(Number(datas[i][0].executionTime), Number(datas[i][1].executionTime));
                datas[i][0].randomNumAfter = niReuploaded;
                await writeFair.reuploadNum(addressB, datas[i][0].dataIndex as number, 0, niReuploaded, ri);
                // 更改状态
                datas[i][0].randomText = datas[i][0].randomNumBefore + ' / ' + niReuploaded;
                datas[i][0].status = '随机数已重新上传';
                datas[i][0].isReupload = true;
                // 设置next relay
                let nextStep = i + 1;
                await setNextRelayInfo(relays, nextStep, niReuploaded);
            } else {
                let nextIndex = (datas[i][0].randomNumBefore + datas[i][1].randomNumBefore) % 100;
                let nextStep = i + 1;
                await setNextRelayInfo(relays, nextStep, nextIndex);
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

// next relay
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
        else
            return (
                `next relay: (fair integer: ${relays[activeStep.value + 1].relayFairInteger} + blinding number: ${sendInfo.b[activeStep.value]}) % 100 = ` +
                `${(relays[activeStep.value + 1].relayFairInteger + sendInfo.b[activeStep.value]) % 100}`
            );
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

/* 右下角显示按钮 */
.table-container {
    position: relative;
}
</style>
