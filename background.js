"use strict";

// --- Config ---

/** @type {number} Per-frame lerp factor applied to smooth the raw mouse position. */
const MOUSE_LERP = 0.01;
/** @type {number} Speed at which the mouse offset contributes to the drift accumulator. */
const DRIFT_SPEED = 0.25;
/** @type {[number, number]} Baseline drift rates [x, y] applied every second regardless of mouse. */
const BASE_DRIFT = [0.05, 0.03];
/** @type {number} Scale applied to the smoothed mouse position before uploading as shader offset. */
const MOUSE_WARP_SCALE = 0.4;

const QUALITY = IS_MOBILE
  ? { scale: 0.5, fps: 30 }
  : { scale: 1.0, fps: 60 };

const RESOLUTION_SCALE = QUALITY.scale;
const FRAG_PRECISION = IS_MOBILE ? 'mediump' : 'highp';

// --- Quad textures & palettes ---

/** @type {{ path: string, mirror: boolean }[]} One noise texture per screen quadrant. */
const QUAD_TEXTURES = [
  { path: '.textures/SuperPerlin_01-256x256.png', mirror: false },  // TR(0)
  { path: '.textures/Spokes_07-256x256.png',      mirror: true  },  // BR(1)
  { path: '.textures/Voronoi_01-256x256.png',      mirror: false },  // BL(2)
  { path: '.textures/Cracks_01-256x256.png',       mirror: false },  // TL(3)
];

/** @type {[number, number, number][][]} Five-colour palettes, one per quadrant. */
const QUAD_PALETTES = [
  // hexPalette(["#8ecae6","#219ebc","#023047","#ffb703","#fb8500"]), // TR(0)
  // hexPalette(["#ff595e","#ffca3a","#8ac926","#1982c4","#6a4c93"]), // TR(0)
  hexPalette(["#ef476f","#ffd166","#06d6a0","#118ab2","#073b4c"]), // TR(0)
  hexPalette(["#f72585","#7209b7","#3a0ca3","#4361ee","#4cc9f0"]), // BR(1)
  hexPalette(["#ff4242","#a702d7","#1870f3","#18f370","#a7d702"]), // BL(2)
  hexPalette(["#3d348b","#7678ed","#f7b801","#f18701","#f35b04"]), // TL(3)
];

// --- Shaders ---

const VERT_SRC = `
attribute vec2 a_position;
uniform vec2 u_resolution;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  vec2 uv = a_position * 0.5 + 0.5;
  v_texCoord = uv * vec2(u_resolution.x / u_resolution.y, 1.0);
}`;

