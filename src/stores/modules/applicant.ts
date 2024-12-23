import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { useLoginStore } from './login';
import { getAccountInfo } from '@/api';
import type { DataItem, RelayAccount } from './types';
import { getAccountInfoByContract } from '@/ethers/chainData/getAccountById';

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

    // reset table data
    function resetTableData(chainId: number) {
        for (let j = 0; j <= chainLength + 2; j++) {
            resetCurrentStep(datas[chainId], j);
        }
    }

    // reset relay info
    function resetRelayInfo(chainId: number) {
        relays[chainId][0] = {
            relayNumber: -1, // -1: validator
            relayFairInteger: -10,
            b: -10,
            publicKey:
                '0x374462096f4ccdc90b97c0201d0ad8ff67da224026dc20e61c107f577db537d049648511e4e922ce74a0ff7494eeac72317e60a48cb2a71af21e4e2258fcca36',
            realNameAccount: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
            anonymousAccount: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba'
        };
        for (let j = 1; j <= chainLength + 2; j++) {
            relays[chainId][j] = {
                relayNumber: -2, // -2: not defined, relayNumber = (relayFairInteger + b) % 99 + 1
                relayFairInteger: -10,
                b: -10, // not used, use sendInfo.b[] in login.ts
                publicKey: '',
                realNameAccount: '',
                anonymousAccount: ''
            };

            // the last two is validator: chainLength+1, chainLength+2
            if (chainId > chainLength) relays[chainId][j] = relays[chainId][0];
        }
    }

    // 定义并初始化relay信息. 第一维: 链的个数, 第二维: 链的长度
    let relays = reactive<RelayAccount[][]>(
        Array(chainNumber)
            .fill(null)
            .map(() => [])
    );

    // init ralays
    for (let i = 0; i < chainNumber; i++) {
        resetRelayInfo(i);
    }

    // 定义当前relayIndex, 即applicant正在和第几个relay通信
    // one dimension array, each element in it represents a relay index
    let relayIndex = reactive<number[]>(Array(chainNumber).fill(0));

    /**
     * 设置next relay实名账户信息
     * @param chainIndex 哪一条链
     * @param nextRelayIndex 第几个relay
     * @param ni 选出来的公平随机数, 未加b
     * @param updatePlace 在哪儿调用这个函数
     * @returns
     */
    async function setNextRelayRealnameInfo(
        chainIndex: number,
        nextRelayIndex: number,
        ni: number,
        updatePlace: 'event listening A' | 'event listening B' | 'extension listening'
    ) {
        // 获取b
        const loginStore = useLoginStore();
        const { sendInfo, chainLength } = loginStore;
        let oneChainSendInfo = sendInfo[chainIndex];
        // get relay
        let relay = relays[chainIndex];

        // not update the last two
        if (nextRelayIndex > chainLength) {
            console.log('not update the last two, default is validator');
            return;
        }

        // check has updated
        if (relay[nextRelayIndex].publicKey != '') {
            console.log(`${updatePlace} tries to update accounts that have already been updated.`);
            return;
        }
        console.log(`updating relay real name account in ${updatePlace}`);

        // (n + b) % 99 + 1
        let b = oneChainSendInfo.b[nextRelayIndex - 1];
        relay[nextRelayIndex].b = b;
        relay[nextRelayIndex].relayFairInteger = ni;
        relay[nextRelayIndex].relayNumber = ((ni + b) % 99) + 1;

        // 根据索引获得匿名账户account, pubkey
        let accountInfo = await getAccountInfoByContract(((ni + b) % 99) + 1);
        console.log('next relay real account info: ', accountInfo);
        relay[nextRelayIndex].publicKey = accountInfo.publicKey;
        relay[nextRelayIndex].anonymousAccount = accountInfo.address;
    }

    // 重置
    function $reset() {}

    return {
        datas,
        resetCurrentStep,
        relays,
        relayIndex,
        resetTableData,
        resetRelayInfo,
        setNextRelayRealnameInfo
    };
});
