import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { useLoginStore } from './login';

// 存储appliacnt申请过程中的数据, 数据和statistics页面共享, 用于请求所需的gas
export const useApplicantStore = defineStore('applicantStore', () => {
    // 定义一个接口来描述表格中的每一项
    interface DataItem {
        role: string;
        address: string;
        randomNumBefore: number; // 首次上传的随机数
        executionTime: number | string;
        r: string;
        hash: string;
        status: string;
        dataIndex: number | null;
        randomNumAfter: number; //发生错误重传的随机数
        randomText: string; // table展示上传错误, 如: 24 / 72
        isUpload: boolean;
        isReupload: boolean;
    }

    // 表格数据项, 需要初始化其中的数据
    let datas = reactive<DataItem[][]>([]);
    for (let i = 0; i < 6; i++) {
        resetCurrentStep(i);
    }

    // 初始化数据的函数
    function resetCurrentStep(current: number) {
        datas[current] = [
            {
                role: 'appliacnt',
                address: '',
                randomNumBefore: -1,
                executionTime: '',
                r: '',
                hash: '',
                dataIndex: null,
                status: '',
                randomNumAfter: -1,
                randomText: '',
                isUpload: false,
                isReupload: false
            },
            {
                role: 'relay',
                address: '',
                randomNumBefore: -1,
                executionTime: '',
                r: '',
                hash: '',
                dataIndex: null,
                status: '',
                randomNumAfter: -1,
                randomText: '',
                isUpload: false,
                isReupload: false
            }
        ];
    }

    // relay信息, 第一个为validator
    interface RelayAccount {
        index: number; // relay的编号
        publicKey: string;
        address: string;
    }
    let relays = reactive<RelayAccount[]>([]);
    relays[0] = {
        index: -1,
        publicKey:
            '0x374462096f4ccdc90b97c0201d0ad8ff67da224026dc20e61c107f577db537d049648511e4e922ce74a0ff7494eeac72317e60a48cb2a71af21e4e2258fcca36',
        address: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba'
    };
    for (let i = 1; i < 6; i++) {
        relays[i] = {
            index: -1,
            publicKey: '',
            address: ''
        };
    }

    // 定义当前relayIndex, 即applicant正在和第几个relay通信
    let relayIndex = ref(0);

    // 重置
    function $reset() {}

    return { datas, resetCurrentStep, relays, relayIndex };
});
