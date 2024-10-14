import type { AppReceivedData, AppToRelayData } from '@/ethers/chainData/chainDataType';
import requests from './requests';

interface wrongDataType {
    PA: AppToRelayData;
    PAReceive: AppReceivedData;
}

interface VerifyWrongDataResult {
    result: boolean;
}

export async function verifyWrongData(reqData: wrongDataType[]) {
    let data = await requests.post<any, VerifyWrongDataResult>('/verifyWrongData', { wrongData: reqData });
    return data.result;
}
