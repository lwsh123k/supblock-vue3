import { ethers } from 'ethers';
import { storeDataAddress } from './contract.json';
import { storeDataAbi as contractAbi } from './contractInfo';
import { provider } from './provider';

export default class StoreData {
    // 类字段: 实例独有的; 类方法: 实例共享的
    contract;

    // 构造只读合约
    constructor() {
        this.contract = new ethers.Contract(storeDataAddress, contractAbi, provider);
    }

    // 切换不同账号
    setKey(key: string) {
        let wallet = new ethers.Wallet(key, provider);
        this.contract = this.contract.connect(wallet);
    }
}
