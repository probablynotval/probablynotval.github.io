import { COLOR } from "./utils/color.js";
import { cartesian, color, math, prefersReducedMotion } from "./utils/index.js";

export const plotWidth = (layout) => layout.rightEdge - layout.leftEdge;
export const plotHeight = (layout) => layout.bottomEdge - layout.topEdge;

export class Chart {
  #canvas;
  #ctx;
  #parent;
  #options;

  #tableDetails;
  #tableSummary;
  #table;

  #layout;
  #input;

  #htmlElements = [];
  #timekeeper = new ChartTimekeeper();
  #tooltip = new ChartTooltip();

  get name() {
    return this.#options.name;
  }

  constructor(parent, opts) {
    const { canvas, ctx } = createCanvas(opts.dimensions);
    this.#canvas = canvas;
    this.#ctx = ctx;
    this.#htmlElements.push(canvas);

    this.#parent = parent;
    this.#options = opts;
    this.#layout = this.#computeLayout(
      ctx,
      opts.dimensions,
      opts.offsets ?? { left: 0, right: 0, top: 0, bottom: 0 },
      opts.title,
      opts.titleSize,
    );

    this.#input = new ChartInput(canvas, this.#layout);

    const { tableDetails, tableSummary, table } = createTableScaffold();
    this.#tableDetails = tableDetails;
    this.#tableSummary = tableSummary;
    this.#table = table;
  }

  preload() {
    const { hooks } = this.#options;
    hooks.buildTable({
      table: this.#table,
      tableSummary: this.#tableSummary,
      ...this.#getChartContext(),
    });
    if (hooks.preload !== undefined) {
      hooks.preload(this.#getChartContext());
    }

    // Call after hook to ensure it's the last element.
    this.#htmlElements.push(this.#tableDetails);
  }

  setup(id) {
    this.#canvas.setAttribute("data-chart-id", String(id));

    let chartWrapper = document.querySelector(".chart-wrapper");
    if (chartWrapper === null) {
      chartWrapper = document.createElement("div");
      this.#parent.appendChild(chartWrapper);
    }
    chartWrapper.classList.add("chart-wrapper");

    // Append all elements managed by the element management array to the DOM.
    chartWrapper.append(...this.#htmlElements);

    this.#input.attachListeners();
    this.#tooltip.reset();
    this.#timekeeper.reset();

    const { hooks } = this.#options;
    if (hooks.setup !== undefined) {
      hooks.setup(this.#getChartContext());
    }
  }

  destroy() {
    // Remove all elements that are managed by the element management array from the DOM.
    for (const el of this.#htmlElements) {
      el.remove();
    }

    this.#input.detachListeners();

    const { hooks } = this.#options;
    if (hooks.destroy !== undefined) {
      hooks.destroy(this.#getChartContext());
    }
  }

  draw(dt) {
    this.#timekeeper.update(dt);

    const ctx = this.#ctx;
    const canvas = this.#canvas;

    // Clear last frame.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const layout = this.#layout;
    const options = this.#options;
    const { titleSize, hooks } = options;
    const title = typeof options.title === "string" ? options.title : options.title();

    // Draw title.
    ctx.save();
    ctx.font = `bold ${titleSize ?? 24}px serif`;
    ctx.fillStyle = color.oklch(COLOR.text());
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(title, plotWidth(layout) / 2 + layout.leftEdge, 0);
    ctx.restore();

    // Clear tooltip queue so tooltips don't lag behind.
    this.#tooltip.resetQueue();

    // The draw hook optionally returns information for drawing a tooltip.
    const tooltip = hooks.draw({
      dt,
      elapsedTime: this.#timekeeper.elapsedTime,
      mousePos: this.#input.mousePos,
      input: this.#input,
      ...this.#getChartContext(),
    });

    // Draw tooltips on top.
    if (tooltip === null) {
      this.#tooltip.reset();
      return;
    }
    this.#tooltip.draw(this.#ctx, this.#layout, this.#timekeeper, tooltip);
  }

  #computeLayout = (
    ctx,
    dimensions,
    { left = 0, right = 0, top = 0, bottom = 0 },
    title,
    titleSize,
  ) => {
    // Calculate the required height for the title.
    ctx.save();
    ctx.font = `bold ${titleSize ?? 24}px serif`;
    const t = typeof title === "string" ? title : title();
    const metrics = ctx.measureText(t);
    const titleHeight = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) * 1.1;
    ctx.restore();

    return {
      leftEdge: left,
      rightEdge: dimensions.width - right,
      topEdge: top + titleHeight,
      bottomEdge: dimensions.height - bottom,
    };
  };

  #getChartContext = () => ({
    canvas: this.#canvas,
    ctx: this.#ctx,
    data: this.#options.data,
    htmlElements: this.#htmlElements,
    layout: this.#layout,
    timekeeper: this.#timekeeper,
  });
}

