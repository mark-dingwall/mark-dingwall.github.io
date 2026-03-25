// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Owns the 3D sector grid and provides sector lookup and random active-sector selection.
class FlowField {
  constructor(radius) {
    this.radius = radius;

    this.sectorCount = Math.trunc((radius * 2) / SECTOR_RES) + (FIELD_PADDING * 2);
    const sectorDim = this.sectorCount + 1; // loop is inclusive on both ends: 0..sectorCount

    // Build 3D array
    this.sectors = new Array(sectorDim);
    for (let i = 0; i < sectorDim; i++) {
      this.sectors[i] = new Array(sectorDim);
      for (let j = 0; j < sectorDim; j++) {
        this.sectors[i][j] = new Array(sectorDim);
      }
    }

    this.activeSectors = [];
    const radSectors = this.sectorCount / 2.0;

    let i = 0;
    for (let x = -radSectors; x <= radSectors; x++) {
      let j = 0;
      const secX = x * SECTOR_RES;
      for (let y = -radSectors; y <= radSectors; y++) {
        let k = 0;
        const secY = y * SECTOR_RES;
        for (let z = -radSectors; z <= radSectors; z++) {
          const secZ = z * SECTOR_RES;
          const active = secX*secX + secY*secY + secZ*secZ <= radius*radius;
          const sector = new Sector(i, j, k, secX, secY, secZ, active);
          this.sectors[i][j][k] = sector;
          if (active) {
            this.activeSectors.push(sector);
          }
          k++;
        }
        j++;
      }
      i++;
    }
  }

  update() {
    for (const sector of this.activeSectors) {
      sector.update();
    }
  }

  displayDebug() {
    for (const sector of this.activeSectors) {
      sector.display();
    }
  }

  getSectorAt(x, y, z) {
    if (x < 0 || x > this.sectorCount || y < 0 || y > this.sectorCount || z < 0 || z > this.sectorCount) {
      if (DEBUG) console.warn(`getSectorAt OOB: ${x},${y},${z} (sectorCount=${this.sectorCount})`);
      return this.getRandomActiveSector();
    }
    return this.sectors[x][y][z];
  }

  getRandomActiveSector() {
    if (PARTICLE_RANDOM_SPAWN && this.activeSectors.length > 0) {
      return this.activeSectors[Math.trunc(random(this.activeSectors.length))];
    }
    const centre = Math.trunc((this.sectorCount + 1) / 2);
    return this.sectors[centre][centre][centre];
  }

  getSectorCount() {
    return this.sectorCount;
  }

  getRadius() {
    return this.radius;
  }
}
