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
import { useEventListenStore } from '@/stores/modules/relayEventListen';
import { useLoginStore } from '@/stores/modules/login';

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
    let { getApp2RelayData } = applicantStore;
    let { relayIndex } = storeToRefs(applicantStore);

    // 从relay获取数据
    const eventListenStore = useEventListenStore();
    let { getPre2NextData } = eventListenStore;

    // 从login store获取账号信息, 具体使用哪个账号和next relay发送消息
    const loginStore = useLoginStore();
    const { chainLength, accountInfo, validatorAccount, sendInfo } = loginStore;

    // applicant给下一个relay发送消息
    // applicant要知道这是在和第几个relay发送消息, 即relayIndex
    socket.on('new tab opening finished to applicant', async (data1: NumInfo) => {
        try {
            let { number: fairIntegerNumber, relay: preRelayAddress } = data1;
            console.log('applicant receive message from extension', fairIntegerNumber);
            // 选完随机数后, relay index++, 表示当前relay已经结束
            relayIndex.value++;
            let index = relayIndex.value;
            // 获取加密数据
            let data = getApp2RelayData(index);
            let accountAddress = await getAccountInfo(fairIntegerNumber); // 获取实名账户公钥, 地址
            let encryptedData = await getEncryptData(accountAddress.publicKey, data);
            let relayAddress = accountAddress.address;

            // 使用上一轮的temp account
            let readOnlyStoreData = await getStoreData(); // 获取合约实例
            let { key: privateKey, address: addressA } = accountInfo.selectedAccount[relayIndex.value];
            let writeStoreData = readOnlyStoreData.connect(new Wallet(privateKey, provider));
            await writeStoreData.setApp2Relay(preRelayAddress, relayAddress, encryptedData);
        } catch (error) {
            console.log(error);
        }
    });

    // relay给下一个relay发送消息
    // 如果relay要给多个next relay发送消息, 它应该提前知道给下一个relay发送什么消息, 这个消息应该提前被存储, 在发送时拿出来
    // 存储格式, map, address => data
    socket.on('new tab opening finished to pre relay', async (data1: NumInfo) => {
        try {
            let { number: fairIntegerNumber, applicant: applicantAddress } = data1;
            console.log('applicant receive message from extension', fairIntegerNumber);
            // 获取加密数据
            let accountAddress = await getAccountInfo(fairIntegerNumber);
            let relayAddress = accountAddress.address;
            let data = getPre2NextData(relayAddress);
            let encryptedData = await getEncryptData(accountAddress.publicKey, data);

            // 使用anonymous account
            let readOnlyStoreData = await getStoreData();
            let { key: privateKey, address: addressA } = accountInfo.anonymousAccount;
            let writeStoreData = readOnlyStoreData.connect(new Wallet(privateKey, provider));
            await writeStoreData.setPre2Next(relayAddress, encryptedData);
        } catch (error) {
            console.log(error);
        }
    });
}
