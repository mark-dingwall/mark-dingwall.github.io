'use strict';

// ---------------------------------------------------------------------------
// Constants — background grid
// ---------------------------------------------------------------------------
const CELL_SIZE = 14;
const GRID_GAP = 1;
const FILL_RATIO = 0.65;
const NUM_PAINTERS = 10;
const PAINTER_WALK = 2;

const GRID_PALETTE = [
  '#00cccc', '#00aaff', '#0088ff', '#00eeaa', '#44ddff',
  '#ff6633', '#ff9966', '#ffcc66', '#ffaa55', '#ee8855',
  '#44ff44', '#66ff99', '#cc44ff', '#ff44cc', '#ffffff',
];

// Wavefront shimmer
const WAVE_FRAC = 0.04;
const WAVE_GLOW = 0.35;

// ---------------------------------------------------------------------------
// Constants — pixel font (variable-width, 5 rows tall, rendered at 2× scale)
// ---------------------------------------------------------------------------
// '#' = filled, '.' = empty
const FONT = {
  'A': ['.#.','#.#','###','#.#','#.#'],
  'C': ['.##','#..','#..','#..','.##'],
  'E': ['###','#..','##.','#..','###'],
  'I': ['###','.#.','.#.','.#.','###'],
  'L': ['#..','#..','#..','#..','###'],
  'M': ['#...#','##.##','#.#.#','#...#','#...#'],
  'N': ['#..#','##.#','#.##','#..#','#..#'],
  'P': ['##.','#.#','##.','#..','#..'],
  'R': ['##.','#.#','##.','#.#','#.#'],
  'S': ['.##','#..','.#.','..#','##.'],
  'T': ['###','.#.','.#.','.#.','.#.'],
  'U': ['#.#','#.#','#.#','#.#','.#.'],
  'V': ['#.#','#.#','#.#','.#.','.#.'],
  'X': ['#.#','.#.','.#.','.#.','#.#'],
  'Y': ['#.#','.#.','.#.','.#.','.#.'],
  ' ': ['..','..','..','..','..'],
};

const FONT_HEIGHT = 5;
const TEXT_SCALE = 2;       // each font pixel becomes a 2×2 block
const TEXT_MARGIN = 3;      // exclusion zone padding (cells) around widest word

const TEXT_WORDS = [
  { text: 'MULTIPLAYER', color: '#ff9966', glow: '#ff6633' },
  { text: 'PIXEL',       color: '#00cccc', glow: '#00aaff' },
  { text: 'CANVAS',      color: '#66ff99', glow: '#00eeaa' },
];
const WORD_BUILD = 1.5;     // seconds — pixels appear in random order
const WORD_HOLD = 1.5;      // seconds — all visible
const WORD_UNDRAW = 0.7;    // seconds — pixels vanish in random order (faster)
const WORD_PAUSE = 0.3;     // seconds — gap before next word
const WORD_DURATION = WORD_BUILD + WORD_HOLD + WORD_UNDRAW + WORD_PAUSE;
const TEXT_FULL_CYCLE = WORD_DURATION * TEXT_WORDS.length;
const TEXT_MIN_COLS = 96;   // minimum grid cols to show pixel text (fits MULTIPLAYER at 2×)
const PIXEL_FADE_SLOTS = 4; // how many pixel-slots a fade-in/out spans

// ---------------------------------------------------------------------------
// Constants — demo panel & mini canvas
// ---------------------------------------------------------------------------
const DEMO_MORPH_START = 0.65;
const DEMO_FADE_RANGE = 0.25;
const DEMO_INTERACT_THRESH = 0.5;
const TABLET_BP = 1200;

const MINI_SIZE = 20;
const MINI_CELL = 14;
const MINI_COLORS = [
  '#000000', '#666666', '#ffffff',
  '#ff0000', '#ff6600', '#ffff00',
  '#00ff00', '#00cccc', '#0066ff',
  '#9900ff', '#ff0099', '#ff6633',
];
const BANK_MAX = 25;
const BANK_EARN_MS = 600;
const GHOST_MIN_MS = 2000;
const GHOST_MAX_MS = 3800;

