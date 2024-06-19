import { socketMap } from '@/socket';
import { useLoginStore } from '@/stores/modules/login';

// next relay通过socket使用匿名账户回复pre applicant temp address
export function sendNextRelay2AppData(preApplicantTemp: string) {
    const { chainLength, accountInfo, validatorAccount, sendInfo } = useLoginStore();
    let anonymousAddress = accountInfo.anonymousAccount.address;
    let anonymouSocket = socketMap.get(anonymousAddress);
    anonymouSocket.emit('next relay to app', {
        from: anonymousAddress,
        to: preApplicantTemp,
        nextRelayAnonymousAccount: anonymousAddress
    });
}

// next relay向pre relay回送数据
export function sendNext2PreRelayData() {}
