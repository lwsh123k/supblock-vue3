import { getAccountInfo } from '@/api';
import { verifyWrongData } from '@/api/verifyWrongData';
import { getApp2ReceivedData, getApp2RelayData, getApp2RelayInfoHash } from '@/ethers/chainData/getApp2RelayData';
import { appSendConfirmation } from '@/socket/applicantEvent';
import { useApplicantStore } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';
import { useVerifyStore } from '@/stores/modules/verifySig';
import { ElMessage } from 'element-plus';
import { storeToRefs } from 'pinia';
import { toRef } from 'vue';

/**
 * 验证错误数据
 * @param chainId 第几条连, 0, 1, 2
 */
export async function verifyTokenAndReset(chainId: number) {
    const tokens = toRef(useVerifyStore(), 'tokens');
    let { chainLength } = useLoginStore();
    let { relays } = useApplicantStore();
    if (tokens.value[chainId].verifyResult === true) {
        console.log(`chain ${chainId}: token is correct`);
        ElMessage({
            message: 'token successfully relayed',
            type: 'success',
            duration: 3000
        });
    } else {
        // send to validator to verify chain data
        // token received and c
        let wrongData = [];
        for (let i = 0; i <= chainLength + 2; i++) {
            let PA = getApp2RelayData(chainId, i);
            PA.to = relays[chainId][i].anonymousAccount;
            let infoHash = getApp2RelayInfoHash(chainId, i);
            let PAReceive = getApp2ReceivedData(chainId, i);
            wrongData.push({ PA: { ...PA, infoHash }, PAReceive });
        }
        let res = await verifyWrongData(wrongData);

        // reset data
        if (res.result === true) {
            console.log(`${res.index}-${res.address} relayed wrong token. data will be reset. chainid: ${chainId}`);
            let appStore = useApplicantStore();
            let { resetTableData: func1, resetRelayInfo: func2 } = appStore;
            let relayIndex = toRef(appStore, 'relayIndex');
            func1(chainId); // table data
            func2(chainId); // relay info
            relayIndex.value[chainId] = 0; // Currently interacting relay
            // clear saved token and hash
            // not need...
            ElMessage({
                message: `${res.index}-${res.address} relayed wrong token. data will be reset.`,
                type: 'error',
                duration: 10000
            });
        } else {
            console.log(`sending chain confirmation, chainid ${chainId}`);
            // send chain confirmation to validator
            appSendConfirmation(chainId);
        }
    }
}
