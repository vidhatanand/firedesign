/* Fire combined filter (0.8): one button, a searchable menu of fields, a panel of values per field, and the filters that
 * are set as chips. Built on the menu, sub-menu, popover and sheet of fire/js/overlays.js; CSS in components/data.css.
 * For one to three fields that people change all the time, the single filter chip (.fd-filter, data.js) is the part.
 *
 * Markup: the author lists the fields and their values once, as a menu. Fire builds nothing from data.
 *   <div class="fd-filters" id="req-filters" data-fd-for="#req-table" [data-fd-url] [data-fd-key="f"] [data-now="2026-11-18"]>
 *     <button class="fd-btn fd-filters-add" type="button" data-fd-menu="req-filters-menu"><i data-icon="list-filter"></i><span>Filter</span></button>
 *     <div class="fd-menu fd-filters-menu" id="req-filters-menu" popover>
 *       <p class="fd-menu-label">Request</p>
 *       <button class="fd-menu-item" data-field="status" data-kind="many" data-fd-submenu="rf-status">
 *         <i data-icon="circle-dot"></i><span class="fd-menu-item-label">Status</span></button>
 *       <div class="fd-menu fd-filters-panel" id="rf-status" popover>
 *         <button class="fd-menu-item" data-value="failed"><span class="fd-status" data-tone="danger"></span>
 *           <span class="fd-menu-item-label">Failed</span><span class="fd-filters-count"></span></button> …
 *       </div>
 *       <button class="fd-menu-item" data-field="cached" data-kind="flag"><i data-icon="zap"></i><span class="fd-menu-item-label">Cached</span></button>
 *       <button class="fd-menu-item" data-field="target" data-kind="text" data-fd-submenu="rf-target">…Target</button>
 *       <div class="fd-menu fd-filters-panel" id="rf-target" popover><input class="fd-input" type="text" placeholder="docs.ember.dev" aria-label="Target contains"></div>
 *       <button class="fd-menu-item" data-field="date" data-kind="date" data-fd-submenu="rf-date">…Date</button>
 *       <div class="fd-menu fd-filters-panel" id="rf-date" popover>
 *         <button class="fd-menu-item" data-value="today">Today</button> · data-value="7d" · "30d" · "month"
 *         <button class="fd-menu-item" data-value="custom" data-fd-popover="rf-range">Custom range…</button>
 *       </div>
 *     </div>
 *     <div class="fd-popover" id="rf-range" popover data-size="auto" aria-label="Custom range"><div class="fd-daterange" data-fd-daterange data-max="today">
 *       <div class="fd-daterange-main"><div class="fd-calendar"></div></div> <div class="fd-daterange-foot">…summary, Cancel, Apply…</div></div></div>
 *   </div>
 *
 *   data-field="key"     on a field's item: the name of the filter, of the address parameter and of the items' data-<key>
 *   data-kind            one (radio values) · many (checkbox values; the default) · date (presets and a custom range in the
 *                        date picker) · text (contains: one input in the panel) · flag (no values: the item itself toggles)
 *   data-op="not"        on a field's item: "is not" (one and many only; "is" when absent). The chip's operator flips it.
 *   data-value           on a value's item: the value matched against the items' data-<field>; a date value is a preset
 *                        (today, 7d, 30d, month) or custom, which keeps the chosen range in data-range="2026-11-03/2026-11-09"
 *   aria-checked         the state of a value or a flag. A text field's value is its input's value attribute (defaultValue).
 *   data-fd-for="#id"    the table, table wrap or list the filter hides items of: table body rows, .fd-list-row, or the
 *                        children of anything else. An item carries data-<field> (space-separated values; an ISO date; any
 *                        value for a flag; text for contains). Items the page hides for reasons of its own (a search, a
 *                        period) carry data-fd-out: they stay hidden and out of the counts. [data-fd-none] inside the target
 *                        is shown when no item matches; a .fd-filters-clear inside it clears the filter. Counts: every
 *                        .fd-filters-count of a value shows how many items would match with that value and the other filters.
 *   data-fd-url          keeps the set in the address: ?status=done,failed&priority!=low&target=docs&date=7d&cached=yes
 *                        (a range is 2026-11-03..2026-11-09). Each change while the menu is open replaces one history entry; the
 *                        back button restores the set before it. Other parameters are left alone. One per page.
 *   data-fd-key="f"      the key that opens the menu (the default; "none" for no key). Written to the button as data-fd-keys,
 *                        so shell.js presses it outside text fields and lists it in the shortcut sheet; the button and the
 *                        search show it as a .fd-kbd.
 *   data-now="2026-11-18"  the day the date presets count back from (default today).
 *   data-fd-results="37" written by a page that filters rows itself, while it handles fd:filter: the announcement says it.
 *   data-icon-only       on fd-filters-add: the icon alone (give it aria-label="Filter"); the count becomes a badge.
 *
 * Fire adds what is missing: the search at the top of the menu (.fd-filters-search, "Add filter…"), a search in a panel of
 * more than eight values, the chip list (.fd-filters-list), the Clear button (.fd-filters-clear, hidden while nothing is set),
 * a polite live region, roles (the menu and a panel with a search are dialogs holding a role="menu"; values are
 * menuitemcheckbox or menuitemradio; a panel is named by its field) and, on a phone, the sheet (.fd-filters-sheet).
 *
 * Chips: <span class="fd-filter-token" role="listitem" data-field="status"> fd-filter-token-key, then the operator (a
 * button .fd-filters-op for one and many: "is" / "is not"; a span for date and text), the value (button .fd-filters-value:
 * one value's name, or "any of 3" with the names in its title; it reopens the field's panel), and fd-filter-token-remove.
 *
 * Keys. Menu: the search has focus; typing filters fields and values at once ("done" offers Status: Done, which sets it in
 * one step); Arrow Down / Up move into the list; Enter takes the first result; Escape clears the search, then closes and
 * returns focus. In the list: Arrow keys, Home and End, Enter and Space; Arrow Right (or Enter) opens a field's panel, Arrow
 * Left or Escape comes back; typing goes to the search; Arrow Up from the first item returns to it. A panel with a search
 * works the same, and Backspace in its empty search returns to the fields. A text panel: Enter sets it, Escape leaves it
 * unchanged. Choosing a value of a one or date field closes the menu; choosing it again clears it. Tab closes the menu.
 *
 * Phone (the app shell, or the viewport outside one, narrower than 640px): the menu opens as a bottom sheet in two steps,
 * the fields and then one field's values, with a back button and Done; the chips scroll sideways in one row (CSS).
 *
 * Events: fd:filter on .fd-filters whenever the set changes: { filters: [{ field, op, values, kind, range? }], source }.
 *   op is is | not | contains; values are data-value strings (a custom range "start/end", a text its words, a flag none);
 *   range is { start, end } (ISO dates) for a date. source: menu | search | chip | clear | url | api.
 * API: init(root), getFilters(root), setFilters(root, filters, { silent }), clearFilters(root, { silent }),
 *      matches(filters, record, { now }) — whether a record ({ field: value, values or true }) passes a set, for pages that
 *      filter their own data.
 * Labels: filters.title "Filter" · filters.search "Add filter…" · filters.find "Search {field}" · filters.list "Filters" ·
 *   filters.clear "Clear" · filters.is "is" · filters.not "is not" · filters.any "any of {count}" · filters.contains "contains" ·
 *   filters.op "{field} {op}. Change to {other}" · filters.change "{field} {op} {values}. Change" · filters.remove "Remove the {field} filter" ·
 *   filters.empty "Nothing matches “{query}”" · filters.back "All fields" · filters.done "Done" · filters.named "{name}, {count} set" ·
 *   filters.removed "{field} filter removed." · filters.cleared "Filters cleared." · filters.none "No filters" · filters.one "1 filter" · filters.many "{count} filters" ·
 *   filters.result "1 result" · filters.results "{count} results"
 */
