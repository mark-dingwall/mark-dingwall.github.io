// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// mess with these to change the sketch's behaviour

// === Colour ===
export const MAX_H = 360; // HSB hue maximum (colour mode is HSB 360/100/100/100 throughout)
export const MAX_SBA = 100; // HSB saturation/brightness/alpha maximum

// === Input & Display ===
export const MOUSE_SENSITIVITY = 0.01; // affects click and drag to rotate
export const INIT_ZOOM = 16; // initial zoom (remember this will be multiplied by ZOOM_STEP!)
export const ZOOM_STEP = 0.0625; // how much we zoom in/out by on mouse wheel
export const MIN_ZOOM = 1; // minimum zoom level
export const MAX_ZOOM = 160; // maximum zoom level

// === Render / Graphics ===
export const BRIGHT_PASS = 0.0001; // ***MUST*** be a float! (Apparently glsl can't...)
export const BLUR_SIZE = 15; // ***MUST*** be an int! (... do implicit type conversion...)
export const BLUR_SIGMA = 15.0; // ***MUST*** be a float! (... between int and float)
export const BACKGROUND = 0; // background colour
export const D_LIGHT = 255; // strength of directional light shining on cubeworms
export const SHININESS = 25; // cubeworm shininess
export const GLOW_STRENGTH = 2; // number of times blur is added to sketch

// === Geometry ===
export const GRAV_PWR = 10000; // we use a kind of inverted gravity to contain worms
export const WALL_RAD = 1500; // radius of gravitationally repulsive sphere "wall"
export const SKETCH_Z = WALL_RAD * -1.5; // Z position of sketch (so that the camera isn't inside the grav wall)
// CAMERA_Z, HITHER, LURE_Z, L_F_Y_LEN, L_F_X_LEN depend on width/height which are only
// available after the renderer is created, so they cannot be const. They are assigned once
// in initRuntimeSettings() and treated as constants thereafter.
export let CAMERA_Z = 0; // Z-pos of camera, calculated in sketch setup
export const NEAR_CLIP_DIVISOR = 10; // Processing default: near clip plane = camera_z - camera_z/10
export let HITHER = 0; // hither/near face of view frustum, calculated in sketch setup
export const FOV_Y = Math.PI / 3; // default processing value for vertical field-of-view angle
export let L_F_Y_LEN = 0; // y-length of view frustum at lure z-pos. Calculated at runtime
export let L_F_X_LEN = 0; // x-length of view frustum at lure z-pos. Calculated at runtime

// === Lure ===
export const LURE_CORE = 20; // radius of sphere at core of lure
export const L_SPAWN_LEN = 45; // duration of lure core spawn animation
export const L_SPHERE_DETAIL = 8; // sphere detail settings for lure
export const L_CORE_COL = 0xffffff; // white
export const LURE_Z_PERC = 0.5; // for LURE_Z: percentage of distance between near point of grav wall & hither used as z pos
export let LURE_Z = 0; // calculated at runtime: LURE_Z_PERC % between near point of grav wall and hither/near frustum face
export const L_ROT_SPEED = (Math.PI * 2) / 240; // rotation speed of lure core
export const L_DET_FRAMES = 180; // detonation animation length in frames
export const L_DET_RAD_MULT = 14; // radius multiplier for lure core explosion animation
export const L_DET_ROT_STOP = 0.66; // % of detonation animation by which lure has stopped rotating
export const LURE_ATTRACT_RADIUS = 500; // radius around lure that cubeworms are attracted to. Limited to a spherical cap facing 0,0,0
export const LURE_CAP_HEIGHT = LURE_ATTRACT_RADIUS / 8; // height (offset from sphere pos) of spherical cap that cubeworms are attracted to
export const FASCINATE_RADIUS = LURE_ATTRACT_RADIUS * 2; // worms within this radius of lure become fascinated, unable to look away
export const LURE_CORE_REPULSE = -0.0006; // modifier for how strongly cubeworms are repulsed from lure core
export const LURE_HERD_STRENGTH = 0.00025; // how strongly worms are pushed back to near side of lure if they stray too far
export const P_COUNT = 180; // number of particles orbiting lure

