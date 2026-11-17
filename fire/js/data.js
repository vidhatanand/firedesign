/* Fire data — tables, filters, key-values, meters, progress, data cards, pipelines.
 *
 * Markup contract (full class list in fire/components/data.css):
 *
 *  Table      <div class="fd-table-wrap"><div class="fd-table-scroll"><table class="fd-table">…</table></div>
 *             <div class="fd-table-foot">…</div><div class="fd-table-bulk" data-state="closed">…</div></div>
 *             A bare <table> directly inside the wrap is wrapped in .fd-table-scroll for you.
 *  Sort       <th aria-sort="none" data-sort-type="text|number|date"><button class="fd-th-sort">Credits</button></th>
 *             Cells may carry data-sort-value (an ISO date, a plain number) that wins over their text.
 *             Click toggles ascending and descending; sortTable(table, index, 'none') restores the original order. <table data-sort="server"> only emits.
 *  Select     <input class="fd-table-check" data-select-all> in the header and <input class="fd-table-check" data-select-row>
 *             in each row. Rows get aria-selected; the bulk bar (.fd-table-bulk) slides up with [data-bulk-count] filled in.
 *             Shift-click selects a range. Escape clears. [data-bulk-clear] clears. Row identity is tr[data-value] (or id).
 *  Expand     <button class="fd-table-expand" aria-expanded="false" aria-controls="detail-id"> and a following
 *             <tr class="fd-table-detail" id="detail-id" hidden>.
 *  Rows       tr[data-href] navigates on click or Enter (tabindex is added). Prefer a stretched .fd-table-link in markup.
 *  Stacked    <table data-stack>: data-label on each cell is filled in from the header text when missing.
 *             td|th[data-stack="hide"] is dropped, and [data-stack-only] inside a cell is shown, only while the table stacks.
 *  Actions    any [data-action] emits fd:select once per click (except buttons inside components that handle their own:
 *             messages, results, playgrounds, code, JSON and log toolbars). Inside a wrap: { action, value: selected values, row, wrap }.
 *             Anywhere else (a toolbar's "Clear filters"): { action, value: [], row: null, wrap: null }.
 *  Filters    .fd-filter[data-active][data-default="All endpoints"] with .fd-filter-value and .fd-filter-clear.
 *             .fd-filter-applied > .fd-filter-token (+ .fd-filter-token-remove) and [data-filter-clear-all].
 *  Key-value  .fd-kv-value[data-copy] (optionally data-copy="text to copy") gains a copy button.
 *  Meter      .fd-meter[data-value][data-max] (+ data-warn / data-danger thresholds, default 80 / 95, data-tone to force a tone).
 *             Segmented: .fd-meter-seg[data-value] children. .fd-meter-figure[data-auto] is filled "1,520 of 3,000 {data-unit}".
 *  Progress   .fd-progress[data-value][data-max][data-indeterminate][data-unit]; variants ring and steps.
 *  Data card  button.fd-data-card-toggle[aria-controls] reveals .fd-data-card-more.
 *  Pipeline   <div class="fd-pipeline" role="group" aria-label="Crawl crl_8f3a21 stages">
 *               <ol class="fd-pipeline-stages">
 *                 <li class="fd-pipeline-stage" [data-when="failure"]>
 *                   <p class="fd-pipeline-stage-label">Fetch</p>
 *                   <ul class="fd-pipeline-jobs">
 *                     <li><button class="fd-pipeline-job" type="button" data-value="fetch-2" data-tone="danger" [data-live]
 *                           [data-state="skipped"] [aria-current="true"]>
 *                       <i data-icon="circle-x"></i><span class="fd-pipeline-job-name">Worker 2</span>
 *                       <span class="fd-sr-only">Failed</span><span class="fd-pipeline-job-meta">12 s</span>
 *                     </button></li>
 *                   </ul>
 *                 </li>
 *               </ol>
 *             </div>
 *             A job is a <button> (selects), an <a href> (navigates) or a <span> (only shows). One tab stop: Tab lands on
 *             the current job or the first; Arrow Right/Left go to the next/previous stage (same row, clamped), Up/Down
 *             within a stage, Home/End to the first/last job; when vertical, Up/Down walk every job in order.
 *             Clicking a button job moves aria-current="true" to it unless the pipeline has data-fd-pipeline="manual".
 *             The pipeline scrolls sideways inside itself and keeps the current job in view; data-overflow marks
 *             the sides with more stages. aria-busy="true" shows every job and label as a placeholder.
 *
 * Events (bubbling, from the element that changed):
 *   fd:change  table  { source: 'selection', value, selected, rows }       value is an array of row values
 *   fd:change  table  { source: 'sort', value: { key, index, direction }, sort }   direction: ascending | descending | none
 *   fd:change  .fd-filter  { source: 'filter', value, filter }              value is null when cleared
 *   fd:change  .fd-filter-applied  { source: 'filters', value: [{ key, value }] }
 *   fd:select  wrap   { action, value, row }                                  bulk, empty and error action buttons
 *   fd:select  tr     { action: 'open', href, row }                           data-href rows (cancelable: preventDefault stops navigation)
 *   fd:open / fd:close  .fd-data-card-toggle  { target }
 *   fd:select  .fd-pipeline-job  { value, item }                            value is the job's data-value; cancelable:
 *                                                                            preventDefault keeps aria-current where it was, or stops a link
 *
 * API: init(root), selection(table), clearSelection(table), sortTable(table, index, direction),
 *      setFilter(chip, value), setMeter(el, value, max), setProgress(el, value, max), selectJob(pipeline, value).
 */
