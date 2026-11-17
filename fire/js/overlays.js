/* Fire overlays — menus, popovers, tooltips, hovercards, dialogs, sheets, toasts, command palette.
 *
 * Floating surfaces use the native Popover API (popover="auto" for menus and popovers, "manual"
 * for tooltips, hovercards and the toaster), positioned with position()/autoUpdate() from core.
 * Modal surfaces are native <dialog>s opened with showModal(). Where either API is missing the
 * module degrades to data-state + fixed positioning with its own light dismiss and focus trap.
 * State is written to data-state="open|closed" and ARIA; CSS reads the same attributes.
 *
 * Menu
 *   <button class="fd-btn" data-fd-menu="row-actions" [data-placement="bottom-end"]>…</button>
 *   <div class="fd-menu" id="row-actions" popover role="menu" [data-variant="switcher"]>
 *     <div class="fd-menu-head"><p class="fd-menu-title">Actions</p><button class="fd-menu-close" aria-label="Close menu">…</button></div>
 *     <button class="fd-menu-item">…</button>
 *     <button class="fd-menu-item" role="menuitemcheckbox" aria-checked="true">…</button>
 *     <button class="fd-menu-item" role="menuitemradio" aria-checked="false" data-value="7d">…</button>
 *     <button class="fd-menu-item" data-fd-submenu="move-to">Move to</button>
 *     <div class="fd-menu" id="move-to" popover>…</div>          (sub-menus live inside their parent)
 *   </div>
 *   Triggers get aria-haspopup / aria-expanded / aria-controls. Selecting an item fires a cancelable
 *   `fd:select` (detail: { value, item, trigger }); cancel it to keep the menu open. Checkbox and radio
 *   items also fire `fd:change`. [data-fd-menu-value] inside the trigger mirrors the checked radio.
 *   data-keep-open on an item or the menu keeps it open after a selection.
 *   openMenu(id, { trigger, at: { x, y }, focus: 'first'|'last'|'menu'|'none', placement }), closeMenu(id).
 *
 * Popover
 *   <button data-fd-popover="usage-pop">…</button>
 *   <div class="fd-popover" id="usage-pop" popover [data-arrow] [data-placement="bottom"]>… [data-fd-popover-close] …</div>
 *   openPopover(id, { trigger }), closePopover(id).
 *   Notifications: data-fd-notifications on the popover; buttons [data-fd-show="all|unread"], select
 *     [data-fd-category], button [data-fd-mark-read], rows .fd-notification[data-unread][data-category],
 *     .fd-popover-empty, and badges [data-fd-unread-count="<popover id>"] anywhere on the page.
 *   Date range: .fd-daterange[data-fd-daterange] [data-value="2026-11-08/2026-11-14"] [data-preset="7d"]
 *     [data-max="today"], with .fd-daterange-preset[data-preset="24h|7d|30d|month|custom"], an empty
 *     .fd-calendar (rendered here), [data-fd-daterange-summary], [data-fd-daterange-cancel],
 *     [data-fd-daterange-apply]. Apply fires fd:change (detail.value = { start, end, preset }) and writes
 *     the label into [data-fd-daterange-label] inside the trigger.
 *   Filter list: [data-fd-filter-list] with input[data-fd-filter-search], .fd-checklist > .fd-checklist-item
 *     (.fd-checklist-label, .fd-checklist-count), .fd-checklist-empty, [data-fd-filter-summary],
 *     [data-fd-filter-clear]. Changes fire fd:change (detail.value = selected values) and update
 *     [data-fd-filter-label] (data-empty="All endpoints") inside the trigger.
 *
 * Tooltip
 *   <button data-fd-tooltip="Copy key" [data-placement="top"] [data-shortcut="⌘ C"]>…</button>
 *   350ms in, instant between neighbours, no delay out; shows on keyboard focus; Escape, scroll and
 *   press hide it. Icon-only triggers without a name get aria-label from the tooltip text.
 *
 * Hovercard
 *   <a href="…" data-fd-hovercard="maya-card" [data-open-delay="500"] [data-close-delay="250"]>Maya Chen</a>
 *   <div class="fd-hovercard" id="maya-card" popover="manual">…</div>
 *
 * Dialog and sheet
 *   <button data-fd-dialog-open="create-key">…</button>
 *   <dialog class="fd-dialog|fd-sheet" id="create-key" [data-static] [data-reset]>… [data-fd-dialog-close] …</dialog>
 *   Escape, [data-fd-dialog-close] and backdrop clicks close (data-static keeps backdrop clicks).
 *   Focus goes to [autofocus], else the first form field of the body, else the title (made tabindex=-1 while
 *   open) or the surface itself, never a footer action; it returns to the trigger. data-reset resets
 *   forms on open. Steps: <section data-step="form">… and buttons [data-fd-dialog-step="next|prev|<name>"]
 *   (a submit button validates its form first; data-fd-dialog-step-delay="600" shows a busy state);
 *   .fd-dialog-dots > span reflect the step. Fires fd:open, fd:close (detail.value = returnValue; once per close, after the native close event, however it closed)
 *   and fd:change (detail.value = step name). openDialog(id, { trigger }), closeDialog(id, value).
 *   Below 640px dialogs and sheets are bottom sheets that can be dragged down to close.
 *
 * Type-to-confirm
 *   <dialog class="fd-dialog fd-confirm" data-confirm="ember-prod"><form method="dialog">…
 *     <input class="fd-input" data-fd-confirm-input> … <button value="confirm" data-fd-confirm-submit disabled>…
 *   The submit button enables when the input matches. Submitting fires a cancelable fd:confirm on the
 *   dialog; cancel it to run async work, then closeDialog(id, 'confirm').
 *
 * Toast
 *   toast({ title, description, tone, icon, action: { label, onClick }, duration, id }) → id
 *   tone: neutral | success | danger | warning | info | loading. duration: ms, Infinity to persist.
 *   toast.promise(promise, { loading, success, error }) → id   (each a string, options or fn(value))
 *   toast.update(id, options) · toast.dismiss(id?) · toast.success/error/warning/info(title, options)
 *   Declarative: <button data-fd-toast='{"title":"Key copied","tone":"success"}'>.
 *
 * Command palette
 *   <dialog class="fd-command" id="command" aria-label="Command palette">
 *     .fd-command-search > input.fd-command-input · .fd-command-list > .fd-command-group
 *     (.fd-command-group-label, .fd-command-item[data-value][data-keywords] with .fd-command-item-label,
 *     .fd-command-item-hint, .fd-kbd) · .fd-command-empty [data-fd-command-query] · .fd-command-foot
 *   ⌘K / Ctrl+K toggles the first palette; [data-fd-command-open] opens it. Selecting fires a
 *   cancelable fd:select on the item (detail: { value, item, data }).
 *   command.open() · command.close() · command.toggle() ·
 *   command.register([{ id, label, group, icon, hint, shortcut, keywords, href, perform }]) → unregister
 */
import { $$, on, once, emit, position, autoUpdate, focusables, trapFocus, ensureId, clamp, reducedMotion, label as fdLabel } from './core.js';
import { icon } from './icons.js';

const doc = document;
const HAS_POPOVER = typeof HTMLElement === 'function' && typeof HTMLElement.prototype.showPopover === 'function';
const HAS_DIALOG = typeof HTMLDialogElement === 'function' && typeof HTMLDialogElement.prototype.showModal === 'function';
const FLOATING = '.fd-menu, .fd-popover, .fd-hovercard, .fd-tooltip';
const MODAL = '.fd-dialog, .fd-sheet, .fd-command';
const MENU_ITEM = '.fd-menu-item';
const SCROLLERS = '.fd-dialog-body, .fd-sheet-body';
const LOCALE = doc.documentElement.lang || undefined;

