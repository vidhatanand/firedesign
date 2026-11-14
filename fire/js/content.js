/* Fire content — behaviour for cards and feedback.
 *
 * Markup contracts (CSS in components/content.css):
 *
 * Accordion / disclosure (native <details>, height animated here)
 *   <div class="fd-accordion" data-single>            data-single: opening one closes its siblings
 *     <details class="fd-accordion-item" [open]>
 *       <summary class="fd-accordion-trigger">…<i data-icon="chevron-down"></i></summary>
 *       <div class="fd-accordion-panel"><div class="fd-accordion-inner">…</div></div>
 *     </details>
 *   </div>
 *   <details class="fd-disclosure"><summary class="fd-disclosure-trigger">…</summary><div class="fd-disclosure-panel">…</div></details>
 *   State: data-state="open|closing|closed" on the <details>. Event: fd:change on the <details>, detail { open, value }.
 *
 * Dismissible callout / banner
 *   <div class="fd-callout|fd-banner" data-fd-dismiss-key="ember:trial-banner">
 *     <button data-fd-dismiss aria-label="Dismiss">…</button></div>
 *   Fires a cancelable fd:close on the element, collapses it, sets [hidden]. With data-fd-dismiss-key the dismissal
 *   is remembered in localStorage ("fd:dismissed:<key>") and the element starts hidden next time.
 *
 * Card scroller
 *   <div class="fd-scroller" data-fd-scroller>
 *     <button data-fd-scroll="prev"> … <button data-fd-scroll="next">
 *     <div class="fd-scroller-track">…</div></div>
 *   Buttons disable at the ends; the .fd-scroller-nav is hidden when nothing overflows.
 *   Event: fd:change on the root, detail { value: "start" | "middle" | "end" }.
 *
 * Removable badge / tag
 *   <span class="fd-badge">label <button class="fd-badge-remove" aria-label="Remove label">…</button></span>
 *   Fires a cancelable fd:close on the badge (detail { value: data-value or its text }); if not prevented it is removed.
 *
 * Exports: init(root), dismiss(el), toggle(details, open?)
 */
import { $, $$, on, once, emit, reducedMotion } from './core.js';

const KEY = 'fd:dismissed:';
const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

const token = (el, name, fallback) => getComputedStyle(el).getPropertyValue(name).trim() || fallback;
const ms = (value, fallback) => { const n = parseFloat(value); return Number.isFinite(n) ? (value.endsWith('ms') ? n : n * 1000) : fallback; };

/* ---------- Accordion / disclosure ---------- */
const DETAILS = '.fd-accordion-item, .fd-disclosure';
const panelOf = (d) => d.querySelector(':scope > summary')?.nextElementSibling ?? null;
const isOpen = (d) => d.open && d.dataset.state !== 'closing';

/** Open or close a <details> accordion item / disclosure with an animated height. */
export function toggle(details, open = !isOpen(details)) {
  if (open === isOpen(details)) return;
  const panel = panelOf(details);
  details._fdAnim?.cancel();

  if (open) {
    const group = details.closest('.fd-accordion[data-single]');
    if (group) $$(':scope > .fd-accordion-item', group).forEach((d) => { if (d !== details && isOpen(d)) toggle(d, false); });
  }
  const done = () => {
    details._fdAnim = null;
    if (!open) details.open = false;
    details.dataset.state = open ? 'open' : 'closed';
    emit(details, 'fd:change', { open, value: open });
  };
  if (!panel) { details.open = open; done(); return; }

  const duration = reducedMotion() ? 0 : ms(token(details, '--fd-dur-4', '320ms'), 320);
  const easing = token(details, '--fd-ease-out', 'ease-out');
  if (open) { details.open = true; details.dataset.state = 'open'; } else details.dataset.state = 'closing';
  const from = open ? 0 : panel.getBoundingClientRect().height;
  const to = open ? panel.scrollHeight : 0;
  if (!duration) { done(); return; }
  const anim = panel.animate(
    [{ height: `${from}px`, overflow: 'hidden' }, { height: `${to}px`, overflow: 'hidden' }],
    { duration, easing },
  );
  details._fdAnim = anim;
  anim.onfinish = done;
  anim.oncancel = () => { if (details._fdAnim === anim) details._fdAnim = null; };
}

