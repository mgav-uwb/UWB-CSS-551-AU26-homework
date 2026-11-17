// view-hw06: the Cornell box rendered by YOUR trace() through YOUR cameraRay, hitSphere,
// hitTriangle and reflect, with the four checked pixels outlined, and the textbook sphere
// (150 × 150) beside it.
import { SliderRow } from '../core/cockpit.js';
import { panels2d, readout, safe, fmt } from './view-common.js';
import { CORNELL } from './checks.js';

export const NAV = null;
export const HELP_HTML = `<h4>HW6</h4><p>Left: the Cornell box, 96 × 72, every pixel from your <code>trace</code>.
The four outlined pixels are the ones the checks read. Right: the ray-tracing chapter's sphere, one ray per
pixel with your <code>cameraRay</code> and <code>hitSphere</code>, shaded by the normal. Values are shown with a
2.2 display gamma.</p><p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>`;

const gamma = (v) => Math.round(255 * Math.min(1, Math.max(0, v)) ** (1 / 2.2));

function paint(ctx, img, w, h, marks) {
  const data = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    data.data[4 * i] = gamma(img[3 * i]); data.data[4 * i + 1] = gamma(img[3 * i + 1]); data.data[4 * i + 2] = gamma(img[3 * i + 2]); data.data[4 * i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 0.35;
  for (const [x, y] of marks) ctx.strokeRect(x - 0.5, y - 0.5, 2, 2);
}

export function make(shell, impl, I) {
  const C = I.cornell;
  const [left, right] = panels2d(shell, [
    { caption: 'the Cornell box, your trace()', w: C.width, h: C.height },
    { caption: 'the chapter’s sphere: your cameraRay + hitSphere', w: 150, h: 150 },
  ]);
  const model = { lx: CORNELL.light[0], depth: CORNELL.maxDepth };
  const card = shell.addCard('Scene');
  new SliderRow(card, { id: 'hw6-lx', label: 'light x', min: -0.9, max: 0.9, step: 0.05, value: model.lx }).onInput((v) => { model.lx = v; update(); });
  new SliderRow(card, { id: 'hw6-depth', label: 'max depth', min: 0, max: 5, step: 1, value: model.depth, format: (v) => v.toFixed(0) }).onInput((v) => { model.depth = v; update(); });
  const show = readout(shell, 'Your numbers');

  // the sphere image does not depend on the sliders
  const sph = new Float64Array(150 * 150 * 3);
  for (let py = 0; py < 150; py++) for (let px = 0; px < 150; px++) {
    const r = safe(() => impl.cameraRay(px, py, 150, 150, I.cam), null);
    const t = r ? safe(() => impl.hitSphere(r.o, r.d, I.sphere.c, I.sphere.r), null) : null;
    if (t !== null && r) {
      const p = [0, 1, 2].map((k) => r.o[k] + t * r.d[k]), l = Math.hypot(...p);
      const i = 3 * (py * 150 + px);
      sph[i] = 0.5 + 0.5 * p[0] / l; sph[i + 1] = 0.5 + 0.5 * p[1] / l; sph[i + 2] = 0.5 + 0.5 * p[2] / l;
    }
  }
  paint(right.ctx, sph, 150, 150, [I.pixel]);

  function update() {
    const scene = { ...CORNELL, light: [model.lx, CORNELL.light[1], CORNELL.light[2]], maxDepth: model.depth };
    const t0 = performance.now();
    const img = safe(() => impl.render(scene, C.cam, C.width, C.height), new Float64Array(C.width * C.height * 3));
    const ms = performance.now() - t0;
    paint(left.ctx, img, C.width, C.height, [C.lit, C.shadow, C.mirror, C.wall]);
    const at = ([x, y]) => [img[3 * (y * C.width + x)], img[3 * (y * C.width + x) + 1], img[3 * (y * C.width + x) + 2]];
    show([
      `lit ${fmt(C.lit)}     ${fmt(at(C.lit), 3)}`,
      `shadow ${fmt(C.shadow)}  ${fmt(at(C.shadow), 3)}`,
      `mirror ${fmt(C.mirror)}  ${fmt(at(C.mirror), 3)}`,
      `wall ${fmt(C.wall)}    ${fmt(at(C.wall), 3)}`,
      `(checks use light x = 0, depth 3)`,
      `render ${ms.toFixed(0)} ms`,
    ]);
  }
  update();
}
