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

// 每个正在使用的账号, 都要连接socket, 绑定extension, chain initialization事件
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

    // extension打开事件
    bindExtension(socket);

    // chain init事件, applicant发送请求(按钮点击), validator接收请求(事件绑定), 并给applicant回送信息(事件绑定), joint random selection
}

// 将blinding number提前发送给服务器, 以便之后插件打开新页面, 只有applicant才会调用这个函数
export async function SendBlindingNumber(socket: Socket, blindingNumber: number[], tempAccountAddress: string[]) {
    socket.emit('blinding number', { blindingNumber, tempAccountAddress });
}
