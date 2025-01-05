import type { AppReceivedData, AppToRelayData } from '@/ethers/chainData/chainDataType';
import requests from './requests';

interface wrongDataType {
    PA: AppToRelayData & { infoHash: string | null };
    PAReceive: AppReceivedData;
}

interface VerifyWrongDataResult {
    result: boolean;
    index?: number;
    address?: string;
}

/**
 * 验证错误
 * @param reqData 错误数据
 * @returns true代表错误, false代表正确
 */
export async function verifyWrongData(reqData: wrongDataType[]) {
    let data = await requests.post<any, VerifyWrongDataResult>('/verifyWrongData', { wrongData: reqData });
    return data;
}
