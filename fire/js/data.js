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
 *             <tr class="fd-table-detail" id="detail-id" hidden>. When the table stacks, the toggle is a full-width button
 *             at the foot of the card whose words are the expand cell's data-label (filled from the header text).
 *  Rows       tr[data-href] navigates on click or Enter (tabindex is added). Prefer a stretched .fd-table-link in markup.
 *  Groups     <tbody class="fd-table-group" [data-state="closed"]> whose first row is <tr class="fd-table-group-head"> with a
 *             <th scope="rowgroup" colspan="…">. The th is given scope and an id that labels the tbody (aria-labelledby), and
 *             a missing colspan is filled in to span the columns. A .fd-table-group-toggle[aria-expanded] in the th opens and
 *             closes the group (data-state on the tbody); data-collapsible on the table builds that toggle from each
 *             heading's content. .fd-table-group-count[data-auto] is kept to the number of rows not [hidden].
 *             input[data-select-group] in the heading selects the group's rows. Sorting sorts within each group.
 *  Stacked    <table data-stack>: data-label on each cell is filled in from the header text when missing.
 *             td|th[data-stack="hide"] is dropped, and [data-stack-only] inside a cell is shown, only while the table stacks.
 *  Actions    any [data-action] emits fd:select once per click (except buttons inside components that handle their own:
 *             messages, results, playgrounds, code, JSON and log toolbars). Inside a wrap: { action, value: selected values, row, wrap }.
 *             Anywhere else (a toolbar's "Clear filters"): { action, value: [], row: null, wrap: null }.
 *  Filters    .fd-filter[data-active][data-default="All endpoints"] with .fd-filter-value and .fd-filter-clear.
 *             .fd-filter-applied > .fd-filter-token (+ .fd-filter-token-remove) and [data-filter-clear-all].
 *  Listbox    <div class="fd-list" role="listbox" aria-label="…"> > <div class="fd-list-row" role="option" data-value
 *             aria-selected>: one tab stop; Arrow Up/Down, Home and End move the selection, which follows focus.
 *  List and detail  <div class="fd-list-detail"> > .fd-list-detail-list (rows: button or a[href], each with data-value) and
 *             .fd-list-detail-main (optional [data-detail="value"] panels and a .fd-list-detail-back button). Clicking a
 *             button row moves aria-current="true" to it and shows its panel; below 760px of its own width the root
 *             switches data-view from "list" to "detail" and focus moves to the detail's first heading. The back
 *             button switches to "list" and returns focus to the open row. A link row navigates as usual.
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
 *   fd:open / fd:close  .fd-table-group-toggle  { group }                   group is the tbody
 *   fd:change  .fd-list[role=listbox]  { value, item }                      the selected option's data-value
 *   fd:select  .fd-list-detail row  { value, item }                         cancelable: preventDefault keeps the current row and view
 *   fd:change  .fd-list-detail  { source: 'view', value: 'list' | 'detail' }   only when one pane shows at a time
 *
 * API: init(root), selection(table), clearSelection(table), sortTable(table, index, direction), setGroupOpen(group, open),
 *      setFilter(chip, value), setMeter(el, value, max), setProgress(el, value, max), selectJob(pipeline, value),
 *      selectOption(listbox, value), showDetail(listDetail, value, { focus }), showList(listDetail, { focus }).
 */
import { $$, on, once, emit, copyText, label, ensureId, focusQuiet } from './core.js';
import { icon } from './icons.js';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const BODY_ROWS = ':scope > tbody > tr:not(.fd-table-detail):not(.fd-table-state):not(.fd-table-group-head):not([data-skeleton])';

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
  setupGroups(table);
  syncSelection(table, { silent: true });
}

/* ------------------------------------------------------------------ table: groups */

const groupsOf = (table) => [...table.tBodies].filter((tbody) => tbody.classList.contains('fd-table-group'));
const groupHead = (group) => group.querySelector(':scope > tr.fd-table-group-head');
const groupRows = (group) => [...group.querySelectorAll(':scope > tr')].filter((tr) => tr.matches(BODY_ROWS.replace(':scope > tbody > tr', '*')));
const columnCount = (table) => {
  const head = table.querySelector(':scope > thead > tr:last-child') ?? table.querySelector('tr');
  return head ? [...head.children].reduce((n, cell) => n + (cell.colSpan || 1), 0) : 1;
};

