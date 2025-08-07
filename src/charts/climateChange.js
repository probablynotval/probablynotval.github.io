import noUiSlider, { PipsMode } from "../../lib/nouislider.mjs";
import { Chart } from "../chart.js";
import { loadCsvData } from "../csv.js";
import { COLOR } from "../utils/color.js";

import {
  cartesian,
  color,
  draw,
  findHoveredPoint,
  fmt,
  forcedColors,
  isThemeDark,
  math,
  prefersReducedMotion,
} from "../utils/index.js";

const data = await loadCsvData("./data/surface-temperature/surface-temperature.csv");

export const climateChange = (parent, dimensions, padding, animationCycle) => {
  const lineDuration = animationCycle * 100;
  const xTickLabelCount = 21;
  const yTickLabelCount = 8;
  const xAxisLabel = "year";
  const yAxisLabel = "temperature (°C)";

  const tempCol = data.getColumn("temperature").map(Number);
  const minTemperature = Math.min(...tempCol);
  const maxTemperature = Math.max(...tempCol);

  const minYear = data.getNum(0, "year");
  const maxYear = data.getNum(-1, "year");

  let sliderStart = minYear;
  let sliderEnd = maxYear;
  const pointRadius = () => math.mapTo(sliderEnd - sliderStart, maxYear - minYear, 0) * 2 + 4.5;

  const pointScales = Array(tempCol.length).fill(1);
  const pointFillAlphas = Array(tempCol.length).fill(0);
  const pointStrokeAlphas = Array(tempCol.length).fill(0);

  let labelYears;

  let yearSlider;

  const sliderInputMinLabel = document.createElement("label");
  const sliderInputMaxLabel = document.createElement("label");
  const sliderInputMin = document.createElement("input");
  const sliderInputMax = document.createElement("input");
  const minInputId = "slider-min";
  const maxInputId = "slider-max";
  sliderInputMin.id = minInputId;
  sliderInputMax.id = maxInputId;
  sliderInputMinLabel.htmlFor = minInputId;
  sliderInputMaxLabel.htmlFor = maxInputId;
  sliderInputMin.type = "number";
  sliderInputMax.type = "number";
  sliderInputMinLabel.textContent = "Min";
  sliderInputMaxLabel.textContent = "Max";
  sliderInputMin.ariaLabel = "Minimum year shown";
  sliderInputMax.ariaLabel = "Maximum year shown";

  const minContainer = document.createElement("div");
  const maxContainer = document.createElement("div");
  minContainer.classList.add("slider-input");
  maxContainer.classList.add("slider-input");
  minContainer.append(sliderInputMinLabel, sliderInputMin);
  maxContainer.append(sliderInputMaxLabel, sliderInputMax);

  const sliderInputContainer = document.createElement("div");
  sliderInputContainer.classList.add("slider-input-container");
  sliderInputContainer.append(minContainer, maxContainer);

  const sliderContainer = document.createElement("div");
  sliderContainer.appendChild(sliderInputContainer);

  const yearToWidth = (value, layout) =>
    math.map(value, sliderStart, sliderEnd, layout.leftEdge, layout.rightEdge);
  const widthToYear = (value, layout) =>
    math.map(value, layout.leftEdge, layout.rightEdge, sliderStart, sliderEnd);

  const tempToHeight = (value, layout) =>
    math.map(value, minTemperature, maxTemperature, layout.bottomEdge, layout.topEdge);
  const heightToTemp = (value, layout) =>
    math.map(value, layout.bottomEdge, layout.topEdge, minTemperature, maxTemperature);

  const tempToColor = (temperature) => {
    const tNormal = math.mapTo(temperature, minTemperature, maxTemperature);

    const isDark = isThemeDark();
    const lMin = isDark ? 0.7 : 0.5;
    const lMax = isDark ? 0.8 : 0.6;
    const cMin = isDark ? 0.13 : 0.18;
    const cMax = isDark ? 0.16 : 0.22;
    const lightness = math.lerp(lMin, lMax, tNormal);
    const chroma = math.lerp(cMin, cMax, tNormal);

    const coldHue = 256;
    const warmHue = 32;
    // Go counterclockwise.
    const delta = ((warmHue - coldHue + 540) % 360) - 180;
    const hue = (coldHue + delta * tNormal + 360) % 360;

    return { lightness, chroma, hue };
  };

  const updateSliderGradient = (progress) => {
    const start = sliderStart - minYear + 1;
    const end = sliderEnd - minYear;
    const background = COLOR.surface1();
    const temps = data.getColumn("temperature").map(Number);
    const colors = Array.from(temps.slice(start, end), (t, i) =>
      (i + 1) / (end - start) <= progress
        ? color.oklch({ alpha: 0.8, ...tempToColor(t) })
        : color.oklch(background),
    );
    connectSegment.style.background = `linear-gradient(to right, ${colors.join(", ")})`;
  };

  const updateSliderOnInput = () =>
    yearSlider.set([Number(sliderInputMin.value), Number(sliderInputMax.value)]);

  let resizeObserver;
  let connectSegment;

  return new Chart(parent, {
    title: "Climate Change: Average Surface Temperature",
    name: "Climate Change",
    data,
    dimensions,
    offsets: {
      top: 15,
      left: padding * 2,
      right: padding / 2,
      bottom: padding * 2.25,
    },
    hooks: {
      preload: ({ ctx, htmlElements }) => {
        ctx.font = "16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        sliderInputMin.addEventListener("change", updateSliderOnInput);
        sliderInputMax.addEventListener("change", updateSliderOnInput);

        htmlElements.push(sliderContainer);
      },
      setup: ({ canvas, layout }) => {
        const sliderMargin = 5;

        const minSliderMin = String(minYear);
        const minSliderMax = String(maxYear - sliderMargin);
        const maxSliderMin = String(minYear + sliderMargin);
        const maxSliderMax = String(maxYear);

        sliderInputMin.min = minSliderMin;
        sliderInputMin.max = minSliderMax;
        sliderInputMin.ariaValueMin = minSliderMin;
        sliderInputMin.ariaValueMax = minSliderMax;
        sliderInputMin.value = minSliderMin;

        sliderInputMax.min = maxSliderMin;
        sliderInputMax.max = maxSliderMax;
        sliderInputMax.ariaValueMin = maxSliderMin;
        sliderInputMax.ariaValueMax = maxSliderMax;
        sliderInputMax.value = maxSliderMax;

        sliderStart = minYear;
        sliderEnd = maxYear;

        const yearSliderDiv = document.createElement("div");
        yearSlider = noUiSlider.create(yearSliderDiv, {
          handleAttributes: [
            { "aria-label": "Minimum year shown" },
            { "aria-label": "Maximum year shown" },
          ],

          start: [sliderStart, sliderEnd],
          connect: true,
          step: 1,
          margin: sliderMargin,
          range: { min: minYear, max: maxYear },
          tooltips: [{ to: (n) => n.toFixed(0) }, { to: (n) => n.toFixed(0) }],
          pips: {
            mode: PipsMode.Range,
            density: Math.ceil(8 / (canvas.clientWidth / canvas.width)),
            filter: (value) => value,
          },
        });
        yearSlider.on("update", (values) => {
          const [start, end] = values;
          if (start === undefined || end === undefined) {
            return;
          }
          sliderInputMin.value = Number(start).toFixed(0);
          sliderInputMax.value = Number(end).toFixed(0);
          sliderStart = Number(start);
          sliderEnd = Number(end);
        });

        sliderContainer.classList.add("slider-container");
        sliderContainer.appendChild(yearSlider.target);

        const segment = document.querySelector(".noUi-connect");
        if (segment === null) {
          throw new Error("connectSegment is null");
        }
        connectSegment = segment;

        resizeObserver = new ResizeObserver(() => {
          const scale = canvas.clientWidth / canvas.width;
          sliderContainer.style.setProperty("--padding-left", `${layout.leftEdge * scale}px`);
          sliderContainer.style.setProperty(
            "--padding-right",
            `${(canvas.width - layout.rightEdge) * scale}px`,
          );

          yearSlider.updateOptions(
            {
              pips: {
                mode: PipsMode.Range,
                density: Math.ceil(8 / scale),
                filter: (value) => value,
              },
            },
            true,
          );
        });
        resizeObserver.observe(canvas);
      },
      destroy: () => {
        resizeObserver.disconnect();
        yearSlider.destroy();
        yearSlider.target.remove();
      },
      draw: ({ canvas, ctx, elapsedTime, dt, data, input, layout }) => {
        const inSliderRange = (n) => n >= sliderStart && n < sliderEnd;
        const isCapped = (i) => i % Math.ceil((sliderEnd - sliderStart) / xTickLabelCount) !== 0;

        const years = data.getColumn("year").map(Number);
        const currentYears = years.filter((n, i) => inSliderRange(n) && !isCapped(i));

        if (labelYears === undefined) {
          labelYears = currentYears;
        }

        const lineDelay = animationCycle * 0.75 * (labelYears.length - 1);
        const lineTime = elapsedTime - lineDelay;

        const labelDelay = animationCycle * ((labelYears.length - 1) / 2);
        const labelTime = elapsedTime - labelDelay;

        draw.axisLabels(
          ctx,
          { ...layout, canvasWidth: canvas.width, canvasHeight: canvas.height },
          xAxisLabel,
          yAxisLabel,
          { elapsedTime: labelTime, duration: animationCycle * 5 },
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
          minTemperature,
          maxTemperature,
          tempToHeight,
          { elapsedTime, duration: animationCycle },
          1,
        );
        draw.xAxisTickLabels(ctx, { ...layout, padding }, currentYears, yearToWidth, {
          elapsedTime,
          duration: animationCycle,
        });
        ctx.restore();

        const unitProgress = math.clamp(lineTime / lineDuration);
        const easedProgress = math.easeOutExpo(unitProgress);

        const rows = data.getRows("year", "temperature").map(({ year, temperature }) => ({
          x: yearToWidth(Number(year), layout),
          y: tempToHeight(Number(temperature), layout),
          year: Number(year),
          temperature: Number(temperature),
        }));

        // Pre-calculate the path for the line.
        const lineSegments = [];
        let cumulativeLength = 0;
        for (const [i, { x, y, year }] of rows.entries()) {
          const next = rows[i + 1];
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

        if (!forcedColors()) {
          updateSliderGradient(easedProgress);
        }

        // Draw average (mean) line.
        const sliderValues = yearSlider.get(true);
        const start = sliderValues.at(0);
        const end = sliderValues.at(1);
        if (start === undefined || end === undefined) {
          throw new Error("sliderValues is undefined");
        }
        const tempCol = data.getColumn("temperature").slice(start - minYear, end - minYear + 1);

        const meanTemperature = tempCol.reduce((acc, val) => acc + Number(val), 0) / tempCol.length;
        const avgY = tempToHeight(meanTemperature, layout);

        const rangeNorm = (sliderEnd - sliderStart) / (maxYear - minYear);

        ctx.save();
        ctx.textBaseline = "bottom";
        ctx.textAlign = "left";
        ctx.fillStyle = color.oklch({
          ...COLOR.subtext1(),
          alpha: math.easeOutCubic(math.clamp((labelTime - 200) / 500)),
        });
        ctx.fillText(`Mean: ${fmt.celsius(meanTemperature, 0, 2)}`, layout.leftEdge + 5, avgY - 5);

        ctx.setLineDash([10 / rangeNorm, 14 / rangeNorm]);
        ctx.lineWidth = 2;

        const isDark = isThemeDark();
        ctx.strokeStyle = color.oklch({
          alpha: isDark ? 0.5 : 0.6,
          ...tempToColor(meanTemperature),
        });

        ctx.beginPath();
        let hasMovedTo = false;
        for (const { p0, p1, s0, s1, year } of lineSegments) {
          if (year < sliderStart || year >= sliderEnd) {
            continue;
          }

          const length = s1 - s0;
          if (s1 <= targetLength) {
            if (!hasMovedTo) {
              ctx.moveTo(p0.x, avgY);
              hasMovedTo = true;
            }
            ctx.lineTo(p1.x, avgY);
          } else if (s0 < targetLength) {
            const remainingLength = targetLength - s0;
            const segmentProgress = remainingLength / length;
            const x = math.mapFrom(segmentProgress, p0.x, p1.x);

            if (!hasMovedTo) {
              ctx.moveTo(p0.x, avgY);
              hasMovedTo = true;
            }
            ctx.lineTo(x, avgY);
          }
        }
        ctx.stroke();
        ctx.restore();

        // Draw main line.
        const gradient = ctx.createLinearGradient(0, layout.bottomEdge, 0, layout.topEdge);
        const stops = 25;
        for (let i = 0; i < stops; i++) {
          const stop = i / stops;

          const temp = math.mapFrom(stop, minTemperature, maxTemperature);
          const tempColor = color.oklch({ alpha: 0.8, ...tempToColor(temp) });
          gradient.addColorStop(stop, tempColor);
        }
        ctx.save();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        ctx.beginPath();
        hasMovedTo = false;
        for (const { p0, p1, s0, s1, year } of lineSegments) {
          if (year < sliderStart || year >= sliderEnd) {
            continue;
          }

          const length = s1 - s0;
          if (s1 <= targetLength) {
            if (!hasMovedTo) {
              ctx.moveTo(p0.x, p0.y);
              hasMovedTo = true;
            }
            ctx.lineTo(p1.x, p1.y);
          } else if (s0 < targetLength) {
            const remainingLength = targetLength - s0;
            const segmentProgress = remainingLength / length;
            const x = math.mapFrom(segmentProgress, p0.x, p1.x);
            const y = math.mapFrom(segmentProgress, p0.y, p1.y);

            if (!hasMovedTo) {
              ctx.moveTo(p0.x, p0.y);
              hasMovedTo = true;
            }
            ctx.lineTo(x, y);
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
        const lastCol = rows.at(-1);
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
          const { p0, year, id } = point;
          const { x, y } = p0;

          if (year < sliderStart || year > sliderEnd) {
            continue;
          }

          const prev = points[id - 1] || point;

          let animateInScale = 0;
          if (elapsedTime >= prev.t1) {
            animateInScale = 1;
          } else if (elapsedTime >= prev.t0) {
            const duration = prev.t1 - prev.t0;
            const progress = (elapsedTime - prev.t0) / duration;
            animateInScale = math.easeOutBack(progress);
          }

          const tempColor = tempToColor(heightToTemp(p0.y, layout));

          const lightness = tempColor.lightness * (isDark ? 1.1 : 0.85);
          const chroma = tempColor.chroma * (isDark ? 0.7 : 1.2);

          const baseFill = COLOR.mantle();
          const fill = { ...baseFill, lightness: baseFill.lightness * 1.2 };
          const stroke = { ...tempColor, lightness };

          const hoveredStroke = { ...tempColor, chroma, lightness };
          const hoveredFill = tempColor;

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

          draw.point(ctx, pointRadius() * animateInScale * scale, cartesian(x, y), strokeColor);
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
        const temperature = heightToTemp(hoveredPoint.y, layout);
        dataMap.set("Temperature", fmt.celsius(temperature, 0, 2));

        const tempColor = color.oklch({ alpha: isDark ? 0.8 : 0.9, ...tempToColor(temperature) });

        return {
          hoveredPoint,
          drawnPoints,
          title,
          dataMap,
          mouseInPlot,
          marginFromPoint: cartesian(pointRadius() * 1.5, 0),
          animationDuration: animationCycle * 1.2,
          strokeColor: tempColor,
        };
      },
      buildTable: ({ data, table, tableSummary }) => {
        tableSummary.textContent = "Show average surface temperature data from 1880 to 2018";

        const fragment = new DocumentFragment();

        const caption = document.createElement("caption");
        caption.textContent = "Global average surface temperature by year (1880–2018)";
        fragment.appendChild(caption);

        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        const headings = data.getHeaders();
        for (const h of headings) {
          const th = document.createElement("th");
          th.scope = "col";
          th.textContent = fmt.sentenceToTitleCase(h);
          tr.appendChild(th);
        }
        thead.appendChild(tr);
        fragment.appendChild(thead);

        const bodyData = data.getRows("year", "temperature").map(({ year, temperature }) => ({
          year: Number(year),
          temperature: fmt.celsius(temperature, 0, 2),
        }));
        const tbody = document.createElement("tbody");
        for (const { year, temperature } of bodyData) {
          const tr = document.createElement("tr");

          const th = document.createElement("th");

          th.scope = "row";
          th.textContent = String(year);
          tr.appendChild(th);

          const td = document.createElement("td");
          td.textContent = temperature;
          tr.appendChild(td);

          tbody.appendChild(tr);
        }
        fragment.appendChild(tbody);

        table.appendChild(fragment);
      },
    },
  });
};
