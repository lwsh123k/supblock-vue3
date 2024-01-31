import { ethers } from "ethers";
import { Observable, Subject, catchError, take, takeUntil, throwError, timeout } from "rxjs";
import { provider } from "./provider";
import { fairIntGenAddress, storeDataAddress } from "./contract.json";
import { fairIntGenAbi, storeDataAbi } from "./contractInfo";

/**
 * 只需要监听2个事件即可
 *  1. hash上传(设置定时器, 对方没有上传hash 或者 没有上传随机数)
 *  2. 随机数上传
 *  监听不需要停止, 监听到之后改变页面状态即可
 * 如果state变量表明二者都完成, 就给下一个relay发送消息
 **/

const fairIntGen = new ethers.Contract(fairIntGenAddress, fairIntGenAbi, provider);

// 用于取消随机数的监听
const cancelTaskB$ = new Subject();

// hash监听
const hashSource = new Observable((subscriber) => {
    // let filter = fairIntGen.filters.UpLoadNum(addressA, addressB, types);
    const handler = async (from: string, to: string, types: number, infoHash: string) => {
        subscriber.next(types);
        subscriber.complete();
    };
    fairIntGen.on("uploadHash", handler);

    // 当订阅被取消时，移除事件监听器
    return function unsubscribe() {
        fairIntGen.off("uploadHash", handler);
    };
}).pipe(
    timeout(40000),
    take(1),
    catchError((error) => {
        if (error.name === "TimeoutError") {
            cancelTaskB$.next("cancel listening random num"); // 发送取消信号
            return throwError(() => new Error("hash timeout"));
        }
        return throwError(() => error);
    })
);
hashSource.subscribe({
    next: (event) => {
        console.log("Event received:", event);
    },
    error: (err) => console.error(err),
    complete: () => console.log("hash stream completed"),
});

// 随机数监听
const randomNumSource = new Observable((subscriber) => {
    // let filter = fairIntGen.filters.UpLoadNum(addressA, addressB, types);
    const handler = async (from: string, to: string, types: number, state: number) => {
        subscriber.next(state);
        subscriber.complete();
    };
    fairIntGen.on("UpLoadNum", handler);

    // 当订阅被取消时，移除事件监听器
    return function unsubscribe() {
        fairIntGen.off("UpLoadNum", handler);
    };
}).pipe(timeout(90000), take(1), takeUntil(cancelTaskB$));
randomNumSource.subscribe({
    next: (event) => {
        console.log("Event received:", event);
    },
    error: (err) => console.error(err),
    complete: () => console.log("random num stream completed"),
});
randomNumSource.subscribe({
    next: (event) => {
        console.log("Event received:", event);
    },
    error: (err) => console.error(err),
    complete: () => console.log("random num stream completed"),
});
