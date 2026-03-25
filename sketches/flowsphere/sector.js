// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Cubic sectors of the flowsphere. Have simplex noise force vectors that act on particles.
class Sector {
  constructor(gridX, gridY, gridZ, posX, posY, posZ, active) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.gridZ = gridZ;
    this.posX = posX;
    this.posY = posY;
    this.posZ = posZ;
    this.active = active;
    this.forceX = 0;
    this.forceY = 0;
    this.forceZ = 0;
  }

  update() {
    const t = frameCount;
    const n1 = this._sampleNoise(this.posX, this.posY, this.posZ, t, 0);
    const n2 = this._sampleNoise(this.posX, this.posY, this.posZ, t, NOISE_OFFSET);
    const n3 = this._sampleNoise(this.posX, this.posY, this.posZ, t, NOISE_OFFSET * 2);

    // Cross-subtraction keeps net force near zero: each sample contributes positively to one
    // axis and negatively to another, so the sum (forceX+forceY+forceZ) = 0 by construction.
    this.forceX = n1 - n2;
    this.forceY = n2 - n3;
    this.forceZ = n3 - n1;
  }

  _sampleNoise(x, y, z, time, offset) {
    let total = 0, amp = 1, freq = 1, maxAmp = 0;
    for (let i = 0; i < NOISE_OCTAVES; i++) {
      const n = NOISE_USE_4D
        ? NOISE.noise4D(
            x * NOISE_SPEED * freq + offset,
            y * NOISE_SPEED * freq + offset,
            z * NOISE_SPEED * freq + offset,
            time * NOISE_SPEED * freq
          )
        : NOISE.noise3D(
            (x + time) * NOISE_SPEED * freq + offset,
            (y + time) * NOISE_SPEED * freq + offset,
            (z + time) * NOISE_SPEED * freq + offset
          );
      total += n * amp;
      maxAmp += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return (total / maxAmp) * NOISE_INFLUENCE;
  }

  display() {
    push();
      const halfRes = SECTOR_RES / 2.0;
      const lineX = map(this.forceX, -0.5, 0.5, -halfRes, halfRes);
      const lineY = map(this.forceY, -0.5, 0.5, -halfRes, halfRes);
      const lineZ = map(this.forceZ, -0.5, 0.5, -halfRes, halfRes);

      translate(this.posX, this.posY, this.posZ);
      strokeWeight(1);
      line(0, 0, 0, lineX, lineY, lineZ);
      strokeWeight(3);
      point(lineX, lineY, lineZ);
    pop();
  }
}
