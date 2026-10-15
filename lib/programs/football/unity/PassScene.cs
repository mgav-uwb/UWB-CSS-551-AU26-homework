using UnityEngine;

// PassScene.cs: the spiral-pass scene in Unity. Pass.cs computes every matrix; this script builds the
// objects, then, once per frame, copies those matrices onto their Transforms. A Transform stores a
// position, a rotation (a quaternion) and a scale, not a matrix, so each matrix is taken apart into the
// first two (our matrices have no scale) and Unity rebuilds localToWorldMatrix from them.
// Setup: import lib/assets/models/football/ (football.obj, .mtl and the two JPEGs) and, if you want the stadium,
// lib/assets/models/stadium/ (stadium.obj, .mtl and its JPEGs) into Assets; put this script on an empty
// GameObject, drag the football onto Football Prefab and the stadium onto Stadium Prefab, and press Play.
// Models: "Football" by rnepb13 and "Soccer and American football stadium" by ericchip1983, both from
// BlendSwap under CC BY 3.0. Shadows come from the scene's Directional Light (on by default).
// Keys: 1 to 9 pick a shot camera, B the ball it watches, G the gravity, Space pauses, R restarts
// (the Input Manager: Project Settings > Player > Active Input Handling, "Both" or "Input Manager (Old)").
// The same scene, step for step, is scene.js in ../webgl/.
public class PassScene : MonoBehaviour
{
    public GameObject footballPrefab;
    public GameObject stadiumPrefab;   // optional

    #region Objects and state
    Transform field, cart;
    readonly Transform[] wheels = new Transform[4];
    readonly Transform[] balls = new Transform[3];
    Camera shotCamera;

    Pass.TargetPlan plan;
    float t;
    bool playing = true;
    float slowMotion = 0.25f;
    Pass.CameraMode cameraMode = Pass.CameraMode.Chase;
    int look = 1;
    static readonly float[] Lens = { 50f, 6f, 12f, 50f, 12f, 60f, 60f, 20f, 40f };   // fov per camera mode
    static readonly float[] Gravities = { Pass.Seattle, Pass.Denver, Pass.Moon, Pass.WhiteDwarf };
    static readonly string[] GravityNames = { "Seattle", "Denver", "the Moon", "a white dwarf" };
    int gravityIndex;
    #endregion

    #region Start: build everything
    void Start()
    {
        field = new GameObject("field").transform;   // everything in field coordinates is its child; its placement is F
        BuildBox();
        BuildCart();
        for (int i = 0; i < 3; i++) balls[i] = Instantiate(footballPrefab, field).transform;
        if (stadiumPrefab != null)
        {
            // authored with the field's center at its origin and its long axis on z: one translation places it
            Transform stadium = Instantiate(stadiumPrefab, field).transform;
            stadium.localPosition = new Vector3(Pass.FieldWidth / 2f, 0f, Pass.FieldLength / 2f);
        }

        shotCamera = Camera.main != null ? Camera.main : new GameObject("shot camera").AddComponent<Camera>();
        shotCamera.transform.SetParent(field, false);  // placed by C, in field coordinates
        shotCamera.nearClipPlane = 0.05f;
        shotCamera.farClipPlane = 500f;
        plan = new Pass.TargetPlan();
    }
    #endregion

    #region The field: a see-through coordinate box whose near walls are culled
    /// a texture with one grid cell: a faint (or no) fill, a light border; repeated once per 10 m
    static Texture2D GridTexture(Color fill, Color line)
    {
        Texture2D tex = new Texture2D(128, 128);
        for (int y = 0; y < 128; y++)
            for (int x = 0; x < 128; x++)
                tex.SetPixel(x, y, x < 2 || y < 2 || x > 125 || y > 125 ? line : fill);
        tex.wrapMode = TextureWrapMode.Repeat;
        tex.Apply();
        return tex;
    }

    /// an unlit, alpha-blended material that does not write depth, so the stadium behind it shows
    static Material SeeThrough(Texture2D tex, Vector2 tiling)
    {
        Material mat;
        Shader shader = Shader.Find("Universal Render Pipeline/Unlit");
        if (shader != null)
        {
            mat = new Material(shader);
            mat.SetFloat("_Surface", 1f);                                  // transparent
            mat.SetFloat("_Blend", 0f);                                    // alpha blending
            mat.SetOverrideTag("RenderType", "Transparent");
            mat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
            mat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            mat.SetInt("_ZWrite", 0);
            mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            mat.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Transparent;
        }
        else
        {
            mat = new Material(Shader.Find("Unlit/Transparent"));         // the built-in render pipeline
        }
        mat.mainTexture = tex;
        mat.mainTextureScale = tiling;
        return mat;
    }

