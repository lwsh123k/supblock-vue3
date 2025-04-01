// 接口定义
export interface Block {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    text: string;
    color: ColorType;
    relayInfo?: RelayInfo;
    isAskSuccess?: boolean; // 询问是否成功
}

type RelayInfo = {
    chainId?: number;
    relayId?: number;
    relayRealAccount?: string;
    appTempAccount?: string;
    blindedFairInteger?: number;
    hashForward?: string; // 当前relay向下一个relay发送的正向hash
};
export interface Arrow {
    fromId: number;
    toId: number;
}

export interface Point {
    x: number;
    y: number;
}
// 图例
export interface Legend {
    color: ColorType;
    text: string;
}

// 类型定义
export type ColorType = 'red' | 'yellow' | 'green' | 'grey' | 'blue';
export type ColorMapType = Record<ColorType, string>;
