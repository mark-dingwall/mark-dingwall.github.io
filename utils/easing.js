'use strict';

// Shared easing functions

function easeInOut(perc, power) {
  perc *= 2;
  if (perc < 1) return Math.pow(perc, power) / 2;
  perc--;
  return 1 - Math.pow(1 - perc, power) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
