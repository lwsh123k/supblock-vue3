import { useLoginStore } from '@/stores/modules/login';
import type { RelayResData } from '../chainData/chainDataType';
import { getStoreData } from '../contract';
import { ensure0xPrefix, getDecryptData, keccak256 } from '../util';
import { useApplicantStore } from '@/stores/modules/applicant';
import { toRef } from 'vue';
import { useVerifyStore } from '@/stores/modules/verifySig';

// 监听relay anonymous account -> applicant temp account: relay将要使用的实名账户信息
export async function listenRelayRes(appTempAccounts: string[]) {
    const storeData = await getStoreData();
    const { tempAccountInfo } = useLoginStore();
    let applicantStore = useApplicantStore();
    let relays = applicantStore.relays;

    let RelayResFilter = storeData.filters.RelayResEvidenceEvent(null, null);
    storeData.on(
        RelayResFilter,
        async (relayAnonymousAccount, appTempAccount, data, dataHash, responseEvidence, chainIndex) => {
            // 过滤不是发给自己的
            if (!appTempAccounts.includes(appTempAccount)) return;
            // get app temp account private key
            let specificChain = tempAccountInfo[chainIndex];
            let decodedData: RelayResData | null = null,
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
            console.log(`relay -> app(relay send realname account). data:`, decodedData);
            console.log(
                `relay -> app(relay send realname account). hash verification result: ${hashResult}, received hash: ${dataHash}, computed hash: ${computedHash}`
            );

            // update next relay's real name account, save token
            let { from, to, nextRelayRealnameAccount, token } = decodedData;
            let intermediateToken = toRef(useVerifyStore(), 'intermediateToken');
            intermediateToken.value[chainIndex][relayIndex + 1] = token;

            console.log(
                `relay -> app(update next relay real name account in ethersjs), chain index: ${chainIndex}, next relay index: ${relayIndex + 1}, next relay real name account: ${nextRelayRealnameAccount}`
            );
            relays[chainIndex][relayIndex + 1].realNameAccount = nextRelayRealnameAccount;
        }
    );
}
