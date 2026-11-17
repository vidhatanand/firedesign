/* Fire nav — tabs, segmented controls, chip nav, subnav, steps and on-page TOC.
 *
 * Markup contract
 *  Tabs        .fd-tabs[role=tablist] > .fd-tab[role=tab][aria-selected][aria-controls=panelId]
 *              Panels: .fd-tab-panel[role=tabpanel]#panelId (hidden when not selected).
 *              Route tabs: <a class="fd-tab" aria-current="page"> (no panels; links navigate).
 *              A sliding .fd-tabs-indicator is added; arrow keys / Home / End move and select.
 *  Segmented   .fd-segmented[role=radiogroup] > .fd-segmented-item[role=radio][aria-checked][data-value]
 *              (items may sit inside .fd-segmented-group). Toggle-button groups with aria-pressed work too.
 *              A sliding .fd-segmented-thumb is added; arrow keys move the selection. A track narrower than its
 *              items scrolls sideways (without data-block), and the chosen item is scrolled into view.
 *  Chip nav    .fd-chip-nav > .fd-chip — links (aria-current) navigate; buttons (aria-pressed) select one.
 *  Subnav      .fd-subnav > .fd-subnav-item — links navigate; buttons get aria-current="true" on click.
 *  Steps       .fd-steps[data-current="n"] (0-based) or call setStep(stepsEl, n).
 *              Buttons [data-fd-step="next|prev|n"][aria-controls=stepsId] move it.
 *  TOC         .fd-toc > .fd-toc-list > a.fd-toc-item[href="#id"]; add data-fd-scrollspy to track scrolling.
 *
 * Events (bubbling): fd:change { value, item } from .fd-tabs, .fd-segmented, .fd-chip-nav, .fd-subnav, .fd-steps, .fd-toc.
 * API: init(root), selectTab(tab), selectSegment(item), setStep(steps, index), refresh(el)
 */
import { $$, once, emit, ensureId } from './core.js';

const SELECTED = '[aria-selected="true"], [aria-checked="true"], [aria-pressed="true"], [aria-current="page"], [aria-current="true"]';
const isDisabled = (el) => el.disabled || el.getAttribute('aria-disabled') === 'true' || el.hidden;

/* ---------- Geometry ---------- */
/** Offset of `el` inside `ancestor`'s content box (scroll-independent). */
function offsetWithin(el, ancestor) {
  let x = 0;
  let y = 0;
  let node = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  if (node === ancestor) return { x, y };
  const a = el.getBoundingClientRect();
  const b = ancestor.getBoundingClientRect();
  return { x: a.left - b.left - ancestor.clientLeft + ancestor.scrollLeft, y: a.top - b.top - ancestor.clientTop + ancestor.scrollTop };
}

/** Run the first placement without transitions so nothing slides in from 0 on load. */
function instantly(container, fn) {
  container.setAttribute('data-fd-instant', '');
  fn();
  requestAnimationFrame(() => requestAnimationFrame(() => container.removeAttribute('data-fd-instant')));
}

const placers = new WeakMap();
let resizeObserver;
const queued = new Set();
let frame = 0;
function schedule(container) {
  queued.add(container);
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const list = [...queued];
    queued.clear();
    list.forEach((c) => c.isConnected && placers.get(c)?.());
  });
}
function track(container, place, children = []) {
  placers.set(container, place);
  if (typeof ResizeObserver === 'undefined') return;
  resizeObserver ||= new ResizeObserver((entries) => {
    for (const entry of entries) {
      const owner = entry.target.closest('.fd-tabs, .fd-segmented, .fd-toc-list');
      if (owner) schedule(owner);
    }
  });
  resizeObserver.observe(container);
  children.forEach((child) => resizeObserver.observe(child));
}
/** Re-measure a tabs, segmented or TOC element (after you change its content). */
export function refresh(el) {
  const target = el?.closest?.('.fd-tabs, .fd-segmented, .fd-toc-list') || el;
  placers.get(target)?.();
}

