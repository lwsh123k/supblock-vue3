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

// applicant给validator发送chain initialization data
export function appSendInitData(socket: Socket) {
    // applicant to validator
    let data = getApp2RelayData(0);
    socket.emit('applicant to validator: initialization data', data);
}

// app接收从validator发送来的信息
export function appRecevieValidatorData(socket: Socket) {
    socket.on('verify correct', (data) => {
        console.log(data);
        let tokenHash = data.tokenHash;
    });
}
