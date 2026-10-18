// view-hw02: EX1 to EX6, all drawn from YOUR functions.
// P moves up and down through the plane (EX3, EX4 color and shadow); the segment P -> P2
// crosses it (EX5 hit and reflection); a point circles the cylinder (EX6).
import { SliderRow } from '../core/cockpit.js';
import { THREE, scene3d, readout, safe, fmt, arrow, setArrow, ball, segment } from './view-common.js';

export const NAV = 'orbit';
export const HELP_HTML = `<h4>HW2</h4><p>The white square is the plane through (1, 0, 0) with normal (1, 2, 2).
Drag <b>Py</b>: P turns green on the normal's side and red behind (your <code>signedDistance</code>), its
shadow rides the plane (<code>shadowOnPlane</code>), and the segment to P2 is cut at your
<code>linePlaneHit</code> and reflected with your <code>reflect</code>. Drag <b>angle</b>: a point circles the
blue cylinder and lands on it at your <code>projectToCylinder</code>, blue when its foot is within the
half-height and red past the ends.</p>
<p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>`;

export function make(shell, impl, I) {
  const sc = scene3d(shell, { eye: [6, 5, 8], target: [1, 0.5, 0] });
  const S = sc.scene;
  const pl = safe(() => impl.planeFromPoint(I.plane.m, I.plane.q), { n: [0, 1, 0], D: 0 });

  const planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshStandardMaterial({ color: 0xdddddd, side: THREE.DoubleSide, transparent: true, opacity: 0.35 }));
  const n = new THREE.Vector3(...pl.n).normalize();
  planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  planeMesh.position.copy(n.clone().multiplyScalar(pl.D));
  S.add(planeMesh);
  const nArrow = arrow(0xffffff); setArrow(nArrow, pl.n.map((x) => x * pl.D), pl.n); S.add(nArrow);

  const P = ball(0x00e58a, 0.1), shadow = ball(0xaaaaaa, 0.07), hitBall = ball(0xffcf5c, 0.08), P2 = ball(0x8b93a7, 0.07);
  S.add(P, shadow, hitBall, P2);
  P2.position.set(...I.P2);
  const drop = segment(0x8b93a7), seg = segment(0xe7eaf0), refl = segment(0xffcf5c);
  S.add(drop, seg, refl);

  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(I.cyl.radius, I.cyl.radius, 2 * I.cyl.halfHeight, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x5c8cff, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  cyl.position.set(-2.5, 0, -1);
  S.add(cyl);
  const cp = ball(0x5c8cff, 0.06), cq = ball(0xffffff, 0.05); S.add(cp, cq);

  const model = { py: I.P[1], angle: 30 };
  const card = shell.addCard('Controls');
  new SliderRow(card, { id: 'hw2-py', label: 'Py', min: -3, max: 3, step: 0.05, value: model.py }).onInput((v) => { model.py = v; update(); });
  new SliderRow(card, { id: 'hw2-angle', label: 'angle', min: 0, max: 360, step: 1, value: model.angle, format: (v) => `${v.toFixed(0)}°` }).onInput((v) => { model.angle = v; update(); });
  const show = readout(shell, 'Your numbers');

  function update() {
    const p = [I.P[0], model.py, I.P[2]];
    P.position.set(...p);
    const sd = safe(() => impl.signedDistance(pl.n, pl.D, p), 0);
    P.material.color.set(sd > 0 ? 0x00e58a : 0xff6b6b);
    const sh = safe(() => impl.shadowOnPlane(pl.n, pl.D, p), p);
    shadow.position.set(...sh);
    drop.set(p, sh);
    const hit = safe(() => impl.linePlaneHit(pl.n, pl.D, p, I.P2), null);
    seg.set(p, I.P2);
    hitBall.visible = refl.visible = !!hit;
    let r = null;
    if (hit) {
      hitBall.position.set(...hit);
      const d = [I.P2[0] - p[0], I.P2[1] - p[1], I.P2[2] - p[2]], l = Math.hypot(...d);
      r = safe(() => impl.reflect(d.map((x) => x / l), pl.n), null);
      if (r) refl.set(hit, [hit[0] + 2 * r[0], hit[1] + 2 * r[1], hit[2] + 2 * r[2]]); else refl.visible = false;
    }
    // EX6: a point circling the cylinder, at the slider's height
    const th = (model.angle * Math.PI) / 180;
    const q = [cyl.position.x + 1.1 * Math.cos(th), model.py * 0.6, cyl.position.z + 1.1 * Math.sin(th)];
    cq.position.set(...q);
    const pc = safe(() => impl.projectToCylinder(q, cyl.position.toArray(), [0, 1, 0], I.cyl.radius, I.cyl.halfHeight), { point: q, inside: false });
    cp.position.set(...pc.point);
    cp.material.color.set(pc.inside ? 0x5c8cff : 0xff6b6b);
    show([
      `plane n ${fmt(pl.n, 3)}  D ${fmt(pl.D, 3)}`,
      `P ${fmt(p, 3)}  side ${fmt(sd, 3)}`,
      `shadow ${fmt(sh, 3)}`,
      `hit ${fmt(hit, 3)}`,
      `reflected ${fmt(r, 3)}`,
      `cylinder ${fmt(pc.point, 3)} ${pc.inside ? 'inside' : 'outside'}`,
    ]);
    sc.render();
  }
  update();
}
