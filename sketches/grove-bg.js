// Grove background effect — port of grove.py to vanilla JS canvas
'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROWING_DURATION = 400;
const PERCHING_DURATION = 300;
const FADE_DURATION = 60;

const GRASS_DENSITY = 0.85;
const GRASS_MIN_H = 1;
const GRASS_MAX_H = 15;
const FLOWER_DENSITY = 0.20;
const FLOWER_STEM_MIN = 2;
const FLOWER_STEM_MAX = 10;
const TREE_COUNT = 8;
const TREE_TRUNK_MIN = 16;
const TREE_TRUNK_MAX = 56;
const TREE_CANOPY_MIN_R = 8;
const TREE_CANOPY_MAX_R = 22;
const BUSH_COUNT_RANGE = [7, 14];
const BIRD_COUNT_RANGE = [5, 10];
const BIRD_SPEED = 1.0;
const BIRD_FLAP_PERIOD = 8;

const FONT_SIZE = 14;
const LINE_HEIGHT = 1.25;

const VINE_CHAR_TIMER_MIN = 60;
const VINE_CHAR_TIMER_MAX = 120;

const GRASS_CHARS = ['|', '/', '\\', ',', '`'];
const FLOWER_BUD = 'o';
const FLOWER_OPEN = ['*', '@', 'O'];
const VINE_CHARS = ['~', 's', '&'];
const TRUNK_CHAR = '|';
const BARK_CHARS = ['|', '{', '}', ':'];
const CANOPY_CHARS = ['@', '#', '&', '*'];
const BUSH_CHARS = ['#', '&', '@'];
const BIRD_R_HEAD = '>';
const BIRD_L_HEAD = '<';
const BIRD_R_WINGS = ['/', '\\'];
const BIRD_L_WINGS = ['\\', '/'];
const BIRD_PERCH = 'v';

// Colors as [r, g, b, a] normalized 0-1
const GRASS_COLORS = [
  [0.1, 0.6, 0.1, 1.0],
  [0.15, 0.7, 0.15, 1.0],
  [0.05, 0.5, 0.05, 1.0],
  [0.2, 0.65, 0.1, 1.0],
  [0.1, 0.55, 0.2, 1.0],
];
const FLOWER_COLORS = [
  [1.0, 0.3, 0.5, 1.0],
  [1.0, 0.8, 0.1, 1.0],
  [0.6, 0.2, 0.9, 1.0],
  [1.0, 0.5, 0.1, 1.0],
  [0.3, 0.7, 1.0, 1.0],
  [1.0, 1.0, 0.3, 1.0],
];
const BRIGHT_FLOWER_COLORS = [
  [1.0, 0.4, 0.6, 1.0],
  [1.0, 0.9, 0.2, 1.0],
  [0.8, 0.3, 1.0, 1.0],
  [1.0, 0.6, 0.2, 1.0],
  [0.5, 0.9, 1.0, 1.0],
  [1.0, 1.0, 0.5, 1.0],
];
const CANOPY_COLORS = [
  [0.05, 0.45, 0.05, 1.0],
  [0.1, 0.55, 0.1, 1.0],
  [0.15, 0.65, 0.15, 1.0],
  [0.05, 0.35, 0.1, 1.0],
];
const BUSH_COLORS = [
  [0.1, 0.5, 0.05, 1.0],
  [0.05, 0.4, 0.1, 1.0],
  [0.15, 0.55, 0.05, 1.0],
  [0.1, 0.45, 0.15, 1.0],
];
const TRUNK_COLOR = [0.4, 0.25, 0.08, 1.0];
const VINE_COLOR = [0.05, 0.4, 0.1, 1.0];
const BIRD_COLORS = [
  [1.0, 0.3, 0.1, 1.0],
  [0.2, 0.6, 1.0, 1.0],
  [1.0, 0.8, 0.0, 1.0],
  [0.9, 0.3, 0.9, 1.0],
  [0.0, 0.9, 0.7, 1.0],
];

// Mushroom constants
const MUSHROOM_CHARS = ['T', 't'];
const MUSHROOM_COLORS = [
  [0.82, 0.71, 0.55, 1.0],
  [0.8, 0.2, 0.2, 1.0],
  [0.95, 0.90, 0.80, 1.0],
  [0.5, 0.2, 0.6, 1.0],
];

// Critter constants
const SNAIL_CHARS = ['@', '>'];
const CATERPILLAR_CHARS = ['~', '~', '~', '>'];
const CRITTER_COLORS = [
  [1.0, 0.45, 0.1, 1.0],  // vivid orange
  [1.0, 0.85, 0.1, 1.0],  // vivid yellow
  [0.9, 0.2, 0.9, 1.0],   // vivid magenta
];
const CRITTER_SPEED = 0.05;

// Wind constants
const WIND_GUST_CHANCE = 0.30;
const WIND_GUST_INTERVAL_MIN = 60;
const WIND_GUST_INTERVAL_MAX = 150;
const WIND_WAVE_SPEED = 2;
const WIND_DURATION = 20;

// Firefly constants
const FIREFLY_CHARS = ['.', '\u00B7'];
const FIREFLY_COLORS = [
  [1.0, 0.95, 0.3, 1.0],
  [0.6, 0.9, 0.2, 1.0],
  [1.0, 0.8, 0.1, 1.0],
];
const FIREFLY_COUNT_MIN = 8;
const FIREFLY_COUNT_MAX = 20;
const FIREFLY_MAX_SPEED = 0.25;

// Rain constants
const RAIN_DROP_COUNT = 30;
const RAIN_SPEED_MIN = 0.5;
const RAIN_SPEED_MAX = 1.2;
const RAIN_COLOR = [0.5, 0.55, 0.7, 0.6];
const RAIN_SPLASH_CHAR = 'o';
const RAIN_SPLASH_DURATION = 6;

// Butterfly constants
const BUTTERFLY_CHARS = ['*', '~', '+'];
const BUTTERFLY_COLORS = [
  [1.0, 0.4, 0.7, 1.0],
  [0.3, 0.6, 1.0, 1.0],
  [1.0, 0.9, 0.2, 1.0],
  [0.7, 0.3, 0.9, 1.0],
];
const BUTTERFLY_SPEED = 0.3;
const BUTTERFLY_COUNT_MIN = 2;
const BUTTERFLY_COUNT_MAX = 5;
const BUTTERFLY_FLAP_PERIOD = 6;
const BUTTERFLY_LAND_MIN = 30;
const BUTTERFLY_LAND_MAX = 90;

