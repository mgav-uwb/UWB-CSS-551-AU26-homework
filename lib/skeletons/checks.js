// checks.js: the run-and-compare rubric for every homework, shared by the browser runner
// (homework/run.html), the homework pages (which print the numbers table and the points),
// and the grading tools. Each check calls the submission's own functions on the published
// inputs; the expected values live in expected.js, produced by running the reference
// solutions through these same checks (node tools/test-homework.mjs --write).
//
// A check: { id, label, points, tol, run(impl, I) } where I is the homework's inputs.
// run() returns a number, an array (possibly nested), a boolean, or null.
import { DATA7 } from './data-hw07.js';
import { DATA8 } from './data-hw08.js';
import { matMul } from '../core/xform.js';

// ---------------------------------------------------------------- helpers
const col = (M, c) => [M[c * 4], M[c * 4 + 1], M[c * 4 + 2]];
const repeatAdvance = (impl, speed, fps, seconds) => {
  let p = [0, 0, 0];
  const dt = 1 / fps;
  for (let i = 0; i < Math.round(seconds * fps); i++) p = impl.advance(p, [speed, 0, 0], dt);
  return p;
};

// ---------------------------------------------------------------- HW1
// hitTest2D shapes are built here from the inputs, so the inputs stay plain numbers and
// points (the Unity track reads the same inputs as Inputs.cs). Each check returns one boolean
// per test point; every check has at least one true, so a stub that returns false scores 0.
const hits = (impl, shape, pts) => pts.map((p) => impl.hitTest2D(p, shape));
const isDrag = (impl, down, ups) => ups.map((u) => {
  const r = impl.classifyPointer({ x: down[0], y: down[1] }, { x: u[0], y: u[1] });
  return r === 'drag' ? true : r === 'click' ? false : null;
});
const HW1 = {
  title: 'HW1 · The loop, input, and orientation',
  inputs: {
    speed: 3,
    // inside; outside by a hair (squared distance 145 against 144); exactly on the circle
    circle: { center: [200, 150], r: 12, pts: [[205, 154], [208, 159], [212, 150]] },
    // on the segment (t = 0.5); exactly tol from it; 10 from it; past b: 4.8 from the LINE, 8 from b
    segment: { a: [100, 100], b: [180, 160], tol: 5, pts: [[140, 130], [137, 134], [134, 138], [188, 160]] },
    // a == b: the segment is a single point
    dot: { a: [300, 80], b: [300, 80], tol: 5, pts: [[303, 84], [304, 84]] },
    // inside; outside; on edge ab; on the line through a and b, past b
    triangle: { a: [50, 50], b: [150, 60], c: [90, 140], pts: [[95, 80], [150, 120], [100, 55], [200, 65]] },
    // releases at offsets (4, 0), (3, 2), (-3, 2), (3, 3), (5, 1) from the press
    pointer: { down: [400, 300], ups: [[404, 300], [403, 302], [397, 302], [403, 303], [405, 301]] },
    aim: { pos: [1, 0.5, 2], target: [-2, 1.5, -2], up: [0, 1, 0] },
  },
  checks: [
    { id: 'step60', label: 'advance: position after 1 s at 60 frames per second', points: 10, tol: 1e-4,
      run: (impl, I) => repeatAdvance(impl, I.speed, 60, 1) },
    { id: 'step20', label: 'advance: position after 1 s at 20 frames per second', points: 10, tol: 1e-4,
      run: (impl, I) => repeatAdvance(impl, I.speed, 20, 1) },
    { id: 'circle', label: 'hitTest2D circle: inside, just outside, on the circle', points: 6, tol: 0,
      run: (impl, I) => hits(impl, { kind: 'circle', center: I.circle.center, r: I.circle.r }, I.circle.pts) },
    { id: 'segment', label: 'hitTest2D segment: on it, at tol, beyond tol, past endpoint b', points: 7, tol: 0,
      run: (impl, I) => hits(impl, { kind: 'segment', a: I.segment.a, b: I.segment.b, tol: I.segment.tol }, I.segment.pts) },
    { id: 'segDot', label: 'hitTest2D segment with a == b: within tol, beyond tol', points: 4, tol: 0,
      run: (impl, I) => hits(impl, { kind: 'segment', a: I.dot.a, b: I.dot.b, tol: I.dot.tol }, I.dot.pts) },
    { id: 'tri', label: 'hitTest2D triangle (a, b, c): inside, outside, on an edge, on an edge\'s line outside', points: 6, tol: 0,
      run: (impl, I) => hits(impl, { kind: 'triangle', a: I.triangle.a, b: I.triangle.b, c: I.triangle.c }, I.triangle.pts) },
    { id: 'triFlip', label: 'hitTest2D triangle (a, c, b), the other winding: the same four points', points: 2, tol: 0,
      run: (impl, I) => hits(impl, { kind: 'triangle', a: I.triangle.a, b: I.triangle.c, c: I.triangle.b }, I.triangle.pts) },
    { id: 'pointer', label: 'classifyPointer: is each release a drag? (true = \'drag\', false = \'click\')', points: 10, tol: 0,
      run: (impl, I) => isDrag(impl, I.pointer.down, I.pointer.ups) },
    { id: 'aimZ', label: 'orientBasis: forward axis z (toward the target)', points: 15, tol: 1e-3,
      run: (impl, I) => impl.orientBasis(I.aim.pos, I.aim.target, I.aim.up).z },
    { id: 'aimX', label: 'orientBasis: right axis x', points: 15, tol: 1e-3,
      run: (impl, I) => impl.orientBasis(I.aim.pos, I.aim.target, I.aim.up).x },
    { id: 'aimY', label: 'orientBasis: up axis y', points: 15, tol: 1e-3,
      run: (impl, I) => impl.orientBasis(I.aim.pos, I.aim.target, I.aim.up).y },
  ],
};

