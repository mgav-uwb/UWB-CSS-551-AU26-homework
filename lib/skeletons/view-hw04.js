// view-hw04: left, the scene seen through YOUR camera: three.js is handed your V and P and
// told not to compute its own, and a yellow ring is drawn where YOUR worldToPixel puts the
// cube's corner (0.5, 0.5, 0.5); it sits on the corner only when the whole chain is right.
// Right, YOUR rasterize and barycentric on the text's triangle at a chosen resolution.
import { SliderRow } from '../core/cockpit.js';
import { THREE, readout, safe, fmt } from './view-common.js';
import { modelMatrix } from './checks.js';

export const NAV = null;
export const HELP_HTML = `<h4>HW4</h4><p>Left: the scene rendered with your <code>viewMatrix</code> and
<code>perspectiveMatrix</code> (three.js computes neither). The yellow ring is your <code>worldToPixel</code> of the
cube corner (0.5, 0.5, 0.5); it lands on the corner when V, P, the divide and the viewport are all right.
Right: pixels your <code>rasterize</code> covers, colored by your <code>barycentric</code> weights.</p>
<p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>`;

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function make(shell, impl, I) {
  const wrap = document.createElement('div');
  wrap.className = 'hw-2d';
  const left = document.createElement('div');
  const right = document.createElement('div');
  wrap.append(left, right);
  shell.sceneEl.appendChild(wrap);
  const capL = Object.assign(document.createElement('div'), { className: 'cap', textContent: 'through your V and P (1280 × 720 drawn at this size)' });
  const glBox = document.createElement('div');
  glBox.style.cssText = 'position:relative;flex:1;min-height:0;';
  left.append(capL, glBox);
  const capR = Object.assign(document.createElement('div'), { className: 'cap', textContent: 'your rasterize, colored by your barycentric weights' });
  const c2 = document.createElement('canvas');
  c2.className = 'hw-canvas';
  c2.width = 480; c2.height = 480;
  right.append(capR, c2);

  const W = 640, H = 360;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  renderer.domElement.className = 'hw-canvas';
  renderer.domElement.style.aspectRatio = '16 / 9';
  renderer.domElement.style.height = 'auto';
  glBox.appendChild(renderer.domElement);
  const overlay = document.createElement('canvas');
  overlay.width = W; overlay.height = H;
  overlay.style.cssText = 'position:absolute;left:0;top:0;width:100%;aspect-ratio:16/9;pointer-events:none;';
  glBox.appendChild(overlay);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0c10);
  scene.add(new THREE.GridHelper(10, 10, 0x3a4152, 0x262a35), new THREE.AxesHelper(2));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x24262b, 0.9));
  const dl = new THREE.DirectionalLight(0xffffff, 1); dl.position.set(5, 8, 4); scene.add(dl);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x5cd47a }));
  cube.matrixAutoUpdate = false;
  cube.matrix.fromArray(modelMatrix(I.model));
  scene.add(cube);
  const camera = new THREE.PerspectiveCamera();
  camera.matrixAutoUpdate = false;
  camera.matrixWorldAutoUpdate = false;

  const model = { orbit: 0, res: I.res };
  const card = shell.addCard('Controls');
  new SliderRow(card, { id: 'hw4-orbit', label: 'orbit', min: -90, max: 90, step: 1, value: 0, format: (v) => `${v.toFixed(0)}°` }).onInput((v) => { model.orbit = v; update(); });
  new SliderRow(card, { id: 'hw4-res', label: 'res', min: 4, max: 64, step: 1, value: I.res, format: (v) => `${v.toFixed(0)}` }).onInput((v) => { model.res = v; update(); });
  const show = readout(shell, 'Your numbers');

  function update() {
    // the eye swung about y by the orbit slider (0 = the published eye)
    const a = (model.orbit * Math.PI) / 180, e = I.eye;
    const eye = [e[0] * Math.cos(a) + e[2] * Math.sin(a), e[1], -e[0] * Math.sin(a) + e[2] * Math.cos(a)];
    const V = safe(() => impl.viewMatrix(eye, I.at, I.up), IDENT);
    const P = safe(() => impl.perspectiveMatrix(I.fov, W / H, I.near, 50), IDENT);
    camera.matrixWorldInverse.fromArray(V);
    camera.matrixWorld.copy(camera.matrixWorldInverse).invert();
    camera.projectionMatrix.fromArray(P);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    renderer.render(scene, camera);
    const px = safe(() => impl.worldToPixel(modelMatrix(I.model), V, P, I.objectPoint, W, H), [NaN, NaN, NaN]);
    const g = overlay.getContext('2d');
    g.clearRect(0, 0, W, H);
    if (Number.isFinite(px[0])) { g.strokeStyle = '#ffcf5c'; g.lineWidth = 2; g.beginPath(); g.arc(px[0], px[1], 7, 0, 2 * Math.PI); g.stroke(); }

    // rasterization panel
    const ctx = c2.getContext('2d'), R = model.res, S = c2.width, cell = S / R;
    ctx.fillStyle = '#14161d'; ctx.fillRect(0, 0, S, S);
    const cov = safe(() => impl.rasterize(I.tri, R), []);
    for (const [i, j] of cov) {
      const w = safe(() => impl.barycentric(I.tri, [(i + 0.5) / R, (j + 0.5) / R]), [0.3, 0.3, 0.3]);
      const col = [0, 1, 2].map((k) => Math.round(255 * Math.max(0, Math.min(1, w[0] * [0.92, 0.25, 0.2][k] + w[1] * [0.2, 0.75, 0.35][k] + w[2] * [0.2, 0.45, 0.95][k]))));
      ctx.fillStyle = `rgb(${col})`;
      ctx.fillRect(i * cell, S - (j + 1) * cell, cell, cell); // y up, as in the text's figure
    }
    ctx.strokeStyle = '#262a35';
    for (let k = 0; k <= R; k++) { ctx.beginPath(); ctx.moveTo(k * cell, 0); ctx.lineTo(k * cell, S); ctx.moveTo(0, k * cell); ctx.lineTo(S, k * cell); ctx.stroke(); }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath();
    I.tri.forEach(([x, y], k) => (k ? ctx.lineTo(x * S, S - y * S) : ctx.moveTo(x * S, S - y * S)));
    ctx.closePath(); ctx.stroke(); ctx.lineWidth = 1;
    show([
      `V row 0 ${fmt([V[0], V[4], V[8], V[12]], 3)}`,
      `V row 1 ${fmt([V[1], V[5], V[9], V[13]], 3)}`,
      `V row 2 ${fmt([V[2], V[6], V[10], V[14]], 3)}`,
      `corner at pixel ${fmt(px, 2)} (of ${W} × ${H})`,
      `covered ${cov.length} of ${R * R} = ${fmt(cov.length / (R * R), 4)}`,
    ]);
  }
  update();
}
