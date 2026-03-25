'use strict';

// ---------------------------------------------------------------------------
// BitBrush mini-demo — standalone version for homepage TL quadrant
// Extracted from portfolio/bitbrush/bitbrush.js, no external dependencies
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let miniCanvas, miniCtx;
let miniGrid;
let miniColorIdx = 7;
let bankBalance = BANK_MAX;
let lastEarnTime = 0;
let nextGhostTime = 0;
let isDragging = false;
let lastDragCol = -1, lastDragRow = -1;
const ghostFlashes = [];
let time = 0;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function initMiniCanvas() {
  miniCanvas = document.getElementById('mini-canvas');
  if (!miniCanvas) return;
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

  lastEarnTime = Date.now();
  nextGhostTime = Date.now() + 3000;
  renderMiniCanvas();

  miniCanvas.addEventListener('pointerdown', onMiniDown);
  miniCanvas.addEventListener('pointermove', onMiniMove);
  window.addEventListener('pointerup', onMiniUp);
}

// ---------------------------------------------------------------------------
// Interaction
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
// Rendering
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
  const col = Math.floor(Math.random() * MINI_SIZE);
  const row = Math.floor(Math.random() * MINI_SIZE);
  const color = 3 + Math.floor(Math.random() * (MINI_COLORS.length - 3));
  const len = 1 + Math.floor(Math.random() * 3);
  const dx = Math.round((Math.random() - 0.5) * 2);
  const dy = Math.round((Math.random() - 0.5) * 2);

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
// Animation loop
// ---------------------------------------------------------------------------
function miniLoop() {
  time += 0.016;

  const now = Date.now();
  if (now - lastEarnTime >= BANK_EARN_MS && bankBalance < BANK_MAX) {
    bankBalance++;
    lastEarnTime = now;
    updateBankDisplay();
  }

  if (now >= nextGhostTime) {
    ghostPaint();
    nextGhostTime = now + GHOST_MIN_MS + Math.random() * (GHOST_MAX_MS - GHOST_MIN_MS);
  }

  if (ghostFlashes.length > 0) renderMiniCanvas();

  requestAnimationFrame(miniLoop);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initMiniCanvas();
  miniLoop();
});
