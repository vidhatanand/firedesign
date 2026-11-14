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
 * Events (bubbling): fd:change { value: "expanded"|"collapsed" } on .fd-app;
 *  fd:open / fd:close on .fd-nav-group and .fd-mobile-nav.
 * API: init(root), setSidebar(app, state), toggleSidebar(app), setNavGroup(button, open),
 *  openMobileNav(sheet, trigger), closeMobileNav(), cycleTheme()
 */
import { $$, once, emit, ensureId, focusables, position, getTheme, setTheme } from './core.js';
import { icon } from './icons.js';

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
  if (current?.dataset.fdIconName === name) return;
  const t = document.createElement('template');
  t.innerHTML = icon(name);
  const svg = t.content.firstElementChild;
  svg.dataset.fdIconName = name;
  if (current) current.replaceWith(svg);
  else host.prepend(svg);
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
    btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
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
  trigger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
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
  if (!sheet.hasAttribute('aria-label') && !sheet.hasAttribute('aria-labelledby')) sheet.setAttribute('aria-label', 'Menu');
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
    btn.setAttribute('aria-label', `Theme: ${THEMES[theme][1]}. Switch to ${THEMES[next][1].toLowerCase()}`);
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
  }
  $$('.fd-app', root).forEach(setupApp);
  if (root instanceof Element && root.matches('.fd-app')) setupApp(root);
  $$('.fd-nav-group > .fd-nav-item[aria-expanded], .fd-nav-group > .fd-nav-item[aria-controls]', root).forEach(setupGroup);
  $$('.fd-mobile-nav', root).forEach(setupMobileNav);
  syncThemeToggles(root);
}