// ---------------------------------------------------------------- HW2
const HW2 = {
  title: 'HW2 · Vectors and rotation',
  inputs: {
    march: { p: [0, 0, 0], from: [0, 0, 0], to: [4, 0, 3], speed: 2, dt: 0.5 },
    line: { p1: [1, 0, 0], p2: [4, 4, 0] },
    plane: { m: [1, 2, 2], q: [1, 0, 0] },
    P: [4, 1, 0],
    P2: [-1, 0, 0],
    cyl: { c: [0, 0, 0], axis: [0, 1, 0], radius: 0.5, halfHeight: 1, inside: [1.2, 0.6, -0.9], outside: [0.9, 1.4, 0.4] },
    rot: { v: [1, 0.6, 0.3], axis: [0, 1, 0], deg: 30 },
  },
  checks: [
    { id: 'march', label: 'EX1 marchStep: one step toward (4, 0, 3)', points: 8, tol: 1e-3,
      run: (impl, I) => impl.marchStep(I.march.p, I.march.from, I.march.to, I.march.speed, I.march.dt) },
    { id: 'line', label: 'EX1 lineFrame: midpoint, direction, length', points: 8, tol: 1e-3,
      run: (impl, I) => { const f = impl.lineFrame(I.line.p1, I.line.p2); return [f.mid, f.dir, f.length]; } },
    { id: 'plane', label: 'EX2 planeFromPoint: unit normal n and D', points: 8, tol: 1e-3,
      run: (impl, I) => { const pl = impl.planeFromPoint(I.plane.m, I.plane.q); return [pl.n, pl.D]; } },
    { id: 'side', label: 'EX3 signedDistance for P = (4, 1, 0) and P2 = (-1, 0, 0)', points: 8, tol: 1e-3,
      run: (impl, I) => { const pl = impl.planeFromPoint(I.plane.m, I.plane.q); return [impl.signedDistance(pl.n, pl.D, I.P), impl.signedDistance(pl.n, pl.D, I.P2)]; } },
    { id: 'shadow', label: 'EX4 shadowOnPlane of P', points: 10, tol: 1e-3,
      run: (impl, I) => { const pl = impl.planeFromPoint(I.plane.m, I.plane.q); return impl.shadowOnPlane(pl.n, pl.D, I.P); } },
    { id: 'hit', label: 'EX5 linePlaneHit for the segment P to P2', points: 10, tol: 1e-3,
      run: (impl, I) => { const pl = impl.planeFromPoint(I.plane.m, I.plane.q); return impl.linePlaneHit(pl.n, pl.D, I.P, I.P2); } },
    { id: 'reflect', label: 'EX5 reflect: the unit direction P to P2 reflected about n', points: 10, tol: 1e-3,
      run: (impl, I) => {
        const pl = impl.planeFromPoint(I.plane.m, I.plane.q);
        const d = [I.P2[0] - I.P[0], I.P2[1] - I.P[1], I.P2[2] - I.P[2]], l = Math.hypot(...d);
        return impl.reflect(d.map((x) => x / l), pl.n);
      } },
    { id: 'cylIn', label: 'EX6 projectToCylinder: (1.2, 0.6, -0.9), point and inside', points: 8, tol: 1e-3,
      run: (impl, I) => { const r = impl.projectToCylinder(I.cyl.inside, I.cyl.c, I.cyl.axis, I.cyl.radius, I.cyl.halfHeight); return [r.point, r.inside]; } },
    { id: 'cylOut', label: 'EX6 projectToCylinder: (0.9, 1.4, 0.4), point and inside', points: 6, tol: 1e-3,
      run: (impl, I) => { const r = impl.projectToCylinder(I.cyl.outside, I.cyl.c, I.cyl.axis, I.cyl.radius, I.cyl.halfHeight); return [r.point, r.inside]; } },
    { id: 'rodrigues', label: 'rotateAxisAngle: (1, 0.6, 0.3) by 30° about y', points: 10, tol: 1e-3,
      run: (impl, I) => impl.rotateAxisAngle(I.rot.v, I.rot.axis, I.rot.deg) },
    { id: 'quat', label: 'quatFromAxisAngle: 30° about y, as [x, y, z, w]', points: 7, tol: 1e-3,
      run: (impl, I) => impl.quatFromAxisAngle(I.rot.axis, I.rot.deg) },
    { id: 'quatRot', label: 'quatRotate: the same rotation applied by the quaternion', points: 7, tol: 1e-3,
      run: (impl, I) => impl.quatRotate(impl.quatFromAxisAngle(I.rot.axis, I.rot.deg), I.rot.v) },
  ],
};

