import { defineStore } from 'pinia';
import { ref, computed, reactive, readonly } from 'vue';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import { getAuthString } from '@/api';
import { useSocketStore } from './socket';
import { keccak256 } from '@/ethers/util';
import { socketInit } from '@/socket';
import type { Socket } from 'socket.io-client';

// nested type used in other interface
interface Account {
    key: string;
    address: string;
}

interface AllAccountInfo {
    realNameAccount: Account;
    anonymousAccount: Account;
    accounts: Account[];
}

// one chain info
interface TempAccountInfo {
    selectedNum: number[];
    selectedAccount: Account[];
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
    const chainLength = 4;
    const chainNumber = 3;

    // 所有账号信息
    const allAccountInfo = reactive<AllAccountInfo>({
        realNameAccount: {} as Account,
        anonymousAccount: {} as Account,
        accounts: []
    });
    // 多链账号temp account信息. dim0: chain number; dim1: specific chain info
    const tempAccountInfo = reactive<TempAccountInfo[]>(
        Array(chainNumber)
            .fill(null)
            .map(() => {
                return { selectedNum: [], selectedAccount: [] };
            })
    );
    const sendInfo = reactive<SendInfo[]>(
        Array(chainNumber)
            .fill(null)
            .map(() => {
                return { r: [], b: [], hashForward: [], hashBackward: [] };
            })
    );
    const validatorAccount = '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba'; // validator account

    // 登录：随机选择账户, 发送socket登录, 发送blinding number到服务器端
    async function processAccount(privateKey: string[]) {
        // 使account变为{key, address}的格式
        allAccountInfo.accounts = privateKey.map((item) => {
            return { key: item, address: ethers.utils.computeAddress(item) };
        });
        allAccountInfo.realNameAccount = allAccountInfo.accounts[0];
        allAccountInfo.anonymousAccount = allAccountInfo.accounts[1];

        // 如果是申请者的账户, 需要选择随机数, 预先计算需要的值
        if (privateKey.length === 102) {
            for (let i = 0; i < chainNumber; i++) {
                for (let j = 0; j <= chainLength + 2; j++) {
                    // select different temp account index: [0, 100) + 2, the first two is real and anonymous account
                    let randomIndex;
                    do {
                        randomIndex = Math.floor(Math.random() * 100);
                    } while (tempAccountInfo[i].selectedNum.includes(randomIndex + 2));
                    // to use the push method, it must be a array first.
                    tempAccountInfo[i].selectedNum.push(randomIndex + 2);

                    // b: fair-integer选出随机数之后, 加b, mod n
                    let randomB;
                    do {
                        randomB = Math.floor(Math.random() * 100); // Ensure unique b
                    } while (sendInfo[i].b.includes(randomB));
                    sendInfo[i].b.push(randomB);

                    // r: hash时混淆
                    sendInfo[i].r.push(generateRandomByte(32));
                }
                // selectedTempAccount中第一个账户为real name account
                tempAccountInfo[i].selectedNum.pop();
                tempAccountInfo[i].selectedNum.unshift(0);
                tempAccountInfo[i].selectedAccount = tempAccountInfo[i].selectedNum.map((item) => {
                    return allAccountInfo.accounts[item];
                });

                // 计算hash
                sendInfo[i].hashForward.push(
                    keccak256(tempAccountInfo[i].selectedAccount[0].address, sendInfo[i].r[0])
                );
                for (let j = 1; j <= chainLength + 1; j++) {
                    sendInfo[i].hashForward.push(
                        keccak256(
                            tempAccountInfo[i].selectedAccount[j].address,
                            sendInfo[i].r[j],
                            sendInfo[i].hashForward[j - 1]
                        )
                    );
                }
                sendInfo[i].hashBackward.unshift(
                    keccak256(
                        tempAccountInfo[i].selectedAccount[chainLength + 2].address,
                        sendInfo[i].r[chainLength + 2]
                    )
                );
                // 计算反向hash时, 每次都将数据放到数组头部
                for (let j = chainLength; j >= 0; j--) {
                    sendInfo[i].hashBackward.unshift(
                        keccak256(
                            tempAccountInfo[i].selectedAccount[j + 1].address,
                            sendInfo[i].r[j + 1],
                            sendInfo[i].hashBackward[0]
                        )
                    );
                }
            }
        }

        // using socket to login
        let accountNeedLogin = [allAccountInfo.realNameAccount, allAccountInfo.anonymousAccount];
        for (let j = 0; j < chainNumber; j++) {
            accountNeedLogin.push(...tempAccountInfo[j].selectedAccount);
        }

        // array deduplication
        accountNeedLogin = Array.from(new Map(accountNeedLogin.map((account) => [account.address, account])).values());
        await socketLogin(accountNeedLogin);
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

    return { chainLength, chainNumber, allAccountInfo, tempAccountInfo, validatorAccount, sendInfo, processAccount };
});
