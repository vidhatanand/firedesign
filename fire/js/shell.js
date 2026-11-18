/* Fire shell — sidebar, rail tooltips, nav groups, mobile nav, theme toggle.
 *
 * Markup contract
 *  .fd-app[data-sidebar="expanded|collapsed"]      root; non-contained apps remember the state
 *                                                  in localStorage ("fd-sidebar"). Opt out with
 *                                                  data-persist="false"; contained apps opt in with data-persist.
 *  [data-fd-sidebar-toggle]                        toggles the closest .fd-app (or the one its value selects).
 *  .fd-nav-group > .fd-nav-item[aria-expanded][aria-controls] + .fd-nav-sub
 *                                                  expandable group; opens itself when a child is current.
 *  [data-fd-mobile-nav][aria-controls]             opens / closes a .fd-mobile-nav (defaults to the one in the
 *                                                  same .fd-app). Scrim, focus trap, Escape, scroll lock included.
 *  [data-fd-theme-toggle]                          cycles light → dark → system; icon and aria-label follow.
 *  Rail tooltips: in the collapsed sidebar, hovering or focusing an item shows its label (or its
 *  data-fd-tooltip) in a shared .fd-rail-tip, with the item's mono hint.
 *
 *
 * Go-to keys (0.7)
 *  [data-fd-keys="g l"]                            pressing "g" and then "l" activates this control (a link is followed,
 *                                                  a button pressed, a field focused). A single key works too:
 *                                                  data-fd-keys="/" on the search trigger, data-fd-keys="?" on the button
 *                                                  that opens the shortcut sheet. Letters are case-insensitive; the first
 *                                                  key of a sequence can be any key. After the first key the second has
 *                                                  1.6 seconds; Escape or any other key drops it.
 *                                                  Keys are ignored while a field has focus, while a modal is open, and with
 *                                                  Ctrl, Cmd or Alt held. A control that is hidden or disabled is skipped.
 *                                                  A search on the page that carries data-fd-search-hotkey (forms.js) has "/".
 *  data-fd-keys-label="Activity logs"              the name the sheet gives it (default: aria-label, the nav text, its text)
 *  data-fd-keys-group="Go to"                      the sheet's group for it (default: "Go to" for "g x", else "General")
 *  .fd-nav-item[data-fd-keys]                      gets a <kbd class="fd-kbd fd-nav-key"> with its last key, shown while
 *                                                  the first key is waiting (html[data-fd-keys-pending="g"]), and a
 *                                                  .fd-keys-hint status line in the corner says a key is expected.
 *  .fd-dialog[data-fd-shortcuts]                   the shortcut sheet: its [data-fd-shortcuts-list] is filled from the
 *                                                  page's controls each time the dialog opens (groups in .fd-shortcuts).
 *
 * Running now (0.7)
 *  .fd-running[data-fd-running="popover-id"]       the top bar's pill. Its count is the number of .fd-running-item inside
 *                                                  that popover, kept in step as items come and go (a MutationObserver); it
 *                                                  is named "3 running" for assistive technology, and hidden when none are.
 * Service status (0.7)
 *  .fd-service-status[data-status]                 operational | degraded | outage | maintenance. setServiceStatus() changes
 *                                                  it, names it (aria-label, tooltip) and swaps its icon.
 * Initial mark (0.7)
 *  [data-fd-initial="Quarry Labs"]                 on a .fd-tile, .fd-avatar, .fd-account-avatar or .fd-brand-mark: draws
 *                                                  the name's first letter as a dot-matrix mark (fire/js/initial.js), and on
 *                                                  a tile or avatar without data-tone sets the tone the name maps to. The
 *                                                  host is named after the name (role="img") unless it is aria-hidden or a
 *                                                  brand mark. Empty value: the host's own text is the name.
 *
 * Events (bubbling): fd:change { value: "expanded"|"collapsed" } on .fd-app;
 *  fd:open / fd:close on .fd-nav-group and .fd-mobile-nav;
 *  fd:keys { keys } on a control a key sequence activated; fd:change { value: count } on a .fd-running pill and
 *  fd:change { value: status } on a .fd-service-status when they change.
 * API: init(root), setSidebar(app, state), toggleSidebar(app), setNavGroup(button, open),
 *  openMobileNav(sheet, trigger), closeMobileNav(), cycleTheme(),
 *  syncRunning(root), setServiceStatus(el, status, text?), setInitial(host, name),
 *  initialMark / initialRows / initialTone (from initial.js, which has no DOM and also runs on a server)
 */