    /// one wall: a Quad (its front faces -z) turned to face INTO the box. A Quad is drawn from the front
    /// only, so a wall between the camera and the box shows its back and is culled
    void AddWall(float width, float height, Vector3 center, Vector3 eulerDegrees, Color fill, Color line)
    {
        GameObject wall = GameObject.CreatePrimitive(PrimitiveType.Quad);
        Destroy(wall.GetComponent<Collider>());
        wall.transform.SetParent(field, false);
        wall.transform.localPosition = center;
        wall.transform.localRotation = Quaternion.Euler(eulerDegrees);
        wall.transform.localScale = new Vector3(width, height, 1f);
        wall.GetComponent<MeshRenderer>().material = SeeThrough(GridTexture(fill, line), new Vector2(width / 10f, height / 10f));
    }

    void BuildBox()
    {
        float W = Pass.FieldWidth, H = Pass.FieldHeight, L = Pass.FieldLength;
        Color floor = new Color(0f, 0f, 0f, 0f), floorLine = new Color(0.95f, 0.96f, 0.93f, 0.5f);
        Color wall = new Color(0.08f, 0.10f, 0.15f, 0.08f), wallLine = new Color(0.66f, 0.74f, 0.88f, 0.65f);
        AddWall(W, L, new Vector3(W / 2f, 0.03f, L / 2f), new Vector3(90f, 0f, 0f), floor, floorLine);   // floor, 3 cm up, faces +y
        AddWall(W, L, new Vector3(W / 2f, H, L / 2f), new Vector3(-90f, 0f, 0f), wall, wallLine);    // ceiling, faces -y
        AddWall(L, H, new Vector3(0f, H / 2f, L / 2f), new Vector3(0f, -90f, 0f), wall, wallLine);   // x = 0, faces +x
        AddWall(L, H, new Vector3(W, H / 2f, L / 2f), new Vector3(0f, 90f, 0f), wall, wallLine);     // x = W, faces -x
        AddWall(W, H, new Vector3(W / 2f, H / 2f, 0f), new Vector3(0f, 180f, 0f), wall, wallLine);   // z = 0, faces +z
        AddWall(W, H, new Vector3(W / 2f, H / 2f, L), Vector3.zero, wall, wallLine);                 // z = L, faces -z
    }
    #endregion

    #region The target cart: chassis, bowl, wheels
    void BuildCart()
    {
        cart = new GameObject("cart").transform;
        cart.SetParent(field, false);
        Color paint = new Color(0.24f, 0.48f, 0.88f);
        Part(PrimitiveType.Cube, cart, new Vector3(0f, 0.45f, 0f), Vector3.zero, new Vector3(Pass.CartWidth, 0.3f, Pass.CartLength), paint);
        Part(PrimitiveType.Cylinder, cart, new Vector3(0f, 0.68f, 0f), Vector3.zero, new Vector3(0.16f, 0.1f, 0.16f), paint);
        GameObject bowl = new GameObject("bowl");
        bowl.transform.SetParent(cart, false);
        bowl.AddComponent<MeshFilter>().mesh = BowlMesh();
        Shader lit = Shader.Find("Universal Render Pipeline/Lit");
        if (lit == null) lit = Shader.Find("Standard");                // the built-in render pipeline
        Material bowlPaint = new Material(lit);
        bowlPaint.color = new Color(0.95f, 0.65f, 0.35f);
        bowl.AddComponent<MeshRenderer>().material = bowlPaint;
        for (int i = 0; i < 4; i++)
        {
            // each wheel hangs from the field and is placed by its own matrix; its tire's axis is x
            wheels[i] = new GameObject("wheel " + i).transform;
            wheels[i].SetParent(field, false);
            Part(PrimitiveType.Cylinder, wheels[i], Vector3.zero, new Vector3(0f, 0f, 90f), new Vector3(0.6f, 0.08f, 0.6f), new Color(0.13f, 0.13f, 0.13f));
            Part(PrimitiveType.Cube, wheels[i], Vector3.zero, Vector3.zero, new Vector3(0.17f, 0.05f, 0.5f), Color.white);
        }
    }

