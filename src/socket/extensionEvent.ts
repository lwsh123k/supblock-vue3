import { defineStore, storeToRefs } from 'pinia';
import type { Socket } from 'socket.io-client';
import { getStoreData } from '@/ethers/contract';
import { getEncryptData } from '@/ethers/util';
import { getAccountInfo } from '@/api';
import { Wallet } from 'ethers';
import { provider } from '@/ethers/provider';
import { useApplicantStore } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';
import { getApp2RelayData } from '@/ethers/chainData/getApp2RelayData';
import { useRelayStore } from '@/stores/modules/relay';
import { getPre2NextData } from '@/ethers/chainData/getPre2NextData';

// data type from extensions
interface NumInfo {
    from: string; // always is 'server'
    to: string; // always is 'plugin'
    applicant: string;
    relay: string;
    blindedFairIntNum: number;
    fairIntegerNumber: number;
    blindingNumber: number;
    url: string;
    hashOfApplicant: string;
}

// 绑定事件, 用于接收extension发送的信息, 如果extension打开页面, 就上传app -> relay和pre relay -> next relay的数据
export function bindExtension(socket: Socket) {
    // 从applicant store获取relay index
    let applicantStore = useApplicantStore();
    let { datas } = applicantStore;
    let { relayIndex } = storeToRefs(applicantStore);

    // 从login store获取账号信息, 具体使用哪个账号和next relay发送消息
    const loginStore = useLoginStore();
    const { chainLength, allAccountInfo, validatorAccount, sendInfo, chainNumber, tempAccountInfo } = loginStore;

    // applicant -> relay: b, r, temp account
    // need to know: which chain and which relay, 即relayIndex
    socket.on('new tab opening finished to applicant', async (data1: NumInfo) => {
        try {
            let { blindedFairIntNum, relay: preRelayAddress, hashOfApplicant } = data1;
            console.log('extension -> applicant, next relay number: ', blindedFairIntNum);
            console.log('relay index', relayIndex.value);
            // which chain
            let chainId = -1;
            for (let i = 0; i < chainNumber; i++) {
                for (let j = 0; j <= chainLength + 2; j++) {
                    if (datas[i][i][0].hash === hashOfApplicant) {
                        chainId = i;
                        break;
                    }
                }
            }
            if (chainId === -1) throw new Error('not found hash in chains');
            let index = relayIndex.value[chainId];

            // 向next relay实名账户发送消息: 获取对方的公钥, 需要发送的信息
            let data = getApp2RelayData(index + 1); // 获得下一轮需要的数据
            let accountAddress = await getAccountInfo(blindedFairIntNum);
            data.to = accountAddress.address;
            let encryptedData = await getEncryptData(accountAddress.publicKey, data);
            let relayAddress = accountAddress.address;

            // applicant使用当前轮的temp account, 给next relay发送下一轮的app tmep account
            let readOnlyStoreData = await getStoreData();
            let { key: privateKey, address: addressA } = tempAccountInfo[chainId].selectedAccount[index]; // 当前轮的temp account
            let writeStoreData = readOnlyStoreData.connect(new Wallet(privateKey, provider));
            await writeStoreData.setApp2Relay(relayAddress, encryptedData);

            // 选完随机数, 给下一个relay发送信息, relay index++, 表示当前轮结束
            relayIndex.value[chainId]++;
        } catch (error) {
            console.log(error);
        }
    });

    // pre relay -> next relay
    socket.on('new tab opening finished to pre relay', async (data1: NumInfo) => {
        try {
            let { blindedFairIntNum, applicant: applicantAddress, relay: preRelayAddress } = data1;
            console.log('extension -> pre relay, next relay number: ', blindedFairIntNum);

            // pre anonymous relay -> next real name relay: 获取对方的公钥, 需要发送的信息
            let { key: privateKey, address: preRelayAnonymousAccount } = allAccountInfo.anonymousAccount;
            let accountAddress = await getAccountInfo(blindedFairIntNum);
            let relayAddress = accountAddress.address;
            let data = getPre2NextData(applicantAddress, preRelayAnonymousAccount, relayAddress);
            // use fake data
            let relayStore = useRelayStore();
            let { useFakeData } = relayStore;
            if (useFakeData) data.n = -100;
            let encryptedData = await getEncryptData(accountAddress.publicKey, data);

            // 当前relay使用anonymous account
            let readOnlyStoreData = await getStoreData();
            let writeStoreData = readOnlyStoreData.connect(new Wallet(privateKey, provider));
            await writeStoreData.setPre2Next(relayAddress, encryptedData);
        } catch (error) {
            console.log(error);
        }
    });
}
