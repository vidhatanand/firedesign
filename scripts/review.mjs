#!/usr/bin/env node
/*
 * fire review: opens every screen of a product in a browser, at each width and theme, and leaves a gallery a person
 * can look through in a minute, with the findings of the checks that need a rendered page listed under each screen.
 *
 *   fire review --base <url> --routes <a,b,c | routes.json> [--out .fire-review] [--widths 1440,375]
 *               [--themes light,dark] [--states] [--engine chromium] [--no-shots] [--json] [--jobs 4] [--settle 4000]
 *   fire review --serve <dir> [--spa] --routes …   serves a built folder itself (a free port on 127.0.0.1, closed on exit)
 *   fire review                                    with everything from package.json "fire": { "review": { … } }
 *
 * Reads: the routes (a comma list of paths, a JSON file holding an array or { routes }, or "routes" in the config);
 * "fire": { "review": { "base", "serve", "spa", "routes", "widths", "themes", "out", "allow", "setup" } } in the
 * package.json of the working directory (the command line wins); contract/catalog.json and scripts/lib/structure.mjs
 * for the catalogue's structural rules (without that module the review says so in one line and goes on).
 * Needs playwright-core and its browsers (an optional peer of Fire).
 *
 * A route is a path, or { path, name, state, states, setup }: `state` opens the screen at ?state=<state>; with
 * --states every name in `states` is reviewed too. `setup` (also a default for every route at the top of the config)
 * is { cookie: "name=value" | { name, value, httpOnly?, sameSite?, … } | […], storage: { key: value } (localStorage
 * before the page's scripts), waitFor: selector }. A `__Host-` or `__Secure-` cookie is set by domain and path and
 * marked secure, so a session cookie of that kind works on http://localhost (cookieFor below).
 *
 * Each screen, at each width x theme (prefers-color-scheme emulated; <html data-theme> set when the page carries it),
 * is loaded, then waited for: network idle (3 s at most), fonts, Fire's elements defined, no Fire loading marker left
 * (a visible [data-fd-loading="true"], [aria-busy="true"] or .fd-skeleton) and a quiet DOM (400 ms) with no page timer
 * of 2 s or less pending, up to --settle ms (default 4000; a loading state never clears and is captured then). Then:
 *   1. a full-page screenshot into --out (default .fire-review), and --out/index.html: a contact sheet with every screen
 *      as a row, its widths and themes as columns and its findings beneath, each with a crop of the element. Plain
 *      static HTML and its own review.css: no inline style or script, no external request.
 *   2. the catalogue's structural rules (checkTree from scripts/lib/structure.mjs) on the rendered DOM, serialised to
 *      { tag, classes, attrs, children, dynamic: false, text?, hidden?, ref }; `ref` is a short CSS path.
 *   3. the composition checks (RULES below; each rule's definition is the comment above its code in inspect()), each
 *      an error unless marked a warning; console-error and failed-request come from the page's events while it loads.
 * --out is emptied of earlier pictures (its shots/ folder) on each run. Screens load --jobs at a time, each in a
 * fresh browser context (no storage carried over).
 * Output: one line per finding (route, width, theme, rule, element, message) and the gallery's path; with --json only
 * { routes, screens, errors, warnings, findings, out } on stdout (routes: rows reviewed; screens: captures).
 * "allow": substrings of console messages or request URLs that console-error and failed-request ignore.
 * Exit code 1 on any error (warnings never change it); 2 on usage or setup errors.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The composition checks: rule id -> [severity, fix]. Their definitions are in `inspect` (it runs in the page). */
export const RULES = {
  'overflow-x': ['error', 'Let the widest element wrap or scroll inside its own container (fd-table-wrap, fd-scroller, data-wrap).'],
  'offscreen-control': ['error', 'Keep every control inside the viewport: wrap the row (data-wrap) or move the action into a menu.'],
  'one-h1': ['error', 'Give the screen exactly one h1: the page head title, or an fd-sr-only h1 when the screen opens with something else.'],
  'one-page-head': ['error', 'Open the screen with one page head (fd-page-head or fd-page-hero); title the sections inside with their own heads.'],
  'one-primary': ['error', 'Keep one primary button per view (the main region, each dialog, sheet, card or empty state); make the others outline, ghost or text buttons.'],
  'stretched-button': ['warning', 'Let the button size to its label (an fd-row, or align it to the start); use data-block only where a button fills its row by design.'],
  'wide-field': ['error', 'Put the field in a form or a field at a readable width (fd-form, or an fd-field in a column with data-frame); a value to type is not an fd-setting. Use fd-form[data-size="full"] only where the form really needs the whole width.'],
  'nested-surface': ['error', 'Put a form section straight in the form column (templates/form.html), never in a multi-column grid; do not set a card inside a card.'],
  'unstyled-control': ['error', 'Use Fire\'s control: fd-input, fd-textarea, a select inside fd-select, fd-checkbox or fd-radio, an fd-btn, an fd-table inside fd-table-wrap.'],
  'console-error': ['error', 'Fix the error, or list its text in "allow" when it is expected.'],
  'failed-request': ['error', 'Fix the request, or list its URL in "allow" when the failure is the point of the screen.'],
  'empty-main': ['error', 'Render the screen\'s content, or its empty, loading or error state, in the main region.'],
};

