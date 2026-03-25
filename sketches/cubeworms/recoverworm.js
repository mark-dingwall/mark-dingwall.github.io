// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Worm state after detonation for non-fascinated worms and Pushworms that
// have finished flying. Travels to a random point within the spawn area,
// then becomes a Roamworm.

import { Travelworm } from './travelworm.js';
import { Roamworm } from './roamworm.js';
import { getWormContext } from './wormcontext.js';
import { RECOVER_RAD } from './settings.js';

export class Recoverworm extends Travelworm {
  constructor(source) {
    super(source);
    this._dest = this.getSpawnPos();  // random point within MAX_SPAWN_RAD sphere
  }

  update() {
    super.update();  // Travelworm: _calcToDest() + Roamworm physics + trail
    if (this._distToDest < RECOVER_RAD) {
      getWormContext().worms[this._id] = new Roamworm(this);
    }
  }
}
