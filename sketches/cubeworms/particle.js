// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Particles that orbit the lure on eased sine-wave paths, then fly outward
// along Catmull-Rom curves when the lure detonates.

import { Vector3 } from 'three';
import { hsvToThreeColor } from './color.js';
import { easeInOut, curvePoint } from './mathutils.js';
import {
  MAX_H, MAX_SBA,
  P_COUNT, P_RADIUS, P_TRAIL_LEN, P_TRAIL_FREQ,
  P_X_AMP_MIN, P_X_AMP_MAX, P_Y_AMP_MIN, P_Y_AMP_MAX,
  P_Y_MOD_AMP, P_Y_MOD_CONST,
  P_PERIOD, P_ROT_SPEED, P_SPAWN_FRAME,
  P_MIN_DET_PATH_LEN, P_MAX_DET_PATH_LEN,
  P_MIN_DET_MAG, P_MAX_DET_MAG,
  P_DET_MIN_POS_MOD, P_DET_MAX_POS_MOD,
  LURE_CORE, L_DET_FRAMES, L_SPAWN_LEN
} from './settings.js';

// A single point in a particle's trail (or the head itself)
class Point {
  constructor(x, y, h, r) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.h = h;
    this.r = r;
    this.zRot = 0;
    this.rDecay = r / (P_TRAIL_LEN * P_TRAIL_FREQ);
  }

  copyFrom(src) {
    this.x = src.x; this.y = src.y; this.z = src.z;
    this.h = src.h; this.r = src.r; this.zRot = src.zRot;
    this.rDecay = this.r / (P_TRAIL_LEN * P_TRAIL_FREQ);
  }

  decayRad() { this.r -= this.rDecay; }
}

export class Particle {
  constructor(id, _lure) {
    this._yRot = (id / P_COUNT) * Math.PI * 2; // evenly distributed around lure
    this._zRot = Math.random() * Math.PI / 2 - Math.PI / 4; // random(-QUARTER_PI, QUARTER_PI)
    this._xAmplitude = Math.random() * (P_X_AMP_MAX - P_X_AMP_MIN) + P_X_AMP_MIN;
    this._yAmplitude = Math.random() * (P_Y_AMP_MAX - P_Y_AMP_MIN) + P_Y_AMP_MIN;
    // No negation for Three.js Y-up (Processing negated for Y-down)

    this._animFrame = P_SPAWN_FRAME;
    this._sleepTime = L_SPAWN_LEN + Math.random() * P_PERIOD;

    this._head = new Point(0, 0, MAX_H, P_RADIUS);
    this._trail = [];
    for (let i = 0; i < P_TRAIL_LEN; i++) {
      this._trail.push(new Point(0, 0, 0, 0));
    }

    this._detPath = null; // non-null once lureDetonated() is called
  }

  isVisible() { return this._sleepTime <= 0; }

  update(frameCount, lure) {
    if (this._sleepTime > 0) {
      this._sleepTime--;
      return;
    }

    if (this._detPath !== null) {
      this._updateDetonation(lure);
    } else {
      this._updateOrbit();
    }

    this._head.zRot = Math.PI * 2 * (frameCount / P_ROT_SPEED);
    this._updateTrail();

    if (++this._animFrame >= P_PERIOD) this._animFrame = 0;
  }

  _updateOrbit() {
    const f       = easeInOut(this._animFrame / P_PERIOD, 3); // cubic
    const radians = f * Math.PI * 2;
    this._head.x = Math.sin(radians - Math.PI / 2) * this._xAmplitude + this._xAmplitude;
    this._head.y = Math.sin(radians) * this._yAmplitude;
    const yMod   = (Math.sin(radians - Math.PI / 2) + P_Y_MOD_CONST) * P_Y_MOD_AMP;
    this._head.y *= yMod;
    this._head.h  = (1 - f) * MAX_H;
    this._head.z  = 0;
  }

  _updateDetonation(lure) {
    const rawT     = lure.detonationPercent() * (this._detPath.length - 1);
    const pathStep = Math.min(Math.floor(rawT), this._detPath.length - 2);
    const t        = rawT - pathStep;

    const p0 = this._detPath[Math.max(pathStep - 1, 0)];
    const p1 = this._detPath[pathStep];
    const p2 = this._detPath[Math.min(pathStep + 1, this._detPath.length - 1)];
    const p3 = this._detPath[Math.min(pathStep + 2, this._detPath.length - 1)];

    // head.x/y/z store local-to-lure offset during detonation
    this._head.x = curvePoint(p0.x, p1.x, p2.x, p3.x, t);
    this._head.y = curvePoint(p0.y, p1.y, p2.y, p3.y, t);
    this._head.z = curvePoint(p0.z, p1.z, p2.z, p3.z, t);
    this._head.r = P_RADIUS * (1 - lure.detonationPercent());
    this._head.h -= 5;
    if (this._head.h < 0) this._head.h += MAX_H;
  }

