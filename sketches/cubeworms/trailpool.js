// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// InstancedMesh pool for trail cubes. Manages allocation/deallocation of instance
// slots across both the faces and vertices scenes.

import {
  InstancedMesh, Matrix4, MeshPhongMaterial, MeshBasicMaterial,
  Color, Object3D, Quaternion, Euler
} from 'three';
import { unitBoxGeo } from './geometry.js';
import { hsvToRgb } from './color.js';
import { FACE_BRIGHTNESS, MAX_SBA, TRAIL_DECAY, SHININESS } from './settings.js';

const MAX_TRAIL_INSTANCES = 1024;

// Reusable temp objects to avoid per-frame allocations
const _matrix = new Matrix4();
const _color = new Color();
const _obj = new Object3D();
const _euler = new Euler(0, 0, 0, 'ZYX');

export class TrailPool {
  constructor(facesScene, verticesScene) {
    // Faces scene: lit cubes with directional lighting
    const faceMat = new MeshPhongMaterial({ shininess: SHININESS });
    this._facesMesh = new InstancedMesh(unitBoxGeo, faceMat, MAX_TRAIL_INSTANCES);
    this._facesMesh.count = 0;
    this._facesMesh.frustumCulled = false;
    facesScene.add(this._facesMesh);

    // Vertices scene: unlit emissive-style cubes
    const vertMat = new MeshBasicMaterial();
    this._verticesMesh = new InstancedMesh(unitBoxGeo, vertMat, MAX_TRAIL_INSTANCES);
    this._verticesMesh.count = 0;
    this._verticesMesh.frustumCulled = false;
    verticesScene.add(this._verticesMesh);

    // Per-instance state: parallel arrays indexed by slot id
    this._alive = new Uint8Array(MAX_TRAIL_INSTANCES); // 0 = free, 1 = active
    this._size = new Float32Array(MAX_TRAIL_INSTANCES);
    this._posX = new Float32Array(MAX_TRAIL_INSTANCES);
    this._posY = new Float32Array(MAX_TRAIL_INSTANCES);
    this._posZ = new Float32Array(MAX_TRAIL_INSTANCES);
    this._rotX = new Float32Array(MAX_TRAIL_INSTANCES);
    this._rotY = new Float32Array(MAX_TRAIL_INSTANCES);
    this._rotZ = new Float32Array(MAX_TRAIL_INSTANCES);
    this._faceHue = new Float32Array(MAX_TRAIL_INSTANCES);
    this._faceSat = new Float32Array(MAX_TRAIL_INSTANCES);
    this._vertHue = new Float32Array(MAX_TRAIL_INSTANCES);
    this._vertSat = new Float32Array(MAX_TRAIL_INSTANCES);
    this._vertBright = new Float32Array(MAX_TRAIL_INSTANCES);

    this._activeCount = 0;
    // dense list of active slot indices for fast iteration
    this._activeSlots = [];
  }

  get activeCount() { return this._activeCount; }

  // Allocate a new trail cube. Returns slot index, or -1 if pool is full.
  allocate(faceHue, faceSat, vertHue, vertSat, vertBright, posX, posY, posZ, rotX, rotY, rotZ, size) {
    // find a free slot
    let slot = -1;
    for (let i = 0; i < MAX_TRAIL_INSTANCES; i++) {
      if (this._alive[i] === 0) {
        slot = i;
        break;
      }
    }
    if (slot === -1) return -1; // pool full

    this._alive[slot] = 1;
    this._size[slot] = size;
    this._posX[slot] = posX;
    this._posY[slot] = posY;
    this._posZ[slot] = posZ;
    this._rotX[slot] = rotX;
    this._rotY[slot] = rotY;
    this._rotZ[slot] = rotZ;
    this._faceHue[slot] = faceHue;
    this._faceSat[slot] = faceSat;
    this._vertHue[slot] = vertHue;
    this._vertSat[slot] = vertSat;
    this._vertBright[slot] = vertBright;

    this._activeSlots.push(slot);
    this._activeCount++;
    return slot;
  }

  // Free a slot
  _free(slot) {
    this._alive[slot] = 0;
    this._activeCount--;
  }

  // Update all active trail cubes: shrink, remove dead, rebuild instance data
  update() {
    // shrink and remove dead
    for (let i = this._activeSlots.length - 1; i >= 0; i--) {
      const slot = this._activeSlots[i];
      this._size[slot] -= TRAIL_DECAY;
      if (this._size[slot] <= 0) {
        this._free(slot);
        this._activeSlots.splice(i, 1);
      }
    }

    // rebuild instance matrices and colours from active slots
    const count = this._activeSlots.length;
    for (let i = 0; i < count; i++) {
      const slot = this._activeSlots[i];
      const s = this._size[slot];

      // compose transform: translate + rotateZ→rotateY→rotateX (ZYX order) + scale
      _euler.set(this._rotX[slot], this._rotY[slot], this._rotZ[slot]);
      _obj.position.set(this._posX[slot], this._posY[slot], this._posZ[slot]);
      _obj.rotation.copy(_euler);
      _obj.scale.set(s, s, s);
      _obj.updateMatrix();

      this._facesMesh.setMatrixAt(i, _obj.matrix);
      this._verticesMesh.setMatrixAt(i, _obj.matrix);

      // face colour: HSB → RGB with fixed brightness
      const fc = hsvToRgb(this._faceHue[slot], this._faceSat[slot], FACE_BRIGHTNESS);
      _color.setRGB(fc.r, fc.g, fc.b);
      this._facesMesh.setColorAt(i, _color);

      // vertex colour: HSB → RGB
      const vc = hsvToRgb(this._vertHue[slot], this._vertSat[slot], this._vertBright[slot]);
      _color.setRGB(vc.r, vc.g, vc.b);
      this._verticesMesh.setColorAt(i, _color);
    }

    // update instance count and flag for GPU upload
    this._facesMesh.count = count;
    this._verticesMesh.count = count;

    if (count > 0) {
      this._facesMesh.instanceMatrix.needsUpdate = true;
      this._verticesMesh.instanceMatrix.needsUpdate = true;
      if (this._facesMesh.instanceColor) this._facesMesh.instanceColor.needsUpdate = true;
      if (this._verticesMesh.instanceColor) this._verticesMesh.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    this._facesMesh.dispose();
    this._verticesMesh.dispose();
    this._facesMesh.material.dispose();
    this._verticesMesh.material.dispose();
  }
}
