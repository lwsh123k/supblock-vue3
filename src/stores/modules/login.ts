import { defineStore } from 'pinia';
import { ref, computed, reactive, readonly } from 'vue';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import { getAuthString } from '@/api';
import { useSocketStore } from './socket';
import { keccak256 } from '@/ethers/util';
import { sendBlindingNumber, socketInit, socketMap } from '@/socket';
import type { Socket } from 'socket.io-client';

// 定义嵌套类型
interface Account {
    key: string;
    address: string;
}
interface AccountInfo {
    realNameAccount: Account;
    anonymousAccount: Account;
    accounts: Account[];
    selectedNum: number[][]; // dim0: chain number; dim1: chain length
    selectedAccount: Account[][];
}
interface SendInfo {
    r: string[];
    b: number[];
    hashForward: string[];
    hashBackward: string[];
}
interface RandomInfo {
    myRandom: number[];
    otherRandom: number[];
}
export const useLoginStore = defineStore('login', () => {
    // state
    const chainLength = 3;
    const chainNumber = 3;
    const accountInfo: AccountInfo = reactive({
        realNameAccount: {} as Account,
        anonymousAccount: {} as Account,
        accounts: [],
        selectedNum: [],
        selectedAccount: []
    });
    const validatorAccount = '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba';
    const sendInfo = reactive<SendInfo[]>([]);

    // 登录：随机选择账户, 发送socket登录, 发送blinding number到服务器端
    async function processAccount(privateKey: string[]) {
        // 使account变为{key, address}的格式
        accountInfo.accounts = privateKey.map((item) => {
            return { key: item, address: ethers.utils.computeAddress(item) };
        });
        accountInfo.realNameAccount = accountInfo.accounts[0];
        accountInfo.anonymousAccount = accountInfo.accounts[1];

        // 如果是申请者的账户, 需要选择随机数, 预先计算需要的值
        if (privateKey.length === 102) {
            for (let i = 0; i < chainNumber; i++) {
                for (let j = 0; j <= chainLength + 2; j++) {
                    // selectedTempAccount: [0, 100) + 2
                    let randomIndex = Math.floor(Math.random() * 100);
                    accountInfo.selectedNum[i].push(randomIndex + 2);
                    // b: fair-integer选出随机数之后, 加b, mod n
                    sendInfo[i].b.push(Math.floor(Math.random() * 100));
                    // r: hash时混淆
                    sendInfo[i].r.push(generateRandomByte(32));
                }
                // selectedTempAccount中第一个账户为real name account
                accountInfo.selectedNum[i].pop();
                accountInfo.selectedNum[i].unshift(0);
                accountInfo.selectedAccount[i] = accountInfo.selectedNum[i].map((item) => {
                    return accountInfo.accounts[item];
                });

                // 计算hash
                sendInfo[i].hashForward.push(keccak256(accountInfo.selectedAccount[i][0].address, sendInfo[i].r[0]));
                for (let j = 1; j <= chainLength + 1; j++) {
                    sendInfo[i].hashForward.push(
                        keccak256(
                            accountInfo.selectedAccount[i][j].address,
                            sendInfo[i].r[j],
                            sendInfo[i].hashForward[j - 1]
                        )
                    );
                }
                sendInfo[i].hashBackward.unshift(
                    keccak256(accountInfo.selectedAccount[i][chainLength + 2].address, sendInfo[i].r[chainLength + 2])
                );
                // 计算反向hash时, 每次都将数据放到数组头部
                for (let j = chainLength; j >= 0; j--) {
                    sendInfo[i].hashBackward.unshift(
                        keccak256(
                            accountInfo.selectedAccount[i][j + 1].address,
                            sendInfo[i].r[j + 1],
                            sendInfo[i].hashBackward[0]
                        )
                    );
                }
            }
        }
        await socketLogin([
            accountInfo.realNameAccount,
            accountInfo.anonymousAccount,
            ...accountInfo.selectedAccount.flat()
        ]);
        // 发送blinding number到服务器端
        if (privateKey.length === 102) {
            let appTempAccount = accountInfo.selectedAccount.map((val) => {
                return val.address;
            });
            let socket0 = socketMap.get(accountInfo.realNameAccount.address);
            await sendBlindingNumber(socket0, sendInfo.b, appTempAccount);
        }
    }

    // socket登录:
    async function socketLogin(loginAccunt: Account[]) {
        for (let item of loginAccunt) {
            let { key, address } = item;
            let authString = (await getAuthString(address)).message;
            let wallet = new ethers.Wallet(key);
            let signedAuthString = await wallet.signMessage(authString);
            socketInit(address, signedAuthString);
        }
    }

    // 生成指定长度的随机字节数组
    function generateRandomByte(length: number): string {
        let randomArray = new Uint8Array(length);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(randomArray);
        } else {
            throw new Error('浏览器不支持crypto.getRandomValues()');
        }
        // 将uint8array转化为16进制字符串
        // let hexString = [...randomArray].map((x) => x.toString(16).padStart(2, '0')).join('');
        let hexString = Buffer.from(randomArray).toString('hex');
        return '0x' + hexString;
    }

    // 退出登录
    function $reset() {}

    return { chainLength, chainNumber, accountInfo, validatorAccount, sendInfo, processAccount };
});
