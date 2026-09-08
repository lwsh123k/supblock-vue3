import { ethers } from 'ethers';

// 提供provider, 合约读写实例
// const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
// provider.pollingInterval = 1000;

// 连续上传 hash/随机数时，实时读取 pending nonce，避免 ethers 6 默认的 250ms 缓存。
const provider = new ethers.WebSocketProvider('ws://127.0.0.1:8545', undefined, { cacheTimeout: -1 });

export { provider };
