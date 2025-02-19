<template>
    <div style="display: flex; flex-direction: column; align-items: center; margin: 2vh 0">
        <!-- margin: 设置自己边距; flex: 设置子元素位置 -->
        <canvas
            ref="flowChartRef"
            :width="1300"
            :height="400"
            style="border: 1px solid #000"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @dblclick="handleDoubleClick"></canvas>
    </div>
</template>

<script setup lang="ts">
import { formatAddress } from '@/ethers/util';
import { io, type Socket } from 'socket.io-client';
import { ref, onMounted, type Ref, onUnmounted } from 'vue';

// 接口定义
interface Block {
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

interface Arrow {
    fromId: number;
    toId: number;
}

interface Point {
    x: number;
    y: number;
}
// 图例
interface Legend {
    color: ColorType;
    text: string;
}

// 类型定义
type ColorType = 'red' | 'yellow' | 'green' | 'grey' | 'blue';
type ColorMapType = Record<ColorType, string>;

// ref 类型定义
const flowChartRef = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);
const selectedBlock = ref<Block | null>(null);
const isDragging = ref<boolean>(false);
const dragOffsetX = ref<number>(0);
const dragOffsetY = ref<number>(0);

const blocks = ref<Block[]>([
    { id: 1, x: 50, y: 150, w: 130, h: 50, text: 'real name account', color: 'blue' },
    { id: 2, x: 250, y: 50, w: 100, h: 50, text: '', color: 'yellow', chainId: 0, relayId: 0, blindedFairInteger: -1 },
    { id: 3, x: 250, y: 150, w: 100, h: 50, text: '', color: 'green', chainId: 1, relayId: 0, blindedFairInteger: -1 },
    { id: 4, x: 250, y: 250, w: 100, h: 50, text: '', color: 'red', chainId: 2, relayId: 0, blindedFairInteger: -1 },
    { id: 5, x: 400, y: 50, w: 100, h: 50, text: '', color: 'yellow', chainId: 0, relayId: 1, blindedFairInteger: -1 },
    { id: 6, x: 400, y: 150, w: 100, h: 50, text: '', color: 'green', chainId: 1, relayId: 1, blindedFairInteger: -1 },
    { id: 7, x: 400, y: 250, w: 100, h: 50, text: '', color: 'red', chainId: 2, relayId: 1, blindedFairInteger: -1 },
    { id: 8, x: 550, y: 50, w: 100, h: 50, text: '', color: 'yellow', chainId: 0, relayId: 2, blindedFairInteger: -1 },
    { id: 9, x: 550, y: 150, w: 100, h: 50, text: '', color: 'green', chainId: 1, relayId: 2, blindedFairInteger: -1 },
    { id: 10, x: 550, y: 250, w: 100, h: 50, text: '', color: 'red', chainId: 2, relayId: 2, blindedFairInteger: -1 },
    { id: 11, x: 700, y: 150, w: 150, h: 50, text: 'anonymous account', color: 'grey' },
    { id: 12, x: 950, y: 150, w: 120, h: 50, text: 'validator', color: 'blue' }
]);

const arrows = ref<Arrow[]>([
    { fromId: 1, toId: 2 },
    { fromId: 1, toId: 3 },
    { fromId: 1, toId: 4 },
    { fromId: 2, toId: 5 },
    { fromId: 3, toId: 6 },
    { fromId: 4, toId: 7 },
    { fromId: 5, toId: 8 },
    { fromId: 6, toId: 9 },
    { fromId: 7, toId: 10 },
    { fromId: 8, toId: 11 },
    { fromId: 9, toId: 11 },
    { fromId: 10, toId: 11 }
]);

const bidirectionalArrows = ref<Arrow[]>([{ fromId: 11, toId: 12 }]);

const colorMap: ColorMapType = {
    red: '#FFB3B3',
    yellow: '#FFD6B3',
    green: '#B3FFB3',
    grey: '#c7c2b3',
    blue: '#4287f5'
};