import { $$, once, emit, ensureId, focusables, position, getTheme, setTheme, label } from './core.js';
import { icon, setIcon } from './icons.js';
import { initialMark, initialRows, initialTone } from './initial.js';

export { initialMark, initialRows, initialTone };

const STORE_KEY = 'fd-sidebar';
const store = {
  get() { try { return localStorage.getItem(STORE_KEY); } catch { return null; } },
  set(value) { try { localStorage.setItem(STORE_KEY, value); } catch { /* private mode */ } },
};

/* ---------- Helpers ---------- */
function token(el, name, fallback) {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}
function duration(el, name = '--fd-dur-3') {
  const value = token(el, name, '0ms');
  const n = parseFloat(value);
  if (Number.isNaN(n)) return 0;
  return value.endsWith('ms') ? n : n * 1000;
}
function swapIcon(host, name) {
  const current = host.querySelector(':scope > .fd-icon, :scope > i[data-icon]');
  if (current) { setIcon(current, name); return; }
  const t = document.createElement('template');
  t.innerHTML = icon(name);
  host.prepend(t.content.firstElementChild);
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- Sidebar ---------- */
const persists = (app) => (app.hasAttribute('data-contained') ? app.hasAttribute('data-persist') && app.dataset.persist !== 'false' : app.dataset.persist !== 'false');

function syncToggles(app) {
  const collapsed = app.dataset.sidebar === 'collapsed';
  const sidebar = app.querySelector(':scope > .fd-sidebar');
  if (sidebar) ensureId(sidebar, 'fd-sidebar');
  $$('[data-fd-sidebar-toggle]', app).forEach((btn) => {
    if (btn.closest('.fd-app') !== app) return;
    btn.setAttribute('aria-label', collapsed ? label(btn, 'nav.expand', 'Expand sidebar') : label(btn, 'nav.collapse', 'Collapse sidebar'));
    if (sidebar) btn.setAttribute('aria-controls', sidebar.id);
  });
}

/** Set the sidebar to "expanded" or "collapsed". */
export function setSidebar(app, state, { persist = true, silent = false } = {}) {
  if (!app) return;
  const next = state === 'collapsed' ? 'collapsed' : 'expanded';
  const changed = (app.dataset.sidebar || 'expanded') !== next;
  app.dataset.sidebar = next;
  syncToggles(app);
  hideTip();
  if (persist && persists(app)) store.set(next);
  if (changed && !silent) emit(app, 'fd:change', { value: next });
}
export function toggleSidebar(app) {
  setSidebar(app, app?.dataset.sidebar === 'collapsed' ? 'expanded' : 'collapsed');
}

function setupApp(app) {
  if (!once(app, 'shell-app')) return;
  app.setAttribute('data-fd-rail-tips', '');
  if (!app.dataset.sidebar) app.dataset.sidebar = 'expanded';
  const saved = persists(app) ? store.get() : null;
  if (saved && saved !== app.dataset.sidebar) {
    app.setAttribute('data-fd-instant', '');
    setSidebar(app, saved, { persist: false, silent: true });
    requestAnimationFrame(() => requestAnimationFrame(() => app.removeAttribute('data-fd-instant')));
  }
  syncToggles(app);
  // Close the phone menu if the shell grows past the breakpoint.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (openNav && openNav.app === app && app.clientWidth >= 900) closeMobileNav({ restoreFocus: false });
    }).observe(app);
  }
}

/* ---------- Nav groups ---------- */
const groupAnimations = new WeakMap();
const subOf = (button) => {
  const id = button.getAttribute('aria-controls');
  return (id && document.getElementById(id)) || button.parentElement?.querySelector(':scope > .fd-nav-sub');
};

