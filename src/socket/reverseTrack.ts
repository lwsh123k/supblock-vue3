import { relayReceivedData, type CombinedData } from '@/ethers/chainData/chainDataType';
import { useLoginStore } from '@/stores/modules/login';
import type { Socket } from 'socket.io-client';

export function relayWaitForAsk(socket: Socket) {
    let { userNumber } = useLoginStore();
    // 正向hash验证
    socket.on(
        'request pre relay info',
        async ({
            from,
            to,
            authorizationDocumentTxHash,
            nextAppTempAccount,
            nextHash,
            chainIndex,
            relayIndex
        }: {
            from: string;
            to: string;
            authorizationDocumentTxHash: string;
            nextAppTempAccount: string;
            nextHash: string;
            chainIndex: number;
            relayIndex: number;
        }) => {
            // 正向hash链: hash1 -> hash0
            // 自己确实发送过hash0, 保证反向查找确实到自己了
            // 查找正向hash链, hash0的前一个hash1及其发送者的实名账户
            console.log(`hash0: ${nextHash}`);

            let { preHash, preAppTempAccount, preRelayRealnameAccount } = findPreRelayInfo(nextHash);
            // 发送响应: hash, pre relay real name account
            socket.emit('response pre relay info', {
                from: to,
                to: from,
                preHash,
                preAppTempAccount,
                preRelayRealnameAccount,
                chainIndex,
                relayIndex: relayIndex - 1
            });
        }
    );
}

function findPreRelayInfo(nextHash: string): {
    preHash: string;
    preAppTempAccount: string;
    preRelayRealnameAccount: string;
} {
    let expectedData: CombinedData | null = null;
    for (const [key, value] of relayReceivedData) {
        if (value.appToRelayData?.hf === nextHash) {
            expectedData = value;
            break;
        }
    }
    console.log('pre relay data: ', expectedData);
    return {
        preHash: expectedData?.preToNextRelayData?.hf || '',
        preAppTempAccount: expectedData?.preToNextRelayData?.preAppTempAccount || '',
        preRelayRealnameAccount: expectedData?.preToNextRelayData?.preRelayAccount || ''
    };
}
