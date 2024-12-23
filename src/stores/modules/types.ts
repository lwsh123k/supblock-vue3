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

export type Token = {
    tokenReceived: string;
    tokenDecrypted: string;
    tokenHash: string;
    verifyResult: boolean;
};
