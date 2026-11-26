/* Fire code — code blocks, snippets, endpoints, JSON trees, view switches, logs, diffs, schemas.
 *
 * Markup contract (see fire/components/code.css for the full markup of each block):
 *
 *  .fd-codeblock                     Enhanced on init. Every `.fd-codeblock-body > code` is tokenised
 *                                    (data-lang="json|bash|curl|javascript|typescript|python"; aliases ok)
 *                                    unless it already contains elements, then split into
 *                                    `.fd-codeblock-line` spans. Code that is already marked up keeps its spans.
 *    data-lines                      line numbers
 *    data-highlight="3,5-7"          highlighted lines (on the block or on one pane)
 *    data-collapse="240"             collapsed to N px with a "Show all 48 lines" button
 *    data-wrap                       soft wrap; toggled by `.fd-codeblock-btn[data-action="wrap"]`
 *    data-sync="lang"                tab group; the chosen tab is stored in localStorage and applied to
 *                                    every block on the page with the same group ("none" opts out)
 *    .fd-codeblock-tab[data-value]   ↔ `.fd-codeblock-body[data-value]` panes
 *    .fd-codeblock-copy              copies the visible pane; icon becomes a check + "Copied" for 1.4s
 *  .fd-snippet .fd-snippet-copy      copies `.fd-snippet-text` (or the button's data-copy)
 *  [data-copy-next="…"]              (0.13) on a .fd-codeblock, .fd-snippet or .fd-copy-field: the step after copying.
 *                                    It shows in the .fd-copy-next line right after the block (written in the markup,
 *                                    or added at init) once Copy is pressed; the line holds its space from the start
 *                                    (the step is drawn in it, hidden) and is the polite live region, saying one
 *                                    message: the copied confirmation, then the step. A copy field's copy (forms.js)
 *                                    is seen through its fd:copy event. Copying again adds nothing. Without script
 *                                    the line stays empty.
 *  .fd-endpoint                      data-method is read from the tag if missing; `{params}` in the path are wrapped.
 *    [data-copyable]                 (use a <button>) copies data-copy or the path
 *  .fd-json                          rendered from data-json or a child <script type="application/json">.
 *    data-depth="2"                  levels open at first render     data-truncate="80"  string length before "+N chars"
 *    data-toolbar data-label="…"     adds the bar (label, size, Expand all / Collapse all / Copy)
 *    data-max-height="320"           scrolls inside
 *    Keyboard: ↑ ↓ move, → ← open/close, Enter toggles, Tab reaches the hovered line's Copy / Path.
 *  .fd-viewswitch                    `.fd-viewswitch-item[data-value]` shows the matching `[data-view]` panel
 *                                    inside data-target (selector) or the nearest `[data-fd-views]`.
 *  .fd-log                           search, level chips, Follow, wrap, download; "Jump to latest" when the reader scrolls up.
 *    data-follow data-paused data-height="320" data-max="1000" data-filename="ember-logs.txt"
 *    data-fit                        the body fits its lines, up to that height, then scrolls.
 *    data-lines [data-anchor="build"] numbers the rows; each number is <a class="fd-log-num" href="#L42"> and its row
 *                                    gets id="L42" (build-L42 with data-anchor). The numbers are one tab stop: Arrow
 *                                    Up/Down, Home and End move between visible lines, Enter or a click marks the line
 *                                    aria-current="true" and writes it to the address (replaceState, no history entry).
 *                                    On load, and on hashchange, the line the address names is marked and scrolled to.
 *    .fd-log-btn[data-action="first-error"]   marks and scrolls to the first visible row[data-level="error"];
 *                                    disabled while there is none.
 *    data-fd-log-demo="api|cli"      streams demo lines (api) or plays a CLI session (cli) once in view.
 *  .fd-diff  > script.fd-diff-src    unified diff text → rows with old/new numbers; data-file adds a header.
 *  .fd-schema-toggle                 shows/hides the next `.fd-schema-children`.
 *
 * API: init(root), enhanceCodeblock(block), highlight(code, lang) → HTML, tokenize(code, lang) → [{t, v}],
 *      renderJSON(el, data, {depth, truncate}), setJSONExpanded(el, open), getJSON(el),
 *      selectTab(block, value), appendLog(el, entry | string) → row, streamLogDemo(el) → stop(),
 *      playTerminal(el, script?) → Promise, copied(button, {label, slot}),
 *      copyNextLine(block) → the .fd-copy-next line or null, showCopyNext(block, confirmation) → boolean,
 *      showLine(el, line | row, {focus, hash}) → row, firstError(el, {focus}) → row.
 * Events: fd:change (tabs, view switch; detail.value).
 *         fd:select  .fd-log  { value: line number, row }   a line number was chosen; cancelable (preventDefault keeps
 *                                                            the line and the address as they were)
 */
import { $, $$, on, once, emit, copyText, ensureId, reducedMotion, label as fdLabel } from './core.js';
import { icon } from './icons.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const scope = (root, sel) => [...(root instanceof Element && root.matches(sel) ? [root] : []), ...$$(sel, root)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ==========================================================================
   Tokenizer — small, forgiving, never loses text.
   ========================================================================== */
const words = (s) => new Set(s.split(' '));
const JS_KW = words('const let var function return if else for while do switch case break continue new class extends import export from default async await try catch finally throw typeof instanceof in of this super null undefined true false yield delete void static get set as type interface enum implements readonly declare namespace keyof satisfies');
const PY_KW = words('def class return if elif else for while in not and or is None True False import from as with try except finally raise lambda yield async await pass break continue global nonlocal assert del');
const SH_KW = words('if then else elif fi for in do done while until case esac function return export local unset set');
const SH_PASS = words('sudo then do else time exec xargs env nohup watch');
const ALIAS = { js: 'javascript', jsx: 'javascript', ts: 'javascript', tsx: 'javascript', typescript: 'javascript', node: 'javascript', mjs: 'javascript', cjs: 'javascript', py: 'python', python3: 'python', sh: 'bash', shell: 'bash', zsh: 'bash', curl: 'bash', console: 'bash', cli: 'bash', terminal: 'bash', jsonc: 'json' };
const CLASS = { keyword: 'keyword', string: 'string', number: 'number', variable: 'number', comment: 'comment', punct: 'punct', key: 'key', fn: 'fn' };

const isWS = (c) => c === undefined || c === ' ' || c === '\t' || c === '\n' || c === '\r';
const nextChar = (s, i) => { while (s[i] === ' ' || s[i] === '\t') i += 1; return s[i]; };
const lineStart = (s, i) => i === 0 || s[i - 1] === '\n';
const noWordBefore = (s, i) => !/[\w$.]/.test(s[i - 1] || '');