const byId = (ref) => (typeof ref === 'string' ? doc.getElementById(ref.replace(/^#/, '')) : ref || null);
const isOpen = (el) => !!el && el.dataset.state === 'open';
const isPhone = () => matchMedia('(max-width: 640px)').matches;
const enabled = (el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true';
const visible = (el) => !el.hidden && el.getClientRects().length > 0;
const focusEl = (el, scroll = false) => el?.focus?.({ preventScroll: !scroll });
let tipQuietUntil = 0;
/** Hand focus back to a trigger without popping its tooltip. */
const restoreFocus = (el) => { tipQuietUntil = performance.now() + 120; focusEl(el); };
const isStatic = (el) => el.hasAttribute('data-static-demo');

/** The readable label of an item, without descriptions, counts and shortcuts. */
function textOf(item) {
  const label = item.querySelector('.fd-menu-item-label, .fd-checklist-label, .fd-command-item-label, [data-fd-label]') || item;
  let text = '';
  for (const node of label.childNodes) {
    if (node.nodeType === 3) text += node.textContent;
    else if (node.nodeType === 1 && !node.matches('.fd-menu-item-desc, .fd-menu-item-hint, .fd-checklist-count, .fd-kbd, kbd, svg, i, .fd-tile, .fd-avatar, .fd-badge')) text += node.textContent;
  }
  return text.trim().replace(/\s+/g, ' ');
}

/* ==========================================================================
   Layers: one bookkeeping path for every floating surface
   ========================================================================== */
const layers = new Map();        // el → { trigger, parentItem, stop, onClose, returnFocus }
const modes = new WeakMap();     // el → 'auto' | 'manual'
const fallbackStack = [];        // auto layers opened without the Popover API
let lastLayerAt = 0;

function prepare(el, mode = 'auto') {
  if (isStatic(el)) return;
  if (!modes.has(el)) modes.set(el, el.getAttribute('popover') === 'manual' ? 'manual' : mode);
  if (HAS_POPOVER && !el.hasAttribute('popover')) el.setAttribute('popover', modes.get(el));
  if (!el.dataset.state) el.dataset.state = 'closed';
}

/** Show a surface measured at full size, then let it animate in from its anchor side. */
function reveal(el, place, source) {
  el.dataset.measuring = 'true';
  if (HAS_POPOVER && el.hasAttribute('popover')) {
    try { el.showPopover(source ? { source } : undefined); }
    catch {
      try { el.showPopover(); } catch { delete el.dataset.measuring; return false; }
    }
  } else if (modes.get(el) !== 'manual') {
    for (const other of [...fallbackStack].reverse()) if (other !== el && !other.contains(el)) conceal(other);
    fallbackStack.push(el);
  }
  place?.();
  el.dataset.measuring = 'settle';
  el.getBoundingClientRect(); // commit the closed style so the transition has somewhere to start
  delete el.dataset.measuring;
  el.dataset.state = 'open';
  lastLayerAt = performance.now();
  return true;
}

function conceal(el) {
  if (!el) return;
  if (HAS_POPOVER && el.hasAttribute('popover')) {
    try { if (el.matches(':popover-open')) el.hidePopover(); } catch { /* already hidden */ }
  }
  settle(el);
}

/** Closed bookkeeping; runs once per close whatever closed it (light dismiss, Escape, code). */
function settle(el) {
  if (el.dataset.state !== 'open') return;
  el.dataset.state = 'closed';
  const i = fallbackStack.indexOf(el);
  if (i > -1) fallbackStack.splice(i, 1);
  const entry = layers.get(el);
  if (entry) {
    layers.delete(el);
    entry.stop?.();
    entry.onClose?.(el, entry);
  }
  emit(el, 'fd:close');
}

/** position() plus the arrow offset, measured at full size. */
function place(el, anchor, placement, { offset = 6 } = {}) {
  const arrow = el.hasAttribute('data-arrow');
  const result = position(anchor, el, { placement, offset: offset + (arrow ? 6 : 0), padding: 8 });
  if (arrow) {
    const a = anchor.getBoundingClientRect();
    if (result.side === 'top' || result.side === 'bottom') {
      const x = clamp(a.left + a.width / 2 - parseFloat(el.style.left), 18, el.offsetWidth - 18);
      el.style.setProperty('--_o-arrow-x', `${Math.round(x)}px`);
    } else {
      const y = clamp(a.top + a.height / 2 - parseFloat(el.style.top), 18, el.offsetHeight - 18);
      el.style.setProperty('--_o-arrow-y', `${Math.round(y)}px`);
    }
  }
  return result;
}

/** Keep a surface on its anchor; skip frames while it is still scaling in (sizes would be off). */
function track(el, update) {
  const scaling = () => el.getAnimations?.().some((a) => a.transitionProperty === 'scale' && a.playState === 'running');
  const stop = autoUpdate(() => { if (isOpen(el) && !scaling()) update(); });
  const end = (event) => { if (event.target === el && event.propertyName === 'scale' && isOpen(el)) update(); };
  el.addEventListener('transitionend', end);
  return () => { stop(); el.removeEventListener('transitionend', end); };
}

const pointAnchor = (x, y) => ({ getBoundingClientRect: () => new DOMRect(x, y, 0, 0) });

/* ==========================================================================
   Menu
   ========================================================================== */
let subTimer = 0;
const typeBuffers = new WeakMap();

const menuItems = (menu) => $$(MENU_ITEM, menu).filter((item) => item.closest('.fd-menu') === menu && visible(item));

function setupMenu(menu) {
  if (!menu.hasAttribute('role')) menu.setAttribute('role', 'menu');
  if (isStatic(menu)) return;
  prepare(menu, 'auto');
  ensureId(menu, 'fd-menu');
  if (!menu.hasAttribute('tabindex')) menu.tabIndex = -1;
  for (const item of $$(MENU_ITEM, menu)) {
    if (item.closest('.fd-menu') !== menu) continue;
    if (!item.hasAttribute('role')) item.setAttribute('role', 'menuitem');
    item.tabIndex = -1;
    if (item.matches('button') && !item.hasAttribute('type')) item.type = 'button';
    if (item.dataset.fdSubmenu) {
      item.setAttribute('aria-haspopup', 'menu');
      item.setAttribute('aria-controls', item.dataset.fdSubmenu);
      if (!item.hasAttribute('aria-expanded')) item.setAttribute('aria-expanded', 'false');
    }
  }
  for (const sep of $$('.fd-menu-sep', menu)) sep.setAttribute('role', 'separator');
}

function setupTrigger(trigger, kind) {
  const target = kind === 'menu' ? trigger.dataset.fdMenu : trigger.dataset.fdPopover;
  if (!trigger.hasAttribute('aria-haspopup')) trigger.setAttribute('aria-haspopup', kind === 'menu' ? 'menu' : 'dialog');
  if (!trigger.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', 'false');
  if (target) trigger.setAttribute('aria-controls', target);
}

export function openMenu(ref, { trigger = null, at = null, focus = 'first', placement } = {}) {
  const menu = byId(ref);
  if (!menu || isStatic(menu)) return null;
  setupMenu(menu);
  const parentItem = trigger?.matches?.(MENU_ITEM) && trigger.closest('.fd-menu') ? trigger : null;
  if (parentItem) {
    const parent = parentItem.closest('.fd-menu');
    if (!parent.contains(menu)) parent.append(menu); // nested in the DOM = nested in the popover tree
  }
  if (isOpen(menu)) {
    if (layers.get(menu)?.trigger === trigger) { focusMenu(menu, focus); return menu; }
    conceal(menu);
  }
  const anchor = at ? pointAnchor(at.x, at.y) : trigger;
  const side = placement || trigger?.dataset.placement || menu.dataset.placement || (parentItem ? 'right-start' : 'bottom-start');
  const entry = { trigger, parentItem, onClose: onMenuClose };
  layers.set(menu, entry);
  const update = anchor ? () => placeMenu(menu, anchor, side, parentItem) : null;
  if (!reveal(menu, update, trigger)) { layers.delete(menu); return null; }
  if (update) entry.stop = track(menu, update);
  trigger?.setAttribute('aria-expanded', 'true');
  focusMenu(menu, focus);
  emit(menu, 'fd:open', { trigger });
  return menu;
}

export function closeMenu(ref, returnFocus = true) {
  const menu = byId(ref);
  if (menu && isOpen(menu)) closeMenuTree(menu, returnFocus);
}

function placeMenu(menu, anchor, placement, parentItem) {
  const pad = parentItem ? parseFloat(getComputedStyle(parentItem.closest('.fd-menu')).paddingInlineEnd) || 0 : 0;
  const result = place(menu, anchor, placement, { offset: parentItem ? pad + 4 : 6 });
  if (parentItem && (result.side === 'right' || result.side === 'left') && result.align === 'start') {
    // Align the first sub-menu item with the item that opened it.
    const own = parseFloat(getComputedStyle(menu).paddingTop) || 0;
    menu.style.top = `${Math.round(Math.max(8, parseFloat(menu.style.top) - own))}px`;
  }
}

function onMenuClose(menu, entry) {
  clearTimeout(subTimer);
  entry.trigger?.setAttribute?.('aria-expanded', 'false');
  for (const [el, e] of layers) if (e.parentItem && menu.contains(e.parentItem)) conceal(el);
  if (entry.trigger?.isConnected && (entry.returnFocus || menu.contains(doc.activeElement))) restoreFocus(entry.trigger);
}

function rootMenu(menu) {
  let current = menu;
  for (;;) {
    const parent = layers.get(current)?.parentItem?.closest('.fd-menu');
    if (!parent) return current;
    current = parent;
  }
}

function closeMenuTree(menu, returnFocus = true) {
  const root = rootMenu(menu);
  const entry = layers.get(root);
  if (entry) entry.returnFocus = returnFocus;
  conceal(root);
}

function focusMenu(menu, where) {
  if (where === 'none') return;
  const items = menuItems(menu).filter(enabled);
  let target = null;
  if (where === 'first') target = items.find((i) => i.getAttribute('aria-checked') === 'true' && menu.dataset.variant === 'switcher') || items[0];
  else if (where === 'last') target = items[items.length - 1];
  focusEl(target || menu);
}

function openChild(menu) {
  for (const [el, e] of layers) if (e.parentItem?.closest('.fd-menu') === menu && isOpen(el)) return el;
  return null;
}

function openSubmenu(item, focusFirst) {
  const sub = byId(item.dataset.fdSubmenu);
  if (!sub) return;
  const current = openChild(item.closest('.fd-menu'));
  if (current && current !== sub) conceal(current);
  if (!isOpen(sub)) openMenu(sub, { trigger: item, focus: focusFirst ? 'first' : 'none' });
  else if (focusFirst) focusMenu(sub, 'first');
}

function hoverItem(menu, item) {
  clearTimeout(subTimer);
  const child = openChild(menu);
  if (item?.dataset.fdSubmenu && enabled(item)) {
    if (child && layers.get(child)?.parentItem === item) return;
    subTimer = setTimeout(() => openSubmenu(item, false), child ? 0 : 90);
  } else if (child) {
    subTimer = setTimeout(() => conceal(child), 220);
  }
}

function typeahead(menu, items, current, key) {
  const state = typeBuffers.get(menu) || { buffer: '', timer: 0 };
  clearTimeout(state.timer);
  state.buffer += key.toLowerCase();
  state.timer = setTimeout(() => { state.buffer = ''; }, 500);
  typeBuffers.set(menu, state);
  const index = current ? items.indexOf(current) : -1;
  const after = [...items.slice(index + 1), ...items.slice(0, index + 1)];
  const repeated = state.buffer.length > 1 && [...state.buffer].every((c) => c === state.buffer[0]);
  const query = repeated ? state.buffer[0] : state.buffer;
  const pool = repeated || !current ? after : [current, ...after.filter((i) => i !== current)];
  const match = pool.find((i) => textOf(i).toLowerCase().startsWith(query));
  if (match) focusEl(match, true);
}

function onMenuKey(event, menu) {
  const entry = layers.get(menu);
  const items = menuItems(menu).filter(enabled);
  const current = event.target.closest(MENU_ITEM);
  const index = current ? items.indexOf(current) : -1;
  let next = null;
  switch (event.key) {
    case 'ArrowDown': next = items[(index + 1) % items.length]; break;
    case 'ArrowUp': next = items[index <= 0 ? items.length - 1 : index - 1]; break;
    case 'Home': case 'PageUp': next = items[0]; break;
    case 'End': case 'PageDown': next = items[items.length - 1]; break;
    case 'ArrowRight':
      if (current?.dataset.fdSubmenu && enabled(current)) { event.preventDefault(); openSubmenu(current, true); }
      return;
    case 'ArrowLeft':
      if (entry?.parentItem) { event.preventDefault(); entry.returnFocus = true; conceal(menu); }
      return;
    case 'Escape':
      event.preventDefault();
      event.stopPropagation();
      if (entry?.parentItem) { entry.returnFocus = true; conceal(menu); } else closeMenuTree(menu, true);
      return;
    case 'Tab':
      closeMenuTree(menu, true); // focus returns to the trigger, then Tab moves on from there
      return;
    case 'Enter': case ' ':
      if (current && !current.matches('button')) { event.preventDefault(); current.click(); }
      else if (!current) event.preventDefault();
      return;
    default:
      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        typeahead(menu, items, current, event.key);
      }
      return;
  }
  if (next) { event.preventDefault(); focusEl(next, true); }
}

function activateItem(event, item) {
  const menu = item.closest('.fd-menu');
  if (!enabled(item)) { event.preventDefault(); return; }
  if (item.dataset.fdSubmenu) { event.preventDefault(); openSubmenu(item, event.detail === 0); return; }
  const role = item.getAttribute('role');
  const value = item.dataset.value ?? textOf(item);
  let keepOpen = item.hasAttribute('data-keep-open') || menu.hasAttribute('data-keep-open');
  if (role === 'menuitemcheckbox') {
    const checked = item.getAttribute('aria-checked') !== 'true';
    item.setAttribute('aria-checked', String(checked));
    emit(item, 'fd:change', { value: checked, item });
    keepOpen = keepOpen || !item.hasAttribute('data-close');
  } else if (role === 'menuitemradio') {
    const group = item.closest('[role="group"]') || menu;
    for (const radio of $$('[role="menuitemradio"]', group)) if (radio.closest('.fd-menu') === menu) radio.setAttribute('aria-checked', String(radio === item));
    const trigger = layers.get(rootMenu(menu))?.trigger;
    const mirror = trigger?.querySelector?.('[data-fd-menu-value]');
    if (mirror) mirror.textContent = textOf(item);
    emit(item, 'fd:change', { value, item });
  }
  const proceed = emit(item, 'fd:select', { value, item, trigger: layers.get(rootMenu(menu))?.trigger || null });
  if (!proceed) keepOpen = true;
  if (!keepOpen && isOpen(menu)) closeMenuTree(menu, true);
}

/* ==========================================================================
   Popover (+ notifications, date range, filter list)
   ========================================================================== */
function setupPopover(pop) {
  if (isStatic(pop)) return;
  prepare(pop, 'auto');
  ensureId(pop, 'fd-popover');
  if (!pop.hasAttribute('role')) pop.setAttribute('role', 'dialog');
  if (!pop.hasAttribute('tabindex')) pop.tabIndex = -1;
  if (!pop.hasAttribute('aria-label') && !pop.hasAttribute('aria-labelledby')) {
    const title = pop.querySelector('.fd-popover-title');
    if (title) pop.setAttribute('aria-labelledby', ensureId(title, 'fd-popover-title'));
  }
}

export function openPopover(ref, { trigger = null, placement, focus = true } = {}) {
  const pop = byId(ref);
  if (!pop || isStatic(pop)) return null;
  setupPopover(pop);
  if (isOpen(pop)) {
    if (layers.get(pop)?.trigger === trigger) return pop;
    conceal(pop);
  }
  refreshContent(pop);
  const side = placement || trigger?.dataset.placement || pop.dataset.placement || 'bottom-start';
  const entry = { trigger, onClose: onPopoverClose };
  layers.set(pop, entry);
  const update = trigger ? () => place(pop, trigger, side, { offset: 8 }) : null;
  if (!reveal(pop, update, trigger)) { layers.delete(pop); return null; }
  if (update) entry.stop = track(pop, update);
  trigger?.setAttribute('aria-expanded', 'true');
  if (focus) focusEl($$('[autofocus]', pop).find(visible) || pop);
  emit(pop, 'fd:open', { trigger });
  return pop;
}

export function closePopover(ref, returnFocus = true) {
  const pop = byId(ref);
  const entry = layers.get(pop);
  if (entry) entry.returnFocus = returnFocus;
  conceal(pop);
}

function onPopoverClose(pop, entry) {
  entry.trigger?.setAttribute?.('aria-expanded', 'false');
  if (entry.trigger?.isConnected && (entry.returnFocus || pop.contains(doc.activeElement))) restoreFocus(entry.trigger);
}

function refreshContent(pop) {
  for (const range of $$('[data-fd-daterange]', pop)) resetRange(range);
  if (pop.matches('[data-fd-notifications]')) applyNotifications(pop);
  for (const list of $$('[data-fd-filter-list]', pop)) syncFilter(list);
  if (pop.matches('[data-fd-filter-list]')) syncFilter(pop);
}

/* ---------- Notifications ---------- */
function applyNotifications(root) {
  const chosen = root.querySelector('[data-fd-show]:is([aria-pressed="true"], [aria-selected="true"], [aria-checked="true"])');
  const filter = chosen?.dataset.fdShow || 'all';
  const category = root.querySelector('[data-fd-category]')?.value || 'all';
  const rows = $$('.fd-notification', root);
  let shown = 0;
  for (const row of rows) {
    const show = (filter !== 'unread' || row.hasAttribute('data-unread')) && (category === 'all' || row.dataset.category === category);
    row.hidden = !show;
    if (show) shown += 1;
  }
  for (const list of $$('.fd-notification-list', root)) list.hidden = shown === 0;
  for (const empty of $$('.fd-popover-empty', root)) empty.hidden = shown > 0;
  const unread = rows.filter((r) => r.hasAttribute('data-unread')).length;
  for (const mark of $$('[data-fd-mark-read]', root)) mark.disabled = unread === 0;
  if (root.id) {
    for (const badge of $$(`[data-fd-unread-count="${CSS.escape(root.id)}"]`)) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.hidden = unread === 0;
    }
  }
  return unread;
}

/* ---------- Date range ---------- */
const ranges = new WeakMap();
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const today = () => startOfDay(new Date());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a, b) => !!a && !!b && a.getTime() === b.getTime();
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function parseDate(value) {
  if (value === 'today') return today();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
const shortDate = (d) => d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', ...(d.getFullYear() !== today().getFullYear() ? { year: 'numeric' } : {}) });
const PRESETS = {
  '24h': (t) => [addDays(t, -1), t],
  '7d': (t) => [addDays(t, -6), t],
  '30d': (t) => [addDays(t, -29), t],
  month: (t) => [new Date(t.getFullYear(), t.getMonth(), 1), t],
};

function rangeState(root) {
  let state = ranges.get(root);
  if (state) return state;
  const t = today();
  let [start, end] = (root.dataset.value || '').split('/').map(parseDate);
  let preset = root.dataset.preset || (start ? 'custom' : '7d');
  if (!start && PRESETS[preset]) [start, end] = PRESETS[preset](t);
  if (!start) [start, end] = PRESETS['7d'](t);
  end = end || start;
  state = { start, end, preset, pending: null, hover: null, focus: end, view: new Date(end.getFullYear(), end.getMonth(), 1) };
  state.committed = { start, end, preset };
  ranges.set(root, state);
  return state;
}

function resetRange(root) {
  const state = rangeState(root);
  Object.assign(state, state.committed, { pending: null, hover: null, focus: state.committed.end });
  state.view = new Date(state.end.getFullYear(), state.end.getMonth(), 1);
  buildCalendar(root);
  paintRange(root);
}

function buildCalendar(root) {
  const cal = root.querySelector('.fd-calendar');
  if (!cal) return;
  const state = rangeState(root);
  const year = state.view.getFullYear();
  const month = state.view.getMonth();
  const max = parseDate(root.dataset.max);
  const min = parseDate(root.dataset.min);
  const title = state.view.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // weeks start on Monday
  const days = new Date(year, month + 1, 0).getDate();
  const t = today();

  const head = doc.createElement('div');
  head.className = 'fd-calendar-head';
  const nav = (dir, label, name, disabled) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'fd-btn';
    b.dataset.variant = 'ghost';
    b.dataset.size = 'sm';
    b.toggleAttribute('data-icon-only', true);
    b.dataset.calNav = String(dir);
    b.setAttribute('aria-label', label);
    b.disabled = disabled;
    b.innerHTML = icon(name);
    return b;
  };
  const heading = doc.createElement('p');
  heading.className = 'fd-calendar-title';
  heading.setAttribute('aria-live', 'polite');
  heading.textContent = title;
  head.append(
    nav(-1, fdLabel(root, 'calendar.prev', 'Previous month'), 'chevron-left', !!min && new Date(year, month, 1) <= min),
    heading,
    nav(1, fdLabel(root, 'calendar.next', 'Next month'), 'chevron-right', !!max && new Date(year, month + 1, 1) > max),
  );

  const grid = doc.createElement('div');
  grid.className = 'fd-calendar-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', title);
  const weekRow = doc.createElement('div');
  weekRow.className = 'fd-calendar-row';
  weekRow.setAttribute('role', 'row');
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(2024, 0, 1 + i); // 1 Jan 2024 is a Monday
    const th = doc.createElement('span');
    th.className = 'fd-calendar-weekday';
    th.setAttribute('role', 'columnheader');
    th.setAttribute('aria-label', day.toLocaleDateString(LOCALE, { weekday: 'long' }));
    th.textContent = day.toLocaleDateString(LOCALE, { weekday: 'short' }).slice(0, 2);
    weekRow.append(th);
  }
  grid.append(weekRow);

  const total = Math.ceil((lead + days) / 7) * 7;
  let row;
  for (let i = 0; i < total; i += 1) {
    if (i % 7 === 0) {
      row = doc.createElement('div');
      row.className = 'fd-calendar-row';
      row.setAttribute('role', 'row');
      grid.append(row);
    }
    const cell = doc.createElement('div');
    cell.className = 'fd-calendar-cell';
    cell.setAttribute('role', 'gridcell');
    const n = i - lead + 1;
    if (n >= 1 && n <= days) {
      const date = new Date(year, month, n);
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'fd-calendar-day';
      btn.dataset.date = isoDate(date);
      btn.tabIndex = -1;
      btn.textContent = String(n);
      btn.setAttribute('aria-label', date.toLocaleDateString(LOCALE, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
      btn.disabled = (!!max && date > max) || (!!min && date < min);
      if (sameDay(date, t)) { btn.toggleAttribute('data-today', true); btn.setAttribute('aria-current', 'date'); }
      cell.append(btn);
    }
    row.append(cell);
  }
  cal.replaceChildren(head, grid);
  rovingDay(root);
}

function rovingDay(root) {
  const state = rangeState(root);
  const days = $$('.fd-calendar-day', root);
  const target = days.find((b) => b.dataset.date === isoDate(state.focus) && !b.disabled) || days.find((b) => b.getAttribute('aria-selected') === 'true' && !b.disabled) || days.find((b) => !b.disabled);
  for (const b of days) b.tabIndex = b === target ? 0 : -1;
  return target;
}

function paintRange(root) {
  const state = rangeState(root);
  const cal = root.querySelector('.fd-calendar');
  let a = state.start;
  let b = state.end;
  if (state.pending) {
    a = state.pending;
    b = state.hover;
    if (b && b < a) [a, b] = [b, a];
  }
  cal?.toggleAttribute('data-pending', !!state.pending);
  for (const btn of $$('.fd-calendar-day', root)) {
    const d = parseDate(btn.dataset.date);
    const cell = btn.parentElement;
    const isStart = sameDay(d, a);
    const isEnd = sameDay(d, b);
    const selected = state.pending ? sameDay(d, state.pending) : isStart || isEnd;
    btn.setAttribute('aria-selected', String(selected));
    btn.toggleAttribute('data-preview', !!state.pending && !!state.hover && sameDay(d, state.hover) && !sameDay(d, state.pending));
    let range = '';
    if (a && b && !sameDay(a, b)) range = isStart ? 'start' : isEnd ? 'end' : d > a && d < b ? 'middle' : '';
    if (range) cell.dataset.range = range; else delete cell.dataset.range;
    const col = [...cell.parentElement.children].indexOf(cell);
    const caps = [];
    if ((range === 'middle' || range === 'end') && (col === 0 || !cell.previousElementSibling?.firstElementChild)) caps.push('start');
    if ((range === 'middle' || range === 'start') && (col === 6 || !cell.nextElementSibling?.firstElementChild)) caps.push('end');
    if (caps.length) cell.dataset.cap = caps.join(' '); else delete cell.dataset.cap;
  }
  const summary = root.querySelector('[data-fd-daterange-summary]');
  if (summary) {
    if (state.pending) summary.textContent = state.hover && !sameDay(state.hover, state.pending) ? `${shortDate(a)} – ${shortDate(b)}` : `${shortDate(state.pending)} – …`;
    else summary.textContent = sameDay(a, b) ? shortDate(a) : `${shortDate(a)} – ${shortDate(b)}`;
  }
  for (const apply of $$('[data-fd-daterange-apply]', root)) apply.disabled = !!state.pending;
  for (const p of $$('.fd-daterange-preset', root)) p.setAttribute('aria-pressed', String(p.dataset.preset === (state.pending ? 'custom' : state.preset)));
}

function pickDay(root, date) {
  const state = rangeState(root);
  if (!state.pending) {
    state.pending = date;
    state.hover = null;
  } else {
    let [a, b] = [state.pending, date];
    if (b < a) [a, b] = [b, a];
    Object.assign(state, { start: a, end: b, pending: null, hover: null });
  }
  state.preset = 'custom';
  state.focus = date;
  paintRange(root);
  rovingDay(root);
}

function moveDay(root, date) {
  const state = rangeState(root);
  const max = parseDate(root.dataset.max);
  const min = parseDate(root.dataset.min);
  if ((max && date > max) || (min && date < min)) return;
  state.focus = date;
  if (date.getMonth() !== state.view.getMonth() || date.getFullYear() !== state.view.getFullYear()) {
    state.view = new Date(date.getFullYear(), date.getMonth(), 1);
    buildCalendar(root);
  }
  if (state.pending) state.hover = date;
  paintRange(root);
  focusEl(rovingDay(root));
}

function applyRange(root) {
  const state = rangeState(root);
  if (state.pending) return;
  state.committed = { start: state.start, end: state.end, preset: state.preset };
  const preset = state.preset !== 'custom' ? root.querySelector(`.fd-daterange-preset[data-preset="${CSS.escape(state.preset)}"]`) : null;
  const label = preset ? textOf(preset) : sameDay(state.start, state.end) ? shortDate(state.start) : `${shortDate(state.start)} – ${shortDate(state.end)}`;
  const pop = root.closest('.fd-popover');
  const triggers = new Set();
  if (pop && layers.get(pop)?.trigger) triggers.add(layers.get(pop).trigger);
  if (pop?.id) for (const t of $$(`[data-fd-popover="${CSS.escape(pop.id)}"]`)) triggers.add(t);
  for (const t of triggers) { const slot = t.querySelector('[data-fd-daterange-label]'); if (slot) slot.textContent = label; }
  emit(root, 'fd:change', { value: { start: isoDate(state.start), end: isoDate(state.end), preset: state.preset }, label });
  if (pop && isOpen(pop)) closePopover(pop, true);
}

/* ---------- Filter list ---------- */
function syncFilter(root) {
  const options = $$('.fd-checklist-item', root);
  for (const o of options) {
    if (!o.hasAttribute('role')) o.setAttribute('role', 'option');
    if (!o.hasAttribute('aria-selected')) o.setAttribute('aria-selected', 'false');
    if (!o.hasAttribute('tabindex')) o.tabIndex = -1;
  }
  const list = root.querySelector('.fd-checklist');
  if (list && !list.hasAttribute('role')) { list.setAttribute('role', 'listbox'); list.setAttribute('aria-multiselectable', 'true'); }
  if (options.length && !options.some((o) => o.tabIndex === 0)) options[0].tabIndex = 0;
  const selected = options.filter((o) => o.getAttribute('aria-selected') === 'true');
  for (const sum of $$('[data-fd-filter-summary]', root)) sum.textContent = selected.length ? fdLabel(sum, 'filter.selected', '{count} selected', { count: selected.length }) : fdLabel(sum, 'filter.none', 'None selected');
  for (const clear of $$('[data-fd-filter-clear]', root)) clear.disabled = selected.length === 0;
  const pop = root.closest('.fd-popover');
  if (!pop?.id || isStatic(pop)) return selected;
  for (const trigger of $$(`[data-fd-popover="${CSS.escape(pop.id)}"]`)) {
    const slot = trigger.querySelector('[data-fd-filter-label]');
    if (!slot) continue;
    const empty = slot.dataset.empty || root.dataset.empty || 'All';
    slot.textContent = !selected.length ? empty : selected.length === 1 ? textOf(selected[0]) : `${textOf(selected[0])} +${selected.length - 1}`;
    (trigger.closest('.fd-filter') || trigger).toggleAttribute('data-active', selected.length > 0);
  }
  return selected;
}

function searchFilter(root, query) {
  const q = query.trim().toLowerCase();
  let shown = 0;
  for (const o of $$('.fd-checklist-item', root)) {
    const match = !q || textOf(o).toLowerCase().includes(q) || (o.dataset.keywords || '').toLowerCase().includes(q);
    o.hidden = !match;
    if (match) shown += 1;
  }
  for (const empty of $$('.fd-checklist-empty', root)) {
    empty.hidden = shown > 0;
    const slot = empty.querySelector('[data-fd-filter-query]');
    if (slot) slot.textContent = query.trim();
  }
}

function changeFilter(root) {
  const selected = syncFilter(root);
  emit(root, 'fd:change', { value: selected.map((o) => o.dataset.value ?? textOf(o)) });
}

/* ==========================================================================
   Tooltip
   ========================================================================== */
let tip = null;
let tipFor = null;
let tipTimer = 0;
let tipHiddenAt = -1e9;
let tipSuppressed = null;

/** The tooltip trigger for an event target. The collapsed sidebar rail draws its own tips (shell). */
const RAIL_OWNED = '.fd-app[data-sidebar="collapsed"] .fd-sidebar :is(.fd-nav-item, .fd-account, [data-fd-sidebar-toggle])';
function tipTarget(node) {
  const trigger = node instanceof Element ? node.closest('[data-fd-tooltip]') : null;
  return trigger && !trigger.matches(RAIL_OWNED) ? trigger : null;
}

function tooltipEl() {
  if (tip?.isConnected) return tip;
  tip = doc.createElement('div');
  tip.className = 'fd-tooltip';
  tip.id = 'fd-tooltip';
  tip.setAttribute('role', 'tooltip');
  modes.set(tip, 'manual');
  if (HAS_POPOVER) tip.setAttribute('popover', 'manual');
  tip.dataset.state = 'closed';
  doc.body.append(tip);
  return tip;
}

function linkTip(trigger, on) {
  const ids = (trigger.getAttribute('aria-describedby') || '').split(/\s+/).filter((i) => i && i !== 'fd-tooltip');
  if (on && trigger.getAttribute('aria-label') !== trigger.dataset.fdTooltip) ids.push('fd-tooltip');
  if (ids.length) trigger.setAttribute('aria-describedby', ids.join(' ')); else trigger.removeAttribute('aria-describedby');
}

function showTip(trigger) {
  const text = trigger.dataset.fdTooltip;
  if (!text || !trigger.isConnected) return;
  clearTimeout(tipTimer);
  const el = tooltipEl();
  if (tipFor && tipFor !== trigger) linkTip(tipFor, false);
  tipFor = trigger;
  el.replaceChildren(doc.createTextNode(text));
  if (trigger.dataset.shortcut) {
    const keys = doc.createElement('span');
    keys.className = 'fd-tooltip-keys';
    for (const k of trigger.dataset.shortcut.split(/\s+/).filter(Boolean)) {
      const kbd = doc.createElement('kbd');
      kbd.className = 'fd-kbd';
      kbd.textContent = k;
      keys.append(kbd);
    }
    el.append(keys);
  }
  const placement = trigger.dataset.tooltipPlacement || trigger.dataset.placement || 'top';
  const update = () => place(el, trigger, placement, { offset: 6 });
  if (isOpen(el)) update();
  else reveal(el, update);
  linkTip(trigger, true);
}

function hideTip() {
  clearTimeout(tipTimer);
  if (tipFor) linkTip(tipFor, false);
  tipFor = null;
  if (tip && isOpen(tip)) { conceal(tip); tipHiddenAt = performance.now(); }
}

function scheduleTip(trigger) {
  clearTimeout(tipTimer);
  const warm = isOpen(tip) || performance.now() - tipHiddenAt < 300;
  if (warm) showTip(trigger);
  else tipTimer = setTimeout(() => showTip(trigger), 350);
}

/* ==========================================================================
   Hovercard
   ========================================================================== */
let card = null;
let cardFor = null;
let cardTimer = 0;

function showCard(trigger) {
  const el = byId(trigger.dataset.fdHovercard);
  if (!el || isStatic(el)) return;
  if (card && card !== el) hideCard();
  prepare(el, 'manual');
  card = el;
  cardFor = trigger;
  if (isOpen(el)) return;
  const placement = trigger.dataset.placement || el.dataset.placement || 'bottom-start';
  const update = () => place(el, trigger, placement, { offset: 8 });
  const entry = { trigger, onClose: () => { if (card === el) { card = null; cardFor = null; } } };
  layers.set(el, entry);
  hideTip();
  if (!reveal(el, update)) { layers.delete(el); return; }
  entry.stop = track(el, update);
}

function hideCard() {
  clearTimeout(cardTimer);
  if (card) conceal(card);
}

function scheduleCard(trigger, open) {
  clearTimeout(cardTimer);
  if (open) cardTimer = setTimeout(() => showCard(trigger), Number(trigger.dataset.openDelay ?? 500));
  else cardTimer = setTimeout(hideCard, Number(cardFor?.dataset.closeDelay ?? 250));
}

/* ==========================================================================
   Dialog and sheet
   ========================================================================== */
const modalStack = [];
const dialogOrigin = new WeakMap();
const dialogWatch = new WeakMap();
const fallbackTraps = new WeakMap();

const steps = (dialog) => $$('[data-step]', dialog).filter((s) => s.closest(MODAL) === dialog);
const currentStep = (dialog) => steps(dialog).find((s) => !s.hidden) || null;

function setupDialog(dialog) {
  if (!dialog.hasAttribute('tabindex')) dialog.tabIndex = -1;
  if (!dialog.hasAttribute('aria-labelledby') && !dialog.hasAttribute('aria-label')) {
    const title = dialog.querySelector('.fd-dialog-title, .fd-sheet-title');
    if (title) dialog.setAttribute('aria-labelledby', ensureId(title, 'fd-dialog-title'));
  }
  if (!dialog.hasAttribute('aria-describedby')) {
    const desc = dialog.querySelector('.fd-dialog-desc');
    if (desc) dialog.setAttribute('aria-describedby', ensureId(desc, 'fd-dialog-desc'));
  }
  for (const btn of $$('button:not([type])', dialog)) if (btn.matches('[data-fd-dialog-close], [data-fd-dialog-step]:not([type])')) btn.type = 'button';
  if (dialog.matches('.fd-command')) setupCommand(dialog);
  updateConfirm(dialog);
}

export function openDialog(ref, { trigger = null } = {}) {
  const dialog = byId(ref);
  if (!dialog || isStatic(dialog) || !dialog.matches(MODAL)) return null;
  if (dialog.open || dialog.hasAttribute('open')) return dialog;
  setupDialog(dialog);
  hideTip();
  hideCard();
  // A trigger inside a menu that has just closed can't take focus back; use what holds focus now.
  let origin = trigger || doc.activeElement;
  const layer = origin?.closest?.(FLOATING);
  if (layer && !isOpen(layer)) origin = doc.activeElement;
  dialogOrigin.set(dialog, origin);
  resetDialog(dialog);
  if (HAS_DIALOG && dialog instanceof HTMLDialogElement) {
    try { dialog.showModal(); } catch { return null; }
  } else {
    dialog.setAttribute('open', '');
    dialog.setAttribute('aria-modal', 'true');
    fallbackTraps.set(dialog, trapFocus(dialog));
  }
  dialog.dataset.state = 'open';
  modalStack.push(dialog);
  lastLayerAt = performance.now();
  doc.documentElement.setAttribute('data-fd-modal-lock', '');
  focusDialog(dialog);
  watchDialog(dialog);
  remountToaster();
  emit(dialog, 'fd:open', { trigger });
  return dialog;
}

export function closeDialog(ref, value) {
  const dialog = ref == null ? modalStack[modalStack.length - 1] : byId(ref);
  if (!dialog || !(dialog.open || dialog.hasAttribute('open'))) return;
  if (HAS_DIALOG && dialog instanceof HTMLDialogElement) {
    if (value === undefined) dialog.close(); else dialog.close(String(value));
  } else {
    dialog.removeAttribute('open');
    if (value !== undefined) dialog.returnValue = String(value);
    afterClose(dialog);
  }
}

function afterClose(dialog) {
  if (dialog.open || dialog.dataset.state !== 'open') return;
  dialog.dataset.state = 'closed';
  const index = modalStack.indexOf(dialog);
  if (index > -1) modalStack.splice(index, 1);
  if (!modalStack.length) doc.documentElement.removeAttribute('data-fd-modal-lock');
  dialogWatch.get(dialog)?.disconnect();
  dialog.style.removeProperty('--_o-drag');
  dialog.removeAttribute('data-dragging');
  fallbackTraps.get(dialog)?.();
  fallbackTraps.delete(dialog);
  for (const t of $$('[tabindex="-1"]', dialog)) if (titleMade.has(t)) { t.removeAttribute('tabindex'); titleMade.delete(t); }
  const origin = dialogOrigin.get(dialog);
  dialogOrigin.delete(dialog);
  const top = modalStack[modalStack.length - 1];
  if (origin?.isConnected && origin !== doc.body && (!top || top.contains(origin))) restoreFocus(origin);
  remountToaster();
  emit(dialog, 'fd:close', { value: dialog.returnValue });
}

function resetDialog(dialog) {
  dialog.returnValue = '';
  if (dialog.hasAttribute('data-reset')) for (const form of $$('form', dialog)) form.reset();
  const list = steps(dialog);
  if (list.length) showStep(dialog, list.find((s) => s.dataset.step === dialog.dataset.initialStep) || list[0], false);
  for (const input of $$('[data-fd-confirm-input]', dialog)) input.value = '';
  for (const busy of $$('[aria-busy="true"]', dialog)) busy.removeAttribute('aria-busy');
  updateConfirm(dialog);
  if (dialog.matches('.fd-command')) resetCommand(dialog);
}

const FIELD = 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]), select, textarea, [contenteditable="true"], [role="textbox"], [role="combobox"], [role="searchbox"]';
const titleMade = new WeakSet();