// 内容居中显示
const calculateOffset = (): number => {
    let minX = Infinity;
    let maxX = -Infinity;

    blocks.value.forEach((block) => {
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x + block.w);
    });

    const totalWidth = maxX - minX;
    return ((flowChartRef.value?.width ?? 0) - totalWidth) / 2 - minX;
};

const initializeBlocks = (): void => {
    const offsetX = calculateOffset();
    blocks.value = blocks.value.map((block) => ({
        ...block,
        x: block.x + offsetX
    }));
};

const drawArrowhead = (x: number, y: number, angle: number): void => {
    if (!ctx.value) return;

    const headLength = 15;
    const headWidth = 5;

    ctx.value.fillStyle = 'black';
    ctx.value.beginPath();
    ctx.value.moveTo(
        x - headLength * Math.cos(angle) - headWidth * Math.sin(angle),
        y - headLength * Math.sin(angle) + headWidth * Math.cos(angle)
    );
    ctx.value.lineTo(x, y);
    ctx.value.lineTo(
        x - headLength * Math.cos(angle) + headWidth * Math.sin(angle),
        y - headLength * Math.sin(angle) - headWidth * Math.cos(angle)
    );
    ctx.value.closePath();
    ctx.value.fill();
};

const drawConnection = (fromX: number, fromY: number, toX: number, toY: number): void => {
    if (!ctx.value) return;

    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.value.beginPath();
    ctx.value.moveTo(fromX, fromY);
    ctx.value.lineTo(toX, toY);
    ctx.value.stroke();

    drawArrowhead(toX, toY, angle);
};

const findIntersectionPoint = (fromX: number, fromY: number, toX: number, toY: number, targetBlock: Block): Point => {
    const angle = Math.atan2(toY - fromY, toX - fromX);

    let intersectX: number;
    let intersectY: number;

    if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
        intersectX = Math.cos(angle) > 0 ? targetBlock.x : targetBlock.x + targetBlock.w;
        intersectY = fromY + (intersectX - fromX) * Math.tan(angle);
    } else {
        intersectY = Math.sin(angle) > 0 ? targetBlock.y : targetBlock.y + targetBlock.h;
        intersectX = fromX + (intersectY - fromY) / Math.tan(angle);
    }

    return { x: intersectX, y: intersectY };
};

const drawBidirectionalArrow = (fromBlock: Block, toBlock: Block, offset: number): void => {
    const startX = fromBlock.x + fromBlock.w / 2;
    const startY = fromBlock.y + fromBlock.h / 2;
    const endX = toBlock.x + toBlock.w / 2;
    const endY = toBlock.y + toBlock.h / 2;

    const angle = Math.atan2(endY - startY, endX - startX);

    const offsetStartX1 = startX + offset * Math.sin(angle);
    const offsetStartY1 = startY - offset * Math.cos(angle);
    const offsetEndX1 = endX + offset * Math.sin(angle);
    const offsetEndY1 = endY - offset * Math.cos(angle);

    const offsetStartX2 = startX - offset * Math.sin(angle);
    const offsetStartY2 = startY + offset * Math.cos(angle);
    const offsetEndX2 = endX - offset * Math.sin(angle);
    const offsetEndY2 = endY + offset * Math.cos(angle);

    const start1 = findIntersectionPoint(offsetEndX1, offsetEndY1, offsetStartX1, offsetStartY1, fromBlock);
    const end1 = findIntersectionPoint(offsetStartX1, offsetStartY1, offsetEndX1, offsetEndY1, toBlock);

    const start2 = findIntersectionPoint(offsetEndX2, offsetEndY2, offsetStartX2, offsetStartY2, fromBlock);
    const end2 = findIntersectionPoint(offsetStartX2, offsetStartY2, offsetEndX2, offsetEndY2, toBlock);

    drawConnection(start1.x, start1.y, end1.x, end1.y);
    drawConnection(end2.x, end2.y, start2.x, start2.y);
};