function jsIdent(v, s, end, ctx) {
  if (JS_KW.has(v)) return 'keyword';
  if (ctx.prev === 'function' || ctx.prev === 'class') return 'fn';
  const n = nextChar(s, end);
  if (n === '(') return 'fn';
  if (n === ':' && s[s.indexOf(':', end) + 1] !== ':' && (ctx.prev === '{' || ctx.prev === ',' || ctx.prev === ';' || ctx.prev === '')) return 'key';
  return 'plain';
}
function pyIdent(v, s, end, ctx) {
  if (PY_KW.has(v)) return 'keyword';
  if (ctx.prev === 'def' || ctx.prev === 'class') return 'fn';
  return nextChar(s, end) === '(' ? 'fn' : 'plain';
}
function shWord(v, s, end, ctx) {
  if (!ctx.cmd) return SH_KW.has(v) && (v === 'in' || v === 'do' || v === 'then') ? 'keyword' : 'plain';
  if (s[end] === '=') return 'variable';
  ctx.cmd = SH_PASS.has(v);
  return SH_KW.has(v) ? 'keyword' : 'fn';
}
function shAfter(t, v, ctx, s, end) {
  if (t === 'nl') { if (!ctx.cont) ctx.cmd = true; ctx.cont = false; return; }
  if (t === 'ws' || t === 'comment') return;
  ctx.cont = v === '\\' && (s[end] === '\n' || s[end] === '\r');
  if (t === 'punct') { if (/^(\||&&|\|\||;|\(|&|\$ )$/.test(v)) ctx.cmd = true; return; }
  if (t === 'string' || t === 'number' || (t === 'keyword' && v[0] === '-')) ctx.cmd = false;
}

// [sticky regex, type | (value, source, end, ctx) => type, optional guard (source, index, ctx) => bool]
const LANGS = {
  json: [
    [/"(?:\\.|[^\\"\n])*"?/y, (v, s, end) => (nextChar(s, end) === ':' ? 'key' : 'string')],
    [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y, 'number'],
    [/(?:true|false|null)\b/y, 'keyword'],
    [/\/\/[^\n]*/y, 'comment'],
    [/[{}[\],:]/y, 'punct'],
  ],
  javascript: [
    [/\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y, 'comment'],
    [/`(?:\\[\s\S]|[^\\`])*`?|'(?:\\.|[^\\'\n])*'?|"(?:\\.|[^\\"\n])*"?/y, 'string'],
    [/(?:0[xXbBoO][\da-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)n?/y, 'number', noWordBefore],
    [/[A-Za-z_$][\w$]*/y, jsIdent],
    [/=>|\.\.\.|[{}()[\];,.:?<>=+\-*/%!&|^~@#]/y, 'punct'],
  ],
  python: [
    [/#[^\n]*/y, 'comment'],
    [/(?:[rRbBuUfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?)/y, 'string'],
    [/@[\w.]+/y, 'fn', (s, i) => lineStart(s, i) || /^\s*$/.test(s.slice(s.lastIndexOf('\n', i - 1) + 1, i))],
    [/\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?j?/y, 'number', noWordBefore],
    [/[A-Za-z_]\w*/y, pyIdent],
    [/[{}()[\];,.:<>=+\-*/%!&|^~]/y, 'punct'],
  ],
  bash: [
    [/#[^\n]*/y, 'comment', (s, i) => isWS(s[i - 1])],
    [/\$ (?=\S)/y, 'punct', lineStart],
    [/'[^']*'?/y, 'string'],
    [/"(?:\\[\s\S]|[^\\"])*"?/y, 'string'],
    [/\$(?:\{[^}\n]*\}?|[A-Za-z_]\w*|[0-9@#?*$!-])/y, 'variable'],
    [/--?[A-Za-z][\w-]*/y, 'keyword', (s, i) => isWS(s[i - 1])],
    [/\d+(?:\.\d+)?(?=[\s;|&)]|$)/y, 'number', (s, i) => isWS(s[i - 1]) || s[i - 1] === '='],
    [/[^\s|&;<>()'"`$\\=]+/y, shWord],
    [/&&|\|\||[|&;<>()=\\]/y, 'punct'],
  ],
};
const AFTER = { bash: shAfter };
const COMMON = [[/[ \t]+/y, 'ws'], [/\r?\n/y, 'nl']];

const langName = (lang) => { const l = String(lang || '').toLowerCase(); return ALIAS[l] || l; };

/** Split code into [{ t: type, v: text }]. Unknown languages come back as one plain token. */
export function tokenize(code, lang) {
  const name = langName(lang);
  const rules = LANGS[name];
  if (!rules) return [{ t: 'plain', v: code }];
  const all = [...COMMON, ...rules];
  const after = AFTER[name];
  const ctx = { prev: '', cmd: true, cont: false };
  const out = [];
  const push = (t, v) => {
    const type = t === 'ws' || t === 'nl' ? 'plain' : t;
    const last = out[out.length - 1];
    if (type === 'plain' && last && last.t === 'plain') last.v += v;
    else out.push({ t: type, v });
  };
  let i = 0;
  while (i < code.length) {
    let hit = false;
    for (const [re, type, guard] of all) {
      if (guard && !guard(code, i, ctx)) continue;
      re.lastIndex = i;
      const m = re.exec(code);
      if (!m || !m[0]) continue;
      const v = m[0];
      const t = typeof type === 'function' ? type(v, code, i + v.length, ctx) : type;
      push(t, v);
      if (t !== 'ws' && t !== 'nl' && t !== 'comment') ctx.prev = v;
      if (after) after(t, v, ctx, code, i + v.length);
      i += v.length;
      hit = true;
      break;
    }
    if (!hit) { push('plain', code[i]); ctx.prev = code[i]; i += 1; }
  }
  return out;
}

const tokenHTML = (tok) => {
  if (tok.cls != null) return tok.cls ? `<span class="${esc(tok.cls)}">${esc(tok.v)}</span>` : esc(tok.v);
  return tok.t === 'plain' || !CLASS[tok.t] ? esc(tok.v) : `<span class="fd-syntax-${CLASS[tok.t]}">${esc(tok.v)}</span>`;
};

/** Highlight code to an HTML string of `.fd-syntax-*` spans. */
export function highlight(code, lang) {
  return tokenize(String(code), lang).map(tokenHTML).join('');
}

/** Tokens from markup that is already highlighted: each child element keeps its class. */
function tokensFromDOM(el) {
  const out = [];
  el.childNodes.forEach((node) => {
    if (node.nodeType === 3) out.push({ t: 'plain', v: node.textContent });
    else if (node.nodeType === 1) out.push({ cls: node.getAttribute('class') || '', v: node.textContent });
  });
  return out;
}
function trimTokens(tokens) {
  if (tokens[0]) tokens[0].v = tokens[0].v.replace(/^\r?\n/, '');
  while (tokens.length) {
    const last = tokens[tokens.length - 1];
    last.v = last.v.replace(/\s+$/, '');
    if (last.v) break;
    tokens.pop();
  }
  return tokens.filter((t) => t.v);
}
function toLines(tokens) {
  const lines = [[]];
  tokens.forEach((tok) => {
    tok.v.split(/\r?\n/).forEach((part, k) => {
      if (k) lines.push([]);
      if (part) lines[lines.length - 1].push({ ...tok, v: part });
    });
  });
  return lines;
}
function parseRanges(spec) {
  const set = new Set();
  String(spec || '').split(',').forEach((part) => {
    const [a, b] = part.split('-').map((n) => parseInt(n, 10));
    if (Number.isNaN(a)) return;
    for (let n = a; n <= (Number.isNaN(b) || b == null ? a : b); n += 1) set.add(n);
  });
  return set;
}

/* ==========================================================================
   Copy feedback
   ========================================================================== */
let live;
function announce(message) {
  if (!live) {
    live = document.createElement('div');
    live.className = 'fd-sr-only';
    live.setAttribute('aria-live', 'polite');
    document.body.append(live);
  }
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = message; });
}
/* ---------- What to do after copying (0.13) ---------- */
const COPY_NEXT = '.fd-codeblock[data-copy-next], .fd-snippet[data-copy-next], .fd-copy-field[data-copy-next]';
/** The .fd-copy-next line after a block with data-copy-next, found or added, its step drawn but hidden; null without the attribute. */
export function copyNextLine(block) {
  const step = block instanceof Element ? block.getAttribute('data-copy-next') : null;
  if (!step) return null;
  let line = block.nextElementSibling;
  if (!line?.classList.contains('fd-copy-next')) {
    line = document.createElement('p');
    line.className = 'fd-copy-next';
    block.after(line);
  }
  line.setAttribute('role', 'status');
  line.setAttribute('aria-atomic', 'true');
  let said = line.firstElementChild;
  let text = said?.nextElementSibling;
  if (!said?.classList.contains('fd-sr-only') || !text || line.children.length !== 2) {
    said = document.createElement('span');
    said.className = 'fd-sr-only';
    text = document.createElement('span');
    line.replaceChildren(said, text);
  }
  if (text.textContent !== step) text.textContent = step;
  return line;
}
/** Show the step under a block with data-copy-next and say `confirmation`, then the step, as one message. False when it has none. */
export function showCopyNext(block, confirmation = 'Copied to clipboard') {
  const line = copyNextLine(block);
  if (!line) return false;
  const said = line.firstElementChild;
  said.textContent = '';
  requestAnimationFrame(() => {
    said.textContent = /[.!?]$/.test(confirmation) ? `${confirmation} ` : `${confirmation}. `;
    line.dataset.state = 'shown';
  });
  return true;
}