import { $$, on, once, emit, copyText } from './core.js';
import { icon } from './icons.js';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const BODY_ROWS = ':scope > tbody > tr:not(.fd-table-detail):not(.fd-table-state):not([data-skeleton])';

/* ------------------------------------------------------------------ helpers */

const tablesIn = (root) => [...(root.matches?.('.fd-table') ? [root] : []), ...$$('.fd-table', root)];
const matchesIn = (root, sel) => [...(root.matches?.(sel) ? [root] : []), ...$$(sel, root)];
const wrapOf = (table) => table.closest('.fd-table-wrap');
const bodyRows = (table) => [...table.querySelectorAll(BODY_ROWS)].filter((tr) => tr.closest('table') === table);
const visibleRows = (table) => bodyRows(table).filter((tr) => !tr.hidden);
const rowCheck = (tr) => tr.querySelector('input[data-select-row]');
const rowValue = (tr, index) => tr.dataset.value ?? (tr.id || String(index));
const fmt = (n) => number.format(n);

/* ------------------------------------------------------------------ table: setup */

function setupTable(table) {
  if (!once(table, 'fd-table')) return;
  const wrap = wrapOf(table);
  let scroller = table.parentElement?.classList.contains('fd-table-scroll') ? table.parentElement : null;
  if (!scroller && wrap && table.parentElement === wrap) {
    scroller = document.createElement('div');
    scroller.className = 'fd-table-scroll';
    table.replaceWith(scroller);
    scroller.append(table);
  }
  if (scroller) watchOverflow(scroller, table);
  syncLabels(table);
  bodyRows(table).forEach((tr) => {
    if (tr.dataset.href && !tr.hasAttribute('tabindex')) tr.tabIndex = 0;
    const check = rowCheck(tr);
    if (!check) return;
    if (check.checked || tr.getAttribute('aria-selected') === 'true') setRowSelected(tr, true);
    else tr.setAttribute('aria-selected', 'false');
  });
  $$('.fd-table-expand', table).forEach((button) => syncExpand(button));
  syncSelection(table, { silent: true });
}

/** Fill data-label on cells from header text, for the stacked phone layout. */
function syncLabels(table) {
  const head = table.querySelector(':scope > thead > tr:last-child');
  if (!head) return;
  const labels = [];
  [...head.children].forEach((th) => {
    const span = th.colSpan || 1;
    const text = (th.dataset.label ?? th.textContent).replace(/\s+/g, ' ').trim();
    for (let i = 0; i < span; i++) labels.push(i === 0 ? text : '');
  });
  bodyRows(table).forEach((tr) => {
    let column = 0;
    [...tr.children].forEach((td) => {
      const label = labels[column] || '';
      column += td.colSpan || 1;
      if (td.hasAttribute('data-label') || td.hasAttribute('data-stack-title')) return;
      if (td.hasAttribute('data-actions') || td.hasAttribute('data-select') || td.hasAttribute('data-expand')) return;
      if (label) td.setAttribute('data-label', label);
    });
  });
}

