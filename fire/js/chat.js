/* Fire chat — one conversation for an AI assistant and for people, with rich blocks inside messages.
 *
 * Markup contract (fire/components/chat.css has the anatomy; docs/chat.html shows every part):
 *
 *  .fd-chat[id]                      data-mode="panel|popup|inline|side" (panel by default), data-state="open|closed",
 *                                    data-contained (live inside a positioned box), data-expanded, data-agent, data-view.
 *                                    An empty .fd-chat is filled with the default Ember support chat (scaffold()).
 *    data-fd-chat-demo               answers free questions with scripted demo replies (docs, templates, the shell).
 *    data-fd-chat-play="ai|support|handoff"   plays that demo once when it scrolls into view.
 *    data-banner="…" data-banner-tone data-banner-href data-banner-link   an incident strip under the head (scaffolded chats).
 *    data-persist="false"            do not remember open state and mode in sessionStorage (contained chats never do
 *                                    unless data-persist is set).
 *  .fd-chat-log[data-fd-chat-render="#json"]  a bare thread rendered from JSON (a message or an array of messages)
 *                                    read from the element the selector names, or from a child <script type="application/json">.
 *  [data-fd-chat-toggle="<id>"]      toggles that chat (aria-expanded and aria-controls are kept in sync); a .fd-chat-launcher.
 *  [data-fd-chat-open="<id>"]        opens it; data-prompt="…" also sends that text.
 *  [data-fd-chat-view="home|conversation|history|offline"]  shows a view (inside a chat, or with aria-controls / data-target).
 *  [data-fd-chat-close] [data-fd-chat-minimize] [data-fd-chat-expand] [data-fd-chat-new] [data-fd-chat-attach]
 *  [data-fd-chat-replay="#id"]       replays the chat's demo (data-demo picks one).
 *  .fd-chat-teaser[data-for="<id>"][data-delay="4000"]  rises in after the delay unless dismissed this session;
 *                                    [data-fd-chat-teaser-dismiss] hides it.
 *
 * API: init(root), get(el | id) → controller, render(message) → element, scaffold(options) → HTML string,
 *      demo(el, 'ai' | 'support' | 'handoff', { instant }) → Promise, stopDemo(el), cite(n, source) → HTML,
 *      setStep(block, index, state, { detail, time }), setQueue(block, position, { name }), resolveConfirm(block, state, html).
 * Controller: open({ trigger }), close(), toggle(), setMode(mode), expand(on), show(view), send(text, { attachments, quote }),
 *      add(message) → element, update(id, patch), remove(id), setTyping(author | false, { name, label }),
 *      setAgent({ kind: 'ai'|'human'|'away'|'queue', name, role, avatar, status, ahead }), setUnread(n),
 *      stream(id, text, { speed }) → Promise, setDisabled(reason | false), addFiles(files), newConversation().
 * Events (bubble from the chat): fd:open, fd:close, fd:submit { value, attachments } (cancel to keep the text),
 *      fd:action { type, value, block, message } (quick-reply, action, list, form, confirm, rating, helpful, schedule,
 *      handoff, feedback, reaction, copy, reply, edit, menu, history, new), fd:change { value, kind: 'view'|'mode'|'size' }.
 */
import { $, $$, on, once, emit, copyText, ensureId, reducedMotion, trapFocus, coarsePointer } from './core.js';
import { icon, upgradeIcons } from './icons.js';
import { stream as typeInto, setRunning, setToolcall, init as initAgent } from './agent.js';
import { init as initCode, copied } from './code.js';
import { init as initData } from './data.js';
import { init as initForms } from './forms.js';
import { init as initCharts } from './charts.js';
import { openDialog, toast } from './overlays.js';

/* ==========================================================================
   Helpers
   ========================================================================== */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const scope = (root, sel) => [...(root instanceof Element && root.matches(sel) ? [root] : []), ...$$(sel, root)];
let uid = 0;
const nextId = (p = 'cht') => `${p}-${(++uid).toString(36)}`;
const isPhone = () => matchMedia('(max-width: 640px)').matches;
const toDate = (t) => { if (t == null || t === '') return null; const d = t instanceof Date ? t : new Date(t); return Number.isNaN(d.getTime()) ? null : d; };
const fmtTime = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const fmtShort = (d) => fmtTime(d).replace(/\s?[AP]M$/i, '');
const fmtN = (n) => (Number.isFinite(+n) ? Number(n).toLocaleString('en-US') : esc(n));
const fmtSize = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const nudge = (name) => icon(name).replace('<svg', '<svg data-nudge');
const ms = (el, token) => { const v = getComputedStyle(el).getPropertyValue(token).trim(); return v.endsWith('ms') ? parseFloat(v) : v.endsWith('s') ? parseFloat(v) * 1000 : 0; };
const ABORT = Symbol('abort');
const MODES = new Set(['panel', 'popup', 'inline', 'side']);
const VIEWS = ['home', 'conversation', 'history', 'offline'];
const AUTHORS = new Set(['user', 'ai', 'human', 'system']);
const AI_NAME = 'Ember AI';
const MAX_BYTES = 10 * 1048576;
const REACTIONS = [['thumbs-up', 'Helpful'], ['heart', 'Love it'], ['check', 'Done'], ['flame', 'On fire'], ['lightbulb', 'Good idea']];
const RATING_LABELS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Great'];
const KIND_ICON = { image: 'image', pdf: 'file-text', sheet: 'table', json: 'file-json', code: 'file-code', archive: 'archive', text: 'scroll-text', file: 'file' };
function kindOf(name = '', type = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) return 'sheet';
  if (ext === 'json') return 'json';
  if (['js', 'ts', 'py', 'sh', 'mjs', 'tsx', 'go', 'rb'].includes(ext)) return 'code';
  if (['zip', 'gz', 'tar'].includes(ext)) return 'archive';
  if (['txt', 'log', 'md'].includes(ext)) return 'text';
  return 'file';
}