class ChartInput {
  #mousePos = cartesian(0, 0);
  #canvas;
  #controller = null;
  #layout;

  constructor(canvas, layout) {
    this.#canvas = canvas;
    this.#layout = layout;
  }

  get mousePos() {
    return this.#mousePos;
  }

  attachListeners() {
    if (this.#controller !== null) {
      console.warn("controller exists, cleaning up...");
      this.detachListeners();
    }

    this.#controller = new AbortController();
    window.addEventListener("mousemove", this.#onMousemove, { signal: this.#controller.signal });
  }

  detachListeners() {
    if (this.#controller === null) {
      console.warn("controller does not exist, nothing to do...");
      return;
    }

    this.#controller.abort();
    this.#controller = null;
  }

  isMouseInPlot = (offset = 0) => {
    const isNumber = typeof offset === "number";
    const left = isNumber ? -offset : (offset.left ?? 0);
    const right = isNumber ? offset : (offset.right ?? 0);
    const top = isNumber ? -offset : (offset.top ?? 0);
    const bottom = isNumber ? offset : (offset.bottom ?? 0);

    return (
      this.#mousePos.x > this.#layout.leftEdge + left &&
      this.#mousePos.x < this.#layout.rightEdge + right &&
      this.#mousePos.y > this.#layout.topEdge + top &&
      this.#mousePos.y < this.#layout.bottomEdge + bottom
    );
  };

  #onMousemove = (e) => {
    // Scale by CSS dimensions to avoid desync.
    const { width, height, left, top } = this.#canvas.getBoundingClientRect();
    const scaleX = this.#canvas.width / width;
    const scaleY = this.#canvas.height / height;
    this.#mousePos.x = (e.clientX - left) * scaleX;
    this.#mousePos.y = (e.clientY - top) * scaleY;
  };
}

class ChartTimekeeper {
  #elapsedTime = 0;

  get elapsedTime() {
    return this.#elapsedTime;
  }

  update(dt) {
    this.#elapsedTime += dt;
  }

  reset() {
    this.#elapsedTime = 0;
  }
}

class ChartTooltip {
  #queue = [];
  #last = null;
  #target = null;
  #start = null;
  #startTime = null;

  reset() {
    this.#queue = [];
    this.#last = null;
    this.#target = null;
    this.#start = null;
    this.#startTime = null;
  }

  resetQueue() {
    this.#queue = [];
  }

