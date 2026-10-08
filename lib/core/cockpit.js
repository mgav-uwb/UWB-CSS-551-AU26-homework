// Cockpit UI core: Mat4Panel (4x4) / Mat3Panel (3x3) matrix readouts +
// SliderRow (labeled range input) + ButtonRow (labeled option-button group,
// e.g. the model selector) + the small shared DOM builders
// (makeCard/makeButton/makeRow/bindNumberField) every demo-shell rail uses.
// Vanilla DOM, no framework, no rAF. Displays are the only state.

/** makeCard(parent, title) -> cardEl: a titled .demo-shell-card in the rail. */
export function makeCard(parent, title) {
  const card = document.createElement('div');
  card.className = 'demo-shell-card';
  const h = document.createElement('h3');
  h.textContent = title;
  card.appendChild(h);
  parent.appendChild(card);
  return card;
}

/** makeButton(parent, label, onClick) -> buttonEl (.demo-shell-btn). */
export function makeButton(parent, label, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'demo-shell-btn';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  parent.appendChild(btn);
  return btn;
}

/** makeRow(parent) -> rowEl (.demo-shell-row): a flex row of buttons/fields. */
export function makeRow(parent) {
  const row = document.createElement('div');
  row.className = 'demo-shell-row';
  parent.appendChild(row);
  return row;
}

/**
 * bindNumberField(container, {label, decimals, getCurrent, apply, title}): a
 * labeled, validated <input type=text> "type-exact" number box (deliberately
 * NOT a range slider: the demo keeps exactly one input[type=range], its
 * primary parameter). On change (blur, or Enter via an explicit blur()) it
 * parses the text as a float: non-finite reverts to getCurrent() (no
 * partial/garbage state ever reaches the model); otherwise apply(parsed) runs
 * (it owns any clamping and the redraw), and the field redisplays
 * getCurrent() (post-clamp). Returns a `show()` refresher so callers that
 * change the model out from under the field (Home, viewpoint restore, a
 * live rAF loop) can force a resync. Optional `title` sets a native tooltip.
 */
export function bindNumberField(container, { label, decimals = 0, getCurrent, apply, title }) {
  const row = document.createElement('label');
  row.className = 'demo-shell-field';
  if (title) row.title = title;
  const span = document.createElement('span');
  span.className = 'demo-shell-field-label';
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.className = 'demo-shell-field-input';
  row.appendChild(span);
  row.appendChild(input);
  container.appendChild(row);

  const show = () => { input.value = getCurrent().toFixed(decimals); };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  input.addEventListener('change', () => {
    const raw = parseFloat(input.value);
    if (Number.isFinite(raw)) apply(raw);
    show(); // whether accepted (now-clamped value) or rejected (revert)
  });
  show();
  return show;
}

/**
 * bindToggleField(container, {label, title, getCurrent, apply}): a labeled
 * checkbox for a boolean "⚙" display option (grid on/off, axes on/off,
 * wireframe, labels...). A checkbox is not an input[type=range], so it never
 * affects the "exactly one range input per demo" invariant. apply(bool) owns
 * the redraw. Returns a show() refresher.
 */
export function bindToggleField(container, { label, title, getCurrent, apply }) {
  const row = document.createElement('label');
  row.className = 'demo-shell-field demo-shell-field--toggle';
  if (title) row.title = title;
  const span = document.createElement('span');
  span.className = 'demo-shell-field-label';
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'demo-shell-field-check';
  row.appendChild(span);
  row.appendChild(input);
  container.appendChild(row);

  const show = () => { input.checked = !!getCurrent(); };
  input.addEventListener('change', () => { apply(input.checked); show(); });
  show();
  return show;
}

/**
 * SquareMatPanel(container, {size, rowClasses}): shared scaffold behind
 * Mat4Panel and Mat3Panel (a prior review flagged growing this duplication a
 * third time, so both wrappers below share one table-building/update path).
 * Renders a size x size table in ROW-MAJOR reading order from a column-major
 * size^2-array: displayed row i, col j = colMajorN[j*size + i]. rowClasses[i]
 * is applied to table row i.
 */
