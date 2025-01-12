<template>
    <div class="flowchart-container">
        <!-- margin: 设置自己边距; flex: 设置子元素位置 -->
        <canvas ref="flowChartRef" :width="1300" :height="400" style="border: 1px solid #000"></canvas>
        <!-- 输入框仅在编辑状态下显示 -->
        <input
            v-if="currentEditingBlock"
            v-model="editingText"
            :style="inputStyle"
            @keyup.enter="updateBlockText"
            @blur="cancelEditing"
            autofocus />
    </div>
</template>

<script setup lang="ts">
import { formatAddress } from '@/ethers/util';
import { io, type Socket } from 'socket.io-client';
import { ref, onMounted, type Ref, onUnmounted, watch } from 'vue';
import type { Arrow, Block, ColorMapType, Legend, Point } from './types';
import { findIntersectionPoint, getDiagonalCorners } from './drawUtil';
import { findLastRelay } from '@/api/reverseTrace';

// ref 类型定义
const flowChartRef = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);
// 编辑框
const currentEditingBlock = ref<Block | null>(null);
const editingText = ref<string>('');
const inputStyle = ref<Record<string, string>>({});

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
    { id: 11, x: 700, y: 150, w: 150, h: 50, text: 'validator', color: 'blue' },
    { id: 12, x: 950, y: 150, w: 150, h: 50, text: 'anonymous account', color: 'grey' }
]);

const arrows = ref<Arrow[]>([
    { fromId: 2, toId: 1 },
    { fromId: 3, toId: 1 },
    { fromId: 4, toId: 1 },
    { fromId: 5, toId: 2 },
    { fromId: 6, toId: 3 },
    { fromId: 7, toId: 4 },
    { fromId: 8, toId: 5 },
    { fromId: 9, toId: 6 },
    { fromId: 10, toId: 7 },
    { fromId: 11, toId: 8 },
    { fromId: 11, toId: 9 },
    { fromId: 11, toId: 10 }
]);

const bidirectionalArrows = ref<Arrow[]>([{ fromId: 11, toId: 12 }]);

const colorMap: ColorMapType = {
    red: '#FFB3B3',
    yellow: '#FFD6B3',
    green: '#B3FFB3',
    grey: '#c7c2b3',
    blue: '#4287f5'
};