import { $$, on, once, emit, ensureId, label } from './core.js';
import { icon } from './icons.js';
import { init as initOverlays, openMenu, closeMenu, openPopover, openDialog, closeDialog } from './overlays.js';

const doc = document;
const ROOT = '.fd-filters';
const ITEM = '.fd-menu-item';
const FIELD = '.fd-menu-item[data-field]';
const SEARCH = '.fd-filters-search > input';
const PANEL_SEARCH_MIN = 9;
const RESULTS_MAX = 40;
const PRESET_DAYS = { today: 0, '7d': 6, '30d': 29 };
const fmt = new Intl.NumberFormat(doc.documentElement.lang || undefined);
const state = new WeakMap();   // root -> { last: JSON of the set, pushed, sheet, placeholders }

/* ---------- reading the markup ---------- */
const byId = (id) => (id ? doc.getElementById(id.replace(/^#/, '')) : null);
const textIn = (el) => (el?.querySelector(':scope > .fd-menu-item-label') || el)?.textContent.replace(/\s+/g, ' ').trim() || '';
const menuOf = (root) => root.querySelector('.fd-filters-menu');
const fieldsOf = (root) => { const menu = menuOf(root); return menu ? $$(FIELD, menu).filter((f) => f.closest('.fd-menu') === menu) : []; };
const kindOf = (field) => (['one', 'many', 'date', 'text', 'flag'].includes(field.dataset.kind) ? field.dataset.kind : field.dataset.fdSubmenu ? 'many' : 'flag');
const panelOf = (field) => byId(field.dataset.fdSubmenu);
const valuesOf = (panel) => (panel ? $$(`${ITEM}[data-value]`, panel).filter((i) => i.closest('.fd-menu') === panel) : []);
const checked = (el) => el.getAttribute('aria-checked') === 'true';
const rootOf = (el) => el?.closest?.(ROOT) || byId(el?.closest?.('[data-fd-filters]')?.dataset.fdFilters) || null;
/** The chip list: inside the root, or anywhere with data-fd-filters="<root id>". */
const listIn = (root) => root.querySelector('.fd-filters-list') || (root.id ? doc.querySelector(`.fd-filters-list[data-fd-filters="${CSS.escape(root.id)}"]`) : null);
const enabled = (el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true';
const shown = (el) => !el.hidden && !el.closest('[hidden]');
const fieldFor = (root, key) => fieldsOf(root).find((f) => f.dataset.field === key) || null;
const fieldOfPanel = (panel) => (panel?.id ? doc.querySelector(`${FIELD}[data-fd-submenu="${CSS.escape(panel.id)}"]`) : null);
const textInput = (panel) => panel?.querySelector('input:not([type="search"]):not([type="hidden"])') || null;
const searchOf = (menu) => menu?.querySelector(':scope > .fd-filters-search > input') || null;
const listOf = (menu) => menu?.querySelector(':scope > [role="menu"]:not(.fd-menu)') || menu;

/* ---------- dates ---------- */
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
function rangeOf(value, now) {
  const today = parse(now) || new Date();
  if (value in PRESET_DAYS) { const start = new Date(today); start.setDate(start.getDate() - PRESET_DAYS[value]); return { start: iso(start), end: iso(today) }; }
  if (value === 'month') return { start: iso(new Date(today.getFullYear(), today.getMonth(), 1)), end: iso(today) };
  const [start, end] = String(value).split('/');
  return parse(start) ? { start: start.slice(0, 10), end: (parse(end) ? end : start).slice(0, 10) } : null;
}
const short = (s) => parse(s).toLocaleDateString(doc.documentElement.lang || undefined, { month: 'short', day: 'numeric' });
function rangeText({ start, end }) {
  if (start === end) return short(start);
  const a = parse(start), b = parse(end);
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() ? `${short(start)} – ${b.getDate()}` : `${short(start)} – ${short(end)}`;
}

/* ---------- the state, read from and written to the DOM ---------- */
function fieldState(field, root) {
  const kind = kindOf(field);
  const key = field.dataset.field;
  if (kind === 'flag') return checked(field) ? { field: key, op: 'is', values: [], kind } : null;
  const panel = panelOf(field);
  if (kind === 'text') {
    const text = (textInput(panel)?.defaultValue || '').trim();
    return text ? { field: key, op: 'contains', values: [text], kind } : null;
  }
  const on = valuesOf(panel).filter(checked);
  if (!on.length) return null;
  if (kind === 'date') {
    const item = on[0];
    const value = item.dataset.value === 'custom' ? item.dataset.range || '' : item.dataset.value;
    const range = rangeOf(value, root.dataset.now);
    return range ? { field: key, op: 'is', values: [value], kind, range } : null;
  }
  return { field: key, op: field.dataset.op === 'not' ? 'not' : 'is', values: on.map((i) => i.dataset.value), kind };
}

/** The filters that are set, in the order of the fields. */
export function getFilters(root) {
  root = typeof root === 'string' ? byId(root) : root;
  return root ? fieldsOf(root).map((f) => fieldState(f, root)).filter(Boolean) : [];
}

function writeField(field, filter) {
  const kind = kindOf(field);
  const panel = panelOf(field);
  if (kind === 'flag') { field.setAttribute('aria-checked', String(!!filter)); return; }
  if (kind === 'text') {
    const input = textInput(panel);
    if (input) { input.defaultValue = filter?.values?.[0] || ''; input.value = input.defaultValue; }
    return;
  }
  if (kind === 'one' || kind === 'many') { if (filter?.op === 'not') field.dataset.op = 'not'; else field.removeAttribute('data-op'); }
  const values = (filter?.values || []).map(String);
  for (const item of valuesOf(panel)) {
    let on = values.includes(item.dataset.value);
    if (kind === 'date' && item.dataset.value === 'custom') {
      const range = values.find((v) => v.includes('/'));
      on = !!range;
      if (range) item.dataset.range = range; else item.removeAttribute('data-range');
    }
    item.setAttribute('aria-checked', String(on));
  }
}

/** Replace the whole set. Fires fd:filter (source "api") unless silent. */
export function setFilters(root, filters = [], { silent = false, source = 'api' } = {}) {
  root = typeof root === 'string' ? byId(root) : root;
  if (!root) return;
  setup(root);
  const wanted = new Map((filters || []).map((f) => [f.field, f]));
  for (const field of fieldsOf(root)) writeField(field, wanted.get(field.dataset.field) || null);
  sync(root, source, { silent });
}

/** Remove every filter. */
export function clearFilters(root, options = {}) { setFilters(root, [], { source: 'clear', ...options }); }

/** Whether a record passes a set of filters: { status: 'failed', labels: ['bug', 'ui'], cached: true, at: '2026-11-14' }. */
export function matches(filters, record, { now } = {}) {
  return (filters || []).every((f) => test(f, record?.[f.field], now));
}
function test(f, raw, now) {
  const present = raw !== undefined && raw !== null && raw !== false && raw !== 'false' && raw !== 'no';
  if (f.kind === 'flag' || (!f.kind && !f.values?.length)) return present;
  if (f.op === 'contains') return present && String(Array.isArray(raw) ? raw.join(' ') : raw).toLowerCase().includes(String(f.values[0]).toLowerCase());
  if (f.kind === 'date') {
    const range = f.range || rangeOf(f.values[0], now);
    const day = String(raw ?? '').slice(0, 10);
    return !!range && present && day >= range.start && day <= range.end;
  }
  const tokens = Array.isArray(raw) ? raw.map(String) : String(raw ?? '').split(/\s+/).filter(Boolean);
  const hit = f.values.some((v) => tokens.includes(String(v)));
  return f.op === 'not' ? !hit : hit;
}

/* ---------- setup ---------- */
const clearOf = (root) => { const list = listIn(root); const next = list?.nextElementSibling; return next?.matches('.fd-filters-clear') ? next : root.querySelector(':scope > .fd-filters-clear'); };
function setup(root) {
  if (!once(root, 'fd-filters')) return;
  ensureId(root, 'fd-filters');
  const menu = menuOf(root);
  const add = root.querySelector('.fd-filters-add');
  const key = (root.dataset.fdKey ?? 'f').trim().toLowerCase();
  state.set(root, { last: '[]', pushed: false, sheet: null, home: new Map() });

  if (add) {
    if (!add.hasAttribute('type')) add.type = 'button';
    if (menu && !add.dataset.fdMenu) add.dataset.fdMenu = ensureId(menu, 'fd-filters-menu');
    if (add.hasAttribute('data-icon-only') && !add.hasAttribute('aria-label')) add.setAttribute('aria-label', label(root, 'filters.title', 'Filter'));
    add.dataset.fdName = add.getAttribute('aria-label') || '';
    if (key && key !== 'none' && key.length === 1) {
      if (!add.hasAttribute('data-fd-keys')) add.dataset.fdKeys = key;
      if (!add.hasAttribute('data-fd-keys-label')) add.dataset.fdKeysLabel = label(root, 'filters.title', 'Filter');
      add.setAttribute('aria-keyshortcuts', key.toUpperCase());
      if (!add.querySelector(':scope > .fd-kbd')) add.insertAdjacentHTML('beforeend', `<kbd class="fd-kbd" aria-hidden="true">${key.toUpperCase()}</kbd>`);
    }
  }
  let list = listIn(root);
  if (!list) {
    list = doc.createElement('div');
    list.className = 'fd-filters-list';
    if (add) add.after(list); else root.prepend(list);
  }
  list.setAttribute('role', 'list');
  if (!list.hasAttribute('aria-label')) list.setAttribute('aria-label', label(root, 'filters.list', 'Filters'));
  let clear = clearOf(root);
  if (!clear) {
    clear = doc.createElement('button');
    clear.type = 'button';
    clear.className = 'fd-btn-text fd-filters-clear';
    clear.textContent = label(root, 'filters.clear', 'Clear');
    if (!root.contains(list)) clear.dataset.fdFilters = root.id;
    list.after(clear);
  }
  if (!root.querySelector(':scope > [data-fd-filters-live]')) root.insertAdjacentHTML('beforeend', '<span class="fd-sr-only" data-fd-filters-live aria-live="polite"></span>');

  if (menu) setupMenu(root, menu, key);
  if (root.hasAttribute('data-fd-url')) readUrl(root);
  render(root);
  apply(root, getFilters(root));
  state.get(root).last = JSON.stringify(getFilters(root));
  watch(root);
}

/** Rows written later, or a page's own data-fd-out: filter again. Follows the target if the page replaces it. */
function watch(root) {
  const st = state.get(root);
  const target = targetOf(root);
  if (!st || !target || st.watched === target || !('MutationObserver' in window)) return;
  st.observer?.disconnect();
  st.watched = target;
  let queued = false;
  st.observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; apply(root, getFilters(root)); });
  });
  st.observer.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-fd-out'] });
  apply(root, getFilters(root));
}