/* ------------------------------------------------------------------ options */

const DEFAULTS = { base: null, serve: null, spa: false, routes: null, widths: [1440, 375], themes: ['light', 'dark'], out: '.fire-review',
  allow: [], setup: null, states: false, engine: 'chromium', shots: true, json: false, jobs: 4, settle: 4000 };

export function parseArgs(argv, cwd = process.cwd()) {
  const cli = {};
  const list = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    switch (a) {
      case '--base': cli.base = val(); break;
      case '--serve': cli.serve = val(); break;
      case '--spa': cli.spa = true; break;
      case '--routes': cli.routes = val(); break;
      case '--out': cli.out = val(); break;
      case '--widths': cli.widths = list(val()).map(Number); break;
      case '--themes': cli.themes = list(val()); break;
      case '--states': cli.states = true; break;
      case '--engine': cli.engine = val(); break;
      case '--no-shots': cli.shots = false; break;
      case '--json': cli.json = true; break;
      case '--jobs': cli.jobs = Number(val()); break;
      case '--settle': cli.settle = Number(val()); break;
      case '-h': case '--help': cli.help = true; break;
      default: throw new Error(`unknown option ${a}`);
    }
  }
  let config = {};
  const pkg = path.join(cwd, 'package.json');
  if (fs.existsSync(pkg)) config = JSON.parse(fs.readFileSync(pkg, 'utf8')).fire?.review ?? {};
  const o = { ...DEFAULTS, ...config, ...cli };
  if (cli.base) o.serve = null; else if (o.serve) o.base = null;   // the command line wins; serving wins in the config
  if (o.serve) o.serve = path.resolve(cwd, o.serve);
  o.out = path.resolve(cwd, o.out);
  o.routes = loadRoutes(o.routes, cwd);
  if (!o.help && (!o.routes.length || (!o.base && !o.serve))) throw new Error('give --base <url> or --serve <dir>, and --routes');
  if (o.widths.some((w) => !(w > 0)) || o.themes.some((t) => !['light', 'dark'].includes(t)) || !(o.jobs >= 1)) throw new Error('bad --widths, --themes or --jobs');
  return o;
}

function loadRoutes(spec, cwd) {
  if (!spec) return [];
  if (typeof spec === 'string' && spec.endsWith('.json')) {
    const data = JSON.parse(fs.readFileSync(path.resolve(cwd, spec), 'utf8'));
    spec = Array.isArray(data) ? data : data.routes;
  }
  if (typeof spec === 'string') spec = spec.split(',').map((x) => x.trim()).filter(Boolean);
  return spec.map((r) => (typeof r === 'string' ? { path: r } : r));
}

/** One row of the gallery per route, and per state of a route (with --states). */
export function expandRoutes(routes, { states = false, setup = null } = {}) {
  const out = [];
  const add = (r, state) => {
    const name = r.name ? (state && state !== r.state ? `${r.name} ?state=${state}` : r.name) : `${r.path}${state ? ` ?state=${state}` : ''}`;
    out.push({ path: r.path, state: state ?? null, name, setup: { ...setup, ...r.setup } });
  };
  for (const r of routes) {
    add(r, r.state);
    if (states) for (const s of r.states ?? []) if (s !== r.state) add(r, s);
  }
  return out;
}

export const slug = (s) => s.replace(/^\/+/, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'root';

/* ------------------------------------------------------------------ static server */

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.txt': 'text/plain', '.map': 'application/json' };

/** Serves `dir` on a free port; with `spa`, an address with no extension that is not a file gets index.html. */
export function serve(dir, spa = false) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(root, pathname);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && spa && !path.extname(pathname)) file = path.join(root, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
  })));
}

/* ------------------------------------------------------------------ page side */

// Runs before the page's scripts: keeps its pending short timers (a skeleton swap at 600 ms), so settling waits for them.
function settleRecorder() {
  const timeout = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window), pending = new Set();
  window.setTimeout = function setTimeout(fn, delay, ...args) {
    if (typeof fn !== 'function' || (Number(delay) || 0) > 2000) return timeout(fn, delay, ...args);
    const id = timeout((...a) => { pending.delete(id); fn(...a); }, delay, ...args);
    pending.add(id);
    return id;
  };
  window.clearTimeout = function clearTimeout(id) { pending.delete(id); return clear(id); };
  Object.defineProperty(window, '__fdReview', { value: { timeout, pending } });
}

