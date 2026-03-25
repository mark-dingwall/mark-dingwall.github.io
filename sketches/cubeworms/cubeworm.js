// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Abstract base class for all worm states. Holds shared state and provides
// trail spawning, facing calculation, and display.

import { Vector3, Quaternion, Euler, MathUtils as THREEMath } from 'three';
import { ColourCycler } from './colorcycler.js';
import { getWormContext } from './wormcontext.js';
import { randomSign } from './mathutils.js';
import {
  MAX_H, MAX_SBA, MIN_SAT, MAX_SAT, MIN_VERT_B, MAX_VERT_B,
  MAX_SPAWN_RAD, MAX_SPEED, SPAWN_STROKEW, SPAWN_TRAIL_DELAY_MOD,
  MIN_FACECUBES, MAX_FACECUBES, FACE_BRIGHTNESS,
  TRAIL_MIN_RATE, TRAIL_MAX_RATE, TRAIL_MIN_SIZE, TRAIL_MAX_SIZE,
  TRAIL_MAX_SPAWN_RAD, TRAIL_MIN_SPAWN_DIST, TRAIL_MAX_SPAWN_DIST,
  TRAIL_OFFSET_SIZE_MOD, TRAIL_MAX_HUE_DIFF, TRAIL_MAX_SAT_DIFF
} from './settings.js';

// Reusable temp objects
const _spawnDir = new Vector3();
const _spawnPos = new Vector3();
const _euler = new Euler(0, 0, 0, 'ZYX');
const _xAxis = new Vector3(1, 0, 0);

export class Cubeworm {
  // idOrSource: number (fresh init) or Cubeworm instance (ownership transfer copy)
  // slot: WormSlot (only needed for fresh init)
  constructor(idOrSource, slot) {
    if (typeof idOrSource === 'number') {
      this._id = idOrSource;
      this._slot = slot;
      this._cols = new ColourCycler(0, MAX_H, MIN_SAT, MAX_SAT, MIN_VERT_B, MAX_VERT_B);
      this._pos = new Vector3();
      this._vel = new Vector3();
      this._facingQuat = new Quaternion();
      this._nextTrailcube = 0;
      this._facecubes = 0;
      this._strokeW = SPAWN_STROKEW;
    } else {
      // Copy constructor — ownership transfer from another Cubeworm
      const src = idOrSource;
      this._id = src._id;
      this._slot = src._slot;
      this._cols = src._cols;
      this._pos = src._pos;
      this._vel = src._vel;
      this._facingQuat = src._facingQuat;
      this._nextTrailcube = src._nextTrailcube;
      this._facecubes = src._facecubes;
      this._strokeW = src._strokeW;
    }
  }

  id() { return this._id; }
  slot() { return this._slot; }

  // Abstract — subclasses must override
  update() {
    throw new Error('Cubeworm.update() is abstract');
  }

  // Update main cube transform + colours + edge width
  display() {
    this._slot.updateMainTransform(this._pos, this._facingQuat);
    this._slot.setFaceColor(this._cols.faceColor(FACE_BRIGHTNESS));
    this._slot.setEdgeColor(this._cols.vertColor());
    this._slot.setEdgeWidth(this._strokeW);
  }

  // Given a desired facing direction, compute the quaternion that rotates
  // the initial orientation (1,0,0) to face that direction.
  calcFacingQuat(facing) {
    if (facing.lengthSq() < 1e-10) return;
    _xAxis.set(1, 0, 0);
    this._facingQuat.setFromUnitVectors(_xAxis, facing.clone().normalize());
  }

  // Choose a random (re-)spawn position within MAX_SPAWN_RAD sphere
  getSpawnPos() {
    const p = new Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    p.normalize();
    p.multiplyScalar(Math.random() * MAX_SPAWN_RAD);
    return p;
  }

