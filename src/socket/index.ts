import { defineStore, storeToRefs } from 'pinia';
import { reactive, ref } from 'vue';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { getStoreData } from '@/ethers/contract';
import { getEncryptData } from '@/ethers/util';
import { getAccountInfo } from '@/api';
import { Wallet } from 'ethers';
import { provider } from '@/ethers/provider';
import { bindExtension } from './extensionEvent';
import { appRecevieRelayData, appRecevieValidatorData } from './applicantEvent';

// 每个正在使用的账号, 都要连接socket, 绑定extension, chain initialization事件
// 在login store中初始化
export let socketMap = new Map();
export function socketInit(address: string, signedAuthString: string) {
    // initiate socket
    let socket = io('http://localhost:3000', {
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        query: {
            address,
            signedAuthString
        }
    });
    socketMap.set(address, socket);

    // listen event
    socket.on('connect', () => {
        console.log('连接成功');
    });
    socket.on('disconnect', () => {
        console.log('连接断开');
    });

    // register socket event
    // extension event
    bindExtension(socket);

    // chain init, receive and verify data from validator
    appRecevieValidatorData(socket);

    // receive data from next relay
    appRecevieRelayData(socket);
}
