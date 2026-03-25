import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { generateIcosphereFaces } from './icosphere.js';
import { createPerlinNoise, getCurrentMode, setMode } from './noise.js';
import {
  SPHERE_RAD, SPHERE_DETAIL, MAX_HEIGHT, HEIGHT_LERP_FACTOR,
  LOW_COLOR_THRESHOLD, HIGH_COLOR_THRESHOLD, MAGNETITE_COLORS,
  BACKGROUND, CAMERA_DISTANCE, DAMPING_FACTOR,
  MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE, SPECULAR_COLOR, SHININESS
} from './settings.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(BACKGROUND);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);
camera.position.z = CAMERA_DISTANCE;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Camera controls — mouse drag to rotate, wheel to zoom (matching Processing camera.pde)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = DAMPING_FACTOR;
controls.enablePan = false;
controls.minDistance = MIN_CAMERA_DISTANCE;
controls.maxDistance = MAX_CAMERA_DISTANCE;

// Camera animation state for symmetry view
let cameraLerpTarget = null;
const CAMERA_LERP_SPEED = 0.05;

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// HUD element for noise mode label
const hudElement = document.getElementById('hud');

function updateHUD() {
  hudElement.textContent = getCurrentMode().label;
}

// Keyboard handler for noise mode switching (matches Processing's keyPressed)
window.addEventListener('keydown', (e) => {
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 4) {
    setMode(n);
    updateHUD();
  }
  if (e.key === 's' || e.key === 'S') {
    const dist = camera.position.length();
    cameraLerpTarget = new THREE.Vector3(dist, 0, 0);
  }
});

// Cancel camera lerp on user interaction
for (const evt of ['mousedown', 'wheel', 'touchstart']) {
  renderer.domElement.addEventListener(evt, () => { cameraLerpTarget = null; });
}

// Show default mode label on load
updateHUD();

// Lighting (matching Processing's lights() + lightSpecular(128,128,128))
scene.add(new THREE.AmbientLight(0x404040));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(1, 1, 1).normalize();
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-1, -0.5, -1);
scene.add(fillLight);

// Noise initialization
const noise3D = createPerlinNoise();

// Generate icosphere faces
const faces = generateIcosphereFaces(SPHERE_DETAIL); // 1280 faces

// Build faceData array — stores centroid, inner verts, and animated height per face
const faceData = faces.map(([v0, v1, v2]) => {
  const centroid = new THREE.Vector3()
    .addVectors(v0, v1).add(v2).divideScalar(3).normalize();

  const innerVerts = [
    v0.clone().multiplyScalar(SPHERE_RAD),
    v1.clone().multiplyScalar(SPHERE_RAD),
    v2.clone().multiplyScalar(SPHERE_RAD),
  ];

  return {
    centroid: { x: centroid.x, y: centroid.y, z: centroid.z },
    innerVerts,
    curHeight: 0, // starts at 0, lerps toward noise target — creates grow-in effect
  };
});

// Color palette and interpolation (ported from magnetite.pde calculateColour)
const colorPalette = MAGNETITE_COLORS.map(hex => new THREE.Color(hex));
const lowThreshold = MAX_HEIGHT * LOW_COLOR_THRESHOLD;   // 87.5
const highThreshold = MAX_HEIGHT * HIGH_COLOR_THRESHOLD;  // 262.5
const tempColor = new THREE.Color();

function calculateColor(curHeight) {
  if (curHeight <= lowThreshold) return colorPalette[0];
  if (curHeight >= highThreshold) return colorPalette[colorPalette.length - 1];

  const colorSegmentSize = (highThreshold - lowThreshold) / (colorPalette.length - 1);
  const fromIndex = Math.floor((curHeight - lowThreshold) / colorSegmentSize);
  const toIndex = Math.min(fromIndex + 1, colorPalette.length - 1);
  const lerpAmount = ((curHeight - lowThreshold) - fromIndex * colorSegmentSize) / colorSegmentSize;

  tempColor.copy(colorPalette[fromIndex]).lerp(colorPalette[toIndex], lerpAmount);
  return tempColor;
}

// Geometry construction — single merged BufferGeometry
// Each prism = 8 triangles = 24 vertices. Total: 1280 * 24 = 30720 vertices.
const VERTS_PER_PRISM = 24;
const totalVerts = faceData.length * VERTS_PER_PRISM;
const positions = new Float32Array(totalVerts * 3);
const colors = new Float32Array(totalVerts * 3);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// Material — vertexColors for per-crystal palette coloring
const material = new THREE.MeshPhongMaterial({
  vertexColors: true,
  specular: SPECULAR_COLOR,
  shininess: SHININESS,
  flatShading: true,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Edge/stroke rendering — thin black wireframe on all crystal edges
// Processing uses stroke(0, 0, 0, 100) in HSB mode with alpha max 100 = fully opaque black
const edgeMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  wireframe: true,
});
const edgeMesh = new THREE.Mesh(geometry, edgeMaterial);
scene.add(edgeMesh);