  // Leave a trail behind the worm
  spawnTrail() {
    if (this._nextTrailcube > 0) {
      this._nextTrailcube--;
    } else {
      const spawnDist = Math.random() * (TRAIL_MAX_SPAWN_DIST - TRAIL_MIN_SPAWN_DIST) + TRAIL_MIN_SPAWN_DIST;
      const spawnRad = Math.random() * TRAIL_MAX_SPAWN_RAD;
      let trailSize = Math.random() * (TRAIL_MAX_SIZE - TRAIL_MIN_SIZE) + TRAIL_MIN_SIZE;
      trailSize *= THREEMath.mapLinear(spawnRad, 0, TRAIL_MAX_SPAWN_RAD, 1, TRAIL_OFFSET_SIZE_MOD);

      const spawnPos = this._calcTrailSpawnPos(spawnDist, spawnRad);
      this._createTrailcube(spawnPos, trailSize);
      this._nextTrailcube = this._trailSpawnDelay();
    }
  }

  // Position behind worm (negative velocity direction) + random YZ offset
  _calcTrailSpawnPos(dist, rad) {
    const spawnTheta = Math.random() * Math.PI * 2;
    const yOff = Math.sin(spawnTheta) * rad * randomSign();
    const zOff = Math.cos(spawnTheta) * rad * randomSign();

    _spawnDir.copy(this._vel);
    if (_spawnDir.lengthSq() > 1e-10) {
      _spawnDir.normalize();
    }
    _spawnDir.multiplyScalar(-dist);

    _spawnPos.copy(this._pos).add(_spawnDir);
    _spawnPos.x += 0; // X offset is always 0 in original
    _spawnPos.y += yOff;
    _spawnPos.z += zOff;

    return _spawnPos.clone();
  }

  // Create a trailcube with colour slightly randomised from worm's current colour
  _createTrailcube(pos, size) {
    const hDiff = Math.random() * TRAIL_MAX_HUE_DIFF * randomSign();
    const sDiff = Math.random() * TRAIL_MAX_SAT_DIFF * randomSign();
    const tFHue = THREEMath.clamp(this._cols.faceHue() + hDiff, 0, MAX_H);
    const tFSat = THREEMath.clamp(this._cols.faceSat() + sDiff, 0, MAX_SBA);
    const tVHue = THREEMath.clamp(this._cols.vertHue() + hDiff, 0, MAX_H);
    const tVSat = THREEMath.clamp(this._cols.vertSat() + sDiff, 0, MAX_SBA);

    // Extract Euler angles from facing quaternion (ZYX order)
    _euler.setFromQuaternion(this._facingQuat, 'ZYX');

    const ctx = getWormContext();
    ctx.trailPool.allocate(
      tFHue, tFSat,
      tVHue, tVSat, this._cols.vertBright(),
      pos.x, pos.y, pos.z,
      _euler.x, _euler.y, _euler.z,
      size
    );
  }

  // Trail spawn rate scales linearly with velocity
  _trailSpawnDelay() {
    const speed = this._vel.length();
    return Math.round(THREEMath.mapLinear(speed, 0, MAX_SPEED, TRAIL_MIN_RATE, TRAIL_MAX_RATE));
  }

  // Set up fresh worm state (random position, velocity, facing, facecubes)
  _initFresh() {
    this._pos.copy(this.getSpawnPos());
    this._vel.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    this._vel.normalize();
    this.calcFacingQuat(this._vel);
    this._facecubes = Math.round(Math.random() * (MAX_FACECUBES - MIN_FACECUBES) + MIN_FACECUBES);
    this._slot.setFacecubeCount(this._facecubes);
    this._nextTrailcube = this._trailSpawnDelay() + SPAWN_TRAIL_DELAY_MOD;
    this._strokeW = SPAWN_STROKEW;
  }

  // Default transition to Hypnoworm when lure is placed.
  // Sleepworm and Spawnworm override this to a no-op; Hypnoworm also overrides it.
  lurePlaced() {
    const ctx = getWormContext();
    ctx.worms[this._id] = new ctx.HypnowormClass(this);
  }

  // No-op (matches Processing)
  lureDetonated() {}
}