const ORIGINAL = new WeakMap();
const TIMERS = new WeakMap();
/** Swap a button's content to a check (+ label) for 1.4s. `slot` swaps only part of the button. */
export function copied(btn, { label = fdLabel(btn, 'copy.done', 'Copied'), slot = btn, iconOnly = false } = {}) {
  if (!ORIGINAL.has(slot)) ORIGINAL.set(slot, slot.innerHTML);
  clearTimeout(TIMERS.get(btn));
  slot.innerHTML = (iconOnly || !label ? icon('check') : `${icon('check')}<span class="fd-copied-label">${label}</span>`);
  btn.dataset.state = 'copied';
  const said = fdLabel(btn, 'copy.announce', 'Copied to clipboard');
  if (!showCopyNext(btn.closest('.fd-codeblock[data-copy-next], .fd-snippet[data-copy-next]'), said)) announce(said);
  TIMERS.set(btn, setTimeout(() => {
    slot.innerHTML = ORIGINAL.get(slot);
    ORIGINAL.delete(slot);
    if (btn.dataset.state === 'copied') delete btn.dataset.state;
  }, 1400));
}

/* ==========================================================================
   Code block
   ========================================================================== */
const RAW = new WeakMap();

function prepCode(code) {
  if (!once(code, 'fd-code')) return;
  const marked = code.children.length > 0;
  const lang = code.dataset.lang || /(?:^|\s)language-([\w-]+)/.exec(code.className)?.[1] || code.closest('[data-lang]')?.dataset.lang;
  let tokens;
  let text;
  if (marked) {
    tokens = trimTokens(tokensFromDOM(code));
    text = tokens.map((t) => t.v).join('');
  } else {
    text = code.textContent.replace(/^\r?\n/, '').replace(/\s+$/, '');
    tokens = tokenize(text, lang);
  }
  const lines = toLines(tokens);
  const hl = parseRanges(code.closest('[data-highlight]')?.dataset.highlight);
  code.innerHTML = lines.map((line, n) => `<span class="fd-codeblock-line"${hl.has(n + 1) ? ' data-hl' : ''}>${line.map(tokenHTML).join('')}</span>`).join('');
  code.dataset.count = String(lines.length);
  RAW.set(code, text);
}

const visiblePane = (block) => $$(':scope > .fd-codeblock-body', block).find((p) => !p.hidden);
const syncGroup = (block) => block.dataset.sync || 'lang';

function initCodeblock(block) {
  if (!once(block, 'fd-codeblock')) return;
  enhanceCodeblock(block);
}

/** Prepare a code block's panes, tabs, wrap button and collapse. init() runs it once per block; fd-code runs it again
 *  after it replaced the block's code. Idempotent. */
export function enhanceCodeblock(block) {
  const panes = $$(':scope > .fd-codeblock-body', block);
  panes.forEach((pane) => {
    const code = pane.querySelector(':scope > code');
    if (code) prepCode(code);
    if (!pane.hasAttribute('tabindex')) pane.tabIndex = 0;
  });
  const max = Math.max(1, ...panes.map((p) => +(p.querySelector('code')?.dataset.count || 1)));
  block.style.setProperty('--_k-digits', String(Math.max(2, String(max).length)));

  const list = $('.fd-codeblock-tabs', block);
  if (list) {
    list.setAttribute('role', 'tablist');
    const tabs = $$('.fd-codeblock-tab', list);
    tabs.forEach((tab) => {
      tab.setAttribute('role', 'tab');
      if (tab.tagName === 'BUTTON') tab.type = 'button';
      const pane = panes.find((p) => p.dataset.value === tab.dataset.value);
      if (pane) {
        tab.setAttribute('aria-controls', ensureId(pane, 'fd-pane'));
        pane.setAttribute('role', 'tabpanel');
        pane.setAttribute('aria-labelledby', ensureId(tab, 'fd-tab'));
      }
    });
    const stored = syncGroup(block) !== 'none' ? store.get(`fd-code-tab:${syncGroup(block)}`) : null;
    const initial = tabs.find((t) => t.dataset.value === stored) || tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
    if (initial) selectTab(block, initial.dataset.value, { persist: false });
  }

  const wrapBtn = $('.fd-codeblock-btn[data-action="wrap"]', block);
  if (wrapBtn) wrapBtn.setAttribute('aria-pressed', String(block.hasAttribute('data-wrap')));

  if (block.hasAttribute('data-collapse')) {
    const px = parseInt(block.dataset.collapse, 10);
    if (px) block.style.setProperty('--_k-max', `${px}px`);
    if (!$(':scope > .fd-codeblock-more', block)) {
      const more = document.createElement('div');
      more.className = 'fd-codeblock-more';
      more.innerHTML = `<button type="button" class="fd-codeblock-expand" aria-expanded="false"><span></span>${icon('chevron-down')}</button>`;
      block.append(more);
    }
  }
  updateMore(block);
}

function updateMore(block) {
  const more = $(':scope > .fd-codeblock-more', block);
  if (!more) return;
  const pane = visiblePane(block);
  const count = +(pane?.querySelector('code')?.dataset.count || 0);
  const cs = getComputedStyle(block);
  const max = parseFloat(cs.getPropertyValue('--_k-max')) || 280;
  const lh = parseFloat(pane ? getComputedStyle(pane).lineHeight : '');
  const lineH = Number.isFinite(lh) && lh > 0 ? lh : 20.8;
  const needed = count * lineH + 28 > max + 4;
  more.hidden = !needed;
  block.toggleAttribute('data-collapse-off', !needed);
  if (!needed) block.removeAttribute('data-expanded');
  const expanded = block.hasAttribute('data-expanded');
  const btn = more.querySelector('.fd-codeblock-expand');
  btn.setAttribute('aria-expanded', String(expanded));
  btn.querySelector('span').textContent = expanded ? fdLabel(btn, 'code.less', 'Show less') : fdLabel(btn, 'code.more', 'Show all {count} lines', { count: count.toLocaleString() });
}

/** Select a language tab. Persists and syncs other blocks in the same group unless { persist: false }. */
export function selectTab(block, value, { persist = true } = {}) {
  const tabs = $$('.fd-codeblock-tab', block);
  const tab = tabs.find((t) => t.dataset.value === value);
  if (!tab) return false;
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  $$(':scope > .fd-codeblock-body[data-value]', block).forEach((p) => { p.hidden = p.dataset.value !== value; });
  updateMore(block);
  if (persist) {
    const group = syncGroup(block);
    if (group !== 'none') {
      store.set(`fd-code-tab:${group}`, value);
      $$('.fd-codeblock').forEach((other) => {
        if (other !== block && syncGroup(other) === group) selectTab(other, value, { persist: false });
      });
    }
    emit(block, 'fd:change', { value });
  }
  return true;
}

/* ==========================================================================
   Endpoint
   ========================================================================== */
function initEndpoint(el) {
  if (!once(el, 'fd-endpoint')) return;
  const method = $('.fd-endpoint-method', el);
  if (!el.dataset.method && method) el.dataset.method = method.textContent.trim().toLowerCase();
  const path = $('.fd-endpoint-path', el);
  if (path && !path.children.length) {
    path.innerHTML = esc(path.textContent).replace(/\{[^}]+\}/g, (m) => `<span class="fd-endpoint-param">${m}</span>`);
  }
  if (el.hasAttribute('data-copyable')) {
    if (!$('.fd-endpoint-copy', el)) el.insertAdjacentHTML('beforeend', `<span class="fd-endpoint-copy" aria-hidden="true">${icon('copy')}</span>`);
    if (!el.hasAttribute('aria-label') && path) el.setAttribute('aria-label', `Copy ${method ? `${method.textContent.trim()} ` : ''}${path.textContent.trim()}`);
    if (el.tagName === 'BUTTON') el.type = 'button';
  }
}

/* ==========================================================================
   JSON tree
   ========================================================================== */