/** Search row: an icon, the input, the key. */
function searchRow(placeholder, aria, key) {
  const row = doc.createElement('div');
  row.className = 'fd-filters-search';
  row.innerHTML = `${icon('search')}<input type="search" autocomplete="off" spellcheck="false">${key ? `<kbd class="fd-kbd" aria-hidden="true">${key.toUpperCase()}</kbd>` : ''}`;
  const input = row.querySelector('input');
  input.placeholder = placeholder;
  input.setAttribute('aria-label', aria);
  return row;
}

/** A surface with a search is a dialog holding a role="menu" (a text box cannot sit in a menu); without one it is the menu. */
function wrap(surface, name) {
  const search = surface.querySelector(':scope > .fd-filters-search');
  if (!search) { surface.setAttribute('role', 'menu'); surface.setAttribute('aria-label', name); return; }
  surface.setAttribute('role', 'dialog');
  surface.setAttribute('aria-label', name);
  let menu = surface.querySelector(':scope > [role="menu"]:not(.fd-menu)');
  if (!menu) {
    menu = doc.createElement('div');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', name);
    menu.append(...[...surface.childNodes].filter((n) => n !== search && !(n.nodeType === 1 && n.matches('.fd-menu'))));
    search.after(menu);
  }
}

function setupMenu(root, menu, key) {
  const title = label(root, 'filters.title', 'Filter');
  if (!menu.querySelector(':scope > .fd-filters-search')) menu.prepend(searchRow(label(root, 'filters.search', 'Add filter…'), label(root, 'filters.search', 'Add filter…').replace(/…$/, ''), key !== 'none' && key.length === 1 ? key : ''));
  wrap(menu, menu.getAttribute('aria-label') || title);
  for (const field of fieldsOf(root)) {
    const kind = kindOf(field);
    const name = textIn(field);
    if (kind === 'flag') { field.setAttribute('role', 'menuitemcheckbox'); if (!field.hasAttribute('aria-checked')) field.setAttribute('aria-checked', 'false'); continue; }
    const panel = panelOf(field);
    if (!panel) continue;
    if (kind === 'text') {
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', name);
      const input = textInput(panel);
      if (input && !input.hasAttribute('aria-label')) input.setAttribute('aria-label', `${name} ${label(root, 'filters.contains', 'contains')}`);
      continue;
    }
    const values = valuesOf(panel);
    for (const item of values) {
      item.setAttribute('role', kind === 'many' ? 'menuitemcheckbox' : 'menuitemradio');
      if (!item.hasAttribute('aria-checked')) item.setAttribute('aria-checked', 'false');
      item.tabIndex = -1;
      if (item.matches('button') && !item.hasAttribute('type')) item.type = 'button';
    }
    if (values.length >= PANEL_SEARCH_MIN && !panel.querySelector(':scope > .fd-filters-search')) {
      const find = label(root, 'filters.find', 'Search {field}', { field: name.toLowerCase() });
      panel.prepend(searchRow(`${find}…`, find, ''));
    }
    wrap(panel, name);
  }
}

