import { relayReceivedData, relaySend2NextData } from './chainDataType';

// receive data: pre applicant temp account and pre relay anonymous account -> current relay
// send data: current relay -> next relay, this data from previous received data.
// 根据当前relay和applicant找到发送的数据
export function getPre2NextData(
    currentApplicantTemp: string,
    currentRelayAnonymousAccount: string,
    nextRelayAccount: string
) {
    // pre applicant -> current: 数据包含下一次要用的账号, 即 currentApplicantTemp, 所以遍历找到数据
    let expectedData;
    for (const [key, value] of relayReceivedData) {
        if (value.appToRelayData?.appTempAccount === currentApplicantTemp) expectedData = value;
    }

    // process data
    let processedData = {
        from: currentRelayAnonymousAccount,
        to: nextRelayAccount,
        preAppTempAccount: currentApplicantTemp,
        preRelayAccount: currentRelayAnonymousAccount,
        hf: expectedData?.appToRelayData?.hf,
        hb: expectedData?.appToRelayData?.hb,
        b: expectedData?.appToRelayData?.b,
        n: expectedData?.preToNextRelayData?.n,
        t: expectedData?.preToNextRelayData?.t
    };
    return processedData;
}
