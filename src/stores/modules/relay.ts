import { defineStore } from 'pinia';
import { ref, computed, reactive, readonly } from 'vue';
import { getFairIntGen, getStoreData } from '@/ethers/contract';
import { Wallet } from 'ethers';
import { useLoginStore } from '@/stores/modules/login';
import { getDecryptData } from '@/ethers/util';
import { sendNextRelay2AppData } from '@/ethers/dataTransmission/getRelayResData';

// 用于接收发送方的请求
export const useRelayStore = defineStore('relayStore', () => {
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

    // 重置
    function $reset() {}

    return { dataFromApplicant, dataFromRelay, dataToApplicant };
});
