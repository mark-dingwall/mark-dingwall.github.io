// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Owns all Three.js mesh objects for one worm across both scenes.
// Persists across state transitions (old behaviour GC'd, meshes stay).

import { Mesh, MeshPhongMaterial, MeshBasicMaterial, Vector3, Quaternion, Euler } from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { wormCubeGeo, wormEdgesLineGeo, facecubeGeo, facecubeEdgesLineGeo } from './geometry.js';
import { SHININESS, FACECUBE_SIZE } from './settings.js';

// Reusable temp objects
const _localOffset = new Vector3();
const _worldOffset = new Vector3();
const _localRotQuat = new Quaternion();
const _euler = new Euler();

export class WormSlot {
  constructor(facesGroup, verticesGroup, resolution) {
    this._facesGroup = facesGroup;
    this._verticesGroup = verticesGroup;

    // Main worm cube — face mesh (lit, in faces scene)
    this._faceMat = new MeshPhongMaterial({ shininess: SHININESS });
    this._faceMesh = new Mesh(wormCubeGeo, this._faceMat);
    this._faceMesh.frustumCulled = false;
    facesGroup.add(this._faceMesh);

    // Occlusion cube (black, in vertices scene — prevents bloom bleeding through cube)
    this._occlusionMat = new MeshBasicMaterial({ color: 0x000000 });
    this._occlusionMesh = new Mesh(wormCubeGeo, this._occlusionMat);
    this._occlusionMesh.frustumCulled = false;
    verticesGroup.add(this._occlusionMesh);

    // Glowing edges (fat lines, in vertices scene)
    this._edgesMat = new LineMaterial({
      linewidth: 1,
      resolution: resolution.clone()
    });
    this._edgesMesh = new LineSegments2(wormEdgesLineGeo, this._edgesMat);
    this._edgesMesh.frustumCulled = false;
    verticesGroup.add(this._edgesMesh);

    // Track all edge materials for resolution updates
    this._edgeMaterials = [this._edgesMat];

    // Facecube mesh trios (face + occlusion + edges per facecube)
    this._facecubeFaces = [];
    this._facecubeOcclusions = [];
    this._facecubeEdges = [];
    this._facecubeFaceMats = [];
    this._facecubeOcclusionMats = [];
    this._facecubeEdgeMats = [];
    this._facecubeCount = 0;

    this._resolution = resolution.clone();
  }

  // Create or destroy facecube mesh trios to match requested count
  setFacecubeCount(n) {
    while (this._facecubeCount < n) {
      // face mesh
      const fMat = new MeshPhongMaterial({ shininess: SHININESS });
      const fMesh = new Mesh(facecubeGeo, fMat);
      fMesh.frustumCulled = false;
      this._facesGroup.add(fMesh);
      this._facecubeFaces.push(fMesh);
      this._facecubeFaceMats.push(fMat);

      // occlusion mesh
      const oMat = new MeshBasicMaterial({ color: 0x000000 });
      const oMesh = new Mesh(facecubeGeo, oMat);
      oMesh.frustumCulled = false;
      this._verticesGroup.add(oMesh);
      this._facecubeOcclusions.push(oMesh);
      this._facecubeOcclusionMats.push(oMat);

      // edge mesh
      const eMat = new LineMaterial({
        linewidth: 1,
        resolution: this._resolution.clone()
      });
      const eMesh = new LineSegments2(facecubeEdgesLineGeo, eMat);
      eMesh.frustumCulled = false;
      this._verticesGroup.add(eMesh);
      this._facecubeEdges.push(eMesh);
      this._facecubeEdgeMats.push(eMat);
      this._edgeMaterials.push(eMat);

      this._facecubeCount++;
    }

    while (this._facecubeCount > n) {
      this._facecubeCount--;

      const fMesh = this._facecubeFaces.pop();
      this._facesGroup.remove(fMesh);
      this._facecubeFaceMats.pop().dispose();

      const oMesh = this._facecubeOcclusions.pop();
      this._verticesGroup.remove(oMesh);
      this._facecubeOcclusionMats.pop().dispose();

      const eMesh = this._facecubeEdges.pop();
      this._verticesGroup.remove(eMesh);
      const eMat = this._facecubeEdgeMats.pop();
      eMat.dispose();
      const idx = this._edgeMaterials.indexOf(eMat);
      if (idx !== -1) this._edgeMaterials.splice(idx, 1);
    }
  }

  // Apply position + quaternion to the main cube trio
  updateMainTransform(pos, quat) {
    this._faceMesh.position.copy(pos);
    this._faceMesh.quaternion.copy(quat);
    this._occlusionMesh.position.copy(pos);
    this._occlusionMesh.quaternion.copy(quat);
    this._edgesMesh.position.copy(pos);
    this._edgesMesh.quaternion.copy(quat);
  }