/* ---------- rendering: chips, the button, the menu's hints ---------- */
const opWord = (root, f) => (f.op === 'contains' ? label(root, 'filters.contains', 'contains') : f.op === 'not' ? label(root, 'filters.not', 'is not') : label(root, 'filters.is', 'is'));
function valueNames(root, field, f) {
  if (f.kind === 'text') return [`“${f.values[0]}”`];
  if (f.kind === 'date') {
    const item = valuesOf(panelOf(field)).find(checked);
    return [item && item.dataset.value !== 'custom' ? textIn(item) : rangeText(f.range)];
  }
  const items = valuesOf(panelOf(field));
  return f.values.map((v) => textIn(items.find((i) => i.dataset.value === v)) || v);
}
function valueText(root, field, f) {
  const names = valueNames(root, field, f);
  return names.length > 1 ? label(root, 'filters.any', 'any of {count}', { count: names.length }) : names[0] || '';
}

function render(root) {
  const filters = getFilters(root);
  const list = listIn(root);
  const byField = new Map(filters.map((f) => [f.field, f]));
  // Chips are updated in place, so a button that opened a panel stays the same element.
  for (const chip of $$(':scope > .fd-filter-token', list)) if (!byField.has(chip.dataset.field)) chip.remove();
  let before = null;
  for (const f of filters) {
    const field = fieldFor(root, f.field);
    const name = textIn(field);
    let chip = list.querySelector(`:scope > .fd-filter-token[data-field="${CSS.escape(f.field)}"]`);
    const flips = f.kind === 'one' || f.kind === 'many';
    const opens = f.kind !== 'flag';
    if (!chip || chip.dataset.kind !== f.kind) {
      chip?.remove();
      chip = doc.createElement('span');
      chip.className = 'fd-filter-token';
      chip.setAttribute('role', 'listitem');
      chip.dataset.field = f.field;
      chip.dataset.kind = f.kind;
      // Spaces between the parts, so the chip reads as a sentence when its text is taken whole.
      chip.innerHTML = `<span class="fd-filter-token-key"></span> ${flips ? '<button class="fd-filters-op" type="button"></button> ' : opens ? '<span class="fd-filters-op"></span> ' : ''}`
        + `${opens ? '<button class="fd-filters-value" type="button" aria-haspopup="menu" aria-expanded="false"></button> ' : ''}`
        + `<button class="fd-filter-token-remove" type="button">${icon('x')}</button>`;
    }
    const op = opWord(root, f);
    chip.querySelector('.fd-filter-token-key').textContent = name;
    const opEl = chip.querySelector('.fd-filters-op');
    if (opEl) {
      opEl.textContent = op;
      if (flips) opEl.setAttribute('aria-label', label(root, 'filters.op', '{field} {op}. Change to {other}', { field: name, op, other: f.op === 'not' ? label(root, 'filters.is', 'is') : label(root, 'filters.not', 'is not') }));
    }
    const valueEl = chip.querySelector('.fd-filters-value');
    if (valueEl) {
      const names = valueNames(root, field, f);
      valueEl.textContent = valueText(root, field, f);
      valueEl.title = names.join(', ');
      valueEl.setAttribute('aria-label', label(root, 'filters.change', '{field} {op} {values}. Change', { field: name, op, values: names.join(', ') }));
    }
    chip.querySelector('.fd-filter-token-remove').setAttribute('aria-label', label(root, 'filters.remove', 'Remove the {field} filter', { field: name }));
    if (before ? before.nextElementSibling !== chip : list.firstElementChild !== chip) { if (before) before.after(chip); else list.prepend(chip); }
    before = chip;
  }
  // The button: how many are set.
  const add = root.querySelector('.fd-filters-add');
  if (add) {
    let count = add.querySelector(':scope > .fd-filters-count');
    if (filters.length) {
      if (!count) {
        count = doc.createElement('span');
        count.className = 'fd-filters-count';
        count.setAttribute('aria-hidden', 'true');
        const kbd = add.querySelector(':scope > .fd-kbd');
        if (kbd) kbd.before(count); else add.append(count);
      }
      count.textContent = fmt.format(filters.length);
      const base = add.dataset.fdName || label(root, 'filters.title', 'Filter');
      add.setAttribute('aria-label', label(root, 'filters.named', '{name}, {count} set', { name: base, count: filters.length }));
    } else {
      count?.remove();
      if (add.dataset.fdName) add.setAttribute('aria-label', add.dataset.fdName); else add.removeAttribute('aria-label');
    }
  }
  const clear = clearOf(root);
  if (clear) clear.hidden = !filters.length;
  // Fields that are set say so in the menu.
  for (const field of fieldsOf(root)) {
    if (kindOf(field) === 'flag') continue;
    const f = byField.get(field.dataset.field);
    let hint = field.querySelector(':scope > .fd-menu-item-hint');
    if (f) {
      if (!hint) { hint = doc.createElement('span'); hint.className = 'fd-menu-item-hint'; field.append(hint); }
      hint.textContent = `${f.op === 'not' ? `${opWord(root, f)} ` : ''}${valueText(root, field, f)}`;
    } else hint?.remove();
  }
}

