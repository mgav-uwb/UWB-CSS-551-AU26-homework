// CSS 551 · HW6 given types and helpers (do not change). Intersect uses YOUR hit functions.
using UnityEngine;

namespace CSS551.HW06
{
    public struct Material
    {
        public Vector3 albedo; public float mirror;
        public static Material Diffuse(Vector3 a) => new Material { albedo = a, mirror = 0f };
        public static Material Mirror(float k) => new Material { albedo = Vector3.zero, mirror = k };
    }
    public struct Sphere { public Vector3 c; public float r; public Material m; public Sphere(Vector3 c, float r, Material m) { this.c = c; this.r = r; this.m = m; } }
    public struct Triangle { public Vector3 a, b, c; public Material m; public Triangle(Vector3 a, Vector3 b, Vector3 c, Material m) { this.a = a; this.b = b; this.c = c; this.m = m; } }
    public struct Cam { public Vector3 eye, at, up; public float fov; }
    public class SceneDesc { public float ka; public int maxDepth; public Vector3 light; public Sphere[] spheres; public Triangle[] triangles; }
    public struct Hit { public float t; public Vector3 point, normal; public Material m; }

    public static class Given
    {
        // The closest hit, normal flipped to face the ray; false on a miss.
        public static bool Intersect(SceneDesc s, Vector3 o, Vector3 d, out Hit hit)
        {
            hit = new Hit { t = float.PositiveInfinity };
            bool any = false; bool sphere = false; int which = -1;
            for (int i = 0; i < s.spheres.Length; i++)
            {
                float t = HW.HitSphere(o, d, s.spheres[i].c, s.spheres[i].r);
                if (t > 0 && t < hit.t) { hit.t = t; any = true; sphere = true; which = i; }
            }
            for (int i = 0; i < s.triangles.Length; i++)
            {
                var tr = s.triangles[i];
                if (HW.HitTriangle(o, d, tr.a, tr.b, tr.c, out float t, out _, out _) && t < hit.t) { hit.t = t; any = true; sphere = false; which = i; }
            }
            if (!any) return false;
            hit.point = o + hit.t * d;
            if (sphere) { hit.normal = (hit.point - s.spheres[which].c).normalized; hit.m = s.spheres[which].m; }
            else { var tr = s.triangles[which]; hit.normal = Vector3.Cross(tr.b - tr.a, tr.c - tr.a).normalized; hit.m = tr.m; }
            if (Vector3.Dot(hit.normal, d) > 0) hit.normal = -hit.normal;
            return true;
        }

        public static SceneDesc CornellScene(float lightX, int maxDepth) => new SceneDesc
        {
            ka = Cornell.Ka, maxDepth = maxDepth, light = new Vector3(lightX, Cornell.Light.y, Cornell.Light.z),
            spheres = Cornell.Spheres, triangles = Cornell.Triangles,
        };
    }
}