/** Open or close a nav group from its trigger button. */
export function setNavGroup(button, open, { animate = true } = {}) {
  const sub = subOf(button);
  if (!sub) return;
  const group = button.closest('.fd-nav-group');
  const isOpen = button.getAttribute('aria-expanded') === 'true' && !sub.hidden;
  button.setAttribute('aria-expanded', String(open));
  group?.setAttribute('data-state', open ? 'open' : 'closed');
  if (isOpen === open) return;
  groupAnimations.get(sub)?.cancel();
  const ms = animate ? duration(sub, '--fd-dur-3') : 0;
  const easing = token(sub, '--fd-ease-out', 'ease-out');
  if (open) {
    sub.hidden = false;
    if (ms && sub.animate) {
      const h = sub.scrollHeight;
      groupAnimations.set(sub, sub.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: ms, easing }));
    }
  } else if (ms && sub.animate) {
    const h = sub.offsetHeight;
    const anim = sub.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: ms * 0.8, easing });
    groupAnimations.set(sub, anim);
    anim.onfinish = () => { if (button.getAttribute('aria-expanded') === 'false') sub.hidden = true; };
  } else {
    sub.hidden = true;
  }
  emit(group || button, open ? 'fd:open' : 'fd:close');
}

function setupGroup(button) {
  if (!once(button, 'shell-group')) return;
  const sub = subOf(button);
  if (!sub) return;
  ensureId(sub, 'fd-nav-sub');
  button.setAttribute('aria-controls', sub.id);
  if (button.tagName === 'BUTTON' && !button.hasAttribute('type')) button.type = 'button';
  const open = button.getAttribute('aria-expanded') === 'true' || !!sub.querySelector('[aria-current="page"]');
  button.setAttribute('aria-expanded', String(open));
  button.closest('.fd-nav-group')?.setAttribute('data-state', open ? 'open' : 'closed');
  sub.hidden = !open;
}

/* ---------- Rail tooltip ---------- */
let tip = null;
let tipOwner = null;
const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

function ensureTip() {
  if (tip?.isConnected) return tip;
  tip = document.createElement('div');
  tip.className = 'fd-rail-tip';
  tip.setAttribute('role', 'tooltip');
  ensureId(tip, 'fd-rail-tip');
  if (supportsPopover) tip.setAttribute('popover', 'manual');
  else tip.hidden = true;
  document.body.append(tip);
  return tip;
}
function tipText(item) {
  if (item.dataset.fdTooltip) return [item.dataset.fdTooltip, ''];
  const label = item.querySelector('.fd-nav-text, .fd-account-email')?.textContent.trim() || item.getAttribute('aria-label') || '';
  const hint = item.querySelector('.fd-nav-hint')?.textContent.trim() || '';
  return [label, hint];
}
function showTip(item) {
  const app = item.closest('.fd-app');
  if (!app || app.dataset.sidebar !== 'collapsed' || !item.closest('.fd-sidebar')) return;
  const [label, hint] = tipText(item);
  if (!label) return;
  const el = ensureTip();
  el.innerHTML = `${esc(label)}${hint ? `<span class="fd-rail-tip-hint">${esc(hint)}</span>` : ''}`;
  if (supportsPopover) { if (!el.matches(':popover-open')) el.showPopover(); }
  else el.hidden = false;
  position(item, el, { placement: 'right', offset: 10 });
  tipOwner = item;
}
function hideTip() {
  if (!tip || !tipOwner) return;
  tipOwner = null;
  if (supportsPopover) { if (tip.matches(':popover-open')) tip.hidePopover(); }
  else tip.hidden = true;
}
const RAIL_ITEMS = '.fd-sidebar .fd-nav-item, .fd-sidebar .fd-account, .fd-sidebar [data-fd-sidebar-toggle]';

/* ---------- Mobile nav ---------- */
let openNav = null;

function sheetFor(trigger) {
  const id = trigger.getAttribute('aria-controls');
  return (id && document.getElementById(id)) || trigger.closest('.fd-app')?.querySelector('.fd-mobile-nav') || null;
}
function scrimFor(sheet) {
  const prev = sheet.previousElementSibling;
  if (prev?.classList.contains('fd-mobile-nav-scrim')) return prev;
  const scrim = document.createElement('div');
  scrim.className = 'fd-mobile-nav-scrim';
  scrim.hidden = true;
  scrim.setAttribute('aria-hidden', 'true');
  sheet.before(scrim);
  return scrim;
}
function setTrigger(trigger, open) {
  if (!trigger) return;
  trigger.setAttribute('aria-expanded', String(open));
  trigger.setAttribute('aria-label', open ? label(trigger, 'menu.close', 'Close menu') : label(trigger, 'menu.open', 'Open menu'));
  swapIcon(trigger, open ? 'x' : 'menu');
}

