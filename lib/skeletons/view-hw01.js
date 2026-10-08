// view-hw01: the loop, input, and orientation. A 2D card holds three shapes (the model: their
// positions); the pointer is the controller: YOUR hitTest2D finds the shape under it, and YOUR
// classifyPointer decides on release whether the gesture was a click (select the shape) or a
// drag (the shape follows the pointer while it is held). The canvas and the readout are two
// views of the same model. In the 3D scene an object is aimed by YOUR orientBasis at a target
// that orbits, advanced every frame by YOUR advance(); the frame-rate knob changes dt, and the
// orbit speed must not change.
import { SliderRow } from '../core/cockpit.js';
import { THREE, scene3d, readout, safe, fmt, arrow } from './view-common.js';

export const NAV = 'orbit';
export const HELP_HTML = `<h4>HW1</h4><p>In the card, the three shapes are the model and the pointer is the
controller. Your <code>hitTest2D</code> lights the shape under the pointer; on release your
<code>classifyPointer</code> decides: a click selects the shape under the press, a drag moves it. The arrow in
the scene is aimed with your <code>orientBasis</code> at the orbiting ball, which moves by your
<code>advance</code>. Change the simulated frame rate: a correct <code>advance</code> keeps the orbit speed the
same.</p>
<p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>`;

const W = 320, H = 200;