    static void Part(PrimitiveType shape, Transform parent, Vector3 position, Vector3 eulerDegrees, Vector3 scale, Color color)
    {
        GameObject part = GameObject.CreatePrimitive(shape);
        Destroy(part.GetComponent<Collider>());
        part.transform.SetParent(parent, false);
        part.transform.localPosition = position;
        part.transform.localRotation = Quaternion.Euler(eulerDegrees);
        part.transform.localScale = scale;
        part.GetComponent<MeshRenderer>().material.color = color;
    }

    /// the bowl: a half sphere, open on top, its rim at RimHeight. Two shells on the same points, the inner
    /// one wound the other way, so it reads from inside and out (a single shell would be culled from inside)
    static Mesh BowlMesh()
    {
        const int rings = 16, segments = 48;
        int n = (rings + 1) * (segments + 1);
        Vector3[] v = new Vector3[2 * n];
        for (int i = 0; i <= rings; i++)
        {
            float a = i * Mathf.PI / 2f / rings;
            float r = Pass.BowlRadius * Mathf.Sin(a), y = Pass.RimHeight - Pass.BowlRadius * Mathf.Cos(a);
            for (int j = 0; j <= segments; j++)
            {
                float phi = j * 2f * Mathf.PI / segments;
                v[i * (segments + 1) + j] = new Vector3(r * Mathf.Sin(phi), y, r * Mathf.Cos(phi));
                v[n + i * (segments + 1) + j] = v[i * (segments + 1) + j];
            }
        }
        int[] tris = new int[rings * segments * 12];
        int k = 0;
        for (int i = 0; i < rings; i++)
            for (int j = 0; j < segments; j++)
            {
                int a = i * (segments + 1) + j, b = a + segments + 1;
                int[] outer = { a, b, a + 1, a + 1, b, b + 1 };
                int[] inner = { n + a, n + a + 1, n + b, n + a + 1, n + b + 1, n + b };
                foreach (int q in outer) tris[k++] = q;
                foreach (int q in inner) tris[k++] = q;
            }
        Mesh mesh = new Mesh();
        mesh.vertices = v;
        mesh.triangles = tris;
        mesh.RecalculateNormals();
        return mesh;
    }
    #endregion

    #region The frame loop: copy every matrix from the model
    /// take a matrix apart into the two things a Transform stores (our matrices carry no scale)
    static void SetPlacement(Transform tr, Matrix4x4 m)
    {
        tr.localPosition = m.GetColumn(3);
        tr.localRotation = m.rotation;
    }

    void Update()
    {
        ReadKeys();
        if (playing) t += Time.deltaTime * slowMotion;
        if (t > plan.tEnd) t = 0f;

        SetPlacement(field, Pass.FieldPlacement());                         // F
        SetPlacement(cart, plan.Placement(t));                              // K(t)
        for (int i = 0; i < 4; i++) SetPlacement(wheels[i], plan.Wheel(i, t));
        SetPlacement(balls[0], Pass.ThrownBall(plan, t));                   // H T A W S, or carried by the cart
        SetPlacement(balls[1], Pass.RestingBall());
        SetPlacement(balls[2], Pass.SpinningTop(t));

        // the camera: placed by C in the field; Unity forms the view matrix V from its Transform
        // (shotCamera.worldToCameraMatrix) and the projection P from fieldOfView (shotCamera.projectionMatrix)
        SetPlacement(shotCamera.transform, Pass.CameraPlacement(cameraMode, t, look, plan));
        shotCamera.fieldOfView = Lens[(int)cameraMode];
    }
    #endregion

    #region Keys and status line
    void ReadKeys()
    {
        for (int n = 1; n <= 9; n++)
            if (Input.GetKeyDown(KeyCode.Alpha0 + n)) cameraMode = (Pass.CameraMode)(n - 1);
        if (Input.GetKeyDown(KeyCode.B)) look = look % 3 + 1;
        if (Input.GetKeyDown(KeyCode.G))
        {
            gravityIndex = (gravityIndex + 1) % Gravities.Length;
            Pass.gravity = Gravities[gravityIndex];
            plan = new Pass.TargetPlan();                                   // the plan depends on the flight
            t = 0f;
        }
        if (Input.GetKeyDown(KeyCode.Space)) playing = !playing;
        if (Input.GetKeyDown(KeyCode.R)) t = 0f;
    }

    void OnGUI()
    {
        GUI.Label(new Rect(10, Screen.height - 30, 900, 24),
            $"t = {t:F2} s   camera {cameraMode} (1-9)   watching ball {look} (B)   gravity {GravityNames[gravityIndex]} (G)   {plan.outcome}");
    }
    #endregion
}