// === Particles ===
export const P_RADIUS = 12; // radius of particle
export const P_LONGRES = 4; // longitudinal sphere detail setting for particles
export const P_LATRES = 1; // latitudinal sphere detail setting for particles
export const P_STROKE_WEIGHT = 0.5; // line weight of particles
export const P_X_AMP_MIN = 185; // min value of amplitude of sine wave for particle x pos
export const P_X_AMP_MAX = 215; // max value of amplitude of sine wave for particle x pos
export const P_Y_AMP_MIN = 100; // min value of amplitude of sine wave for particle y pos
export const P_Y_AMP_MAX = 120; // max value of amplitude of sine wave for particle y pos
export const P_Y_MOD_AMP = 0.5; // amplitude of yMod sine wave
export const P_Y_MOD_CONST = 2; // constant added to yMod sine wave
export const P_PERIOD = 450; // particle takes this many frames to complete a loop
export const P_ROT_SPEED = 120; // particle rotates 360 degrees once every this number of frames
export const P_SPAWN_FRAME = Math.trunc(P_PERIOD / 6); // animation frame on which particle starts
export const P_TRAIL_LEN = 4; // length of trail that particle leaves
export const P_TRAIL_FREQ = 10; // leave trail once every n frames
export const P_MIN_DET_MAG = 800; // minimum magnitude of final point in particle detonation path
export const P_MAX_DET_MAG = 1200; // maximum magnitude of final point in particle detonation path
export const P_MIN_DET_PATH_LEN = 2; // minimum number of positions on detonation path
export const P_MAX_DET_PATH_LEN = 10; // maximum number of positions on detonation path
export const P_DET_MIN_POS_MOD = -50; // minimum position modifier for detonation path positions
export const P_DET_MAX_POS_MOD = 50; // maximum position modifier for detonation path positions

// === Worms - General ===
export const WORM_COUNT = 15; // number of cubeworms
export const WORM_SIZE = 75; // size of worm's main cube
export const MIN_SAT = MAX_SBA * 0.7; // minimum saturation of colours used for cubeworms
export const MAX_SAT = MAX_SBA; // maximum saturation of colours used for cubeworms
export const FACE_BRIGHTNESS = 25; // brightness of wormcube faces
export const MIN_VERT_B = MAX_SBA * 0.8; // min brightness of vertices
export const MAX_VERT_B = MAX_SBA; // max brightness of vertices
export const MIN_FACECUBES = 3; // min number of "face cubes"
export const MAX_FACECUBES = 8; // max number of "face cubes"
export const FACECUBE_SIZE = 30; // size of facecubes
export const FACECUBE_DIST = 25 + FACECUBE_SIZE / 2 + WORM_SIZE / 2; // distance between cubeworm and facecube; 25 is visual padding

// spawnworm-specific properties
export const MIN_SPAWN_DELAY = 60; // minimum cubeworm (re-)spawn delay
export const MAX_SPAWN_DELAY = 150; // maximum cubeworm (re-)spawn delay
export const MAX_SPAWN_RAD = WALL_RAD * 0.75; // worms spawning next to wall are pushed to centre by gravity
export const ANIM_STEPS = 3; // number of steps in spawn animation
export const ANIM_STEP_LEN = 40; // duration of each step in spawn animation
export const SPAWN_TRAIL_DELAY_MOD = 15; // delay trailcubes by a bit immediately after spawning
export const SPAWN_STROKEW = 1; // stroke width for spawn anim. Must be < MAX_EDGE and > MIN_EDGE

// roamworm-specific properties
export const MAX_SPEED = 8; // maximum speed of cubeworm
export const MIN_EDGE = 0.08; // minimum thickness of glowing edge lines
export const MAX_EDGE = 2.8; // maximum thickness of glowing edge lines
export const MIN_PULSE_SPEED = 0.01; // min speed at which cubeworms pulse
export const MAX_PULSE_SPEED = 0.05; // max speed at which cubeworms pulse
export const MIN_HSB_LERP = 0.2; // min HSB fade speed
export const MAX_HSB_LERP = 0.5; // max HSB fade speed

