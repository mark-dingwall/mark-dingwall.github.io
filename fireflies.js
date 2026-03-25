"use strict";

// --- Constants ---

/** @type {number} Total number of fireflies rendered. */
const NUM_FIREFLIES = 9;
/** @type {number} Inverse-square gravity constant pulling fireflies toward their target. */
const GRAVITY = 7500;   // drift2 default: 7500
/** @type {number} Minimum gravity magnitude (prevents runaway acceleration at close range). */
const MIN_G = 0.05;   // drift2: 0.033 — higher so fireflies always feel pull
/** @type {number} Maximum gravity magnitude (caps close-range pull to prevent overshoot orbits). */
const MAX_G = 0.15;   // drift2: 0.1  — stronger close-range pull to prevent overshoot orbits
/** @type {number} Maximum speed (px/frame) in free-roam mode. */
const V_MAX = 2.1;    // drift2 range: 1.9–6.25 — low fixed value keeps fireflies close
/** @type {number} Velocity cap as a fraction of V_MAX when a firefly is in slot mode. */
const SLOT_V_FACTOR = 0.25;
/** @type {number} Distance (px) to slot target below which the velocity cap kicks in. */
const SLOT_SLOW_DIST = 10;
/** @type {number} Distance beyond which the catch-up rubber-band boost activates. */
const CATCHUP_DIST = 40;      // EXPLODE_RAD * 0.5 — catch-up kicks in beyond this
/** @type {number} Per-frame scale of the catch-up displacement added beyond V_MAX. */
const CATCHUP_FACTOR = 0.1;     // multiplied by distance vector for rubber-band boost
/** @type {number} Maximum random jitter on the catch-up direction, in degrees. */
const CATCHUP_JITTER_DEG = 8;   // prevents all fireflies converging to identical orbits
/** @type {number} Per-firefly wander nudge applied each frame to prevent convergence. */
const WANDER_STR = 0.04;    // per-firefly drift nudge applied each frame
/** @type {number} Radius within which a click scatters nearby fireflies. */
const EXPLODE_RAD = 80;
/** @type {number} Peak scatter impulse applied at the click point. */
const EXPLODE_STR = 8;
/** @type {number} Per-frame exponential decay applied to the explosion velocity modifier. */
const EXPLODE_DECAY = 0.8;
/** @type {number} Threshold below which the explosion modifier is zeroed out. */
const EXPLODE_FINISH = 0.01;
/** @type {number} Minimum glow radius (px) at trough twinkle. */
const GLOW_MIN = 5;
/** @type {number} Maximum glow radius (px) at peak twinkle. */
const GLOW_MAX = 10;
/** @type {number} Extra padding (px) added around a hovered element's bounding rect for slot positions. */
const LINK_PAD = 10;

/** @type {number} Number of colours in each palette (must match QUAD_PALETTES entry length). */
const PALETTE_SIZE = 5;
/** @type {number} Palette index steps per firefly index — spreads fireflies across the full palette. */
const PALETTE_STEP = 2;
/** @type {number} Angular speed (rad/s) of the twinkle oscillation. */
const TWINKLE_SPEED = 2;
/** @type {number} Per-firefly phase spread for twinkle, prevents lock-step pulsing. */
const TWINKLE_PHASE_SPREAD = 0.7;
/** @type {number} Alpha fraction at the mid radial-gradient stop (creates the soft glow halo). */
const GLOW_MID_ALPHA = 0.6;
/** @type {number} Alpha fraction at the outer radial-gradient stop (fades to transparent). */
const GLOW_OUTER_ALPHA = 0.2;

// --- Setup ---

/** @type {HTMLCanvasElement} Full-viewport canvas for the firefly layer. */
const canvas = document.getElementById('fireflies');

// No fireflies on mobile — no cursor to follow
if (IS_MOBILE) canvas.style.display = 'none';

/** @type {CanvasRenderingContext2D} 2D drawing context for the firefly canvas. */
const ctx = canvas.getContext('2d');
/** @type {number} Current canvas / viewport width in pixels. */
let W = canvas.width = window.innerWidth;
/** @type {number} Current canvas / viewport height in pixels. */
let H = canvas.height = window.innerHeight;

/** @type {number} Latest mouse X position in viewport pixels. */
let mouseX = W / 2;
/** @type {number} Latest mouse Y position in viewport pixels. */
let mouseY = H / 2;

// --- Helpers ---

/**
 * Return a unit-length 2D vector pointing in a uniformly random direction.
 * @returns {{ x: number, y: number }}
 */
