// Hand-built math core: view/model/projection matrices, no three.js import.
// All matrices are 16-element plain arrays in COLUMN-MAJOR order
// (matches THREE.Matrix4.elements layout).

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const normalize = (a) => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

export function lookAtBasis(eye, at, up) {
  const eyeToAt = sub(eye, at);
  if (Math.hypot(...eyeToAt) < 1e-8) {
    throw new RangeError('lookAtBasis: eye and at coincide');
  }
  const w = normalize(eyeToAt);
  const c = cross(up, w);
  if (Math.hypot(...c) < 1e-8) {
    throw new RangeError('lookAtBasis: up is parallel to the view direction (eye - at); choose a different up vector');
  }
  const u = normalize(c);
  const v = cross(w, u);
  const V = [
    u[0],
    v[0],
    w[0],
    0,
    u[1],
    v[1],
    w[1],
    0,
    u[2],
    v[2],
    w[2],
    0,
    -dot(u, eye),
    -dot(v, eye),
    -dot(w, eye),
    1,
  ];
  return { u, v, w, V };
}

const D = Math.PI / 180;

// three.js 'XYZ' Euler order means the rotation is applied as
// R = Rx * Ry * Rz to a column vector (i.e. Rz happens first, then Ry,
// then Rx last), see THREE.Matrix4.makeRotationFromEuler, case 'XYZ'.
export function makeTRS(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
  const [cx, sxn] = [Math.cos(rx * D), Math.sin(rx * D)],
    [cy, syn] = [Math.cos(ry * D), Math.sin(ry * D)],
    [cz, szn] = [Math.cos(rz * D), Math.sin(rz * D)];

  const r00 = cy * cz,
    r01 = -cy * szn,
    r02 = syn;
  const r10 = cx * szn + sxn * syn * cz,
    r11 = cx * cz - sxn * syn * szn,
    r12 = -sxn * cy;
  const r20 = sxn * szn - cx * syn * cz,
    r21 = sxn * cz + cx * syn * szn,
    r22 = cx * cy;

  return [
    r00 * sx,
    r10 * sx,
    r20 * sx,
    0,
    r01 * sy,
    r11 * sy,
    r21 * sy,
    0,
    r02 * sz,
    r12 * sz,
    r22 * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

// Rodrigues' rotation formula, hand-built (no three import). Matches
// THREE.Matrix4.makeRotationAxis(axis.normalize(), rad) element-wise: that
// method's this.set(row-major args) stores column-major, so the layout below
// is transcribed directly from its row-major expressions into our
// column-major 16-array (col0 = [tx*x+c, tx*y+s*z, tx*z-s*y, 0], etc.).
export function axisAngleMatrix(ax, ay, az, deg) {
  const len = Math.hypot(ax, ay, az);
  if (len < 1e-8) {
    throw new RangeError('axisAngleMatrix: zero axis');
  }
  const x = ax / len,
    y = ay / len,
    z = az / len;
  const rad = deg * D;
  const c = Math.cos(rad),
    s = Math.sin(rad),
    t = 1 - c;
  const tx = t * x,
    ty = t * y;
  return [
    tx * x + c, tx * y + s * z, tx * z - s * y, 0,
    tx * y - s * z, ty * y + c, ty * z + s * x, 0,
    tx * z + s * y, ty * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1,
  ];
}

// [x, y, z, w]: three.js component order (THREE.Quaternion.setFromAxisAngle).
export function quatFromAxisAngle(ax, ay, az, deg) {
  const len = Math.hypot(ax, ay, az);
  if (len < 1e-8) {
    throw new RangeError('quatFromAxisAngle: zero axis');
  }
  const x = ax / len,
    y = ay / len,
    z = az / len;
  const half = (deg * D) / 2;
  const s = Math.sin(half);
  return [x * s, y * s, z * s, Math.cos(half)];
}

// matMul(a, b): standard matrix product, column-major 16-arrays, result = a·b
// (applying the result to a vector does b first, then a"a-after-b").
// Plain triple loop over the column-major layout (out[col*4+row] =
// sum_k a[k*4+row] * b[col*4+k]); no shortcuts, so it stays correct for any
// 4x4 input, not just TRS-shaped ones.
export function matMul(a, b) {
  const out = new Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

// invertTRS(m): closed-form inverse for matrices of the shape T·R·S; a
// translation, then a rotation, then a positive (uniform or nonuniform,
// axis-aligned) scale, exactly what makeTRS builds. NOT a general 4x4
// inverse: it assumes no shear and positive scale factors, and it throws
// (RangeError) if the bottom row isn't (0,0,0,1) within 1e-8, which catches
// perspective-shaped input but NOT a sheared-but-still-affine matrix (that
// case silently returns a wrong answer: out of contract for this library).
//
// Method: the 3x3 linear part L = R*S has each column equal to R's
// corresponding column scaled by sx/sy/sz, so each column's length recovers
// that axis's scale; dividing each column by its own length recovers the
// pure rotation R (orthonormal, so R^-1 = R^T). Reassembling row-by-row
// gives L^-1 = S^-1 * R^T, and the translation inverts via the standard
// affine identity: for M = [L | t], M^-1 = [L^-1 | -L^-1 · t].
export function invertTRS(m) {
  if (
    Math.abs(m[3]) > 1e-8 ||
    Math.abs(m[7]) > 1e-8 ||
    Math.abs(m[11]) > 1e-8 ||
    Math.abs(m[15] - 1) > 1e-8
  ) {
    throw new RangeError(
      'invertTRS: bottom row must be (0,0,0,1): this is a TRS-structured ' +
        'inverse (translation, rotation, positive scale; no shear), not a ' +
        'general 4x4 inverse. Got a perspective/shear-shaped bottom row.'
    );
  }

  const col0 = [m[0], m[1], m[2]];
  const col1 = [m[4], m[5], m[6]];
  const col2 = [m[8], m[9], m[10]];
  const sx = Math.hypot(...col0);
  const sy = Math.hypot(...col1);
  const sz = Math.hypot(...col2);

  // Pure rotation R, recovered column-by-column (r{row}{col} naming).
  const r00 = col0[0] / sx, r10 = col0[1] / sx, r20 = col0[2] / sx;
  const r01 = col1[0] / sy, r11 = col1[1] / sy, r21 = col1[2] / sy;
  const r02 = col2[0] / sz, r12 = col2[1] / sz, r22 = col2[2] / sz;

  // L^-1 = S^-1 * R^T, built row-by-row: row i of R^T is column i of R,
  // scaled by 1/s_i.
  const li00 = r00 / sx, li01 = r10 / sx, li02 = r20 / sx;
  const li10 = r01 / sy, li11 = r11 / sy, li12 = r21 / sy;
  const li20 = r02 / sz, li21 = r12 / sz, li22 = r22 / sz;

  const tx = m[12], ty = m[13], tz = m[14];
  const itx = -(li00 * tx + li01 * ty + li02 * tz);
  const ity = -(li10 * tx + li11 * ty + li12 * tz);
  const itz = -(li20 * tx + li21 * ty + li22 * tz);

  return [
    li00, li10, li20, 0,
    li01, li11, li21, 0,
    li02, li12, li22, 0,
    itx, ity, itz, 1,
  ];
}

// applyMat4(m, p): apply a column-major 16-array m to point p=[x,y,z]
// (implicit w=1), returning the full homogeneous result [x', y', z', w']:
// UNDIVIDED. Callers decide whether/how to divide (see perspectiveDivide
// below): for an affine matrix (TRS chain, a view matrix) w' is always 1 and
// dividing is a no-op; for a projection matrix w' = -z_view can be zero or
// negative (a point behind the eye), and blindly dividing would silently
// produce a garbage-but-finite point instead of surfacing that condition.
export function applyMat4(m, p) {
  const [x, y, z] = p;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
    m[3] * x + m[7] * y + m[11] * z + m[15],
  ];
}

// perspectiveDivide([x,y,z,w]) -> [x/w, y/w, z/w]. A tiny, separate step
// (not fused into applyMat4) so callers can inspect w' first, e.g. to flag
// w' <= 0 as "behind the eye" instead of dividing into a flipped/garbage point.
export function perspectiveDivide([x, y, z, w]) {
  return [x / w, y / w, z / w];
}

// uvMat3(offU, offV, rotDeg, tileU, tileV): column-major 3x3 (THREE.Matrix3
// .elements layout) 2D TRS in UV space: T(off) · [rotate-and-scale about
// the UV center (0.5, 0.5)]. THE CONVENTION IS PINNED BY three.js: it must
// equal THREE.Matrix3().setUvTransform(offU, offV, tileU, tileV, rotRad, 0.5,
// 0.5) element-wise (see lib/tests/xform.test.mjs). Hand-derived from that
// method's own row-major body (vendor/three.module.js, Matrix3.setUvTransform):
//   row0: [ sx*c,  sx*s, -sx*(c*cx+s*cy) + cx + tx ]
//   row1: [-sy*s,  sy*c, -sy*(-s*cx+c*cy) + cy + ty ]
//   row2: [    0,     0,                          1 ]
// with tx=offU, ty=offV, sx=tileU, sy=tileV, cx=cy=0.5 (pinned center), and
// Matrix3.set(row-major args) stores column-major (te[0..2]=col0, etc.), see
// that constructor/set() in the vendor file. Transcribed straight into our
// column-major 9-array below, no three.js import needed at runtime.
export function uvMat3(offU, offV, rotDeg, tileU, tileV) {
  const rad = rotDeg * D;
  const c = Math.cos(rad),
    s = Math.sin(rad);
  const cx = 0.5,
    cy = 0.5;
  return [
    tileU * c,
    -tileV * s,
    0,
    tileU * s,
    tileV * c,
    0,
    -tileU * (c * cx + s * cy) + cx + offU,
    -tileV * (-s * cx + c * cy) + cy + offV,
    1,
  ];
}

export function perspective(fovYDeg, aspect, near, far) {
  const f = 1 / Math.tan((fovYDeg * D) / 2),
    nf = 1 / (near - far);
  return [
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * nf,
    -1,
    0,
    0,
    2 * far * near * nf,
    0,
  ];
}