/** Mark which sides of a scroller hold more content, and keep empty states centred in the visible width. */
function watchOverflow(scroller, table) {
  let written = '';
  const update = () => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    const left = Math.abs(scroller.scrollLeft);
    const state = max <= 1 ? null : left <= 1 ? 'end' : left >= max - 1 ? 'start' : 'both';
    if (state) scroller.dataset.overflow = state; else delete scroller.dataset.overflow;
    const vw = `${scroller.clientWidth}px`;
    if (vw !== written) { // a size-dependent write waits for the next frame, so an observer never writes into its own delivery
      written = vw;
      requestAnimationFrame(() => scroller.style.setProperty('--_d-vw', vw));
    }
    if (state && !scroller.hasAttribute('tabindex')) {
      scroller.tabIndex = 0;
      scroller.setAttribute('role', 'region');
      scroller.setAttribute('aria-label', table.getAttribute('aria-label') || table.querySelector('caption')?.textContent || 'Scrollable table');
      scroller.dataset.fdFocusable = '';
    } else if (!state && 'fdFocusable' in scroller.dataset) {
      scroller.removeAttribute('tabindex');
      scroller.removeAttribute('role');
      scroller.removeAttribute('aria-label');
      delete scroller.dataset.fdFocusable;
    }
  };
  scroller.addEventListener('scroll', update, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    observer.observe(table);
  }
  update();
}

/* ------------------------------------------------------------------ table: sorting */

function parseNumber(raw) {
  const clean = raw.replace(/[\s,$€£]/g, '');
  const match = clean.match(/[-+]?\d*\.?\d+/);
  if (!match) return null;
  let n = parseFloat(match[0]);
  const suffix = clean.slice(match.index + match[0].length, match.index + match[0].length + 1).toLowerCase();
  if (suffix === 'k') n *= 1e3; else if (suffix === 'm') n *= 1e6; else if (suffix === 'b') n *= 1e9;
  return Number.isNaN(n) ? null : n;
}

function sortKey(td, type) {
  if (!td) return null;
  const raw = (td.dataset.sortValue ?? td.textContent).replace(/\s+/g, ' ').trim();
  if (raw === '' || raw === '—' || raw === '–' || raw === '-') return null;
  if (type === 'number') return parseNumber(raw);
  if (type === 'date') { const t = Date.parse(raw); return Number.isNaN(t) ? null : t; }
  return raw;
}

export function sortTable(table, index, direction = 'ascending', { silent = false } = {}) {
  const head = table.querySelector(':scope > thead > tr:last-child');
  const th = head?.children[index];
  if (!th) return;
  const type = th.dataset.sortType || 'text';
  $$('th[aria-sort]', head).forEach((other) => other.setAttribute('aria-sort', other === th ? direction : 'none'));
  if (table.dataset.sort !== 'server') {
    const tbody = table.tBodies[0];
    const rows = bodyRows(table);
    rows.forEach((tr, i) => { if (tr.dataset.fdOrder === undefined) tr.dataset.fdOrder = String(i); });
    const groups = rows.map((tr) => {
      const next = tr.nextElementSibling;
      return { tr, detail: next?.classList.contains('fd-table-detail') ? next : null, key: sortKey(tr.children[index], type), order: Number(tr.dataset.fdOrder) };
    });
    const sign = direction === 'descending' ? -1 : 1;
    groups.sort((a, b) => {
      if (direction === 'none') return a.order - b.order;
      if (a.key === null || b.key === null) return a.key === b.key ? a.order - b.order : a.key === null ? 1 : -1; // empty values always last
      const cmp = type === 'text' ? collator.compare(String(a.key), String(b.key)) : a.key - b.key;
      return cmp ? cmp * sign : a.order - b.order;
    });
    const fragment = document.createDocumentFragment();
    groups.forEach(({ tr, detail }) => { fragment.append(tr); if (detail) fragment.append(detail); });
    tbody.append(fragment);
  }
  if (!silent) {
    const sort = { key: th.dataset.key ?? th.textContent.trim(), index, direction };
    emit(table, 'fd:change', { source: 'sort', value: sort, sort });
  }
}

function cycleSort(button) {
  const th = button.closest('th');
  const table = button.closest('.fd-table');
  if (!th || !table) return;
  const current = th.getAttribute('aria-sort');
  const next = current === 'ascending' ? 'descending' : 'ascending';
  if (!th.hasAttribute('aria-sort')) th.setAttribute('aria-sort', 'none');
  sortTable(table, th.cellIndex, next);
}

/* ------------------------------------------------------------------ table: selection */

export function selection(table) {
  return visibleRows(table).filter((tr) => tr.getAttribute('aria-selected') === 'true');
}