async function settle(cap) {
  const t0 = performance.now();
  const wait = (ms) => new Promise((r) => (window.__fdReview?.timeout ?? setTimeout)(r, ms));
  const left = () => Math.max(0, cap - (performance.now() - t0));
  await Promise.race([document.fonts.ready, wait(left())]);
  const undef = [...new Set([...document.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.startsWith('fd-') && !customElements.get(n)))];
  await Promise.all(undef.map((n) => Promise.race([customElements.whenDefined(n), wait(Math.min(left(), 1500))])));
  const vis = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const loading = () => [...document.querySelectorAll('[data-fd-loading="true"], [aria-busy="true"], .fd-skeleton')].some(vis);
  let last = performance.now();
  const mo = new MutationObserver(() => { last = performance.now(); });
  mo.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  while (left() > 0) {
    await wait(50);
    if (window.__fdReview?.pending.size) last = performance.now();
    if (performance.now() - last >= 400 && !loading()) break;
  }
  mo.disconnect();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { ms: Math.round(performance.now() - t0), settled: left() > 0 };
}

// Runs in the page: the composition checks, and the DOM serialised for the structural rules.
function inspect({ structure }) {
  const vw = document.documentElement.clientWidth;
  const vis = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const box = (el) => el.getBoundingClientRect();
  // Rendered and more than 2px each way once every clipping ancestor has cut it (fd-sr-only is 1px and clips).
  const shown = (el) => {
    if (!vis(el)) return false;
    let { left, top, right, bottom } = box(el);
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const q = box(p);
      if (cs.overflowX !== 'visible') { left = Math.max(left, q.left); right = Math.min(right, q.right); }
      if (cs.overflowY !== 'visible') { top = Math.max(top, q.top); bottom = Math.min(bottom, q.bottom); }
    }
    return right - left > 2 && bottom - top > 2;
  };
  const fd = (el) => [...el.classList].some((c) => c.startsWith('fd-'));
  const seg = (el) => {
    if (el.id && /^[A-Za-z][\w-]*$/.test(el.id) && el.getRootNode().querySelectorAll(`#${el.id}`).length === 1) return { s: `#${el.id}`, anchor: true };
    const cls = [...el.classList].find((c) => c.startsWith('fd-'));
    let s = el.localName + (cls ? `.${cls}` : '');
    const same = el.parentElement ? [...el.parentElement.children].filter((c) => c.localName === el.localName) : [];
    if (same.length > 1) s += `:nth-of-type(${same.indexOf(el) + 1})`;
    return { s, anchor: false };
  };
  const ref = (el) => {
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && e !== document.documentElement; e = e.parentElement) {
      const { s, anchor } = seg(e);
      parts.unshift(s);
      if (anchor) break;
    }
    return parts.join(' > ');
  };
  const found = [];
  const add = (rule, el, message) => found.push({ rule, ref: el ? ref(el) : null, message });
  const all = [...document.body.querySelectorAll('*')];
  // Cut by the page edge: nothing between the element and the page scrolls sideways (auto, scroll) or clips it while
  // narrower than the viewport. Fire's page clips (.fd-page: overflow-x clip), so a page that is too wide is cut off
  // rather than scrolled; a clip as wide as the viewport is that page edge. Decoration (aria-hidden) does not count.
  const pageCut = (el) => {
    if (el.closest('[aria-hidden="true"]')) return false;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || (ox !== 'visible' && box(p).width < vw - 1)) return false;
    }
    return true;
  };
  const main = [...document.querySelectorAll('main, [role="main"]')].find(vis) ?? document.body;
  const overlay = 'dialog, [role="dialog"], [role="alertdialog"], [popover], .fd-sheet';

  // overflow-x: the document scrolls sideways, or a rendered element that starts inside the viewport runs past its
  // edge and is cut only by the page; names the widest such element.
  const se = document.scrollingElement ?? document.documentElement;
  const over = all.filter((el) => { const r = box(el); return r.left < vw - 1 && r.right > 0 && (r.right > vw + 1 || r.left < -1) && vis(el) && pageCut(el); });
  if (se.scrollWidth > se.clientWidth + 1 || over.length) {
    // The widest element that crosses the edge when it is itself wider than the viewport; else the box it spills from.
    let el = over.filter((e) => !over.includes(e.parentElement)).sort((a, b) => box(b).width - box(a).width)[0];
    if (el && box(el).width <= vw && el.parentElement !== document.body) el = el.parentElement;
    add('overflow-x', el, `${se.scrollWidth > se.clientWidth + 1 ? 'the page scrolls sideways' : 'content runs past the edge of the page'}${el ? `: ${Math.max(el.scrollWidth, Math.round(box(el).width))}px of content in a ${vw}px viewport` : ''}`);
  }
  // offscreen-control: a rendered control partly inside and partly outside the viewport, cut only by the page.
  for (const el of document.querySelectorAll('button, input:not([type="hidden"]), select, textarea, a.fd-btn, [role="button"]')) {
    if (!shown(el)) continue;
    const r = box(el);
    const partly = (r.right > vw + 1 && r.left < vw) || (r.left < -1 && r.right > 0);
    if (partly && pageCut(el)) add('offscreen-control', el, `a control is cut by the ${r.left < -1 ? 'left' : 'right'} edge of the viewport`);
  }
  // one-h1: exactly one rendered h1 (fd-sr-only counts; one in a closed dialog or sheet does not, nor one inside a
  // message's rendered markdown, .fd-message-body). None is not reported while a Fire loading marker shows in main.
  const h1 = [...document.querySelectorAll('h1')].filter((el) => vis(el) && !el.closest('.fd-message-body'));
  const loading = [...main.querySelectorAll('[data-fd-loading="true"], [aria-busy="true"], .fd-skeleton')].some(vis);
  if (h1.length > 1 || (!h1.length && !loading)) add('one-h1', h1[1] ?? main, h1.length ? `${h1.length} visible h1 elements` : 'no visible h1');
  // one-page-head: more than one page head (fd-page-head, fd-page-hero) in the main region, outside overlays and cards.
  const heads = [...main.querySelectorAll('.fd-page-head, .fd-page-hero')].filter((el) => vis(el) && !el.closest(`${overlay}, .fd-card`) && !el.parentElement.closest('.fd-page-head, .fd-page-hero'));
  if (heads.length > 1) add('one-page-head', heads[1], `${heads.length} page heads in the main region`);
  // one-primary: more than one visible primary button in a view. A view is the nearest open dialog, sheet or popover,
  // card, empty state (.fd-empty: it stands in for a region), or section, header or footer of a public site; else the
  // main region; else the shell around it (top bar, sidebar).
  const views = new Map();
  for (const el of document.querySelectorAll('.fd-btn[data-variant="primary"]')) {
    if (!shown(el)) continue;
    const view = el.closest(`${overlay}, .fd-card, .fd-empty, .fd-site-section, .fd-site-header, .fd-site-footer`) ?? (main.contains(el) ? main : document.body);
    views.set(view, [...(views.get(view) ?? []), el]);
  }
  const where = (v) => (v === main ? 'the main region' : v === document.body ? 'the shell around it' : `one ${v.matches(overlay) ? 'dialog or sheet' : 'card, empty state or section'}`);
  for (const [view, list] of views) if (list.length > 1) add('one-primary', list[1], `${list.length} primary buttons in ${where(view)}`);
  // stretched-button (warning, 900px and wider): an fd-btn with no data-block, more than twice and 120px wider than
  // its label, whose parent is a plain box or a layout part (a Fire component that sizes its buttons is left alone).
  const LAYOUT = /^fd-(stack|column|grid|row|form|form-section-body|field|card|card-body|card-foot|band|frame|page|split-main)$/;
  if (vw >= 900) {
    for (const el of document.querySelectorAll('.fd-btn:not([data-block]):not([data-icon-only])')) {
      if (!shown(el) || ![...el.parentElement.classList].filter((c) => c.startsWith('fd-')).every((c) => LAYOUT.test(c))) continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      const cs = getComputedStyle(el);
      const need = range.getBoundingClientRect().width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      const w = box(el).width;
      if (w > need * 2 && w - need > 120) add('stretched-button', el, `the button is ${Math.round(w)}px wide for a ${Math.round(need)}px label`);
    }
  }
  // wide-field (900px and wider): a text field, textarea or select wider than Fire's widest form measure
  // (--fd-form-measure-lg, 768px): nobody types a line that long, and it means the field was dropped into a wide
  // box (a setting's text column, a full-width card) and not into a form or a field. A table, a form that asks for
  // the full width (fd-form[data-size="full"]), and the parts built around one wide input (WIDE_OK) are left alone.
  const WIDE_OK = '.fd-table, .fd-form[data-size="full"], .fd-search, .fd-toolbar, .fd-command, .fd-composer, .fd-codefield, .fd-chat, .fd-doc-try, .fd-site';
  if (vw >= 900) {
    const limit = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fd-form-measure-lg')) || 768) + 1;
    const TEXT = new Set(['text', 'email', 'password', 'search', 'url', 'tel', 'number', '']);
    for (const el of document.querySelectorAll('input.fd-input, textarea.fd-textarea, label.fd-select, .fd-input-group')) {
      if (!shown(el) || el.closest(WIDE_OK) || (el.localName === 'input' && !TEXT.has((el.getAttribute('type') ?? '').toLowerCase()))) continue;
      if (el.matches('.fd-input') && el.closest('.fd-input-group')) continue;   // the group is measured, not the input inside it
      const w = box(el).width;
      if (w > limit) add('wide-field', el, `the field is ${Math.round(w)}px wide; a form stops at ${limit - 1}px`);
    }
  }
  // nested-surface: a form section that shares a row with a sibling in a multi-column grid; a card inside a card
  // (a sunken card, the well the card's card names for code or detail, may sit in one).
  for (const el of document.querySelectorAll('.fd-form-section')) {
    if (!shown(el)) continue;
    for (let p = el.parentElement, c = el; p && p !== main.parentElement; c = p, p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.display !== 'grid' && cs.display !== 'inline-grid') continue;
      if (cs.gridTemplateColumns.split(' ').length < 2) continue;
      const r = box(c);
      const beside = [...p.children].some((s) => s !== c && vis(s) && box(s).top < r.bottom - 1 && box(s).bottom > r.top + 1);
      if (beside) { add('nested-surface', el, 'a form section sits in a multi-column grid'); break; }
    }
  }
  for (const el of document.querySelectorAll('.fd-card .fd-card:not([data-variant="sunken"])')) if (shown(el)) add('nested-surface', el, 'a card inside a card');
  // unstyled-control: a visible native control with no fd- class that no Fire style reached: a select or a checkbox or
  // radio still drawn by the browser (appearance not none); a text input or textarea, or a table's first cell, whose box
  // (border, background, padding, radius) is the browser's default, measured on a twin in an empty shadow root; a
  // button with no fd- class at all (base.css strips a bare button to its text).
  const sandbox = document.createElement('div');
  sandbox.hidden = true;
  const shadow = sandbox.attachShadow({ mode: 'closed' });
  document.body.append(sandbox);
  const PROPS = ['appearance', 'border-top-style', 'border-top-width', 'border-bottom-style', 'background-color', 'padding-top', 'padding-left', 'padding-right', 'border-top-left-radius'];
  const plain = new Map();
  const native = (el) => {
    const key = `${el.localName} ${el.type ?? ''}`;
    if (!plain.has(key)) {
      let twin = document.createElement(el.localName);
      if (el.localName === 'input') twin.type = el.type;
      shadow.append(el.localName === 'td' || el.localName === 'th' ? document.createElement('table') : twin);
      if (el.localName === 'td' || el.localName === 'th') shadow.lastChild.createTBody().insertRow().append(twin);
      const cs = getComputedStyle(twin);
      plain.set(key, PROPS.map((p) => cs.getPropertyValue(p)).join('|'));
    }
    const cs = getComputedStyle(el);
    return PROPS.map((p) => cs.getPropertyValue(p)).join('|') === plain.get(key);
  };
  const TEXT = /^(text|email|password|search|url|tel|number|date|time|datetime-local|month|week)$/;
  for (const el of document.querySelectorAll('select, textarea, input, button, table')) {
    if (!shown(el) || fd(el)) continue;
    let bare = false;
    if (el.localName === 'select') bare = getComputedStyle(el).appearance !== 'none';
    else if (el.localName === 'button') bare = true;
    else if (el.localName === 'table') { const cell = el.querySelector('td') ?? el.querySelector('th'); bare = !!cell && native(cell); }
    else if (el.localName === 'textarea' || TEXT.test(el.type)) bare = native(el);
    else if (el.type === 'checkbox' || el.type === 'radio') bare = getComputedStyle(el).appearance !== 'none';
    if (bare) add('unstyled-control', el, `a native ${el.localName}${el.localName === 'input' ? ` type=${el.type}` : ''} with no Fire style`);
  }
  sandbox.remove();
  // empty-main: nothing visible in the main region: no text, no picture, no control.
  const media = [...main.querySelectorAll('img, svg, canvas, video, input, select, textarea, button, iframe')].some(shown);
  if (!(main.innerText ?? '').trim() && !media) add('empty-main', main, 'the main region shows nothing');

  // The DOM for the structural rules: shadow roots of Fire's elements are left out; a subtree that does not render is
  // kept with hidden: true on each of its nodes.
  let tree = null;
  if (structure) {
    const SKIP = new Set(['script', 'style', 'link', 'meta', 'noscript', 'template']);
    const node = (el, parentRef, hidden, sep = ' > ') => {
      const { s, anchor } = seg(el);
      const r = anchor || !parentRef ? s : `${parentRef}${sep}${s}`;
      const h = hidden || !vis(el);
      const attrs = {};
      for (const a of el.attributes) attrs[a.name] = a.value === '' ? true : a.value;
      const n = { tag: el.localName, classes: [...el.classList], attrs, children: [], dynamic: false, ref: r };
      if (h) n.hidden = true;
      if ([...el.childNodes].some((c) => c.nodeType === 3 && c.data.trim())) n.text = true;
      const kids = [...el.children];
      if (el.shadowRoot && !el.localName.startsWith('fd-')) kids.push(...el.shadowRoot.children);
      for (const c of kids) if (!SKIP.has(c.localName)) n.children.push(node(c, r, h, c.parentNode === el ? ' > ' : ' '));
      return n;
    };
    // A whole page: every parent is known, so the root is '#document' (scripts/lib/structure.mjs).
    tree = { tag: '#document', classes: [], attrs: {}, children: [node(document.body, '', false)], dynamic: false };
  }
  return { found, tree };
}

