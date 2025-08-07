let gallery;
const drawLoop = (dt) => {
    const chart = gallery.chart;
    // Draw if there's a chart to be displayed.
    if (chart !== null) {
        chart.draw(dt);
    }
};
let last = null;
export const tick = (timestamp) => {
    if (last === null) {
        last = timestamp;
    }
    const dt = timestamp - last;
    last = timestamp;
    drawLoop(dt);
    // Recursive call to keep animation going.
    window.requestAnimationFrame(tick);
};
export const run = (galleryInstance) => {
    gallery = galleryInstance;
    // Start the loop
    window.requestAnimationFrame(tick);
};