const drawLegend = (): void => {
    if (!ctx.value || !flowChartRef.value) return;

    const legendY = 355;
    const itemWidth = 230;
    const itemHeight = 20;
    const totalWidth = itemWidth * 3 + 40;
    const startX = (flowChartRef.value.width - totalWidth) / 2;

    const legends: Legend[] = [
        { color: 'red', text: 'privacy-oriented users' },
        { color: 'yellow', text: 'protocol-compliant users' },
        { color: 'green', text: 'security-oriented users' }
    ];

    legends.forEach((legend, index) => {
        const x = startX + (itemWidth + 20) * index;

        ctx.value!.fillStyle = colorMap[legend.color];
        ctx.value!.fillRect(x, legendY, 30, itemHeight);
        ctx.value!.strokeStyle = '#999999';
        ctx.value!.strokeRect(x, legendY, 30, itemHeight);

        ctx.value!.fillStyle = '#333333';
        ctx.value!.font = '14px Arial';
        ctx.value!.textAlign = 'left';
        ctx.value!.textBaseline = 'middle';
        ctx.value!.fillText(legend.text, x + 40, legendY + itemHeight / 2);
    });
};

const draw = (): void => {
    if (!ctx.value || !flowChartRef.value) return;

    ctx.value.clearRect(0, 0, flowChartRef.value.width, flowChartRef.value.height);
    ctx.value.lineWidth = 2;
    ctx.value.strokeStyle = '#000';
    ctx.value.fillStyle = '#000';

    // Draw connections
    arrows.value.forEach(({ fromId, toId }) => {
        const from = blocks.value.find((b) => b.id === fromId)!;
        const to = blocks.value.find((b) => b.id === toId)!;

        // from和to text不为空
        if (from.text === '' || to.text === '') return;

        const startX = from.x + from.w / 2;
        const startY = from.y + from.h / 2;
        // 计算arrow和block的交叉点
        const intersection = findIntersectionPoint(startX, startY, to.x + to.w / 2, to.y + to.h / 2, to);
        drawConnection(startX, startY, intersection.x, intersection.y);
    });

    // Draw bidirectional arrows
    bidirectionalArrows.value.forEach(({ fromId, toId }) => {
        const from = blocks.value.find((b) => b.id === fromId)!;
        const to = blocks.value.find((b) => b.id === toId)!;

        // 3个relay都传递完成数据
        let targetBlock1 = blocks.value.find((block) => block.chainId === 0 && block.relayId === 2);
        let targetBlock2 = blocks.value.find((block) => block.chainId === 1 && block.relayId === 2);
        let targetBlock3 = blocks.value.find((block) => block.chainId === 2 && block.relayId === 2);
        if (targetBlock1?.text === '' || targetBlock2?.text === '' || targetBlock3?.text === '') return;
        drawBidirectionalArrow(from, to, 10);
    });

    // Draw blocks
    blocks.value.forEach((block) => {
        if (!ctx.value) return;

        // 只有text不为空
        if (block.text === '') return;
        // set colour
        let fillColour = colorMap['grey'];
        if (block.text === 'real name account' || block.text === 'validator') fillColour = colorMap['blue'];
        else if (block.blindedFairInteger === null || block.blindedFairInteger === undefined)
            fillColour = colorMap['grey'];
        else if (block.blindedFairInteger >= 1 && block.blindedFairInteger <= 33) fillColour = colorMap['red'];
        else if (block.blindedFairInteger >= 34 && block.blindedFairInteger <= 66) fillColour = colorMap['green'];
        else fillColour = colorMap['yellow'];
        ctx.value.fillStyle = fillColour;
        ctx.value.fillRect(block.x, block.y, block.w, block.h);
        ctx.value.strokeStyle = 'black';
        ctx.value.strokeRect(block.x, block.y, block.w, block.h);

        ctx.value.fillStyle = 'black';
        ctx.value.font = '14px Arial';
        ctx.value.textAlign = 'center';
        ctx.value.textBaseline = 'middle';
        ctx.value.fillText(block.text, block.x + block.w / 2, block.y + block.h / 2);
    });

    drawLegend();
};

