import { ethers } from 'ethers';
import { provider } from './provider';
import { fairIntGenAddress, storeDataAddress } from './contract.json';
import { fairIntGenAbi, storeDataAbi } from './contractInfo';

const fairIntGen = new ethers.Contract(fairIntGenAddress, fairIntGenAbi, provider);

// 请求者使用, 监听响应者hash上传事件(type = 0, 请求者; type = 1, 响应者)
type HashResult = {
    addressA: string;
    addressB: string;
    type: number;
    infoHashB: string;
    uploadTime: string;
    index: string;
};
export async function listenResHash(
    addressA: string,
    addressB: string,
    timeout: number = 30000 + 10000
): Promise<HashResult> {
    return new Promise((resolve, reject) => {
        let filter = fairIntGen.filters.UploadHash(addressB, addressA, 1);
        let timeoutId = setTimeout(() => {
            // 如果30s + 10s没有监听到对方上传hash, 需要移除对ni ri的监听, 移除ni ri超时监听
            fairIntGen.removeAllListeners(filter);
            reject('not upload hash');
        }, timeout);

        // 监听部分
        fairIntGen.once(filter, async (addressB, addressA, type, infoHashB, uploadTime, index) => {
            clearTimeout(timeoutId);
            // 属性名都会自动转化为字符串
            resolve({
                addressA,
                addressB,
                type,
                infoHashB: infoHashB.toHexString(),
                uploadTime: uploadTime.toString(),
                index: index.toString()
            });
        });
    });
}

// 可以停止的promise
type NumResult = { from: string; to: string; type: number; ni: string; ri: string; t: string; uploadTime: string };
export function stopableListenResNum(
    reqAddress: string,
    resAddress: string,
    timeout: number = 2 * (30000 + 10000)
): {
    p: Promise<NumResult>;
    rejectAndCleanup: (reason?: any) => void;
} {
    // 定时监听
    let timeoutId: NodeJS.Timeout;
    let resFilter = fairIntGen.filters.UpLoadNum(resAddress, reqAddress, 1);
    let rejectFunc: (reason?: any) => void; // 记录reject, 之后使用
    const p = new Promise<NumResult>((resolve, reject) => {
        rejectFunc = reject;
        timeoutId = setTimeout(async () => {
            fairIntGen.removeAllListeners(resFilter); // 如果没有监听到(超时), 则移除事件监听器
            reject(new Error('not upload random num'));
        }, timeout);
        fairIntGen.once(resFilter, async (from, to, type, ni, ri, t, uploadTime) => {
            clearTimeout(timeoutId);
            resolve({
                from: from,
                to: to,
                type: type,
                ni: ni.toHexString(),
                ri: ri.toHexString(),
                t: t.toHexString(),
                uploadTime: uploadTime.toString()
            });
        });
    });

    // 使用promise1拒绝promise2
    const rejectAndCleanup = (reason: string) => {
        clearTimeout(timeoutId);
        fairIntGen.removeAllListeners(resFilter);
        rejectFunc(reason);
    };
    return { p, rejectAndCleanup };
}

// 响应者使用：监听请求者ni ri上传事件(source区分是请求者(=0)还是响应者(=1))
export async function listenReqNum(
    reqAddress: string,
    resAddress: string,
    timeout: number = 30000 + 10000
): Promise<NumResult> {
    return new Promise((resolve, reject) => {
        let filter = fairIntGen.filters.UpLoadNum(reqAddress, resAddress, 0);
        let timeoutId = setTimeout(async () => {
            fairIntGen.removeAllListeners(filter); // 如果没有监听到(超时), 则移除事件监听器
            reject(new Error('not upload random num'));
        }, timeout);
        fairIntGen.once(filter, async (from, to, type, ni, ri, t, uploadTime) => {
            clearTimeout(timeoutId);
            resolve({
                from: from,
                to: to,
                type: type,
                ni: ni.toHexString(),
                ri: ri.toHexString(),
                t: t.toHexString(),
                uploadTime: uploadTime.toString()
            });
        });
    });
}

// =====================================         not used         ==============================================

// 请求者使用, 监听响应者ni ri上传事件(type = 0, 请求者; type = 1, 响应者)
export async function listenResNum(
    reqAddress: string,
    resAddress: string,
    timeout: number = 2 * (30000 + 10000)
): Promise<NumResult> {
    return new Promise((resolve, reject) => {
        let resFilter = fairIntGen.filters.UpLoadNum(reqAddress, resAddress, 1);
        let timeoutId = setTimeout(async () => {
            fairIntGen.removeAllListeners(resFilter); // 如果没有监听到(超时), 则移除事件监听器
            reject(new Error('not upload random num'));
        }, timeout);
        fairIntGen.once(resFilter, async (from, to, type, state, ni, ri, t) => {
            clearTimeout(timeoutId);
            // resolve({ from, to, type, state, ni, ri, t });
        });
    });
}

// 监听重新上传事件（放弃，最终选择使用socket实现, 不能确定对方什么时候上传）////////////////////////未实现///////////////////
export async function listenReupload(reqAddress: string, resAddress: string, ni: number, ri: string) {
    return new Promise((resolve, reject) => {
        let filter = fairIntGen.filters.ResHashUpload(reqAddress, resAddress);
        let listenResult = false;
        let isReupload = false;
        fairIntGen
            .once(filter, async (from, to, infoHashB) => {
                listenResult = true;
                // await singerContract.setReqInfo(from, to, ni, ri);
                isReupload = true;
                resolve([isReupload, listenResult]);
            })
            .once('error', (error) => {
                console.log(error);
                reject(error);
            });

        const timeout = 40000; // 30s等待 + 10s确认
        let timeoutId = setTimeout(() => {
            fairIntGen.removeAllListeners();
            if (listenResult === false) {
                fairIntGen.removeAllListeners('UpLoadNum'); // 如果30s + 10s没有监听到对方上传hash, 需要移除对ni ri的监听
                resolve([isReupload, listenResult]);
            }
        }, timeout);
    });
}

// 不区分type监听随机数, 这样就能同时知道自己和对方的状态
// 可以解决: 对方上传完成, 还要用promise实现等待自己上传完成 的功能
// 请求者使用, 监听响应者ni ri上传事件(type = 0, 请求者; type = 1, 响应者)
export async function listenNum(
    reqAddress: string,
    resAddress: string,
    timeout: number = 2 * (30000 + 10000)
): Promise<NumResult> {
    return new Promise((resolve, reject) => {
        let resFilter = fairIntGen.filters.UpLoadNum(reqAddress, resAddress, 1);
        let timeoutId = setTimeout(async () => {
            fairIntGen.removeAllListeners(resFilter); // 如果没有监听到(超时), 则移除事件监听器
            reject(new Error('not upload random num'));
        }, timeout);
        fairIntGen.once(resFilter, async (from, to, type, state, ni, ri, t) => {
            clearTimeout(timeoutId);
            // resolve({ from, to, type, state, ni, ri, t });
        });
    });
}
