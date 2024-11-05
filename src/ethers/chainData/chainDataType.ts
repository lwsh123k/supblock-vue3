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

export type RelayResDate = {
    from: string;
    to: string;
    nextRelayAnonymousAccount: string;
    appToRelayDataHash: string; // app给relay发送的数据的hash
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
