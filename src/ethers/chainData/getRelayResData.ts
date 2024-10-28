import { socketMap } from '@/socket';
import { useLoginStore } from '@/stores/modules/login';
import { relayReceivedData, type RelayResDate } from './chainDataType';
import { getStoreData } from '../contract';
import { provider } from '../provider';
import { Wallet } from 'ethers';
import { keccak256 } from '../util';

// next relay通过socket使用匿名账户回复pre applicant temp address
export async function sendNextRelay2AppData(preApplicantTemp: string, hashForward: string) {
    const { allAccountInfo } = useLoginStore();
    let anonymousAddress = allAccountInfo.anonymousAccount.address;
    let anonymouSocket = socketMap.get(anonymousAddress);
    let chainIndex = relayReceivedData.get(preApplicantTemp)?.appToRelayData?.chainIndex as number;

    // construct data
    let data: RelayResDate = {
        from: anonymousAddress,
        to: preApplicantTemp,
        nextRelayAnonymousAccount: anonymousAddress,
        chainIndex
    };
    anonymouSocket.emit('next relay to app', data);

    // 数据上链
    let readOnlyStoreData = await getStoreData();
    let { key: privateKey, address: realNameAddress } = allAccountInfo.realNameAccount;
    let writeStoreData = readOnlyStoreData.connect(new Wallet(privateKey, provider));

    let evidenceHash = keccak256(hashForward, anonymousAddress);
    await writeStoreData.setTempAccountHash(preApplicantTemp, anonymousAddress, evidenceHash);
}

// next relay向pre relay回送数据
export function sendNext2PreRelayData() {}