function initDetails(root) {
  $$(DETAILS, root).forEach((d) => {
    if (!once(d, 'fd-details')) return;
    d.dataset.state = d.open ? 'open' : 'closed';
  });
}

/* ---------- Dismiss ---------- */
/** Dismiss a callout or banner (animated), remembering it when it has data-fd-dismiss-key. */
export function dismiss(el) {
  if (el.hidden) return;
  if (!emit(el, 'fd:close', { value: el.dataset.fdDismissKey ?? null })) return;
  const key = el.dataset.fdDismissKey;
  if (key) storage.set(KEY + key, '1');
  const duration = reducedMotion() ? 0 : ms(token(el, '--fd-dur-3', '220ms'), 220);
  if (!duration) { el.hidden = true; return; }
  const h = el.getBoundingClientRect().height;
  const cut = { height: '0px', opacity: 0, paddingBlock: '0px', marginBlock: '0px', borderBlockWidth: '0px', overflow: 'hidden' };
  const anim = el.animate(
    [{ height: `${h}px`, opacity: 1, overflow: 'hidden' }, cut],
    { duration, easing: token(el, '--fd-ease-out', 'ease-out'), fill: 'forwards' },
  );
  anim.onfinish = () => { el.hidden = true; anim.cancel(); };
}

function restoreDismissed(root) {
  $$('[data-fd-dismiss-key]', root).forEach((el) => {
    if (once(el, 'fd-restore') && storage.get(KEY + el.dataset.fdDismissKey) === '1') el.hidden = true;
  });
}

/* ---------- Scroller ---------- */
function initScroller(root) {
  if (!once(root, 'fd-scroller')) return;
  const track = $('.fd-scroller-track', root);
  if (!track) return;
  const prev = $('[data-fd-scroll="prev"]', root);
  const next = $('[data-fd-scroll="next"]', root);
  const nav = prev?.closest('.fd-scroller-nav') ?? $('.fd-scroller-nav', root);
  let last = '';
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const pos = Math.abs(track.scrollLeft);
    const scrollable = max > 1;
    if (nav) nav.hidden = !scrollable;
    if (prev) prev.disabled = pos <= 1;
    if (next) next.disabled = pos >= max - 1;
    const state = !scrollable || pos <= 1 ? 'start' : pos >= max - 1 ? 'end' : 'middle';
    if (state !== last) { if (last) emit(root, 'fd:change', { value: state }); last = state; }
  };
  const step = (dir) => {
    const rtl = getComputedStyle(track).direction === 'rtl' ? -1 : 1;
    track.scrollBy({ left: dir * rtl * track.clientWidth * 0.9, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  prev?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));
  track.addEventListener('scroll', update, { passive: true });
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(update);
    ro.observe(track);
    [...track.children].forEach((c) => ro.observe(c));
  }
  new MutationObserver(update).observe(track, { childList: true });
  update();
}

/* ---------- Init ---------- */
let delegated = false;
export function init(root = document) {
  initDetails(root);
  restoreDismissed(root);
  $$('[data-fd-scroller]', root).forEach(initScroller);

  if (delegated) return;
  delegated = true;

  on(document, 'click', '.fd-accordion-item > summary, .fd-disclosure > summary', (event, summary) => {
    event.preventDefault();
    toggle(summary.parentElement);
  });

  on(document, 'click', '[data-fd-dismiss]', (event, btn) => {
    const target = btn.closest('.fd-callout, .fd-banner, [data-fd-dismissible]');
    if (target) { event.preventDefault(); dismiss(target); }
  });

  on(document, 'click', '.fd-badge-remove, .fd-tag-remove', (event, btn) => {
    const host = btn.closest('.fd-badge, .fd-tag');
    if (!host) return;
    event.preventDefault();
    const value = host.dataset.value ?? host.textContent.trim();
    if (emit(host, 'fd:close', { value })) host.remove();
  });
}
