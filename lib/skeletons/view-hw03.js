// view-hw03: the three-node arm twice. The boxes are placed ONLY from YOUR worldMatrices (Part B,
// no three.js parenting); the pink balls and sticks are YOUR toWorld of each node's origin (Part A,
// operators on points). When both parts are right, the balls sit at the boxes' origins. A bar is
// turned about its left end by YOUR pivotRotateZ, corner by corner.
import { SliderRow, Mat4Panel } from '../core/cockpit.js';
import { THREE, scene3d, readout, safe, fmt, ball, segment } from './view-common.js';

export const NAV = 'orbit';
export const HELP_HTML = `<h4>HW3</h4><p>The boxes are placed only by your <code>worldMatrices</code> (Part B):
<code>W_child = W_parent · L_child</code>. The pink balls are your <code>toWorld</code> of each node's origin (Part A).
Yawing the base must sweep all three; bending the arm must carry the hand; the balls must stay on the boxes'
origins. The purple bar turns about the yellow pivot with your <code>pivotRotateZ</code>; the pivot end must stay put.</p>
<p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>`;

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const ORIGIN = [0, 0, 0];
const PIV = [-2.4, 0.9, 1.2];                     // the bar's left end, the pivot
const BAR = [[0, -0.08, 0], [1.1, -0.08, 0], [1.1, 0.08, 0], [0, 0.08, 0]].map((c) => [PIV[0] + c[0], PIV[1] + c[1], PIV[2] + c[2]]);

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function make(shell, impl, I) {
  const sc = scene3d(shell, { eye: [3.5, 3, 5], target: [0, 0.8, 0] });
  const box = (w, h, d, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.7 }));
    const g = new THREE.Group(); g.add(m); g.matrixAutoUpdate = false; sc.scene.add(g);
    return { g, m };
  };
  const base = box(1.2, 0.4, 1.2, 0x5c8cff);
  const arm = box(0.25, 1.4, 0.25, 0x5cd47a);
  const hand = box(0.45, 0.25, 0.45, 0xffcf5c);
  hand.m.position.y = 0.12;                       // box geometry is centered; the hand's origin is its bottom
  const wp = ball(0xffffff, 0.06); wp.position.set(...I.worldPoint); sc.scene.add(wp);

  // Part A: each node's origin by YOUR toWorld, joined base to arm to hand, drawn over the boxes
  const dots = ['base', 'arm', 'hand'].map(() => onTop(new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), new THREE.MeshBasicMaterial({ color: 0xff5ca8 }))));
  const sticks = [onTop(segment(0xff5ca8)), onTop(segment(0xff5ca8))];
  function onTop(obj) {
    obj.material.depthTest = false;
    obj.material.transparent = true;              // drawn in the transparent pass, after the boxes
    obj.renderOrder = 10;
    sc.scene.add(obj);
    return obj;
  }

  // the pivot bar: four corners turned by YOUR pivotRotateZ, drawn as a closed outline
  const barGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Array(12).fill(0), 3));
  sc.scene.add(new THREE.LineLoop(barGeo, new THREE.LineBasicMaterial({ color: 0x8f7dff })));
  const pivot = ball(0xffcf5c, 0.06); pivot.position.set(...PIV); sc.scene.add(pivot);

  const pose = { ...I.pose };
  let barDeg = 30;
  const card = shell.addCard('Pose');
  new SliderRow(card, { id: 'hw3-base', label: 'baseRy', min: 0, max: 360, step: 1, value: pose.baseRy, format: (v) => `${v.toFixed(0)}°` }).onInput((v) => { pose.baseRy = v; update(); });
  new SliderRow(card, { id: 'hw3-bend', label: 'armBend', min: 0, max: 120, step: 1, value: pose.armBend, format: (v) => `${v.toFixed(0)}°` }).onInput((v) => { pose.armBend = v; update(); });
  new SliderRow(card, { id: 'hw3-hand', label: 'handRy', min: 0, max: 180, step: 1, value: pose.handRy, format: (v) => `${v.toFixed(0)}°` }).onInput((v) => { pose.handRy = v; update(); });
  new SliderRow(card, { id: 'hw3-bar', label: 'bar', min: -180, max: 180, step: 1, value: barDeg, format: (v) => `${v.toFixed(0)}°` }).onInput((v) => { barDeg = v; update(); });
  const panel = new Mat4Panel(shell.addCard('W_hand'));
  const show = readout(shell, 'Part A and Part B');

  function update() {
    const W = safe(() => impl.worldMatrices(pose), { base: IDENT, arm: IDENT, hand: IDENT });
    base.g.matrix.fromArray(W.base);
    arm.g.matrix.fromArray(W.arm);
    hand.g.matrix.fromArray(W.hand);
    panel.update(W.hand);

    const at = ['base', 'arm', 'hand'].map((n) => safe(() => impl.toWorld(pose, n, ORIGIN), ORIGIN));
    at.forEach((p, i) => dots[i].position.set(...p));
    sticks[0].set(at[0], at[1]);
    sticks[1].set(at[1], at[2]);

    const corners = BAR.map((c) => safe(() => impl.pivotRotateZ(c, PIV, barDeg), c));
    barGeo.attributes.position.array.set(corners.flat());
    barGeo.attributes.position.needsUpdate = true;

    const handB = [W.hand[12], W.hand[13], W.hand[14]];
    const localA = safe(() => impl.worldToNode(pose, 'hand', I.worldPoint), ORIGIN);
    const localB = safe(() => impl.worldToLocal(W.hand, I.worldPoint), ORIGIN);
    show([
      'hand origin in the world',
      ` A  ${fmt(at[2], 3)}`,
      ` B  ${fmt(handB, 3)}`,
      ` A to B  ${fmt(dist(at[2], handB), 4)}`,
      '(0, 1, 0) in the hand frame',
      ` A  ${fmt(localA, 3)}`,
      ` B  ${fmt(localB, 3)}`,
    ]);
    sc.render();
  }
  update();
}
