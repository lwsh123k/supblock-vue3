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
    }
    interface RelayData {}
    const dataFromApplicant = reactive<AppToRelayData[]>([]); // 记录随机数请求
    const dataToApplicant = reactive<RelayToAppData[]>([]); // 记录随机数响应
    const dataFromRelay = null; // relay发来的信息

    // 作为响应者一直监听到来的事件, 事件包括请求者hash上传 和 下一个relay的data

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
                executionTime: null,
                r: null,
                hash: '',
                status: '',
                index: null
            });
        });

        // 监听relay信息
        const storeData = await getStoreData();
        let storeDatafilter = storeData.filters.storeDataEvent(null, myAddress);
        storeData.on(storeDatafilter, async (from, to, data) => {
            console.log('监听到了消息上传, data: ', data);
            // 需不需要区分是谁发给relay的?
        });
    }

    // 重置
    function $reset() {}

    return { backendListen, dataFromApplicant, dataFromRelay, dataToApplicant };
});
