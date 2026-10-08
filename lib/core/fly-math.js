// fly-math: pure, hand-built free-look camera math shared by every demo that
// navigates a 3D scene (gsplat's fly camera and the cockpit demos' orbit
// camera alike). No DOM, no three.js objects, just arrays and degrees, built
// on this project's own xform.js matrix core so the whole library shares ONE
// rotation convention.
//
// Locked convention (do not change without re-deriving every consumer):
//   yaw>0 rotates counterclockwise about +Y, i.e. turns the view LEFT.
//   At rest (yaw=pitch=roll=0) the camera looks down -Z with +Y up.
// A rightward mouse move (dx>0) must therefore DECREASE yaw (turn right); an
// upward mouse move (dy<0) must INCREASE pitch (look up).
import { axisAngleMatrix, applyMat4, matMul, normalize, sub } from './xform.js';

/** clampPitch(p): keep pitch just shy of ±90° so forward never aligns with up. */
export function clampPitch(p) { return Math.max(-89.9, Math.min(89.9, p)); }

/**
 * camBasis(yaw, pitch, roll) -> { forward, right, up }
 * The camera's orthonormal basis for the given Euler angles (degrees), applied
 * yaw(+Y) · pitch(+X) · roll(-Z) to the rest basis. forward is the -Z look
 * direction; right is +X; up is +Y, each rotated by the composed matrix.
 */
export function camBasis(yaw, pitch, roll) {
  const R = matMul(
    matMul(axisAngleMatrix(0, 1, 0, yaw), axisAngleMatrix(1, 0, 0, pitch)),
    axisAngleMatrix(0, 0, 1, roll),
  );
  const apply = (v) => { const [x, y, z] = applyMat4(R, v); return [x, y, z]; };
  return { forward: apply([0, 0, -1]), right: apply([1, 0, 0]), up: apply([0, 1, 0]) };
}

/**
 * moveEye(eye, basis, dRight, dUp, dForward) -> [x,y,z]
 * Translate an eye position along a camera basis (from camBasis) by the given
 * right/up/forward amounts. Pure: returns a new array, never mutates `eye`.
 */
export function moveEye(eye, { forward, right, up }, dRight, dUp, dForward) {
  return [
    eye[0] + dRight * right[0] + dUp * up[0] + dForward * forward[0],
    eye[1] + dRight * right[1] + dUp * up[1] + dForward * forward[1],
    eye[2] + dRight * right[2] + dUp * up[2] + dForward * forward[2],
  ];
}

/**
 * poseLookingAt(eye, target) -> { yaw, pitch }  (degrees, roll assumed 0)
 * The closed-form yaw/pitch such that camBasis(yaw, pitch, 0).forward ===
 * normalize(target - eye). Derivation: roll rotates the base look vector about
 * itself (a no-op on forward), so
 *   forward = Ryaw(Rpitch([0,0,-1])) = [-sin(yaw)cos(pitch), sin(pitch), -cos(yaw)cos(pitch)].
 * For a target forward F=(Fx,Fy,Fz): pitch = asin(Fy); cos(pitch) cancels from
 * the x/z ratio, leaving yaw = atan2(-Fx, -Fz).
 */
export function poseLookingAt(eye, target) {
  const [fx, fy, fz] = normalize(sub(target, eye));
  const yaw = Math.atan2(-fx, -fz) * (180 / Math.PI);
  const pitch = Math.asin(Math.max(-1, Math.min(1, fy))) * (180 / Math.PI);
  return { yaw, pitch };
}