/** Where focus starts: [autofocus], else the first form field of the body, else the title (or the surface). Never a footer action. */
function focusDialog(dialog) {
  const scope = currentStep(dialog) || dialog;
  const auto = $$('[autofocus]', scope).find(visible);
  const field = focusables(scope).find((el) => el.matches(FIELD) && !el.closest('.fd-dialog-close, .fd-sheet-close'));
  if (auto || field) { focusEl(auto || field); return; }
  const title = scope.querySelector('.fd-dialog-title, .fd-sheet-title');
  if (title && visible(title)) {
    if (!title.hasAttribute('tabindex')) { title.tabIndex = -1; titleMade.add(title); }
    focusEl(title);
  } else focusEl(dialog);
}

function showStep(dialog, target, moveFocus = true) {
  const list = steps(dialog);
  if (!target) return;
  const index = list.indexOf(target);
  for (const s of list) s.hidden = s !== target;
  dialog.dataset.step = target.dataset.step;
  for (const dots of $$('.fd-dialog-dots', dialog)) {
    [...dots.children].forEach((dot, i) => { if (i === index) dot.setAttribute('aria-current', 'step'); else dot.removeAttribute('aria-current'); });
  }
  const title = target.querySelector('.fd-dialog-title, .fd-sheet-title');
  if (title) dialog.setAttribute('aria-labelledby', ensureId(title, 'fd-dialog-title'));
  if (moveFocus) focusDialog(dialog);
  updateEdges(dialog);
  emit(dialog, 'fd:change', { value: target.dataset.step, index });
}