const changeColor = (color: ColorType): void => {
    if (selectedBlock.value) {
        selectedBlock.value.color = color;
        draw();
    }
};

const handleMouseDown = (e: MouseEvent): void => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    selectedBlock.value =
        blocks.value.find(
            (block) => x >= block.x && x <= block.x + block.w && y >= block.y && y <= block.y + block.h
        ) || null;

    if (selectedBlock.value) {
        isDragging.value = true;
        dragOffsetX.value = x - selectedBlock.value.x;
        dragOffsetY.value = y - selectedBlock.value.y;
    }
};

const handleMouseMove = (e: MouseEvent): void => {
    if (isDragging.value && selectedBlock.value) {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        selectedBlock.value.x = x - dragOffsetX.value;
        selectedBlock.value.y = y - dragOffsetY.value;

        draw();
    }
};

const handleMouseUp = (): void => {
    isDragging.value = false;
};

const handleDoubleClick = (): void => {
    if (selectedBlock.value) {
        const text = prompt('Enter text:', selectedBlock.value.text);
        if (text !== null) {
            selectedBlock.value.text = text;
            draw();
        }
    }
};

onMounted(() => {
    if (!flowChartRef.value) return;
    ctx.value = flowChartRef.value.getContext('2d');
    initializeBlocks();
    draw();
});

const socket = ref<Socket | null>(null);

onMounted(() => {
    socket.value = io('http://localhost:3000', {
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        query: { address: 'relayInfo', signedAuthString: '' }
    });
    socket.value.on('connect', () => {
        console.log('relay info socket connected to server');
    });

    // 动态从server获取selected relay
    socket.value.on('send relay info', (data) => {
        // 第几条链的第几个relay, relay number, real name address
        console.log('receive relay info, data: ', data);
        let {
            from,
            to,
            applicant,
            relay,
            nextRelay,
            blindedFairIntNum,
            fairIntegerNumber,
            blindingNumber,
            hashOfApplicant,
            chainId,
            relayId
        } = data;
        let formatedNextRelayAddress = formatAddress(nextRelay);

        // 如果是第一条链, 第一个relay, 重置text
        if (chainId === 0 && relayId === 0) {
            resetBlockText(blocks, 0, 0, formatedNextRelayAddress, blindedFairIntNum);
        }
        // 设置text, 根据文本画出block和arrow
        resetBlockText(blocks, chainId, relayId, formatedNextRelayAddress, blindedFairIntNum);
        draw();
    });

    socket.value.on('disconnect', () => {
        console.log('relay info socket disconnected from server');
    });
});
const resetBlockText = (
    blocks: Ref<Block[]>,
    chainId: number,
    relayId: number,
    newText: string = '',
    blindedFairIntNum: number
) => {
    // 找到匹配的区块
    const targetBlock = blocks.value.find((block) => block.chainId === chainId && block.relayId === relayId);

    // 如果找到目标区块，更新其text值
    if (targetBlock) {
        // targetBlock.text = newText;
        targetBlock.text = blindedFairIntNum.toString();
        targetBlock.blindedFairInteger = blindedFairIntNum;
    }

    // 重置其他相关区块
    if (chainId === 0 && relayId === 0) {
        blocks.value = blocks.value.map((block) => {
            // applicant real name, anonymous, validaor block
            if (block.id === 1 || block.id > 10) {
                return block;
            } else if (block.id === 2) {
                return block; // chainid = 0 && relayid = 0, 已经在target block设置
            } else return { ...block, text: '', blindedFairInteger: -1 };
        });
    }
};
// 组件卸载时清理
onUnmounted(() => {
    if (socket.value) {
        socket.value.disconnect();
    }
});
</script>