/* ------------------------------------------------------------------ the run */

async function need(name) {
  for (const base of [path.join(process.cwd(), 'noop.js'), import.meta.url]) {
    try { return await import(pathToFileURL(createRequire(base).resolve(name)).href); } catch { /* next */ }
  }
  throw new Error(`cannot load ${name}; install it (npm i -D playwright-core)`);
}

/** The catalogue's structural rules, or a note saying why they are not run. */
export async function loadStructure(file = path.join(HERE, 'lib/structure.mjs')) {
  if (!fs.existsSync(file)) return { note: 'structural rules unavailable: scripts/lib/structure.mjs is not installed' };
  const mod = await import(pathToFileURL(file).href);
  const catalog = JSON.parse(fs.readFileSync(path.join(HERE, '../contract/catalog.json'), 'utf8'));
  return { rules: mod.structureRules(catalog), checkTree: mod.checkTree };
}

/** Maps checkTree's findings to review findings (the node's ref names the element). */
export function structureFindings(tree, structure) {
  if (!tree || !structure.checkTree) return [];
  return structure.checkTree(tree, structure.rules, { rendered: true }).map((f) => ({
    rule: f.rule, severity: f.severity === 'error' ? 'error' : 'warning', message: f.message, fix: f.fix ?? '', ref: f.node?.ref ?? null, source: 'structure',
  }));
}

