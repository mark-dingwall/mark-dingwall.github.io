'use strict';

// Seeded PRNG (alea/masher)
function alea(seed) {
  let e = 0, b = 0, d = 0, c = 1, f = masher();
  e = f(' '); b = f(' '); d = f(' ');
  e -= f(seed); if (e < 0) e += 1;
  b -= f(seed); if (b < 0) b += 1;
  d -= f(seed); if (d < 0) d += 1;
  return function () {
    let r = 2091639 * e + 2.3283064365386963e-10 * c;
    e = b; b = d;
    return d = r - (c = r | 0);
  };
}
function masher() {
  let a = 4022871197;
  return function (e) {
    e = e.toString();
    for (let b = 0; b < e.length; b++) {
      a += e.charCodeAt(b);
      let d = 0.02519603282416938 * a;
      a = d >>> 0; d -= a; d *= a;
      a = d >>> 0; d -= a;
      a += 4294967296 * d;
    }
    return 2.3283064365386963e-10 * (a >>> 0);
  };
}
