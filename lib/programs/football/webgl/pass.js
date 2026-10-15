// pass.js: the model of a spiral pass, as plain three.js math. Every placement in the scene is a product of
// 4 x 4 matrices built here; scene.js only copies them onto meshes and cameras.
//
//   ball 1, flying:  M = F · H · T(t) · A(t) · W(t) · S(t)
//   ball 1, caught:  M = F · K(t) · D(t) · K(tc)⁻¹ · H · T(tc) · A(tc) · W(tc) · S(tc)
//   ball 2, resting: F · H · T(3, r − ground, −1) · R_y(25°)
//   ball 3, a top:   F · H · T(−3, −ground, −1) · R_y(precession) · R_x(tilt − 90°) · T(0, 0, L/2) · R_z(spin)
//   the target cart: F · K(t);  a wheel: F · K(t) · T(offset) · R_x(distance / radius)
//   the camera:      V = (F · C)⁻¹, P = perspective
// Units: meters, seconds; settings in degrees, three.js in radians. The ball's own frame: center at the
// origin, long axis +z, laces +y (lib/assets/models/football/).
// The same model, line for line, is Pass.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';

// #region Settings
export const BALL_LENGTH = 0.28;
export const BALL_RADIUS = 0.085;
export const FIELD = { width: 50, height: 40, length: 110 };   // the coordinate box: x across, z along

export const GRAVITY = { seattle: 9.808, denver: 9.797, moon: 1.62, whiteDwarf: 3.6e6 };

export const settings = {
  startX: 20, startY: 2, startZ: 25,  // the release point, field coordinates
  heading: 12,                        // degrees from straight downfield (+z), toward +x
  angle: 30,                          // launch angle above horizontal, degrees
  speed: 22,                          // m/s
  rpm: 600,                           // spin about the long axis
  cone: 3, wobbleHz: 2,               // wobble: cone half-angle (degrees) and turns per second
  fieldYaw: 0,                        // the field's turn in the world, degrees
  gravity: GRAVITY.seattle,
};

export const CART = {
  length: 1.6, width: 1.3, wheelRadius: 0.3,
  rimHeight: 1.3, bowlRadius: 0.55,   // a ball coming down through the rim is caught
  homeX: 10, homeZ: 25,               // where it waits, throw frame: 10 m left, 25 m downfield
  topSpeed: 20, brakeDistance: 5, settle: 0.46,
};

const DEG = Math.PI / 180;
// #endregion

// #region The flight: where the ball is, how fast it goes
/** the ball's center at time t, in the throw frame: a parabola in the y-z plane (no air drag). */
export function flightPosition(t) {
  const a = settings.angle * DEG;
  const y = settings.speed * Math.sin(a) * t - 0.5 * settings.gravity * t * t;
  const z = settings.speed * Math.cos(a) * t;
  return new THREE.Vector3(0, y, z);
}

/** the derivative of flightPosition: the velocity, throw frame. */
export function flightVelocity(t) {
  const a = settings.angle * DEG;
  return new THREE.Vector3(0, settings.speed * Math.sin(a) - settings.gravity * t, settings.speed * Math.cos(a));
}

/** the time the center comes DOWN through field height h, or -1 if it never gets that high.
 *  startY + vy t − ½ g t² = h has two roots; the later one is on the way down. */
export function timeDownTo(h) {
  const vy = settings.speed * Math.sin(settings.angle * DEG);
  const g = settings.gravity;
  const disc = vy * vy + 2 * g * (settings.startY - h);
  if (disc < 0) return -1;
  const t = (vy + Math.sqrt(disc)) / g;
  return t > 0 ? t : -1;
}
// #endregion

// #region The chain: one matrix per link
/** S: spin about the ball's long axis, its own z. */
export function spin(t) {
  const turns = (settings.rpm / 60) * t;
  return new THREE.Matrix4().makeRotationZ(2 * Math.PI * turns);
}

/** W: tilt the nose by the cone angle, in a frame turned by psi about z: R_z(psi) R_x(beta) R_z(-psi). */
export function wobble(t) {
  const psi = 2 * Math.PI * settings.wobbleHz * t;
  const beta = settings.cone * DEG;
  return new THREE.Matrix4().makeRotationZ(psi)
    .multiply(new THREE.Matrix4().makeRotationX(beta))
    .multiply(new THREE.Matrix4().makeRotationZ(-psi));
}

