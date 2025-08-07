export const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
// Calculate distance between two Cartesian coordinates.
export const dist = (p1, p2) => Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
export const lerp = (a, b, t) => a + (b - a) * Math.min(t, 1);
export const map = (x, start0, stop0, start1, stop1) => ((x - start0) / (stop0 - start0)) * (stop1 - start1) + start1;
// Maps a value into a 'unit' (0-1) from the given range.
export const mapTo = (x, start0, stop0) => (x - start0) / (stop0 - start0);
// Maps a value from a 'unit' (0-1) to the given range.
export const mapFrom = (x, start1, stop1) => x * (stop1 - start1) + start1;
// Easing functions from: https://easings.net/
export const easeOutSine = (x) => Math.sin((x * Math.PI) / 2);
export const easeOutQuad = (x) => 1 - (1 - x) * (1 - x);
export const easeOutCubic = (x) => 1 - (1 - x) ** 3;
export const easeOutCubicInv = (x) => 1 - (1 - x) ** (1 / 3);
export const easeInOutCubic = (x) => x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
export const easeOutQuart = (x) => 1 - (1 - x) ** 4;
export const easeOutExpo = (x) => (x === 1 ? 1 : 1 - 2 ** (-10 * x));
export const easeOutExpoInv = (x) => (x === 1 ? 1 : -(1 / 10) * Math.log2(1 - x));
export const easeOutBack = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;
export const easeOutElastic = (x, period = 0.3, decay = 10) => x === 0 ? 0 : x === 1 ? 1 : 2 ** (-decay * x) * Math.sin((x * (2 * Math.PI)) / period - 1) + 1;
