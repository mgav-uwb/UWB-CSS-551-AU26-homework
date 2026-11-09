// CSS 551 · HW5 · Meshes, texture placement, and a lit shader. YOUR FILE: fill in every
// TODO (the JavaScript functions AND the GLSL string at the bottom) and submit this one
// file. Run: homework/run.html?hw=hw05 from a local server.
//
// Allowed: dot, cross, normalize, sub from xform.js; Math.
// Off limits: uvMat3 from xform.js; THREE.PlaneGeometry, BufferGeometry.computeVertexNormals,
// Matrix3.setUvTransform, Texture.repeat / offset / rotation / center, three.js lighting
// materials (MeshPhongMaterial, MeshStandardMaterial) for the lit sphere.
import { dot, cross, normalize, sub } from '../core/xform.js';

/**
 * An n x n grid of quads on the XZ plane spanning [-half, half] in x and z.
 * positions: (n + 1)^2 points [x, y, z], vertex index row * (n + 1) + col, where col runs
 * along +x and row along +z. The center vertex (row = col = round(n / 2)) is raised to
 * y = lift. indices: 2 n^2 triples; per quad with corners v00 = (row, col), v01 = (row, col+1),
 * v10 = (row+1, col), v11 = (row+1, col+1), the two triangles are (v00, v10, v01) then
 * (v01, v10, v11), both counter-clockwise seen from +y.
 */
export function gridMesh(n, half, lift) {
  // TODO
  return { positions: [], indices: [] };
}

/** The UNNORMALIZED face normal of triangle (a, b, c): (b - a) x (c - a). */
export function faceNormal(a, b, c) {
  // TODO
  return [0, 1, 0];
}

/** Per-vertex unit normals: the sum of the unnormalized normals of the faces touching each vertex, normalized. */
export function vertexNormals(positions, indices) {
  // TODO
  return positions.map(() => [0, 1, 0]);
}

/**
 * The texture placement matrix, COLUMN-MAJOR 3x3 (9 entries), mapping a mesh uv to the
 * uv the texture is sampled at: translate by (offU, offV) after rotating by rotDeg and
 * scaling by tile about the uv center (0.5, 0.5).
 */
export function uvPlacement(offU, offV, rotDeg, tile) {
  // TODO
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

/**
 * Phong and Blinn terms at surface point P with normal N (any length), a point light at
 * lightPos, and the eye at eye. Returns { NL, RV, HN, diffuse, specular, blinn } where
 * diffuse = max(0, N·L), specular = max(0, R·V)^shine and blinn = max(0, H·N)^shine, the two
 * specular terms being 0 when N·L <= 0. L, V and H are unit vectors; R = 2 (N·L) N - L.
 */
export function phong(N, P, lightPos, eye, shine) {
  // TODO
  return { NL: 0, RV: 0, HN: 0, diffuse: 0, specular: 0, blinn: 0 };
}

// The lit sphere's fragment shader (GLSL, run by a three.js ShaderMaterial). vPos and
// vNormal arrive in WORLD space from the given vertex shader. Output
//   color = uKa * uKd + uKd * max(N·L, 0) + uKs * specular
// with the same Phong specular as phong() above.
export const FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uLightPos;
uniform vec3 uEye;
uniform vec3 uKd;
uniform float uKa;
uniform float uKs;
uniform float uShine;
varying vec3 vPos;
varying vec3 vNormal;
void main() {
  // TODO: N, L, V, R, then the three terms. Until then the sphere shows its normals.
  vec3 N = normalize(vNormal);
  gl_FragColor = vec4(0.5 * N + 0.5, 1.0);
}
`;
