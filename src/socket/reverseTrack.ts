import { relayReceivedData, type CombinedData } from '@/ethers/chainData/chainDataType';
import { useLoginStore } from '@/stores/modules/login';
import type { Socket } from 'socket.io-client';
import { storeToRefs } from 'pinia';

export function relayWaitForAsk(socket: Socket) {
    // 导入自己的编号
    const loginStore = useLoginStore();
    const { userNumber } = storeToRefs(loginStore); // 使用storeToRefs获取响应式引用
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
            authorizationDocumentTxHash: boolean;
            nextAppTempAccount: string;
            nextHash: string;
            chainIndex: number;
            relayIndex: number;
        }) => {
            // 正向hash链: hash1 -> hash0
            // 自己确实发送过hash0, 保证反向查找确实到自己了
            // 查找正向hash链, hash0的前一个hash1及其发送者的实名账户
            console.log(`hash0: ${nextHash}, userNumber: ${userNumber.value}`); // 使用.value获取实际值

            // 根据编号和是否授权进行响应
            let shouldRespond = false;

            // 编号1-33不配合任何调查
            if (userNumber.value >= 1 && userNumber.value <= 33) {
                // 使用.value
                shouldRespond = false;
            }
            // 编号34-66配合任何调查
            else if (userNumber.value >= 34 && userNumber.value <= 66) {
                // 使用.value
                shouldRespond = true;
            }
            // 其他编号只有授权时才配合
            else {
                shouldRespond = authorizationDocumentTxHash;
            }
            console.log(`shouldRespond: ${shouldRespond}`);

            if (shouldRespond) {
                let { preHash, preAppTempAccount, preRelayRealnameAccount, blindedFairIntNum } =
                    findPreRelayInfo(nextHash);
                // 发送响应: hash, pre relay real name account
                socket.emit('response pre relay info', {
                    from: to,
                    to: from,
                    preHash,
                    preAppTempAccount,
                    preRelayRealnameAccount,
                    chainIndex,
                    relayIndex: relayIndex - 1,
                    blindedFairIntNum,
                    isAskSuccess: true
                });
            } else {
                socket.emit('response pre relay info', {
                    from: to,
                    to: from,
                    preHash: '',
                    preAppTempAccount: '',
                    preRelayRealnameAccount: '',
                    chainIndex,
                    relayIndex: relayIndex - 1,
                    blindedFairIntNum: -2,
                    isAskSuccess: false
                });
            }
        }
    );
}

function findPreRelayInfo(nextHash: string): {
    preHash: string;
    preAppTempAccount: string;
    preRelayRealnameAccount: string;
    blindedFairIntNum: number;
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
        preRelayRealnameAccount: expectedData?.preToNextRelayData?.preRelayAccount || '',
        blindedFairIntNum: expectedData?.blindedFairIntNum || -1
    };
}