  _updateTrail() {
    for (let i = 0; i < this._trail.length; i++) {
      this._trail[i].decayRad();
    }
    if (this._animFrame % P_TRAIL_FREQ === 0) {
      for (let i = this._trail.length - 1; i > 0; i--) {
        this._trail[i].copyFrom(this._trail[i - 1]);
      }
      this._trail[0].copyFrom(this._head);
    }
  }

  lureDetonated() {
    if (this._sleepTime > 0) {
      // Still sleeping — extend sleep past the entire detonation animation
      this._sleepTime += L_DET_FRAMES + 1;
      return;
    }

    // Start path at current local head position
    let sx = this._head.x, sy = this._head.y, sz = 0;

    // If inside lure core, randomise start for a more even-looking explosion
    if (Math.sqrt(sx * sx + sy * sy) < LURE_CORE) {
      const v = new Vector3(Math.random(), Math.random(), Math.random()).normalize();
      sx = v.x; sy = v.y; sz = v.z;
    }

    const pathLen = Math.round(
      Math.random() * (P_MAX_DET_PATH_LEN - P_MIN_DET_PATH_LEN) + P_MIN_DET_PATH_LEN
    );

    this._detPath = [];
    const p0 = new Vector3(sx, sy, sz);
    this._detPath.push(p0);

    const startMag  = p0.length() || 1;
    const posMult   = (Math.random() * (P_MAX_DET_MAG - P_MIN_DET_MAG) + P_MIN_DET_MAG) / startMag;

    for (let i = 1; i < pathLen; i++) {
      const curMagMult = 1 + (posMult - 1) * (i / (pathLen - 1));
      const pt = p0.clone().multiplyScalar(curMagMult);
      pt.x += Math.random() * (P_DET_MAX_POS_MOD - P_DET_MIN_POS_MOD) + P_DET_MIN_POS_MOD;
      pt.y += Math.random() * (P_DET_MAX_POS_MOD - P_DET_MIN_POS_MOD) + P_DET_MIN_POS_MOD;
      pt.z += Math.random() * (P_DET_MAX_POS_MOD - P_DET_MIN_POS_MOD) + P_DET_MIN_POS_MOD;
      this._detPath.push(pt);
    }
  }

  // Write head + P_TRAIL_LEN trail points to the instanced pool starting at baseIndex.
  // Returns the next available index.
  display(pool, baseIndex, lure) {
    const inDetonation = this._detPath !== null;
    const bp = lure.pos();

    // Head
    let wx, wy, wz;
    if (inDetonation) {
      const w = this._orbitToWorld(this._head.x, this._head.y, this._head.z, bp);
      wx = w.x; wy = w.y; wz = w.z;
    } else {
      const w = this._orbitToWorld(this._head.x, this._head.y, 0, bp);
      wx = w.x; wy = w.y; wz = w.z;
    }
    const color = hsvToThreeColor(this._head.h, MAX_SBA, MAX_SBA);
    pool.setTransform(baseIndex, wx, wy, wz, Math.max(this._head.r, 0));
    pool.setFaceColor(baseIndex, color);
    pool.setVertColor(baseIndex, color);

    // Trail points (displayed in reverse draw order so larger points are behind smaller ones)
    for (let i = 0; i < this._trail.length; i++) {
      const idx = baseIndex + 1 + i;
      const tp = this._trail[i];
      let tx, ty, tz;
      if (inDetonation) {
        // Trail invisible during detonation (radius already decayed to ~0)
        tx = bp.x; ty = bp.y; tz = bp.z;
      } else {
        const w = this._orbitToWorld(tp.x, tp.y, 0, bp);
        tx = w.x; ty = w.y; tz = w.z;
      }
      const tColor = hsvToThreeColor(tp.h, MAX_SBA, MAX_SBA);
      pool.setTransform(idx, tx, ty, tz, Math.max(tp.r, 0));
      pool.setFaceColor(idx, tColor);
      pool.setVertColor(idx, tColor);
    }

    return baseIndex + 1 + P_TRAIL_LEN;
  }

  // Apply rotateX(-PI/2) → rotateY(_yRot) → rotateZ(_zRot) to local (lx, ly, lz)
  // then add lure world position bp. Matches Processing's push-matrix rotation chain.
  // Rotation order: innermost first → rotateZ, rotateY, rotateX.
  _orbitToWorld(lx, ly, lz, bp) {
    // Step 1: rotateZ(_zRot)
    const cz = Math.cos(this._zRot), sz = Math.sin(this._zRot);
    let x = lx * cz - ly * sz;
    let y = lx * sz + ly * cz;
    let z = lz;

    // Step 2: rotateY(_yRot)
    const cy = Math.cos(this._yRot), sy = Math.sin(this._yRot);
    const x2 =  x * cy + z * sy;
    const z2 = -x * sy + z * cy;
    x = x2; z = z2;

    // Step 3: rotateX(-PI/2): (x,y,z) → (x, z, -y)
    const y3 = z;
    const z3 = -y;

    return { x: x + bp.x, y: y3 + bp.y, z: z3 + bp.z };
  }
}
