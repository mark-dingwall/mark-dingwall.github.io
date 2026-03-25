'use strict';

// simplex noise3D returns [-1, 1]; remap to [0, 1] to match Processing's noise()
function snoise(x, y, z) {
  return (NOISE.noise3D(x, y, z) + 1) * 0.5;
}

// ===== SETTINGS =====
const SPHERE_RAD = 200;
const SPHERE_DETAIL = 3; // icosphere subdivision level (3 = 1280 faces)
const MAX_HEIGHT = 350;
const NOISE_SPEED = 0.005;
const NOISE_SPATIAL_STEP = 1.0;
const HEIGHT_LERP_FACTOR = 0.03;
const LOW_COLOR_THRESHOLD = 0.25;
const HIGH_COLOR_THRESHOLD = 0.75;

// Multi-axis noise speeds (mode 2)
const MULTI_AXIS_SPEED_X = 0.005;
const MULTI_AXIS_SPEED_Y = 0.003;
const MULTI_AXIS_SPEED_Z = 0.007;

// Domain warp settings (mode 3)
const DOMAIN_WARP_SPEED = 0.004;
const DOMAIN_WARP_SCALE = 0.8;
const DOMAIN_WARP_AMOUNT = 2.0;

// Multi-octave settings (mode 4)
const MULTI_OCTAVE_COUNT = 3;
const MULTI_OCTAVE_LACUNARITY = 2.0;
const MULTI_OCTAVE_PERSISTENCE = 0.5;
const MULTI_OCTAVE_BASE_SPEED = 0.004;

// Color palette: magenta -> blue -> cyan -> green -> yellow -> red
const PALETTE = [
  [255, 0, 255],
  [0, 0, 255],
  [0, 255, 255],
  [0, 255, 0],
  [255, 255, 0],
  [255, 0, 0]
];

// Precomputed max amplitude for multi-octave noise
const MULTI_OCTAVE_MAX_AMP = (function() {
  let total = 0, amp = 1.0;
  for (let i = 0; i < MULTI_OCTAVE_COUNT; i++) {
    total += amp;
    amp *= MULTI_OCTAVE_PERSISTENCE;
  }
  return total;
})();

const NOISE_STRATEGIES = [
  { label: '1: Perlin Wave', calc: perlinWaveNoise },
  { label: '2: Multi-Axis', calc: multiAxisNoise },
  { label: '3: Domain Warp', calc: domainWarpNoise },
  { label: '4: Multi-Octave', calc: multiOctaveNoise }
];

let currentStrategy = 1;
let magnetites;

// ===== P5.JS LIFECYCLE =====

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL).parent('drawHere');
  frameRate(60);
  updateModeLabel();

  const faces = buildIcosphere(SPHERE_DETAIL);
  magnetites = new Array(faces.length);
  for (let i = 0; i < faces.length; i++) {
    magnetites[i] = new Magnetite(faces[i]);
  }
}

