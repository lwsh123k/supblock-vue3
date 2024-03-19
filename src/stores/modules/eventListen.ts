import { defineStore } from 'pinia';
import { ref, computed, reactive, readonly } from 'vue';
import { ethers } from 'ethers';
import { provider } from '@/ethers/provider';
import { fairIntGenAddress, storeDataAddress } from '@/ethers/contract.json';
import { fairIntGenAbi, storeDataAbi } from '@/ethers/contractInfo';
import { listenReqNum, listenResNum } from '@/ethers/timedListen';
import FiContractInteract from '@/ethers/fairIntGen';
import { getFairIntGen } from '@/ethers/contract';

interface StaetInfo {
    senderState: number[];
    receiverState: number[];
}
interface RandomInfo {
    myRandom: number[];
    otherRandom: number[];
}
export const useEventListenStore = defineStore('eventListen', () => {
    // 作为请求者和响应者展示状态
    const stateInfo: StaetInfo = reactive({
        senderState: [],
        receiverState: []
    });
    const randomInfo: RandomInfo = reactive({
        myRandom: [],
        otherRandom: []
    });

    // 响应者接收到的数据
    interface ApplicantData {
        role: string;
        randomNum: number | string | null;
        executionTime: number | string | null;
        r: string | null;
        hash: string;
        status: string;
        index?: string;
    }
    interface RelayData {}
    const dataFromApplicant = reactive<ApplicantData[]>([]); // 记录随机数请求
    const dataToApplicant = reactive<ApplicantData[]>([]); // 记录随机数响应
    const dataFromRelay = null; // relay发来的信息

    // 作为响应者一直监听到来的事件, 事件包括请求者hash上传 和 下一个relay的data
    async function backendListen(myAddress: string) {
        const fairIntGen = await getFairIntGen();
        let hashFilter = fairIntGen.filters.UploadHash(null, myAddress, 0);

        // 监听请求者上传hash
        fairIntGen.on(hashFilter, async (from, to, type, hash, uploadTime, index) => {
            console.log('监听到了hash, ', from, to, type, hash, uploadTime, index);
            let len = dataFromApplicant.length;
            dataFromApplicant.push({
                role: 'applicant',
                randomNum: null,
                executionTime: null,
                r: null,
                status: 'hash已上传',
                hash: hash,
                index: index.toString()
            });
            // 定时监听随机数
            try {
                let result = await listenReqNum(from, to);
                dataFromApplicant[len - 1].randomNum = result.ni;
                dataFromApplicant[len - 1].r = result.ri;
                dataFromApplicant[len - 1].executionTime = result.t;
                console.log('监听到了随机数', result);
            } catch (reason) {
                console.log('没有监听到', reason);
                // 重传
            }
        });

        // 监听relay信息
        const StoreData = new ethers.Contract(storeDataAddress, storeDataAbi, provider);
        let filter = StoreData.filters.storeDataEvent(null, myAddress);
        StoreData.on(filter, async (from, to, data) => {
            console.log('监听到了消息上传, data: ', data);
            // 需不需要区分是谁发给relay的?
        });
    }

    // 重置
    function $reset() {}

    return { stateInfo, backendListen };
});