// ---------------------------------------------------------------- HW3
const HW3 = {
  title: 'HW3 · Affine transformations and scene graphs',
  inputs: {
    order: { s: [2, 1, 1], t: [3, 0, 0] },
    pivot: { p: [1.5, 0, 0], deg: 90 },
    rigid: { ry: 90, t: [0, 0, -1] },
    pose: { baseRy: 30, armBend: 40, handRy: 0, armT: 0 },
    worldPoint: [0, 1, 0],
  },
  checks: [
    { id: 'ts', label: 'T(3,0,0) · S(2,1,1): translation column', points: 8, tol: 1e-6,
      run: (impl, I) => col(mm(impl, impl.translation(I.order.t), impl.scaling(I.order.s)), 3) },
    { id: 'st', label: 'S(2,1,1) · T(3,0,0): translation column', points: 8, tol: 1e-6,
      run: (impl, I) => col(mm(impl, impl.scaling(I.order.s), impl.translation(I.order.t)), 3) },
    { id: 'pivot', label: 'pivotRotateY((1.5, 0, 0), 90): translation column (I − R)p', points: 12, tol: 1e-3,
      run: (impl, I) => col(impl.pivotRotateY(I.pivot.p, I.pivot.deg), 3) },
    { id: 'pivotPt', label: 'pivotRotateY: the image of the point one unit past the pivot in x', points: 6, tol: 1e-3,
      run: (impl, I) => { const M = impl.pivotRotateY(I.pivot.p, I.pivot.deg), p = [I.pivot.p[0] + 1, I.pivot.p[1], I.pivot.p[2]]; return [0, 1, 2].map((r) => M[r] * p[0] + M[4 + r] * p[1] + M[8 + r] * p[2] + M[12 + r]); } },
    { id: 'rigidInv', label: 'rigidInverse of T(0,0,−1) · R_y(90): all 16 entries', points: 14, tol: 1e-3,
      run: (impl, I) => impl.rigidInverse(mm(impl, impl.translation(I.rigid.t), impl.rotationY(I.rigid.ry))) },
    { id: 'wHand', label: 'worldMatrices at baseRy 30, armBend 40: W_hand, 16 entries', points: 20, tol: 2e-3,
      run: (impl, I) => impl.worldMatrices(I.pose).hand },
    { id: 'handPos', label: 'hand origin in world space', points: 8, tol: 2e-3,
      run: (impl, I) => col(impl.worldMatrices(I.pose).hand, 3) },
    { id: 'armPos', label: 'arm origin in world space', points: 8, tol: 2e-3,
      run: (impl, I) => col(impl.worldMatrices(I.pose).arm, 3) },
    { id: 'toLocal', label: 'worldToLocal: world point (0, 1, 0) in the hand frame', points: 16, tol: 2e-3,
      run: (impl, I) => impl.worldToLocal(impl.worldMatrices(I.pose).hand, I.worldPoint) },
  ],
};
// matrix product through the course primitive, so a check never depends on a student helper
function mm(_impl, a, b) { return matMul(a, b); }

