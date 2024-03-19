import { ethers } from 'ethers';
import { provider } from './provider';
// import { fairIntGenAddress } from './contract.json';
import fairIntGenAbi from './abi/FairInteger.json';
import { generateRandomBytes, getHash } from './util';
import { getContractAddress } from '@/api';
import { FairInteger__factory } from './types';
import type { FairInteger } from './types'; // 仅导入类型

export async function getFairIntGen() {
    // 避免每次都要设置地址, 所以从服务器获取地址
    let address = (await getContractAddress()).fairIntGenAddress;
    // 两种实例化方式
    return FairInteger__factory.connect(address, provider);
    return new ethers.Contract(address, fairIntGenAbi, provider) as FairInteger;
}