/* ---------- the items it filters (data-fd-for) ---------- */
function targetOf(root) {
  const sel = root.dataset.fdFor;
  if (!sel) return null;
  try { return doc.querySelector(sel); } catch { return null; }
}
function itemsOf(target) {
  const table = target.matches('table') ? target : target.querySelector(':scope table, :scope .fd-table');
  let items;
  if (table) items = $$(':scope > tbody > tr', table).filter((tr) => !tr.matches('.fd-table-detail, .fd-table-state, .fd-table-group-head, [data-skeleton]'));
  else if (target.matches('.fd-list')) items = $$(':scope > .fd-list-row, :scope > li', target);
  else items = [...target.children];
  return items.filter((el) => !el.closest('[data-fd-none]'));
}
const attr = (item, key) => item.getAttribute(`data-${key}`);
function apply(root, filters) {
  const target = targetOf(root);
  if (!target) return null;
  const now = root.dataset.now;
  const items = itemsOf(target).filter((el) => !el.hasAttribute('data-fd-out'));
  for (const el of itemsOf(target)) if (el.hasAttribute('data-fd-out')) el.hidden = true;
  let count = 0;
  for (const el of items) {
    const ok = filters.every((f) => test(f, attr(el, f.field), now));
    if (el.hidden === ok) el.hidden = !ok;
    if (ok) count += 1;
  }
  for (const none of $$('[data-fd-none]', target)) none.hidden = !(count === 0 && items.length > 0);
  // Counts: how many items each value would leave, with the other filters as they are.
  for (const field of fieldsOf(root)) {
    const key = field.dataset.field;
    const kind = kindOf(field);
    const others = filters.filter((f) => f.field !== key);
    const pool = items.filter((el) => others.every((f) => test(f, attr(el, f.field), now)));
    if (kind === 'flag') {
      const slot = field.querySelector('.fd-filters-count');
      if (slot) slot.textContent = fmt.format(pool.filter((el) => test({ kind: 'flag', values: [] }, attr(el, key))).length);
      continue;
    }
    for (const item of valuesOf(panelOf(field))) {
      const slot = item.querySelector('.fd-filters-count');
      if (!slot || item.dataset.value === 'custom') continue;
      const probe = kind === 'date' ? { kind, op: 'is', values: [item.dataset.value] } : { kind, op: 'is', values: [item.dataset.value] };
      slot.textContent = fmt.format(pool.filter((el) => test(probe, attr(el, key), now)).length);
    }
  }
  return count;
}

/* ---------- one change: chips, items, address, event, announcement ---------- */
function sync(root, source, { silent = false } = {}) {
  const filters = getFilters(root);
  const st = state.get(root);
  const json = JSON.stringify(filters);
  const previous = st ? JSON.parse(st.last) : [];
  render(root);
  const count = apply(root, filters);
  if (st) st.last = json;
  if (silent || (st && json === JSON.stringify(previous) && source !== 'api')) return;
  if (root.hasAttribute('data-fd-url') && source !== 'url') writeUrl(root, filters);
  delete root.dataset.fdResults;
  emit(root, 'fd:filter', { filters, source });
  announce(root, previous, filters, count ?? (root.dataset.fdResults ? Number(root.dataset.fdResults) : null));
}

function announce(root, previous, filters, results) {
  const live = root.querySelector(':scope > [data-fd-filters-live]');
  if (!live) return;
  const before = new Map(previous.map((f) => [f.field, JSON.stringify(f)]));
  const changed = filters.filter((f) => before.get(f.field) !== JSON.stringify(f));
  const removed = previous.filter((f) => !filters.some((g) => g.field === f.field));
  let what = '';
  if (!filters.length && previous.length > 1) what = label(root, 'filters.cleared', 'Filters cleared.');
  else if (changed.length === 1 && !removed.length) {
    const f = changed[0];
    const field = fieldFor(root, f.field);
    what = `${textIn(field)} ${f.kind === 'flag' ? '' : `${opWord(root, f)} ${valueNames(root, field, f).join(', ')}`}`.trim() + '.';
  } else if (removed.length === 1 && !changed.length) what = label(root, 'filters.removed', '{field} filter removed.', { field: textIn(fieldFor(root, removed[0].field)) });
  const set = !filters.length ? label(root, 'filters.none', 'No filters') : filters.length === 1 ? label(root, 'filters.one', '1 filter') : label(root, 'filters.many', '{count} filters', { count: fmt.format(filters.length) });
  const found = Number.isFinite(results) ? (results === 1 ? label(root, 'filters.result', '1 result') : label(root, 'filters.results', '{count} results', { count: fmt.format(results) })) : '';
  live.textContent = `${what ? `${what} ` : ''}${set}${found ? `, ${found}` : ''}.`;
}

/* ---------- the address (data-fd-url) ---------- */
const enc = (s) => encodeURIComponent(s);
function writeUrl(root, filters) {
  const keys = new Set(fieldsOf(root).flatMap((f) => [f.dataset.field, `${f.dataset.field}!`]));
  const kept = location.search.slice(1).split('&').filter((p) => p && !keys.has(decodeURIComponent(p.split('=')[0])));
  const mine = filters.map((f) => {
    if (f.kind === 'flag') return `${enc(f.field)}=yes`;
    const values = f.kind === 'date' ? [f.values[0].replace('/', '..')] : f.values;
    return `${enc(f.field)}${f.op === 'not' ? '!' : ''}=${values.map(enc).join(',')}`;
  });
  const query = [...kept, ...mine].join('&');
  const url = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
  if (url === `${location.pathname}${location.search}${location.hash}`) return;
  const st = state.get(root);
  const open = !!root.querySelector('.fd-menu[data-state="open"]') || !!st?.sheet?.open;
  if (open && st?.pushed) history.replaceState(history.state, '', url);
  else { history.pushState(history.state, '', url); if (st) st.pushed = open; }
}
function readUrl(root, { emitChange = false } = {}) {
  const params = new Map();
  for (const pair of location.search.slice(1).split('&')) {
    if (!pair) continue;
    const at = pair.indexOf('=');
    const key = decodeURIComponent(at < 0 ? pair : pair.slice(0, at));
    params.set(key, at < 0 ? '' : pair.slice(at + 1));
  }
  const filters = [];
  for (const field of fieldsOf(root)) {
    const key = field.dataset.field;
    const kind = kindOf(field);
    const not = params.has(`${key}!`);
    if (!params.has(key) && !not) continue;
    const raw = params.get(not ? `${key}!` : key);
    const values = raw.split(',').map((v) => decodeURIComponent(v)).filter(Boolean);
    if (kind === 'flag') filters.push({ field: key, op: 'is', values: [], kind });
    else if (kind === 'text') { if (values.length) filters.push({ field: key, op: 'contains', values: [values.join(',')], kind }); }
    else if (kind === 'date') { if (values[0]) filters.push({ field: key, op: 'is', values: [values[0].replace('..', '/')], kind }); }
    else if (values.length) filters.push({ field: key, op: not ? 'not' : 'is', values: kind === 'one' ? values.slice(0, 1) : values, kind });
  }
  const wanted = new Map(filters.map((f) => [f.field, f]));
  for (const field of fieldsOf(root)) writeField(field, wanted.get(field.dataset.field) || null);
  if (emitChange) sync(root, 'url');
}

