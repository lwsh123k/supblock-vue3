import { defineStore } from 'pinia';
import { ref, computed, reactive, readonly } from 'vue';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import createKeccakHash from 'keccak';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex as toHex, randomBytes } from '@noble/hashes/utils';
import socket from '@/socket';
import { getAuthString } from '@/api';

// 定义嵌套类型
interface Account {
    key: string;
    address: string;
}
interface AccountInfo {
    realNameAccount: Account;
    anonymousAccount: Account;
    accounts: Account[];
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
    const chainLength = 3;
    const accountInfo: AccountInfo = reactive({
        realNameAccount: {} as Account,
        anonymousAccount: {} as Account,
        accounts: [],
        selectedNum: [],
        selectedAccount: []
    });
    const validatorAccount = '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba';
    const sendInfo: SendInfo = reactive({
        r: [],
        b: [],
        hashForward: [],
        hashBackward: []
    });

    // 登录：随机选择账户, 发送socket登录
    async function processAccount(privateKey: string[]) {
        // 使account变为{key, address}的格式
        accountInfo.accounts = privateKey.map((item) => {
            return { key: item, address: ethers.utils.computeAddress(item) };
        });
        accountInfo.realNameAccount = accountInfo.accounts[0];
        accountInfo.anonymousAccount = accountInfo.accounts[1];

        // 如果是申请者的账户, 需要选择随机数, 预先计算需要的值
        if (privateKey.length === 102) {
            for (let i = 0; i <= chainLength + 2; i++) {
                // selectedTempAccount: [0, 99) + 2
                let randomIndex = Math.floor(Math.random() * 100);
                accountInfo.selectedNum.push(randomIndex + 2);
                // b: fair-integer选出随机数之后, 加b, mod n
                sendInfo.b.push(Math.floor(Math.random() * 100));
                // r: hash时混淆
                sendInfo.r.push(generateRandomByte(32));
            }
            // selectedTempAccount中第一个账户为real name account
            accountInfo.selectedNum.pop();
            accountInfo.selectedNum.unshift(0);
            accountInfo.selectedAccount = accountInfo.selectedNum.map((item) => {
                return accountInfo.accounts[item];
            });

            // 计算hash
            sendInfo.hashForward.push(keccak256(accountInfo.selectedAccount[0].address, sendInfo.r[0]));
            for (let i = 1; i <= chainLength + 1; i++) {
                sendInfo.hashForward.push(
                    keccak256(accountInfo.selectedAccount[i].address, sendInfo.r[i], sendInfo.hashForward[i - 1])
                );
            }
            sendInfo.hashBackward.unshift(
                keccak256(accountInfo.selectedAccount[chainLength + 2].address, sendInfo.r[chainLength + 2])
            );
            // 计算反向hash时, 每次都将数据放到数组头部
            for (let i = chainLength; i >= 0; i--) {
                sendInfo.hashBackward.unshift(
                    keccak256(accountInfo.selectedAccount[i + 1].address, sendInfo.r[i + 1], sendInfo.hashBackward[0])
                );
            }
        }
        socketLogin([accountInfo.realNameAccount, accountInfo.anonymousAccount, ...accountInfo.selectedAccount]);
    }

    // 对任意个数的参数取hash
    function keccak256(...args: string[]) {
        const hash = sha256.create();
        for (let arg of args) hash.update(arg.toString());
        const result = toHex(hash.digest());
        console.log(result);
        return result;
    }
    // socket登录:
    async function socketLogin(loginAccunt: Account[]) {
        for (let item of loginAccunt) {
            let { key, address } = item;
            let authString = (await getAuthString(address)).message;
            let wallet = new ethers.Wallet(key);
            let signedAuthString = await wallet.signMessage(authString);
            socket.emit('join', { address, signedAuthString });
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

    return { chainLength, accountInfo, validatorAccount, sendInfo, processAccount };
});
