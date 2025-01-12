// 接口定义
export interface Block {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    text: string;
    color: ColorType;
    chainId?: number;
    relayId?: number;
    blindedFairInteger?: number;
}

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
