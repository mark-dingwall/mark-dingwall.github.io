import * as THREE from 'three';

/**
 * Generate icosphere faces via recursive subdivision of an icosahedron.
 * Port of icosphere.pde — same algorithm, same vertex/face order.
 *
 * @param {number} subdivisions - Number of subdivision iterations (3 = 1280 faces)
 * @returns {Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3]>} Array of triangular faces on the unit sphere
 */
export function generateIcosphereFaces(subdivisions) {
  // Golden ratio
  const t = (1 + Math.sqrt(5)) / 2;

  // 12 icosahedron vertices (normalized to unit sphere)
  const verts = [
    new THREE.Vector3(-1,  t,  0).normalize(),  // v0
    new THREE.Vector3( 1,  t,  0).normalize(),  // v1
    new THREE.Vector3(-1, -t,  0).normalize(),  // v2
    new THREE.Vector3( 1, -t,  0).normalize(),  // v3
    new THREE.Vector3( 0, -1,  t).normalize(),  // v4
    new THREE.Vector3( 0,  1,  t).normalize(),  // v5
    new THREE.Vector3( 0, -1, -t).normalize(),  // v6
    new THREE.Vector3( 0,  1, -t).normalize(),  // v7
    new THREE.Vector3( t,  0, -1).normalize(),  // v8
    new THREE.Vector3( t,  0,  1).normalize(),  // v9
    new THREE.Vector3(-t,  0, -1).normalize(),  // v10
    new THREE.Vector3(-t,  0,  1).normalize(),  // v11
  ];

  // 20 initial face index triples (same order as icosphere.pde)
  const idx = [
    [0, 11, 5],  [0, 5, 1],   [0, 1, 7],   [0, 7, 10],  [0, 10, 11],
    [1, 5, 9],   [5, 11, 4],  [11, 10, 2], [10, 7, 6],  [7, 1, 8],
    [3, 9, 4],   [3, 4, 2],   [3, 2, 6],   [3, 6, 8],   [3, 8, 9],
    [4, 9, 5],   [2, 4, 11],  [6, 2, 10],  [8, 6, 7],   [9, 8, 1],
  ];

  // Build initial face array
  let faces = idx.map(([a, b, c]) => [
    verts[a].clone(),
    verts[b].clone(),
    verts[c].clone(),
  ]);

  // Subdivide
  for (let s = 0; s < subdivisions; s++) {
    const newFaces = [];
    for (const [v0, v1, v2] of faces) {
      // Edge midpoints, projected onto unit sphere
      const m01 = new THREE.Vector3().addVectors(v0, v1).normalize();
      const m12 = new THREE.Vector3().addVectors(v1, v2).normalize();
      const m20 = new THREE.Vector3().addVectors(v2, v0).normalize();

      // 4 sub-faces (clone all vectors to avoid mutation)
      newFaces.push([v0.clone(),  m01.clone(), m20.clone()]);
      newFaces.push([m01.clone(), v1.clone(),  m12.clone()]);
      newFaces.push([m20.clone(), m12.clone(), v2.clone()]);
      newFaces.push([m01.clone(), m12.clone(), m20.clone()]);
    }
    faces = newFaces;
  }

  return faces;
}
