// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Worm state after detonation for fascinated worms that survive the blast.
// Flies outward from the detonation point, decelerating until it reaches
// normal max speed, then transitions to Recoverworm (or Hypnoworm if a new
// lure was placed in the interim).

import { Vector3 } from 'three';
import { Roamworm } from './roamworm.js';
import { Hypnoworm } from './hypnoworm.js';
import { Recoverworm } from './recoverworm.js';
import { getWormContext } from './wormcontext.js';
import {
  MAX_SPEED, MAX_PUSH_SPEED, PUSH_SPEED_MOD, SPEED_DECAY
} from './settings.js';

// Reusable temp
const _expDir = new Vector3();

export class Pushworm extends Roamworm {
  constructor(source) {
    super(source);  // Roamworm copy ctor: copies _thruster, _pulseSpeed, _pulseAnim

    const lure = getWormContext().lure;
    _expDir.subVectors(this._pos, lure.pos());
    const dirMag = _expDir.length();

    this._resetSpeed = MAX_SPEED;
    this._curSpeed = Math.min((1 / dirMag) * PUSH_SPEED_MOD, MAX_PUSH_SPEED);
    if (_expDir.lengthSq() > 1e-10) _expDir.normalize();
    this._vel.copy(_expDir).multiplyScalar(this._curSpeed);
  }

  // ─── Overrides ────────────────────────────────────────────────────────────

  // Ignore gravity wall while flying outward
  _modAcceleration() {
    return new Vector3(0, 0, 0);
  }

  // Decay speed each frame; return current cap
  _maxSpeed() {
    if (this._curSpeed > this._resetSpeed) {
      this._curSpeed -= SPEED_DECAY;
    }
    return this._curSpeed;
  }

  lurePlaced() {}  // ignore new lure placements while flying

  update() {
    super.update();
    if (this._curSpeed <= this._resetSpeed) {
      this._convertWorm();
    }
  }

  // ─── Transition ───────────────────────────────────────────────────────────

  _convertWorm() {
    const ctx = getWormContext();
    ctx.worms[this._id] = ctx.lure?.isActive()
      ? new Hypnoworm(this)
      : new Recoverworm(this);
  }
}