// Flower pattern constants
const PETALS = {
  'N':  ['|', "'", ','],
  'NE': ['/', '.'],
  'E':  ['-', '~', ')'],
  'SE': ['\\', '.', ','],
  'S':  ['|', '.', ','],
  'SW': ['/', '.', "'"],
  'W':  ['-', '~', '('],
  'NW': ['\\', '.', "'"],
};
const CENTERS = ['@', 'o', 'O', '*', '#', '&', '%'];
const SYMMETRIES = {
  'cross':   ['N', 'E', 'S', 'W'],
  'saltire': ['NE', 'SE', 'SW', 'NW'],
  'hex':     ['N', 'NE', 'SE', 'S', 'SW', 'NW'],
  'star':    ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  'tri':     ['N', 'SW', 'SE'],
  'asym5':   ['N', 'NE', 'E', 'S', 'W'],
};
const POS_3 = {
  'NW': [0,0], 'N': [0,1], 'NE': [0,2],
  'W':  [1,0],              'E':  [1,2],
  'SW': [2,0], 'S': [2,1], 'SE': [2,2],
};
const POS_5_OUTER = {
  'N':  [0,2], 'NE': [0,4], 'E':  [2,4], 'SE': [4,4],
  'S':  [4,2], 'SW': [4,0], 'W':  [2,0], 'NW': [0,0],
};
const POS_5_MID_DIAG = {
  'NE': [1,3], 'SE': [3,3], 'SW': [3,1], 'NW': [1,1],
};

const Phase = Object.freeze({ IDLE: 0, GROWING: 1, PERCHING: 2, FADING: 3, DONE: 4 });

// ---------------------------------------------------------------------------
// Color helper
// ---------------------------------------------------------------------------

function rgba(c, alpha = 1) {
  return `rgba(${c[0]*255|0},${c[1]*255|0},${c[2]*255|0},${c[3]*alpha})`;
}

// ---------------------------------------------------------------------------
// Rng — mulberry32
// ---------------------------------------------------------------------------

