// CSS 551 · HW2 · Vector geometry (EX1 to EX6). YOUR FILE: fill in every TODO and
// submit this one file. Run: homework/run.html?hw=hw02 from a local server at the site root.
//
// Allowed: the primitives imported below, component access, + - * /, Math functions.
// Off limits: THREE.Vector3.projectOnVector / projectOnPlane / reflect / angleTo, and
// THREE.Plane and THREE.Ray methods.
//
// Conventions: points and vectors are [x, y, z]; a plane is { n, D } with n a UNIT normal
// and the plane the set of points P with n · P = D.
import { dot, cross, normalize, sub } from '../core/xform.js';

/** EX1: one frame of marching from p along the line from -> to at speed units per second. */
export function marchStep(p, from, to, speed, dt) {
  // TODO
  return [p[0], p[1], p[2]];
}

/** EX1 (SetLine): the midpoint, unit direction, and length of the segment p1 -> p2. */
export function lineFrame(p1, p2) {
  // TODO
  return { mid: [0, 0, 0], dir: [0, 1, 0], length: 1 };
}

/** EX2: the plane with normal direction `normal` (any length) through point q: { n (unit), D }. */
export function planeFromPoint(normal, q) {
  // TODO
  return { n: [0, 1, 0], D: 0 };
}

/** EX3: signed distance of p from the plane (n unit): positive on the normal's side. */
export function signedDistance(n, D, p) {
  // TODO
  return 0;
}

/** EX4: the shadow of p dropped straight onto the plane along n. */
export function shadowOnPlane(n, D, p) {
  // TODO
  return [p[0], p[1], p[2]];
}

/** EX5: where the line through p1 and p2 crosses the plane, or null when it is parallel. */
export function linePlaneHit(n, D, p1, p2) {
  // TODO: guard the parallel case before you divide.
  return null;
}

/** EX5: the direction d reflected about the unit normal n. */
export function reflect(d, n) {
  // TODO
  return [d[0], d[1], d[2]];
}

/**
 * EX6: project p onto the surface of a cylinder centered at c with axis direction `axis`
 * (any length), radius r and half-height halfHeight. Returns { point, inside }, where
 * inside says whether p's foot on the axis lies within halfHeight of c. When p is on the
 * axis, return the foot itself as the point.
 */
export function projectToCylinder(p, c, axis, radius, halfHeight) {
  // TODO
  return { point: [p[0], p[1], p[2]], inside: false };
}