// Scroll
const SCRUB_SMOOTH = 0.8;
const HINT_THRESH = 0.03;

// Auto-fill intro
const INTRO_TARGET = 0.12;
const INTRO_SPEED = 0.06;

// Frame
const FRAME_DT = 0.016;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function bresenham(x0, y0, x1, y1, cb) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    cb(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

function shuffleIndices(n, rng) {
  const arr = [];
  for (let i = 0; i < n; i++) arr[i] = i;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function inExclusion(col, row) {
  return textExclusion &&
    col >= textExclusion.minCol && col <= textExclusion.maxCol &&
    row >= textExclusion.minRow && row <= textExclusion.maxRow;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let canvas, ctx, dpr;
let W, H;
let gridCols, gridRows, gridOffsetX, gridOffsetY;
let fillOrder = [];
let colorBuckets = [];
let morphProgress = 0;
let introProgress = 0;
let time = 0;

let progressBar, scrollHint, headerPanelEl, demoPanelEl;
let titleOverlayEl, techSubtitleEl, mobileTaglineEl;
let techProgress = 0;
let techFade = 1;

// Pixel text
let textWords = [];
let textExclusion = null;  // {minCol, maxCol, minRow, maxRow}
let zoneFillOrder = [];    // fills the text zone when demo panel appears

// Mini canvas
let miniCanvas, miniCtx;
let miniGrid;
let miniColorIdx = 7;
let bankBalance = BANK_MAX;
let lastEarnTime = 0;
let nextGhostTime = 0;
let ghostRng;
let isDragging = false;
let lastDragCol = -1, lastDragRow = -1;
const ghostFlashes = [];

// ---------------------------------------------------------------------------
// Text exclusion zone (keeps background pixels away from the word area)
// ---------------------------------------------------------------------------
function computeTextExclusion() {
  textExclusion = null;
  if (gridCols < TEXT_MIN_COLS) return;

  // Measure widest word ("MULTIPLAYER") at scaled size
  const text = TEXT_WORDS[0].text;
  let wordW = 0;
  for (let ci = 0; ci < text.length; ci++) {
    const glyph = FONT[text[ci]];
    if (!glyph) continue;
    if (ci > 0) wordW += TEXT_SCALE;
    wordW += glyph[0].length * TEXT_SCALE;
  }

  const fontH = FONT_HEIGHT * TEXT_SCALE;
  const centerRow = Math.floor(gridRows / 2);
  const startCol = Math.floor((gridCols - wordW) / 2);
  const startRow = centerRow - Math.floor(fontH / 2);

  textExclusion = {
    minCol: Math.max(0, startCol - TEXT_MARGIN),
    maxCol: Math.min(gridCols - 1, startCol + wordW - 1 + TEXT_MARGIN),
    minRow: Math.max(0, startRow - TEXT_MARGIN),
    maxRow: Math.min(gridRows - 1, startRow + fontH - 1 + TEXT_MARGIN),
  };
}

// Pre-generate randomised fill for the exclusion zone (used when demo appears)
function generateZoneFill() {
  zoneFillOrder = [];
  if (!textExclusion) return;

  const rng = alea('bitbrush-zone');
  const cells = [];
  for (let col = textExclusion.minCol; col <= textExclusion.maxCol; col++) {
    for (let row = textExclusion.minRow; row <= textExclusion.maxRow; row++) {
      cells.push({ col: col, row: row, colorIdx: Math.floor(rng() * GRID_PALETTE.length) });
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = cells[i]; cells[i] = cells[j]; cells[j] = tmp;
  }
  zoneFillOrder = cells;
}

// ---------------------------------------------------------------------------
// Grid fill-order generation (clustered painters, respects exclusion zone)
// ---------------------------------------------------------------------------
function generateFillOrder() {
  const rng = alea('bitbrush-grid');
  fillOrder = [];
  const placed = {};

  const painters = [];
  for (let p = 0; p < NUM_PAINTERS; p++) {
    painters.push({
      cx: Math.floor(rng() * gridCols),
      cy: Math.floor(rng() * gridRows),
      colorIdx: Math.floor(rng() * GRID_PALETTE.length),
      radius: 3 + Math.floor(rng() * Math.min(gridCols, gridRows) * 0.15),
    });
  }

  const target = Math.floor(gridCols * gridRows * FILL_RATIO);
  const maxIter = target * 4;
  let iter = 0;

  while (fillOrder.length < target && iter < maxIter) {
    for (let p = 0; p < NUM_PAINTERS && fillOrder.length < target; p++) {
      const ptr = painters[p];
      const angle = rng() * Math.PI * 2;
      const dist = rng() * ptr.radius;
      const col = ((Math.round(ptr.cx + Math.cos(angle) * dist) % gridCols) + gridCols) % gridCols;
      const row = ((Math.round(ptr.cy + Math.sin(angle) * dist) % gridRows) + gridRows) % gridRows;
      const key = col * 10000 + row;
      if (!placed[key]) {
        placed[key] = true;
        if (!inExclusion(col, row)) {
          fillOrder.push({ col: col, row: row, colorIdx: ptr.colorIdx });
        }
      }
    }
    for (let p = 0; p < NUM_PAINTERS; p++) {
      painters[p].cx += Math.round((rng() - 0.5) * PAINTER_WALK * 2);
      painters[p].cy += Math.round((rng() - 0.5) * PAINTER_WALK * 2);
    }
    iter++;
  }

  buildColorBuckets();
}

function buildColorBuckets() {
  colorBuckets = [];
  for (let ci = 0; ci < GRID_PALETTE.length; ci++) colorBuckets[ci] = [];
  for (let i = 0; i < fillOrder.length; i++) {
    colorBuckets[fillOrder[i].colorIdx].push(i);
  }
}

// ---------------------------------------------------------------------------
// Pixel text — layout computation (2× scale, vertically centred, randomised)
// ---------------------------------------------------------------------------
function computeTextPixels() {
  textWords = [];
  if (gridCols < TEXT_MIN_COLS) return;

  const rng = alea('bitbrush-text');
  const fontH = FONT_HEIGHT * TEXT_SCALE;
  const centerRow = Math.floor(gridRows / 2);
  const startRow = centerRow - Math.floor(fontH / 2);

  for (let wi = 0; wi < TEXT_WORDS.length; wi++) {
    const wordDef = TEXT_WORDS[wi];
    const text = wordDef.text;
    const pixels = [];

    // Measure scaled word width
    let wordW = 0;
    for (let ci = 0; ci < text.length; ci++) {
      const glyph = FONT[text[ci]];
      if (!glyph) continue;
      if (ci > 0) wordW += TEXT_SCALE;
      wordW += glyph[0].length * TEXT_SCALE;
    }

    const startCol = Math.floor((gridCols - wordW) / 2);
    let curCol = startCol;

    for (let ci = 0; ci < text.length; ci++) {
      const glyph = FONT[text[ci]];
      if (!glyph) continue;
      const charW = glyph[0].length;
      if (ci > 0) curCol += TEXT_SCALE;

      for (let row = 0; row < glyph.length; row++) {
        for (let col = 0; col < charW; col++) {
          if (glyph[row][col] === '#') {
            for (let sy = 0; sy < TEXT_SCALE; sy++) {
              for (let sx = 0; sx < TEXT_SCALE; sx++) {
                pixels.push({
                  col: curCol + col * TEXT_SCALE + sx,
                  row: startRow + row * TEXT_SCALE + sy,
                  drawRank: 0,
                  undrawRank: 0,
                });
              }
            }
          }
        }
      }
      curCol += charW * TEXT_SCALE;
    }

    const drawOrder = shuffleIndices(pixels.length, rng);
    const undrawOrder = shuffleIndices(pixels.length, rng);
    for (let i = 0; i < drawOrder.length; i++) pixels[drawOrder[i]].drawRank = i;
    for (let i = 0; i < undrawOrder.length; i++) pixels[undrawOrder[i]].undrawRank = i;

    textWords.push({ pixels: pixels, color: wordDef.color, glow: wordDef.glow });
  }
}

// ---------------------------------------------------------------------------
// Background rendering
// ---------------------------------------------------------------------------
function renderBackground(t) {
  const count = Math.floor(t * fillOrder.length);

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Faint grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = gridOffsetX; x <= W; x += CELL_SIZE) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, H);
  }
  for (let y = gridOffsetY; y <= H; y += CELL_SIZE) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(W, Math.round(y) + 0.5);
  }
  ctx.stroke();

  // Filled cells — batched by color (exclusion zone kept clear)
  ctx.globalAlpha = 0.88;
  for (let ci = 0; ci < GRID_PALETTE.length; ci++) {
    ctx.fillStyle = GRID_PALETTE[ci];
    const bucket = colorBuckets[ci];
    for (let j = 0; j < bucket.length; j++) {
      if (bucket[j] >= count) break;
      const p = fillOrder[bucket[j]];
      ctx.fillRect(
        gridOffsetX + p.col * CELL_SIZE,
        gridOffsetY + p.row * CELL_SIZE,
        CELL_SIZE - GRID_GAP, CELL_SIZE - GRID_GAP
      );
    }
  }
  ctx.globalAlpha = 1;

  // Wavefront glow
  const waveCount = Math.ceil(fillOrder.length * WAVE_FRAC);
  const waveStart = Math.max(0, count - waveCount);
  for (let i = waveStart; i < count; i++) {
    const age = (i - waveStart) / Math.max(1, count - waveStart - 1);
    const p = fillOrder[i];
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (WAVE_GLOW * (1 - age)).toFixed(3) + ')';
    ctx.fillRect(
      gridOffsetX + p.col * CELL_SIZE,
      gridOffsetY + p.row * CELL_SIZE,
      CELL_SIZE - GRID_GAP, CELL_SIZE - GRID_GAP
    );
  }

  // Zone fill: when demo panel appears, fill the text zone with background pixels
  const demoFrac = Math.max(0, Math.min(1, (t - DEMO_MORPH_START) / DEMO_FADE_RANGE));
  if (demoFrac > 0 && zoneFillOrder.length) {
    const zoneCount = Math.floor(demoFrac * zoneFillOrder.length);
    ctx.globalAlpha = 0.88;
    for (let i = 0; i < zoneCount; i++) {
      const zp = zoneFillOrder[i];
      ctx.fillStyle = GRID_PALETTE[zp.colorIdx];
      ctx.fillRect(
        gridOffsetX + zp.col * CELL_SIZE,
        gridOffsetY + zp.row * CELL_SIZE,
        CELL_SIZE - GRID_GAP, CELL_SIZE - GRID_GAP
      );
    }
    ctx.globalAlpha = 1;
  }

  // Pixel text overlay — fades out as demo appears and during tech transition
  const textAlpha = Math.min(techFade, 1 - demoFrac);
  renderText(textAlpha);
}

