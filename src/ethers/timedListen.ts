import { getFairIntGen } from './contract';

// 请求者使用, 监听响应者hash上传事件(type = 0, 请求者; type = 1, 响应者)
type HashResult = {
    from: string;
    to: string;
    infoHashB: string;
    tA: string;
    tB: string;
    uploadTime: string;
    index: string;
};
export async function listenResHash(
    addressA: string,
    addressB: string,
    timeout: number = 30000 + 10000
): Promise<HashResult> {
    const fairIntGen = await getFairIntGen();
    return new Promise((resolve, reject) => {
        let filter = fairIntGen.filters.ResHashUpload(addressB, addressA);
        let timeoutId = setTimeout(() => {
            // 如果30s + 10s没有监听到对方上传hash, 需要移除对ni ri的监听, 移除ni ri超时监听
            fairIntGen.removeAllListeners(filter);
            reject('not upload hash');
        }, timeout);

        // 监听部分
        fairIntGen.once(filter, async (from, to, infoHash, tA, tB, uploadTime, index) => {
            clearTimeout(timeoutId);
            // 属性名都会自动转化为字符串
            resolve({
                from,
                to,
                infoHashB: infoHash,
                tA: tA.toString(),
                tB: tB.toString(),
                uploadTime: uploadTime.toString(),
                index: index.toString()
            });
        });
    });
}

// 可以停止的promise
type NumResult = { from: string; to: string; ni: number; ri: string; t: number; uploadTime: string };
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
    const p = new Promise<NumResult>((resolve, reject) => {
        rejectFunc = reject;
        timeoutId = setTimeout(async () => {
            fairIntGen.removeAllListeners(resFilter); // 如果没有监听到(超时), 则移除事件监听器
            reject(new Error('not upload random num'));
        }, timeout);
        fairIntGen.once(resFilter, async (from, to, ni, ri, t, numHash, uploadTime) => {
            clearTimeout(timeoutId);
            resolve({
                from,
                to,
                ni: ni.toNumber(),
                ri: ri.toHexString(),
                t: t.toNumber(),
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
    const fairIntGen = await getFairIntGen();
    return new Promise((resolve, reject) => {
        let filter = fairIntGen.filters.ReqInfoUpload(reqAddress, resAddress);
        let timeoutId = setTimeout(async () => {
            fairIntGen.removeAllListeners(filter); // 如果没有监听到(超时), 则移除事件监听器
            reject(new Error('not upload random num'));
        }, timeout);
        fairIntGen.once(filter, async (from, to, ni, ri, t, numHash, uploadTime) => {
            clearTimeout(timeoutId);
            resolve({
                from: from,
                to: to,
                ni: ni.toNumber(),
                ri: ri.toHexString(),
                t: t.toNumber(),
                uploadTime: uploadTime.toString()
            });
        });
    });
}
