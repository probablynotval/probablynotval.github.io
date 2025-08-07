import { climateChange } from "./charts/climateChange.js";
import { payGap } from "./charts/payGap.js";
import { payGapByJob } from "./charts/payGapByJob.js";
import { techDiversityGender } from "./charts/techDiversityGender.js";
import { techDiversityRace } from "./charts/techDiversityRace.js";
import { Gallery } from "./gallery.js";
import { prefersReducedMotion } from "./utils/index.js";
export const setupGallery = () => {
    const gallery = new Gallery();
    const container = document.querySelector(".chart-container");
    if (container === null) {
        throw new Error("parent is null");
    }
    const dimensions = { width: 1024, height: 576 };
    const padding = 35;
    const animationCycle = 40 * (prefersReducedMotion() ? 0 : 1);
    gallery.addChart(climateChange(container, dimensions, padding, animationCycle));
    gallery.addChart(payGap(container, dimensions, padding, animationCycle));
    gallery.addChart(payGapByJob(container, dimensions, padding, animationCycle));
    gallery.addChart(techDiversityGender(container, { ...dimensions, height: 768 }, padding, animationCycle));
    gallery.addChart(techDiversityRace(container, { ...dimensions, width: 720 }, animationCycle));
    return gallery;
};
