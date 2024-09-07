import { socketMap } from '@/socket';
import { useLoginStore } from '@/stores/modules/login';
import { relayReceivedData, type RelayResDate } from './chainDataType';

// next relay通过socket使用匿名账户回复pre applicant temp address
export function sendNextRelay2AppData(preApplicantTemp: string) {
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
}

// next relay向pre relay回送数据
export function sendNext2PreRelayData() {}
