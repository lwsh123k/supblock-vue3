import { getAccountInfo } from '@/api';
import { verifyWrongData } from '@/api/verifyWrongData';
import { getApp2ReceivedData, getApp2RelayData } from '@/ethers/chainData/getApp2RelayData';
import { useApplicantStore, type RelayAccount } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';
import { ElMessage } from 'element-plus';
import { storeToRefs } from 'pinia';
import { toRef } from 'vue';

// whether reset
export async function verifyTokenAndReset(chainId: number) {
    const tokens = toRef(useApplicantStore(), 'tokens');
    let { chainLength } = useLoginStore();
    if (tokens.value[chainId].verifyResult === true) {
        console.log('token is correct');
        ElMessage({
            message: 'Token successfully relayed',
            type: 'success',
            duration: 3000
        });
    } else {
        // send to validator to verify chain data
        // token received and c
        let wrongData = [];
        for (let i = 0; i <= chainLength + 2; i++) {
            let PA = getApp2RelayData(chainId, i);
            let PAReceive = getApp2ReceivedData(chainId, i);
            wrongData.push({ PA, PAReceive });
        }
        let result = await verifyWrongData(wrongData);

        // reset data
        if (result === false) {
            let appStore = useApplicantStore();
            let { resetTableData: func1, resetRelayInfo: func2 } = appStore;
            let relayIndex = toRef(appStore, 'relayIndex');
            func1(chainId); // table data
            func2(chainId); // relay info
            relayIndex.value[chainId] = 0; // Currently interacting relay
            ElMessage({
                message: 'Token is incorrect. Data has been reset.',
                type: 'error',
                duration: 3000
            });
        }
    }
}