// ---------------------------------------------------------------- HW4
const HW4 = {
  title: 'HW4 · Viewing and rasterization',
  inputs: {
    eye: [3.7729, 2.8941, 5.3883], at: [0, 0.5, 0], up: [0, 1, 0],
    fov: 45, width: 1280, height: 720, near: 1, far: 8,
    model: { ry: 30, t: [0, 0.5, 0] },
    objectPoint: [0.5, 0.5, 0.5],
    tri: [[0.242102, 0.143041], [0.876839, 0.478762], [0.361059, 0.858197]],
    res: 12,
    pixelIn: [5, 6], pixelOut: [1, 9],
  },
  checks: [
    { id: 'V', label: 'viewMatrix: all 16 entries of V', points: 20, tol: 2e-3,
      run: (impl, I) => impl.viewMatrix(I.eye, I.at, I.up) },
    { id: 'P', label: 'perspectiveMatrix(45°, 16:9, 1, 8): all 16 entries', points: 15, tol: 2e-3,
      run: (impl, I) => impl.perspectiveMatrix(I.fov, I.width / I.height, I.near, I.far) },
    { id: 'pixel', label: 'worldToPixel: object point (0.5, 0.5, 0.5) to pixel x, y and NDC depth', points: 20, tol: 0.05,
      run: (impl, I) => {
        const M = modelMatrix(I.model);
        return impl.worldToPixel(M, impl.viewMatrix(I.eye, I.at, I.up), impl.perspectiveMatrix(I.fov, I.width / I.height, I.near, I.far), I.objectPoint, I.width, I.height);
      } },
    { id: 'baryIn', label: 'barycentric at the center of pixel (5, 6)', points: 12, tol: 2e-3,
      run: (impl, I) => impl.barycentric(I.tri, [(I.pixelIn[0] + 0.5) / I.res, (I.pixelIn[1] + 0.5) / I.res]) },
    { id: 'baryOut', label: 'barycentric at the center of pixel (1, 9): outside, one weight negative', points: 8, tol: 2e-3,
      run: (impl, I) => impl.barycentric(I.tri, [(I.pixelOut[0] + 0.5) / I.res, (I.pixelOut[1] + 0.5) / I.res]) },
    { id: 'count', label: 'rasterize at 12 × 12: number of covered pixels', points: 15, tol: 0,
      run: (impl, I) => impl.rasterize(I.tri, I.res).length },
    { id: 'count64', label: 'rasterize at 64 × 64: number of covered pixels', points: 10, tol: 0,
      run: (impl, I) => impl.rasterize(I.tri, 64).length },
  ],
};
// the model matrix of HW4 (given, not graded): T(0, 0.5, 0) · R_y(30)
export function modelMatrix({ ry, t }) {
  const c = Math.cos((ry * Math.PI) / 180), s = Math.sin((ry * Math.PI) / 180);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, t[0], t[1], t[2], 1];
}

