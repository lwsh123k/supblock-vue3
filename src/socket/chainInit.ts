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

// step1: applicant通过点击按钮给validator发送信息
export function appSendInitData(socket: Socket) {
    let applicantStore = useApplicantStore();
    let { getApp2RelayData } = applicantStore;

    // 从login store获取账号信息
    const loginStore = useLoginStore();
    const { chainLength, accountInfo, validatorAccount, sendInfo } = loginStore;

    // applicant to validator
    let data = getApp2RelayData(0);
    data.from = accountInfo.realNameAccount.address;
    data.to = validatorAccount;
    socket.emit('applicant to validator: initialization data', data);
}

// 是否可以把validator放到服务器??????????
// step2: validator接收app点击按钮发送的信息, 并回送app信息
export function validatorReceiveAndResponse(socket: Socket) {
    socket.on('applicant to validator: initialization data', async (data) => {
        // 验证数据
        let result;

        // 如果数据正确, 回送applicant信息
        if (result) {
            let data1: any = {};
            data1.from = data.to;
            data1.to = data.from;
            data.hashOfD = '0x333333333'; // 暂时为固定值
            socket.emit('verify correct: hash(token d)', data1);

            // 监听随机数请求
        }
    });
}

// step3: app接收从validator发送来的信息
export function appRecevieDataEvent(socket: Socket) {
    socket.on('verify correct: hash(token d)', async (data) => {
        try {
            console.log(data);

            // joint random generate
        } catch (error) {
            console.log(error);
        }
    });
}
