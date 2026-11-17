/* Fire agent — composer, suggestions, streaming, tool calls, reasoning, citations,
 * sessions, run timers, results, the playground, and a scripted demo run.
 *
 * Markup contract (see fire/components/agent.css for the full markup of each block):
 *
 *  .fd-composer (a <form>)          `.fd-composer-input` auto-grows (textarea) up to 240px. `data-ready` is set while
 *                                   there is text. Enter or ⌘/Ctrl+Enter sends, Shift+Enter is a newline.
 *                                   Sending emits `fd:submit` (detail: { value, composer }); unless the event is
 *                                   cancelled the input clears. While `data-state="running"` the send button is a
 *                                   stop square and pressing it emits `fd:stop`.
 *    data-fd-demo-target="#thread"  sending plays demoRun() in that thread with the typed prompt.
 *    .fd-composer-tool[aria-pressed]   toggles; [data-fd-cycle="Low,Medium,High"] cycles its label.
 *    .fd-composer-source[aria-pressed] toggles (playground source chips).
 *    .fd-composer-attachment-remove    removes its attachment.
 *    .fd-model-chip[popovertarget] + .fd-model-menu[popover]   positioned menu of .fd-model-menu-item
 *                                   (role="menuitemradio", data-value, data-new); choosing emits fd:change on the chip.
 *  .fd-suggestions-item             fills the composer named by `.fd-suggestions[data-target]`, or the one in the same
 *                                   `.fd-composer-hero`, with its text (or data-prompt) and focuses it.
 *  .fd-toolcall-head[aria-expanded] toggles its `.fd-toolcall-panel`.
 *  .fd-reasoning-toggle             toggles its `.fd-reasoning-panel`.
 *  .fd-citation                     shows a hover/focus card from data-title, data-domain, data-snippet.
 *  .fd-message-action[data-action]  copy | up | down | retry | open — copy copies the message text, up/down are an
 *                                   exclusive pair; every action emits `fd:action` (detail: { action, message }).
 *  .fd-session-list-spinner         animated braille spinner.        [data-fd-elapsed]  live mm:ss from data-start.
 *  .fd-result [data-action="copy-result"|"download-result"]  copies JSON / downloads CSV of the result.
 *  [data-fd-playground]             [data-action="run"] fills the response from <template data-result> (JSON rows) with
 *                                   a rise; [data-action="reset"] restores fields and the skeleton. ⌘↵ in the form runs.
 *                                   An input with data-fd-credits="0.2" drives `.fd-playground-credits b`.
 *  .fd-thread[data-fd-demo]         renders the final demo state at once, then replays it the first time it scrolls into view.
 *  [data-fd-replay="#thread"]       replays the demo in that thread.
 *
 * API: init(root), stream(el, html | text, { speed, keepCursor, signal }) → Promise, setRunning(composer, bool),
 *      setToolcall(el, { state, meta }), demoRun(thread, { prompt, instant }) → Promise, stopDemo(thread),
 *      appendMessage(thread, role, html) → element.
 * Events: fd:submit, fd:stop, fd:change, fd:action, fd:open, fd:close.
 */
import { $, $$, on, once, emit, copyText, ensureId, position, autoUpdate, reducedMotion } from './core.js';
import { icon } from './icons.js';
import { init as initCode, renderJSON, getJSON, copied } from './code.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const scope = (root, sel) => [...(root instanceof Element && root.matches(sel) ? [root] : []), ...$$(sel, root)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let uid = 0;
const nextId = (p) => `${p}-${(++uid).toString(36)}`;

/* ==========================================================================
   Composer
   ========================================================================== */
const inputOf = (composer) => $('.fd-composer-input', composer);

