import { useLoginStore } from '@/stores/modules/login';
import type { AppToRelayData } from './chainDataType';

// 获取applicant to next relay的数据
export function getApp2RelayData(relayNumber: number) {
    const loginStore = useLoginStore();
    const { chainLength, accountInfo, validatorAccount, sendInfo } = loginStore;
    let data: AppToRelayData = {
        from: null,
        to: null,
        appTempAccount: null,
        r: null,
        hf: null,
        hb: null,
        b: null,
        c: null
    };
    if (relayNumber === 0) {
        data.from = accountInfo.realNameAccount.address;
        data.to = validatorAccount;
        data.r = sendInfo.r[0];
        data.hf = sendInfo.hashForward[0];
        data.hb = sendInfo.hashBackward[0];
        data.b = sendInfo.b[0];
    } else if (relayNumber >= 1 && relayNumber <= chainLength - 1) {
        data.from = accountInfo.selectedAccount[relayNumber - 1].address; // 发送者为pre applicant temp account
        data.appTempAccount = accountInfo.selectedAccount[relayNumber].address; // 数据包含和下一个relay交互的账户
        data.r = sendInfo.r[relayNumber];
        data.hf = sendInfo.hashForward[relayNumber];
        data.hb = sendInfo.hashBackward[relayNumber];
        data.b = sendInfo.b[relayNumber];
        data.c = 100;
    } else if (relayNumber === chainLength) {
        data.from = accountInfo.selectedAccount[relayNumber - 1].address;
        data.appTempAccount = accountInfo.selectedAccount[relayNumber].address;
        data.r = sendInfo.r[relayNumber];
        data.hf = sendInfo.hashForward[relayNumber];
        data.hb = sendInfo.hashBackward[relayNumber];
        data.c = 100;
    } else if (relayNumber === chainLength + 1) {
        data.from = accountInfo.selectedAccount[relayNumber - 1].address;
        data.appTempAccount = accountInfo.selectedAccount[relayNumber].address;
        data.r = sendInfo.r[relayNumber];
        data.hf = sendInfo.hashForward[relayNumber];
        data.hb = sendInfo.hashBackward[relayNumber];
    } else if (relayNumber === chainLength + 2) {
        data.from = accountInfo.selectedAccount[relayNumber - 1].address;
        data.appTempAccount = accountInfo.selectedAccount[relayNumber].address;
        data.r = sendInfo.r[relayNumber];
    }

    return data;
}
