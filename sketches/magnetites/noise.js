// Noise mode height functions and mode manager — ported from noise_strategy.pde
// Uses simplex-noise v4 (CDN) as a drop-in replacement for Processing's noise().

import { createNoise3D } from 'simplex-noise';
import {
  MAX_HEIGHT, NOISE_OCTAVES, NOISE_FALLOFF,
  PERLIN_WAVE_SPATIAL_STEP, PERLIN_WAVE_TIME_SCALE, PERLIN_WAVE_SPEED,
  MULTI_AXIS_SPATIAL_STEP, MULTI_AXIS_TIME_SCALE, MULTI_AXIS_SPEED_X, MULTI_AXIS_SPEED_Y, MULTI_AXIS_SPEED_Z,
  DOMAIN_WARP_SPATIAL_STEP, DOMAIN_WARP_TIME_SCALE, DOMAIN_WARP_SPEED, DOMAIN_WARP_SCALE, DOMAIN_WARP_AMOUNT,
  MULTI_OCTAVE_SPATIAL_STEP, MULTI_OCTAVE_TIME_SCALE, MULTI_OCTAVE_COUNT, MULTI_OCTAVE_LACUNARITY, MULTI_OCTAVE_PERSISTENCE, MULTI_OCTAVE_BASE_SPEED
} from './settings.js';

/**
 * Create a Perlin-compatible noise function.
 * simplex-noise's createNoise3D returns values in [-1, 1].
 * Processing's noise() returns [0, 1], so we remap with (raw + 1) / 2.
 *
 * @returns {function(number, number, number): number} noise3D in [0, 1]
 */
export function createPerlinNoise() {
  const rawNoise = createNoise3D();
  return function noise3D(x, y, z) {
    let total = 0, amp = 1.0, freq = 1.0, maxAmp = 0;
    for (let i = 0; i < NOISE_OCTAVES; i++) {
      total += ((rawNoise(x * freq, y * freq, z * freq) + 1) / 2) * amp;
      maxAmp += amp;
      freq *= 2.0;
      amp *= NOISE_FALLOFF;
    }
    return total / maxAmp;
  };
}

/**
 * Mode 1: PerlinWaveNoise height calculation — matches Processing's Mode 1 exactly.
 *
 * @param {function} noise3D - noise function returned by createPerlinNoise()
 * @param {{x: number, y: number, z: number}} centroid - face centroid
 * @param {number} frameCount - current frame number
 * @returns {number} height in [0, MAX_HEIGHT]
 */
export function perlinWaveHeight(noise3D, centroid, frameCount) {
  const t = frameCount * PERLIN_WAVE_TIME_SCALE;
  return noise3D(
    centroid.x * PERLIN_WAVE_SPATIAL_STEP + t * PERLIN_WAVE_SPEED,
    centroid.y * PERLIN_WAVE_SPATIAL_STEP,
    centroid.z * PERLIN_WAVE_SPATIAL_STEP
  ) * MAX_HEIGHT;
}

/**
 * Mode 2: MultiAxisNoise — each axis animated at independent speeds.
 * Produces smooth transitions with a turbulent effect.
 */
export function multiAxisHeight(noise3D, centroid, frameCount) {
  const t = frameCount * MULTI_AXIS_TIME_SCALE;
  return noise3D(
    centroid.x * MULTI_AXIS_SPATIAL_STEP + t * MULTI_AXIS_SPEED_X,
    centroid.y * MULTI_AXIS_SPATIAL_STEP + t * MULTI_AXIS_SPEED_Y,
    centroid.z * MULTI_AXIS_SPATIAL_STEP + t * MULTI_AXIS_SPEED_Z
  ) * MAX_HEIGHT;
}

/**
 * Mode 3: DomainWarpNoise — noise coordinates are warped by secondary noise lookups.
 * Produces jagged, organic-looking transitions.
 */
export function domainWarpHeight(noise3D, centroid, frameCount) {
  const t = frameCount * DOMAIN_WARP_TIME_SCALE * DOMAIN_WARP_SPEED;
  const wx = noise3D(centroid.x * DOMAIN_WARP_SCALE + t, centroid.y * DOMAIN_WARP_SCALE, centroid.z * DOMAIN_WARP_SCALE) * DOMAIN_WARP_AMOUNT;
  const wy = noise3D(centroid.y * DOMAIN_WARP_SCALE + t, centroid.z * DOMAIN_WARP_SCALE, centroid.x * DOMAIN_WARP_SCALE) * DOMAIN_WARP_AMOUNT;
  const wz = noise3D(centroid.z * DOMAIN_WARP_SCALE + t, centroid.x * DOMAIN_WARP_SCALE, centroid.y * DOMAIN_WARP_SCALE) * DOMAIN_WARP_AMOUNT;
  return noise3D(
    centroid.x * DOMAIN_WARP_SPATIAL_STEP + wx,
    centroid.y * DOMAIN_WARP_SPATIAL_STEP + wy,
    centroid.z * DOMAIN_WARP_SPATIAL_STEP + wz
  ) * MAX_HEIGHT;
}

/**
 * Mode 4: MultiOctaveNoise — layered noise at increasing frequencies.
 * Hints of symmetry, but not quite. More CPU-intensive.
 */
const maxAmplitude = (() => {
  let total = 0, amp = 1.0;
  for (let i = 0; i < MULTI_OCTAVE_COUNT; i++) {
    total += amp;
    amp *= MULTI_OCTAVE_PERSISTENCE;
  }
  return total;
})();

export function multiOctaveHeight(noise3D, centroid, frameCount) {
  let total = 0, amp = 1.0, freq = MULTI_OCTAVE_SPATIAL_STEP;
  for (let i = 0; i < MULTI_OCTAVE_COUNT; i++) {
    const t = frameCount * MULTI_OCTAVE_TIME_SCALE * MULTI_OCTAVE_BASE_SPEED * (i + 1);
    const nx = centroid.x * freq + (i === 0 ? t : 0);
    const ny = centroid.y * freq + (i === 1 ? t : 0);
    const nz = centroid.z * freq + (i === 2 ? t : 0);
    total += noise3D(nx, ny, nz) * amp;
    freq *= MULTI_OCTAVE_LACUNARITY;
    amp *= MULTI_OCTAVE_PERSISTENCE;
  }
  return (total / maxAmplitude) * MAX_HEIGHT;
}

// Mode manager — matches Processing's NoiseStrategy[] and keyPressed() switching
export const NOISE_MODES = [
  { key: 1, label: '1: Perlin Wave. Visible symmetry.', heightFn: perlinWaveHeight },
  { key: 2, label: '2: Multi-Axis. Smooth transitions, but turbulent effect.', heightFn: multiAxisHeight },
  { key: 3, label: '3: Domain Warping. Transitions are more jagged.', heightFn: domainWarpHeight },
  { key: 4, label: '4: Multi-Octave. Hints of symmetry, but not quite.', heightFn: multiOctaveHeight },
];

let currentModeIndex = 1; // default mode 2 (0-indexed: 1 = Multi-Axis)

export function getCurrentMode() {
  return NOISE_MODES[currentModeIndex];
}

export function setMode(n) {
  if (n >= 1 && n <= NOISE_MODES.length) {
    currentModeIndex = n - 1;
  }
}