class Rng {
  constructor(seed) {
    this._s = seed >>> 0;
  }
  _next() {
    let t = (this._s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  random() { return this._next(); }
  randint(a, b) { return a + Math.floor(this._next() * (b - a + 1)); }
  uniform(a, b) { return a + this._next() * (b - a); }
  choice(arr) { return arr[Math.floor(this._next() * arr.length)]; }
  sample(arrLen, k) {
    const indices = Array.from({ length: arrLen }, (_, i) => i);
    for (let i = arrLen - 1; i > arrLen - 1 - k; i--) {
      const j = Math.floor(this._next() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(arrLen - k);
  }
  choices(arr, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this._next() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= weights[i];
      if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  }
}

// ---------------------------------------------------------------------------
// GroveBg
// ---------------------------------------------------------------------------

class GroveBg {
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._rng = new Rng(Date.now());
    this._phase = Phase.IDLE;
    this._tick = 0;
    this._phaseStart = 0;
    this._fadeStartTick = -1;
    this._cols = 0;
    this._rows = 0;
    this._charW = 0;
    this._charH = 0;
    this._idleUntil = 60;
    this._grass = [];
    this._flowers = [];
    this._vines = [];
    this._trees = [];
    this._bushes = [];
    this._birds = [];
    this._attachedFlowers = [];
    this._mushrooms = [];
    this._critters = [];
    this._fireflies = [];
    this._leaves = [];
    this._butterflies = [];
    this._rainDrops = [];
    this._rainSplashes = [];
    this._hasRain = false;
    this._wind = { active: false, direction: 0, waveFrontX: 0, startTick: 0, nextGustTick: 0 };
  }

  _initGrid() {
    const dpr = window.devicePixelRatio || 1;
    const w = this._canvas.offsetWidth;
    const h = this._canvas.offsetHeight;
    this._canvas.width = w * dpr;
    this._canvas.height = h * dpr;
    const ctx = this._ctx;
    ctx.font = `${FONT_SIZE * dpr}px monospace`;
    this._charW = ctx.measureText('M').width;
    this._charH = FONT_SIZE * dpr * LINE_HEIGHT;
    this._cols = Math.floor(this._canvas.width / this._charW);
    this._rows = Math.floor(this._canvas.height / this._charH);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
  }

  _startEffect() {
    this._initScene();
    this._phase = Phase.GROWING;
    this._phaseStart = this._tick;
  }

  _resetState() {
    this._grass = [];
    this._flowers = [];
    this._vines = [];
    this._trees = [];
    this._bushes = [];
    this._birds = [];
    this._attachedFlowers = [];
    this._mushrooms = [];
    this._critters = [];
    this._fireflies = [];
    this._leaves = [];
    this._butterflies = [];
    this._rainDrops = [];
    this._rainSplashes = [];
    this._hasRain = false;
    this._wind = { active: false, direction: 0, waveFrontX: 0, startTick: 0, nextGustTick: 0 };
    this._phaseStart = 0;
    this._fadeStartTick = -1;
  }

  _initScene() {
    const w = this._cols;
    const h = this._rows;
    const baseY = h - 1;
    const trunkMax = Math.min(TREE_TRUNK_MAX, h - 2);

    // Grass
    this._grass = [];
    const grassCount = Math.min(w, Math.floor(w * GRASS_DENSITY));
    const grassCols = this._rng.sample(w, grassCount).sort((a, b) => a - b);
    for (const x of grassCols) {
      const targetH = this._rng.randint(GRASS_MIN_H, Math.min(GRASS_MAX_H, h - 1));
      const chars = Array.from({ length: targetH }, () => this._rng.choice(GRASS_CHARS));
      const color = this._rng.choice(GRASS_COLORS);
      const delay = this._rng.randint(0, 80);
      this._grass.push({ x, baseY, targetH, currentH: 0, growDelay: delay, chars, color });
    }

    // Flowers
    this._flowers = [];
    const flowerCount = Math.max(1, Math.floor(w * FLOWER_DENSITY));
    const flowerXs = this._rng.sample(w, Math.min(w, flowerCount));
    for (const x of flowerXs) {
      const stemTarget = this._rng.randint(FLOWER_STEM_MIN, Math.min(FLOWER_STEM_MAX, h - 1));
      const bloomDelay = this._rng.randint(0, 30);
      const color = this._rng.choice(FLOWER_COLORS);
      const size = this._rng.choices(['tiny', '3x3', '5x5'], [2, 5, 3]);
      this._flowers.push({ x, baseY, stemTarget, stemCurrent: 0, bloomStage: 0, bloomDelay, color, size, pattern: null, bloomTick: 0 });
    }

    // Trees
    this._trees = [];
    const treeCount = Math.min(TREE_COUNT, Math.max(1, Math.floor(w / 9)));
    const band = Math.max(1, Math.floor(w / (treeCount + 1)));
    for (let i = 0; i < treeCount; i++) {
      let tx = band * (i + 1) + this._rng.randint(-Math.floor(band / 3), Math.floor(band / 3));
      tx = Math.max(0, Math.min(w - 1, tx));
      const trunkTarget = this._rng.randint(TREE_TRUNK_MIN, Math.max(TREE_TRUNK_MIN, trunkMax));
      const canopyR = this._rng.randint(TREE_CANOPY_MIN_R, Math.min(TREE_CANOPY_MAX_R, Math.floor(w / 3)));
      const canopyColor = this._rng.choice(CANOPY_COLORS);
      const trunkWidth = this._rng.choices([2, 3, 4], [2, 4, 3]);
      const trunkOffsets = [0];
      for (let j = 0; j < trunkTarget - 1; j++) {
        const drift = this._rng.choices([-1, 0, 1], [1, 3, 1]);
        const newOff = Math.max(-3, Math.min(3, trunkOffsets[trunkOffsets.length - 1] + drift));
        trunkOffsets.push(newOff);
      }
      const canopyNoise = Array.from({ length: 16 }, () => this._rng.uniform(0.7, 1.1));
      this._trees.push({
        x: tx, baseY, trunkTarget, trunkCurrent: 0,
        canopyRTarget: canopyR, canopyRCurrent: 0,
        growDelay: this._rng.randint(0, 20),
        trunkColor: TRUNK_COLOR, canopyColor,
        branchY: baseY, trunkWidth,
        canopyFlowersSpawned: false,
        trunkOffsets, canopyNoise, canopyCx: tx,
      });
    }

    // Bushes
    this._bushes = [];
    const bushCount = this._rng.randint(BUSH_COUNT_RANGE[0], BUSH_COUNT_RANGE[1]);
    for (const tree of this._trees) {
      const offset = this._rng.randint(-4, 4);
      const bx = Math.max(2, Math.min(w - 3, tree.x + offset));
      const wTarget = this._rng.randint(5, 11);
      const hTarget = this._rng.randint(2, 5);
      const color = this._rng.choice(BUSH_COLORS);
      const delay = this._rng.randint(0, 30);
      this._bushes.push({ cx: bx, baseY, wTarget, hTarget, wCurrent: 0, hCurrent: 0, growDelay: delay, color });
    }
    const extraBushes = Math.max(0, bushCount - this._trees.length);
    for (let i = 0; i < extraBushes; i++) {
      const bx = this._rng.randint(2, Math.max(2, w - 3));
      const wTarget = this._rng.randint(3, 7);
      const hTarget = this._rng.randint(2, 4);
      const color = this._rng.choice(BUSH_COLORS);
      const delay = this._rng.randint(0, 40);
      this._bushes.push({ cx: bx, baseY, wTarget, hTarget, wCurrent: 0, hCurrent: 0, growDelay: delay, color });
    }

    // Vines
    this._vines = [];
    const sortedTrees = [...this._trees].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sortedTrees.length - 1; i++) {
      const path = this._buildVinePath(sortedTrees[i], sortedTrees[i + 1]);
      const growInterval = this._rng.randint(3, 7);
      const growDelay = this._rng.randint(10, 50);
      const cellChars = path.map(() => this._rng.choice(VINE_CHARS));
      const cellTimers = path.map(() => this._rng.randint(VINE_CHAR_TIMER_MIN, VINE_CHAR_TIMER_MAX));
      this._vines.push({ path, currentLen: 0, growDelay, growInterval, lastGrowTick: 0, color: VINE_COLOR, cellChars, cellTimers });
    }

    // Birds
    this._birds = [];
    const birdCount = this._rng.randint(BIRD_COUNT_RANGE[0], BIRD_COUNT_RANGE[1]);
    for (let i = 0; i < birdCount; i++) {
      const tree = this._trees[i % this._trees.length];
      const goingLeft = this._rng.random() < 0.5;
      const fx = goingLeft ? w + 2.0 : -2.0;
      const fy = this._rng.randint(0, Math.max(0, Math.floor(h / 2)));
      const targetX = tree.x;
      const targetY = Math.max(0, tree.baseY - tree.trunkTarget - Math.floor(tree.canopyRTarget / 2));
      const color = this._rng.choice(BIRD_COLORS);
      const spawnTick = this._rng.randint(0, 60);
      this._birds.push({
        fx, fy, targetX, targetY,
        speed: BIRD_SPEED + this._rng.uniform(-0.3, 0.3),
        perched: false, goingLeft, color, spawnTick,
      });
    }

    this._attachedFlowers = [];

    // Rain flag (~12% of cycles)
    this._hasRain = this._rng.random() < 0.12;

    // Mushrooms: 2-5 per tree, near trunk base
    this._mushrooms = [];
    for (const tree of this._trees) {
      const halfW = Math.floor(tree.trunkWidth / 2);
      const count = this._rng.randint(2, 5);
      for (let i = 0; i < count; i++) {
        const offset = this._rng.randint(1, halfW + 2) * (this._rng.random() < 0.5 ? -1 : 1);
        this._mushrooms.push({
          x: Math.max(0, Math.min(w - 1, tree.x + offset)),
          baseY: baseY,
          char: this._rng.choice(MUSHROOM_CHARS),
          color: this._rng.choice(MUSHROOM_COLORS),
          growDelay: this._rng.randint(150, 300),
          visible: false,
        });
      }
    }

    // Crawling critters: 1-2 on random trees
    this._critters = [];
    const critterCount = this._rng.randint(1, 2);
    const critterTreeIdxs = this._rng.sample(this._trees.length, Math.min(critterCount, this._trees.length));
    for (const idx of critterTreeIdxs) {
      const tree = this._trees[idx];
      const type = this._rng.random() < 0.5 ? 'snail' : 'caterpillar';
      const targetY = tree.baseY - this._rng.randint(Math.floor(tree.trunkTarget * 0.3), Math.floor(tree.trunkTarget * 0.7));
      this._critters.push({
        treeIdx: idx,
        type,
        color: this._rng.choice(CRITTER_COLORS),
        fy: tree.baseY,
        targetY: Math.max(0, targetY),
        speed: CRITTER_SPEED,
        side: this._rng.random() < 0.5 ? -1 : 1,
        reached: false,
      });
    }

    // Wind state
    this._wind = { active: false, direction: 0, waveFrontX: 0, startTick: 0, nextGustTick: this._rng.randint(WIND_GUST_INTERVAL_MIN, WIND_GUST_INTERVAL_MAX) };

    // Fireflies (only if no rain)
    this._fireflies = [];
    if (!this._hasRain) {
      const ffCount = this._rng.randint(FIREFLY_COUNT_MIN, FIREFLY_COUNT_MAX);
      for (let i = 0; i < ffCount; i++) {
        const fx = this._rng.randint(0, w - 1);
        const spawnY = baseY - this._rng.randint(0, 3);
        this._fireflies.push({
          fx, fy: spawnY,
          color: this._rng.choice(FIREFLY_COLORS),
          char: this._rng.choice(FIREFLY_CHARS),
          spawnDelay: this._rng.randint(0, 120),
          vx: this._rng.uniform(-0.15, 0.15),
          vy: this._rng.uniform(-0.15, 0.05),
          alive: true,
        });
      }
    }

    // Falling leaves — spawned lazily when each tree's canopy finishes growing
    this._leaves = [];

    // Rain drops (only if _hasRain)
    this._rainDrops = [];
    this._rainSplashes = [];
    if (this._hasRain) {
      for (let i = 0; i < RAIN_DROP_COUNT; i++) {
        this._rainDrops.push({
          x: this._rng.randint(0, w - 1),
          fy: this._rng.uniform(-h, 0),
          speed: this._rng.uniform(RAIN_SPEED_MIN, RAIN_SPEED_MAX),
          char: '|',
          active: false,
        });
      }
    }

    // Butterflies (only if no rain)
    this._butterflies = [];
    if (!this._hasRain) {
      const bfCount = this._rng.randint(BUTTERFLY_COUNT_MIN, BUTTERFLY_COUNT_MAX);
      for (let i = 0; i < bfCount; i++) {
        this._butterflies.push({
          fx: this._rng.uniform(0, w - 1),
          fy: this._rng.uniform(0, Math.floor(h / 2)),
          targetFlowerIdx: -1,
          color: this._rng.choice(BUTTERFLY_COLORS),
          charIdx: this._rng.randint(0, BUTTERFLY_CHARS.length - 1),
          state: 'flying',
          landedTick: 0,
          landDuration: this._rng.randint(BUTTERFLY_LAND_MIN, BUTTERFLY_LAND_MAX),
          sineOffset: this._rng.uniform(0, Math.PI * 2),
        });
      }
    }
  }

  _buildVinePath(t1, t2) {
    const h = this._rows;
    const w = this._cols;
    const path = [];
    const y1Top = Math.max(0, t1.baseY - t1.trunkTarget);
    for (let y = t1.baseY; y >= y1Top; y--) {
      path.push([t1.x, y]);
    }
    const y2Top = Math.max(0, t2.baseY - t2.trunkTarget);
    const steps = Math.abs(t2.x - t1.x);
    if (steps > 0) {
      const sag = Math.min(Math.floor(h / 5), 8) + this._rng.randint(0, 3);
      const direction = t2.x > t1.x ? 1 : -1;
      for (let i = 1; i <= steps; i++) {
        const tFrac = i / steps;
        const yLerp = y1Top + (y2Top - y1Top) * tFrac;
        const sagY = sag * 4 * tFrac * (1 - tFrac);
        let y = Math.floor(yLerp + sagY);
        y = Math.max(0, Math.min(h - 1, y));
        const x = Math.max(0, Math.min(w - 1, t1.x + i * direction));
        path.push([x, y]);
      }
    }
    return path;
  }

  _generateFlowerPattern(flower) {
    if (flower.size === 'tiny') {
      return [[0, 0, this._rng.choice(FLOWER_OPEN)]];
    }
    if (flower.size === '3x3') {
      const symName = this._rng.choice(Object.keys(SYMMETRIES));
      const center = this._rng.choice(CENTERS);
      const offsets = [[0, 0, center]];
      for (const d of SYMMETRIES[symName]) {
        const [r, c] = POS_3[d];
        const dr = r - 1;
        const dc = c - 1;
        offsets.push([dc, dr, this._rng.choice(PETALS[d])]);
      }
      return offsets;
    }
    // 5x5
    const center = this._rng.choice(CENTERS);
    const offsets = [[0, 0, center]];
    const innerSym = this._rng.choice(Object.keys(SYMMETRIES));
    for (const d of SYMMETRIES[innerSym]) {
      const [r, c] = POS_3[d];
      const dr = (r + 1) - 2;
      const dc = (c + 1) - 2;
      offsets.push([dc, dr, this._rng.choice(PETALS[d])]);
    }
    const outerSym = this._rng.choice(['cross', 'saltire', 'star']);
    for (const d of SYMMETRIES[outerSym]) {
      const [r, c] = POS_5_OUTER[d];
      const dr = r - 2;
      const dc = c - 2;
      offsets.push([dc, dr, this._rng.choice(PETALS[d])]);
    }
    for (const d of ['NE', 'SE', 'SW', 'NW']) {
      if (SYMMETRIES[innerSym].includes(d) && SYMMETRIES[outerSym].includes(d)) {
        const [r, c] = POS_5_MID_DIAG[d];
        offsets.push([c - 2, r - 2, this._rng.choice(PETALS[d])]);
      }
    }
    return offsets;
  }

  _growStemsTick() {
    const t = this._tick;
    const phT = t - this._phaseStart;

    for (const g of this._grass) {
      if (t >= g.growDelay && g.currentH < g.targetH) {
        if ((t - g.growDelay - 1) % 4 === 0) g.currentH++;
      }
    }

    for (const f of this._flowers) {
      if (f.stemCurrent < f.stemTarget) {
        if (t % 5 === 0) f.stemCurrent++;
      } else if (f.bloomStage === 0) {
        if (f.bloomTick === 0) f.bloomTick = t;
        if (t - f.bloomTick >= f.bloomDelay) {
          f.bloomStage = 1;
          f.bloomTick = t;
        }
      } else if (f.bloomStage === 1 && t - f.bloomTick >= 20) {
        f.bloomStage = 2;
        f.pattern = this._generateFlowerPattern(f);
      }
    }

    for (const v of this._vines) {
      if (phT >= v.growDelay && v.currentLen < v.path.length) {
        if (phT - v.lastGrowTick >= v.growInterval) {
          const oldLen = v.currentLen;
          v.currentLen++;
          v.lastGrowTick = phT;
          if (this._rng.random() < 0.15) {
            const [px, py] = v.path[oldLen];
            const color = this._rng.choice(BRIGHT_FLOWER_COLORS);
            const size = this._rng.choices(['tiny', '3x3'], [3, 2]);
            this._attachedFlowers.push({ x: px, baseY: py, stemTarget: 0, stemCurrent: 0, bloomStage: 1, bloomDelay: 0, color, size, pattern: null, bloomTick: t });
          }
        }
      }
    }

    this._updateVineChars();
  }

  _growTreesBushesTick() {
    const t = this._tick;
    const phT = t - this._phaseStart;
    for (const tree of this._trees) {
      if (phT < tree.growDelay) continue;
      const localT = phT - tree.growDelay;
      if (tree.trunkCurrent < tree.trunkTarget) {
        if (localT % 3 === 0) {
          tree.trunkCurrent++;
          tree.branchY = tree.baseY - tree.trunkCurrent;
          if (tree.trunkOffsets.length > 0) {
            tree.canopyCx = tree.x + tree.trunkOffsets[tree.trunkCurrent - 1];
          }
        }
      } else if (tree.canopyRCurrent < tree.canopyRTarget) {
        const trunkDoneT = tree.trunkTarget * 3;
        const canopyT = localT - trunkDoneT;
        if (canopyT > 0 && canopyT % 5 === 0) tree.canopyRCurrent++;
      }
      if (tree.canopyRCurrent === tree.canopyRTarget && tree.canopyRCurrent > 0 && !tree.canopyFlowersSpawned) {
        tree.canopyFlowersSpawned = true;
        this._spawnCanopyFlowers(tree);
        this._spawnCanopyLeaves(tree);
      }
    }

    for (const bush of this._bushes) {
      if (phT < bush.growDelay) continue;
      const localT = phT - bush.growDelay;
      if (localT % 4 === 0) {
        if (bush.wCurrent < bush.wTarget) bush.wCurrent++;
        if (bush.hCurrent < bush.hTarget) bush.hCurrent++;
      }
    }
  }

  _spawnCanopyFlowers(tree) {
    const count = this._rng.randint(3, 6);
    const r = tree.canopyRCurrent;
    const centerY = tree.branchY;
    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const dx = this._rng.randint(-r, r);
        const dy = this._rng.randint(-Math.floor(r * 0.7), Math.floor(r * 0.7));
        if (r > 0 && ((dx / r) ** 2 + (dy / (r * 0.7 + 0.01)) ** 2) <= 1.0) {
          const fx = tree.canopyCx + dx;
          const fy = centerY + dy;
          if (fx >= 0 && fx < this._cols && fy >= 0 && fy < this._rows) {
            const color = this._rng.choice(BRIGHT_FLOWER_COLORS);
            const size = this._rng.choices(['tiny', '3x3'], [3, 2]);
            this._attachedFlowers.push({ x: fx, baseY: fy, stemTarget: 0, stemCurrent: 0, bloomStage: 1, bloomDelay: 0, color, size, pattern: null, bloomTick: this._tick });
            break;
          }
        }
      }
    }
  }

