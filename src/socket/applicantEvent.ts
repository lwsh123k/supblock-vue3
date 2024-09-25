import type { Socket } from 'socket.io-client';
import { getApp2RelayData } from '@/ethers/chainData/getApp2RelayData';
import { useApplicantStore } from '@/stores/modules/applicant';
import { storeToRefs } from 'pinia';
import { socketMap } from '.';
import { useLoginStore } from '@/stores/modules/login';
import type { RelayResDate } from '@/ethers/chainData/chainDataType';
import { getHash, keccak256, subHexAndMod } from '@/ethers/util';

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

    socket.on('validator send token t', (data: { verify: Boolean; token: string; chainId: number }) => {
        // console.log(data);
        let { chainId, token } = data;
        console.log(`chain transmission completed, token hash: ${token}, chain number: ${chainId}`);

        // sub all c
        let { sendInfo, chainLength } = useLoginStore();
        let specificSendInfo = sendInfo[chainId];
        for (let i = 1; i <= chainLength; i++) {
            token = subHexAndMod(token, specificSendInfo.c[i]);
        }
        console.log(`token sub all c: ${token}, hash: ${keccak256(token)}`);
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

// applicant sends final data to validator
export async function appSendFinalData(chainIndex: number) {
    // obtain the account corresponding to the validator
    let { tempAccountInfo, chainLength } = useLoginStore();
    let appTempAddress = tempAccountInfo[chainIndex].selectedAccount[chainLength - 1].address;
    console.log(`using ${appTempAddress} to send final data to validator`);

    // applicant to validator, using temp chain length-1 account
    let socket0 = socketMap.get(appTempAddress);
    if (!socket0) throw new Error('socket not found when sending final data');
    // get data, returned data including chain num
    let data = getApp2RelayData(chainIndex, chainLength);
    socket0.emit('applicant to validator: final data', data);
}
