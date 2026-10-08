// CSS 551 · HW1 · The loop, input, and orientation · Unity track. YOUR FILE: fill in every
// TODO and submit the project (see the homework page). Checks.cs runs the checks on Play.
//
// Allowed: Vector2.Dot, Vector3.Dot, Vector3.Cross, .normalized, .magnitude, .sqrMagnitude,
// component access, + - * /, Mathf. Off limits (implement and replace): Physics2D.OverlapPoint,
// Collider2D.OverlapPoint / ClosestPoint, Bounds.Contains, Rect.Contains,
// RectTransformUtility.RectangleContainsScreenPoint, HandleUtility.DistancePointLine /
// DistancePointToLineSegment, EventSystem.pixelDragThreshold and the drag handlers;
// Quaternion.LookRotation, Matrix4x4.LookAt, Transform.LookAt.
using UnityEngine;

namespace CSS551.HW01
{
    public static class HW
    {
        // The position one frame later: velocity is in units per SECOND, dt in seconds.
        public static Vector3 Advance(Vector3 p, Vector3 velocity, float dt)
        {
            // TODO
            return p;
        }

        // True when p (screen pixels) is on the shape; a point exactly on the boundary is a hit.
        // Shape2D (in Checks.cs) is a circle (Center, R), a segment (A, B, Tol: a hit within Tol
        // pixels of it; A == B is allowed), or a triangle (A, B, C, either winding).
        //   circle:   squared distance to Center against R * R
        //   segment:  t = (p - A)·(B - A) / |B - A|², clamped to [0, 1] (t = 0 when A == B);
        //             the distance from p to A + t (B - A) against Tol
        //   triangle: the 2D cross (e - o) x (p - o) = (e.x - o.x)(p.y - o.y) - (e.y - o.y)(p.x - o.x)
        //             for the edges A -> B, B -> C, C -> A; a hit unless one is negative and another positive
        public static bool HitTest2D(Vector2 p, Shape2D s)
        {
            // TODO
            return false;
        }

        // "drag" when the pointer is released more than 4 pixels from where it was pressed,
        // "click" otherwise (exactly 4 pixels is a click). down and up are in pixels.
        public const float DragThreshold = 4f;
        public static string ClassifyPointer(Vector2 down, Vector2 up)
        {
            // TODO
            return "click";
        }

        // The unit axes of an object at pos whose +z points at target; x is perpendicular to
        // up and z (x = up × z, normalized), y = z × x.
        public static void OrientBasis(Vector3 pos, Vector3 target, Vector3 up, out Vector3 x, out Vector3 y, out Vector3 z)
        {
            // TODO
            x = Vector3.right; y = Vector3.up; z = Vector3.forward;
        }
    }
}