function goStep(button) {
  const dialog = button.closest(MODAL);
  if (!dialog) return;
  const list = steps(dialog);
  const index = list.findIndex((s) => !s.hidden);
  const to = button.dataset.fdDialogStep;
  const target = to === 'next' ? list[index + 1] : to === 'prev' ? list[index - 1] : list.find((s) => s.dataset.step === to);
  const go = () => {
    button.removeAttribute('aria-busy');
    if (target) showStep(dialog, target);
    else if (to === 'next') closeDialog(dialog, 'done');
  };
  const delay = Number(button.dataset.fdDialogStepDelay || 0);
  if (delay > 0) { button.setAttribute('aria-busy', 'true'); setTimeout(go, delay); } else go();
}

function updateEdges(dialog) {
  const body = $$(SCROLLERS, dialog).find(visible);
  if (!body) { dialog.removeAttribute('data-overflow-top'); dialog.removeAttribute('data-overflow-bottom'); return; }
  const rest = body.scrollHeight - body.clientHeight - body.scrollTop;
  dialog.toggleAttribute('data-overflow-top', body.scrollTop > 1);
  dialog.toggleAttribute('data-overflow-bottom', rest > 1);
}

function watchDialog(dialog) {
  updateEdges(dialog);
  if (typeof ResizeObserver !== 'function') return;
  let observer = dialogWatch.get(dialog);
  if (!observer) { observer = new ResizeObserver(() => updateEdges(dialog)); dialogWatch.set(dialog, observer); }
  for (const body of $$(SCROLLERS, dialog)) {
    observer.observe(body);
    for (const child of body.children) observer.observe(child);
  }
}

