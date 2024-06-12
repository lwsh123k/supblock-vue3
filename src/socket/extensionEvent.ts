import { defineStore, storeToRefs } from 'pinia';
import { reactive, ref } from 'vue';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { getStoreData } from '@/ethers/contract';
import { getEncryptData } from '@/ethers/util';
import { getAccountInfo } from '@/api';
import { Wallet } from 'ethers';
import { provider } from '@/ethers/provider';
import { useApplicantStore } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';
import { getApp2RelayData } from '@/ethers/dataTransmission/getApp2RelayData';
import { useRelayStore } from '@/stores/modules/relay';
import { getPre2NextData } from '@/ethers/dataTransmission/getPre2NextData';

// socket从extension接收数据的类型
interface NumInfo {
    from: string; // 固定为'plugin'
    to: string;
    applicant: string;
    relay: string;
    number: number;
}

// 绑定事件, 用于接收extension发送的信息, 如果extension打开页面, 就上传app -> relay和pre relay -> next relay的数据
export function bindExtension(socket: Socket) {
    // 从applicant store获取relay index
    let applicantStore = useApplicantStore();
    let { relayIndex } = storeToRefs(applicantStore);

    // 从relay获取数据
    const relayStore = useRelayStore();
    let {} = relayStore;

    // 从login store获取账号信息, 具体使用哪个账号和next relay发送消息
    const loginStore = useLoginStore();
    const { chainLength, accountInfo, validatorAccount, sendInfo } = loginStore;

    // applicant给下一个relay发送消息: 包含下一次使用的b, r, temp account
    // applicant要知道这是在和第几个relay发送消息, 即relayIndex
    socket.on('new tab opening finished to applicant', async (data1: NumInfo) => {
        try {
            let { number: fairIntegerNumber, relay: preRelayAddress } = data1;
            console.log('applicant receive message from extension', fairIntegerNumber);
            let index = relayIndex.value;

            // 向next relay实名账户发送消息: 获取对方的公钥, 需要发送的信息
            let data = getApp2RelayData(index);
            let accountAddress = await getAccountInfo(fairIntegerNumber);
            let encryptedData = await getEncryptData(accountAddress.publicKey, data);
            let relayAddress = accountAddress.address;

            // applicant使用和pre relay对应的temp account
            let readOnlyStoreData = await getStoreData(); // 获取合约实例
            let { key: privateKey, address: addressA } = accountInfo.selectedAccount[index];
            let writeStoreData = readOnlyStoreData.connect(new Wallet(privateKey, provider));
            console.log(preRelayAddress, relayAddress, encryptedData);
            await writeStoreData.setApp2Relay(preRelayAddress, relayAddress, encryptedData);

            // 选完随机数, 给下一个relay发送信息, relay index++, 表示当前relay已经结束
            relayIndex.value++;
        } catch (error) {
            console.log(error);
        }
    });

    // relay给下一个relay发送消息
    // 如果relay要给多个next relay发送消息, 它应该提前知道给下一个relay发送什么消息, 这个消息应该提前被存储, 在发送时拿出来
    // 存储格式, map, address => data
    socket.on('new tab opening finished to pre relay', async (data1: NumInfo) => {
        try {
            let { number: fairIntegerNumber, applicant: applicantAddress, relay: preRelayAddress } = data1;
            console.log('applicant receive message from extension', fairIntegerNumber);
            // 向next relay实名账户发送消息: 获取对方的公钥, 需要发送的信息
            let accountAddress = await getAccountInfo(fairIntegerNumber);
            let relayAddress = accountAddress.address;
            let data = getPre2NextData(applicantAddress, preRelayAddress, relayAddress);
            let encryptedData = await getEncryptData(accountAddress.publicKey, data);

            // 当前relay使用anonymous account
            let readOnlyStoreData = await getStoreData();
            let { key: privateKey, address: addressA } = accountInfo.anonymousAccount;
            let writeStoreData = readOnlyStoreData.connect(new Wallet(privateKey, provider));
            await writeStoreData.setPre2Next(relayAddress, encryptedData);
        } catch (error) {
            console.log(error);
        }
    });
}

// 将blinding number提前发送给服务器, 以便之后插件打开新页面, 只有applicant才会调用这个函数
export async function sendBlindingNumber(socket: Socket, blindingNumber: number[], tempAccountAddress: string[]) {
    socket.emit('blinding number', { blindingNumber, tempAccountAddress });
}