/* ---------- search: fields and values at once ---------- */
function searchMenu(root, menu, query) {
  const q = query.trim().toLowerCase();
  const host = listOf(menu);
  for (const el of $$(':scope > [data-fd-result], :scope > [data-fd-filters-empty]', host)) el.remove();
  const own = [...host.children].filter((el) => !el.matches('.fd-menu'));
  // A field's values left open beside the menu no longer belong to what shows.
  for (const panel of $$('.fd-filters-panel[data-state="open"]', menu)) panel.hidePopover?.();
  for (const el of own) if (el.hasAttribute('data-fd-hid')) { el.hidden = false; el.removeAttribute('data-fd-hid'); }
  if (!q) return;
  const hide = (el) => { if (!el.hidden) { el.hidden = true; el.dataset.fdHid = ''; } };
  const hits = (text, keywords = '') => `${text} ${keywords}`.toLowerCase().includes(q);
  let found = 0;
  for (const el of own) {
    if (el.matches(FIELD) && hits(textIn(el), el.dataset.keywords)) { found += 1; continue; }
    hide(el);
  }
  const results = [];
  for (const field of fieldsOf(root)) {
    const kind = kindOf(field);
    if (!['one', 'many', 'date'].includes(kind)) continue;
    for (const item of valuesOf(panelOf(field))) {
      if (item.dataset.value === 'custom' || !hits(textIn(item), item.dataset.keywords) || results.length >= RESULTS_MAX) continue;
      const result = doc.createElement('button');
      result.type = 'button';
      result.className = 'fd-menu-item';
      result.tabIndex = -1;
      result.dataset.fdResult = field.dataset.field;
      result.dataset.value = item.dataset.value;
      result.setAttribute('role', kind === 'many' ? 'menuitemcheckbox' : 'menuitemradio');
      result.setAttribute('aria-checked', String(checked(item)));
      const lead = item.querySelector(':scope > :is(.fd-icon, i[data-icon], svg, .fd-status, .fd-avatar, .fd-tile)');
      result.innerHTML = `${lead ? lead.outerHTML : ''}<span class="fd-menu-item-label"></span><span class="fd-menu-item-hint"></span>`;
      result.querySelector('.fd-menu-item-label').textContent = textIn(item);
      result.querySelector('.fd-menu-item-hint').textContent = textIn(field);
      result.setAttribute('aria-label', `${textIn(field)}: ${textIn(item)}`);
      results.push(result);
    }
  }
  host.append(...results);
  if (!found && !results.length) {
    const empty = doc.createElement('p');
    empty.className = 'fd-checklist-empty';
    empty.dataset.fdFiltersEmpty = '';
    empty.setAttribute('role', 'none');
    empty.textContent = label(root, 'filters.empty', 'Nothing matches “{query}”', { query: query.trim() });
    host.append(empty);
  }
}
function searchPanel(root, panel, query) {
  const q = query.trim().toLowerCase();
  const host = listOf(panel);
  host.querySelector(':scope > [data-fd-filters-empty]')?.remove();
  let found = 0;
  for (const item of valuesOf(panel)) {
    const ok = !q || `${textIn(item)} ${item.dataset.keywords || ''}`.toLowerCase().includes(q);
    item.hidden = !ok;
    if (ok) found += 1;
  }
  if (!found) {
    const empty = doc.createElement('p');
    empty.className = 'fd-checklist-empty';
    empty.dataset.fdFiltersEmpty = '';
    empty.setAttribute('role', 'none');
    empty.textContent = label(root, 'filters.empty', 'Nothing matches “{query}”', { query: query.trim() });
    host.append(empty);
  }
}
function resetSearch(root, surface) {
  const input = searchOf(surface);
  if (!input || !input.value) return;
  input.value = '';
  if (surface.matches('.fd-filters-menu')) searchMenu(root, surface, ''); else searchPanel(root, surface, '');
}

/* Choosing a value from the search sets it in one step and closes the menu. */
function chooseResult(root, result) {
  const field = fieldFor(root, result.dataset.fdResult);
  if (!field) return;
  const kind = kindOf(field);
  const items = valuesOf(panelOf(field));
  const item = items.find((i) => i.dataset.value === result.dataset.value);
  if (!item) return;
  const on = !checked(item);
  if (kind !== 'many') for (const i of items) i.setAttribute('aria-checked', 'false');
  item.setAttribute('aria-checked', String(on));
  sync(root, 'search');
  const menu = menuOf(root);
  const st = state.get(root);
  if (st?.sheet?.open) { resetSearch(root, menu); focusFirst(menu); return; }
  closeMenu(menu, true);
}

/* ---------- opening a field's panel from its chip ---------- */
function openFromChip(root, button) {
  const field = fieldFor(root, button.closest('.fd-filter-token')?.dataset.field);
  const panel = field && panelOf(field);
  if (!panel) return;
  if (isPhone(root)) { openSheet(root, button, field); return; }
  if (panel.dataset.state === 'open') { closeMenu(panel, true); return; }
  if (panel.parentElement?.closest('.fd-menu')) root.append(panel);   // out of the closed menu, so it can show on its own
  openMenu(panel, { trigger: button, focus: 'first', placement: 'bottom-start' });
}

/* ---------- the phone sheet ---------- */
function isPhone(root) {
  const app = root.closest('.fd-app');
  return (app ? app.clientWidth : innerWidth) < 640;
}
function sheetOf(root) {
  const st = state.get(root);
  if (st.sheet?.isConnected) return st.sheet;
  const sheet = doc.createElement('dialog');
  sheet.className = 'fd-sheet fd-filters-sheet';
  sheet.dataset.side = 'bottom';
  const title = ensureId(doc.createElement('span'), 'fd-filters-title');
  sheet.setAttribute('aria-labelledby', title);
  sheet.innerHTML = `<div class="fd-sheet-head"><div class="fd-sheet-bar">
    <button class="fd-btn fd-filters-back" type="button" data-variant="ghost" data-size="sm" data-icon-only hidden>${icon('chevron-left')}</button>
    <h2 class="fd-sheet-title" id="${title}"></h2>
    <button class="fd-btn" type="button" data-size="sm" data-variant="primary" data-fd-dialog-close></button></div></div>
    <div class="fd-sheet-body"></div>`;
  sheet.querySelector('.fd-filters-back').setAttribute('aria-label', label(root, 'filters.back', 'All fields'));
  sheet.querySelector('[data-fd-dialog-close]').textContent = label(root, 'filters.done', 'Done');
  root.append(sheet);
  st.sheet = sheet;
  return sheet;
}
function park(root, el) {
  const st = state.get(root);
  if (st.home.has(el)) return;
  const mark = doc.createComment('fd-filters');
  el.before(mark);
  st.home.set(el, mark);
}
function unpark(root, el) {
  const st = state.get(root);
  const mark = st.home.get(el);
  if (!mark) return;
  mark.replaceWith(el);
  st.home.delete(el);
  el.removeAttribute('data-static-demo');
  el.hidden = false;
}
function openSheet(root, trigger, field = null) {
  const sheet = sheetOf(root);
  const menu = menuOf(root);
  const body = sheet.querySelector('.fd-sheet-body');
  park(root, menu);
  menu.dataset.staticDemo = '';
  body.append(menu);
  resetSearch(root, menu);
  showFields(root, false);
  if (!sheet.open) openDialog(sheet, { trigger });
  if (field) drill(root, field); else searchOf(menu)?.focus();
}
function showFields(root, focus = true) {
  const sheet = sheetOf(root);
  const st = state.get(root);
  const menu = menuOf(root);
  const open = st.drilled;
  if (open) { unpark(root, open); st.drilled = null; }
  menu.hidden = false;
  sheet.querySelector('.fd-filters-back').hidden = true;
  sheet.querySelector('.fd-sheet-title').textContent = label(root, 'filters.title', 'Filter');
  if (focus && open) (fieldOfPanel(open) || searchOf(menu))?.focus();
}
function drill(root, field) {
  const sheet = sheetOf(root);
  const st = state.get(root);
  const panel = panelOf(field);
  if (!panel) return;
  park(root, panel);
  panel.dataset.staticDemo = '';
  sheet.querySelector('.fd-sheet-body').append(panel);
  st.drilled = panel;
  menuOf(root).hidden = true;
  sheet.querySelector('.fd-filters-back').hidden = false;
  sheet.querySelector('.fd-sheet-title').textContent = textIn(field);
  resetSearch(root, panel);
  const input = textInput(panel);
  (input || valuesOf(panel).find((i) => checked(i)) || valuesOf(panel).find(shown))?.focus();
}
function closeSheet(root) {
  const st = state.get(root);
  if (!st?.sheet) return;
  if (st.drilled) { const panel = st.drilled; commitText(root, panel); unpark(root, panel); st.drilled = null; }
  unpark(root, menuOf(root));
}
function focusFirst(surface) { valuesOrItems(surface).find((i) => shown(i) && enabled(i))?.focus(); }
const valuesOrItems = (surface) => $$(ITEM, surface).filter((i) => i.closest('.fd-menu') === surface);