function bump(dialog) {
  dialog.removeAttribute('data-bump');
  void dialog.offsetWidth;
  dialog.setAttribute('data-bump', '');
  setTimeout(() => dialog.removeAttribute('data-bump'), 400);
}

const sheetMode = (dialog) => !dialog.matches('.fd-command') && (dialog.matches('.fd-sheet[data-side="bottom"]') || isPhone());

/* ---------- Type-to-confirm ---------- */
function updateConfirm(dialog) {
  const input = dialog.querySelector('[data-fd-confirm-input]');
  const submit = dialog.querySelector('[data-fd-confirm-submit]');
  if (!input || !submit) return;
  const phrase = input.dataset.match ?? dialog.dataset.confirm ?? '';
  submit.disabled = !(phrase && input.value.trim() === phrase);
}

/* ==========================================================================
   Toast
   ========================================================================== */
const TONE_ICON = { neutral: 'info', success: 'circle-check', danger: 'circle-x', warning: 'triangle-alert', info: 'info', accent: 'sparkles' };
const TOAST_GAP = 8;
const TOAST_MAX = 5;
const TOAST_VISIBLE = 3;
const toasts = []; // newest first
let toaster = null;
let toasterShownAt = 0;
let toastSeq = 0;
let toastsExpanded = false;
let swipe = null;

function getToaster() {
  if (toaster) return toaster;
  toaster = doc.createElement('ol');
  toaster.className = 'fd-toaster';
  toaster.setAttribute('aria-live', 'polite');
  toaster.setAttribute('aria-relevant', 'additions text');
  toaster.setAttribute('aria-label', fdLabel(doc.documentElement, 'toast.region', 'Notifications'));
  modes.set(toaster, 'manual');
  if (HAS_POPOVER) toaster.setAttribute('popover', 'manual');
  toaster.dataset.state = 'closed';
  toaster.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') setExpanded(true); });
  toaster.addEventListener('pointerleave', () => { if (!toaster.contains(doc.activeElement) && !swipe) setExpanded(false); });
  toaster.addEventListener('focusin', () => setExpanded(true));
  toaster.addEventListener('focusout', (e) => { if (!toaster.contains(e.relatedTarget) && !toaster.matches(':hover')) setExpanded(false); });
  toaster.addEventListener('pointerdown', swipeStart);
  toaster.addEventListener('pointermove', swipeMove);
  toaster.addEventListener('pointerup', swipeEnd);
  toaster.addEventListener('pointercancel', swipeEnd);
  doc.body.append(toaster);
  return toaster;
}

/** Keep the stack above whatever opened last (dialogs make everything outside them inert). */
function remountToaster() {
  if (!toaster || !toasts.length) return;
  const host = modalStack.findLast((d) => d.open || d.hasAttribute('open')) || doc.body;
  const moved = toaster.parentElement !== host;
  if (moved) host.append(toaster);
  if (HAS_POPOVER && (moved || lastLayerAt > toasterShownAt || !toaster.matches(':popover-open'))) {
    try {
      if (toaster.matches(':popover-open')) toaster.hidePopover();
      toaster.showPopover();
      toasterShownAt = performance.now();
    } catch { /* not connected */ }
  }
  // A list that was hidden or inside a closed dialog measured 0; measure again now that it shows.
  const unmeasured = toasts.filter((t) => !t.height);
  if (unmeasured.length) { unmeasured.forEach(measureToast); layoutToasts(); }
  toaster.dataset.state = 'open';
}

function setExpanded(value) {
  toastsExpanded = value && toasts.length > 0;
  toaster?.toggleAttribute('data-expanded', toastsExpanded);
  layoutToasts();
  syncPause();
}

function syncPause() {
  const paused = toastsExpanded || doc.hidden || !!swipe;
  for (const t of toasts) {
    if (!t.anim) continue;
    if (paused && t.anim.playState === 'running') t.anim.pause();
    else if (!paused && t.anim.playState === 'paused') t.anim.play();
  }
}

const toastDuration = (opts) => opts.duration ?? (opts.tone === 'loading' ? Infinity : opts.tone === 'danger' ? 8000 : 5000);

function renderToast(t) {
  const { el, opts } = t;
  const tone = opts.tone || 'neutral';
  el.dataset.tone = tone;
  el.dataset.id = t.id;
  el.setAttribute('aria-atomic', 'true');
  const iconWrap = doc.createElement('span');
  iconWrap.className = 'fd-toast-icon';
  iconWrap.setAttribute('aria-hidden', 'true');
  if (tone !== 'loading') iconWrap.innerHTML = icon(opts.icon || TONE_ICON[tone] || TONE_ICON.neutral);
  const content = doc.createElement('div');
  content.className = 'fd-toast-content';
  const title = doc.createElement('p');
  title.className = 'fd-toast-title';
  title.textContent = opts.title ?? '';
  content.append(title);
  if (opts.description) {
    const desc = doc.createElement('p');
    desc.className = 'fd-toast-desc';
    desc.textContent = opts.description;
    content.append(desc);
  }
  const parts = [iconWrap, content];
  if (opts.action?.label) {
    const action = doc.createElement('button');
    action.type = 'button';
    action.className = 'fd-btn fd-toast-action';
    action.dataset.size = 'sm';
    action.textContent = opts.action.label;
    action.addEventListener('click', (event) => {
      const keep = opts.action.onClick?.(event, t.id);
      if (keep !== false) dismissToast(t.id);
    });
    parts.push(action);
  }
  if (opts.dismissible !== false) {
    const close = doc.createElement('button');
    close.type = 'button';
    close.className = 'fd-toast-close';
    close.setAttribute('aria-label', fdLabel(doc.documentElement, 'toast.dismiss', 'Dismiss notification'));
    close.innerHTML = icon('x');
    close.addEventListener('click', () => dismissToast(t.id));
    parts.push(close);
  }
  const progress = doc.createElement('span');
  progress.className = 'fd-toast-progress';
  progress.setAttribute('aria-hidden', 'true');
  parts.push(progress);
  el.replaceChildren(...parts);
  t.duration = toastDuration({ ...opts, tone });
}

function measureToast(t) {
  t.el.style.height = 'auto';
  t.height = t.el.offsetHeight;
  t.el.style.removeProperty('height');
}

function layoutToasts() {
  if (!toaster) return;
  let offset = 0;
  toasts.forEach((t, i) => {
    t.el.style.setProperty('--_o-i', String(i));
    t.el.style.setProperty('--_o-h', `${t.height}px`);
    t.el.style.setProperty('--_o-offset', `${offset}px`);
    t.el.toggleAttribute('data-front', i === 0);
    t.el.toggleAttribute('data-hidden', i >= TOAST_VISIBLE);
    t.el.inert = i >= TOAST_VISIBLE && !toastsExpanded;
    offset += t.height + TOAST_GAP;
  });
  toaster.style.setProperty('--_o-front-h', `${toasts[0]?.height || 0}px`);
  toaster.style.setProperty('--_o-total', `${Math.max(0, offset - TOAST_GAP)}px`);
}

function startTimer(t) {
  t.anim?.cancel();
  t.anim = null;
  clearTimeout(t.timer);
  const timed = Number.isFinite(t.duration) && t.duration > 0;
  t.el.toggleAttribute('data-timed', timed);
  if (!timed) return;
  const bar = t.el.querySelector('.fd-toast-progress');
  if (bar?.animate) {
    t.anim = bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: t.duration, easing: 'linear', fill: 'forwards' });
    t.anim.onfinish = () => dismissToast(t.id);
    syncPause();
  } else {
    t.timer = setTimeout(() => dismissToast(t.id), t.duration);
  }
}

export function toast(input = {}) {
  const opts = typeof input === 'string' ? { title: input } : { ...input };
  if (opts.id != null && toasts.some((t) => t.id === opts.id)) { updateToast(opts.id, opts); return opts.id; }
  const id = opts.id ?? `fd-toast-${(toastSeq += 1)}`;
  const el = doc.createElement('li');
  el.className = 'fd-toast';
  el.dataset.state = 'entering';
  const t = { id, el, opts, height: 0, anim: null, timer: 0 };
  renderToast(t);
  toasts.unshift(t);
  getToaster().append(el);
  remountToaster();
  measureToast(t);
  layoutToasts();
  el.getBoundingClientRect(); // commit the entering style, then rise into place
  el.dataset.state = 'open';
  startTimer(t);
  while (toasts.length > TOAST_MAX) dismissToast(toasts[toasts.length - 1].id);
  return id;
}

function updateToast(id, patch = {}) {
  const t = toasts.find((x) => x.id === id);
  if (!t) return toast({ ...patch, id });
  t.opts = { ...t.opts, ...patch };
  if (patch.tone && !('duration' in patch)) delete t.opts.duration;
  renderToast(t);
  measureToast(t);
  layoutToasts();
  startTimer(t);
  return id;
}

function dismissToast(id) {
  if (id == null) { [...toasts].forEach((t) => dismissToast(t.id)); return; }
  const index = toasts.findIndex((t) => t.id === id);
  if (index < 0) return;
  const [t] = toasts.splice(index, 1);
  t.anim?.cancel();
  clearTimeout(t.timer);
  const hadFocus = t.el.contains(doc.activeElement);
  t.el.dataset.state = 'closing';
  layoutToasts();
  if (hadFocus) focusEl(toasts[0]?.el.querySelector('button') || dialogOrigin.get(modalStack[modalStack.length - 1]) || doc.body);
  emit(t.el, 'fd:close', { value: id });
  t.opts.onDismiss?.(id);
  setTimeout(() => {
    t.el.remove();
    if (!toasts.length && toaster) {
      setExpanded(false);
      if (HAS_POPOVER) { try { toaster.hidePopover(); } catch { /* hidden */ } }
      toaster.dataset.state = 'closed';
    }
  }, reducedMotion() ? 0 : 300);
}

