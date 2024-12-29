// app -> relay
export type AppToRelayData = {
    from: null | string; // pre applicant temp account, 和PreToNextRelayData中preAppTempAccount对应
    to: null | string; // relay
    appTempAccount: null | string; // 下一轮app要用的temp account
    appTempAccountPubkey: null | string;
    r: null | string;
    hf: null | string;
    hb: null | string;
    b: null | number;
    c: null | string;
    l: number; // 比PreToNextRelayData中l大一
    encrypedTokenOrHash?: string; // 加密后的token, applicant不能直接获取, 只是转发数据
    chainIndex: number;
};

// app received data
export type AppReceivedData = {
    tokenhash: string | null;
    relayTempAccount: string | null;
    encrypedToken: string | null;
    endingAccount: string | null;
};

// current relay -> next relay
export type PreToNextRelayData = {
    from: null | string; // current relay anonymous account
    to: null | string; // relay
    preAppTempAccount: null | string; // 和pre relay对应的pre app temp account, 和AppToRelayData中from对应
    preRelayAccount: null | string; // pre relay anonymous account = from
    hf: null | string;
    hb: null | string;
    b: null | number;
    n: null | number;
    t: null | string; // ??????????
    l: number;
};

export type RelayResData = {
    from: string; // relay anonymous account
    to: string; // applicant temp account
    nextRelayRealnameAccount: string; // relay要用的实名账户
    encrypedTokenOrHash: string; // 发送给applicant, applicant转发给下一个relay, 下一个relay对比数据
    // appToRelayDataHash: string; // app给relay发送的数据的hash, 作为relay对app数据的回应, 改为显式的放到event种
    chainIndex: number;
};

// type: pre applicant temp   and   pre relay -> next relay
export type CombinedData = {
    appToRelayData?: AppToRelayData;
    preToNextRelayData?: PreToNextRelayData;
    appToRelayDataHash?: string;
};

// data: pre applicant temp   and   pre relay -> next relay
export const relayReceivedData = new Map<string, CombinedData>();

// data: current relay -> next relay. not used................................
export const relaySend2NextData = new Map<string, PreToNextRelayData>();
