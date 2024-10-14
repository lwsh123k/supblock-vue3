import { useLoginStore } from '@/stores/modules/login';
import type { AppReceivedData, AppToRelayData } from './chainDataType';
import { ethers } from 'ethers';
import { useApplicantStore } from '@/stores/modules/applicant';

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

export function getApp2ReceivedData(chainIndex: number, relayIndex: number) {
    const loginStore = useLoginStore();
    const { chainLength, chainNumber, allAccountInfo, validatorAccount, sendInfo, tempAccountInfo } = loginStore;
    if (chainIndex > chainNumber || relayIndex > chainNumber + 2) {
        throw new Error('error chain index or relay number');
    }
    let { relays, tokens } = useApplicantStore();
    let chainRelay = relays[chainIndex];
    let chainToken = tokens[chainIndex];

    let oneChainTempAccountInfo = tempAccountInfo[chainIndex];
    let data: AppReceivedData = {
        tokenhash: null,
        relayTempAccount: null,
        encrypedToken: null,
        endingAccount: null
    };
    if (relayIndex === 0) {
        data.tokenhash = chainToken.tokenHash;
    } else if (relayIndex >= 1 && relayIndex <= chainLength) {
        data.relayTempAccount = chainRelay[relayIndex].anonymousAccount;
    } else if (relayIndex === chainLength + 1) {
        data.encrypedToken = chainToken.tokenReceived;
    } else if (relayIndex === chainLength + 2) {
        data.endingAccount = oneChainTempAccountInfo.selectedAccount[chainLength + 2].address;
    }

    return data;
}
export function getPubkeyFromKey(privatekay: string) {
    let publicKey = new ethers.Wallet(privatekay).publicKey;
    return publicKey;
}
