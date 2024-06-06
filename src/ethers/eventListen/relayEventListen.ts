import { useLoginStore } from '@/stores/modules/login';
import { getFairIntGen, getStoreData } from '../contract';
import { Wallet } from 'ethers';
import { useRelayStore } from '@/stores/modules/relay';
import { getDecryptData } from '../util';
import type { AppToRelayData } from '../dataTransmission/getApp2RelayData';
import { sendNextRelay2AppData } from '../dataTransmission/getRelayResData';

// 作为响应者一直监听到来的事件, 事件包括请求者hash上传 和 下一个relay的data
let relayData = new Map(); // 记录applicant和pre relay给relay发送的消息
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
    let app2Relayfilter = storeData.filters.App2RelayEvent(null, null, myAddress);
    storeData.on(app2Relayfilter, async (preApplicantTemp, preRelay, relay, data, dataIndex) => {
        console.log('监听到app to next relay消息');
        // 给下一个relay发送什么? 发送pre applicant发送来的数据
        // decode and save. 解码的数据中包含applicant下次要用的账号
        let decodeData: AppToRelayData = await getDecryptData(accountInfo.realNameAccount.key, data);
        console.log(decodeData);

        // 验证数据是否符合要求
        // next relay通过socket使用匿名账户回复applicant
        sendNextRelay2AppData(preApplicantTemp);
    });

    // 监听StroreData合约: pre relay -> next relay信息
    let pre2Nextfilter = storeData.filters.Pre2NextEvent(null, myAddress);
    storeData.on(pre2Nextfilter, async (preRelay, relay, data, dataIndex) => {
        console.log('监听到pre relay to next relay消息, data: ');
        // 收到的数据中包含pre applicant temp account
        let decodeData: AppToRelayData = await getDecryptData(accountInfo.realNameAccount.key, data);
        console.log(decodeData);

        // 当下一个relay给applicant回复使用的匿名账户
    });
}
