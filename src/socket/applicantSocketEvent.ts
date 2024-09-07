import type { Socket } from 'socket.io-client';
import { getApp2RelayData } from '@/ethers/chainData/getApp2RelayData';
import { useApplicantStore } from '@/stores/modules/applicant';
import { storeToRefs } from 'pinia';
import { socketMap } from '.';
import { useLoginStore } from '@/stores/modules/login';
import type { RelayResDate } from '@/ethers/chainData/chainDataType';

// applicant -> validator: chain initialization data
export function appSendInitData(chainIndex: number, appTemp0Address: string) {
    // applicant to validator, using temp 0 account
    let socket0 = socketMap.get(appTemp0Address);
    if (!socket0) throw new Error('socket not found when chain initialize');
    // get data, returned data including chain num
    let data = getApp2RelayData(chainIndex, 0);
    socket0.emit('applicant to validator: initialization data', data);
}

// app listening: validator
export function appRecevieValidatorData(socket: Socket) {
    socket.on('verify correct', (data) => {
        // console.log(data);
        let { chainIndex, tokenHash } = data;
        console.log(`chain initialization complete, token hash: ${tokenHash}, chain number: ${chainIndex}`);
    });
}

// app listening: next relay's anonymous account
export function appRecevieRelayData(socket: Socket) {
    let applicantStore = useApplicantStore();
    let relays = applicantStore.relays;
    let { relayIndex } = storeToRefs(applicantStore);
    socket.on('next relay to app', (data: RelayResDate) => {
        // console.log(data);
        let { from, to, nextRelayAnonymousAccount, chainIndex } = data;
        console.log(`chain index: ${chainIndex}, next relay anonymous account: ${nextRelayAnonymousAccount}`);

        // update relays to use the relay's anonymous account in next round of joint random selection
        relays[chainIndex][relayIndex.value[chainIndex]].anonymousAccount = nextRelayAnonymousAccount;
    });
}

// app sends blinding number to validator
// 通过hash标识具体在使用哪条链的哪个节点
export async function send2Extension(tempAccount: string, relayAccount: string, hash: string, b: number) {
    let loginStore = useLoginStore();
    let { allAccountInfo } = loginStore;
    // it's a helper function, so always using real name account socket to send
    let socket0 = socketMap.get(allAccountInfo.realNameAccount.address);
    let data = { tempAccount, relayAccount, hash, blindingNumber: b };

    socket0.emit('blinding number', data);
}