  _spawnCanopyLeaves(tree) {
    const count = this._rng.randint(3, 6);
    const r = tree.canopyRCurrent;
    const ry = Math.max(1, Math.floor(r * 0.7));
    const centerY = tree.branchY;
    for (let i = 0; i < count; i++) {
      // Spread across the width of the canopy, spawn at the bottom edge of the ellipse
      const dx = this._rng.randint(-(r - 1), r - 1);
      const normDx = dx / Math.max(1, r);
      const dy = Math.floor(ry * Math.sqrt(Math.max(0, 1 - normDx * normDx)));
      const sx = tree.canopyCx + dx;
      const sy = centerY + dy;
      if (sx >= 0 && sx < this._cols && sy >= 0 && sy < this._rows) {
        const period = this._rng.uniform(1.5, 4);
        this._leaves.push({
          spawnX: sx, spawnY: sy, groundY: tree.baseY,
          fy: 0,
          color: tree.canopyColor,
          charIdx: this._rng.randint(0, CANOPY_CHARS.length - 1),
          lastCharTick: 0,
          fallRate: this._rng.uniform(0.08, 0.2),
          period,
          hAmplitude: this._rng.uniform(0.75, 2.25) * (1 + period * 0.7),
          vAmplitude: this._rng.uniform(0.3, 0.6) * (1 + period * 0.4),
          spawnDelay: this._rng.randint(0, 250),
          alive: true,
          drawX: sx, drawY: sy,
          state: 'canopy',
        });
      }
    }
  }

