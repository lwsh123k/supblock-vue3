import { defineStore, storeToRefs } from 'pinia';
import type { Socket } from 'socket.io-client';
import { getStoreData } from '@/ethers/contract';
import { ensure0xPrefix, getEncryptData, keccak256 } from '@/ethers/util';
import { getAccountInfo } from '@/api';
import { Wallet } from 'ethers';
import { provider } from '@/ethers/provider';
import { useApplicantStore } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';
import { getApp2RelayData } from '@/ethers/chainData/getApp2RelayData';
import { useRelayStore } from '@/stores/modules/relay';
import { getPre2NextData } from '@/ethers/chainData/getPre2NextData';
import { toRef } from 'vue';
import { getAccountInfoByContract } from '@/ethers/chainData/getAccountById';

// data type from extensions
interface NumInfo {
    from: string; // always is 'server'
    to: string; // always is 'plugin'
    applicant: string; //  申请者tmep账户
    relay: string; // relay匿名账户, app和当前relay进行公平随机数生成
    blindedFairIntNum: number;
    fairIntegerNumber: number;
    blindingNumber: number;
    url: string;
    hashOfApplicant: string;
}

// extension通知applicant和relay新页面打开
export function bindExtension(socket: Socket) {
    // 从applicant store获取relay index
    let applicantStore = useApplicantStore();
    let { datas, setNextRelayRealnameInfo } = applicantStore;
    let relayIndex = toRef(applicantStore, 'relayIndex');

    // 从login store获取账号信息, 具体使用哪个账号和next relay发送消息
    const loginStore = useLoginStore();
    const { chainLength, allAccountInfo, chainNumber, tempAccountInfo } = loginStore;

    // extension to app: new tab has opened.
    // current temp applicant -> next anonymous relay: b, r, applicant temp account
    socket.on('new tab opening finished to applicant', async (data1: NumInfo) => {
        try {
            let { blindedFairIntNum, relay: preRelayAddress, hashOfApplicant, fairIntegerNumber } = data1;
            console.log('extension -> applicant, next relay index number: ', blindedFairIntNum);
            // need to know: which chain and which relay through unique hash
            let chainId = -1;
            for (let i = 0; i < chainNumber; i++) {
                for (let j = 0; j <= chainLength + 2; j++) {
                    if (datas[i][j][0].hash === hashOfApplicant) {
                        chainId = i;
                        break;
                    }
                }
                if (chainId != -1) break;
            }
            if (chainId === -1)
                throw new Error(`not found hash in chains, received hash of applicant: ${hashOfApplicant}`);
            let specificRelayIndex = relayIndex.value[chainId]; // 在当前轮中，relay是第几个正在和applicant交互的
            let nextRelayIndex = specificRelayIndex + 1;

            // 更新存储的信息, 此处传入不带b, 函数实现使用自己生成的b
            await setNextRelayRealnameInfo(chainId, nextRelayIndex, fairIntegerNumber, 'extension listening');

            // 向next relay匿名账户发送消息: 获取对方的公钥
            let data = getApp2RelayData(chainId, nextRelayIndex); // 获得下一轮需要的数据
            let accountAddress = await getAccountInfoByContract(blindedFairIntNum);
            data.to = accountAddress.address;
            let encryptedData = await getEncryptData(accountAddress.publicKey, data);
            let relayAddress = accountAddress.address;

            // applicant使用当前轮的temp account, 给next relay发送下一轮的app tmep account
            let readOnlyStoreData = await getStoreData();
            let { key: privateKey, address: addressA } = tempAccountInfo[chainId].selectedAccount[specificRelayIndex]; // 当前轮的temp account
            let writeStoreData = readOnlyStoreData.connect(new Wallet(privateKey, provider));

            // determine if next relay is last user relay
            let lastUserRelay = false;
            if (nextRelayIndex === chainLength) {
                lastUserRelay = true;
                console.log('last user relay');
            }
            // get data hash and upload
            let hashResult = keccak256(JSON.stringify(data));
            hashResult = ensure0xPrefix(hashResult);
            await writeStoreData.setApp2Relay(relayAddress, encryptedData, hashResult, lastUserRelay);
            console.log('app -> next relay 数据上链完成');
            console.log(
                `app -> next relay: app temp account: ${addressA}, next relay anonymous address: ${relayAddress}, data:`,
                data,
                'hash result:',
                hashResult
            );

            // 进行完随机数选择, 和给下一个relay发送信息, relay index++, 表示当前轮结束
            relayIndex.value[chainId]++;
        } catch (error) {
            console.log(error);
        }
    });

    // extension to current relay
    // then, current anonymous relay -> next anonymous relay
    socket.on('new tab opening finished to pre relay', async (data1: NumInfo) => {
        try {
            let { blindedFairIntNum, applicant: applicantAddress, relay: preRelayAddress } = data1;
            console.log('extension -> pre relay, next relay number: ', blindedFairIntNum);

            // current realname relay -> next anonymous relay: 获取对方的公钥, 需要发送的信息
            let { key: privateKey, address: preRelayRealnameAccount } = allAccountInfo.realNameAccount;
            let { address: nextRelayAnonymousAddress, publicKey: nextRelayAnonymousPubkey } =
                await getAccountInfoByContract(blindedFairIntNum);
            let data = await getPre2NextData(
                applicantAddress,
                preRelayRealnameAccount,
                nextRelayAnonymousAddress,
                nextRelayAnonymousPubkey
            );
            // use fake data
            let relayStore = useRelayStore();
            let useFakeData = toRef(relayStore, 'useFakeData');
            let fakeDataTime = toRef(relayStore, 'fakeDataTime');
            // 第一次使用伪造数据, 第二次关闭伪造数据按钮
            if (fakeDataTime.value === 1) useFakeData.value = false;
            // 判断是否使用伪造数据
            if (useFakeData.value === true && fakeDataTime.value === 0) {
                data.t = '3333333333333333333333333333333333333333333333333333333333334455';
                // only use fake data once
                fakeDataTime.value++;
            }
            let encryptedData = await getEncryptData(nextRelayAnonymousPubkey, data);
            let preRelayDataHash = keccak256(JSON.stringify(data));
            preRelayDataHash = ensure0xPrefix(preRelayDataHash);

            // 当前relay使用anonymous account
            let readOnlyStoreData = await getStoreData();
            let writeStoreData = readOnlyStoreData.connect(new Wallet(privateKey, provider));
            await writeStoreData.setPre2Next(nextRelayAnonymousAddress, encryptedData, preRelayDataHash);
            let blockNumber = await provider.getBlockNumber();
            console.log('pre relay -> next relay 数据上链完成', 'block number:', blockNumber);
            console.log(
                'pre relay -> next relay: pre relay realname account:',
                preRelayRealnameAccount,
                'next relay anonymous account:',
                nextRelayAnonymousAddress,
                'data:',
                data
            );
        } catch (error) {
            console.log(error);
        }
    });
}
