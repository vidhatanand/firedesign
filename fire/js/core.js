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

/* ---------- Custom properties without a style attribute ----------
 * A strict Content Security Policy (style-src 'self') blocks `style="..."` attributes, including ones written through
 * innerHTML or setAttribute. Markup that needs a custom property carries `data-fd-vars="--fd-i:2;--value:0.4"` instead;
 * Fire copies each pair onto the element with style.setProperty (allowed under that policy) and removes the attribute.
 * It runs on the page at load and, through a MutationObserver, on anything inserted later, before the next paint.
 * Only custom properties (names starting with --) are accepted, so the attribute can never set a real property.
 * fire/boot.js does the same while the page is still being parsed, which keeps the first paint right; when it is
 * loaded it does the watching and this module only sweeps once at load.
 */
export function applyVars(root = document) {
  const nodes = root.querySelectorAll ? [...root.querySelectorAll('[data-fd-vars]')] : [];
  if (root.matches?.('[data-fd-vars]')) nodes.unshift(root);
  for (const el of nodes) {
    for (const pair of el.getAttribute('data-fd-vars').split(';')) {
      const at = pair.indexOf(':');
      const name = pair.slice(0, at).trim();
      if (at > 0 && name.startsWith('--')) el.style.setProperty(name, pair.slice(at + 1).trim());
    }
    el.removeAttribute('data-fd-vars');
  }
}
if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined' && !globalThis.__fdVars) {
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes') applyVars(r.target);
      else for (const n of r.addedNodes) if (n.nodeType === 1) applyVars(n);
    }
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-fd-vars'] });
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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), details:not([disabled]) > summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
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
    const holder = document.activeElement;
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    area.remove();
    if (holder && holder !== document.body && holder.isConnected) holder.focus?.({ preventScroll: true });
    return ok;
  }
}

/* ---------- Labels ----------
 * Interface text that Fire's scripts write at runtime (accessible names and visible words of controls Fire creates
 * or toggles) can be translated by the page. label(el, key, fallback, vars) answers, in order:
 *   1. the attribute data-label-<key> on `el` or the nearest ancestor (its component root, or <html> for the page);
 *      the key's dots become hyphens: menu.open reads data-label-menu-open
 *   2. the page dictionary: <script type="application/json" data-fd-labels>{"menu.open": "Menü öffnen"}</script>,
 *      parsed once (it is data, so a strict Content Security Policy allows it)
 *   3. `fallback`, the English default written at the call site.
 * {name} placeholders are filled from `vars`. Keys and English defaults (vars in braces; scripts/test/label.test.mjs keeps this list, docs/writing.html#translating
 * and the label() calls in fire/js the same):
 *   secret.show "Show {noun}" · secret.hide "Hide {noun}" · secret.copy "Copy {noun}" · secret.copied "Copied {noun}"
 *   search.options "Search options" · options.list "Options" · otp.char "Character {n} of {total}"
 *   token.remove "Remove {label}" · pairs.remove-row "Remove row" · pairs.remove-key "Remove {key}"
 *   pairs.remove-n "Remove row {n}"
 *   textarea.tab "Tab inserts two spaces. To leave the field, press Escape, then Tab."
 *   datefield.invalid "Enter a real date, like {example}." · datefield.min "Pick {date} or later."
 *   datefield.max "Pick {date} or earlier." · color.page "On the page" · color.accent "Against the accent"
 *   color.page.pass "Readable as text" · color.page.warn "Marks and large text only"
 *   color.page.fail "Too faint on the page" · color.accent.pass "Distinct from the accent"
 *   color.accent.fail "Too close to the accent" · color.invalid "Enter a hex colour, like {example}."
 *   confirm.partial "Matches so far." · confirm.match "Matches. You can continue."
 *   confirm.mismatch "Differs at character {n}. Case and dashes count." · nav.expand "Expand sidebar"
 *   nav.collapse "Collapse sidebar" · menu.open "Open menu" · menu.close "Close menu" · menu.title "Menu"
 *   theme.switch "Theme: {theme}. Switch to {next}" · theme.light "Light" · theme.dark "Dark" · theme.system "System"
 *   keys.general "General" · keys.go "Go to" · keys.then "then a key" · keys.then-short "then"
 *   running.count "{n} running" · status.operational "All systems operational"
 *   status.degraded "Degraded performance" · status.outage "Service outage"
 *   status.maintenance "Scheduled maintenance" · copy.done "Copied" · copy.announce "Copied to clipboard"
 *   copy.key "Copy {key}" · copy.value "Copy value" · code.more "Show all {count} lines" · code.less "Show less"
 *   log.line "Line {n}" · table.scroll "Scrollable table" · calendar.prev "Previous month"
 *   calendar.next "Next month" · filter.selected "{count} selected" · filter.none "None selected"
 *   period.versus "vs {range}" · toast.region "Notifications" · toast.dismiss "Dismiss notification"
 *   toast.undo "Undo" · toast.undone "Undone" · toast.undo-failed "Couldn’t undo" · toast.stopped "Stopped"
 *   toast.nothing-sent "Nothing was sent." · commit.budget "{count} / {max} words" · commit.words "{count} words"
 *   commit.empty "Write a reason first." · commit.short "Write at least {min} words."
 *   commit.long "Keep it to {max} words. It has {count}."
 *   draft.used "The draft is in the reason now. Edit it before you commit."
 *   hold.note "Nothing is sent until the countdown ends." · hold.undo "Undo" · hold.action "Sending"
 *   hold.start "{action} in {seconds} seconds. Undo or Escape stops it." · hold.undone "Stopped. Nothing was sent."
 *   frame.empty "No picture" · frame.refused "This address isn't allowed" · frame.failed "The picture didn't load"
 *   posts.pages "Pages" · posts.page "Page" · posts.previous "Previous" · posts.previous-page "Previous page"
 *   posts.next "Next" · posts.next-page "Next page" · posts.of "of" · posts.noun "entries"
 *   signup.required "Enter your email address." · signup.invalid "Use a full address, like dana@quarry.dev."
 *   signup.failed "Couldn’t subscribe you just now. Try again in a minute."
 */
let dictionary;
export function label(el, key, fallback, vars) {
  const attr = `data-label-${key.replace(/\./g, '-')}`;
  dictionary ??= (() => {
    try { return JSON.parse(document.querySelector('script[type="application/json"][data-fd-labels]')?.textContent || '{}') || {}; } catch { return {}; }
  })();
  const text = el?.closest?.(`[${attr}]`)?.getAttribute(attr) ?? dictionary[key] ?? fallback;
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m)) : text;
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

ready(() => applyVars(document));
