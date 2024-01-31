import { defineStore } from "pinia";
import { ref, computed, reactive, readonly } from "vue";
import { ethers } from "ethers";
import { provider } from "@/ethers/provider";
import { fairIntGenAddress, storeDataAddress } from "@/ethers/contract.json";
import { fairIntGenAbi, storeDataAbi } from "@/ethers/contractInfo";

interface StaetInfo {
    senderState: number[];
    receiverState: number[];
}
interface RandomInfo {
    myRandom: number[];
    otherRandom: number[];
}
export const useEtherStore = defineStore("ether", () => {
    // 作为请求者和响应者展示状态
    const stateInfo: StaetInfo = reactive({
        senderState: [],
        receiverState: [],
    });
    const randomInfo: RandomInfo = reactive({
        myRandom: [],
        otherRandom: [],
    });

    /* 事件监听: 
        promise.race()实现, 监听到和定时只需要完成一个即可
        hash: 请求者只监听from 和 to; 响应者一直监听接收者是自己的事件 
        随机数: 二者都监听, 请求者持续 , 响应者持续 s

        或者持续监听
            监听到自己发送的hash, 就打开2个计时器
            当监听到对方发送的hash, 就打开一个计时器
    */

    const fairIntGen = new ethers.Contract(fairIntGenAddress, fairIntGenAbi, provider);
    const StoreData = new ethers.Contract(storeDataAddress, storeDataAbi, provider);
    function eventListen(myAddress: string) {
        fairIntGen.removeAllListeners();
        // 监听hash
        fairIntGen.on("uploadHash", async (from, to, infoHash) => {
            console.log("监听到了hash, ", from, to);
            if (from === myAddress) {
                stateInfo.senderState.push(-1);
            } else if (to === myAddress) {
                stateInfo.receiverState.push(-1);
            }
        });
        // 监听随机数
        fairIntGen.on("UpLoadNum", async (from, to, state, randomNum) => {
            console.log("监听到了随机数, state: ", state, randomNum);
            if (from === myAddress) {
                // 更新最后一个元素
                stateInfo.senderState.pop();
                stateInfo.senderState.push(state);
                // 更新随机数
                randomInfo.myRandom.push(randomNum as number);
            } else if (to === myAddress) {
                stateInfo.receiverState.pop();
                stateInfo.receiverState.push(state);
                randomInfo.otherRandom.push(randomNum as number);
            }
        });
        // 监听消息上传
        let filter = StoreData.filters.storeDataEvent(null, myAddress);
        StoreData.on(filter, async (from, to, data) => {
            console.log("监听到了消息上传, data: ", data);
            // 需不需要区分是谁发给relay的?
        });
    }

    // 当开始新一轮的fair integer generation时, 清空所有监听
    function clearAllListen() {}

    // 请求者使用：监听响应者hash上传事件(source区分是请求者(=0)还是响应者(=1))
    let reqTimeOutId: NodeJS.Timeout[] = [],
        resTimeOutId: NodeJS.Timeout[] = [];
    async function listenHash(addressA: string | null, addressB: string | null, types: 0 | 1) {
        // 清除之前所有的监听
        fairIntGen.removeAllListeners();
        return new Promise((resolve, reject) => {
            let filter = fairIntGen.filters.uploadHash(addressA, addressB, types);
            // 超时取消监听: 30s + 10s
            const timeout = 40000;
            let timeoutId = setTimeout(() => {
                // 如果30s + 10s没有监听到对方上传hash, 需要移除对ni ri的监听, 移除ni ri超时监听
                fairIntGen.removeAllListeners();
                resolve("");
            }, timeout);

            // 监听部分
            fairIntGen
                .once(filter, async (addressA, addressB, types, infoHash) => {
                    clearTimeout(timeoutId);
                    resolve("");
                })
                .once("error", (error) => {
                    console.log(error);
                    reject(error);
                });
        });
    }
    async function listenNum(addressA: string | null, addressB: string | null, types: 0 | 1) {
        return new Promise((resolve, reject) => {
            let filter = fairIntGen.filters.UpLoadNum(addressA, addressB, types);
            let listenResult = false;
            // 监听部分
            const eventHandler = async (from: string, to: string, types: number, state: number) => {
                listenResult = true;
                clearTimeout(timeoutId);
                resolve(state);
            };
            fairIntGen.once(filter, eventHandler).once("error", (error) => {
                console.log(error);
                reject(error);
            });

            // 超时部分
            const timeout = types === 0 ? 90000 : 50000; // 30s + 10s + 40s + 10s
            let timeoutId = setTimeout(async () => {
                if (listenResult === false) {
                    fairIntGen.off(filter, eventHandler); // 移除监听器
                    resolve("");
                }
            }, timeout);
        });
    }

    // 重置
    function $reset() {}

    return { stateInfo, eventListen };
});