function setupGroups(table) {
  const groups = groupsOf(table);
  if (!groups.length) return;
  const columns = columnCount(table);
  groups.forEach((group) => {
    const head = groupHead(group);
    const th = head?.querySelector(':scope > th');
    if (!th) return;
    if (!th.hasAttribute('scope')) th.setAttribute('scope', 'rowgroup');
    if (!th.hasAttribute('colspan')) {
      const before = [...head.children].filter((cell) => cell !== th).reduce((n, cell) => n + (cell.colSpan || 1), 0);
      th.colSpan = Math.max(1, columns - before);
    }
    if (!group.hasAttribute('aria-label') && !group.hasAttribute('aria-labelledby')) {
      const title = th.querySelector('.fd-table-group-title') ?? th;
      group.setAttribute('aria-labelledby', ensureId(title, 'fd-group'));
    }
    let toggle = th.querySelector('.fd-table-group-toggle');
    if (!toggle && table.hasAttribute('data-collapsible')) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'fd-table-group-toggle';
      toggle.innerHTML = icon('chevron-right');
      toggle.append(...[...th.childNodes]);
      th.append(toggle);
    }
    if (toggle) {
      if (toggle.hasAttribute('aria-expanded') && !group.hasAttribute('data-state')) group.dataset.state = toggle.getAttribute('aria-expanded') === 'false' ? 'closed' : 'open';
      toggle.setAttribute('aria-expanded', String(group.dataset.state !== 'closed'));
      if (!group.dataset.state) group.dataset.state = 'open';
    }
  });
  syncGroups(table);
  if ('MutationObserver' in window) {
    // Rows filtered ([hidden]), added or removed: keep counts and the group checkboxes true.
    new MutationObserver(() => syncGroups(table)).observe(table, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
  }
}

/** Counts (data-auto) and each group's select checkbox. */
function syncGroups(table) {
  groupsOf(table).forEach((group) => {
    const rows = groupRows(group).filter((tr) => !tr.hidden);
    const count = groupHead(group)?.querySelector('.fd-table-group-count[data-auto]');
    const text = fmt(rows.length);
    if (count && count.textContent !== text) count.textContent = text;
    const check = groupHead(group)?.querySelector('input[data-select-group]');
    if (check) {
      const selectable = rows.filter((tr) => rowCheck(tr));
      const chosen = selectable.filter((tr) => tr.getAttribute('aria-selected') === 'true');
      check.checked = selectable.length > 0 && chosen.length === selectable.length;
      check.indeterminate = chosen.length > 0 && chosen.length < selectable.length;
      check.disabled = !selectable.length;
    }
  });
}

