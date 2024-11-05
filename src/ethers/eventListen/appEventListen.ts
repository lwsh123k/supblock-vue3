import { useLoginStore } from '@/stores/modules/login';
import type { RelayResDate } from '../chainData/chainDataType';
import { getStoreData } from '../contract';
import { ensure0xPrefix, getDecryptData, keccak256 } from '../util';
import { useApplicantStore } from '@/stores/modules/applicant';

// 持续监听relay real name to applicant temp account信息
export async function listenRelayRes(appTempAccounts: string[]) {
    const storeData = await getStoreData();
    const { tempAccountInfo } = useLoginStore();
    let applicantStore = useApplicantStore();
    let relays = applicantStore.relays;

    let RelayResFilter = storeData.filters.RelayResEvidenceEvent(null, null);
    storeData.on(RelayResFilter, async (relayRealNameAccount, appTempAccount, data, dataHash, chainIndex) => {
        // 过滤不是发给自己的
        if (!appTempAccounts.includes(appTempAccount)) return;
        // get app temp account private key
        let specificChain = tempAccountInfo[chainIndex];
        let decodedData: RelayResDate | null = null,
            relayIndex: number = -1;
        for (let i = 0; i < specificChain.selectedAccount.length; i++) {
            let account = specificChain.selectedAccount[i];
            try {
                let privateKey = account.key;
                decodedData = await getDecryptData(privateKey, data);
                relayIndex = i;
                break;
            } catch (error) {}
        }
        if (decodedData === null || relayIndex === -1) {
            console.log(`decode failed, chainid: ${chainIndex}`);
            return;
        }
        // 验证接收到的数据和hash一致
        let computedHash = keccak256(JSON.stringify(decodedData));
        computedHash = ensure0xPrefix(computedHash);
        let hashResult = computedHash === dataHash;
        // console.log(typeof decodedData);
        console.log(`relay -> app(relay send temp account): ${decodedData}`);
        console.log(
            `hash verification result: ${hashResult}, reactived hash: ${dataHash}, computed hash: ${computedHash}`
        );

        // update next relay's anonymous account
        let { from, to, nextRelayAnonymousAccount } = decodedData;
        console.log(
            `update next relay anonymous account in ethersjs, chain index: ${chainIndex}, next relay index: ${relayIndex + 1}, next relay anonymous account: ${nextRelayAnonymousAccount}`
        );
        relays[chainIndex][relayIndex + 1].anonymousAccount = nextRelayAnonymousAccount;
    });
}