// === Worms - Lure Interaction ===
export const ATTR_STR = 0.25; // strength of attraction to destination pos (travelworm)
export const LOOK_LIM_DIST_MOD = 0.2; // dist to lure * this + vel * ↓ = radius around lure worm looks at
export const LOOK_LIM_VEL_MOD = 15; // dist to lure * ↑ + vel * this = radius around lure worm looks at
export const MAX_TURN_RATE = 0.1; // max turn rate = (desired facing - current facing) * this (hypnoworm)
export const MIN_SURVIVAL_CHANCE = 0.6; // survival chance decreases with proximity to lure detonation

// pushworm-specific properties
export const SPEED_DECAY = 0.8; // rate at which worm slows down
export const MAX_PUSH_SPEED = MAX_SPEED * 10; // maximum speed worms can be pushed to
export const PUSH_SPEED_MOD = MAX_PUSH_SPEED / (1 / LURE_ATTRACT_RADIUS); // speed = (1 / distance from lure) * this

// splitworm-specific properties
export const MAX_SPLIT_SPEED = MAX_SPEED * 7; // maximum speed of splitworms
export const MAX_SPLIT_DEPTH = 4; // maximum number of times a worm fragment can split into sub-fragments
export const MIN_SPLIT_FRAGS = 2; // minimum number of sub-fragments a fragment can split into
export const MAX_SPLIT_FRAGS = 3; // maximum number of sub-fragments a fragment can split into
export const SPLIT_VOL_BOOST = 1.2; // on splitting, cheat by adding a bit of volume to each sub-fragment
export const FRAG_DECAY = 0.3; // rate at which fragments decay and shrink
export const STROKE_W_INC = 0.1; // increment width of vertice stroke until we hit MAX_EDGE
export const MAX_SPLIT_THETA = Math.PI / 8; // maximum angle at which a sub-fragment can split away from a parent fragment
export const FRAG_CHANCE = 1; // chance to fragment (note that we use FRAG_CHANCE^depth)
export const FRAG_MAX_POINT = 0.95; // maximum size % at which a fragment can subfragment
export const FRAG_MIN_POINT = 0.75; // minimum size % at which a fragment can subfragment
export const F_P_MAX_SIZE_MOD = 1.5; // when fragmenting, parent fragment size will be size * random(1/fragments, 1/fragments * this)
export const G_MAX_RADIUS = 6; // radius of glimmer trail points at maximum blink
export const G_AVERAGE_SPAWN = 1; // fragment glimmer trail spawns a point on average every this amount of fragment size reduced
export const G_MIN_SPAWN_XOFF = -1; // fragment glimmer minimum spawn offset
export const G_MAX_SPAWN_XOFF = 1; // fragment glimmer maximum spawn offset
export const G_MAX_SPAWN_YOFF = 4; // maximum number of pixels in Y a trail point can spawn from its fragment
export const G_BLINK_TIME = 45; // average number of frames a glimmer both blinks and rests for
export const G_MIN_ANIM = 0.5; // glimmer minimum animation speed
export const G_MAX_ANIM = 2; // glimmer maximum animation speed
export const G_BLINKS = 4; // base number of times a glimmer will blink before modifiers
export const GLIMMER_BLINK_MOD_MAX = 1.5; // maximum random modifier for number of times a glimmer will blink
export const GLIMMER_BLINK_MOD_MIN = 0.5; // minimum random modifier for number of times a glimmer will blink
export const G_INIT_SPEED_MOD = 0.5; // glimmer initial speed = fragment speed * this
export const G_Y_SPEED_MOD = 0.2; // glimmer movement in Y = X movement * this
export const G_SPEED_DECAY = 0.98; // glimmer speed decay per frame (speed *= this)

