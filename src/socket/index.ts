import { reactive, ref, toRef } from 'vue';
import { io } from 'socket.io-client';
import { bindExtension } from './extensionEvent';
import { appGetSignature, appRecevieRelayData, appRecevieValidatorData } from './applicantEvent';
import { useSocketStore } from '@/stores/modules/socket';
import { relayWaitForAsk } from './reverseTrack';

// 每个正在使用的账号, 都要连接socket, 绑定extension, chain initialization事件
// 在login store调用
export function socketInit(
    address: string,
    signedAuthString: string,
    isFistTempAccount: boolean = false,
    isApplicant: boolean = false
) {
    let socketMap = toRef(useSocketStore(), 'socketMap');
    // initiate socket
    let socket = io('http://localhost:3000', {
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        query: {
            address,
            signedAuthString
        }
    });
    socketMap.value.set(address, socket);

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

    // applicant: get signature hash, only use firsd temp account
    if (isApplicant && isFistTempAccount) {
        appGetSignature(socket);
    }

    // relay监听validator询问自己, 使用实名账号
    if (!isApplicant && isFistTempAccount) {
        relayWaitForAsk(socket);
    }
}
