// CSS 551 · HW4 · Viewing and rasterization. YOUR FILE: fill in every TODO and submit
// this one file. Run: homework/run.html?hw=hw04 from a local server.
//
// Matrices are COLUMN-MAJOR 16-arrays (entry (row r, column c) at index c * 4 + r); the
// camera looks down its -w axis (OpenGL and three.js convention).
// Allowed: dot, cross, normalize, sub, matMul, applyMat4 from xform.js; Math.
// Off limits: lookAtBasis and perspective from xform.js; THREE.Matrix4.lookAt /
// makePerspective, camera.updateProjectionMatrix, Vector3.project; any rasterizer.
import { dot, cross, normalize, sub, matMul, applyMat4 } from '../core/xform.js';

const IDENTITY = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** V: world to camera. Rows are the camera basis u, v, w; the translation column is -(basis · eye). */
export function viewMatrix(eye, at, up) {
  // TODO: w points from at back to the eye; u = up x w, normalized; v = w x u.
  return IDENTITY();
}

/** P: the OpenGL perspective matrix for a vertical field of view in degrees. */
export function perspectiveMatrix(fovYDeg, aspect, near, far) {
  // TODO: f = 1 / tan(fovY / 2); the bottom row is (0, 0, -1, 0).
  return IDENTITY();
}

/**
 * The whole chain: object point p through M, V, P, the perspective divide and the viewport.
 * Returns [px, py, zNdc]: pixel x to the right, pixel y DOWN from the top-left corner, and
 * the NDC depth in [-1, 1].
 */
export function worldToPixel(M, V, P, p, width, height) {
  // TODO
  return [0, 0, 0];
}

/** The edge function: twice the signed area of (a, b, p). Points are [x, y]. */
export function edge(a, b, p) {
  // TODO
  return 0;
}

/** Barycentric weights [w0, w1, w2] of p in tri = [a, b, c]; they sum to 1. */
export function barycentric(tri, p) {
  // TODO: three edge functions over the triangle's own edge function.
  return [0, 0, 0];
}

/**
 * Rasterize tri (coordinates in [0, 1]^2) on a res x res pixel grid: pixel (i, j) is
 * covered when its CENTER ((i + 0.5) / res, (j + 0.5) / res) has all three weights >= 0.
 * Returns the covered pixels as [i, j] pairs.
 */
export function rasterize(tri, res) {
  // TODO
  return [];
}
