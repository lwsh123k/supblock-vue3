import { getAccountInfo } from '@/api';
import type { RelayAccount } from '@/stores/modules/applicant';

// set next relay info
export async function setNextRelayInfo(relays: RelayAccount[], currentIndex: number, ni: number) {
    relays[currentIndex].index = ni;
    let accountInfo = await getAccountInfo(ni);
    relays[currentIndex].publicKey = accountInfo.publicKey;
    relays[currentIndex].realNameAccount = accountInfo.address;
}