  _updateVineChars() {
    for (const v of this._vines) {
      const limit = Math.min(v.currentLen, v.cellTimers.length);
      for (let i = 0; i < limit; i++) {
        v.cellTimers[i]--;
        if (v.cellTimers[i] <= 0) {
          v.cellChars[i] = this._rng.choice(VINE_CHARS);
          v.cellTimers[i] = this._rng.randint(VINE_CHAR_TIMER_MIN, VINE_CHAR_TIMER_MAX);
        }
      }
    }
  }

  _bloomAttachedFlowersTick() {
    const t = this._tick;
    for (const f of this._attachedFlowers) {
      if (f.bloomStage === 1 && t - f.bloomTick >= 30) {
        f.bloomStage = 2;
        f.pattern = this._generateFlowerPattern(f);
      }
    }
  }

  _mushroomsTick() {
    const phT = this._tick - this._phaseStart;
    for (const m of this._mushrooms) {
      if (!m.visible && phT >= m.growDelay) m.visible = true;
    }
  }

  _crittersTick() {
    for (const c of this._critters) {
      if (c.reached) continue;
      const tree = this._trees[c.treeIdx];
      if (!tree) continue;
      c.fy -= c.speed;
      if (c.fy <= c.targetY) {
        c.fy = c.targetY;
        c.reached = true;
      }
    }
  }

  _windTick() {
    const phT = this._tick - this._phaseStart;
    const w = this._wind;
    if (w.active) {
      w.waveFrontX += WIND_WAVE_SPEED * w.direction;
      if (w.waveFrontX < -WIND_DURATION * WIND_WAVE_SPEED || w.waveFrontX > this._cols + WIND_DURATION * WIND_WAVE_SPEED) {
        w.active = false;
      }
    } else if (phT >= w.nextGustTick) {
      if (this._rng.random() < WIND_GUST_CHANCE) {
        w.active = true;
        w.direction = this._rng.random() < 0.5 ? -1 : 1;
        w.waveFrontX = w.direction > 0 ? 0 : this._cols - 1;
        w.startTick = phT;
      }
      w.nextGustTick = phT + this._rng.randint(WIND_GUST_INTERVAL_MIN, WIND_GUST_INTERVAL_MAX);
    }
  }

  _getWindOffset(x) {
    const w = this._wind;
    if (!w.active) return 0;
    const tail = w.waveFrontX - WIND_DURATION * WIND_WAVE_SPEED * w.direction;
    const lo = Math.min(w.waveFrontX, tail);
    const hi = Math.max(w.waveFrontX, tail);
    if (x >= lo && x <= hi) return w.direction;
    return 0;
  }

  _firefliesTick() {
    const phT = this._tick - this._phaseStart;
    for (const ff of this._fireflies) {
      if (!ff.alive) continue;
      if (phT < ff.spawnDelay) continue;
      ff.vx += this._rng.uniform(-0.04, 0.04);
      ff.vy += this._rng.uniform(-0.04, 0.04);
      const speed = Math.sqrt(ff.vx * ff.vx + ff.vy * ff.vy);
      if (speed > FIREFLY_MAX_SPEED) {
        ff.vx = (ff.vx / speed) * FIREFLY_MAX_SPEED;
        ff.vy = (ff.vy / speed) * FIREFLY_MAX_SPEED;
      }
      ff.fx += ff.vx + this._getWindOffset(Math.round(ff.fx)) * 0.5;
      ff.fy += ff.vy;
      if (ff.fx < 0) { ff.fx = 0; ff.vx = Math.abs(ff.vx); }
      if (ff.fx >= this._cols) { ff.fx = this._cols - 1; ff.vx = -Math.abs(ff.vx); }
      if (ff.fy < 0) ff.alive = false;
      if (ff.fy >= this._rows) { ff.fy = this._rows - 1; ff.vy = -Math.abs(ff.vy); }
    }
  }