function grow(input) {
  if (input.tagName !== 'TEXTAREA' || CSS.supports?.('field-sizing', 'content')) return;
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 240)}px`;
}

function sync(composer) {
  const input = inputOf(composer);
  const hasText = !!input && input.value.trim().length > 0;
  const hasFiles = !!$('.fd-composer-attachment:not([data-state="removing"])', composer);
  const running = composer.dataset.state === 'running';
  composer.toggleAttribute('data-ready', (hasText || hasFiles) && !running);
  const send = $('.fd-composer-send', composer);
  if (send) {
    send.setAttribute('aria-disabled', String(!(hasText || hasFiles) && !running));
    send.setAttribute('aria-label', running ? 'Stop' : send.dataset.label || 'Send');
  }
}

/** Mark a composer as running (send becomes stop) or idle. */
export function setRunning(composer, running) {
  if (!composer) return;
  if (running) composer.dataset.state = 'running';
  else if (composer.dataset.state === 'running') delete composer.dataset.state;
  sync(composer);
}

function submit(composer) {
  if (composer.dataset.state === 'running') {
    setRunning(composer, false);
    emit(composer, 'fd:stop', { composer });
    return;
  }
  const input = inputOf(composer);
  const value = input ? input.value.trim() : '';
  if (!value && !$('.fd-composer-attachment', composer)) { input?.focus(); return; }
  const proceed = emit(composer, 'fd:submit', { value, composer });
  if (!proceed) return;
  if (input && input.tagName === 'TEXTAREA') { input.value = ''; grow(input); }
  sync(composer);
  const target = composer.dataset.fdDemoTarget && document.querySelector(composer.dataset.fdDemoTarget);
  if (target) demoRun(target, { prompt: value || undefined, composer });
}

function initComposer(composer) {
  if (!once(composer, 'fd-composer')) return;
  $$('button', composer).forEach((b) => { if (!b.classList.contains('fd-composer-send') && !b.hasAttribute('type')) b.type = 'button'; });
  const send = $('.fd-composer-send', composer);
  if (send) {
    if (!send.hasAttribute('type')) send.type = composer.tagName === 'FORM' ? 'submit' : 'button';
    send.dataset.label = send.getAttribute('aria-label') || 'Send';
  }
  const input = inputOf(composer);
  if (input) grow(input);
  sync(composer);
}

function fillComposer(composer, text) {
  const input = inputOf(composer);
  if (!input) return;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
  const end = input.value.length;
  input.setSelectionRange?.(end, end);
}

/* ---------- Model menu ---------- */
const MENU_STOP = new WeakMap();
function onMenuToggle(e) {
  const menu = e.target;
  if (!(menu instanceof Element) || !menu.classList.contains('fd-model-menu')) return;
  const invoker = menu.id && document.querySelector(`[popovertarget="${CSS.escape(menu.id)}"]`);
  if (e.newState === 'open') {
    if (invoker) {
      invoker.setAttribute('aria-expanded', 'true');
      MENU_STOP.set(menu, autoUpdate(() => position(invoker, menu, { placement: menu.dataset.placement || 'bottom-start', offset: 6 })));
    }
    const current = $('.fd-model-menu-item[aria-checked="true"]', menu) || $('.fd-model-menu-item', menu);
    current?.focus();
    emit(menu, 'fd:open');
  } else {
    MENU_STOP.get(menu)?.();
    MENU_STOP.delete(menu);
    invoker?.setAttribute('aria-expanded', 'false');
    emit(menu, 'fd:close');
  }
}
function chooseModel(item) {
  const menu = item.closest('.fd-model-menu');
  $$('.fd-model-menu-item', menu).forEach((i) => i.setAttribute('aria-checked', String(i === item)));
  const value = item.dataset.value || $('.fd-model-menu-name', item)?.textContent.trim() || '';
  const chip = menu.id && document.querySelector(`[popovertarget="${CSS.escape(menu.id)}"]`);
  if (chip) {
    const label = $('.fd-model-chip-label', chip);
    if (label) label.textContent = value;
    const tag = $('.fd-model-chip-tag', chip);
    if (tag) tag.hidden = !item.hasAttribute('data-new');
    emit(chip, 'fd:change', { value });
  }
  menu.hidePopover?.();
  chip?.focus();
}

/* ==========================================================================
   Streaming
   ========================================================================== */
const ATOMIC = '.fd-citation, img, br, hr, svg, table, pre, .fd-result, .fd-sources, .fd-codeblock, .fd-toolcall-group, [data-atomic]';

/**
 * Type `content` (HTML or plain text) into `el` word by word with a blinking caret.
 * Elements matching ATOMIC (citations, tables, cards) appear whole. Resolves when done.
 * Under reduced motion, or with speed 0, the content appears at once.
 */
export async function stream(el, content, { speed = 28, keepCursor = false, signal } = {}) {
  const tpl = document.createElement('template');
  if (/<[a-z][\s\S]*>/i.test(content)) tpl.innerHTML = content;
  else tpl.content.append(document.createTextNode(content));
  if (reducedMotion() || speed <= 0) {
    el.append(tpl.content);
    if (keepCursor) el.append(cursor());
    return;
  }
  const caret = cursor();
  el.setAttribute('aria-busy', 'true');
  const reveal = async (src, dst) => {
    for (const node of [...src.childNodes]) {
      if (signal?.aborted) return;
      if (node.nodeType === 3) {
        const text = document.createTextNode('');
        dst.append(text, caret);
        for (const part of node.textContent.split(/(\s+)/)) {
          if (signal?.aborted) return;
          text.textContent += part;
          if (part.trim()) await wait(speed * (0.55 + Math.random() * 0.9));
        }
      } else if (node.nodeType === 1) {
        if (node.matches(ATOMIC)) {
          const clone = node.cloneNode(true);
          dst.append(clone, caret);
          if (clone.matches('table, .fd-result, .fd-sources, .fd-codeblock, pre')) clone.classList.add('fd-rise');
          await wait(speed * 3);
        } else {
          const shell = node.cloneNode(false);
          dst.append(shell);
          await reveal(node, shell);
          dst.append(caret);
        }
      }
    }
  };
  await reveal(tpl.content, el);
  if (!keepCursor) caret.remove();
  el.removeAttribute('aria-busy');
}
function cursor() {
  const c = document.createElement('span');
  c.className = 'fd-cursor';
  c.setAttribute('aria-hidden', 'true');
  return c;
}

/* ==========================================================================
   Tool calls, reasoning
   ========================================================================== */
const STATE_LABEL = { queued: 'Queued', running: 'Running', done: 'Done', failed: 'Failed', approval: 'Needs approval' };

function initToolcall(tc) {
  if (!once(tc, 'fd-toolcall')) return;
  const head = $(':scope > .fd-toolcall-head', tc);
  const panel = $(':scope > .fd-toolcall-panel', tc);
  if (head && panel) {
    if (!head.hasAttribute('aria-expanded')) head.setAttribute('aria-expanded', 'false');
    head.setAttribute('aria-controls', ensureId(panel, 'fd-toolcall'));
    if (head.tagName === 'BUTTON') head.type = 'button';
  }
  const status = $('.fd-toolcall-status', tc);
  if (status) { status.setAttribute('role', 'img'); status.setAttribute('aria-label', STATE_LABEL[tc.dataset.state] || 'Done'); }
}

/** Update a tool call's state ("queued|running|done|failed|approval") and its meta text. */
export function setToolcall(tc, { state, meta } = {}) {
  if (state) tc.dataset.state = state;
  if (meta != null) { const m = $('.fd-toolcall-meta', tc); if (m) m.textContent = meta; }
  const status = $('.fd-toolcall-status', tc);
  if (status) status.setAttribute('aria-label', STATE_LABEL[tc.dataset.state] || 'Done');
}

function toggleDisclosure(btn) {
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  emit(btn, open ? 'fd:open' : 'fd:close');
}

function initReasoning(r) {
  if (!once(r, 'fd-reasoning')) return;
  const btn = $(':scope > .fd-reasoning-toggle', r);
  const panel = $(':scope > .fd-reasoning-panel', r);
  if (!btn || !panel) return;
  if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', ensureId(panel, 'fd-reasoning'));
  if (btn.tagName === 'BUTTON') btn.type = 'button';
}

/* ==========================================================================
   Citations
   ========================================================================== */
let card;
let cardFor;
let cardTimer;
function citationCard() {
  if (card) return card;
  card = document.createElement('div');
  card.className = 'fd-citation-card';
  card.id = nextId('fd-cite');
  card.setAttribute('role', 'tooltip');
  if ('popover' in HTMLElement.prototype) card.setAttribute('popover', 'manual');
  else card.hidden = true;
  document.body.append(card);
  return card;
}
function showCitation(el) {
  const title = el.dataset.title;
  const domain = el.dataset.domain;
  if (!title && !domain) return;
  const c = citationCard();
  cardFor?.removeAttribute('aria-describedby');
  cardFor = el;
  c.innerHTML = `<div class="fd-citation-card-meta"><span class="fd-sources-tile">${esc((domain || title || '?').trim()[0])}</span><span class="fd-truncate">${esc(domain || '')}</span></div>`
    + (title ? `<div class="fd-citation-card-title">${esc(title)}</div>` : '')
    + (el.dataset.snippet ? `<div class="fd-citation-card-snippet">${esc(el.dataset.snippet)}</div>` : '');
  if (c.showPopover) { if (!c.matches(':popover-open')) c.showPopover(); } else c.hidden = false;
  position(el, c, { placement: 'top', offset: 8 });
  el.setAttribute('aria-describedby', c.id);
  el.setAttribute('aria-expanded', 'true');
}
function hideCitation() {
  clearTimeout(cardTimer);
  if (!card) return;
  if (card.hidePopover) { if (card.matches(':popover-open')) card.hidePopover(); } else card.hidden = true;
  if (cardFor) { cardFor.removeAttribute('aria-describedby'); cardFor.removeAttribute('aria-expanded'); }
  cardFor = null;
}

/* ==========================================================================
   Messages
   ========================================================================== */
/** Append a message. `role` is "user" or "assistant"; `html` fills the body. Returns the article. */
export function appendMessage(thread, role, html = '') {
  const msg = document.createElement('article');
  msg.className = 'fd-message';
  msg.dataset.role = role;
  msg.dataset.new = '';
  if (role === 'user') msg.innerHTML = `<div class="fd-message-body">${html}</div>`;
  else msg.innerHTML = `<div class="fd-message-avatar" aria-hidden="true">${icon('sparkle')}</div><div class="fd-message-content"><div class="fd-message-body">${html}</div></div>`;
  thread.append(msg);
  msg.addEventListener('animationend', () => msg.removeAttribute('data-new'), { once: true });
  return msg;
}

const ACTIONS_HTML = `<div class="fd-message-actions" role="toolbar" aria-label="Message actions">`
  + `<button type="button" class="fd-message-action" data-action="copy" aria-label="Copy answer">${icon('copy')}</button>`
  + `<button type="button" class="fd-message-action" data-action="retry" aria-label="Retry">${icon('rotate-ccw')}</button>`
  + `<button type="button" class="fd-message-action" data-action="up" aria-label="Good answer" aria-pressed="false">${icon('thumbs-up')}</button>`
  + `<button type="button" class="fd-message-action" data-action="down" aria-label="Bad answer" aria-pressed="false">${icon('thumbs-down')}</button>`
  + `<button type="button" class="fd-message-action" data-action="open">${icon('square-terminal')}<span>Open in playground</span></button></div>`;

/* ==========================================================================
   Sessions, timers
   ========================================================================== */
const BRAILLE = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
let brailleTimer;
function startBraille() {
  if (brailleTimer || reducedMotion()) return;
  let frame = 0;
  brailleTimer = setInterval(() => {
    const spinners = $$('.fd-session-list-spinner');
    if (!spinners.length) { clearInterval(brailleTimer); brailleTimer = null; return; }
    frame = (frame + 1) % BRAILLE.length;
    spinners.forEach((s) => { s.textContent = BRAILLE[frame]; });
  }, 80);
}

let elapsedTimer;
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function tickElapsed() {
  const els = $$('[data-fd-elapsed]:not([data-stopped])');
  if (!els.length) { clearInterval(elapsedTimer); elapsedTimer = null; return; }
  const now = Date.now();
  els.forEach((el) => {
    const start = +el.dataset.start || Date.parse(el.dataset.start) || now;
    el.textContent = mmss(Math.max(0, (now - start) / 1000));
  });
}
function initElapsed(el) {
  if (!once(el, 'fd-elapsed')) return;
  if (!el.dataset.start) {
    const preset = el.textContent.trim().split(':').map(Number);
    const offset = preset.length === 2 && preset.every((n) => !Number.isNaN(n)) ? (preset[0] * 60 + preset[1]) * 1000 : 0;
    el.dataset.start = String(Date.now() - offset);
  }
  if (!elapsedTimer) elapsedTimer = setInterval(tickElapsed, 1000);
}

/* ==========================================================================
   Result + playground
   ========================================================================== */
function tableToCSV(table) {
  const cell = (c) => { const t = c.textContent.trim(); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return $$('tr', table).map((tr) => $$('th, td', tr).map(cell).join(',')).join('\n');
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const PLAYGROUND = new WeakMap();
function initPlayground(pg) {
  if (!once(pg, 'fd-playground')) return;
  const tbody = $('.fd-playground-output tbody', pg);
  const note = $('.fd-playground-note > p', pg);
  const json = $('.fd-playground-output .fd-json', pg);
  PLAYGROUND.set(pg, { skeleton: tbody?.innerHTML ?? '', note: note?.textContent ?? '', sample: json ? getJSON(json) : undefined });
  updateCredits(pg);
}
function updateCredits(pg) {
  const input = $('[data-fd-credits]', pg);
  const out = $('.fd-playground-credits b', pg);
  if (!input || !out) return;
  const n = Math.max(1, Math.ceil((parseFloat(input.value) || 0) * parseFloat(input.dataset.fdCredits)));
  out.textContent = `≈ ${n.toLocaleString()} ${n === 1 ? 'credit' : 'credits'}`;
}
async function runPlayground(pg) {
  const btn = $('[data-action="run"]', pg);
  if (btn?.getAttribute('aria-busy') === 'true') return;
  btn?.setAttribute('aria-busy', 'true');
  const state = PLAYGROUND.get(pg) || {};
  const tbody = $('.fd-playground-output tbody', pg);
  const note = $('.fd-playground-note > p', pg);
  if (tbody) tbody.innerHTML = state.skeleton;
  const started = performance.now();
  await wait(reducedMotion() ? 0 : 900 + Math.random() * 500);
  let rows = [];
  try { rows = JSON.parse($('template[data-result]', pg)?.content.textContent || '[]'); } catch { rows = []; }
  const keys = $$('.fd-playground-output thead th', pg).map((th) => th.dataset.key || th.textContent.trim());
  if (tbody) {
    tbody.innerHTML = rows.map((row, i) => `<tr data-new data-fd-vars="--fd-i:${i}">${keys.map((k) => `<td${typeof row[k] === 'number' ? ' data-num' : /^(id|.*_id)$/.test(k) ? ' data-mono' : ''}>${esc(row[k] ?? '—')}</td>`).join('')}</tr>`).join('');
  }
  const json = $('.fd-playground-output .fd-json', pg);
  if (json) renderJSON(json, rows, { depth: 2 });
  const secs = ((performance.now() - started) / 1000).toFixed(1);
  if (note) note.textContent = note.dataset.done ? note.dataset.done.replace('{rows}', rows.length).replace('{time}', `${secs}s`) : `Live data · ${rows.length} rows · ${secs}s`;
  btn?.removeAttribute('aria-busy');
  pg.dataset.state = 'done';
  emit(pg, 'fd:change', { value: rows });
}
function resetPlayground(pg) {
  const state = PLAYGROUND.get(pg) || {};
  $$('.fd-playground-form :is(input, select)', pg).forEach((f) => {
    if (f.tagName === 'SELECT') $$('option', f).forEach((o) => { o.selected = o.defaultSelected; });
    else f.value = f.defaultValue;
  });
  const tbody = $('.fd-playground-output tbody', pg);
  if (tbody) tbody.innerHTML = state.skeleton;
  const note = $('.fd-playground-note > p', pg);
  if (note) note.textContent = state.note;
  const json = $('.fd-playground-output .fd-json', pg);
  if (json && state.sample !== undefined) renderJSON(json, state.sample);
  delete pg.dataset.state;
  updateCredits(pg);
}

/* ==========================================================================
   Demo run
   ========================================================================== */
const DEMO = {
  prompt: 'Every pricing tier and monthly price on ember.dev, northwind.io and lumenapi.com',
  sources: [
    { n: 1, title: 'Pricing · Ember — plans for web data and agents', domain: 'ember.dev/pricing', snippet: 'Free, Hobby, Standard and Growth plans. Credits renew monthly; the Free plan renews daily.' },
    { n: 2, title: 'Plans and limits | Northwind Data', domain: 'northwind.io/plans', snippet: 'Starter and Team plans billed monthly, with overage at $0.002 per page.' },
    { n: 3, title: 'Lumen API pricing — simple, usage-based', domain: 'lumenapi.com/pricing', snippet: 'Developer and Scale tiers. Yearly billing saves 17%.' },
  ],
  calls: [
    { name: 'search', args: '"pricing" ember.dev northwind.io lumenapi.com', meta: '1.2s · 1 cr', ms: 1300,
      input: { query: 'pricing plans monthly', sites: ['ember.dev', 'northwind.io', 'lumenapi.com'], limit: 6 },
      output: { results: [{ url: 'https://ember.dev/pricing', title: 'Pricing · Ember' }, { url: 'https://northwind.io/plans', title: 'Plans and limits' }, { url: 'https://lumenapi.com/pricing', title: 'Lumen API pricing' }], credits: 1 } },
    { name: 'scrape', args: '3 pages · formats: markdown, json', meta: '2.9s · 3 cr', ms: 1700,
      input: { urls: ['https://ember.dev/pricing', 'https://northwind.io/plans', 'https://lumenapi.com/pricing'], formats: ['markdown', 'json'], onlyMainContent: true },
      output: { pages: 3, status: [200, 200, 200], tokens: 6412, credits: 3 } },
  ],
  rows: [
    { provider: 'Ember', plan: 'Hobby', price: 16, credits: 3000 },
    { provider: 'Ember', plan: 'Standard', price: 83, credits: 100000 },
    { provider: 'Northwind', plan: 'Starter', price: 29, credits: 10000 },
    { provider: 'Northwind', plan: 'Team', price: 149, credits: 120000 },
    { provider: 'Lumen', plan: 'Developer', price: 19, credits: 5000 },
    { provider: 'Lumen', plan: 'Scale', price: 249, credits: 250000 },
  ],
  usage: '6 pages · 12 credits · 8.2s',
};

const cite = (s) => `<a class="fd-citation" href="https://${s.domain}" data-title="${esc(s.title)}" data-domain="${esc(s.domain.split('/')[0])}" data-snippet="${esc(s.snippet)}" aria-label="Source ${s.n}: ${esc(s.title)}">${s.n}</a>`;
const answerHTML = () => {
  const [a, b, c] = DEMO.sources;
  return `<p>All three sell monthly plans with included credits. Ember is the only one with a free plan, and it renews daily${cite(a)}.</p>`
    + '<ul>'
    + `<li><strong>Ember</strong>: Hobby at $16 and Standard at $83 a month, with 3,000 and 100,000 credits${cite(a)}.</li>`
    + `<li><strong>Northwind</strong>: Starter at $29 and Team at $149; pages past the quota cost <code>$0.002</code> each${cite(b)}.</li>`
    + `<li><strong>Lumen</strong>: Developer at $19 and Scale at $249; yearly billing is 17% cheaper${cite(c)}.</li>`
    + '</ul>'
    + '<p>Per 1,000 credits, Ember Standard is the cheapest of the paid plans. The full table is below.</p>';
};
const toolcallHTML = (call, state) => {
  const id = nextId('fd-tc');
  return `<div class="fd-toolcall" data-state="${state}"><button type="button" class="fd-toolcall-head" aria-expanded="false" aria-controls="${id}">`
    + `<span class="fd-toolcall-status" role="img" aria-label="${STATE_LABEL[state]}"></span><span class="fd-toolcall-name">${esc(call.name)}</span>`
    + `<span class="fd-toolcall-args">${esc(call.args)}</span><span class="fd-toolcall-meta">${state === 'done' ? esc(call.meta) : ''}</span>${icon('chevron-down', { cls: 'fd-toolcall-chevron' })}</button>`
    + `<div class="fd-toolcall-panel" id="${id}"><div class="fd-toolcall-body">`
    + '<div class="fd-toolcall-label"><span class="fd-eyebrow">Arguments</span></div>'
    + `<div class="fd-json" data-depth="2" data-max-height="200" data-json="${esc(JSON.stringify(call.input))}"></div>`
    + `<div class="fd-toolcall-label"><span class="fd-eyebrow">Result</span><span>${esc(call.meta)}</span></div>`
    + `<div class="fd-json" data-depth="1" data-max-height="200" data-json="${esc(JSON.stringify(call.output))}"></div>`
    + '</div></div></div>';
};
const resultHTML = () => {
  const head = '<tr><th>Provider</th><th>Plan</th><th data-num>Price / mo</th><th data-num>Credits</th></tr>';
  const body = DEMO.rows.map((r, i) => `<tr data-fd-vars="--fd-i:${i}"><td>${r.provider}</td><td>${r.plan}</td><td data-num>$${r.price}</td><td data-num>${r.credits.toLocaleString()}</td></tr>`).join('');
  return '<section class="fd-result" data-fd-views data-atomic>'
    + `<header class="fd-result-head"><div class="fd-result-title"><span>Pricing tiers</span><span class="fd-result-count">${DEMO.rows.length} rows</span></div>`
    + '<div class="fd-result-tools"><div class="fd-viewswitch" role="tablist" aria-label="Result view"><button class="fd-viewswitch-item" role="tab" data-value="table" aria-selected="true">Table</button><button class="fd-viewswitch-item" role="tab" data-value="json">JSON</button></div>'
    + `<button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-action="copy-result" aria-label="Copy result as JSON">${icon('copy')}</button>`
    + `<button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-action="download-result" aria-label="Download CSV">${icon('download')}</button></div></header>`
    + `<div class="fd-result-body" data-view="table"><table class="fd-result-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`
    + `<div class="fd-result-body" data-view="json" hidden><div class="fd-json" data-variant="bare" data-depth="2" data-json="${esc(JSON.stringify(DEMO.rows))}"></div></div>`
    + `<footer class="fd-result-foot"><span>pricing_tiers.json</span><span>${DEMO.usage}</span></footer></section>`;
};
const sourcesHTML = () => '<div class="fd-sources" data-layout="row" data-atomic><div class="fd-sources-head"><span class="fd-eyebrow">Sources</span>'
  + `<span class="fd-sources-count">${DEMO.sources.length}</span></div><div class="fd-sources-list">`
  + DEMO.sources.map((s, i) => `<a class="fd-sources-item" href="https://${s.domain}"><span class="fd-sources-meta"><span class="fd-sources-tile"${i ? ` data-tone="${['neutral', 'violet'][i - 1]}"` : ''}>${s.domain[0]}</span><span class="fd-sources-domain">${esc(s.domain.split('/')[0])}</span><span class="fd-sources-num">${s.n}</span></span><span class="fd-sources-title">${esc(s.title)}</span></a>`).join('')
  + '</div></div>';