/* ---------- Scroll strips: edge fades and keeping the active item visible ---------- */
function updateOverflow(strip) {
  const max = strip.scrollWidth - strip.clientWidth;
  if (max <= 1) { strip.removeAttribute('data-overflow'); return; }
  const start = Math.abs(strip.scrollLeft) > 1;
  const end = Math.abs(strip.scrollLeft) < max - 1;
  strip.setAttribute('data-overflow', start && end ? 'both' : start ? 'start' : 'end');
}
function watchStrip(strip) {
  if (!once(strip, 'nav-strip')) return;
  strip.addEventListener('scroll', () => updateOverflow(strip), { passive: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => updateOverflow(strip)).observe(strip);
  updateOverflow(strip);
}
function revealInStrip(strip, item, smooth = true) {
  if (!strip || !item || strip.scrollWidth <= strip.clientWidth + 1) return;
  const { x } = offsetWithin(item, strip);
  const pad = 32;
  let left = null;
  if (x - pad < strip.scrollLeft) left = x - pad;
  else if (x + item.offsetWidth + pad > strip.scrollLeft + strip.clientWidth) left = x + item.offsetWidth + pad - strip.clientWidth;
  if (left !== null) strip.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' });
}

/* ---------- Tabs ---------- */
const tabsIn = (list) => $$('.fd-tab', list).filter((t) => t.closest('.fd-tabs') === list);
const panelOf = (tab) => {
  const id = tab.getAttribute('aria-controls');
  return id ? document.getElementById(id) : null;
};

function placeIndicator(list) {
  const indicator = list.querySelector(':scope > .fd-tabs-indicator');
  const tab = tabsIn(list).find((t) => t.matches(SELECTED));
  if (!indicator) return;
  if (!tab || !tab.offsetParent) { list.style.setProperty('--_n-w', '0px'); return; }
  const { x } = offsetWithin(tab, list);
  list.style.setProperty('--_n-x', `${x}px`);
  list.style.setProperty('--_n-w', `${tab.offsetWidth}px`);
}

function setupTabs(list) {
  if (!once(list, 'tabs')) return;
  const tabs = tabsIn(list);
  const isTablist = list.getAttribute('role') === 'tablist' || tabs.some((t) => t.getAttribute('role') === 'tab');
  if (isTablist) {
    list.setAttribute('role', 'tablist');
    let current = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    if (!current) current = tabs.find((t) => !isDisabled(t));
    tabs.forEach((tab) => {
      tab.setAttribute('role', 'tab');
      if (tab.tagName === 'BUTTON' && !tab.hasAttribute('type')) tab.type = 'button';
      const selected = tab === current;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = panelOf(tab);
      if (panel) {
        ensureId(tab, 'fd-tab');
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        if (!panel.hasAttribute('tabindex')) panel.tabIndex = 0;
        panel.hidden = !selected;
      }
    });
  }
  let indicator = list.querySelector(':scope > .fd-tabs-indicator');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'fd-tabs-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    list.append(indicator);
  }
  list.setAttribute('data-indicator', '');
  track(list, () => placeIndicator(list), tabs);
  instantly(list, () => placeIndicator(list));
  watchStrip(list);
  revealInStrip(list, tabs.find((t) => t.matches(SELECTED)), false);
}

/** Select a tab: updates ARIA, shows its panel, slides the indicator, fires fd:change on the tablist. */
export function selectTab(tab, { focus = false, silent = false } = {}) {
  const list = tab?.closest('.fd-tabs');
  if (!list || isDisabled(tab)) return;
  setupTabs(list);
  const tabs = tabsIn(list);
  const already = tab.getAttribute('aria-selected') === 'true';
  tabs.forEach((t) => {
    const selected = t === tab;
    if (t.getAttribute('role') === 'tab') {
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
    }
    const panel = panelOf(t);
    if (panel) panel.hidden = !selected;
  });
  if (focus) tab.focus();
  placeIndicator(list);
  revealInStrip(list, tab);
  if (!already && !silent) emit(list, 'fd:change', { value: tab.dataset.value ?? tab.getAttribute('aria-controls') ?? tab.textContent.trim(), item: tab });
}