const FRAG_SRC = `
precision ${FRAG_PRECISION} float;

uniform float u_time;
#ifdef BLACK_HOLE
uniform vec2  u_black_hole_pos;
uniform vec2  u_mouse_offset;
#endif
uniform vec2  u_drift;
uniform sampler2D u_noise;
uniform sampler2D u_noiseB;
uniform float u_transition;
uniform vec3 u_pal[5];

varying vec2 v_texCoord;

// --- Gravitational lensing ---
const float WARP_STRENGTH        = 0.55; // domain-warp magnitude per noise layer
const float TIME_SCALE           = 0.08; // converts wall time to shader time
#ifdef BLACK_HOLE
const float EVENT_HORIZON_RADIUS = 0.12; // radius of the black-hole singularity
const float EHR_SQ               = 0.0144; // EVENT_HORIZON_RADIUS^2 (precomputed)
#endif

// --- Texture-transition warping ---
const float TRANSITION_WARP_AMP  = 0.2;  // spatial displacement amplitude during blend
                                          // peaks at t=0.5, zero at t=0 and t=1

// --- Layer coordinate scales ---
const float DETAIL_SCALE         = 0.35; // texCoord scale for the fine-detail layer
const float DETAIL_DRIFT_SCALE   = 0.8;  // drift influence on detail layer
const float MID_SCALE            = 0.2;  // texCoord scale for the mid-scale layer
const vec2  MID_DRIFT            = vec2(-0.4, 0.5); // asymmetric drift for mid layer
const float MID_MOUSE_SCALE      = 0.5;  // mouse influence on mid layer
const float BROAD_SCALE          = 0.1;  // texCoord scale for the broad-structure layer
const float BROAD_DRIFT_SCALE    = 0.25; // drift influence on broad layer
const float FIELD_B_SCALE        = 0.25; // texCoord scale for the second field sample
const float FIELD_B_DRIFT_SCALE  = 0.2;  // drift influence on field B

// --- Field mixing weights ---
const float MID_WARP_WEIGHT      = 2.0;  // mid-warp contribution to field A
const float DETAIL_WARP_WEIGHT   = 1.5;  // detail-warp contribution to field B

// --- Filament oscillation ---
const float FILAMENT_FREQ_A      = 3.5;  // spatial frequency for field A filaments
const float FILAMENT_FREQ_B      = 6.0;  // spatial frequency for field B filaments
const float TIME_DRIVE_A         = 0.5;  // time contribution to oscillation A
const float TIME_DRIVE_B         = 0.3;  // time contribution to oscillation B

// --- Glow (Lorentzian falloff, must be negative) ---
const float GLOW_FALLOFF_A       = -15.0; // primary glow spread
const float GLOW_FALLOFF_B       = -30.0; // secondary glow spread (tighter highlight)
const float GLOW_B_WEIGHT        = 0.5;   // contribution weight of secondary glow

// --- Palette lookup drive ---
const float PAL_FIELD_SCALE      = 2.0;  // fieldA multiplier for palette position
const float PAL_WARP_SCALE       = 0.5;  // combined-warp weight in palette position
const float PAL_TIME_DRIVE       = 0.1;  // time contribution to palette animation

// --- Final brightness ---
const float BRIGHTNESS           = 2.25;

vec3 gradientPalette(float t) {
  float x = fract(t) * 4.0;
  vec3 c = mix(u_pal[0], u_pal[1], clamp(x, 0.0, 1.0));
  c = mix(c, u_pal[2], clamp(x - 1.0, 0.0, 1.0));
  c = mix(c, u_pal[3], clamp(x - 2.0, 0.0, 1.0));
  c = mix(c, u_pal[4], clamp(x - 3.0, 0.0, 1.0));
  return c;
}

float sampleNoise(vec2 coord) {
  float a = texture2D(u_noise, coord).r;
  if (u_transition <= 0.0) return a;
  // Warp peaks at t=0.5 and is zero at both t=0 and t=1, so the
  // boundary between segments (B_warped→B_unwarped) has no discontinuity.
  float warpScale = u_transition * (1.0 - u_transition) * 4.0;
  vec2 warpOffset = (vec2(a, 1.0 - a) - 0.5) * TRANSITION_WARP_AMP * warpScale;
  float warped_b = texture2D(u_noiseB, coord + warpOffset).r;
  return mix(a, warped_b, u_transition);
}

void main() {
  float time = u_time * TIME_SCALE;

  vec2 texCoord = v_texCoord;

#ifdef BLACK_HOLE
  // Gravitational lensing — bend UVs away from the black-hole position
  vec2 toPixel = texCoord - u_black_hole_pos;
  float pixelDist = length(toPixel);
  float clampedDistSq = max(pixelDist * pixelDist, EHR_SQ);
  texCoord = u_black_hole_pos + toPixel * (1.0 - EHR_SQ / clampedDistSq);

  // Mask that smoothly hides geometry inside the event horizon
  float horizonMask = smoothstep(EVENT_HORIZON_RADIUS, EVENT_HORIZON_RADIUS * 1.04, pixelDist);
#endif

  // Layer 1 (fine detail) — high-frequency domain warp
  // Offsets are arbitrary decorrelation seeds, not tuneable parameters
#ifdef BLACK_HOLE
  vec2 detailCoord = texCoord * DETAIL_SCALE + u_drift * DETAIL_DRIFT_SCALE + u_mouse_offset;
#else
  vec2 detailCoord = texCoord * DETAIL_SCALE + u_drift * DETAIL_DRIFT_SCALE;
#endif
  vec2 detailWarp = (vec2(
    sampleNoise(detailCoord + vec2(0.0, 3.17)),
    sampleNoise(detailCoord + vec2(5.31, 0.0))
  ) - 0.5) * WARP_STRENGTH;

  // Layer 2 (mid-scale) — driven by the detail warp to cascade structure
#ifdef BLACK_HOLE
  vec2 midCoord = texCoord * MID_SCALE + detailWarp + u_drift * MID_DRIFT + u_mouse_offset * MID_MOUSE_SCALE;
#else
  vec2 midCoord = texCoord * MID_SCALE + detailWarp + u_drift * MID_DRIFT;
#endif
  vec2 midWarp = (vec2(
    sampleNoise(midCoord + vec2(1.73, 8.44)),
    sampleNoise(midCoord + vec2(6.29, 2.15))
  ) - 0.5) * WARP_STRENGTH;

  // Layer 3 (broad structure) — low-frequency base driven by the mid warp
  vec2 broadCoord = texCoord * BROAD_SCALE + midWarp + u_drift * BROAD_DRIFT_SCALE;
  float broadNoise = sampleNoise(broadCoord + vec2(3.91, 7.62));

  // Filament extraction — two scalar fields combine warp magnitudes with noise
  float fieldA = broadNoise + length(midWarp) * MID_WARP_WEIGHT;
  float fieldB = sampleNoise(texCoord * FIELD_B_SCALE + detailWarp + u_drift * FIELD_B_DRIFT_SCALE)
               + length(detailWarp) * DETAIL_WARP_WEIGHT;

  // Lorentzian glow pulses at two spatial frequencies to create filament ridges
  float oscillationA = abs(sin(fieldA * FILAMENT_FREQ_A + time * TIME_DRIVE_A));
  float oscillationB = abs(sin(fieldB * FILAMENT_FREQ_B + time * TIME_DRIVE_B));
  vec2 osc = vec2(oscillationA, oscillationB);
  vec2 g = osc * osc;
  vec2 glow = 1.0 / (1.0 - g * vec2(GLOW_FALLOFF_A, GLOW_FALLOFF_B));
  float glowIntensity = glow.x + glow.y * GLOW_B_WEIGHT;

  // Colour via gradient palette — fieldA drives hue, warp magnitude drives saturation
  vec3 color = gradientPalette(fieldA * PAL_FIELD_SCALE + length(detailWarp + midWarp) * PAL_WARP_SCALE + time * PAL_TIME_DRIVE);
  color *= glowIntensity;

  color *= BRIGHTNESS;
#ifdef BLACK_HOLE
  color *= horizonMask;
#endif

  gl_FragColor = vec4(color, 1.0);
}
`;

