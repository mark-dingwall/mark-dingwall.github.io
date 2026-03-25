// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// Plane defined by a point and a normal vector (ax + by + cz = d form).
// Direct port of plane.pde.

export class Plane {
  constructor(point, normal) {
    this._a = normal.x;
    this._b = normal.y;
    this._c = normal.z;
    this._d = normal.x * point.x + normal.y * point.y + normal.z * point.z;
  }

  // Find intersection of ray from point p in direction v with this plane.
  // Returns the relative offset vector (multiply by t), or null if no single intersection.
  // Caller must add p to the result to get the absolute world position.
  findIntersect(p, v) {
    const num   = this._a * p.x + this._b * p.y + this._c * p.z;
    const denom = this._a * v.x + this._b * v.y + this._c * v.z;
    if (denom === 0) return null;
    const t = (this._d - num) / denom;
    return v.clone().multiplyScalar(t);
  }
}