function trapKeys(event) {
  if (!openNav) return;
  if (event.key === 'Escape') { event.preventDefault(); closeMobileNav(); return; }
  if (event.key !== 'Tab') return;
  const items = [openNav.trigger, ...focusables(openNav.sheet)].filter(Boolean);
  if (!items.length) return;
  const index = items.indexOf(document.activeElement);
  const next = event.shiftKey ? (index <= 0 ? items.length - 1 : index - 1) : (index === -1 || index === items.length - 1 ? 0 : index + 1);
  event.preventDefault();
  items[next].focus();
}

/** Open a .fd-mobile-nav sheet. `trigger` is the menu button that controls it. */
export function openMobileNav(sheet, trigger) {
  if (!sheet) return;
  if (openNav?.sheet === sheet) return;
  if (openNav) closeMobileNav({ restoreFocus: false });
  const app = sheet.closest('.fd-app');
  const scrim = scrimFor(sheet);
  ensureId(sheet, 'fd-mobile-nav');
  if (!sheet.hasAttribute('role')) sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  if (!sheet.hasAttribute('aria-label') && !sheet.hasAttribute('aria-labelledby')) sheet.setAttribute('aria-label', label(sheet, 'menu.title', 'Menu'));
  const triggers = trigger ? [trigger] : $$(`[data-fd-mobile-nav][aria-controls="${sheet.id}"]`);
  trigger = triggers[0] || app?.querySelector('[data-fd-mobile-nav]') || null;
  if (trigger) trigger.setAttribute('aria-controls', sheet.id);

  sheet.hidden = false;
  scrim.hidden = false;
  void sheet.offsetHeight; // commit the closed styles so the transition runs
  sheet.dataset.state = 'open';
  scrim.dataset.state = 'open';
  setTrigger(trigger, true);
  if (app && !app.hasAttribute('data-contained')) document.documentElement.setAttribute('data-fd-scroll-lock', '');
  openNav = { sheet, scrim, trigger, app, returnTo: document.activeElement };
  document.addEventListener('keydown', trapKeys, true);
  const first = focusables(sheet)[0];
  first?.focus({ preventScroll: true });
  emit(sheet, 'fd:open');
}

/** Close the open mobile nav, if any. */
export function closeMobileNav({ restoreFocus = true } = {}) {
  if (!openNav) return;
  const { sheet, scrim, trigger, returnTo } = openNav;
  openNav = null;
  document.removeEventListener('keydown', trapKeys, true);
  sheet.dataset.state = 'closed';
  scrim.dataset.state = 'closed';
  setTrigger(trigger, false);
  document.documentElement.removeAttribute('data-fd-scroll-lock');
  const ms = duration(sheet, '--fd-dur-4');
  const finish = () => {
    if (sheet.dataset.state !== 'closed') return;
    sheet.hidden = true;
    scrim.hidden = true;
  };
  if (ms) setTimeout(finish, ms); else finish();
  if (restoreFocus) (trigger || returnTo)?.focus?.({ preventScroll: true });
  emit(sheet, 'fd:close');
}

function setupMobileNav(sheet) {
  if (!once(sheet, 'shell-mobile')) return;
  if (!sheet.hasAttribute('data-state')) {
    sheet.dataset.state = 'closed';
    sheet.hidden = true;
  }
}

/* ---------- Theme toggle ---------- */
const THEMES = { light: ['sun', 'Light'], dark: ['moon', 'Dark'], system: ['monitor', 'System'] };
const NEXT_THEME = { light: 'dark', dark: 'system', system: 'light' };

function syncThemeToggles(root = document) {
  const theme = THEMES[getTheme()] ? getTheme() : 'system';
  const next = NEXT_THEME[theme];
  $$('[data-fd-theme-toggle]', root).forEach((btn) => {
    swapIcon(btn, THEMES[theme][0]);
    const name = (key) => label(btn, `theme.${key}`, THEMES[key][1]);   // English reads "Switch to dark"; a translation is used as written
    btn.setAttribute('aria-label', label(btn, 'theme.switch', 'Theme: {theme}. Switch to {next}', { theme: name(theme), next: name(next) === THEMES[next][1] ? name(next).toLowerCase() : name(next) }));
    btn.dataset.themeState = theme;
  });
}
/** Move to the next theme: light → dark → system. */
export function cycleTheme() {
  const current = THEMES[getTheme()] ? getTheme() : 'system';
  setTheme(NEXT_THEME[current]);
}

