import requests from './requests';

interface Account {
    addressA: string;
    hashA: string;
    addressB: string;
    hashB: string;
}
type ChartInfo = {
    from: string;
    to: string;
    gas: number;
    uploadNum: {
        gas: number;
    } | null;
    reuploadNum: {
        gas: number;
    } | null;
} | null;

export async function getData(reqData: Account[]) {
    let dataset: any = {
        dimensions: ['item', 'applicant hash gas', 'applicant num gas', 'relay hash gas', 'relay num gas'],
        source: []
    };

    let data = await requests.post<any, ChartInfo[][]>('/getGasStatistic', { accounts: reqData });
    let source = [];
    for (let i = 0; i < data.length; i++) {
        let val = data[i];
        let temp = [];
        temp.push(`relay ${i}`);
        temp.push(val[0]?.gas, val[0]?.uploadNum?.gas);
        temp.push(val[1]?.gas, val[1]?.uploadNum?.gas);
        source.push(temp);
    }
    dataset.source = source;
    return dataset;
}
