import type { Socket } from 'socket.io-client';
import { getApp2RelayData } from '@/ethers/chainData/getApp2RelayData';
import { useApplicantStore } from '@/stores/modules/applicant';
import { storeToRefs } from 'pinia';
import { useLoginStore } from '@/stores/modules/login';
import type { RelayResData } from '@/ethers/chainData/chainDataType';
import { getDecryptData, getHash, keccak256, subHexAndMod, wait } from '@/ethers/util';
import { toRef, toRefs } from 'vue';
import type { PublicKey, toApplicantSigned } from '@/views/FairIntegerGen/types';
import eccBlind from '@/stores/modules/eccBlind';
import { useVerifyStore } from '@/stores/modules/verifySig';
import { useSocketStore } from '@/stores/modules/socket';

//  get signature, applicant -> validator: chain initialization data
export function appSendInitData(chainIndex: number, appTemp0Address: string) {
    // applicant to validator, using temp 0 account
    let { socketMap } = useSocketStore();
    let socket0 = socketMap.get(appTemp0Address);
    if (!socket0) throw new Error('socket not found when chain initialize');
    // get data, returned data including chain num
    let data = getApp2RelayData(chainIndex, 0);
    socket0.emit('applicant to validator: initialization data', data);
    console.log(`app send chain initialization data, chain id: ${chainIndex}`);
}

// app listening: validator
export function appRecevieValidatorData(socket: Socket) {
    // 已放弃使用. receive token hash(deprecated, using validator send sig and hash)
    socket.on('verify correct', (data) => {
        // console.log(data);
        let { chainIndex, tokenHash } = data;
        let { chainNumber } = useLoginStore();
        if (chainIndex === null || chainIndex === undefined || chainIndex >= chainNumber) {
            throw new Error('chain index error when chain initialization');
        }
        // save for later verification
        const tokens = toRef(useVerifyStore(), 'tokens');
        tokens.value[chainIndex].tokenHash = tokenHash;
        console.log(`chain initialization complete, token hash: ${tokenHash}, chain number: ${chainIndex}`);
    });

    // applicant从validator接收最终的加上c的token
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
            originalToken = token;
        for (let i = chainLength; i >= 1; i--) {
            // token = await getDecryptData(oneChainTempAccountInfo.selectedAccount[i].key, token);
            token = subHexAndMod(token, specificSendInfo.c[i]);
            console.log(`${i}-th round, after subtracting, token: ${token}`);
        }
        // token = await getDecryptData(oneChainTempAccountInfo.selectedAccount[0].key, token);

        // save verify result
        let calculatedToken = keccak256(token);
        const { tokens, chain0, chain1, chain2 } = storeToRefs(useVerifyStore());
        let tokenHashReceived = tokens.value[chainId].tokenHash;
        tokens.value[chainId].tokenReceived = originalToken;
        tokens.value[chainId].tokenDecrypted = token;
        // 保持兼容性, 同时将解密之后的token保存到chain和tokens中
        switch (chainId) {
            case 0:
                chain0.value.t = token;
                break;
            case 1:
                chain1.value.t = token;
                break;
            case 2:
                chain2.value.t = token;
                break;
            default:
                console.error('Invalid chainId:', chainId);
        }
        tokens.value[chainId].verifyResult = tokenHashReceived === calculatedToken;
        console.log(
            `token(sub all c): ${token}, hash received: ${tokenHashReceived}, hash calculated: ${calculatedToken}`
        );
    });

    // chain confirmation
    socket.on('chain confirmation result', (data: { result: boolean; reason?: string }) => {
        let res = data.result;
        console.log(`chain confirmation result: ${res}`);
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

        // 保存R, P, 如果之前没有盲化过信息, 盲化; 否则从保存的取出
        let { blindedMessage, pointP, pointR, message } = storeToRefs(verifyStore);
        message.value = appEndingAccount; // 原始签名信息
        let [R, P] = eccBlind.deconPublicKey(publicKey.Rx, publicKey.Ry, publicKey.Px, publicKey.Py);
        (pointP.value = P), (pointR.value = R);
        let blindedAddress;
        if (blindedMessage.value.c === '') {
            blindedAddress = eccBlind.blindMessage(appEndingAccount);
            blindedMessage.value.c = blindedAddress.c;
            blindedMessage.value.cBlinded = blindedAddress.cBlinded;
            blindedMessage.value.γ = blindedAddress.γ;
            blindedMessage.value.δ = blindedAddress.δ;
        } else {
            // 从存储中获取
            blindedAddress = {
                c: blindedMessage.value.c,
                cBlinded: blindedMessage.value.cBlinded,
                γ: blindedMessage.value.γ,
                δ: blindedMessage.value.δ
            };
        }
        //console.log(blindedAddress);
        let data1: AppBlindedAddress = {
            from: firstAccount,
            to: 'validator',
            chainId: 1, // 一次获取所有t, chain id可以为定值
            blindedAddress: blindedAddress.cBlinded
        };
        socket0.emit('applicant send blinded address', data1);
        console.log(`app receive pubkey, send blinded address`);
    });

    // receive blinded signature and hash of token t
    socket0.on('validator send sig and hash', (data: ValidatorSendBackSig) => {
        let { chainIndex, sBlind, tokenHash: tokenHashArray, point, realToken } = data;
        console.log(`app receive sig and hash, token hash array: ${tokenHashArray}, chain number: ${chainIndex}`);

        // save value for verification
        let { blindedMessage, pointP, pointR, message } = storeToRefs(verifyStore);
        message.value = appEndingAccount;
        let [R, P] = eccBlind.deconPublicKey(point.Rx, point.Ry, point.Px, point.Py);
        (pointP.value = P), (pointR.value = R);

        // 客户端刷新, 服务器端没有刷新, 导致客户端没有blind message的随机数
        eccBlind.setBlindMessageRandom(verifyStore.γ_string, verifyStore.δ_string); // 定值
        let blindedAddress = eccBlind.blindMessage(appEndingAccount);
        blindedMessage.value.c = blindedAddress.c;
        blindedMessage.value.cBlinded = blindedAddress.cBlinded;
        blindedMessage.value.γ = blindedAddress.γ;
        blindedMessage.value.δ = blindedAddress.δ;

        verifyStore.writeTHash(tokenHashArray);
        //console.log(`sBlind:${sBlind},t_hash:${t_hash}`);
        blindedMessage.value.s = eccBlind.unblindSig(sBlind).s;

        // save for later verification(不破坏其他部分)
        const { tokens, chain0, chain1, chain2 } = storeToRefs(useVerifyStore());
        tokens.value[0].tokenHash = tokenHashArray[0];
        tokens.value[1].tokenHash = tokenHashArray[1];
        tokens.value[2].tokenHash = tokenHashArray[2];
        console.log(`chain initialization complete`);

        // 测试使用
        chain0.value.t = realToken![0];
        chain1.value.t = realToken![1];
        chain2.value.t = realToken![2];
    });
}

