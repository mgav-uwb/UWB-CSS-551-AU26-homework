// CSS 551 · HW6 · A Whitted ray tracer and the Cornell box · Unity track. YOUR FILE.
// The image is written to a Texture2D in C#; no Unity rendering or physics is involved.
//
// Allowed: Vector3.Dot / Cross / normalized / magnitude, component access, Mathf.
// Off limits: Physics.Raycast and every collider, Ray / Plane / Bounds helpers,
// Vector3.Reflect, Camera.ScreenPointToRay / ViewportPointToRay.
using UnityEngine;

namespace CSS551.HW06
{
    public static class HW
    {
        // The primary ray through the CENTER of pixel (px, py) of a width × height image,
        // pixel (0, 0) top-left. o = eye, d unit. w = normalize(eye - at), u = normalize(up × w),
        // v = w × u; screen x in [-1, 1] times tan(fov / 2) times the aspect, screen y times
        // tan(fov / 2); d = normalize(sx u + sy v - w).
        public static void CameraRay(int px, int py, int width, int height, Cam cam, out Vector3 o, out Vector3 d)
        {
            o = cam.eye; d = Vector3.back; // TODO
        }

        // The smallest t > 1e-6 where o + t d meets the sphere, or -1 when it misses.
        public static float HitSphere(Vector3 o, Vector3 d, Vector3 c, float r) { return -1f; } // TODO

        // Möller–Trumbore: true with (t, u, v) on a hit (u weights b, v weights c); false on a
        // miss, a parallel ray (|det| < 1e-12) or t <= 1e-6.
        public static bool HitTriangle(Vector3 o, Vector3 d, Vector3 a, Vector3 b, Vector3 c, out float t, out float u, out float v)
        {
            t = u = v = 0f; return false; // TODO
        }

        // d reflected about the unit normal n.
        public static Vector3 Reflect(Vector3 d, Vector3 n) { return d; } // TODO

        // The Whitted color along (o, d); see the homework page for the exact rule:
        //   miss -> black; P = hit.point + 1e-4 hit.normal;
        //   mirror: depth >= scene.maxDepth ? black : mirror * Trace(scene, P, Reflect(d, N), depth + 1);
        //   diffuse: albedo * (ka + (1 - ka) V max(0, N·L)), V = 0 when Given.Intersect(scene, P, L)
        //   finds a hit closer than the light.
        public static Vector3 Trace(SceneDesc scene, Vector3 o, Vector3 d, int depth)
        {
            return Vector3.zero; // TODO
        }
    }
}