/* Keys inside the sheet: its menus are drawn in place, so the sheet moves focus itself. */
function sheetKey(event, root, sheet) {
  const st = state.get(root);
  const t = event.target;
  const surface = st.drilled || menuOf(root);
  const items = valuesOrItems(surface).filter((i) => shown(i) && enabled(i));
  const search = searchOf(surface);
  const input = textInput(st.drilled);
  const back = () => { event.preventDefault(); event.stopPropagation(); showFields(root); };
  if (t === search) {
    if (event.key === 'ArrowDown' && items.length) { event.preventDefault(); items[0].focus(); }
    else if (event.key === 'Enter' && items.length) { event.preventDefault(); items[0].click(); }
    else if (event.key === 'Escape' && search.value) { event.preventDefault(); event.stopPropagation(); resetSearch(root, surface); }
    else if ((event.key === 'Escape' || (event.key === 'Backspace' && !search.value)) && st.drilled) back();
    return;
  }
  if (t === input) {
    if (event.key === 'Enter') { event.preventDefault(); commitText(root, st.drilled); showFields(root); }
    else if (event.key === 'Escape') { input.value = input.defaultValue; back(); }
    return;
  }
  const item = t.closest(ITEM);
  if (!item) { if (event.key === 'Escape' && st.drilled) back(); return; }
  const i = items.indexOf(item);
  const move = (to) => { event.preventDefault(); event.stopPropagation(); to?.focus(); };
  switch (event.key) {
    case 'ArrowDown': move(items[(i + 1) % items.length]); return;
    case 'ArrowUp': move(i <= 0 && search ? search : items[(i - 1 + items.length) % items.length]); return;
    case 'Home': move(items[0]); return;
    case 'End': move(items[items.length - 1]); return;
    case 'ArrowRight': if (item.matches(FIELD) && item.dataset.fdSubmenu) { event.preventDefault(); drill(root, item); } return;
    case 'ArrowLeft': if (st.drilled) back(); return;
    case 'Escape': if (st.drilled) back(); return;
    default:
      if (search && event.key.length === 1 && event.key !== ' ' && !event.metaKey && !event.ctrlKey && !event.altKey) { event.stopPropagation(); search.focus(); }
  }
}

/* ---------- text fields ---------- */
function commitText(root, panel, { discard = false } = {}) {
  const input = textInput(panel);
  if (!input) return;
  if (discard) { input.value = input.defaultValue; return; }
  const value = input.value.trim();
  if (value === input.defaultValue) return;
  input.defaultValue = value;
  input.value = value;
  sync(root, 'menu');
}

/* ---------- keys in the desktop menu ---------- */
function onKey(event) {
  const t = event.target;
  if (!(t instanceof Element)) return;
  const root = rootOf(t);
  if (!root || !state.has(root)) return;
  const sheet = t.closest('.fd-filters-sheet');
  if (sheet) { if (sheet.open) sheetKey(event, root, sheet); return; }
  const surface = t.closest('.fd-menu');
  if (!surface || surface.dataset.state !== 'open' || !root.contains(surface)) return;
  const items = valuesOrItems(surface).filter((i) => shown(i) && enabled(i));
  const search = searchOf(surface);
  const sub = surface.matches('.fd-filters-panel') && !!fieldOfPanel(surface) && surface.parentElement?.closest('.fd-menu');
  const back = () => { if (sub) surface.hidePopover?.(); else closeMenu(surface, true); };
  const mod = event.metaKey || event.ctrlKey || event.altKey;

  if (t === search) {
    event.stopPropagation();   // the menu's typeahead must not take the letters
    switch (event.key) {
      case 'ArrowDown': if (items.length) { event.preventDefault(); items[0].focus(); } return;
      case 'ArrowUp': if (items.length) { event.preventDefault(); items[items.length - 1].focus(); } return;
      case 'Enter': {
        event.preventDefault();
        const first = search.value.trim() && items[0];
        if (!first) return;
        first.click();
        // A flag found by the search is set in one step too, like a value.
        if (first.matches(FIELD) && kindOf(first) === 'flag' && surface.dataset.state === 'open') closeMenu(surface, true);
        return;
      }
      case 'Escape':
        event.preventDefault();
        if (search.value) resetSearch(root, surface); else back();
        return;
      case 'Backspace': if (!search.value && sub) { event.preventDefault(); back(); } return;
      case 'Tab': closeMenu(surface, true); return;
      default: return;
    }
  }
  if (t === textInput(surface)) {
    event.stopPropagation();
    if (event.key === 'Enter') { event.preventDefault(); commitText(root, surface); closeMenu(surface, true); }
    else if (event.key === 'Escape') { event.preventDefault(); commitText(root, surface, { discard: true }); back(); }
    else if (event.key === 'Tab') closeMenu(surface, true);
    return;
  }
  const item = t.closest(ITEM);
  if (!item || !search) return;
  if (event.key === 'ArrowUp' && items[0] === item) { event.preventDefault(); event.stopPropagation(); search.focus(); return; }
  if (event.key === 'Backspace') { event.preventDefault(); event.stopPropagation(); search.focus(); search.value = search.value.slice(0, -1); search.dispatchEvent(new Event('input', { bubbles: true })); return; }
  if (event.key.length === 1 && event.key !== ' ' && !mod) { event.stopPropagation(); search.focus(); }   // the letter lands in the search
}