  draw(
    ctx,
    layout,
    timekeeper,
    {
      hoveredPoint,
      drawnPoints,
      title,
      dataMap,
      mouseInPlot,
      marginFromPoint,
      animationDuration,
      strokeColor,
      offset,
      titleFontSize = 16,
      fontSize = 14,
    },
  ) {
    // Prevent tooltip from lingering when mouse is not in the plot.
    if (!mouseInPlot) {
      this.reset();
      return;
    }

    // hoveredPoint should be non-null, but the function will work as expected despite null values.
    if (hoveredPoint === null) {
      console.warn(
        "hoveredPoint is null - expected a non-null value (caller should guard against this)",
      );
      return;
    }

    if (hoveredPoint.id === undefined) {
      console.warn("property 'id' of hoveredPoint is undefined (are tooltips drawing?)");
    }

    // Don't draw tooltips for points that haven't yet been drawn.
    if (drawnPoints !== null && !drawnPoints.map((x) => x.id).includes(hoveredPoint.id)) {
      return;
    }

    // Don't enqueue something that's already in queue.
    if (!this.#queue.some((p) => p.id === hoveredPoint.id)) {
      this.#queue.push(hoveredPoint);
    }

    // Pop off the stack if we have a new point.
    if (this.#target === null && this.#queue.length > 0) {
      this.#target = this.#queue.shift() ?? null;
      this.#start = this.#last;
      this.#startTime = timekeeper.elapsedTime;
    }

    // Target should not be null at this point.
    if (this.#target === null) {
      console.warn("target was unexpectedly null");
      return;
    }

    // Calculate the space needed for the tooltip.
    ctx.save();
    ctx.font = `${fontSize}px system-ui, sans-serif`;

    const dataEntries = Array.from(dataMap, (pair) => pair.join(": "));
    const dataWidth = Math.max(...dataEntries.map((s) => ctx.measureText(s).width));

    ctx.textBaseline = "middle";
    ctx.font = `bold ${titleFontSize}px system-ui, sans-serif`;
    const titleWidth = ctx.measureText(String(title)).width;
    ctx.restore();

    const rectMargin =
      typeof marginFromPoint === "number"
        ? cartesian(marginFromPoint, marginFromPoint)
        : marginFromPoint;

    const rectPadding = 10;
    const rectWidth = Math.max(titleWidth, dataWidth) + rectPadding * 2;
    const dataRowHeight = 20;
    const rectHeight = 30 + dataRowHeight * dataEntries.length + rectPadding / 2;

    const overshootingRight = this.#target.x + rectWidth + rectMargin.x > layout.rightEdge;
    const overshootingBottom = this.#target.y + rectHeight + rectMargin.y > layout.bottomEdge;

    const xOffset = overshootingRight ? -rectWidth - rectMargin.x : rectMargin.x;
    const yOffset = overshootingBottom ? -rectHeight : rectMargin.y;

    // For pie chart.
    const xOffsetCenter = offset !== undefined ? rectWidth * offset : 0;
    const yOffsetCenter = offset !== undefined ? rectHeight * offset : 0;

    const finalTarget = cartesian(
      this.#target.x + xOffset - xOffsetCenter,
      this.#target.y + yOffset - yOffsetCenter,
    );

    const tooltip = {
      ctx,
      title: String(title),
      pos: finalTarget,
      rectPadding,
      dataEntries,
      dataRowHeight,
      layout: {
        titleFontSize,
        fontSize,
        rectWidth,
        rectHeight,
        rectPadding,
      },
      strokeColor,
    };

    // Instantly draw tooltip without animation if:
    //   - no tooltip has been drawn before.
    //   - the user prefers reduced motion.
    if (this.#start === null || prefersReducedMotion()) {
      this.#tooltip(tooltip);

      this.#last = this.#target;
      this.#target = null;
    } else {
      const elapsed = timekeeper.elapsedTime - (this.#startTime ?? 0);
      const unitProgress = math.clamp(elapsed / animationDuration);
      const easedProgress = math.easeOutQuad(unitProgress);

      const x = math.mapFrom(easedProgress, this.#start.x, finalTarget.x);
      const y = math.mapFrom(easedProgress, this.#start.y, finalTarget.y);

      this.#tooltip({
        ...tooltip,
        pos: cartesian(x, y),
      });

      if (easedProgress === 1) {
        this.#last = cartesian(x, y);
        this.#target = null;
      }
    }
  }

  #tooltip = (opts) => {
    const { ctx, title, pos, layout, dataEntries, dataRowHeight, strokeColor } = opts;
    const { x, y } = pos;
    const { rectWidth, rectHeight, rectPadding, fontSize, titleFontSize } = layout;

    ctx.save();

    ctx.fillStyle = color.oklch({ alpha: 0.85, ...COLOR.base() });
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, rectWidth, rectHeight, 5);
    ctx.fill();
    ctx.stroke();

    const titleX = x + rectWidth / 2;
    const titleY = y + 15;

    ctx.textBaseline = "middle";

    ctx.font = `bold ${titleFontSize}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = color.oklch(COLOR.text());
    ctx.fillText(title, titleX, titleY);

    const dataX = x + rectPadding;
    const dataY = titleY + 25;

    ctx.font = `${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillStyle = color.oklch(COLOR.subtext0());

    for (const [i, dataString] of dataEntries.entries()) {
      ctx.fillText(dataString, dataX, dataY + dataRowHeight * i);
    }

    ctx.restore();
  };
}

const createTableScaffold = () => {
  const tableDetails = document.createElement("details");
  const tableSummary = document.createElement("summary");
  const tableWrapper = document.createElement("div");
  const table = document.createElement("table");

  tableWrapper.classList.add("table-wrapper");
  tableWrapper.appendChild(table);

  tableDetails.classList.add("table-container");
  tableDetails.append(tableSummary, tableWrapper);

  return { tableDetails, tableSummary, table };
};

const createCanvas = (dimensions) => {
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("ctx is null");
  }

  return { canvas, ctx };
};
