using UnityEngine;

// Pass.cs: the model of a spiral pass, as plain Unity math. Every placement in the scene is a product of
// 4 x 4 matrices built here; PassScene.cs only copies them onto Transforms and the camera.
//
//   ball 1, flying:  M = F * H * T(t) * A(t) * W(t) * S(t)
//   ball 1, caught:  M = F * K(t) * D(t) * K(tc)^-1 * H * T(tc) * A(tc) * W(tc) * S(tc)
//   ball 2, resting: F * H * T(3, r - ground, -1) * R_y(25)
//   ball 3, a top:   F * H * T(-3, -ground, -1) * R_y(precession) * R_x(tilt - 90) * T(0, 0, L/2) * R_z(spin)
//   the target cart: F * K(t);  a wheel: F * K(t) * T(offset) * R_x(distance / radius)
// Units: meters, seconds, degrees (Unity's angles are degrees). The ball's own frame: center at the origin,
// long axis +z, laces +y (lib/assets/models/football/). The same model, line for line, is pass.js in
// ../webgl/. The matrices hold the same numbers as three.js's; Unity's axes are left-handed (z points
// away from you), so the scene you see is the mirror image of the WebGL one.
public static class Pass
{
    #region Settings
    public const float BallLength = 0.28f;
    public const float BallRadius = 0.081f;
    public const float FieldWidth = 50f, FieldHeight = 40f, FieldLength = 110f;   // x across, y up, z along

    public const float Seattle = 9.808f, Denver = 9.797f, Moon = 1.62f, WhiteDwarf = 3.6e6f;

    public static float startX = 20f, startY = 2f, startZ = 25f;   // the release point, field coordinates
    public static float heading = 12f;                             // degrees from straight downfield, toward +x
    public static float angle = 30f;                               // launch angle above horizontal, degrees
    public static float speed = 22f;                               // m/s
    public static float rpm = 600f;                                // spin about the long axis
    public static float cone = 3f, wobbleHz = 2f;                  // wobble: cone half-angle and turns per second
    public static float fieldYaw = 0f;                             // the field's turn in the world, degrees
    public static float gravity = Seattle;

    public const float CartLength = 1.6f, CartWidth = 1.3f, WheelRadius = 0.3f;
    public const float RimHeight = 1.3f, BowlRadius = 0.55f;       // a ball coming down through the rim is caught
    public const float HomeX = 10f, HomeZ = 25f;                   // where the cart waits, throw frame
    public const float TopSpeed = 20f, BrakeDistance = 5f, Settle = 0.46f;
    #endregion

    #region The flight: where the ball is, how fast it goes
    /// the ball's center at time t, in the throw frame: a parabola in the y-z plane (no air drag)
    public static Vector3 FlightPosition(float t)
    {
        float a = angle * Mathf.Deg2Rad;
        float y = speed * Mathf.Sin(a) * t - 0.5f * gravity * t * t;
        float z = speed * Mathf.Cos(a) * t;
        return new Vector3(0f, y, z);
    }

    /// the derivative of FlightPosition: the velocity, throw frame
    public static Vector3 FlightVelocity(float t)
    {
        float a = angle * Mathf.Deg2Rad;
        return new Vector3(0f, speed * Mathf.Sin(a) - gravity * t, speed * Mathf.Cos(a));
    }

    /// the time the center comes DOWN through field height h, or -1 if it never gets that high
    public static float TimeDownTo(float h)
    {
        float vy = speed * Mathf.Sin(angle * Mathf.Deg2Rad);
        float disc = vy * vy + 2f * gravity * (startY - h);
        if (disc < 0f) return -1f;
        float t = (vy + Mathf.Sqrt(disc)) / gravity;
        return t > 0f ? t : -1f;
    }
    #endregion

    #region The chain: one matrix per link
    static Matrix4x4 Turn(float degrees, Vector3 axis)
    {
        return Matrix4x4.Rotate(Quaternion.AngleAxis(degrees, axis));
    }

    /// S: spin about the ball's long axis, its own z
    public static Matrix4x4 Spin(float t)
    {
        float turns = (rpm / 60f) * t;
        return Turn(360f * turns, Vector3.forward);
    }

    /// W: tilt the nose by the cone angle, in a frame turned by psi about z: R_z(psi) R_x(beta) R_z(-psi)
    public static Matrix4x4 Wobble(float t)
    {
        float psi = 360f * wobbleHz * t;
        return Turn(psi, Vector3.forward) * Turn(cone, Vector3.right) * Turn(-psi, Vector3.forward);
    }

