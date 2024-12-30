// 表格中的行数据信息
export interface DataItem {
    role: string;
    address: string;
    randomNumBefore: number; // 首次上传的随机数
    executionTime: string;
    r: string;
    hash: string;
    status: string;
    dataIndex: number | null;
    randomNumAfter: number; //发生错误重传的随机数
    randomText: string; // table展示上传错误, 如: 24 / 72
    isUpload: boolean;
    isReupload: boolean;
    hasChecked?: boolean;
}
//  中继信息
export interface RelayAccount {
    relayNumber: number; // relay的编号
    relayFairInteger: number; // 选出的随机数
    b: number; // 混淆fair integer
    publicKey: string;
    realNameAccount: string;
    anonymousAccount: string;
}

// relay界面信息展示接口
export type Token = {
    tokenReceived: string;
    tokenDecrypted: string;
    tokenHash: string;
    verifyResult: boolean;
};

// 响应者接收到的数据
export interface AppToRelayData {
    role: string;
    from: string;
    to: string;
    randomNumBefore: number | string | null;
    randomText: number | string | null;
    tA: number;
    tB: number;
    executionTime: number | string | null;
    r: string | null;
    hash: string;
    status: string;
    index: number;
}
export interface RelayToAppData {
    role: string;
    randomNumBefore: number; // 首次上传的随机数
    executionTime: number | string | null;
    r: string | null;
    hash: string;
    status: string;
    index: number | null;
    randomNumAfter: number; //发生错误重传的随机数
    randomText: string; // table展示上传错误, 如: 24 / 72
    isUpload?: boolean;
    isReupload?: boolean;
    hasChecked?: boolean;
}
