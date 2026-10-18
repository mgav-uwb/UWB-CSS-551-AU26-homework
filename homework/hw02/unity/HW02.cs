// CSS 551 · HW2 · Vector geometry (EX1 to EX6) · Unity track. YOUR FILE: fill in
// every TODO. Checks.cs runs the checks on Play.
//
// Allowed: Vector3.Dot, Vector3.Cross, .normalized, .magnitude, component access, + - * /,
// Mathf. Off limits: Vector3.Project / ProjectOnPlane / Reflect / Angle / MoveTowards /
// Lerp, and the Plane struct.
// A plane is (n, D) with n a UNIT normal: the points P with n · P = D.
using UnityEngine;

namespace CSS551.HW02
{
    public static class HW
    {
        // EX1: one frame of marching from p along the line from -> to at speed units per second.
        public static Vector3 MarchStep(Vector3 p, Vector3 from, Vector3 to, float speed, float dt)
        {
            return p; // TODO
        }

        // EX1 (SetLine): the midpoint, unit direction and length of the segment p1 -> p2.
        public static void LineFrame(Vector3 p1, Vector3 p2, out Vector3 mid, out Vector3 dir, out float length)
        {
            mid = Vector3.zero; dir = Vector3.up; length = 1f; // TODO
        }

        // EX2: the plane with normal direction `normal` (any length) through q.
        public static void PlaneFromPoint(Vector3 normal, Vector3 q, out Vector3 n, out float D)
        {
            n = Vector3.up; D = 0f; // TODO
        }

        // EX3: the signed distance of p from the plane, positive on the normal's side.
        public static float SignedDistance(Vector3 n, float D, Vector3 p)
        {
            return 0f; // TODO
        }

        // EX4: p dropped straight onto the plane along n.
        public static Vector3 ShadowOnPlane(Vector3 n, float D, Vector3 p)
        {
            return p; // TODO
        }

        // EX5: where the line through p1 and p2 crosses the plane; false when parallel.
        public static bool LinePlaneHit(Vector3 n, float D, Vector3 p1, Vector3 p2, out Vector3 hit)
        {
            hit = Vector3.zero; return false; // TODO: guard the parallel case before dividing
        }

        // EX5: d reflected about the unit normal n.
        public static Vector3 Reflect(Vector3 d, Vector3 n)
        {
            return d; // TODO
        }

        // EX6: p projected onto the cylinder (center c, axis any length, radius, halfHeight).
        // Returns whether p's foot on the axis is within halfHeight of c. On the axis: the foot.
        public static bool ProjectToCylinder(Vector3 p, Vector3 c, Vector3 axis, float radius, float halfHeight, out Vector3 point)
        {
            point = p; return false; // TODO
        }
    }
}
