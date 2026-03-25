"use strict";

// things that govern behaviour (and other useful constants)
const TAU = Math.PI * 2;
const FRAMERATE = 30;
const MAX_SECTORS = 50;
const SCALING = {
  'r': [250125, 8294400],
  'n': [22000, 120000]
};
const BACKGROUND = '#121212';
const SHOW_DOTS_RANGE = [0.1, 1, 0.1];
const V_MIN = 0.1;
const V_MOD_RANGE = [-1, 1.7, 0.15];
const V_BOOST_INIT = 5;
const V_BOOST_MIN = 1.1;
const V_BOOST_DECAY = 0.95;
const V_BOOST_MOD_RANGE = []
const NOISE_T_INC = 0.006;
const NOISE_XY_INC = 0.035;

// the sketch
const canvas = document.getElementById('drawHere');
const sketch = {
  'canvas': canvas,
  'ctx': canvas.getContext('2d'),
  'SHOW_DOTS': 0.7,
  'V_MOD': 0.5,
  'V_BOOST': 1,
  'NUM_DOTS': 0,
  'SECTOR_RES': 0,
  'V_SECTORS': 0,
  'H_SECTORS': 0,
  'V_OVERFLOW': 0,
  'H_OVERFLOW': 0,
  'cnvW': 0,
  'cnvW': 0,
  'frameNum': 0,
  'sectors': [],
  'dots': [],
  'velocityMult': 0.5,
  'CANVAS_ACTIVE': false,
  'IGNORE_NEXT_BOOST': false,
  'NEEDS_INIT': true,
};
sketch.ctx.filter = 'url(#remove-alpha)';

function init() {
  let pr = sketch.canvas.parentElement.getBoundingClientRect();
  sketch.cnvW = sketch.canvas.width = pr.width;
  sketch.cnvH = sketch.canvas.height = pr.height;
  setupSectors(sketch);
  setupDots(sketch);
  sketch.NEEDS_INIT = false;
}

function drawFrame() {
  try {
    // check if we need to re-init (e.g. on page resize)
    if (sketch.NEEDS_INIT) {
      init();
    }

    sketch.frameNum++;

    // background
    sketch.ctx.fillStyle = BACKGROUND;
    sketch.ctx.fillRect(0, 0, sketch.cnvW, sketch.cnvH);

    // sectors
    for (let i = 0; i < sketch.H_SECTORS; i++) {
      for (let j = 0; j < sketch.V_SECTORS; j++) {
        sketch.sectors[i][j].run(sketch);
      }
    }

    // dots: velocity
    if (sketch.V_BOOST > 1) {
      sketch.velocityMult = Math.max(Math.abs(sketch.V_MOD), sketch.V_BOOST) * (sketch.V_MOD < 0 ? -1 : 1);
      sketch.V_BOOST = sketch.V_BOOST < V_BOOST_MIN ? 1 : sketch.V_BOOST * V_BOOST_DECAY;
    } else {
      sketch.velocityMult = sketch.V_MOD;
    }
    sketch.velocityMult = Math.max(Math.abs(sketch.velocityMult), V_MIN) * (sketch.velocityMult < 0 ? -1 : 1);
    // dots: number to draw to screen
    let runCount = Math.floor(sketch.dots.length * sketch.SHOW_DOTS);
    // dots: run
    sketch.ctx.fillStyle = '#fff';
    sketch.ctx.beginPath();
    for (let i = 0; i < runCount; i++) {
      sketch.dots[i].update(sketch);
      sketch.dots[i].display(sketch);
    }
    sketch.ctx.fill();
  }
  catch (e) {
    init();
  }
  requestAnimationFrame(drawFrame);
}


class Sector {
  constructor(s, xInd, yInd) {
    this.xInd = xInd;           // x index
    this.yInd = yInd;           // y index
    this.x = xInd * s.SECTOR_RES; // x pos
    this.y = yInd * s.SECTOR_RES; // y pos
    this.n = 0;                 // noise value
  }

  run(s) {
    this.n = (
      NOISE.noise3D(this.xInd * NOISE_XY_INC, this.yInd * NOISE_XY_INC, s.frameNum * NOISE_T_INC) + 1
    ) * 0.5 + 0.2;
  }
}

class Dot {
  initDot(s, fromEdge = false) {
    this.sx = Math.floor(Math.random() * s.sectors.length);    // x sector
    this.sy = Math.floor(Math.random() * s.sectors[0].length); // y sector
    if (fromEdge)
      this.x = s.V_MOD > 0 ? 1 : s.H_SECTORS * s.SECTOR_RES - 1;
    else
      this.x = (this.sx + Math.random()) * s.SECTOR_RES;       // x pos
    this.y = (this.sy + Math.random()) * s.SECTOR_RES;         // y pos
    this.dx = 0.5 + Math.random() * 0.5;                       // x velocity
    this.dy = (Math.random() - 0.5) * 0.5;                     // y velocity
  }