/** One setup cookie in the shape the browser takes: "name=value", or an object with Playwright's cookie fields.
 *  A plain cookie goes by `url`. A `__Host-` or `__Secure-` cookie cannot: a browser refuses one given by an http://
 *  url, even on localhost ("Invalid cookie fields"), so it goes by domain and path, marked secure, which a browser
 *  accepts for localhost. An object that sets `url` is passed as it is; one that sets `domain`, `path` or `secure`
 *  goes by domain and path too. */
export function cookieFor(c, url) {
  const eq = typeof c === 'string' ? c.indexOf('=') : -1;
  const given = typeof c === 'string' ? { name: (eq < 0 ? c : c.slice(0, eq)).trim(), value: eq < 0 ? '' : c.slice(eq + 1).trim() } : { ...c };
  if (!given.name) throw new Error('setup.cookie: a cookie needs a name ("name=value" or { name, value })');
  if (given.url) return given;
  const prefixed = /^__(Host|Secure)-/.test(given.name);
  if (!prefixed && given.domain === undefined && given.path === undefined && !given.secure) return { ...given, url: url.origin };
  const { domain = url.hostname, path: cookiePath = '/', ...rest } = given;
  return { ...rest, domain, path: given.name.startsWith('__Host-') ? '/' : cookiePath, secure: prefixed ? true : !!given.secure, sameSite: given.sameSite ?? 'Lax' };
}

