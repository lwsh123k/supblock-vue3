import type { Socket } from 'socket.io-client';
import { getApp2RelayData } from '@/ethers/chainData/getApp2RelayData';

// applicant给validator发送chain initialization data
export function appSendInitData(socket: Socket) {
    // applicant to validator, using
    let data = getApp2RelayData(0);
    socket.emit('applicant to validator: initialization data', data);
}

// app接收从validator发送来的信息
export function appRecevieValidatorData(socket: Socket) {
    socket.on('verify correct', (data) => {
        // console.log(data);
        let tokenHash = data.tokenHash;
        console.log('chain initialization complete, token hash: ', tokenHash);
    });
}

// app接收next relay消息, 包含下次要使用的匿名账户
export function appRecevieRelayData(socket: Socket) {
    socket.on('next relay to app', (data) => {
        // console.log(data);
        let { from, to, nextRelayAnonymousAccount } = data;
        console.log('chain initialization complete, token hash: ', nextRelayAnonymousAccount);

        // 更新到joint random selection
    });
}
