import type { Socket } from 'socket.io-client';
import { getApp2RelayData } from '@/ethers/chainData/getApp2RelayData';
import { useApplicantStore } from '@/stores/modules/applicant';
import { storeToRefs } from 'pinia';
import { socketMap } from '.';
import { useLoginStore } from '@/stores/modules/login';
import type { RelayResDate } from '@/ethers/chainData/chainDataType';
import { getDecryptData, getHash, keccak256, subHexAndMod } from '@/ethers/util';
import { toRef } from 'vue';
import type { PublicKey, toApplicantSigned } from '@/views/FairIntegerGen/types';
import eccBlind from '@/views/FairIntegerGen/eccBlind';
import { useVerifyStore } from '@/stores/modules/verifySig';

//  get signature, applicant -> validator: chain initialization data
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
    // receive token hash(deprecated, using validator send sig and hash)
    socket.on('verify correct', (data) => {
        // console.log(data);
        let { chainIndex, tokenHash } = data;
        let { chainNumber } = useLoginStore();
        if (chainIndex === null || chainIndex === undefined || chainIndex >= chainNumber) {
            throw new Error('chain index error when chain initialization');
        }
        // save for later verification
        const tokens = toRef(useApplicantStore(), 'tokens');
        tokens.value[chainIndex].tokenHash = tokenHash;
        console.log(`chain initialization complete, token hash: ${tokenHash}, chain number: ${chainIndex}`);
    });

    // receive token
    socket.on('validator send token t', async (data: { verify: Boolean; token: string; chainId: number }) => {
        console.log('verify data: ', data);
        let { chainId, token } = data;
        console.log(`chain transmission completed, token received: ${token}, chain number: ${chainId}`);

        let { sendInfo, chainLength, tempAccountInfo, chainNumber } = useLoginStore();
        if (chainId < 0 || chainId >= chainNumber) {
            console.log('chain id not in range');
            return;
        }
        // decrypt and sub all c
        let specificSendInfo = sendInfo[chainId],
            oneChainTempAccountInfo = tempAccountInfo[chainId],
            tmpToken = token;
        for (let i = chainLength; i >= 1; i--) {
            console.log(`token: ${token}, i: ${i}, typeof token: ${typeof token}`);
            // token = await getDecryptData(oneChainTempAccountInfo.selectedAccount[i].key, token);
            token = subHexAndMod(token, specificSendInfo.c[i]);
        }
        // token = await getDecryptData(oneChainTempAccountInfo.selectedAccount[0].key, token);

        // save verify result
        let calculatedToken = keccak256(token);
        const tokens = toRef(useApplicantStore(), 'tokens');
        let tokenHashReceived = tokens.value[chainId].tokenHash;
        tokens.value[chainId].tokenReceived = tmpToken;
        tokens.value[chainId].tokenDecrypted = token;
        tokens.value[chainId].verifyResult = tokenHashReceived === calculatedToken;
        console.log(
            `token(sub all c): ${token}, hash received: ${tokenHashReceived}, hash calculated: ${calculatedToken}`
        );
    });
}

// get signature, register with app temp account[0]
export function appGetSignature(socket0: Socket) {
    const verifyStore = useVerifyStore();
    const loginStore = useLoginStore();
    let chainLength = loginStore.chainLength;
    let firstAccount = loginStore.tempAccountInfo[0].selectedAccount[0].address;
    let appEndingAccount = loginStore.tempAccountInfo[0].selectedAccount[chainLength + 2].address;
    console.log(`app ending account: ${appEndingAccount}`);

    // 接收validator公钥信息, 使用app temp account[0]接收, 对app temp account[-1]进行盲签名
    socket0.on('validator send pubkey', (data: PublicKey) => {
        let publicKey: PublicKey = { Rx: '', Ry: '', Px: '', Py: '' };
        publicKey = data;
        //console.log(`received pubKey:${publicKey.Px},${publicKey.Py}`)
        eccBlind.deconPublicKey(publicKey.Rx, publicKey.Ry, publicKey.Px, publicKey.Py);
        let blindedAddress = eccBlind.blindMessage(appEndingAccount);
        //console.log(blindedAddress);
        //const {c,s,t_hash}=storeToRefs(verifyStore);
        //verifyStore.c = blindedAddress.c;
        verifyStore.c = blindedAddress.c;
        let data1: AppBlindedAddress = {
            from: firstAccount,
            to: 'validator',
            chainId: 1,
            blindedAddress: blindedAddress.cBlinded
        };
        socket0.emit('applicant send blinded address', data1);
    });

    // receive blinded signature and hash of token t
    socket0.on('validator send sig and hash', (data: ValidatorSendBackSig) => {
        let { chainIndex, sBlind, tokenHash: tokenHashArray } = data;
        verifyStore.writeT(tokenHashArray);
        //console.log(`sBlind:${sBlind},t_hash:${t_hash}`);
        verifyStore.s = eccBlind.unblindSig(sBlind).s;

        // save for later verification(不破坏其他部分)
        const tokens = toRef(useApplicantStore(), 'tokens');
        tokens.value[0].tokenHash = tokenHashArray[0];
        tokens.value[1].tokenHash = tokenHashArray[1];
        tokens.value[2].tokenHash = tokenHashArray[2];
        console.log(`chain initialization complete, token hash array: ${tokenHashArray}, chain number: ${chainIndex}`);
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
    let appTempAddress = tempAccountInfo[chainIndex].selectedAccount[chainLength + 1].address;
    console.log(`using ${appTempAddress} to send final data to validator`);

    // applicant to validator, using temp chain length-1 account
    let socket0 = socketMap.get(appTempAddress);
    if (!socket0) throw new Error('socket not found when sending final data');
    // get data, returned data including chain num
    let data = getApp2RelayData(chainIndex, chainLength + 1);
    socket0.emit('applicant to validator: final data', data);
}

// validator send back: 申请者发送init, validator回送token hash
type ValidatorSendBackSig = {
    from: string;
    to: string;
    chainIndex: number; // 可以不用, 一次将所有hash发送回去
    sBlind: string;
    tokenHash: [string, string, string];
};

// 申请者将盲化后的信息发给validator签名
export type AppBlindedAddress = {
    from: string;
    to: string;
    chainId: number; // 可以不用, 一次将所有hash发送回去
    blindedAddress: string;
};