/** A: tip the nose (+z) onto the velocity. A positive turn about +x takes +z toward -y: negate. */
export function aim(t) {
  const v = flightVelocity(t);
  const climb = Math.atan2(v.y, v.z);
  return new THREE.Matrix4().makeRotationX(-climb);
}

/** T: move to the point on the parabola. */
export function flight(t) {
  const p = flightPosition(t);
  return new THREE.Matrix4().makeTranslation(p.x, p.y, p.z);
}

/** H: the throw frame on the field: the release point, turned to the heading. Built once per throw. */
export function throwSetup() {
  return new THREE.Matrix4().makeTranslation(settings.startX, settings.startY, settings.startZ)
    .multiply(new THREE.Matrix4().makeRotationY(settings.heading * DEG));
}

/** F: the field in the world. The world origin is at midfield: move the field's center there, then turn. */
export function fieldPlacement() {
  return new THREE.Matrix4().makeRotationY(settings.fieldYaw * DEG)
    .multiply(new THREE.Matrix4().makeTranslation(-FIELD.width / 2, 0, -FIELD.length / 2));
}

/** the thrown ball, in the field: H · T · A · W · S, right to left. */
export function ballInField(t) {
  return throwSetup().multiply(flight(t)).multiply(aim(t)).multiply(wobble(t)).multiply(spin(t));
}
// #endregion

// #region The target: a plan, then a placement for every t
/** smooth start, full speed at the end: s = d u²(2 − u), u = t / T. */
function ease(u) { return u * u * (2 - u); }
function easeRate(u) { return 4 * u - 3 * u * u; }

/** the distance from (x, z) inside the box, along unit (dx, dz), to the box's wall. */
function distanceToWall(x, z, dx, dz) {
  let s = Infinity;
  if (dx > 1e-9) s = Math.min(s, (FIELD.width - x) / dx);
  if (dx < -1e-9) s = Math.min(s, -x / dx);
  if (dz > 1e-9) s = Math.min(s, (FIELD.length - z) / dz);
  if (dz < -1e-9) s = Math.min(s, -z / dz);
  return s;
}

/** where the cart waits, where it drives, and how the throw ends for it: 'catch', 'miss' or 'crash'. */
export class TargetPlan {
  constructor() {
    const H = throwSetup();
    const margin = CART.length / 2 + 0.1;
    this.tGround = timeDownTo(BALL_RADIUS);
    this.home = new THREE.Vector3(CART.homeX, 0, CART.homeZ).applyMatrix4(H).setY(0);
    this.home.x = Math.min(Math.max(this.home.x, margin), FIELD.width - margin);
    this.home.z = Math.min(Math.max(this.home.z, margin), FIELD.length - margin);

    // catch where the ball comes down through the rim, if the cart can get there in time
    const tRim = timeDownTo(CART.rimHeight);
    this.outcome = 'miss';
    this.tCatch = -1;
    if (tRim > 0) {
      this.aimAt(flightPosition(tRim).applyMatrix4(H), tRim);
      if (this.T <= tRim + 1e-9) { this.outcome = 'catch'; this.tCatch = tRim; }
    }
    if (this.outcome !== 'catch') this.aimAt(flightPosition(this.tGround).applyMatrix4(H), this.tGround);

    const inside = this.goal.x >= margin && this.goal.x <= FIELD.width - margin
      && this.goal.z >= margin && this.goal.z <= FIELD.length - margin;
    if (!inside) {
      // the goal is outside the box: drive until the front bumper meets the wall, and stop there
      this.outcome = 'crash';
      this.tCatch = -1;
      this.wallDistance = Math.max(0, distanceToWall(this.home.x, this.home.z, this.dir.x, this.dir.z) - CART.length / 2);
      let lo = 0, hi = 1;
      for (let k = 0; k < 60; k++) {
        const u = (lo + hi) / 2;
        if (this.dist * ease(u) < this.wallDistance) lo = u; else hi = u;
      }
      this.tStop = lo * this.T;
      this.impactSpeed = (this.dist / this.T) * easeRate(lo);
    } else {
      // reach the goal at full speed, then brake to a stop
      this.endSpeed = this.dist / this.T;
      const room = distanceToWall(this.goal.x, this.goal.z, this.dir.x, this.dir.z) - CART.length / 2;
      this.brake = Math.max(0.05, Math.min(CART.brakeDistance, room));
      this.tBrake = this.endSpeed > 1e-9 ? (2 * this.brake) / this.endSpeed : 0;
      this.tStop = this.T + this.tBrake;
    }
    this.tFlightEnd = this.outcome === 'catch' ? this.tCatch : this.tGround;
    this.tEnd = Math.max(this.tFlightEnd, this.tStop) + 1;
  }

