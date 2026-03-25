// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Module-level store for shared references that worms need.
// Replaces Processing's global scope for worm-system cross-references.

let _ctx = null;

export function setWormContext(ctx) { _ctx = ctx; }
export function getWormContext() { return _ctx; }
