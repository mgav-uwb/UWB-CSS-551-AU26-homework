// CSS 551 · HW5 · the lit sphere's shader (Built-in Render Pipeline). YOUR FILE: complete
// the fragment program. Checks.cs sets the uniforms every frame.
//   color = _Ka * _Kd + _Kd * max(N·L, 0) + _Ks * specular, specular as in HW.Phong.
Shader "CSS551/HW05Lit"
{
    Properties
    {
        _Kd ("Diffuse color", Color) = (0.86, 0.36, 0.3, 1)
        _Ka ("Ambient", Float) = 0.12
        _Ks ("Specular", Float) = 0.5
        _Shine ("Shininess", Float) = 30
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            float4 _Kd;
            float _Ka, _Ks, _Shine;
            float4 _LightPosWorld; // set by Checks.cs
            float4 _EyeWorld;      // set by Checks.cs

            struct v2f { float4 pos : SV_POSITION; float3 wpos : TEXCOORD0; float3 wnrm : TEXCOORD1; };

            v2f vert(appdata_base v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.wpos = mul(unity_ObjectToWorld, v.vertex).xyz;
                o.wnrm = UnityObjectToWorldNormal(v.normal);
                return o;
            }

            float4 frag(v2f i) : SV_Target
            {
                float3 N = normalize(i.wnrm);
                // TODO: L, V, N·L, R, the specular, and the three terms. Until then: the normals.
                return float4(0.5 * N + 0.5, 1);
            }
            ENDCG
        }
    }
}