function syncSelection(table, { silent = false } = {}) {
  const rows = visibleRows(table).filter((tr) => rowCheck(tr));
  const chosen = rows.filter((tr) => tr.getAttribute('aria-selected') === 'true');
  const all = table.querySelector('input[data-select-all]');
  if (all) {
    all.checked = rows.length > 0 && chosen.length === rows.length;
    all.indeterminate = chosen.length > 0 && chosen.length < rows.length;
  }
  const bar = wrapOf(table)?.querySelector('.fd-table-bulk');
  if (bar) {
    const open = chosen.length > 0;
    bar.dataset.state = open ? 'open' : 'closed';
    bar.inert = !open;
    const count = bar.querySelector('[data-bulk-count]');
    if (count) count.textContent = fmt(chosen.length);
  }
  if (!silent) {
    const values = chosen.map((tr) => rowValue(tr, bodyRows(table).indexOf(tr)));
    emit(table, 'fd:change', { source: 'selection', value: values, selected: values, rows: chosen });
  }
}

function setRowSelected(tr, on) {
  tr.setAttribute('aria-selected', String(on));
  const check = rowCheck(tr);
  if (check) check.checked = on;
}

export function clearSelection(table) {
  bodyRows(table).forEach((tr) => setRowSelected(tr, false));
  syncSelection(table);
}

const lastToggled = new WeakMap();
function onSelectChange(input) {
  const table = input.closest('.fd-table');
  if (!table) return;
  if (input.matches('[data-select-all]')) {
    visibleRows(table).forEach((tr) => rowCheck(tr) && setRowSelected(tr, input.checked));
  } else {
    const rows = visibleRows(table);
    const tr = input.closest('tr');
    const last = lastToggled.get(table);
    const shift = Boolean(input._fdShift);
    input._fdShift = false;
    if (shift && last && rows.includes(last) && last !== tr) {
      const [from, to] = [rows.indexOf(last), rows.indexOf(tr)].sort((a, b) => a - b);
      rows.slice(from, to + 1).forEach((row) => rowCheck(row) && setRowSelected(row, input.checked));
    } else {
      setRowSelected(tr, input.checked);
    }
    lastToggled.set(table, tr);
  }
  syncSelection(table);
}

/* ------------------------------------------------------------------ table: expand */

function syncExpand(button) {
  const open = button.getAttribute('aria-expanded') === 'true';
  const row = button.closest('tr');
  const detail = document.getElementById(button.getAttribute('aria-controls') || '');
  if (row) row.toggleAttribute('data-expanded', open);
  if (detail) detail.hidden = !open;
}

/* ------------------------------------------------------------------ filters */

export function setFilter(chip, value = null, { silent = false } = {}) {
  const label = chip.querySelector('.fd-filter-value');
  const clear = chip.querySelector('.fd-filter-clear');
  if (label && chip.dataset.default === undefined) chip.dataset.default = label.textContent.trim();
  const active = value !== null && value !== undefined && value !== '';
  if (label) label.textContent = active ? String(value) : chip.dataset.default ?? label.textContent;
  chip.toggleAttribute('data-active', active);
  if (clear) clear.hidden = !active;
  if (!silent) emit(chip, 'fd:change', { source: 'filter', value: active ? value : null, filter: chip });
}

function initFilters(root) {
  matchesIn(root, '.fd-filter').forEach((chip) => {
    if (!once(chip, 'fd-filter')) return;
    const label = chip.querySelector('.fd-filter-value');
    if (label && chip.dataset.default === undefined && !chip.hasAttribute('data-active')) chip.dataset.default = label.textContent.trim();
    const clear = chip.querySelector('.fd-filter-clear');
    if (clear) clear.hidden = !chip.hasAttribute('data-active');
  });
}

function tokenState(container) {
  const value = $$('.fd-filter-token', container).map((token) => ({
    key: token.querySelector('.fd-filter-token-key')?.textContent.trim() ?? '',
    value: token.querySelector('.fd-filter-token-value')?.textContent.trim() ?? '',
  }));
  const clearAll = container.querySelector('[data-filter-clear-all]');
  if (clearAll) clearAll.hidden = value.length < 2;
  emit(container, 'fd:change', { source: 'filters', value });
  if (!value.length) container.hidden = true;
}

/* ------------------------------------------------------------------ key-value copy */