function draw() {
  background(0);
  orbitControl();
  lights();

  stroke(0);
  strokeWeight(0.5);

  for (let i = 0; i < magnetites.length; i++) {
    magnetites[i].update(frameCount);
    magnetites[i].display();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  if (key >= '1' && key <= '4') {
    currentStrategy = parseInt(key) - 1;
    updateModeLabel();
  }
}

function mouseWheel() {
  return false;
}

function updateModeLabel() {
  const el = document.getElementById('mode-label');
  if (el) el.textContent = NOISE_STRATEGIES[currentStrategy].label;
}

// ===== NOISE STRATEGIES =====

function perlinWaveNoise(c, fc) {
  return snoise(
    c.x * NOISE_SPATIAL_STEP + fc * NOISE_SPEED,
    c.y * NOISE_SPATIAL_STEP,
    c.z * NOISE_SPATIAL_STEP
  ) * MAX_HEIGHT;
}

function multiAxisNoise(c, fc) {
  return snoise(
    c.x * NOISE_SPATIAL_STEP + fc * MULTI_AXIS_SPEED_X,
    c.y * NOISE_SPATIAL_STEP + fc * MULTI_AXIS_SPEED_Y,
    c.z * NOISE_SPATIAL_STEP + fc * MULTI_AXIS_SPEED_Z
  ) * MAX_HEIGHT;
}

function domainWarpNoise(c, fc) {
  const t = fc * DOMAIN_WARP_SPEED;
  const wx = snoise(c.x * DOMAIN_WARP_SCALE + t, c.y * DOMAIN_WARP_SCALE, c.z * DOMAIN_WARP_SCALE) * DOMAIN_WARP_AMOUNT;
  const wy = snoise(c.y * DOMAIN_WARP_SCALE + t, c.z * DOMAIN_WARP_SCALE, c.x * DOMAIN_WARP_SCALE) * DOMAIN_WARP_AMOUNT;
  const wz = snoise(c.z * DOMAIN_WARP_SCALE + t, c.x * DOMAIN_WARP_SCALE, c.y * DOMAIN_WARP_SCALE) * DOMAIN_WARP_AMOUNT;
  return snoise(
    c.x * NOISE_SPATIAL_STEP + wx,
    c.y * NOISE_SPATIAL_STEP + wy,
    c.z * NOISE_SPATIAL_STEP + wz
  ) * MAX_HEIGHT;
}

function multiOctaveNoise(c, fc) {
  let total = 0, amp = 1.0, freq = NOISE_SPATIAL_STEP;
  for (let i = 0; i < MULTI_OCTAVE_COUNT; i++) {
    const t = fc * MULTI_OCTAVE_BASE_SPEED * (i + 1);
    total += snoise(
      c.x * freq + (i === 0 ? t : 0),
      c.y * freq + (i === 1 ? t : 0),
      c.z * freq + (i === 2 ? t : 0)
    ) * amp;
    freq *= MULTI_OCTAVE_LACUNARITY;
    amp *= MULTI_OCTAVE_PERSISTENCE;
  }
  return (total / MULTI_OCTAVE_MAX_AMP) * MAX_HEIGHT;
}

// ===== MAGNETITE =====

class Magnetite {
  constructor(face) {
    // Centroid on unit sphere
    const cx = (face[0].x + face[1].x + face[2].x) / 3;
    const cy = (face[0].y + face[1].y + face[2].y) / 3;
    const cz = (face[0].z + face[1].z + face[2].z) / 3;
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
    this.centroid = { x: cx / len, y: cy / len, z: cz / len };

    // Inner vertices (on sphere surface)
    this.ix = [face[0].x * SPHERE_RAD, face[1].x * SPHERE_RAD, face[2].x * SPHERE_RAD];
    this.iy = [face[0].y * SPHERE_RAD, face[1].y * SPHERE_RAD, face[2].y * SPHERE_RAD];
    this.iz = [face[0].z * SPHERE_RAD, face[1].z * SPHERE_RAD, face[2].z * SPHERE_RAD];

    // Height state
    this.maxH = NOISE_STRATEGIES[currentStrategy].calc(this.centroid, 0);
    this.curH = this.maxH;

    // Cached color
    this.cr = 0;
    this.cg = 0;
    this.cb = 0;
    this.calcColor();
  }

  update(fc) {
    this.maxH = NOISE_STRATEGIES[currentStrategy].calc(this.centroid, fc);
    this.curH += (this.maxH - this.curH) * HEIGHT_LERP_FACTOR;
    this.calcColor();
  }

  display() {
    const ix0 = this.ix[0], ix1 = this.ix[1], ix2 = this.ix[2];
    const iy0 = this.iy[0], iy1 = this.iy[1], iy2 = this.iy[2];
    const iz0 = this.iz[0], iz1 = this.iz[1], iz2 = this.iz[2];

    const dx = this.centroid.x * this.curH;
    const dy = this.centroid.y * this.curH;
    const dz = this.centroid.z * this.curH;
    const ox0 = ix0 + dx, ox1 = ix1 + dx, ox2 = ix2 + dx;
    const oy0 = iy0 + dy, oy1 = iy1 + dy, oy2 = iy2 + dy;
    const oz0 = iz0 + dz, oz1 = iz1 + dz, oz2 = iz2 + dz;

    fill(this.cr, this.cg, this.cb);
    beginShape(TRIANGLES);

    // Inner cap (reversed winding)
    vertex(ix0, iy0, iz0);
    vertex(ix2, iy2, iz2);
    vertex(ix1, iy1, iz1);

    // Outer cap
    vertex(ox0, oy0, oz0);
    vertex(ox1, oy1, oz1);
    vertex(ox2, oy2, oz2);

    // Side quad 0-1
    vertex(ix0, iy0, iz0);
    vertex(ix1, iy1, iz1);
    vertex(ox1, oy1, oz1);
    vertex(ix0, iy0, iz0);
    vertex(ox1, oy1, oz1);
    vertex(ox0, oy0, oz0);

    // Side quad 1-2
    vertex(ix1, iy1, iz1);
    vertex(ix2, iy2, iz2);
    vertex(ox2, oy2, oz2);
    vertex(ix1, iy1, iz1);
    vertex(ox2, oy2, oz2);
    vertex(ox1, oy1, oz1);

    // Side quad 2-0
    vertex(ix2, iy2, iz2);
    vertex(ix0, iy0, iz0);
    vertex(ox0, oy0, oz0);
    vertex(ix2, iy2, iz2);
    vertex(ox0, oy0, oz0);
    vertex(ox2, oy2, oz2);

    endShape();
  }

  calcColor() {
    const lowT = MAX_HEIGHT * LOW_COLOR_THRESHOLD;
    const highT = MAX_HEIGHT * HIGH_COLOR_THRESHOLD;
    const n = PALETTE.length;

    if (this.curH <= lowT) {
      this.cr = PALETTE[0][0]; this.cg = PALETTE[0][1]; this.cb = PALETTE[0][2];
      return;
    }
    if (this.curH >= highT) {
      this.cr = PALETTE[n - 1][0]; this.cg = PALETTE[n - 1][1]; this.cb = PALETTE[n - 1][2];
      return;
    }

    const segSize = (highT - lowT) / (n - 1);
    const fi = Math.min(Math.floor((this.curH - lowT) / segSize), n - 2);
    const t = (this.curH - lowT - fi * segSize) / segSize;
    this.cr = PALETTE[fi][0] + (PALETTE[fi + 1][0] - PALETTE[fi][0]) * t;
    this.cg = PALETTE[fi][1] + (PALETTE[fi + 1][1] - PALETTE[fi][1]) * t;
    this.cb = PALETTE[fi][2] + (PALETTE[fi + 1][2] - PALETTE[fi][2]) * t;
  }
}

// ===== ICOSPHERE =====

function buildIcosphere(subdivisions) {
  const t = (1 + Math.sqrt(5)) / 2;

  // 12 icosahedron vertices (normalized to unit sphere)
  const verts = [
    createVector(-1, t, 0).normalize(),
    createVector(1, t, 0).normalize(),
    createVector(-1, -t, 0).normalize(),
    createVector(1, -t, 0).normalize(),
    createVector(0, -1, t).normalize(),
    createVector(0, 1, t).normalize(),
    createVector(0, -1, -t).normalize(),
    createVector(0, 1, -t).normalize(),
    createVector(t, 0, -1).normalize(),
    createVector(t, 0, 1).normalize(),
    createVector(-t, 0, -1).normalize(),
    createVector(-t, 0, 1).normalize()
  ];

  // 20 initial faces
  const idx = [
    [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
    [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
    [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
  ];

  let faces = [];
  for (let i = 0; i < 20; i++) {
    faces.push([verts[idx[i][0]].copy(), verts[idx[i][1]].copy(), verts[idx[i][2]].copy()]);
  }

  // Subdivide
  for (let s = 0; s < subdivisions; s++) {
    const nf = [];
    for (let i = 0; i < faces.length; i++) {
      const v0 = faces[i][0], v1 = faces[i][1], v2 = faces[i][2];

      // Edge midpoints, projected onto unit sphere
      const m01 = p5.Vector.add(v0, v1).normalize();
      const m12 = p5.Vector.add(v1, v2).normalize();
      const m20 = p5.Vector.add(v2, v0).normalize();

      // 4 sub-faces
      nf.push([v0.copy(), m01.copy(), m20.copy()]);
      nf.push([m01.copy(), v1.copy(), m12.copy()]);
      nf.push([m20.copy(), m12.copy(), v2.copy()]);
      nf.push([m01.copy(), m12.copy(), m20.copy()]);
    }
    faces = nf;
  }

  return faces;
}