  update(s) {
    this.updateSecCoords(s);
    if (this.sx < 0 || this.sx >= s.sectors.length || this.sy < 0 || this.sy >= s.sectors[0].length) {
      this.initDot(s, true); // OOB, re-init
    }
    this.x += this.dx * s.velocityMult;
    this.y += this.dy * s.velocityMult;
  }

  display(s) {
    const r = s.sectors[this.sx][this.sy].n;
    s.ctx.rect(this.x - r, this.y - r, r * 2, r * 2);
  }

  updateSecCoords(s) {
    this.sx = Math.floor(this.x / s.SECTOR_RES);
    this.sy = Math.floor(this.y / s.SECTOR_RES);
  }
}

// number of sectors = 1 more than can fully fit on the screen
function setupSectors(s) {
  s.sectors = null;
  s.sectors = new Array();
  if (s.cnvW > s.cnvH) {
    s.SECTOR_RES = Math.round(s.cnvW / MAX_SECTORS);
    s.H_SECTORS = MAX_SECTORS + 1;
    s.V_SECTORS = Math.ceil(s.cnvH / s.cnvW * MAX_SECTORS);
  } else {
    s.SECTOR_RES = Math.round(s.cnvH / MAX_SECTORS);
    s.V_SECTORS = MAX_SECTORS + 1;
    s.H_SECTORS = Math.ceil(s.cnvW / s.cnvH * MAX_SECTORS);
  }

  s.H_OVERFLOW = s.H_SECTORS * s.SECTOR_RES - s.cnvW;
  s.V_OVERFLOW = s.V_SECTORS * s.SECTOR_RES - s.cnvH;

  for (let i = 0; i < s.H_SECTORS; i++) {
    s.sectors.push([]);
    for (let j = 0; j < s.V_SECTORS; j++) {
      s.sectors[i].push(new Sector(s, i, j));
    }
  }
}

function setupDots(s) {
  let cnvRes = s.cnvW * s.cnvH;
  let scalePerc = Math.max(Math.min((cnvRes - SCALING.r[0]) / (SCALING.r[1] - SCALING.r[0]), 1), 0);
  s.NUM_DOTS = Math.round(SCALING.n[0] + (SCALING.n[1] - SCALING.n[0]) * scalePerc);

  s.dots = null;
  s.dots = new Array();
  for (let i = 0; i < s.NUM_DOTS; i++) {
    let d = new Dot();
    d.initDot(s);
    s.dots.push(d);
  }
}

window.addEventListener('resize', () => {
  // canvases might need re-init on resize
  let pr = sketch.canvas.parentElement.getBoundingClientRect();
  if (pr.width != sketch.cnvW || pr.height != sketch.cnvH) {
    sketch.NEEDS_INIT = true;
  }
});

window.addEventListener('DOMContentLoaded', () => {
  init();
  handleInputs();
  requestAnimationFrame(drawFrame);
});

/**
 * Wire up event handlers
 */
function handleInputs() {
  // mouse interaction
  sketch.canvas.addEventListener('mousedown', () => sketch.CANVAS_ACTIVE = true);
  sketch.canvas.addEventListener('mouseup', () => sketch.CANVAS_ACTIVE = false);
  sketch.canvas.addEventListener('mousemove', e => {
    setVelocity(sketch, e.offsetX);
    if (sketch.CANVAS_ACTIVE)
      setDotVisibility(sketch, e.offsetY);
  });
  sketch.canvas.addEventListener('touchmove', e => {
    let t = e.changedTouches[e.changedTouches.length - 1];
    let r = sketch.canvas.getBoundingClientRect();
    setVelocity(sketch, Math.min(Math.max(t.pageX - r.left, 0), r.right));
    setDotVisibility(sketch, Math.min(Math.max(t.pageY - r.top, 0), r.bottom));
  });
  sketch.canvas.addEventListener('click', () => {
    if (sketch.IGNORE_NEXT_BOOST) {
      sketch.IGNORE_NEXT_BOOST = false;
    } else {
      sketch.V_BOOST = V_BOOST_INIT;
    }
  });
}

function setVelocity(s, offsetX) {
  let xPosPerc = offsetX / s.cnvW;
  s.V_MOD = V_MOD_RANGE[0] + (V_MOD_RANGE[1] - V_MOD_RANGE[0]) * xPosPerc;
}

function setDotVisibility(s, offsetY) {
  let yPosPerc = 1 - offsetY / s.cnvH;
  s.SHOW_DOTS = SHOW_DOTS_RANGE[0] + (SHOW_DOTS_RANGE[1] - SHOW_DOTS_RANGE[0]) * yPosPerc;
  s.IGNORE_NEXT_BOOST = true;
}