/* ---------- Segmented ---------- */
const segmentsIn = (root) => $$('.fd-segmented-item', root).filter((i) => i.closest('.fd-segmented') === root);
const segmentValue = (item) => item.dataset.value ?? item.getAttribute('aria-label') ?? item.textContent.trim();

function placeThumb(root) {
  const thumb = root.querySelector(':scope > .fd-segmented-thumb');
  if (!thumb) return;
  const item = segmentsIn(root).find((i) => i.matches(SELECTED) || segmentRadio(i)?.checked);
  if (!item || !item.offsetParent) { thumb.setAttribute('data-empty', ''); return; }
  thumb.removeAttribute('data-empty');
  const { x, y } = offsetWithin(item, root);
  root.style.setProperty('--_n-x', `${x}px`);
  root.style.setProperty('--_n-y', `${y}px`);
  root.style.setProperty('--_n-w', `${item.offsetWidth}px`);
  root.style.setProperty('--_n-th', `${item.offsetHeight}px`);
}

/* In a plain form each item is a label around a native radio: the browser owns selection, focus and the posted
   value, and this module only slides the thumb. */
const segmentRadio = (item) => item.querySelector(':scope > input[type="radio"]');

function segmentMode(root, items) {
  if (items.some(segmentRadio)) return 'native';
  if (root.getAttribute('role') === 'radiogroup' || items.some((i) => i.getAttribute('role') === 'radio')) return 'radio';
  if (items.some((i) => i.hasAttribute('aria-pressed'))) return 'pressed';
  if (items.some((i) => i.tagName === 'A')) return 'link';
  return 'radio';
}

function setupSegmented(root) {
  if (!once(root, 'segmented')) return;
  const items = segmentsIn(root);
  const mode = segmentMode(root, items);
  root.dataset.fdMode = mode;
  if (mode === 'radio') {
    root.setAttribute('role', 'radiogroup');
    let current = items.find((i) => i.getAttribute('aria-checked') === 'true') || items.find((i) => !isDisabled(i));
    items.forEach((item) => {
      item.setAttribute('role', 'radio');
      if (item.tagName === 'BUTTON' && !item.hasAttribute('type')) item.type = 'button';
      item.setAttribute('aria-checked', String(item === current));
      item.tabIndex = item === current ? 0 : -1;
    });
  }
  let thumb = root.querySelector(':scope > .fd-segmented-thumb');
  if (!thumb) {
    thumb = document.createElement('span');
    thumb.className = 'fd-segmented-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    root.append(thumb);
  }
  root.setAttribute('data-thumb', '');
  track(root, () => placeThumb(root), items);
  instantly(root, () => placeThumb(root));
  revealInStrip(root, items.find((i) => i.matches(SELECTED) || segmentRadio(i)?.checked), false);
}

/** Select a segment: updates aria-checked / aria-pressed, slides the thumb, fires fd:change on the group. */
export function selectSegment(item, { focus = false, silent = false } = {}) {
  const root = item?.closest('.fd-segmented');
  if (!root || isDisabled(item)) return;
  setupSegmented(root);
  const items = segmentsIn(root);
  const mode = root.dataset.fdMode;
  if (mode === 'native') {
    const radio = segmentRadio(item);
    if (radio && !radio.checked) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    if (focus) radio?.focus();
    return;
  }
  const already = item.matches(SELECTED);
  items.forEach((i) => {
    const on = i === item;
    if (mode === 'radio') { i.setAttribute('aria-checked', String(on)); i.tabIndex = on ? 0 : -1; }
    else if (mode === 'pressed') i.setAttribute('aria-pressed', String(on));
    else if (mode === 'link') { if (on) i.setAttribute('aria-current', 'page'); else i.removeAttribute('aria-current'); }
  });
  if (focus) item.focus({ preventScroll: true });
  placeThumb(root);
  revealInStrip(root, item);
  if (!already && !silent) emit(root, 'fd:change', { value: segmentValue(item), item });
}

