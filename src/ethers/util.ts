import { ethers } from 'ethers';
import { provider } from './provider';
// import { cipher, decryptWithPrivateKey, encryptWithPublicKey } from 'eth-crypto';
import EthCrypto, { cipher } from 'eth-crypto';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex as toHex, randomBytes } from '@noble/hashes/utils';

// 计算hash, 使用keccak256, 保证数据类型与solidity中的数据类型一致
export function getHash(ni: number, ta: number, tb: number, ri: string) {
    const hash = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'uint256', 'uint256'], [ni, ta, tb, ri]);
    return hash;
}

// 计算签名
export async function getSign(data: any, privateKey: string) {
    let wallet = new ethers.Wallet(privateKey, provider);
    let signedData = await wallet.signMessage(data);
    return signedData;
}

// 计算地址
export function getAddress(privateKey: string) {
    let address = ethers.utils.computeAddress(privateKey);
    return address;
}

// 生成指定长度的不全为0随机字节数组, 并转换为16进制返回
export function generateRandomBytes(length: number) {
    let randomBytes;
    do {
        // 返回值类型为 Uint8Array
        randomBytes = ethers.utils.randomBytes(length);
    } while (!randomBytes.some((x) => x !== 0)); // 数组存在x不为0,即可退出while循环
    // 将字节数组转换为十六进制字符串
    return ethers.utils.hexlify(randomBytes);
}

export function getRandom(tA: number, tB: number) {
    // 挑选随机数ni, 0 <= ni < 100. Math.random()方法返回一个0（包括）到1（不包括）之间的随机浮点数
    let ni = Math.floor(Math.random() * 100);
    // 挑选混淆值ri, 0 <= ri < 2^256
    let ri = generateRandomBytes(32);
    // 取hash
    let hash = getHash(ni, tA, tB, ri);
    return { ni, ri, hash };
}

// 使用对方公钥加密
// 加密: 传入对象, 将对象 -> json字符串 -> 加密对象 -> 字符串
// 返回的16进制加上0x前缀(grpc: binding number, r)
export async function getEncryptData(publicKey: string, data: any) {
    // publicKey: 不带0x
    const removedPrefixpublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    let jsonData = JSON.stringify(data);
    let encryptedData = await EthCrypto.encryptWithPublicKey(removedPrefixpublicKey, jsonData);
    return '0x' + cipher.stringify(encryptedData);
}

// 使用私钥解密
// 解密: 字符串 -> 解密对象 -> json对象 -> 对象
export async function getDecryptData(privateKey: string, encryptedData: string) {
    // privatekay: 带0x前缀, encryptedData: 不带0x前缀
    privateKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
    const removedPrefixData = encryptedData.startsWith('0x') ? encryptedData.slice(2) : encryptedData; // 去掉0x前缀
    console.log(privateKey, removedPrefixData, cipher.parse(removedPrefixData));
    let jsonData = await EthCrypto.decryptWithPrivateKey(privateKey, cipher.parse(removedPrefixData));
    let data = JSON.parse(jsonData);
    return data;
}

// 对任意个数的参数取hash
export function keccak256(...args: string[]) {
    const hash = sha256.create();
    for (let arg of args) hash.update(arg.toString());
    const result = toHex(hash.digest());
    // console.log(result);
    return result;
}

// 验证正向hash
export function verifyHashForward(applicantTempAccount: string, r: string, currentHash: string, PreHash: string) {
    if (PreHash === undefined) return currentHash === keccak256(applicantTempAccount, r);
    else return currentHash === keccak256(applicantTempAccount, r, PreHash);
}
// 验证反向hash
export function verifyHashBackward(applicantTempAccount: string, r: string, currentHash: string, nextHash: string) {
    if (nextHash === undefined) return currentHash === keccak256(applicantTempAccount, r);
    else return currentHash === keccak256(applicantTempAccount, r, nextHash);
}

export function addHexAndMod(hex1: string, hex2: string) {
    // format
    hex1 = hex1.startsWith('0x') ? hex1 : '0x' + hex1;
    hex2 = hex2.startsWith('0x') ? hex2 : '0x' + hex2;

    // to bigint
    const num1 = BigInt(hex1);
    const num2 = BigInt(hex2);

    // mod 2^256
    const mod = BigInt(2) ** BigInt(256);
    const result = (num1 + num2) % mod;

    // 将结果转换回64位16进制字符串
    return result.toString(16).padStart(64, '0');
}

export function subHexAndMod(hex1: string, hex2: string) {
    // format
    hex1 = hex1.startsWith('0x') ? hex1 : '0x' + hex1;
    hex2 = hex2.startsWith('0x') ? hex2 : '0x' + hex2;

    // to bigint
    const num1 = BigInt(hex1);
    const num2 = BigInt(hex2);

    // mod 2^256
    const mod = BigInt(2) ** BigInt(256);
    const result = (num1 - num2) % mod;

    // 将结果转换回64位16进制字符串
    return result.toString(16).padStart(64, '0');
}