  _leavesTick() {
    const phT = this._tick - this._phaseStart;
    const t = this._tick;
    for (const lf of this._leaves) {
      if (!lf.alive) continue;
      if (lf.state === 'canopy') {
        if (this._phase === Phase.PERCHING && phT >= lf.spawnDelay) lf.state = 'falling';
        continue;
      }
      lf.fy += lf.fallRate;
      const distance = lf.fy;
      const xOffset = Math.sin(distance / lf.period) * lf.hAmplitude + this._getWindOffset(Math.round(lf.spawnX));
      const yOffset = (Math.cos((2 * distance / lf.period) + Math.PI) * lf.vAmplitude) + lf.vAmplitude;
      lf.drawX = Math.round(lf.spawnX + xOffset);
      lf.drawY = Math.round(lf.spawnY + lf.fy + yOffset);
      if (t - lf.lastCharTick >= 8) {
        lf.charIdx = (lf.charIdx + 1) % CANOPY_CHARS.length;
        lf.lastCharTick = t;
      }
      if (lf.drawY >= lf.groundY - 2) lf.alive = false;
    }
  }

  _rainTick() {
    if (!this._hasRain) return;
    const w = this._cols;
    const h = this._rows;
    const baseY = h - 1;
    const t = this._tick;
    for (const drop of this._rainDrops) {
      if (!drop.active) {
        drop.active = true;
        drop.x = this._rng.randint(0, w - 1);
        drop.fy = this._rng.uniform(-5, 0);
        drop.speed = this._rng.uniform(RAIN_SPEED_MIN, RAIN_SPEED_MAX);
        drop.char = drop.speed > 0.85 ? '|' : ':';
      }
      drop.fy += drop.speed;
      drop.x += this._getWindOffset(drop.x);
      drop.x = Math.max(0, Math.min(w - 1, drop.x));
      if (drop.fy >= baseY) {
        this._rainSplashes.push({ x: drop.x, y: baseY, birthTick: t, duration: RAIN_SPLASH_DURATION });
        drop.active = false;
      }
    }
    this._rainSplashes = this._rainSplashes.filter(s => t - s.birthTick < s.duration);
  }