/* ---------- Chip nav & subnav ---------- */
function setupChips(strip) {
  if (!once(strip, 'chips')) return;
  $$('.fd-chip > span:not([class])', strip).forEach((span) => { if (!span.dataset.text) span.dataset.text = span.textContent.trim(); });
  watchStrip(strip);
  revealInStrip(strip, strip.querySelector(`.fd-chip:is(${SELECTED})`), false);
}
function setupSubnav(nav) {
  if (!once(nav, 'subnav')) return;
  watchStrip(nav);
  revealInStrip(nav, nav.querySelector(`.fd-subnav-item:is(${SELECTED})`), false);
}

function selectInGroup(container, containerSelector, itemSelector, item, attr, value) {
  const items = $$(itemSelector, container).filter((i) => i.closest(containerSelector) === container);
  const already = item.getAttribute(attr) === value;
  items.forEach((i) => {
    if (i === item) i.setAttribute(attr, value);
    else if (attr === 'aria-current') i.removeAttribute(attr);
    else i.setAttribute(attr, 'false');
  });
  revealInStrip(container, item);
  if (!already) emit(container, 'fd:change', { value: item.dataset.value ?? item.textContent.trim(), item });
}

/* ---------- Steps ---------- */
/** Mark steps before `index` done, `index` current, the rest upcoming. Fires fd:change. */
export function setStep(steps, index, { silent = false } = {}) {
  const items = $$(':scope > .fd-step', steps);
  const i = Math.max(0, Math.min(items.length - 1, Number(index) || 0));
  items.forEach((step, n) => {
    if (n < i) { step.dataset.state = 'done'; step.removeAttribute('aria-current'); }
    else if (n === i) { step.dataset.state = 'current'; step.setAttribute('aria-current', 'step'); }
    else { step.removeAttribute('data-state'); step.removeAttribute('aria-current'); }
  });
  const changed = steps.dataset.current !== String(i);
  steps.dataset.current = String(i);
  if (changed && !silent) emit(steps, 'fd:change', { value: i, item: items[i] });
}

/* ---------- On this page ---------- */
const tocLists = new Set();
function tocItems(toc) { return $$('.fd-toc-item[href^="#"]', toc); }

function placeTocMarker(list) {
  const marker = list.querySelector(':scope > .fd-toc-marker');
  if (!marker) return;
  const item = $$('.fd-toc-item', list).find((i) => i.matches('[aria-current="true"], [aria-current="location"]'));
  if (!item || !item.offsetParent) { marker.setAttribute('data-empty', ''); return; }
  marker.removeAttribute('data-empty');
  const { y } = offsetWithin(item, list);
  list.style.setProperty('--_n-y', `${y + 4}px`);
  list.style.setProperty('--_n-h', `${Math.max(8, item.offsetHeight - 8)}px`);
}

function setTocCurrent(toc, item, { silent = false } = {}) {
  const items = $$('.fd-toc-item', toc);
  if (item && item.getAttribute('aria-current') === 'true') return;
  items.forEach((i) => (i === item ? i.setAttribute('aria-current', 'true') : i.removeAttribute('aria-current')));
  const list = toc.querySelector('.fd-toc-list');
  if (list) placeTocMarker(list);
  if (item && !silent) emit(toc, 'fd:change', { value: item.getAttribute('href').slice(1), item });
}

