import { socketMap } from '@/socket';
import { useLoginStore } from '@/stores/modules/login';
import { relayReceivedData, type RelayResDate } from './chainDataType';
import { getStoreData } from '../contract';
import { provider } from '../provider';
import { Wallet } from 'ethers';
import { ensure0xPrefix, getEncryptData, keccak256 } from '../util';

// next relay通过socket使用匿名账户回复pre applicant temp address
export async function sendNextRelay2AppData(preApplicantTempAccount: string, dataHash: string) {
    const { allAccountInfo } = useLoginStore();
    let { key: privateKey, address: realNameAddress } = allAccountInfo.realNameAccount;
    let anonymousAddress = allAccountInfo.anonymousAccount.address;
    let realNameSocket = socketMap.get(realNameAddress);
    let receivedData = relayReceivedData.get(preApplicantTempAccount);
    let chainIndex = receivedData?.appToRelayData?.chainIndex as number,
        preApplicantTempPubkey = receivedData?.appToRelayData?.appTempAccountPubkey;

    if (![0, 1, 2].includes(chainIndex) || !preApplicantTempPubkey) {
        console.log(`data is empty, chainIndex: ${chainIndex}, preApplicantTempPubkey: ${preApplicantTempPubkey}`);
        return;
    }

    // construct data
    let data: RelayResDate = {
        from: realNameAddress,
        to: preApplicantTempAccount,
        nextRelayAnonymousAccount: anonymousAddress,
        appToRelayDataHash: dataHash,
        chainIndex
    };
    let encryptedData = await getEncryptData(preApplicantTempPubkey, data);
    encryptedData = ensure0xPrefix(encryptedData);
    realNameSocket.emit('next relay to app', data);

    // 数据上链: relay使用real name account向app temp account发送使用的anonymous account
    let readOnlyStoreData = await getStoreData();
    let writeStoreData = readOnlyStoreData.connect(new Wallet(privateKey, provider));

    let evidenceHash = keccak256(JSON.stringify(data));
    evidenceHash = ensure0xPrefix(evidenceHash);
    await writeStoreData.setTempAccountHash(preApplicantTempAccount, encryptedData, evidenceHash, chainIndex);
    console.log(
        `relay -> app: using ethersjs send to ${preApplicantTempAccount}, chain index: ${chainIndex}, data: ${data}`
    );
}

// next relay向pre relay回送数据
export function sendNext2PreRelayData() {}
