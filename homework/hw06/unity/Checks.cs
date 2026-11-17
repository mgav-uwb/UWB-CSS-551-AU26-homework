// CSS 551 · HW6 checks and image (GIVEN). Add to an empty GameObject and press Play: the
// Console prints the checks, and a quad in front of the camera shows the 96 × 72 render.
using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace CSS551.HW06
{
    public class Checks : MonoBehaviour
    {
        [Range(-0.9f, 0.9f)] public float lightX = 0f;
        [Range(0, 5)] public int maxDepth = 3;
        Texture2D tex; float lastX = float.NaN; int lastDepth = -1;

        static Cam Chapter => new Cam { eye = Inputs.cam_eye, at = Inputs.cam_at, up = Inputs.cam_up, fov = Inputs.cam_fov };
        static Cam Box => new Cam { eye = Inputs.cornell_cam_eye, at = Inputs.cornell_cam_at, up = Inputs.cornell_cam_up, fov = Inputs.cornell_cam_fov };
        static int W => (int)Inputs.cornell_width;
        static int H => (int)Inputs.cornell_height;

        static double[] F(Vector3 v) => new double[] { v.x, v.y, v.z };
        static Vector3 Pixel(Vector2 px)
        {
            HW.CameraRay((int)px.x, (int)px.y, W, H, Box, out var o, out var d);
            return HW.Trace(Given.CornellScene(Cornell.Light.x, Cornell.MaxDepth), o, d, 0);
        }

        // Every check reads Inputs.cs (the published inputs; grading swaps in a hidden set).
        double[] Run(string id)
        {
            int size = (int)Inputs.size;
            HW.CameraRay((int)Inputs.pixel.x, (int)Inputs.pixel.y, size, size, Chapter, out var o, out var d);
            switch (id)
            {
                case "ray": return F(d);
                case "tSphere": { float t = HW.HitSphere(o, d, Inputs.sphere_c, Inputs.sphere_r); return t > 0 ? new double[] { t } : null; }
                case "tri": return HW.HitTriangle(Inputs.tri_o, Inputs.tri_d, Inputs.tri_a, Inputs.tri_b, Inputs.tri_c, out var t1, out var u1, out var v1) ? new double[] { t1, u1, v1 } : null;
                case "triMiss": { bool miss = !HW.HitTriangle(Inputs.tri_missO, Inputs.tri_d, Inputs.tri_a, Inputs.tri_b, Inputs.tri_c, out _, out _, out _); bool hit = HW.HitTriangle(Inputs.tri_o, Inputs.tri_d, Inputs.tri_a, Inputs.tri_b, Inputs.tri_c, out _, out _, out _); return new double[] { miss ? 1 : 0, hit ? 1 : 0 }; }
                case "reflect": return F(HW.Reflect(Inputs.reflect_d, Inputs.reflect_n));
                case "lit": return F(Pixel(Inputs.cornell_lit));
                case "shadow": return F(Pixel(Inputs.cornell_shadow));
                case "mirror": return F(Pixel(Inputs.cornell_mirror));
                case "wall": return F(Pixel(Inputs.cornell_wall));
            }
            return null;
        }

        void Start()
        {
            CheckReport.Print("HW6", Expected.Checks, Run);
            tex = new Texture2D(W, H, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point };
            var quad = GameObject.CreatePrimitive(PrimitiveType.Quad);
            quad.transform.localScale = new Vector3(4f, 3f, 1f);
            var mat = new UnityEngine.Material(Shader.Find("Unlit/Texture")) { mainTexture = tex };
            quad.GetComponent<Renderer>().material = mat;
            if (Camera.main != null) { quad.transform.position = Camera.main.transform.position + Camera.main.transform.forward * 4f; quad.transform.rotation = Camera.main.transform.rotation; }
        }

        void Update()
        {
            if (lightX == lastX && maxDepth == lastDepth) return;
            lastX = lightX; lastDepth = maxDepth;
            var scene = Given.CornellScene(lightX, maxDepth);
            for (int py = 0; py < H; py++)
                for (int px = 0; px < W; px++)
                {
                    HW.CameraRay(px, py, W, H, Box, out var o, out var d);
                    var c = HW.Trace(scene, o, d, 0);
                    // row 0 of the image is the TOP; Texture2D row 0 is the bottom
                    tex.SetPixel(px, H - 1 - py, new Color(Mathf.Pow(Mathf.Clamp01(c.x), 1 / 2.2f), Mathf.Pow(Mathf.Clamp01(c.y), 1 / 2.2f), Mathf.Pow(Mathf.Clamp01(c.z), 1 / 2.2f)));
                }
            tex.Apply();
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
