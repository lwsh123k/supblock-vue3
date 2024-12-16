import { defineStore } from 'pinia';
import { ref, computed, reactive, readonly } from 'vue';
import { getFairIntGen, getStoreData } from '@/ethers/contract';
import { Wallet } from 'ethers';
import { useLoginStore } from '@/stores/modules/login';
import { getDecryptData } from '@/ethers/util';
import { sendNextRelay2AppData } from '@/ethers/chainData/getRelayResData';

// 用于接收发送方的请求
export const useRelayStore = defineStore('relayStore', () => {
    // 响应者接收到的数据
    interface AppToRelayData {
        role: string;
        from: string;
        to: string;
        randomNumBefore: number | string | null;
        randomText: number | string | null;
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
        randomNumBefore: number; // 首次上传的随机数
        executionTime: number | string | null;
        r: string | null;
        hash: string;
        status: string;
        index: number | null;
        randomNumAfter: number; //发生错误重传的随机数
        randomText: string; // table展示上传错误, 如: 24 / 72
        isUpload?: boolean;
        isReupload?: boolean;
        hasChecked?: boolean;
    }
    interface RelayData {}
    const dataFromApplicant = reactive<AppToRelayData[]>([]); // 记录随机数请求
    const dataToApplicant = reactive<Partial<RelayToAppData>[]>([]); // 记录随机数响应
    const dataFromRelay = null; // relay发来的信息

    // 是否使用伪造数据, 使用伪造次数解决只在第一次使用伪造数据
    let useFakeData = ref(false);
    let fakeDataTime = ref(0);

    // 切换当前正在和哪个applicant交换数据, 当前为默认最新的applicant
    const activeStep = ref(0);

    // 重置
    function $reset() {}

    return { dataFromApplicant, dataFromRelay, dataToApplicant, useFakeData, fakeDataTime, activeStep };
});
