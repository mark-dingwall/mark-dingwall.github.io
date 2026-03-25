// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

// A class that starts with an icosahedron of radius 1, then recursively subdivides
// and normalises up to a given recursion limit to create a sphere-like structure.
// Ported from Processing — original: https://stackoverflow.com/questions/7687148

import { Vector3 } from 'three';

class Triangle {
  constructor(top, left, right) {
    this.points = [top, left, right];
    this.subdivided = [];
    this._insertAt = 0;
  }

  subdivide(incL, incR, incB, recCount) {
    // calculate number of points in array after subdivision, accounting for incL/incR/incB
    const triRows = Math.round(Math.pow(2, recCount)) + 1;
    let arraySize = (triRows * (triRows + 1)) / 2; // triangle number

    // subtract from arraySize for each point skipped by incL/R/B
    let skipRows = (incL ? 0 : 1) + (incR ? 0 : 1) + (incB ? 0 : 1);
    let skipPoints = triRows * skipRows;
    skipPoints -= ((skipRows - 1) * skipRows) / 2; // don't count points twice when skipping multiple rows
    arraySize -= skipPoints;

    this.subdivided = new Array(arraySize);
    this._insertAt = 0;

    // recursively divide triangle, adding all relevant points to the points array
    if (recCount > 0) {
      this._divideRecurse(this.points, recCount, incL, incR, incB);
    }

    // add outer points of triangle
    if (incL && incR) {
      this.subdivided[this._insertAt++] = this.points[0];
    }
    if (incL && incB) {
      this.subdivided[this._insertAt++] = this.points[1];
    }
    if (incR && incB) {
      this.subdivided[this._insertAt] = this.points[2];
    }

    return arraySize;
  }

  _divideRecurse(triangle, recCount, incL, incR, incB) {
    // triangle[] always has 3 points, passed as top, left, right
    // calculate midpoints and recurse
    const lMid = new Vector3().addVectors(triangle[1], triangle[0]).multiplyScalar(0.5).normalize();
    const rMid = new Vector3().addVectors(triangle[2], triangle[0]).multiplyScalar(0.5).normalize();
    const bMid = new Vector3().addVectors(triangle[2], triangle[1]).multiplyScalar(0.5).normalize();

    const t1 = [triangle[0], lMid, rMid];
    const t2 = [lMid, triangle[1], bMid];
    const t3 = [rMid, bMid, triangle[2]];
    const t4 = [bMid, rMid, lMid]; // middle of 3 subtriangles

    // retain incL/R/B data for relevant sides of the subtriangles
    recCount--;
    if (recCount > 0) {
      this._divideRecurse(t1, recCount, incL, incR, true);
      this._divideRecurse(t2, recCount, incL, true, incB);
      this._divideRecurse(t3, recCount, true, incR, incB);
      // also do centre (upside-down) triangle, to avoid Sierpinski triangle holes
      this._divideRecurse(t4, recCount, false, false, false);
    }

    // add points to results as required
    if (incL) {
      this.subdivided[this._insertAt++] = lMid;
    }
    if (incR) {
      this.subdivided[this._insertAt++] = rMid;
    }
    if (incB) {
      this.subdivided[this._insertAt++] = bMid;
    }
  }
}

export class Icosasphere {
  constructor(recurseCount) {
    const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2.0;
    const phi = GOLDEN_RATIO;

    // icosahedron has 12 vertices
    const frontLeft = new Vector3(-1, 0, phi).normalize();
    const frontRight = new Vector3(1, 0, phi).normalize();
    const backLeft = new Vector3(-1, 0, -phi).normalize();
    const backRight = new Vector3(1, 0, -phi).normalize();
    const upperLeft = new Vector3(-phi, -1, 0).normalize();
    const lowerLeft = new Vector3(-phi, 1, 0).normalize();
    const upperRight = new Vector3(phi, -1, 0).normalize();
    const lowerRight = new Vector3(phi, 1, 0).normalize();
    const forwardTop = new Vector3(0, -phi, 1).normalize();
    const rearTop = new Vector3(0, -phi, -1).normalize();
    const forwardBottom = new Vector3(0, phi, 1).normalize();
    const rearBottom = new Vector3(0, phi, -1).normalize();

    // Icosahedron has 20 faces
    this._triangles = [
      new Triangle(rearTop, forwardTop, upperRight),
      new Triangle(rearTop, upperRight, backRight),
      new Triangle(rearTop, backRight, backLeft),
      new Triangle(rearTop, backLeft, upperLeft),
      new Triangle(rearTop, upperLeft, forwardTop),
      new Triangle(forwardTop, frontLeft, frontRight),
      new Triangle(forwardTop, frontRight, upperRight),
      new Triangle(upperRight, frontRight, lowerRight),
      new Triangle(upperRight, lowerRight, backRight),
      new Triangle(backRight, lowerRight, rearBottom),
      new Triangle(backRight, rearBottom, backLeft),
      new Triangle(backLeft, rearBottom, lowerLeft),
      new Triangle(backLeft, lowerLeft, upperLeft),
      new Triangle(upperLeft, lowerLeft, frontLeft),
      new Triangle(upperLeft, frontLeft, forwardTop),
      new Triangle(forwardBottom, frontRight, frontLeft),
      new Triangle(forwardBottom, lowerRight, frontRight),
      new Triangle(forwardBottom, rearBottom, lowerRight),
      new Triangle(forwardBottom, lowerLeft, rearBottom),
      new Triangle(forwardBottom, frontLeft, lowerLeft)
    ];

    this._recurseCount = recurseCount;
  }

  // concatenate all arrays of points from all triangles and return
  // all the trues & falses are for incL/incR/incB - such that each point is only
  // calculated once
  getAllPoints() {
    const tris = this._triangles;
    const rc = this._recurseCount;

    // each triangle subdivides with specific incL/incR/incB flags
    const flags = [
      [true, true, true],    // 0
      [false, true, true],   // 1
      [false, true, true],   // 2
      [false, true, true],   // 3
      [false, false, true],  // 4
      [true, true, true],    // 5
      [false, false, true],  // 6
      [false, true, true],   // 7
      [false, false, true],  // 8
      [false, true, true],   // 9
      [false, false, true],  // 10
      [false, true, true],   // 11
      [false, false, true],  // 12
      [false, true, true],   // 13
      [false, false, false], // 14
      [true, true, false],   // 15
      [true, false, false],  // 16
      [true, false, false],  // 17
      [true, false, false],  // 18
      [false, false, false]  // 19
    ];

    let totalPoints = 0;
    for (let i = 0; i < 20; i++) {
      totalPoints += tris[i].subdivide(flags[i][0], flags[i][1], flags[i][2], rc);
    }

    // flatten into single array
    const allPoints = new Array(totalPoints);
    let count = 0;
    for (let i = 0; i < tris.length; i++) {
      for (let j = 0; j < tris[i].subdivided.length; j++) {
        allPoints[count++] = tris[i].subdivided[j];
      }
    }
    return allPoints;
  }
}
