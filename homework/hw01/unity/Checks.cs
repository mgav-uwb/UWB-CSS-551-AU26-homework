// CSS 551 · HW1 checks and scene (GIVEN; do not submit changes to this file). Add it to an
// empty GameObject in a new scene and press Play: the Console prints every check, and the
// scene shows a 320 x 200 pixel picture painted by your HitTest2D (a circle, a segment and a
// triangle; a pixel is lit where your function says it is a hit), an aimed arrow, and an
// orbiting target.
using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace CSS551.HW01
{
    public enum ShapeKind { Circle, Segment, Triangle }

    // A 2D shape in screen pixels for HitTest2D: a circle (Center, R), a segment (A, B, Tol),
    // or a triangle (A, B, C).
    public struct Shape2D
    {
        public ShapeKind Kind;
        public Vector2 Center, A, B, C;
        public float R, Tol;
        public static Shape2D Circle(Vector2 center, float r) => new Shape2D { Kind = ShapeKind.Circle, Center = center, R = r };
        public static Shape2D Segment(Vector2 a, Vector2 b, float tol) => new Shape2D { Kind = ShapeKind.Segment, A = a, B = b, Tol = tol };
        public static Shape2D Triangle(Vector2 a, Vector2 b, Vector2 c) => new Shape2D { Kind = ShapeKind.Triangle, A = a, B = b, C = c };
    }

    public class Checks : MonoBehaviour
    {
        [Range(10f, 120f)] public float simulatedFps = 60f;

        GameObject arrow, target;
        Vector3 angle; // the orbit angle rides in x
        float acc;
        static readonly Vector3 AimPos = new Vector3(1.5f, 0.6f, 1.5f);

        static double[] F(Vector3 v) => new double[] { v.x, v.y, v.z };
        static double B(bool b) => b ? 1 : 0;

        static Vector3 Repeat(float speed, int fps)
        {
            Vector3 p = Vector3.zero;
            for (int i = 0; i < fps; i++) p = HW.Advance(p, new Vector3(speed, 0, 0), 1f / fps);
            return p;
        }

        static double[] Hits(Shape2D s, Vector2[] pts)
        {
            var o = new double[pts.Length];
            for (int i = 0; i < pts.Length; i++) o[i] = B(HW.HitTest2D(pts[i], s));
            return o;
        }

        // 1 for "drag", 0 for "click", NaN for anything else (which fails the check)
        static double[] Drags(Vector2 down, Vector2[] ups)
        {
            var o = new double[ups.Length];
            for (int i = 0; i < ups.Length; i++)
            {
                string r = HW.ClassifyPointer(down, ups[i]);
                o[i] = r == "drag" ? 1 : r == "click" ? 0 : double.NaN;
            }
            return o;
        }

        // Every check reads Inputs.cs (the published inputs; grading swaps in a hidden set).
        double[] Run(string id)
        {
            switch (id)
            {
                case "step60": return F(Repeat(Inputs.speed, 60));
                case "step20": return F(Repeat(Inputs.speed, 20));
                case "circle": return Hits(Shape2D.Circle(Inputs.circle_center, Inputs.circle_r), Inputs.circle_pts);
                case "segment": return Hits(Shape2D.Segment(Inputs.segment_a, Inputs.segment_b, Inputs.segment_tol), Inputs.segment_pts);
                case "segDot": return Hits(Shape2D.Segment(Inputs.dot_a, Inputs.dot_b, Inputs.dot_tol), Inputs.dot_pts);
                case "tri": return Hits(Shape2D.Triangle(Inputs.triangle_a, Inputs.triangle_b, Inputs.triangle_c), Inputs.triangle_pts);
                case "triFlip": return Hits(Shape2D.Triangle(Inputs.triangle_a, Inputs.triangle_c, Inputs.triangle_b), Inputs.triangle_pts);
                case "pointer": return Drags(Inputs.pointer_down, Inputs.pointer_ups);
            }
            HW.OrientBasis(Inputs.aim_pos, Inputs.aim_target, Inputs.aim_up, out var x, out var y, out var z);
            return id == "aimZ" ? F(z) : id == "aimX" ? F(x) : F(y);
        }

        void Start()
        {
            CheckReport.Print("HW1", Expected.Checks, Run);
            PaintHits();
            arrow = GameObject.CreatePrimitive(PrimitiveType.Cube);
            arrow.transform.localScale = new Vector3(0.3f, 0.2f, 0.8f);
            target = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            target.transform.localScale = Vector3.one * 0.3f;
        }

        // A 320 x 200 "screen": each pixel is lit where YOUR HitTest2D reports a hit.
        void PaintHits()
        {
            const int W = 320, H = 200;
            var shapes = new[] {
                Shape2D.Circle(new Vector2(60, 100), 40),
                Shape2D.Segment(new Vector2(130, 40), new Vector2(190, 160), 8),
                Shape2D.Triangle(new Vector2(220, 160), new Vector2(300, 150), new Vector2(260, 40)),
            };
            var colors = new[] { new Color(0.36f, 0.83f, 0.48f), new Color(1f, 0.81f, 0.36f), new Color(0.56f, 0.49f, 1f) };
            var tex = new Texture2D(W, H, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point };
            for (int py = 0; py < H; py++)
                for (int px = 0; px < W; px++)
                {
                    var c = new Color(0.07f, 0.08f, 0.1f);
                    var p = new Vector2(px + 0.5f, py + 0.5f);
                    for (int k = 0; k < shapes.Length; k++) if (HW.HitTest2D(p, shapes[k])) c = colors[k];
                    // screen row 0 is the TOP; Texture2D row 0 is the bottom
                    tex.SetPixel(px, H - 1 - py, c);
                }
            tex.Apply();
            var quad = GameObject.CreatePrimitive(PrimitiveType.Quad);
            quad.transform.position = new Vector3(-3.5f, 1.5f, 0f);
            quad.transform.localScale = new Vector3(3.2f, 2f, 1f);
            quad.GetComponent<Renderer>().material = new UnityEngine.Material(Shader.Find("Unlit/Texture")) { mainTexture = tex };
        }

        void Update()
        {
            // the loop at a simulated frame rate: the orbit speed must not depend on it
            acc += Mathf.Min(0.25f, Time.deltaTime);
            float dt = 1f / simulatedFps;
            while (acc >= dt) { angle = HW.Advance(angle, new Vector3(1, 0, 0), dt); acc -= dt; }
            var tp = new Vector3(2.2f * Mathf.Cos(angle.x), 1.2f + 0.4f * Mathf.Sin(2 * angle.x), 2.2f * Mathf.Sin(angle.x));
            target.transform.position = tp;
            HW.OrientBasis(AimPos, tp, Vector3.up, out var x, out var y, out var z);
            var b = new Matrix4x4(new Vector4(x.x, x.y, x.z, 0), new Vector4(y.x, y.y, y.z, 0), new Vector4(z.x, z.y, z.z, 0), new Vector4(0, 0, 0, 1));
            arrow.transform.SetPositionAndRotation(AimPos, b.rotation);
        }
    }

    // Prints the checks as a table and the score on the published inputs.
    public static class CheckReport
    {
        public static void Print(string hw, Check[] checks, System.Func<string, double[]> run)
        {
            var sb = new StringBuilder();
            int score = 0;
            foreach (var c in checks)
            {
                double[] got = null; string err = null;
                try { got = run(c.Id); } catch (System.Exception e) { err = e.Message; }
                bool pass = err == null && Same(got, c.Want, c.Tol);
                if (pass) score += c.Points;
                sb.AppendLine($"{(pass ? "PASS" : "FAIL")}  {c.Id,-10} {c.Points,3} pts  yours {Fmt(got)}{(err != null ? "  threw: " + err : "")}  expected {Fmt(c.Want)}");
            }
            Debug.Log($"{hw}: {score} / 100 on the published inputs\n{sb}");
        }

        static bool Same(double[] got, double[] want, double tol)
        {
            if (want == null || got == null) return want == got;
            if (got.Length != want.Length) return false;
            for (int i = 0; i < want.Length; i++) if (double.IsNaN(got[i]) || System.Math.Abs(got[i] - want[i]) > tol) return false;
            return true;
        }

        static string Fmt(double[] v)
        {
            if (v == null) return "null";
            var parts = new List<string>();
            foreach (var x in v) parts.Add(System.Math.Round(x, 4).ToString(System.Globalization.CultureInfo.InvariantCulture));
            return "(" + string.Join(", ", parts) + ")";
        }
    }
}