  // Scale the main cube trio (for Spawnworm animation)
  updateMainScale(scale) {
    this._faceMesh.scale.setScalar(scale);
    this._occlusionMesh.scale.setScalar(scale);
    this._edgesMesh.scale.setScalar(scale);
  }

  // Position facecubes in a YZ ring rotated to point radially outward.
  // Ports drawFacecubes from cubeworm.pde:151-160
  updateFacecubes(dist, size, rotOffset, parentPos, parentQuat) {
    const count = this._facecubeCount;
    const scaleFactor = size / FACECUBE_SIZE;
    const TWO_PI = Math.PI * 2;

    for (let i = 0; i < count; i++) {
      const theta = (i * TWO_PI / count) + rotOffset;

      // Local offset in parent's coordinate frame (YZ ring)
      _localOffset.set(0, Math.sin(theta) * dist, Math.cos(theta) * dist);
      // Transform to world space
      _worldOffset.copy(_localOffset).applyQuaternion(parentQuat);
      const wx = parentPos.x + _worldOffset.x;
      const wy = parentPos.y + _worldOffset.y;
      const wz = parentPos.z + _worldOffset.z;

      // Local rotation: rotateX(-HALF_PI - (TWO_PI/count) * i)
      const localRotX = -Math.PI / 2 - (TWO_PI / count) * i;
      _euler.set(localRotX, 0, 0);
      _localRotQuat.setFromEuler(_euler);
      // World quaternion = parentQuat * localRot
      const worldQuat = parentQuat.clone().multiply(_localRotQuat);

      // Apply to all three meshes (face, occlusion, edges)
      this._facecubeFaces[i].position.set(wx, wy, wz);
      this._facecubeFaces[i].quaternion.copy(worldQuat);
      this._facecubeFaces[i].scale.setScalar(scaleFactor);

      this._facecubeOcclusions[i].position.set(wx, wy, wz);
      this._facecubeOcclusions[i].quaternion.copy(worldQuat);
      this._facecubeOcclusions[i].scale.setScalar(scaleFactor);

      this._facecubeEdges[i].position.set(wx, wy, wz);
      this._facecubeEdges[i].quaternion.copy(worldQuat);
      this._facecubeEdges[i].scale.setScalar(scaleFactor);
    }
  }

  // Set face material colour and specular on main cube + all facecubes
  setFaceColor(color) {
    this._faceMat.color.copy(color);
    this._faceMat.specular.copy(color);
    for (let i = 0; i < this._facecubeCount; i++) {
      this._facecubeFaceMats[i].color.copy(color);
      this._facecubeFaceMats[i].specular.copy(color);
    }
  }

  // Set edge LineMaterial colour on main + all facecubes
  setEdgeColor(color) {
    this._edgesMat.color.copy(color);
    for (let i = 0; i < this._facecubeCount; i++) {
      this._facecubeEdgeMats[i].color.copy(color);
    }
  }

  // Set edge LineMaterial linewidth on main + all facecubes
  setEdgeWidth(width) {
    this._edgesMat.linewidth = width;
    for (let i = 0; i < this._facecubeCount; i++) {
      this._facecubeEdgeMats[i].linewidth = width;
    }
  }

  // Show/hide all meshes
  setVisible(visible) {
    this._faceMesh.visible = visible;
    this._occlusionMesh.visible = visible;
    this._edgesMesh.visible = visible;
    for (let i = 0; i < this._facecubeCount; i++) {
      this._facecubeFaces[i].visible = visible;
      this._facecubeOcclusions[i].visible = visible;
      this._facecubeEdges[i].visible = visible;
    }
  }

  setMainVisible(v) {
    this._faceMesh.visible = v;
    this._occlusionMesh.visible = v;
    this._edgesMesh.visible = v;
  }

  setFacecubesVisible(v) {
    for (let i = 0; i < this._facecubeCount; i++) {
      this._facecubeFaces[i].visible = v;
      this._facecubeOcclusions[i].visible = v;
      this._facecubeEdges[i].visible = v;
    }
  }

  facesGroup()    { return this._facesGroup; }
  verticesGroup() { return this._verticesGroup; }

  // Update all LineMaterial resolution values (call on window resize)
  updateResolution(w, h) {
    this._resolution.set(w, h);
    for (let i = 0; i < this._edgeMaterials.length; i++) {
      this._edgeMaterials[i].resolution.set(w, h);
    }
  }

  // Remove from scenes, dispose materials (NOT geometries — they're shared)
  dispose() {
    this._facesGroup.remove(this._faceMesh);
    this._verticesGroup.remove(this._occlusionMesh);
    this._verticesGroup.remove(this._edgesMesh);
    this._faceMat.dispose();
    this._occlusionMat.dispose();
    this._edgesMat.dispose();

    this.setFacecubeCount(0);
  }
}
