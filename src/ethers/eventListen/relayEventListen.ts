import { useLoginStore } from '@/stores/modules/login';
import { getFairIntGen, getStoreData } from '../contract';
import { BigNumber, Wallet } from 'ethers';
import { useRelayStore } from '@/stores/modules/relay';
import { ensure0xPrefix, getDecryptData, keccak256, verifyHashBackward, verifyHashForward } from '../util';
import { sendNextRelay2AppData } from '../chainData/getRelayResData';
import {
    relaySend2NextData,
    relayReceivedData,
    type AppToRelayData,
    type CombinedData,
    type PreToNextRelayData
} from '../chainData/chainDataType';
import { relaySendFinalData } from '@/socket/relayEvent';
import { getRelay2ValidatorData } from '../chainData/getPre2NextData';
import { triggerEvents } from './autoUpload';
import { toRef } from 'vue';
import type { BigIntOptions } from 'fs';
import { provider } from '../provider';

// relay: listen hash, listen pre relay data, listen pre applicant data
export async function backendListen() {
    // get data from store
    const { allAccountInfo } = useLoginStore();
    const relayStore = useRelayStore();
    const dataToApplicant = relayStore.dataToApplicant; // 取引用, 保持reactive
    const dataFromApplicant = relayStore.dataFromApplicant;

    // relay listening: hash upload, using anonymous account
    let { address: anonymousAddress } = allAccountInfo.anonymousAccount;
    let { address: realNameAddress } = allAccountInfo.realNameAccount;
    const fairIntGen = await getFairIntGen();
    let hashFilter = fairIntGen.filters.ReqHashUpload(null, anonymousAddress);
    fairIntGen.on(hashFilter, async (from, to, infoHash, tA, tB, uploadTime, index) => {
        // console.log('app -> relay: hash upload, ', from, to, infoHash, tA.toNumber(), tB.toNumber(), uploadTime.toString(), index.toString());
        console.log(
            `app -> relay: hash upload data:`,
            `from: ${from}, to: ${to}, infoHash: ${infoHash}, tA: ${tA.toNumber()}, tB: ${tB.toNumber()}, uploadTime: ${uploadTime.toString()}, index: ${index.toString()}`
        );

        dataFromApplicant.push({
            role: 'applicant',
            from: from,
            to: to,
            randomNumBefore: null,
            randomText: null,
            executionTime: tA.toNumber(),
            tA: tA.toNumber(),
            tB: tB.toNumber(),
            r: null,
            status: 'hash已上传',
            hash: infoHash,
            index: index.toNumber()
        });
        dataToApplicant.push({
            role: 'relay',
            executionTime: tB.toString(),
            r: null,
            hash: '',
            status: '',
            index: null,
            isReupload: false,
            isUpload: false
        });

        // 展示最新数据
        // activeStep.value = Math.min(dataFromApplicant.length, dataToApplicant.length) - 1;

        // 自动上传
        // triggerEvents();
        // finally do this by watching dataFromApplicant.length
    });

    // next relay listening: app -> next, using real name account
    // applicant -> relay, 此处的applicant是和当前relay对应的temp account
    const storeData = await getStoreData();
    let app2Relayfilter = storeData.filters.App2RelayEvent(null, realNameAddress);
    // 监听未来的event
    storeData.on(app2Relayfilter, async (from, relay, data, dataHash, dataIndex, lastRelay) => {
        await processApp2RelayEvent(from, relay, data, dataHash, dataIndex, lastRelay);
    });

    // next relay listening: current relay -> next relay, using real name account
    let pre2Nextfilter = storeData.filters.Pre2NextEvent(null, realNameAddress);
    // 监听未来的event
    storeData.on(pre2Nextfilter, async (from, relay, data, dataIndex) => {
        await processPre2NextEvent(from, relay, data, dataIndex);
    });

    // 当前block向前10个, 避免错过
    const currentBlockNumber = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlockNumber - 10); // Ensure fromBlock is not negative
    const pastEvents1 = await storeData.queryFilter(app2Relayfilter, fromBlock, currentBlockNumber);
    // console.log(pastEvents1);
    // app to relay past event
    for (const event of pastEvents1) {
        const { from, relay, data, dataHash, dataIndex, lastRelay } = event.args;
        await processApp2RelayEvent(from, relay, data, dataHash, dataIndex, lastRelay);
    }
    // pre relay to next relay past event
    const pastEvents2 = await storeData.queryFilter(pre2Nextfilter, fromBlock, currentBlockNumber);
    for (const event of pastEvents2) {
        const { from, relay, data, dataIndex } = event.args;
        await processPre2NextEvent(from, relay, data, dataIndex);
    }
}

async function processApp2RelayEvent(
    from: string,
    relay: string,
    data: string,
    dataHash: string,
    dataIndex: BigNumber,
    lastRelay: boolean
) {
    const { allAccountInfo } = useLoginStore();
    // decode and save. 解码的数据中包含applicant下次要用的账号
    let decodedData: AppToRelayData = await getDecryptData(allAccountInfo.realNameAccount.key, data);
    // 验证接收到的数据和hash一致
    let computedHash = keccak256(JSON.stringify(decodedData));
    computedHash = ensure0xPrefix(computedHash);
    let hashVerifyResult = computedHash === dataHash;
    if (!hashVerifyResult) {
        console.log(`hash verification not pass, reactived hash: ${dataHash}, computed hash: ${computedHash}`);
        return;
    }
    console.log(`app -> relay: ${decodedData}`);

    // verify data and send back
    // next relay通过socket使用匿名账户回复applicant
    // decodedData.lastUserRelay = lastRelay;
    let preAppTempAccount = from; // 对应关系
    await checkPreDataAndRes(preAppTempAccount, 'pre appliacnt temp account', decodedData, dataHash);
}