/** Open or close a group (its tbody). Emits nothing. */
export function setGroupOpen(group, open) {
  group.dataset.state = open ? 'open' : 'closed';
  group.querySelector(':scope > tr.fd-table-group-head .fd-table-group-toggle')?.setAttribute('aria-expanded', String(open));
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
      // an expand cell keeps its caption: it is the words of the stacked card's full-width toggle
      if (td.hasAttribute('data-actions') || td.hasAttribute('data-select')) return;
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
      scroller.setAttribute('aria-label', table.getAttribute('aria-label') || table.querySelector('caption')?.textContent || label(scroller, 'table.scroll', 'Scrollable table'));
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
    const all = bodyRows(table);
    all.forEach((tr, i) => { if (tr.dataset.fdOrder === undefined) tr.dataset.fdOrder = String(i); });
    const sign = direction === 'descending' ? -1 : 1;
    // Each tbody sorts on its own, so the rows of a group stay under its heading.
    [...table.tBodies].forEach((tbody) => {
      const rows = all.filter((tr) => tr.parentElement === tbody);
      if (!rows.length) return;
      const items = rows.map((tr) => {
        const next = tr.nextElementSibling;
        return { tr, detail: next?.classList.contains('fd-table-detail') ? next : null, key: sortKey(tr.children[index], type), order: Number(tr.dataset.fdOrder) };
      });
      items.sort((a, b) => {
        if (direction === 'none') return a.order - b.order;
        if (a.key === null || b.key === null) return a.key === b.key ? a.order - b.order : a.key === null ? 1 : -1; // empty values always last
        const cmp = type === 'text' ? collator.compare(String(a.key), String(b.key)) : a.key - b.key;
        return cmp ? cmp * sign : a.order - b.order;
      });
      const fragment = document.createDocumentFragment();
      items.forEach(({ tr, detail }) => { fragment.append(tr); if (detail) fragment.append(detail); });
      tbody.append(fragment);
    });
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
  syncGroups(table);
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
  } else if (input.matches('[data-select-group]')) {
    const group = input.closest('tbody');
    if (group) groupRows(group).filter((tr) => !tr.hidden && rowCheck(tr)).forEach((tr) => setRowSelected(tr, input.checked));
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
    button.dataset.label = key ? label(value, 'copy.key', 'Copy {key}', { key: key.toLowerCase() }) : label(value, 'copy.value', 'Copy value');
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
  button.setAttribute('aria-label', label(button, 'copy.done', 'Copied'));
  clearTimeout(button._fdTimer);
  button._fdTimer = setTimeout(() => {
    delete button.dataset.copied;
    button.setAttribute('aria-label', button.dataset.label || label(button, 'copy.value', 'Copy value'));
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

/* ------------------------------------------------------------------ listbox list */

const optionsOf = (list) => $$(':scope > [role="option"]', list).filter((o) => o.getAttribute('aria-disabled') !== 'true');
const optionValue = (o) => o.dataset.value ?? o.textContent.trim();

function setupListbox(list) {
  if (!once(list, 'fd-listbox-list')) return;
  const options = optionsOf(list);
  const chosen = options.find((o) => o.getAttribute('aria-selected') === 'true');
  $$(':scope > [role="option"]', list).forEach((o) => {
    if (!o.hasAttribute('aria-selected')) o.setAttribute('aria-selected', 'false');
    o.tabIndex = o === (chosen ?? options[0]) ? 0 : -1;
  });
}

/** Select the option with this data-value (or this element) in a listbox list. Emits nothing. */
export function selectOption(list, value) {
  const option = value instanceof Element ? value : optionsOf(list).find((o) => optionValue(o) === String(value));
  if (!option) return null;
  $$(':scope > [role="option"]', list).forEach((o) => { o.setAttribute('aria-selected', String(o === option)); o.tabIndex = o === option ? 0 : -1; });
  return option;
}

function chooseOption(option, { focus = false } = {}) {
  const list = option.closest('.fd-list[role="listbox"]');
  if (!list || option.getAttribute('aria-disabled') === 'true') return;
  const already = option.getAttribute('aria-selected') === 'true';
  selectOption(list, option);
  if (focus) { option.focus(); option.scrollIntoView({ block: 'nearest' }); }
  if (!already) emit(list, 'fd:change', { value: optionValue(option), item: option });
}

const LISTBOX_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
function onListboxKey(event, option) {
  const list = option.closest('.fd-list[role="listbox"]');
  if (!list || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); chooseOption(option); return; }
  if (!LISTBOX_KEYS.includes(event.key)) return;
  event.preventDefault();
  const options = optionsOf(list);
  const i = options.indexOf(option);
  const target = { ArrowDown: options[i + 1], ArrowUp: options[i - 1], Home: options[0], End: options[options.length - 1] }[event.key];
  if (target) chooseOption(target, { focus: true });
}

/* ------------------------------------------------------------------ list and detail */

const LD_ITEM = ':is(button, a[href])[data-value]';
const ldItems = (root) => $$(`.fd-list-detail-list ${LD_ITEM}`, root).filter((el) => el.closest('.fd-list-detail') === root);
const ldCurrent = (root) => ldItems(root).find(isCurrent);
const ldSingle = (root) => {
  const pane = root.querySelector(':scope > .fd-list-detail-list');
  return Boolean(pane) && getComputedStyle(pane).getPropertyValue('--_d-ld-mode').trim() === 'single';
};

function ldPanels(root, value) {
  const main = root.querySelector(':scope > .fd-list-detail-main');
  const panels = main ? $$(':scope > [data-detail]', main) : [];
  if (panels.length && value !== undefined) panels.forEach((p) => { p.hidden = p.dataset.detail !== String(value); });
  return panels;
}

/** Where focus lands in the detail: its first visible heading (made focusable), else the main pane. */
function ldFocusTarget(root) {
  const main = root.querySelector(':scope > .fd-list-detail-main');
  if (!main) return null;
  const heading = $$('h1, h2, h3', main).find((h) => !h.closest('[hidden]'));
  const target = heading ?? main;
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
  return target;
}

function setView(root, view, { silent = false } = {}) {
  const changed = root.dataset.view !== view;
  root.dataset.view = view;
  if (changed && !silent && ldSingle(root)) emit(root, 'fd:change', { source: 'view', value: view });
}

/** Open the record with this data-value (or this row): aria-current moves to it, its panel shows, and when one pane
 *  shows at a time the detail replaces the list. Focus moves to the detail only then (or with focus: true). */
export function showDetail(root, value, { focus } = {}) {
  const item = value instanceof Element ? value : ldItems(root).find((el) => el.dataset.value === String(value));
  if (item) {
    ldItems(root).forEach((el) => { if (el !== item && isCurrent(el)) el.removeAttribute('aria-current'); });
    item.setAttribute('aria-current', 'true');
    ldPanels(root, item.dataset.value);
  }
  const single = ldSingle(root);
  setView(root, 'detail');
  if (focus ?? single) {
    const target = ldFocusTarget(root);
    focusQuiet(target);
    if (single) (target ?? root).scrollIntoView({ block: 'nearest' });
  }
  return item ?? null;
}

/** Back to the list (one pane at a time); focus returns to the open row. */
export function showList(root, { focus = true } = {}) {
  setView(root, 'list');
  const item = ldCurrent(root) ?? ldItems(root)[0];
  if (focus && item) { item.focus({ preventScroll: true }); item.scrollIntoView({ block: 'nearest' }); }
}

function setupListDetail(root) {
  if (!once(root, 'fd-list-detail')) return;
  if (!root.dataset.view) root.dataset.view = 'list';
  const current = ldCurrent(root);
  if (current) ldPanels(root, current.dataset.value);
}

function onListDetailClick(event, item) {
  const root = item.closest('.fd-list-detail');
  if (!root || item.closest('.fd-list-detail-list')?.closest('.fd-list-detail') !== root) return;
  if (!emit(item, 'fd:select', { value: item.dataset.value, item })) { if (item.matches('a')) event.preventDefault(); return; }
  if (item.matches('a')) return; // a link opens its own page
  showDetail(root, item);
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
    if (!container) return;   // the combined filter's chips (filters.js) remove themselves
    button.closest('.fd-filter-token')?.remove();
    tokenState(container);
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

  on(document, 'click', '.fd-table-group-toggle', (event, button) => {
    const group = button.closest('tbody');
    if (!group) return;
    const open = button.getAttribute('aria-expanded') !== 'true';
    setGroupOpen(group, open);
    emit(button, open ? 'fd:open' : 'fd:close', { group });
  });

  on(document, 'click', '.fd-list[role="listbox"] > [role="option"]', (event, option) => chooseOption(option, { focus: true }));
  on(document, 'keydown', '.fd-list[role="listbox"] > [role="option"]', onListboxKey);

  on(document, 'click', `.fd-list-detail-list ${LD_ITEM}`, onListDetailClick);
  on(document, 'click', '.fd-list-detail-back', (event, button) => {
    const root = button.closest('.fd-list-detail');
    if (root) { event.preventDefault(); showList(root); }
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
  matchesIn(root, '.fd-list[role="listbox"]').forEach(setupListbox);
  matchesIn(root, '.fd-list-detail').forEach(setupListDetail);
}
