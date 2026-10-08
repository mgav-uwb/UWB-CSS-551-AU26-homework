// CSS 551 · HW1 · The loop, input, and orientation. YOUR FILE: fill in every TODO and submit
// this one file. Run it by serving the course site from its root (python3 -m http.server)
// and opening homework/run.html?hw=hw01; the Checks card compares your numbers with the
// ones on the homework page.
//
// Allowed: the primitives imported below, component access, + - * /, Math.sqrt/min/max.
// Off limits (implement and replace): THREE.Raycaster, THREE.Triangle.containsPoint /
// getBarycoord, THREE.Line3.closestPointToPoint, THREE.Box2 / Sphere containsPoint, the canvas's
// isPointInPath / isPointInStroke, THREE.Matrix4.lookAt, THREE.Object3D.lookAt, Quaternion anything.
import { dot, cross, normalize, sub } from '../core/xform.js';

/**
 * advance(p, velocity, dt) -> the position one frame later.
 * p and velocity are [x, y, z]; velocity is in units per SECOND and dt is the frame's
 * length in seconds, so the result must not depend on the frame rate.
 */
export function advance(p, velocity, dt) {
  // TODO: step p along velocity by this frame's share of one second.
  return [p[0], p[1], p[2]];
}

/**
 * hitTest2D(point, shape) -> true when point is on the shape, false otherwise.
 * Everything is in screen pixels: point is [x, y] (x right, y down), and shape is one of
 *   { kind: 'circle', center: [x, y], r }
 *   { kind: 'segment', a: [x, y], b: [x, y], tol }   hit if within tol pixels of the segment
 *   { kind: 'triangle', a: [x, y], b: [x, y], c: [x, y] }   either winding
 * A point exactly on the boundary (distance r, distance tol, or on an edge) is a hit.
 * dot, cross and sub above take 3-vectors; write the 2D versions out by components.
 */
export function hitTest2D(point, shape) {
  // TODO circle: compare the squared distance to the center with r * r.
  // TODO segment: t = (p - a)·(b - a) / |b - a|², clamped to [0, 1]; compare the distance from
  //      p to a + t (b - a) with tol. When a == b, |b - a|² is 0: use t = 0.
  // TODO triangle: for each edge o -> e (a -> b, b -> c, c -> a), the 2D cross product
  //      (e - o) x (p - o) = (ex - ox)(py - oy) - (ey - oy)(px - ox) says which side p is on;
  //      a hit unless one of the three is negative and another positive.
  return false;
}

/**
 * classifyPointer(down, up) -> 'click' or 'drag'.
 * down and up are the pointer positions { x, y } in pixels at pointerdown and pointerup.
 * The gesture is a drag when the pointer ends more than DRAG_THRESHOLD pixels from where it
 * was pressed, and a click otherwise (exactly 4 pixels is still a click).
 */
const DRAG_THRESHOLD = 4;
export function classifyPointer(down, up) {
  // TODO: compare the squared distance moved with DRAG_THRESHOLD squared.
  return 'click';
}

/**
 * orientBasis(pos, target, up) -> { x, y, z }, the three unit axes of an object at pos
 * whose +z axis points at target (three.js and Unity both aim an object's +z this way).
 * x is perpendicular to up and z; y completes the frame. Each axis is [x, y, z].
 */
export function orientBasis(pos, target, up) {
  // TODO: z from a subtraction and a normalize; x from a cross product; y from another.
  return { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
}