async function capture(browser, o, origin, screen, width, theme, structure) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const problems = [];
  const allowed = (text) => o.allow.some((a) => text.includes(a));
  try {
    await context.addInitScript(settleRecorder);
    const { cookie, storage, waitFor } = screen.setup ?? {};
    if (storage) await context.addInitScript((s) => { try { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, String(v)); } catch { /* no storage */ } }, storage);
    const url = new URL(screen.path, origin);
    if (screen.state) url.searchParams.set('state', screen.state);
    if (cookie) await context.addCookies([cookie].flat().map((c) => cookieFor(c, url)));
    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error' && !allowed(m.text())) problems.push(['console-error', m.text()]); });
    page.on('pageerror', (e) => { if (!allowed(e.message)) problems.push(['console-error', `uncaught: ${e.message}`]); });
    // A request the browser cancelled (a prefetch dropped when the page moved on) did not fail: net::ERR_ABORTED,
    // NS_BINDING_ABORTED, WebKit's "cancelled".
    page.on('requestfailed', (r) => { if (!allowed(r.url()) && !/ERR_ABORTED|BINDING_ABORTED|^cancelled$/i.test(r.failure()?.errorText ?? '')) problems.push(['failed-request', `${r.failure()?.errorText ?? 'failed'}: ${r.url()}`]); });
    page.on('response', (r) => { if (r.status() >= 400 && !allowed(r.url())) problems.push(['failed-request', `HTTP ${r.status()}: ${r.url()}`]); });
    await page.goto(url.href, { waitUntil: 'load', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    if (waitFor) await page.waitForSelector(waitFor, { timeout: o.settle }).catch(() => problems.push(['console-error', `setup: ${waitFor} did not appear`]));
    await page.evaluate((t) => { const de = document.documentElement; if (de.hasAttribute('data-theme')) de.setAttribute('data-theme', t); }, theme);
    const settled = await page.evaluate(settle, o.settle);
    const { found, tree } = await page.evaluate(inspect, { structure: !!structure.checkTree });
    const findings = [
      ...found.map((f) => ({ ...f, severity: RULES[f.rule][0], fix: RULES[f.rule][1] })),
      ...problems.map(([rule, message]) => ({ rule, severity: 'error', message, fix: RULES[rule][1], ref: null })),
      ...structureFindings(tree, structure),
    ];
    const base = `${slug(screen.name)}-${width}-${theme}`;
    let shot = null;
    if (o.shots) {
      shot = `shots/${base}.jpg`;
      await page.screenshot({ path: path.join(o.out, shot), fullPage: true, type: 'jpeg', quality: 70, animations: 'disabled' });
      const sy = await page.evaluate(() => scrollY);
      let k = 0;
      for (const f of findings) {
        if (!f.ref) continue;
        const handle = await page.$(f.ref).catch(() => null);
        const b = handle && await handle.boundingBox();
        if (!b || b.width < 1 || b.height < 1) continue;
        const clip = { x: Math.max(0, b.x - 8), y: Math.max(0, b.y + sy - 8), width: Math.min(b.width + 16, width), height: Math.min(b.height + 16, 600) };
        f.crop = `shots/${base}-${++k}.jpg`;
        await page.screenshot({ path: path.join(o.out, f.crop), clip, fullPage: true, type: 'jpeg', quality: 80, animations: 'disabled' }).catch(() => { delete f.crop; });
      }
    }
    return { width, theme, shot, findings, settled };
  } finally { await context.close(); }
}