class SquareMatPanel {
  constructor(container, { size, rowClasses }) {
    this.size = size;
    this.table = document.createElement('table');
    this.table.className = 'mat-panel';
    this.cells = [];

    const tbody = document.createElement('tbody');
    for (let i = 0; i < size; i++) {
      const tr = document.createElement('tr');
      tr.className = rowClasses[i] ?? '';
      const rowCells = [];
      for (let j = 0; j < size; j++) {
        const td = document.createElement('td');
        td.dataset.r = String(i);
        td.dataset.c = String(j);
        td.textContent = (i === j ? 1 : 0).toFixed(2);
        tr.appendChild(td);
        rowCells.push(td);
      }
      tbody.appendChild(tr);
      this.cells.push(rowCells);
    }
    this.table.appendChild(tbody);
    container.appendChild(this.table);
  }

  /** update(colMajorN): refresh all size^2 cells from a column-major array. */
  update(colMajorN) {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        this.cells[i][j].textContent = colMajorN[j * n + i].toFixed(2);
      }
    }
  }
}

/** Mat4Panel(container, {rowClasses=[row-u,row-v,row-w,row-h]}): a 4x4 SquareMatPanel. */
export class Mat4Panel extends SquareMatPanel {
  constructor(container, { rowClasses = ['row-u', 'row-v', 'row-w', 'row-h'] } = {}) {
    super(container, { size: 4, rowClasses });
  }
}

/** Mat3Panel(container, {rowClasses=[row-u,row-v,row-w]}): a 3x3 SquareMatPanel (e.g. a UV matrix). */
export class Mat3Panel extends SquareMatPanel {
  constructor(container, { rowClasses = ['row-u', 'row-v', 'row-w'] } = {}) {
    super(container, { size: 3, rowClasses });
  }
}

/**
 * ValueTable(container, {rows})
 * A generic scalar/vector readout table: reuses the .mat-panel look (same
 * class, so any generic "did a readout change" probe that targets
 * .mat-panel keeps working) but rows have a variable number of value
 * columns instead of Mat4Panel's fixed 4x4 grid. rows: array of
 *   { id, label, cols=1, className, format }
 * id is the update() key, label is the leading text cell, cols is how
 * many value cells the row has (e.g. 3 for a vector's x/y/z), className
 * colors the row (reuse row-u/row-v/row-w/row-h from lib.css), format
 * defaults to toFixed(2).
 */
export class ValueTable {
  constructor(container, { rows }) {
    this.table = document.createElement('table');
    this.table.className = 'mat-panel';
    this.cells = {};
    this.formats = {};

    const tbody = document.createElement('tbody');
    for (const r of rows) {
      const tr = document.createElement('tr');
      if (r.className) tr.className = r.className;

      const labelTd = document.createElement('td');
      labelTd.className = 'value-label';
      labelTd.textContent = r.label;
      tr.appendChild(labelTd);

      const cols = r.cols ?? 1;
      const tds = [];
      for (let i = 0; i < cols; i++) {
        const td = document.createElement('td');
        td.textContent = (0).toFixed(2);
        tr.appendChild(td);
        tds.push(td);
      }

      tbody.appendChild(tr);
      this.cells[r.id] = tds;
      this.formats[r.id] = r.format ?? ((v) => v.toFixed(2));
    }
    this.table.appendChild(tbody);
    container.appendChild(this.table);
  }

  /** update(id, value): value is a number, or an array for multi-column rows. */
  update(id, value) {
    const tds = this.cells[id];
    const fmt = this.formats[id];
    const vals = Array.isArray(value) ? value : [value];
    vals.forEach((v, i) => {
      if (tds[i]) tds[i].textContent = fmt(v);
    });
  }
}

/**
 * SliderRow(container, {id, label, min, max, step, value, format})
 * A labeled <input type=range> plus a live numeric readout.
 * .value getter reads the current numeric value; .onInput(fn) subscribes to
 * every input event (fn receives the current numeric value).
 */