const JSON_STATE = new WeakMap();
const P = (s) => `<span class="fd-syntax-punct">${esc(s)}</span>`;
const pathJoin = (base, key) => (typeof key === 'number' ? `${base}[${key}]` : /^[A-Za-z_$][\w$]*$/.test(key) ? `${base}.${key}` : `${base}[${JSON.stringify(key)}]`);
const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
const sizeLabel = (bytes) => (bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`);
const ACTIONS = `<span class="fd-json-actions"><button type="button" class="fd-json-btn" data-copy="value" tabindex="-1">Copy</button><button type="button" class="fd-json-btn" data-copy="path" tabindex="-1">Path</button></span>`;

function jsonValueHTML(v, truncate) {
  if (typeof v === 'string') {
    if (v.length > truncate) {
      const head = JSON.stringify(v.slice(0, truncate)).slice(0, -1);
      return `<span class="fd-syntax-string">${esc(head)}…"</span><button type="button" class="fd-json-more" tabindex="-1">+${(v.length - truncate).toLocaleString()} chars</button>`;
    }
    return `<span class="fd-syntax-string">${esc(JSON.stringify(v))}</span>`;
  }
  if (typeof v === 'number') return `<span class="fd-syntax-number">${esc(String(v))}</span>`;
  return `<span class="fd-syntax-keyword">${esc(String(v))}</span>`;
}

/** Render `data` as a collapsible tree into `el` (an `.fd-json`). */
export function renderJSON(el, data, options = {}) {
  const depth = +(options.depth ?? el.dataset.depth ?? 2);
  const truncate = +(options.truncate ?? el.dataset.truncate ?? 80);
  const values = new Map();

  const node = (key, value, path, level, last) => {
    values.set(path, value);
    const comma = last ? '' : P(',');
    const k = typeof key === 'string' ? `<span class="fd-syntax-key">${esc(JSON.stringify(key))}</span>${P(': ')}` : '';
    const lineAttrs = `class="fd-json-line" role="treeitem" aria-level="${level + 1}" tabindex="-1" data-path="${esc(path)}"`;
    if (value && typeof value === 'object') {
      const isArr = Array.isArray(value);
      const entries = isArr ? value.map((v, i) => [i, v]) : Object.entries(value);
      const [o, c] = isArr ? ['[', ']'] : ['{', '}'];
      if (!entries.length) return `<div class="fd-json-node"><div ${lineAttrs}>${k}${P(o + c)}${comma}${ACTIONS}</div></div>`;
      const open = level < depth;
      const count = isArr ? plural(entries.length, 'item', 'items') : plural(entries.length, 'key', 'keys');
      const kids = entries.map(([ck, cv], i) => node(ck, cv, pathJoin(path, ck), level + 1, i === entries.length - 1)).join('');
      return `<div class="fd-json-node" data-container aria-expanded="${open}">`
        + `<div ${lineAttrs} aria-expanded="${open}"><button type="button" class="fd-json-toggle" tabindex="-1" aria-label="Toggle ${esc(typeof key === 'string' ? key : path)}">${icon('chevron-down')}</button>${k}${P(o)}<span class="fd-json-tail"><span class="fd-json-count">${count}</span>${P(c)}${comma}</span>${ACTIONS}</div>`
        + `<div class="fd-json-children" role="group">${kids}</div>`
        + `<div class="fd-json-line fd-json-close" aria-hidden="true">${P(c)}${comma}</div></div>`;
    }
    return `<div class="fd-json-node"><div ${lineAttrs}>${k}${jsonValueHTML(value, truncate)}${comma}${ACTIONS}</div></div>`;
  };

  const label = el.dataset.label || 'JSON';
  let bar = '';
  if (el.hasAttribute('data-toolbar')) {
    const top = data && typeof data === 'object' ? (Array.isArray(data) ? plural(data.length, 'item', 'items') : plural(Object.keys(data).length, 'key', 'keys')) : typeof data;
    const bytes = new Blob([JSON.stringify(data) ?? '']).size;
    bar = `<div class="fd-json-bar"><span class="fd-json-label">${icon('braces')}${esc(label)}</span><span class="fd-json-meta">${top} · ${sizeLabel(bytes)}</span>`
      + `<div class="fd-json-tools"><button type="button" class="fd-json-btn" data-action="expand">Expand all</button><button type="button" class="fd-json-btn" data-action="collapse">Collapse all</button><button type="button" class="fd-json-btn" data-action="copy" aria-label="Copy JSON">${icon('copy')}</button></div></div>`;
  }
  if (el.dataset.maxHeight) el.style.setProperty('--_k-max', `${parseInt(el.dataset.maxHeight, 10)}px`);
  el.innerHTML = `${bar}<div class="fd-json-tree"><div class="fd-json-root" role="tree" aria-label="${esc(label)}">${node(null, data, '$', 0, true)}</div></div>`;
  JSON_STATE.set(el, { data, values, truncate });
  const first = $('.fd-json-line[role="treeitem"]', el);
  if (first) first.tabIndex = 0;
}

/** The data a `.fd-json` was rendered from (undefined before it renders). */
export const getJSON = (el) => JSON_STATE.get(el)?.data;

function setNode(node, open) {
  node.setAttribute('aria-expanded', String(open));
  node.querySelector(':scope > .fd-json-line')?.setAttribute('aria-expanded', String(open));
}
/** Expand or collapse every node (the root stays open when collapsing). */
export function setJSONExpanded(el, open) {
  $$('.fd-json-node[data-container]', el).forEach((n, i) => setNode(n, open || i === 0));
}

function initJSON(el) {
  if (!once(el, 'fd-json')) return;
  let data = el.fdData;
  try {
    if (data === undefined && el.dataset.json) data = JSON.parse(el.dataset.json);
    const script = $(':scope > script[type="application/json"]', el);
    if (data === undefined && script) data = JSON.parse(script.textContent);
  } catch (error) {
    el.innerHTML = `<p class="fd-json-empty">This JSON could not be read: ${esc(error.message)}</p>`;
    return;
  }
  if (data !== undefined) renderJSON(el, data);
}

const visibleLines = (el) => $$('.fd-json-line[role="treeitem"]', el).filter((l) => !l.closest('.fd-json-node[aria-expanded="false"] > .fd-json-children'));
function focusLine(el, line) {
  if (!line) return;
  $$('.fd-json-line[tabindex="0"]', el).forEach((l) => { if (l !== line) l.tabIndex = -1; });
  line.tabIndex = 0;
  line.focus();
}
function expandString(line) {
  const el = line.closest('.fd-json');
  const state = JSON_STATE.get(el);
  const more = $(':scope > .fd-json-more', line);
  if (!state || !more) return;
  const value = state.values.get(line.dataset.path);
  more.previousElementSibling.textContent = JSON.stringify(value);
  more.remove();
}

/* ==========================================================================
   View switch
   ========================================================================== */
/** Panels a switch controls: [data-view] inside its target, not nested in another panel of that target. */
function viewPanels(sw) {
  const host = sw.dataset.target ? document.querySelector(sw.dataset.target) : sw.closest('[data-fd-views]');
  if (!host) return [];
  return $$('[data-view]', host).filter((p) => {
    const outer = p.parentElement.closest('[data-view]');
    return !outer || !host.contains(outer);
  });
}
function selectView(item, { focus = false } = {}) {
  const sw = item.closest('.fd-viewswitch');
  const items = $$('.fd-viewswitch-item', sw);
  items.forEach((i) => {
    const on = i === item;
    i.setAttribute('aria-selected', String(on));
    i.tabIndex = on ? 0 : -1;
  });
  if (focus) item.focus();
  const value = item.dataset.value;
  viewPanels(sw).forEach((p) => { p.hidden = p.dataset.view !== value; });
  emit(sw, 'fd:change', { value });
}
function initViewswitch(sw) {
  if (!once(sw, 'fd-viewswitch')) return;
  if (!sw.hasAttribute('role')) sw.setAttribute('role', 'tablist');
  const items = $$('.fd-viewswitch-item', sw);
  items.forEach((i) => { i.setAttribute('role', 'tab'); if (i.tagName === 'BUTTON') i.type = 'button'; });
  const current = items.find((i) => i.getAttribute('aria-selected') === 'true') || items[0];
  items.forEach((i) => { i.tabIndex = i === current ? 0 : -1; i.setAttribute('aria-selected', String(i === current)); });
  if (current) viewPanels(sw).forEach((p) => { p.hidden = p.dataset.view !== current.dataset.value; });
}

/* ==========================================================================
   Logs
   ========================================================================== */
