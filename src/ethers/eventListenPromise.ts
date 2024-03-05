import exp from 'constants';
import { listenReqNum, listenResHash } from './timedListen';

export async function listenRes(addressA: string, addressB: string) {
    try {
        let [addressA, addressB, type, infoHashB] = await listenResHash(addressA, addressB);
        // 更新表格
        let numB = await listenReqNum(addressA, addressB);
        // 更新表格
    } catch (error) {
        console.log(error);
    }
}

export async function listenReq(addressA: string, addressB: string) {
    try {
        let numA = await listenReqNum(addressA, addressB);
    } catch (error) {
        console.log(error);
    }
}
sigContract.listenResHash(addressA, addressB).then((result) => {
    let [listenResult] = result;
    this.clearOneLine(table, 2);
    if (listenResult === true) {
        this.addMessage(`响应者hash已上传`);
        this.addOneLine(table, '响应者', 'hash已上传');
    } else {
        this.addMessage(`响应者30s内未上传hash`);
        this.addOneLine(table, '响应者', '30s内未上传hash');
    }
}, null);
