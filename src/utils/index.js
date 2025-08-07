import { dist } from "./math.js";

export const ICONS = {
  TOGGLE_LIGHT_THEME: `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 19a1 1 0 0 1 .993 .883l.007 .117v1a1 1 0 0 1 -1.993 .117l-.007 -.117v-1a1 1 0 0 1 1 -1z" />
    <path d="M18.313 16.91l.094 .083l.7 .7a1 1 0 0 1 -1.32 1.497l-.094 -.083l-.7 -.7a1 1 0 0 1 1.218 -1.567l.102 .07z" />
    <path d="M7.007 16.993a1 1 0 0 1 .083 1.32l-.083 .094l-.7 .7a1 1 0 0 1 -1.497 -1.32l.083 -.094l.7 -.7a1 1 0 0 1 1.414 0z" />
    <path d="M4 11a1 1 0 0 1 .117 1.993l-.117 .007h-1a1 1 0 0 1 -.117 -1.993l.117 -.007h1z" />
    <path d="M21 11a1 1 0 0 1 .117 1.993l-.117 .007h-1a1 1 0 0 1 -.117 -1.993l.117 -.007h1z" />
    <path d="M6.213 4.81l.094 .083l.7 .7a1 1 0 0 1 -1.32 1.497l-.094 -.083l-.7 -.7a1 1 0 0 1 1.217 -1.567l.102 .07z" />
    <path d="M19.107 4.893a1 1 0 0 1 .083 1.32l-.083 .094l-.7 .7a1 1 0 0 1 -1.497 -1.32l.083 -.094l.7 -.7a1 1 0 0 1 1.414 0z" />
    <path d="M12 2a1 1 0 0 1 .993 .883l.007 .117v1a1 1 0 0 1 -1.993 .117l-.007 -.117v-1a1 1 0 0 1 1 -1z" />
    <path d="M12 7a5 5 0 1 1 -4.995 5.217l-.005 -.217l.005 -.217a5 5 0 0 1 4.995 -4.783z" />
  </svg>
`,

  TOGGLE_DARK_THEME: `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 1.992a10 10 0 1 0 9.236 13.838c.341 -.82 -.476 -1.644 -1.298 -1.31a6.5 6.5 0 0 1 -6.864 -10.787l.077 -.08c.551 -.63 .113 -1.653 -.758 -1.653h-.266l-.068 -.006l-.06 -.002z" />
  </svg>
`,

  MENU_OPEN: `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4 6l16 0" />
    <path d="M4 12l16 0" />
    <path d="M4 18l16 0" />
  </svg>
`,

  MENU_CLOSED: `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M18 6l-12 12" />
    <path d="M6 6l12 12" />
  </svg>
`,
};

export const cartesian = (x, y) => ({ kind: "cartesian", x, y });
export const polar = (r, theta) => ({ kind: "polar", r, theta });

export const toCartesian = (c) => {
  if (c.kind === "polar") {
    return {
      ...cartesian(c.r * Math.cos(c.theta), c.r * Math.sin(c.theta)),
      id: c.id,
    };
  }
  return c;
};

// Map all values of an object, preserving the same key.
export const mapObjectValues = (obj, fn) => {
  const result = {};
  for (const key in obj) {
    result[key] = fn(obj[key], key);
  }
  return result;
};

export const isThemeDark = () => {
  const theme = document.documentElement.attributes.getNamedItem("data-theme");
  if (theme === null) {
    throw new Error("theme is null");
  }
  return theme.nodeValue === "dark";
};

export const forcedColors = () => window.matchMedia("(forced-colors: active)").matches;

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const prefersContrastMore = () => window.matchMedia("(prefers-contrast: more)").matches;

export const isMobileView = () => window.matchMedia("(max-width: 1000px)").matches;

export const findHoveredPoint = (points, mousePos, maxDistance) => {
  let closest = null;

  for (const point of points) {
    if (maxDistance !== undefined) {
      if (point.radius !== undefined) {
        console.warn("Point has both maxDistance and radius, using maxDistance");
      }

      const distThis = Math.abs(point.x - mousePos.x);

      const tooFarX = distThis > maxDistance.x;
      const tooFarY = Math.abs(point.y - mousePos.y) > maxDistance.y;
      if (tooFarX || tooFarY) {
        continue;
      }

      if (closest === null) {
        closest = point;
      }

      const distClosest = Math.abs(closest.x - mousePos.x);
      if (distThis < distClosest) {
        closest = point;
      }
    } else {
      if (point.radius === undefined) {
        throw new Error("Need to define either radius or pass maxDistance");
      }
      const distThis = dist(point, mousePos);

      const tooFar = distThis > point.radius;
      if (tooFar) {
        continue;
      }

      if (closest === null) {
        closest = point;
      }

      const distClosest = dist(closest, mousePos);
      if (distThis < distClosest) {
        closest = point;
      }
    }
  }

  return closest;
};

// The Fisher-Yates shuffle.
export const shuffleArray = (arr) => {
  // Avoid accidental mutation.
  const arrCopy = [...arr];
  for (let i = arrCopy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arrCopy[i], arrCopy[j]] = [arrCopy[j], arrCopy[i]];
  }
  return arrCopy;
};

export const onNavButtonClick = () => {
  const navButton = document.querySelector(".navbar-btn");
  if (navButton === null) {
    throw new Error("navButton is null");
  }

  const navList = document.querySelector(".navbar-list");
  if (navList === null) {
    throw new Error("navList is null");
  }

  navList.classList.toggle("collapsed");

  const isCollapsed = navList.classList.contains("collapsed");
  navButton.innerHTML = isCollapsed ? ICONS.MENU_OPEN : ICONS.MENU_CLOSED;
  navButton.ariaLabel = isCollapsed ? "Open navigation menu" : "Close navigation menu";
  navButton.ariaExpanded = String(!isCollapsed);
};

export * as color from "./color.js";
export * as draw from "./draw.js";
export * as fmt from "./fmt.js";
export * as math from "./math.js";