const LOGS = new WeakMap();
const LEVELS = { info: 'INFO', warn: 'WARN', error: 'ERROR', debug: 'DEBUG' };
const MSG_ORIGINAL = new WeakMap();
const TONES = { 1: 'bold', 2: 'dim', 90: 'dim', 31: 'danger', 91: 'danger', 32: 'success', 92: 'success', 33: 'warning', 93: 'warning', 34: 'info', 94: 'info', 35: 'violet', 95: 'violet', 36: 'info', 96: 'info' };

/** Minimal ANSI SGR → tone spans. Unknown codes are dropped, text is never lost. */
function ansi(text) {
  const re = /\x1b\[([\d;]*)m/g; // eslint-disable-line no-control-regex
  let out = '';
  let last = 0;
  let tone = '';
  const flush = (chunk) => { if (chunk) out += tone ? `<span class="fd-log-tone" data-tone="${tone}">${esc(chunk)}</span>` : esc(chunk); };
  let m;
  while ((m = re.exec(text))) {
    flush(text.slice(last, m.index));
    const codes = m[1].split(';').map(Number);
    codes.forEach((c) => { if (c === 0 || c === 39 || c === 22) tone = ''; else if (TONES[c]) tone = TONES[c]; });
    last = re.lastIndex;
  }
  flush(text.slice(last));
  return out;
}
const pad = (n, w = 2) => String(n).padStart(w, '0');
const stamp = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;

const logBody = (el) => $(':scope > .fd-log-body', el);
const logRows = (el) => $$(':scope > .fd-log-row', logBody(el));
/** A row's text without its line number. */
const rowText = (row) => [...row.childNodes].filter((n) => !(n instanceof Element && n.classList.contains('fd-log-num'))).map((n) => n.textContent).join('');
const lineId = (el, n) => `${el.dataset.anchor ? `${el.dataset.anchor}-` : ''}L${n}`;

/** Give a row its number and anchor (data-lines). A number already in the markup is kept. */
function numberRow(el, row) {
  const state = LOGS.get(el);
  if (!state || !el.hasAttribute('data-lines') || row.dataset.line) return;
  const own = $(':scope > .fd-log-num', row);
  const n = own ? parseInt(own.textContent, 10) || state.line : state.line;
  state.line = n + 1;
  row.dataset.line = String(n);
  if (!row.id) row.id = lineId(el, n);
  const num = own ?? document.createElement('a');
  num.className = 'fd-log-num';
  num.href = `#${row.id}`;
  num.textContent = String(n);
  num.setAttribute('aria-label', fdLabel(el, 'log.line', 'Line {n}', { n }));
  num.tabIndex = -1;
  if (!own) row.prepend(num);
}

/** One tab stop among the numbers: the marked line's, else the first visible one's. */
function syncNumbers(el) {
  const nums = logRows(el).filter((r) => !r.hidden).map((r) => $(':scope > .fd-log-num', r)).filter(Boolean);
  if (!nums.length) return;
  const focused = nums.find((a) => a === document.activeElement);
  const home = focused ?? nums.find((a) => a.parentElement.getAttribute('aria-current') === 'true') ?? nums[0];
  $$(':scope > .fd-log-row > .fd-log-num', logBody(el)).forEach((a) => { a.tabIndex = a === home ? 0 : -1; });
}

/** Scroll the log body (never the page) so the row sits in the middle of it. */
function revealRow(el, row) {
  const body = logBody(el);
  if (!body || row.hidden) return;
  const top = row.offsetTop - body.clientHeight / 2 + row.offsetHeight / 2;
  body.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
}

/** Mark a line (a row, or its number) as the one the reader is looking at, and scroll to it. Pauses Follow. */
export function showLine(el, line, { focus = false, hash = false } = {}) {
  initLog(el);
  const state = LOGS.get(el);
  const row = line instanceof Element ? line.closest('.fd-log-row') : logRows(el).find((r) => r.dataset.line === String(line));
  if (!state || !row) return null;
  logRows(el).forEach((r) => { if (r !== row) r.removeAttribute('aria-current'); });
  row.setAttribute('aria-current', 'true');
  if (state.follow) state.paused = true;
  syncFollow(el);
  state.auto = true;
  revealRow(el, row);
  clearTimeout(state.autoTimer);
  state.autoTimer = setTimeout(() => { state.auto = false; }, 60);
  if (hash && row.id && el.hasAttribute('data-lines')) history.replaceState(history.state, '', `#${row.id}`);
  syncNumbers(el);
  if (focus) ($(':scope > .fd-log-num', row) ?? logBody(el))?.focus({ preventScroll: true });
  return row;
}

/** Mark and scroll to the first visible error row. */
export function firstError(el, { focus = true } = {}) {
  const row = logRows(el).find((r) => !r.hidden && r.dataset.level === 'error');
  return row ? showLine(el, row, { focus, hash: true }) : null;
}

function syncErrorButton(el) {
  const btn = $('.fd-log-btn[data-action="first-error"]', el);
  if (btn) btn.disabled = !logRows(el).some((r) => !r.hidden && r.dataset.level === 'error');
}

/** The row the address names, if it is in this log. */
function rowFromHash(el) {
  let id = location.hash.slice(1);
  try { id = decodeURIComponent(id); } catch { /* keep it as written */ }
  if (!id) return null;
  const row = document.getElementById(id);
  return row?.matches('.fd-log-row') && row.closest('.fd-log') === el ? row : null;
}

function initLog(el) {
  if (!once(el, 'fd-log')) return;
  const body = logBody(el);
  if (!body) return;
  if (!body.hasAttribute('tabindex')) body.tabIndex = 0;
  if (!body.hasAttribute('role')) body.setAttribute('role', 'log');
  if (el.dataset.height) el.style.setProperty('--_k-h', `${parseInt(el.dataset.height, 10)}px`);
  const state = { query: '', follow: el.hasAttribute('data-follow'), paused: el.hasAttribute('data-paused'), auto: false, line: 1 };
  LOGS.set(el, state);
  logRows(el).forEach((row) => numberRow(el, row));
  syncNumbers(el);
  syncErrorButton(el);
  if (!$(':scope > .fd-log-jump', el)) {
    const jump = document.createElement('button');
    jump.type = 'button';
    jump.className = 'fd-log-jump';
    jump.hidden = true;
    jump.innerHTML = `<span>Jump to latest</span>${icon('arrow-down')}`;
    el.append(jump);
  }
  body.addEventListener('scroll', () => {
    const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 24;
    if (atBottom) state.paused = false;
    else if (!state.auto && state.follow) state.paused = true;
    syncFollow(el);
  }, { passive: true });
  const wrapBtn = $('.fd-log-btn[data-action="wrap"]', el);
  if (wrapBtn) wrapBtn.setAttribute('aria-pressed', String(el.hasAttribute('data-wrap')));
  syncFollow(el);
  updateCounts(el);
  const linked = rowFromHash(el);
  if (linked) {
    // A link to a line: mark it, bring the log into view, and stop following so it stays put.
    requestAnimationFrame(() => { showLine(el, linked); el.scrollIntoView({ block: 'center' }); });
  } else if (state.follow && !state.paused) requestAnimationFrame(() => scrollToEnd(el));
  const demo = el.dataset.fdLogDemo;
  if (demo === 'api') streamLogDemo(el);
  if (demo === 'cli') whenVisible(el, () => playTerminal(el));
}

function syncFollow(el) {
  const state = LOGS.get(el);
  const btn = $('.fd-log-follow', el);
  if (btn) {
    btn.setAttribute('aria-pressed', String(state.follow));
    btn.toggleAttribute('data-paused', state.follow && state.paused);
  }
  const jump = $(':scope > .fd-log-jump', el);
  if (jump) jump.hidden = !(state.follow && state.paused);
}

function scrollToEnd(el, smooth = false) {
  const state = LOGS.get(el);
  const body = logBody(el);
  if (!state || !body) return;
  state.auto = true;
  body.scrollTo({ top: body.scrollHeight, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
  clearTimeout(state.autoTimer);
  state.autoTimer = setTimeout(() => { state.auto = false; }, smooth ? 500 : 60);
}

function activeLevels(el) {
  const chips = $$('.fd-log-filter[data-level]', el);
  if (!chips.length) return null;
  return new Set(chips.filter((c) => c.getAttribute('aria-pressed') !== 'false').map((c) => c.dataset.level));
}

function markText(root, query) {
  const q = query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const text = node.textContent;
    const lower = text.toLowerCase();
    let idx = lower.indexOf(q);
    if (idx < 0) return;
    const frag = document.createDocumentFragment();
    let from = 0;
    while (idx >= 0) {
      frag.append(text.slice(from, idx));
      const mark = document.createElement('mark');
      mark.className = 'fd-log-mark';
      mark.textContent = text.slice(idx, idx + q.length);
      frag.append(mark);
      from = idx + q.length;
      idx = lower.indexOf(q, from);
    }
    frag.append(text.slice(from));
    node.replaceWith(frag);
  });
}

function filterRow(el, row, levels = activeLevels(el)) {
  const state = LOGS.get(el);
  const msg = $('.fd-log-msg', row);
  if (msg && MSG_ORIGINAL.has(msg)) msg.innerHTML = MSG_ORIGINAL.get(msg);
  const level = row.dataset.level;
  const q = state?.query.trim() || '';
  const show = (!levels || !level || levels.has(level)) && (!q || rowText(row).toLowerCase().includes(q.toLowerCase()));
  row.hidden = !show;
  if (q && show && msg) {
    if (!MSG_ORIGINAL.has(msg)) MSG_ORIGINAL.set(msg, msg.innerHTML);
    markText(msg, q);
  }
}

function applyFilter(el) {
  const levels = activeLevels(el);
  const rows = logRows(el);
  rows.forEach((row) => filterRow(el, row, levels));
  syncEmpty(el, rows);
  syncNumbers(el);
  syncErrorButton(el);
}

function syncEmpty(el, rows = logRows(el)) {
  const body = logBody(el);
  let empty = $(':scope > .fd-log-empty', body);
  const none = rows.length > 0 && rows.every((r) => r.hidden);
  if (none && !empty) {
    empty = document.createElement('div');
    empty.className = 'fd-log-empty';
    body.append(empty);
  }
  if (empty) {
    empty.hidden = !none;
    const q = LOGS.get(el)?.query.trim();
    empty.textContent = q ? `No lines match “${q}” with the levels shown. Clear the search or turn a level back on.` : 'No lines at the levels shown. Turn a level back on to see them.';
  }
}

function updateCounts(el) {
  const chips = $$('.fd-log-filter[data-level]', el);
  if (!chips.length) return;
  const counts = {};
  logRows(el).forEach((r) => { counts[r.dataset.level] = (counts[r.dataset.level] || 0) + 1; });
  chips.forEach((chip) => {
    const slot = $('.fd-log-filter-count', chip);
    if (slot) slot.textContent = (counts[chip.dataset.level] || 0).toLocaleString();
  });
}

/** Append a line. `entry` is a string or { time, level: info|warn|error|debug, message, html }. Returns the row. */
export function appendLog(el, entry) {
  initLog(el);
  const state = LOGS.get(el);
  const body = logBody(el);
  if (!state || !body) return null;
  const e = typeof entry === 'string' ? { message: entry } : entry;
  const row = document.createElement('div');
  row.className = 'fd-log-row';
  const msg = e.html ?? ansi(e.message ?? '');
  if (el.dataset.variant === 'terminal') {
    row.innerHTML = `<span class="fd-log-msg">${msg}</span>`;
  } else {
    const level = String(e.level || 'info').toLowerCase();
    row.dataset.level = level;
    row.innerHTML = `<time class="fd-log-time">${esc(e.time ?? stamp())}</time><span class="fd-log-level">${LEVELS[level] || esc(level.toUpperCase())}</span><span class="fd-log-msg">${msg}</span>`;
  }
  row.dataset.new = '';
  row.addEventListener('animationend', () => row.removeAttribute('data-new'), { once: true });
  body.insertBefore(row, $(':scope > .fd-log-empty', body));
  numberRow(el, row);
  const max = parseInt(el.dataset.max, 10) || 1000;
  const rows = logRows(el);
  for (let i = 0; i < rows.length - max; i += 1) rows[i].remove();
  filterRow(el, row);
  updateCounts(el);
  syncEmpty(el);
  syncNumbers(el);
  if (row.dataset.level === 'error') syncErrorButton(el);
  if (state.follow && !state.paused) scrollToEnd(el);
  return row;
}

function downloadLog(el) {
  const lines = logRows(el).filter((r) => !r.hidden).map((r) => [$('.fd-log-time', r)?.textContent, $('.fd-log-level', r)?.textContent, $('.fd-log-msg', r)?.textContent].filter(Boolean).join('  '));
  const url = URL.createObjectURL(new Blob([`${lines.join('\n')}\n`], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = el.dataset.filename || 'ember-logs.txt';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function whenVisible(el, fn, { repeat = false } = {}) {
  if (!('IntersectionObserver' in window)) { fn(true); return () => {}; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (repeat) fn(entry.isIntersecting);
      else if (entry.isIntersecting) { io.disconnect(); fn(true); }
    });
  }, { threshold: 0.25 });
  io.observe(el);
  return () => io.disconnect();
}

const DEMO_API = [
  ['info', 'POST /v2/scrape 200 · ember.dev/pricing · \x1b[2m1.18s\x1b[0m'],
  ['debug', 'cache miss key=scrape:9f3a2c ttl=3600'],
  ['info', 'crawl job_8Kq2Lm queued · limit=50 depth=2'],
  ['info', 'GET /v2/crawl/job_8Kq2Lm 200 · 12/50 pages'],
  ['warn', 'robots.txt disallows /admin on docs.ember.dev, skipped 3 URLs'],
  ['info', 'POST /v2/search 200 · "agent frameworks" · 10 results · \x1b[2m0.92s\x1b[0m'],
  ['error', 'POST /v2/extract 429 · rate limit of 60/min reached · retrying in 4s'],
  ['debug', 'browser pool size=8 idle=5 busy=3'],
  ['info', 'webhook delivered → hooks.northwind.dev/ember · \x1b[32m202\x1b[0m · 88ms'],
  ['info', 'GET /v2/crawl/job_8Kq2Lm 200 · 31/50 pages'],
  ['warn', 'ember.dev/blog/launch took 7.4s to settle; raised waitFor to 8000ms'],
  ['info', 'POST /v2/extract 200 · schema=pricing_tiers · 4 rows · \x1b[2m3.06s\x1b[0m'],
];

/** Stream demo lines while the log is on screen. Returns a stop function. */
export function streamLogDemo(el, { lines = DEMO_API, min = 600, max = 1600 } = {}) {
  let i = 0;
  let visible = false;
  let timer;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    if (visible && document.visibilityState === 'visible') {
      const [level, message] = lines[i % lines.length];
      appendLog(el, { level, message });
      i += 1;
    }
    timer = setTimeout(tick, min + Math.random() * (max - min));
  };
  const unobserve = whenVisible(el, (v) => { visible = v; }, { repeat: true });
  timer = setTimeout(tick, min);
  return () => { stopped = true; clearTimeout(timer); unobserve(); };
}

