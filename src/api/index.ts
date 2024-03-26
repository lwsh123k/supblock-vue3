import requests from './requests';

// 该部分主要用于网络请求部分

// 获取认证字符串: Generate UUID and store it on the server
export const getAuthString = async (address: string) => {
    // 指定函数返回值类型
    let authString = await requests.post<any, { message: string }>(`/getAuthString`, {
        address: address
    });
    return authString;
};

// 获得账户信息
interface AccountPubKey {
    publicKey: string;
    address: string;
}
export const getAccountInfo = async (index: number) => {
    // 运行时检查以确保 index 在 0 到 101 之间
    if (index < 0 || index > 101) {
        throw new Error('Index out of bounds');
    }
    let info = await requests.post<any, AccountPubKey>(`/getAccountInfo`, {
        index: index
    });
    return info;
};

// 获得合约地址
// 获得账户信息
interface contractAddress {
    StoreData: string;
    FairInteger: string;
}
export const getContractAddress = async () => {
    let contractAddress = await requests.get<any, contractAddress>('/getContractAddress');
    return contractAddress;
};