/* ---------- Delegation ---------- */
function onClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const toggle = target.closest('[data-fd-sidebar-toggle]');
  if (toggle) {
    const sel = toggle.getAttribute('data-fd-sidebar-toggle');
    const app = (sel && document.querySelector(sel)) || toggle.closest('.fd-app');
    if (app) { setupApp(app); toggleSidebar(app); }
    return;
  }

  const groupButton = target.closest('.fd-nav-group > .fd-nav-item[aria-expanded]');
  if (groupButton) {
    event.preventDefault();
    setupGroup(groupButton);
    const app = groupButton.closest('.fd-app');
    if (app?.dataset.sidebar === 'collapsed' && groupButton.closest('.fd-sidebar')) {
      setSidebar(app, 'expanded');
      setNavGroup(groupButton, true, { animate: false });
    } else {
      setNavGroup(groupButton, groupButton.getAttribute('aria-expanded') !== 'true');
    }
    return;
  }

  const menu = target.closest('[data-fd-mobile-nav]');
  if (menu) {
    const sheet = sheetFor(menu);
    if (!sheet) return;
    setupMobileNav(sheet);
    if (sheet.dataset.state === 'open') {
      // Also handles a sheet that was rendered open in markup.
      if (openNav?.sheet !== sheet) openNav = { sheet, scrim: scrimFor(sheet), trigger: menu, app: sheet.closest('.fd-app'), returnTo: null };
      closeMobileNav();
    } else {
      openMobileNav(sheet, menu);
    }
    return;
  }

  if (openNav) {
    if (target === openNav.scrim) { closeMobileNav(); return; }
    if (target.closest('a[href]') && openNav.sheet.contains(target)) { closeMobileNav({ restoreFocus: false }); return; }
  }

  if (target.closest('[data-fd-theme-toggle]')) cycleTheme();
}

function onOver(event) {
  const item = event.target instanceof Element ? event.target.closest(RAIL_ITEMS) : null;
  if (item) { if (item !== tipOwner) showTip(item); }
  else if (tipOwner && !(event.target instanceof Element && event.target.closest('.fd-rail-tip'))) hideTip();
}
function onFocusIn(event) {
  const item = event.target instanceof Element ? event.target.closest(RAIL_ITEMS) : null;
  if (item && item.matches(':focus-visible')) showTip(item);
  else hideTip();
}

/* ---------- Initial mark ---------- */
/** Draw `name`'s mark into a host (a tile, an avatar, a brand mark). */
export function setInitial(host, name) {
  if (!host) return;
  const text = String(name ?? '').trim();
  host.dataset.fdInitial = text;
  host.innerHTML = initialMark(text);
  const decorative = host.getAttribute('aria-hidden') === 'true' || host.matches('.fd-brand-mark');
  if (decorative) {
    host.removeAttribute('role');
  } else {
    host.setAttribute('role', 'img');
    if (!host.hasAttribute('aria-label') || host.dataset.fdInitialLabel === 'auto') { host.setAttribute('aria-label', text); host.dataset.fdInitialLabel = 'auto'; }
  }
  if (host.matches('.fd-tile, .fd-avatar') && (!host.dataset.tone || host.dataset.fdInitialTone === 'auto')) {
    host.dataset.tone = initialTone(text);
    host.dataset.fdInitialTone = 'auto';
  }
}
function setupInitial(host) {
  if (!once(host, 'shell-initial')) return;
  setInitial(host, host.dataset.fdInitial || host.textContent);
}

/* ---------- Go-to keys ---------- */
const KEY_WAIT = 1600;
let keyWait = null;   // { first, timer } while a first key waits for its second
let keyHint = null;