/* A small, safe subset of Markdown for text blocks: paragraphs, - lists, 1. lists, `code`, **bold**, [links](url). */
function inline(s, sources) {
  let html = esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:https?:|#|\/)[^)\s]*)\)/g, '<a href="$2">$1</a>');
  // [1] becomes a citation chip when the block carries `sources`.
  if (sources?.length) html = html.replace(/\[(\d+)\](?!\()/g, (m, n) => (sources[n - 1] ? cite(+n, sources[n - 1]) : m));
  return html;
}
function prose(text, sources) {
  const line = (l) => inline(l, sources);
  return String(text ?? '').trim().split(/\n{2,}/).map((par) => {
    const lines = par.split('\n');
    if (lines.every((l) => /^\s*[-*] /.test(l))) return `<ul>${lines.map((l) => `<li>${line(l.replace(/^\s*[-*] /, ''))}</li>`).join('')}</ul>`;
    if (lines.every((l) => /^\s*\d+\. /.test(l))) return `<ol>${lines.map((l) => `<li>${line(l.replace(/^\s*\d+\. /, ''))}</li>`).join('')}</ol>`;
    return `<p>${lines.map(line).join('<br>')}</p>`;
  }).join('');
}

/** A numbered citation chip for text blocks: cite(1, { title, domain, url, snippet }). */
export function cite(n, s = {}) {
  const domain = (s.domain || '').split('/')[0];
  return `<a class="fd-citation" href="${esc(s.url || `https://${s.domain || ''}`)}" target="_blank" rel="noopener" data-title="${esc(s.title || '')}" data-domain="${esc(domain)}" data-snippet="${esc(s.snippet || '')}" aria-label="Source ${n}: ${esc(s.title || domain)}">${n}</a>`;
}

/* Re-run the Fire modules a block may contain (JSON trees, copy buttons, meters, sparklines, checks, tool calls). */
function enhance(el) {
  try {
    upgradeIcons(el);
    initAgent(el);
    initCode(el);
    initData(el);
    initForms(el);
    initCharts(el);
  } catch (error) { console.error('[fire] chat enhance failed', error); }
  scope(el, '.fd-chat-carousel').forEach(initCarousel);
}

/* Fold: a part that collapses to nothing (grid rows 1fr → 0fr). */
function fold(el, open) {
  if (!el) return;
  if (open) { el.removeAttribute('data-state'); el.inert = false; } else { el.dataset.state = 'closed'; el.inert = true; }
}

/* ==========================================================================
   Rendering
   ========================================================================== */
const markHTML = (size, name = 'sparkle', tone) => `<span class="fd-chat-mark"${size ? ` data-size="${size}"` : ''}${tone ? ` data-tone="${tone}"` : ''} aria-hidden="true">${icon(name)}</span>`;
function avatarHTML(a = {}, size = 28) {
  const attrs = `${a.status ? ` data-status="${esc(a.status)}"` : ''}${a.tone ? ` data-tone="${esc(a.tone)}"` : ''}`;
  return `<span class="fd-avatar" data-size="${size}"${attrs} aria-hidden="true">${a.src ? `<img src="${esc(a.src)}" alt="">` : esc(a.initials || initials(a.name))}</span>`;
}
function actionHTML(a = {}) {
  if (typeof a === 'string') a = { label: a };
  const value = esc(a.value ?? a.label);
  if (a.variant === 'link') {
    return a.href
      ? `<a class="fd-btn-text" href="${esc(a.href)}" data-value="${value}"${/^https?:/.test(a.href) ? ' target="_blank" rel="noopener"' : ''}><span>${esc(a.label)}</span>${nudge(a.icon || 'arrow-right')}</a>`
      : `<button type="button" class="fd-btn-text" data-value="${value}"><span>${esc(a.label)}</span>${nudge(a.icon || 'arrow-right')}</button>`;
  }
  const variant = a.variant && a.variant !== 'secondary' ? ` data-variant="${esc(a.variant)}"` : '';
  const inner = `${a.icon ? icon(a.icon) : ''}<span>${esc(a.label)}</span>`;
  return a.href
    ? `<a class="fd-btn" data-size="sm"${variant} href="${esc(a.href)}" data-value="${value}">${inner}</a>`
    : `<button type="button" class="fd-btn" data-size="sm"${variant} data-value="${value}"${a.send ? ' data-send' : ''}>${inner}</button>`;
}
function kvHTML(items = []) {
  return items.map((it) => {
    let value;
    let attr = '';
    if (it.status) value = `<span class="fd-status" data-size="sm" data-tone="${esc(it.status)}">${esc(it.value)}</span>`, attr = ' data-plain';
    else { value = esc(it.value); if (it.copy) attr = it.copy === true ? ' data-copy' : ` data-copy="${esc(it.copy)}"`; else if (it.mono) attr = ' data-mono'; }
    return `<div class="fd-kv-item"><dt class="fd-kv-key">${esc(it.key)}</dt><dd class="fd-kv-value"${attr}>${value}</dd></div>`;
  }).join('');
}
const panelHead = (b, iconName) => (b.title ? `<div class="fd-chat-panel-head">${iconName ? icon(iconName) : ''}<span class="fd-chat-panel-title">${esc(b.title)}</span>${b.meta ? `<span class="fd-chat-panel-meta">${esc(b.meta)}</span>` : ''}</div>` : '');

function cardHTML(c = {}) {
  const tag = c.href ? 'a' : 'article';
  const media = c.media ? `<div class="fd-chat-card-media"${c.media.tone ? ` data-tone="${esc(c.media.tone)}"` : ''} aria-hidden="true"><span class="fd-tile" data-size="40"${c.media.tone === 'accent' ? ' data-tone="accent"' : ''}>${icon(c.media.icon || 'book-open')}</span></div>` : '';
  const lead = c.icon || c.initial ? `<span class="fd-tile" data-size="28" data-tone="${esc(c.tone || 'neutral')}">${c.icon ? icon(c.icon) : esc(c.initial)}</span>` : '';
  const head = `<div class="fd-card-head">${lead}<div class="fd-card-heading"><span class="fd-card-name"><span>${esc(c.title)}</span>${c.badge ? `<span class="fd-badge" data-tone="accent">${esc(c.badge)}</span>` : ''}</span>${c.meta ? `<span class="fd-card-meta">${esc(c.meta)}</span>` : ''}</div></div>`;
  const price = c.price ? `<p class="fd-chat-card-price"><b>${esc(c.price)}</b><span>${esc(c.per || '')}</span></p>` : '';
  const text = c.text ? `<p class="fd-card-text">${esc(c.text)}</p>` : '';
  const fields = c.fields?.length ? `<dl class="fd-kv" data-layout="split" data-divided>${kvHTML(c.fields)}</dl>` : '';
  const actions = !c.href && c.actions?.length ? `<div class="fd-chat-card-actions">${c.actions.map(actionHTML).join('')}</div>` : '';
  const link = c.href ? ` href="${esc(c.href)}" data-interactive${/^https?:/.test(c.href) ? ' target="_blank" rel="noopener"' : ''}` : '';
  return `<${tag} class="fd-card fd-chat-card" data-size="sm"${link}>${c.href ? icon('arrow-up-right', { cls: 'fd-card-arrow' }) : ''}${media}${head}${price}${text}${fields}${actions}</${tag}>`;
}

function fieldHTML(f = {}) {
  const id = nextId('cht-f');
  const req = f.required ? ` required data-error-required="${esc(f.error || `Enter ${(f.label || 'a value').toLowerCase()}.`)}"` : '';
  const label = `<label class="fd-field-label" for="${id}"${f.required ? ' data-required' : ''}>${esc(f.label)}</label>`;
  const hint = f.hint ? `<p class="fd-field-hint">${esc(f.hint)}</p>` : '';
  if (f.type === 'select') {
    const opts = (f.options || []).map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
    return `<div class="fd-field">${label}<div class="fd-select" data-variant="outline"><select id="${id}" name="${esc(f.name)}"${req}>${f.placeholder ? `<option value="">${esc(f.placeholder)}</option>` : ''}${opts.map((o) => `<option value="${esc(o.value)}"${o.value === f.value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>${hint}</div>`;
  }
  if (f.type === 'textarea') return `<div class="fd-field">${label}<textarea class="fd-textarea" id="${id}" name="${esc(f.name)}" rows="${f.rows || 3}" data-fd-autogrow data-max-rows="6" placeholder="${esc(f.placeholder || '')}"${f.minlength ? ` minlength="${f.minlength}"` : ''}${req}>${esc(f.value || '')}</textarea>${hint}</div>`;
  if (f.type === 'choice') {
    const lid = nextId('cht-l');
    const opts = (f.options || []).map((o) => (typeof o === 'string' ? { title: o, value: o } : o));
    return `<div class="fd-field" role="radiogroup" aria-labelledby="${lid}"><span class="fd-field-label" id="${lid}">${esc(f.label)}</span><div class="fd-choice-group">${opts.map((o, i) => `<label class="fd-choice"><input type="radio" name="${esc(f.name)}" value="${esc(o.value)}"${(f.value ? o.value === f.value : i === 0) ? ' checked' : ''}><span class="fd-choice-mark"></span><span class="fd-choice-body"><span class="fd-choice-title">${esc(o.title)}</span>${o.desc ? `<span class="fd-choice-desc">${esc(o.desc)}</span>` : ''}</span>${o.meta ? `<span class="fd-choice-meta">${esc(o.meta)}</span>` : ''}</label>`).join('')}</div></div>`;
  }
  return `<div class="fd-field">${label}<input class="fd-input" id="${id}" name="${esc(f.name)}" type="${esc(f.type || 'text')}" placeholder="${esc(f.placeholder || '')}" value="${esc(f.value || '')}" autocomplete="${f.type === 'email' ? 'email' : 'off'}"${f.mono ? ' data-mono spellcheck="false"' : ''}${req}>${hint}</div>`;
}

const FACES = [
  '',
  'M8 16.5c1.2-1.6 2.5-2.3 4-2.3s2.8.7 4 2.3',
  'M8.5 16c1.1-.9 2.2-1.3 3.5-1.3s2.4.4 3.5 1.3',
  'M8.5 15.25h7',
  'M8.5 14.5c1.1.9 2.2 1.3 3.5 1.3s2.4-.4 3.5-1.3',
  'M8 14c1.2 1.9 2.5 2.8 4 2.8s2.8-.9 4-2.8',
];
const faceSVG = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.25"/><path d="M9 9.75h.01M15 9.75h.01" stroke-width="2.4"/><path d="${FACES[n]}"/></svg>`;

const BLOCKS = {
  text(b, author) {
    if (b.html != null) return b.html;
    return author === 'user' ? esc(b.text) : prose(b.text, b.sources);
  },
  'quick-replies'(b) {
    const opts = (b.options || []).map((o) => (typeof o === 'string' ? { label: o } : o));
    return `<div class="fd-chat-replies" role="group" aria-label="${esc(b.label || 'Suggested replies')}">${opts.map((o, i) => `<button type="button" class="fd-chat-pill" data-value="${esc(o.value ?? o.label)}" style="--fd-i:${i}"${b.multi ? ' aria-pressed="false"' : ''}>${o.icon ? icon(o.icon) : ''}${esc(o.label)}</button>`).join('')}${b.multi ? `<button type="button" class="fd-btn" data-variant="primary" data-size="sm" data-chat-confirm disabled>${esc(b.confirm || 'Confirm')}</button>` : ''}</div>`;
  },
  actions: (b) => `<div class="fd-chat-actions-row">${(b.items || []).map(actionHTML).join('')}</div>`,
  card: (b) => cardHTML(b.card || b),
  carousel: (b) => `<div class="fd-chat-carousel" data-start><div class="fd-chat-carousel-track" tabindex="0" role="group" aria-label="${esc(b.label || 'Options')}">${(b.cards || []).map(cardHTML).join('')}</div><button type="button" class="fd-chat-carousel-btn" data-dir="prev" aria-label="Previous">${icon('chevron-left')}</button><button type="button" class="fd-chat-carousel-btn" data-dir="next" aria-label="Next">${icon('chevron-right')}</button></div>`,
  list(b) {
    const kind = b.multi ? 'checkbox' : 'radio';
    const name = esc(b.name || nextId('cht-list'));
    const opts = (b.options || []).map((o) => (typeof o === 'string' ? { title: o, value: o } : o));
    return `<form class="fd-chat-panel">${panelHead({ title: b.title, meta: b.meta ?? `${opts.length} options` }, b.icon)}<fieldset class="fd-chat-list"><legend class="fd-sr-only">${esc(b.title || 'Choose')}</legend>${opts.map((o) => `<div class="fd-chat-fold"><label class="fd-${kind} fd-chat-option"><input type="${kind}" name="${name}" value="${esc(o.value ?? o.title)}"${o.checked ? ' checked' : ''}${o.disabled ? ' disabled' : ''}><span class="fd-${kind}-box"></span><span class="fd-${kind}-text"><span class="fd-${kind}-label">${esc(o.title)}</span>${o.desc ? `<span class="fd-${kind}-desc">${esc(o.desc)}</span>` : ''}</span>${o.meta ? `<span class="fd-chat-option-meta">${esc(o.meta)}</span>` : ''}</label></div>`).join('')}</fieldset><div class="fd-chat-panel-foot"><span class="fd-chat-block-hint">${esc(b.hint || (b.multi ? 'Choose one or more' : 'Choose one'))}</span><button type="submit" class="fd-btn" data-variant="primary" data-size="sm"${opts.some((o) => o.checked) ? '' : ' disabled'}>${esc(b.confirm || 'Continue')}</button></div></form>`;
  },
  form(b) {
    return `<div class="fd-chat-panel">${panelHead(b, b.icon)}<div class="fd-chat-fold" data-part="form"><div><form class="fd-chat-form fd-chat-panel-body" data-fd-validate novalidate>${(b.fields || []).map(fieldHTML).join('')}<div class="fd-chat-form-actions">${b.cancel ? `<button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-chat-cancel>${esc(b.cancel)}</button>` : ''}<button type="submit" class="fd-btn" data-variant="primary" data-size="sm">${esc(b.submit || 'Send')}</button></div></form></div></div><div class="fd-chat-fold" data-part="summary" data-state="closed" inert><div><div class="fd-chat-summary"><div class="fd-chat-summary-head"><span class="fd-chat-done-icon">${icon('check')}</span><span class="fd-chat-panel-title">${esc(b.done || 'Sent')}</span><button type="button" class="fd-btn-text" data-chat-edit>${icon('pencil')}<span>Edit</span></button></div><dl class="fd-kv" data-cols="1" data-keys="plain"></dl></div></div></div></div>`;
  },
  details: (b) => `<div class="fd-chat-panel">${panelHead(b, b.icon)}<div class="fd-chat-panel-body"><dl class="fd-kv" data-layout="split" data-divided>${kvHTML(b.items)}</dl></div></div>`,
  table(b) {
    const cols = (b.columns || []).map((c) => (typeof c === 'string' ? { label: c } : c));
    const cell = (v, c = {}) => {
      if (v && typeof v === 'object') return `<td><span class="fd-status" data-size="sm" data-tone="${esc(v.status || 'neutral')}">${esc(v.label)}</span></td>`;
      return `<td${c.num ? ' data-num' : ''}${c.mono ? ' data-mono' : ''}>${esc(v)}</td>`;
    };
    return `<section class="fd-result"><header class="fd-result-head"><div class="fd-result-title"><span>${esc(b.title || 'Results')}</span><span class="fd-result-count">${(b.rows || []).length} rows</span></div></header><div class="fd-result-body"><table class="fd-result-table"><thead><tr>${cols.map((c) => `<th${c.num ? ' data-num' : ''}>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${(b.rows || []).map((r) => `<tr>${r.map((v, i) => cell(v, cols[i])).join('')}</tr>`).join('')}</tbody></table></div>${b.foot ? `<footer class="fd-result-foot"><span>${esc(b.foot)}</span></footer>` : ''}</section>`;
  },
  code(b) {
    if (b.json !== undefined) return `<div class="fd-json" data-toolbar data-label="${esc(b.title || 'response.json')}" data-depth="${b.depth ?? 2}" data-max-height="${b.maxHeight || 240}" data-json="${esc(JSON.stringify(b.json))}"></div>`;
    const tabs = b.tabs || [{ label: b.title || b.lang || 'Code', lang: b.lang, code: b.code }];
    const head = tabs.length > 1
      ? `<div class="fd-codeblock-tabs" data-variant="segmented" aria-label="Language">${tabs.map((t) => `<button class="fd-codeblock-tab" data-value="${esc(t.value || t.label.toLowerCase())}">${esc(t.label)}</button>`).join('')}</div>`
      : `<span class="fd-codeblock-lang">${esc(tabs[0].label)}</span>`;
    return `<div class="fd-codeblock"${b.collapse ? ` data-collapse="${b.collapse}"` : ''}><div class="fd-codeblock-head">${head}<div class="fd-codeblock-actions"><button class="fd-codeblock-copy" aria-label="Copy code">${icon('copy')}</button></div></div>${tabs.map((t) => `<pre class="fd-codeblock-body"${tabs.length > 1 ? ` data-value="${esc(t.value || t.label.toLowerCase())}"` : ''}><code data-lang="${esc(t.lang || 'bash')}">${esc(t.code)}</code></pre>`).join('')}</div>`;
  },
  attachment(b) {
    const parts = [];
    const images = b.images || [];
    if (images.length) {
      const shown = images.slice(0, 4);
      parts.push(`<div class="fd-chat-media"${images.length > 1 ? ' data-layout="grid"' : ''}>${shown.map((img, i) => {
        const more = i === 3 && images.length > 4 ? ` data-more="+${images.length - 4}"` : '';
        const label = esc(img.alt || img.name || `Image ${i + 1}`);
        const inner = img.src ? `<img src="${esc(img.src)}" alt="${label}" loading="lazy">` : `<span class="fd-chat-shot"${img.art ? ` data-art="${esc(img.art)}"` : ''} role="img" aria-label="${label}"></span>`;
        return `<button type="button" class="fd-chat-thumb" data-index="${i}"${more} aria-label="Open ${label}">${inner}</button>`;
      }).join('')}</div>`);
    }
    if (b.files?.length) parts.push(`<div class="fd-chat-files">${b.files.map(fileHTML).join('')}</div>`);
    if (b.link) {
      const l = b.link;
      const domain = l.domain || (l.url || '').replace(/^https?:\/\//, '').split('/')[0];
      parts.push(`<a class="fd-chat-linkcard" href="${esc(l.url || '#')}" target="_blank" rel="noopener"><span class="fd-tile" data-tone="${esc(l.tone || 'neutral')}">${esc((l.initial || domain || '?')[0])}</span><span class="fd-chat-linkcard-text"><span class="fd-chat-linkcard-title">${esc(l.title)}</span><span class="fd-chat-linkcard-domain">${esc(domain)}</span></span>${icon('arrow-up-right')}</a>`);
    }
    return parts.join('');
  },
  sources(b) {
    const items = b.items || [];
    const tones = [null, 'neutral', 'violet', 'info', 'success'];
    return `<div class="fd-sources" data-layout="row"><div class="fd-sources-head"><span class="fd-eyebrow">Sources</span><span class="fd-sources-count">${items.length}</span></div><div class="fd-sources-list">${items.map((s, i) => {
      const domain = (s.domain || '').split('/')[0];
      const tone = s.tone ?? tones[i % tones.length];
      return `<a class="fd-sources-item" href="${esc(s.url || `https://${s.domain}`)}" target="_blank" rel="noopener"><span class="fd-sources-meta"><span class="fd-sources-tile"${tone ? ` data-tone="${tone}"` : ''}>${esc((domain || '?')[0])}</span><span class="fd-sources-domain">${esc(domain)}</span><span class="fd-sources-num">${i + 1}</span></span><span class="fd-sources-title">${esc(s.title)}</span></a>`;
    }).join('')}</div></div>`;
  },
  tool(b) {
    const state = b.state || 'done';
    const detail = b.input !== undefined || b.output !== undefined;
    const id = nextId('cht-tc');
    const head = `<span class="fd-toolcall-status"></span><span class="fd-toolcall-name">${esc(b.name || 'Looked up')}</span><span class="fd-toolcall-args">${esc(b.args || '')}</span><span class="fd-toolcall-meta">${state === 'done' ? esc(b.meta || '') : ''}</span>`;
    if (!detail) return `<div class="fd-toolcall" data-state="${esc(state)}" data-meta="${esc(b.meta || '')}"><div class="fd-toolcall-head">${head}</div></div>`;
    const body = `${b.input !== undefined ? `<div class="fd-toolcall-label"><span class="fd-eyebrow">Input</span></div><div class="fd-json" data-depth="2" data-max-height="160" data-json="${esc(JSON.stringify(b.input))}"></div>` : ''}${b.output !== undefined ? `<div class="fd-toolcall-label"><span class="fd-eyebrow">Result</span></div><div class="fd-json" data-depth="1" data-max-height="160" data-json="${esc(JSON.stringify(b.output))}"></div>` : ''}`;
    return `<div class="fd-toolcall" data-state="${esc(state)}" data-meta="${esc(b.meta || '')}"><button type="button" class="fd-toolcall-head" aria-expanded="false" aria-controls="${id}">${head}${icon('chevron-down', { cls: 'fd-toolcall-chevron' })}</button><div class="fd-toolcall-panel" id="${id}"><div class="fd-toolcall-body">${body}</div></div></div>`;
  },
  steps: (b) => `<div class="fd-chat-panel">${panelHead(b, b.icon)}<div class="fd-chat-panel-body"><ol class="fd-run-steps">${(b.items || []).map((s) => `<li class="fd-run-steps-item" data-state="${esc(s.state || 'pending')}"><span class="fd-run-steps-icon"></span><span class="fd-run-steps-label">${esc(s.label)}<span class="fd-run-steps-detail"${s.detail ? '' : ' hidden'}>${esc(s.detail || '')}</span></span><span class="fd-run-steps-time"${s.time ? '' : ' hidden'}>${esc(s.time || '')}</span></li>`).join('')}</ol></div></div>`,
  confirm(b) {
    return `<div class="fd-chat-panel"><div class="fd-chat-confirm"><span class="fd-tile" data-tone="neutral">${icon(b.icon || 'shield')}</span><p class="fd-chat-confirm-title">${esc(b.title)}</p>${b.text ? `<p class="fd-chat-confirm-text">${esc(b.text)}</p>` : ''}</div><div class="fd-chat-fold" data-part="ask"><div><div class="fd-chat-panel-foot">${b.hint ? `<span class="fd-chat-block-hint">${esc(b.hint)}</span>` : ''}<button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-chat-cancel>${esc(b.cancel || 'Cancel')}</button><button type="button" class="fd-btn" data-variant="primary" data-size="sm" data-chat-confirm>${esc(b.confirm || 'Confirm')}</button></div></div></div><div class="fd-chat-fold" data-part="result" data-state="closed" inert><div><p class="fd-chat-result" role="status"><span class="fd-chat-done-icon">${icon('check')}</span><span></span></p></div></div></div>`;
  },
  handoff(b) {
    const agents = b.agents || DEFAULT_AGENTS;
    const pos = b.position ?? 2;
    return `<div class="fd-chat-panel"><div class="fd-chat-handoff"><span class="fd-chat-queue" aria-hidden="true"><span>${pos}</span></span><div class="fd-chat-handoff-text"><span class="fd-chat-handoff-title">${esc(b.title || 'Connecting you to support')}</span><span class="fd-chat-handoff-sub" role="status">${queueText(pos, b.wait)}</span></div><span class="fd-avatar-stack">${agents.slice(0, 3).map((a) => avatarHTML({ ...a, status: undefined }, 24)).join('')}</span></div><div class="fd-chat-fold" data-part="foot"><div><div class="fd-chat-panel-foot"><span class="fd-chat-block-hint">${esc(b.hint || `${agents.length} people on support today · replies in ${b.wait || 'about 2 min'}`)}</span><button type="button" class="fd-btn-text" data-chat-cancel>Cancel</button></div></div></div></div>`;
  },
  rating(b) {
    if (b.variant === 'helpful') {
      return `<div class="fd-chat-helpful" role="group" aria-label="${esc(b.label || 'Was this helpful?')}"><span>${esc(b.label || 'Was this helpful?')}</span><button type="button" class="fd-message-action" data-chat-helpful="up" aria-pressed="false">${icon('thumbs-up')}<span>Yes</span></button><button type="button" class="fd-message-action" data-chat-helpful="down" aria-pressed="false">${icon('thumbs-down')}<span>No</span></button></div>`;
    }
    const stars = b.variant === 'stars';
    const lid = nextId('cht-r');
    const items = [1, 2, 3, 4, 5].map((n) => `<button type="button" class="fd-chat-rate" role="radio" aria-checked="false" tabindex="${n === 1 ? 0 : -1}" data-value="${n}" aria-label="${stars ? `${n} star${n > 1 ? 's' : ''}` : RATING_LABELS[n]}">${stars ? icon('star') : faceSVG(n)}</button>`).join('');
    const comment = b.comment === false ? '' : `<div class="fd-chat-fold" data-part="comment" data-state="closed" inert><div><div class="fd-chat-rating-comment"><label class="fd-sr-only" for="${lid}-c">Comment</label><textarea class="fd-textarea" id="${lid}-c" rows="2" data-fd-autogrow data-max-rows="5" placeholder="${esc(b.placeholder || 'What could we do better? (optional)')}"></textarea><button type="button" class="fd-btn" data-variant="primary" data-size="sm" data-chat-send-rating>Send feedback</button></div></div></div>`;
    return `<div class="fd-chat-panel"><div class="fd-chat-rating"><p class="fd-chat-rating-label" id="${lid}">${esc(b.label || 'How did we do?')}</p><div class="fd-chat-rating-scale" data-variant="${stars ? 'stars' : 'faces'}" role="radiogroup" aria-labelledby="${lid}">${items}</div><p class="fd-chat-rating-hint" aria-live="polite" data-hint="${esc(b.hint || (stars ? 'Rate from 1 to 5' : 'Choose a face'))}">${esc(b.hint || (stars ? 'Rate from 1 to 5' : 'Choose a face'))}</p>${comment}<div class="fd-chat-fold" data-part="thanks" data-state="closed" inert><div><p class="fd-chat-thanks"><span class="fd-chat-done-icon">${icon('check')}</span>${esc(b.thanks || 'Thanks. Your rating goes straight to the team.')}</p></div></div></div></div>`;
  },
  schedule(b) {
    const days = b.days || [];
    const first = days.find((d) => !d.disabled);
    return `<div class="fd-chat-panel">${panelHead({ title: b.title || 'Pick a time', meta: b.duration || '30 min' }, 'calendar')}<div class="fd-chat-fold" data-part="pick"><div><div class="fd-chat-panel-body"><div class="fd-chat-days" role="group" aria-label="Day">${days.map((d) => `<button type="button" class="fd-chat-day" data-value="${esc(d.value)}" aria-pressed="${d === first}"${d.disabled ? ' disabled' : ''} aria-label="${esc(`${d.label}, ${d.month || ''} ${d.date}`)}"><span>${esc(d.label)}</span><b>${esc(d.date)}</b></button>`).join('')}</div><div class="fd-chat-slots" role="group" aria-label="Time">${first ? slotsHTML(b.slots?.[first.value]) : ''}</div><p class="fd-chat-block-hint">Times are in ${esc(b.timezone || 'your time zone')}</p></div><div class="fd-chat-panel-foot"><span class="fd-chat-block-hint" data-chat-pick>Choose a time</span><button type="button" class="fd-btn" data-variant="primary" data-size="sm" data-chat-confirm disabled>${esc(b.confirm || 'Book call')}</button></div></div></div><div class="fd-chat-fold" data-part="booked" data-state="closed" inert><div><div class="fd-chat-booked"><span class="fd-chat-cal" aria-hidden="true"><span></span><b></b></span><div><p class="fd-chat-confirm-title" data-chat-when></p><p class="fd-chat-confirm-text">${esc(b.with || 'A calendar invite is on its way.')}</p></div></div><div class="fd-chat-panel-foot"><button type="button" class="fd-btn" data-size="sm" data-chat-ics>${icon('calendar')}<span>Add to calendar</span></button><button type="button" class="fd-btn-text" data-chat-reschedule>Change time</button></div></div></div></div>`;
  },
  metric(b) {
    const spark = b.series?.length ? `<span class="fd-sparkline" data-values="${esc(b.series.join(','))}"${b.chart === 'line' ? ' data-area data-dot' : ' data-type="bars"'} data-width="112" data-height="36" data-tone="accent" data-label="${esc(b.seriesLabel || 'Daily usage')}"></span>` : '';
    return `<div class="fd-chat-panel">${panelHead(b, b.icon)}<div class="fd-chat-metric"><div class="fd-chat-metric-top"><div class="fd-chat-metric-figure"><b>${fmtN(b.figure ?? b.value)}</b><span>${esc(b.caption || `${b.unit || ''} used`)}</span></div>${spark}</div><div class="fd-meter" data-size="sm" data-value="${esc(b.value)}" data-max="${esc(b.max)}" data-unit="${esc(b.unit || '')}"><div class="fd-meter-head"><span class="fd-meter-label">${esc(b.label || 'This cycle')}</span><span class="fd-meter-figure" data-auto></span></div><div class="fd-meter-track"><div class="fd-meter-fill"></div></div>${b.foot ? `<p class="fd-meter-foot">${esc(b.foot)}</p>` : ''}</div></div></div>`;
  },
  notice(b) {
    const tone = b.tone || 'info';
    const ic = b.icon || { info: 'info', warning: 'triangle-alert', danger: 'circle-alert', success: 'circle-check' }[tone] || 'info';
    return `<div class="fd-callout" data-tone="${esc(tone)}" role="note">${icon(ic, { cls: 'fd-callout-icon' })}<div class="fd-callout-content">${b.title ? `<p class="fd-callout-title">${esc(b.title)}</p>` : ''}${b.text ? `<p class="fd-callout-body">${esc(b.text)}</p>` : ''}${b.actions?.length ? `<div class="fd-callout-actions">${b.actions.map(actionHTML).join('')}</div>` : ''}</div></div>`;
  },
};
const slotsHTML = (slots = []) => slots.map((s, i) => {
  const t = typeof s === 'string' ? { time: s } : s;
  return `<button type="button" class="fd-chat-slot" data-value="${esc(t.time)}" aria-pressed="false" style="--fd-i:${i}"${t.disabled ? ' disabled' : ''}>${esc(t.time)}</button>`;
}).join('');
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th'}`;
const queueText = (pos, wait = 'about 2 min') => (pos > 0 ? `You're ${ordinal(pos + 1)} in line · ${esc(wait)}` : 'Joining now…');

function fileHTML(f = {}) {
  const kind = f.kind || kindOf(f.name, f.type);
  const state = f.state || 'done';
  const p = state === 'uploading' ? Math.round(f.progress ?? 0) : 100;
  const meta = state === 'uploading' ? `Uploading · ${p}%` : state === 'failed' ? esc(f.error || 'Upload failed') : `${f.size != null ? (typeof f.size === 'number' ? fmtSize(f.size) : esc(f.size)) : ''}${f.size != null ? ' · ' : ''}${esc((f.name || '').split('.').pop().toUpperCase())}`;
  const name = esc(f.name);
  let action = '';
  if (state === 'failed') action = `<button type="button" class="fd-btn" data-variant="ghost" data-size="xs" data-icon-only data-chat-retry aria-label="Retry ${name}">${icon('rotate-ccw')}</button>`;
  else if (state === 'uploading') action = `<button type="button" class="fd-btn" data-variant="ghost" data-size="xs" data-icon-only data-chat-cancel-upload aria-label="Cancel upload of ${name}">${icon('x')}</button>`;
  else if (f.url) action = `<a class="fd-btn" data-variant="ghost" data-size="xs" data-icon-only href="${esc(f.url)}" download="${name}" aria-label="Download ${name}">${icon('download')}</a>`;
  else action = `<button type="button" class="fd-btn" data-variant="ghost" data-size="xs" data-icon-only data-chat-download aria-label="Download ${name}">${icon('download')}</button>`;
  return `<div class="fd-chat-file" data-state="${state}" data-name="${name}" style="--_cht-p:${p}%"><span class="fd-tile" data-size="28" data-tone="${kind === 'pdf' ? 'danger' : kind === 'sheet' ? 'success' : 'neutral'}">${icon(KIND_ICON[kind] || 'file')}</span><span class="fd-chat-file-text"><span class="fd-chat-file-name">${name}</span><span class="fd-chat-file-meta">${meta}</span></span>${action}</div>`;
}

function blockHTML(b = {}, author = 'ai') {
  if (typeof b === 'string') b = { type: 'text', text: b };
  const type = BLOCKS[b.type] ? b.type : 'text';
  const attrs = [`data-type="${type}"`];
  if (b.id) attrs.push(`data-id="${esc(b.id)}"`);
  if (type === 'quick-replies' && b.multi) attrs.push('data-multi');
  if (type === 'confirm') attrs.push(`data-done="${esc(b.done || 'Done')}"`, `data-cancelled="${esc(b.cancelled || 'Cancelled')}"`);
  if (type === 'attachment' && b.images?.length) attrs.push(`data-images="${esc(JSON.stringify(b.images))}"`);
  if (type === 'schedule') attrs.push(`data-slots="${esc(JSON.stringify(b.slots || {}))}"`, `data-days="${esc(JSON.stringify(b.days || []))}"`, `data-timezone="${esc(b.timezone || '')}"`);
  if (type === 'handoff') attrs.push(`data-wait="${esc(b.wait || 'about 2 min')}"`);
  return `<div class="fd-chat-block" ${attrs.join(' ')}>${BLOCKS[type](b, author)}</div>`;
}

function blocksOf(m) {
  const list = [];
  if (m.text != null || m.html != null) list.push({ type: 'text', text: m.text, html: m.html });
  return list.concat(m.blocks || []);
}

const RECEIPTS = {
  sending: () => `<span class="fd-spinner" data-size="12" aria-hidden="true"></span>Sending…`,
  sent: () => `${icon('check')}Sent`,
  delivered: () => `${icon('check-check')}Delivered`,
  read: () => `${icon('check-check')}Read`,
  failed: () => `${icon('circle-alert')}Not sent<button type="button" class="fd-btn-text" data-chat-retry>Retry</button>`,
};
const receiptHTML = (state) => (RECEIPTS[state] ? `<span class="fd-chat-receipt" data-state="${state}">${RECEIPTS[state]()}</span>` : '');

/**
 * Build a message element from data:
 * { id, author: 'user'|'ai'|'human'|'system', name, role, avatar: { initials, src, status, tone }, time,
 *   state: 'sending'|'sent'|'delivered'|'read'|'failed', text, html, quote: { name, text }, blocks: [{ type, … }],
 *   tone (system), icon (system) }
 */
export function render(m = {}) {
  if (typeof m === 'string') m = { author: 'ai', text: m };
  const author = AUTHORS.has(m.author) ? m.author : 'ai';
  const el = document.createElement(author === 'system' ? 'div' : 'article');
  el.className = 'fd-chat-msg';
  el.dataset.author = author;
  el.dataset.id = m.id || nextId('msg');
  const time = toDate(m.time);
  if (time) el.dataset.time = time.toISOString();
  if (author === 'system') {
    if (m.tone) el.dataset.tone = m.tone;
    el.innerHTML = `<span class="fd-chat-system-text">${m.icon ? icon(m.icon) : ''}<span>${m.html ?? esc(m.text ?? '')}</span></span>`;
    return el;
  }
  const name = m.name || (author === 'ai' ? AI_NAME : author === 'user' ? 'You' : 'Support');
  if (author === 'human') el.dataset.name = name;
  const avatar = author === 'user' ? '' : `<div class="fd-chat-msg-avatar">${author === 'ai' ? markHTML() : avatarHTML({ name, ...(m.avatar || {}) }, 28)}</div>`;
  const head = author === 'user' ? '' : `<header class="fd-chat-msg-head"><span class="fd-chat-msg-name">${esc(name)}</span>${author === 'ai' ? '<span class="fd-chat-badge">AI</span>' : ''}${m.role ? `<span class="fd-chat-msg-role">${esc(m.role)}</span>` : ''}${time ? `<time class="fd-chat-msg-time" datetime="${time.toISOString()}">${fmtTime(time)}</time>` : ''}</header>`;
  const stamp = time ? `<time class="fd-chat-msg-stamp" aria-hidden="true">${fmtShort(time)}</time>` : '';
  const quote = m.quote ? `<p class="fd-chat-msg-quote"><b>${esc(m.quote.name || '')}</b> ${esc(m.quote.text || '')}</p>` : '';
  const body = blocksOf(m).map((b) => blockHTML(b, author)).join('');
  const meta = author === 'user' && m.state ? `<div class="fd-chat-msg-meta">${receiptHTML(m.state)}</div>` : '';
  el.innerHTML = `${avatar}<div class="fd-chat-msg-main">${stamp}${head}${quote}<div class="fd-chat-msg-body">${body}</div><div class="fd-chat-msg-reactions"></div>${meta}</div>`;
  return el;
}

function actionsHTML(author) {
  const b = (action, ic, label, extra = '') => `<button type="button" class="fd-message-action" data-chat-action="${action}" aria-label="${label}"${extra}>${icon(ic)}</button>`;
  const tools = b('copy', 'copy', 'Copy message') + b('react', 'heart', 'Add a reaction', ' aria-expanded="false"') + b('reply', 'corner-down-left', 'Reply')
    + (author === 'ai' ? b('up', 'thumbs-up', 'Good answer', ' aria-pressed="false"') + b('down', 'thumbs-down', 'Bad answer', ' aria-pressed="false"') : '');
  const picker = REACTIONS.map(([ic, label], i) => `<button type="button" class="fd-message-action" data-reaction="${ic}" aria-label="${label}" style="--fd-i:${i}">${icon(ic)}</button>`).join('');
  return `<div class="fd-chat-msg-actions" role="toolbar" aria-label="Message actions"><div class="fd-chat-msg-tools">${tools}</div><div class="fd-chat-react-picker" role="group" aria-label="Reactions">${picker}</div></div>`;
}

/* Prepare a message for the log: actions toolbar, hover stamp, enhancements. Works on authored markup too. */
function prepare(msg) {
  if (!once(msg, 'fd-chat-msg')) return;
  if (!msg.dataset.id) msg.dataset.id = nextId('msg');
  const author = msg.dataset.author;
  if (author === 'system' || msg.hasAttribute('data-typing')) return;
  const main = $(':scope > .fd-chat-msg-main', msg);
  const time = toDate(msg.dataset.time);
  if (main && time && !$('.fd-chat-msg-stamp', main)) main.insertAdjacentHTML('afterbegin', `<time class="fd-chat-msg-stamp" aria-hidden="true">${fmtShort(time)}</time>`);
  if (main && !$('.fd-chat-msg-reactions', main)) $('.fd-chat-msg-body', main)?.insertAdjacentHTML('afterend', '<div class="fd-chat-msg-reactions"></div>');
  if (!$(':scope > .fd-chat-msg-actions', msg)) msg.insertAdjacentHTML('beforeend', actionsHTML(author));
  enhance(msg);
}

/* Consecutive messages from the same author within 2 minutes form a run. */
function regroup(log) {
  if (!log) return;
  let prev = null;
  for (const el of log.children) {
    if (!el.classList.contains('fd-chat-msg')) continue;
    const a = el.dataset.author;
    let same = !!prev && prev.dataset.author === a && a !== 'system';
    if (same && a === 'human') same = (prev.dataset.name || '') === (el.dataset.name || '');
    if (same) {
      const t1 = toDate(prev.dataset.time);
      const t2 = toDate(el.dataset.time);
      if (t1 && t2) same = Math.abs(t2 - t1) <= 120000;
    }
    el.toggleAttribute('data-continued', same);
    prev = el;
  }
}

function setReceipt(msg, state) {
  const main = $(':scope > .fd-chat-msg-main', msg);
  if (!main) return;
  let meta = $(':scope > .fd-chat-msg-meta', main);
  if (!state) { meta?.remove(); return; }
  if (!meta) { meta = document.createElement('div'); meta.className = 'fd-chat-msg-meta'; main.append(meta); }
  if (meta.firstElementChild?.dataset.state === state) return;
  meta.innerHTML = receiptHTML(state);
}

function typingEl(author, o = {}) {
  const el = document.createElement('div');
  el.className = 'fd-chat-msg';
  el.dataset.author = author;
  el.dataset.typing = '';
  if (author === 'ai') {
    el.innerHTML = `<div class="fd-chat-msg-avatar">${markHTML()}</div><div class="fd-chat-msg-main"><div class="fd-chat-msg-body"><div class="fd-message-thinking" role="status"><span class="fd-message-status">${esc(o.label || 'Thinking…')}</span></div></div></div>`;
  } else {
    const name = o.name || 'Support';
    el.dataset.name = name;
    el.innerHTML = `<div class="fd-chat-msg-avatar">${avatarHTML({ name, ...(o.avatar || {}) }, 28)}</div><div class="fd-chat-msg-main"><div class="fd-chat-msg-body"><span class="fd-chat-typing" aria-hidden="true"><span class="fd-message-dots"><i></i><i></i><i></i></span></span><span class="fd-chat-typing-label" role="status">${esc(o.label || `${name} is typing`)}</span></div></div>`;
  }
  return el;
}

/* ==========================================================================
   Default chat (an empty .fd-chat is filled with this)
   ========================================================================== */
const DEFAULT_AGENTS = [
  { name: 'Maya Okafor', initials: 'MO', tone: 'accent' },
  { name: 'Jonas Lind', initials: 'JL' },
  { name: 'Priya Anand', initials: 'PA' },
];
const HISTORY = [
  { id: 'cv-412', title: 'Refund for an unused top-up', preview: 'Maya: It is on its way back to your Visa.', time: '2h', state: 'resolved', who: { name: 'Maya Okafor', initials: 'MO', tone: 'accent' } },
  { id: 'cv-409', title: 'Webhook returns 502 after deploy', preview: 'You: It started after Tuesday’s release on our side.', time: 'Nov 12', state: 'waiting', unread: true, who: { name: 'Jonas Lind', initials: 'JL' } },
  { id: 'cv-398', title: 'Crawl stops at 412 pages', preview: 'Ember AI: Set maxDepth to 3 and add includePaths.', time: 'Nov 9', state: 'resolved' },
  { id: 'cv-371', title: 'SSO for Quarry Labs', preview: 'Priya: Okta is connected. Invite the rest of the team.', time: 'Nov 3', state: 'open', who: { name: 'Priya Anand', initials: 'PA' } },
  { id: 'cv-356', title: 'How are credits counted?', preview: 'Ember AI: One credit per page; failed requests are free.', time: 'Oct 29', state: 'resolved' },
];
const STATE_BADGE = { open: ['info', 'Open'], waiting: ['warning', 'Waiting'], resolved: ['neutral', 'Resolved'] };
export function historyItemHTML(h) {
  const [tone, label] = STATE_BADGE[h.state] || STATE_BADGE.open;
  return `<li><button type="button" class="fd-chat-thread" data-value="${esc(h.id)}"${h.unread ? ' data-unread' : ''}>${h.who ? avatarHTML(h.who, 28) : markHTML(28)}<span class="fd-chat-thread-title"><span>${esc(h.title)}</span></span><span class="fd-chat-thread-preview">${esc(h.preview)}</span><span class="fd-chat-thread-side"><time>${esc(h.time)}</time><span class="fd-badge" data-tone="${tone}" data-dot>${label}</span></span></button></li>`;
}

/** The default Ember support chat as markup: head, four views, composer, drop overlay. */
export function scaffold({ id = nextId('fd-chat'), title = 'Ember support', greeting = 'Hi there, how can we <span class="fd-accent-text">help</span>?', intro = 'Ask anything about Ember. I can search the docs, look into your requests and find your invoices.', suggestions = ['Why did my request fail?', 'How do credits and billing work?', 'Show my recent invoices', 'I’m hitting rate limits'], banner = null } = {}) {
  const ghost = (attrs, ic, label, tip) => `<button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-icon-only ${attrs} aria-label="${label}" data-fd-tooltip="${tip || label}">${icon(ic)}</button>`;
  return `<header class="fd-chat-head">
  <div class="fd-chat-who">${markHTML(28)}<div class="fd-chat-who-text"><h2 class="fd-chat-title" id="${id}-title">${esc(title)}</h2><p class="fd-chat-status" aria-live="polite">Ember AI · answers instantly</p></div></div>
  <div class="fd-chat-actions">
    ${ghost('data-fd-chat-view="history" aria-pressed="false"', 'history', 'Conversation history', 'History')}
    ${ghost('data-fd-chat-expand aria-pressed="false"', 'maximize-2', 'Expand')}
    ${ghost(`data-fd-menu="${id}-menu" data-placement="bottom-end"`, 'ellipsis', 'Conversation options', 'More')}
    ${ghost('data-fd-chat-minimize', 'minus', 'Minimize')}
    ${ghost('data-fd-chat-close', 'x', 'Close')}
    <div class="fd-menu" id="${id}-menu" popover role="menu" aria-label="Conversation">
      <button class="fd-menu-item" data-value="transcript">${icon('mail')}<span class="fd-menu-item-label">Email transcript</span></button>
      <button class="fd-menu-item" role="menuitemcheckbox" aria-checked="false" data-close data-value="mute">${icon('bell-off')}<span class="fd-menu-item-label">Mute notifications</span></button>
      <hr class="fd-menu-sep">
      <button class="fd-menu-item" data-tone="danger" data-value="end">${icon('circle-x')}<span class="fd-menu-item-label">End conversation</span></button>
    </div>
  </div>
</header>
${banner ? `<div class="fd-chat-banner" data-tone="${esc(banner.tone || 'warning')}" role="status">${icon(banner.icon || 'triangle-alert')}<span class="fd-chat-banner-text">${banner.html || esc(banner.text)}</span>${banner.href ? `<a class="fd-btn-text" href="${esc(banner.href)}" target="_blank" rel="noopener"><span>${esc(banner.link || 'Status')}</span>${nudge('arrow-up-right')}</a>` : ''}</div>` : ''}
<div class="fd-chat-body">
  <div class="fd-chat-view" data-view="home">
    <div class="fd-chat-home">
      <div class="fd-chat-home-head"><h3 class="fd-chat-greeting">${greeting}</h3><p class="fd-chat-intro">${esc(intro)}</p></div>
      <div class="fd-chat-suggestions" role="group" aria-label="Suggested questions">${suggestions.map((s, i) => `<button type="button" class="fd-chat-pill" style="--fd-i:${i}">${esc(s)}</button>`).join('')}</div>
      <button type="button" class="fd-chat-continue" data-fd-chat-view="conversation" hidden>${markHTML(28)}<span class="fd-chat-continue-label">Continue conversation</span><span class="fd-chat-continue-text"></span><span class="fd-chat-continue-meta"><time></time><span class="fd-chat-unread-dot" hidden></span></span></button>
      <div class="fd-chat-home-foot">
        <div class="fd-chat-links">
          <a class="fd-btn" data-size="sm" href="https://docs.ember.dev" target="_blank" rel="noopener">${icon('book-open')}<span>Docs</span></a>
          <a class="fd-btn" data-size="sm" href="https://status.ember.dev" target="_blank" rel="noopener">${icon('activity')}<span>Status</span></a>
          <a class="fd-btn" data-size="sm" href="https://docs.ember.dev/changelog" target="_blank" rel="noopener">${icon('scroll-text')}<span>Changelog</span></a>
        </div>
        <p class="fd-chat-service"><span class="fd-status" data-size="sm" data-tone="success">All systems operational</span><span class="fd-chat-service-time">Updated 2m ago</span></p>
      </div>
    </div>
  </div>
  <div class="fd-chat-view" data-view="conversation" hidden>
    <div class="fd-chat-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation"></div>
  </div>
  <div class="fd-chat-view" data-view="history" hidden>
    <div class="fd-chat-history">
      <div class="fd-chat-history-head"><button type="button" class="fd-btn-text" data-fd-chat-view="back">${icon('arrow-left')}<span>Back</span></button><button type="button" class="fd-btn" data-size="sm" data-fd-chat-new>${icon('square-pen')}<span>New conversation</span></button></div>
      <div class="fd-search"><i data-icon="search"></i><input class="fd-search-input" type="search" placeholder="Search conversations" aria-label="Search conversations"><button class="fd-search-clear" type="button" aria-label="Clear search">${icon('x')}</button></div>
      <p class="fd-chat-history-label fd-eyebrow">Recent</p>
      <ul class="fd-chat-history-list">${HISTORY.map(historyItemHTML).join('')}</ul>
      <div class="fd-empty" data-size="sm" hidden><span class="fd-empty-icon">${icon('search')}</span><h3 class="fd-empty-title">No conversations match</h3><p class="fd-empty-text">Try a request ID, an endpoint or a word from the answer.</p></div>
    </div>
  </div>
  <div class="fd-chat-view" data-view="offline" hidden>
    <div class="fd-chat-offline">
      <div class="fd-chat-offline-head"><span class="fd-avatar-stack">${DEFAULT_AGENTS.map((a) => avatarHTML({ ...a, status: 'offline' }, 28)).join('')}</span><h3 class="fd-title">Support is away</h3><p class="fd-chat-intro">We’re back at 9:00 CET. Leave a message and we’ll reply by email, usually within 4 hours.</p></div>
      ${blockHTML({ type: 'form', title: 'Leave a message', icon: 'mail', submit: 'Send message', done: 'Message sent · we’ll reply by email', fields: [{ type: 'email', name: 'email', label: 'Email', value: 'maya@quarry.dev', required: true, error: 'Enter the email we should reply to.' }, { type: 'select', name: 'topic', label: 'Topic', options: ['A failed request', 'Billing and credits', 'Account and team', 'Something else'] }, { type: 'textarea', name: 'message', label: 'Message', placeholder: 'What happened, and what did you expect?', required: true, minlength: 10, error: 'Tell us a little about the problem.' }] })}
    </div>
  </div>
  <button type="button" class="fd-chat-jump" aria-label="Jump to new messages">${icon('arrow-down')}<span>New messages</span><span class="fd-chat-jump-count" hidden></span></button>
</div>
<footer class="fd-chat-foot">
  <p class="fd-chat-closed">${icon('circle-check')}<span class="fd-chat-closed-text">This conversation is closed.</span><button type="button" class="fd-btn-text" data-tone="accent" data-fd-chat-new>Start a new one</button></p>
  <form class="fd-composer">
    <textarea class="fd-composer-input" rows="1" placeholder="Ask a question…" aria-label="Message"></textarea>
    <div class="fd-composer-tools">
      <button type="button" class="fd-composer-tool" data-fd-menu="${id}-plus" data-placement="top-start" aria-label="Add to message">${icon('plus')}</button>
      <div class="fd-menu" id="${id}-plus" popover role="menu" aria-label="Add to message">
        <button class="fd-menu-item" data-value="attach">${icon('paperclip')}<span class="fd-menu-item-label">Attach file</span></button>
        <button class="fd-menu-item" data-value="request">${icon('hash')}<span class="fd-menu-item-label">Share a request ID</span></button>
        <button class="fd-menu-item" data-value="screenshot">${icon('camera')}<span class="fd-menu-item-label">Share a screenshot</span></button>
        <hr class="fd-menu-sep">
        <button class="fd-menu-item" data-value="person">${icon('users')}<span class="fd-menu-item-label">Talk to a person</span></button>
      </div>
      <button type="button" class="fd-composer-tool" data-fd-chat-attach aria-label="Attach a file">${icon('paperclip')}</button>
      <input type="file" class="fd-sr-only" multiple data-fd-chat-files tabindex="-1" aria-hidden="true">
      <button class="fd-composer-send" type="submit" aria-label="Send">${icon('arrow-up')}</button>
    </div>
  </form>
  <p class="fd-chat-disclaimer">Ember AI can make mistakes. Check important details.</p>
</footer>
<div class="fd-chat-drop" aria-hidden="true">${icon('cloud-upload')}<span>Drop files to attach</span><small>Up to 10 MB each</small></div>`;
}

/* ==========================================================================
   Controller
   ========================================================================== */
const CONTROLLERS = new WeakMap();
const TIMERS = new WeakMap();
const UPLOADS = new WeakMap();
const store = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

/** The controller for a chat (or a bare .fd-chat-log). Accepts an element inside it, the element, or its id. */
export function get(el) {
  if (typeof el === 'string') el = document.getElementById(el.replace(/^#/, ''));
  if (!(el instanceof Element)) return null;
  const root = el.closest('.fd-chat') || el.closest('.fd-chat-log');
  if (!root) return null;
  let c = CONTROLLERS.get(root);
  if (!c) { c = new Chat(root); CONTROLLERS.set(root, c); }
  return c;
}

class Chat {
  constructor(root) {
    this.root = root;
    this.unread = 0;
    this.run = null;
    this.instant = false;
    this.scripted = false;
    this.prevView = 'home';
    this.agent = { kind: 'ai' };
    this.isLog = root.classList.contains('fd-chat-log');
    if (this.isLog) { $$(':scope > .fd-chat-msg', root).forEach(prepare); regroup(root); return; }
    this.setup();
  }

  get el() { return this.root; }
  get log() { return this.isLog ? this.root : $('.fd-chat-log', this.root); }
  get composer() { return this.isLog ? null : $('.fd-chat-foot .fd-composer', this.root) || $('.fd-composer', this.root); }
  get input() { return this.composer ? $('.fd-composer-input', this.composer) : null; }
  get scroller() { const log = this.log; return log?.closest('.fd-chat-view') || log; }
  get mode() { return this.root.dataset.mode || 'panel'; }
  get floating() { return !this.isLog && this.mode !== 'inline'; }
  get isOpen() { return !this.floating || this.root.dataset.state === 'open'; }
  get view() { return this.root.dataset.view || 'conversation'; }
  get contained() { return this.root.hasAttribute('data-contained'); }
  get persists() { return !this.isLog && !!this.root.id && (this.contained ? this.root.hasAttribute('data-persist') && this.root.dataset.persist !== 'false' : this.root.dataset.persist !== 'false'); }
  get fast() { return this.instant || reducedMotion(); }
  now() { return this.clock ? new Date(this.clock) : new Date(); }

  setup() {
    const root = this.root;
    ensureId(root, 'fd-chat');
    const scaffolded = !root.children.length;
    if (scaffolded) {
      const d = root.dataset;
      root.innerHTML = scaffold({ id: root.id, title: d.title || undefined, banner: d.banner ? { text: d.banner, tone: d.bannerTone, href: d.bannerHref, link: d.bannerLink } : null });
      upgradeIcons(root);
    }
    if (!root.dataset.mode) root.dataset.mode = 'panel';
    const title = $('.fd-chat-title', root);
    if (!root.hasAttribute('aria-label') && title) root.setAttribute('aria-labelledby', ensureId(title, 'fd-chat-title'));
    if (!root.dataset.agent) root.dataset.agent = 'ai';
    $$('button:not([type])', root).forEach((b) => { if (!b.closest('.fd-composer') || !b.classList.contains('fd-composer-send')) b.type = 'button'; });
    // Views: the visible one names the chat's view.
    const views = this.views();
    if (views.length) {
      const wanted = root.dataset.view || views.find((v) => !v.hidden)?.dataset.view || 'home';
      views.forEach((v) => { v.hidden = v.dataset.view !== wanted; });
      root.dataset.view = wanted;
    }
    $$('[data-fd-chat-view="history"]', root).forEach((b) => b.setAttribute('aria-pressed', String(this.view === 'history')));
    // Messages already in the markup.
    const log = this.log;
    if (log) { $$(':scope > .fd-chat-msg', log).forEach(prepare); regroup(log); }
    // Restore a remembered state.
    const saved = this.persists ? store.get(`fd-chat:${root.id}`) : null;
    if (saved?.mode && MODES.has(saved.mode)) root.dataset.mode = saved.mode;
    if (saved) root.toggleAttribute('data-expanded', !!saved.expanded);
    if (this.floating) {
      if (!root.dataset.state) root.dataset.state = 'closed';
      if (saved?.open) root.dataset.state = 'open';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'false');
      root.inert = root.dataset.state !== 'open';
      if (saved?.open) { root.setAttribute('data-instant', ''); requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-instant'))); this.modal(true); }
    } else root.setAttribute('role', 'region');
    this.syncExpand();
    this.syncLaunchers();
    this.syncContinue();
    this.bindRoot();
    if (scaffolded && root.dataset.agent !== 'ai') { this.instant = true; this.setAgent({ kind: root.dataset.agent }); this.instant = false; }
  }

  views() { return $$('.fd-chat-view', this.root).filter((v) => v.closest('.fd-chat') === this.root); }

  bindRoot() {
    const root = this.root;
    root.addEventListener('fd:submit', (e) => {
      if (e.target === root) return;
      const composer = e.target.closest?.('.fd-composer');
      if (!composer || composer !== this.composer) return;
      e.stopPropagation();
      const value = e.detail?.value ?? '';
      if (root.dataset.editing) { this.finishEdit(value); return; }
      const chips = $$('.fd-composer-attachment', composer).filter((c) => c.dataset.state !== 'removing' && !c.dataset.upload);
      const attachments = chips.map((c) => UPLOADS.get(c)).filter(Boolean);
      const quote = this.quoteData;
      const el = this.send(value, { attachments, quote });
      if (!el) { e.preventDefault(); return; }
      chips.forEach((c) => c.remove());
      $('.fd-composer-attachments', composer)?.replaceChildren(...$$('.fd-composer-attachment', composer));
      this.clearQuote();
    });
    root.addEventListener('fd:stop', (e) => { if (e.target.closest?.('.fd-composer') === this.composer) { e.stopPropagation(); this.stopRun({ by: 'person' }); } });
    root.addEventListener('fd:select', (e) => {
      const item = e.target;
      const menu = item.closest?.('.fd-menu');
      if (!menu || !root.contains(menu) || !item.dataset.value) return;
      this.menuAction(item.dataset.value, item);
    });
    root.addEventListener('keydown', (e) => this.onKey(e));
    root.addEventListener('scroll', (e) => { if (e.target === this.scroller && this.nearBottom()) this.hideJump(); }, true);
    root.addEventListener('paste', (e) => {
      if (!e.target.closest?.('.fd-composer-input')) return;
      const files = [...(e.clipboardData?.files || [])];
      if (files.length) { e.preventDefault(); this.addFiles(files); }
    });
    root.addEventListener('change', (e) => {
      if (!e.target.matches?.('[data-fd-chat-files]')) return;
      this.addFiles([...e.target.files]);
      e.target.value = '';
    });
    let depth = 0;
    const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
    root.addEventListener('dragenter', (e) => { if (!hasFiles(e) || !this.composer || root.hasAttribute('data-disabled')) return; e.preventDefault(); depth++; root.dataset.dragging = ''; });
    root.addEventListener('dragover', (e) => { if (hasFiles(e) && this.composer) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
    root.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) delete root.dataset.dragging; });
    root.addEventListener('drop', (e) => {
      if (!hasFiles(e) || !this.composer) return;
      e.preventDefault();
      depth = 0;
      delete root.dataset.dragging;
      this.addFiles([...e.dataTransfer.files]);
      this.input?.focus({ preventScroll: true });
    });
  }

  onKey(e) {
    const input = e.target.closest?.('.fd-composer-input');
    if (input && input === this.input) {
      if (e.key === 'ArrowUp' && !input.value && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const last = $$('.fd-chat-msg[data-author="user"]', this.log).filter((m) => $('.fd-chat-block[data-type="text"]', m)).pop();
        if (last) { e.preventDefault(); this.startEdit(last); }
        return;
      }
      if (e.key === 'Escape' && (this.root.dataset.editing || this.quoteData)) { e.preventDefault(); this.cancelEdit(); this.clearQuote(); return; }
    }
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (e.target.closest?.('.fd-chat-msg-actions[data-picking]')) { e.preventDefault(); this.closePicker(e.target.closest('.fd-chat-msg-actions')); return; }
    if ($$('.fd-menu', this.root).some((m) => m.matches(':popover-open') || m.dataset.state === 'open')) return;
    if (this.floating && this.isOpen) { e.preventDefault(); this.close(); }
  }

  /* ---------- Open, close, mode ---------- */
  launchers() {
    if (!this.root.id) return [];
    const id = CSS.escape(this.root.id);
    return $$(`[data-fd-chat-toggle="${id}"], [data-fd-chat-open="${id}"]`);
  }
  syncLaunchers() {
    const open = this.isOpen && this.floating;
    this.launchers().forEach((l) => {
      l.setAttribute('aria-controls', this.root.id);
      if (l.hasAttribute('data-fd-chat-toggle')) l.setAttribute('aria-expanded', String(open));
    });
  }
  origin() {
    const launcher = this.launchers().find((l) => l.getClientRects().length);
    if (!launcher) { this.root.style.removeProperty('transform-origin'); return; }
    const a = launcher.getBoundingClientRect();
    const r = this.root.getBoundingClientRect();
    this.root.style.transformOrigin = `${Math.round(a.left + a.width / 2 - r.left)}px ${Math.round(a.top + a.height / 2 - r.top)}px`;
  }
  open({ trigger = null, focus = true, instant = false } = {}) {
    if (!this.floating || this.root.dataset.state === 'open') return;
    this.trigger = trigger || (document.activeElement !== document.body ? document.activeElement : null);
    if (instant) { this.root.setAttribute('data-instant', ''); requestAnimationFrame(() => requestAnimationFrame(() => this.root.removeAttribute('data-instant'))); }
    if (this.mode === 'popup') this.origin();
    this.root.inert = false;
    this.root.dataset.state = 'open';
    this.syncLaunchers();
    this.setUnread(0);
    this.hideTeasers();
    this.modal(true);
    if (this.view === 'conversation') this.toBottom(true);
    if (focus) requestAnimationFrame(() => this.focusEntry());
    this.save();
    emit(this.root, 'fd:open', { mode: this.mode });
  }
  close({ returnFocus = true } = {}) {
    if (!this.floating || this.root.dataset.state !== 'open') return;
    const hadFocus = this.root.contains(document.activeElement);
    this.root.dataset.state = 'closed';
    this.root.inert = true;
    this.modal(false);
    this.syncLaunchers();
    if (returnFocus && hadFocus) {
      const launcher = this.launchers().find((l) => l.getClientRects().length);
      (launcher || this.trigger)?.focus?.({ preventScroll: true });
    }
    this.save();
    emit(this.root, 'fd:close', { mode: this.mode });
  }
  toggle(opts) { if (this.floating && this.isOpen) this.close(opts); else this.open(opts); }
  focusEntry() {
    const input = this.input;
    if (input && !input.disabled && ['home', 'conversation'].includes(this.view)) input.focus({ preventScroll: true });
    else $('.fd-chat-view:not([hidden]) :is(button, input, a[href])', this.root)?.focus({ preventScroll: true });
  }
  modal(on) {
    this.release?.();
    this.release = null;
    const modal = on && this.floating && !this.contained && isPhone();
    this.root.setAttribute('aria-modal', String(modal));
    if (modal) {
      const untrap = trapFocus(this.root);
      document.documentElement.setAttribute('data-fd-scroll-lock', '');
      this.release = () => { untrap(); document.documentElement.removeAttribute('data-fd-scroll-lock'); };
    }
  }
  setMode(mode) {
    if (!MODES.has(mode) || this.isLog) return;
    const wasOpen = this.isOpen;
    this.root.setAttribute('data-instant', '');
    this.root.dataset.mode = mode;
    if (mode === 'inline') { this.root.inert = false; this.root.setAttribute('role', 'region'); this.modal(false); } else {
      this.root.setAttribute('role', 'dialog');
      this.root.dataset.state = wasOpen ? 'open' : 'closed';
      this.root.inert = !wasOpen;
      this.modal(wasOpen);
    }
    requestAnimationFrame(() => requestAnimationFrame(() => this.root.removeAttribute('data-instant')));
    this.syncLaunchers();
    this.save();
    emit(this.root, 'fd:change', { value: mode, kind: 'mode' });
  }
  expand(on = !this.root.hasAttribute('data-expanded')) {
    this.root.toggleAttribute('data-expanded', on);
    this.syncExpand();
    this.save();
    emit(this.root, 'fd:change', { value: on ? 'expanded' : 'collapsed', kind: 'size' });
  }
  syncExpand() {
    const on = this.root.hasAttribute('data-expanded');
    $$('[data-fd-chat-expand]', this.root).forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Collapse' : 'Expand');
      if (b.dataset.fdTooltip) b.dataset.fdTooltip = on ? 'Collapse' : 'Expand';
      b.innerHTML = icon(on ? 'minimize-2' : 'maximize-2');
    });
  }
  save() {
    if (!this.persists) return;
    store.set(`fd-chat:${this.root.id}`, { open: this.floating && this.root.dataset.state === 'open', mode: this.mode, expanded: this.root.hasAttribute('data-expanded') });
  }

  /* ---------- Views ---------- */
  show(view) {
    if (this.isLog || !VIEWS.includes(view)) return;
    const views = this.views();
    const next = views.find((v) => v.dataset.view === view);
    if (!next) return;
    const current = views.find((v) => !v.hidden && !v.hasAttribute('data-leave'));
    if (current === next) return;
    const back = current && VIEWS.indexOf(view) < VIEWS.indexOf(current.dataset.view);
    clearTimeout(TIMERS.get(next));
    next.removeAttribute('data-leave');
    next.hidden = false;
    if (current) {
      this.prevView = current.dataset.view;
      if (this.fast) current.hidden = true;
      else {
        current.setAttribute('data-leave', '');
        TIMERS.set(current, setTimeout(() => { current.hidden = true; current.removeAttribute('data-leave'); }, ms(this.root, '--fd-dur-2') + 20));
      }
    }
    if (!this.fast) {
      next.dataset.enter = back ? 'back' : 'forward';
      next.addEventListener('animationend', () => next.removeAttribute('data-enter'), { once: true });
    }
    this.root.dataset.view = view;
    $$('[data-fd-chat-view="history"]', this.root).forEach((b) => { if (b.closest('.fd-chat-actions')) b.setAttribute('aria-pressed', String(view === 'history')); });
    if (view === 'conversation') { this.toBottom(true); this.syncContinue(); }
    if (view === 'home') this.syncContinue();
    emit(this.root, 'fd:change', { value: view, kind: 'view' });
  }
  syncContinue() {
    const row = $('.fd-chat-continue', this.root);
    const log = this.log;
    if (!row || !log) return;
    const msgs = $$(':scope > .fd-chat-msg:not([data-author="system"]):not([data-typing])', log);
    row.hidden = !msgs.length;
    const last = msgs[msgs.length - 1];
    if (!last) return;
    const who = last.dataset.author === 'user' ? 'You' : $('.fd-chat-msg-name', last)?.textContent || AI_NAME;
    const text = $$('.fd-chat-block[data-type="text"]', last).map((b) => b.textContent.trim()).join(' ') || 'Sent an attachment';
    $('.fd-chat-continue-text', row).textContent = `${who}: ${text}`;
    const t = toDate(last.dataset.time);
    $('.fd-chat-continue-meta > time', row).textContent = t ? fmtTime(t) : '';
    $('.fd-chat-unread-dot', row).hidden = !this.unread;
  }

  /* ---------- Messages ---------- */
  find(id) { return id instanceof Element ? id : (this.log ? $(`.fd-chat-msg[data-id="${CSS.escape(String(id))}"]`, this.log) : null); }
  add(message, { instant = false } = {}) {
    const el = message instanceof Element ? message : render(message);
    const log = this.log;
    if (!log) return el;
    const author = el.dataset.author;
    if (!this.isLog && this.view !== 'conversation' && (author === 'user' || !['history', 'offline'].includes(this.view))) this.show('conversation');
    const near = this.nearBottom();
    const typing = $(':scope > .fd-chat-msg[data-typing]', log);
    log.insertBefore(el, typing || null);
    if (!instant && !this.fast) {
      el.dataset.new = '';
      el.addEventListener('animationend', (e) => { if (e.target === el) el.removeAttribute('data-new'); }, { once: false });
    }
    prepare(el);
    regroup(log);
    if (author === 'user') {
      $$(':scope > .fd-chat-msg[data-author="user"]', log).forEach((m) => { if (m !== el && $('.fd-chat-receipt', m)?.dataset.state !== 'failed') setReceipt(m, null); });
    }
    if ((author === 'ai' || author === 'human') && (!this.isOpen || document.hidden)) this.setUnread(this.unread + 1);
    this.follow(near || author === 'user', instant);
    this.syncContinue();
    return el;
  }
  update(id, patch = {}) {
    const el = this.find(id);
    if (!el) return null;
    const author = el.dataset.author;
    if ('state' in patch) setReceipt(el, patch.state);
    const body = $('.fd-chat-msg-body', el);
    if (patch.blocks && body) { body.innerHTML = patch.blocks.map((b) => blockHTML(b, author)).join(''); enhance(body); }
    if ((patch.text != null || patch.html != null) && body) {
      let tb = $$('.fd-chat-block[data-type="text"]', body).pop();
      if (!tb) { body.insertAdjacentHTML('afterbegin', blockHTML({ type: 'text', text: '' }, author)); tb = $('.fd-chat-block[data-type="text"]', body); }
      tb.innerHTML = patch.html ?? (author === 'user' ? esc(patch.text) : prose(patch.text));
    }
    if (patch.edited && body && !$('.fd-chat-edited', el)) body.insertAdjacentHTML('afterend', '<span class="fd-chat-edited">Edited</span>');
    if (patch.time) {
      const t = toDate(patch.time);
      if (t) { el.dataset.time = t.toISOString(); $$('time', el).forEach((x) => { x.textContent = x.classList.contains('fd-chat-msg-stamp') ? fmtShort(t) : fmtTime(t); }); }
      regroup(this.log);
    }
    this.syncContinue();
    return el;
  }
  remove(id) {
    const el = this.find(id);
    if (!el) return;
    el.dataset.removing = '';
    setTimeout(() => { el.remove(); regroup(this.log); this.syncContinue(); }, this.fast ? 0 : ms(this.root, '--fd-dur-2'));
  }
  clear() {
    this.log?.replaceChildren();
    this.setTyping(false);
    this.hideJump();
    this.syncContinue();
  }
  setTyping(author, o = {}) {
    const log = this.log;
    if (!log) return null;
    $$(':scope > .fd-chat-msg[data-typing]', log).forEach((n) => n.remove());
    if (!author) { regroup(log); return null; }
    const el = typingEl(author, { name: this.agent?.name, avatar: this.agent?.avatar, ...o });
    const near = this.nearBottom();
    log.append(el);
    regroup(log);
    this.follow(near);
    return el;
  }
  markRead() {
    $$(':scope > .fd-chat-msg[data-author="user"]', this.log || document.createElement('div')).forEach((m) => {
      const r = $('.fd-chat-receipt', m)?.dataset.state;
      if (r && r !== 'failed' && r !== 'read') setReceipt(m, 'read');
    });
  }

  /* ---------- Scrolling ---------- */
  nearBottom(px = 96) {
    const sc = this.scroller;
    if (!sc || !sc.getClientRects().length) return true;
    return sc.scrollHeight - sc.scrollTop - sc.clientHeight < px;
  }
  toBottom(instant = false) {
    const sc = this.scroller;
    if (!sc) return;
    sc.scrollTo({ top: sc.scrollHeight, behavior: instant || this.fast ? 'auto' : 'smooth' });
    this.hideJump();
  }
  follow(force, instant) {
    if (force) { requestAnimationFrame(() => this.toBottom(instant)); return; }
    const jump = $('.fd-chat-jump', this.root);
    if (!jump || this.isLog) return;
    const count = $('.fd-chat-jump-count', jump);
    this.pending = (this.pending || 0) + 1;
    if (count) { count.hidden = false; count.textContent = this.pending > 9 ? '9+' : this.pending; }
    jump.dataset.state = 'visible';
  }
  hideJump() {
    this.pending = 0;
    const jump = $('.fd-chat-jump', this.root);
    if (jump && !this.isLog) delete jump.dataset.state;
  }
  pin() {
    const log = this.log;
    if (!log || !('ResizeObserver' in window)) return () => {};
    let near = this.nearBottom(160);
    const sc = this.scroller;
    const onScroll = () => { near = this.nearBottom(160); };
    sc.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => { if (near) sc.scrollTop = sc.scrollHeight; });
    ro.observe(log);
    return () => { ro.disconnect(); sc.removeEventListener('scroll', onScroll); };
  }

  /* ---------- Sending ---------- */
  send(text, { attachments = [], quote = null } = {}) {
    const value = String(text ?? '').trim();
    if (!value && !attachments.length) return null;
    if (this.root.hasAttribute('data-disabled')) return null;
    if (!emit(this.root, 'fd:submit', { value, attachments })) return null;
    const blocks = [];
    if (attachments.length) {
      const images = attachments.filter((a) => a.kind === 'image').map((a) => ({ src: a.url, art: a.art, alt: a.name, name: a.name }));
      const files = attachments.filter((a) => a.kind !== 'image').map((a) => ({ name: a.name, size: a.size, kind: a.kind, url: a.url }));
      blocks.push({ type: 'attachment', images, files });
    }
    if (value) blocks.push({ type: 'text', text: value });
    const el = this.add({ author: 'user', blocks, time: this.now(), state: 'sending', quote });
    const id = el.dataset.id;
    setTimeout(() => { if ($('.fd-chat-receipt', el)?.dataset.state === 'sending') this.update(id, { state: 'sent' }); }, this.fast ? 0 : 420);
    if (this.root.hasAttribute('data-fd-chat-demo') && !this.scripted) respond(this, value, attachments);
    return el;
  }
  startEdit(msg) {
    const input = this.input;
    if (!input) return;
    this.cancelEdit();
    this._quote = null;
    const text =$$('.fd-chat-block[data-type="text"]', msg).map((b) => b.textContent).join('\n\n');
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    this.root.dataset.editing = msg.dataset.id;
    msg.dataset.editing = '';
    this.showStrip('Edit message', text);
    input.setSelectionRange(text.length, text.length);
  }
  finishEdit(value) {
    const id = this.root.dataset.editing;
    const msg = this.find(id);
    this.cancelEdit({ keepText: true });
    if (!msg || !value) return;
    this.update(id, { text: value, edited: true });
    emit(msg, 'fd:action', { type: 'edit', value, block: null, message: msg });
  }
  cancelEdit({ keepText = false } = {}) {
    const id = this.root.dataset.editing;
    if (!id) return;
    delete this.root.dataset.editing;
    this.find(id)?.removeAttribute('data-editing');
    $('.fd-chat-quote', this.composer)?.remove();
    if (!keepText && this.input) { this.input.value = ''; this.input.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  quote(msg) {
    const text = $$('.fd-chat-block[data-type="text"]', msg).map((b) => b.textContent.trim()).join(' ').slice(0, 160) || 'Attachment';
    const name = msg.dataset.author === 'user' ? 'You' : $('.fd-chat-msg-name', msg)?.textContent || AI_NAME;
    this.cancelEdit();
    this.quoteData = { name, text, id: msg.dataset.id };
    this.showStrip(`Replying to ${name}`, text);
    this.input?.focus();
  }
  showStrip(label, text) {
    const composer = this.composer;
    if (!composer) return;
    $('.fd-chat-quote', composer)?.remove();
    composer.insertAdjacentHTML('afterbegin', `<div class="fd-chat-quote"><span class="fd-chat-quote-text"><b>${esc(label)}</b><span>${esc(text)}</span></span><button type="button" class="fd-composer-attachment-remove" data-chat-unquote aria-label="Cancel">${icon('x')}</button></div>`);
  }
  get quoteData() { return this._quote || null; }
  set quoteData(v) { this._quote = v; }
  clearQuote() {
    if (!this._quote) return;
    this._quote = null;
    if (!this.root.dataset.editing) $('.fd-chat-quote', this.composer)?.remove();
  }

  /* ---------- Attachments ---------- */
  pickFiles() { $('[data-fd-chat-files]', this.root)?.click(); }
  addFiles(list = []) {
    const composer = this.composer;
    if (!composer || this.root.hasAttribute('data-disabled')) return;
    let wrap = $('.fd-composer-attachments', composer);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'fd-composer-attachments';
      composer.insertBefore(wrap, this.input);
    }
    for (const f of list) {
      const name = f.name || 'file';
      const size = f.size ?? 0;
      const kind = f.kind || kindOf(name, f.type || '');
      const url = f.url || (typeof Blob !== 'undefined' && f instanceof Blob ? URL.createObjectURL(f) : '');
      const chip = document.createElement('span');
      chip.className = 'fd-composer-attachment';
      const tile = kind === 'image' && url ? `<img src="${esc(url)}" alt="">` : icon(KIND_ICON[kind] || 'file');
      chip.innerHTML = `<span class="fd-composer-attachment-tile">${tile}</span><span class="fd-composer-attachment-name">${esc(name)}</span><span class="fd-composer-attachment-meta">${fmtSize(size)}</span><button type="button" class="fd-composer-attachment-remove" aria-label="Remove ${esc(name)}">${icon('x')}</button>`;
      UPLOADS.set(chip, { name, size, kind, url, art: f.art, type: f.type });
      wrap.append(chip);
      if (size > MAX_BYTES) { chip.dataset.upload = 'failed'; $('.fd-composer-attachment-meta', chip).textContent = 'Over 10 MB'; } else this.upload(chip);
    }
    this.input?.dispatchEvent(new Event('input', { bubbles: true }));
    emit(this.root, 'fd:change', { value: list.length, kind: 'attachments' });
  }
  upload(chip) {
    const meta = $('.fd-composer-attachment-meta', chip);
    const info = UPLOADS.get(chip);
    if (this.fast) { meta.textContent = fmtSize(info.size); return; }
    chip.dataset.upload = 'uploading';
    let p = 0;
    const step = () => {
      if (!chip.isConnected) return;
      p = Math.min(100, p + 9 + Math.random() * 18);
      chip.style.setProperty('--_cht-p', `${Math.round(p)}%`);
      meta.textContent = `${Math.round(p)}%`;
      if (p < 100) setTimeout(step, 110);
      else { setTimeout(() => { delete chip.dataset.upload; meta.textContent = fmtSize(info.size); this.input?.dispatchEvent(new Event('input', { bubbles: true })); }, 160); }
    };
    setTimeout(step, 80);
  }

  /* ---------- Who you are talking to ---------- */
  setAgent(a = {}) {
    if (this.isLog) return;
    const kind = a.kind || 'ai';
    this.agent = { ...a, kind };
    this.root.dataset.agent = kind;
    const who = $('.fd-chat-who', this.root);
    const status = $('.fd-chat-status', this.root);
    if (who) {
      const lead = who.firstElementChild?.classList.contains('fd-chat-who-text') ? null : who.firstElementChild;
      let html;
      if (kind === 'human') html = avatarHTML({ name: a.name, ...(a.avatar || {}), status: a.presence || 'online' }, 28);
      else if (kind === 'queue') html = `<span class="fd-avatar-stack">${(a.agents || DEFAULT_AGENTS).slice(0, 3).map((x) => avatarHTML(x, 24)).join('')}</span>`;
      else if (kind === 'away') html = markHTML(28, 'moon', 'neutral');
      else html = markHTML(28);
      const t = document.createElement('template');
      t.innerHTML = html;
      if (lead) lead.replaceWith(t.content); else who.prepend(t.content);
      if (!this.fast) { who.removeAttribute('data-swap'); void who.offsetWidth; who.dataset.swap = ''; }
    }
    if (status) {
      const first = (a.name || '').split(' ')[0];
      const text = a.status ?? {
        ai: 'Ember AI · answers instantly',
        human: `${first || 'Support'} from Ember · online`,
        away: 'Support is away · back at 9:00 CET',
        queue: `Waiting for an agent · <b>${a.ahead ?? 2}</b> ahead of you`,
      }[kind];
      status.innerHTML = kind === 'queue' && a.status == null ? text : esc(text);
      if (kind === 'human') status.dataset.tone = 'success';
      else if (kind === 'away') status.dataset.tone = 'warning';
      else if (kind === 'queue') status.dataset.tone = 'accent';
      else delete status.dataset.tone;
    }
    emit(this.root, 'fd:change', { value: kind, kind: 'agent' });
  }
  setUnread(n) {
    this.unread = Math.max(0, n | 0);
    if (this.isLog) return;
    this.root.toggleAttribute('data-unread', this.unread > 0);
    this.launchers().forEach((l) => {
      const badge = $('.fd-chat-launcher-badge', l);
      if (!badge) return;
      const was = badge.textContent;
      badge.textContent = this.unread > 9 ? '9+' : String(this.unread);
      badge.hidden = !this.unread;
      if (this.unread && was !== badge.textContent) { badge.removeAttribute('data-pop'); void badge.offsetWidth; badge.dataset.pop = ''; }
      const base = l.dataset.label || (l.dataset.label = l.getAttribute('aria-label') || 'Chat');
      l.setAttribute('aria-label', this.unread ? `${base}, ${this.unread} unread` : base);
    });
    const dot = $('.fd-chat-continue .fd-chat-unread-dot', this.root);
    if (dot) dot.hidden = !this.unread;
  }
  setDisabled(reason) {
    if (this.isLog) return;
    const on = !!reason;
    this.root.toggleAttribute('data-disabled', on);
    const text = $('.fd-chat-closed-text', this.root);
    if (text && typeof reason === 'string') text.textContent = reason;
    const composer = this.composer;
    if (!composer) return;
    if (on) composer.setAttribute('aria-disabled', 'true'); else composer.removeAttribute('aria-disabled');
    $$('textarea, input, button', composer).forEach((c) => { c.disabled = on; });
    if (on) { this.cancelEdit(); this.clearQuote(); }
  }

  /* ---------- Streaming ---------- */
  async stream(id, content, { speed = 22 } = {}) {
    const el = this.find(id);
    if (!el) return;
    const body = $('.fd-chat-msg-body', el);
    body.insertAdjacentHTML('beforeend', blockHTML({ type: 'text', html: '' }, el.dataset.author));
    const tb = body.lastElementChild;
    const html = /<[a-z][\s\S]*>/i.test(content) ? content : prose(content);
    const ai = el.dataset.author === 'ai';
    const token = {};
    const run = this.streamSignal;
    this.streaming = token;
    const own = ai && !this.scripted;
    if (own) setRunning(this.composer, true);
    const unpin = this.pin();
    const self = this;
    await typeInto(tb, html, { speed: this.fast ? 0 : speed, signal: { get aborted() { return self.streaming !== token || !!run?.aborted; } } });
    unpin();
    if (this.streaming === token) { this.streaming = null; if (own) setRunning(this.composer, false); }
    this.syncContinue();
  }

  /* ---------- Menus ---------- */
  menuAction(value, item) {
    if (!emit(item, 'fd:action', { type: 'menu', value, block: null, message: null })) return;
    if (value === 'attach') setTimeout(() => this.pickFiles(), 40);
    else if (value === 'request') {
      const input = this.input;
      if (!input) return;
      input.value = `${input.value ? `${input.value} ` : ''}Request ID: req_`;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => input.focus(), 40);
    } else if (value === 'screenshot') this.addFiles([{ name: 'screenshot-nov-14.png', size: 248320, type: 'image/png', art: 'error' }]);
    else if (value === 'person') this.send('I’d like to talk to a person.');
    else if (value === 'transcript') toast({ title: 'Transcript on its way', description: 'We sent this conversation to maya@quarry.dev.', tone: 'success' });
    else if (value === 'mute') {
      const muted = item.getAttribute('aria-checked') === 'true';
      this.root.toggleAttribute('data-muted', muted);
      toast({ title: muted ? 'Notifications muted' : 'Notifications on', description: muted ? 'New replies will not show a badge or a sound.' : 'You will see a badge when someone replies.', tone: 'neutral' });
    } else if (value === 'end') this.end();
  }
  end() {
    this.stopRun();
    this.add({ author: 'system', text: 'You ended the conversation', icon: 'circle-x', time: this.now() });
    this.add({ author: 'ai', time: this.now(), blocks: [{ type: 'text', text: 'Before you go: how did this conversation go?' }, { type: 'rating', label: 'Rate this conversation' }] });
    this.setAgent({ kind: 'ai' });
    this.setDisabled('You ended this conversation.');
  }
  newConversation() {
    this.stopRun();
    this.clear();
    this.setDisabled(false);
    this.setAgent({ kind: 'ai' });
    this.clock = null;
    this.show('home');
    emit(this.root, 'fd:action', { type: 'new', value: null, block: null, message: null });
    requestAnimationFrame(() => this.input?.focus({ preventScroll: true }));
  }

  /* ---------- Picker ---------- */
  closePicker(bar) {
    if (!bar) return;
    bar.removeAttribute('data-picking');
    const btn = $('[data-chat-action="react"]', bar);
    btn?.setAttribute('aria-expanded', 'false');
    btn?.focus();
  }

  /* ---------- Teasers ---------- */
  hideTeasers() { if (this.root.id) $$(`.fd-chat-teaser[data-for="${CSS.escape(this.root.id)}"]`).forEach((t) => { t.dataset.state = 'closed'; }); }

  /* ---------- Scripted runs ---------- */
  stopRun({ by } = {}) {
    const running = !!this.run;
    this.run = null;
    this.scripted = false;
    this.instant = false;
    this.streamSignal = null;
    this.streaming = null;
    setRunning(this.composer, false);
    this.setTyping(false);
    $$('.fd-message-thinking, .fd-cursor', this.log || document.createElement('div')).forEach((n) => n.remove());
    $$('.fd-toolcall[data-state="running"]', this.log || document.createElement('div')).forEach((tc) => setToolcall(tc, { state: 'failed', meta: 'stopped' }));
    // An answer stopped before its first word leaves nothing behind.
    $$(':scope > .fd-chat-msg[data-author="ai"]', this.log || document.createElement('div')).forEach((m) => { if (!$('.fd-chat-msg-body', m)?.children.length) m.remove(); });
    if (this.log) regroup(this.log);
    if (running && by === 'person') this.add({ author: 'system', text: 'You stopped the answer', time: this.now() });
  }
}

/* ==========================================================================
   Block behaviour
   ========================================================================== */
function emitAction(el, type, value) {
  return emit(el, 'fd:action', { type, value, block: el.closest('.fd-chat-block'), message: el.closest('.fd-chat-msg') });
}
const quickFor = (el) => reducedMotion() || !!get(el)?.instant;

function chooseReply(pill) {
  const block = pill.closest('.fd-chat-block');
  if (!block || block.dataset.state === 'used') return;
  if (block.hasAttribute('data-multi')) {
    pill.setAttribute('aria-pressed', String(pill.getAttribute('aria-pressed') !== 'true'));
    const any = $$('.fd-chat-pill[aria-pressed="true"]', block).length > 0;
    const confirm = $('[data-chat-confirm]', block);
    if (confirm) confirm.disabled = !any;
    return;
  }
  pill.setAttribute('aria-pressed', 'true');
  useReplies(block, pill.dataset.value, pill.textContent.trim());
}
function useReplies(block, value, label) {
  if (!emitAction(block, 'quick-reply', value)) return;
  block.dataset.state = 'used';
  block.inert = true;
  get(block)?.send(label);
}

function initCarousel(car) {
  if (!once(car, 'fd-chat-carousel')) return;
  const track = $('.fd-chat-carousel-track', car);
  if (!track) return;
  const sync = () => {
    const max = track.scrollWidth - track.clientWidth;
    const x = Math.abs(track.scrollLeft);
    car.toggleAttribute('data-start', x <= 2);
    car.toggleAttribute('data-end', x >= max - 2);
  };
  track.addEventListener('scroll', sync, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(sync).observe(track);
  requestAnimationFrame(sync);
}

function submitList(form) {
  const block = form.closest('.fd-chat-block');
  if (!block || block.dataset.state === 'locked') return;
  const inputs = $$('input', form);
  const chosen = inputs.filter((i) => i.checked);
  if (!chosen.length) return;
  const multi = inputs[0]?.type === 'checkbox';
  const value = multi ? chosen.map((i) => i.value) : chosen[0].value;
  if (!emitAction(form, 'list', value)) return;
  block.dataset.state = 'locked';
  inputs.forEach((i) => { i.disabled = true; if (!i.checked) fold(i.closest('.fd-chat-fold'), false); });
  const foot = $('.fd-chat-panel-foot', form);
  if (foot) foot.innerHTML = `<span class="fd-chat-chosen">${icon('check')}<span>${chosen.length > 1 ? `${chosen.length} selected` : 'Selected'}</span></span>`;
  const ctrl = get(block);
  if (ctrl && !ctrl.isLog && ctrl.root.hasAttribute('data-fd-chat-demo') && !ctrl.scripted) respondAction(ctrl, 'list', value, block);
}

function labelFor(form, name, value) {
  const control = form.elements[name];
  const first = control instanceof RadioNodeList ? control[0] : control;
  const field = first?.closest?.('.fd-field');
  const label = field?.querySelector('.fd-field-label')?.textContent.trim() || name;
  let shown = value;
  if (first?.tagName === 'SELECT') shown = first.selectedOptions[0]?.textContent || value;
  if (first?.type === 'radio') shown = $$(`input[name="${CSS.escape(name)}"]`, form).find((r) => r.checked)?.closest('.fd-choice')?.querySelector('.fd-choice-title')?.textContent || value;
  return [label, shown];
}
function submitForm(form) {
  const block = form.closest('.fd-chat-block');
  const data = {};
  for (const [k, v] of new FormData(form)) if (typeof v === 'string') data[k] = v;
  if (!emitAction(form, 'form', data)) return;
  const kv = $('.fd-chat-summary .fd-kv', block);
  if (kv) {
    kv.innerHTML = Object.entries(data).filter(([, v]) => v).map(([k, v]) => {
      const [label, shown] = labelFor(form, k, v);
      return `<div class="fd-kv-item"><dt class="fd-kv-key">${esc(label)}</dt><dd class="fd-kv-value">${esc(shown.length > 140 ? `${shown.slice(0, 140)}…` : shown)}</dd></div>`;
    }).join('');
  }
  block.dataset.state = 'done';
  fold($('[data-part="form"]', block), false);
  fold($('[data-part="summary"]', block), true);
  $('[data-chat-edit]', block)?.focus({ preventScroll: true });
}
function editForm(btn) {
  const block = btn.closest('.fd-chat-block');
  delete block.dataset.state;
  fold($('[data-part="summary"]', block), false);
  fold($('[data-part="form"]', block), true);
  $('[data-part="form"] :is(input, select, textarea)', block)?.focus({ preventScroll: true });
}

/** Resolve an approval card in place: state "confirmed" or "cancelled", with an optional result line (HTML). */
export function resolveConfirm(block, state = 'confirmed', html) {
  if (!block) return;
  block.dataset.state = state;
  const result = $('.fd-chat-result', block);
  if (result) {
    const ok = state === 'confirmed';
    result.querySelector('.fd-chat-done-icon').innerHTML = icon(ok ? 'check' : 'x');
    result.lastElementChild.innerHTML = html || esc(ok ? block.dataset.done : block.dataset.cancelled);
  }
  fold($('[data-part="ask"]', block), false);
  fold($('[data-part="result"]', block), true);
}
async function confirmBlock(btn, ok) {
  const block = btn.closest('.fd-chat-block');
  if (!block || block.dataset.state) return;
  if (!emitAction(btn, 'confirm', ok ? 'confirm' : 'cancel')) return;
  const ctrl = get(block);
  const reply = ok && ctrl && !ctrl.isLog && ctrl.root.hasAttribute('data-fd-chat-demo') && !ctrl.scripted;
  if (ok) {
    btn.setAttribute('aria-busy', 'true');
    $$('button', block).forEach((b) => { if (b !== btn) b.disabled = true; });
    await wait(quickFor(block) ? 0 : 700);
    btn.removeAttribute('aria-busy');
  }
  resolveConfirm(block, ok ? 'confirmed' : 'cancelled');
  if (reply) respondAction(ctrl, 'confirm', 'confirm', block);
}

/** Move one step of a steps block: setStep(block, 1, 'done', { time: '2m' }). */
export function setStep(block, index, state, { detail, time } = {}) {
  const item = $$('.fd-run-steps-item', block)[index];
  if (!item) return;
  item.dataset.state = state;
  if (detail != null) { const d = $('.fd-run-steps-detail', item); d.textContent = detail; d.hidden = !detail; }
  if (time != null) { const t = $('.fd-run-steps-time', item); t.textContent = time; t.hidden = !time; }
}

/** Count a handoff queue down: setQueue(block, 1); position 0 marks it joined (pass { name } for the line). */
export function setQueue(block, position, { name } = {}) {
  if (!block || block.dataset.state === 'cancelled') return;
  const num = $('.fd-chat-queue', block);
  const sub = $('.fd-chat-handoff-sub', block);
  if (position > 0) {
    if (num) { num.innerHTML = `<span>${position}</span>`; num.removeAttribute('data-tick'); void num.offsetWidth; num.dataset.tick = ''; }
    if (sub) sub.innerHTML = queueText(position, block.dataset.wait);
    return;
  }
  block.dataset.state = 'joined';
  if (num) num.innerHTML = icon('check');
  if (sub) sub.textContent = `${name || 'Someone from support'} joined`;
  const title = $('.fd-chat-handoff-title', block);
  if (title) title.textContent = 'You’re talking to a person';
  fold($('[data-part="foot"]', block), false);
}

function litScale(scale, n) {
  const stars = scale.dataset.variant === 'stars';
  $$('.fd-chat-rate', scale).forEach((b) => b.toggleAttribute('data-lit', stars ? +b.dataset.value <= n : +b.dataset.value === n));
}
function rate(btn) {
  const block = btn.closest('.fd-chat-block');
  const scale = btn.closest('.fd-chat-rating-scale');
  if (!block || block.dataset.state === 'sent') return;
  $$('.fd-chat-rate', scale).forEach((b) => { b.setAttribute('aria-checked', String(b === btn)); b.tabIndex = b === btn ? 0 : -1; });
  scale.dataset.value = btn.dataset.value;
  litScale(scale, +btn.dataset.value);
  const hint = $('.fd-chat-rating-hint', block);
  if (hint) hint.textContent = btn.getAttribute('aria-label');
  emitAction(btn, 'rating', +btn.dataset.value);
  const comment = $('[data-part="comment"]', block);
  if (comment) fold(comment, true); else thank(block);
}
function thank(block) {
  block.dataset.state = 'sent';
  $$('.fd-chat-rate', block).forEach((b) => { b.disabled = true; });
  fold($('[data-part="comment"]', block), false);
  fold($('[data-part="thanks"]', block), true);
  const hint = $('.fd-chat-rating-hint', block);
  if (hint) hint.hidden = true;
}

function pickDay(btn) {
  const block = btn.closest('.fd-chat-block');
  $$('.fd-chat-day', block).forEach((d) => d.setAttribute('aria-pressed', String(d === btn)));
  let slots = {};
  try { slots = JSON.parse(block.dataset.slots || '{}'); } catch { /* ignore */ }
  $('.fd-chat-slots', block).innerHTML = slotsHTML(slots[btn.dataset.value]);
  $('[data-chat-pick]', block).textContent = 'Choose a time';
  $('[data-chat-confirm]', block).disabled = true;
}
function pickSlot(btn) {
  const block = btn.closest('.fd-chat-block');
  $$('.fd-chat-slot', block).forEach((s) => s.setAttribute('aria-pressed', String(s === btn)));
  const day = dayInfo(block);
  $('[data-chat-pick]', block).textContent = `${day ? `${day.label}, ${day.month || ''} ${day.date}` : ''} at ${btn.dataset.value}`;
  $('[data-chat-confirm]', block).disabled = false;
}
function dayInfo(block) {
  const value = $('.fd-chat-day[aria-pressed="true"]', block)?.dataset.value;
  try { return JSON.parse(block.dataset.days || '[]').find((d) => d.value === value); } catch { return null; }
}
function book(btn) {
  const block = btn.closest('.fd-chat-block');
  const day = dayInfo(block);
  const time = $('.fd-chat-slot[aria-pressed="true"]', block)?.dataset.value;
  if (!day || !time) return;
  if (!emitAction(btn, 'schedule', { day: day.value, time })) return;
  block.dataset.state = 'booked';
  block.dataset.booked = JSON.stringify({ day: day.value, time });
  const cal = $('.fd-chat-cal', block);
  cal.firstElementChild.textContent = day.month || '';
  cal.lastElementChild.textContent = day.date;
  $('[data-chat-when]', block).textContent = `${day.label}, ${day.month || ''} ${day.date} at ${time} ${block.dataset.timezone ? block.dataset.timezone.split(' ')[0] : ''}`.trim();
  fold($('[data-part="pick"]', block), false);
  fold($('[data-part="booked"]', block), true);
}
function downloadICS(btn) {
  const block = btn.closest('.fd-chat-block');
  let booked = {};
  try { booked = JSON.parse(block.dataset.booked || '{}'); } catch { /* ignore */ }
  if (!booked.day) return;
  const start = `${booked.day.replace(/-/g, '')}T${booked.time.replace(':', '')}00`;
  const [h, m] = booked.time.split(':').map(Number);
  const endMin = h * 60 + m + 30;
  const end = `${booked.day.replace(/-/g, '')}T${String(Math.floor(endMin / 60)).padStart(2, '0')}${String(endMin % 60).padStart(2, '0')}00`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ember//Support//EN', 'BEGIN:VEVENT', `UID:${Date.now()}@ember.dev`, `DTSTART:${start}`, `DTEND:${end}`, 'SUMMARY:Ember support call', 'DESCRIPTION:Walkthrough of waitFor and timeouts with Ember support.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ember-support-call.ics';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  emitAction(btn, 'calendar', booked);
}

/* ---------- Lightbox (a Fire dialog) ---------- */
let lightbox;
function ensureLightbox() {
  if (lightbox?.isConnected) return lightbox;
  lightbox = document.createElement('dialog');
  lightbox.className = 'fd-dialog fd-chat-lightbox';
  lightbox.id = 'fd-chat-lightbox';
  lightbox.dataset.size = 'xl';
  lightbox.innerHTML = `<div class="fd-dialog-head"><h2 class="fd-h3 fd-dialog-title"></h2><p class="fd-dialog-desc"></p><button class="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close">${icon('x')}</button></div><div class="fd-dialog-body"><div class="fd-chat-lightbox-media"></div></div><div class="fd-dialog-foot"><span class="fd-chat-lightbox-count"></span><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-lightbox="-1" aria-label="Previous image">${icon('chevron-left')}</button><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-lightbox="1" aria-label="Next image">${icon('chevron-right')}</button></div>`;
  document.body.append(lightbox);
  lightbox.addEventListener('click', (e) => { const b = e.target.closest('[data-lightbox]'); if (b) showImage(lightbox.fdIndex + +b.dataset.lightbox); });
  lightbox.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') showImage(lightbox.fdIndex + 1); if (e.key === 'ArrowLeft') showImage(lightbox.fdIndex - 1); });
  return lightbox;
}
function showImage(i) {
  const imgs = lightbox.fdImages || [];
  if (!imgs.length) return;
  const n = (i + imgs.length) % imgs.length;
  lightbox.fdIndex = n;
  const img = imgs[n];
  $('.fd-dialog-title', lightbox).textContent = img.name || img.alt || 'Image';
  $('.fd-dialog-desc', lightbox).textContent = img.caption || 'Shared in this conversation';
  $('.fd-chat-lightbox-media', lightbox).innerHTML = img.src ? `<img src="${esc(img.src)}" alt="${esc(img.alt || '')}">` : `<span class="fd-chat-shot"${img.art ? ` data-art="${esc(img.art)}"` : ''} role="img" aria-label="${esc(img.alt || img.name || 'Screenshot')}"></span>`;
  $('.fd-chat-lightbox-count', lightbox).textContent = `${n + 1} of ${imgs.length}`;
  $$('[data-lightbox]', lightbox).forEach((b) => { b.hidden = imgs.length < 2; });
}
function openLightbox(thumb) {
  const block = thumb.closest('.fd-chat-block');
  let imgs = [];
  try { imgs = JSON.parse(block?.dataset.images || '[]'); } catch { /* ignore */ }
  if (!imgs.length) return;
  const box = ensureLightbox();
  box.fdImages = imgs;
  showImage(+thumb.dataset.index || 0);
  openDialog(box, { trigger: thumb });
}

/* ==========================================================================
   Delegated behaviour (bound once)
   ========================================================================== */
const chatFor = (btn, id) => (id ? get(id) : get(btn)) || get(document.querySelector('.fd-chat'));

function bindGlobal() {
  if (!once(document, 'fd-chat-global')) return;
  on(document, 'click', '[data-fd-chat-toggle]', (e, btn) => chatFor(btn, btn.dataset.fdChatToggle)?.toggle({ trigger: btn }));
  on(document, 'click', '[data-fd-chat-open]', (e, btn) => {
    const c = chatFor(btn, btn.dataset.fdChatOpen);
    if (!c) return;
    if (btn.tagName === 'A') e.preventDefault();
    c.open({ trigger: btn });
    if (btn.dataset.prompt) c.send(btn.dataset.prompt);
  });
  on(document, 'click', '[data-fd-chat-close], [data-fd-chat-minimize]', (e, btn) => get(btn)?.close());
  on(document, 'click', '[data-fd-chat-expand]', (e, btn) => get(btn)?.expand());
  on(document, 'click', '[data-fd-chat-new]', (e, btn) => chatFor(btn, btn.closest('.fd-chat') ? null : btn.getAttribute('aria-controls'))?.newConversation());
  on(document, 'click', '[data-fd-chat-attach]', (e, btn) => get(btn)?.pickFiles());
  on(document, 'click', '[data-fd-chat-view]', (e, btn) => {
    const c = chatFor(btn, btn.closest('.fd-chat') ? null : btn.getAttribute('aria-controls') || btn.dataset.target);
    if (!c) return;
    const v = btn.dataset.fdChatView;
    const back = () => c.show(c.prevView && c.prevView !== 'history' ? c.prevView : 'home');
    if (v === 'back' || (v === 'history' && c.view === 'history' && btn.closest('.fd-chat-actions'))) back();
    else c.show(v);
    if (!c.isOpen) c.open({ trigger: btn });
  });
  on(document, 'click', '.fd-chat-jump', (e, btn) => get(btn)?.toBottom());
  on(document, 'click', '.fd-chat-suggestions .fd-chat-pill', (e, pill) => {
    const c = get(pill);
    if (c && emit(pill, 'fd:action', { type: 'suggestion', value: pill.textContent.trim(), block: null, message: null })) c.send(pill.textContent.trim());
  });
  on(document, 'click', '.fd-chat-block[data-type="quick-replies"] .fd-chat-pill', (e, pill) => chooseReply(pill));
  on(document, 'click', '.fd-chat-block[data-type="quick-replies"] [data-chat-confirm]', (e, btn) => {
    const block = btn.closest('.fd-chat-block');
    const picked = $$('.fd-chat-pill[aria-pressed="true"]', block);
    if (picked.length) useReplies(block, picked.map((p) => p.dataset.value), picked.map((p) => p.textContent.trim()).join(', '));
  });
  on(document, 'click', '[data-chat-unquote]', (e, btn) => { const c = get(btn); c?.cancelEdit(); c?.clearQuote(); c?.input?.focus(); });

  // Message actions
  on(document, 'click', '.fd-chat-msg-actions [data-chat-action]', async (e, btn) => {
    const msg = btn.closest('.fd-chat-msg');
    const action = btn.dataset.chatAction;
    const bar = btn.closest('.fd-chat-msg-actions');
    if (action === 'copy') {
      const text = $$('.fd-chat-block[data-type="text"]', msg).map((b) => b.innerText.trim()).join('\n\n');
      if (await copyText(text)) copied(btn, { iconOnly: true });
      emitAction(btn, 'copy', text);
    } else if (action === 'react') {
      const open = !bar.hasAttribute('data-picking');
      bar.toggleAttribute('data-picking', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open) requestAnimationFrame(() => $('.fd-chat-react-picker > button', bar)?.focus());
    } else if (action === 'reply') {
      get(msg)?.quote(msg);
      emitAction(btn, 'reply', msg.dataset.id);
    } else if (action === 'up' || action === 'down') {
      const pressed = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(pressed));
      const other = $(`[data-chat-action="${action === 'up' ? 'down' : 'up'}"]`, bar);
      if (pressed) other?.setAttribute('aria-pressed', 'false');
      emitAction(btn, 'feedback', pressed ? action : null);
    }
  });
  on(document, 'click', '.fd-chat-react-picker [data-reaction]', (e, btn) => {
    const msg = btn.closest('.fd-chat-msg');
    react(msg, btn.dataset.reaction);
    const c = get(msg);
    c?.closePicker(btn.closest('.fd-chat-msg-actions'));
    emitAction(btn, 'reaction', btn.dataset.reaction);
  });
  on(document, 'focusout', '.fd-chat-msg-actions[data-picking]', (e, bar) => {
    if (!bar.contains(e.relatedTarget)) { bar.removeAttribute('data-picking'); $('[data-chat-action="react"]', bar)?.setAttribute('aria-expanded', 'false'); }
  });
  on(document, 'click', '.fd-chat-reaction', (e, chip) => { react(chip.closest('.fd-chat-msg'), chip.dataset.reaction); });
  on(document, 'click', '.fd-chat-receipt [data-chat-retry]', (e, btn) => {
    const msg = btn.closest('.fd-chat-msg');
    const c = get(msg);
    if (!c) return;
    c.update(msg, { state: 'sending' });
    setTimeout(() => c.update(msg, { state: 'sent' }), c.fast ? 0 : 700);
    emitAction(btn, 'retry', msg.dataset.id);
  });
  on(document, 'click', '.fd-chat-msg', (e, msg) => {
    if (!coarsePointer() || e.target.closest('button, a, input, label, textarea, select')) return;
    $$('.fd-chat-msg[data-actions="visible"]').forEach((m) => { if (m !== msg) delete m.dataset.actions; });
    if (msg.dataset.actions) delete msg.dataset.actions; else if (msg.dataset.author !== 'system') msg.dataset.actions = 'visible';
  });

  // Actions and cards
  on(document, 'click', '.fd-chat-block :is(.fd-chat-actions-row, .fd-chat-card-actions, .fd-callout-actions) [data-value]', (e, btn) => {
    if (!emitAction(btn, 'action', btn.dataset.value)) { e.preventDefault(); return; }
    if (btn.hasAttribute('data-send')) get(btn)?.send(btn.textContent.trim());
  });
  on(document, 'click', '.fd-chat-carousel-btn', (e, btn) => {
    const track = $('.fd-chat-carousel-track', btn.closest('.fd-chat-carousel'));
    const dir = btn.dataset.dir === 'prev' ? -1 : 1;
    track.scrollBy({ left: dir * track.clientWidth * 0.8 * (getComputedStyle(track).direction === 'rtl' ? -1 : 1), behavior: reducedMotion() ? 'auto' : 'smooth' });
  });

  // List + form
  on(document, 'change', '.fd-chat-list input', (e, input) => {
    const form = input.closest('form');
    const btn = $('.fd-chat-panel-foot [type="submit"]', form);
    if (btn) btn.disabled = !$$('input', form).some((i) => i.checked);
  });
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || !form.closest('.fd-chat-block')) return;
    if (e.defaultPrevented) return; // invalid: forms.js already showed the errors
    e.preventDefault();
    if (form.classList.contains('fd-chat-form')) submitForm(form);
    else submitList(form);
  });
  on(document, 'click', '[data-chat-edit]', (e, btn) => editForm(btn));
  on(document, 'click', '.fd-chat-block[data-type="form"] [data-chat-cancel]', (e, btn) => { emitAction(btn, 'form', null); btn.closest('form')?.reset(); });

  // Confirm, handoff
  on(document, 'click', '.fd-chat-block[data-type="confirm"] [data-chat-confirm]', (e, btn) => confirmBlock(btn, true));
  on(document, 'click', '.fd-chat-block[data-type="confirm"] [data-chat-cancel]', (e, btn) => confirmBlock(btn, false));
  on(document, 'click', '.fd-chat-block[data-type="handoff"] [data-chat-cancel]', (e, btn) => {
    const block = btn.closest('.fd-chat-block');
    if (!emitAction(btn, 'handoff', 'cancel')) return;
    block.dataset.state = 'cancelled';
    const sub = $('.fd-chat-handoff-sub', block);
    if (sub) sub.textContent = 'You left the queue. Ember AI is still here.';
    $('.fd-chat-queue', block).innerHTML = icon('x');
    fold($('[data-part="foot"]', block), false);
    const c = get(block);
    if (c && !c.isLog) { c.stopRun(); c.setAgent({ kind: 'ai' }); c.add({ author: 'system', text: 'You left the queue', time: c.now() }); }
  });

  // Rating
  on(document, 'click', '.fd-chat-rate', (e, btn) => rate(btn));
  on(document, 'pointerover', '.fd-chat-rate', (e, btn) => {
    const block = btn.closest('.fd-chat-block');
    if (block?.dataset.state === 'sent') return;
    litScale(btn.closest('.fd-chat-rating-scale'), +btn.dataset.value);
    const hint = $('.fd-chat-rating-hint', block);
    if (hint) hint.textContent = btn.getAttribute('aria-label');
  });
  on(document, 'pointerout', '.fd-chat-rating-scale', (e, scale) => {
    if (scale.contains(e.relatedTarget)) return;
    litScale(scale, +(scale.dataset.value || 0));
    const block = scale.closest('.fd-chat-block');
    const hint = $('.fd-chat-rating-hint', block);
    const chosen = $('.fd-chat-rate[aria-checked="true"]', scale);
    if (hint) hint.textContent = chosen ? chosen.getAttribute('aria-label') : hint.dataset.hint;
  });
  on(document, 'keydown', '.fd-chat-rate', (e, btn) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const all = $$('.fd-chat-rate', btn.closest('.fd-chat-rating-scale'));
    const next = all[(all.indexOf(btn) + dir + all.length) % all.length];
    next.focus();
    rate(next);
  });
  on(document, 'click', '[data-chat-send-rating]', (e, btn) => {
    const block = btn.closest('.fd-chat-block');
    const comment = $('textarea', block)?.value.trim() || '';
    emitAction(btn, 'rating-comment', { value: +($('.fd-chat-rating-scale', block)?.dataset.value || 0), comment });
    thank(block);
  });
  on(document, 'click', '[data-chat-helpful]', (e, btn) => {
    const wrap = btn.closest('.fd-chat-helpful');
    $$('[data-chat-helpful]', wrap).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const label = $(':scope > span', wrap);
    if (label) label.textContent = btn.dataset.chatHelpful === 'up' ? 'Thanks for the feedback' : 'Thanks. We’ll use this to improve';
    emitAction(btn, 'helpful', btn.dataset.chatHelpful);
  });

  // Schedule
  on(document, 'click', '.fd-chat-day', (e, btn) => pickDay(btn));
  on(document, 'click', '.fd-chat-slot', (e, btn) => pickSlot(btn));
  on(document, 'click', '.fd-chat-block[data-type="schedule"] [data-chat-confirm]', (e, btn) => book(btn));
  on(document, 'click', '[data-chat-ics]', (e, btn) => downloadICS(btn));
  on(document, 'click', '[data-chat-reschedule]', (e, btn) => {
    const block = btn.closest('.fd-chat-block');
    delete block.dataset.state;
    fold($('[data-part="booked"]', block), false);
    fold($('[data-part="pick"]', block), true);
    emitAction(btn, 'schedule', null);
  });

  // Attachments
  on(document, 'click', '.fd-chat-thumb', (e, thumb) => openLightbox(thumb));
  on(document, 'click', '.fd-chat-file [data-chat-retry]', (e, btn) => {
    const file = btn.closest('.fd-chat-file');
    emitAction(btn, 'retry-upload', file.dataset.name);
    file.outerHTML = fileHTML({ name: file.dataset.name, state: 'uploading', progress: 0 });
  });
  on(document, 'click', '.fd-chat-file [data-chat-download]', (e, btn) => {
    const file = btn.closest('.fd-chat-file');
    emitAction(btn, 'download', file.dataset.name);
  });

  // History
  on(document, 'click', '.fd-chat-thread', (e, btn) => {
    const list = btn.closest('.fd-chat-history-list, ul');
    $$('.fd-chat-thread', list).forEach((t) => { if (t === btn) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    btn.removeAttribute('data-unread');
    if (!emit(btn, 'fd:action', { type: 'history', value: btn.dataset.value, block: null, message: null })) return;
    get(btn)?.show('conversation');
  });
  on(document, 'input', '.fd-chat-history .fd-search-input', (e, input) => {
    const wrap = input.closest('.fd-chat-history');
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    $$('.fd-chat-thread', wrap).forEach((t) => {
      const match = !q || t.textContent.toLowerCase().includes(q);
      t.closest('li').hidden = !match;
      if (match) shown++;
    });
    const empty = $('.fd-empty', wrap);
    if (empty) empty.hidden = shown > 0;
    $('.fd-chat-history-label', wrap)?.toggleAttribute('hidden', shown === 0);
  });
  on(document, 'click', '.fd-chat-history .fd-search-clear', (e, btn) => {
    const input = $('.fd-search-input', btn.closest('.fd-search'));
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  });

  // Teasers and demos
  on(document, 'click', '[data-fd-chat-teaser-dismiss]', (e, btn) => {
    const teaser = btn.closest('.fd-chat-teaser');
    teaser.dataset.state = 'closed';
    if (teaser.dataset.for) store.set(`fd-chat-teaser:${teaser.dataset.for}`, true);
  });
  on(document, 'click', '[data-fd-chat-replay]', (e, btn) => {
    const target = document.querySelector(btn.dataset.fdChatReplay);
    if (target) demo(target, btn.dataset.demo || target.dataset.fdChatPlay || 'support');
  });
}

function react(msg, name) {
  if (!msg) return;
  let wrap = $('.fd-chat-msg-reactions', msg);
  if (!wrap) { $('.fd-chat-msg-body', msg).insertAdjacentHTML('afterend', '<div class="fd-chat-msg-reactions"></div>'); wrap = $('.fd-chat-msg-reactions', msg); }
  let chip = $(`.fd-chat-reaction[data-reaction="${CSS.escape(name)}"]`, wrap);
  const label = REACTIONS.find(([n]) => n === name)?.[1] || name;
  if (!chip) {
    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'fd-chat-reaction';
    chip.dataset.reaction = name;
    chip.dataset.count = '0';
    chip.setAttribute('aria-pressed', 'false');
    wrap.append(chip);
  }
  const pressed = chip.getAttribute('aria-pressed') === 'true';
  const count = (+chip.dataset.count || 0) + (pressed ? -1 : 1);
  if (count <= 0) { chip.remove(); return; }
  chip.dataset.count = String(count);
  chip.setAttribute('aria-pressed', String(!pressed));
  chip.setAttribute('aria-label', `${label}, ${count}`);
  chip.innerHTML = `${icon(name)}<span>${count}</span>`;
}

/* ==========================================================================
   Demos: scripted conversations for the docs and templates
   ========================================================================== */
const MAYA = { name: 'Maya', role: 'Support engineer', avatar: { initials: 'MO', tone: 'accent', status: 'online' } };
const REQ = {
  id: 'req_8f3a21',
  details: { type: 'details', title: 'req_8f3a21', meta: 'Nov 14, 2:18 PM', icon: 'file-text', items: [
    { key: 'Request ID', value: 'req_8f3a21', copy: true },
    { key: 'Endpoint', value: 'POST /v2/scrape', mono: true },
    { key: 'Status', value: 'Failed · 408 timeout', status: 'danger' },
    { key: 'Credits', value: '0 (failed requests are free)' },
    { key: 'Duration', value: '30.0 s', mono: true },
  ] },
  code: { type: 'code', tabs: [
    { label: 'cURL', value: 'curl', lang: 'bash', code: 'curl -X POST https://api.ember.dev/v2/scrape \\\n  -H "Authorization: Bearer $EMBER_API_KEY" \\\n  -d \'{\n    "url": "https://northwind.io/pricing",\n    "timeout": 60000,\n    "waitFor": ".pricing-table"\n  }\'' },
    { label: 'Node', value: 'node', lang: 'javascript', code: 'const page = await ember.scrape("https://northwind.io/pricing", {\n  timeout: 60_000,\n  waitFor: ".pricing-table",\n});' },
    { label: 'Python', value: 'python', lang: 'python', code: 'page = app.scrape(\n    "https://northwind.io/pricing",\n    timeout=60_000,\n    wait_for=".pricing-table",\n)' },
  ] },
};
const SOURCES = {
  credits: { title: 'Credits and billing · How each endpoint is counted', domain: 'docs.ember.dev/credits', url: 'https://docs.ember.dev/credits', snippet: 'One credit per page for /scrape and /crawl. Failed requests are not charged.' },
  crawl: { title: 'Crawl options · limit, maxDepth and includePaths', domain: 'docs.ember.dev/crawl-options', url: 'https://docs.ember.dev/crawl-options', snippet: 'Set limit to cap pages, and includePaths to keep a crawl inside one section.' },
  limits: { title: 'Rate limits · concurrency on each plan', domain: 'docs.ember.dev/rate-limits', url: 'https://docs.ember.dev/rate-limits', snippet: 'Hobby allows 5 concurrent requests; Standard allows 50.' },
};
const DAYS = [
  { value: '2026-11-16', label: 'Mon', date: '16', month: 'Nov' },
  { value: '2026-11-17', label: 'Tue', date: '17', month: 'Nov' },
  { value: '2026-11-18', label: 'Wed', date: '18', month: 'Nov' },
  { value: '2026-11-19', label: 'Thu', date: '19', month: 'Nov', disabled: true },
  { value: '2026-11-20', label: 'Fri', date: '20', month: 'Nov' },
];
const SLOTS = {
  '2026-11-16': ['09:30', '10:00', '11:30', { time: '14:00', disabled: true }, '15:30'],
  '2026-11-17': ['09:00', '10:30', '13:00', '16:00'],
  '2026-11-18': [{ time: '09:00', disabled: true }, '11:00', '14:30'],
  '2026-11-20': ['10:00', '10:30', '11:00'],
};

/* A runner keeps time, checks for aborts and speaks for each side. */
function runner(ctrl, { instant = false } = {}) {
  const token = {};
  ctrl.stopRun();
  ctrl.run = token;
  ctrl.scripted = true;
  ctrl.streamSignal = { get aborted() { return ctrl.run !== token; } };
  const R = {
    fastMode: instant || reducedMotion(),
    get fast() { return this.fastMode; },
    set fast(v) { this.fastMode = v || reducedMotion(); ctrl.instant = this.fastMode; },
    alive: () => ctrl.run === token,
    check() { if (ctrl.run !== token) throw ABORT; },
    async pause(t) { R.check(); if (!R.fast) await wait(t); R.check(); },
    tick(sec = 20) { ctrl.clock = new Date((ctrl.clock ? ctrl.clock.getTime() : Date.now()) + sec * 1000); return ctrl.clock; },
    async user(text, { typed = false } = {}) {
      R.check();
      R.tick(30);
      if (typed && !R.fast && ctrl.input) {
        const input = ctrl.input;
        input.value = '';
        for (const word of text.split(/(\s+)/)) { input.value += word; input.dispatchEvent(new Event('input', { bubbles: true })); if (word.trim()) await R.pause(70 + Math.random() * 60); }
        await R.pause(250);
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const el = ctrl.send(text);
      await R.pause(500);
      if (el) ctrl.update(el, { state: 'delivered' });
      return el;
    },
    async ai({ status = 'Thinking…', tool, blocks = [], think = 800 } = {}) {
      R.check();
      R.tick(8);
      const msg = ctrl.add({ author: 'ai', time: ctrl.now(), blocks: [] }, { instant: R.fast });
      ctrl.markRead();
      const body = $('.fd-chat-msg-body', msg);
      setRunning(ctrl.composer, !R.fast);
      let thinking = null;
      if (!R.fast) {
        thinking = document.createElement('div');
        thinking.className = 'fd-message-thinking';
        thinking.setAttribute('role', 'status');
        thinking.innerHTML = `<span class="fd-message-status">${esc(status)}</span>`;
        body.append(thinking);
        ctrl.follow(ctrl.nearBottom(200));
      }
      await R.pause(think);
      if (tool) {
        body.insertAdjacentHTML(thinking ? 'afterbegin' : 'beforeend', blockHTML({ ...tool, state: R.fast ? 'done' : 'running' }));
        const tc = $('.fd-chat-block[data-type="tool"] .fd-toolcall', body);
        enhance(tc.parentElement);
        await R.pause(tool.ms || 1100);
        setToolcall(tc, { state: 'done', meta: tool.meta || '' });
      }
      thinking?.remove();
      for (const b of blocks) {
        R.check();
        if (b.type === 'text' && !R.fast) {
          await ctrl.stream(msg, b.html ?? prose(b.text, b.sources), { speed: 20 });
          R.check();
        } else {
          body.insertAdjacentHTML('beforeend', blockHTML(b, 'ai'));
          const el = body.lastElementChild;
          if (!R.fast) el.classList.add('fd-rise');
          enhance(el);
          ctrl.follow(ctrl.nearBottom(240));
          await R.pause(b.type === 'quick-replies' ? 150 : 380);
        }
      }
      setRunning(ctrl.composer, false);
      ctrl.syncContinue();
      return msg;
    },
    async human({ text, blocks = [], typing = 1300 } = {}) {
      R.check();
      if (!R.fast) { ctrl.setTyping('human', { name: MAYA.name, avatar: MAYA.avatar }); await R.pause(typing); }
      ctrl.setTyping(false);
      R.tick(25);
      ctrl.markRead();
      return ctrl.add({ author: 'human', ...MAYA, time: ctrl.now(), text, blocks }, { instant: R.fast });
    },
    system(text, o = {}) { R.check(); return ctrl.add({ author: 'system', text, time: ctrl.now(), ...o }, { instant: R.fast }); },
    async press(btn) {
      R.check();
      if (!btn) return;
      await R.pause(900);
      btn.click();
      await R.pause(300);
    },
  };
  ctrl.instant = R.fast;
  return R;
}
const lastBlock = (msg, type) => $$(`.fd-chat-block[data-type="${type}"]`, msg).pop();

/* Scenes shared by the demos and the demo replies. */
const scenes = {
  async lookup(R) {
    return R.ai({
      status: 'Looking up req_8f3a21…',
      tool: { type: 'tool', name: 'Looked up', args: 'req_8f3a21', meta: '0.4s', ms: 1200, input: { id: 'req_8f3a21' }, output: { status: 408, error: 'TIMEOUT', url: 'https://northwind.io/pricing', waitedMs: 30000, credits: 0 } },
      blocks: [
        { type: 'text', text: 'The scrape of `northwind.io/pricing` hit the **30-second timeout**. The page keeps loading a chat widget, so it never went idle and Ember stopped the request.' },
        REQ.details,
        { type: 'text', text: 'Give the page more time and wait for the pricing table instead of network idle:' },
        REQ.code,
        { type: 'quick-replies', options: ['That fixed it', 'Was I charged for it?', 'Talk to a person'] },
      ],
    });
  },
  async charged(R) {
    return R.ai({ status: 'Checking your billing…', think: 900, blocks: [{ type: 'text', text: 'No. Failed requests are free, so req_8f3a21 used **0 credits**. I did find a 5,000-credit top-up for **$19.00** on Nov 12 that hasn’t been used.' }] });
  },
  async refundOffer(R) {
    return R.ai({ status: 'Preparing a refund…', think: 900, blocks: [
      { type: 'text', text: 'I can refund it to the card on file.' },
      { type: 'confirm', icon: 'credit-card', title: 'Refund $19.00 to Visa •••• 4242?', text: 'The 5,000 unused credits are removed from Quarry Labs. Refunds take 5–10 business days.', confirm: 'Refund $19.00', cancel: 'Keep it', done: 'Refund of $19.00 requested', cancelled: 'Kept the top-up. Nothing was charged or refunded.' },
    ] });
  },
  async handoff(R, ctrl, { reason = 'person' } = {}) {
    const blocks = [];
    if (reason === 'refund') {
      blocks.push({ type: 'steps', title: 'Refund · $19.00', meta: 'rf_20c4e1', icon: 'receipt', items: [
        { label: 'Refund requested', state: 'done', time: '2:24 PM' },
        { label: 'Approved by support', detail: 'Refunds over $10 need a person', state: 'active' },
        { label: 'Sent to Visa •••• 4242', state: 'pending' },
      ] });
      blocks.push({ type: 'text', text: 'Refunds over $10 need a person to approve them, so I’m handing this to the support team. They can finish it while you’re here.' });
    } else blocks.push({ type: 'text', text: 'Of course. I’m passing this conversation to the support team, with everything we’ve covered so far.' });
    blocks.push({ type: 'handoff', position: 2, wait: 'about 2 min', agents: DEFAULT_AGENTS });
    const msg = await R.ai({ status: 'Finding someone on support…', think: 700, blocks });
    const steps = lastBlock(msg, 'steps');
    const queue = lastBlock(msg, 'handoff');
    R.system('Ember AI handed this conversation to support', { icon: 'users' });
    ctrl.setAgent({ kind: 'queue', ahead: 2 });
    await R.pause(1600);
    setQueue(queue, 1);
    ctrl.setAgent({ kind: 'queue', ahead: 1 });
    await R.pause(1800);
    setQueue(queue, 0, { name: 'Maya' });
    R.tick(110);
    R.system('<b>Maya</b> joined the conversation', { icon: 'user-plus', html: '<b>Maya</b> joined the conversation', text: undefined });
    ctrl.setAgent({ kind: 'human', name: 'Maya Okafor', role: MAYA.role, avatar: MAYA.avatar });
    await R.pause(500);
    if (reason === 'refund') {
      await R.human({ text: 'Hi, I’m Maya from support. I’ve approved the refund. It’ll be back on your Visa in 5–10 business days.', typing: 1700 });
      if (steps) { setStep(steps, 1, 'done', { detail: 'Approved by Maya', time: '2:27 PM' }); setStep(steps, 2, 'active', { detail: 'Usually 5–10 business days' }); }
    } else {
      await R.human({ text: 'Hi, I’m Maya from support. I’ve read the conversation so far. What can I help with?', typing: 1500 });
    }
    return { steps, queue };
  },
};

async function supportScript(R, ctrl, { liveFrom = 0 } = {}) {
  const startFast = R.fast;
  if (liveFrom > 0) R.fast = true;
  R.system('Today');
  await R.user('Why did my request fail? It was req_8f3a21.');
  const lookup = await scenes.lookup(R);
  await R.press($('.fd-chat-pill[data-value="Was I charged for it?"]', lookup));
  await scenes.charged(R);
  R.fast = startFast;
  await R.user('That top-up was a mistake. Can I get a refund?', { typed: true });
  const offer = await scenes.refundOffer(R);
  await R.press($('[data-chat-confirm]', lastBlock(offer, 'confirm')));
  await scenes.handoff(R, ctrl, { reason: 'refund' });
  const schedule = await R.human({
    text: 'While I have you: those timeouts come from northwind.io’s chat widget. Want me to walk you through `waitFor` on a short call?',
    typing: 2000,
    blocks: [{ type: 'schedule', title: 'Call with Maya', duration: '20 min', timezone: 'CET (UTC+1)', days: DAYS, slots: SLOTS, with: 'Maya Okafor · the invite is on its way to maya@quarry.dev' }],
  });
  const sched = lastBlock(schedule, 'schedule');
  await R.press($$('.fd-chat-day', sched)[1]);
  await R.press($$('.fd-chat-slot', sched)[1]);
  await R.press($('[data-chat-confirm]', sched));
  await R.user('Booked. Thanks, Maya!', { typed: true });
  await R.human({ text: 'Anytime! I’ll mark this as resolved. Reply here and it opens again.', typing: 1400 });
  R.tick(20);
  R.system('Conversation resolved', { icon: 'circle-check', tone: 'success' });
  ctrl.setAgent({ kind: 'ai' });
  await R.ai({ status: 'Wrapping up…', think: 500, blocks: [{ type: 'text', text: 'Before you go: how did Maya and I do?' }, { type: 'rating', label: 'Rate this conversation', variant: 'faces' }] });
  ctrl.setDisabled('This conversation is resolved.');
}

async function aiScript(R) {
  R.system('Today');
  await R.user('How many credits did my last crawl use?');
  await R.ai({
    status: 'Looking up your recent runs…',
    tool: { type: 'tool', name: 'Looked up', args: 'crawl_41ab9c', meta: '0.3s', ms: 1000, input: { team: 'quarry-labs', endpoint: '/crawl', limit: 1 }, output: { id: 'crawl_41ab9c', pages: 1204, credits: 1204, status: 'completed' } },
    blocks: [
      { type: 'text', html: `<p>Your crawl of <code>docs.quarry.dev</code> finished in 3m 12s and used <strong>1,204 credits</strong>, one for each page it scraped${cite(1, SOURCES.credits)}.</p>` },
      { type: 'details', title: 'crawl_41ab9c', meta: 'Today, 11:40 AM', icon: 'network', items: [
        { key: 'Run ID', value: 'crawl_41ab9c', copy: true },
        { key: 'Endpoint', value: 'POST /v2/crawl', mono: true },
        { key: 'Status', value: 'Completed', status: 'success' },
        { key: 'Pages', value: '1,204' },
        { key: 'Credits', value: '1,204' },
        { key: 'Duration', value: '3m 12s', mono: true },
      ] },
      { type: 'text', html: `<p>To keep the next one smaller, set <code>limit</code> to cap the pages, or keep it inside one section with <code>includePaths</code>${cite(2, SOURCES.crawl)}.</p>` },
      { type: 'sources', items: [SOURCES.credits, SOURCES.crawl] },
      { type: 'rating', variant: 'helpful' },
    ],
  });
}

/** Play a scripted conversation: 'ai', 'support' or 'handoff'. With reduced motion (or { instant }) the end state renders at once. */
export async function demo(el, name = 'support', { instant = false } = {}) {
  const ctrl = get(el);
  if (!ctrl) return;
  const R = runner(ctrl, { instant });
  ctrl.clear();
  ctrl.setDisabled(false);
  ctrl.setAgent({ kind: 'ai' });
  ctrl.clock = new Date('2026-11-14T14:18:00');
  if (!ctrl.isLog) ctrl.show('conversation');
  try {
    if (name === 'ai') await aiScript(R);
    else await supportScript(R, ctrl, { liveFrom: name === 'handoff' ? 1 : 0 });
  } catch (error) {
    if (error !== ABORT) console.error('[fire] chat demo failed', error);
    return;
  }
  if (R.alive()) { ctrl.run = null; ctrl.scripted = false; ctrl.instant = false; setRunning(ctrl.composer, false); }
  emit(ctrl.root, 'fd:change', { value: 'done', kind: 'demo' });
}
/** Stop a running demo. */
export function stopDemo(el) { get(el)?.stopRun(); }

/* Scripted replies for chats with data-fd-chat-demo: the shell, the docs, the support template. */
async function respond(ctrl, text) {
  const R = runner(ctrl);
  R.fast = false;
  const t = text.toLowerCase();
  try {
    await R.pause(450);
    if (/(fail|error|timeout|408|req_)/.test(t)) await scenes.lookup(R);
    else if (/(charged|charge)/.test(t)) await scenes.charged(R);
    else if (/refund/.test(t)) await scenes.refundOffer(R);
    else if (/(person|human|someone|talk to|agent)/.test(t)) await scenes.handoff(R, ctrl, { reason: 'person' });
    else if (/invoice|receipt/.test(t)) {
      await R.ai({ status: 'Finding your invoices…', tool: { type: 'tool', name: 'Listed', args: 'invoices · Quarry Labs', meta: '0.2s', ms: 700 }, blocks: [
        { type: 'text', text: 'Here are your last three. Which one do you need?' },
        { type: 'list', title: 'Which invoice?', meta: '3 invoices', icon: 'receipt', name: 'invoice', options: [
          { value: 'INV-2026-011', title: 'INV-2026-011', desc: 'Nov 1 · Hobby plan', meta: '$16.00' },
          { value: 'INV-2026-010', title: 'INV-2026-010', desc: 'Oct 12 · 5,000-credit top-up', meta: '$19.00' },
          { value: 'INV-2026-009', title: 'INV-2026-009', desc: 'Oct 1 · Hobby plan', meta: '$16.00' },
        ], confirm: 'Get invoice' },
      ] });
    } else if (/(rate limit|429|limit|concurren|throttl)/.test(t)) {
      await R.ai({ status: 'Checking your recent 429s…', tool: { type: 'tool', name: 'Searched', args: 'logs · status 429 · 24h', meta: '0.6s', ms: 900 }, blocks: [
        { type: 'notice', tone: 'warning', title: '41 requests were rate limited today', text: 'Hobby allows 5 concurrent requests. Your batch job started 12 at once.' },
        { type: 'table', title: 'Latest 429 responses', columns: [{ label: 'Time', mono: true }, { label: 'Endpoint', mono: true }, { label: 'Status' }, { label: 'Retry after', num: true }], rows: [
          ['2:14 PM', '/scrape', { status: 'danger', label: '429' }, '2s'], ['2:14 PM', '/scrape', { status: 'danger', label: '429' }, '2s'], ['2:13 PM', '/crawl', { status: 'danger', label: '429' }, '5s'], ['1:58 PM', '/scrape', { status: 'danger', label: '429' }, '1s'],
        ], foot: 'logs · last 24 hours' },
        { type: 'text', html: `<p>Queue the batch at 5 at a time, or move to Standard for 50 concurrent requests${cite(1, SOURCES.limits)}.</p>` },
        { type: 'actions', items: [{ label: 'Compare plans', variant: 'primary', value: 'plans' }, { label: 'Read about rate limits', variant: 'link', href: 'https://docs.ember.dev/rate-limits', value: 'docs' }] },
      ] });
    } else if (/(credit|billing|usage|plan|cost|price)/.test(t)) {
      await R.ai({ status: 'Reading your usage…', think: 900, blocks: [
        { type: 'text', text: 'Every page you scrape or crawl costs one credit; failed requests are free. Credits renew on your billing date, and top-ups never expire.' },
        { type: 'metric', title: 'Hobby plan', meta: 'Resets Nov 23', icon: 'gauge', figure: 1480, caption: 'credits used this cycle', value: 1480, max: 3000, unit: 'credits', label: 'Used', foot: '1,520 left · about 9 days at your current pace', series: [62, 88, 41, 120, 96, 140, 77, 158, 132, 104, 170, 91, 143, 58] },
        { type: 'text', text: 'If you need more, these are the plans people on Hobby move to:' },
        { type: 'carousel', label: 'Plans', cards: [
          { title: 'Standard', meta: '100,000 credits a month', icon: 'zap', tone: 'accent', price: '$83', per: '/ month', text: '50 concurrent requests and priority support.', actions: [{ label: 'Choose Standard', variant: 'primary', value: 'standard' }] },
          { title: 'Growth', meta: '500,000 credits a month', icon: 'rocket', price: '$333', per: '/ month', text: '100 concurrent requests and a shared Slack channel.', actions: [{ label: 'Choose Growth', value: 'growth' }] },
          { title: 'Credit top-up', meta: 'Never expires', icon: 'plus', price: '$19', per: '/ 5,000 credits', text: 'Stay on Hobby and add credits when you need them.', actions: [{ label: 'Buy top-up', value: 'topup' }] },
        ] },
      ] });
    } else if (/(thank|fixed|works|great|perfect)/.test(t)) {
      await R.ai({ think: 600, blocks: [{ type: 'text', text: 'Glad that sorted it. I’m here if anything else comes up.' }, { type: 'rating', variant: 'helpful' }] });
    } else {
      await R.ai({ status: 'Searching the docs…', think: 1000, blocks: [
        { type: 'text', text: 'I can look into failed requests, credits and invoices, rate limits, or put you in touch with the support team. What would you like to start with?' },
        { type: 'quick-replies', options: ['Why did my request fail?', 'Show my recent invoices', 'Talk to a person'] },
      ] });
    }
  } catch (error) { if (error !== ABORT) console.error('[fire] chat reply failed', error); return; }
  if (R.alive()) { ctrl.run = null; ctrl.scripted = false; ctrl.instant = false; }
}
async function respondAction(ctrl, type, value) {
  const R = runner(ctrl);
  R.fast = false;
  try {
    await R.pause(400);
    if (type === 'list') {
      await R.ai({ status: 'Fetching the PDF…', think: 900, blocks: [
        { type: 'text', text: `Here is ${esc(value)}. It’s also in Settings → Billing.` },
        { type: 'attachment', files: [{ name: `${value}.pdf`, size: 48210, kind: 'pdf' }] },
      ] });
    } else if (type === 'confirm') {
      await scenes.handoff(R, ctrl, { reason: 'refund' });
    }
  } catch (error) { if (error !== ABORT) console.error('[fire] chat reply failed', error); return; }
  if (R.alive()) { ctrl.run = null; ctrl.scripted = false; ctrl.instant = false; }
}

/* ==========================================================================
   Init
   ========================================================================== */
function initRender(log) {
  if (!once(log, 'fd-chat-render')) return;
  const sel = log.dataset.fdChatRender;
  const src = sel ? document.querySelector(sel) : $(':scope > script[type="application/json"]', log);
  let data = null;
  try { data = JSON.parse(src?.textContent || 'null'); } catch (error) { console.error('[fire] chat JSON', error); }
  if (!data) return;
  const ctrl = get(log);
  (Array.isArray(data) ? data : [data]).forEach((m) => ctrl.add(m, { instant: true }));
}

function initPlay(chat) {
  if (!once(chat, 'fd-chat-play')) return;
  const name = chat.dataset.fdChatPlay;
  if (reducedMotion() || !('IntersectionObserver' in window)) { demo(chat, name, { instant: true }); return; }
  const r = chat.getBoundingClientRect();
  const visible = r.top < innerHeight * 0.8 && r.bottom > 0 && r.width > 0;
  if (visible) { demo(chat, name); return; }
  demo(chat, name, { instant: true });
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); demo(chat, name); }
  }, { threshold: 0.3 });
  io.observe(chat);
}

