export const celsius = (x, minimumFractionDigits = 0, maximumFractionDigits = 1, options) => (typeof x === "string" ? Number(x) : x).toLocaleString("en-GB", {
    style: "unit",
    unit: "celsius",
    minimumFractionDigits,
    maximumFractionDigits,
    ...options,
});
export const percent = (x, minimumFractionDigits = 0, maximumFractionDigits = 1, options) => (typeof x === "string" ? Number(x) : x).toLocaleString("en-GB", {
    style: "percent",
    minimumFractionDigits,
    maximumFractionDigits,
    ...options,
});
export const gbp = (x, minimumFractionDigits = 0, maximumFractionDigits = 1, options) => (typeof x === "string" ? Number(x) : x).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits,
    maximumFractionDigits,
    ...options,
});
export const sentenceToTitleCase = (str) => str
    .split(" ")
    .map((x) => `${x.charAt(0).toUpperCase()}${x.substring(1)}`)
    .join(" ");
