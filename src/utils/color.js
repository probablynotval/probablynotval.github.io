import { math, prefersContrastMore } from "./index.js";
// Converts an OklchColor object into an oklch string.
export const oklch = (oklch) => {
    const isString = typeof oklch === "string";
    const l = isString ? Number(oklch.trim().split(" ")[0]) : oklch.lightness;
    const c = isString ? Number(oklch.trim().split(" ")[1]) : oklch.chroma;
    const h = isString ? Number(oklch.trim().split(" ")[2]) : oklch.hue;
    const a = isString ? Number(oklch.trim().split(" ")[3]) : oklch.alpha;
    const lightness = math.clamp(l);
    const chroma = math.clamp(c);
    const hue = math.clamp(h, 0, 360);
    const alpha = math.clamp(a ?? 1);
    return `oklch(${lightness} ${chroma} ${hue} / ${alpha})`;
};
export const css = (cssVar) => window.getComputedStyle(document.documentElement).getPropertyValue(cssVar);
// Gets a CSS variable and parses it into an OklchColor object.
export const cssOklch = (cssVar) => {
    const oklchRaw = window.getComputedStyle(document.documentElement).getPropertyValue(cssVar);
    const oklch = oklchRaw.trim().slice(6, -1);
    const [lightness, chroma, hue] = oklch.split(" ").map(Number);
    if (lightness === undefined) {
        throw new Error("lightness is undefined");
    }
    if (chroma === undefined) {
        throw new Error("chroma is undefined");
    }
    if (hue === undefined) {
        throw new Error("hue is undefined");
    }
    return { lightness, chroma, hue };
};
export const COLOR = {
    rosewater: () => cssOklch("--rosewater"),
    flamingo: () => cssOklch("--flamingo"),
    pink: () => cssOklch("--pink"),
    mauve: () => cssOklch("--mauve"),
    red: () => cssOklch("--red"),
    maroon: () => cssOklch("--maroon"),
    peach: () => cssOklch("--peach"),
    yellow: () => cssOklch("--yellow"),
    green: () => cssOklch("--green"),
    teal: () => cssOklch("--teal"),
    sky: () => cssOklch("--sky"),
    sapphire: () => cssOklch("--sapphire"),
    blue: () => cssOklch("--blue"),
    lavender: () => cssOklch("--lavender"),
    text: () => cssOklch(prefersContrastMore() ? "--hc-text" : "--text"),
    subtext1: () => cssOklch("--subtext1"),
    subtext0: () => cssOklch("--subtext0"),
    overlay2: () => cssOklch("--overlay2"),
    overlay1: () => cssOklch("--overlay1"),
    overlay0: () => cssOklch("--overlay0"),
    surface2: () => cssOklch("--surface2"),
    surface1: () => cssOklch("--surface1"),
    surface0: () => cssOklch("--surface0"),
    base: () => cssOklch("--base"),
    mantle: () => cssOklch("--mantle"),
    crust: () => cssOklch("--crust"),
    white: () => oklch("1 0 0"),
};
