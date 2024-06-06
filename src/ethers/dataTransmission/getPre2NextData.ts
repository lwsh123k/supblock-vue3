//  前一个relay向后一个relay发送数据
const relayReceivedData = new Map();
export function getPre2NextData(preApplicantTemp: string, preRelay: string, nextRelayAccount: string) {
    // 查找next relay是由当前relay和哪一个applicant选出的

    let data = relayReceivedData.get(nextRelayAccount);
    return data;
}