    /// A: tip the nose (+z) onto the velocity. A positive turn about +x takes +z toward -y: negate
    public static Matrix4x4 Aim(float t)
    {
        Vector3 v = FlightVelocity(t);
        float climb = Mathf.Atan2(v.y, v.z) * Mathf.Rad2Deg;
        return Turn(-climb, Vector3.right);
    }

    /// T: move to the point on the parabola
    public static Matrix4x4 Flight(float t)
    {
        return Matrix4x4.Translate(FlightPosition(t));
    }

    /// H: the throw frame on the field: the release point, turned to the heading. Built once per throw
    public static Matrix4x4 ThrowSetup()
    {
        return Matrix4x4.Translate(new Vector3(startX, startY, startZ)) * Turn(heading, Vector3.up);
    }

    /// F: the field in the world. The world origin is at midfield: move the field's center there, then turn
    public static Matrix4x4 FieldPlacement()
    {
        return Turn(fieldYaw, Vector3.up) * Matrix4x4.Translate(new Vector3(-FieldWidth / 2f, 0f, -FieldLength / 2f));
    }

    /// the thrown ball, in the field: H * T * A * W * S, right to left
    public static Matrix4x4 BallInField(float t)
    {
        return ThrowSetup() * Flight(t) * Aim(t) * Wobble(t) * Spin(t);
    }
    #endregion

    #region The target: a plan, then a placement for every t
    static float Ease(float u) { return u * u * (2f - u); }        // smooth start, full speed at the end
    static float EaseRate(float u) { return 4f * u - 3f * u * u; }

    /// the distance from (x, z) inside the box, along unit (dx, dz), to the box's wall
    static float DistanceToWall(float x, float z, float dx, float dz)
    {
        float s = Mathf.Infinity;
        if (dx > 1e-9f) s = Mathf.Min(s, (FieldWidth - x) / dx);
        if (dx < -1e-9f) s = Mathf.Min(s, -x / dx);
        if (dz > 1e-9f) s = Mathf.Min(s, (FieldLength - z) / dz);
        if (dz < -1e-9f) s = Mathf.Min(s, -z / dz);
        return s;
    }

    /// where the cart waits, where it drives, and how the throw ends for it: Catch, Miss or Crash
    public enum Outcome { Catch, Miss, Crash }

    public class TargetPlan
    {
        public Outcome outcome = Outcome.Miss;
        public Vector3 home, goal, dir;
        public float heading, dist, T, tGround, tCatch = -1f, tStop, tFlightEnd, tEnd;
        float wallDistance, impactSpeed, endSpeed, brake, tBrake;

        public TargetPlan()
        {
            Matrix4x4 H = ThrowSetup();
            float margin = CartLength / 2f + 0.1f;
            tGround = TimeDownTo(BallRadius);
            home = H.MultiplyPoint3x4(new Vector3(HomeX, 0f, HomeZ));
            home.y = 0f;
            home.x = Mathf.Clamp(home.x, margin, FieldWidth - margin);
            home.z = Mathf.Clamp(home.z, margin, FieldLength - margin);

            // catch where the ball comes down through the rim, if the cart can get there in time
            float tRim = TimeDownTo(RimHeight);
            if (tRim > 0f)
            {
                AimAt(H.MultiplyPoint3x4(FlightPosition(tRim)), tRim);
                if (T <= tRim + 1e-6f) { outcome = Outcome.Catch; tCatch = tRim; }
            }
            if (outcome != Outcome.Catch) AimAt(H.MultiplyPoint3x4(FlightPosition(tGround)), tGround);

            bool inside = goal.x >= margin && goal.x <= FieldWidth - margin
                       && goal.z >= margin && goal.z <= FieldLength - margin;
            if (!inside)
            {
                // the goal is outside the box: drive until the front bumper meets the wall, and stop there
                outcome = Outcome.Crash;
                tCatch = -1f;
                wallDistance = Mathf.Max(0f, DistanceToWall(home.x, home.z, dir.x, dir.z) - CartLength / 2f);
                float lo = 0f, hi = 1f;
                for (int k = 0; k < 60; k++)
                {
                    float u = (lo + hi) / 2f;
                    if (dist * Ease(u) < wallDistance) lo = u; else hi = u;
                }
                tStop = lo * T;
                impactSpeed = (dist / T) * EaseRate(lo);
            }
            else
            {
                // reach the goal at full speed, then brake to a stop
                endSpeed = dist / T;
                float room = DistanceToWall(goal.x, goal.z, dir.x, dir.z) - CartLength / 2f;
                brake = Mathf.Max(0.05f, Mathf.Min(BrakeDistance, room));
                tBrake = endSpeed > 1e-9f ? 2f * brake / endSpeed : 0f;
                tStop = T + tBrake;
            }
            tFlightEnd = outcome == Outcome.Catch ? tCatch : tGround;
            tEnd = Mathf.Max(tFlightEnd, tStop) + 1f;
        }