export async function review(o) {
  const pwx = await need('playwright-core').then((m) => m.default ?? m);
  if (!pwx[o.engine]) throw new Error(`unknown engine ${o.engine}`);
  const structure = await loadStructure(o.structureFile);
  const screens = expandRoutes(o.routes, o);
  const server = o.serve ? await serve(o.serve, o.spa) : null;
  const origin = o.base ?? server.origin;
  fs.mkdirSync(path.join(o.out, 'shots'), { recursive: true });
  for (const f of fs.readdirSync(path.join(o.out, 'shots'))) fs.rmSync(path.join(o.out, 'shots', f));
  const browser = await pwx[o.engine].launch();
  const jobs = screens.flatMap((s, i) => o.widths.flatMap((w) => o.themes.map((t) => ({ i, s, w, t }))));
  const rows = screens.map((s) => ({ name: s.name, path: s.path, state: s.state, captures: [] }));
  try {
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const { i, s, w, t } = jobs[next++];
        try { rows[i].captures.push(await capture(browser, o, origin, s, w, t, structure)); } catch (e) {
          rows[i].captures.push({ width: w, theme: t, shot: null, findings: [{ rule: 'console-error', severity: 'error', message: `the screen did not load: ${e.message.split('\n')[0]}`, fix: RULES['console-error'][1], ref: null }] });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(o.jobs, jobs.length) }, worker));
  } finally { await browser.close(); await server?.close(); }
  const order = (c) => o.widths.indexOf(c.width) * o.themes.length + o.themes.indexOf(c.theme);
  for (const r of rows) r.captures.sort((a, b) => order(a) - order(b));
  const findings = rows.flatMap((r) => r.captures.flatMap((c) => c.findings.map((f) => ({ route: r.name, path: r.path, state: r.state, width: c.width, theme: c.theme, ...f }))));
  const result = { routes: rows.length, screens: jobs.length, errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity !== 'error').length, findings, out: path.join(o.out, 'index.html'), note: structure.note ?? null };
  fs.writeFileSync(path.join(o.out, 'review.css'), GALLERY_CSS);
  fs.writeFileSync(path.join(o.out, 'index.html'), gallery(rows, result, o));
  return result;
}

