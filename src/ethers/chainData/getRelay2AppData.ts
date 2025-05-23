import { useLoginStore } from '@/stores/modules/login';
import { useSocketStore } from '@/stores/modules/socket';
import { Wallet } from 'ethers';
import { getStoreData } from '../contract';
import { provider } from '../provider';
import { ensure0xPrefix, getEncryptData, keccak256 } from '../util';
import { relayReceivedData, type RelayResData } from './chainDataType';

// next relay通过socket和区块链, 使用匿名账户回复pre applicant account, 要使用的实名账户
export async function sendNextRelay2AppData(preApplicantTempAccount: string, applicantDataHash: string) {
    const { allAccountInfo } = useLoginStore();
    let { key: realnamePrivateKey, address: realNameAddress } = allAccountInfo.realNameAccount;
    let { key: anonymousAccountKey, address: anonymousAddress } = allAccountInfo.anonymousAccount;
    let { socketMap } = useSocketStore();
    let anonymousSocket = socketMap.get(anonymousAddress);
    let receivedData = relayReceivedData.get(preApplicantTempAccount);
    let chainIndex = receivedData?.appToRelayData?.chainIndex as number,
        preApplicantTempPubkey = receivedData?.appToRelayData?.appTempAccountPubkey,
        token = receivedData?.preToNextRelayData?.t,
        c = receivedData?.appToRelayData?.c,
        preRelayDataHash = receivedData?.preToNextRelayData?.dataHash,
        infoHash = receivedData?.appToRelayData?.infoHash,
        appTxHash = receivedData?.appToRelayData?.txHash,
        preRelayTxHash = receivedData?.preToNextRelayData?.txHash;

    if (![0, 1, 2].includes(chainIndex) || !preApplicantTempPubkey) {
        console.log(`data is empty, chainIndex: ${chainIndex}, preApplicantTempPubkey: ${preApplicantTempPubkey}`);
        return;
    }

    // construct data, 包含下次要给next relay发送给的t
    // == null 会将 null 和 undefined 判断为相等，从而同时捕获这两种情况
    if (
        token == null ||
        c == null ||
        preRelayDataHash == null ||
        infoHash == null ||
        appTxHash == null ||
        preRelayTxHash == null
    ) {
        console.log('some data is null or undefined.', {
            token,
            c,
            preRelayDataHash,
            infoHash,
            appTxHash,
            preRelayTxHash
        });
        return;
    }
    // let tokenAddc = addHexAndMod(token, c);
    // console.log(`next relay -> applicant, t: ${token}, c: ${c}, token + c: ${tokenAddc}`);
    let data: RelayResData = {
        // from: anonymousAddress,
        // to: preApplicantTempAccount,
        nextRelayRealnameAccount: realNameAddress
        // chainIndex
    };
    let encryptedData = await getEncryptData(preApplicantTempPubkey, data);
    encryptedData = ensure0xPrefix(encryptedData);

    // 通过socket发送数据(与之前兼容...)
    anonymousSocket.emit('next relay to app: send real name account', {
        from: anonymousAddress,
        to: preApplicantTempAccount,
        data,
        applicantDataHash,
        preRelayDataHash,
        chainIndex
    });

    // 通过区块链发送数据: relay使用anonymous account向app temp account发送使用的real name account
    let readOnlyStoreData = await getStoreData();
    let writeStoreData = readOnlyStoreData.connect(new Wallet(anonymousAccountKey, provider));

    let relayDataHash = keccak256(JSON.stringify(data));
    relayDataHash = ensure0xPrefix(relayDataHash);
    await writeStoreData.setRelay2App(
        preApplicantTempAccount,
        encryptedData,
        relayDataHash,
        appTxHash,
        preRelayTxHash,
        infoHash
    );
    console.log(
        `next relay -> app: using ethersjs send to ${preApplicantTempAccount}, chain index: ${chainIndex}, data:`,
        data
    );
}

// next relay向pre relay回送数据
export function sendNext2PreRelayData() {}
