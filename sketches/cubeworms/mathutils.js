// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// shared math utilities used across multiple classes

// randomly return 1 or -1
export function randomSign() {
  return Math.random() >= 0.5 ? 1 : -1;
}

// angle theta between two Vector3s: cos(theta) = (v1 dot v2) / (|v1| * |v2|)
// clamp to [-1, 1] to guard against floating-point drift causing acos to return NaN
export function findTheta(v1, v2) {
  const cosTheta = v1.dot(v2) / (v1.length() * v2.length());
  return Math.acos(Math.max(-1, Math.min(1, cosTheta)));
}

// symmetric ease in-out: accelerate until halfway, then decelerate (returns 0 to 1)
// power controls the curve shape (3 = cubic, 4 = quartic, etc.)
export function easeInOut(perc, power) {
  perc *= 2; // split animation into acceleration and deceleration halves
  if (perc < 1) {
    return Math.pow(perc, power) / 2;
  } else {
    perc--;
    return 1 - (Math.pow(1 - perc, power) / 2);
  }
}

// cubic ease-out: start fast, finish slow (returns 0 to 1)
export function easeOutCubic(perc) {
  return 1 - Math.pow(1 - perc, 3);
}

// inverted quintic ease in - start from 1, decrease slowly, finish rapidly at 0
export function invEaseInQuint(perc) {
  return Math.pow(perc, 5) * -1 + 1;
}

// Catmull-Rom spline interpolation for a single scalar value
// a, b, c, d are control points; t is interpolation parameter [0, 1]
export function curvePoint(a, b, c, d, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * b) +
    (-a + c) * t +
    (2 * a - 5 * b + 4 * c - d) * t2 +
    (-a + 3 * b - 3 * c + d) * t3
  );
}