function initCopy(root) {
  matchesIn(root, '.fd-kv-value[data-copy]').forEach((value) => {
    if (!once(value, 'fd-copy')) return;
    const text = document.createElement('span');
    text.className = 'fd-kv-text';
    text.append(...value.childNodes);
    const key = value.closest('.fd-kv-item')?.querySelector('.fd-kv-key')?.textContent.trim();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fd-kv-copy';
    button.dataset.label = key ? `Copy ${key.toLowerCase()}` : 'Copy value';
    button.setAttribute('aria-label', button.dataset.label);
    button.innerHTML = icon('copy') + icon('check');
    value.append(text, button);
  });
}

async function copyValue(button) {
  const value = button.closest('.fd-kv-value');
  if (!value) return;
  const text = value.dataset.copy || value.querySelector('.fd-kv-text')?.textContent.trim() || '';
  if (!(await copyText(text))) return;
  button.dataset.copied = '';
  button.setAttribute('aria-label', 'Copied');
  clearTimeout(button._fdTimer);
  button._fdTimer = setTimeout(() => {
    delete button.dataset.copied;
    button.setAttribute('aria-label', button.dataset.label || 'Copy value');
  }, 1400);
}

/* ------------------------------------------------------------------ meters */

function meterLevel(percent, el) {
  const warn = Number(el.dataset.warn ?? 80);
  const danger = Number(el.dataset.danger ?? 95);
  return percent >= danger ? 'danger' : percent >= warn ? 'warning' : null;
}

function renderMeter(el) {
  const max = Number(el.dataset.max ?? 100) || 100;
  const track = el.querySelector('.fd-meter-track');
  const segments = $$('.fd-meter-seg', el);
  let value;
  if (segments.length) {
    value = 0;
    segments.forEach((seg) => {
      const v = Number(seg.dataset.value ?? 0);
      value += v;
      seg.style.setProperty('--_d-p', String(Math.min(100, (v / max) * 100)));
    });
  } else {
    value = Number(el.dataset.value ?? 0);
  }
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  el.style.setProperty('--_d-p', String(Math.round(percent * 10) / 10));
  const auto = el.dataset.tone === undefined || el.dataset.tone === 'auto';
  const level = auto ? meterLevel(percent, el) : null;
  if (level) el.dataset.level = level; else delete el.dataset.level;
  if (track) {
    if (!track.hasAttribute('role')) track.setAttribute('role', segments.length ? 'img' : 'meter');
    if (track.getAttribute('role') === 'meter') {
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', String(max));
      track.setAttribute('aria-valuenow', String(value));
      track.setAttribute('aria-valuetext', `${fmt(value)} of ${fmt(max)}${el.dataset.unit ? ` ${el.dataset.unit}` : ''}`);
      if (!track.hasAttribute('aria-label') && !track.hasAttribute('aria-labelledby')) {
        const label = el.querySelector('.fd-meter-label')?.textContent.trim();
        if (label) track.setAttribute('aria-label', label);
      }
    }
  }
  const figure = el.querySelector('.fd-meter-figure[data-auto]');
  if (figure) figure.textContent = el.dataset.variant === 'inline' && !el.dataset.unit ? `${Math.round(percent)}%` : `${fmt(value)} of ${fmt(max)}${el.dataset.unit ? ` ${el.dataset.unit}` : ''}`;
}

export function setMeter(el, value, max) {
  if (value !== undefined) el.dataset.value = String(value);
  if (max !== undefined) el.dataset.max = String(max);
  renderMeter(el);
}

function initMeters(root) {
  matchesIn(root, '.fd-meter').forEach((el) => {
    if (!once(el, 'fd-meter')) return;
    renderMeter(el);
    if ('MutationObserver' in window) {
      new MutationObserver(() => renderMeter(el)).observe(el, { attributes: true, attributeFilter: ['data-value', 'data-max', 'data-tone', 'data-warn', 'data-danger'] });
      $$('.fd-meter-seg', el).forEach((seg) => new MutationObserver(() => renderMeter(el)).observe(seg, { attributes: true, attributeFilter: ['data-value'] }));
    }
  });
}

/* ------------------------------------------------------------------ progress */

