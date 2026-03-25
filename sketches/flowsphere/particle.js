// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Particles get pushed around the flowsphere by sector force vectors.
class Particle {
  constructor(field, spawn) {
    this.field = field;
    this.sector = spawn;
    this.posX = 0;
    this.posY = 0;
    this.posZ = 0;
    this.velX = 0;
    this.velY = 0;
    this.velZ = 0;
    this._resetPosition();
  }

  _resetPosition() {
    const halfSector = SECTOR_RES / 2.0;
    this.posX = this.sector.posX + random(-halfSector, halfSector);
    this.posY = this.sector.posY + random(-halfSector, halfSector);
    this.posZ = this.sector.posZ + random(-halfSector, halfSector);

    this.velX = random(PARTICLE_MIN_VELOCITY, PARTICLE_MAX_VELOCITY);
    this.velY = random(PARTICLE_MIN_VELOCITY, PARTICLE_MAX_VELOCITY);
    this.velZ = random(PARTICLE_MIN_VELOCITY, PARTICLE_MAX_VELOCITY);
  }

  update() {
    this.velX = constrain(this.velX + this.sector.forceX, PARTICLE_MIN_VELOCITY, PARTICLE_MAX_VELOCITY);
    this.velY = constrain(this.velY + this.sector.forceY, PARTICLE_MIN_VELOCITY, PARTICLE_MAX_VELOCITY);
    this.velZ = constrain(this.velZ + this.sector.forceZ, PARTICLE_MIN_VELOCITY, PARTICLE_MAX_VELOCITY);
    this.posX += this.velX;
    this.posY += this.velY;
    this.posZ += this.velZ;

    // Check if we moved to a new sector or if we need to wrap around
    if (!this._hasWrappedAround()) {
      this._hasMovedSector();
    }

    // Decay velocity according to friction
    this.velX = this._applyFriction(this.velX);
    this.velY = this._applyFriction(this.velY);
    this.velZ = this._applyFriction(this.velZ);

    // Particles in inactive sectors receive no force, so friction brings them to a halt.
    // Respawn to keep the simulation populated.
    if (Math.abs(this.velX) < STUCK_VELOCITY_THRESHOLD &&
        Math.abs(this.velY) < STUCK_VELOCITY_THRESHOLD &&
        Math.abs(this.velZ) < STUCK_VELOCITY_THRESHOLD) {
      this.sector = this.field.getRandomActiveSector();
      this._resetPosition();
    }
  }

  // Check if the particle has crossed into a neighbouring sector
  _hasMovedSector() {
    const movedX = this._sectorAxisOffset(this.posX, this.sector.posX);
    const movedY = this._sectorAxisOffset(this.posY, this.sector.posY);
    const movedZ = this._sectorAxisOffset(this.posZ, this.sector.posZ);

    if (movedX !== 0 || movedY !== 0 || movedZ !== 0) {
      const newGridX = movedX + this.sector.gridX;
      const newGridY = movedY + this.sector.gridY;
      const newGridZ = movedZ + this.sector.gridZ;

      // Rounding during sector-transition calculation can produce an out-of-bounds index
      // at the grid boundary. Respawn as a safe recovery.
      const sectorCount = this.field.getSectorCount();
      if (newGridX < 0 || newGridX > sectorCount ||
          newGridY < 0 || newGridY > sectorCount ||
          newGridZ < 0 || newGridZ > sectorCount) {
        this.sector = this.field.getRandomActiveSector();
        this._resetPosition();
      } else {
        this.sector = this.field.getSectorAt(newGridX, newGridY, newGridZ);
      }
      return true;
    }
    return false;
  }

  _sectorAxisOffset(pos, sectorPos) {
    const halfSector = SECTOR_RES / 2.0;
    if (pos > sectorPos + halfSector) return 1;
    if (pos < sectorPos - halfSector) return -1;
    return 0;
  }

  _hasWrappedAround() {
    const radius = this.field.getRadius();
    if (this.posX*this.posX + this.posY*this.posY + this.posZ*this.posZ > radius*radius) {
      // Teleport to the opposite side of the sphere, slightly inward
      this.posX *= -PARTICLE_WRAP_BUMP;
      this.posY *= -PARTICLE_WRAP_BUMP;
      this.posZ *= -PARTICLE_WRAP_BUMP;

      // Find the sector at the wrapped-around position
      const baseline = (-this.field.getSectorAt(0, 0, 0).posX) + (SECTOR_RES / 2);
      const newSecX = Math.trunc((baseline + this.posX) / SECTOR_RES);
      const newSecY = Math.trunc((baseline + this.posY) / SECTOR_RES);
      const newSecZ = Math.trunc((baseline + this.posZ) / SECTOR_RES);

      // JS returns undefined on OOB array access — bounds-check before lookup
      const sc = this.field.getSectorCount();
      if (newSecX < 0 || newSecX > sc || newSecY < 0 || newSecY > sc || newSecZ < 0 || newSecZ > sc) {
        this.sector = this.field.getRandomActiveSector();
        this._resetPosition();
      } else {
        this.sector = this.field.getSectorAt(newSecX, newSecY, newSecZ);
      }
      return true;
    }
    return false;
  }

  // Reduces velocity magnitude by PARTICLE_FRICTION, snapping to zero when below the threshold
  _applyFriction(velocity) {
    if (velocity > PARTICLE_FRICTION) return velocity - PARTICLE_FRICTION;
    if (velocity < -PARTICLE_FRICTION) return velocity + PARTICLE_FRICTION;
    return 0;
  }
}
