'use strict';

const FRAMERATE = 30;
const SECTOR_RES = 50;
const NUM_DOTS = 3500;
const DOT_MIN_WEIGHT = 1;
const DOT_MAX_WEIGHT = 2;
const DOT_MAX_V = 1;

let V_OVERFLOW = 0;
let H_OVERFLOW = 0;
let V_SECTORS = 0;
let H_SECTORS = 0;

let sectors = [];
let dots = [];
let redoSectors = false;

function setup() {
  H_SECTORS = int(windowWidth / SECTOR_RES) + 1;
  V_SECTORS = int(windowHeight / SECTOR_RES) + 1;
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('drawHere');

  frameRate(FRAMERATE);
  colorMode(HSB, 360, 100, 100, 100);
  rectMode(CENTER);
  noFill();
  setupSectors();
  setupDots();
  background(0, 0, 0, 100);
}

function draw() {
  background(0, 0, 0, 25);
  // recalc sectors after window resize
  if (redoSectors) {
    redoSectors = false;
    setupSectors();
    setupDots();
    background(0, 0, 0, 100);
  }
  try {
    // "centre" the canvas, kind of
    push();
    translate(-(H_OVERFLOW / 2), -(V_OVERFLOW / 2));
    // draw sectors
    strokeWeight(1);
    for (let i = 0; i < H_SECTORS; i++) {
      for (let j = 0; j < V_SECTORS; j++) {
        sectors[i][j].run();
      }
    }
    // draw dots
    for (let i = 0; i < dots.length; i++) {
      dots[i].run();
    }
    pop();
  } catch (error) {
    // sometimes resizing can break things, sort of race condition-y. Lazy reset and continue
    redoSectors = true;
  }
}

class Sector {
  constructor(xInd, yInd) {
    this.xInd = xInd;           // x index
    this.yInd = yInd;           // y index
    this.x = xInd * SECTOR_RES; // x pos
    this.y = yInd * SECTOR_RES; // y pos
    this.n = 0;                 // noise value
    this.fx = 0;                // x force
    this.fy = 0;                // y force
  }

  run() {
    this.update();
    // this.display();
  }

  update() {
    this.n = (NOISE.noise3D(this.xInd * 0.03, this.yInd * 0.03, frameCount * 0.002) + 1) * PI * 4;
    this.fx = Math.sin(this.n) * 0.1;
    this.fy = Math.cos(this.n) * 0.1;
  }

  display() {
    stroke((this.n % TWO_PI) / TWO_PI * 360, 75, 75, 100);
    push();
    translate(this.x + SECTOR_RES / 2 - SECTOR_RES / 20, this.y + SECTOR_RES / 2);
    rotate(this.n);
    rect(0, 0, SECTOR_RES / 10, SECTOR_RES - 2);
    pop();
  }
}

class Dot {
  constructor() {
    this.special = false; // who will be one of the chosen few?
    this.h = 0;           // hue
    this.s = 0;           // saturation
    this.init();
  }

  init() {
    this.x = random(0, width);                                    // x pos
    this.y = random(0, height);                                   // y pos
    this.w = random(DOT_MIN_WEIGHT, DOT_MAX_WEIGHT);              // stroke weight
    this.b = random((this.special ? 80 : 20), 100);               // brightness
    this.updateSecCoords();                                       // get sector coords (this.sx, this.sy)
    this.dx = sectors[this.sx][this.sy].fx + Math.random() - 0.5; // x velocity
    this.dy = sectors[this.sx][this.sy].fy + Math.random() - 0.5; // y velocity
  }

  run() {
    this.update();
    this.display();
  }

  update() {
    this.updateSecCoords();
    if (this.sx < 0 || this.sx >= sectors.length || this.sy < 0 || this.sy >= sectors[0].length) {
      this.init(); // OOB, re-init
    }
    this.dx = constrain(this.dx * 0.994 + sectors[this.sx][this.sy].fx * 0.095 /* + (Math.random() - 0.5) * 0.085 */, -DOT_MAX_V, DOT_MAX_V);
    this.dy = constrain(this.dy * 0.994 + sectors[this.sx][this.sy].fy * 0.095 /* + (Math.random() - 0.5) * 0.085 */, -DOT_MAX_V, DOT_MAX_V);
    this.x += this.dx;
    this.y += this.dy;

    if (this.special) { this.h = (this.h + 1) % 360; } // 🌈
  }

  display() {
    stroke(this.h, this.s, this.b);
    strokeWeight(this.w);
    point(this.x, this.y)
  }

  updateSecCoords() {
    this.sx = Math.floor(this.x / SECTOR_RES);
    this.sy = Math.floor(this.y / SECTOR_RES);
  }

  imSpecial() {
    this.special = true;
    this.h = random(0, 360);
    this.s = random(80, 100);
    this.b = random(80, 100);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redoSectors = true; // flags sectors for redraw after current draw cycle is finished
}

// number of sectors = 1 more than can fully fit on the screen
function setupSectors() {
  sectors = [];
  H_SECTORS = int(windowWidth / SECTOR_RES) + 1;
  V_SECTORS = int(windowHeight / SECTOR_RES) + 1;
  H_OVERFLOW = SECTOR_RES - (windowWidth % SECTOR_RES);
  V_OVERFLOW = SECTOR_RES - (windowHeight % SECTOR_RES);
  for (let i = 0; i < H_SECTORS; i++) {
    sectors.push([]);
    for (let j = 0; j < V_SECTORS; j++) {
      sectors[i].push(new Sector(i, j));
    }
  }
}

function setupDots() {
  dots = [];
  for (let i = 0; i < NUM_DOTS; i++) {
    dots.push(new Dot());
  }

  // special dots (above other dots)
  let numSpecial = Math.round(NUM_DOTS / 8);
  for (let i = NUM_DOTS - numSpecial; i < NUM_DOTS; i++) {
    dots[i].imSpecial();
  }
}