const RUNS = new WeakMap();
const composerFor = (thread) => thread.closest('.fd-agent, [data-fd-demo-scope]')?.querySelector('.fd-composer') || null;

/** Abort a running demo in `thread`. */
export function stopDemo(thread) {
  const run = RUNS.get(thread);
  if (!run || run.done) return;
  RUNS.set(thread, { id: run.id + 1, done: true });
  setRunning(run.composer, false);
  $$('.fd-toolcall[data-state="running"], .fd-toolcall[data-state="queued"]', thread).forEach((tc) => setToolcall(tc, { state: 'failed', meta: 'stopped' }));
  $$('.fd-message-thinking, .fd-cursor', thread).forEach((n) => n.remove());
  const last = $$('.fd-message[data-role="assistant"]', thread).pop();
  const content = last && $('.fd-message-content', last);
  if (content && !$('.fd-message-foot', content)) content.insertAdjacentHTML('beforeend', `<div class="fd-message-foot">${ACTIONS_HTML}<span class="fd-message-meta">Stopped</span></div>`);
}

/**
 * Play the scripted run in `thread`: user message → thinking → two tool calls → streamed answer with
 * citations → result table → sources and usage. `instant` (or reduced motion) renders the final state at once.
 */
export async function demoRun(thread, { prompt = DEMO.prompt, instant = false, composer = composerFor(thread) } = {}) {
  const prev = RUNS.get(thread);
  const id = (prev?.id || 0) + 1;
  const run = { id, done: false, composer };
  RUNS.set(thread, run);
  const alive = () => RUNS.get(thread) === run;
  const signal = { get aborted() { return !alive(); } };
  const fast = instant || reducedMotion();
  const pause = (ms) => (fast ? Promise.resolve() : wait(ms));
  const scroller = thread.closest('.fd-agent-scroll');
  const follow = () => { if (scroller && !fast) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }); };

  hideCitation();
  thread.replaceChildren();
  if (!fast) setRunning(composer, true);

  appendMessage(thread, 'user', esc(prompt));
  if (fast) $$('[data-new]', thread).forEach((n) => n.removeAttribute('data-new'));
  await pause(500);
  if (!alive()) return;

  const msg = appendMessage(thread, 'assistant', '');
  if (fast) msg.removeAttribute('data-new');
  const content = $('.fd-message-content', msg);
  const body = $('.fd-message-body', msg);
  body.remove();
  const thinking = document.createElement('div');
  thinking.className = 'fd-message-thinking';
  thinking.innerHTML = '<span class="fd-message-status">Planning the search…</span>';
  if (!fast) content.append(thinking);
  follow();
  await pause(900);
  if (!alive()) return;

  const reasoning = document.createElement('div');
  reasoning.className = 'fd-reasoning';
  reasoning.dataset.state = fast ? 'done' : 'thinking';
  reasoning.innerHTML = `<button type="button" class="fd-reasoning-toggle" aria-expanded="false">${icon('brain')}<span class="fd-reasoning-label">${fast ? 'Thought for 2s' : 'Thinking…'}</span>${icon('chevron-right')}</button>`
    + '<div class="fd-reasoning-panel"><div class="fd-reasoning-body"><div class="fd-reasoning-text"><p>Three pricing pages are needed. Search all three domains at once, then scrape the pages that match and pull plan, monthly price and included credits into one table.</p></div></div></div>';
  content.insertBefore(reasoning, thinking.isConnected ? thinking : null);
  initReasoning(reasoning);

  const group = document.createElement('div');
  group.className = 'fd-toolcall-group';
  content.insertBefore(group, thinking.isConnected ? thinking : null);
  $('.fd-message-status', thinking).textContent = 'Searching the web…';

  for (const [i, call] of DEMO.calls.entries()) {
    group.insertAdjacentHTML('beforeend', toolcallHTML(call, fast ? 'done' : 'running'));
    const tc = group.lastElementChild;
    initToolcall(tc);
    initCode(tc);
    follow();
    await pause(call.ms);
    if (!alive()) return;
    setToolcall(tc, { state: 'done', meta: call.meta });
    if (i === 0) {
      reasoning.dataset.state = 'done';
      $('.fd-reasoning-label', reasoning).textContent = 'Thought for 2s';
      $('.fd-message-status', thinking).textContent = 'Reading 3 pages…';
    }
  }
  await pause(400);
  if (!alive()) return;
  thinking.remove();

  const answer = document.createElement('div');
  answer.className = 'fd-message-body';
  content.append(answer);
  await stream(answer, answerHTML(), { speed: fast ? 0 : 26, signal });
  if (!alive()) return;
  follow();
  await pause(200);

  content.insertAdjacentHTML('beforeend', resultHTML());
  const result = content.lastElementChild;
  if (!fast) {
    result.dataset.new = '';
    $$('tbody tr', result).forEach((tr) => { tr.dataset.new = ''; });
  }
  initCode(result);
  follow();
  await pause(500);
  if (!alive()) return;
  content.insertAdjacentHTML('beforeend', sourcesHTML());
  if (!fast) content.lastElementChild.classList.add('fd-rise');
  content.insertAdjacentHTML('beforeend', `<div class="fd-message-foot">${ACTIONS_HTML}<span class="fd-message-meta">${DEMO.usage}</span></div>`);
  if (!fast) content.lastElementChild.classList.add('fd-fade');
  follow();
  run.done = true;
  setRunning(composer, false);
  emit(thread, 'fd:change', { value: 'done' });
}

