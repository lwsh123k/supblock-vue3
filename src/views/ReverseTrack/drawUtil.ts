import type { Block, Point } from './types';

export const findIntersectionPoint = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    targetBlock: Block
): Point => {
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

// 根据目标方块相对于源方块的位置来选择对角点
export const getDiagonalCorners = (from: Block, to: Block): { start: Point; end: Point } => {
    const fromTopLeft: Point = { x: from.x, y: from.y };
    const fromTopRight: Point = { x: from.x + from.w, y: from.y };
    const fromBottomLeft: Point = { x: from.x, y: from.y + from.h };
    const fromBottomRight: Point = { x: from.x + from.w, y: from.y + from.h };

    const toTopLeft: Point = { x: to.x, y: to.y };
    const toTopRight: Point = { x: to.x + to.w, y: to.y };
    const toBottomLeft: Point = { x: to.x, y: to.y + to.h };
    const toBottomRight: Point = { x: to.x + to.w, y: to.y + to.h };

    const dx = to.x + to.w / 2 - (from.x + from.w / 2);
    const dy = to.y + to.h / 2 - (from.y + from.h / 2);

    // 根据dx, dy所处的象限决定使用哪一对对角点
    // 这里的逻辑是一个示例：
    // 1. 如果to在from的右下方(dx > 0, dy > 0)，使用from的右下角到to的左上角
    // 2. 如果to在from的右上方(dx > 0, dy < 0)，使用from的右上角到to的左下角
    // 3. 如果to在from的左下方(dx < 0, dy > 0)，使用from的左下角到to的右上角
    // 4. 如果to在from的左上方(dx < 0, dy < 0)，使用from的左上角到to的右下角

    if (dx > 0 && dy > 0) {
        // to在from的右下
        return { start: fromBottomRight, end: toTopLeft };
    } else if (dx > 0 && dy < 0) {
        // to在from的右上
        return { start: fromTopRight, end: toBottomLeft };
    } else if (dx < 0 && dy > 0) {
        // to在from的左下
        return { start: fromBottomLeft, end: toTopRight };
    } else {
        // to在from的左上
        return { start: fromTopLeft, end: toBottomRight };
    }
};