function initTeaser(t) {
  if (!once(t, 'fd-chat-teaser')) return;
  if (!t.dataset.state) t.dataset.state = 'closed';
  const id = t.dataset.for;
  if (id && store.get(`fd-chat-teaser:${id}`)) return;
  const delay = +(t.dataset.delay ?? 4000);
  setTimeout(() => {
    const c = id ? get(id) : null;
    if (c && c.floating && c.isOpen) return;
    t.dataset.state = 'open';
  }, reducedMotion() ? Math.min(delay, 600) : delay);
}

/** Wire every chat, bare log, launcher and teaser inside `root`. Idempotent. */
export function init(root = document) {
  bindGlobal();
  scope(root, '.fd-chat').forEach((c) => get(c));
  scope(root, '.fd-chat-log').forEach((log) => { if (!log.closest('.fd-chat')) get(log); });
  scope(root, '.fd-chat-log[data-fd-chat-render]').forEach(initRender);
  scope(root, '[data-fd-chat-toggle], [data-fd-chat-open]').forEach((l) => {
    const id = l.dataset.fdChatToggle || l.dataset.fdChatOpen;
    if (id) { const c = get(id); if (c) { l.setAttribute('aria-controls', id); if (l.hasAttribute('data-fd-chat-toggle')) l.setAttribute('aria-expanded', String(c.floating && c.isOpen)); } }
    if (l.tagName === 'BUTTON' && !l.hasAttribute('type')) l.type = 'button';
  });
  scope(root, '.fd-chat-teaser').forEach(initTeaser);
  scope(root, '.fd-chat[data-fd-chat-play]').forEach(initPlay);
}
