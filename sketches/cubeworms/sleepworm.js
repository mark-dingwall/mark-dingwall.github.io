// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Dormant worm state. Counts down before handing off to Spawnworm.
// Stagger is achieved by finding the current maximum sleep time among all
// existing Sleepworms and sleeping for longer — so worms emerge one by one.

import { Cubeworm } from './cubeworm.js';
import { Spawnworm } from './spawnworm.js';
import { getWormContext } from './wormcontext.js';
import { MIN_SPAWN_DELAY, MAX_SPAWN_DELAY } from './settings.js';

export class Sleepworm extends Cubeworm {
  constructor(idOrSource, slot) {
    super(idOrSource, slot);
    this._sleepTime = this._goToSleep();
    this.slot().setVisible(false);
  }

  // Scan worms array for the longest current sleep time, then sleep for longer.
  // Produces a staggered spawn sequence: worms emerge one-by-one, not all at once.
  _goToSleep() {
    const ctx = getWormContext();
    let maxSleep = 0;
    if (ctx && ctx.worms) {
      for (let i = 0; i < ctx.worms.length; i++) {
        const w = ctx.worms[i];
        if (w instanceof Sleepworm) {
          maxSleep = Math.max(maxSleep, w._sleepTime);
        }
      }
    }
    return maxSleep + Math.random() * (MAX_SPAWN_DELAY - MIN_SPAWN_DELAY) + MIN_SPAWN_DELAY;
  }

  update() {
    if (--this._sleepTime <= 0) {
      getWormContext().worms[this.id()] = new Spawnworm(this);
    }
  }

  display() {}
  lurePlaced() {}
  lureDetonated() {}
}
