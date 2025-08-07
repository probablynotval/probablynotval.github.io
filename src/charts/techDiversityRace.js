import { Chart, plotWidth } from "../chart.js";
import { loadCsvData } from "../csv.js";
import { COLOR } from "../utils/color.js";

import {
  cartesian,
  color,
  fmt,
  isThemeDark,
  mapObjectValues,
  math,
  polar,
  prefersReducedMotion,
  toCartesian,
} from "../utils/index.js";

const data = await loadCsvData("../data/tech-diversity/race-2018.csv");

export const techDiversityRace = (parent, dimensions, animationCycle) => {
  let prevAngles = null;
  let angles = null;

  let sliceAlphas;

  const labelSize = 30;
  const radius = Math.min(dimensions.width, dimensions.height) * 0.465;
  const colors = () => [
    COLOR.blue(),
    COLOR.red(),
    COLOR.green(),
    COLOR.pink(),
    COLOR.mauve(),
    COLOR.yellow(),
  ];

  const select = document.createElement("select");
  select.style.position = "relative";

  const drawLegendItem = (ctx, label, sliceColor, i, center) => {
    const x = center.x + radius + 10;
    const y = center.y + labelSize * i - radius / 2;
    const boxSize = { width: labelSize, height: labelSize * 0.6 };
    const rectRadius = 2;

    ctx.lineWidth = 1;
    ctx.fillStyle = sliceColor;
    ctx.strokeStyle = color.oklch(COLOR.text());
    ctx.beginPath();
    ctx.roundRect(x, y, boxSize.width, boxSize.height, rectRadius);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.oklch(COLOR.text());
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(label, x + boxSize.width + 8, y + boxSize.height / 2);
  };

  const calculateNewAngles = (data) => {
    const companyData = data.getColumn(select.value).map(Number);
    const processedData = companyData.map((x, i) => ({ x, id: i })).filter(({ x }) => x > 0);
    const total = processedData.map(({ x }) => x).reduce((acc, x) => acc + x);
    const calculatedAngles = processedData.map(({ x, id }) => ({
      theta: (x / total) * Math.PI * 2,
      id,
    }));

    let startAngle = -Math.PI / 2;
    const newAngles = [];
    for (const { theta, id } of calculatedAngles) {
      const endAngle = theta + startAngle;
      newAngles.push({ startAngle, endAngle, id });
      startAngle += theta;
    }

    return newAngles;
  };

  return new Chart(parent, {
    title: () => `Racial Representation at ${select.value.trim()}`,
    name: "Tech Diversity: Race",
    data,
    dimensions,
    hooks: {
      preload: ({ data, htmlElements, timekeeper }) => {
        const companies = data.getHeaders().slice(1);
        for (const company of companies) {
          const option = document.createElement("option");
          option.value = company.trim();
          option.text = company.trim();
          select.appendChild(option);
        }

        select.addEventListener("change", () => {
          const newAngles = calculateNewAngles(data);
          prevAngles = angles;
          angles = newAngles;

          sliceAlphas = Array(newAngles.length).fill(isThemeDark() ? 0.9 : 0.8);

          timekeeper.reset();
        });

        htmlElements.push(select);
      },
      setup: ({ data }) => {
        const newAngles = calculateNewAngles(data);
        angles = newAngles;

        sliceAlphas = Array(newAngles.length).fill(isThemeDark() ? 0.9 : 0.8);
      },
      destroy: () => {
        angles = null;
        prevAngles = null;
      },
      draw: ({ ctx, data, dt, elapsedTime, layout, input }) => {
        if (angles === null) {
          throw new Error("angles is null");
        }

        const duration = 30 * animationCycle;

        const unitGlobal = math.clamp(elapsedTime / duration);
        const easedGlobal = math.easeOutQuart(unitGlobal);

        const unitChange = math.clamp(elapsedTime / (duration * 0.8));
        const easedChange = math.easeOutExpo(unitChange);

        const labels = data.getColumn(0);

        const center = cartesian(plotWidth(layout) / 2, (dimensions.height + layout.topEdge) / 2);
        const dist = math.dist(center, input.mousePos);
        const angle = Math.atan2(input.mousePos.y - center.y, input.mousePos.x - center.x);
        const normAngle = angle < 0 ? angle + 2 * Math.PI : angle;
        const offsetAngle = (normAngle + Math.PI / 2) % (2 * Math.PI);

        let hoveredSlice = null;
        for (const [i, { startAngle, endAngle }] of angles.entries()) {
          const normStart = startAngle < 0 ? startAngle + 2 * Math.PI : startAngle;
          const normEnd = endAngle < 0 ? endAngle + 2 * Math.PI : endAngle;

          const offsetStart = (normStart + Math.PI / 2) % (2 * Math.PI);
          // Clamp to fix tiny rounding errors.
          const offsetEnd =
            math.clamp(normEnd + Math.PI / 2, 0, Math.PI * 2 - 0.000000000000001) % (2 * Math.PI);

          if (dist > radius) {
            continue;
          }

          const midAngle = Math.abs((offsetStart + offsetEnd) / 2 - Math.PI / 2);

          if (offsetStart <= offsetAngle && offsetEnd >= offsetAngle) {
            hoveredSlice = {
              id: i,
              ...polar(radius / 2, midAngle),
            };
          }
        }

        for (const [i, { startAngle, endAngle, id }] of angles.entries()) {
          const sliceColor = colors()[id];
          if (sliceColor === undefined) {
            throw new Error("clr is undefined");
          }

          const easedFactor = prefersReducedMotion() ? dt : math.easeOutCubic(0.003 * dt);
          const sliceAlpha = sliceAlphas[i];
          if (sliceAlpha === undefined) {
            throw new Error("sliceAlpha is undefined");
          }

          if (hoveredSlice !== null && hoveredSlice.id !== i) {
            // Non-hovered bars when a bar is hovered.
            sliceAlphas[i] = math.lerp(sliceAlpha, 0.45, easedFactor);
          } else if (hoveredSlice === null) {
            // When no bar is hovered.
            sliceAlphas[i] = math.lerp(sliceAlpha, isThemeDark() ? 0.9 : 0.8, easedFactor);
          } else if (hoveredSlice !== null && hoveredSlice.id === i) {
            // Hovered bar.
            sliceAlphas[i] = math.lerp(sliceAlpha, 1, easedFactor);
          }

          const finalColor = color.oklch({ alpha: sliceAlpha, ...sliceColor });
          ctx.fillStyle = finalColor;

          let start = math.lerp(-Math.PI / 2, endAngle, easedGlobal);
          let end = math.lerp(-Math.PI / 2, startAngle, easedGlobal);

          if (prevAngles !== null) {
            const prev = prevAngles[id];
            if (prev !== undefined) {
              start = math.lerp(prev.endAngle, endAngle, easedChange);
              end = math.lerp(prev.startAngle, startAngle, easedChange);
            } else {
              const n = prevAngles.length;
              const idx = (((id - 1) % n) + n) % n;
              const anchor = prevAngles[idx].endAngle;

              start = math.lerp(anchor, endAngle, easedChange);
              end = math.lerp(anchor, startAngle, easedChange);
            }
          }

          // Draw the filled arcs.
          ctx.beginPath();
          ctx.moveTo(center.x, center.y);
          ctx.arc(center.x, center.y, radius, end, start);
          ctx.fill();
          ctx.closePath();

          // Draw the stroke of the arcs (on top!!!).
          ctx.beginPath();
          ctx.moveTo(center.x, center.y);
          ctx.arc(center.x, center.y, radius, end, start);
          ctx.strokeStyle = color.oklch(COLOR.crust());
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw legend.
          const label = labels[id];
          if (label === undefined) {
            throw new Error("label is undefined");
          }

          drawLegendItem(ctx, label, finalColor, i, center);
        }

        const mouseInPlot = input.isMouseInPlot();

        if (hoveredSlice === null) {
          return null;
        }

        const percentages = data.getColumn(select.value).map(Number);
        const raceShare = percentages[hoveredSlice.id];
        if (raceShare === undefined) {
          throw new Error("raceShare is undefined");
        }

        const dataMap = new Map();
        dataMap.set("Share", fmt.percent(raceShare / 100));

        const title = labels[hoveredSlice.id];
        if (title === undefined) {
          throw new Error("title is undefined");
        }
        const tooltipTitle = fmt.sentenceToTitleCase(title);

        const tooltipColor = color.oklch(COLOR.text());

        const hoveredPointOffset = toCartesian(hoveredSlice);
        const hoveredPoint = {
          ...hoveredPointOffset,
          x: hoveredPointOffset.x + center.x,
          y: hoveredPointOffset.y + center.y,
        };

        return {
          hoveredPoint,
          drawnPoints: null,
          title: tooltipTitle,
          dataMap,
          mouseInPlot,
          marginFromPoint: 0,
          animationDuration: animationCycle * 1.75,
          strokeColor: tooltipColor,
          offset: 0.5,
        };
      },
      buildTable: ({ data, table, tableSummary }) => {
        tableSummary.textContent = "Show racial representation by company in 2018";

        const fragment = new DocumentFragment();

        const caption = document.createElement("caption");
        caption.textContent = "Racial representation at tech companies (2018)";
        fragment.appendChild(caption);

        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        const headings = ["company", ...data.getColumn(0)].map(fmt.sentenceToTitleCase);
        for (const h of headings) {
          const th = document.createElement("th");
          th.scope = "col";
          th.textContent = h;
          tr.appendChild(th);
        }
        thead.appendChild(tr);
        fragment.appendChild(thead);

        const companyNames = data
          .getHeaders()
          .slice(1)
          .map((x) => x.trim());

        const rawData = data.getRowsTransposed(
          "white",
          "asian",
          "latino",
          "black",
          "multi",
          "other",
        );
        const bodyData = rawData.map((obj, i) => ({
          company: companyNames[i],
          ...mapObjectValues(obj, (val) => fmt.percent(Number(val) / 100)),
        }));
        const tbody = document.createElement("tbody");
        for (const { company, white, asian, latino, black, multi, other } of bodyData) {
          if (company === undefined) {
            throw new Error("company is undefined");
          }

          const tr = document.createElement("tr");

          const th = document.createElement("th");
          th.scope = "row";
          th.textContent = company;
          tr.appendChild(th);

          const tdWhite = document.createElement("td");
          tdWhite.textContent = white;
          tr.appendChild(tdWhite);

          const tdAsian = document.createElement("td");
          tdAsian.textContent = asian;
          tr.appendChild(tdAsian);

          const tdLatino = document.createElement("td");
          tdLatino.textContent = latino;
          tr.appendChild(tdLatino);

          const tdBlack = document.createElement("td");
          tdBlack.textContent = black;
          tr.appendChild(tdBlack);

          const tdMulti = document.createElement("td");
          tdMulti.textContent = multi;
          tr.appendChild(tdMulti);

          const tdOther = document.createElement("td");
          tdOther.textContent = other;
          tr.appendChild(tdOther);

          tbody.appendChild(tr);
        }
        fragment.appendChild(tbody);

        table.classList.add("row-headers");
        table.appendChild(fragment);
      },
    },
  });
};