const DEMO_CLI = {
  command: 'ember crawl https://docs.ember.dev --limit 50 --format markdown',
  lines: [
    '\x1b[2m→\x1b[0m Authenticated as \x1b[1mPersonal Team\x1b[0m \x1b[2m(key ek-…0f16)\x1b[0m',
    '\x1b[2m→\x1b[0m Crawling docs.ember.dev \x1b[2m· limit 50 · depth 3\x1b[0m',
    { progress: 50 },
    '\x1b[33m!\x1b[0m Skipped 3 URLs disallowed by robots.txt',
    '\x1b[32m✓\x1b[0m 50 pages · 50 credits · 38.2s',
    '\x1b[32m✓\x1b[0m Saved to ./ember-docs/ \x1b[2m(50 files, 1.8 MB)\x1b[0m',
  ],
};
const bar = (n, total, width = 24) => {
  const done = Math.round((n / total) * width);
  return `\x1b[2m[\x1b[0m${'█'.repeat(done)}\x1b[2m${'·'.repeat(width - done)}]\x1b[0m ${String(n).padStart(String(total).length)}/${total} pages`;
};
const PLAYS = new WeakMap();

/** Play a scripted CLI session in a terminal-variant log. Renders the final state at once under reduced motion. */
export async function playTerminal(el, script = DEMO_CLI) {
  initLog(el);
  const run = (PLAYS.get(el) || 0) + 1;
  PLAYS.set(el, run);
  const alive = () => PLAYS.get(el) === run;
  const body = logBody(el);
  logRows(el).forEach((r) => r.remove());
  LOGS.get(el).line = 1;
  const prompt = '<span class="fd-log-prompt">$ </span>';
  const instant = reducedMotion();
  const cmdRow = appendLog(el, { html: `${prompt}<span class="fd-log-cmd"></span><span class="fd-log-cursor"></span>` });
  const cmd = $('.fd-log-cmd', cmdRow);
  if (instant) cmd.textContent = script.command;
  else {
    await wait(500);
    for (const ch of script.command) {
      if (!alive()) return;
      cmd.textContent += ch;
      await wait(18 + Math.random() * 40);
    }
    await wait(350);
  }
  $('.fd-log-cursor', cmdRow)?.remove();
  for (const line of script.lines) {
    if (!alive()) return;
    if (typeof line === 'object' && line.progress) {
      const row = appendLog(el, { message: bar(0, line.progress) });
      if (instant) { $('.fd-log-msg', row).innerHTML = ansi(bar(line.progress, line.progress)); continue; }
      for (let n = 1; n <= line.progress; n += 1) {
        if (!alive()) return;
        $('.fd-log-msg', row).innerHTML = ansi(bar(n, line.progress));
        await wait(40 + Math.random() * 60);
      }
      continue;
    }
    appendLog(el, line);
    if (!instant) await wait(260 + Math.random() * 260);
  }
  if (alive()) appendLog(el, { html: `${prompt}<span class="fd-log-cursor"></span>` });
  body.scrollTop = body.scrollHeight;
}

