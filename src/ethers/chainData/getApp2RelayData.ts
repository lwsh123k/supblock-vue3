import { useLoginStore } from '@/stores/modules/login';
import type { AppReceivedData, AppToRelayData } from './chainDataType';
import { ethers } from 'ethers';
import { useApplicantStore } from '@/stores/modules/applicant';
import { useVerifyStore } from '@/stores/modules/verifySig';

/**
 * 获取applicant -> next relay data
 * @param chainIndex 第几条链: 0, 1, 2
 * @param relayNumber 第几个relay: 0, 1, 2...
 * @returns
 */
export function getApp2RelayData(chainIndex: number, relayNumber: number) {
    const loginStore = useLoginStore();
    const { chainLength, allAccountInfo, validatorAccount, sendInfo, tempAccountInfo } = loginStore;
    const { allCheinTokenHash } = useVerifyStore();
    let oneChainSendInfo = sendInfo[chainIndex],
        oneChainTempAccountInfo = tempAccountInfo[chainIndex],
        oneChainEncryptedToken = allCheinTokenHash[chainIndex];
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
        let privatekay = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].key;
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address; // 发送者为pre applicant temp account
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address; // 数据包含和下一个relay交互的账户
        data.appTempAccountPubkey = getPubkeyFromKey(privatekay); // from对应的pubkey
        data.r = oneChainSendInfo.r[relayNumber];
        data.hf = oneChainSendInfo.hashForward[relayNumber];
        data.hb = oneChainSendInfo.hashBackward[relayNumber];
        data.b = oneChainSendInfo.b[relayNumber];
        data.c = oneChainSendInfo.c[relayNumber];
        // data.encrypedTokenOrHash = oneChainEncryptedToken[relayNumber]; // 加密后的token, applicant不能直接获取, 只是转发数据
    } else if (relayNumber === chainLength) {
        let privatekay = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].key;
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address;
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address;
        data.appTempAccountPubkey = getPubkeyFromKey(privatekay);
        data.r = oneChainSendInfo.r[relayNumber];
        data.hf = oneChainSendInfo.hashForward[relayNumber];
        data.hb = oneChainSendInfo.hashBackward[relayNumber];
        data.c = oneChainSendInfo.c[relayNumber];
        // data.encrypedTokenOrHash = oneChainEncryptedToken[relayNumber]; // 加密后的token, applicant不能直接获取, 只是转发数据
    } else if (relayNumber === chainLength + 1) {
        let privatekay = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].key;
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address;
        data.to = validatorAccount;
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address;
        data.appTempAccountPubkey = getPubkeyFromKey(privatekay);
        data.r = oneChainSendInfo.r[relayNumber];
        data.hf = oneChainSendInfo.hashForward[relayNumber];
        data.hb = oneChainSendInfo.hashBackward[relayNumber];
    } else if (relayNumber === chainLength + 2) {
        let privatekay = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].key;
        data.from = oneChainTempAccountInfo.selectedAccount[relayNumber - 1].address;
        data.to = validatorAccount;
        data.appTempAccount = oneChainTempAccountInfo.selectedAccount[relayNumber].address; // ending account为chain length + 2
        data.appTempAccountPubkey = getPubkeyFromKey(privatekay);
        data.r = oneChainSendInfo.r[relayNumber];
    }

    return data;
}

/**
 * 获取applicant和current relay生成公平随机数过程的hash, 然后发给next relay data
 * @param chainIndex 第几条链: 0, 1, 2
 * @param relayNumber 下一次要和哪个relay通信(next relay): 0, 1, 2...
 * @returns 选出下一个relay, 对应的hash
 */
export function getApp2RelayInfoHash(chainIndex: number, relayNumber: number) {
    if (relayNumber < 1) return null;
    let { allInfoHash } = useApplicantStore();
    return allInfoHash[chainIndex][relayNumber - 1];
}
// 验证数据错误时使用
export function getApp2ReceivedData(chainIndex: number, relayIndex: number) {
    const loginStore = useLoginStore();
    const { chainLength, chainNumber, tempAccountInfo } = loginStore;
    if (chainIndex > chainNumber || relayIndex > chainNumber + 2) {
        throw new Error('error chain index or relay number');
    }
    let { relays } = useApplicantStore();
    let { tokens } = useVerifyStore();
    let chainRelay = relays[chainIndex];
    let chainToken = tokens[chainIndex];

    let oneChainTempAccountInfo = tempAccountInfo[chainIndex];
    let data: AppReceivedData = {
        tokenhash: null,
        relayRealnameAccount: null,
        encrypedToken: null,
        endingAccount: null
    };
    if (relayIndex === 0) {
        data.tokenhash = chainToken.tokenHash;
    } else if (relayIndex >= 1 && relayIndex <= chainLength) {
        data.relayRealnameAccount = chainRelay[relayIndex].realNameAccount;
    } else if (relayIndex === chainLength + 1) {
        data.encrypedToken = tokens[chainIndex].tokenReceived; // 从validator接收到的token
    } else if (relayIndex === chainLength + 2) {
        data.endingAccount = oneChainTempAccountInfo.selectedAccount[chainLength + 2].address;
    }

    return data;
}
export function getPubkeyFromKey(privatekay: string) {
    let publicKey = new ethers.Wallet(privatekay).publicKey;
    return publicKey;
}
