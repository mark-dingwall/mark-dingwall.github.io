// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Intermediate worm state: extends Roamworm but replaces wall repulsion with
// attraction toward a destination point. Base class for Hypnoworm.

import { Vector3 } from 'three';
import { Roamworm } from './roamworm.js';
import { ATTR_STR } from './settings.js';

// Reusable temp
const _accMod = new Vector3();

export class Travelworm extends Roamworm {
  constructor(source) {
    super(source);  // Roamworm copy ctor handles instanceof Roamworm check
    this._dest = new Vector3();
    this._toDest = new Vector3();
    this._distToDest = 0;
  }

  update() {
    this._calcToDest();
    super.update();  // Roamworm.update(): velocity → facing → glow → cols → trail
  }

  // Replace wall gravity with attraction toward _dest
  _modAcceleration() {
    if (this._toDest.lengthSq() < 1e-10) return _accMod.set(0, 0, 0);
    return _accMod.copy(this._toDest).normalize().multiplyScalar(ATTR_STR);
  }

  _calcToDest() {
    this._toDest.subVectors(this._dest, this._pos);
    this._distToDest = this._toDest.length();
  }
}
