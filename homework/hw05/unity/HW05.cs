// CSS 551 · HW5 · Meshes, texture placement, and a lit shader · Unity track. YOUR FILE
// (with HW05Lit.shader, whose fragment program you also complete).
//
// Allowed: Vector3.Dot / Cross / normalized, component access, Mathf. Off limits:
// Mesh.RecalculateNormals, PrimitiveType.Plane for the grid, Material.mainTextureScale /
// mainTextureOffset / SetTextureScale, the Standard shader for the lit sphere.
using System.Collections.Generic;
using UnityEngine;

namespace CSS551.HW05
{
    public struct PhongTerms { public float NL, RV, HN, diffuse, specular, blinn; }

    public static class HW
    {
        // An n × n grid of quads on XZ spanning [-half, half]; vertex row * (n + 1) + col,
        // col along +x, row along +z; the center vertex (row = col = n / 2 rounded) at y = lift.
        // Triangles per quad: (v00, v10, v01) then (v01, v10, v11), where v10 is the next ROW.
        // indices holds 3 ints per triangle.
        public static void GridMesh(int n, float half, float lift, out List<Vector3> positions, out List<int> indices)
        {
            positions = new List<Vector3>(); indices = new List<int>(); // TODO
        }

        // The UNNORMALIZED face normal (b - a) × (c - a).
        public static Vector3 FaceNormal(Vector3 a, Vector3 b, Vector3 c) { return Vector3.up; } // TODO

        // Per-vertex unit normals: the normalized sum of the unnormalized normals of the faces touching it.
        public static Vector3[] VertexNormals(List<Vector3> positions, List<int> indices)
        {
            var n = new Vector3[positions.Count];
            for (int i = 0; i < n.Length; i++) n[i] = Vector3.up; // TODO
            return n;
        }

        // The texture placement matrix as a COLUMN-MAJOR 3 × 3 (9 floats): uv' = M (u, v, 1),
        // translate by (offU, offV) after rotating by rotDeg and scaling by tile about (0.5, 0.5).
        public static float[] UvPlacement(float offU, float offV, float rotDeg, float tile)
        {
            return new float[] { 1, 0, 0, 0, 1, 0, 0, 0, 1 }; // TODO
        }

        // Phong and Blinn terms at P with normal N (any length), point light at lightPos, eye at
        // eye: diffuse = max(0, N·L); specular = max(0, R·V)^shine, blinn = max(0, H·N)^shine,
        // both 0 when N·L <= 0; R = 2 (N·L) N - L; L, V, H unit.
        public static PhongTerms Phong(Vector3 N, Vector3 P, Vector3 lightPos, Vector3 eye, float shine)
        {
            return new PhongTerms(); // TODO
        }
    }
}
