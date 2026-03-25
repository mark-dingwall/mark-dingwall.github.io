// Tunable sketch parameters — adapted from settings.pde for Three.js
// Values are adjusted from Processing originals to suit the Three.js camera and material model.

// Camera / interaction
export const CAMERA_DISTANCE = 600;
export const MIN_CAMERA_DISTANCE = 200;
export const MAX_CAMERA_DISTANCE = 2000;
export const DAMPING_FACTOR = 0.1;
export const SPECULAR_COLOR = 0x444444;
export const SHININESS = 30;
export const BACKGROUND = 0x000000;

// Sphere
export const SPHERE_RAD = 200;
export const SPHERE_DETAIL = 3;

// Magnetite (shared)
export const MAX_HEIGHT = 350;
export const HEIGHT_LERP_FACTOR = 0.03;
export const NOISE_OCTAVES = 4;      // number of octave layers (Processing default: 4)
export const NOISE_FALLOFF = 0.5;    // amplitude persistence per octave (Processing default: 0.5)
export const MAGNETITE_COLORS = [0xFF00FF, 0x0000FF, 0x00FFFF, 0x00FF00, 0xFFFF00, 0xFF0000];
export const LOW_COLOR_THRESHOLD = 0.25;
export const HIGH_COLOR_THRESHOLD = 0.75;

// Per-mode spatial step (lower = smoother variation between neighbours)
// Per-mode time scale  (lower = slower animation; compensates 60fps vs Processing's ~30fps)

// Mode 1: Perlin Wave
export const PERLIN_WAVE_SPATIAL_STEP = 0.6;
export const PERLIN_WAVE_TIME_SCALE = 0.3;
export const PERLIN_WAVE_SPEED = 0.005;

// Mode 2: Multi-Axis
export const MULTI_AXIS_SPATIAL_STEP = 0.5;
export const MULTI_AXIS_TIME_SCALE = 0.1;
export const MULTI_AXIS_SPEED_X = 0.005;
export const MULTI_AXIS_SPEED_Y = 0.003;
export const MULTI_AXIS_SPEED_Z = 0.007;

// Mode 3: Domain Warp
export const DOMAIN_WARP_SPATIAL_STEP = 0.4;
export const DOMAIN_WARP_TIME_SCALE = 0.5;
export const DOMAIN_WARP_SPEED = 0.004;
export const DOMAIN_WARP_SCALE = 0.8;
export const DOMAIN_WARP_AMOUNT = 2.0;

// Mode 4: Multi-Octave
export const MULTI_OCTAVE_SPATIAL_STEP = 0.4;
export const MULTI_OCTAVE_TIME_SCALE = 0.5;
export const MULTI_OCTAVE_COUNT = 3;
export const MULTI_OCTAVE_LACUNARITY = 2.0;
export const MULTI_OCTAVE_PERSISTENCE = 0.5;
export const MULTI_OCTAVE_BASE_SPEED = 0.004;