toast.dismiss = dismissToast;
toast.update = updateToast;
for (const tone of ['success', 'danger', 'warning', 'info']) toast[tone] = (title, opts = {}) => toast({ ...opts, title, tone });
toast.error = toast.danger;
toast.promise = (promise, messages = {}) => {
  const norm = (m, v) => { const r = typeof m === 'function' ? m(v) : m; return typeof r === 'string' ? { title: r } : { ...(r || {}) }; };
  const id = toast({ ...norm(messages.loading ?? 'Working…'), tone: 'loading' });
  Promise.resolve(typeof promise === 'function' ? promise() : promise).then(
    (value) => updateToast(id, { description: undefined, ...norm(messages.success ?? 'Done', value), tone: 'success' }),
    (error) => updateToast(id, { description: undefined, ...norm(messages.error ?? 'Something went wrong', error), tone: 'danger' }),
  );
  return id;
};

function swipeStart(event) {
  const el = event.target.closest('.fd-toast');
  if (!el || event.button !== 0 || event.target.closest('button, a, input')) return;
  swipe = { el, id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now(), dx: 0, active: false };
}
function swipeMove(event) {
  if (!swipe || event.pointerId !== swipe.id) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  if (!swipe.active) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { swipe = null; return; }
    if (Math.abs(dx) < 6) return;
    swipe.active = true;
    swipe.el.setPointerCapture?.(event.pointerId);
    swipe.el.setAttribute('data-swiping', '');
    syncPause();
  }
  swipe.dx = dx;
  swipe.el.style.setProperty('--_o-x', `${dx}px`);
  swipe.el.style.setProperty('--_o-fade', String(Math.max(0, 1 - Math.abs(dx) / swipe.el.offsetWidth)));
}
function swipeEnd(event) {
  if (!swipe || event.pointerId !== swipe.id) return;
  const { el, dx, t, active } = swipe;
  swipe = null;
  if (!active) { syncPause(); return; }
  el.removeAttribute('data-swiping');
  const velocity = Math.abs(dx) / Math.max(1, performance.now() - t);
  if (Math.abs(dx) > el.offsetWidth * 0.35 || velocity > 0.6) {
    el.setAttribute('data-swiped', '');
    el.style.setProperty('--_o-x', `${Math.sign(dx) * (el.offsetWidth + 48)}px`);
    dismissToast(el.dataset.id);
  } else {
    el.style.setProperty('--_o-x', '0px');
    el.style.removeProperty('--_o-fade');
  }
  if (!toaster?.matches(':hover')) setExpanded(false); else syncPause();
}

/* ==========================================================================
   Command palette
   ========================================================================== */
const commandData = new WeakMap();

const palettes = () => $$('dialog.fd-command').filter((d) => !isStatic(d));

function createPalette() {
  const d = doc.createElement('dialog');
  d.className = 'fd-command';
  d.id = 'fd-command';
  d.setAttribute('aria-label', 'Command palette');
  d.innerHTML = `<div class="fd-command-search">${icon('search')}<input class="fd-command-input" type="text" placeholder="Search or jump to…" aria-label="Search commands" autocomplete="off" spellcheck="false" autofocus><kbd class="fd-kbd">esc</kbd></div>
<div class="fd-command-list"></div>
<div class="fd-command-empty" hidden>${icon('search')}<p class="fd-command-empty-title">No results for “<span data-fd-command-query></span>”</p><p class="fd-command-empty-text">Try a page name, an endpoint or a run ID.</p></div>
<div class="fd-command-foot"><span><kbd class="fd-kbd">↑</kbd><kbd class="fd-kbd">↓</kbd> navigate</span><span><kbd class="fd-kbd">↵</kbd> select</span><span><kbd class="fd-kbd">esc</kbd> close</span></div>`;
  doc.body.append(d);
  setupCommand(d);
  return d;
}

function setupGroup(group) {
  group.setAttribute('role', 'group');
  const label = group.querySelector('.fd-command-group-label');
  if (label) group.setAttribute('aria-labelledby', ensureId(label, 'fd-command-group'));
}

function setupCommandItem(item) {
  item.setAttribute('role', 'option');
  ensureId(item, 'fd-command-item');
  item.setAttribute('aria-selected', 'false');
  item.tabIndex = -1;
  const label = item.querySelector('.fd-command-item-label');
  if (label && !item.dataset.label) item.dataset.label = label.textContent.trim();
  if (!item.dataset.order) item.dataset.order = String([...item.parentElement.children].indexOf(item));
}

function setupCommand(palette) {
  if (!once(palette, 'fd-command')) return;
  const input = palette.querySelector('.fd-command-input');
  const list = palette.querySelector('.fd-command-list');
  if (list) {
    ensureId(list, 'fd-command-list');
    list.setAttribute('role', 'listbox');
    if (!list.hasAttribute('aria-label')) list.setAttribute('aria-label', 'Results');
  }
  if (input) {
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-autocomplete', 'list');
    if (list) input.setAttribute('aria-controls', list.id);
    if (!input.hasAttribute('autocomplete')) input.setAttribute('autocomplete', 'off');
    if (!input.hasAttribute('autofocus') && !isStatic(palette)) input.setAttribute('autofocus', '');
  }
  for (const group of $$('.fd-command-group', palette)) setupGroup(group);
  for (const item of $$('.fd-command-item', palette)) setupCommandItem(item);
}

function fuzzy(query, text) {
  const q = query.toLowerCase();
  const s = text.toLowerCase();
  const at = s.indexOf(q);
  if (at > -1) {
    const boundary = at === 0 || /[\s/_\-.·]/.test(s[at - 1]);
    return { score: 200 - at + (boundary ? 60 : 0) + q.length * 4, hits: Array.from({ length: q.length }, (_, i) => at + i) };
  }
  const hits = [];
  let from = 0;
  let prev = -2;
  let score = 0;
  for (const ch of q) {
    if (ch === ' ') continue;
    const i = s.indexOf(ch, from);
    if (i < 0) return null;
    score += i === prev + 1 ? 6 : i === 0 || /[\s/_\-.·]/.test(s[i - 1]) ? 4 : 1;
    hits.push(i);
    prev = i;
    from = i + 1;
  }
  return { score: score - (hits[0] || 0) * 0.5, hits };
}

function paintLabel(item, hits) {
  const label = item.querySelector('.fd-command-item-label');
  const text = item.dataset.label;
  if (!label || text == null) return;
  if (!hits.length) { label.textContent = text; return; }
  const set = new Set(hits);
  const nodes = [];
  let run = '';
  let marked = false;
  const flush = () => {
    if (!run) return;
    if (marked) { const m = doc.createElement('mark'); m.textContent = run; nodes.push(m); } else nodes.push(doc.createTextNode(run));
    run = '';
  };
  [...text].forEach((ch, i) => {
    const hit = set.has(i);
    if (hit !== marked) { flush(); marked = hit; }
    run += ch;
  });
  flush();
  label.replaceChildren(...nodes);
}

const commandItems = (palette) => $$('.fd-command-item', palette).filter((i) => !i.hidden && !i.closest('[hidden]'));

function filterCommand(palette, query) {
  const q = query.trim();
  let any = false;
  const groups = $$('.fd-command-group', palette);
  const containers = groups.length ? groups : [palette.querySelector('.fd-command-list')].filter(Boolean);
  for (const group of containers) {
    const scored = [];
    for (const item of $$('.fd-command-item', group)) {
      let match = q ? fuzzy(q, item.dataset.label || textOf(item)) : { score: 0, hits: [] };
      if (!match && q) {
        const hay = `${item.dataset.keywords || ''} ${item.dataset.value || ''} ${item.querySelector('.fd-command-item-hint')?.textContent || ''}`.toLowerCase();
        if (hay.includes(q.toLowerCase())) match = { score: 0.5, hits: [] };
      }
      item.hidden = !match;
      paintLabel(item, match?.hits || []);
      if (match) scored.push([match.score, Number(item.dataset.order || 0), item]);
    }
    scored.sort((a, b) => (q ? b[0] - a[0] : 0) || a[1] - b[1]);
    for (const [, , item] of scored) group.append(item);
    if (group.matches('.fd-command-group')) group.hidden = scored.length === 0;
    any = any || scored.length > 0;
  }
  for (const empty of $$('.fd-command-empty', palette)) {
    empty.hidden = any;
    for (const slot of $$('[data-fd-command-query]', empty)) slot.textContent = q;
  }
  const list = palette.querySelector('.fd-command-list');
  if (list) list.scrollTop = 0;
  setActive(palette, commandItems(palette)[0] || null, false);
}

function setActive(palette, item, scroll = true) {
  for (const prev of $$('.fd-command-item[data-active]', palette)) { prev.removeAttribute('data-active'); prev.setAttribute('aria-selected', 'false'); }
  const input = palette.querySelector('.fd-command-input');
  if (!item) { input?.removeAttribute('aria-activedescendant'); return; }
  item.setAttribute('data-active', '');
  item.setAttribute('aria-selected', 'true');
  input?.setAttribute('aria-activedescendant', item.id);
  const list = item.closest('.fd-command-list');
  if (scroll && list) {
    // Scroll the list only (never the page); keep a group's label in view with its first item.
    const label = item.previousElementSibling?.matches('.fd-command-group-label') ? item.previousElementSibling : item;
    const box = list.getBoundingClientRect();
    const top = label.getBoundingClientRect().top;
    const bottom = item.getBoundingClientRect().bottom;
    if (top < box.top + 6) list.scrollTop -= box.top + 6 - top;
    else if (bottom > box.bottom - 6) list.scrollTop += bottom - (box.bottom - 6);
  }
}

function resetCommand(palette) {
  const input = palette.querySelector('.fd-command-input');
  if (input) input.value = '';
  filterCommand(palette, '');
  const list = palette.querySelector('.fd-command-list');
  if (list) list.scrollTop = 0;
}

function selectCommand(palette, item) {
  const data = commandData.get(item) || null;
  const value = item.dataset.value || item.dataset.label || textOf(item);
  if (!emit(item, 'fd:select', { value, item, data })) return false;
  if (!item.hasAttribute('data-keep-open') && !isStatic(palette)) closeDialog(palette, value);
  (data?.perform || data?.onSelect)?.(data, item);
  return true;
}

function onCommandKey(event, palette) {
  const items = commandItems(palette);
  const active = palette.querySelector('.fd-command-item[data-active]');
  const index = items.indexOf(active);
  const down = event.key === 'ArrowDown' || (event.ctrlKey && event.key === 'n');
  const up = event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'p');
  if (down || up) {
    event.preventDefault();
    if (!items.length) return;
    const next = down ? items[(index + 1) % items.length] : items[index <= 0 ? items.length - 1 : index - 1];
    setActive(palette, next);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (active && !event.isComposing) active.click();
  } else if (event.key === 'Escape' && event.target.value) {
    event.preventDefault();
    event.stopPropagation();
    event.target.value = '';
    filterCommand(palette, '');
  }
}

export const command = {
  open(ref) { const p = byId(ref) || palettes()[0]; return p ? openDialog(p, { trigger: doc.activeElement }) : null; },
  close(ref) { const p = byId(ref) || palettes().find((d) => d.open); if (p) closeDialog(p); },
  toggle(ref) { const p = byId(ref) || palettes()[0]; if (!p) return; if (p.open) closeDialog(p); else openDialog(p, { trigger: doc.activeElement }); },
  register(defs, { palette } = {}) {
    const p = byId(palette) || palettes()[0] || createPalette();
    setupCommand(p);
    const list = p.querySelector('.fd-command-list');
    const created = [];
    for (const def of [].concat(defs)) {
      const groupName = def.group || 'Actions';
      let group = $$('.fd-command-group', list).find((g) => g.querySelector('.fd-command-group-label')?.textContent.trim() === groupName);
      if (!group) {
        group = doc.createElement('div');
        group.className = 'fd-command-group';
        const label = doc.createElement('p');
        label.className = 'fd-command-group-label';
        label.textContent = groupName;
        group.append(label);
        list.append(group);
        setupGroup(group);
      }
      const item = doc.createElement(def.href ? 'a' : 'div');
      item.className = 'fd-command-item';
      if (def.href) item.href = def.href;
      if (def.id != null) item.dataset.value = String(def.id);
      if (def.keywords) item.dataset.keywords = [].concat(def.keywords).join(' ');
      if (def.icon) item.insertAdjacentHTML('beforeend', icon(def.icon));
      const label = doc.createElement('span');
      label.className = 'fd-command-item-label';
      label.textContent = def.label;
      item.append(label);
      if (def.hint) {
        const hint = doc.createElement('span');
        hint.className = 'fd-command-item-hint';
        hint.textContent = def.hint;
        item.append(hint);
      }
      for (const key of String(def.shortcut || '').split(/\s+/).filter(Boolean)) {
        const kbd = doc.createElement('kbd');
        kbd.className = 'fd-kbd';
        kbd.textContent = key;
        item.append(kbd);
      }
      group.append(item);
      setupCommandItem(item);
      commandData.set(item, def);
      created.push(item);
    }
    if (p.open) filterCommand(p, p.querySelector('.fd-command-input')?.value || '');
    return () => {
      for (const item of created) {
        const group = item.parentElement;
        item.remove();
        if (group && !group.querySelector('.fd-command-item')) group.remove();
      }
    };
  },
};

