import { run } from "./app.js";
import { setupGallery } from "./setup.js";
import { ICONS, onNavButtonClick } from "./utils/index.js";
const setupNavigation = () => {
    const navButton = document.querySelector(".navbar-btn");
    if (navButton === null) {
        throw new Error("navButton is null");
    }
    const navList = document.querySelector(".navbar-list");
    if (navList === null) {
        throw new Error("navList is null");
    }
    navButton.innerHTML = navList.classList.contains("collapsed")
        ? ICONS.MENU_OPEN
        : ICONS.MENU_CLOSED;
    navButton.addEventListener("click", onNavButtonClick);
};
const setupTheme = () => {
    // Gets the root of the document, in this case <html>.
    const root = document.documentElement;
    const themeButton = document.querySelector("[data-theme-toggle]");
    if (themeButton === null) {
        throw new Error("themeButton is null");
    }
    // https://dev.to/whitep4nth3r/the-best-lightdark-mode-theme-toggle-in-javascript-368f
    const cachedTheme = window.localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    // Default theme is light.
    let currentTheme = "light";
    // If system is set to dark theme, respect that.
    if (systemDark.matches) {
        currentTheme = "dark";
    }
    // If the user has changed the theme on the website, that takes priority.
    if (cachedTheme !== null) {
        currentTheme = cachedTheme;
    }
    root.setAttribute("data-theme", currentTheme);
    themeButton.innerHTML =
        currentTheme === "dark" ? ICONS.TOGGLE_LIGHT_THEME : ICONS.TOGGLE_DARK_THEME;
    themeButton.ariaLabel = `Toggle ${currentTheme} theme`;
    themeButton.ariaLabel =
        currentTheme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    themeButton.addEventListener("click", () => {
        currentTheme = currentTheme === "dark" ? "light" : "dark";
        window.localStorage.setItem("theme", currentTheme);
        root.setAttribute("data-theme", currentTheme);
        themeButton.innerHTML =
            currentTheme === "dark" ? ICONS.TOGGLE_LIGHT_THEME : ICONS.TOGGLE_DARK_THEME;
        themeButton.ariaLabel =
            currentTheme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    });
};
const showPage = () => {
    const body = document.querySelector("body");
    if (body === null) {
        throw new Error("body is null");
    }
    body.style.visibility = "visible";
};
const main = () => {
    // Set up DOM stuff.
    setupNavigation();
    setupTheme();
    showPage();
    const gallery = setupGallery();
    run(gallery);
};
main();
