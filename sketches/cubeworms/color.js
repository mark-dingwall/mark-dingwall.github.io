// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

import { Color } from 'three';

// Convert HSV (Processing's HSB) to RGB.
// h: 0-360, s: 0-100, v: 0-100
// Returns {r, g, b} with all values in 0-1 range.
export function hsvToRgb(h, s, v) {
  // normalise inputs
  h = ((h % 360) + 360) % 360; // handle negative/wrapping hue
  s /= 100;
  v /= 100;

  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;

  let r, g, b;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }

  return { r: r + m, g: g + m, b: b + m };
}

// Convenience: convert HSV to a THREE.Color instance.
// h: 0-360, s: 0-100, v: 0-100
export function hsvToThreeColor(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return new Color(r, g, b);
}

// Convert Processing alpha (0-100) to Three.js opacity (0-1).
export function alphaToOpacity(alpha) {
  return alpha / 100;
}
