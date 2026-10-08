// view-common.js: small helpers the homework views share (a 3D scene with the orbit camera,
// a 2D panel pair, readout cards, and a guard so one bad return value never blanks a view).
import * as THREE from '../vendor/three.module.js';
import { makeScene } from '../core/scene-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { fmt } from './checks.js';

export { THREE, fmt };

export function scene3d(shell, home) {
  const sc = makeScene(shell.sceneEl, { fill: true });
  const cam = makeOrbitCamera({ camera: sc.camera, render: sc.render, home, sceneEl: shell.sceneEl, container: shell.rootEl, stage: 'full', settings: {} });
  shell.setNavController(cam);
  return sc;
}

// Two side-by-side 2D canvases in the scene pane, with captions.
export function panels2d(shell, specs) {
  const wrap = document.createElement('div');
  wrap.className = 'hw-2d';
  const out = specs.map(({ caption, w, h }) => {
    const box = document.createElement('div');
    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.textContent = caption;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.className = 'hw-canvas';
    box.appendChild(cap); box.appendChild(c);
    wrap.appendChild(box);
    return { canvas: c, ctx: c.getContext('2d'), cap };
  });
  shell.sceneEl.appendChild(wrap);
  return out;
}

// A rail card holding a monospace readout; returns set(lines).
export function readout(shell, title) {
  const card = shell.addCard(title);
  const pre = document.createElement('div');
  pre.className = 'hw-readout';
  card.appendChild(pre);
  return (lines) => { pre.textContent = lines.join('\n'); };
}

// Call a student function; on a throw or a non-finite result, return the fallback.
export function safe(fn, fallback) {
  try {
    const v = fn();
    const bad = (x) => (Array.isArray(x) ? x.some(bad) : typeof x === 'number' && !Number.isFinite(x));
    return v === undefined || bad(v) ? fallback : v;
  } catch {
    return fallback;
  }
}

export const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export function arrow(color) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 12), new THREE.MeshStandardMaterial({ color }));
  shaft.position.y = 0.5;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 16), new THREE.MeshStandardMaterial({ color }));
  tip.position.y = 1;
  g.add(shaft, tip);
  return g;
}

// Place an arrow from p along d (any length) with the arrow's length |d|.
export function setArrow(a, p, d) {
  const len = Math.hypot(d[0], d[1], d[2]);
  a.visible = len > 1e-9;
  if (!a.visible) return;
  a.position.set(p[0], p[1], p[2]);
  a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0] / len, d[1] / len, d[2] / len));
  a.scale.set(1, len, 1);
}

export function ball(color, r = 0.08) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshStandardMaterial({ color }));
}

export function segment(color) {
  const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
  line.set = (a, b) => { geo.attributes.position.array.set([...a, ...b]); geo.attributes.position.needsUpdate = true; line.visible = !!(a && b); };
  return line;
}