// explodeworm-specific properties
export const MAX_EXP_SPEED = MAX_SPEED * 9; // maximum speed of explodeworms
export const EXP_DET_SPEED = 0.1; // speed at which explodeworms detonate ("fuse" before explosion)
export const MAX_INIT_SPEED_MOD = 0.35; // max random modifier for initial speed (speed += (speed * some%))
export const EXP_PULSE_INC = 0.01; // increment of glow-pulse period (flash more quickly during explosion)
export const EXP_SPHERE_COUNT = 3; // number of spheres in explosion animation
export const EXP_OUTER_SPHERE_RECURSE = 3; // # of recursions for Icosasphere governing outermost explosion sphere
export const EXP_OUTER_SPHERE_RAD = 1000; // final radius of outermost explosion sphere. Inner spheres spaced linearly
export const EXPLODE_SPEED = 1.0 / 180; // speed at which explosion progresses (% per frame)
export const STAR_INIT_RAD = 1; // initial radius of explosion stars
export const STAR_MAX_RAD = 15; // maximum radius of explosion stars
export const STAR_PULSE_BEGIN = 0.5; // percentage of the way through explosion animation that the first sphere of stars begin pulsing
export const STAR_MIN_COL_DIFF = 50; // minimum amount of colour change allowed when star pulses
export const STAR_MAX_COL_DIFF = 100; // maximum amount of colour change allowed when star pulses
export const FACECUBE_EXP_DIST = EXP_OUTER_SPHERE_RAD * 1.4; // distance which facecubes travel from centre of explodeworm
export const FACETRAIL_SPAWN_FREQ = 5; // exploding facecubes spawn a trail point every n frames
export const FACETRAIL_DECAY = 0.5; // speed at which the trail left behind by exploding facecubes shrinks

// recoverworm-specific properties
export const RECOVER_RAD = (WALL_RAD - MAX_SPAWN_RAD) * 0.8; // become roamworm once within this radius of recover dest

// === Engine / Thruster ===
export const MIN_ENGINE_POWER = 0.05; // the minimum amplitude of a cosine engine
export const MAX_ENGINE_POWER = 0.2; // the maximum amplitude of a cosine engine
export const MIN_ENGINE_FUEL = 30; // the minimum period of a cosine engine
export const MAX_ENGINE_FUEL = 80; // the maximum period of a cosine engine
export const MIN_REFUEL_TIME = 20; // minimum number of frames between engine burns
export const MAX_REFUEL_TIME = 60; // maximum number of frames between engine burns

// === Cube Trail ===
export const TRAIL_MIN_RATE = 8; // minimum trailcube spawn frequency (1 every x frames)
export const TRAIL_MAX_RATE = 1; // maximum trailcube spawn frequency (1 every x frames)
export const TRAIL_DECAY = 1.2; // rate at which trailcubes shrink after spawning
export const TRAIL_MIN_SIZE = 0.6 * WORM_SIZE; // min trailcube size
export const TRAIL_MAX_SIZE = 0.85 * WORM_SIZE; // max trailcube size
export const TRAIL_MAX_SPAWN_RAD = 1.3 * WORM_SIZE; // radius around centre of worm in which trailcubes spawn (min is 0)
export const TRAIL_MIN_SPAWN_DIST = 5 + WORM_SIZE / 2; // min distance behind cubeworm that trailcube can spawn
export const TRAIL_MAX_SPAWN_DIST = 35 + WORM_SIZE / 2; // max distance behind cubeworm that trailcube can spawn
export const TRAIL_OFFSET_SIZE_MOD = 0.7; // the further a trailcube is from being directly behind a cubeworm, the smaller it gets
export const TRAIL_MAX_HUE_DIFF = 30; // max difference between cubeworm hue and trailcube hue
export const TRAIL_MAX_SAT_DIFF = 15; // max difference between cubeworm saturation and trailcube saturation

// Runtime settings calculated from window dimensions.
// Call initRuntimeSettings() once the renderer is created.
export function initRuntimeSettings(width, height) {
  CAMERA_Z = (height / 2.0) / Math.tan(Math.PI * 60.0 / 360.0); // default Processing camera z-pos
  HITHER = CAMERA_Z - (CAMERA_Z / NEAR_CLIP_DIVISOR); // default Processing hither/near z-pos of view frustum
  LURE_Z = SKETCH_Z + WALL_RAD; // Lure pos is LURE_Z_PERC % between near point of wall & hither
  LURE_Z = WALL_RAD + (HITHER - LURE_Z) * LURE_Z_PERC;
  LURE_Z -= LURE_CORE / 2;
  // knowing lure z pos & frustum fov angle, we can use trig to calc frustum dimensions at lure z
  const theta = FOV_Y / 2;
  L_F_Y_LEN = Math.tan(theta) * (CAMERA_Z - (SKETCH_Z + LURE_Z + LURE_CORE / 2)); // (SKETCH_Z is negative)
  L_F_X_LEN = L_F_Y_LEN * (width / height); // (actually these values are len/2)
}
