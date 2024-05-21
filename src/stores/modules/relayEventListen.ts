import { defineStore } from 'pinia';
import { ref, computed, reactive, readonly } from 'vue';
import { getFairIntGen, getStoreData } from '@/ethers/contract';
import { Wallet } from 'ethers';
import { useLoginStore } from '@/stores/modules/login';

// 用于接收发送方的请求
export const useEventListenStore = defineStore('eventListen', () => {
    // 使用登录信息
    const { chainLength, accountInfo, validatorAccount, sendInfo } = useLoginStore();

    // 响应者接收到的数据
    interface AppToRelayData {
        role: string;
        from: string;
        to: string;
        randomNum: number | string | null;
        tA: number;
        tB: number;
        executionTime: number | string | null;
        r: string | null;
        hash: string;
        status: string;
        index: number;
    }
    interface RelayToAppData {
        role: string;
        randomNum: number | string | null;
        executionTime: number | string | null;
        r: string | null;
        hash: string;
        status: string;
        index: number | null;
        beforeChange?: number | string; // 检查自己是否上传了错误的随机数
        isUpload?: boolean;
        isReupload?: boolean;
    }
    interface RelayData {}
    const dataFromApplicant = reactive<AppToRelayData[]>([]); // 记录随机数请求
    const dataToApplicant = reactive<RelayToAppData[]>([]); // 记录随机数响应
    const dataFromRelay = null; // relay发来的信息

    // 作为响应者一直监听到来的事件, 事件包括请求者hash上传 和 下一个relay的data
    let relayData = new Map(); // 记录applicant和pre relay给relay发送的消息
    async function backendListen(myAddress: string) {
        // 创建合约实例
        let { key: privateKey } = accountInfo.anonymousAccount;
        const fairIntGen = await getFairIntGen();
        const wallet = new Wallet(privateKey);
        let writeFair = fairIntGen.connect(wallet);
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
                index: null
            });
        });

        // 监听StroreData合约: applicant -> relay
        // applicant和pre relay是一个组合, 在合约中设置, 同时方便查看谁没有上传
        const storeData = await getStoreData();
        let app2Relayfilter = storeData.filters.App2RelayEvent(null, null, myAddress);
        storeData.on(app2Relayfilter, async (applicant, preRelay, relay, data, dataIndex) => {
            console.log('监听到app to relay消息, data: ', data);
            // 验证数据的正确性, 需要先保存起来, 如果另一方已经上传完毕, 则检查是否正确
            // 需不需要区分是谁发给relay的?
        });

        // 监听StroreData合约: pre relay -> next relay信息
        let pre2Nextfilter = storeData.filters.Pre2NextEvent(null, null, myAddress);
        storeData.on(pre2Nextfilter, async (applicant, preRelay, relay, data, dataIndex) => {
            console.log('监听到pre relay to relay消息, data: ', data);
            // 需不需要区分是谁发给relay的?
        });
    }

    // relay向applicant发送数据
    function sendRelay2AppData() {}

    //  前一个relay向后一个relay发送数据
    const relayReceivedData = new Map();
    function getPre2NextData(nextRelayAccount: string) {
        let data = relayReceivedData.get(nextRelayAccount);
        return data;
    }

    // 后一个relay向前一个relay发送响应数据
    function SendToPreRelay() {}
    // 重置
    function $reset() {}

    return { backendListen, dataFromApplicant, dataFromRelay, dataToApplicant, getPre2NextData, relayReceivedData };
});