// 偏移使内容居中显示
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
    const itemWidth = 280;
    const itemHeight = 20;
    const totalWidth = itemWidth * 3 + 100;
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

        const fromCenterX = from.x + from.w / 2;
        const fromCenterY = from.y + from.h / 2;
        const toCenterX = to.x + to.w / 2;
        const toCenterY = to.y + to.h / 2;

        const dx = toCenterX - fromCenterX;
        const dy = toCenterY - fromCenterY;

        let startPoint: Point;
        let endPoint: Point;

        // 判断是否为斜线连接(非纯水平、非纯垂直)
        if (dx !== 0 && dy !== 0) {
            // 斜线情况使用对角点连接
            const { start, end } = getDiagonalCorners(from, to);
            startPoint = start;
            endPoint = end;
        } else {
            // 水平或垂直情况使用原逻辑
            startPoint = { x: fromCenterX, y: fromCenterY };
            endPoint = findIntersectionPoint(fromCenterX, fromCenterY, toCenterX, toCenterY, to);
        }

        drawConnection(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
    });

    // Draw bidirectional arrows
    bidirectionalArrows.value.forEach(({ fromId, toId }) => {
        const from = blocks.value.find((b) => b.id === fromId)!;
        const to = blocks.value.find((b) => b.id === toId)!;
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

const handleCanvasClick = (event: MouseEvent): void => {
    if (!flowChartRef.value) return;
    const container = flowChartRef.value.parentElement;
    if (!container) return;

    // 获取 Canvas 和容器的边界
    const canvasRect = flowChartRef.value.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // 计算 Canvas 相对于容器的偏移
    const offsetX = canvasRect.left - containerRect.left;
    const offsetY = canvasRect.top - containerRect.top;

    // 计算 Canvas 显示与逻辑坐标的比例
    const scaleX = flowChartRef.value.width / canvasRect.width;
    const scaleY = flowChartRef.value.height / canvasRect.height;

    // 将鼠标点击坐标转换为 Canvas 内部坐标
    const mouseX = (event.clientX - canvasRect.left) * scaleX;
    const mouseY = (event.clientY - canvasRect.top) * scaleY;

    // 检测是否点击到某个 block
    const clickedBlock = blocks.value.find(
        (block) => mouseX >= block.x && mouseX <= block.x + block.w && mouseY >= block.y && mouseY <= block.y + block.h
    );

    if (clickedBlock) {
        // console.log('Clicked block:', clickedBlock);

        // 对relay询问
        if (clickedBlock.id >= 2 && clickedBlock.id <= 10) {
        }
        // 编辑anonymous account block
        if (clickedBlock.id === 12) {
            currentEditingBlock.value = clickedBlock;
            editingText.value = clickedBlock.text;
            // console.log(offsetX, offsetY, flowChartRef.value.width, canvasRect.width, scaleX, clickedBlock.x / scaleX);

            inputStyle.value = {
                position: 'absolute',
                left: `${offsetX * scaleX + clickedBlock.x}px`,
                top: `${offsetY + clickedBlock.y}px`,
                width: `${clickedBlock.w}px`,
                height: `${clickedBlock.h}px`,
                fontSize: '16px',
                textAlign: 'center',
                border: '1px solid #ccc',
                padding: '0',
                margin: '0',
                boxSizing: 'border-box'
            };
        }

        // 执行点击后的逻辑，例如高亮 block 或显示信息
        // handleBlockClick(clickedBlock);
    }
};
async function updateBlockText() {
    if (currentEditingBlock.value) {
        let text = editingText.value;
        currentEditingBlock.value.text = editingText.value;
        currentEditingBlock.value = null;
        editingText.value = '';
        // reset
        resetAllBlocks();
        let lastRelayInfo = await findLastRelay(text);
        console.log('lastRelayInfo: ', lastRelayInfo);
        for (let lastRelay of lastRelayInfo) {
            console.log('lastRelay: ', lastRelay);
            if (lastRelay.chainIndex === 0) {
                resetBlockText(blocks, 0, 2, formatAddress(lastRelay.lastRelayAccount), lastRelay.lastRelayIndex);
            } else if (lastRelay.chainIndex === 1) {
                resetBlockText(blocks, 1, 2, formatAddress(lastRelay.lastRelayAccount), lastRelay.lastRelayIndex);
            } else if (lastRelay.chainIndex === 2) {
                resetBlockText(blocks, 2, 2, formatAddress(lastRelay.lastRelayAccount), lastRelay.lastRelayIndex);
            }
        }
    }
}

function cancelEditing() {
    currentEditingBlock.value = null;
    editingText.value = '';
}

watch(
    blocks,
    () => {
        draw();
    },
    { deep: true }
);

onMounted(() => {
    if (!flowChartRef.value) return;
    ctx.value = flowChartRef.value.getContext('2d');
    initializeBlocks();
    draw();
    // 点击block
    flowChartRef.value.addEventListener('click', handleCanvasClick);
});

const socket = ref<Socket | null>(null);

onMounted(() => {
    socket.value = io('http://localhost:3000', {
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        query: { address: 'Trace', signedAuthString: '' }
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
        targetBlock.text = newText;
        targetBlock.blindedFairInteger = blindedFairIntNum;
    }
};
function resetAllBlocks() {
    blocks.value = blocks.value.map((block) => {
        // applicant real name, anonymous, validaor block
        if (block.id === 1 || block.id > 10) {
            return block;
        } else return { ...block, text: '', blindedFairInteger: -1 };
    });
    // draw(); // 已经在onMounted中监听blocks变化
}

// 组件卸载时清理
onUnmounted(() => {
    if (socket.value) {
        socket.value.disconnect();
    }
    if (flowChartRef.value) {
        flowChartRef.value.removeEventListener('click', handleCanvasClick);
    }
});
</script>

<style scoped>
.flowchart-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 2vh 0;
}
input {
    border: 1px solid #ccc;
    padding: 2px;
    box-sizing: border-box;
}
</style>
