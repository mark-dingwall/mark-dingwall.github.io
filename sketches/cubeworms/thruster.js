// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Provide random thrust to cubeworms in XYZ via 3 Engine objects.

import { Vector3 } from 'three';
import { Engine } from './engine.js';
import { MIN_ENGINE_POWER, MAX_ENGINE_POWER, MIN_ENGINE_FUEL, MAX_ENGINE_FUEL } from './settings.js';

export class Thruster {
  // direction: optional Vector3 — if provided, first burn is biased toward that direction
  constructor(direction) {
    if (direction) {
      const maxThrust = Math.random() * (MAX_ENGINE_POWER - MIN_ENGINE_POWER) + MIN_ENGINE_POWER;
      const thrustLen = Math.round(Math.random() * (MAX_ENGINE_FUEL - MIN_ENGINE_FUEL) + MIN_ENGINE_FUEL);
      const dir = direction.clone().normalize(); // defensive copy

      this._x = new Engine(thrustLen, maxThrust * dir.x);
      this._y = new Engine(thrustLen, maxThrust * dir.y);
      this._z = new Engine(thrustLen, maxThrust * dir.z);
    } else {
      this._x = new Engine();
      this._y = new Engine();
      this._z = new Engine();
    }
  }

  run() {
    return new Vector3(this._x.burn(), this._y.burn(), this._z.burn());
  }
}