/* ==========================================================================
   Global listeners (bound once)
   ========================================================================== */
let downOpen = null;      // the layer that was open when its own trigger was pressed
let pressTarget = null;   // where the last press started (backdrop clicks must start on it)
let drag = null;

function toggleFromTrigger(event, trigger, kind) {
  const id = kind === 'menu' ? trigger.dataset.fdMenu : trigger.dataset.fdPopover;
  const layer = byId(id);
  if (!layer) return;
  event.preventDefault();
  const wasOpen = downOpen === layer || (isOpen(layer) && layers.get(layer)?.trigger === trigger);
  downOpen = null;
  if (wasOpen) {
    if (isOpen(layer)) { if (kind === 'menu') closeMenuTree(layer, false); else closePopover(layer, false); }
    return;
  }
  hideTip();
  if (kind === 'menu') openMenu(layer, { trigger, focus: event.detail === 0 ? 'first' : 'menu' });
  else openPopover(layer, { trigger });
}

function bindGlobal() {
  /* State sync for native light dismiss, Escape and invokers. */
  doc.addEventListener('beforetoggle', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement) || !el.matches(`${FLOATING}, .fd-toaster`)) return;
    if (event.newState === 'open') { if (!el.dataset.measuring && !el.matches('.fd-toaster')) el.dataset.state = 'open'; }
    else if (!el.matches('.fd-toaster')) settle(el);
  }, true);

  doc.addEventListener('pointerdown', (event) => {
    const target = event.target;
    pressTarget = target;
    const trigger = target.closest?.('[data-fd-menu], [data-fd-popover]');
    downOpen = null;
    if (trigger) {
      const layer = byId(trigger.dataset.fdMenu || trigger.dataset.fdPopover);
      if (layer && isOpen(layer) && layers.get(layer)?.trigger === trigger) downOpen = layer;
    }
    // Light dismiss where the Popover API is missing.
    while (fallbackStack.length) {
      const top = fallbackStack[fallbackStack.length - 1];
      if (top.contains(target) || layers.get(top)?.trigger?.contains?.(target)) break;
      conceal(top);
    }
    const tipTrigger = tipTarget(target);
    if (tipFor || tipTimer) hideTip();
    tipSuppressed = tipTrigger || null;
    if (card && !card.contains(target)) hideCard();
    // Drag a bottom sheet down by its head.
    const dialog = target.closest?.(MODAL);
    if (dialog?.open && !isStatic(dialog) && event.button === 0 && sheetMode(dialog)) {
      const zone = target.closest('.fd-dialog-head, .fd-sheet-head, [data-fd-drag-handle]') || (target === dialog && event.clientY - dialog.getBoundingClientRect().top < 32);
      if (zone && !target.closest('button, a, input, select, textarea, label, [role="tab"]')) {
        drag = { dialog, id: event.pointerId, y: event.clientY, t: performance.now(), dy: 0 };
      }
    }
  }, true);

  doc.addEventListener('pointermove', (event) => {
    if (drag && event.pointerId === drag.id) {
      const dy = event.clientY - drag.y;
      if (!drag.dialog.hasAttribute('data-dragging')) {
        if (Math.abs(dy) < 4) return;
        drag.dialog.setAttribute('data-dragging', '');
        drag.dialog.setPointerCapture?.(event.pointerId);
      }
      drag.dy = dy > 0 ? dy : dy / 6;
      drag.dialog.style.setProperty('--_o-drag', `${Math.round(drag.dy)}px`);
      return;
    }
    if (event.pointerType === 'touch') return;
    const item = event.target.closest?.(MENU_ITEM);
    const menu = item?.closest('.fd-menu');
    if (item && menu && isOpen(menu)) {
      if (enabled(item)) { if (doc.activeElement !== item) focusEl(item); } else if (doc.activeElement !== menu) focusEl(menu);
      hoverItem(menu, item);
    }
    const cmd = event.target.closest?.('.fd-command-item');
    if (cmd && !cmd.hasAttribute('data-active')) { const palette = cmd.closest('.fd-command'); if (palette) setActive(palette, cmd, false); }
  }, { passive: true });

  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { dialog, dy, t } = drag;
    drag = null;
    if (!dialog.hasAttribute('data-dragging')) return;
    dialog.removeAttribute('data-dragging');
    const velocity = dy / Math.max(1, performance.now() - t);
    if (dy > dialog.offsetHeight * 0.3 || (velocity > 0.5 && dy > 24)) closeDialog(dialog, 'dismiss');
    else dialog.style.setProperty('--_o-drag', '0px');
  };
  doc.addEventListener('pointerup', endDrag, true);
  doc.addEventListener('pointercancel', endDrag, true);

  doc.addEventListener('pointerout', (event) => {
    const menu = event.target.closest?.('.fd-menu');
    if (menu && isOpen(menu) && !(event.relatedTarget && menu.contains(event.relatedTarget))) {
      const active = doc.activeElement;
      if (active?.closest?.('.fd-menu') === menu && active.matches(MENU_ITEM) && active.getAttribute('aria-expanded') !== 'true') focusEl(menu);
      if (!openChild(menu)) clearTimeout(subTimer);
    }
    // Tooltips
    const tipTrigger = tipTarget(event.target);
    if (tipTrigger && !tipTrigger.contains(event.relatedTarget)) {
      if (tipSuppressed === tipTrigger) tipSuppressed = null;
      if (tipTarget(event.relatedTarget)) clearTimeout(tipTimer);
      else hideTip();
    }
    // Hovercards
    const cardTrigger = event.target.closest?.('[data-fd-hovercard]');
    const inCard = event.target.closest?.('.fd-hovercard');
    if ((cardTrigger && !cardTrigger.contains(event.relatedTarget)) || (inCard && !inCard.contains(event.relatedTarget))) {
      const to = event.relatedTarget;
      if (!(to && (card?.contains(to) || cardFor?.contains(to)))) scheduleCard(null, false);
    }
    // Calendar preview leaves with the pointer
    const grid = event.target.closest?.('.fd-calendar-grid');
    if (grid && !grid.contains(event.relatedTarget)) {
      const root = grid.closest('[data-fd-daterange]');
      const state = root && ranges.get(root);
      if (state?.pending && state.hover) { state.hover = null; paintRange(root); }
    }
  });

  doc.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    const tipTrigger = tipTarget(event.target);
    if (tipTrigger && tipTrigger !== tipSuppressed && !(tipFor === tipTrigger && isOpen(tip))) scheduleTip(tipTrigger);
    const cardTrigger = event.target.closest?.('[data-fd-hovercard]');
    if (cardTrigger) {
      if (cardFor === cardTrigger && isOpen(card)) clearTimeout(cardTimer);
      else scheduleCard(cardTrigger, true);
    }
    if (event.target.closest?.('.fd-hovercard') === card && card) clearTimeout(cardTimer);
    const day = event.target.closest?.('.fd-calendar-day');
    if (day && !day.disabled) {
      const root = day.closest('[data-fd-daterange]');
      const state = root && ranges.get(root);
      const date = parseDate(day.dataset.date);
      if (state?.pending && !sameDay(state.hover, date)) { state.hover = date; paintRange(root); }
    }
  });

  doc.addEventListener('focusin', (event) => {
    const target = event.target;
    const tipTrigger = tipTarget(target);
    if (tipTrigger && tipTrigger.matches(':focus-visible') && performance.now() > tipQuietUntil) showTip(tipTrigger);
    const cardTrigger = target.closest?.('[data-fd-hovercard]');
    if (cardTrigger && cardTrigger.matches(':focus-visible')) scheduleCard(cardTrigger, true);
  });

  doc.addEventListener('focusout', (event) => {
    const target = event.target;
    const to = event.relatedTarget;
    if (tipFor && tipFor.contains(target) && !tipFor.contains(to)) hideTip();
    if (cardFor && cardFor.contains(target) && !(to && (card?.contains(to) || cardFor.contains(to)))) scheduleCard(null, false);
    const pop = target.closest?.('.fd-popover');
    if (pop && isOpen(pop) && to && !pop.contains(to)) {
      const trigger = layers.get(pop)?.trigger;
      if (!trigger?.contains(to) && !to.closest(`${FLOATING}, ${MODAL}`)) closePopover(pop, false);
    }
  });

  doc.addEventListener('scroll', (event) => {
    const target = event.target;
    if (tipFor && (target === doc || target.contains?.(tipFor))) hideTip();
    if (cardFor && (target === doc || target.contains?.(cardFor))) hideCard();
    if (target instanceof Element && target.matches(SCROLLERS)) {
      const host = target.closest('.fd-dialog, .fd-sheet');
      if (host) updateEdges(host);
    }
  }, { capture: true, passive: true });

  doc.addEventListener('visibilitychange', syncPause);

  /* ---------- Keyboard ---------- */
  doc.addEventListener('keydown', (event) => {
    // Escape dismisses a visible tooltip first, and only that.
    if (event.key === 'Escape' && tip && isOpen(tip)) {
      hideTip();
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (event.key === 'Escape' && card && isOpen(card)) hideCard();
    // ⌘K / Ctrl+K
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
      const palette = palettes()[0];
      if (palette) {
        event.preventDefault();
        if (palette.open) closeDialog(palette); else openDialog(palette, { trigger: doc.activeElement });
        return;
      }
    }
    const target = event.target;
    if (!(target instanceof Element)) return;

    // Menus
    const menu = target.closest('.fd-menu');
    if (menu && isOpen(menu)) { onMenuKey(event, menu); return; }
    const menuTrigger = target.closest('[data-fd-menu]');
    if (menuTrigger) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openMenu(menuTrigger.dataset.fdMenu, { trigger: menuTrigger, focus: event.key === 'ArrowDown' ? 'first' : 'last' });
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && !menuTrigger.matches('button, a[href], input, summary')) { event.preventDefault(); menuTrigger.click(); return; }
    }

    // Command palette input
    const palette = target.closest('.fd-command');
    if (palette && target.matches('.fd-command-input')) { onCommandKey(event, palette); return; }

    // Filter list
    const filterRoot = target.closest('[data-fd-filter-list]');
    if (filterRoot) {
      const options = $$('.fd-checklist-item', filterRoot).filter((o) => !o.hidden);
      const search = filterRoot.querySelector('[data-fd-filter-search]');
      const option = target.closest('.fd-checklist-item');
      const move = (o) => { if (!o) return; for (const x of $$('.fd-checklist-item', filterRoot)) x.tabIndex = x === o ? 0 : -1; focusEl(o, true); };
      if (target === search && event.key === 'ArrowDown') { event.preventDefault(); move(options[0]); return; }
      if (option) {
        const i = options.indexOf(option);
        if (event.key === 'ArrowDown') { event.preventDefault(); move(options[Math.min(i + 1, options.length - 1)]); return; }
        if (event.key === 'ArrowUp') { event.preventDefault(); if (i <= 0 && search) focusEl(search); else move(options[i - 1]); return; }
        if (event.key === 'Home') { event.preventDefault(); move(options[0]); return; }
        if (event.key === 'End') { event.preventDefault(); move(options[options.length - 1]); return; }
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); option.click(); return; }
        if (search && event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) focusEl(search);
      }
    }

    // Calendar
    const day = target.closest('.fd-calendar-day');
    if (day) {
      const root = day.closest('[data-fd-daterange]');
      const d = parseDate(day.dataset.date);
      const monday = (d.getDay() + 6) % 7;
      const moves = {
        ArrowLeft: () => addDays(d, -1), ArrowRight: () => addDays(d, 1), ArrowUp: () => addDays(d, -7), ArrowDown: () => addDays(d, 7),
        Home: () => addDays(d, -monday), End: () => addDays(d, 6 - monday),
        PageUp: () => new Date(d.getFullYear() - (event.shiftKey ? 1 : 0), d.getMonth() - (event.shiftKey ? 0 : 1), Math.min(d.getDate(), 28)),
        PageDown: () => new Date(d.getFullYear() + (event.shiftKey ? 1 : 0), d.getMonth() + (event.shiftKey ? 0 : 1), Math.min(d.getDate(), 28)),
      };
      if (root && moves[event.key]) { event.preventDefault(); moveDay(root, moves[event.key]()); return; }
    }

    // Popovers: Escape closes and returns focus
    if (event.key === 'Escape') {
      const pop = target.closest('.fd-popover');
      if (pop && isOpen(pop)) { event.preventDefault(); event.stopPropagation(); closePopover(pop, true); }
    }
  });

  /* ---------- Clicks ---------- */
  on(doc, 'click', '[data-fd-menu]', (event, trigger) => toggleFromTrigger(event, trigger, 'menu'));
  on(doc, 'click', '[data-fd-popover]', (event, trigger) => toggleFromTrigger(event, trigger, 'popover'));
  on(doc, 'click', MENU_ITEM, (event, item) => { if (item.closest('.fd-menu')) activateItem(event, item); });
  on(doc, 'click', '.fd-menu-close, [data-fd-menu-close]', (event, btn) => {
    const menu = btn.closest('.fd-menu');
    if (menu && isOpen(menu)) { event.preventDefault(); closeMenuTree(menu, true); }
  });
  on(doc, 'click', '[data-fd-popover-close]', (event, btn) => {
    const pop = btn.closest('.fd-popover, .fd-hovercard');
    if (pop) { event.preventDefault(); if (pop.matches('.fd-popover')) closePopover(pop, true); else hideCard(); }
  });
  on(doc, 'click', '[data-fd-dialog-open], [data-fd-sheet-open]', (event, trigger) => {
    event.preventDefault();
    openDialog(trigger.dataset.fdDialogOpen || trigger.dataset.fdSheetOpen, { trigger });
  });
  on(doc, 'click', '[data-fd-command-open]', (event, trigger) => {
    event.preventDefault();
    const p = byId(trigger.dataset.fdCommandOpen) || palettes()[0];
    if (p) openDialog(p, { trigger });
  });
  on(doc, 'click', '[data-fd-dialog-close]', (event, btn) => {
    const dialog = btn.closest(MODAL);
    if (!dialog || isStatic(dialog)) return;
    event.preventDefault();
    closeDialog(dialog, btn.value || btn.dataset.fdDialogClose || undefined);
  });
  on(doc, 'click', '[data-fd-dialog-step]', (event, btn) => {
    const form = btn.form;
    if (form && btn.type === 'submit') { event.preventDefault(); if (!form.reportValidity()) return; }
    else event.preventDefault();
    if (btn.getAttribute('aria-busy') === 'true') return;
    goStep(btn);
  });
  on(doc, 'click', '[data-fd-toast]', (_event, btn) => {
    let opts;
    try { opts = JSON.parse(btn.dataset.fdToast); } catch { opts = { title: btn.dataset.fdToast }; }
    toast(opts);
  });
  // Backdrop clicks: the press and the click both land on the <dialog> outside its box.
  doc.addEventListener('click', (event) => {
    const dialog = event.target;
    if (!(dialog instanceof HTMLElement) || !dialog.matches(MODAL) || !dialog.open || isStatic(dialog) || pressTarget !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom) return;
    if (dialog.hasAttribute('data-static')) bump(dialog); else closeDialog(dialog, 'dismiss');
  });
  // Native close (Escape, form[method=dialog], close()) → bookkeeping.
  // One native `close` event per close, whoever caused it, so fd:close follows it exactly once. A dialog that script
  // opened with showModal() itself (never through openDialog) still announces its close.
  doc.addEventListener('close', (event) => {
    const dialog = event.target;
    if (!(dialog instanceof HTMLElement) || !dialog.matches(MODAL)) return;
    if (dialog.dataset.state === 'open') afterClose(dialog);
    else emit(dialog, 'fd:close', { value: dialog.returnValue });
  }, true);

  // Notifications
  on(doc, 'click', '[data-fd-notifications] [data-fd-show]', (event, btn) => {
    const root = btn.closest('[data-fd-notifications]');
    const group = btn.parentElement;
    for (const b of $$('[data-fd-show]', group)) {
      const attr = ['aria-checked', 'aria-selected'].find((a) => b.hasAttribute(a)) || 'aria-pressed';
      b.setAttribute(attr, String(b === btn));
    }
    emit(root, 'fd:change', { value: { filter: btn.dataset.fdShow }, unread: applyNotifications(root) });
  });
  on(doc, 'change', '[data-fd-notifications] [data-fd-category]', (_event, select) => {
    const root = select.closest('[data-fd-notifications]');
    emit(root, 'fd:change', { value: { category: select.value }, unread: applyNotifications(root) });
  });
  on(doc, 'click', '[data-fd-notifications] [data-fd-mark-read]', (event, btn) => {
    event.preventDefault();
    const root = btn.closest('[data-fd-notifications]');
    for (const row of $$('.fd-notification[data-unread]', root)) row.removeAttribute('data-unread');
    emit(root, 'fd:change', { value: { read: 'all' }, unread: applyNotifications(root) });
  });
  on(doc, 'click', '[data-fd-notifications] .fd-notification[data-unread]', (_event, row) => {
    row.removeAttribute('data-unread');
    applyNotifications(row.closest('[data-fd-notifications]'));
  });

  // Date range
  on(doc, 'click', '[data-fd-daterange] .fd-daterange-preset', (event, btn) => {
    event.preventDefault();
    const root = btn.closest('[data-fd-daterange]');
    const state = rangeState(root);
    const preset = btn.dataset.preset;
    if (PRESETS[preset]) {
      const [start, end] = PRESETS[preset](today());
      Object.assign(state, { start, end, preset, pending: null, hover: null, focus: end, view: new Date(end.getFullYear(), end.getMonth(), 1) });
      buildCalendar(root);
      paintRange(root);
    } else {
      Object.assign(state, { preset: 'custom', pending: null, hover: null });
      paintRange(root);
      focusEl(rovingDay(root));
    }
  });
  on(doc, 'click', '[data-fd-daterange] [data-cal-nav]', (event, btn) => {
    event.preventDefault();
    const root = btn.closest('[data-fd-daterange]');
    const state = rangeState(root);
    state.view = new Date(state.view.getFullYear(), state.view.getMonth() + Number(btn.dataset.calNav), 1);
    buildCalendar(root);
    paintRange(root);
    const same = root.querySelector(`[data-cal-nav="${btn.dataset.calNav}"]`);
    focusEl(same && !same.disabled ? same : rovingDay(root));
  });
  on(doc, 'click', '[data-fd-daterange] .fd-calendar-day', (event, btn) => {
    event.preventDefault();
    if (!btn.disabled) pickDay(btn.closest('[data-fd-daterange]'), parseDate(btn.dataset.date));
  });
  on(doc, 'click', '[data-fd-daterange-apply]', (event, btn) => { event.preventDefault(); const root = btn.closest('[data-fd-daterange]'); if (root) applyRange(root); });
  on(doc, 'click', '[data-fd-daterange-cancel]', (event, btn) => {
    event.preventDefault();
    const root = btn.closest('[data-fd-daterange]');
    if (!root) return;
    resetRange(root);
    const pop = root.closest('.fd-popover');
    if (pop && isOpen(pop)) closePopover(pop, true);
  });

  // Filter list
  on(doc, 'click', '[data-fd-filter-list] .fd-checklist-item', (event, option) => {
    event.preventDefault();
    if (!enabled(option)) return;
    option.setAttribute('aria-selected', String(option.getAttribute('aria-selected') !== 'true'));
    changeFilter(option.closest('[data-fd-filter-list]'));
  });
  on(doc, 'click', '[data-fd-filter-list] [data-fd-filter-clear]', (event, btn) => {
    event.preventDefault();
    const root = btn.closest('[data-fd-filter-list]');
    for (const o of $$('.fd-checklist-item[aria-selected="true"]', root)) o.setAttribute('aria-selected', 'false');
    const search = root.querySelector('[data-fd-filter-search]');
    if (search) { search.value = ''; searchFilter(root, ''); focusEl(search); }
    changeFilter(root);
  });
  on(doc, 'input', '[data-fd-filter-list] [data-fd-filter-search]', (_event, input) => searchFilter(input.closest('[data-fd-filter-list]'), input.value));

  // Confirm
  on(doc, 'input', '[data-fd-confirm-input]', (_event, input) => { const dialog = input.closest(MODAL); if (dialog) updateConfirm(dialog); });
  doc.addEventListener('submit', (event) => {
    if (event.target.closest?.('[data-static-demo]')) { event.preventDefault(); return; } // inline demos never close
    const dialog = event.target.closest?.('.fd-confirm');
    if (!dialog) return;
    const submitter = event.submitter;
    if (submitter?.matches('[data-fd-confirm-submit]')) {
      if (submitter.disabled) { event.preventDefault(); return; }
      const input = dialog.querySelector('[data-fd-confirm-input]');
      if (!emit(dialog, 'fd:confirm', { value: input?.value.trim() ?? '', submitter })) event.preventDefault();
    } else if (!submitter) {
      // Implicit submission (Enter in the input) only counts when the phrase matches.
      const submit = dialog.querySelector('[data-fd-confirm-submit]');
      event.preventDefault();
      if (submit && !submit.disabled) submit.click();
    }
  }, true);

  // Command palette
  on(doc, 'input', '.fd-command-input', (_event, input) => { const palette = input.closest('.fd-command'); if (palette) filterCommand(palette, input.value); });
  on(doc, 'click', '.fd-command-item', (event, item) => {
    const palette = item.closest('.fd-command');
    if (!palette) return;
    const href = item.getAttribute('href');
    if (!href || href === '#') event.preventDefault();
    if (!selectCommand(palette, item)) event.preventDefault();
  });
}