function randomUnit() {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/**
 * Sample the shared background palette at a fractional index in [0, 1),
 * linearly interpolating between adjacent colour entries.
 * Falls back to white if the palette is not yet available.
 * @param {number} t  Fractional palette position in [0, 1).
 * @returns {[number, number, number]} Normalised [r, g, b] triple.
 */
function samplePalette(t) {
  const pal = window._fireflyPalette;
  if (!pal || pal.length < PALETTE_SIZE) return [1, 1, 1];
  const x = (((t % 1) + 1) % 1) * (PALETTE_SIZE - 1);
  const i = Math.floor(x), f = x - i;
  const a = pal[i], b = pal[(i + 1) % PALETTE_SIZE];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/**
 * Distribute `n` points evenly around the perimeter of a padded bounding rect.
 * Points are placed in clockwise order starting from the top-left corner.
 * @param {DOMRect} rect  The element bounding rect (from getBoundingClientRect).
 * @param {number}  n     Number of slots to generate.
 * @returns {{ x: number, y: number }[]}
 */
function perimeterSlots(rect, n) {
  const x0 = rect.left - LINK_PAD, y0 = rect.top - LINK_PAD;
  const x1 = rect.right + LINK_PAD, y1 = rect.bottom + LINK_PAD;
  const w = x1 - x0, h = y1 - y0, perim = 2 * (w + h);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * perim;
    if (t < w) return { x: x0 + t, y: y0 };
    if (t < w + h) return { x: x1, y: y0 + (t - w) };
    if (t < 2 * w + h) return { x: x1 - (t - w - h), y: y1 };
    return { x: x0, y: y1 - (t - 2 * w - h) }; // left edge
  });
}

// --- Firefly class ---

/**
 * A single animated particle that gravitates toward the mouse (or a slot target),
 * wanders slightly to avoid convergence, and can be scattered by click events.
 */
class Firefly {
  /**
   * @param {number} index  Firefly index within the swarm (0 … NUM_FIREFLIES-1),
   *                        used to spread colours and twinkle phases.
   */
  constructor(index) {
    this.i = index;
    this.pos = { x: Math.random() * W, y: Math.random() * H };
    this.vel = randomUnit();
    /** @type {{ x: number, y: number }} Additional velocity applied by explosion events. */
    this.vMod = { x: 0, y: 0 };
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderSpeed = (0.02 + Math.random() * 0.03) * (Math.random() < 0.5 ? 1 : -1);
    /** @type {{ x: number, y: number } | null} Perimeter slot to orbit when hovering a link. */
    this.slotTarget = null;
  }

  /**
   * Advance the firefly by one frame.
   * Applies inverse-square gravity toward the target, optional wander noise,
   * velocity clamping, position integration, a catch-up rubber-band boost,
   * and explosion-modifier decay.
   */
  update() {
    const tx = this.slotTarget ? this.slotTarget.x : mouseX;
    const ty = this.slotTarget ? this.slotTarget.y : mouseY;

    // Gravity toward target (inverse-square, clamped to [MIN_G, MAX_G])
    const dx = tx - this.pos.x;
    const dy = ty - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const grav = Math.min(Math.max(GRAVITY / (dist * dist), MIN_G), MAX_G);
    this.vel.x += (dx / dist) * grav;
    this.vel.y += (dy / dist) * grav;

    if (this.slotTarget) {
      // Damping in slot mode — simulates friction to allow settling into a stable orbit around the slot target
      this.vel.x *= 0.99;
      this.vel.y *= 0.99;
    } else {
      // Wander — slowly-drifting per-firefly nudge, prevents convergence onto a single point
      this.wanderAngle += this.wanderSpeed;
      this.vel.x += Math.cos(this.wanderAngle) * WANDER_STR;
      this.vel.y += Math.sin(this.wanderAngle) * WANDER_STR;
    }

    // Clamp velocity — 25% cap in slot mode only once within SLOT_SLOW_DIST px of target
    const slotSlow = this.slotTarget && dist < SLOT_SLOW_DIST;
    const vMax = slotSlow ? V_MAX * SLOT_V_FACTOR : V_MAX;
    const vMag = Math.sqrt(this.vel.x ** 2 + this.vel.y ** 2);
    if (vMag > vMax) {
      this.vel.x *= vMax / vMag;
      this.vel.y *= vMax / vMag;
    }

    // Move — position = velocity + explosion modifier (drift2 pattern)
    this.pos.x += this.vel.x + this.vMod.x;
    this.pos.y += this.vel.y + this.vMod.y;

    // Catch-up boost — scales linearly with distance, bypasses V_MAX
    // Random jitter rotation prevents all fireflies converging to identical orbits
    if (dist > CATCHUP_DIST && !this.vMod.x && !this.vMod.y) {
      const jitter = (Math.random() - 0.5) * (CATCHUP_JITTER_DEG * Math.PI / 180);
      const cos = Math.cos(jitter), sin = Math.sin(jitter);
      this.pos.x += (dx * cos - dy * sin) * CATCHUP_FACTOR;
      this.pos.y += (dx * sin + dy * cos) * CATCHUP_FACTOR;
    }

    // Decay explosion modifier (drift2 pattern)
    if (this.vMod.x || this.vMod.y) {
      const xd = this.vMod.x * EXPLODE_DECAY;
      const yd = this.vMod.y * EXPLODE_DECAY;
      this.vMod.x = Math.abs(xd) < EXPLODE_FINISH ? 0 : xd;
      this.vMod.y = Math.abs(yd) < EXPLODE_FINISH ? 0 : yd;
    }
  }

