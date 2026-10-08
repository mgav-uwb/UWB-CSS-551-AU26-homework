// orbit-camera: the shared free-look controller for the cockpit demos' three.js
// PerspectiveCamera scenes. Built on the same hand-built fly-math.js core as
// gsplat, but in ORBIT mode (the natural feel for inspecting an object at a
// fixed look-at point):
//   • drag:         grab and turn the scene (the camera orbits the other way, so
//                   the scene follows the hand, like grabbing a physical object)
//   • wheel:        dolly the eye toward/away from the target (zoom)
//   • WASD:         fly the whole rig forward, left, back, right
//   • Up/Down arrows (or Space/Ctrl): fly up/down, so WASD plus the arrows is a
//                   full 3D fly-through
//   • Q/E:          roll
//   • H:            home: restore the demo's framed default view
//
// Render-on-demand is preserved: a requestAnimationFrame loop runs ONLY while a
// movement key is held (WASD/Q/E/Space/Ctrl), and stops on keyup/deactivate; a
// single drag or wheel event renders exactly once. So an idle cockpit demo
// burns no GPU, exactly as before this controller existed.
//
// State: { target, distance, yaw, pitch, roll }. The eye is DERIVED each frame
// as target - distance * forward(yaw,pitch,roll); the camera then looks at the
// target with the basis's up (so roll works). Translating the rig moves the
// target (and the derived eye follows), so WASD flies the whole view.
import { camBasis, clampPitch, moveEye, poseLookingAt } from './fly-math.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * makeOrbitCamera(opts) -> controller
 *
 * opts:
 *   camera     a THREE.PerspectiveCamera (or any object exposing
 *              position.set(x,y,z), up.set(x,y,z), lookAt(x,y,z))
 *   render     () => void: re-render the scene (called after every camera move)
 *   home       { eye:[x,y,z], target:[x,y,z] }; the demo's framed default; the
 *              controller derives distance/yaw/pitch from it (roll 0)
 *   sceneEl    the focusable scene element (drag/wheel/blur target); optional in
 *              tests (event wiring is skipped when absent)
 *   container  the demo host element (its dataset.demoNav reflects nav state)
 *   stage      'full' | 'embed': embed scopes the blur/Esc/visibility teardown
 *   settings   optional overrides for { orbitSpeed, zoomSpeed, moveSpeed, rollRate,
 *              minDistance, maxDistance }
 *
 * returns { activate, deactivate, active, onDeactivate, home, getState, setState,
 *           settings, orbit, zoom, translate, roll }: the orbit/zoom/translate/
 *           roll methods mutate state + re-render (also the test surface).
 */