/* ==========================================================================
   init
   ========================================================================== */
export function init(root = document) {
  if (once(doc, 'fd-overlays')) bindGlobal();
  const scope = (sel) => {
    const list = $$(sel, root);
    if (root instanceof Element && root.matches(sel)) list.unshift(root);
    return list;
  };
  for (const t of scope('[data-fd-menu]')) setupTrigger(t, 'menu');
  for (const t of scope('[data-fd-popover]')) setupTrigger(t, 'popover');
  for (const t of scope('[data-fd-dialog-open], [data-fd-sheet-open], [data-fd-command-open]')) if (!t.hasAttribute('aria-haspopup')) t.setAttribute('aria-haspopup', 'dialog');
  for (const menu of scope('.fd-menu')) setupMenu(menu);
  for (const pop of scope('.fd-popover')) setupPopover(pop);
  for (const hc of scope('.fd-hovercard')) prepare(hc, 'manual');
  for (const t of scope('[data-fd-tooltip]')) {
    const named = t.hasAttribute('aria-label') || t.hasAttribute('aria-labelledby') || t.textContent.trim();
    if (!named) t.setAttribute('aria-label', t.dataset.fdTooltip);
  }
  for (const dialog of scope(MODAL)) {
    setupDialog(dialog);
    if (isStatic(dialog)) updateEdges(dialog);
    else if (!dialog.dataset.state) dialog.dataset.state = dialog.open ? 'open' : 'closed';
  }
  for (const range of scope('[data-fd-daterange]')) { rangeState(range); buildCalendar(range); paintRange(range); }
  for (const list of scope('[data-fd-filter-list]')) syncFilter(list);
  for (const n of scope('[data-fd-notifications]')) applyNotifications(n);
  for (const p of scope('.fd-command[data-static-demo]')) {
    const input = p.querySelector('.fd-command-input');
    filterCommand(p, input?.value || '');
  }
}
