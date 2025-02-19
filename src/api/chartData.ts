import requests from './requests';

interface Account {
    addressA: string;
    hashA: string;
    addressB: string;
    hashB: string;
}

interface GasInfo {
    from?: string;
    to?: string;
    gas?: number;
}

interface HashData {
    uploadHash: GasInfo | null;
    uploadNum: { gas: number } | null;
    reuploadNum: { gas: number } | null;
}

interface ResponseData {
    hashA: HashData;
    hashB: HashData;
}

export async function getData(reqData: Account[]) {
    let dataset: any = {
        dimensions: [
            'item',
            'applicant hash gas',
            'applicant num gas',
            'applicant reupload gas',
            'relay hash gas',
            'relay num gas',
            'relay reupload gas'
        ],
        source: []
    };

    let data = await requests.post<any, ResponseData[]>('/getGasStatistic', { accounts: reqData });
    let source = [];

    for (let i = 0; i < data.length; i++) {
        let val = data[i];
        let temp = [];
        temp.push(`relay ${i}`);
        // HashA 相关的 gas 数据
        temp.push(val.hashA.uploadHash?.gas || 0, val.hashA.uploadNum?.gas || 0, val.hashA.reuploadNum?.gas || 0);
        // HashB 相关的 gas 数据
        temp.push(val.hashB.uploadHash?.gas || 0, val.hashB.uploadNum?.gas || 0, val.hashB.reuploadNum?.gas || 0);
        source.push(temp);
    }
    dataset.source = source;
    return dataset;
}
