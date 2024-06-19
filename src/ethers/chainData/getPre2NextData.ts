import { preUserData } from '../eventListen/relayEventListen';

export type PreToNextRelayData = {
    from: null | string; // pre relay anonymous account
    to: null | string; // relay
    preAppTempAccount: null | string; // 和pre relay对应的pre app temp account, 和AppToRelayData中from对应
    preRelayAccount: null | string; // pre relay anonymous account
    hf: null | string;
    hb: null | string;
    b: null | number;
    n: null | number;
    t: null | string; // ??????????
};
//  pre relay -> next relay
export function getPre2NextData(preApplicantTemp: string, preRelay: string, nextRelayAccount: string) {
    // 查找next relay是由当前relay和哪一个applicant选出的

    let data = preUserData.get(nextRelayAccount);
    return data;
}
