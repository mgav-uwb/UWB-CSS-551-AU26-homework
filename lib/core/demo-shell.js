// demo-shell: the shared "cockpit" chrome every demo mounts into; a scene-
// dominant layout (a large 3D/2D viewport + a compact right rail of cards),
// plus three always-available overlays anchored to the scene's corners:
//   • "?"  help panel:    per-demo orientation content (top-right)
//   • "⚙"  settings panel: per-demo view/nav knobs as validated number
//                            fields (top-right, left of "?")
//   • a controls legend:   a compact key-binding strip (top-left, sandbox
//                            only)
// and, for demos that navigate a 3D scene, the reveal.js-safe embed gate
// ("▶ Click to explore" until the presenter opts in, so an embedded slide
// keeps its arrow keys until then).
//
// This module owns ONLY the chrome. It does NOT own the renderer, camera,
// camera math, or the demo's model: the demo builds those and mounts its
// scene into shell.sceneEl and its cards into shell.addCard(...). The nav
// controller (fly-camera in gsplat, orbit-camera in the cockpit demos) is
// handed back via shell.setNavController(ctrl); the shell only decides WHEN it
// activates (immediately in the sandbox; on "explore" click in an embed) and
// restores the gate whenever it deactivates.
//
// Extracted from lib/demos/gsplat.js (which now consumes it) so all 12 demos
// share one chrome instead of each growing its own. The overlay classes
// (.demo-shell-help-*/.demo-shell-settings-*/.demo-shell-legend/.demo-shell-
// explore/.demo-shell-exit) are deliberately NOT scoped under .cockpit in
// lib.css so they still render in the bare embed-test fixtures (no .cockpit
// ancestor); the layout classes (.demo-shell-root/scene/rail/card/...) are.
import { makeCard, bindNumberField, bindToggleField } from './cockpit.js';

/**
 * makeShell(container, opts) -> shell
 *
 * opts:
 *   stage    'full' (sandbox: fills the page, nav persistent) | 'embed'
 *   help     { html }: innerHTML for the "?" panel body (a demo authors it).
 *            Omit to suppress the "?" button.
 *   settings [ { label, title?, decimals?, getCurrent, apply } ]"⚙" number
 *            fields (nav speeds, display toggles-as-0/1, etc). Empty/omitted
 *            suppresses the "⚙" button.
 *   legend   string: the top-left controls strip. Sandbox only; omit for none.
 *   nav      'orbit' | 'fly' | null: whether a nav controller will be handed
 *            back via setNavController (drives the embed gate + activation).
 *   pip      true → the scene area gets two stacked slots (a large `mainEl`
 *            and a small corner `insetEl`) with click-to-swap; the demo mounts
 *            content into each. The big slot is pointer-transparent so drags
 *            fall through to the nav controller (orbit always drives the
 *            observer, regardless of which slot is enlarged).
 *   onSwap   (swapped:boolean) => void; called after each swap so the demo
 *            can resize its renderers to the slots' new sizes.
 *
 * returns:
 *   rootEl, sceneEl, railEl   the layout nodes (rootEl already appended to
 *                             container; sceneEl is script-focusable)
 *   mainEl, insetEl           the PiP slots (null unless pip:true)
 *   isSwapped()               current swap state
 *   addCard(title) -> cardEl  a titled rail card
 *   setNavController(ctrl)    wire + activate the nav controller (ctrl must
 *                             expose activate()/deactivate()/onDeactivate)
 *   setLegend(str)            update the legend text
 *   openHelp()/openSettings() programmatic panel open (tests/help links)
 */