/* ==========================================================================
   Diff
   ========================================================================== */
function initDiff(el) {
  if (!once(el, 'fd-diff')) return;
  const src = $(':scope > .fd-diff-src', el);
  if (!src) return;
  const text = src.textContent.replace(/^\r?\n/, '').replace(/\s+$/, '');
  const lang = el.dataset.lang;
  let o = 0;
  let n = 0;
  let add = 0;
  let del = 0;
  const rows = [];
  const row = (type, a, b, sign, html) => `<div class="fd-diff-line" data-type="${type}"><span class="fd-diff-num">${a}</span><span class="fd-diff-num">${b}</span><span class="fd-diff-sign">${sign}</span><span class="fd-diff-code">${html}</span></div>`;
  text.split(/\r?\n/).forEach((line) => {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) { o = +hunk[1]; n = +hunk[2]; rows.push(`<div class="fd-diff-line" data-type="hunk"><span class="fd-diff-num"></span><span class="fd-diff-num"></span><span class="fd-diff-code">${esc(line)}</span></div>`); return; }
    if (/^(diff --git|index |--- |\+\+\+ )/.test(line)) return;
    const c = line[0];
    const rest = line.slice(1);
    if (c === '+') { add += 1; rows.push(row('add', '', n, '+', highlight(rest, lang))); n += 1; }
    else if (c === '-') { del += 1; rows.push(row('del', o, '', '−', highlight(rest, lang))); o += 1; }
    else if (c === '\\') rows.push(`<div class="fd-diff-line" data-type="meta"><span class="fd-diff-num"></span><span class="fd-diff-num"></span><span class="fd-diff-sign"></span><span class="fd-diff-code">${esc(line)}</span></div>`);
    else { rows.push(row('ctx', o, n, '', highlight(c === ' ' ? rest : line, lang))); o += 1; n += 1; }
  });
  let head = '';
  if (el.dataset.file) {
    const total = add + del || 1;
    const addSq = Math.round((add / total) * 5);
    const delSq = Math.min(5 - addSq, Math.round((del / total) * 5));
    const squares = [...Array(5)].map((_, i) => `<i${i < addSq ? ' data-type="add"' : i < addSq + delSq ? ' data-type="del"' : ''}></i>`).join('');
    head = `<div class="fd-diff-head"><span class="fd-diff-file">${icon('file-diff')}${esc(el.dataset.file)}</span><span class="fd-diff-stats"><span class="fd-diff-stat" data-type="add">+${add}</span><span class="fd-diff-stat" data-type="del">−${del}</span><span class="fd-diff-bar" aria-hidden="true">${squares}</span></span></div>`;
  }
  src.remove();
  el.insertAdjacentHTML('beforeend', `${head}<div class="fd-diff-body" tabindex="0" aria-label="${esc(el.dataset.file || 'Diff')}">${rows.join('')}</div>`);
}

/* ==========================================================================
   Schema
   ========================================================================== */
function initSchemaToggle(btn) {
  if (!once(btn, 'fd-schema-toggle')) return;
  const kids = btn.getAttribute('aria-controls') ? document.getElementById(btn.getAttribute('aria-controls')) : btn.nextElementSibling;
  if (!kids || !kids.classList.contains('fd-schema-children')) return;
  btn.setAttribute('aria-controls', ensureId(kids, 'fd-schema'));
  if (btn.tagName === 'BUTTON') btn.type = 'button';
  const open = btn.getAttribute('aria-expanded') === 'true';
  kids.hidden = !open;
}
function toggleSchema(btn) {
  const kids = document.getElementById(btn.getAttribute('aria-controls'));
  if (!kids) return;
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  kids.hidden = !open;
  const label = $('span', btn);
  if (label) {
    if (!label.dataset.closed) label.dataset.closed = label.textContent;
    label.textContent = open ? (btn.dataset.openLabel || 'Hide child attributes') : label.dataset.closed;
  }
}

/* ==========================================================================
   Delegated behaviour (bound once)
   ========================================================================== */
