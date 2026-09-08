import { toNumber } from 'ethers';
import { getFairIntGen } from '../contract';

export async function getAccountInfoByContract(index: number) {
    let fairIntGen = await getFairIntGen();
    let res = await fairIntGen.getAddressById(index);
    // console.log(res);
    return { address: res.account, publicKey: res.pubKey };
}

export async function getAccountInfoByInfoHash(infoHash: string) {
    let fairIntGen = await getFairIntGen();
    let res = await fairIntGen.getNumByHash(infoHash);
    // console.log(res);
    return res;
}

export async function getBlindedFairIntByInfoHash(infoHash: string, b: number) {
    let fairIntGen = await getFairIntGen();
    let res = await fairIntGen.getNumByHash(infoHash);
    if (res.reuploadFlags === 1n) return toNumber(res.niA);
    else if (res.reuploadFlags === 2n) return toNumber(res.niB);
    else return ((toNumber(res.niA) + toNumber(res.niB) + b) % 99) + 1;
}