/* ---------- clicks ---------- */
function onClickCapture(event) {
  const t = event.target instanceof Element ? event.target : null;
  const root = rootOf(t);
  if (!root || !state.has(root)) return;
  // The button on a phone opens the sheet instead of the menu.
  const add = t.closest('.fd-filters-add');
  if (add && isPhone(root) && menuOf(root)) { event.preventDefault(); event.stopPropagation(); openSheet(root, add); return; }
  const item = t.closest(ITEM);
  if (!item || !enabled(item)) return;
  if (item.hasAttribute('data-fd-result')) { event.preventDefault(); event.stopPropagation(); chooseResult(root, item); return; }
  const sheet = item.closest('.fd-filters-sheet');
  if (sheet && item.matches(FIELD) && item.dataset.fdSubmenu) { event.preventDefault(); event.stopPropagation(); drill(root, item); return; }
  // Custom range: the date picker, anchored where the menu was opened.
  if (item.dataset.value === 'custom' && item.dataset.fdPopover) {
    event.preventDefault();
    event.stopPropagation();
    const pop = byId(item.dataset.fdPopover);
    const opener = root.querySelector('.fd-filters-add');
    if (sheet) closeDialog(sheet); else closeMenu(menuOf(root), false);
    if (item.closest('.fd-filters-panel')?.dataset.state === 'open') closeMenu(item.closest('.fd-filters-panel'), false);
    if (pop && openPopover(pop, { trigger: opener })) pop.querySelector('.fd-calendar-day[tabindex="0"]')?.focus();
    return;
  }
  // A value of a one or date field chosen again clears the field.
  if (item.getAttribute('role') === 'menuitemradio' && checked(item)) item.dataset.fdWas = '';
}

function onChange(event) {
  const t = event.target;
  if (!(t instanceof Element)) return;
  const root = rootOf(t);
  if (!root || !state.has(root)) return;
  if (t.matches('[data-fd-daterange]')) {
    const field = fieldsOf(root).find((f) => kindOf(f) === 'date');
    const custom = field && valuesOf(panelOf(field)).find((i) => i.dataset.value === 'custom');
    const { start, end } = event.detail?.value || {};
    if (!custom || !start) return;
    for (const i of valuesOf(panelOf(field))) i.setAttribute('aria-checked', String(i === custom));
    custom.dataset.range = `${start}/${end || start}`;
    sync(root, 'menu');
    return;
  }
  if (!t.matches(ITEM)) return;
  if (t.hasAttribute('data-fd-was')) { t.removeAttribute('data-fd-was'); t.setAttribute('aria-checked', 'false'); }
  sync(root, 'menu');
  // On the phone a single value returns to the fields.
  const st = state.get(root);
  if (st.sheet?.open && st.drilled && t.getAttribute('role') === 'menuitemradio') showFields(root);
}

function bindGlobal() {
  doc.addEventListener('keydown', onKey, true);
  doc.addEventListener('click', onClickCapture, true);
  doc.addEventListener('fd:change', onChange);
  on(doc, 'input', `${ROOT} ${SEARCH}`, (_event, input) => {
    const root = rootOf(input);
    const surface = input.closest('.fd-menu');
    if (!root || !surface) return;
    if (surface.matches('.fd-filters-menu')) searchMenu(root, surface, input.value); else searchPanel(root, surface, input.value);
  });
  on(doc, 'click', '.fd-filters-op', (event, btn) => {
    if (!btn.matches('button')) return;
    const root = rootOf(btn);
    const field = root && fieldFor(root, btn.closest('.fd-filter-token')?.dataset.field);
    if (!field) return;
    if (field.dataset.op === 'not') field.removeAttribute('data-op'); else field.dataset.op = 'not';
    sync(root, 'chip');
  });
  on(doc, 'click', '.fd-filters-value', (event, btn) => { const root = rootOf(btn); if (root) { event.preventDefault(); openFromChip(root, btn); } });
  on(doc, 'click', '.fd-filters-list .fd-filter-token-remove', (_event, btn) => {
    const root = rootOf(btn);
    const chip = btn.closest('.fd-filter-token');
    const field = root && fieldFor(root, chip?.dataset.field);
    if (!field) return;
    const next = chip.nextElementSibling?.querySelector('.fd-filter-token-remove') || chip.previousElementSibling?.querySelector('.fd-filter-token-remove') || root.querySelector('.fd-filters-add');
    writeField(field, null);
    sync(root, 'chip');
    next?.focus();
  });
  doc.addEventListener('click', (event) => {
    const btn = event.target instanceof Element ? event.target.closest('.fd-filters-clear') : null;
    if (!btn) return;
    const root = rootOf(btn) || $$(`${ROOT}[data-fd-for]`).find((r) => targetOf(r)?.contains(btn));
    if (!root) return;
    event.preventDefault();
    clearFilters(root, { source: 'clear' });
    root.querySelector('.fd-filters-add')?.focus();
  });
  on(doc, 'click', `${ROOT} .fd-filters-back`, (_event, btn) => showFields(rootOf(btn)));
  doc.addEventListener('fd:open', (event) => {
    const el = event.target;
    if (!(el instanceof Element) || !el.matches('.fd-filters-menu, .fd-filters-panel')) return;
    const root = rootOf(el);
    if (!root || !state.has(root)) return;
    if (el.matches('.fd-filters-menu')) { resetSearch(root, el); state.get(root).pushed = false; searchOf(el)?.focus(); return; }
    const input = textInput(el);
    if (input && el.contains(doc.activeElement)) { input.focus(); input.select(); }
  });
  doc.addEventListener('fd:close', (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;
    const root = rootOf(el);
    if (!root || !state.has(root)) return;
    if (el.matches('.fd-filters-sheet')) { closeSheet(root); return; }
    if (el.matches('.fd-filters-panel')) {
      if (textInput(el)) commitText(root, el);
      resetSearch(root, el);
      // A panel opened from a chip that went away: focus the button.
      queueMicrotask(() => { if (doc.activeElement === doc.body || !doc.activeElement) root.querySelector('.fd-filters-add')?.focus(); });
    }
  });
  addEventListener('popstate', () => { for (const root of $$(`${ROOT}[data-fd-url]`)) if (state.has(root)) readUrl(root, { emitChange: true }); });
}

export function init(root = document) {
  initOverlays(root);   // menus, popovers and the sheet come first (fire.js has already run it; on its own this module needs it)
  if (once(doc, 'fd-filters')) bindGlobal();
  const roots = $$(ROOT, root);
  if (root instanceof Element && root.matches(ROOT)) roots.unshift(root);
  for (const el of roots) setup(el);
  for (const el of $$(`${ROOT}[data-fd-for]`)) if (state.has(el)) watch(el);   // a target the page has replaced
  // A static specimen of the menu with a query: draw its results.
  for (const menu of $$('.fd-filters-menu[data-static-demo]', root)) {
    const r = rootOf(menu);
    const input = searchOf(menu);
    if (r && input?.value) searchMenu(r, menu, input.value);
  }
}
