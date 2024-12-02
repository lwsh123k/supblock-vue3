import { ethers } from 'ethers';

// 提供provider, 合约读写实例
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
provider.pollingInterval = 1000;

export { provider };
