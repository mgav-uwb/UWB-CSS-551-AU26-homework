// CSS 551 · HW5 checks and scene (GIVEN). Add to an empty GameObject and press Play: the
// Console prints the checks; the scene shows your grid mesh (normals drawn as Gizmos in
// the Scene view) and a sphere lit by your HW05Lit shader.
using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace CSS551.HW05
{
    public class Checks : MonoBehaviour
    {
        [Range(-1f, 1f)] public float lift = 0.4f;
        [Range(0f, 360f)] public float lightAz = 45f;

        Mesh mesh; Material lit; GameObject sphere; List<Vector3> pos; Vector3[] nrm;

        static double[] F(Vector3 v) => new double[] { v.x, v.y, v.z };
        static double[] F9(float[] m) { var o = new double[9]; for (int i = 0; i < 9; i++) o[i] = m[i]; return o; }
        static Vector3 LightAt(float azDeg)
        {
            float az = azDeg * Mathf.Deg2Rad, el = 30f * Mathf.Deg2Rad;
            return new Vector3(3 * Mathf.Cos(el) * Mathf.Cos(az), 3 * Mathf.Sin(el), 3 * Mathf.Cos(el) * Mathf.Sin(az));
        }

        // the lifted center vertex: row = col = round(n / 2) (JavaScript rounds 0.5 up)
        static int Center() { int n = (int)Inputs.grid_n; int c = (int)System.Math.Floor(n / 2.0 + 0.5); return c * (n + 1) + c; }

        // Every check reads Inputs.cs (the published inputs; grading swaps in a hidden set).
        double[] Run(string id)
        {
            HW.GridMesh((int)Inputs.grid_n, Inputs.grid_half, Inputs.grid_lift, out var p, out var idx);
            var ph = HW.Phong(Inputs.shade_N, Inputs.shade_P, Inputs.shade_light, Inputs.shade_eye, Inputs.shade_shine);
            var d = Inputs.uvDefaults; var a = Inputs.uvAll;
            switch (id)
            {
                case "indices": { var o = new double[idx.Count]; for (int i = 0; i < o.Length; i++) o[i] = idx[i]; return o; }
                case "center": return F(p[Center()]);
                case "face1": return F(HW.FaceNormal(p[idx[3]], p[idx[4]], p[idx[5]]));
                case "vn1": return F(HW.VertexNormals(p, idx)[1]);
                case "vn4": return F(HW.VertexNormals(p, idx)[Center()]);
                case "uvDef": return F9(HW.UvPlacement(d[0], d[1], d[2], d[3]));
                case "uvAll": return F9(HW.UvPlacement(a[0], a[1], a[2], a[3]));
                case "NL": return new double[] { ph.NL, ph.diffuse };
                case "spec": return new double[] { ph.RV, ph.specular };
                case "blinn": return new double[] { ph.HN, ph.blinn };
            }
            return null;
        }

        void Start()
        {
            CheckReport.Print("HW5", Expected.Checks, Run);
            var go = new GameObject("grid", typeof(MeshFilter), typeof(MeshRenderer));
            go.transform.position = new Vector3(-3.2f, 0, 0);
            mesh = new Mesh();
            go.GetComponent<MeshFilter>().mesh = mesh;
            go.GetComponent<MeshRenderer>().material = new Material(Shader.Find("Standard")); // display of the grid only
            sphere = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            sphere.transform.position = new Vector3(3.6f, 1.2f, 0);
            sphere.transform.localScale = Vector3.one * 2.4f;
            lit = new Material(Shader.Find("CSS551/HW05Lit"));
            sphere.GetComponent<Renderer>().material = lit;
        }

        void Update()
        {
            HW.GridMesh(2, 1.5f, lift, out pos, out var idx);
            nrm = HW.VertexNormals(pos, idx);
            mesh.Clear();
            mesh.SetVertices(pos);
            if (nrm.Length == pos.Count) mesh.normals = nrm;
            // both windings, so the grid shows from above and below (display only)
            var both = new List<int>(idx);
            for (int i = 0; i + 2 < idx.Count; i += 3) { both.Add(idx[i]); both.Add(idx[i + 2]); both.Add(idx[i + 1]); }
            mesh.SetTriangles(both, 0);
            lit.SetVector("_LightPosWorld", sphere.transform.position + LightAt(lightAz));
            var cam = Camera.main;
            if (cam != null) lit.SetVector("_EyeWorld", cam.transform.position);
        }

        void OnDrawGizmos()
        {
            if (pos == null || nrm == null) return;
            Gizmos.color = Color.white;
            var o = new Vector3(-3.2f, 0, 0);
            for (int i = 0; i < pos.Count && i < nrm.Length; i++) Gizmos.DrawLine(o + pos[i], o + pos[i] + 0.4f * nrm[i]);
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