export function make(shell, impl, I) {
  const sc = scene3d(shell, { eye: [4, 4, 7], target: [0, 0.5, 0] });

  const aim = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x8f7dff }));
  const nose = arrow(0xffcf5c);
  nose.rotation.x = Math.PI / 2; // the arrow's +y becomes the group's +z
  nose.scale.set(1, 0.9, 1);
  aim.add(body, nose);
  aim.matrixAutoUpdate = false;
  sc.scene.add(aim);
  const target = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), new THREE.MeshStandardMaterial({ color: 0xff6b6b }));
  sc.scene.add(target);

  // ---- the 2D card: model, views, controller
  const model = {
    fps: 60,
    shapes: [
      { name: 'circle', color: '#5cd47a', s: { kind: 'circle', center: [60, 100], r: 36 } },
      { name: 'segment', color: '#ffcf5c', s: { kind: 'segment', a: [125, 45], b: [185, 155], tol: 8 } },
      { name: 'triangle', color: '#8f7dff', s: { kind: 'triangle', a: [215, 160], b: [300, 150], c: [262, 40] } },
    ],
    selected: -1,
  };
  const hitCard = shell.addCard('Hit test and click or drag (pixels)');
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.style.cssText = 'width:100%;height:auto;display:block;background:#0b0c10;border-radius:6px;touch-action:none;cursor:pointer;';
  hitCard.appendChild(cv);
  const g = cv.getContext('2d');
  const gesture = readout(shell, 'Last gesture (classifyPointer)');
  const show = readout(shell, 'Aim (orientBasis)');

  const fpsCard = shell.addCard('Loop');
  const fpsSlider = new SliderRow(fpsCard, { id: 'hw1-fps', label: 'fps', min: 10, max: 120, step: 1, value: model.fps, format: (v) => `${v.toFixed(0)} Hz` });
  fpsSlider.onInput((v) => { model.fps = v; });

  // a pointer position in canvas pixels (the canvas is scaled to the card's width)
  const toCanvas = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; };
  const hitAt = (p) => { for (let k = model.shapes.length - 1; k >= 0; k--) if (safe(() => impl.hitTest2D(p, model.shapes[k].s), false) === true) return k; return -1; };
  const move = (s, dx, dy) => {
    const t = (q) => [q[0] + dx, q[1] + dy];
    if (s.kind === 'circle') s.center = t(s.center);
    else { s.a = t(s.a); s.b = t(s.b); if (s.c) s.c = t(s.c); }
  };

  let hover = -1, press = null; // press: { client: {x, y}, at: [x, y], last: [x, y], k, dragging }
  const draw = () => {
    g.clearRect(0, 0, W, H);
    model.shapes.forEach(({ s, color }, k) => {
      g.lineWidth = k === model.selected ? 3 : 1.5;
      g.strokeStyle = color;
      g.fillStyle = k === hover ? color + '66' : color + '22';
      g.beginPath();
      if (s.kind === 'circle') { g.arc(s.center[0], s.center[1], s.r, 0, 2 * Math.PI); g.fill(); g.stroke(); }
      else if (s.kind === 'triangle') { g.moveTo(...s.a); g.lineTo(...s.b); g.lineTo(...s.c); g.closePath(); g.fill(); g.stroke(); }
      else {
        g.strokeStyle = k === hover ? color : color + 'aa';
        g.lineWidth = 2 * s.tol; g.lineCap = 'round'; g.globalAlpha = k === hover ? 0.4 : 0.15;
        g.moveTo(...s.a); g.lineTo(...s.b); g.stroke(); g.globalAlpha = 1;
        g.beginPath(); g.lineWidth = k === model.selected ? 3 : 1.5; g.strokeStyle = color; g.moveTo(...s.a); g.lineTo(...s.b); g.stroke();
      }
    });
  };

  cv.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    press = { client: { x: e.clientX, y: e.clientY }, at: p, last: p, k: hitAt(p), dragging: false };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    const p = toCanvas(e);
    if (!press) { hover = hitAt(p); draw(); return; }
    // the drag state machine: pressed becomes dragging once YOUR rule says the pointer has moved far enough
    if (!press.dragging && safe(() => impl.classifyPointer(press.client, { x: e.clientX, y: e.clientY }), 'click') === 'drag') press.dragging = true;
    if (press.dragging && press.k >= 0) { move(model.shapes[press.k].s, p[0] - press.last[0], p[1] - press.last[1]); hover = press.k; }
    press.last = p;
    draw();
  });
  const release = (e) => {
    if (!press) return;
    const up = { x: e.clientX, y: e.clientY };
    const verdict = safe(() => impl.classifyPointer(press.client, up), '(threw)');
    const d = Math.hypot(up.x - press.client.x, up.y - press.client.y);
    if (verdict === 'click') model.selected = press.k;
    gesture([`moved  ${fmt(d, 2)} px`, `result ${JSON.stringify(verdict)}`, `under the press: ${press.k >= 0 ? model.shapes[press.k].name : 'nothing'}`,
      verdict === 'click' ? `selected: ${press.k >= 0 ? model.shapes[press.k].name : 'nothing'}` : press.dragging ? 'drag ended' : '']);
    press = null;
    draw();
  };
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', () => { press = null; draw(); });
  cv.addEventListener('pointerleave', () => { if (!press) { hover = -1; draw(); } });
  gesture(['press, then release or drag', 'a shape in the card']);
  draw();

  // ---- the loop: a fixed simulated frame rate, independent of the display's refresh
  const AIM_POS = [1.5, 0.6, 1.5];
  let angle = [0, 0, 0]; // the orbit angle rides in x; advance() moves it at 1 rad per second
  let acc = 0, last = performance.now();
  const tick = (now) => {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    const dt = 1 / model.fps;
    while (acc >= dt) { angle = safe(() => impl.advance(angle, [1, 0, 0], dt), angle); acc -= dt; }
    const tp = [2.2 * Math.cos(angle[0]), 1.2 + 0.4 * Math.sin(2 * angle[0]), 2.2 * Math.sin(angle[0])];
    target.position.set(...tp);
    const b = safe(() => impl.orientBasis(AIM_POS, tp, [0, 1, 0]), { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] });
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...b.x), new THREE.Vector3(...b.y), new THREE.Vector3(...b.z));
    m.setPosition(...AIM_POS);
    aim.matrix.copy(m);
    show([`dt   ${fmt(dt, 4)} s`, `orbit angle ${fmt(angle[0] % (2 * Math.PI), 3)} rad`, `x ${fmt(b.x, 3)}`, `y ${fmt(b.y, 3)}`, `z ${fmt(b.z, 3)}`]);
    sc.render();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