const typing = (el) => el instanceof Element && !!el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
const modalOpen = () => { try { return !!document.querySelector('dialog:modal'); } catch { return !!document.querySelector('dialog[open]'); } };
// A control inside a closed menu or popover is not drawn, yet its key still works (a menu item is a control too).
const usable = (el) => !el.matches(':disabled, [aria-disabled="true"]') && !el.closest('[hidden], [inert]') && (el.getClientRects().length > 0 || !!el.closest('[popover]'));
const keysOf = (el) => (el.dataset.fdKeys || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
const bindings = (root = document) => $$('[data-fd-keys]', root).map((el) => ({ el, keys: keysOf(el) })).filter((b) => b.keys.length && b.keys.length <= 2 && usable(b.el));

function showKeyHint(first) {
  if (!keyHint?.isConnected) {
    keyHint = document.createElement('div');
    keyHint.className = 'fd-keys-hint';
    keyHint.setAttribute('role', 'status');
    keyHint.hidden = true;
    document.body.append(keyHint);
  }
  keyHint.innerHTML = `<kbd class="fd-kbd">${esc(first.toUpperCase())}</kbd><span>${esc(label(null, 'keys.then', 'then a key'))}</span>`;
  keyHint.hidden = false;
  void keyHint.offsetWidth;
  keyHint.dataset.state = 'open';
}
function clearKeyWait() {
  if (!keyWait) return;
  clearTimeout(keyWait.timer);
  keyWait = null;
  document.documentElement.removeAttribute('data-fd-keys-pending');
  if (keyHint) { keyHint.dataset.state = 'closed'; keyHint.hidden = true; }
}
function activateKeys(el, keys) {
  if (el.matches('input, textarea, select')) { el.focus(); if (el.select) el.select(); } else el.click();
  emit(el, 'fd:keys', { keys: keys.join(' ') });
}
function onKeys(event) {
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'Escape') { clearKeyWait(); return; }
  if (event.key.length !== 1 || typing(event.target) || modalOpen()) return;
  const key = event.key.toLowerCase();
  // A search on the page itself (forms.js, data-fd-search-hotkey) has "/" first: it is what the person is looking at.
  if (key === '/' && !keyWait && $$('[data-fd-search-hotkey]').some((el) => !el.disabled && el.getClientRects().length)) return;
  const list = bindings();
  if (keyWait) {
    const first = keyWait.first;
    clearKeyWait();
    const hit = list.find((b) => b.keys.length === 2 && b.keys[0] === first && b.keys[1] === key);
    if (hit) { event.preventDefault(); activateKeys(hit.el, hit.keys); }
    return;
  }
  const single = list.find((b) => b.keys.length === 1 && b.keys[0] === key);
  if (single) { event.preventDefault(); activateKeys(single.el, single.keys); return; }
  if (list.some((b) => b.keys.length === 2 && b.keys[0] === key)) {
    event.preventDefault();
    keyWait = { first: key, timer: setTimeout(clearKeyWait, KEY_WAIT) };
    document.documentElement.setAttribute('data-fd-keys-pending', key);
    showKeyHint(key);
  }
}
function setupNavKey(item) {
  if (!once(item, 'shell-navkey')) return;
  const keys = keysOf(item);
  if (keys.length !== 2 || item.querySelector(':scope > .fd-nav-key')) return;
  const kbd = document.createElement('kbd');
  kbd.className = 'fd-kbd fd-nav-key';
  kbd.setAttribute('aria-hidden', 'true');
  kbd.textContent = keys[1].toUpperCase();
  (item.querySelector(':scope > .fd-nav-text') || item.lastElementChild)?.after(kbd);
}

/* The shortcut sheet: filled from the page each time it opens, so it never lists a key that does nothing. */
const keyName = (el) => (el.dataset.fdKeysLabel || el.getAttribute('aria-label') || el.querySelector('.fd-nav-text')?.textContent || el.textContent || '').replace(/\s+/g, ' ').trim();
function renderShortcuts(dialog) {
  const host = dialog.querySelector('[data-fd-shortcuts-list]');
  if (!host) return;
  const groups = new Map();
  for (const { el, keys } of bindings()) {
    const group = el.dataset.fdKeysGroup || (keys.length === 2 && keys[0] === 'g' ? label(dialog, 'keys.go', 'Go to') : label(dialog, 'keys.general', 'General'));
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ name: keyName(el), keys });
  }
  const general = label(dialog, 'keys.general', 'General');
  const ordered = [...groups].sort(([a], [b]) => (a === general ? -1 : 0) - (b === general ? -1 : 0));
  host.classList.add('fd-shortcuts');
  host.replaceChildren(...ordered.map(([name, rows]) => {
    const group = document.createElement('section');
    group.className = 'fd-shortcuts-group';
    const head = document.createElement('h3');
    head.className = 'fd-shortcuts-label';
    head.textContent = name;
    group.append(head);
    for (const row of rows) {
      const line = document.createElement('div');
      line.className = 'fd-shortcuts-row';
      const text = document.createElement('span');
      text.className = 'fd-shortcuts-name';
      text.textContent = row.name;
      const keys = document.createElement('span');
      keys.className = 'fd-shortcuts-keys';
      row.keys.forEach((k, i) => {
        if (i) { const then = document.createElement('span'); then.textContent = label(dialog, 'keys.then-short', 'then'); keys.append(then); }
        const kbd = document.createElement('kbd');
        kbd.className = 'fd-kbd';
        kbd.textContent = k.length === 1 ? k.toUpperCase() : k;
        keys.append(kbd);
      });
      line.append(text, keys);
      group.append(line);
    }
    return group;
  }));
}

