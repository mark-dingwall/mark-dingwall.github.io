"use strict";

const TIME_INC = 0.01;
const TRANSFORM_INC = 1;
const INTENSITY_INC = 0.02;
const NOISE_TRANSFORM_OFFSET = 10000;

let frameCount = 0;
let intensity = 0;

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".grid-cell").forEach(g => {
    initGridItemText(g);
    g.addEventListener('mouseenter', () => intensity = 0);
    g.addEventListener('focusin',    () => intensity = 0);
  });
  requestAnimationFrame(floatTextOfHoveredCell);
});

/**
 * @param {HTMLElement} gridItem
 */
function initGridItemText(gridItem) {
  gridItem.querySelectorAll('h2').forEach(h2 => splitToLetters(h2));
  gridItem.querySelectorAll('p').forEach(p => splitToLetters(p));
}

/**
 * Split text to individual letters and wrap in span elements
 * @param {HTMLElement} textEl
 */
function splitToLetters(textEl) {
  const text = textEl.innerText;
  textEl.innerHTML = "";
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement("span");
    span.innerText = text[i];

    if (text[i] != " ") {
      span.classList.add('floaty');
    }
    textEl.appendChild(span);
  }
}

function floatTextOfHoveredCell() {
  frameCount++;
  intensity = Math.min(intensity + INTENSITY_INC, 1);
  setTimeout(() => requestAnimationFrame(floatTextOfHoveredCell), 100);

  const hoveredCell = document.querySelector('.grid-cell:hover, .grid-cell:focus-within');
  if (!hoveredCell)
    return;

  hoveredCell.querySelectorAll('.floaty').forEach((textEl, index) => {
    const tx = NOISE.noise2D(frameCount * TIME_INC, index * TRANSFORM_INC) * 40 * intensity;
    const ty = NOISE.noise2D(frameCount * TIME_INC, index * TRANSFORM_INC + NOISE_TRANSFORM_OFFSET) * 40 * intensity;
    const rot = NOISE.noise2D(frameCount * TIME_INC, index * TRANSFORM_INC + NOISE_TRANSFORM_OFFSET * 2) * 90 * intensity;
    textEl.style.transform = `rotate(${rot}deg) translate(${tx}px, ${ty}px)`;
  });
}
