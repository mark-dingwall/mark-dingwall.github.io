// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

import { BoxGeometry, SphereGeometry, EdgesGeometry } from 'three';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {
  WORM_SIZE, FACECUBE_SIZE, LURE_CORE, L_SPHERE_DETAIL,
  P_LONGRES, P_LATRES
} from './settings.js';

// Shared geometries — created once, reused by all meshes and instanced pools.
// NEVER dispose these: they are used for the entire lifetime of the sketch.

// 1x1x1 unit box — scaled per-instance for worms and facecubes
export const unitBoxGeo = new BoxGeometry(1, 1, 1);

// Pre-scaled geometries for direct use (non-instanced or where scale is fixed)
export const wormCubeGeo = new BoxGeometry(WORM_SIZE, WORM_SIZE, WORM_SIZE);
export const facecubeGeo = new BoxGeometry(FACECUBE_SIZE, FACECUBE_SIZE, FACECUBE_SIZE);

// Lure core sphere
export const lureSphereGeo = new SphereGeometry(LURE_CORE, L_SPHERE_DETAIL, L_SPHERE_DETAIL);

// Particle sphere
export const particleSphereGeo = new SphereGeometry(1, P_LONGRES, P_LATRES);

// Edge geometry for worm cube wireframe (used in vertices scene for glow)
// EdgesGeometry extracts the 12 edges of the box as line segments
export const wormEdgesGeo = new EdgesGeometry(wormCubeGeo);

// LineSegmentsGeometry for use with LineSegments2 + LineMaterial (fat lines).
// Converts EdgesGeometry position data into the format LineSegments2 expects.
export const wormEdgesLineGeo = (() => {
  const geo = new LineSegmentsGeometry();
  const positions = wormEdgesGeo.attributes.position.array;
  geo.setPositions(positions);
  return geo;
})();

// Edge geometry for facecubes
export const facecubeEdgesGeo = new EdgesGeometry(facecubeGeo);

export const facecubeEdgesLineGeo = (() => {
  const geo = new LineSegmentsGeometry();
  const positions = facecubeEdgesGeo.attributes.position.array;
  geo.setPositions(positions);
  return geo;
})();
