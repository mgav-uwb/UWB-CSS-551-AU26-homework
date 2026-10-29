// CSS 551 · HW3 · Scene graphs, by operators and by matrices. YOUR FILE: fill in every TODO
// and submit this one file. Run: homework/run.html?hw=hw03 from a local server.
//
// Part A (Lecture 7) moves POINTS with operators: no matrices anywhere in Part A.
// Part B (Lecture 8) builds the same chain from 4 x 4 matrices. The two parts must agree: the
// hand's origin from Part A is column 3 of W_hand from Part B.
//
// Points are [x, y, z]. Matrices are COLUMN-MAJOR 16-arrays (entry (row r, column c) at index
// c * 4 + r). Angles are in degrees; rotations are right-handed.
// Allowed: matMul and applyMat4 from xform.js (Part B products), component access, Math.
// Off limits: makeTRS, axisAngleMatrix, quatFromAxisAngle and invertTRS from xform.js;
// THREE.Vector3.applyAxisAngle / applyMatrix4 / applyQuaternion; THREE.Matrix4.invert,
// makeTranslation / makeRotationY / makeRotationZ / makeScale / compose; Object3D parenting.
import { matMul, applyMat4 } from '../core/xform.js';

const IDENTITY = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

// The arm: the base turns on the floor, the arm hinges on the base, the hand rides the arm.
// pose = { baseRy, armBend, handRy, armT } (degrees; armT slides the hinge up the base).
// Each node's parent (GIVEN): the base's parent is the world.
const PARENT = { hand: 'arm', arm: 'base', base: null };

// ---------------------------------------------------------------- Part A: operators on points

/** R_y(deg) applied to the point p. */
export function rotateY(p, deg) {
  // TODO
  return [p[0], p[1], p[2]];
}

/** R_z(deg) applied to the point p. */
export function rotateZ(p, deg) {
  // TODO
  return [p[0], p[1], p[2]];
}

/** Turn p by deg about the z-direction line through pivot: pivot + R_z(deg)(p − pivot). */
export function pivotRotateZ(p, pivot, deg) {
  // TODO
  return [p[0], p[1], p[2]];
}

/**
 * A point p of the node's frame, in its PARENT's frame (the node's local operator):
 *   base:  (0, 0.2, 0)        + R_y(baseRy)  p
 *   arm:   (0, 0.2 + armT, 0) + R_z(armBend) (p + (0, 0.7, 0))
 *   hand:  (0, 0.7, 0)        + R_y(handRy)  p
 */
export function toParent(pose, node, p) {
  // TODO
  return [p[0], p[1], p[2]];
}

/** The undo of toParent: a point q of the parent's frame, in the node's frame. */
export function fromParent(pose, node, q) {
  // TODO: the inverses, in reverse order
  return [q[0], q[1], q[2]];
}

/** A point p of the node's frame, in the world: toParent up the chain, the node's own first. */
export function toWorld(pose, node, p) {
  // TODO: use PARENT
  return [p[0], p[1], p[2]];
}

/** A world point q, in the node's frame: fromParent down the chain, the root's first. */
export function worldToNode(pose, node, q) {
  // TODO
  return [q[0], q[1], q[2]];
}

// ---------------------------------------------------------------- Part B: 4 x 4 matrices

/** T(t) for t = [x, y, z]. */
export function translation(t) {
  // TODO
  return IDENTITY();
}

/** R_y(deg) as a 4 x 4 matrix. */
export function rotationY(deg) {
  // TODO
  return IDENTITY();
}

/** R_z(deg) as a 4 x 4 matrix. */
export function rotationZ(deg) {
  // TODO
  return IDENTITY();
}

/** S(s) for s = [sx, sy, sz]. */
export function scaling(s) {
  // TODO
  return IDENTITY();
}

/**
 * The arm's LOCAL matrices, the same chain as Part A's toParent:
 *   L_base = T(0, 0.2, 0) · R_y(baseRy)
 *   L_arm  = T(0, 0.2 + armT, 0) · R_z(armBend) · T(0, 0.7, 0)
 *   L_hand = T(0, 0.7, 0) · R_y(handRy)
 * Returns { base, arm, hand }.
 */
export function localMatrices(pose) {
  // TODO
  return { base: IDENTITY(), arm: IDENTITY(), hand: IDENTITY() };
}

/** World matrices by W_child = W_parent · L_child, the base being the root. { base, arm, hand }. */
export function worldMatrices(pose) {
  // TODO
  return { base: IDENTITY(), arm: IDENTITY(), hand: IDENTITY() };
}

/**
 * The inverse of a RIGID matrix [R | t] (rotation plus translation, no scale):
 * [R^T | -R^T t]. No general 4 x 4 inverse.
 */
export function rigidInverse(M) {
  // TODO
  return IDENTITY();
}

/** A world point p in the frame whose world matrix is the rigid W: W^-1 p. */
export function worldToLocal(W, p) {
  // TODO
  return [p[0], p[1], p[2]];
}