        /// a straight line from home to goal, timed to arrive at tNeed unless that needs more than top speed
        void AimAt(Vector3 target, float tNeed)
        {
            goal = new Vector3(target.x, 0f, target.z);
            Vector3 d = goal - home;
            dist = d.magnitude;
            dir = dist > 1e-9f ? d / dist : Vector3.forward;
            heading = Mathf.Atan2(dir.x, dir.z) * Mathf.Rad2Deg;
            T = Mathf.Max(tNeed, (4f / 3f) * dist / TopSpeed, 1e-6f);   // the ease peaks at 4/3 the mean speed
        }

        /// the distance driven by time t
        public float DistanceAt(float t)
        {
            if (outcome == Outcome.Crash) return t < tStop ? dist * Ease(t / T) : wallDistance;
            if (t <= T) return dist * Ease(t / T);
            float tau = Mathf.Min(t - T, tBrake);
            float decel = tBrake > 0f ? endSpeed / tBrake : 0f;
            return dist + endSpeed * tau - 0.5f * decel * tau * tau;
        }

        /// after a crash the rear lifts over the front bumper and drops back: degrees
        public float CrashTilt(float t)
        {
            if (outcome != Outcome.Crash || t <= tStop) return 0f;
            float tau = t - tStop;
            return Mathf.Min(30f, 2f * impactSpeed) * Mathf.Exp(-5f * tau) * Mathf.Abs(Mathf.Sin(9f * tau));
        }

        /// K: the cart in the field. T(position) * R_y(heading) * [tilt about the front bumper's bottom edge]
        public Matrix4x4 Placement(float t)
        {
            Vector3 pos = home + dir * DistanceAt(t);
            float half = CartLength / 2f;
            return Matrix4x4.Translate(new Vector3(pos.x, 0f, pos.z))
                 * Turn(heading, Vector3.up)
                 * Matrix4x4.Translate(new Vector3(0f, 0f, half))      // the pivot sandwich:
                 * Turn(CrashTilt(t), Vector3.right)
                 * Matrix4x4.Translate(new Vector3(0f, 0f, -half));    // T(p) R T(-p)
        }

        /// wheel i (0 to 3) in the field: K * T(offset) * R_x(distance / radius), rolling without slipping
        public Matrix4x4 Wheel(int i, float t)
        {
            float sx = i % 2 == 0 ? 1f : -1f, sz = i < 2 ? 1f : -1f;
            float roll = DistanceAt(t) / WheelRadius * Mathf.Rad2Deg;
            Vector3 offset = new Vector3(sx * CartWidth / 2f, WheelRadius, sz * (CartLength / 2f - 0.35f));
            return Placement(t) * Matrix4x4.Translate(offset) * Turn(roll, Vector3.right);
        }
    }
    #endregion

    #region The thrown ball, start to finish
    /// ball 1 in the field at time t: flying, or caught and carried, or lying where it landed.
    /// Caught: change its parent to the cart without moving it, L = K(tc)^-1 * B(tc), then ride:
    /// K(t) * D(t) * L, where D drops it into the bowl
    public static Matrix4x4 ThrownBall(TargetPlan plan, float t)
    {
        if (t < plan.tFlightEnd) return BallInField(t);
        Matrix4x4 atEnd = BallInField(plan.tFlightEnd);
        if (plan.outcome != Outcome.Catch) return atEnd;
        Matrix4x4 local = plan.Placement(plan.tCatch).inverse * atEnd;
        float tau = t - plan.tCatch;
        float drop = Mathf.Min(Settle, 0.5f * Mathf.Min(gravity, 1000f) * tau * tau);
        return plan.Placement(t) * Matrix4x4.Translate(new Vector3(0f, -drop, 0f)) * local;
    }
    #endregion

