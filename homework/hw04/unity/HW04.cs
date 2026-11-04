// CSS 551 · HW4 · Viewing and rasterization · Unity track. YOUR FILE.
//
// Build the OpenGL-convention matrices the text uses (camera looks down -w, NDC depth in
// [-1, 1]); they are what Unity itself uploads for OpenGL-style targets. Matrix4x4 is
// m[row, col]. Allowed: Vector3.Dot / Cross / normalized, Matrix4x4 * Matrix4x4, setting
// entries, Mathf. Off limits: Matrix4x4.LookAt / Perspective / TRS / inverse,
// Camera.worldToCameraMatrix / projectionMatrix / WorldToScreenPoint, GL.GetGPUProjectionMatrix.
using System.Collections.Generic;
using UnityEngine;

namespace CSS551.HW04
{
    public static class HW
    {
        // V: rows are u, v, w with w = normalize(eye - at), u = normalize(up × w), v = w × u;
        // column 3 is -(u·eye, v·eye, w·eye).
        public static Matrix4x4 ViewMatrix(Vector3 eye, Vector3 at, Vector3 up) { return Matrix4x4.identity; } // TODO

        // P: f = 1 / tan(fovY / 2); row 3 is (0, 0, -1, 0).
        public static Matrix4x4 PerspectiveMatrix(float fovYDeg, float aspect, float near, float far) { return Matrix4x4.identity; } // TODO

        // Object point p through M, V, P, the divide and the viewport: (pixel x right, pixel y
        // DOWN from the top-left, NDC depth).
        public static Vector3 WorldToPixel(Matrix4x4 M, Matrix4x4 V, Matrix4x4 P, Vector3 p, float width, float height) { return Vector3.zero; } // TODO

        // Twice the signed area of (a, b, p).
        public static float Edge(Vector2 a, Vector2 b, Vector2 p) { return 0f; } // TODO

        // Barycentric weights (w0, w1, w2) of p in tri[0..2].
        public static Vector3 Barycentric(Vector2[] tri, Vector2 p) { return Vector3.zero; } // TODO

        // Pixels (i, j) of a res × res grid over [0, 1]^2 whose CENTER ((i + 0.5) / res,
        // (j + 0.5) / res) has all three weights >= 0.
        public static List<Vector2Int> Rasterize(Vector2[] tri, int res) { return new List<Vector2Int>(); } // TODO
    }
}