// Helper: write a vertex into positions array at the given write index
function writeVertex(vi, x, y, z) {
  positions[vi]     = x;
  positions[vi + 1] = y;
  positions[vi + 2] = z;
}

// Helper: write color to all 24 vertices of a prism
function writePrismColor(faceIndex, color) {
  const base = faceIndex * VERTS_PER_PRISM * 3;
  for (let v = 0; v < VERTS_PER_PRISM; v++) {
    const offset = base + v * 3;
    colors[offset]     = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }
}

// Helper: rebuild the 24 vertices for prism at faceIndex with given height
function updatePrismGeometry(faceIndex, curHeight) {
  const face = faceData[faceIndex];
  const inner = face.innerVerts;
  const c = face.centroid;

  // Offset vector = centroid * curHeight
  const ox = c.x * curHeight;
  const oy = c.y * curHeight;
  const oz = c.z * curHeight;

  // Outer vertices = inner + offset
  const outerX = [inner[0].x + ox, inner[1].x + ox, inner[2].x + ox];
  const outerY = [inner[0].y + oy, inner[1].y + oy, inner[2].y + oy];
  const outerZ = [inner[0].z + oz, inner[1].z + oz, inner[2].z + oz];

  let vi = faceIndex * VERTS_PER_PRISM * 3;

  // Inner cap (reversed winding for inward-facing normal)
  writeVertex(vi, inner[0].x, inner[0].y, inner[0].z); vi += 3;
  writeVertex(vi, inner[2].x, inner[2].y, inner[2].z); vi += 3;
  writeVertex(vi, inner[1].x, inner[1].y, inner[1].z); vi += 3;

  // Outer cap
  writeVertex(vi, outerX[0], outerY[0], outerZ[0]); vi += 3;
  writeVertex(vi, outerX[1], outerY[1], outerZ[1]); vi += 3;
  writeVertex(vi, outerX[2], outerY[2], outerZ[2]); vi += 3;

  // Side quad: edge 0-1
  writeVertex(vi, inner[0].x, inner[0].y, inner[0].z); vi += 3;
  writeVertex(vi, inner[1].x, inner[1].y, inner[1].z); vi += 3;
  writeVertex(vi, outerX[1], outerY[1], outerZ[1]); vi += 3;
  writeVertex(vi, inner[0].x, inner[0].y, inner[0].z); vi += 3;
  writeVertex(vi, outerX[1], outerY[1], outerZ[1]); vi += 3;
  writeVertex(vi, outerX[0], outerY[0], outerZ[0]); vi += 3;

  // Side quad: edge 1-2
  writeVertex(vi, inner[1].x, inner[1].y, inner[1].z); vi += 3;
  writeVertex(vi, inner[2].x, inner[2].y, inner[2].z); vi += 3;
  writeVertex(vi, outerX[2], outerY[2], outerZ[2]); vi += 3;
  writeVertex(vi, inner[1].x, inner[1].y, inner[1].z); vi += 3;
  writeVertex(vi, outerX[2], outerY[2], outerZ[2]); vi += 3;
  writeVertex(vi, outerX[1], outerY[1], outerZ[1]); vi += 3;

  // Side quad: edge 2-0
  writeVertex(vi, inner[2].x, inner[2].y, inner[2].z); vi += 3;
  writeVertex(vi, inner[0].x, inner[0].y, inner[0].z); vi += 3;
  writeVertex(vi, outerX[0], outerY[0], outerZ[0]); vi += 3;
  writeVertex(vi, inner[2].x, inner[2].y, inner[2].z); vi += 3;
  writeVertex(vi, outerX[0], outerY[0], outerZ[0]); vi += 3;
  writeVertex(vi, outerX[2], outerY[2], outerZ[2]); vi += 3;
}

// Frame counter (integer, matches Processing's frameCount behavior)
let frameCount = 0;

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update each face: compute noise target, lerp height, compute color, update geometry
  for (let i = 0; i < faceData.length; i++) {
    const face = faceData[i];

    // Compute noise-driven target height
    const targetHeight = getCurrentMode().heightFn(noise3D, face.centroid, frameCount);

    // Lerp current height toward target (matches magnetite.pde update())
    face.curHeight += (targetHeight - face.curHeight) * HEIGHT_LERP_FACTOR;

    // Update prism vertex positions
    updatePrismGeometry(i, face.curHeight);

    // Compute and write per-crystal color based on height
    const color = calculateColor(face.curHeight);
    writePrismColor(i, color);
  }

  // Mark attributes for GPU upload
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;

  // Recompute normals (heights change every frame)
  geometry.computeVertexNormals();

  // Update controls (required for damping)
  controls.update();

  // Smooth camera lerp toward symmetry view target
  if (cameraLerpTarget) {
    camera.position.lerp(cameraLerpTarget, CAMERA_LERP_SPEED);
    camera.lookAt(controls.target);
    if (camera.position.distanceTo(cameraLerpTarget) < 0.5) {
      camera.position.copy(cameraLerpTarget);
      cameraLerpTarget = null;
    }
  }

  // Render
  renderer.render(scene, camera);

  frameCount++;
}

animate();

// Exports for later phases
export { scene, camera, renderer };
