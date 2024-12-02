import { ethers } from 'ethers';

// 提供provider, 合约读写实例
const provider = new ethers.providers.WebSocketProvider('ws://127.0.0.1:8545');

export { provider };
