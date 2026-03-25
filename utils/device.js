'use strict';

// Device detection
const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  || ('ontouchstart' in window && window.innerWidth < 1024);