  /**
   * Render this firefly onto `ctx` as a soft radial-gradient glow.
   * @param {CanvasRenderingContext2D} ctx      The canvas 2D context to draw into.
   * @param {number}                  elapsed  Seconds since the animation started.
   */
  draw(ctx, elapsed) {
    // Compute colour — fixed per firefly index, spread evenly across the palette.
    // Using this.i / PALETTE_STEP as a fractional palette index (0, 0.5, 1, …, 4)
    // avoids the wrap bug in samplePalette by keeping values strictly < PALETTE_SIZE.
    const pal = window._fireflyPalette;
    let rgb;
    if (!pal || pal.length < PALETTE_SIZE) {
      rgb = [1, 1, 1];
    } else {
      const t = this.i / PALETTE_STEP;
      const a = pal[Math.floor(t)], b = pal[Math.ceil(t) % PALETTE_SIZE];
      const f = t % 1;
      rgb = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }

    // Twinkle + glow radius — each firefly oscillates at the same speed but a unique phase
    const twinkle = 0.5 + 0.5 * Math.sin(elapsed * TWINKLE_SPEED + this.i * TWINKLE_PHASE_SPREAD);
    const alpha = (0.5 + 0.5 * twinkle).toFixed(3);
    const glow = GLOW_MIN + (GLOW_MAX - GLOW_MIN) * twinkle;
    const rgbStr = rgb.map(c => Math.round(c * 255)).join(',');

    // Gaussian-like radial gradient — bright core fading through three stops to transparent
    const grad = ctx.createRadialGradient(
      this.pos.x, this.pos.y, 0,
      this.pos.x, this.pos.y, glow
    );
    grad.addColorStop(0, `rgba(${rgbStr},${alpha})`);
    grad.addColorStop(0.15, `rgba(${rgbStr},${(alpha * GLOW_MID_ALPHA).toFixed(3)})`);
    grad.addColorStop(0.4, `rgba(${rgbStr},${(alpha * GLOW_OUTER_ALPHA).toFixed(3)})`);
    grad.addColorStop(1, `rgba(${rgbStr},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(this.pos.x - glow, this.pos.y - glow, glow * 2, glow * 2);
  }
}

// --- Init ---

/** @type {Firefly[]} The active swarm of firefly particles. */
const fireflies = Array.from({ length: NUM_FIREFLIES }, (_, i) => new Firefly(i));

// --- Events ---

/**
 * Walk up the DOM to find the nearest hoverable ancestor — an `<a>` tag or a `.nav-marker` div.
 * @param {EventTarget} el  The element that received the event.
 * @returns {Element | null}
 */
function getHoverTarget(el) {
  return el.closest('a') || el.closest('.nav-marker');
}

document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

document.addEventListener('mouseover', e => {
  const target = getHoverTarget(e.target);
  if (!target) return;
  const slotEl = target.classList.contains('nav-marker') ? (target.querySelector('span') || target) : target;
  const slots = perimeterSlots(slotEl.getBoundingClientRect(), NUM_FIREFLIES);
  fireflies.forEach((f, i) => { f.slotTarget = slots[i]; });
});

document.addEventListener('mouseout', e => {
  if (getHoverTarget(e.target)) fireflies.forEach(f => { f.slotTarget = null; });
});

document.addEventListener('mousedown', e => {
  if (getHoverTarget(e.target)) return;
  fireflies.forEach(f => {
    const dx = f.pos.x - mouseX, dy = f.pos.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001 || dist > EXPLODE_RAD) return;
    const str = EXPLODE_STR * (EXPLODE_RAD - dist) / EXPLODE_RAD;
    f.vMod.x = (dx / dist) * str;
    f.vMod.y = (dy / dist) * str;
  });
});

window.addEventListener('resize', () => {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
});

// --- Render loop ---

/** @type {number} Minimum ms between frames, derived from the shared QUALITY setting. */
const frameInterval = 1000 / (typeof QUALITY !== 'undefined' ? QUALITY.fps : 60);
/** @type {number} Timestamp of the most recently rendered frame. */
let lastFrame = 0;
/** @type {number} Timestamp at which the animation started, used to compute elapsed time. */
const startTime = performance.now();

function frame(now) {
  if (now - lastFrame < frameInterval) { requestAnimationFrame(frame); return; }
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  const elapsed = (now - startTime) / 1000;
  ctx.clearRect(0, 0, W, H);
  fireflies.forEach(f => { f.update(); f.draw(ctx, elapsed); });
  requestAnimationFrame(frame);
}

if (!IS_MOBILE) requestAnimationFrame(frame);