function initDemoThread(thread) {
  if (!once(thread, 'fd-demo')) return;
  demoRun(thread, { instant: true });
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); demoRun(thread); }
  }, { threshold: 0.35 });
  io.observe(thread);
}

/* ==========================================================================
   Delegated behaviour (bound once)
   ========================================================================== */
function bindGlobal() {
  if (!once(document, 'fd-agent-global')) return;

  // Composer
  on(document, 'input', '.fd-composer-input', (e, input) => {
    grow(input);
    sync(input.closest('.fd-composer'));
  });
  on(document, 'keydown', '.fd-composer-input', (e, input) => {
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    const mod = e.metaKey || e.ctrlKey;
    if (e.shiftKey && !mod) return;
    if (input.tagName === 'TEXTAREA' || mod) {
      e.preventDefault();
      submit(input.closest('.fd-composer'));
    }
  });
  on(document, 'submit', '.fd-composer', (e, composer) => {
    e.preventDefault();
    submit(composer);
  });
  on(document, 'click', '.fd-composer-send', (e, btn) => {
    const composer = btn.closest('.fd-composer');
    if (composer.tagName === 'FORM' && btn.type === 'submit') return;
    submit(composer);
  });
  on(document, 'click', '.fd-composer-tool[aria-pressed], .fd-composer-source[aria-pressed]', (e, btn) => {
    const pressed = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(pressed));
    emit(btn, 'fd:change', { value: pressed });
  });
  on(document, 'click', '.fd-composer-tool[data-fd-cycle]', (e, btn) => {
    const options = btn.dataset.fdCycle.split(',').map((s) => s.trim());
    const label = $('span', btn);
    if (!label) return;
    const next = options[(options.indexOf(label.textContent.trim()) + 1) % options.length];
    label.textContent = next;
    emit(btn, 'fd:change', { value: next });
  });
  on(document, 'click', '.fd-composer-attachment-remove', (e, btn) => {
    const chip = btn.closest('.fd-composer-attachment');
    const composer = chip.closest('.fd-composer');
    chip.dataset.state = 'removing';
    sync(composer);
    setTimeout(() => { chip.remove(); sync(composer); inputOf(composer)?.focus(); }, reducedMotion() ? 0 : 160);
  });
  on(document, 'mousedown', '.fd-composer', (e, composer) => {
    if (e.target === composer || e.target.classList.contains('fd-composer-tools') || e.target.classList.contains('fd-composer-row')) {
      e.preventDefault();
      inputOf(composer)?.focus();
    }
  });

  // Model menu
  document.addEventListener('toggle', onMenuToggle, true);
  on(document, 'click', '.fd-model-menu-item', (e, item) => chooseModel(item));
  on(document, 'keydown', '.fd-model-menu', (e, menu) => {
    const items = $$('.fd-model-menu-item', menu);
    const i = items.indexOf(document.activeElement);
    const next = { ArrowDown: items[i + 1] || items[0], ArrowUp: items[i - 1] || items[items.length - 1], Home: items[0], End: items[items.length - 1] }[e.key];
    if (next) { e.preventDefault(); next.focus(); }
  });

  // Suggestions
  on(document, 'click', '.fd-suggestions-item', (e, item) => {
    const list = item.closest('.fd-suggestions');
    const composer = (list?.dataset.target && document.querySelector(list.dataset.target))
      || item.closest('.fd-composer-hero')?.querySelector('.fd-composer')
      || item.closest('.fd-agent')?.querySelector('.fd-composer');
    if (!composer) return;
    const text = item.dataset.prompt || $('.fd-suggestions-text', item)?.textContent.trim() || item.textContent.trim();
    fillComposer(composer, text);
    emit(item, 'fd:select', { value: text, item });
  });

  // Disclosures
  on(document, 'click', '.fd-toolcall-head[aria-expanded]', (e, btn) => toggleDisclosure(btn));
  on(document, 'click', '.fd-reasoning-toggle', (e, btn) => toggleDisclosure(btn));

  // Citations
  on(document, 'pointerover', '.fd-citation', (e, el) => {
    if (e.pointerType === 'touch' || cardFor === el) return;
    clearTimeout(cardTimer);
    cardTimer = setTimeout(() => showCitation(el), 120);
  });
  on(document, 'pointerout', '.fd-citation', (e, el) => {
    if (el.contains(e.relatedTarget)) return;
    clearTimeout(cardTimer);
    cardTimer = setTimeout(hideCitation, 80);
  });
  on(document, 'focusin', '.fd-citation', (e, el) => showCitation(el));
  on(document, 'focusout', '.fd-citation', () => hideCitation());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cardFor) hideCitation(); });
  addEventListener('scroll', () => { if (cardFor) hideCitation(); }, { capture: true, passive: true });

  // Message actions
  on(document, 'click', '.fd-message-action[data-action]', async (e, btn) => {
    const message = btn.closest('.fd-message');
    const action = btn.dataset.action;
    if (action === 'copy') {
      const text = $$('.fd-message-body', message).map((b) => b.innerText.trim()).join('\n\n');
      if (await copyText(text)) copied(btn, { iconOnly: true });
    }
    if (action === 'up' || action === 'down') {
      const pressed = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(pressed));
      const other = $(`.fd-message-action[data-action="${action === 'up' ? 'down' : 'up'}"]`, message);
      if (pressed && other) other.setAttribute('aria-pressed', 'false');
    }
    if (action === 'retry') {
      const thread = message.closest('.fd-thread');
      if (thread && RUNS.has(thread)) demoRun(thread, { prompt: $('.fd-message[data-role="user"] .fd-message-body', thread)?.textContent || DEMO.prompt });
    }
    emit(btn, 'fd:action', { action, message });
  });

  // Results
  on(document, 'click', '.fd-result [data-action="copy-result"]', async (e, btn) => {
    const json = $('.fd-json', btn.closest('.fd-result'));
    const data = json ? getJSON(json) : undefined;
    const table = $('table', btn.closest('.fd-result'));
    const text = data !== undefined ? JSON.stringify(data, null, 2) : table ? tableToCSV(table) : '';
    if (await copyText(text)) copied(btn, { iconOnly: true });
  });
  on(document, 'click', '.fd-result [data-action="download-result"]', (e, btn) => {
    const table = $('table', btn.closest('.fd-result'));
    if (table) download(btn.dataset.filename || 'ember-result.csv', `${tableToCSV(table)}\n`, 'text/csv');
  });

  // Playground
  on(document, 'click', '[data-fd-playground] [data-action="run"]', (e, btn) => runPlayground(btn.closest('[data-fd-playground]')));
  on(document, 'click', '[data-fd-playground] [data-action="reset"]', (e, btn) => resetPlayground(btn.closest('[data-fd-playground]')));
  on(document, 'click', '[data-fd-playground] [data-action="copy-response"]', async (e, btn) => {
    const json = $('.fd-playground-output .fd-json', btn.closest('[data-fd-playground]'));
    if (json && await copyText(JSON.stringify(getJSON(json), null, 2))) copied(btn, { iconOnly: true });
  });
  on(document, 'input', '[data-fd-playground] [data-fd-credits]', (e, input) => updateCredits(input.closest('[data-fd-playground]')));
  on(document, 'keydown', '[data-fd-playground] .fd-playground-form', (e, form) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runPlayground(form.closest('[data-fd-playground]')); }
  });
  on(document, 'click', '.fd-playground-more', (e, btn) => {
    const target = btn.getAttribute('aria-controls') && document.getElementById(btn.getAttribute('aria-controls'));
    if (!target) return;
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    target.hidden = !open;
    const label = $('span', btn);
    if (label) {
      if (!label.dataset.closed) label.dataset.closed = label.textContent;
      label.textContent = open ? 'Hide optional fields' : label.dataset.closed;
    }
  });

  // Demo controls
  on(document, 'click', '[data-fd-replay]', (e, btn) => {
    const thread = document.querySelector(btn.dataset.fdReplay);
    if (thread) demoRun(thread);
  });
  document.addEventListener('fd:stop', (e) => {
    const composer = e.target.closest?.('.fd-composer');
    if (!composer) return;
    $$('.fd-thread').forEach((thread) => { const run = RUNS.get(thread); if (run && !run.done && run.composer === composer) stopDemo(thread); });
  });
}

/** Wire every agent-family block inside `root`. Idempotent. */
export function init(root = document) {
  bindGlobal();
  scope(root, '.fd-composer').forEach(initComposer);
  scope(root, '.fd-toolcall').forEach(initToolcall);
  scope(root, '.fd-reasoning').forEach(initReasoning);
  scope(root, '[data-fd-elapsed]').forEach(initElapsed);
  scope(root, '[data-fd-playground]').forEach(initPlayground);
  scope(root, '.fd-model-menu').forEach((menu) => {
    if (!once(menu, 'fd-model-menu')) return;
    const chip = menu.id && document.querySelector(`[popovertarget="${CSS.escape(menu.id)}"]`);
    if (chip) { chip.setAttribute('aria-haspopup', 'menu'); chip.setAttribute('aria-expanded', 'false'); if (chip.tagName === 'BUTTON') chip.type = 'button'; }
    $$('.fd-model-menu-item', menu).forEach((i) => { if (i.tagName === 'BUTTON') i.type = 'button'; });
  });
  if (scope(root, '.fd-session-list-spinner').length) startBraille();
  scope(root, '.fd-thread[data-fd-demo]').forEach(initDemoThread);
}
