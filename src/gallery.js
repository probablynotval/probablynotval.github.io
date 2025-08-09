import { isMobileView, onNavButtonClick } from "./utils/index.js";

class IdManager {
  #nextId = 0;
  #ids = new Map();

  reserveId(item) {
    const id = this.#nextId++;
    this.#ids.set(id, item);
    return id;
  }

  getFromId(id) {
    const item = this.#ids.get(id);
    if (item === undefined) {
      throw new Error("item is undefined");
    }
    return item;
  }
}

export class Gallery {
  #charts = [];
  #idManager = new IdManager();
  #selectedChart = null;

  get chart() {
    return this.#selectedChart;
  }

  async addChart(chart) {
    // Assign an id to the chart.
    const id = this.#idManager.reserveId(chart);
    this.#charts.push(chart);

    const menuItem = document.createElement("li");
    menuItem.classList.add("menu-item");

    // Wire up the id of the chart to the button.
    const menuButton = document.createElement("button");
    menuButton.setAttribute("data-chart-id", id.toString());
    menuButton.setAttribute("data-label", chart.name);

    menuButton.addEventListener("click", (e) => this.#onMenuButtonClick(e, menuItem));

    menuButton.textContent = chart.name;

    menuItem.appendChild(menuButton);

    const navbar = document.querySelector(".navbar-list");
    if (navbar === null) {
      throw new Error("navbar is null");
    }
    navbar.appendChild(menuItem);
  }

  #selectChartById = (id) => {
    const toSelect = this.#idManager.getFromId(id);

    // Load the chart if we haven't already (lazy loading).
    if (!toSelect.loaded) {
      toSelect.preload();
    }

    if (this.#selectedChart !== null) {
      this.#selectedChart.destroy();
    }
    this.#selectedChart = toSelect;
    this.#selectedChart.setup(id);
  };

  #onMenuButtonClick = (e, menuItem) => {
    const targetEl = e.target;
    const id = targetEl.getAttribute("data-chart-id");
    if (id === null) {
      console.error("id is null: error getting data-chart-id element attribute");
      return;
    }

    const menuItems = document.querySelectorAll(".menu-item");
    for (const el of menuItems) {
      el.classList.remove("selected");
    }
    menuItem.classList.add("selected");

    this.#selectChartById(Number(id));

    const navButton = document.querySelector(".navbar-btn");
    if (navButton === null) {
      throw new Error("navButton is null");
    }

    const navList = document.querySelector(".navbar-list");
    if (navList === null) {
      throw new Error("navList is null");
    }

    if (isMobileView()) {
      onNavButtonClick();
    }
  };
}