// --- WebGL module ---
// All WebGL-dependent code lives inside setup() so early returns work cleanly.

/**
 * Entry point for the WebGL background shader.
 * Grabs the canvas, compiles shaders, loads textures, and starts the render loop.
 * Exposed controls: `window.updateShaderPosition(pos)`.
 * Gracefully no-ops if the canvas element or WebGL context is unavailable.
 * @returns {void}
 */
function setup() {
  const canvas = document.getElementById('shaderBg');
  if (!canvas) { window.updateShaderPosition = () => {}; return; }

  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) {
    canvas.style.display = 'none';
    window.updateShaderPosition = () => {};
    return;
  }

  // --- Shader compilation ---

  /**
   * @param {number} type
   * @param {string} src
   * @returns {WebGLShader|null}
   */
  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[background] shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  // --- Texture loading ---

  /** @type {Map<string, { tex: WebGLTexture, loaded: boolean, callbacks: ((tex: WebGLTexture) => void)[] }>} */
  const textureCache = new Map();

  /**
   * Create a 1×1 opaque-black placeholder texture for use while the real image loads.
   * @returns {WebGLTexture}
   */
  function createPlaceholderTexture() {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]));
    return tex;
  }

  /**
   * Return the cached WebGLTexture for url, loading it if necessary.
   * Calls onLoaded once the texture is ready (may be synchronous if already cached).
   * @param {string} url
   * @param {boolean} mirror
   * @param {((tex: WebGLTexture) => void) | null} onLoaded
   * @returns {WebGLTexture}
   */
  function getOrLoadTexture(url, mirror, onLoaded) {
    // Cache hit path (already loaded or pending)
    if (textureCache.has(url)) {
      const entry = textureCache.get(url);
      if (entry.loaded) {
        if (onLoaded) onLoaded(entry.tex);
      } else if (onLoaded) {
        entry.callbacks.push(onLoaded);
      }
      return entry.tex;
    }

    // Cache miss: create placeholder, start image load
    const tex = createPlaceholderTexture();
    const entry = { tex, loaded: false, callbacks: onLoaded ? [onLoaded] : [] };
    textureCache.set(url, entry);

    const img = new Image();
    img.onload = () => {
      // On load: upload to GPU, set wrap/filter params, fire callbacks
      if (gl.isContextLost()) { textureCache.delete(url); return; }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      const wrap = mirror ? gl.MIRRORED_REPEAT : gl.REPEAT;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      entry.loaded = true;
      for (const cb of entry.callbacks) cb(tex);
      entry.callbacks.length = 0;
    };
    img.onerror = () => {
      console.error('[background] Failed to load texture: ' + url);
      textureCache.delete(url);
    };
    img.src = url;
    return tex;
  }

  // --- State ---

  /** @type {WebGLUniformLocation} */
  let uTime, uResolution, uBlackHolePos, uMouseOffset, uDrift, uTransition;
  /** @type {WebGLUniformLocation[]} */
  const uPalLocations = [];
  /** @type {(WebGLTexture|null)[]} */
  const glTextures = [null, null, null, null];

  let driftX = 0, driftY = 0;
  let mouseX = 0.5, mouseY = 0.5;
  let smoothX = 0.5, smoothY = 0.5;
  let startTime = 0;
  let pausedAt = 0;
  let pausedTotal = 0;
  let paused = false;
  let lastFrameTime = 0;
  const frameInterval = 1000 / QUALITY.fps;

  // Position-driven transition state (updated by updateShaderPosition)
  let currentTransition = 0;

  // --- Init ---

  /**
   * Compile shaders, upload geometry, collect uniform locations, load textures,
   * set the initial palette, and kick off the render loop.
   * @returns {void}
   */
  function init() {
    // Compile + link shaders
    const vs = compileShader(gl.VERTEX_SHADER, VERT_SRC);
    const fragDefines = IS_MOBILE ? '' : '#define BLACK_HOLE\n';
    const fs = compileShader(gl.FRAGMENT_SHADER, fragDefines + FRAG_SRC);
    if (!vs || !fs) {
      canvas.style.display = 'none';
      window.updateShaderPosition = () => {};
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[background] link error:', gl.getProgramInfoLog(program));
      canvas.style.display = 'none';
      window.updateShaderPosition = () => {};
      return;
    }
    gl.useProgram(program);

    // Upload fullscreen quad vertex data
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1
    ]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Collect uniform locations
    uTime        = gl.getUniformLocation(program, 'u_time');
    uResolution  = gl.getUniformLocation(program, 'u_resolution');
    uBlackHolePos = gl.getUniformLocation(program, 'u_black_hole_pos');
    uMouseOffset = gl.getUniformLocation(program, 'u_mouse_offset');
    uDrift       = gl.getUniformLocation(program, 'u_drift');

    const uNoise = gl.getUniformLocation(program, 'u_noise');
    gl.uniform1i(uNoise, 0);

    const uNoiseB = gl.getUniformLocation(program, 'u_noiseB');
    gl.uniform1i(uNoiseB, 1);

    uTransition = gl.getUniformLocation(program, 'u_transition');
    gl.uniform1f(uTransition, 0.0);

    for (let i = 0; i < 5; i++) {
      uPalLocations.push(gl.getUniformLocation(program, 'u_pal[' + i + ']'));
    }

    // Load textures (one per quad)
    for (const [idx, t] of QUAD_TEXTURES.entries()) {
      getOrLoadTexture(t.path, t.mirror, tex => { glTextures[idx] = tex; });
    }

    // Set initial palette to TR(0) and kick off render loop
    setPalette(QUAD_PALETTES[0], QUAD_PALETTES[0], 0);
    startTime = performance.now();
    resize();
    requestAnimationFrame(frame);
  }

  /**
   * Interpolate between two palettes and upload the result to the GPU.
   * Also writes the current palette to `window._fireflyPalette` so fireflies.js
   * can read it and stay colour-matched to the background.
   * @param {[number, number, number][]} fromPal
   * @param {[number, number, number][]} toPal
   * @param {number} frac
   * @returns {void}
   */
  function setPalette(fromPal, toPal, frac) {
    window._fireflyPalette = [];
    for (let i = 0; i < 5; i++) {
      const r = fromPal[i][0] + (toPal[i][0] - fromPal[i][0]) * frac;
      const g = fromPal[i][1] + (toPal[i][1] - fromPal[i][1]) * frac;
      const b = fromPal[i][2] + (toPal[i][2] - fromPal[i][2]) * frac;
      window._fireflyPalette.push([r, g, b]);
      gl.uniform3f(uPalLocations[i], r, g, b);
    }
  }

  /**
   * Resize the canvas to match its CSS size at the current device pixel ratio.
   * @returns {void}
   */
  function resize() {
    const dpr = window.devicePixelRatio * RESOLUTION_SCALE;
    canvas.width  = Math.floor(canvas.clientWidth  * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // --- Position-driven update ---

  /**
   * Update the shader to reflect the current scroll/navigation position.
   * `pos` is a continuous value in [0, 4) that maps to the four quadrant textures:
   * each integer segment fades from one quad's texture and palette to the next.
   * Binds the appropriate noise textures and interpolates the palette.
   * Called by the page's scroll/navigation handler.
   * @param {number} pos  Continuous position in [0, ∞); wrapped into [0, 4) internally.
   * @returns {void}
   */
  window.updateShaderPosition = function (pos) {
    const norm      = ((pos % 4) + 4) % 4;
    const seg       = Math.floor(norm);
    const frac      = norm - seg;
    const fromQuad  = seg;
    const toQuad    = (seg + 1) % 4;

    if (glTextures[fromQuad]) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glTextures[fromQuad]);
    }
    if (glTextures[toQuad]) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, glTextures[toQuad]);
    }

    currentTransition = frac;
    setPalette(QUAD_PALETTES[fromQuad], QUAD_PALETTES[toQuad], frac);
  };

  // --- Render loop ---

  /**
   * Per-frame WebGL update: cap frame rate, smooth mouse, accumulate drift,
   * upload uniforms, apply smoothstep transition, and draw.
   * @param {DOMHighResTimeStamp} now
   * @returns {void}
   */
  function frame(now) {
    if (paused) return;

    // Frame-rate cap
    if (now - lastFrameTime < frameInterval) {
      requestAnimationFrame(frame);
      return;
    }
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // Smooth mouse lerp
    smoothX += (mouseX - smoothX) * MOUSE_LERP;
    smoothY += (mouseY - smoothY) * MOUSE_LERP;

    // Drift accumulation (guard against large dt spikes on tab restore)
    if (dt > 0 && dt < 0.5) {
      driftX += ((smoothX - 0.5) * DRIFT_SPEED + BASE_DRIFT[0]) * dt;
      driftY += ((smoothY - 0.5) * DRIFT_SPEED + BASE_DRIFT[1]) * dt;
    }

    // Upload uniforms to GPU
    const elapsed = (performance.now() - startTime - pausedTotal) / 1000.0;
    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    // On mobile the BLACK_HOLE define is absent, so these uniforms don't exist
    // in the shader — gl.uniform2f(null, …) is a silent no-op per the WebGL spec.
    gl.uniform2f(uBlackHolePos, mouseX * canvas.width / canvas.height, mouseY);
    gl.uniform2f(uMouseOffset, (smoothX - 0.5) * MOUSE_WARP_SCALE, (smoothY - 0.5) * MOUSE_WARP_SCALE);
    gl.uniform2f(uDrift, driftX, driftY);

    // Smoothstep the transition for a nicer curve, then draw
    const t = currentTransition;
    const shaderT = t * t * (3.0 - 2.0 * t);
    gl.uniform1f(uTransition, shaderT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(frame);
  }

  // --- Events ---

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = 1.0 - e.clientY / window.innerHeight;
  });

  if (!IS_MOBILE) {
    document.addEventListener('touchmove', e => {
      mouseX = e.touches[0].clientX / window.innerWidth;
      mouseY = 1.0 - e.touches[0].clientY / window.innerHeight;
    }, { passive: true });
  }

  window.addEventListener('resize', resize);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      paused = true;
      pausedAt = performance.now();
    } else {
      const pauseDuration = performance.now() - pausedAt;
      pausedTotal += pauseDuration;
      paused = false;
      lastFrameTime = 0;
      requestAnimationFrame(frame);
    }
  });

  // --- Start ---

  init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}
