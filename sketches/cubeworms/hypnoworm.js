// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Worm state after lure placement. Travels toward the lure; once within
// FASCINATE_RADIUS, gaze is constrained to a circle around the lure on the
// plane perpendicular to the worm→lure axis.

import { Vector3, MathUtils } from 'three';
import { Travelworm } from './travelworm.js';
import { Plane } from './plane.js';
import { getWormContext } from './wormcontext.js';
import { Pushworm } from './pushworm.js';
import { Recoverworm } from './recoverworm.js';
import { Explodeworm } from './explodeworm.js';
import { Splitworm } from './splitworm.js';
import {
  MAX_SPEED,
  FASCINATE_RADIUS, LURE_ATTRACT_RADIUS,
  LURE_CORE_REPULSE, LURE_HERD_STRENGTH,
  LOOK_LIM_DIST_MOD, LOOK_LIM_VEL_MOD,
  MAX_TURN_RATE, MIN_SURVIVAL_CHANCE
} from './settings.js';

// Module-level temps
const _diff        = new Vector3();
const _gazeXsec    = new Vector3();
const _gazeDestDif = new Vector3();
const _velOrtho    = new Vector3();
const _velParallel = new Vector3();
const _bSphereNearPt  = new Vector3();
const _capPlaneXsec   = new Vector3();
const _capPlaneBDist  = new Vector3();

export class Hypnoworm extends Travelworm {
  constructor(source) {
    super(source);
    const lure = getWormContext().lure;
    this._dest = lure.pos();          // reference, NOT clone — lure pos doesn't move
    this._gaze = this._vel.clone();
    this._prevGaze = this._vel.clone();
    this._destPlane = null;
    this._lookLimRad = 0;
    this._fascinated = false;
    this._calcToDest();
  }

  // Completely override update to control call order
  update() {
    this._calcVelocity();           // uses previous frame's _toDest/_distToDest
    this._calcGaze();               // uses previous frame's _toDest; sets _fascinated
    this.calcFacingQuat(this._gaze);
    this._calcToDest();             // update for next frame
    this._glowPulse();
    this._cols.run();
    this.spawnTrail();
    this._prevGaze.copy(this._gaze);
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  lurePlaced() {}  // already under lure influence

  lureDetonated() {
    const ctx = getWormContext();
    if (this._fascinated) {
      const survivalChance = MathUtils.mapLinear(
        this._distToDest, FASCINATE_RADIUS, LURE_ATTRACT_RADIUS, 1, MIN_SURVIVAL_CHANCE
      );
      if (Math.random() > survivalChance) {
        if (Math.random() < 0.5) {
          ctx.worms[this._id] = new Explodeworm(this);
        } else {
          ctx.worms[this._id] = new Splitworm(this);
        }
        return;
      }
      ctx.worms[this._id] = new Pushworm(this);
    } else {
      ctx.worms[this._id] = new Recoverworm(this);
    }
  }

  // ─── Gaze ─────────────────────────────────────────────────────────────────

  _calcGaze() {
    this._gaze.copy(this._vel);
    this._fascinated = this._distToDest < FASCINATE_RADIUS;
    let gazeChanged = false;
    if (this._fascinated) {
      this._calcAttractionGaze();
      gazeChanged = true;
    }
    if (gazeChanged) {
      // Smooth interpolation: gaze = prevGaze + (gaze - prevGaze) * MAX_TURN_RATE
      _diff.subVectors(this._gaze, this._prevGaze).multiplyScalar(MAX_TURN_RATE);
      this._gaze.copy(this._prevGaze).add(_diff);
    }
  }

  // Constrain gaze to a circle of radius lookLimRad around the lure on the
  // plane perpendicular to the worm→lure axis.
  _calcAttractionGaze() {
    this._destPlane = new Plane(this._dest, this._toDest);
    this._lookLimRad = this._distToDest * LOOK_LIM_DIST_MOD + this._vel.length() * LOOK_LIM_VEL_MOD;

    const gazeOffset = this._destPlane.findIntersect(this._pos, this._vel);
    if (gazeOffset !== null) {
      _gazeXsec.addVectors(this._pos, gazeOffset);
      _gazeDestDif.subVectors(this._dest, _gazeXsec);
      if (_gazeDestDif.length() > this._lookLimRad) {
        // Gaze too far: clamp to lookLimRad circle using vel's component parallel to destPlane
        const dot = this._toDest.dot(this._vel);
        _velOrtho.copy(this._toDest).multiplyScalar(dot / this._toDest.lengthSq());
        _velParallel.subVectors(this._vel, _velOrtho);
        if (_velParallel.lengthSq() > 1e-10) _velParallel.normalize().multiplyScalar(this._lookLimRad);
        this._gaze.addVectors(this._toDest, _velParallel);
      } else {
        this._gaze.copy(gazeOffset);
      }
    } else {
      this._gaze.copy(this._prevGaze);  // ray parallel to plane: keep old gaze
    }
  }

  // ─── Acceleration ─────────────────────────────────────────────────────────

  _modAcceleration() {
    if (!this._fascinated) return super._modAcceleration();  // Travelworm: dest attraction
    const capAttract = super._modAcceleration();
    this._addCoreRepulsion(capAttract);
    this._addHerdForce(capAttract);
    return capAttract;
  }

  // Push back when too close to lure core
  _addCoreRepulsion(accel) {
    if (this._distToDest < LURE_ATTRACT_RADIUS) {
      accel.addScaledVector(this._toDest, LURE_ATTRACT_RADIUS / this._distToDest * LURE_CORE_REPULSE);
    }
  }

  // Steer back to the spherical cap if the worm strays to the far side
  _addHerdForce(accel) {
    const lure = getWormContext().lure;
    const capXsecOffset = lure.capPlane().findIntersect(this._pos, this._dest);
    if (capXsecOffset === null) return;

    _capPlaneXsec.addVectors(this._pos, capXsecOffset);
    _capPlaneBDist.subVectors(this._dest, _capPlaneXsec);

    if (_capPlaneBDist.length() > lure.capRad() || !_vectorsSignsEqual(this._dest, capXsecOffset)) {
      const bPosMag = lure.pos().length();
      _bSphereNearPt.copy(lure.pos()).multiplyScalar((bPosMag - LURE_ATTRACT_RADIUS) / bPosMag);
      accel.addScaledVector(_bSphereNearPt.sub(this._pos), LURE_HERD_STRENGTH);
    }
  }

  // ─── Speed ────────────────────────────────────────────────────────────────

  _maxSpeed() {
    return this._fascinated
      ? MAX_SPEED * (this._distToDest / FASCINATE_RADIUS)
      : MAX_SPEED;
  }
}

// ─── Module helpers ───────────────────────────────────────────────────────

function _vectorsSignsEqual(v1, v2) {
  return _numSign(v1.x) === _numSign(v2.x)
      && _numSign(v1.y) === _numSign(v2.y)
      && _numSign(v1.z) === _numSign(v2.z);
}

function _numSign(f) { return f < 0 ? -1 : f > 0 ? 1 : 0; }