async function processPre2NextEvent(from: string, relay: string, data: string, dataIndex: BigNumber) {
    console.log('监听到pre relay to next relay消息, data: ');
    const { allAccountInfo } = useLoginStore();
    // 收到的数据中包含pre applicant temp account
    let decodedData: PreToNextRelayData = await getDecryptData(allAccountInfo.realNameAccount.key, data);
    let { from: from1, to, preAppTempAccount, preRelayAccount, hf, hb, b, n, t } = decodedData;
    console.log(decodedData);

    // verify and send back
    if (!preAppTempAccount) throw new Error("pre applicant temp account does't exist");
    await checkPreDataAndRes(preAppTempAccount, 'pre relay account', decodedData);
}
async function checkPreDataAndRes(
    preAppTempAccount: string,
    from: string,
    data: AppToRelayData | PreToNextRelayData,
    dataHash: string = ''
) {
    const { chainLength } = useLoginStore();
    let savedData = relayReceivedData.get(preAppTempAccount);

    // 一开始就没有数据 or overwrite previous data???
    if (savedData === undefined) {
        savedData = {};
    }
    // 避免重复打开
    if (savedData.appToRelayData && savedData.preToNextRelayData) {
        console.log('saved data has existed');
        return;
    }

    // 判断是谁调用
    if (from === 'pre appliacnt temp account') {
        savedData.appToRelayData = data as AppToRelayData;
        savedData.appToRelayDataHash = dataHash;
        relayReceivedData.set(preAppTempAccount, savedData);
        // 通过保存数据, 检查对方是否上传数据; 如果上传, 就检查数据是否正确
        if ('preToNextRelayData' in savedData) {
            // verify, fair intager, hashforward, hashbackward
            console.log('verify data: ', relayReceivedData.get(preAppTempAccount));
            let res = verifyData(savedData);
            // send back to applicant, using ano
            if (res) {
                await sendNextRelay2AppData(preAppTempAccount, dataHash);
                // if this relay is the last user relay, it will directly send data to validator
                // Assuming the verifier is honest, so using socket
                if (savedData.appToRelayData?.l && savedData.appToRelayData?.l === chainLength) {
                    console.log('last relay: send data to validator');
                    let data = await getRelay2ValidatorData(savedData);
                    relaySendFinalData(data);
                }
            } else {
                console.log('verify result: false');
            }
        }
    } else if (from === 'pre relay account') {
        savedData.preToNextRelayData = data as PreToNextRelayData;
        relayReceivedData.set(preAppTempAccount, savedData);

        // check if the other side has uploaded data, if so, verify data
        if ('appToRelayData' in savedData) {
            // verify
            console.log('verify data: ', relayReceivedData.get(preAppTempAccount));
            let res = verifyData(savedData);
            // send back to applicant, using ano
            if (res) {
                let dataHash = savedData.appToRelayDataHash;
                if (!dataHash) {
                    console.log(`data hash is null or undefined`);
                    return;
                }
                await sendNextRelay2AppData(preAppTempAccount, dataHash);
                if (savedData.appToRelayData?.l && savedData.appToRelayData?.l === chainLength) {
                    console.log('last relay: send data to validator');
                    let data = await getRelay2ValidatorData(savedData);
                    relaySendFinalData(data);
                }
            } else {
                console.log('verify result: false');
            }
        }
    }
}

function verifyData(data: CombinedData) {
    if (!data.appToRelayData || !data.preToNextRelayData) return false;
    // 验证随机数(每个账号都知道自己的唯一标识)
    let b = data.preToNextRelayData.b,
        n = data.preToNextRelayData.n;
    if (b === null || n === null) return false;
    let rnd = ((b + n) % 99) + 1;

    // 验证l
    if (data.appToRelayData.l != data.preToNextRelayData.l + 1) {
        console.log('data to next relay, l is not expected');
        return false;
    }
    // 验证hash, 只有正向hash可以验证
    let hf = data.appToRelayData.hf,
        preHf = data.preToNextRelayData.hf,
        r = data.appToRelayData.r,
        appTempAccount = data.appToRelayData.appTempAccount;
    if (!hf || !preHf || !r || !appTempAccount) return false;
    let res1 = verifyHashForward(appTempAccount, r, hf, preHf, true);
    console.log('receive data from pre relay and applicant, hash chain verification result: ', res1);

    // 数据不够, 只能验证正向hash
    let hb = data.preToNextRelayData.hb,
        nextHb = data.appToRelayData.hb;
    // r = data.appToRelayData.r, 没有r, 无法验证反向hash
    // let res2 = verifyHashBackward()
    let res2 = true;

    if (res1 && res2) return true;

    return false;
}

// save data for next relay in advance. not used.
function saveData2NextRelay(appTempAccount: string, from: string, data: AppToRelayData | PreToNextRelayData) {
    let data2NextRelay = relaySend2NextData.get(appTempAccount);
    if (data2NextRelay === undefined) {
        // current relay -> next:
        // @ts-ignore
        data2NextRelay = {
            from: null, //current relay
            to: null,
            preAppTempAccount: null, // the current applicant corresponding to current relay
            preRelayAccount: null, //current relay
            hf: null,
            hb: null,
            b: null,
            n: null,
            t: null
        };
        // @ts-ignore
        relaySend2NextData.set(appTempAccount, data2NextRelay);
    }

    // if (from === 'pre appliacnt' && 'c' in data) {
    //     data2NextRelay.hf = data.hf;
    //     data2NextRelay.hb = data.hb;
    //     data2NextRelay.b = data.b;
    // } else if (from === 'pre relay' && 'n' in data) {
    //     data2NextRelay.n = data.n;
    //     data2NextRelay.t = data.t;
    // }
}
