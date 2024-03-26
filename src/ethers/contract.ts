import { ethers } from 'ethers';
import { provider } from './provider';
// import { fairIntGenAddress } from './contract.json';
import fairIntGenAbi from './abi/FairInteger.json';
import { getContractAddress } from '@/api';
import { FairInteger__factory, StoreData__factory } from './types';
import type { FairInteger } from './types'; // 仅导入类型

// 返回合约实例对象

// 随机数生成合约实例
export async function getFairIntGen() {
    // 避免每次都要设置地址, 所以从服务器获取地址
    let address = (await getContractAddress()).FairInteger;
    // 两种实例化方式
    return FairInteger__factory.connect(address, provider);
    // ts在引入json时, 自动将字符串转化为了对象
    return new ethers.Contract(address, JSON.stringify(fairIntGenAbi), provider) as FairInteger;
}

// 数据存储合约实例
export async function getStoreData() {
    let address = (await getContractAddress()).StoreData;
    return StoreData__factory.connect(address, provider);
}

// 测试, 获取当前时间
export async function getCurrentBlockTime() {
    // 获取最新区块的编号
    const blockNumber = await provider.getBlockNumber();

    // 使用区块编号获取区块详情
    const block = await provider.getBlock(blockNumber);

    // 区块的时间戳是Unix时间戳，单位是秒
    const blockTimestamp = block.timestamp;

    // 将Unix时间戳转换为JavaScript的Date对象
    const date = new Date(blockTimestamp * 1000);

    console.log(`当前区块编号: ${blockNumber}`);
    console.log(`当前区块时间戳: ${blockTimestamp}`);
    console.log(`当前区块时间: ${date.toString()}`);
}
