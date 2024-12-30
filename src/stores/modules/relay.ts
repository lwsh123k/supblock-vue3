import { defineStore } from 'pinia';
import { ref, computed, reactive, readonly } from 'vue';
import type { AppToRelayData, RelayToAppData } from './types';

// 用于接收发送方的请求
export const useRelayStore = defineStore('relayStore', () => {
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
