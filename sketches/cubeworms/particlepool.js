// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// InstancedMesh pool for lure particles. Manages P_COUNT particles plus trail points
// across both the faces and vertices scenes.

import { InstancedMesh, MeshPhongMaterial, MeshBasicMaterial, Color, Object3D } from 'three';
import { particleSphereGeo } from './geometry.js';
import { P_COUNT, P_TRAIL_LEN, SHININESS } from './settings.js';

// particles + trail points per particle
const MAX_PARTICLE_INSTANCES = P_COUNT + P_COUNT * P_TRAIL_LEN;

// Reusable temp objects
const _obj = new Object3D();
const _color = new Color();

export class ParticlePool {
  constructor(facesScene, verticesScene) {
    // Faces scene: lit particle spheres
    const faceMat = new MeshPhongMaterial({ shininess: SHININESS });
    this._facesMesh = new InstancedMesh(particleSphereGeo, faceMat, MAX_PARTICLE_INSTANCES);
    this._facesMesh.count = 0;
    this._facesMesh.frustumCulled = false;
    facesScene.add(this._facesMesh);

    // Vertices scene: unlit emissive-style spheres
    const vertMat = new MeshBasicMaterial();
    this._verticesMesh = new InstancedMesh(particleSphereGeo, vertMat, MAX_PARTICLE_INSTANCES);
    this._verticesMesh.count = 0;
    this._verticesMesh.frustumCulled = false;
    verticesScene.add(this._verticesMesh);

    this._count = 0;
  }

  get maxInstances() { return MAX_PARTICLE_INSTANCES; }

  // Set the active instance count for the current frame
  setCount(count) {
    this._count = Math.min(count, MAX_PARTICLE_INSTANCES);
    this._facesMesh.count = this._count;
    this._verticesMesh.count = this._count;
  }

  // Set transform for instance at given index
  setTransform(index, x, y, z, scale) {
    _obj.position.set(x, y, z);
    _obj.scale.setScalar(scale);
    _obj.updateMatrix();
    this._facesMesh.setMatrixAt(index, _obj.matrix);
    this._verticesMesh.setMatrixAt(index, _obj.matrix);
  }

  // Set face-scene colour for instance at given index (THREE.Color or r,g,b)
  setFaceColor(index, color) {
    this._facesMesh.setColorAt(index, color);
  }

  // Set vertex-scene colour for instance at given index
  setVertColor(index, color) {
    this._verticesMesh.setColorAt(index, color);
  }

  // Flag instance buffers for GPU upload — call once after all setTransform/setColor calls
  flush() {
    if (this._count > 0) {
      this._facesMesh.instanceMatrix.needsUpdate = true;
      this._verticesMesh.instanceMatrix.needsUpdate = true;
      if (this._facesMesh.instanceColor) this._facesMesh.instanceColor.needsUpdate = true;
      if (this._verticesMesh.instanceColor) this._verticesMesh.instanceColor.needsUpdate = true;
    }
  }

  // Show/hide the particle meshes (e.g. when lure is inactive)
  setVisible(visible) {
    this._facesMesh.visible = visible;
    this._verticesMesh.visible = visible;
  }

  dispose() {
    this._facesMesh.dispose();
    this._verticesMesh.dispose();
    this._facesMesh.material.dispose();
    this._verticesMesh.material.dispose();
  }
}
