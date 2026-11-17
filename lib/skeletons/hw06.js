// CSS 551 · HW6 · A Whitted ray tracer and the Cornell box. YOUR FILE: fill in every TODO
// and submit this one file. Run: homework/run.html?hw=hw06 from a local server (the render
// takes a second or two once trace() works).
//
// Allowed: dot, cross, normalize, sub from xform.js; Math.
// Off limits: THREE.Raycaster, Ray.intersectSphere / intersectTriangle / intersectBox,
// Vector3.reflect, and anything that renders the scene for you.
import { dot, cross, normalize, sub } from '../core/xform.js';

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/**
 * The primary ray through the CENTER of pixel (px, py) of a width x height image, for the
 * camera cam = { eye, at, up, fov } (fov vertical, degrees). Pixel (0, 0) is the top-left.
 * Returns { o, d } with o = eye and d a unit vector. The camera basis is the view matrix's
 * u, v, w (w points from at back to the eye).
 */
export function cameraRay(px, py, width, height, cam) {
  // TODO: pixel center to [-1, 1] screen coordinates, scale by tan(fov / 2) (and the
  // aspect for x), then d = normalize(sx u + sy v - w).
  return { o: cam.eye, d: [0, 0, -1] };
}

/** The smallest t > 1e-6 where o + t d (d unit) meets the sphere (c, r), or null. */
export function hitSphere(o, d, c, r) {
  // TODO: the quadratic in t; try the near root, then the far one.
  return null;
}

/**
 * Möller–Trumbore: the hit of o + t d with triangle (a, b, c) as { t, u, v } (u weights b,
 * v weights c), or null when it misses, is parallel (|det| < 1e-12), or t <= 1e-6.
 */
export function hitTriangle(o, d, a, b, c) {
  // TODO
  return null;
}

/** The direction d reflected about the unit normal n. */
export function reflect(d, n) {
  // TODO
  return [d[0], d[1], d[2]];
}

// GIVEN: the closest hit over the scene, as { t, point, normal, material }, with the
// normal flipped to face the incoming ray; null on a miss. Uses your two hit functions.
export function intersect(scene, o, d) {
  let best = null;
  for (const s of scene.spheres) {
    const t = hitSphere(o, d, s.c, s.r);
    if (t !== null && (!best || t < best.t)) best = { t, obj: s, kind: 'sphere' };
  }
  for (const tr of scene.triangles) {
    const h = hitTriangle(o, d, tr.a, tr.b, tr.c);
    if (h && (!best || h.t < best.t)) best = { t: h.t, obj: tr, kind: 'triangle' };
  }
  if (!best) return null;
  const point = add(o, scale(d, best.t));
  let normal = best.kind === 'sphere'
    ? normalize(sub(point, best.obj.c))
    : normalize(cross(sub(best.obj.b, best.obj.a), sub(best.obj.c, best.obj.a)));
  if (dot(normal, d) > 0) normal = scale(normal, -1);
  return { t: best.t, point, normal, material: best.obj.material };
}

/**
 * The color seen along the ray (o, d), a Whitted ray tracer with one point light:
 *   miss                        -> [0, 0, 0]
 *   let P = hit.point + 1e-4 * hit.normal (the offset that avoids shadow acne)
 *   mirror material { mirror }  -> depth >= scene.maxDepth ? [0, 0, 0]
 *                                  : mirror * trace(scene, P, reflect(d, N), depth + 1)
 *   diffuse material { albedo } -> albedo * (ka + (1 - ka) * V * max(0, N·L)), where
 *                                  L = unit vector from P to scene.light, ka = scene.ka, and
 *                                  V = 0 when intersect(scene, P, L) finds a hit closer than
 *                                  the light, else 1.
 */
export function trace(scene, o, d, depth) {
  // TODO
  return [0, 0, 0];
}

// GIVEN: render the whole image, row by row from the top, 3 floats per pixel.
export function render(scene, cam, width, height) {
  const img = new Float64Array(width * height * 3);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const { o, d } = cameraRay(px, py, width, height, cam);
      const c = trace(scene, o, d, 0);
      const i = (py * width + px) * 3;
      img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2];
    }
  }
  return img;
}