  _butterfliesTick() {
    const t = this._tick;
    const w = this._cols;
    const h = this._rows;
    const bloomedFlowers = [...this._flowers, ...this._attachedFlowers].filter(f => f.bloomStage === 2);
    for (const bf of this._butterflies) {
      if (bf.state === 'landed') {
        if (t - bf.landedTick >= bf.landDuration) {
          bf.state = 'flying';
          bf.targetFlowerIdx = -1;
        }
        continue;
      }
      // Pick target if needed
      if (bf.targetFlowerIdx < 0 && bloomedFlowers.length > 0) {
        bf.targetFlowerIdx = this._rng.randint(0, bloomedFlowers.length - 1);
      }
      let tx, ty;
      if (bf.targetFlowerIdx >= 0 && bf.targetFlowerIdx < bloomedFlowers.length) {
        const target = bloomedFlowers[bf.targetFlowerIdx];
        tx = target.x;
        ty = target.baseY;
      } else {
        tx = w / 2;
        ty = h / 2;
      }
      const dx = tx - bf.fx;
      const dy = ty - bf.fy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 1.0) {
        bf.fx = tx;
        bf.fy = ty;
        bf.state = 'landed';
        bf.landedTick = t;
        bf.landDuration = this._rng.randint(BUTTERFLY_LAND_MIN, BUTTERFLY_LAND_MAX);
        continue;
      }
      const step = Math.min(BUTTERFLY_SPEED, dist);
      bf.fx += (dx / dist) * step + this._rng.uniform(-0.2, 0.2) + this._getWindOffset(Math.round(bf.fx)) * 0.3;
      bf.fy += (dy / dist) * step + Math.sin(t / 10 + bf.sineOffset) * 0.15;
      bf.fx = Math.max(0, Math.min(w - 1, bf.fx));
      bf.fy = Math.max(0, Math.min(h - 1, bf.fy));
      if (t % BUTTERFLY_FLAP_PERIOD < BUTTERFLY_FLAP_PERIOD / 2) {
        bf.charIdx = (bf.charIdx + 1) % BUTTERFLY_CHARS.length;
      }
    }
  }

  _perchTick() {
    const t = this._tick;
    const phT = t - this._phaseStart;
    for (let i = 0; i < this._birds.length; i++) {
      const bird = this._birds[i];
      const tree = this._trees[i % this._trees.length];
      bird.targetY = Math.max(0, Math.min(this._rows - 1, tree.branchY));
    }
    for (const bird of this._birds) {
      if (phT < bird.spawnTick) continue;
      if (bird.perched) continue;
      const dx = bird.targetX - bird.fx;
      const dy = bird.targetY - bird.fy;
      const distX = Math.abs(dx);
      const distY = Math.abs(dy);
      if (distX <= 1.0 && distY <= 1.0) {
        bird.fx = bird.targetX;
        bird.fy = bird.targetY;
        bird.perched = true;
        continue;
      }
      bird.fx += Math.min(bird.speed, distX) * (dx > 0 ? 1 : -1);
      bird.fy += Math.min(bird.speed * 0.5, distY) * (dy > 0 ? 1 : -1);
      bird.goingLeft = dx < 0;
      bird.fx = Math.max(-2.0, Math.min(this._cols + 2.0, bird.fx));
      bird.fy = Math.max(0.0, Math.min(this._rows - 1.0, bird.fy));
    }
  }

  _getFadeAlpha() {
    if (this._phase === Phase.FADING) {
      const elapsed = this._tick - this._fadeStartTick;
      return Math.max(0.0, 1.0 - elapsed / FADE_DURATION);
    }
    return 1.0;
  }

  _updatePhase() {
    const t = this._tick;
    if (this._phase === Phase.GROWING) {
      if (t - this._phaseStart >= GROWING_DURATION) {
        this._phase = Phase.PERCHING;
        this._phaseStart = t;
      }
    } else if (this._phase === Phase.PERCHING) {
      if (t - this._phaseStart >= PERCHING_DURATION) {
        this._phase = Phase.FADING;
        this._fadeStartTick = t;
      }
    } else if (this._phase === Phase.FADING) {
      if (this._getFadeAlpha() <= 0.0) {
        this._phase = Phase.DONE;
      }
    }
  }

  _render() {
    const ctx = this._ctx;
    const w = this._cols;
    const h = this._rows;
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    const fadeAlpha = this._getFadeAlpha();

    // Cell buffer: key = y*cols+x, value = [ch, color]
    const buf = new Map();
    const addCell = (x, y, ch, color) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      buf.set(y * w + x, [ch, color]);
    };

    // Grass (wind shifts top char)
    for (const g of this._grass) {
      for (let i = 0; i < g.currentH; i++) {
        const gy = g.baseY - i;
        if (gy >= 0 && gy < h) {
          const isTop = (i === g.currentH - 1);
          const wx = isTop ? g.x + this._getWindOffset(g.x) : g.x;
          addCell(wx, gy, g.chars[Math.min(i, g.chars.length - 1)], g.color);
        }
      }
    }

    // Mushrooms
    for (const m of this._mushrooms) {
      if (m.visible) addCell(m.x, m.baseY, m.char, m.color);
    }

    // Ground flowers
    const stemColor = [0.1, 0.55, 0.1, 1.0];
    for (const f of this._flowers) {
      for (let i = 0; i < f.stemCurrent; i++) {
        addCell(f.x, f.baseY - i, '|', stemColor);
      }
      if (f.stemCurrent > 0 || f.stemTarget === 0) {
        const headY = f.stemTarget > 0 ? f.baseY - f.stemCurrent : f.baseY;
        if (f.bloomStage === 1) {
          addCell(f.x, headY, FLOWER_BUD, f.color);
        } else if (f.bloomStage === 2 && f.pattern) {
          for (const [dx, dy, ch] of f.pattern) addCell(f.x + dx, headY + dy, ch, f.color);
        }
      }
    }

    // Vines
    for (const v of this._vines) {
      for (let i = 0; i < v.currentLen; i++) {
        if (i < v.cellChars.length) {
          const [px, py] = v.path[i];
          addCell(px, py, v.cellChars[i], v.color);
        }
      }
    }

    // Trees
    for (const tree of this._trees) {
      const halfW = Math.floor(tree.trunkWidth / 2);
      for (let i = 0; i < tree.trunkCurrent; i++) {
        const ty = tree.baseY - i;
        const trunkOff = i < tree.trunkOffsets.length ? tree.trunkOffsets[i] : 0;
        for (let dx = -halfW; dx <= halfW; dx++) {
          const tx = tree.x + trunkOff + dx;
          if (dx === 0) {
            addCell(tx, ty, TRUNK_CHAR, tree.trunkColor);
          } else {
            addCell(tx, ty, BARK_CHARS[(tx * 13 + ty * 7) % BARK_CHARS.length], tree.trunkColor);
          }
        }
      }
      if (tree.canopyRCurrent > 0) {
        const ccx = tree.canopyCx;
        const centerY = tree.branchY;
        const r = tree.canopyRCurrent;
        const ry = Math.max(1, Math.floor(r * 0.7));
        const nSectors = tree.canopyNoise.length;
        for (let cy = centerY - ry; cy <= centerY + ry; cy++) {
          for (let cx = ccx - r; cx <= ccx + r; cx++) {
            if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
            const dxF = (cx - ccx) / Math.max(1, r);
            const dyF = (cy - centerY) / Math.max(1, ry);
            const distSq = dxF * dxF + dyF * dyF;
            let noise = 1.0;
            if (nSectors > 0) {
              const angle = Math.atan2(dyF, dxF);
              const sector = (angle + Math.PI) / (2 * Math.PI) * nSectors;
              const s0 = Math.floor(sector) % nSectors;
              const s1 = (s0 + 1) % nSectors;
              const frac = sector - Math.floor(sector);
              noise = tree.canopyNoise[s0] * (1 - frac) + tree.canopyNoise[s1] * frac;
            }
            const threshold = noise * noise;
            if (distSq <= threshold) {
              addCell(cx, cy, CANOPY_CHARS[(cx + cy * 31) % CANOPY_CHARS.length], tree.canopyColor);
            } else if (distSq <= threshold * 1.15) {
              if (((cx * 17 + cy * 23) % 100) < 50) {
                addCell(cx, cy, CANOPY_CHARS[(cx + cy * 31) % CANOPY_CHARS.length], tree.canopyColor);
              }
            }
          }
        }
      }
    }

    // Falling leaves
    for (const lf of this._leaves) {
      if (!lf.alive) continue;
      if (lf.state === 'canopy') {
        addCell(lf.spawnX, lf.spawnY, CANOPY_CHARS[lf.charIdx], lf.color);
      } else {
        addCell(lf.drawX, lf.drawY, CANOPY_CHARS[lf.charIdx], lf.color);
      }
    }

    // Bushes
    for (const bush of this._bushes) {
      if (bush.wCurrent <= 0 || bush.hCurrent <= 0) continue;
      for (let dy = 0; dy < bush.hCurrent; dy++) {
        for (let dx = -bush.wCurrent; dx <= bush.wCurrent; dx++) {
          const bx = bush.cx + dx;
          const by = bush.baseY - dy;
          if (bx < 0 || bx >= w || by < 0 || by >= h) continue;
          const normX = Math.abs(dx) / Math.max(1, bush.wCurrent);
          const normY = dy / Math.max(1, bush.hCurrent);
          if (normX + normY <= 1.2) {
            addCell(bx, by, BUSH_CHARS[(bx + by * 7) % BUSH_CHARS.length], bush.color);
          }
        }
      }
    }

    // Attached flowers
    for (const f of this._attachedFlowers) {
      const headY = f.baseY;
      if (f.bloomStage === 1) {
        addCell(f.x, headY, FLOWER_BUD, f.color);
      } else if (f.bloomStage === 2 && f.pattern) {
        for (const [dx, dy, ch] of f.pattern) addCell(f.x + dx, headY + dy, ch, f.color);
      }
    }

    // Critters
    for (const c of this._critters) {
      const tree = this._trees[c.treeIdx];
      if (!tree) continue;
      const charArr = c.type === 'snail' ? SNAIL_CHARS : CATERPILLAR_CHARS;
      const cy = Math.round(c.fy);
      const heightIdx = tree.baseY - cy;
      const trunkOff = (heightIdx >= 0 && heightIdx < tree.trunkOffsets.length) ? tree.trunkOffsets[heightIdx] : 0;
      const halfW = Math.floor(tree.trunkWidth / 2);
      const cx = tree.x + trunkOff + c.side * (halfW + 1);
      for (let j = 0; j < charArr.length; j++) {
        addCell(cx, cy + j, charArr[j], c.color);
      }
    }

    // Butterflies (not during GROWING — they spawn at random positions and don't move yet)
    if (this._phase !== Phase.GROWING) {
      for (const bf of this._butterflies) {
        const bx = Math.round(bf.fx);
        const by = Math.round(bf.fy);
        addCell(bx, by, BUTTERFLY_CHARS[bf.charIdx], bf.color);
      }
    }

    // Birds
    for (const bird of this._birds) {
      const bx = Math.round(bird.fx);
      const by = Math.round(bird.fy);
      if (by < 0 || by >= h) continue;
      if (bird.perched) {
        addCell(bx, by, BIRD_PERCH, bird.color);
      } else {
        const flap = (this._tick + bird.spawnTick) % BIRD_FLAP_PERIOD < BIRD_FLAP_PERIOD / 2;
        if (bird.goingLeft) {
          addCell(bx, by, BIRD_L_HEAD, bird.color);
          addCell(bx + 1, by, BIRD_L_WINGS[flap ? 0 : 1], bird.color);
        } else {
          addCell(bx - 1, by, BIRD_R_WINGS[flap ? 0 : 1], bird.color);
          addCell(bx, by, BIRD_R_HEAD, bird.color);
        }
      }
    }

    // Rain
    if (this._hasRain) {
      for (const drop of this._rainDrops) {
        if (drop.active) addCell(drop.x, Math.round(drop.fy), drop.char, RAIN_COLOR);
      }
      for (const s of this._rainSplashes) {
        addCell(s.x, s.y, RAIN_SPLASH_CHAR, RAIN_COLOR);
      }
    }

    // Fireflies (not during GROWING)
    if (!this._hasRain && this._phase !== Phase.GROWING) {
      const ffPhT = this._tick - this._phaseStart;
      for (const ff of this._fireflies) {
        if (!ff.alive || ffPhT < ff.spawnDelay) continue;
        addCell(Math.round(ff.fx), Math.round(ff.fy), ff.char, ff.color);
      }
    }

    // Draw buffer
    for (const [key, [ch, color]] of buf) {
      const x = key % w;
      const y = Math.floor(key / w);
      ctx.fillStyle = rgba(color, fadeAlpha);
      ctx.fillText(ch, x * this._charW + this._charW * 0.5, (y + 1) * this._charH - this._charH * 0.15);
    }
  }

  tick() {
    this._tick++;
    if (this._phase === Phase.IDLE) {
      if (this._tick >= this._idleUntil) this._startEffect();
      return;
    }
    if (this._phase === Phase.DONE) {
      this._resetState();
      this._idleUntil = this._tick + 60;
      this._phase = Phase.IDLE;
      return;
    }
    if (this._phase === Phase.GROWING) {
      this._growStemsTick();
      this._growTreesBushesTick();
      this._bloomAttachedFlowersTick();
      this._mushroomsTick();
      if (this._hasRain && this._tick - this._phaseStart >= 200) this._rainTick();
    } else if (this._phase === Phase.PERCHING) {
      this._perchTick();
      this._updateVineChars();
      this._bloomAttachedFlowersTick();
      this._windTick();
      this._crittersTick();
      this._leavesTick();
      if (this._hasRain) {
        this._rainTick();
      } else {
        this._firefliesTick();
        this._butterfliesTick();
      }
    } else if (this._phase === Phase.FADING) {
      this._leavesTick();
      if (this._hasRain) this._rainTick();
    }
    this._render();
    this._updatePhase();
  }

  _handleResize() {
    this._initGrid();
    if (this._phase === Phase.IDLE || this._phase === Phase.DONE) return;
    const w = this._cols;
    const h = this._rows;
    for (const g of this._grass) {
      g.x = Math.max(0, Math.min(w - 1, g.x));
      g.baseY = Math.max(0, Math.min(h - 1, g.baseY));
    }
    for (const f of [...this._flowers, ...this._attachedFlowers]) {
      f.x = Math.max(0, Math.min(w - 1, f.x));
      f.baseY = Math.max(0, Math.min(h - 1, f.baseY));
    }
    for (const v of this._vines) {
      v.path = v.path.map(([px, py]) => [Math.max(0, Math.min(w - 1, px)), Math.max(0, Math.min(h - 1, py))]);
    }
    for (const t of this._trees) {
      t.x = Math.max(0, Math.min(w - 1, t.x));
      t.baseY = Math.max(0, Math.min(h - 1, t.baseY));
      t.branchY = t.baseY - t.trunkCurrent;
      t.canopyCx = Math.max(0, Math.min(w - 1, t.canopyCx));
    }
    for (const b of this._bushes) {
      b.cx = Math.max(0, Math.min(w - 1, b.cx));
      b.baseY = Math.max(0, Math.min(h - 1, b.baseY));
    }
    for (const bird of this._birds) {
      bird.fx = Math.max(-2.0, Math.min(w + 2.0, bird.fx));
      bird.fy = Math.max(0.0, Math.min(h - 1.0, bird.fy));
      bird.targetX = Math.max(0, Math.min(w - 1, bird.targetX));
      bird.targetY = Math.max(0, Math.min(h - 1, bird.targetY));
    }
    for (const m of this._mushrooms) {
      m.x = Math.max(0, Math.min(w - 1, m.x));
      m.baseY = Math.max(0, Math.min(h - 1, m.baseY));
    }
    for (const c of this._critters) {
      c.fy = Math.max(0, Math.min(h - 1, c.fy));
      c.targetY = Math.max(0, Math.min(h - 1, c.targetY));
    }
    for (const ff of this._fireflies) {
      ff.fx = Math.max(0, Math.min(w - 1, ff.fx));
      ff.fy = Math.max(0, Math.min(h - 1, ff.fy));
    }
    for (const lf of this._leaves) {
      lf.spawnX = Math.max(0, Math.min(w - 1, lf.spawnX));
      lf.groundY = h - 1;
    }
    for (const drop of this._rainDrops) {
      drop.x = Math.max(0, Math.min(w - 1, drop.x));
    }
    for (const bf of this._butterflies) {
      bf.fx = Math.max(0, Math.min(w - 1, bf.fx));
      bf.fy = Math.max(0, Math.min(h - 1, bf.fy));
    }
  }

  start() {
    this._initGrid();
    this._ctx.textBaseline = 'alphabetic';
    this._ctx.textAlign = 'center';
    let lastSize = [this._canvas.offsetWidth, this._canvas.offsetHeight];
    new ResizeObserver(() => {
      const ns = [this._canvas.offsetWidth, this._canvas.offsetHeight];
      if (ns[0] !== lastSize[0] || ns[1] !== lastSize[1]) {
        lastSize = ns;
        this._handleResize();
      }
    }).observe(this._canvas);
    const loop = () => { this.tick(); setTimeout(() => requestAnimationFrame(loop), 1000 / 30); };
    requestAnimationFrame(loop);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const c = document.getElementById('grove-canvas');
  if (c) new GroveBg(c).start();
});
