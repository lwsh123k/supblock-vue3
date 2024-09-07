import { useLoginStore } from '@/stores/modules/login';
import type { AppToRelayData } from './chainDataType';

// applicant -> next relay data
// use chainNum and relayNum to determine sending data
export function getApp2RelayData(chainIndex: number, relayNumber: number) {
    const loginStore = useLoginStore();
    const { chainLength, allAccountInfo, validatorAccount, sendInfo, tempAccountInfo } = loginStore;
    let oneChainSendInfo = sendInfo[chainIndex],
        oneChainTempAccountInfo = tempAccountInfo[chainIndex];
    let data: AppToRelayData = {
        from: null,
        to: null,
        appTempAccount: null,
        r: null,
        hf: null,
        hb: null,
        b: null,
        c: null,
        chainIndex: chainIndex
    };
    if (relayNumber === 0) {
        data.from = allAccountInfo.realNameAccount.address;
        data.to = validatorAccount;
        data.r = oneChainSendInfo.r[0];
        data.hf = oneChainSendInfo.hashForward[0];
        data.hb = oneChainSendInfo.hashBackward[0];
        data.b = oneChainSendInfo.b[0];
    } else if (relayNumber >= 1 && relayNumber <= chainLength - 1) {
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address; // 发送者为pre applicant temp account
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address; // 数据包含和下一个relay交互的账户
        data.r = oneChainSendInfo.r[relayNumber];
        data.hf = oneChainSendInfo.hashForward[relayNumber];
        data.hb = oneChainSendInfo.hashBackward[relayNumber];
        data.b = oneChainSendInfo.b[relayNumber];
        data.c = 100;
    } else if (relayNumber === chainLength) {
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address;
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address;
        data.r = oneChainSendInfo.r[relayNumber];
        data.hf = oneChainSendInfo.hashForward[relayNumber];
        data.hb = oneChainSendInfo.hashBackward[relayNumber];
        data.c = 100;
    } else if (relayNumber === chainLength + 1) {
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address;
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address;
        data.r = oneChainSendInfo.r[relayNumber];
        data.hf = oneChainSendInfo.hashForward[relayNumber];
        data.hb = oneChainSendInfo.hashBackward[relayNumber];
    } else if (relayNumber === chainLength + 2) {
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address;
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address;
        data.r = oneChainSendInfo.r[relayNumber];
    }

    return data;
}