// ---------------------------------------------------------------------------
// Pixel text — rendering (one word at a time, staggered random build/undraw)
// ---------------------------------------------------------------------------
function renderText(masterAlpha) {
  if (!textWords.length || masterAlpha <= 0) return;

  const cycleTime = time % TEXT_FULL_CYCLE;
  const wordIdx = Math.min(Math.floor(cycleTime / WORD_DURATION), textWords.length - 1);
  const wt = cycleTime - wordIdx * WORD_DURATION;
  const word = textWords[wordIdx];
  const total = word.pixels.length;
  const cs = CELL_SIZE - GRID_GAP;

  for (let i = 0; i < total; i++) {
    const px = word.pixels[i];
    let alpha = 0;

    if (wt < WORD_BUILD) {
      const buildProgress = (wt / WORD_BUILD) * total;
      if (px.drawRank < buildProgress) {
        alpha = Math.min(1, (buildProgress - px.drawRank) / PIXEL_FADE_SLOTS);
      }
    } else if (wt < WORD_BUILD + WORD_HOLD) {
      alpha = 1;
    } else if (wt < WORD_BUILD + WORD_HOLD + WORD_UNDRAW) {
      const undrawProgress = ((wt - WORD_BUILD - WORD_HOLD) / WORD_UNDRAW) * total;
      if (px.undrawRank >= undrawProgress) {
        alpha = Math.min(1, (px.undrawRank - undrawProgress) / PIXEL_FADE_SLOTS);
      }
    }

    alpha *= masterAlpha;
    if (alpha <= 0) continue;

    const x = gridOffsetX + px.col * CELL_SIZE;
    const y = gridOffsetY + px.row * CELL_SIZE;

    ctx.globalAlpha = alpha * 0.2;
    ctx.fillStyle = word.glow;
    ctx.fillRect(x - 2, y - 2, cs + 4, cs + 4);

    ctx.globalAlpha = alpha * 0.95;
    ctx.fillStyle = word.color;
    ctx.fillRect(x, y, cs, cs);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Mini canvas — init
// ---------------------------------------------------------------------------
function initMiniCanvas() {
  miniCanvas = document.getElementById('mini-canvas');
  miniCtx = miniCanvas.getContext('2d');
  miniCanvas.width = MINI_SIZE * MINI_CELL;
  miniCanvas.height = MINI_SIZE * MINI_CELL;

  miniGrid = [];
  for (let r = 0; r < MINI_SIZE; r++) {
    miniGrid[r] = [];
    for (let c = 0; c < MINI_SIZE; c++) miniGrid[r][c] = -1;
  }

  const paletteEl = document.getElementById('mini-palette');
  for (let i = 0; i < MINI_COLORS.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'mini-swatch' + (i === miniColorIdx ? ' active' : '');
    btn.style.background = MINI_COLORS[i];
    if (MINI_COLORS[i] === '#000000') btn.style.border = '2px solid #333';
    btn.setAttribute('aria-label', 'Color ' + MINI_COLORS[i]);
    paletteEl.appendChild(btn);
    ((idx) => {
      btn.addEventListener('click', () => {
        miniColorIdx = idx;
        updateSwatchSelection();
      });
    })(i);
  }

  ghostRng = alea('bitbrush-ghost');
  lastEarnTime = Date.now();
  nextGhostTime = Date.now() + 3000;
  renderMiniCanvas();

  miniCanvas.addEventListener('pointerdown', onMiniDown);
  miniCanvas.addEventListener('pointermove', onMiniMove);
  window.addEventListener('pointerup', onMiniUp);
}

// ---------------------------------------------------------------------------
// Mini canvas — interaction
// ---------------------------------------------------------------------------
function getMiniPos(e) {
  const rect = miniCanvas.getBoundingClientRect();
  const sx = miniCanvas.width / rect.width;
  const sy = miniCanvas.height / rect.height;
  const col = Math.floor((e.clientX - rect.left) * sx / MINI_CELL);
  const row = Math.floor((e.clientY - rect.top) * sy / MINI_CELL);
  if (col >= 0 && col < MINI_SIZE && row >= 0 && row < MINI_SIZE) return { col: col, row: row };
  return null;
}

function onMiniDown(e) {
  if (bankBalance <= 0) return;
  e.preventDefault();
  miniCanvas.setPointerCapture(e.pointerId);
  isDragging = true;
  const pos = getMiniPos(e);
  if (pos) {
    placeMiniPixel(pos.col, pos.row);
    lastDragCol = pos.col;
    lastDragRow = pos.row;
  }
}

function onMiniMove(e) {
  if (!isDragging) return;
  const pos = getMiniPos(e);
  if (!pos) return;
  bresenham(lastDragCol, lastDragRow, pos.col, pos.row, (bx, by) => {
    if (bankBalance <= 0) return;
    if (bx >= 0 && bx < MINI_SIZE && by >= 0 && by < MINI_SIZE) {
      placeMiniPixel(bx, by);
    }
  });
  lastDragCol = pos.col;
  lastDragRow = pos.row;
}

function onMiniUp() { isDragging = false; }

function placeMiniPixel(col, row) {
  if (miniGrid[row][col] === miniColorIdx) return;
  if (bankBalance <= 0) return;
  miniGrid[row][col] = miniColorIdx;
  bankBalance--;
  updateBankDisplay();
  renderMiniCanvas();
}

// ---------------------------------------------------------------------------
// Mini canvas — rendering
// ---------------------------------------------------------------------------
function renderMiniCanvas() {
  miniCtx.fillStyle = '#111';
  miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

  miniCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  miniCtx.lineWidth = 0.5;
  miniCtx.beginPath();
  for (let x = 0; x <= miniCanvas.width; x += MINI_CELL) {
    miniCtx.moveTo(x + 0.5, 0);
    miniCtx.lineTo(x + 0.5, miniCanvas.height);
  }
  for (let y = 0; y <= miniCanvas.height; y += MINI_CELL) {
    miniCtx.moveTo(0, y + 0.5);
    miniCtx.lineTo(miniCanvas.width, y + 0.5);
  }
  miniCtx.stroke();

  for (let r = 0; r < MINI_SIZE; r++) {
    for (let c = 0; c < MINI_SIZE; c++) {
      if (miniGrid[r][c] >= 0) {
        miniCtx.fillStyle = MINI_COLORS[miniGrid[r][c]];
        miniCtx.fillRect(c * MINI_CELL + 1, r * MINI_CELL + 1, MINI_CELL - 2, MINI_CELL - 2);
      }
    }
  }

  const now = time;
  for (let i = ghostFlashes.length - 1; i >= 0; i--) {
    const f = ghostFlashes[i];
    const age = now - f.time;
    if (age > 0.5) { ghostFlashes.splice(i, 1); continue; }
    miniCtx.fillStyle = 'rgba(255, 255, 255, ' + (0.5 * (1 - age / 0.5)).toFixed(3) + ')';
    miniCtx.fillRect(f.col * MINI_CELL + 1, f.row * MINI_CELL + 1, MINI_CELL - 2, MINI_CELL - 2);
  }
}

function ghostPaint() {
  const col = Math.floor(ghostRng() * MINI_SIZE);
  const row = Math.floor(ghostRng() * MINI_SIZE);
  const color = 3 + Math.floor(ghostRng() * (MINI_COLORS.length - 3));
  const len = 1 + Math.floor(ghostRng() * 3);
  const dx = Math.round((ghostRng() - 0.5) * 2);
  const dy = Math.round((ghostRng() - 0.5) * 2);

  for (let i = 0; i < len; i++) {
    const c = Math.max(0, Math.min(MINI_SIZE - 1, col + dx * i));
    const r = Math.max(0, Math.min(MINI_SIZE - 1, row + dy * i));
    miniGrid[r][c] = color;
    ghostFlashes.push({ col: c, row: r, time: time });
  }
  renderMiniCanvas();
}

function updateBankDisplay() {
  const countEl = document.getElementById('bank-count');
  const fillEl = document.getElementById('bank-fill');
  if (countEl) countEl.textContent = bankBalance;
  if (fillEl) fillEl.style.width = (bankBalance / BANK_MAX * 100) + '%';
}

function updateSwatchSelection() {
  const swatches = document.querySelectorAll('.mini-swatch');
  for (let i = 0; i < swatches.length; i++) {
    swatches[i].classList.toggle('active', i === miniColorIdx);
  }
}

// ---------------------------------------------------------------------------
// Main render loop
// ---------------------------------------------------------------------------
function render() {
  time += FRAME_DT;

  // Auto-fill intro animation
  if (introProgress < INTRO_TARGET) {
    introProgress = Math.min(INTRO_TARGET, introProgress + INTRO_SPEED * FRAME_DT);
  }
  const t = Math.max(morphProgress, introProgress);

  renderBackground(t);

  // Demo panel visibility (faded by techFade when entering tech section)
  if (t < DEMO_MORPH_START) {
    demoPanelEl.style.opacity = 0;
    demoPanelEl.style.pointerEvents = 'none';
  } else {
    const alpha = Math.min(1, (t - DEMO_MORPH_START) / DEMO_FADE_RANGE) * techFade;
    demoPanelEl.style.opacity = alpha;
    demoPanelEl.style.pointerEvents = alpha > DEMO_INTERACT_THRESH ? 'auto' : 'none';
  }

  // Bank earning
  const now = Date.now();
  if (now - lastEarnTime >= BANK_EARN_MS && bankBalance < BANK_MAX) {
    bankBalance++;
    lastEarnTime = now;
    updateBankDisplay();
  }

  // Ghost painting (only when panel visible)
  if (t > 0.7 && now >= nextGhostTime) {
    ghostPaint();
    nextGhostTime = now + GHOST_MIN_MS + ghostRng() * (GHOST_MAX_MS - GHOST_MIN_MS);
  }

  if (ghostFlashes.length > 0) renderMiniCanvas();

  requestAnimationFrame(render);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function init() {
  const container = document.getElementById('canvas-container');
  canvas = document.createElement('canvas');
  container.appendChild(canvas);
  ctx = canvas.getContext('2d');

  progressBar = document.getElementById('progress-bar');
  scrollHint = document.getElementById('scroll-hint');
  headerPanelEl = document.getElementById('header-panel');
  demoPanelEl = document.getElementById('demo-panel');
  titleOverlayEl = document.getElementById('title-overlay');
  techSubtitleEl = document.getElementById('tech-subtitle');
  mobileTaglineEl = document.getElementById('mobile-tagline');

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    gridCols = Math.ceil(W / CELL_SIZE) + 1;
    gridRows = Math.ceil(H / CELL_SIZE) + 1;
    gridOffsetX = (W - gridCols * CELL_SIZE) / 2;
    gridOffsetY = (H - gridRows * CELL_SIZE) / 2;

    computeTextExclusion();
    generateFillOrder();
    generateZoneFill();
    computeTextPixels();
  }

  initMiniCanvas();
  resize();
  window.addEventListener('resize', resize);

  // GSAP ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: '#runway',
    start: 'top top',
    end: 'bottom bottom',
    scrub: SCRUB_SMOOTH,
    onUpdate: (self) => {
      morphProgress = self.progress;
      progressBar.style.width = (self.progress * 100) + '%';
      scrollHint.style.opacity = self.progress < HINT_THRESH ? 1 : 0;
    }
  });

  // Tech content section transitions
  const techContent = document.getElementById('tech-content');
  if (techContent) {
    ScrollTrigger.create({
      trigger: techContent,
      start: 'top 90%',
      end: 'top 30%',
      scrub: SCRUB_SMOOTH,
      onUpdate: (self) => {
        const p = self.progress;
        techFade = 1 - p;
        techProgress = p;

        titleOverlayEl.style.transform = 'scale(' + lerp(1, 0.55, p) + ')';
        techSubtitleEl.style.opacity = p;
        if (mobileTaglineEl) mobileTaglineEl.style.opacity = 1 - p;

        if (p >= 1) {
          if (headerPanelEl.style.position !== 'absolute') {
            headerPanelEl.style.position = 'absolute';
            headerPanelEl.style.top = (window.scrollY + 16) + 'px';
          }
        } else {
          headerPanelEl.style.position = 'fixed';
          headerPanelEl.style.top = lerp(H * 0.04, 16, p) + 'px';
        }
      }
    });

    const techRows = techContent.querySelectorAll('.row');
    for (let i = 0; i < techRows.length; i++) {
      gsap.fromTo(techRows[i],
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: techRows[i],
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }

    const techFooter = techContent.querySelector('.tech-footer');
    if (techFooter) {
      gsap.fromTo(techFooter,
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: techFooter,
            start: 'top 98%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }
  }

  render();
}

document.addEventListener('DOMContentLoaded', init);