  /** a straight line from home to goal, timed to arrive at tNeed unless that needs more than top speed. */
  aimAt(goal, tNeed) {
    this.goal = goal.setY(0);
    const d = this.goal.clone().sub(this.home);
    this.dist = d.length();
    this.dir = this.dist > 1e-9 ? d.divideScalar(this.dist) : new THREE.Vector3(0, 0, 1);
    this.heading = Math.atan2(this.dir.x, this.dir.z);
    this.T = Math.max(tNeed, (4 / 3) * this.dist / CART.topSpeed, 1e-6);   // ease peaks at 4/3 the mean speed
  }

  /** the distance driven by time t. */
  distanceAt(t) {
    if (this.outcome === 'crash') return t < this.tStop ? this.dist * ease(t / this.T) : this.wallDistance;
    if (t <= this.T) return this.dist * ease(t / this.T);
    const tau = Math.min(t - this.T, this.tBrake);
    const decel = this.tBrake > 0 ? this.endSpeed / this.tBrake : 0;
    return this.dist + this.endSpeed * tau - 0.5 * decel * tau * tau;
  }

  /** after a crash the rear lifts over the front bumper and drops back: degrees. */
  crashTilt(t) {
    if (this.outcome !== 'crash' || t <= this.tStop) return 0;
    const tau = t - this.tStop;
    return Math.min(30, 2 * this.impactSpeed) * Math.exp(-5 * tau) * Math.abs(Math.sin(9 * tau));
  }

  /** K: the cart in the field. T(position) · R_y(heading) · [tilt about the front bumper's bottom edge]. */
  placement(t) {
    const pos = this.home.clone().addScaledVector(this.dir, this.distanceAt(t));
    const half = CART.length / 2;
    return new THREE.Matrix4().makeTranslation(pos.x, 0, pos.z)
      .multiply(new THREE.Matrix4().makeRotationY(this.heading))
      .multiply(new THREE.Matrix4().makeTranslation(0, 0, half))     // the pivot sandwich:
      .multiply(new THREE.Matrix4().makeRotationX(this.crashTilt(t) * DEG))
      .multiply(new THREE.Matrix4().makeTranslation(0, 0, -half));   // T(p) R T(-p)
  }

  /** wheel i (0 to 3) in the field: K · T(offset) · R_x(distance / radius), rolling without slipping. */
  wheel(i, t) {
    const sx = i % 2 === 0 ? 1 : -1, sz = i < 2 ? 1 : -1;
    const roll = this.distanceAt(t) / CART.wheelRadius;
    return this.placement(t)
      .multiply(new THREE.Matrix4().makeTranslation(sx * CART.width / 2, CART.wheelRadius, sz * (CART.length / 2 - 0.35)))
      .multiply(new THREE.Matrix4().makeRotationX(roll));
  }
}
// #endregion

// #region The thrown ball, start to finish
/** ball 1 in the field at time t: flying, or caught and carried, or lying where it landed.
 *  Caught: change its parent to the cart without moving it, L = K(tc)⁻¹ · B(tc), then ride: K(t) · D(t) · L,
 *  where D drops it into the bowl. */
export function thrownBall(plan, t) {
  if (t < plan.tFlightEnd) return ballInField(t);
  const atEnd = ballInField(plan.tFlightEnd);
  if (plan.outcome !== 'catch') return atEnd;
  const local = plan.placement(plan.tCatch).invert().multiply(atEnd);
  const tau = t - plan.tCatch;
  const drop = Math.min(CART.settle, 0.5 * Math.min(settings.gravity, 1000) * tau * tau);
  return plan.placement(t).multiply(new THREE.Matrix4().makeTranslation(0, -drop, 0)).multiply(local);
}
// #endregion

// #region Ball 2 and ball 3
/** ball 2, at rest beside the thrower: H · T(3, r − ground, −1) · R_y(25°). */
export function restingBall() {
  return throwSetup()
    .multiply(new THREE.Matrix4().makeTranslation(3, BALL_RADIUS - settings.startY, -1))
    .multiply(new THREE.Matrix4().makeRotationY(25 * DEG));
}

