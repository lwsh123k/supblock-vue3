import { getFairIntGen } from './contract';
import type { TypedListener } from './types/common';
import type {
    ReqInfoUploadEvent,
    ResHashUploadEvent,
    ResInfoUploadEvent,
    ResReuploadNumEvent
} from './types/FairInteger';

// 请求者使用, 监听响应者hash上传事件(type = 0, 请求者; type = 1, 响应者)
type HashResult = {
    from: string;
    to: string;
    infoHashB: string;
    tA: string;
    tB: string;
    index: string;
};
/**
 *
 * @param addressA applicant address
 * @param addressB relay address
 * @param timeout 超时事件, 默认为40s
 * @returns relay random info
 */
export async function listenResHash(
    addressA: string,
    addressB: string,
    timeout: number = 30000 + 10000
): Promise<HashResult> {
    const fairIntGen = await getFairIntGen();
    let listenser: TypedListener<ResHashUploadEvent>;
    return new Promise((resolve, reject) => {
        let filter = fairIntGen.filters.ResHashUpload(addressB, addressA),
            timeoutId: NodeJS.Timeout;
        // 存储监听调用函数的引用
        listenser = async (from, to, infoHash, tA, tB, index) => {
            clearTimeout(timeoutId);
            resolve({
                from,
                to,
                infoHashB: infoHash,
                tA: tA.toString(),
                tB: tB.toString(),
                index: index.toString()
            });
        };
        timeoutId = setTimeout(() => {
            // 如果30s + 10s没有监听到对方上传hash, 需要移除对ni ri的监听, 移除ni ri超时监听
            fairIntGen.off(filter, listenser); // 只关闭当前的
            reject('not upload hash');
        }, timeout);

        // 监听部分
        fairIntGen.once(filter, listenser);
    });
}

// 请求者使用, 监听响应者的随机数 (可以停止的promise)
type NumResult = { from: string; to: string; ni: number; ri: string; t: number; hashA: string; hashB: string };
export async function stopableListenResNum(
    reqAddress: string,
    resAddress: string,
    timeout: number = 2 * (30000 + 10000)
): Promise<{ p: Promise<NumResult>; rejectAndCleanup: (reason?: any) => void }> {
    const fairIntGen = await getFairIntGen();
    // 定时监听
    let timeoutId: NodeJS.Timeout;
    let resFilter = fairIntGen.filters.ResInfoUpload(resAddress, reqAddress);
    let rejectFunc: (reason?: any) => void; // 记录reject, 之后使用
    let callback: TypedListener<ResInfoUploadEvent>;
    const p = new Promise<NumResult>((resolve, reject) => {
        rejectFunc = reject;
        // 存储引用
        callback = async (from, to, ni, ri, tA, tB, hashA, hashB) => {
            clearTimeout(timeoutId);
            resolve({
                from,
                to,
                ni: ni.toNumber(),
                ri: ri.toHexString(),
                t: tB.toNumber(),
                hashA,
                hashB
            });
        };

        timeoutId = setTimeout(async () => {
            fairIntGen.off(resFilter, callback); // 如果没有监听到(超时), 则移除事件监听器
            reject(new Error('not upload random num'));
        }, timeout);
        fairIntGen.once(resFilter, callback);
    });

    // 使用promise1拒绝promise2
    const rejectAndCleanup = (reason: string) => {
        clearTimeout(timeoutId);
        fairIntGen.off(resFilter, callback);
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
    const fairIntGen = await getFairIntGen();
    let callback: TypedListener<ReqInfoUploadEvent>, timeoutId: NodeJS.Timeout;
    return new Promise((resolve, reject) => {
        let filter = fairIntGen.filters.ReqInfoUpload(reqAddress, resAddress);
        callback = async (from, to, ni, ri, tA, tB, hashA, hashB) => {
            clearTimeout(timeoutId);
            resolve({
                from: from,
                to: to,
                ni: ni.toNumber(),
                ri: ri.toHexString(),
                t: tA.toNumber(),
                hashA,
                hashB
            });
        };

        timeoutId = setTimeout(async () => {
            fairIntGen.off(filter, callback); // 如果没有监听到(超时), 则移除事件监听器
            reject(new Error('not upload random num'));
        }, timeout);
        fairIntGen.once(filter, callback);
    });
}
// relay重新上传的监听, 确定下一个随机数
// 从hash上传就开始监听: 时间: 在原来的基础上+30s   可以由hash上传停止  num正确可以停止
type ReuploadResult = { from: string; to: string; ni: number; ri: string; hashB: string };
export async function stopableListenResReupload(
    reqAddress: string,
    resAddress: string,
    timeout: number = 2 * (30000 + 10000) + 30000
): Promise<{ p: Promise<ReuploadResult>; rejectAndCleanup: (reason?: any) => void }> {
    const fairIntGen = await getFairIntGen();
    // 定时监听
    let timeoutId: NodeJS.Timeout;
    let resFilter = fairIntGen.filters.ResReuploadNum(resAddress, reqAddress);
    let rejectFunc: (reason?: any) => void; // 记录reject, 之后使用
    let callback: TypedListener<ResReuploadNumEvent>;
    const p = new Promise<ReuploadResult>((resolve, reject) => {
        rejectFunc = reject;
        timeoutId = setTimeout(async () => {
            fairIntGen.off(resFilter, callback); // 如果没有监听到(超时), 则移除事件监听器
            reject(new Error('not upload random num'));
        }, timeout);
        callback = async (from, to, ni, ri, originalHashA, originalHashB) => {
            clearTimeout(timeoutId);
            resolve({
                from,
                to,
                ni: ni.toNumber(),
                ri: ri.toHexString(),
                hashB: originalHashB.toString()
            });
        };
        fairIntGen.once(resFilter, callback);
    });

    // 使用promise1拒绝promise2
    const rejectAndCleanup = (reason: string) => {
        clearTimeout(timeoutId);
        fairIntGen.off(resFilter, callback);
        rejectFunc(reason);
    };
    return { p, rejectAndCleanup };
}
// 或者 直接如果对方出错, 接下来的30s直接, 每秒请求一次结果
