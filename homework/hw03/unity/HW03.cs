// CSS 551 · HW3 · Scene graphs, by operators and by matrices · Unity track. YOUR FILE.
//
// Part A (Lecture 7) moves POINTS with operators: no matrices and no quaternions in Part A.
// Part B (Lecture 8) builds the same chain from 4 x 4 matrices. The two parts must agree: the
// hand's origin from Part A is column 3 of wHand from Part B.
//
// Unity's Matrix4x4 is indexed m[row, col]; points are column vectors, so column 3 is the
// translation, exactly as in the text. Angles are in degrees; rotations are right-handed (the
// text's formulas, not Unity's left-handed Quaternion.Euler).
// Allowed: Vector3 + - and * by a number, Matrix4x4 * Matrix4x4, MultiplyPoint3x4, setting
// entries, Mathf. Off limits: Quaternion (AngleAxis, Euler, * Vector3); Matrix4x4.TRS /
// Translate / Rotate / Scale / inverse; Transform parenting, TransformPoint / InverseTransformPoint.
using UnityEngine;

namespace CSS551.HW03
{
    // The arm: the base turns on the floor, the arm hinges on the base, the hand rides the arm.
    // armT slides the hinge up the base.
    public struct Pose { public float baseRy, armBend, handRy, armT; }

    public static class HW
    {
        // Each node's parent (GIVEN): the base's parent is the world (null).
        public static string Parent(string node)
        {
            if (node == "hand") return "arm";
            if (node == "arm") return "base";
            return null;
        }

        // ------------------------------------------------------------ Part A: operators on points

        public static Vector3 RotateY(Vector3 p, float deg) { return p; } // TODO: R_y(deg) p, column 0 = (c, 0, -s)
        public static Vector3 RotateZ(Vector3 p, float deg) { return p; } // TODO: R_z(deg) p, column 0 = (c, s, 0)

        // Turn p by deg about the z-direction line through pivot: pivot + R_z(deg)(p - pivot).
        public static Vector3 PivotRotateZ(Vector3 p, Vector3 pivot, float deg) { return p; } // TODO

        // A point p of the node's frame, in its PARENT's frame (the node's local operator):
        //   "base":  (0, 0.2, 0)        + R_y(baseRy)  p
        //   "arm":   (0, 0.2 + armT, 0) + R_z(armBend) (p + (0, 0.7, 0))
        //   "hand":  (0, 0.7, 0)        + R_y(handRy)  p
        public static Vector3 ToParent(Pose pose, string node, Vector3 p) { return p; } // TODO

        // The undo of ToParent: a point q of the parent's frame, in the node's frame.
        public static Vector3 FromParent(Pose pose, string node, Vector3 q) { return q; } // TODO: the inverses, in reverse order

        // A point p of the node's frame, in the world: ToParent up the chain, the node's own first.
        public static Vector3 ToWorld(Pose pose, string node, Vector3 p) { return p; } // TODO: use Parent

        // A world point q, in the node's frame: FromParent down the chain, the root's first.
        public static Vector3 WorldToNode(Pose pose, string node, Vector3 q) { return q; } // TODO

        // ------------------------------------------------------------ Part B: 4 x 4 matrices

        public static Matrix4x4 Translation(Vector3 t) { return Matrix4x4.identity; } // TODO
        public static Matrix4x4 RotationY(float deg) { return Matrix4x4.identity; } // TODO: column 0 = (c, 0, -s)
        public static Matrix4x4 RotationZ(float deg) { return Matrix4x4.identity; } // TODO: column 0 = (c, s, 0)
        public static Matrix4x4 Scaling(Vector3 s) { return Matrix4x4.identity; } // TODO

        // The arm's local matrices, the same chain as Part A's ToParent:
        //   L_base = T(0, 0.2, 0) · R_y(baseRy)
        //   L_arm  = T(0, 0.2 + armT, 0) · R_z(armBend) · T(0, 0.7, 0)
        //   L_hand = T(0, 0.7, 0) · R_y(handRy)
        public static void LocalMatrices(Pose pose, out Matrix4x4 lBase, out Matrix4x4 lArm, out Matrix4x4 lHand)
        {
            lBase = lArm = lHand = Matrix4x4.identity; // TODO
        }

        // World matrices: W_child = W_parent · L_child, the base the root.
        public static void WorldMatrices(Pose pose, out Matrix4x4 wBase, out Matrix4x4 wArm, out Matrix4x4 wHand)
        {
            wBase = wArm = wHand = Matrix4x4.identity; // TODO
        }

        // The inverse of a rigid [R | t]: [R^T | -R^T t]. No general inverse.
        public static Matrix4x4 RigidInverse(Matrix4x4 m) { return Matrix4x4.identity; } // TODO

        // A world point expressed in the frame whose (rigid) world matrix is w.
        public static Vector3 WorldToLocal(Matrix4x4 w, Vector3 p) { return p; } // TODO
    }
}
