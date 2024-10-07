import { getAccountInfo } from '@/api';
import { useApplicantStore, type RelayAccount } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';
import { storeToRefs } from 'pinia';

// set next relay info
export async function setNextRelayInfo(
    chainIndex: number,
    nextRelayIndex: number,
    ni: number,
    updatePlace: string = 'event listening'
) {
    // 获取b
    const loginStore = useLoginStore();
    const { sendInfo, chainLength } = loginStore;
    let oneChainSendInfo = sendInfo[chainIndex];
    // get relay
    const { relays } = storeToRefs(useApplicantStore());
    let relay = relays.value[chainIndex];

    // not update the last two
    if (nextRelayIndex > chainLength) {
        console.log('not update the last two, default is validator');
        return;
    }

    // check has updated
    if (relay[nextRelayIndex].publicKey != '') {
        console.log(
            `next relay info has updated in ${updatePlace === 'event listening' ? 'extension' : 'event listening'}`
        );
        return;
    }
    console.log(`updating relay info in ${updatePlace}`);

    // (n + b) % 100
    let b = oneChainSendInfo.b[nextRelayIndex - 1];
    relay[nextRelayIndex].b = b;
    relay[nextRelayIndex].relayFairInteger = ni;
    relay[nextRelayIndex].relayNumber = (ni + b) % 100;

    let accountInfo = await getAccountInfo((ni + b) % 100);
    console.log('next relay real account info: ', accountInfo);
    relay[nextRelayIndex].publicKey = accountInfo.publicKey;
    relay[nextRelayIndex].realNameAccount = accountInfo.address;
}
