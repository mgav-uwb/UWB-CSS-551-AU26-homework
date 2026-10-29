// CSS 551 · HW3 checks and scene (GIVEN). Add to an empty GameObject and press Play. The
// three boxes are placed ONLY from your WorldMatrices (Part B, no parenting); the pink spheres
// are your ToWorld of each node's origin (Part A). Drag the pose: the spheres must stay on the
// boxes' origins.
using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace CSS551.HW03
{
    public class Checks : MonoBehaviour
    {
        [Range(0f, 360f)] public float baseRy = 30f;
        [Range(0f, 120f)] public float armBend = 40f;
        [Range(0f, 180f)] public float handRy = 0f;

        GameObject gBase, gArm, gHand;
        readonly GameObject[] dots = new GameObject[3];

        static double[] F(Vector3 v) => new double[] { v.x, v.y, v.z };
        static double[] F(Matrix4x4 m) { var o = new double[16]; for (int c = 0; c < 4; c++) for (int r = 0; r < 4; r++) o[c * 4 + r] = m[r, c]; return o; }
        static Vector3 Col3(Matrix4x4 m) => new Vector3(m[0, 3], m[1, 3], m[2, 3]);
        static double[] Cat(params double[][] parts) { var o = new List<double>(); foreach (var p in parts) o.AddRange(p); return o.ToArray(); }
        static readonly string[] Nodes = { "base", "arm", "hand" };

        // Every check reads Inputs.cs (the published inputs; grading swaps in a hidden set).
        double[] Run(string id)
        {
            var pose = new Pose { baseRy = Inputs.pose_baseRy, armBend = Inputs.pose_armBend, handRy = Inputs.pose_handRy, armT = Inputs.pose_armT };
            switch (id)
            {
                case "rot": return Cat(F(HW.RotateY(Inputs.rot_p, Inputs.rot_ry)), F(HW.RotateZ(Inputs.rot_p, Inputs.rot_rz)));
                case "pivot": return F(HW.PivotRotateZ(Inputs.pivot_p, Inputs.pivot_pt, Inputs.pivot_deg));
                case "toParent": return Cat(F(HW.ToParent(pose, Nodes[0], Inputs.nodePoint)), F(HW.ToParent(pose, Nodes[1], Inputs.nodePoint)), F(HW.ToParent(pose, Nodes[2], Inputs.nodePoint)));
                case "fromParent": return Cat(F(HW.FromParent(pose, Nodes[0], Inputs.nodePoint)), F(HW.FromParent(pose, Nodes[1], Inputs.nodePoint)), F(HW.FromParent(pose, Nodes[2], Inputs.nodePoint)));
                case "armWorld": return F(HW.ToWorld(pose, "arm", Vector3.zero));
                case "handWorld": return F(HW.ToWorld(pose, "hand", Vector3.zero));
                case "toNode": return F(HW.WorldToNode(pose, "hand", Inputs.worldPoint));
                case "elem": return Cat(F(HW.Translation(Inputs.order_t)), F(HW.RotationY(Inputs.rot_ry)), F(HW.RotationZ(Inputs.rot_rz)), F(HW.Scaling(Inputs.order_s)));
                case "ts": return F(Col3(HW.Translation(Inputs.order_t) * HW.Scaling(Inputs.order_s)));
                case "st": return F(Col3(HW.Scaling(Inputs.order_s) * HW.Translation(Inputs.order_t)));
                case "rigidInv": return F(HW.RigidInverse(HW.Translation(Inputs.rigid_t) * HW.RotationY(Inputs.rigid_ry)));
            }
            HW.LocalMatrices(pose, out var lb, out var la, out var lh);
            HW.WorldMatrices(pose, out var wb, out var wa, out var wh);
            switch (id)
            {
                case "lArm": return F(la);
                case "wHand": return F(wh);
                case "toLocal": return F(HW.WorldToLocal(wh, Inputs.worldPoint));
            }
            return null;
        }

        static GameObject Box(Vector3 size, Color c)
        {
            var root = new GameObject("node");
            var g = GameObject.CreatePrimitive(PrimitiveType.Cube);
            g.transform.SetParent(root.transform, false); // display only: the box inside its node
            g.transform.localScale = size;
            g.GetComponent<Renderer>().material.color = c;
            return root;
        }

        void Start()
        {
            CheckReport.Print("HW3", Expected.Checks, Run);
            gBase = Box(new Vector3(1.2f, 0.4f, 1.2f), new Color(0.36f, 0.55f, 1f));
            gArm = Box(new Vector3(0.25f, 1.4f, 0.25f), new Color(0.36f, 0.83f, 0.48f));
            gHand = Box(new Vector3(0.45f, 0.25f, 0.45f), new Color(1f, 0.81f, 0.36f));
            for (int i = 0; i < 3; i++)
            {
                dots[i] = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                dots[i].transform.localScale = new Vector3(0.14f, 0.14f, 0.14f);
                dots[i].GetComponent<Renderer>().material.color = new Color(1f, 0.36f, 0.66f);
            }
        }

        static void Place(GameObject g, Matrix4x4 m) => g.transform.SetPositionAndRotation(m.GetPosition(), m.rotation);

        void Update()
        {
            HW.WorldMatrices(new Pose { baseRy = baseRy, armBend = armBend, handRy = handRy }, out var wb, out var wa, out var wh);
            Place(gBase, wb); Place(gArm, wa); Place(gHand, wh);
            var pose = new Pose { baseRy = baseRy, armBend = armBend, handRy = handRy };
            for (int i = 0; i < 3; i++) dots[i].transform.position = HW.ToWorld(pose, Nodes[i], Vector3.zero);
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
