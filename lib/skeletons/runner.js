// runner.js: mounts one homework in homework/run.html. It loads the submission (the
// skeleton you edit, or a reference build), runs the homework's checks on it, prints them
// under the cockpit as a table (yours, expected, pass), and hands the cockpit shell to the
// homework's view (view-hwNN.js), which draws the scene from YOUR functions.
//
// Exposes window.__hwResults (the check rows) once everything has run, for the tests.
import { makeShell } from '../core/demo-shell.js';
import { HOMEWORK, runChecks, fmt } from './checks.js';
import { EXPECTED } from './expected.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export async function mountHomework(root, hwId, implUrl, label) {
  const hw = HOMEWORK[hwId];
  if (!hw) {
    root.innerHTML = `<p class="hw-msg">Unknown homework "${esc(hwId)}". Use run.html?hw=hw01 … hw08.</p>`;
    window.__hwResults = [];
    return;
  }
  document.title = `CSS 551 · ${hw.title}`;
  const head = document.createElement('div');
  head.className = 'hw-head';
  head.innerHTML = `<h1>${esc(hw.title)}</h1><span class="hw-impl">running: <code>${esc(label)}</code></span>`;
  root.appendChild(head);

  let impl;
  try {
    impl = await import(implUrl);
  } catch (e) {
    const p = document.createElement('p');
    p.className = 'hw-msg';
    p.textContent = `Could not load ${implUrl}: ${e.message}. A syntax error in your file shows up here; the browser console has the line number.`;
    root.appendChild(p);
    window.__hwResults = [];
    return;
  }

  const view = await import(`./view-${hwId}.js`);
  const shell = makeShell(root, { stage: 'full', help: { html: view.HELP_HTML }, nav: view.NAV ?? null });

  const checksEl = document.createElement('section');
  checksEl.className = 'hw-checks';
  root.appendChild(checksEl);

  const results = runChecks(hwId, impl, EXPECTED[hwId]);
  const score = results.reduce((a, r) => a + (r.pass ? r.points : 0), 0);
  checksEl.innerHTML = `
    <h2>Checks <span class="hw-score">${score} / 100 on the published inputs</span></h2>
    <table>
      <thead><tr><th></th><th>check</th><th>pts</th><th>yours</th><th>expected</th></tr></thead>
      <tbody>${results.map((r) => `
        <tr class="${r.pass ? 'pass' : 'fail'}">
          <td class="mark">${r.pass ? '✓' : '✗'}</td>
          <td>${esc(r.label)}</td>
          <td>${r.points}</td>
          <td class="num">${r.error ? `<span class="err">threw: ${esc(r.error)}</span>` : esc(fmt(r.got))}</td>
          <td class="num">${esc(fmt(r.want))}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p class="hw-note">Tolerances are per check (see the homework page). Grading also runs your
    functions on a second set of inputs that is not published, so the numbers have to come
    from the math, not from this table.</p>`;

  try {
    await view.make(shell, impl, hw.inputs);
  } catch (e) {
    const p = document.createElement('p');
    p.className = 'hw-msg';
    p.textContent = `The view stopped: ${e.message}. Usually one of your functions returned the wrong shape; the checks below still ran.`;
    shell.sceneEl.appendChild(p);
    console.warn(e);
  }
  window.__hwResults = results.map(({ id, pass, points }) => ({ id, pass, points }));
}