// ---------------------------------------------------------------- HW5
const centerIndex = (n) => { const c = Math.round(n / 2); return c * (n + 1) + c; };
const HW5 = {
  title: 'HW5 · Meshes, texture placement, and a lit shader',
  inputs: {
    grid: { n: 2, half: 1.5, lift: 0.4 },
    uvDefaults: [0, 0, 0, 2],
    uvAll: [0.25, 0, 45, 2],
    shade: {
      N: [0.57735, 0.57735, 0.57735],
      P: [1.2 * 0.5773502691896258, 1.2 * 0.5773502691896258, 1.2 * 0.5773502691896258],
      light: [3 * Math.cos(Math.PI / 6) * Math.cos(Math.PI / 4), 3 * Math.sin(Math.PI / 6), 3 * Math.cos(Math.PI / 6) * Math.sin(Math.PI / 4)],
      eye: [3, 3, 6],
      shine: 30,
    },
  },
  checks: [
    { id: 'indices', label: 'gridMesh(2, 1.5, 0.4): the eight index triples', points: 12, tol: 0,
      run: (impl, I) => impl.gridMesh(I.grid.n, I.grid.half, I.grid.lift).indices },
    { id: 'center', label: 'gridMesh: position of the lifted center vertex (vertex 4 when n = 2)', points: 4, tol: 1e-6,
      run: (impl, I) => impl.gridMesh(I.grid.n, I.grid.half, I.grid.lift).positions[centerIndex(I.grid.n)] },
    { id: 'face1', label: 'faceNormal of triangle 1 (vertices 1, 3, 4 when n = 2), unnormalized', points: 10, tol: 1e-3,
      run: (impl, I) => { const g = impl.gridMesh(I.grid.n, I.grid.half, I.grid.lift), t = g.indices[1] ?? [1, 3, 4]; return impl.faceNormal(g.positions[t[0]], g.positions[t[1]], g.positions[t[2]]); } },
    { id: 'vn1', label: 'vertexNormals: vertex 1', points: 12, tol: 1e-3,
      run: (impl, I) => { const g = impl.gridMesh(I.grid.n, I.grid.half, I.grid.lift); return impl.vertexNormals(g.positions, g.indices)[1]; } },
    { id: 'vn4', label: 'vertexNormals: the center vertex', points: 6, tol: 1e-3,
      run: (impl, I) => { const g = impl.gridMesh(I.grid.n, I.grid.half, I.grid.lift); return impl.vertexNormals(g.positions, g.indices)[centerIndex(I.grid.n)]; } },
    { id: 'uvDef', label: 'uvPlacement at the defaults (0, 0, 0°, tile 2): 9 entries', points: 10, tol: 1e-3,
      run: (impl, I) => impl.uvPlacement(...I.uvDefaults) },
    { id: 'uvAll', label: 'uvPlacement(0.25, 0, 45°, 2): 9 entries', points: 14, tol: 1e-3,
      run: (impl, I) => impl.uvPlacement(...I.uvAll) },
    { id: 'NL', label: 'phong at the marked point: N·L and diffuse', points: 10, tol: 1e-3,
      run: (impl, I) => { const r = impl.phong(I.shade.N, I.shade.P, I.shade.light, I.shade.eye, I.shade.shine); return [r.NL, r.diffuse]; } },
    { id: 'spec', label: 'phong: R·V and the Phong specular (R·V)^30', points: 12, tol: 1e-3,
      run: (impl, I) => { const r = impl.phong(I.shade.N, I.shade.P, I.shade.light, I.shade.eye, I.shade.shine); return [r.RV, r.specular]; } },
    { id: 'blinn', label: 'phong: H·N and the Blinn specular (H·N)^30', points: 10, tol: 1e-3,
      run: (impl, I) => { const r = impl.phong(I.shade.N, I.shade.P, I.shade.light, I.shade.eye, I.shade.shine); return [r.HN, r.blinn]; } },
  ],
};

