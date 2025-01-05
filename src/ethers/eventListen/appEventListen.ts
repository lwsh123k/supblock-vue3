import { useLoginStore } from '@/stores/modules/login';
import type { RelayResData } from '../chainData/chainDataType';
import { getStoreData } from '../contract';
import { ensure0xPrefix, getDecryptData, keccak256 } from '../util';
import { useApplicantStore } from '@/stores/modules/applicant';
import { toRef } from 'vue';
import { useVerifyStore } from '@/stores/modules/verifySig';

// socket监听relay anonymous account -> applicant temp account: relay将要使用的实名账户信息
// 功能与区块监听重合===
export async function listenRelayRes(appTempAccounts: string[]) {
    const storeData = await getStoreData();
    const { tempAccountInfo } = useLoginStore();
    let { chainNumber, chainLength } = useLoginStore();
    let { relays, allInfoHash } = useApplicantStore();

    let RelayResFilter = storeData.filters.RelayResEvidenceEvent(null, null);
    storeData.on(
        RelayResFilter,
        async (
            relayAnonymousAccount,
            appTempAccount,
            data,
            dataHash,
            app2RelayResEvidence,
            pre2NextResEvidence,
            infoHash
        ) => {
            // 过滤不是发给自己的
            if (!appTempAccounts.includes(appTempAccount)) return;
            // get app temp account private key

            let decodedData: RelayResData | null = null,
                chainIndex: number = -1,
                relayIndex: number = -1;
            // 既可以对比app2RelayResEvidence, 也可以尝试解码数据来获取chain index和relay index
            let found = false;
            for (let i = 0; i < chainNumber && !found; i++) {
                let specificChain = allInfoHash[i];
                for (let j = 0; j < chainLength; j++) {
                    let myInfoHash = specificChain[j];
                    try {
                        if (ensure0xPrefix(myInfoHash) === ensure0xPrefix(infoHash)) {
                            let privateKey = tempAccountInfo[i].selectedAccount[j].key;
                            decodedData = await getDecryptData(privateKey, data);
                            chainIndex = i;
                            relayIndex = j;
                            found = true;
                            break;
                        }
                    } catch (error) {}
                }
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

            // update next relay's real name account, save encrypted token
            let { nextRelayRealnameAccount } = decodedData;
            console.log(
                `relay -> app(update next relay real name account in ethersjs), chain index: ${chainIndex}, next relay index: ${relayIndex + 1}, next relay real name account: ${nextRelayRealnameAccount}`
            );
            relays[chainIndex][relayIndex + 1].realNameAccount = nextRelayRealnameAccount;
        }
    );
}
