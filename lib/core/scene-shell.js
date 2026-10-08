// Scene shell: a pre-dressed three.js scene for cockpit demos.
// Render-on-demand only, no requestAnimationFrame loop lives here or in any
// consumer; callers call render() explicitly after mutating the scene.
import * as THREE from '../vendor/three.module.js';

const BG = 0x0b0c10;

/**
 * makeScene(container, {width, height, fill}) -> { renderer, scene, camera,
 *                                                  render, grid, axes, resize }
 * - renderer: WebGLRenderer with preserveDrawingBuffer:true (pixel probes
 *   in browser tests read the canvas back via drawImage/getImageData, which
 *   requires the drawing buffer to survive past the frame).
 * - scene: dark background, GridHelper + AxesHelper on the ground plane,
 *   HemisphereLight + DirectionalLight. `grid`/`axes` are returned so a demo's
 *   "⚙" toggles can show/hide them.
 * - camera: PerspectiveCamera sized to the container; caller may reposition.
 * - render(): renders once. Never called automatically.
 * - resize(): re-read the container's TRUE on-screen size (getBoundingClientRect,
 *   which (unlike clientWidth/Height) reflects reveal.js's slide-fit zoom
 *   transform) and the drawing buffer to that size x devicePixelRatio, fix the
 *   camera aspect, then the caller renders. Wired to window resize AND (when
 *   `fill` is set) an IntersectionObserver on the container, so a demo built
 *   while its reveal slide is still display:none (initDeckDemos builds every
 *   [data-demo] host on the whole deck up front, long before the presenter
 *   reaches most of them) gets re-fit the instant it actually becomes
 *   visible instead of being stuck at makeScene's 400x300 fallback.
 *
 * fill:true sizes the renderer to container.clientWidth/Height at creation
 * (for a demo-shell scene pane that flexes to fill the page) and installs the
 * window-resize + IntersectionObserver handlers above; otherwise the fixed
 * width/height (default 400x300) is used, exactly as before, so any non-shell
 * caller is unaffected.
 */
export function makeScene(container, { width, height, fill = false } = {}) {
  const w = (fill ? container.clientWidth : width) || width || 400;
  const h = (fill ? container.clientHeight : height) || height || 300;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);

  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
  camera.position.set(3, 3, 6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  // Retina sharpness (root cause 2 of the C5 embed-resolution fix): cap at 2:
  // 3x on a 3-device-pixel-ratio phone would quadruple fragment-shader cost
  // for no visible gain on these small cockpit viewports.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  renderer.setClearColor(BG);
  container.appendChild(renderer.domElement);

  const grid = new THREE.GridHelper(10, 10, 0x3a4152, 0x262a35);
  scene.add(grid);

  const axes = new THREE.AxesHelper(2);
  scene.add(axes);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x24262b, 0.9);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 8, 4);
  scene.add(dir);

  function render() {
    renderer.render(scene, camera);
  }

  // resize(): re-fit the renderer + camera to the container's TRUE on-screen
  // size, then repaint (render-on-demand: nothing repaints on its own). Only
  // meaningful when the scene flexes: fill:true wires it to window resize
  // and the IntersectionObserver below.
  //
  // clientWidth/Height (not raw getBoundingClientRect): clientWidth is
  // content-box (exactly the area the canvas actually fills) but blind to
  // an ancestor CSS transform (reveal.js scales the whole slide to fit the
  // viewport), so on its own it reports the deck's LOGICAL slide size, not
  // the ACTUAL on-screen size the buffer needs to match device pixels 1:1
  // (root cause 3). getBoundingClientRect() IS transform-aware, but it's
  // border-box: for a container with any CSS border (e.g. .demo-shell-scene's
  // 1px), using it directly overstates the content area by 2x the border
  // width, shifting every subsequent pixel by a fraction of a device pixel.
  // (Caught empirically: it silently flipped uv-placement's min/max slider
  // probe from a 2px antialiasing-noise diff to an exact 0, since that
  // demo's offU range is a true 1-tile-period wraparound, same rendered
  // image either way, so ANY shift in exact buffer dimensions can tip the
  // probe's byte-diff to zero.)
  //
  // Fix: scale clientWidth/Height (content-box, correct, transform-blind) by
  // the ratio between offsetWidth/Height (border-box, ALSO transform-blind)
  // and getBoundingClientRect() (border-box, transform-AWARE): that ratio
  // IS reveal's current zoom-fit scale factor, with the border-box framing
  // canceling out exactly. The result is content-box-accurate AND
  // transform-aware at once.
  //
  // setSize(nw, nh, false) (updateStyle:false): CSS keeps owning layout; the
  // deck's `[data-demo] canvas { height:...px !important; width:auto !important }`
  // rule (every session) always wins over any inline style we'd set anyway, so
  // writing one here would be redundant at best; leaving it alone also means a
  // post-transform (already-scaled) measurement never gets written back into
  // the pre-transform style box, which would double-apply the scale. Only the
  // drawing buffer changes, to nw*pixelRatio x nh*pixelRatio.
  //
  // Guard sizes < 2: the reveal slide (or an ancestor) may still be
  // display:none, e.g. a resize() reached via the window listener before
  // this container has ever become visible. Skip; the IntersectionObserver
  // below re-fits the instant it does.
  function resize() {
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const ow = container.offsetWidth;
    const oh = container.offsetHeight;
    if (cw < 2 || ch < 2 || ow < 1 || oh < 1) return;
    const rect = container.getBoundingClientRect();
    const nw = cw * (rect.width / ow);
    const nh = ch * (rect.height / oh);
    if (nw < 2 || nh < 2) return;
    renderer.setSize(nw, nh, false);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    render();
  }

  if (fill) {
    window.addEventListener('resize', resize);

    // Demos build while their reveal slide is display:none (initDeckDemos
    // builds every [data-demo] host in the whole deck right after
    // Reveal.initialize resolves, long before the presenter reaches most
    // slides): at that point getBoundingClientRect() is all-zero, so the
    // construction above falls back to 400x300, later stretched by CSS
    // (root cause 1). Re-fit the instant the container actually becomes
    // visible: first navigation to its slide in a deck, or immediately in
    // the sandbox where it's already visible at mount. IntersectionObserver
    // fires only on visibility-ratio CHANGES (not on every layout pass), and
    // resize() never changes the container's own visibility, so this cannot
    // retrigger itself.
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) resize();
        }
      });
      io.observe(container);
    }
  }

  return { renderer, scene, camera, render, grid, axes, resize };
}