function bindGlobal() {
  if (!once(document, 'fd-code-global')) return;

  on(document, 'click', '.fd-codeblock-tab', (e, tab) => selectTab(tab.closest('.fd-codeblock'), tab.dataset.value));
  on(document, 'keydown', '.fd-codeblock-tab', (e, tab) => {
    const tabs = $$('.fd-codeblock-tab', tab.closest('.fd-codeblock-tabs'));
    const i = tabs.indexOf(tab);
    const next = { ArrowRight: tabs[i + 1] || tabs[0], ArrowLeft: tabs[i - 1] || tabs[tabs.length - 1], Home: tabs[0], End: tabs[tabs.length - 1] }[e.key];
    if (!next) return;
    e.preventDefault();
    selectTab(tab.closest('.fd-codeblock'), next.dataset.value);
    next.focus();
  });
  on(document, 'click', '.fd-codeblock-copy', async (e, btn) => {
    const block = btn.closest('.fd-codeblock');
    const code = visiblePane(block)?.querySelector('code');
    const text = btn.dataset.copy ?? (code ? RAW.get(code) ?? code.textContent : '');
    if (await copyText(text)) copied(btn);
  });
  on(document, 'click', '.fd-codeblock-btn[data-action="wrap"]', (e, btn) => {
    const block = btn.closest('.fd-codeblock');
    const wrap = !block.hasAttribute('data-wrap');
    block.toggleAttribute('data-wrap', wrap);
    btn.setAttribute('aria-pressed', String(wrap));
  });
  on(document, 'click', '.fd-codeblock-expand', (e, btn) => {
    const block = btn.closest('.fd-codeblock');
    const open = !block.hasAttribute('data-expanded');
    block.toggleAttribute('data-expanded', open);
    updateMore(block);
    if (!open && block.getBoundingClientRect().top < 0) block.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
  });

  // A copy field (forms.js) says it copied with fd:copy; its line is shown here, as one message.
  on(document, 'fd:copy', '.fd-copy-field[data-copy-next]', (e, field) => { if (e.target === field) showCopyNext(field, fdLabel(field, 'copy.announce', 'Copied to clipboard')); });
  on(document, 'click', '.fd-snippet-copy', async (e, btn) => {
    const text = btn.dataset.copy ?? $('.fd-snippet-text', btn.closest('.fd-snippet'))?.textContent.trim() ?? '';
    if (await copyText(text)) copied(btn, { iconOnly: true });
  });
  on(document, 'click', '.fd-endpoint[data-copyable]', async (e, el) => {
    const text = el.dataset.copy ?? $('.fd-endpoint-path', el)?.textContent.trim() ?? '';
    const slot = $('.fd-endpoint-copy', el);
    if (await copyText(text)) copied(el, { slot: slot || el, iconOnly: true });
  });

  // JSON
  on(document, 'click', '.fd-json-line', (e, line) => {
    const el = line.closest('.fd-json');
    if (e.target.closest('.fd-json-btn')) return;
    if (e.target.closest('.fd-json-more')) { expandString(line); return; }
    const node = line.parentElement;
    if (!node.hasAttribute('data-container') || line.classList.contains('fd-json-close')) return;
    if (window.getSelection()?.toString()) return;
    setNode(node, node.getAttribute('aria-expanded') !== 'true');
    focusLine(el, line);
  });
  on(document, 'click', '.fd-json-btn[data-copy]', async (e, btn) => {
    const line = btn.closest('.fd-json-line');
    const state = JSON_STATE.get(btn.closest('.fd-json'));
    if (!state) return;
    const path = line.dataset.path;
    const value = state.values.get(path);
    const text = btn.dataset.copy === 'path' ? path : typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    if (await copyText(text)) copied(btn, { iconOnly: false });
  });
  on(document, 'click', '.fd-json-btn[data-action]', async (e, btn) => {
    const el = btn.closest('.fd-json');
    const action = btn.dataset.action;
    if (action === 'expand') setJSONExpanded(el, true);
    if (action === 'collapse') setJSONExpanded(el, false);
    if (action === 'copy') {
      const state = JSON_STATE.get(el);
      if (state && await copyText(JSON.stringify(state.data, null, 2))) copied(btn, { iconOnly: true });
    }
  });
  on(document, 'focusin', '.fd-json-line', (e, line) => {
    const el = line.closest('.fd-json');
    $$('.fd-json-actions .fd-json-btn[tabindex="0"]', el).forEach((b) => { if (!line.contains(b)) b.tabIndex = -1; });
    $$(':scope > .fd-json-actions .fd-json-btn', line).forEach((b) => { b.tabIndex = 0; });
    if (e.target === line) {
      $$('.fd-json-line[tabindex="0"]', el).forEach((l) => { if (l !== line) l.tabIndex = -1; });
      line.tabIndex = 0;
    }
  });
  on(document, 'keydown', '.fd-json-line', (e, line) => {
    if (e.target !== line) return;
    const el = line.closest('.fd-json');
    const lines = visibleLines(el);
    const i = lines.indexOf(line);
    const node = line.parentElement;
    const container = node.hasAttribute('data-container');
    const open = node.getAttribute('aria-expanded') === 'true';
    let handled = true;
    switch (e.key) {
      case 'ArrowDown': focusLine(el, lines[i + 1]); break;
      case 'ArrowUp': focusLine(el, lines[i - 1]); break;
      case 'Home': focusLine(el, lines[0]); break;
      case 'End': focusLine(el, lines[lines.length - 1]); break;
      case 'ArrowRight':
        if (container && !open) setNode(node, true);
        else if (container) focusLine(el, $('.fd-json-children .fd-json-line[role="treeitem"]', node));
        break;
      case 'ArrowLeft':
        if (container && open) setNode(node, false);
        else focusLine(el, node.parentElement.closest('.fd-json-node')?.querySelector(':scope > .fd-json-line'));
        break;
      case 'Enter':
      case ' ':
        if (container) setNode(node, !open);
        else if ($(':scope > .fd-json-more', line)) expandString(line);
        break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  // View switch
  on(document, 'click', '.fd-viewswitch-item', (e, item) => selectView(item));
  on(document, 'keydown', '.fd-viewswitch-item', (e, item) => {
    const items = $$('.fd-viewswitch-item', item.closest('.fd-viewswitch'));
    const i = items.indexOf(item);
    const next = { ArrowRight: items[i + 1] || items[0], ArrowLeft: items[i - 1] || items[items.length - 1], Home: items[0], End: items[items.length - 1] }[e.key];
    if (!next) return;
    e.preventDefault();
    selectView(next, { focus: true });
  });

  // Logs
  on(document, 'input', '.fd-log-search input', (e, input) => {
    const el = input.closest('.fd-log');
    const state = LOGS.get(el);
    if (!state) return;
    state.query = input.value;
    applyFilter(el);
  });
  on(document, 'click', '.fd-log-filter', (e, chip) => {
    chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') === 'false'));
    applyFilter(chip.closest('.fd-log'));
  });
  on(document, 'click', '.fd-log-follow', (e, btn) => {
    const el = btn.closest('.fd-log');
    const state = LOGS.get(el);
    if (!state) return;
    state.follow = !state.follow;
    state.paused = false;
    syncFollow(el);
    if (state.follow) scrollToEnd(el, true);
  });
  on(document, 'click', '.fd-log-jump', (e, btn) => {
    const el = btn.closest('.fd-log');
    const state = LOGS.get(el);
    state.follow = true;
    state.paused = false;
    syncFollow(el);
    scrollToEnd(el, true);
  });
  on(document, 'click', '.fd-log-btn[data-action]', (e, btn) => {
    const el = btn.closest('.fd-log');
    const action = btn.dataset.action;
    if (action === 'wrap') {
      const wrap = !el.hasAttribute('data-wrap');
      el.toggleAttribute('data-wrap', wrap);
      btn.setAttribute('aria-pressed', String(wrap));
    }
    if (action === 'download') downloadLog(el);
    if (action === 'replay') playTerminal(el);
    if (action === 'first-error') firstError(el);
    if (action === 'copy') {
      const text = logRows(el).filter((r) => !r.hidden).map(rowText).join('\n');
      copyText(text).then((ok) => ok && copied(btn, { iconOnly: true }));
    }
  });

  on(document, 'click', '.fd-log-num', (e, num) => {
    const el = num.closest('.fd-log');
    const row = num.closest('.fd-log-row');
    if (!el || !row || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    if (!emit(el, 'fd:select', { value: Number(row.dataset.line), row })) return;
    showLine(el, row, { focus: true, hash: true });
  });
  on(document, 'keydown', '.fd-log-num', (e, num) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const el = num.closest('.fd-log');
    const nums = logRows(el).filter((r) => !r.hidden).map((r) => $(':scope > .fd-log-num', r)).filter(Boolean);
    const i = nums.indexOf(num);
    const next = { ArrowDown: nums[i + 1], ArrowUp: nums[i - 1], Home: nums[0], End: nums[nums.length - 1] }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    nums.forEach((a) => { a.tabIndex = a === next ? 0 : -1; });
    next.focus({ preventScroll: true });
    next.parentElement.scrollIntoView({ block: 'nearest' });
  });
  addEventListener('hashchange', () => {
    $$('.fd-log[data-lines]').forEach((el) => { const row = rowFromHash(el); if (row) showLine(el, row); });
  });

  on(document, 'click', '.fd-schema-toggle', (e, btn) => toggleSchema(btn));

  addEventListener('storage', (e) => {
    if (!e.key?.startsWith('fd-code-tab:') || !e.newValue) return;
    const group = e.key.slice('fd-code-tab:'.length);
    $$('.fd-codeblock').forEach((b) => { if (syncGroup(b) === group) selectTab(b, e.newValue, { persist: false }); });
  });
}

/** Enhance every code-family block inside `root`. Idempotent. */
export function init(root = document) {
  bindGlobal();
  scope(root, '.fd-codeblock').forEach(initCodeblock);
  scope(root, COPY_NEXT).forEach(copyNextLine);
  scope(root, '.fd-endpoint').forEach(initEndpoint);
  scope(root, '.fd-json').forEach(initJSON);
  scope(root, '.fd-viewswitch').forEach(initViewswitch);
  scope(root, '.fd-log').forEach(initLog);
  scope(root, '.fd-diff').forEach(initDiff);
  scope(root, '.fd-schema-toggle').forEach(initSchemaToggle);
}