/* ---------- Running now ---------- */
const runningWatch = new WeakMap();
function runningList(pill) {
  const id = pill.getAttribute('data-fd-running') || pill.getAttribute('aria-controls');
  return id ? document.getElementById(id) : null;
}
function updateRunning(pill) {
  const list = runningList(pill);
  const n = list ? $$('.fd-running-item', list).length : Number(pill.dataset.count) || 0;
  const changed = pill.dataset.count !== String(n);
  pill.dataset.count = String(n);
  pill.hidden = n === 0;
  const count = pill.querySelector('.fd-running-count');
  if (count) count.textContent = String(n);
  pill.setAttribute('aria-label', label(pill, 'running.count', '{n} running', { n }));
  if (changed) emit(pill, 'fd:change', { value: n });
}
/** Recount every running pill in `root` (call it after changing the items; a popover's own changes are seen without it). */
export function syncRunning(root = document) {
  const pills = root instanceof Element && root.matches('[data-fd-running]') ? [root] : $$('[data-fd-running]', root);
  for (const pill of pills) {
    updateRunning(pill);
    const list = runningList(pill);
    if (list && typeof MutationObserver !== 'undefined' && !runningWatch.has(pill)) {
      const watcher = new MutationObserver(() => updateRunning(pill));
      watcher.observe(list, { childList: true, subtree: true });
      runningWatch.set(pill, watcher);
    }
  }
}

/* ---------- Service status ---------- */
const SERVICE = {
  operational: ['activity', 'All systems operational'],
  degraded: ['triangle-alert', 'Degraded performance'],
  outage: ['circle-alert', 'Service outage'],
  maintenance: ['clock', 'Scheduled maintenance'],
};
/** Set a .fd-service-status to operational, degraded, outage or maintenance, with an optional text of its own. */
export function setServiceStatus(el, status, text) {
  if (!el || !SERVICE[status]) return;
  const [iconName, fallback] = SERVICE[status];
  const name = text || label(el, `status.${status}`, fallback);
  const changed = el.dataset.status !== status;
  el.dataset.status = status;
  let span = el.querySelector('.fd-service-status-label');
  if (!span) { span = document.createElement('span'); span.className = 'fd-service-status-label'; el.append(span); }
  span.textContent = name;
  el.setAttribute('aria-label', name);
  el.dataset.fdTooltip = name;
  swapIcon(el, iconName);
  if (changed) emit(el, 'fd:change', { value: status });
}

/* ---------- Init ---------- */
export function init(root = document) {
  if (once(document, 'fd-shell')) {
    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', onOver, { passive: true });
    document.documentElement.addEventListener('pointerleave', hideTip);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', (event) => { if (event.target === tipOwner) hideTip(); });
    addEventListener('scroll', hideTip, { capture: true, passive: true });
    addEventListener('blur', hideTip);
    document.documentElement.addEventListener('fd:theme', () => syncThemeToggles());
    document.addEventListener('keydown', onKeys);
    document.addEventListener('fd:open', (event) => { if (event.target instanceof Element && event.target.matches('[data-fd-shortcuts]')) renderShortcuts(event.target); });
  }
  $$('.fd-app', root).forEach(setupApp);
  if (root instanceof Element && root.matches('.fd-app')) setupApp(root);
  $$('.fd-nav-group > .fd-nav-item[aria-expanded], .fd-nav-group > .fd-nav-item[aria-controls]', root).forEach(setupGroup);
  $$('.fd-mobile-nav', root).forEach(setupMobileNav);
  $$('[data-fd-initial]', root).forEach(setupInitial);
  if (root instanceof Element && root.matches('[data-fd-initial]')) setupInitial(root);
  $$('.fd-nav-item[data-fd-keys]', root).forEach(setupNavKey);
  syncRunning(root);
  syncThemeToggles(root);
}