function scrollRootOf(el) {
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

function spy(toc) {
  if (Date.now() < (Number(toc.dataset.fdSpyLock) || 0)) return;
  const items = tocItems(toc);
  const targets = items.map((i) => document.getElementById(decodeURIComponent(i.getAttribute('href').slice(1))));
  const first = targets.find(Boolean);
  if (!first) return;
  const root = scrollRootOf(first);
  const top = root ? root.getBoundingClientRect().top : 0;
  const offset = Number(toc.dataset.offset) || 96;
  let active = null;
  targets.forEach((t, n) => { if (t && t.getBoundingClientRect().top - top <= offset) active = items[n]; });
  const atEnd = root
    ? root.scrollTop + root.clientHeight >= root.scrollHeight - 2
    : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  if (atEnd) active = items[items.length - 1];
  setTocCurrent(toc, active || items[0]);
}

function setupToc(toc) {
  if (!once(toc, 'toc')) return;
  const list = toc.querySelector('.fd-toc-list');
  if (list) {
    let marker = list.querySelector(':scope > .fd-toc-marker');
    if (!marker) {
      marker = document.createElement('span');
      marker.className = 'fd-toc-marker';
      marker.setAttribute('aria-hidden', 'true');
      list.prepend(marker);
    }
    toc.setAttribute('data-marker', '');
    track(list, () => placeTocMarker(list), []);
    instantly(list, () => placeTocMarker(list));
  }
  if (toc.hasAttribute('data-fd-scrollspy')) {
    tocLists.add(toc);
    spy(toc);
  }
}

let spyFrame = 0;
function onScroll() {
  if (spyFrame || !tocLists.size) return;
  spyFrame = requestAnimationFrame(() => {
    spyFrame = 0;
    tocLists.forEach((toc) => (toc.isConnected ? spy(toc) : tocLists.delete(toc)));
  });
}

/* ---------- Keyboard ---------- */
function moveKey(event, orientation = 'horizontal') {
  const rtl = getComputedStyle(event.target).direction === 'rtl';
  const nextKeys = orientation === 'both' ? ['ArrowRight', 'ArrowDown'] : ['ArrowRight'];
  const prevKeys = orientation === 'both' ? ['ArrowLeft', 'ArrowUp'] : ['ArrowLeft'];
  if (rtl) { nextKeys[0] = 'ArrowLeft'; prevKeys[0] = 'ArrowRight'; }
  if (nextKeys.includes(event.key)) return 1;
  if (prevKeys.includes(event.key)) return -1;
  if (event.key === 'Home') return 'first';
  if (event.key === 'End') return 'last';
  return 0;
}
function step(list, current, dir) {
  const enabled = list.filter((el) => !isDisabled(el));
  if (!enabled.length) return null;
  if (dir === 'first') return enabled[0];
  if (dir === 'last') return enabled[enabled.length - 1];
  const index = enabled.indexOf(current);
  return enabled[(index + dir + enabled.length) % enabled.length];
}

function onKeydown(event) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const tab = target.closest('.fd-tab');
  if (tab && tab.closest('.fd-tabs')?.getAttribute('role') === 'tablist') {
    const dir = moveKey(event);
    if (!dir) return;
    const next = step(tabsIn(tab.closest('.fd-tabs')), tab, dir);
    if (next) { event.preventDefault(); selectTab(next, { focus: true }); }
    return;
  }

  const seg = target.closest('.fd-segmented-item');
  if (seg) {
    const root = seg.closest('.fd-segmented');
    if (!root || root.dataset.fdMode !== 'radio') return;
    const dir = moveKey(event, 'both');
    if (!dir) return;
    const next = step(segmentsIn(root), seg, dir);
    if (next) { event.preventDefault(); selectSegment(next, { focus: true }); }
  }
}

