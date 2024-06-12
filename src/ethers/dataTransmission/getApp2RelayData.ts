import { useLoginStore } from '@/stores/modules/login';

export type AppToRelayData = {
    from: null | string;
    to: null | string;
    r: null | string;
    hf: null | string;
    hb: null | string;
    b: null | number;
    c: null | number;
};

// 获取applicant to next relay的数据
export function getApp2RelayData(relayIndex: number) {
    const loginStore = useLoginStore();
    const { chainLength, accountInfo, validatorAccount, sendInfo } = loginStore;
    let data: AppToRelayData = { from: null, to: null, r: null, hf: null, hb: null, b: null, c: null };
    if (relayIndex === 0) {
        data.from = accountInfo.realNameAccount.address;
        data.to = validatorAccount;
        data.r = sendInfo.r[0];
        data.hf = sendInfo.hashForward[0];
        data.hb = sendInfo.hashBackward[0];
        data.b = sendInfo.b[0];
    } else if (relayIndex >= 1 && relayIndex <= chainLength - 1) {
        data.from = accountInfo.selectedAccount[relayIndex].address;
        data.r = sendInfo.r[relayIndex];
        data.hf = sendInfo.hashForward[relayIndex];
        data.hb = sendInfo.hashBackward[relayIndex];
        data.b = sendInfo.b[relayIndex];
        data.c = 100;
    } else if (relayIndex === chainLength) {
        data.from = accountInfo.selectedAccount[relayIndex].address;
        data.r = sendInfo.r[relayIndex];
        data.hf = sendInfo.hashForward[relayIndex];
        data.hb = sendInfo.hashBackward[relayIndex];
        data.c = 100;
    } else if (relayIndex === chainLength + 1) {
        data.from = accountInfo.selectedAccount[relayIndex].address;
        data.r = sendInfo.r[relayIndex];
        data.hf = sendInfo.hashForward[relayIndex];
        data.hb = sendInfo.hashBackward[relayIndex];
    } else if (relayIndex === chainLength + 2) {
        data.from = accountInfo.selectedAccount[relayIndex].address;
        data.r = sendInfo.r[relayIndex];
    }

    return data;
}
