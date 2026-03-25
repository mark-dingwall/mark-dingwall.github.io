'use strict';

// Math helpers
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(t) { return t * t * (3 - 2 * t); }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
