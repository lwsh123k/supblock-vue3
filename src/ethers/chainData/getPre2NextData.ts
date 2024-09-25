import { useLoginStore } from '@/stores/modules/login';
import { relayReceivedData, relaySend2NextData, type CombinedData, type PreToNextRelayData } from './chainDataType';
import { addHexAndMod, getDecryptData, getEncryptData } from '../util';

// receive data: pre applicant temp account and pre relay anonymous account -> current relay
// send data: current relay -> next relay, this data from previous received data.
// 根据当前relay和applicant找到发送的数据
export async function getPre2NextData(
    currentApplicantTemp: string,
    currentRelayAnonymousAccount: string,
    nextRelayAccount: string,
    nextRelayPubkey: string
) {
    // pre applicant -> current: 数据包含下一次要用的账号, 即 currentApplicantTemp, 所以遍历找到数据
    let expectedData: CombinedData | null = null;
    for (const [key, value] of relayReceivedData) {
        if (value.appToRelayData?.appTempAccount === currentApplicantTemp) expectedData = value;
    }
    if (expectedData === null) throw new Error('pre to next data not found');

    // process data
    // decrypt t
    const { allAccountInfo } = useLoginStore();
    let { realNameAccount } = allAccountInfo;
    if (!expectedData?.preToNextRelayData?.t) {
        console.log('t is null or undefined: ', expectedData?.preToNextRelayData?.t);
        throw new Error('t not exist');
    }
    console.log('t: ', expectedData?.preToNextRelayData?.t, typeof expectedData?.preToNextRelayData?.t);
    let decryptedT = await getDecryptData(realNameAccount.key, expectedData?.preToNextRelayData?.t!);

    // encrypt t with pubkey of next relay
    let c = expectedData?.appToRelayData?.c!;
    let tokenAddc = addHexAndMod(decryptedT, c);
    let encryptedToken = getEncryptData(nextRelayPubkey, tokenAddc);
    let processedData = {
        from: currentRelayAnonymousAccount,
        to: nextRelayAccount,
        preAppTempAccount: currentApplicantTemp,
        preRelayAccount: currentRelayAnonymousAccount,
        hf: expectedData?.appToRelayData?.hf,
        hb: expectedData?.appToRelayData?.hb,
        b: expectedData?.appToRelayData?.b,
        n: expectedData?.preToNextRelayData?.n,
        t: encryptedToken,
        l: expectedData?.appToRelayData?.l!
    };
    return processedData;
}

export async function getRelayFinalData(data: CombinedData): Promise<PreToNextRelayData> {
    let { allAccountInfo, validatorAccount, validatorPubkey } = useLoginStore();

    // decrypt t
    let { realNameAccount } = allAccountInfo;
    if (data.preToNextRelayData?.t === undefined) {
        console.log('t not exist');
        throw new Error('t not exist');
    }
    let decryptedT = await getDecryptData(realNameAccount.key, data.preToNextRelayData?.t!);

    // encrypt t with pubkey of validator
    let c = data.appToRelayData?.c!;
    let tokenAddc = addHexAndMod(decryptedT, c);
    let encryptedToken = await getEncryptData(validatorPubkey, tokenAddc);

    let processedData: PreToNextRelayData = {
        from: allAccountInfo.anonymousAccount.address,
        to: validatorAccount,
        preAppTempAccount: data.appToRelayData?.from!,
        preRelayAccount: data.preToNextRelayData?.from!,
        hf: data.appToRelayData?.hf!,
        hb: data.appToRelayData?.hb!,
        b: data.appToRelayData?.b!,
        n: data.preToNextRelayData?.n!,
        t: encryptedToken,
        l: data.appToRelayData?.l!
    };
    return processedData;
}
