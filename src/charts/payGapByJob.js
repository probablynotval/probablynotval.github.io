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
  shuffleArray,
} from "../utils/index.js";

const data = await loadCsvData("./data/pay-gap/occupation-hourly-pay-by-gender-2017.csv");

export const payGapByJob = (parent, dimensions, padding, animationCycle) => {
  const xTickLabelCount = 21;
  const yTickLabelCount = 8;
  const xAxisLabel = "proportion female (%)";
  const yAxisLabel = "pay gap (%)";
  const propFemaleMin = 0;
  const propFemaleMax = 100;
  const dotSizeMin = 15;
  const dotSizeMax = 40;

  const proportionFemaleToWidth = (value, layout) =>
    math.map(value, propFemaleMin, propFemaleMax, layout.leftEdge, layout.rightEdge);

  const payGapToHeight = (value, layout) =>
    math.map(
      value,
      payGapMax,
      payGapMin,
      layout.topEdge + dotSizeMax / 2,
      layout.bottomEdge - dotSizeMax / 2,
    );

  const allData = data
    .getRows(
      "job_type_code",
      "job_subtype",
      "num_jobs_female",
      "num_jobs",
      "proportion_female",
      "pay_gap",
    )
    .map((d) => ({
      jobTypeCode: Number(d.job_type_code),
      jobSubtype: d.job_subtype,
      numJobsFemale: Number(d.num_jobs_female),
      numJobs: Number(d.num_jobs),
      proportionFemale: Number(d.proportion_female),
      payGap: Number(d.pay_gap),
    }));

  const numJobs = allData.map((x) => x.numJobs);
  const numJobsMin = Math.min(...numJobs);
  const numJobsMax = Math.max(...numJobs);

  const payGaps = allData.map((x) => x.payGap);
  const payGapMin = Math.floor(Math.min(...payGaps));
  const payGapMax = Math.ceil(Math.max(...payGaps));

  const fillAlphas = Array(allData.length).fill(0.5);

  const processedData = [];

  let shuffledData;

  const drawCenterAxes = (ctx, layout, animation) => {
    const { elapsedTime, duration } = animation;

    const unitProgress = math.clamp(elapsedTime / (duration * 4));
    const easedProgress = math.easeInOutCubic(unitProgress);

    const centerX = proportionFemaleToWidth(50, layout);
    const centerY = payGapToHeight(0, layout);

    const leftX = math.mapFrom(easedProgress, centerX, layout.leftEdge);
    const rightX = math.mapFrom(easedProgress, centerX, layout.rightEdge);
    const topY = math.mapFrom(easedProgress, centerY, layout.topEdge);
    const bottomY = math.mapFrom(easedProgress, centerY, layout.bottomEdge);

    // Draw horizontal line.
    draw.line(ctx, cartesian(leftX, centerY), cartesian(rightX, centerY));

    // Draw vertical line.
    draw.line(ctx, cartesian(centerX, topY), cartesian(centerX, bottomY));
  };

  return new Chart(parent, {
    title: "Gender Pay Gap: Average Difference Between Male and Female Pay by Occupation",
    name: "Pay Gap by Job",
    data,
    dimensions,
    offsets: {
      top: 15,
      left: padding * 2,
      right: padding,
      bottom: padding * 2.25,
    },
    hooks: {
      preload: ({ layout }) => {
        for (const [id, col] of allData.entries()) {
          const radius =
            (math.map(col.numJobs, numJobsMin, numJobsMax, dotSizeMin, dotSizeMax) * 1.2) / 2;
          const x = proportionFemaleToWidth(col.proportionFemale, layout);
          const y = payGapToHeight(col.payGap, layout);

          processedData.push({ ...col, radius, id, ...cartesian(x, y) });
        }
      },
      setup: () => {
        shuffledData = shuffleArray(processedData);
      },
      draw: ({ canvas, ctx, dt, elapsedTime, layout, input }) => {
        const labelTime = elapsedTime - animationCycle * 10;

        draw.axisLabels(
          ctx,
          { ...layout, canvasWidth: canvas.width, canvasHeight: canvas.height },
          xAxisLabel,
          yAxisLabel,
          { elapsedTime: labelTime, duration: animationCycle * 5 },
        );

        const axisDuration = animationCycle * 5;

        ctx.save();
        ctx.strokeStyle = color.oklch(COLOR.text());
        draw.axis(
          ctx,
          { ...layout, xTickLabelCount, yTickLabelCount },
          { elapsedTime, duration: axisDuration / 5 },
        );
        ctx.lineWidth = 1;
        ctx.strokeStyle = color.oklch(COLOR.surface1());
        drawCenterAxes(ctx, layout, { elapsedTime, duration: axisDuration });
        ctx.restore();

        ctx.save();
        draw.yAxisTickLabels(
          ctx,
          { ...layout, padding, xTickLabelCount, yTickLabelCount },
          payGapMax,
          payGapMin,
          payGapToHeight,
          { elapsedTime, duration: axisDuration / 5, inverse: true },
        );
        draw.xAxisTickLabels(
          ctx,
          { ...layout, padding },
          [0, 25, 50, 75, 100],
          proportionFemaleToWidth,
          {
            elapsedTime,
            duration: axisDuration * 0.8,
          },
          0,
        );
        ctx.restore();

        ctx.fillStyle = color.oklch(COLOR.base());
        ctx.strokeStyle = color.oklch(COLOR.text());
        ctx.lineWidth = 1;

        const lineDelay = axisDuration * 1.5;
        const lineTime = elapsedTime - lineDelay;

        const colors = [
          COLOR.flamingo(),
          COLOR.pink(),
          COLOR.mauve(),
          COLOR.red(),
          COLOR.peach(),
          COLOR.yellow(),
          COLOR.green(),
          COLOR.sky(),
          COLOR.lavender(),
        ];

        const calculatedData = shuffledData.map((p, i) => {
          const delay = i * animationCycle;
          const totalOffset = lineTime - delay;
          const unitProgress = math.clamp(totalOffset / (shuffledData.length * animationCycle));
          const easedProgress = math.easeOutElastic(unitProgress);
          const radius = p.radius * easedProgress;
          const dataColor = colors[p.jobTypeCode - 1] ?? { lightness: 0, chroma: 0, hue: 0 };
          return {
            ...p,
            easedProgress,
            unitProgress,
            radius,
            dataColor,
          };
        });

        const hoveredPoint = findHoveredPoint(calculatedData, input.mousePos);
        const drawnPoints = [];
        const mouseInPlot = input.isMouseInPlot(15);

        const easedFactor = prefersReducedMotion() ? dt : math.easeOutCubic(0.003 * dt);
        const notHoveredAlpha = isThemeDark() ? 0.4 : 0.3;

        for (const { radius, unitProgress, x, y, id, dataColor } of calculatedData) {
          if (unitProgress > 0) {
            drawnPoints.push({ id, radius, ...cartesian(x, y) });
          }

          if (hoveredPoint !== null && hoveredPoint.id === id) {
            continue;
          }

          const circleAlpha = fillAlphas[id];
          fillAlphas[id] = math.lerp(circleAlpha, notHoveredAlpha, easedFactor);

          ctx.strokeStyle = color.oklch(dataColor);
          ctx.fillStyle = color.oklch({ alpha: circleAlpha, ...dataColor });

          ctx.beginPath();
          ctx.ellipse(x, y, radius, radius, 0, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }

        if (hoveredPoint === null) {
          return null;
        }

        const hoveredAlpha = fillAlphas[hoveredPoint.id];
        fillAlphas[hoveredPoint.id] = math.lerp(hoveredAlpha, 1, easedFactor);

        const { x, y, radius, dataColor, proportionFemale, payGap, numJobs, numJobsFemale } =
          hoveredPoint;

        ctx.fillStyle = color.oklch({ alpha: hoveredAlpha, ...dataColor });
        ctx.strokeStyle = color.oklch(dataColor);
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        const tooltipTitle = hoveredPoint.jobSubtype;

        const dataMap = new Map();
        dataMap.set("Proportion Female", fmt.percent(proportionFemale / 100));
        dataMap.set("Pay Gap", fmt.percent(payGap / 100));
        dataMap.set("Jobs (Female)", `${numJobs} (${numJobsFemale})`);

        const tooltipColor = color.oklch(dataColor);

        return {
          hoveredPoint,
          drawnPoints,
          title: tooltipTitle,
          dataMap,
          mouseInPlot,
          marginFromPoint: cartesian(radius, 0),
          animationDuration: animationCycle * 1.75,
          strokeColor: tooltipColor,
        };
      },
      buildTable: ({ data, table, tableSummary }) => {
        tableSummary.textContent = "Show average gender pay gap by occupation in 2017";

        const fragment = new DocumentFragment();

        const caption = document.createElement("caption");
        caption.textContent = "Average gender pay gap by occupation (2017)";
        fragment.appendChild(caption);

        const thead = document.createElement("thead");
        const tr = document.createElement("tr");

        const headings = ["Job", "Jobs (Female)", "Proportion Female", "Pay Gap"];
        for (const h of headings) {
          const th = document.createElement("th");
          th.scope = "col";
          th.textContent = h;
          tr.appendChild(th);
        }
        thead.appendChild(tr);
        fragment.appendChild(thead);

        const rawData = data.getRows(
          "job_subtype",
          "num_jobs_female",
          "num_jobs",
          "proportion_female",
          "pay_gap",
        );

        const bodyData = rawData.map((d) => ({
          jobSubtype: d.job_subtype,
          numJobsFemale: Number(d.num_jobs_female),
          numJobs: Number(d.num_jobs),
          proportionFemale: fmt.percent(Number(d.proportion_female) / 100),
          payGap: fmt.percent(Number(d.pay_gap) / 100),
        }));

        const tbody = document.createElement("tbody");
        for (const { jobSubtype, numJobsFemale, numJobs, proportionFemale, payGap } of bodyData) {
          const tr = document.createElement("tr");

          const thJobSubtype = document.createElement("th");
          thJobSubtype.textContent = jobSubtype;
          thJobSubtype.scope = "row";
          tr.appendChild(thJobSubtype);

          const tdNumJobsFemale = document.createElement("td");
          tdNumJobsFemale.textContent = `${numJobs} (${numJobsFemale})`;
          tr.appendChild(tdNumJobsFemale);

          const tdProportionFemale = document.createElement("td");
          tdProportionFemale.textContent = proportionFemale;
          tr.appendChild(tdProportionFemale);

          const tdPayGap = document.createElement("td");
          tdPayGap.textContent = payGap;
          tr.appendChild(tdPayGap);

          tbody.appendChild(tr);
        }
        fragment.appendChild(tbody);

        table.classList.add("row-headers");
        table.appendChild(fragment);
      },
    },
  });
};