// ---------------------------------------------------------------- HW6
const WHITE = [0.8, 0.8, 0.8], RED = [0.75, 0.15, 0.12], GREEN = [0.15, 0.6, 0.2];
const quad = (a, b, c, d, material) => [{ a, b, c, material }, { a, b: c, c: d, material }];
export const CORNELL = {
  ka: 0.1,
  maxDepth: 3,
  light: [0, 1.9, 0],
  spheres: [
    { c: [-0.4, 0.35, -0.3], r: 0.35, material: { albedo: WHITE } },
    { c: [0.45, 0.4, 0.2], r: 0.4, material: { mirror: 0.9 } },
  ],
  triangles: [
    ...quad([-1, 0, 3], [1, 0, 3], [1, 0, -1], [-1, 0, -1], { albedo: WHITE }), // floor
    ...quad([-1, 2, 3], [-1, 2, -1], [1, 2, -1], [1, 2, 3], { albedo: WHITE }), // ceiling
    ...quad([-1, 0, -1], [1, 0, -1], [1, 2, -1], [-1, 2, -1], { albedo: WHITE }), // back
    ...quad([1, 0, 3], [-1, 0, 3], [-1, 2, 3], [1, 2, 3], { albedo: WHITE }), // front, behind the camera
    ...quad([-1, 0, 3], [-1, 0, -1], [-1, 2, -1], [-1, 2, 3], { albedo: RED }), // left
    ...quad([1, 0, -1], [1, 0, 3], [1, 2, 3], [1, 2, -1], { albedo: GREEN }), // right
  ],
};
const CORNELL_CAM = { eye: [0, 1, 2.8], at: [0, 1, 0], up: [0, 1, 0], fov: 40 };
const pixelColor = (impl, px, py, w, h) => { const { o, d } = impl.cameraRay(px, py, w, h, CORNELL_CAM); return impl.trace(CORNELL, o, d, 0); };
const HW6 = {
  title: 'HW6 · A Whitted ray tracer and the Cornell box',
  inputs: {
    cam: { eye: [3, 3, 6], at: [0, 0, 0], up: [0, 1, 0], fov: 28 }, size: 150, pixel: [89, 62],
    sphere: { c: [0, 0, 0], r: 1.2 },
    tri: { a: [0, 0, 0], b: [2, 0, 0], c: [0, 2, 0], o: [0.5, 0.5, 1], d: [0, 0, -1], missO: [1.5, 1.5, 1] },
    reflect: { d: [0.6, -0.8, 0], n: [0, 1, 0] },
    cornell: { cam: CORNELL_CAM, width: 96, height: 72, lit: [24, 63], shadow: [36, 66], mirror: [54, 56], wall: [6, 30] },
  },
  checks: [
    { id: 'ray', label: 'cameraRay through pixel (89, 62) of 150 × 150: direction', points: 12, tol: 1e-3,
      run: (impl, I) => impl.cameraRay(I.pixel[0], I.pixel[1], I.size, I.size, I.cam).d },
    { id: 'tSphere', label: 'hitSphere: nearest t on the radius-1.2 sphere', points: 12, tol: 1e-3,
      run: (impl, I) => impl.hitSphere(I.cam.eye, impl.cameraRay(I.pixel[0], I.pixel[1], I.size, I.size, I.cam).d, I.sphere.c, I.sphere.r) },
    { id: 'tri', label: 'hitTriangle (Möller–Trumbore): t, u, v', points: 12, tol: 1e-3,
      run: (impl, I) => { const h = impl.hitTriangle(I.tri.o, I.tri.d, I.tri.a, I.tri.b, I.tri.c); return h && [h.t, h.u, h.v]; } },
    { id: 'triMiss', label: 'hitTriangle: the ray from (1.5, 1.5, 1) misses (null) while the one from (0.5, 0.5, 1) hits', points: 6, tol: 0,
      run: (impl, I) => [impl.hitTriangle(I.tri.missO, I.tri.d, I.tri.a, I.tri.b, I.tri.c) === null, impl.hitTriangle(I.tri.o, I.tri.d, I.tri.a, I.tri.b, I.tri.c) !== null] },
    { id: 'reflect', label: 'reflect (0.6, −0.8, 0) about (0, 1, 0)', points: 6, tol: 1e-6,
      run: (impl, I) => impl.reflect(I.reflect.d, I.reflect.n) },
    { id: 'lit', label: 'Cornell box, pixel (24, 63): lit floor', points: 12, tol: 2e-3,
      run: (impl, I) => pixelColor(impl, ...I.cornell.lit, I.cornell.width, I.cornell.height) },
    { id: 'shadow', label: 'Cornell box, pixel (36, 66): floor in the diffuse sphere’s shadow', points: 14, tol: 2e-3,
      run: (impl, I) => pixelColor(impl, ...I.cornell.shadow, I.cornell.width, I.cornell.height) },
    { id: 'mirror', label: 'Cornell box, pixel (54, 56): the red wall seen in the mirror sphere', points: 14, tol: 2e-3,
      run: (impl, I) => pixelColor(impl, ...I.cornell.mirror, I.cornell.width, I.cornell.height) },
    { id: 'wall', label: 'Cornell box, pixel (6, 30): the red wall', points: 12, tol: 2e-3,
      run: (impl, I) => pixelColor(impl, ...I.cornell.wall, I.cornell.width, I.cornell.height) },
  ],
};

