// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

import { MIN_HSB_LERP, MAX_HSB_LERP } from './settings.js';
import { hsvToThreeColor } from './color.js';

// For ColourCycler - fade between random values in a given range
class Fader {
  constructor(min, max) {
    this._min = min;
    this._max = max;
    this._val = Math.random() * (max - min) + min;
    this._target = 0;
    this._delta = 0;
    this._steps = 0;
    this._chooseTarget();
  }

  // move to target value! If we hit our target, choose a new one
  run() {
    if (this._steps > 1) {
      this._val += this._delta;
      this._steps--;
    } else {
      this._val = this._target;
      this._chooseTarget();
    }
  }

  // choose a random target value and speed at which to move towards it
  _chooseTarget() {
    this._target = Math.random() * (this._max - this._min) + this._min;
    this._delta = Math.random() * (MAX_HSB_LERP - MIN_HSB_LERP) + MIN_HSB_LERP;
    this._steps = Math.abs(Math.trunc((this._target - this._val) / this._delta)) + 1; // extra step for the last little bit
    // check if we're going down rather than up
    if (this._val > this._target) { this._delta *= -1; }
  }

  get val() { return this._val; }
}

/* Little helper class to do colour fading stuff.
 * Assumes:
 * 1) both faces and vertices have the same min/max hue & saturation
 * 2) faces have fixed brightness */
export class ColourCycler {
  constructor(minH, maxH, minS, maxS, minVB, maxVB) {
    this._faceHue = new Fader(minH, maxH);
    this._faceSat = new Fader(minS, maxS);
    this._vertHue = new Fader(minH, maxH);
    this._vertSat = new Fader(minS, maxS);
    this._vertBright = new Fader(minVB, maxVB);
    this._faders = [this._faceHue, this._faceSat, this._vertHue, this._vertSat, this._vertBright];
  }

  // lerp through colour properties
  run() {
    for (let i = 0; i < this._faders.length; i++) {
      this._faders[i].run();
    }
  }

  // accessors
  faceHue() { return this._faceHue.val; }
  faceSat() { return this._faceSat.val; }
  vertHue() { return this._vertHue.val; }
  vertSat() { return this._vertSat.val; }
  vertBright() { return this._vertBright.val; }

  // convenience: get face colour as THREE.Color (brightness is a fixed constant, not managed by cycler)
  faceColor(brightness) {
    return hsvToThreeColor(this._faceHue.val, this._faceSat.val, brightness);
  }

  // convenience: get vertex colour as THREE.Color
  vertColor() {
    return hsvToThreeColor(this._vertHue.val, this._vertSat.val, this._vertBright.val);
  }
}
