import requests from './requests';

type LastRelayType = {
    chainIndex: number;
    lastRelayAccount: string;
    lastRelayIndex: number;
    hashForward: string;
};

/**
 * 验证错误
 * @param reqData 错误数据
 * @returns true代表错误, false代表正确
 */
export async function findLastRelay(appEndingAccount: string) {
    let data = await requests.post<any, { lastRelayInfo: LastRelayType[] }>('/findLastRelay', { appEndingAccount });
    return data.lastRelayInfo;
}