// ---------------------------------------------------------------- HW7
const HW7 = {
  title: 'HW7 · A gradient step, a fit, and a digit’s DCT',
  inputs: {
    tiny: { w1: [1, -1], b1: [0.5, 0.5], w2: [0.8, -0.6], b2: 0.1, x: 0.4, y: 0.3, lr: 0.1 },
    fit: { steps: 400, lr: 0.05 },
    dct: { n: 20, keep: [5, 8] },
  },
  checks: [
    { id: 'fwd', label: 'forward on the tiny net at x = 0.4: hidden a and output f', points: 10, tol: 1e-4,
      run: (impl, I) => { const t = I.tiny, r = impl.forward(t, t.x); return [r.a, r.f]; } },
    { id: 'grad', label: 'gradients on the one sample: loss, dw1, db1, dw2, db2', points: 20, tol: 1e-4,
      run: (impl, I) => { const t = I.tiny, g = impl.gradients(t, [t.x], [t.y]); return [g.loss, g.w1, g.b1, g.w2, g.b2]; } },
    { id: 'after', label: 'after one sgdStep (lr 0.1): the new output f', points: 10, tol: 1e-4,
      run: (impl, I) => { const t = I.tiny, m = impl.sgdStep(t, impl.gradients(t, [t.x], [t.y]), t.lr); return impl.forward(m, t.x).f; } },
    { id: 'fit', label: '12-unit net on the 12 wave samples: loss after 400 steps (lr 0.05)', points: 20, tol: 1e-5,
      run: (impl, I) => {
        let m = cloneModel(DATA7.init);
        for (let e = 0; e < I.fit.steps; e++) m = impl.sgdStep(m, impl.gradients(m, DATA7.samples.xs, DATA7.samples.ys), I.fit.lr);
        return impl.gradients(m, DATA7.samples.xs, DATA7.samples.ys).loss;
      } },
    { id: 'dc', label: 'dct2 of the digit: the first three coefficients C[0][0], C[0][1], C[1][0]', points: 10, tol: 1e-4,
      run: (impl, I) => { const C = impl.dct2(I.digit ?? DATA7.digit, I.dct.n); return [C[0], C[1], C[I.dct.n]]; } },
    { id: 'psnr5', label: 'psnr of the 5 × 5 low-frequency rebuild against the digit', points: 15, tol: 1e-3,
      run: (impl, I) => { const g = I.digit ?? DATA7.digit; return impl.psnr(g, impl.idct2Truncated(impl.dct2(g, I.dct.n), I.dct.n, 5)); } },
    { id: 'psnr8', label: 'psnr of the 8 × 8 low-frequency rebuild against the digit', points: 15, tol: 1e-3,
      run: (impl, I) => { const g = I.digit ?? DATA7.digit; return impl.psnr(g, impl.idct2Truncated(impl.dct2(g, I.dct.n), I.dct.n, 8)); } },
  ],
};
function cloneModel(m) { return { w1: [...m.w1], b1: [...m.b1], w2: [...m.w2], b2: m.b2 }; }

