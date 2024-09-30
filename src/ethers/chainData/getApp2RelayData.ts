import { useLoginStore } from '@/stores/modules/login';
import type { AppToRelayData } from './chainDataType';
import { ethers } from 'ethers';

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
        appTempAccountPubkey: null,
        r: null,
        hf: null,
        hb: null,
        b: null,
        c: null,
        l: relayNumber,
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
        let privatekay = oneChainTempAccountInfo.selectedAccount[relayNumber].key;
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address; // 发送者为pre applicant temp account
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address; // 数据包含和下一个relay交互的账户
        data.appTempAccountPubkey = getPubkeyFromKey(privatekay);
        data.r = oneChainSendInfo.r[relayNumber];
        data.hf = oneChainSendInfo.hashForward[relayNumber];
        data.hb = oneChainSendInfo.hashBackward[relayNumber];
        data.b = oneChainSendInfo.b[relayNumber];
        data.c = oneChainSendInfo.c[relayNumber];
    } else if (relayNumber === chainLength) {
        let privatekay = oneChainTempAccountInfo.selectedAccount[relayNumber].key;
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address;
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address;
        data.appTempAccountPubkey = getPubkeyFromKey(privatekay);
        data.r = oneChainSendInfo.r[relayNumber];
        data.hf = oneChainSendInfo.hashForward[relayNumber];
        data.hb = oneChainSendInfo.hashBackward[relayNumber];
        data.c = oneChainSendInfo.c[relayNumber];
    } else if (relayNumber === chainLength + 1) {
        let privatekay = oneChainTempAccountInfo.selectedAccount[relayNumber].key;
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address;
        data.to = validatorAccount;
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address;
        data.appTempAccountPubkey = getPubkeyFromKey(privatekay);
        data.r = oneChainSendInfo.r[relayNumber];
        data.hf = oneChainSendInfo.hashForward[relayNumber];
        data.hb = oneChainSendInfo.hashBackward[relayNumber];
    } else if (relayNumber === chainLength + 2) {
        let privatekay = oneChainTempAccountInfo.selectedAccount[relayNumber].key;
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address;
        data.to = validatorAccount;
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address;
        data.appTempAccountPubkey = getPubkeyFromKey(privatekay);
        data.r = oneChainSendInfo.r[relayNumber];
    }

    return data;
}

export function getPubkeyFromKey(privatekay: string) {
    let publicKey = new ethers.Wallet(privatekay).publicKey;
    return publicKey;
}