export function makeOrbitCamera({ camera, render, home: homeView, sceneEl, container, stage = 'embed', settings = {} } = {}) {
  // Use the caller's settings object BY REFERENCE (filling any missing defaults
  // in place) so a demo's "⚙" number fields can read/write the same live
  // object and have edits take effect immediately, not a detached copy.
  const s = settings;
  s.orbitSpeed ??= 0.4; // deg per px of drag
  s.zoomSpeed ??= 0.12; // fraction of distance per wheel notch
  s.moveSpeed ??= 3; // units per second, WASD held
  s.rollRate ??= 60; // deg per second, Q/E held
  s.minDistance ??= 0.4;
  s.maxDistance ??= 60;

  // Initial state derived from the demo's framed default.
  const INIT = (() => {
    const { yaw, pitch } = poseLookingAt(homeView.eye, homeView.target);
    return { target: [...homeView.target], distance: dist(homeView.eye, homeView.target), yaw, pitch, roll: 0 };
  })();
  const st = { target: [...INIT.target], distance: INIT.distance, yaw: INIT.yaw, pitch: INIT.pitch, roll: INIT.roll };

  // applyCam(): the ONE place st -> camera. eye is derived; the camera looks at
  // the target with the basis up (roll included).
  function applyCam() {
    const { forward, up } = camBasis(st.yaw, st.pitch, st.roll);
    const eye = [
      st.target[0] - st.distance * forward[0],
      st.target[1] - st.distance * forward[1],
      st.target[2] - st.distance * forward[2],
    ];
    camera.position.set(eye[0], eye[1], eye[2]);
    camera.up.set(up[0], up[1], up[2]);
    camera.lookAt(st.target[0], st.target[1], st.target[2]);
  }

  // --- Public state mutators (also the unit-test surface) ---
  function orbit(dx, dy) {
    // Grab-and-turn: drag right (dx>0) turns the scene right, so the camera
    // orbits left; drag down (dy>0) tips the scene's top toward you, so the camera
    // rises to look down. Distance is untouched: a pure rotation about the target.
    st.yaw += dx * s.orbitSpeed;
    st.pitch = clampPitch(st.pitch - dy * s.orbitSpeed);
    applyCam();
    render();
  }
  function zoom(notches) {
    // notches>0 = zoom out (wheel down). Multiplicative so each notch feels the
    // same at any distance; clamped so the camera can't cross the target or fly
    // off to infinity.
    st.distance = clamp(st.distance * (1 + notches * s.zoomSpeed), s.minDistance, s.maxDistance);
    applyCam();
    render();
  }
  function translate(dRight, dUp, dForward) {
    // Fly the rig: move the target along the camera basis; the derived eye
    // follows, so the whole view translates.
    const basis = camBasis(st.yaw, st.pitch, st.roll);
    st.target = moveEye(st.target, basis, dRight, dUp, dForward);
    applyCam();
    render();
  }
  function roll(delta) {
    st.roll += delta;
    applyCam();
    render();
  }
  function home() { setState(INIT); }
  function getState() { return { target: [...st.target], distance: st.distance, yaw: st.yaw, pitch: st.pitch, roll: st.roll }; }
  function setState(next) {
    st.target = [...next.target];
    st.distance = next.distance;
    st.yaw = next.yaw;
    st.pitch = next.pitch;
    st.roll = next.roll;
    applyCam();
    render();
  }

  // --- InputController: WASD/Q/E/Space/Ctrl (rAF-while-held) + drag orbit +
  // wheel zoom. Same discipline as gsplat's fly controller: editable-target
  // bailout, modified-movement passthrough, embed-only blur/Esc/visibility
  // teardown with a container.contains(relatedTarget) guard. No pointer lock
  // (drag is enough for object inspection).
  const HANDLED_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', ' ', 'control', 'arrowup', 'arrowdown']);
  const pressed = new Set();
  const keyOf = (e) => (e.key === ' ' ? ' ' : e.key.toLowerCase());
  const isEditable = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  const isModifiedMovementKey = (e, key) => key !== 'control' && (e.ctrlKey || e.metaKey || e.altKey);

  function onKeyDown(e) {
    if (isEditable(e.target)) return;
    const key = keyOf(e);
    if (key === 'escape') { if (stage !== 'full') deactivate(); return; }
    if (key === 'h' && !(e.ctrlKey || e.metaKey || e.altKey)) {
      home(); e.preventDefault(); e.stopPropagation(); return;
    }
    if (!HANDLED_KEYS.has(key)) return;
    if (isModifiedMovementKey(e, key)) return;
    pressed.add(key);
    startLoop(); // rAF runs ONLY while a movement key is held
    e.preventDefault();
    e.stopPropagation();
  }
  function onKeyUp(e) {
    if (isEditable(e.target)) return;
    const key = keyOf(e);
    if (!HANDLED_KEYS.has(key)) return;
    if (isModifiedMovementKey(e, key)) return;
    pressed.delete(key);
    e.preventDefault();
    e.stopPropagation();
  }

  // The rAF loop runs ONLY while a movement key is held: startLoop() kicks it
  // on the first keydown, and tick() stops it (rafId=null, no reschedule) the
  // moment nothing is pressed, so an idle cockpit demo keeps no live rAF,
  // preserving this project's render-on-demand rule.
  let rafId = null;
  let lastT = 0;
  function startLoop() {
    if (rafId != null) return;
    lastT = 0;
    rafId = requestAnimationFrame(tick);
  }
  function tick(t) {
    const dt = lastT ? (t - lastT) / 1000 : 0;
    lastT = t;
    if (pressed.size === 0) { rafId = null; return; } // nothing held -> stop
    const d = s.moveSpeed * dt;
    if (pressed.has('w')) translate(0, 0, d);
    if (pressed.has('s')) translate(0, 0, -d);
    if (pressed.has('d')) translate(d, 0, 0);
    if (pressed.has('a')) translate(-d, 0, 0);
    if (pressed.has(' ') || pressed.has('arrowup')) translate(0, d, 0);
    if (pressed.has('control') || pressed.has('arrowdown')) translate(0, -d, 0);
    if (pressed.has('q')) roll(s.rollRate * dt);
    if (pressed.has('e')) roll(-s.rollRate * dt);
    rafId = requestAnimationFrame(tick);
  }

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  function onMouseDown(e) {
    sceneEl.focus();
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onMouseMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    orbit(dx, dy);
  }
  function onMouseUp() { dragging = false; }
  function onMouseLeave() { dragging = false; }
  function onWheel(e) {
    e.preventDefault();
    zoom(Math.sign(e.deltaY));
  }
  function onSceneBlur(e) {
    if (stage === 'full') return;
    if (e && e.relatedTarget && container && container.contains(e.relatedTarget)) return;
    deactivate();
  }
  function onVisibilityChange() {
    if (stage === 'full') return;
    if (document.visibilityState === 'hidden') deactivate();
  }

  function activate() {
    if (controller.active || !sceneEl) return;
    controller.active = true;
    // capture on window: an active demo sees its keys before reveal.js (which binds
    // H, S, F and the arrows on document), and stopPropagation keeps them from it
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    sceneEl.addEventListener('mousedown', onMouseDown);
    sceneEl.addEventListener('mousemove', onMouseMove);
    sceneEl.addEventListener('mouseup', onMouseUp);
    sceneEl.addEventListener('mouseleave', onMouseLeave);
    sceneEl.addEventListener('wheel', onWheel, { passive: false });
    sceneEl.addEventListener('blur', onSceneBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    sceneEl.focus();
    // No rAF started here: startLoop() kicks it on the first movement keydown
    // and it self-stops when nothing is held (render-on-demand).
    if (container) container.dataset.demoNav = 'active';
  }
  function deactivate() {
    if (!controller.active) return;
    controller.active = false;
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    sceneEl.removeEventListener('mousedown', onMouseDown);
    sceneEl.removeEventListener('mousemove', onMouseMove);
    sceneEl.removeEventListener('mouseup', onMouseUp);
    sceneEl.removeEventListener('mouseleave', onMouseLeave);
    sceneEl.removeEventListener('wheel', onWheel);
    sceneEl.removeEventListener('blur', onSceneBlur);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    dragging = false;
    pressed.clear();
    if (container) container.dataset.demoNav = 'idle';
    if (typeof controller.onDeactivate === 'function') controller.onDeactivate();
  }

  if (container) container.dataset.demoNav = 'idle';
  applyCam(); // initial framing

  const controller = {
    active: false,
    onDeactivate: null,
    activate,
    deactivate,
    home,
    getState,
    setState,
    settings: s,
    orbit,
    zoom,
    translate,
    roll,
  };
  return controller;
}
