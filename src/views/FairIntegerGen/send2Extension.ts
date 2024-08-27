import { socketMap } from '@/socket';
import { useLoginStore } from '@/stores/modules/login';
import type { Socket } from 'socket.io-client';

// 通过hash标识具体在使用哪条链的哪个节点
export async function send2Extension(tempAccount: string, relayAccount: string, hash: string, b: number) {
    let loginStore = useLoginStore();
    let { allAccountInfo } = loginStore;
    // send using real name account socket
    let socket0 = socketMap.get(allAccountInfo.realNameAccount.address);
    await sendBlindingNumber(socket0, { tempAccount, relayAccount, hash, blindingNumber: b });
}

// 将blinding number提前发送给服务器, 以便之后插件打开新页面, 只有applicant才会调用这个函数
async function sendBlindingNumber(
    socket: Socket,
    blindingAndAccount: { blindingNumber: number; tempAccount: string; relayAccount: string; hash: string }
) {
    socket.emit('blinding number', { blindingAndAccount });
}
