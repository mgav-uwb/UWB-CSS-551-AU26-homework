// CSS 551 · HW4 checks (GIVEN). Add to an empty GameObject and press Play; the Console
// prints the checks, and the rasterized triangle is drawn as quads at the origin.
using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace CSS551.HW04
{
    public class Checks : MonoBehaviour
    {
        static double[] F(Vector3 v) => new double[] { v.x, v.y, v.z };
        static double[] F(Matrix4x4 m) { var o = new double[16]; for (int c = 0; c < 4; c++) for (int r = 0; r < 4; r++) o[c * 4 + r] = m[r, c]; return o; }

        // the model matrix (given): T(model_t) · R_y(model_ry), right-handed entries
        static Matrix4x4 Model()
        {
            float c = Mathf.Cos(Inputs.model_ry * Mathf.Deg2Rad), s = Mathf.Sin(Inputs.model_ry * Mathf.Deg2Rad);
            var m = Matrix4x4.identity;
            m[0, 0] = c; m[0, 2] = s; m[2, 0] = -s; m[2, 2] = c;
            m[0, 3] = Inputs.model_t.x; m[1, 3] = Inputs.model_t.y; m[2, 3] = Inputs.model_t.z;
            return m;
        }

        static Vector2 Center(Vector2 px, float res) => new Vector2((px.x + 0.5f) / res, (px.y + 0.5f) / res);

        // Every check reads Inputs.cs (the published inputs; grading swaps in a hidden set).
        double[] Run(string id)
        {
            var V = HW.ViewMatrix(Inputs.eye, Inputs.at, Inputs.up);
            var P = HW.PerspectiveMatrix(Inputs.fov, Inputs.width / Inputs.height, Inputs.near, Inputs.far);
            switch (id)
            {
                case "V": return F(V);
                case "P": return F(P);
                case "pixel": return F(HW.WorldToPixel(Model(), V, P, Inputs.objectPoint, Inputs.width, Inputs.height));
                case "baryIn": return F(HW.Barycentric(Inputs.tri, Center(Inputs.pixelIn, Inputs.res)));
                case "baryOut": return F(HW.Barycentric(Inputs.tri, Center(Inputs.pixelOut, Inputs.res)));
                case "count": return new double[] { HW.Rasterize(Inputs.tri, (int)Inputs.res).Count };
                case "count64": return new double[] { HW.Rasterize(Inputs.tri, 64).Count };
            }
            return null;
        }

        void Start()
        {
            CheckReport.Print("HW4", Expected.Checks, Run);
            const int res = 12;
            foreach (var px in HW.Rasterize(Inputs.tri, res))
            {
                var q = GameObject.CreatePrimitive(PrimitiveType.Quad);
                q.transform.position = new Vector3((px.x + 0.5f) / res * 4f, (px.y + 0.5f) / res * 4f, 0);
                q.transform.localScale = Vector3.one * (4f / res) * 0.95f;
                var w = HW.Barycentric(Inputs.tri, new Vector2((px.x + 0.5f) / res, (px.y + 0.5f) / res));
                q.GetComponent<Renderer>().material.color = new Color(w.x, w.y, w.z);
            }
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
