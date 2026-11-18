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
 * Decisions (CSS in components/content.css, "Decisions"; docs/decisions.html)
 *   The brief (fd-decision), fd-delta and fd-impact are markup only. Behaviour below.
 *
 * Draft: an agent's words, which stay the agent's until the person takes them
 *   <aside class="fd-draft" [data-fd-draft-for="<textarea id>"]> … .fd-draft-text … <button data-fd-draft="use|discard">
 *   use: copies the fd-draft-text into the reason (the textarea data-fd-draft-for names, else the first textarea of the
 *     closest .fd-commit), focuses it and sets data-state="used" on the fd-draft; the textarea gets data-fd-drafted="used",
 *     and both turn "edited" once the person changes the words. fd:accept on the fd-draft first (cancelable, detail { value: text }).
 *   discard: fd:close on the fd-draft (cancelable, detail { value: text }), then it folds away like a dismissed callout.
 *
 * Commit: the reason and the buttons named for their effect
 *   <form class="fd-commit" [data-fd-hold="10"] [data-fd-hold-in="toast"]> (or a div inside another form)
 *     a textarea, .fd-commit-budget[data-min-words="3"][data-max-words="60"], .fd-field-error > span,
 *     <button type="submit" value="approve" data-verb="Approving the credit">, [.fd-commit-lock], [.fd-hold]
 *   The budget counts words as the person types: fd-commit-budget[data-state="near|over"]. Committing checks the reason
 *   (required, at least data-min-words and at most data-max-words), writes the error into the field and focuses it. Then:
 *     no hold: data-state="committed" and fd:commit on the fd-commit (detail { value, reason, drafted, verb }).
 *     data-fd-hold="n": data-state="held", the fd-hold in the form counts n seconds (it is built if missing) and fd:hold fires
 *       on the fd-commit; Undo or Escape fires fd:undo and opens the form again; the end fires fd:commit.
 *     data-fd-hold-in="toast": the same countdown runs in a held toast (overlays.js toast.hold), so the page can move on at
 *       once. The events still fire on the fd-commit: keep it in the document, hidden if you like, until the hold ends.
 *       Cancel fd:commit to keep the toast as a loading toast (detail.toast is its id); otherwise it goes.
 *   A visible .fd-commit-lock disables the commit buttons and describes them: the viewer cannot decide, and it says who can.
 *   reopen(form) makes a committed form editable again, for a send that failed.
 *
 * Hold: a commit that waits, with a countdown and Undo
 *   <div class="fd-hold" id="hold-run" data-seconds="10" hidden> .fd-hold-ring > .fd-hold-count · .fd-hold-title · .fd-hold-undo
 *   <button data-fd-hold-for="hold-run" data-verb="Cancelling run_8f2a91" value="cancel">Cancel run</button> starts it, or
 *   hold(el, { seconds, label, value }) → Promise<boolean>: true when the time ran out and it committed, false when undone.
 *   While it runs the fd-hold has data-state="running", its trigger is disabled and focus sits on Undo. Undo, Escape
 *   (focus in the hold, its form or nowhere) or cancelHold(el) stops it; leaving the page commits it at once (cause "pagehide").
 *   fd:hold on the fd-hold when it starts (detail { value, seconds }), fd:undo when stopped (detail { value }),
 *   fd:commit when it ran out (detail { value, cause: "time" | "pagehide" }). Screen readers hear the start and the undo.
 *
 * Preview: change, see what it touches, then commit
 *   <form class="fd-preview"> .fd-preview-edit … [data-fd-preview-open] · .fd-preview-stale · .fd-preview-result </form>
 *   The open button checks the fields of fd-preview-edit, sets data-state="preview" and fires fd:open on the fd-preview
 *   (detail { value: the form's FormData, or null }): fill its fd-impact then. A field of fd-preview-edit that changes
 *   afterwards sets data-state="stale", which hides the commit, and fires fd:change on the fd-preview (detail { value: "stale" }).
 *
 * Queue: the list of what waits, beside the case
 *   <div class="fd-queue"> .fd-queue-list > .fd-queue-group > .fd-queue-item[data-value] · .fd-queue-case > [data-case] · .fd-queue-back
 *   Picking a fd-queue-item marks it aria-current="true", shows the [data-case] with its value when the page holds them,
 *   sets data-view="case" and fires fd:select on the fd-queue-item (detail { value, item }). Arrow keys, Home and End move
 *   along the items. The fd-queue-back button sets data-view="list" and focuses the current item.
 *   removeItem(item) takes an item out, keeps .fd-queue-count right, hides a group left empty and returns the next item.
 *
 * Page states: one set for a screen or a section
 *   <div class="fd-states" data-state="loading"> children with data-when="loading|ready|empty|filtered|error|no-access|not-found|off|expired"
 *   setState(el, state) sets data-state, moves focus to the shown part's heading when focus was in a part that hid, and
 *   fires fd:change on the fd-states (detail { value, previous }). A button with data-fd-set-state="loading" inside does the same.
 *
 * Labels (data-label-<key> on an ancestor, or the page dictionary; see core.js label()):
 *   commit.budget "{count} / {max} words" · commit.words "{count} words" · commit.empty "Write a reason first."
 *   commit.short "Write at least {min} words." · commit.long "Keep it to {max} words. It has {count}."
 *   hold.note "Nothing is sent until the countdown ends." · hold.undo "Undo" · hold.action "Sending"
 *   hold.start "{action} in {seconds} seconds. Undo or Escape stops it." · hold.undone "Stopped. Nothing was sent."
 *   draft.used "The draft is in the reason now. Edit it before you commit."
 *
 * Exports: init(root), dismiss(el), toggle(details, open?), hold(el, options), cancelHold(el), reopen(form),
 *   select(item), removeItem(item), setState(el, state)
 */
import { $, $$, on, once, emit, reducedMotion, ensureId, label } from './core.js';
import { icon } from './icons.js';
import { toast } from './overlays.js';

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
  collapse(el);
}

/** Fold an element away (height, padding and opacity to nothing), then hide it. */
function collapse(el) {
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

/* ==========================================================================
   Decisions
   ========================================================================== */
const words = (text) => { const t = String(text ?? '').trim(); return t ? t.split(/\s+/).length : 0; };

/* One polite live region for the whole page: a region that appears with its message is often not read. */
let announcer = null;
function announce(text) {
  if (!text) return;
  if (!announcer || !announcer.isConnected) {
    announcer = document.createElement('div');
    announcer.className = 'fd-sr-only';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.append(announcer);
  }
  announcer.textContent = '';
  setTimeout(() => { announcer.textContent = text; }, 60);
}

/* ---------- Draft ---------- */
const draftText = (draft) => $('.fd-draft-text', draft)?.textContent.trim() ?? '';
function draftTarget(draft) {
  const id = draft.dataset.fdDraftFor;
  return (id && document.getElementById(id)) || draft.closest('.fd-commit')?.querySelector('textarea') || null;
}
const drafted = new WeakMap(); // textarea -> { draft, text }

function useDraft(draft) {
  const target = draftTarget(draft);
  const text = draftText(draft);
  if (!target || !emit(draft, 'fd:accept', { value: text })) return;
  target.value = text;
  target.dataset.fdDrafted = 'used';
  drafted.set(target, { draft, text });
  draft.dataset.state = 'used';
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.focus();
  try { target.setSelectionRange(text.length, text.length); } catch { /* not a text control */ }
  announce(label(draft, 'draft.used', 'The draft is in the reason now. Edit it before you commit.'));
}

function trackDrafted(field) {
  const record = drafted.get(field);
  if (!record || field.dataset.fdDrafted !== 'used' || field.value.trim() === record.text) return;
  field.dataset.fdDrafted = 'edited';
  record.draft.dataset.state = 'edited';
}

/* ---------- Commit ---------- */
const reasonOf = (form) => $('textarea', form);
const budgetOf = (form) => $('.fd-commit-budget', form);
const commitButtons = (form) => $$('button[type="submit"], button:not([type])', form).filter((b) => b.closest('.fd-commit') === form && !b.closest('.fd-hold'));

function updateBudget(form) {
  const field = reasonOf(form);
  const budget = budgetOf(form);
  if (!field || !budget) return;
  const count = words(field.value);
  const max = Number(budget.dataset.maxWords) || 0;
  budget.textContent = max ? label(budget, 'commit.budget', '{count} / {max} words', { count, max }) : label(budget, 'commit.words', '{count} words', { count });
  budget.dataset.state = max && count > max ? 'over' : max && count >= Math.ceil(max * 0.9) ? 'near' : '';
}

function fieldError(field, message) {
  const error = field.closest('.fd-field')?.querySelector('.fd-field-error');
  if (error) {
    ensureId(error, 'fd-error');
    const text = $('span', error) || error;
    if (message) text.textContent = message;
    error.hidden = !message;
    const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter((x) => x && x !== error.id);
    if (message) ids.push(error.id);
    if (ids.length) field.setAttribute('aria-describedby', ids.join(' ')); else field.removeAttribute('aria-describedby');
  }
  if (message) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
}

/** Check the reason: required, and inside the word budget. Writes the error into the field. */
function checkReason(form, { quiet = false } = {}) {
  const field = reasonOf(form);
  if (!field) return true;
  const budget = budgetOf(form);
  const count = words(field.value);
  const max = Number(budget?.dataset.maxWords) || 0;
  const min = Number(budget?.dataset.minWords) || (field.required ? 1 : 0);
  let message = '';
  if (field.required && !count) message = label(form, 'commit.empty', 'Write a reason first.');
  else if (count && min && count < min) message = label(form, 'commit.short', 'Write at least {min} words.', { min });
  else if (max && count > max) message = label(form, 'commit.long', 'Keep it to {max} words. It has {count}.', { max, count });
  if (!quiet || !message) fieldError(field, message);
  if (message && !quiet) field.focus();
  return !message;
}

function lockCommit(form) {
  const lock = $('.fd-commit-lock', form);
  if (!lock || lock.hidden) return;
  ensureId(lock, 'fd-lock');
  for (const b of commitButtons(form)) {
    b.disabled = true;
    const ids = (b.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!ids.includes(lock.id)) b.setAttribute('aria-describedby', [...ids, lock.id].join(' '));
  }
}

function setCommitting(form, on, submitter) {
  const field = reasonOf(form);
  if (field) field.readOnly = on;
  for (const b of commitButtons(form)) {
    if (on) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
  }
  if (submitter && on) submitter.setAttribute('aria-busy', 'true'); else for (const b of commitButtons(form)) b.removeAttribute('aria-busy');
}

/** Make a committed or held form editable again (after a send that failed). */
export function reopen(form) {
  if (!form) return;
  delete form.dataset.state;
  setCommitting(form, false);
  const hold = $('.fd-hold', form);
  if (hold && running.has(hold)) endHold(hold, 'silent');
}

function buildHold(form) {
  let hold = $('.fd-hold', form);
  if (hold) return hold;
  hold = document.createElement('div');
  hold.className = 'fd-hold';
  hold.hidden = true;
  hold.innerHTML = `<span class="fd-hold-ring" aria-hidden="true"><span class="fd-hold-count"></span></span>`
    + `<div class="fd-hold-text"><p class="fd-hold-title"></p><p class="fd-hold-note"></p></div>`
    + `<button class="fd-btn fd-hold-undo" type="button">${icon('undo-2')}<span></span></button>`;
  $('.fd-hold-note', hold).textContent = label(form, 'hold.note', 'Nothing is sent until the countdown ends.');
  $('.fd-hold-undo span', hold).textContent = label(form, 'hold.undo', 'Undo');
  ($('.fd-commit-actions', form) || form.lastElementChild)?.after(hold);
  return hold;
}

const markupTone = new WeakMap(); // fd-hold -> the tone its markup set, restored after a danger commit

function commit(form, submitter) {
  if (form.dataset.state === 'held' || form.dataset.state === 'committed') return;
  const preview = form.closest('.fd-preview');
  if (preview && preview.dataset.state !== 'preview') return;
  if (submitter && (submitter.disabled || submitter.getAttribute('aria-disabled') === 'true')) return;
  if (!checkReason(form)) return;
  const field = reasonOf(form);
  const verb = submitter?.dataset.verb || submitter?.textContent.trim() || label(form, 'hold.action', 'Sending');
  const detail = { value: submitter?.value || 'commit', reason: field?.value.trim() ?? '', drafted: field?.dataset.fdDrafted || null, verb };
  const seconds = Math.round(Number(form.dataset.fdHold) || 0);
  const send = (extra = {}) => {
    form.dataset.state = 'committed';
    setCommitting(form, true, submitter);
    return emit(form, 'fd:commit', { ...detail, ...extra });
  };
  if (!seconds) { send(); return; }

  form.dataset.state = 'held';
  setCommitting(form, true);
  const tone = submitter?.dataset.variant?.startsWith('danger') ? 'danger' : undefined;
  if (form.dataset.fdHoldIn === 'toast') {
    toast.hold({
      title: verb, description: label(form, 'hold.note', 'Nothing is sent until the countdown ends.'), seconds, tone,
      target: form, detail,
      onUndo: () => { reopen(form); submitter?.focus(); },
      onCommit: () => { form.dataset.state = 'committed'; },
    });
    return;
  }
  const hold = buildHold(form);
  if (!markupTone.has(hold)) markupTone.set(hold, hold.dataset.tone ?? null);
  const shown = tone ?? markupTone.get(hold);
  if (shown) hold.dataset.tone = shown; else delete hold.dataset.tone;
  startHold(hold, {
    seconds, verb, value: detail.value, target: form, detail, trigger: submitter,
    onUndo: () => reopen(form),
    onCommit: (cause) => send({ cause }),
  });
}

/* ---------- Hold ---------- */
const running = new Map(); // fd-hold -> { timer, resolve, trigger, target, detail, onUndo, onCommit, started }

function startHold(el, { seconds, verb = '', value = null, target = el, detail = {}, trigger = null, onUndo, onCommit } = {}) {
  if (running.has(el)) endHold(el, 'silent');
  const total = Math.max(1, Math.round(Number(seconds) || Number(el.dataset.seconds) || 10));
  const title = $('.fd-hold-title', el);
  if (title && verb) title.textContent = verb;
  const action = verb || title?.textContent.trim() || label(el, 'hold.action', 'Sending');
  const ring = $('.fd-hold-ring', el);
  const count = $('.fd-hold-count', el);
  el.hidden = false;
  el.dataset.state = 'running';
  if (trigger && trigger.closest('.fd-commit') == null) trigger.disabled = true;
  const started = performance.now();
  const ms = total * 1000;
  const state = { trigger, target, detail: { ...detail, value }, onUndo, onCommit, started, resolve: null, timer: 0 };
  const tick = () => {
    const left = Math.max(0, ms - (performance.now() - started));
    const secondsLeft = Math.ceil(left / 1000);
    if (count && count.textContent !== String(secondsLeft)) count.textContent = String(secondsLeft);
    ring?.style.setProperty('--_c-hold-p', String(reducedMotion() ? secondsLeft / total : left / ms));
    if (left <= 0) endHold(el, 'commit', 'time');
  };
  state.timer = setInterval(tick, 100);
  running.set(el, state);
  tick();
  $('.fd-hold-undo', el)?.focus({ preventScroll: true });
  announce(label(el, 'hold.start', '{action} in {seconds} seconds. Undo or Escape stops it.', { action, seconds: total }));
  emit(target, 'fd:hold', { ...state.detail, seconds: total });
  return new Promise((resolve) => { state.resolve = resolve; });
}

/** End a running hold: "undo" stops it, "commit" sends it, "silent" drops it with no event. */
function endHold(el, how, cause = 'time') {
  const state = running.get(el);
  if (!state) return;
  running.delete(el);
  clearInterval(state.timer);
  const hadFocus = el.contains(document.activeElement);
  delete el.dataset.state;
  el.hidden = true;
  if (state.trigger && state.trigger.closest('.fd-commit') == null) state.trigger.disabled = false;
  if (how === 'undo') {
    announce(label(el, 'hold.undone', 'Stopped. Nothing was sent.'));
    emit(state.target, 'fd:undo', state.detail);
    state.onUndo?.();
  } else if (how === 'commit') {
    if (state.onCommit) state.onCommit(cause);
    else emit(state.target, 'fd:commit', { ...state.detail, cause });
  }
  if (hadFocus && state.trigger?.isConnected && !state.trigger.closest('[hidden]')) state.trigger.focus({ preventScroll: true });
  state.resolve?.(how === 'commit');
}

/** Start a held action on an .fd-hold. Resolves true when it committed, false when it was undone. */
export function hold(el, { seconds, label: verb, value = null } = {}) {
  if (!el) return Promise.resolve(false);
  return startHold(el, { seconds, verb, value });
}
/** Stop a running hold as if Undo was pressed. */
export function cancelHold(el) { if (running.has(el)) endHold(el, 'undo'); }

/* ---------- Preview ---------- */
function openPreview(preview, button) {
  const edit = $('.fd-preview-edit', preview);
  const fields = edit ? $$('input, select, textarea', edit) : [];
  const bad = fields.find((f) => !f.checkValidity());
  if (bad) { bad.reportValidity?.(); bad.focus(); return; }
  preview.dataset.state = 'preview';
  const form = preview.matches('form') ? preview : preview.closest('form');
  emit(preview, 'fd:open', { value: form ? new FormData(form) : null, trigger: button });
  const result = $('.fd-preview-result', preview);
  const focusTo = result && ($('.fd-impact', result) || result);
  if (focusTo) { if (!focusTo.hasAttribute('tabindex')) focusTo.tabIndex = -1; focusTo.focus({ preventScroll: false }); }
}

/* ---------- Queue ---------- */
const queueItems = (queue) => $$('.fd-queue-item', queue).filter((i) => !i.hidden && !i.closest('[hidden]'));
const narrow = (queue) => { const list = $('.fd-queue-list', queue); return !!list && getComputedStyle(list).display === 'none'; };

/** Make a queue item the current one and show its case. */
export function select(item, { focus = true } = {}) {
  const queue = item?.closest('.fd-queue');
  if (!queue) return;
  for (const i of $$('.fd-queue-item', queue)) {
    if (i === item) i.setAttribute('aria-current', 'true'); else i.removeAttribute('aria-current');
  }
  const value = item.dataset.value ?? '';
  const panels = $$(':scope > .fd-queue-case > [data-case]', queue);
  if (panels.some((p) => p.dataset.case === value)) for (const p of panels) p.hidden = p.dataset.case !== value;
  queue.dataset.view = 'case';
  emit(item, 'fd:select', { value, item });
  if (focus && narrow(queue)) {
    const panel = panels.find((p) => p.dataset.case === value) || $('.fd-queue-case', queue);
    const heading = panel && $('h1, h2, h3', panel);
    if (heading) { if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1; heading.focus(); }
  }
}

/** Take an item out of its queue. Returns the item that is current next, or null when the queue is empty. */
export function removeItem(item) {
  const queue = item?.closest('.fd-queue');
  if (!queue) return null;
  const list = queueItems(queue);
  const at = list.indexOf(item);
  const wasCurrent = item.getAttribute('aria-current') === 'true';
  const group = item.closest('.fd-queue-group');
  item.remove();
  if (group) {
    const left = $$('.fd-queue-item', group).length;
    const count = $('.fd-queue-count', group);
    if (count) count.textContent = String(left);
    group.hidden = left === 0;
  }
  const rest = queueItems(queue);
  const next = wasCurrent ? (rest[at] || rest[at - 1] || null) : $('.fd-queue-item[aria-current="true"]', queue);
  if (wasCurrent && next) select(next, { focus: false });
  if (!rest.length) queue.dataset.view = 'list';
  return next;
}

/* ---------- Page states ---------- */
const STATES = ['loading', 'ready', 'empty', 'filtered', 'error', 'no-access', 'not-found', 'off', 'expired'];

/** Show one state of an .fd-states wrapper. */
export function setState(el, state) {
  if (!el || !STATES.includes(state)) return;
  const previous = el.dataset.state || 'ready';
  const focusWasIn = [...el.children].find((c) => c.contains(document.activeElement));
  el.dataset.state = state;
  if (focusWasIn && getComputedStyle(focusWasIn).display === 'none') {
    const shown = [...el.children].find((c) => (c.dataset.when || '').split(/\s+/).includes(state));
    const heading = shown && ($('.fd-empty-title, h1, h2, h3', shown) || shown);
    if (heading) { if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
  if (previous !== state) emit(el, 'fd:change', { value: state, previous });
}

function initDecisions(root) {
  $$('.fd-commit', root).forEach((form) => {
    if (!once(form, 'fd-commit')) return;
    if (form.matches('form')) form.noValidate = true;
    updateBudget(form);
    lockCommit(form);
  });
}

/* ---------- Init ---------- */
let delegated = false;
export function init(root = document) {
  initDetails(root);
  restoreDismissed(root);
  $$('[data-fd-scroller]', root).forEach(initScroller);
  initDecisions(root);

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

  /* Decisions */
  on(document, 'click', '[data-fd-draft]', (event, btn) => {
    const draft = btn.closest('.fd-draft');
    if (!draft) return;
    event.preventDefault();
    if (btn.dataset.fdDraft === 'use') useDraft(draft);
    else if (btn.dataset.fdDraft === 'discard' && emit(draft, 'fd:close', { value: draftText(draft) })) collapse(draft);
  });
  on(document, 'input', '.fd-commit textarea, textarea[data-fd-drafted]', (event, field) => {
    trackDrafted(field);
    const form = field.closest('.fd-commit');
    if (!form || reasonOf(form) !== field) return;
    updateBudget(form);
    if (field.getAttribute('aria-invalid') === 'true') checkReason(form, { quiet: true });
  });
  on(document, 'submit', 'form.fd-commit, form.fd-preview', (event, form) => {
    event.preventDefault();
    const owner = event.submitter?.closest('.fd-commit');
    if (owner && !event.submitter.closest('.fd-hold')) commit(owner, event.submitter);
    else if (form.matches('.fd-commit')) commit(form, event.submitter);
    else if (form.dataset.state !== 'preview') openPreview(form);
  });
  on(document, 'click', 'div.fd-commit button', (event, btn) => {
    if (btn.type !== 'submit' || btn.closest('.fd-hold')) return;
    event.preventDefault();
    commit(btn.closest('.fd-commit'), btn);
  });
  on(document, 'click', '[data-fd-hold-for]', (event, btn) => {
    const el = document.getElementById(btn.dataset.fdHoldFor);
    if (!el || running.has(el)) return;
    event.preventDefault();
    startHold(el, { verb: btn.dataset.verb, value: btn.value || btn.dataset.value || null, trigger: btn });
  });
  on(document, 'click', '.fd-hold-undo', (event, btn) => {
    const el = btn.closest('.fd-hold');
    if (!running.has(el)) return;
    event.preventDefault();
    endHold(el, 'undo');
  });
  // Escape stops the hold that holds focus (or the last one, when focus is nowhere), before a dialog hears it.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !running.size) return;
    const active = document.activeElement;
    let target = null;
    for (const [el, state] of running) if (el.contains(active) || state.target?.contains?.(active)) target = el;
    if (!target && (!active || active === document.body)) target = [...running.keys()].pop();
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    endHold(target, 'undo');
  }, true);
  // Leaving the page while a hold runs sends it: the person decided and did not take it back.
  window.addEventListener('pagehide', () => { for (const el of [...running.keys()]) endHold(el, 'commit', 'pagehide'); });

  on(document, 'click', '[data-fd-preview-open]', (event, btn) => {
    const preview = btn.closest('.fd-preview');
    if (!preview) return;
    event.preventDefault();
    openPreview(preview, btn);
  });
  const stale = (event, el) => {
    const preview = el.closest('.fd-preview');
    if (preview?.dataset.state !== 'preview') return;
    preview.dataset.state = 'stale';
    emit(preview, 'fd:change', { value: 'stale' });
  };
  on(document, 'input', '.fd-preview-edit', stale);
  on(document, 'change', '.fd-preview-edit', stale);
  on(document, 'fd:change', '.fd-preview-edit', stale);

  on(document, 'click', '.fd-queue-item', (event, item) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    const queue = item.closest('.fd-queue');
    const value = item.dataset.value ?? '';
    if (item.matches('a[href]') && $$(':scope > .fd-queue-case > [data-case]', queue).some((p) => p.dataset.case === value)) event.preventDefault();
    select(item);
  });
  on(document, 'keydown', '.fd-queue-item', (event, item) => {
    const list = queueItems(item.closest('.fd-queue'));
    const at = list.indexOf(item);
    const to = { ArrowDown: list[at + 1], ArrowUp: list[at - 1], Home: list[0], End: list[list.length - 1] }[event.key];
    if (!to) return;
    event.preventDefault();
    to.focus();
  });
  on(document, 'click', '.fd-queue-back', (event, btn) => {
    const queue = btn.closest('.fd-queue');
    if (!queue) return;
    queue.dataset.view = 'list';
    $('.fd-queue-item[aria-current="true"]', queue)?.focus();
  });
  on(document, 'click', '[data-fd-set-state]', (event, btn) => {
    const el = btn.closest('.fd-states');
    if (el) setState(el, btn.dataset.fdSetState);
  });

  on(document, 'click', '.fd-badge-remove, .fd-tag-remove', (event, btn) => {
    const host = btn.closest('.fd-badge, .fd-tag');
    if (!host) return;
    event.preventDefault();
    const value = host.dataset.value ?? host.textContent.trim();
    if (emit(host, 'fd:close', { value })) host.remove();
  });
}
