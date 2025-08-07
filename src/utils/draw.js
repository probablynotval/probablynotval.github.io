import { plotWidth } from "../chart.js";
import { COLOR } from "./color.js";
import { cartesian, color, math } from "./index.js";
export const line = (ctx, p1, p2) => {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
};
export const point = (ctx, radius, pos, stroke) => {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (typeof stroke === "string") {
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
};
export const axis = (ctx, layout, animation) => {
    const { leftEdge, rightEdge, topEdge, bottomEdge, xTickLabelCount, yTickLabelCount } = layout;
    const { elapsedTime, duration } = animation;
    const d = Math.max(xTickLabelCount, yTickLabelCount) * duration;
    const unitProgress = math.clamp(elapsedTime / d);
    const easedProgress = math.easeInOutCubic(unitProgress);
    const xProgress = math.mapFrom(easedProgress, leftEdge, rightEdge);
    const yProgress = math.mapFrom(easedProgress, bottomEdge, topEdge);
    line(ctx, cartesian(leftEdge, bottomEdge), cartesian(xProgress, bottomEdge));
    line(ctx, cartesian(leftEdge, yProgress), cartesian(leftEdge, bottomEdge));
};
export const axisLabels = (ctx, layout, xLabel, yLabel, animation) => {
    const { elapsedTime, duration } = animation;
    const unitProgress = math.clamp(elapsedTime / duration);
    ctx.fillStyle = color.oklch({ ...COLOR.subtext1(), alpha: unitProgress });
    ctx.font = "16px system-ui, sans-serif";
    ctx.textAlign = "center";
    // Draw x-axis label.
    ctx.textBaseline = "bottom";
    ctx.fillText(xLabel, plotWidth(layout) / 2 + layout.leftEdge, layout.canvasHeight - 2);
    // Draw y-axis label.
    ctx.textBaseline = "top";
    ctx.save();
    ctx.translate(0, layout.bottomEdge / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
};
export const xAxisGrid = (ctx, layout, values, colors, mapFn, animation) => {
    const { bottomEdge, topEdge } = layout;
    const { elapsedTime, duration } = animation;
    const n = values.length;
    const totalDuration = n * duration;
    const unitGlobal = math.clamp(elapsedTime / totalDuration);
    const easedGlobal = math.easeInOutCubic(unitGlobal);
    const slotSize = 1 / n;
    const mappedValues = values.map((x) => mapFn(x, layout));
    for (const [i, x] of mappedValues.entries()) {
        ctx.strokeStyle = i % 2 === 0 ? color.oklch(colors[1]) : color.oklch(colors[0]);
        const slotStart = i * slotSize;
        const unitProgress = math.clamp((easedGlobal - slotStart) / slotSize);
        const easedProgress = math.easeOutCubic(unitProgress);
        const progress = math.mapFrom(easedProgress, bottomEdge, topEdge);
        line(ctx, cartesian(x, bottomEdge), cartesian(x, progress));
    }
};
export const yAxisGrid = (ctx, layout, min, max, mapFn, animation) => {
    const { leftEdge, rightEdge, xTickLabelCount, yTickLabelCount } = layout;
    const { elapsedTime, duration } = animation;
    const n = yTickLabelCount;
    if (n === 1) {
        throw new Error("division by zero in yAxisGrid");
    }
    const totalDuration = duration * (xTickLabelCount / yTickLabelCount) * n;
    const unitGlobal = math.clamp(elapsedTime / totalDuration, 0, 1);
    const easedGlobal = math.easeInOutCubic(unitGlobal);
    const slotSize = 1 / n;
    const mappedValues = Array.from({ length: n }, (_, i) => mapFn(min + i * ((max - min) / (n - 1)), layout));
    for (const [i, y] of mappedValues.entries()) {
        if (i === 0) {
            continue;
        }
        const slotStart = i * slotSize;
        const unitProgress = math.clamp((easedGlobal - slotStart) / slotSize);
        const easedProgress = math.easeOutCubic(unitProgress);
        const progress = math.mapFrom(easedProgress, leftEdge, rightEdge);
        line(ctx, cartesian(leftEdge, y), cartesian(progress, y));
    }
};
export const xAxisTickLabels = (ctx, layout, values, mapFn, animation, rotation = 30) => {
    const { bottomEdge, padding } = layout;
    for (const [i, value] of values.entries()) {
        const x = mapFn(value, layout);
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        if (i === values.length - 1 && rotation === 0) {
            ctx.textAlign = "right";
        }
        ctx.font = "16px system-ui, sans-serif";
        const textWidth = ctx.measureText(String(value)).width;
        const offCenter = 4;
        const xOffset = rotation === 0 ? 0 : rotation < 0 ? -textWidth / offCenter : textWidth / offCenter;
        const { elapsedTime, duration } = animation;
        const startingPoint = i * duration;
        const rawProgress = (elapsedTime - startingPoint) / duration;
        const progress = Math.max(0, Math.min(1, rawProgress));
        ctx.save();
        ctx.translate(x + xOffset, bottomEdge + padding * 0.7);
        ctx.rotate(rotation * (Math.PI / 180));
        ctx.fillStyle = color.oklch({ ...COLOR.overlay1(), alpha: progress });
        ctx.fillText(String(value), 0, 0);
        ctx.restore();
    }
};
export const yAxisTickLabels = (ctx, layout, min, max, mapFn, animation, decimalPlaces = 0) => {
    const { leftEdge, padding, xTickLabelCount, yTickLabelCount } = layout;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i < yTickLabelCount; i++) {
        const value = min + i * ((max - min) / (yTickLabelCount - 1));
        const y = mapFn(value, layout);
        if (i === 0) {
            ctx.textBaseline = "bottom";
        }
        else if (i === yTickLabelCount - 1) {
            ctx.textBaseline = "top";
        }
        else {
            ctx.textBaseline = "middle";
        }
        const { elapsedTime, duration, inverse } = animation;
        const idx = inverse ? yTickLabelCount - i - 1 : i;
        const start = duration * idx * (xTickLabelCount / yTickLabelCount);
        const unitProgress = math.clamp((elapsedTime - start) / duration);
        ctx.fillStyle = color.oklch({ ...COLOR.overlay1(), alpha: unitProgress });
        ctx.fillText(value.toFixed(decimalPlaces), leftEdge - padding / 4, y);
    }
};