export function makeShell(container, { stage = 'embed', help, settings = [], legend, nav = null, pip = false, onSwap } = {}) {
  const isEmbed = stage !== 'full';

  const rootEl = document.createElement('div');
  rootEl.className = isEmbed ? 'demo-shell-root demo-shell-root--embed' : 'demo-shell-root';
  const sceneEl = document.createElement('div');
  sceneEl.className = isEmbed ? 'demo-shell-scene demo-shell-scene--embed' : 'demo-shell-scene';
  // Programmatically focusable (tabIndex=-1: script-focusable, not in the Tab
  // order) so a nav controller's blur-based auto-deactivate can fire: a bare
  // <div> can't 'blur' otherwise.
  sceneEl.tabIndex = -1;
  sceneEl.style.outline = 'none';
  const railEl = document.createElement('div');
  railEl.className = isEmbed ? 'demo-shell-rail demo-shell-rail--embed' : 'demo-shell-rail';
  rootEl.appendChild(sceneEl);
  rootEl.appendChild(railEl);
  container.appendChild(rootEl);

  // --- Picture-in-picture: two stacked slots inside the scene area; a large
  // `mainEl` and a small corner `insetEl`, with click-to-swap. The demo
  // mounts content into each; the shell owns only layout + the swap toggle.
  // Layered BELOW the ?/gear/legend overlays (z-index): the big slot is
  // pointer-events:none so a drag over it falls through to sceneEl and the nav
  // controller orbits the observer no matter which slot is enlarged; the small
  // slot captures clicks to swap.
  let mainEl = null;
  let insetEl = null;
  let swapped = false;
  if (pip) {
    mainEl = document.createElement('div');
    insetEl = document.createElement('div');
    const badge = document.createElement('div');
    badge.className = 'demo-shell-pip-swap';
    badge.textContent = '⇄';
    badge.title = 'Swap views';
    const applySwap = () => {
      mainEl.className = 'demo-shell-pip-slot ' + (swapped ? 'demo-shell-pip-slot--small' : 'demo-shell-pip-slot--big');
      insetEl.className = 'demo-shell-pip-slot ' + (swapped ? 'demo-shell-pip-slot--big' : 'demo-shell-pip-slot--small');
      (swapped ? mainEl : insetEl).appendChild(badge); // badge rides the small slot
    };
    const doSwap = () => { swapped = !swapped; applySwap(); if (typeof onSwap === 'function') onSwap(swapped); };
    // Clicking the SMALL slot (whichever it currently is) swaps it to large.
    mainEl.addEventListener('click', (e) => { if (swapped) { e.stopPropagation(); doSwap(); } });
    insetEl.addEventListener('click', (e) => { if (!swapped) { e.stopPropagation(); doSwap(); } });
    badge.addEventListener('mousedown', (e) => e.stopPropagation());
    sceneEl.appendChild(mainEl);
    sceneEl.appendChild(insetEl);
    applySwap();
  }

  // --- Overlays live inside sceneEl (position:absolute against it), so they
  // add nothing to slide scrollHeight and never disturb the rail layout.

  // Two panels, mutually exclusive: opening one closes the other. Both use the
  // same closeable-panel idiom: a "×" close, click-outside-to-close, and a
  // capture-phase Esc that STOPS the event whenever the panel is open so that
  // Esc can never also reach a nav controller's own Esc handling.
  let setHelpOpen = () => {};
  let setSettingsOpen = () => {};

  // "?" help button + panel.
  if (help && help.html) {
    const helpBtn = document.createElement('button');
    helpBtn.type = 'button';
    helpBtn.className = 'demo-shell-help-btn';
    helpBtn.textContent = '?';
    helpBtn.setAttribute('aria-label', 'About this demo');
    sceneEl.appendChild(helpBtn);

    const helpPanel = document.createElement('div');
    helpPanel.className = 'demo-shell-help-panel';
    helpPanel.style.display = 'none';
    helpPanel.setAttribute('role', 'dialog');
    helpPanel.setAttribute('aria-label', 'About this demo');
    helpPanel.innerHTML = `<button type="button" class="demo-shell-help-panel-close" aria-label="Close">×</button>${help.html}`;
    sceneEl.appendChild(helpPanel);

    let open = false;
    setHelpOpen = (v) => {
      open = v;
      helpPanel.style.display = v ? '' : 'none';
      helpPanel.setAttribute('aria-hidden', v ? 'false' : 'true');
      if (v) setSettingsOpen(false);
    };
    setHelpOpen(false);

    helpBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    helpPanel.addEventListener('mousedown', (e) => e.stopPropagation());
    helpBtn.addEventListener('click', (e) => { e.stopPropagation(); setHelpOpen(!open); });
    helpPanel.querySelector('.demo-shell-help-panel-close')
      .addEventListener('click', (e) => { e.stopPropagation(); setHelpOpen(false); });
    document.addEventListener('mousedown', (e) => {
      if (!open) return;
      if (helpPanel.contains(e.target) || e.target === helpBtn) return;
      setHelpOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (open && e.key === 'Escape') { setHelpOpen(false); e.stopPropagation(); }
    }, true);
  }

  // "⚙" settings button + panel (only if there are fields to show).
  if (settings.length > 0) {
    const settingsBtn = document.createElement('button');
    settingsBtn.type = 'button';
    settingsBtn.className = 'demo-shell-settings-btn';
    settingsBtn.textContent = '⚙';
    settingsBtn.setAttribute('aria-label', 'Settings');
    sceneEl.appendChild(settingsBtn);

    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'demo-shell-settings-panel';
    settingsPanel.style.display = 'none';
    settingsPanel.setAttribute('role', 'dialog');
    settingsPanel.setAttribute('aria-label', 'Settings');
    settingsPanel.innerHTML = '<button type="button" class="demo-shell-settings-panel-close" aria-label="Close">×</button><h4>Settings</h4>';
    const fieldsEl = document.createElement('div');
    fieldsEl.className = 'demo-shell-settings-fields';
    settingsPanel.appendChild(fieldsEl);
    const hint = document.createElement('p');
    hint.className = 'demo-shell-settings-panel-hint';
    hint.textContent = 'Esc, ×, or click outside to close.';
    settingsPanel.appendChild(hint);
    sceneEl.appendChild(settingsPanel);

    for (const f of settings) (f.toggle ? bindToggleField : bindNumberField)(fieldsEl, f);

    let open = false;
    setSettingsOpen = (v) => {
      open = v;
      settingsPanel.style.display = v ? '' : 'none';
      settingsPanel.setAttribute('aria-hidden', v ? 'false' : 'true');
      if (v) setHelpOpen(false);
    };
    setSettingsOpen(false);

    settingsBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    settingsPanel.addEventListener('mousedown', (e) => e.stopPropagation());
    settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); setSettingsOpen(!open); });
    settingsPanel.querySelector('.demo-shell-settings-panel-close')
      .addEventListener('click', (e) => { e.stopPropagation(); setSettingsOpen(false); });
    document.addEventListener('mousedown', (e) => {
      if (!open) return;
      if (settingsPanel.contains(e.target) || e.target === settingsBtn) return;
      setSettingsOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (open && e.key === 'Escape') { setSettingsOpen(false); e.stopPropagation(); }
    }, true);
  }

  // Controls legend: sandbox only (the embed teaser stays clean/slide-safe).
  let legendEl = null;
  if (legend && stage === 'full') {
    legendEl = document.createElement('div');
    legendEl.className = 'demo-shell-legend';
    legendEl.textContent = legend;
    sceneEl.appendChild(legendEl);
  }

  // Embed gate DOM (only when this demo has nav AND is embedded). The activate
  // handler is wired in setNavController once the controller exists.
  let exploreBtn = null;
  let exitChip = null;
  if (nav && isEmbed) {
    exploreBtn = document.createElement('button');
    exploreBtn.type = 'button';
    exploreBtn.className = 'demo-shell-explore';
    exploreBtn.textContent = '▶ Click to explore';
    sceneEl.appendChild(exploreBtn);

    exitChip = document.createElement('div');
    exitChip.className = 'demo-shell-exit';
    exitChip.textContent = 'Exit: Esc';
    exitChip.style.display = 'none';
    sceneEl.appendChild(exitChip);
  }

  function setNavController(ctrl) {
    if (!ctrl) return;
    if (stage === 'full') {
      // A full-page cockpit has no reveal.js keys to protect: activate now,
      // nav is persistent for the session.
      ctrl.activate();
      return;
    }
    if (!exploreBtn) return; // nav:null demo, nothing to gate
    exploreBtn.addEventListener('click', () => {
      ctrl.activate();
      exploreBtn.style.display = 'none';
      if (exitChip) exitChip.style.display = '';
    });
    // Restore the gate whenever nav turns off for ANY reason (explicit Esc, or
    // the controller's own auto-deactivate on scene blur / tab hide).
    const prev = ctrl.onDeactivate;
    ctrl.onDeactivate = () => {
      if (typeof prev === 'function') prev();
      exploreBtn.style.display = '';
      if (exitChip) exitChip.style.display = 'none';
    };
  }

  return {
    rootEl,
    sceneEl,
    railEl,
    mainEl,
    insetEl,
    isSwapped: () => swapped,
    addCard: (title) => makeCard(railEl, title),
    setNavController,
    setLegend: (str) => { if (legendEl) legendEl.textContent = str; },
    openHelp: () => setHelpOpen(true),
    openSettings: () => setSettingsOpen(true),
  };
}
