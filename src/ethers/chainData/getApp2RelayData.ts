import { useLoginStore } from '@/stores/modules/login';
import type { AppToRelayData } from './chainDataType';

// 获取applicant to next relay的数据
export function getApp2RelayData(relayIndex: number) {
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
    if (relayIndex === 0) {
        data.from = accountInfo.realNameAccount.address;
        data.to = validatorAccount;
        data.r = sendInfo.r[0];
        data.hf = sendInfo.hashForward[0];
        data.hb = sendInfo.hashBackward[0];
        data.b = sendInfo.b[0];
    } else if (relayIndex >= 1 && relayIndex <= chainLength - 1) {
        data.from = accountInfo.selectedAccount[relayIndex - 1].address; // 发送者为pre applicant temp account
        data.appTempAccount = accountInfo.selectedAccount[relayIndex].address; // 数据包含和下一个relay交互的账户
        data.r = sendInfo.r[relayIndex];
        data.hf = sendInfo.hashForward[relayIndex];
        data.hb = sendInfo.hashBackward[relayIndex];
        data.b = sendInfo.b[relayIndex];
        data.c = 100;
    } else if (relayIndex === chainLength) {
        data.from = accountInfo.selectedAccount[relayIndex - 1].address;
        data.appTempAccount = accountInfo.selectedAccount[relayIndex].address;
        data.r = sendInfo.r[relayIndex];
        data.hf = sendInfo.hashForward[relayIndex];
        data.hb = sendInfo.hashBackward[relayIndex];
        data.c = 100;
    } else if (relayIndex === chainLength + 1) {
        data.from = accountInfo.selectedAccount[relayIndex - 1].address;
        data.appTempAccount = accountInfo.selectedAccount[relayIndex].address;
        data.r = sendInfo.r[relayIndex];
        data.hf = sendInfo.hashForward[relayIndex];
        data.hb = sendInfo.hashBackward[relayIndex];
    } else if (relayIndex === chainLength + 2) {
        data.from = accountInfo.selectedAccount[relayIndex - 1].address;
        data.appTempAccount = accountInfo.selectedAccount[relayIndex].address;
        data.r = sendInfo.r[relayIndex];
    }

    return data;
}