/* ------------------------------------------------------------------ the gallery */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function gallery(rows, result, o) {
  const cols = o.widths.flatMap((w) => o.themes.map((t) => `${w} ${t}`));
  const row = (r) => {
    const groups = new Map();   // one entry per rule, element and message, with the captures it occurs in
    for (const c of r.captures) {
      for (const f of c.findings) {
        const key = `${f.rule}|${f.ref}|${f.message}`;
        if (!groups.has(key)) groups.set(key, { ...f, where: [] });
        groups.get(key).where.push(`${c.width} ${c.theme}`);
      }
    }
    const shots = r.captures.map((c) => `<figure class="${c.width >= 900 ? 'wide' : 'narrow'}">${c.shot ? `<a href="${esc(c.shot)}"><img src="${esc(c.shot)}" alt="${esc(`${r.name}, ${c.width} ${c.theme}`)}" loading="lazy"></a>` : '<div class="none">no picture</div>'}<figcaption>${c.width} ${c.theme}</figcaption></figure>`).join('');
    const list = [...groups.values()].map((f) => `<li class="${f.severity}"><p><b>${esc(f.rule)}</b> ${esc(f.message)} <span class="where">${esc(f.where.length === cols.length ? 'every width and theme' : f.where.join(', '))}</span></p>${f.ref ? `<p><code>${esc(f.ref)}</code></p>` : ''}<p class="fix">${esc(f.fix)}</p>${f.crop ? `<img class="crop" src="${esc(f.crop)}" alt="${esc(`the element of ${f.rule}`)}" loading="lazy">` : ''}</li>`).join('');
    const errs = [...groups.values()].filter((f) => f.severity === 'error').length;
    return `<section class="screen${errs ? ' bad' : ''}" id="${esc(slug(r.name))}"><h2>${esc(r.name)}</h2><div class="shots">${shots}</div>${list ? `<ul class="findings">${list}</ul>` : '<p class="clean">No findings.</p>'}</section>`;
  };
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'self'">
<title>fire review</title><link rel="stylesheet" href="review.css"></head>
<body><header><h1>fire review</h1>
<p>${result.routes} screens, ${result.screens} captures (${esc(cols.join(', '))}): <b class="${result.errors ? 'error' : 'ok'}">${result.errors} errors</b>, ${result.warnings} warnings.</p>
${result.note ? `<p class="note">${esc(result.note)}</p>` : ''}
<p class="note">Look at every picture before a release. The checks catch broken composition; they cannot judge taste, hierarchy, or whether the screen follows the right template.</p></header>
<main>${rows.map(row).join('\n')}</main></body></html>
`;
}

const GALLERY_CSS = `:root { color-scheme: light dark; --bg: #fafafa; --fg: #18181b; --muted: #71717a; --line: #e4e4e7; --bad: #b42318; --warn: #93600c; --ok: #1a7f37; }
@media (prefers-color-scheme: dark) { :root { --bg: #111113; --fg: #ececee; --muted: #a1a1aa; --line: #2e2e33; --bad: #f97066; --warn: #fdb022; --ok: #4ade80; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px; background: var(--bg); color: var(--fg); font: 14px/1.5 system-ui, sans-serif; }
h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 0 0 12px; font-family: ui-monospace, monospace; overflow-wrap: anywhere; }
@media (max-width: 600px) { body { padding: 16px; } }
.note, .where, .fix { color: var(--muted); } .ok { color: var(--ok); } .error { color: var(--bad); }
.screen { border-top: 1px solid var(--line); padding: 20px 0; } .screen.bad h2 { color: var(--bad); }
.shots { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
figure { margin: 0; flex: 1 1 160px; max-width: 220px; } figure.wide { flex: 3 1 420px; max-width: 640px; }
figure img { display: block; width: 100%; max-height: 480px; object-fit: cover; object-position: top; border: 1px solid var(--line); }
figcaption { color: var(--muted); font-size: 12px; margin-top: 4px; } .none { padding: 40px 0; text-align: center; border: 1px dashed var(--line); color: var(--muted); }
.findings { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 8px; }
.findings li { border-left: 3px solid var(--warn); padding: 4px 12px; } .findings li.error { border-color: var(--bad); }
.findings p { margin: 0; } code { font-size: 12px; word-break: break-all; }
.crop { display: block; max-width: min(100%, 480px); max-height: 240px; margin-top: 6px; border: 1px solid var(--line); }
.clean { color: var(--ok); margin: 12px 0 0; }
`;

/* ------------------------------------------------------------------ CLI */

async function main(argv) {
  let o;
  try { o = parseArgs(argv); } catch (e) { console.error(`fire review: ${e.message}`); return 2; }
  if (o.help) { console.error('usage: fire review --base <url> | --serve <dir> [--spa]  --routes <a,b | routes.json> [--out .fire-review] [--widths 1440,375] [--themes light,dark] [--states] [--engine chromium] [--no-shots] [--json]'); return 0; }
  let result;
  try { result = await review(o); } catch (e) { console.error(`fire review: ${e.message}`); return 2; }
  if (o.json) { const { note, ...pub } = result; if (note) console.error(note); console.log(JSON.stringify(pub, null, 2)); return result.errors ? 1 : 0; }
  if (result.note) console.log(result.note);
  for (const f of result.findings) console.log(`${f.severity === 'error' ? 'ERROR' : 'warn '} ${f.route} ${f.width} ${f.theme} ${f.rule}${f.ref ? ` ${f.ref}` : ''}: ${f.message}`);
  console.log(`${result.errors ? 'FAIL' : 'ok  '} ${result.routes} screens, ${result.screens} captures: ${result.errors} errors, ${result.warnings} warnings`);
  const rel = path.relative(process.cwd(), result.out);
  console.log(`gallery: ${rel.startsWith('..') ? result.out : rel}`);
  return result.errors ? 1 : 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then((c) => process.exit(c));
}
