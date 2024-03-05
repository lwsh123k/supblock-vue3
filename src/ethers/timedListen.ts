import { ethers } from 'ethers';
import { provider } from './provider';
import { fairIntGenAddress, storeDataAddress } from './contract.json';
import { fairIntGenAbi, storeDataAbi } from './contractInfo';

const fairIntGen = new ethers.Contract(fairIntGenAddress, fairIntGenAbi, provider);
// 存储定时器id, 方便清除定时
const reqTimeOutId: NodeJS.Timeout[] = [];
const resTimeOutId: NodeJS.Timeout[] = [];

// 请求者使用, 监听响应者hash上传事件(type = 0, 请求者; type = 1, 响应者)
export async function listenResHash(addressA: string, addressB: string, timeout: number = 30000 + 10000) {
    // 每次调用之前清空所有的监听和定时器
    clearAllListen();
    return new Promise((resolve, reject) => {
        let filter = fairIntGen.filters.UploadHash(addressA, addressB, 1);
        let timeoutId = setTimeout(() => {
            // 如果30s + 10s没有监听到对方上传hash, 需要移除对ni ri的监听, 移除ni ri超时监听
            fairIntGen.removeAllListeners(filter);
            reject('responder not upload');
        }, timeout);

        // 监听部分
        fairIntGen.once(filter, async (addressA, addressB, type, infoHashB) => {
            clearTimeout(timeoutId);
            resolve([addressA, addressB, type, infoHashB]);
        });
    });
}

// 请求者使用, 监听响应者ni ri上传事件(type = 0, 请求者; type = 1, 响应者)
export async function listenResNum(reqAddress: string, resAddress: string, timeout: number = 2 * (30000 + 10000)) {
    return new Promise((resolve, reject) => {
        let resFilter = fairIntGen.filters.ResInfoUpload(reqAddress, resAddress, 1);
        let timeoutId = setTimeout(async () => {
            fairIntGen.removeAllListeners(resFilter); // 如果没有监听到(超时), 则移除事件监听器
            reject();
        }, timeout);
        fairIntGen.once(resFilter, async (from, to, type, state, ni, ri, t) => {
            clearTimeout(timeoutId);
            resolve([from, to, type, state, ni, ri, t]);
        });
    });
}

// 响应者使用：监听请求者ni ri上传事件(source区分是请求者(=0)还是响应者(=1))
export async function listenReqNum(reqAddress: string, resAddress: string, timeout: number = 30000 + 10000) {
    clearAllListen();
    return new Promise((resolve, reject) => {
        let filter = fairIntGen.filters.ReqInfoUpload(reqAddress, resAddress, 0);
        let timeoutId = setTimeout(async () => {
            fairIntGen.removeAllListeners(filter); // 如果没有监听到(超时), 则移除事件监听器
            reject();
        }, timeout);
        fairIntGen.once(filter, async (from, to, type, state, ni, ri, t) => {
            clearTimeout(timeoutId);
            resolve([from, to, type, state, ni, ri, t]);
        });
    });
}

// 监听重新上传事件（放弃，最终选择使用socket实现）////////////////////////未实现///////////////////
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
                fairIntGen.removeAllListeners('ResInfoUpload'); // 如果30s + 10s没有监听到对方上传hash, 需要移除对ni ri的监听
                // 移除ni ri超时监听
                // console.log(reqTimeOutId.length);
                clearTimeout(reqTimeOutId.shift());
                resolve([isReupload, listenResult]);
            }
        }, timeout);
    });
}

// 当开始新一轮的fair integer generation时, 清空所有监听
export async function clearAllListen() {
    fairIntGen.removeAllListeners();
    reqTimeOutId.forEach((timeid) => {
        clearTimeout(timeid);
    });
    resTimeOutId.forEach((timeid) => {
        clearTimeout(timeid);
    });
    reqTimeOutId.splice(0, reqTimeOutId.length);
    resTimeOutId.splice(0, resTimeOutId.length);
}
