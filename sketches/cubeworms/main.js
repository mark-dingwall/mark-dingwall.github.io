// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

import * as THREE from 'three';
import {
  initRuntimeSettings, CAMERA_Z, NEAR_CLIP_DIVISOR, SKETCH_Z,
  MOUSE_SENSITIVITY, INIT_ZOOM, ZOOM_STEP, MIN_ZOOM, MAX_ZOOM,
  WORM_COUNT, L_F_X_LEN, L_F_Y_LEN, LURE_Z
} from './settings.js';
import { RenderPipeline } from './renderpipeline.js';
import { TrailPool } from './trailpool.js';
import { ParticlePool } from './particlepool.js';
import { WormSlot } from './wormslot.js';
import { Sleepworm } from './sleepworm.js';
import { Hypnoworm } from './hypnoworm.js';
import { Lure } from './lure.js';
import { setWormContext, getWormContext } from './wormcontext.js';

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

// runtime settings (must be called before camera creation — CAMERA_Z depends on window height)
initRuntimeSettings(window.innerWidth, window.innerHeight);

// camera
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(
  60, aspect,
  CAMERA_Z / NEAR_CLIP_DIVISOR,
  10000
);
camera.position.z = CAMERA_Z;

// render pipeline (dual scenes + post-processing)
const pipeline = new RenderPipeline(renderer, camera);

// position both rotation groups at SKETCH_Z
pipeline.facesRotationGroup.position.z = SKETCH_Z;
pipeline.verticesRotationGroup.position.z = SKETCH_Z;

// trail pool (attached to both scenes' rotation groups)
const trailPool = new TrailPool(pipeline.facesRotationGroup, pipeline.verticesRotationGroup);

// particle pool
const particlePool = new ParticlePool(pipeline.facesRotationGroup, pipeline.verticesRotationGroup);

// Pre-set worm context before worm construction so Sleepworm stagger scan works
const worms = new Array(WORM_COUNT);
setWormContext({ worms, trailPool, lure: null });

// worm system
const edgesResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
for (let i = 0; i < WORM_COUNT; i++) {
  const slot = new WormSlot(
    pipeline.facesRotationGroup,
    pipeline.verticesRotationGroup,
    edgesResolution
  );
  worms[i] = new Sleepworm(i, slot);
}

// lure (created after worms so wormContext.lure is set after worm construction)
const lure = new Lure(pipeline.verticesRotationGroup, particlePool);
setWormContext({ worms, trailPool, lure, HypnowormClass: Hypnoworm });

// interaction state
const cumulativeQuat = new THREE.Quaternion();
let sketchScale = INIT_ZOOM;
let dragging = false;
let baseX = 0, baseY = 0;

// apply initial scale and sync rotation groups
function syncGroups() {
  const pos = new THREE.Vector3(0, 0, SKETCH_Z);
  const scale = new THREE.Vector3().setScalar(sketchScale * ZOOM_STEP);
  pipeline.syncRotationGroups(cumulativeQuat, pos, scale);
}
syncGroups();

// ─── Lure click unprojection ──────────────────────────────────────────────

function _unprojectLureClick(clientX, clientY) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const bx =  THREE.MathUtils.mapLinear(clientX - W / 2, -W / 2, W / 2, -L_F_X_LEN, L_F_X_LEN);
  const by = -THREE.MathUtils.mapLinear(clientY - H / 2, -H / 2, H / 2, -L_F_Y_LEN, L_F_Y_LEN);
  // Negate Y: Processing Y-down → Three.js Y-up
  const bPos = new THREE.Vector3(bx, by, LURE_Z);
  bPos.applyQuaternion(cumulativeQuat.clone().conjugate()); // un-rotate
  bPos.multiplyScalar(1 / (sketchScale * ZOOM_STEP));       // un-zoom
  return bPos;
}

// ─── Input handlers ───────────────────────────────────────────────────────

// left-click: place or detonate lure
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button === 0) {
    if (lure.isDetonating()) return; // ignore while detonating
    if (lure.isActive()) {
      lure.detonate();
    } else {
      lure.activate(_unprojectLureClick(e.clientX, e.clientY));
    }
  }
});

// right-click drag rotation
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button === 2) {
    baseX = e.clientX;
    baseY = e.clientY;
    dragging = true;
    renderer.domElement.setPointerCapture(e.pointerId);
  }
});

renderer.domElement.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - baseX;
  const dy = e.clientY - baseY;
  if (dx === 0 && dy === 0) return;

  const axis = new THREE.Vector3(-dy, dx, 0).normalize();
  const angle = Math.sqrt(dx * dx + dy * dy) * MOUSE_SENSITIVITY;
  const incrementalQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);

  cumulativeQuat.premultiply(incrementalQuat);
  cumulativeQuat.normalize();
  syncGroups();

  baseX = e.clientX;
  baseY = e.clientY;
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (e.button === 2) {
    dragging = false;
    renderer.domElement.releasePointerCapture(e.pointerId);
  }
});

renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

// scroll zoom
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = Math.sign(e.deltaY);
  sketchScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, sketchScale - delta));
  syncGroups();
}, { passive: false });

// backspace reset
window.addEventListener('keydown', (e) => {
  if (e.key === 'Backspace') {
    e.preventDefault();
    cumulativeQuat.identity();
    sketchScale = INIT_ZOOM;
    syncGroups();
  }
});

// resize handler
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  initRuntimeSettings(w, h);
  camera.aspect = w / h;
  camera.near = CAMERA_Z / NEAR_CLIP_DIVISOR;
  camera.position.z = CAMERA_Z;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  pipeline.resize(renderer.domElement.width, renderer.domElement.height);
  edgesResolution.set(w, h);
  for (let i = 0; i < WORM_COUNT; i++) {
    worms[i].slot().updateResolution(w, h);
  }
});

// ─── Animation loop ───────────────────────────────────────────────────────

const FRAME_MS = 1000 / 60;
let lastTime = 0;
let frameCount = 0;

function animate(now) {
  requestAnimationFrame(animate);
  if (now - lastTime < FRAME_MS) return;
  lastTime = now;
  frameCount++;

  for (let i = 0; i < WORM_COUNT; i++) {
    worms[i].update();
    worms[i].display();
  }
  trailPool.update();

  lure.update(frameCount);
  lure.display();

  pipeline.render();
}

requestAnimationFrame(animate);