export class SliderRow {
  constructor(container, { id, label, min = 0, max = 1, step = 0.01, value = 0, format }) {
    this._format = format ?? ((v) => v.toFixed(2));

    const row = document.createElement('div');
    row.className = 'slider-row';

    const labelEl = document.createElement('label');
    labelEl.className = 'slider-label';
    labelEl.htmlFor = id;
    labelEl.textContent = label;

    this.input = document.createElement('input');
    this.input.type = 'range';
    this.input.id = id;
    this.input.min = String(min);
    this.input.max = String(max);
    this.input.step = String(step);
    this.input.value = String(value);

    this.readout = document.createElement('span');
    this.readout.className = 'slider-readout';
    this.readout.textContent = this._format(this.value);

    row.appendChild(labelEl);
    row.appendChild(this.input);
    row.appendChild(this.readout);
    container.appendChild(row);

    this.input.addEventListener('input', () => {
      this.readout.textContent = this._format(this.value);
    });
  }

  get value() {
    return parseFloat(this.input.value);
  }

  onInput(fn) {
    this.input.addEventListener('input', () => fn(this.value));
  }
}

/**
 * ButtonRow(container, {id, label, options: [{value, label}...], value})
 * A labeled row of mutually-exclusive option buttons (the shared model
 * selector every S01 demo mounts in its rail): one <button class="btn-row-
 * btn"> per option, the pressed option carrying class 'on' + aria-pressed
 * ("true" on it, "false" on the rest: a screen reader gets the same
 * pressed/not-pressed signal the visual 'on' class conveys). Deliberately
 * NOT an <input type=range> or <select>: this is a discrete choice among
 * named options (which model to show), never the demo's "exactly one range
 * input" primary parameter (see bindNumberField's docstring for that
 * invariant; test-demos.mjs enforces it against the FIRST range input only).
 *
 * onChange(cb): cb(value) fires only on a user click. set(value):
 * programmatic select: updates the pressed button but never calls the
 * onChange callback (mirrors SliderRow leaving replay/restore callers to
 * drive the model directly, and ValueTable/Mat4Panel's update() not firing
 * anything either: displays here are driven, not drivers, unless a human
 * clicked). Every click blurs its button afterward: a focused button is
 * otherwise a keyboard trap for a reveal.js deck embed (the demo-shell embed
 * gate's whole point is preserving the deck's own arrow-key slide
 * navigation (see demo-shell.js's header comment) and a focused button
 * left in the rail would swallow the very next arrow key instead of letting
 * it bubble to reveal.js, exactly the failure bindNumberField's Enter
 * handler blurs away from the number field for).
 */
export class ButtonRow {
  constructor(container, { id, label, options, value }) {
    this._onChange = [];
    this._value = value;
    this._buttons = new Map(); // option value -> buttonEl

    const row = document.createElement('div');
    row.className = 'btn-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'slider-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const group = document.createElement('div');
    group.className = 'btn-row-group';
    row.appendChild(group);

    options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = `${id}-${i}`;
      btn.className = 'btn-row-btn';
      btn.textContent = opt.label;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        this._apply(opt.value);
        this._onChange.forEach((fn) => fn(opt.value));
        btn.blur(); // see class doc: never leave a rail button focus-trapped
      });
      group.appendChild(btn);
      this._buttons.set(opt.value, btn);
    });

    container.appendChild(row);
    this._apply(value);
  }

  /** _apply(value): move the 'on'/aria-pressed state; no callback (shared by set() and the click handler above, which fires its own callback after). */
  _apply(value) {
    this._value = value;
    for (const [v, btn] of this._buttons) {
      const on = v === value;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  get value() {
    return this._value;
  }

  onChange(fn) {
    this._onChange.push(fn);
  }

  /** set(value): programmatic select; updates pressed state, fires no callback. */
  set(value) {
    this._apply(value);
  }
}
