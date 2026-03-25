// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Provides thrust in a single axis governed by a cosine wave.
// Burns for `maxFuel` frames with amplitude `maxBurn`, then waits `refuelTime` frames before resetting.

import {
  MIN_ENGINE_POWER, MAX_ENGINE_POWER,
  MIN_ENGINE_FUEL, MAX_ENGINE_FUEL,
  MIN_REFUEL_TIME, MAX_REFUEL_TIME
} from './settings.js';
import { randomSign } from './mathutils.js';

const TWO_PI = Math.PI * 2;

export class Engine {
  constructor(maxFuel, maxBurn) {
    if (maxFuel !== undefined) {
      // directed first burn with specified parameters
      this._maxFuel = maxFuel;
      this._fuel = maxFuel;
      this._maxBurn = maxBurn;
      this._refuelTime = Math.round(Math.random() * (MAX_REFUEL_TIME - MIN_REFUEL_TIME) + MIN_REFUEL_TIME);
    } else {
      this._reset();
    }
  }

  _reset() {
    this._maxFuel = Math.round(Math.random() * (MAX_ENGINE_FUEL - MIN_ENGINE_FUEL) + MIN_ENGINE_FUEL);
    this._maxBurn = (Math.random() * (MAX_ENGINE_POWER - MIN_ENGINE_POWER) + MIN_ENGINE_POWER) * randomSign();
    this._refuelTime = Math.round(Math.random() * (MAX_REFUEL_TIME - MIN_REFUEL_TIME) + MIN_REFUEL_TIME);
    this._fuel = this._maxFuel;
  }

  burn() {
    if (this._fuel > 1) {
      this._fuel--;
      // cosine wave: goes 0 -> maxBurn -> 0 over maxFuel frames
      return ((Math.cos(this._fuel / (this._maxFuel / TWO_PI) + Math.PI) + 1) / 2) * this._maxBurn;
    } else if (this._refuelTime > 0) {
      this._refuelTime--;
      return 0;
    } else {
      this._reset();
      return this.burn();
    }
  }
}
