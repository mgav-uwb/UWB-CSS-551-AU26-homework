// view-hw05: YOUR grid mesh with YOUR vertex normals drawn as white segments; a quad textured
// by a procedural checker through YOUR uvPlacement matrix; and a sphere lit by YOUR fragment
// shader, with the marked point's numbers from YOUR phong() beside it.
import { SliderRow } from '../core/cockpit.js';
import { THREE, scene3d, readout, safe, fmt } from './view-common.js';

export const NAV = 'orbit';
export const HELP_HTML = `<h4>HW5</h4><p>Left: your <code>gridMesh</code> with your <code>vertexNormals</code> (white).
Middle: a checker sampled at <code>uvPlacement · uv</code>. Right: the sphere lit by your
<code>FRAGMENT_SHADER</code>; the card prints your <code>phong</code> at the marked point
(0.693, 0.693, 0.693).</p><p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>`;

const VERT = /* glsl */ `
varying vec3 vPos;
varying vec3 vNormal;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPos = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const UV_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const UV_FRAG = /* glsl */ `
uniform mat3 uPlace;
varying vec2 vUv;
void main() {
  vec2 t = (uPlace * vec3(vUv, 1.0)).xy;
  vec2 c = floor(fract(t) * 4.0);
  float k = mod(c.x + c.y, 2.0);
  vec3 col = mix(vec3(0.15, 0.17, 0.22), vec3(0.95, 0.8, 0.3), k);
  if (c.x == 0.0 && c.y == 3.0) col = vec3(0.9, 0.2, 0.2);
  gl_FragColor = vec4(col, 1.0);
}`;

export function make(shell, impl, I) {
  const sc = scene3d(shell, { eye: [0.5, 5, 9], target: [0.5, 0, 0] });
  const S = sc.scene;

  // --- the mesh
  const meshGroup = new THREE.Group(); meshGroup.position.set(-3.2, 0, 0); S.add(meshGroup);
  const meshMat = new THREE.MeshStandardMaterial({ color: 0x5c8cff, side: THREE.DoubleSide, flatShading: false });
  let mesh = null, lines = null;

  // --- the texture placement quad
  const uvMat = new THREE.ShaderMaterial({ uniforms: { uPlace: { value: new THREE.Matrix3() } }, vertexShader: UV_VERT, fragmentShader: UV_FRAG, side: THREE.DoubleSide });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), uvMat);
  quad.rotation.x = -Math.PI / 2; quad.position.set(0.3, 0.01, 0); S.add(quad);

  // --- the lit sphere, radius 1.2 as in the illumination demo
  const sphereMat = new THREE.ShaderMaterial({
    uniforms: { uLightPos: { value: new THREE.Vector3() }, uEye: { value: new THREE.Vector3() }, uKd: { value: new THREE.Vector3(0.86, 0.36, 0.3) }, uKa: { value: 0.12 }, uKs: { value: 0.5 }, uShine: { value: I.shade.shine } },
    vertexShader: VERT, fragmentShader: impl.FRAGMENT_SHADER || 'void main(){gl_FragColor=vec4(1.0,0.0,1.0,1.0);}',
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.2, 64, 40), sphereMat);
  const SPH = new THREE.Vector3(3.6, 1.2, 0);
  sphere.position.copy(SPH); S.add(sphere);
  sphere.onBeforeRender = (_r, _s, cam) => { sphereMat.uniforms.uEye.value.setFromMatrixPosition(cam.matrixWorld); };
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffcc })); S.add(lamp);
  const mark = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); S.add(mark);
  mark.position.copy(SPH).add(new THREE.Vector3(...I.shade.P));

  const model = { lift: I.grid.lift, rot: I.uvAll[2], az: 45 };
  const card = shell.addCard('Controls');
  new SliderRow(card, { id: 'hw5-lift', label: 'lift', min: -1, max: 1, step: 0.05, value: model.lift }).onInput((v) => { model.lift = v; update(); });
  new SliderRow(card, { id: 'hw5-rot', label: 'uv rot', min: 0, max: 360, step: 1, value: model.rot, format: (v) => `${v.toFixed(0)}°` }).onInput((v) => { model.rot = v; update(); });
  new SliderRow(card, { id: 'hw5-az', label: 'light az', min: 0, max: 360, step: 1, value: model.az, format: (v) => `${v.toFixed(0)}°` }).onInput((v) => { model.az = v; update(); });
  const show = readout(shell, 'Your numbers');

  function update() {
    // mesh
    const g = safe(() => impl.gridMesh(I.grid.n, I.grid.half, model.lift), { positions: [], indices: [] });
    const nrm = safe(() => impl.vertexNormals(g.positions, g.indices), []);
    if (mesh) { meshGroup.remove(mesh); mesh.geometry.dispose(); }
    if (lines) { meshGroup.remove(lines); lines.geometry.dispose(); }
    if (g.positions.length && g.indices.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(g.positions.flat(), 3));
      if (nrm.length === g.positions.length) geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm.flat(), 3));
      geo.setIndex(g.indices.flat());
      mesh = new THREE.Mesh(geo, meshMat);
      meshGroup.add(mesh);
      const seg = [];
      g.positions.forEach((p, i) => { const n = nrm[i] || [0, 0, 0]; seg.push(...p, p[0] + 0.4 * n[0], p[1] + 0.4 * n[1], p[2] + 0.4 * n[2]); });
      lines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(seg, 3)), new THREE.LineBasicMaterial({ color: 0xffffff }));
      meshGroup.add(lines);
    } else { mesh = lines = null; }
    // placement
    const M = safe(() => impl.uvPlacement(I.uvAll[0], I.uvAll[1], model.rot, I.uvAll[3]), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    uvMat.uniforms.uPlace.value.fromArray(M);
    // light
    const az = (model.az * Math.PI) / 180, el = Math.PI / 6;
    const Lrel = [3 * Math.cos(el) * Math.cos(az), 3 * Math.sin(el), 3 * Math.cos(el) * Math.sin(az)];
    lamp.position.copy(SPH).add(new THREE.Vector3(...Lrel));
    sphereMat.uniforms.uLightPos.value.copy(lamp.position);
    const r = safe(() => impl.phong(I.shade.N, I.shade.P, Lrel, I.shade.eye, I.shade.shine), {});
    show([
      `vertex 1 normal ${fmt(nrm[1] ?? null, 3)}`,
      `placement rows [${fmt([M[0], M[3], M[6]], 3)}]`,
      `               [${fmt([M[1], M[4], M[7]], 3)}]`,
      `N·L ${fmt(r.NL, 3)}  R·V ${fmt(r.RV, 3)}  H·N ${fmt(r.HN, 3)}`,
      `diffuse ${fmt(r.diffuse, 3)}  spec ${fmt(r.specular, 4)}  blinn ${fmt(r.blinn, 3)}`,
      `(numbers: eye at (3, 3, 6) from the center; shader: your view)`,
    ]);
    sc.render();
  }
  update();
}