// ---------------------------------------------------------------- HW8
const HW8 = {
  title: 'HW8 · Diffusion and learned scenes',
  inputs: {
    step: { xt: DATA8.stepXt, tFrom: DATA8.tFrom, tTo: DATA8.tTo },
    sampler: { steps: 50, count: 60 },
    volume: { sigmas: [0, 0.5, 4, 8, 1], colors: [[0, 0, 0], [0.5, 0.5, 0.5], [0.9, 0.2, 0.2], [0.9, 0.2, 0.2], [0.2, 0.3, 0.9]], delta: 0.2 },
    splat: { s: [0.16, 0.04, 0.04], rotZ: 30, t: [0.5, 0.3, 2], f: 500 },
    row: { u: 0.45, splats: [{ mu: 0.35, sd: 0.1, a: 0.8, c: [0.85, 0.2, 0.2] }, { mu: 0.55, sd: 0.14, a: 0.7, c: [0.2, 0.45, 0.9] }, { mu: 0.75, sd: 0.08, a: 0.9, c: [0.95, 0.75, 0.15] }] },
  },
  checks: [
    { id: 'x0hat', label: 'denoise: x̂0 for the point x_t at step 15 of 50', points: 12, tol: 1e-4,
      run: (impl, I) => impl.denoise(I.step.xt, I.step.tFrom, DATA8.spiral) },
    { id: 'ddim', label: 'ddimStep: the next point, t from step 15 to step 16', points: 14, tol: 1e-4,
      run: (impl, I) => impl.ddimStep(I.step.xt, impl.denoise(I.step.xt, I.step.tFrom, DATA8.spiral), I.step.tFrom, I.step.tTo) },
    { id: 'sampler', label: 'sampleDDIM, 50 steps, first 60 starts: mean distance to the nearest data point', points: 14, tol: 1e-4,
      run: (impl, I) => meanNearest(impl.sampleDDIM(DATA8.starts.slice(I.sampler.offset ?? 0, (I.sampler.offset ?? 0) + I.sampler.count), DATA8.spiral, I.sampler.steps), DATA8.spiral) },
    { id: 'rayC', label: 'renderRay through the five samples: color C', points: 12, tol: 1e-4,
      run: (impl, I) => impl.renderRay(I.volume.sigmas, I.volume.colors, I.volume.delta).C },
    { id: 'rayT', label: 'renderRay: transmittance left after the ray', points: 8, tol: 1e-4,
      run: (impl, I) => impl.renderRay(I.volume.sigmas, I.volume.colors, I.volume.delta).T },
    { id: 'cov', label: 'projectSplat: the pixel covariance entries (xx, xy, yy)', points: 14, tol: 0.05,
      run: (impl, I) => impl.projectSplat(I.splat.s, I.splat.rotZ, I.splat.t, I.splat.f).cov },
    { id: 'radii', label: 'projectSplat: ellipse radii in pixels, angle, center', points: 12, tol: 2e-3,
      run: (impl, I) => { const r = impl.projectSplat(I.splat.s, I.splat.rotZ, I.splat.t, I.splat.f); return [r.radii, r.angleDeg, r.center]; } },
    { id: 'splatC', label: 'compositeSplats at u = 0.45: color C and transmittance T', points: 14, tol: 1e-4,
      run: (impl, I) => { const r = impl.compositeSplats(I.row.splats, I.row.u); return [r.C, r.T]; } },
  ],
};
function meanNearest(points, data) {
  let total = 0;
  for (const p of points) {
    let best = Infinity;
    for (const q of data) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]));
    total += best;
  }
  return total / points.length;
}

export const HOMEWORK = { hw01: HW1, hw02: HW2, hw03: HW3, hw04: HW4, hw05: HW5, hw06: HW6, hw07: HW7, hw08: HW8 };
export { meanNearest, cloneModel };

// ---------------------------------------------------------------- comparison
function flat(v, out = []) {
  if (Array.isArray(v) || ArrayBuffer.isView(v)) { for (const x of v) flat(x, out); } else out.push(v);
  return out;
}

/** compare(got, want, tol) -> true when shapes agree and every number is within tol. */
export function compare(got, want, tol) {
  if (want === null || got === null || got === undefined) return got === want;
  const g = flat(got), w = flat(want);
  if (g.length !== w.length) return false;
  for (let i = 0; i < w.length; i++) {
    if (typeof w[i] === 'boolean' || w[i] === null) { if (g[i] !== w[i]) return false; continue; }
    if (typeof g[i] !== 'number' || !Number.isFinite(g[i])) return false;
    if (Math.abs(g[i] - w[i]) > tol) return false;
  }
  return true;
}

/** runChecks(hwId, impl, expected, inputs?) -> [{ id, label, points, got, want, pass, error }] */
export function runChecks(hwId, impl, expected, inputs) {
  const hw = HOMEWORK[hwId];
  const I = inputs ?? hw.inputs;
  return hw.checks.map((c) => {
    let got, error = null;
    try { got = c.run(impl, I); } catch (e) { error = String(e && e.message ? e.message : e); }
    const want = expected ? expected[c.id] : undefined;
    const pass = error === null && want !== undefined && compare(got, want, c.tol);
    return { id: c.id, label: c.label, points: c.points, tol: c.tol, got, want, pass, error };
  });
}

/** fmt(value): a short printable form for readouts and tables. */
export function fmt(v, digits = 4) {
  if (v === null) return 'null';
  if (v === undefined) return '(none)';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return Number.isFinite(v) ? String(+v.toFixed(digits)) : String(v);
  if (Array.isArray(v) || ArrayBuffer.isView(v)) return `(${Array.from(v, (x) => fmt(x, digits)).join(', ')})`;
  return String(v);
}
