import { useLoginStore } from '@/stores/modules/login';
import { getFairIntGen, getStoreData } from '../contract';
import { Wallet } from 'ethers';
import { useRelayStore } from '@/stores/modules/relay';
import { getDecryptData, verifyHashBackward, verifyHashForward } from '../util';
import type { AppToRelayData } from '../chainData/getApp2RelayData';
import { sendNextRelay2AppData } from '../chainData/getRelayResData';
import type { PreToNextRelayData } from '../chainData/getPre2NextData';

// 记录pre applicant temp和pre relay给relay发送的消息
export type CombinedData = {
    appToRelayData?: AppToRelayData;
    preToNextRelayData?: PreToNextRelayData;
};
export const preUserData = new Map<string, CombinedData>();

// 作为响应者一直监听到来的事件, 事件包括请求者hash上传 和 来自上一个relay的data
export async function backendListen(myAddress: string) {
    // 从store中获取数据
    const { chainLength, accountInfo, validatorAccount, sendInfo } = useLoginStore();
    const relayStore = useRelayStore();
    const dataToApplicant = relayStore.dataToApplicant; // 取引用, 保持reactive
    const dataFromApplicant = relayStore.dataFromApplicant;

    // 创建合约实例
    let { key: privateKey } = accountInfo.anonymousAccount;
    const fairIntGen = await getFairIntGen();
    let hashFilter = fairIntGen.filters.ReqHashUpload(null, myAddress);
    // 监听请求者上传hash
    fairIntGen.on(hashFilter, async (from, to, infoHash, tA, tB, uploadTime, index) => {
        console.log('监听到了hash, ', from, to, infoHash, tA, tB, uploadTime, index);
        let len = dataFromApplicant.length;
        dataFromApplicant.push({
            role: 'applicant',
            from: from,
            to: to,
            randomNum: null,
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
            randomNum: null,
            executionTime: tB.toString(),
            r: null,
            hash: '',
            status: '',
            index: null,
            isReupload: false,
            isUpload: false
        });
    });

    // 监听StroreData合约: applicant -> relay
    // 此处的applicant是和当前relay对应的temp account
    const storeData = await getStoreData();
    let app2Relayfilter = storeData.filters.App2RelayEvent(null, myAddress);
    storeData.on(app2Relayfilter, async (from, relay, data, dataIndex) => {
        console.log('监听到app to next relay消息');
        // 给下一个relay发送什么? 发送pre applicant发送来的数据
        // decode and save. 解码的数据中包含applicant下次要用的账号
        let decodedData: AppToRelayData = await getDecryptData(accountInfo.realNameAccount.key, data);
        console.log(decodedData);

        // 验证数据是否符合要求
        // next relay通过socket使用匿名账户回复applicant
        let { from: from1, to, appTempAccount, r, hf, hb, b, c } = decodedData;
        let preAppTempAccount = from; // 对应关系
        checkPreDataAndRes(preAppTempAccount, 'pre appliacnt temp account', decodedData);
    });

    // 监听StroreData合约: pre relay -> next relay信息
    let pre2Nextfilter = storeData.filters.Pre2NextEvent(null, myAddress);
    storeData.on(pre2Nextfilter, async (form, relay, data, dataIndex) => {
        console.log('监听到pre relay to next relay消息, data: ');
        // 收到的数据中包含pre applicant temp account
        let decodedData: PreToNextRelayData = await getDecryptData(accountInfo.realNameAccount.key, data);
        console.log(decodedData);

        // verify and send back
        let { from: from1, to, preAppTempAccount, preRelayAccount, hf, hb, b, n, t } = decodedData;
        if (!preAppTempAccount) throw new Error("pre applicant temp account does't exist");
        checkPreDataAndRes(preAppTempAccount, 'pre relay account', decodedData);
    });
}

function checkPreDataAndRes(preAppTempAccount: string, from: string, data: any) {
    let savedData = preUserData.get(preAppTempAccount);

    // 一开始就没有数据
    if (savedData === undefined) {
        savedData = {};
        preUserData.set(preAppTempAccount, savedData);
    }

    // 判断是谁调用
    if (from === 'pre appliacnt temp account') {
        savedData.appToRelayData = data;
        // 查看对方有没有上传数据
        if (savedData.preToNextRelayData != null) {
            // verify, fair intager, hashforward, hashbackward
            let res = verifyData(savedData);
            // send back to applicant, using ano
            if (res) {
                sendNextRelay2AppData(preAppTempAccount);
            } else {
                console.log('verify result: false');
            }
        }
    } else if (from === 'pre relay account') {
        savedData.preToNextRelayData = data;
        // 查看对方有没有上传数据
        if (savedData.appToRelayData != null) {
            // verify
            let res = verifyData(savedData);
            // send back to applicant, using ano
            if (res) {
                sendNextRelay2AppData(preAppTempAccount);
            } else {
                console.log('verify result: false');
            }
        }
    }
}

function verifyData(data: CombinedData) {
    if (!data.appToRelayData || !data.preToNextRelayData) return false;
    // 验证随机数???????
    let b = data.preToNextRelayData.b,
        n = data.preToNextRelayData.n;
    if (!b || !n) return false;
    let rnd = (b + n) % 100;

    // 验证hash
    let hf = data.appToRelayData.hf,
        preHf = data.preToNextRelayData.hf,
        r = data.appToRelayData.r,
        appTempAccount = data.appToRelayData.appTempAccount;
    if (!hf || !preHf || !r || !appTempAccount) return false;
    let res1 = verifyHashForward(appTempAccount, r, hf, preHf);

    let hb = data.preToNextRelayData.hb,
        nextHb = data.appToRelayData.hb;
    // r = data.appToRelayData.r, 没有r, 无法验证反向hash
    // let res2 = verifyHashBackward()
    let res2 = true;

    if (res1 && res2) return true;

    return false;
}
