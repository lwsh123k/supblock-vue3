import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { useLoginStore } from './login';

// 表格中的行数据信息
export interface DataItem {
    role: string;
    address: string;
    randomNumBefore: number; // 首次上传的随机数
    executionTime: string;
    r: string;
    hash: string;
    status: string;
    dataIndex: number | null;
    randomNumAfter: number; //发生错误重传的随机数
    randomText: string; // table展示上传错误, 如: 24 / 72
    isUpload: boolean;
    isReupload: boolean;
    hasChecked?: boolean;
}
//  每一个中继的信息
export interface RelayAccount {
    relayNumber: number; // relay的编号
    relayFairInteger: number; // 选出的随机数
    b: number; // 混淆fair integer
    publicKey: string;
    realNameAccount: string;
    anonymousAccount: string;
}

// 存储appliacnt申请过程中的数据, 数据和statistics页面共享, 用于请求所需的gas
export const useApplicantStore = defineStore('applicantStore', () => {
    // 表格数据项, 需要初始化其中的数据
    let { chainLength, chainNumber } = useLoginStore();
    // dim0: chain number; dim1: chain length; dim3: table row data
    let datas = reactive<DataItem[][][]>(
        Array(chainNumber)
            .fill(null)
            .map(() => [])
    );
    for (let i = 0; i < chainNumber; i++) {
        for (let j = 0; j <= chainLength + 2; j++) {
            resetCurrentStep(datas[i], j);
        }
    }
    // 初始化数据的函数
    function resetCurrentStep(tableData: DataItem[][], stepIndex: number) {
        if (!tableData[stepIndex]) {
            tableData[stepIndex] = [];
        }
        tableData[stepIndex] = [
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

    // 定义并初始化relay信息. 第一维: 链的个数, 第二维: 链的长度
    let relays = reactive<RelayAccount[][]>(
        Array(chainNumber)
            .fill(null)
            .map(() => [])
    );
    for (let i = 0; i < chainNumber; i++) {
        // 第一个为 validator
        relays[i][0] = {
            relayNumber: -1, // -1: validator
            relayFairInteger: -10,
            b: -10,
            publicKey:
                '0x374462096f4ccdc90b97c0201d0ad8ff67da224026dc20e61c107f577db537d049648511e4e922ce74a0ff7494eeac72317e60a48cb2a71af21e4e2258fcca36',
            realNameAccount: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
            anonymousAccount: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba'
        };

        // 当随机数选出来时, 可以知道next relay real name account 和 real name account对应的pub key;
        // 当下一个relay回送消息时, 可以知道relay anonymous account
        for (let j = 1; j <= chainLength + 2; j++) {
            relays[i][j] = {
                relayNumber: -2, // -2: not defined, relayNumber = (relayFairInteger + b) % 100
                relayFairInteger: -10,
                b: -10, // not used, use sendInfo.b[] in login.ts
                publicKey: '',
                realNameAccount: '',
                anonymousAccount: ''
            };

            // the last two is validator: chainLength+1, chainLength+2
            if (i > chainLength) relays[i][j] = relays[i][0];
        }
    }

    // 定义当前relayIndex, 即applicant正在和第几个relay通信
    // one dimension array, each element in it represents a relay index
    let relayIndex = reactive<number[]>(Array(chainNumber).fill(0));

    // 重置
    function $reset() {}

    return { datas, resetCurrentStep, relays, relayIndex };
});