function renderProgress(el) {
  const max = Number(el.dataset.max ?? 100) || 100;
  const indeterminate = el.hasAttribute('data-indeterminate');
  const value = Number(el.dataset.value ?? 0);
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  el.style.setProperty('--_d-p', String(Math.round(percent * 10) / 10));
  el.toggleAttribute('data-complete', !indeterminate && percent >= 100);
  el.toggleAttribute('data-empty', percent <= 0);

  const target = el.getAttribute('role') === 'progressbar' ? el : el.querySelector('[role="progressbar"]');
  if (target) {
    if (indeterminate) {
      ['aria-valuenow', 'aria-valuetext'].forEach((a) => target.removeAttribute(a));
    } else {
      target.setAttribute('aria-valuemin', '0');
      target.setAttribute('aria-valuemax', String(max));
      target.setAttribute('aria-valuenow', String(value));
    }
    if (!target.hasAttribute('aria-label') && !target.hasAttribute('aria-labelledby')) {
      const label = el.querySelector('.fd-progress-label')?.textContent.trim();
      if (label) target.setAttribute('aria-label', label);
    }
  }

  const steps = el.querySelector('.fd-progress-steps');
  if (steps) {
    if (steps.children.length !== max) steps.replaceChildren(...Array.from({ length: max }, () => document.createElement('span')));
    [...steps.children].forEach((step, i) => {
      step.toggleAttribute('data-done', i < value);
      step.toggleAttribute('data-current', i === Math.floor(value) && value < max && el.hasAttribute('data-working'));
    });
    if (target) target.setAttribute('aria-valuetext', `${value} of ${max}${el.dataset.unit ? ` ${el.dataset.unit}` : ''}`);
  }

  const text = el.querySelector('.fd-progress-value[data-auto]');
  if (text) {
    text.textContent = indeterminate ? '' : steps ? `${fmt(value)} of ${fmt(max)}${el.dataset.unit ? ` ${el.dataset.unit}` : ''}` : `${Math.round(percent)}%`;
  }
  const center = el.querySelector('.fd-progress-center[data-auto]');
  if (center) center.textContent = indeterminate ? '' : `${Math.round(percent)}%`;
}

export function setProgress(el, value, max) {
  if (value !== undefined) el.dataset.value = String(value);
  if (max !== undefined) el.dataset.max = String(max);
  renderProgress(el);
}

function initProgress(root) {
  matchesIn(root, '.fd-progress').forEach((el) => {
    if (!once(el, 'fd-progress')) return;
    renderProgress(el);
    if ('MutationObserver' in window) {
      new MutationObserver(() => renderProgress(el)).observe(el, { attributes: true, attributeFilter: ['data-value', 'data-max', 'data-indeterminate'] });
    }
  });
}

/* ------------------------------------------------------------------ data card disclosure */

function syncToggle(button) {
  const target = document.getElementById(button.getAttribute('aria-controls') || '');
  if (!target) return;
  const open = button.getAttribute('aria-expanded') === 'true';
  target.dataset.state = open ? 'open' : 'closed';
  target.inert = !open;
}

/* ------------------------------------------------------------------ pipeline */

const PIPELINE_JOB = 'button.fd-pipeline-job:not(:disabled), a.fd-pipeline-job[href]';
const isCurrent = (el) => el.hasAttribute('aria-current') && el.getAttribute('aria-current') !== 'false';
const ownJobs = (pipeline) => $$(PIPELINE_JOB, pipeline).filter((job) => job.closest('.fd-pipeline') === pipeline);
const jobValue = (job) => job.dataset.value ?? job.querySelector('.fd-pipeline-job-name')?.textContent.trim() ?? '';

/** Jobs that take focus, one array per stage, empty stages left out. */
function pipelineGrid(pipeline) {
  return $$('.fd-pipeline-stage', pipeline)
    .filter((stage) => stage.closest('.fd-pipeline') === pipeline)
    .map((stage) => $$(PIPELINE_JOB, stage))
    .filter((jobs) => jobs.length);
}

/** One tab stop: the focused job while focus is inside, else the current job, else the first. */
function syncPipeline(pipeline, { leaving = false } = {}) {
  const jobs = ownJobs(pipeline);
  const active = leaving ? null : jobs.find((job) => job === document.activeElement);
  const home = active ?? jobs.find(isCurrent) ?? jobs[0];
  jobs.forEach((job) => { job.tabIndex = job === home ? 0 : -1; });
}

/** Scroll the pipeline (never the page) so a job is fully visible. */
function revealJob(pipeline, job) {
  if (pipeline.scrollWidth <= pipeline.clientWidth + 1) return;
  const box = pipeline.getBoundingClientRect();
  const rect = job.getBoundingClientRect();
  const style = getComputedStyle(pipeline);
  const start = box.left + (parseFloat(style.paddingLeft) || 0);
  const end = box.right - (parseFloat(style.paddingRight) || 0);
  if (rect.left < start) pipeline.scrollLeft -= start - rect.left;
  else if (rect.right > end) pipeline.scrollLeft += Math.min(rect.right - end, rect.left - start);
}

