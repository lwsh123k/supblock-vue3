import { useLoginStore } from '@/stores/modules/login';
import { getFairIntGen, getStoreData } from '../contract';
import { BigNumber, Wallet } from 'ethers';
import { useRelayStore } from '@/stores/modules/relay';
import { ensure0xPrefix, getDecryptData, keccak256, verifyHashBackward, verifyHashForward } from '../util';
import { sendNextRelay2AppData } from '../chainData/getRelay2AppData';
import {
    relaySend2NextData,
    relayReceivedData,
    type AppToRelayData,
    type CombinedData,
    type PreToNextRelayData,
    type DataHash,
    type InfoHash,
    type TxHash
} from '../chainData/chainDataType';
import { relaySendFinalData } from '@/socket/relayEvent';
import { getRelay2ValidatorData } from '../chainData/getPre2NextData';
import { provider } from '../provider';
import { getAccountInfoByInfoHash, getBlindedFairIntByInfoHash } from '../chainData/getChainData';
import type { App2RelayEventEvent, Pre2NextEventEvent } from '../types/StoreData';

// relay: listen hash, listen pre relay data, listen pre applicant data
export async function backendListen() {
    // get data from store
    const { allAccountInfo } = useLoginStore();
    const relayStore = useRelayStore();
    const dataToApplicant = relayStore.dataToApplicant; // 取引用, 保持reactive
    const dataFromApplicant = relayStore.dataFromApplicant;

    // relay监听hash上传, 使用realname account
    let { address: anonymousAddress } = allAccountInfo.anonymousAccount;
    let { address: realNameAddress } = allAccountInfo.realNameAccount;
    const fairIntGen = await getFairIntGen();
    let hashFilter = fairIntGen.filters.ReqHashUpload(null, realNameAddress);
    fairIntGen.on(hashFilter, async (from, to, infoHash, tA, tB, index) => {
        // console.log('app -> relay: hash upload, ', from, to, infoHash, tA.toNumber(), tB.toNumber(), uploadTime.toString(), index.toString());
        console.log('app -> relay: hash upload event detected');
        console.log('data: ', {
            applicant: from,
            relayRealNameAccount: to,
            infoHash,
            tA: tA.toNumber(),
            tB: tB.toNumber(),
            index: index.toString()
        });
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

    // store contract事件监听
    const currentBlockNumber = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlockNumber - 20);
    const targetBlockCount = 5; // 目标监听的区块数量
    let processedBlockCount = 0; // 已处理的区块数量

    // relay监听store data, 使用anonymous account
    // applicant -> relay, 此处的applicant是和当前relay对应的temp account
    const storeData = await getStoreData();
    let app2Relayfilter = storeData.filters.App2RelayEvent(null, anonymousAddress);
    // 监听未来的event
    storeData.on(app2Relayfilter, async (from, relay, data, dataHash, infoHash, event) => {
        await processApp2RelayEvent(from, relay, data, dataHash, infoHash, event, 'future listening');
    });

    // next relay listening: current relay -> next relay, using real name account
    let pre2Nextfilter = storeData.filters.Pre2NextEvent(null, anonymousAddress);
    // 监听未来的event
    storeData.on(pre2Nextfilter, async (from, relay, data, tokenHash, dataHash, event) => {
        await processPre2NextEvent(from, relay, data, tokenHash, dataHash, event, 'future listening');
    });

    // 当前block向前20个, 避免错过
    const pastEvents1 = await storeData.queryFilter(app2Relayfilter, fromBlock, currentBlockNumber);
    console.log(`searching from ${fromBlock} to ${currentBlockNumber}`);
    console.log('app to relay past event:', pastEvents1);
    // app to relay past event
    for (const event of pastEvents1) {
        const { from, relay, data, dataHash, infoHash } = event.args;
        await processApp2RelayEvent(from, relay, data, dataHash, infoHash, event, 'past listening');
    }
    // pre relay to next relay past event
    const pastEvents2 = await storeData.queryFilter(pre2Nextfilter, fromBlock, currentBlockNumber);
    console.log('pre to next relay past event:', pastEvents2);
    for (const event of pastEvents2) {
        const { from, relay, data, tokenHash, dataHash } = event.args;
        await processPre2NextEvent(from, relay, data, tokenHash, dataHash, event, 'past listening');
    }

    // 更加保险的做法, 监听current block +0, +1, +2区块
    // 设置 block 监听器并在处理完指定数量后移除
    const blockListener = async (blockNumber: number) => {
        console.log(`New block: ${blockNumber}`);

        // 查询该区块的事件
        const events1 = await storeData.queryFilter(app2Relayfilter, blockNumber, blockNumber);
        console.log('app to relay current event:', events1);
        for (const event of events1) {
            const { from, relay, data, dataHash, infoHash } = event.args;
            await processApp2RelayEvent(from, relay, data, dataHash, infoHash, event, 'current listening');
        }
        const events2 = await storeData.queryFilter(pre2Nextfilter, blockNumber, blockNumber);
        console.log('pre to next relay current event:', events2);
        for (const event of events2) {
            const { from, relay, data, tokenHash, dataHash } = event.args;
            await processPre2NextEvent(from, relay, data, tokenHash, dataHash, event, 'current listening');
        }

        processedBlockCount++;
        console.log(`Processed ${processedBlockCount} of ${targetBlockCount} blocks`);

        // 当处理完指定数量的区块后，移除监听器
        if (processedBlockCount >= targetBlockCount) {
            console.log('Target block count reached, removing block listener');
            provider.removeListener('block', blockListener);
        }
    };

    // 添加 block 监听器
    provider.on('block', blockListener);
}

async function processApp2RelayEvent(
    from: string,
    relay: string,
    data: string,
    dataHash: string,
    infoHash: string,
    event: App2RelayEventEvent,
    place: 'future listening' | 'past listening' | 'current listening'
) {
    console.log(`监听到app to next relay消息 in ${place}, data:`);
    const { allAccountInfo } = useLoginStore();
    // decode and save. 解码的数据中包含applicant下次要用的账号
    let decodedData: AppToRelayData = await getDecryptData(allAccountInfo.anonymousAccount.key, data);
    // 验证接收到的数据和hash一致
    let computedHash = keccak256(JSON.stringify(decodedData));
    computedHash = ensure0xPrefix(computedHash);
    let hashVerifyResult = computedHash === dataHash;
    if (!hashVerifyResult) {
        console.log(
            `app -> next: hash verification not pass, received hash: ${dataHash}, computed hash: ${computedHash}`
        );
        return;
    }
    console.log(decodedData);

    // verify data and send back
    // next relay通过socket使用匿名账户回复applicant
    // decodedData.lastUserRelay = lastRelay;
    let preAppTempAccount = from; // 对应关系
    await checkPreDataAndRes(
        preAppTempAccount,
        'pre appliacnt temp account',
        decodedData,
        dataHash,
        infoHash,
        event.transactionHash
    );
}

async function processPre2NextEvent(
    from: string,
    relay: string,
    data: string,
    tokenHash: string,
    dataHash: string,
    event: Pre2NextEventEvent,
    place: 'future listening' | 'past listening' | 'current listening'
) {
    console.log(`监听到pre relay to next relay消息 in ${place}, data:`);
    const { allAccountInfo } = useLoginStore();
    // 收到的数据中包含pre applicant temp account
    let decodedData: PreToNextRelayData = await getDecryptData(allAccountInfo.anonymousAccount.key, data);
    // 验证hash
    if (decodedData.t == null) {
        console.log('missing t in decodedData', decodedData);
        return;
    }
    let computedDataHash = keccak256(JSON.stringify(decodedData));
    let computedTokenHash = keccak256(decodedData.t);
    let dataHashResult = computedDataHash === dataHash,
        tokenHashResult = computedTokenHash === tokenHash;
    if (!dataHashResult || !tokenHashResult) {
        console.log(
            'pre -> next: hash verification not pass',
            `received data hash: ${dataHash}, computed data hash: ${computedDataHash}`,
            `received token hash: ${tokenHash}, computed token hash: ${computedTokenHash}`
        );
        return;
    }

    let { from: from1, to, preAppTempAccount } = decodedData;
    console.log(decodedData);

    // verify and send back
    if (!preAppTempAccount) throw new Error("pre applicant temp account does't exist");
    await checkPreDataAndRes(preAppTempAccount, 'pre relay account', decodedData, dataHash, '', event.transactionHash);
}

// 检查l大1, 正向hash, 申请者发送的token和relay接收的是否一致
async function checkPreDataAndRes(
    preAppTempAccount: string,
    from: string,
    data: AppToRelayData | PreToNextRelayData,
    dataHash: string,
    infoHash: string,
    txHash: string
) {
    const { chainLength } = useLoginStore();
    let savedData = relayReceivedData.get(preAppTempAccount);

    // 一开始就没有数据 or overwrite previous data???!!!
    if (savedData === undefined) {
        savedData = {};
    }
    // 避免重复打开
    if (savedData.appToRelayData && savedData.preToNextRelayData) {
        console.log('saved data has existed, data has been processed');
        return;
    }

    // 判断是谁调用
    if (from === 'pre appliacnt temp account') {
        savedData.appToRelayData = {
            ...data,
            dataHash,
            infoHash,
            txHash
        } as AppToRelayData & DataHash & InfoHash & TxHash;
        relayReceivedData.set(preAppTempAccount, savedData);
        // 通过保存数据, 检查对方是否上传数据; 如果上传, 就检查数据是否正确
        if ('preToNextRelayData' in savedData) {
            // verify, fair intager, hashforward, hashbackward
            console.log('verify data: ', relayReceivedData.get(preAppTempAccount));
            let res = await verifyData(savedData);
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
        savedData.preToNextRelayData = { ...data, dataHash, txHash } as PreToNextRelayData & DataHash & TxHash;
        relayReceivedData.set(preAppTempAccount, savedData);

        // check if the other side has uploaded data, if so, verify data
        if ('appToRelayData' in savedData) {
            // verify
            console.log('verify data: ', relayReceivedData.get(preAppTempAccount));
            let res = await verifyData(savedData);
            // send back to applicant, using ano
            if (res) {
                let app2RelayDataHash = savedData.appToRelayData?.dataHash;
                if (!app2RelayDataHash) {
                    console.log(`app to relay data hash is null or undefined`);
                    return;
                }
                await sendNextRelay2AppData(preAppTempAccount, app2RelayDataHash);
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

async function verifyData(data: CombinedData) {
    if (!data.appToRelayData || !data.preToNextRelayData) return false;
    // 验证随机数(每个账号都知道自己的唯一标识)
    let b = data.preToNextRelayData.b,
        n = data.preToNextRelayData.n;
    if (b === null || n === null) return false;

    let infoHash = data.appToRelayData.infoHash;
    let blindedFairIntNum = await getBlindedFairIntByInfoHash(infoHash, b);
    console.log('blindedFairIntNum:', blindedFairIntNum);

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

    // 验证token, 不用做
    let tokenVerifyResult = true;

    // 数据不够, 只能验证正向hash
    let hb = data.preToNextRelayData.hb,
        nextHb = data.appToRelayData.hb;
    // r = data.appToRelayData.r, 没有r, 无法验证反向hash
    // let res2 = verifyHashBackward()
    let res2 = true;

    if (res1 && res2 && tokenVerifyResult) return true;

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
