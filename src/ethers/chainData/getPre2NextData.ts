import { useLoginStore } from '@/stores/modules/login';
import { relayReceivedData, relaySend2NextData, type CombinedData, type PreToNextRelayData } from './chainDataType';
import { addHexAndMod, getDecryptData, getEncryptData } from '../util';

// receive data: pre applicant temp account and pre relay anonymous account -> current relay
// send data: current relay -> next relay, this data from previous received data.
// 根据当前relay和applicant找到发送的数据
export async function getPre2NextData(
    currentApplicantTemp: string,
    currentRelayRealnameAccount: string,
    nextRelayAccount: string,
    nextRelayPubkey: string
) {
    // pre applicant -> current: 数据包含下一次要用的账号, 即 currentApplicantTemp, 所以遍历找到数据
    let expectedData: CombinedData | null = null;
    for (const [key, value] of relayReceivedData) {
        if (value.appToRelayData?.appTempAccount === currentApplicantTemp) {
            expectedData = value;
            break;
        }
    }

    // data not found
    if (expectedData === null) throw new Error('current to next data not found');
    if (!expectedData?.preToNextRelayData?.t) {
        console.log('t is null or undefined: ', expectedData?.preToNextRelayData?.t);
        throw new Error('t not exist');
    }
    if (!expectedData.appToRelayData?.appTempAccountPubkey) {
        console.log('app temp account pubkey not exist');
        throw new Error('app temp account pubkey not exist');
    }
    console.log('expected data: ', expectedData);

    // encrypt t with c
    let c = expectedData?.appToRelayData?.c!;
    let tokenAddc = addHexAndMod(expectedData?.preToNextRelayData?.t, c);
    console.log(
        `t: ${expectedData?.preToNextRelayData?.t}, c: ${expectedData.appToRelayData.c}, token + c: ${tokenAddc}`
    );
    // let currentApplicantTempPubkey = expectedData.appToRelayData?.appTempAccountPubkey; // 收到的appTempAccount就是当前轮对应的applicant交互账户
    // let encryptedToken = await getEncryptData(currentApplicantTempPubkey, tokenAddc);
    let processedData = {
        from: currentRelayRealnameAccount,
        to: nextRelayAccount,
        preAppTempAccount: currentApplicantTemp,
        preRelayAccount: currentRelayRealnameAccount,
        hf: expectedData?.appToRelayData?.hf,
        hb: expectedData?.appToRelayData?.hb,
        b: expectedData?.appToRelayData?.b,
        n: expectedData?.preToNextRelayData?.n,
        t: tokenAddc,
        l: expectedData?.appToRelayData?.l!
    };
    return processedData;
}

export async function getRelay2ValidatorData(data: CombinedData): Promise<PreToNextRelayData> {
    let { allAccountInfo, validatorAccount, validatorPubkey } = useLoginStore();

    if (!data.preToNextRelayData?.t) {
        console.log('t not exist');
        throw new Error('t not exist');
    }

    if (!data.appToRelayData?.appTempAccountPubkey) {
        console.log('app temp account pubkey not exist');
        throw new Error('app temp account pubkey not exist');
    }
    console.log('expected data: ', data);

    // encrypt t with pubkey of current app temp account
    let c = data.appToRelayData?.c!;
    let token = data.preToNextRelayData.t;
    let tokenAddc = addHexAndMod(token, c);
    console.log(`t: ${data?.preToNextRelayData?.t}, c: ${data.appToRelayData.c}, token + c: ${tokenAddc}`);
    // let currentApplicantTempPubkey = data.appToRelayData?.appTempAccountPubkey; // 收到的appTempAccount就是当前轮对应的applicant交互账户
    // let encryptedToken = await getEncryptData(currentApplicantTempPubkey, tokenAddc);

    let processedData: PreToNextRelayData = {
        from: allAccountInfo.anonymousAccount.address,
        to: validatorAccount,
        preAppTempAccount: data.appToRelayData?.from!,
        preRelayAccount: data.preToNextRelayData?.from!,
        hf: data.appToRelayData?.hf!,
        hb: data.appToRelayData?.hb!,
        b: data.appToRelayData?.b!,
        n: data.preToNextRelayData?.n!,
        t: tokenAddc,
        l: data.appToRelayData?.l!
    };
    return processedData;
}
