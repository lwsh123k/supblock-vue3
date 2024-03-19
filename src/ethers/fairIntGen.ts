import { ethers } from 'ethers';
import { provider } from './provider';
// import { fairIntGenAddress } from './contract.json';
import { fairIntGenAbi as contractAbi } from './contractInfo';
import { generateRandomBytes, getHash } from './util';
import { getContractAddress } from '@/api';

export default class FairIntGen {
    // 类字段: 实例独有的; 类方法: 实例共享的
    // !含义: 非null, undefined断言
    contract!: ethers.Contract;

    async init() {
        // 避免每次都要设置地址, 所以从服务器获取地址
        let fairIntGenAddress = (await getContractAddress()).fairIntGenAddress;
        this.contract = new ethers.Contract(fairIntGenAddress, contractAbi, provider);
    }

    // 切换不同账号
    setKey(key: string) {
        let wallet = new ethers.Wallet(key, provider);
        this.contract = this.contract.connect(wallet);
    }

    // 获取执行次数, 生成随机数ni ri, 并求hash
    async generateRandon(addressB: string) {
        let result = await this.getReqExecuteTime(addressB);
        let tA = result[0].toNumber();
        let tB = result[1].toNumber();
        let dataIndex = result[2].toNumber(); // 双方上传完毕之后, 需要查看所选的随机数
        // 挑选随机数ni, 0 <= ni < 100. Math.random()方法返回一个0（包括）到1（不包括）之间的随机浮点数
        let ni = Math.floor(Math.random() * 100);
        // 挑选混淆值ri, 0 <= ri < 2^256
        let ri = generateRandomBytes(32);
        // 取hash
        let hash = getHash(ni, tA, tB, ri);
        return {
            role: 'applicant',
            randomNum: ni,
            executionTime: tA,
            r: ri,
            status: 'hash正在上传',
            hash
        };
    }

    // 设置请求者hash
    async setReqHash(receiver: string, mHash: string) {
        let contract = this.contract;
        let gasEstimate = await contract.estimateGas.setReqHash(receiver, mHash);
        let tx = await contract.setReqHash(receiver, mHash, {
            gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0)
        });
        await tx.wait();
    }

    // 设置响应者hash
    async setResHash(sender: string, mHash: string) {
        let contract = this.contract;
        let gasEstimate = await contract.estimateGas.setResHash(sender, mHash);
        let tx = await contract.setResHash(sender, mHash, {
            gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0)
        });
        await tx.wait();
    }

    // 设置请求者ni, ri
    async setReqInfo(receiver: string, ni: number, ri: string) {
        try {
            let contract = this.contract;
            // 静态模拟调用获取返回值, static call time: 19.045166015625 ms
            let gasEstimate = await contract.estimateGas.setReqInfo(receiver, ni, ri);
            // 只有模拟的合约正常执行, 才会进行真正的执行交易
            let tx = await contract.setReqInfo(receiver, ni, ri, {
                gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0)
            });
            let receipt = await tx.wait();
            if (receipt && receipt.status == 1) {
                return true;
            } else return false;
        } catch (error: any) {
            console.log('error reason:', error.reason);
            console.log('error:', error);
        }
    }

    // 设置响应者者ni, ri
    async setResInfo(sender: string, ni: number, ri: string) {
        try {
            let contract = this.contract;
            let gasEstimate = await contract.estimateGas.setResInfo(sender, ni, ri);

            let tx = await contract.setResInfo(sender, ni, ri, {
                gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0)
            });
            let receipt = await tx.wait();
            if (receipt && receipt.status == 1) {
                return true;
            } else return false;
        } catch (error: any) {
            console.log('error reason:', error.reason);
            console.log('error:', error);
        }
    }

    // 检查正确性

    // 重新上传

    // 请求者调用: 获得执行次数
    async getReqExecuteTime(receiver: string) {
        let contract = this.contract;
        let result = await contract.getReqExecuteTime(receiver);
        return result;
    }

    // 获得响应者执行次数
    async getResExecuteTime(sender: string) {
        let contract = this.contract;
        let result = await contract.getResExecuteTime(sender);
        return result;
    }

    // 验证上传信息的正确性
    async verifyInfo(sender: string, receiver: string, index: number) {
        let contract = this.contract;
        let result = await contract.verifyInfo(sender, receiver, index);
        // console.log(result);
        return result;
    }

    // 返回双方选择的随机数
    async showNum(sender: string, receiver: string, index: number) {
        let contract = this.contract;
        let result = await contract.showNum(sender, receiver, index);
        return result;
    }

    // 返回双方选择的随机数
    async getState(sender: string, receiver: string, index: number) {
        let contract = this.contract;
        let result = await contract.getState(sender, receiver, index);
        return result;
    }
}