/** Mark the sides that hold more stages, for the edge fades. */
function watchPipeline(pipeline) {
  const update = () => {
    const max = pipeline.scrollWidth - pipeline.clientWidth;
    const left = Math.abs(pipeline.scrollLeft);
    const state = max <= 1 ? null : left <= 1 ? 'end' : left >= max - 1 ? 'start' : 'both';
    if (state) pipeline.dataset.overflow = state; else delete pipeline.dataset.overflow;
  };
  pipeline.addEventListener('scroll', update, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(update);
    observer.observe(pipeline);
    const stages = pipeline.querySelector('.fd-pipeline-stages');
    if (stages) observer.observe(stages);
  }
  update();
}

function setupPipeline(pipeline) {
  if (!once(pipeline, 'fd-pipeline')) return;
  syncPipeline(pipeline);
  watchPipeline(pipeline);
  if ('MutationObserver' in window) {
    new MutationObserver(() => syncPipeline(pipeline)).observe(pipeline, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-current', 'disabled', 'href'] });
  }
  const current = ownJobs(pipeline).find(isCurrent);
  if (current) requestAnimationFrame(() => revealJob(pipeline, current));
}

/** Make the job with this data-value (or this element) the current one. Emits nothing. */
export function selectJob(pipeline, value) {
  const job = value instanceof Element ? value : ownJobs(pipeline).find((el) => jobValue(el) === String(value));
  if (!job) return null;
  $$('.fd-pipeline-job', pipeline).forEach((el) => { if (el !== job && isCurrent(el)) el.removeAttribute('aria-current'); });
  job.setAttribute('aria-current', 'true');
  syncPipeline(pipeline);
  revealJob(pipeline, job);
  return job;
}

function onPipelineClick(event, job) {
  const pipeline = job.closest('.fd-pipeline');
  if (!pipeline || !job.matches(PIPELINE_JOB) || pipeline.getAttribute('aria-busy') === 'true') return;
  if (!emit(job, 'fd:select', { value: jobValue(job), item: job })) {
    if (job.matches('a')) event.preventDefault();
    return;
  }
  if (job.matches('button') && pipeline.dataset.fdPipeline !== 'manual') selectJob(pipeline, job);
}

function onPipelineKey(event, job) {
  const pipeline = job.closest('.fd-pipeline');
  if (!pipeline || event.altKey || event.ctrlKey || event.metaKey || !job.matches(PIPELINE_JOB)) return;
  const grid = pipelineGrid(pipeline);
  const flat = grid.flat();
  const s = grid.findIndex((jobs) => jobs.includes(job));
  if (s < 0) return;
  const j = grid[s].indexOf(job);
  const at = flat.indexOf(job);
  const stages = pipeline.querySelector('.fd-pipeline-stages');
  const vertical = Boolean(stages) && getComputedStyle(stages).getPropertyValue('--_d-pl-axis').trim() === 'vertical';
  const rtl = getComputedStyle(pipeline).direction === 'rtl';
  const across = (step) => { const jobs = grid[s + step]; return jobs ? jobs[Math.min(j, jobs.length - 1)] : null; };
  let target;
  switch (event.key) {
    case 'ArrowRight': if (vertical) return; target = across(rtl ? -1 : 1); break;
    case 'ArrowLeft': if (vertical) return; target = across(rtl ? 1 : -1); break;
    case 'ArrowDown': target = vertical ? flat[at + 1] : grid[s][j + 1]; break;
    case 'ArrowUp': target = vertical ? flat[at - 1] : grid[s][j - 1]; break;
    case 'Home': target = flat[0]; break;
    case 'End': target = flat[flat.length - 1]; break;
    default: return;
  }
  event.preventDefault();
  if (!target || target === job) return;
  flat.forEach((el) => { el.tabIndex = el === target ? 0 : -1; });
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* ------------------------------------------------------------------ init */

/** Components that answer their own [data-action] buttons; a click inside them is not a list action. */
const OWN_ACTIONS = '.fd-message-action, .fd-result, [data-fd-playground], .fd-codeblock-btn, .fd-json-btn, .fd-log-btn';

let delegated = false;
function bindDelegates() {
  if (delegated) return;
  delegated = true;

  on(document, 'click', '.fd-th-sort', (event, button) => cycleSort(button));

  on(document, 'change', '.fd-table-check', (event, input) => onSelectChange(input));
  // shift is only known on click, so remember it for the change event that follows
  on(document, 'click', '.fd-table-check', (event, input) => { input._fdShift = event.shiftKey; }, true);
  on(document, 'click', 'td[data-select]', (event, cell) => {
    if (event.target.closest('input, a, button, label')) return;
    cell.querySelector('.fd-table-check')?.click();
  });

  on(document, 'click', '.fd-table-expand', (event, button) => {
    button.setAttribute('aria-expanded', String(button.getAttribute('aria-expanded') !== 'true'));
    syncExpand(button);
    emit(button, button.getAttribute('aria-expanded') === 'true' ? 'fd:open' : 'fd:close', { row: button.closest('tr') });
  });

  on(document, 'click', 'tr[data-href]', (event, row) => {
    if (event.target.closest('a, button, input, select, textarea, label, [data-select], [data-actions]')) return;
    openRow(row, event);
  });
  on(document, 'keydown', 'tr[data-href]', (event, row) => {
    if (event.key === 'Enter' && event.target === row) openRow(row, event);
  });

  on(document, 'click', '[data-bulk-clear]', (event, button) => {
    const table = button.closest('.fd-table-wrap')?.querySelector('.fd-table');
    if (table) { clearSelection(table); table.querySelector('input[data-select-all]')?.focus({ preventScroll: true }); }
  });
  on(document, 'keydown', '.fd-table-wrap', (event, wrap) => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.target.closest('input[type="search"], [popover]')) return;
    const table = wrap.querySelector('.fd-table');
    if (table && selection(table).length) { clearSelection(table); event.preventDefault(); }
  });
  on(document, 'click', '[data-action]', (event, button) => {
    if (button.closest(OWN_ACTIONS)) return;
    const wrap = button.closest('.fd-table-wrap');
    const table = wrap?.querySelector('.fd-table');
    const rowEl = button.closest('tbody tr');
    const value = table ? selection(table).map((tr) => rowValue(tr, bodyRows(table).indexOf(tr))) : [];
    emit(button, 'fd:select', { action: button.dataset.action, value, row: wrap ? rowEl : null, wrap });
  });

  on(document, 'click', '.fd-filter-clear', (event, button) => {
    const chip = button.closest('.fd-filter');
    if (!chip) return;
    setFilter(chip, null);
    chip.querySelector('.fd-filter-trigger, button')?.focus();
  });
  on(document, 'click', '.fd-filter-token-remove', (event, button) => {
    const container = button.closest('.fd-filter-applied');
    button.closest('.fd-filter-token')?.remove();
    if (container) tokenState(container);
  });
  on(document, 'click', '[data-filter-clear-all]', (event, button) => {
    const container = button.closest('.fd-filter-applied');
    if (!container) return;
    $$('.fd-filter-token', container).forEach((token) => token.remove());
    tokenState(container);
  });

  on(document, 'click', '.fd-kv-copy', (event, button) => copyValue(button));

  on(document, 'click', '.fd-pipeline-job', onPipelineClick);
  on(document, 'keydown', '.fd-pipeline-job', onPipelineKey);
  on(document, 'focusin', '.fd-pipeline-job', (event, job) => {
    const pipeline = job.closest('.fd-pipeline');
    if (pipeline && job.matches(PIPELINE_JOB)) ownJobs(pipeline).forEach((el) => { el.tabIndex = el === job ? 0 : -1; });
  });
  on(document, 'focusout', '.fd-pipeline', (event, pipeline) => {
    if (!pipeline.contains(event.relatedTarget)) syncPipeline(pipeline, { leaving: true });
  });

  on(document, 'click', '.fd-data-card-toggle', (event, button) => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    syncToggle(button);
    emit(button, open ? 'fd:open' : 'fd:close', { target: document.getElementById(button.getAttribute('aria-controls') || '') });
  });
}

function openRow(row, event) {
  const href = row.dataset.href;
  if (!emit(row, 'fd:select', { action: 'open', href, row })) return;
  if (!href) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) window.open(href, '_blank', 'noopener');
  else location.assign(href);
}

export function init(root = document) {
  bindDelegates();
  tablesIn(root).forEach(setupTable);
  initFilters(root);
  initCopy(root);
  initMeters(root);
  initProgress(root);
  matchesIn(root, '.fd-data-card-toggle').forEach((button) => once(button, 'fd-toggle') && syncToggle(button));
  matchesIn(root, '.fd-pipeline').forEach(setupPipeline);
}
