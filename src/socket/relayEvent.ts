import { useLoginStore } from '@/stores/modules/login';
import { socketMap } from '.';
import type { PreToNextRelayData } from '@/ethers/chainData/chainDataType';

// relay sends final data to validator, using anonymous account
export async function relaySendFinalData(data: PreToNextRelayData) {
    // obtain the account corresponding to the validator
    let { allAccountInfo } = useLoginStore();
    let anonymousAccount = allAccountInfo.anonymousAccount.address;
    console.log(`using ${anonymousAccount} to send final data to validator`);

    // relay to validator
    let socket0 = socketMap.get(anonymousAccount);
    if (!socket0) throw new Error('socket not found when chain initialize');

    // get data, returned data including chain num
    socket0.emit('relay to validator: final data', data);
}
