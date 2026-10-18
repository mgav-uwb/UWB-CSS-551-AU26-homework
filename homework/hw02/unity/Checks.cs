// CSS 551 · HW2 checks and scene (GIVEN). Add to an empty GameObject and press Play: the
// Console prints the checks; the scene shows the plane, P (green in front, red behind) and
// its shadow. Drag py in the Inspector.
using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace CSS551.HW02
{
    public class Checks : MonoBehaviour
    {
        [Range(-3f, 3f)] public float py = 1f;

        GameObject plane, ball, shadow;

        static double[] F(Vector3 v) => new double[] { v.x, v.y, v.z };
        static double[] Cat(params double[][] parts) { var l = new List<double>(); foreach (var p in parts) l.AddRange(p); return l.ToArray(); }

        // Every check reads Inputs.cs (the published inputs; grading swaps in a hidden set).
        double[] Run(string id)
        {
            HW.PlaneFromPoint(Inputs.plane_m, Inputs.plane_q, out var n, out var D);
            switch (id)
            {
                case "march": return F(HW.MarchStep(Inputs.march_p, Inputs.march_from, Inputs.march_to, Inputs.march_speed, Inputs.march_dt));
                case "line": HW.LineFrame(Inputs.line_p1, Inputs.line_p2, out var mid, out var dir, out var len); return Cat(F(mid), F(dir), new double[] { len });
                case "plane": return Cat(F(n), new double[] { D });
                case "side": return new double[] { HW.SignedDistance(n, D, Inputs.P), HW.SignedDistance(n, D, Inputs.P2) };
                case "shadow": return F(HW.ShadowOnPlane(n, D, Inputs.P));
                case "hit": return HW.LinePlaneHit(n, D, Inputs.P, Inputs.P2, out var h) ? F(h) : null;
                case "reflect": return F(HW.Reflect((Inputs.P2 - Inputs.P).normalized, n));
                case "cylIn": { bool inside = HW.ProjectToCylinder(Inputs.cyl_inside, Inputs.cyl_c, Inputs.cyl_axis, Inputs.cyl_radius, Inputs.cyl_halfHeight, out var pt); return Cat(F(pt), new double[] { inside ? 1 : 0 }); }
                case "cylOut": { bool inside = HW.ProjectToCylinder(Inputs.cyl_outside, Inputs.cyl_c, Inputs.cyl_axis, Inputs.cyl_radius, Inputs.cyl_halfHeight, out var pt); return Cat(F(pt), new double[] { inside ? 1 : 0 }); }
            }
            return null;
        }

        void Start()
        {
            CheckReport.Print("HW2", Expected.Checks, Run);
            plane = GameObject.CreatePrimitive(PrimitiveType.Quad);
            plane.transform.localScale = Vector3.one * 5f;
            ball = GameObject.CreatePrimitive(PrimitiveType.Sphere); ball.transform.localScale = Vector3.one * 0.2f;
            shadow = GameObject.CreatePrimitive(PrimitiveType.Sphere); shadow.transform.localScale = Vector3.one * 0.12f;
        }

        void Update()
        {
            HW.PlaneFromPoint(Inputs.plane_m, Inputs.plane_q, out var n, out var D);
            if (n.sqrMagnitude > 0.5f)
            {
                // a Quad faces -z; turn its -z toward n (display only, not part of the homework)
                plane.transform.SetPositionAndRotation(n * D, Quaternion.FromToRotation(Vector3.back, n));
            }
            var p = new Vector3(Inputs.P.x, py, Inputs.P.z);
            ball.transform.position = p;
            ball.GetComponent<Renderer>().material.color = HW.SignedDistance(n, D, p) > 0 ? Color.green : Color.red;
            shadow.transform.position = HW.ShadowOnPlane(n, D, p);
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
