/* Fire core — shared helpers. Every behaviour module imports from here.
 *
 * Conventions (all modules follow them):
 *  - Behaviour is opt-in through markup. A module exports `init(root = document)`
 *    and is idempotent: calling it twice never double-binds (use `once(el, key)`).
 *  - State lives in the DOM: `data-state="open|closed"`, `hidden`, and ARIA
 *    (`aria-expanded`, `aria-selected`, `aria-pressed`, `aria-current`). CSS reads the same attributes.
 *  - Components announce changes with bubbling CustomEvents: `fd:open`, `fd:close`,
 *    `fd:change` (detail: { value }), `fd:select` (detail: { value, item }).
 *  - Prefer event delegation on `document` so dynamically inserted markup just works.
 */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Delegated listener. Returns an unsubscribe function. */
export function on(root, type, selector, handler, options) {
  const listener = (event) => {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (target && root.contains(target)) handler(event, target);
  };
  root.addEventListener(type, listener, options);
  return () => root.removeEventListener(type, listener, options);
}

/** True the first time it is called for (el, key); use to make init idempotent. */
const bound = new WeakMap();
export function once(el, key) {
  let keys = bound.get(el);
  if (!keys) bound.set(el, (keys = new Set()));
  if (keys.has(key)) return false;
  keys.add(key);
  return true;
}

let uid = 0;
export const id = (prefix = 'fd') => `${prefix}-${(++uid).toString(36)}`;
export const ensureId = (el, prefix) => el.id || (el.id = id(prefix));

export function emit(el, name, detail) {
  return el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: true, detail }));
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarsePointer = () => matchMedia('(pointer: coarse)').matches;
export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
export function focusables(root) {
  return $$(FOCUSABLE, root).filter((el) => !el.closest('[hidden], [inert]') && el.getClientRects().length);
}

/** Keep Tab inside `container`. Returns a release function. */
export function trapFocus(container) {
  const handler = (event) => {
    if (event.key !== 'Tab') return;
    const items = focusables(container);
    if (!items.length) { event.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

/**
 * Roving focus for menus, tabs, listboxes, toolbars.
 * Arrow keys move, Home/End jump, typing a letter jumps to the next match.
 */
export function rove(container, itemSelector, { orientation = 'vertical', loop = true, typeahead = true } = {}) {
  let buffer = '';
  let timer;
  const items = () => $$(itemSelector, container).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true' && !el.hidden);
  const handler = (event) => {
    const list = items();
    if (!list.length) return;
    const index = list.indexOf(document.activeElement);
    const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    const prev = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    let target;
    if (event.key === next) target = list[index + 1] ?? (loop ? list[0] : list[index]);
    else if (event.key === prev) target = list[index - 1] ?? (loop ? list[list.length - 1] : list[index]);
    else if (event.key === 'Home') target = list[0];
    else if (event.key === 'End') target = list[list.length - 1];
    else if (typeahead && event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey && event.key !== ' ') {
      buffer += event.key.toLowerCase();
      clearTimeout(timer);
      timer = setTimeout(() => (buffer = ''), 500);
      target = list.find((el) => el.textContent.trim().toLowerCase().startsWith(buffer));
      if (target) target.focus();
      return;
    }
    if (target) { event.preventDefault(); target.focus(); }
  };
  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

/**
 * Position a floating element against an anchor with flip and shift.
 * `placement`: "bottom-start" | "bottom" | "bottom-end" | "top-*" | "right-*" | "left-*".
 * The floating element must be `position: fixed` (popovers in the top layer are).
 * Sets `data-side` and `data-align` on the floating element so CSS can pick a transform origin.
 */
export function position(anchor, floating, { placement = 'bottom-start', offset = 6, padding = 8, matchWidth = false } = {}) {
  const a = anchor.getBoundingClientRect();
  if (matchWidth) floating.style.minWidth = `${a.width}px`;
  floating.style.left = '0px';
  floating.style.top = '0px';
  const f = floating.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  let [side, align = 'center'] = placement.split('-');

  const fits = {
    bottom: vh - a.bottom - offset - padding >= f.height,
    top: a.top - offset - padding >= f.height,
    right: vw - a.right - offset - padding >= f.width,
    left: a.left - offset - padding >= f.width,
  };
  const opposite = { bottom: 'top', top: 'bottom', left: 'right', right: 'left' };
  if (!fits[side] && fits[opposite[side]]) side = opposite[side];

  let x;
  let y;
  if (side === 'bottom' || side === 'top') {
    y = side === 'bottom' ? a.bottom + offset : a.top - offset - f.height;
    x = align === 'start' ? a.left : align === 'end' ? a.right - f.width : a.left + (a.width - f.width) / 2;
  } else {
    x = side === 'right' ? a.right + offset : a.left - offset - f.width;
    y = align === 'start' ? a.top : align === 'end' ? a.bottom - f.height : a.top + (a.height - f.height) / 2;
  }
  x = clamp(x, padding, Math.max(padding, vw - f.width - padding));
  y = clamp(y, padding, Math.max(padding, vh - f.height - padding));
  floating.style.left = `${Math.round(x)}px`;
  floating.style.top = `${Math.round(y)}px`;
  floating.dataset.side = side;
  floating.dataset.align = align;
  return { side, align, x, y };
}

/** Re-run `update` while the anchor may move (scroll, resize). Returns a stop function. */
export function autoUpdate(update) {
  let frame = 0;
  const run = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
  addEventListener('scroll', run, { capture: true, passive: true });
  addEventListener('resize', run, { passive: true });
  run();
  return () => {
    cancelAnimationFrame(frame);
    removeEventListener('scroll', run, { capture: true });
    removeEventListener('resize', run);
  };
}

/** Copy text; resolves true on success. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    area.remove();
    return ok;
  }
}

/** Run `fn` when the DOM is ready. */
export function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
}

/* ---------- Theme ----------
 * setTheme('light' | 'dark' | 'system'), setAccent(name), setDensity(name).
 * Choices persist in localStorage and apply to <html>.
 */
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* private mode */ } },
};
export function getTheme() { return store.get('fd-theme') || 'system'; }
export function setTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  store.set('fd-theme', theme === 'system' ? null : theme);
  emit(root, 'fd:theme', { theme });
}
export function setAccent(accent) {
  const root = document.documentElement;
  if (!accent || accent === 'ember') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', accent);
  store.set('fd-accent', accent && accent !== 'ember' ? accent : null);
  emit(root, 'fd:accent', { accent: accent || 'ember' });
}
export function setDensity(density) {
  const root = document.documentElement;
  if (!density || density === 'comfortable') root.removeAttribute('data-density');
  else root.setAttribute('data-density', density);
  store.set('fd-density', density && density !== 'comfortable' ? density : null);
}
export function restorePreferences() {
  const theme = store.get('fd-theme');
  if (theme) document.documentElement.setAttribute('data-theme', theme);
  const accent = store.get('fd-accent');
  if (accent) document.documentElement.setAttribute('data-accent', accent);
  const density = store.get('fd-density');
  if (density) document.documentElement.setAttribute('data-density', density);
}
restorePreferences();