    #region Ball 2 and ball 3
    /// ball 2, at rest beside the thrower: H * T(3, r - ground, -1) * R_y(25)
    public static Matrix4x4 RestingBall()
    {
        return ThrowSetup() * Matrix4x4.Translate(new Vector3(3f, BallRadius - startY, -1f)) * Turn(25f, Vector3.up);
    }

    /// ball 3, a top on its tip: stand the long axis up leaning 18 degrees, lift it by half its length so
    /// the lower tip touches the ground, spin it about the long axis, and let the lean go around (precess)
    public static Matrix4x4 SpinningTop(float t)
    {
        return ThrowSetup()
             * Matrix4x4.Translate(new Vector3(-3f, -startY, -1f))
             * Turn(360f * 0.5f * t, Vector3.up)                       // precession, 0.5 turn/s
             * Turn(18f - 90f, Vector3.right)                          // lean 18 degrees from vertical
             * Matrix4x4.Translate(new Vector3(0f, 0f, BallLength / 2f)) // tip on the ground
             * Turn(360f * (480f / 60f) * t, Vector3.forward);         // spin, 480 rpm
    }
    #endregion

    #region Shot cameras
    public enum CameraMode { Tripod, Pan, Sideline, Chase, Skycam, BallCam, SpinCam, Receiver, Orbit }

    /// ball 1, 2 or 3 in the field at time t (whole), and the same frame without its own spin (steady)
    public static Matrix4x4 BallFrame(int look, float t, TargetPlan plan, bool steady)
    {
        if (look == 2) return RestingBall();
        if (look == 3)
        {
            Matrix4x4 top = SpinningTop(t);
            return steady ? top * Turn(-360f * (480f / 60f) * t, Vector3.forward) : top;
        }
        Matrix4x4 whole = ThrownBall(plan, t);
        float tl = Mathf.Min(t, plan.tFlightEnd);
        return steady ? whole * (Wobble(tl) * Spin(tl)).inverse : whole;
    }

    /// C: the camera's placement in the field, looking at ball `look`. A Unity camera looks down its own
    /// +z, so Quaternion.LookRotation(target - eye) is the whole turn; no half turn as in three.js
    public static Matrix4x4 CameraPlacement(CameraMode mode, float t, int look, TargetPlan plan)
    {
        Vector3 center = BallFrame(look, t, plan, false).GetColumn(3);
        Matrix4x4 H = ThrowSetup();
        Vector3 fwd = H.MultiplyVector(Vector3.forward);
        fwd.y = 0f;
        fwd.Normalize();
        Vector3 midFlight = H.MultiplyPoint3x4(FlightPosition(plan.tFlightEnd / 2f));
        Vector3 eye, target = center;
        switch (mode)
        {
            case CameraMode.Tripod: eye = new Vector3(-4f, 7f, midFlight.z); target = midFlight; break;   // a sideline tower
            case CameraMode.Pan: eye = new Vector3(-4f, 7f, midFlight.z); break;
            case CameraMode.Sideline: eye = new Vector3(-5f, 2f, center.z); break;
            case CameraMode.Chase:
                eye = center - 2.5f * fwd + new Vector3(0f, 0.7f, 0f);
                target = center + 1.5f * fwd;
                break;
            case CameraMode.Skycam:
                // a cable camera high behind the ball, trailing it by 0.6 s
                Vector3 lag = BallFrame(look, Mathf.Max(0f, t - 0.6f), plan, false).GetColumn(3);
                eye = lag - 12f * fwd + new Vector3(0f, 14f, 0f);
                break;
            case CameraMode.BallCam:
            case CameraMode.SpinCam:
                // a child of the ball, behind it: BallCam rides the steady frame, SpinCam the whole one
                return BallFrame(look, t, plan, mode == CameraMode.BallCam) * Matrix4x4.Translate(new Vector3(0f, 0.3f, -1f));
            case CameraMode.Receiver:
                eye = H.MultiplyPoint3x4(FlightPosition(plan.tFlightEnd)) + 3f * fwd;
                eye.y = 1.8f;
                break;
            default:   // Orbit: circle the ball at 2 m, a quarter turn per second
                float a = 0.5f * Mathf.PI * t;
                eye = center + new Vector3(2f * Mathf.Cos(a), 0.6f, 2f * Mathf.Sin(a));
                break;
        }
        return Matrix4x4.TRS(eye, Quaternion.LookRotation(target - eye, Vector3.up), Vector3.one);
    }
    #endregion
}
