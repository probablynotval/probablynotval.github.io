import { Chart } from "../chart.js";
import { loadCsvData } from "../csv.js";
import { COLOR } from "../utils/color.js";
import {
  cartesian,
  color,
  draw,
  findHoveredPoint,
  fmt,
  isThemeDark,
  math,
  prefersReducedMotion,
} from "../utils/index.js";

const data = await loadCsvData("./data/pay-gap/all-employees-hourly-pay-by-gender-1997-2017.csv");

export const payGap = (parent, dimensions, padding, animationCycle) => {
  const lineDuration = animationCycle * 80;
  const xTickLabelCount = 21;
  const yTickLabelCount = 8;
  const xAxisLabel = "year";
  const yAxisLabel = "pay gap (%)";
  const pointRadius = 5;
  const minPayGap = 0;

  const yearToWidth = (value, layout) =>
    math.map(value, startYear, endYear, layout.leftEdge, layout.rightEdge);
  const widthToYear = (value, layout) =>
    math.map(value, layout.leftEdge, layout.rightEdge, startYear, endYear);

  const payGapToHeight = (value, layout) =>
    math.map(value, minPayGap, maxPayGap, layout.bottomEdge, layout.topEdge);
  const heightToPayGap = (value, layout) =>
    math.map(value, layout.bottomEdge, layout.topEdge, minPayGap, maxPayGap);

  const startYear = data.getNum(0, "year");
  const endYear = data.getNum(-1, "year");

  const payGapCol = data.getColumn("pay_gap").map(Number);
  const maxPayGap = Math.max(...payGapCol);

  const pointScales = Array(payGapCol.length).fill(1);
  const pointFillAlphas = Array(payGapCol.length).fill(0);
  const pointStrokeAlphas = Array(payGapCol.length).fill(0);

  return new Chart(parent, {
    title: "Gender Pay Gap: Average Difference Between Male and Female Pay",
    name: "Pay Gap",
    data,
    dimensions,
    offsets: {
      top: 15,
      left: padding * 2,
      right: padding,
      bottom: padding * 2.25,
    },
    hooks: {
      preload: ({ ctx }) => {
        ctx.font = "16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
      },
      draw: ({ canvas, ctx, data, dt, elapsedTime, layout, input }) => {
        const years = data.getColumn("year").map(Number);

        // Animation timings.
        const xGridDelay = animationCycle;
        const xGridTime = elapsedTime - xGridDelay;

        const lineDelay = animationCycle * 0.75 * (years.length - 1);
        const lineTime = elapsedTime - lineDelay;

        const labelDelay = animationCycle * ((years.length - 1) / 2);
        const labelTime = elapsedTime - labelDelay;

        draw.axisLabels(
          ctx,
          { ...layout, canvasWidth: canvas.width, canvasHeight: canvas.height },
          xAxisLabel,
          yAxisLabel,
          { elapsedTime: labelTime, duration: animationCycle },
        );

        // Don't draw under the main axis.
        const yearTickValues = years.slice(1);

        ctx.strokeStyle = color.oklch(COLOR.surface1());
        draw.yAxisGrid(
          ctx,
          { ...layout, xTickLabelCount, yTickLabelCount },
          minPayGap,
          maxPayGap,
          payGapToHeight,
          { elapsedTime, duration: animationCycle },
        );
        draw.xAxisGrid(
          ctx,
          layout,
          yearTickValues,
          [COLOR.surface1(), COLOR.surface0()],
          yearToWidth,
          {
            elapsedTime: xGridTime,
            duration: animationCycle,
          },
        );

        ctx.save();
        ctx.strokeStyle = color.oklch(COLOR.text());
        draw.axis(
          ctx,
          { ...layout, xTickLabelCount, yTickLabelCount },
          { elapsedTime, duration: animationCycle },
        );
        ctx.restore();

        ctx.save();
        draw.yAxisTickLabels(
          ctx,
          { ...layout, padding, xTickLabelCount, yTickLabelCount },
          minPayGap,
          maxPayGap,
          payGapToHeight,
          { elapsedTime, duration: animationCycle },
        );
        draw.xAxisTickLabels(
          ctx,
          { ...layout, padding },
          data.getColumn("year").map(Number),
          yearToWidth,
          { elapsedTime, duration: animationCycle },
        );
        ctx.restore();

        const unitProgress = math.clamp(lineTime / lineDuration);
        const easedProgress = math.easeOutExpo(unitProgress);

        const columns = data.getRows("year", "pay_gap").map(({ year, pay_gap }) => ({
          x: yearToWidth(Number(year), layout),
          y: payGapToHeight(Number(pay_gap), layout),
          year: Number(year),
          payGap: Number(pay_gap),
        }));

        // Pre-calculate the path for the line.
        const lineSegments = [];
        let cumulativeLength = 0;
        for (const [i, { x, y, year }] of columns.entries()) {
          const next = columns[i + 1];
          if (next === undefined) {
            break;
          }

          const p0 = cartesian(x, y);
          const p1 = cartesian(next.x, next.y);

          const length = math.dist(p0, p1);

          lineSegments.push({
            p0,
            p1,
            s0: cumulativeLength,
            s1: cumulativeLength + length,
            id: i,
            year,
          });

          cumulativeLength += length;
        }

        const totalLength = cumulativeLength;
        const targetLength = easedProgress * totalLength;

        // Draw main line.
        const { lightness: l0, chroma: c0, hue: h0 } = COLOR.mauve();
        const { lightness: l1, chroma: c1, hue: h1 } = COLOR.pink();

        const gradient = ctx.createLinearGradient(layout.leftEdge, 0, layout.rightEdge, 0);
        const gradientColors = [];
        const stops = columns.length;
        for (let i = 0; i < stops; i++) {
          const stop = i / stops;

          const lightness = math.mapFrom(stop, l0, l1);
          const chroma = math.mapFrom(stop, c0, c1);
          const hue = math.mapFrom(stop, h0, h1);
          gradientColors.push({ lightness, chroma, hue });
          const stopColor = color.oklch({ lightness, chroma, hue, alpha: 0.8 });
          gradient.addColorStop(stop, stopColor);
        }
        ctx.save();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();

        for (const { p0, p1, s0, s1 } of lineSegments) {
          const length = s1 - s0;
          if (s1 <= targetLength) {
            if (s0 === 0) {
              ctx.moveTo(p0.x, p0.y);
            }
            ctx.lineTo(p1.x, p1.y);
          } else if (s0 < targetLength) {
            const remainingLength = targetLength - s0;
            const segmentProgress = remainingLength / length;
            const x = math.mapFrom(segmentProgress, p0.x, p1.x);
            const y = math.mapFrom(segmentProgress, p0.y, p1.y);

            if (s0 === 0) {
              ctx.moveTo(p0.x, p0.y);
            }
            ctx.lineTo(x, y);

            break;
          }
        }

        ctx.stroke();
        ctx.restore();

        const timedPoints = lineSegments.map((seg) => ({
          ...seg,
          t0: math.easeOutExpoInv(seg.s0 / totalLength) * lineDuration + lineDelay,
          t1: math.easeOutExpoInv(seg.s1 / totalLength) * lineDuration + lineDelay,
        }));

        // Fix the off-by-one at the end.
        const points = [];
        const lastTimed = timedPoints.at(-1);
        const lastCol = columns.at(-1);
        if (lastTimed === undefined || lastCol === undefined) {
          throw new Error("lastTimed or lastCol is undefined");
        }
        points.push(...timedPoints);
        points.push({
          t0: lastTimed.t0,
          t1: math.easeOutCubicInv(lastTimed.s1 / totalLength) * lineDuration + lineDelay,
          p0: lastTimed.p1,
          p1: lastTimed.p1,
          s0: lastTimed.s1,
          s1: lastTimed.s1,
          id: lastTimed.id + 1,
          year: lastCol.year,
        });

        const tooltipPoints = points.map((seg) => ({
          ...cartesian(seg.p0.x, seg.p0.y),
          ...seg,
        }));

        const maxDistance = cartesian(Infinity, Infinity);
        const hoveredPoint = findHoveredPoint(tooltipPoints, input.mousePos, maxDistance);
        const drawnPoints = [];
        const mouseInPlot = input.isMouseInPlot(15);

        for (const [i, point] of points.entries()) {
          const { p0, id } = point;
          const { x, y } = p0;

          const prev = points[id - 1] ?? point;

          let animateInScale = 0;
          if (elapsedTime >= prev.t1) {
            animateInScale = 1;
          } else if (elapsedTime >= prev.t0) {
            const duration = prev.t1 - prev.t0;
            const progress = (elapsedTime - prev.t0) / duration;
            animateInScale = math.easeOutBack(progress);
          }

          const isDark = isThemeDark();

          const gradientBase = gradientColors[i];

          const lightness = gradientBase.lightness * (isDark ? 1.1 : 0.85);
          const chroma = gradientBase.chroma * (isDark ? 0.7 : 1.2);

          const baseFill = COLOR.mantle();
          const fill = { ...baseFill, lightness: baseFill.lightness * 1.2 };
          const stroke = { ...gradientBase, lightness, chroma };

          const hoveredStroke = { ...gradientBase, lightness, chroma };
          const hoveredFill = gradientBase;

          const easedFactor = prefersReducedMotion() ? dt : math.easeOutCubic(0.004 * dt);

          let strokeColor = "";
          const scale = pointScales[i];
          const fillAlpha = pointFillAlphas[i];
          const strokeAlpha = pointStrokeAlphas[i];
          ctx.save();
          if (!mouseInPlot) {
            // All points when mouse is not in plot.
            pointScales[i] = math.lerp(scale, 0.9, easedFactor);
            pointFillAlphas[i] = math.lerp(fillAlpha, 0.4, easedFactor);
            pointStrokeAlphas[i] = math.lerp(strokeAlpha, 0.45, easedFactor);

            strokeColor = color.oklch({ ...stroke, alpha: strokeAlpha });
            ctx.fillStyle = color.oklch({ ...fill, alpha: fillAlpha });
          } else if (tooltipPoints[i] === hoveredPoint) {
            // Hovered point.
            pointScales[i] = math.lerp(scale, 1.5, easedFactor);
            pointFillAlphas[i] = math.lerp(fillAlpha, 1, easedFactor);
            pointStrokeAlphas[i] = math.lerp(strokeAlpha, 1, easedFactor);

            strokeColor = color.oklch({ ...hoveredStroke, alpha: strokeAlpha });
            ctx.fillStyle = color.oklch({ ...hoveredFill, alpha: fillAlpha });
          } else {
            // Points that are not hovered.
            pointScales[i] = math.lerp(scale, 1, easedFactor);
            pointFillAlphas[i] = math.lerp(fillAlpha, 0, easedFactor);
            pointStrokeAlphas[i] = math.lerp(strokeAlpha, 0.25, easedFactor);

            strokeColor = color.oklch({ ...stroke, alpha: strokeAlpha });
            ctx.fillStyle = color.oklch({ ...fill, alpha: fillAlpha });
          }

          ctx.lineWidth = 2;

          draw.point(ctx, pointRadius * animateInScale * scale, cartesian(x, y), strokeColor);
          if (elapsedTime > prev.t0) {
            drawnPoints.push({ id, ...cartesian(x, y) });
          }

          ctx.restore();
        }

        if (hoveredPoint === null) {
          return null;
        }

        const dataMap = new Map();
        const title = widthToYear(hoveredPoint.x, layout);
        const payGap = heightToPayGap(hoveredPoint.y, layout);
        dataMap.set("Pay gap", fmt.percent(payGap / 100));

        const tooltipColor = color.oklch(gradientColors[hoveredPoint.id]);

        return {
          hoveredPoint,
          drawnPoints,
          title,
          dataMap,
          mouseInPlot,
          marginFromPoint: pointRadius,
          animationDuration: animationCycle * 1.2,
          strokeColor: tooltipColor,
        };
      },
      buildTable: ({ data, table, tableSummary }) => {
        tableSummary.textContent = `Show average gender pay gap from ${startYear} to ${endYear}`;

        const fragment = new DocumentFragment();

        const caption = document.createElement("caption");
        caption.textContent = `Average gender pay gap in the UK (${startYear}–${endYear})`;
        fragment.appendChild(caption);

        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        const headings = data.getHeaders().map((h) => h.replace("_", " "));
        for (const h of headings) {
          const th = document.createElement("th");
          th.scope = "col";
          th.textContent = fmt.sentenceToTitleCase(h);
          tr.appendChild(th);
        }
        thead.appendChild(tr);
        fragment.appendChild(thead);

        const bodyData = data
          .getRows("year", "median_male", "median_female", "pay_gap")
          .map(({ year, median_female, median_male, pay_gap }) => ({
            year: Number(year),
            medianMale: fmt.gbp(median_male, 0, 2),
            medianFemale: fmt.gbp(median_female, 0, 2),
            payGap: fmt.percent(Number(pay_gap) / 100),
          }));

        const tbody = document.createElement("tbody");
        for (const { year, medianFemale, medianMale, payGap } of bodyData) {
          const tr = document.createElement("tr");

          const th = document.createElement("th");

          th.scope = "row";
          th.textContent = String(year);
          tr.appendChild(th);

          const tdMedianMale = document.createElement("td");
          tdMedianMale.textContent = String(medianMale);
          tr.appendChild(tdMedianMale);

          const tdMedianFemale = document.createElement("td");
          tdMedianFemale.textContent = String(medianFemale);
          tr.appendChild(tdMedianFemale);

          const tdPayGap = document.createElement("td");
          tdPayGap.textContent = payGap;
          tr.appendChild(tdPayGap);

          tbody.appendChild(tr);
        }
        fragment.appendChild(tbody);

        table.appendChild(fragment);
      },
    },
  });
};
