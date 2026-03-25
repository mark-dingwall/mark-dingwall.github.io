// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Lure placed by left-click. Attracts worms to a spherical cap facing the origin,
// then detonates on second click. Hosts an orbiting particle cloud.

import * as THREE from 'three';
import { Plane } from './plane.js';
import { Particle } from './particle.js';
import { getWormContext } from './wormcontext.js';
import { lureSphereGeo } from './geometry.js';
import { easeInOut, easeOutCubic } from './mathutils.js';
import {
  P_COUNT,
  LURE_CORE, L_SPAWN_LEN, L_ROT_SPEED, L_DET_FRAMES,
  L_DET_RAD_MULT, L_DET_ROT_STOP,
  LURE_ATTRACT_RADIUS, LURE_CAP_HEIGHT
} from './settings.js';

export class Lure {
  constructor(verticesRotGroup, particlePool) {
    // Wireframe sphere mesh — rendered in the vertices (glow) scene
    this._mesh = new THREE.Mesh(
      lureSphereGeo,
      new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 1 })
    );
    this._mesh.frustumCulled = false;
    this._mesh.visible = false;
    verticesRotGroup.add(this._mesh);

    this._particlePool = particlePool;

    this._state = 'INACTIVE';
    this._pos = new THREE.Vector3();
    this._capPos = new THREE.Vector3();
    this._capPlane = null;
    this._capRad = 0;
    this._spawnFrame = 0;
    this._spinAngle = 0;
    this._detonationFrame = 0;
    this._particles = [];
  }

  // ─── State queries ────────────────────────────────────────────────────────

  isActive()     { return this._state === 'ACTIVE'; }
  isDetonating() { return this._state === 'DETONATING'; }
  isInactive()   { return this._state === 'INACTIVE'; }

  detonationPercent() {
    return this._detonationFrame / L_DET_FRAMES;
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  pos()      { return this._pos; }
  capPos()   { return this._capPos; }
  capPlane() { return this._capPlane; }
  capRad()   { return this._capRad; }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  activate(pos) {
    this._pos.copy(pos);
    this._state = 'ACTIVE';
    this._spawnFrame = 0;
    this._spinAngle = 0;
    this._detonationFrame = 0;
    this._mesh.visible = true;
    this._mesh.material.opacity = 1;

    // Spherical cap geometry (position-independent — depends only on radius constants)
    const h = LURE_ATTRACT_RADIUS - LURE_CAP_HEIGHT;
    this._capRad = Math.sqrt(h * (2 * LURE_ATTRACT_RADIUS - h));

    // capPos: LURE_CAP_HEIGHT units from the lure toward the origin
    const toOrigin = this._pos.clone().negate().normalize();
    this._capPos.copy(this._pos).addScaledVector(toOrigin, LURE_CAP_HEIGHT);

    // Plane whose normal points outward from origin through capPos
    this._capPlane = new Plane(this._capPos, this._capPos.clone());

    // Spawn fresh particles (staggered emergence)
    this._particles = Array.from(
      { length: P_COUNT },
      (_, i) => new Particle(i, this)
    );

    // Notify worms
    const worms = getWormContext().worms;
    for (let i = 0; i < worms.length; i++) {
      worms[i].lurePlaced();
    }
  }

  detonate() {
    this._state = 'DETONATING';
    this._detonationFrame = 0;

    for (let i = 0; i < this._particles.length; i++) {
      this._particles[i].lureDetonated();
    }

    const worms = getWormContext().worms;
    for (let i = 0; i < worms.length; i++) {
      worms[i].lureDetonated();
    }
  }

  // ─── Per-frame update ─────────────────────────────────────────────────────

  update(frameCount) {
    if (this._state === 'INACTIVE') return;

    if (this._state === 'ACTIVE') {
      if (this._spawnFrame < L_SPAWN_LEN) this._spawnFrame++;
    } else {
      // DETONATING
      if (++this._detonationFrame >= L_DET_FRAMES) {
        this._state = 'INACTIVE';
        this._mesh.visible = false;
        return;
      }
    }

    this._calcRot();

    for (let i = 0; i < this._particles.length; i++) {
      this._particles[i].update(frameCount, this);
    }
  }

  _calcRot() {
    // Rotate (0,0,-1) to face toward the origin
    const facing = this._pos.clone().negate().normalize();
    const facingQ = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, -1), facing
    );

    // Spin around lure's outward axis, decelerating during detonation
    if (this._state === 'DETONATING') {
      const detPerc = this._detonationFrame / L_DET_FRAMES;
      if (detPerc < L_DET_ROT_STOP) {
        const t = 1 - detPerc / L_DET_ROT_STOP;
        this._spinAngle += L_ROT_SPEED * t * t; // quadratic ease-out to zero
      }
    } else {
      this._spinAngle += L_ROT_SPEED;
    }

    const spinQ = new THREE.Quaternion().setFromAxisAngle(
      this._pos.clone().normalize(),
      this._spinAngle
    );

    this._mesh.quaternion.copy(facingQ).multiply(spinQ);
  }

  // ─── Display ──────────────────────────────────────────────────────────────

  display() {
    if (this._state === 'INACTIVE') {
      this._particlePool.setVisible(false);
      return;
    }

    this._particlePool.setVisible(true);

    // Spawn scale: eased grow from 0 to 1 over L_SPAWN_LEN frames
    const spawnScale = easeInOut(this._spawnFrame / L_SPAWN_LEN, 3);

    // Detonation expansion: grows to L_DET_RAD_MULT× during detonation
    let detExpansion = 1;
    if (this._state === 'DETONATING') {
      const detPerc = this.detonationPercent();
      detExpansion = 1 + (L_DET_RAD_MULT - 1) * easeOutCubic(detPerc);

      // Fade opacity to 0 over the detonation
      const opacity = 1 - detPerc;
      this._mesh.material.opacity = opacity;
    }

    this._mesh.position.copy(this._pos);
    this._mesh.scale.setScalar(spawnScale * detExpansion);

    // Render visible particles
    let idx = 0;
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      if (!p.isVisible()) continue;
      idx = p.display(this._particlePool, idx, this);
    }

    this._particlePool.setCount(idx);
    this._particlePool.flush();
  }
}
