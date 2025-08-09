import { Chart, plotHeight, plotWidth } from "../chart.js";
import { loadCsvData } from "../csv.js";
import { COLOR } from "../utils/color.js";
import { cartesian, color, fmt, isThemeDark, math, prefersReducedMotion } from "../utils/index.js";

const data = await loadCsvData("./data/tech-diversity/gender-2018.csv");

export const techDiversityGender = (parent, dimensions, padding, animationCycle) => {
  const margin = 10;
  const barAlphas = Array(30).fill(0.4);
  const textAlphas = Array(30).fill(0.8);
  const barDuration = animationCycle * 25;
  const rowSpacing = 8;
  const labelPadding = 5;

  const percentToWidth = (percent, layout) =>
    math.map(percent, 0, 100, 0, plotWidth(layout) - margin * 2);

  const percentToColor = (value) => {
    const { lightness: l0, chroma: c0, hue: h0 } = COLOR.lavender();
    const { lightness: l1, chroma: c1, hue: h1 } = COLOR.flamingo();

    const lightness = math.mapFrom(value, l0, l1);
    const chroma = math.mapFrom(value, c0, c1);
    // Go counterclockwise.
    const delta = ((h1 - h0 + 540) % 360) - 180;
    const hue = (h0 + delta * value + 360) % 360;

    return { lightness, chroma, hue };
  };

  return new Chart(parent, {
    title: "Gender Representation at Tech Companies",
    name: "Tech Diversity: Gender",
    data,
    dimensions,
    offsets: {
      top: 10,
      left: padding * 3.25,
      right: padding * 1.5,
      bottom: 1, // Avoid clipping the 2 px stroke.
    },
    hooks: {
      draw: ({ ctx, data, dt, elapsedTime, input, layout }) => {
        const femaleColor = COLOR.lavender();
        const maleColor = COLOR.flamingo();

        // Draw category labels.
        ctx.save();
        ctx.font = "bold 16px sans-serif";
        ctx.textBaseline = "bottom";

        const y = layout.topEdge - 5;
        const lightnessCoefficient = isThemeDark() ? 1.1 : 0.8;

        const femaleText = {
          ...femaleColor,
          lightness: femaleColor.lightness * lightnessCoefficient,
        };
        ctx.fillStyle = color.oklch(femaleText);
        ctx.textAlign = "left";
        ctx.fillText("Female", layout.leftEdge + 12, y);

        const maleText = {
          ...maleColor,
          lightness: maleColor.lightness * lightnessCoefficient,
        };
        ctx.fillStyle = color.oklch(maleText);
        ctx.textAlign = "right";
        ctx.fillText("Male", layout.rightEdge - 12, y);
        ctx.restore();

        const rows = data.getRows("company", "male", "female").map(({ company, male, female }) => ({
          name: company,
          male: Number(male),
          female: Number(female),
        }));

        const lineHeight = (plotHeight(layout) - rowSpacing * (rows.length - 1)) / rows.length;
        const rectWidth = percentToWidth(100, layout);

        const xLeft = layout.leftEdge + margin;
        const xRight = layout.rightEdge - margin;

        const points = rows.map(({ name, female, male }, i) => ({
          id: i,
          name,
          female,
          male,
          ...cartesian(xLeft + rectWidth / 2, layout.topEdge + i * (lineHeight + rowSpacing)),
        }));
        let hoveredPoint = null;
        for (const point of points) {
          const distCurrentX = Math.abs(point.x - input.mousePos.x);
          const distCurrentY = Math.abs(point.y - input.mousePos.y + lineHeight / 2);

          const tooFarX = distCurrentX > rectWidth / 2;
          const tooFarY = distCurrentY > (lineHeight + rowSpacing) / 2;
          if (tooFarX || tooFarY) {
            continue;
          }

          if (hoveredPoint === null) {
            hoveredPoint = point;
          }

          const distClosest = Math.abs(hoveredPoint.x - input.mousePos.x);
          if (distCurrentX < distClosest) {
            hoveredPoint = point;
          }
        }

        const mouseInPlot = input.isMouseInPlot({
          left: margin,
          right: -margin,
          top: -5,
          bottom: 5,
        });

        const drawnPoints = [];
        for (const [i, { name, female, male, x, y, id }] of points.entries()) {
          const t = i / (points.length - 1);
          const delay = 2 * (1 - math.easeOutSine(1 - t));
          const fillDelay = barDuration * delay;
          const unitProgress = math.clamp((elapsedTime - fillDelay) / barDuration);
          const easedProgress = math.easeOutElastic(unitProgress, 0.4, 8);

          if (elapsedTime > fillDelay) {
            drawnPoints.push({ id, ...cartesian(x, y) });
          }

          const easedFactor = prefersReducedMotion() ? dt : math.easeOutCubic(0.003 * dt);
          const barAlpha = barAlphas[i];
          if (barAlpha === undefined) {
            throw new Error("barAlpha is undefined");
          }
          const textAlpha = textAlphas[i];
          if (textAlpha === undefined) {
            throw new Error("textAlpha is undefined");
          }

          const isDark = isThemeDark();
          const barNotHoveredAlpha = isDark ? 0.4 : 0.3;
          const barNoneHoveredAlpha = isDark ? 0.6 : 0.5;
          const textNotHoveredAlpha = isDark ? 0.5 : 0.4;
          const textNoneHoveredAlpha = isDark ? 0.95 : 0.9;

          if (hoveredPoint !== null && hoveredPoint.id !== i) {
            // Non-hovered bars when a bar is hovered.
            barAlphas[i] = math.lerp(barAlpha, barNotHoveredAlpha, easedFactor);
            textAlphas[i] = math.lerp(textAlpha, textNotHoveredAlpha, easedFactor);
          } else if (hoveredPoint === null) {
            // When no bar is hovered.
            barAlphas[i] = math.lerp(barAlpha, barNoneHoveredAlpha, easedFactor);
            textAlphas[i] = math.lerp(textAlpha, textNoneHoveredAlpha, easedFactor);
          } else if (hoveredPoint !== null && hoveredPoint.id === i) {
            // Hovered bar.
            barAlphas[i] = math.lerp(barAlpha, 1, easedFactor);
            textAlphas[i] = math.lerp(textAlpha, 1, easedFactor);
          }

          const femaleWidth = percentToWidth(female, layout);
          const maleWidth = percentToWidth(male, layout);

          const rectRadius = lineHeight / 2.25;
          const rectRadii = [0, rectRadius, rectRadius, 0];

          const maxOvershoot = 100;
          const getProgress = (width) =>
            easedProgress - 1 > 0
              ? 1 + (easedProgress - 1) * (maxOvershoot / width)
              : easedProgress;

          const femaleUnitProgress = getProgress(femaleWidth);
          const maleUnitProgress = getProgress(maleWidth);
          const femaleWidthProgress = femaleUnitProgress * femaleWidth;
          const maleWidthProgress = maleUnitProgress * maleWidth;

          // Female fill.
          ctx.fillStyle = color.oklch({ alpha: barAlpha, ...femaleColor });
          ctx.beginPath();
          ctx.roundRect(xLeft + femaleWidth, y, -femaleWidthProgress, lineHeight, rectRadii);
          ctx.fill();

          // Male fill.
          ctx.fillStyle = color.oklch({ alpha: barAlpha, ...maleColor });
          ctx.beginPath();
          ctx.roundRect(xRight - maleWidth, y, maleWidthProgress, lineHeight, rectRadii);
          ctx.fill();

          ctx.lineWidth = 2;

          // Female stroke.
          ctx.save();
          ctx.strokeStyle = color.oklch({ alpha: barAlpha, ...femaleColor });
          ctx.translate(xLeft + femaleWidth, 0);
          ctx.scale(femaleUnitProgress, 1);
          ctx.translate(-xLeft - femaleWidth, 0);

          ctx.beginPath();
          ctx.moveTo(xLeft + femaleWidth, y); // Top-right.
          ctx.lineTo(xLeft + rectRadius, y); // Top.
          ctx.arcTo(xLeft, y, xLeft, y + rectRadius, rectRadius); // Top-left corner.
          ctx.lineTo(xLeft, y + lineHeight - rectRadius); // Left.
          ctx.arcTo(xLeft, y + lineHeight, xLeft + rectRadius, y + lineHeight, rectRadius); // Bottom-left.
          ctx.lineTo(xLeft + femaleWidth, y + lineHeight); // Bottom.
          ctx.stroke();
          ctx.restore();

          // Male stroke.
          ctx.save();

          ctx.strokeStyle = color.oklch({ alpha: barAlpha, ...maleColor });
          ctx.translate(xRight - maleWidth, 0);
          ctx.scale(maleUnitProgress, 1);
          ctx.translate(maleWidth - xRight, 0);

          ctx.beginPath();
          ctx.moveTo(xRight - maleWidth, y); // Top-left.
          ctx.lineTo(xRight - rectRadius, y); // Top.
          ctx.arcTo(xRight, y, xRight, y + rectRadius, rectRadius); // Top-right corner.
          ctx.lineTo(xRight, y + lineHeight - rectRadius); // Right.
          ctx.arcTo(xRight, y + lineHeight, xRight - rectRadius, y + lineHeight, rectRadius); // Bottom-right.
          ctx.lineTo(xRight - maleWidth, y + lineHeight); // Bottom.
          ctx.stroke();
          ctx.restore();

          // Company name.
          const tagDelay = fillDelay + barDuration / 7.5;
          const tagUnit = math.clamp((elapsedTime - tagDelay) / barDuration);
          const tagEased = math.easeOutCubic(tagUnit);

          ctx.save();
          ctx.font = "17px sans-serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillStyle = color.oklch({ alpha: textAlpha * tagEased, ...COLOR.subtext1() });

          ctx.fillText(name, xLeft - labelPadding, y + 10);
          ctx.restore();
        }

        if (hoveredPoint === null) {
          return null;
        }

        const tooltipTitle = hoveredPoint.name;
        const femalePercent = hoveredPoint.female / 100;
        const malePercent = hoveredPoint.male / 100;

        const dataMap = new Map();
        dataMap.set("Female", fmt.percent(femalePercent));
        dataMap.set("Male", fmt.percent(malePercent));

        const tooltipColor = color.oklch(percentToColor(malePercent));

        return {
          hoveredPoint,
          drawnPoints,
          title: tooltipTitle,
          dataMap,
          mouseInPlot,
          marginFromPoint: cartesian(-50, lineHeight + 2),
          animationDuration: animationCycle * 1.2,
          strokeColor: tooltipColor,
        };
      },
      buildTable: ({ data, table, tableSummary }) => {
        tableSummary.textContent = "Show share of female and male employees by company in 2018";

        const fragment = new DocumentFragment();

        const caption = document.createElement("caption");
        caption.textContent = "Gender representation at tech companies (2018)";
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

        const bodyData = data
          .getRows("company", "male", "female")
          .map(({ company, male, female }) => ({
            name: company,
            male: Number(male),
            female: Number(female),
          }));
        const tbody = document.createElement("tbody");
        for (const { name, female, male } of bodyData) {
          const tr = document.createElement("tr");

          const th = document.createElement("th");

          th.scope = "row";
          th.textContent = name;
          tr.appendChild(th);

          const tdFemale = document.createElement("td");
          tdFemale.textContent = fmt.percent(female / 100);
          tr.appendChild(tdFemale);

          const tdMale = document.createElement("td");
          tdMale.textContent = fmt.percent(male / 100);
          tr.appendChild(tdMale);

          tbody.appendChild(tr);
        }
        fragment.appendChild(tbody);

        table.classList.add("row-headers");
        table.appendChild(fragment);
      },
    },
  });
};
