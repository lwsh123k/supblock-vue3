import { getAccountInfo } from '@/api';
import type { RelayAccount } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';

// set next relay info
export async function setNextRelayInfo(relays: RelayAccount[], nextRelayIndex: number, ni: number) {
    // 获取b
    const loginStore = useLoginStore();
    const { sendInfo } = loginStore;

    // (n + b) % 100
    let b = sendInfo.b[nextRelayIndex - 1];
    relays[nextRelayIndex].b = b;
    relays[nextRelayIndex].relayFairInteger = ni;

    let accountInfo = await getAccountInfo((ni + b) % 100);
    console.log('next relay real account info: ', accountInfo);
    relays[nextRelayIndex].publicKey = accountInfo.publicKey;
    relays[nextRelayIndex].realNameAccount = accountInfo.address;
}