/* ---------- Clicks ---------- */
function onClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const tab = target.closest('.fd-tab');
  if (tab && tab.closest('.fd-tabs')) {
    if (isDisabled(tab)) { event.preventDefault(); return; }
    if (tab.getAttribute('role') === 'tab') selectTab(tab);
    else if (tab.tagName === 'A') {
      const list = tab.closest('.fd-tabs');
      tabsIn(list).forEach((t) => (t === tab ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
      placeIndicator(list);
    }
    return;
  }

  const seg = target.closest('.fd-segmented-item');
  if (seg && seg.closest('.fd-segmented')) {
    if (segmentRadio(seg)) return;                       // a native radio: the browser selects it
    if (isDisabled(seg)) { event.preventDefault(); return; }
    selectSegment(seg);
    return;
  }

  const chip = target.closest('.fd-chip');
  const strip = chip?.closest('.fd-chip-nav');
  if (chip && strip && chip.tagName === 'BUTTON' && !isDisabled(chip)) {
    selectInGroup(strip, '.fd-chip-nav', '.fd-chip', chip, chip.hasAttribute('aria-selected') ? 'aria-selected' : 'aria-pressed', 'true');
    return;
  }

  const sub = target.closest('.fd-subnav-item');
  const subnav = sub?.closest('.fd-subnav');
  if (sub && subnav && sub.tagName === 'BUTTON' && !isDisabled(sub)) {
    selectInGroup(subnav, '.fd-subnav', '.fd-subnav-item', sub, 'aria-current', 'true');
    return;
  }

  const stepper = target.closest('[data-fd-step]');
  if (stepper && !isDisabled(stepper)) {
    const steps = document.getElementById(stepper.getAttribute('aria-controls') || '') || stepper.closest('.fd-steps');
    if (steps) {
      const index = Number(steps.dataset.current) || 0;
      const to = stepper.dataset.fdStep === 'prev' ? index - 1 : stepper.dataset.fdStep === 'next' ? index + 1 : Number(stepper.dataset.fdStep);
      setStep(steps, to);
    }
    return;
  }

  const tocItem = target.closest('.fd-toc-item');
  const toc = tocItem?.closest('.fd-toc');
  if (tocItem && toc) {
    toc.dataset.fdSpyLock = String(Date.now() + 800);
    setTocCurrent(toc, tocItem);
  }
}

/* ---------- Init ---------- */
export function init(root = document) {
  if (once(document, 'fd-nav')) {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeydown);
    // Native-radio segments: follow the browser's selection, and a form reset.
    document.addEventListener('change', (event) => {
      const radio = event.target instanceof HTMLInputElement && event.target.type === 'radio' ? event.target : null;
      const root = radio?.closest('.fd-segmented-item')?.closest('.fd-segmented');
      if (!root) return;
      placeThumb(root);
      revealInStrip(root, radio.closest('.fd-segmented-item'));
      emit(root, 'fd:change', { value: radio.value, item: radio.closest('.fd-segmented-item') });
    });
    document.addEventListener('reset', (event) => {
      if (event.target instanceof HTMLFormElement) setTimeout(() => $$('.fd-segmented', event.target).forEach(placeThumb));
    });
    addEventListener('scroll', onScroll, { capture: true, passive: true });
    addEventListener('resize', onScroll, { passive: true });
    document.fonts?.ready?.then(() => {
      $$('.fd-tabs[data-indicator]').forEach(placeIndicator);
      $$('.fd-segmented[data-thumb]').forEach(placeThumb);
      $$('.fd-toc-list').forEach(placeTocMarker);
    });
  }
  $$('.fd-tabs', root).forEach(setupTabs);
  $$('.fd-segmented', root).forEach(setupSegmented);
  $$('.fd-chip-nav', root).forEach(setupChips);
  $$('.fd-subnav', root).forEach(setupSubnav);
  $$('.fd-steps[data-current]', root).forEach((s) => setStep(s, s.dataset.current, { silent: true }));
  $$('.fd-toc', root).forEach(setupToc);
}
