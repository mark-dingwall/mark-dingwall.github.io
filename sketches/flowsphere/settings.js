// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

const SPHERE_RGB = 200;
const SPHERE_ALPHA = 100;
const SPHERE_RES = 20;

// sector settings
const SECTOR_RES = 50;        // each sector of the flow field is n*n*n pixels (40 = ~8x fewer active sectors vs original 20)
const RADIUS_DIVISOR = 3;     // field radius = sketch width divided by this number
const FIELD_PADDING = 1;      // (minimum) number of empty sectors around edge of flowsphere
const NOISE_OFFSET = 10000;   // noise offset (probably don't change this)
const NOISE_SPEED = 0.0025;   // rate at which we move through noise space
const NOISE_INFLUENCE = 0.06; // strength of vectors created by noise
const NOISE_OCTAVES = 1;      // fractal octaves (1 = raw simplex, 4 ≈ original p5 Perlin quality)
const NOISE_USE_4D = false;   // true = independent time axis; false = 3D with time baked into spatial axes

// Desktop reference — the .pde baseline
const REFERENCE_WIDTH  = 1920;
const REFERENCE_HEIGHT = 1080;

// Particle scaling
const MAX_PARTICLES      = 10000; // cap (hit only at full desktop)
const MIN_PARTICLES      = 500;   // floor
const PARTICLE_SIZE_BASE = 2;     // dot strokeWeight at reference resolution

// AREA_RATIO_MULT: multiplier applied to the area-ratio particle count.
// 1.0 = pure area ratio. Increase to give more particles on smaller screens;
// decrease to further budget for weaker devices.
const AREA_RATIO_MULT = 1.5;

// FPS governor
const FPS_TARGET_LOW  = 27; // remove particles below this average
const FPS_TARGET_HIGH = 33; // add particles above this average

// particle settings
const PARTICLE_MIN_VELOCITY = -1;
const PARTICLE_MAX_VELOCITY = 1;
const PARTICLE_FRICTION = 0.01;
const PARTICLE_RANDOM_SPAWN = true;
const PARTICLE_WRAP_BUMP = 0.99;
const STUCK_VELOCITY_THRESHOLD = 0.0001;
const SLOW_PARTICLE_GREY = 127;
const MAX_SPEED_NORMALIZER = Math.sqrt(3.0); // must use Math.sqrt — file runs at parse time before p5 init

// debug settings
const DEBUG = false;         // FPS/particle logging (cheap — once per second)
const DEBUG_SECTORS = false; // draw sector force vectors every frame (very expensive)