// app listening: next relay's real name account
export function appRecevieRelayData(socket: Socket) {
    let applicantStore = useApplicantStore();
    let relays = applicantStore.relays;
    let { relayIndex } = storeToRefs(applicantStore);
    socket.on(
        'next relay to app: send real name account',
        async ({
            data,
            applicantDataHash,
            preRelayDataHash,
            chainIndex
        }: {
            data: RelayResData;
            applicantDataHash: string;
            preRelayDataHash: string;
            chainIndex: number;
        }) => {
            let { nextRelayRealnameAccount } = data;
            console.log(
                `update relay real name account in socket, chain index: ${chainIndex}, next relay real name account: ${nextRelayRealnameAccount}`
            );

            // 更新next relay real name account
            // relayIndex.value[chainIndex]在extension通知applicant新页面打开时, 值已经+1
            await wait(5000); // 等待5s区块监听方式, 如果区块没有监听到, 就使用socket更新
            relays[chainIndex][relayIndex.value[chainIndex]].realNameAccount = nextRelayRealnameAccount;
        }
    );
}

// app sends blinding number to validator
// 通过hash标识具体在使用哪条链的哪个节点
export async function send2Extension(
    tempAccount: string,
    relayAccount: string,
    hash: string,
    b: number,
    chainId: number,
    relayId: number
) {
    let loginStore = useLoginStore();
    let { allAccountInfo } = loginStore;
    // it's a helper function, so always using real name account socket to send
    let { socketMap } = useSocketStore();
    let socket0 = socketMap.get(allAccountInfo.realNameAccount.address);
    let data = { tempAccount, relayAccount, hash, blindingNumber: b, chainId, relayId };

    socket0.emit('blinding number', data);
}

// applicant -> validator: send final data
export async function appSendFinalData(chainIndex: number) {
    // obtain the account corresponding to the validator
    let { tempAccountInfo, chainLength } = useLoginStore();
    let appTempAddress = tempAccountInfo[chainIndex].selectedAccount[chainLength + 1].address;
    console.log(`using ${appTempAddress} to send final data to validator`);

    // applicant to validator, using temp chain length-1 account
    let { socketMap } = useSocketStore();
    let socket0 = socketMap.get(appTempAddress);
    if (!socket0) throw new Error('socket not found when sending final data');
    // get data, returned data including chain num
    let data = getApp2RelayData(chainIndex, chainLength + 1);
    socket0.emit('applicant to validator: final data', data);
}

// 将反向hash链的第一个值发给validator, 保证app没有更换temp account. applicant sends chain confirmation to validator
export async function appSendConfirmation(chainIndex: number) {
    // obtain the account corresponding to the validator
    let { tempAccountInfo, chainLength } = useLoginStore();
    let appTempAddress = tempAccountInfo[chainIndex].selectedAccount[chainLength + 1].address;
    console.log(`using ${appTempAddress} to send chain confirmation to validator`);

    // applicant to validator, using temp chain length-1 account
    let { socketMap } = useSocketStore();
    let socket0 = socketMap.get(appTempAddress);
    if (!socket0) throw new Error('socket not found when sending chain confirmation');
    // get data, returned data including chain num
    let data = getApp2RelayData(chainIndex, chainLength + 2);
    socket0.emit('applicant to validator: chain confirmation', data);
}

// validator send back: 申请者发送init, validator回送token hash
type ValidatorSendBackSig = {
    from: string;
    to: string;
    chainIndex: number; // 可以不用, 一次将所有hash发送回去
    sBlind: string;
    tokenHash: [string, string, string];
    point: EccPoint;
    realToken?: [string, string, string];
};

export type EccPoint = {
    Rx: string;
    Ry: string;
    Px: string;
    Py: string;
};

// 申请者将盲化后的信息发给validator签名
export type AppBlindedAddress = {
    from: string;
    to: string;
    chainId: number; // 可以不用, 一次将所有hash发送回去
    blindedAddress: string;
};
