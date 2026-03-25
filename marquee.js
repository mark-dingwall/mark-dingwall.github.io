'use strict';
(function () {
  const m = document.title + ' ';
  let w = 0;
  setInterval(() => {
    document.title = m.substring(w) + m.substring(0, w);
    w = (w + (m[w] === ' ' ? 2 : 1)) % m.length;
  }, 500);
})();