/** ball 3, a top on its tip: stand the long axis up leaning 18°, lift it by half its length so the lower
 *  tip touches the ground, spin it about the long axis, and let the lean go around (precess). */
export function spinningTop(t) {
  return throwSetup()
    .multiply(new THREE.Matrix4().makeTranslation(-3, -settings.startY, -1))
    .multiply(new THREE.Matrix4().makeRotationY(2 * Math.PI * 0.5 * t))       // precession, 0.5 turn/s
    .multiply(new THREE.Matrix4().makeRotationX((18 - 90) * DEG))               // lean 18° from vertical
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, BALL_LENGTH / 2))       // tip on the ground
    .multiply(new THREE.Matrix4().makeRotationZ(2 * Math.PI * (480 / 60) * t)); // spin, 480 rpm
}
// #endregion

// #region Shot cameras
export const CAMERA_MODES = ['tripod', 'pan', 'sideline', 'chase', 'skycam', 'ballCam', 'spinCam', 'receiver', 'orbit'];

/** ball 1, 2 or 3 in the field at time t (whole), and the same frame without its own spin (steady):
 *  ball 1 drops W · S, ball 3 drops its R_z, ball 2 does not spin. */
export function ballFrames(look, t, plan) {
  if (look === 2) return { whole: restingBall(), steady: restingBall() };
  if (look === 3) {
    const whole = spinningTop(t);
    const spinBack = new THREE.Matrix4().makeRotationZ(-2 * Math.PI * (480 / 60) * t);
    return { whole, steady: whole.clone().multiply(spinBack) };
  }
  const whole = thrownBall(plan, t);
  const tl = Math.min(t, plan.tFlightEnd);
  return { whole, steady: whole.clone().multiply(wobble(tl).multiply(spin(tl)).invert()) };
}

/** C: the camera's placement in the field, looking at ball `look` (1, 2 or 3).
 *  A three.js camera looks down its own -z; Matrix4.lookAt builds the turn whose z axis is eye - target. */
export function cameraPlacement(mode, t, look, plan) {
  const ball = ballFrames(look, t, plan);
  const center = new THREE.Vector3().setFromMatrixPosition(ball.whole);
  const H = throwSetup();
  const fwd = new THREE.Vector3(0, 0, 1).transformDirection(H).setY(0).normalize();
  const midFlight = flightPosition(plan.tFlightEnd / 2).applyMatrix4(H);
  let eye, target = center;
  switch (mode) {
    case 'tripod': eye = new THREE.Vector3(-25, 10, midFlight.z); target = midFlight; break;
    case 'pan': eye = new THREE.Vector3(-25, 10, midFlight.z); break;
    case 'sideline': eye = new THREE.Vector3(-5, 2, center.z); break;
    case 'chase':
      eye = center.clone().addScaledVector(fwd, -2.5);
      eye.y += 0.7;
      target = center.clone().addScaledVector(fwd, 1.5);
      break;
    case 'skycam': {
      // a cable camera high behind the ball, trailing it by 0.6 s
      const lag = new THREE.Vector3().setFromMatrixPosition(ballFrames(look, Math.max(0, t - 0.6), plan).whole);
      eye = lag.addScaledVector(fwd, -12);
      eye.y += 14;
      break;
    }
    case 'ballCam': case 'spinCam': {
      // a child of the ball: behind it, looking along its +z (the half turn points the camera's -z there);
      // ballCam rides the steady frame, spinCam the whole one, spin included
      const seat = new THREE.Matrix4().makeTranslation(0, 0.3, -1)
        .multiply(new THREE.Matrix4().makeRotationY(Math.PI));
      return (mode === 'spinCam' ? ball.whole : ball.steady).multiply(seat);
    }
    case 'receiver': {
      const land = flightPosition(plan.tFlightEnd).applyMatrix4(H);
      eye = land.addScaledVector(fwd, 3).setY(1.8);
      break;
    }
    default: {   // orbit: circle the ball at 2 m, a quarter turn per second
      const a = 0.5 * Math.PI * t;
      eye = center.clone().add(new THREE.Vector3(2 * Math.cos(a), 0.6, 2 * Math.sin(a)));
    }
  }
  const C = new THREE.Matrix4().lookAt(eye, target, new THREE.Vector3(0, 1, 0));
  return C.setPosition(eye);
}

/** V: the view matrix, the inverse of the camera's placement in the world. */
export function viewMatrix(C) {
  return fieldPlacement().multiply(C).invert();
}
// #endregion
