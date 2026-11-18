#!/usr/bin/env node
/*
 * render-equal: does a candidate page render the same Fire UI as a reference page?
 *
 *   node scripts/render-equal.mjs --ref <url|path> --cand <url|path> [--ref-root <sel>] [--cand-root <sel>]
 *        [--widths 1440,375] [--themes light,dark] [--engines chromium] [--max-pixel-ratio 0.001]
 *        [--json out.json] [--diff-dir dir] [--ready-timeout 3000] [--pixel-threshold 0.1] [--verbose]
 *        [--transparent <selector>]…
 *
 * --ref / --cand: an http(s):// or file:// URL, or a file/directory path. Paths are served from a temporary static
 * server on a free port (127.0.0.1), rooted at the closest common parent of all given paths, and closed on exit.
 * Roots default to `body`. Engines: chromium, firefox, webkit (playwright-core must be installed with the browsers;
 * pixelmatch and pngjs are needed too).
 *
 * For every engine x width x theme, both pages are loaded (with the page's Content Security Policy bypassed, so the
 * freeze stylesheet applies; a page's policy is for its own checks), <html data-theme> is set, animations and
 * transitions are frozen (an injected stylesheet), and the script waits for fonts, for Fire's custom elements (`fd-`
 * tags) to be defined, and for `document.documentElement.dataset.fdReady` when the page has it (or loads a
 * fire/boot/elements script). Then it waits until the page is quiet (R13): no DOM mutation, no change of the root's
 * box and no pending timeout of the page of 2 s or less, for 400 ms, up to --ready-timeout (a run that never settles
 * is captured at the timeout and says so). Then:
 *
 *  (a) structure: the tree of "Fire nodes" under each root. A Fire node is an element with an `fd-` class or an `fd-`
 *      tag; everything inside a Fire node is kept (elements and text). Elements outside any Fire node with no `fd-`
 *      class (framework wrappers, app shells) are transparent: their Fire descendants are hoisted. Elements that match
 *      a --transparent selector (repeatable; a component's host element, say `screen-logs, logs-detail`) are
 *      transparent too, inside Fire nodes as well: their children take their place. Comments and
 *      whitespace-only text are ignored; adjacent text is merged and whitespace collapsed. Compared per node: tag, `fd-`
 *      classes, attributes, text. Siblings are aligned by longest common subsequence, so one moved element shows
 *      up as one `missing` plus one `extra`, a changed text as `text`, a changed class list as `classes`.
 *      Ignored: comments, `class` (only `fd-` classes are compared), `style`, and framework attributes:
 *        data-reactroot, data-reactid, data-react-checksum, data-v-* (Vue scoped styles, data-v-app),
 *        data-server-rendered, data-allow-mismatch, data-svelte-h, data-astro-cid-*, data-nextjs-*, data-lit-*,
 *        data-hk, defer-hydration, ng-version, ng-reflect-*, ng-server-context, _ngcontent-*, _nghost-*.
 *      Generated ids are renamed to ~gen1, ~gen2… in document order of the elements that carry them (then ids that
 *      are only referenced, in order of first use), in id and in every reference to them: for, aria-labelledby,
 *      -describedby, -controls, -owns, -activedescendant, -errormessage, -details, -flowto, list, form,
 *      popovertarget, headers, an href or xlink:href of `#id`, and `url(#id)` in any attribute or computed style
 *      (spec/EXPORT.md R9). Generated means:
 *      Fire's counters from core.js id() (`fd-area-d`, `fd-dialog-title-a`: `fd-`, words, a base-36 counter); an id
 *      defined inside an <svg> that only `url(#…)` or `href="#…"` inside that same <svg> references (a gradient, a
 *      clip path); React `:r1:`, `«r1»`, `_r_1_`; Vue `v-0`; `radix-…`, `headlessui-…`, `react-aria…`, `mui-…`,
 *      `ember123`, `lit-id…`, `svelte-…`, `uid-…`. Other ids are compared literally.
 *      SVG geometry (R10): inside an <svg>, x, y, width, height, cx, cy, r, rx, ry, x1, y1, x2, y2 and the numbers in
 *      d, points, transform and viewBox are equal when every number is within 0.5 px and the rest of the value is the
 *      same (a chart drawn again at a plot a fraction of a pixel wider).
 *  (b) computed styles of matched nodes: a fixed list of layout, box, type and colour properties (PROPS below).
 *      Margins (R11) count only when the two boxes (relative to the root) differ by more than 0.5 px: engines can
 *      report a stale computed `auto` margin after a late layout change while the box is where it should be.
 *  (c) pixels: a screenshot of each root, same size required; the ratio of differing pixels (pixelmatch) must not
 *      exceed --max-pixel-ratio.
 *
 * Output: a text summary, and with --json a report with every difference (kind, path, property, ref, cand).
 * Exit code 1 on any structural or style difference or a pixel ratio above the limit; 2 on usage or setup errors.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* ------------------------------------------------------------------ options */

export const PROPS = [
  // layout
  'display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'z-index', 'flex-direction', 'flex-wrap', 'flex-grow',
  'flex-shrink', 'flex-basis', 'order', 'justify-content', 'justify-items', 'justify-self', 'align-items', 'align-self',
  'align-content', 'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows', 'grid-column-start',
  'grid-column-end', 'grid-row-start', 'grid-row-end', 'overflow-x', 'overflow-y', 'visibility',
  // box
  'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'box-shadow', 'outline-width', 'outline-style', 'outline-offset', 'opacity',
  // type
  'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant-numeric', 'line-height', 'letter-spacing',
  'text-align', 'text-transform', 'text-decoration-line', 'text-overflow', 'white-space', 'vertical-align',
  // colour
  'color', 'background-color', 'background-image', 'border-top-color', 'border-right-color', 'border-bottom-color',
  'border-left-color', 'outline-color', 'text-decoration-color', 'fill', 'stroke',
];

const IGNORED_ATTRS = [/^data-reactroot$/, /^data-reactid$/, /^data-react-checksum$/, /^data-v-/, /^data-server-rendered$/,
  /^data-allow-mismatch$/, /^data-svelte-h$/, /^data-astro-cid-/, /^data-nextjs-/, /^data-lit-/, /^data-hk$/,
  /^defer-hydration$/, /^ng-version$/, /^ng-reflect-/, /^ng-server-context$/, /^_ngcontent-/, /^_nghost-/, /^style$/, /^class$/];
const ID_ATTRS = new Set(['id', 'for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant',
  'aria-errormessage', 'aria-details', 'aria-flowto', 'list', 'form', 'popovertarget', 'headers']);
const GENERATED_ID = [/^:r[0-9a-z]+:$/, /^«[0-9a-z]+»$/, /^_r_[0-9a-z]+_$/, /^v-\d+$/, /^radix-/, /^headlessui-/, /^react-aria/,
  /^mui-/, /^ember\d+$/, /^lit-id/, /^svelte-/, /^uid-/,
  /^fd-[a-z]+(?:-[a-z]+)*-[0-9a-z]+$/];   // Fire: core.js id(prefix), a base-36 counter after an fd- prefix
const HREF_ATTRS = new Set(['href', 'xlink:href']);
/** url(#id) in an attribute or a computed style; a computed value may carry the page's URL before the `#`. */
const URL_REF = /url\(\s*(["']?)([^"')]*?)#([^"')\s]+)\1\s*\)/g;
/** Attributes of SVG elements compared with a tolerance (R10), lowercase. */
const GEOMETRY = new Set(['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'd', 'points', 'transform', 'viewbox']);
const NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const GEOMETRY_TOLERANCE = 0.5;
const MARGINS = new Set(['margin-top', 'margin-right', 'margin-bottom', 'margin-left']);

const FREEZE_CSS = '*,*::before,*::after{animation:none!important;animation-delay:0s!important;transition:none!important;' +
  'transition-delay:0s!important;scroll-behavior:auto!important;caret-color:transparent!important}';

/* ------------------------------------------------------------------ static server */

const MIME = { '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.ico': 'image/x-icon', '.txt': 'text/plain', '.map': 'application/json' };

export function startServer(root) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = path.join(base, p);
      if (f !== base && !f.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    } catch { res.writeHead(500).end(); }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({
      port: server.address().port,
      close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
    }));
  });
}

function commonParent(dirs) {
  const parts = dirs.map((d) => path.resolve(d).split(path.sep));
  const out = [];
  for (let i = 0; i < parts[0].length; i++) {
    if (parts.every((p) => p[i] === parts[0][i])) out.push(parts[0][i]); else break;
  }
  return out.join(path.sep) || path.sep;
}

// Turns --ref/--cand values into URLs, starting one static server when any is a path.
export async function resolveTargets(values) {
  const isUrl = (v) => /^(https?|file):\/\//i.test(v);
  const files = values.filter((v) => !isUrl(v)).map((v) => {
    let abs = path.resolve(v);
    if (!fs.existsSync(abs)) throw new Error(`no such file or directory: ${v}`);
    if (fs.statSync(abs).isDirectory()) abs = path.join(abs, 'index.html');
    if (!fs.existsSync(abs)) throw new Error(`no index.html in ${v}`);
    return abs;
  });
  if (!files.length) return { urls: values, close: async () => {} };
  const root = commonParent(files.map((f) => path.dirname(f)));
  const srv = await startServer(root);
  let k = 0;
  const urls = values.map((v) => isUrl(v) ? v
    : `http://127.0.0.1:${srv.port}/${path.relative(root, files[k++]).split(path.sep).map(encodeURIComponent).join('/')}`);
  return { urls, close: srv.close };
}

/* ------------------------------------------------------------------ page side */

/** A timer the page sets for this long or less is waited for before the capture (a skeleton swap, a first-visit dialog). */
const SETTLE_TIMERS_MS = 2000;
/** The page is quiet when nothing has changed for this long (R13). */
const QUIET_MS = 400;

// Runs in the page before its own scripts: keeps the page's pending short timeouts, so the capture can wait for them.
function settleRecorder(limit) {
  const timeout = window.setTimeout.bind(window);
  const clear = window.clearTimeout.bind(window);
  const pending = new Set();
  window.setTimeout = function setTimeout(fn, delay, ...args) {
    if (typeof fn !== 'function' || (Number(delay) || 0) > limit) return timeout(fn, delay, ...args);
    const id = timeout((...a) => { pending.delete(id); fn(...a); }, delay, ...args);
    pending.add(id);
    return id;
  };
  window.clearTimeout = function clearTimeout(id) { pending.delete(id); return clear(id); };
  Object.defineProperty(window, '__fdSettle', { value: { timeout, pending } });
}

async function preparePage(page, theme, readyTimeout, rootSel) {
  await page.evaluate(async (timeout) => {
    const wait = (ms) => new Promise((r) => (window.__fdSettle?.timeout ?? setTimeout)(r, ms));
    const de = document.documentElement;
    const ready = () => { const v = de.dataset.fdReady; return v !== undefined && v !== 'false' && v !== '0'; };
    const scripts = [...document.scripts];
    if (ready() || scripts.some((s) => /fire|boot|elements/i.test(s.src))) {
      const t0 = performance.now();
      while (!ready() && performance.now() - t0 < timeout) await wait(50);
    }
    // Fire's own elements only: a framework's elements (Next's next-route-announcer) may never be defined.
    if (scripts.length) {
      const undef = [...new Set([...document.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.startsWith('fd-') && !customElements.get(n)))];
      await Promise.all(undef.map((n) => Promise.race([customElements.whenDefined(n), wait(Math.min(timeout, 1000))])));
    }
  }, readyTimeout);
  await page.addStyleTag({ content: FREEZE_CSS });
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  // R13: settle. Wait until the DOM has not changed, the root's box has not moved and no short timer of the page is
  // pending for QUIET_MS, up to the ready timeout: a chart redrawn after load, a skeleton swapped at 600 ms.
  return page.evaluate(async ({ timeout, sel, quiet }) => {
    const wait = (ms) => new Promise((r) => (window.__fdSettle?.timeout ?? setTimeout)(r, ms));
    const pending = window.__fdSettle?.pending ?? new Set();
    const root = document.querySelector(sel) ?? document.documentElement;
    const box = () => { const b = root.getBoundingClientRect(); return `${b.x} ${b.y} ${b.width} ${b.height}`; };
    const t0 = performance.now();
    let last = t0;
    let seen = box();
    const observer = new MutationObserver(() => { last = performance.now(); });
    observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
    while (performance.now() - t0 < timeout) {
      await wait(50);
      const now = box();
      if (now !== seen || pending.size) { seen = now; last = performance.now(); }
      if (performance.now() - last >= quiet) break;
    }
    observer.disconnect();
    return { ms: Math.round(performance.now() - t0), quiet: performance.now() - last >= quiet };
  }, { timeout: readyTimeout, sel: rootSel, quiet: QUIET_MS });
}

// Runs in the page. Returns the tree of Fire nodes under `sel`.
function extractInPage({ sel, props, transparent }) {
  const root = document.querySelector(sel);
  if (!root) return { error: `root not found: ${sel}` };
  try { if (transparent) root.matches(transparent); } catch { return { error: `bad --transparent selector: ${transparent}` }; }
  const origin = root.getBoundingClientRect();
  const r2 = (v) => Math.round(v * 100) / 100;
  const SKIP = new Set(['script', 'style', 'link', 'meta', 'template', 'noscript', 'title', 'head']);
  const isFire = (el) => el.localName.startsWith('fd-') || [...el.classList].some((c) => c.startsWith('fd-'));
  const make = (el) => {
    const cs = getComputedStyle(el);
    const styles = {};
    for (const p of props) styles[p] = cs.getPropertyValue(p);
    const attrs = {};
    for (const a of el.attributes) attrs[a.name] = a.value;
    const b = el.getBoundingClientRect();
    const box = [r2(b.left - origin.left), r2(b.top - origin.top), r2(b.width), r2(b.height)];
    return { t: 'el', tag: el.localName, classes: [...el.classList].filter((c) => c.startsWith('fd-')).sort(), attrs, styles, box, children: [] };
  };
  const walk = (node, inFire, out) => {
    for (const ch of node.childNodes) {
      if (ch.nodeType === 3) {
        if (inFire) {
          const last = out[out.length - 1];
          if (last && last.t === 'text') last.text += ch.data; else out.push({ t: 'text', text: ch.data });
        }
      } else if (ch.nodeType === 1) {
        if (SKIP.has(ch.localName)) continue;
        if (transparent && ch.matches(transparent)) { walk(ch, inFire, out); continue; }
        if (inFire || isFire(ch)) { const n = make(ch); out.push(n); walk(ch, true, n.children); } else walk(ch, false, out);
      }
    }
  };
  const out = [];
  if (isFire(root)) { const n = make(root); out.push(n); walk(root, true, n.children); } else walk(root, false, out);
  return { nodes: out };
}

/* ------------------------------------------------------------------ comparison */

const num = (v) => v.replace(/-?\d*\.\d+/g, (m) => String(Math.round(parseFloat(m) * 100) / 100));

/** The ids a value points at: id references (for, aria-*…), `#id` in href, and url(#id) anywhere. */
function referencedIds(name, value) {
  const out = [];
  if (ID_ATTRS.has(name) && name !== 'id') out.push(...value.split(/\s+/).filter(Boolean));
  else if (HREF_ATTRS.has(name) && value.startsWith('#')) out.push(value.slice(1));
  for (const m of value.matchAll(URL_REF)) out.push(m[3]);
  return out;
}

/** Ids defined inside an <svg> that only url(#…) or href="#…" inside that same <svg> point at (gradients, clip paths). */
function svgLocalIds(nodes) {
  const defined = new Map();   // id -> the outermost <svg> it is defined in
  const refs = new Map();      // id -> the outermost <svg> of each reference (-1 outside any)
  let count = 0;
  const visit = (list, svg) => {
    for (const n of list) {
      if (n.t !== 'el') continue;
      const here = svg < 0 && n.tag === 'svg' ? count++ : svg;
      for (const [k, v] of Object.entries(n.attrs)) {
        if (k === 'id') { if (svg >= 0) defined.set(v, svg); continue; }
        for (const id of referencedIds(k, v)) (refs.get(id) ?? refs.set(id, []).get(id)).push(here);
      }
      for (const v of Object.values(n.styles ?? {})) for (const m of v.matchAll(URL_REF)) (refs.get(m[3]) ?? refs.set(m[3], []).get(m[3])).push(here);
      visit(n.children, here);
    }
  };
  visit(nodes, -1);
  return new Set([...defined].filter(([id, svg]) => refs.get(id)?.length && refs.get(id).every((at) => at === svg)).map(([id]) => id));
}

export function normalizeTree(nodes) {
  const local = svgLocalIds(nodes);
  const generated = (tok) => local.has(tok) || GENERATED_ID.some((re) => re.test(tok));
  const gen = new Map();
  const rename = (tok) => {
    if (!gen.has(tok)) gen.set(tok, `~gen${gen.size + 1}`);
    return gen.get(tok);
  };
  // The elements that carry ids are numbered first, in document order, so a reference is renamed after the element it
  // points at: one wrong reference is one difference. Ids referenced but not defined under the root come after.
  const number = (list) => {
    for (const n of list) {
      if (n.t !== 'el') continue;
      if (n.attrs.id && generated(n.attrs.id)) rename(n.attrs.id);
      number(n.children);
    }
  };
  number(nodes);
  const urls = (value) => value.replace(URL_REF, (m, q, before, id) => (generated(id) ? `url(#${rename(id)})` : m));
  const canon = (name, value) => {
    if (ID_ATTRS.has(name)) return value.split(/\s+/).map((tok) => (generated(tok) ? rename(tok) : tok)).join(' ');
    if (HREF_ATTRS.has(name) && value.startsWith('#') && generated(value.slice(1))) return `#${rename(value.slice(1))}`;
    return value.includes('url(') ? urls(value) : value;
  };
  const fix = (list, inSvg) => {
    const out = [];
    for (const n of list) {
      if (n.t === 'text') {
        const text = n.text.replace(/\s+/g, ' ').trim();
        if (text) out.push({ t: 'text', text });
        continue;
      }
      const svg = inSvg || n.tag === 'svg';
      const attrs = {};
      for (const k of Object.keys(n.attrs).sort()) {
        if (IGNORED_ATTRS.some((re) => re.test(k))) continue;
        attrs[k] = canon(k, n.attrs[k]);
      }
      const styles = {};
      for (const [k, v] of Object.entries(n.styles)) styles[k] = num(v.includes('url(') ? urls(v) : v);
      out.push({ ...n, attrs, styles, svg, children: fix(n.children, svg) });
    }
    return out;
  };
  return fix(nodes, false);
}

/** Two values of an SVG geometry attribute: the same apart from numbers, and every number within the tolerance. */
export function sameGeometry(a, b) {
  if (a == null || b == null) return a === b;
  if (a.replace(NUMBER, '#') !== b.replace(NUMBER, '#')) return false;
  const x = a.match(NUMBER) ?? [], y = b.match(NUMBER) ?? [];
  return x.length === y.length && x.every((v, i) => Math.abs(parseFloat(v) - parseFloat(y[i])) <= GEOMETRY_TOLERANCE);
}
const isGeometry = (n, name) => n.svg && GEOMETRY.has(name.toLowerCase());

// Alignment signature: the node's whole content (tag, classes, attributes, descendants, text), without styles, so two
// identical-looking siblings that swap places are one missing plus one extra rather than a cascade of changes.
const sigCache = new WeakMap();
function sig(n) {
  if (n.t === 'text') return `#text:${n.text}`;
  let v = sigCache.get(n);
  if (!v) {
    const attrs = Object.entries(n.attrs).map(([k, a]) => [k, isGeometry(n, k) ? a.replace(NUMBER, '#') : a]).sort();
    v = `${n.tag}|${n.classes.join('.')}|${JSON.stringify(attrs)}|(${n.children.map(sig).join(',')})`;
    sigCache.set(n, v);
  }
  return v;
}
const seg = (n, i) => n.t === 'text' ? `#text[${i}]` : `${n.tag}${n.classes.map((c) => '.' + c).join('')}[${i}]`;

function lcsPairs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) {
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const pairs = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return pairs;
}

function describe(n) { return n.t === 'text' ? JSON.stringify(n.text) : `<${n.tag}${n.classes.map((c) => '.' + c).join('')}>`; }

function diffNodes(r, c, p, out) {
  if (r.classes.join(' ') !== c.classes.join(' ')) out.push({ kind: 'classes', path: p, property: 'class', ref: r.classes.join(' '), cand: c.classes.join(' ') });
  for (const k of new Set([...Object.keys(r.attrs), ...Object.keys(c.attrs)])) {
    if (r.attrs[k] === c.attrs[k] || (isGeometry(r, k) && sameGeometry(r.attrs[k], c.attrs[k]))) continue;
    out.push({ kind: 'attribute', path: p, property: k, ref: r.attrs[k] ?? null, cand: c.attrs[k] ?? null });
  }
  // R11: a margin that differs while the box sits in the same place is the engine's stale computed value.
  const sameBox = r.box && c.box && r.box.every((v, i) => Math.abs(v - c.box[i]) <= GEOMETRY_TOLERANCE);
  for (const k of PROPS) {
    if (r.styles[k] === c.styles[k] || (sameBox && MARGINS.has(k))) continue;
    out.push({ kind: 'style', path: p, property: k, ref: r.styles[k] ?? null, cand: c.styles[k] ?? null });
  }
  diffLists(r.children, c.children, p, out);
}

function diffLists(rl, cl, parent, out) {
  const pairs = lcsPairs(rl.map(sig), cl.map(sig));
  const elIndex = (list) => { let k = 0; return list.map((n) => n.t === 'el' ? k++ : -1); };
  const rIdx = elIndex(rl), cIdx = elIndex(cl);
  const at = (n, list, idx, i) => `${parent ? parent + ' > ' : ''}${seg(n, n.t === 'el' ? idx[i] : i)}`;
  const anchors = [...pairs, [rl.length, cl.length]];
  let pi = 0, pj = 0;
  for (const [ai, aj] of anchors) {
    // gap: ref [pi, ai), cand [pj, aj)
    let j = pj;
    const used = new Set();
    for (let i = pi; i < ai; i++) {
      const r = rl[i];
      let found = -1;
      for (let k = j; k < aj; k++) {
        const c = cl[k];
        if (!used.has(k) && c.t === r.t && (r.t === 'text' || c.tag === r.tag)) { found = k; break; }
      }
      if (found < 0) { out.push({ kind: 'missing', path: at(r, rl, rIdx, i), property: null, ref: describe(r), cand: null }); continue; }
      for (let k = j; k < found; k++) { used.add(k); out.push({ kind: 'extra', path: `${parent ? parent + ' > ' : ''}+${seg(cl[k], cl[k].t === 'el' ? cIdx[k] : k)}`, property: null, ref: null, cand: describe(cl[k]) }); }
      used.add(found); j = found + 1;
      if (r.t === 'text') out.push({ kind: 'text', path: at(r, rl, rIdx, i), property: 'text', ref: r.text, cand: cl[found].text });
      else diffNodes(r, cl[found], at(r, rl, rIdx, i), out);
    }
    for (let k = j; k < aj; k++) if (!used.has(k)) out.push({ kind: 'extra', path: `${parent ? parent + ' > ' : ''}+${seg(cl[k], cl[k].t === 'el' ? cIdx[k] : k)}`, property: null, ref: null, cand: describe(cl[k]) });
    if (ai < rl.length) {
      const r = rl[ai], c = cl[aj];
      if (r.t === 'el') diffNodes(r, c, at(r, rl, rIdx, ai), out);
    }
    pi = ai + 1; pj = aj + 1;
  }
}

export function compareTrees(refNodes, candNodes) {
  const out = [];
  diffLists(normalizeTree(refNodes), normalizeTree(candNodes), '', out);
  return out;
}

const countNodes = (list) => list.reduce((s, n) => s + (n.t === 'el' ? 1 + countNodes(n.children) : 0), 0);

/* ------------------------------------------------------------------ runner */

async function load(deps, ctxOptions, url, root, theme, readyTimeout, wantShot, transparent) {
  const context = await deps.browser.newContext(ctxOptions);
  try {
    await context.addInitScript(settleRecorder, SETTLE_TIMERS_MS);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load' });
    const settle = await preparePage(page, theme, readyTimeout, root);
    const tree = await page.evaluate(extractInPage, { sel: root, props: PROPS, transparent });
    let shot = null;
    if (!tree.error && wantShot) shot = await page.locator(root).first().screenshot({ animations: 'disabled', caret: 'hide' });
    return { tree, shot, settle };
  } finally { await context.close(); }
}

function comparePixels(a, b, threshold, PNG, pixelmatch) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) {
    return { ratio: 1, sizeMismatch: true, ref: [A.width, A.height], cand: [B.width, B.height], diffPixels: null };
  }
  const diff = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, diff.data, A.width, A.height, { threshold });
  return { ratio: n / (A.width * A.height), sizeMismatch: false, size: [A.width, A.height], diffPixels: n, diff };
}

export async function run(opts) {
  const need = async (name) => {
    for (const base of [path.join(process.cwd(), 'noop.js'), import.meta.url]) {
      try { return await import(pathToFileURL(createRequire(base).resolve(name)).href); } catch { /* next */ }
    }
    throw new Error(`cannot load ${name}; install it (npm i -D playwright-core pixelmatch pngjs)`);
  };
  const pw = await need('playwright-core');
  const pm = await need('pixelmatch');
  const png = await need('pngjs');
  const pixelmatch = pm.default || pm;
  const PNG = png.PNG || png.default?.PNG;
  const pwx = pw.default || pw;

  const transparent = [opts.transparent ?? []].flat().filter(Boolean).join(', ') || null;
  const targets = await resolveTargets([opts.ref, opts.cand]);
  const [refUrl, candUrl] = targets.urls;
  const report = { ref: refUrl, cand: candUrl, refRoot: opts.refRoot, candRoot: opts.candRoot,
    options: { widths: opts.widths, themes: opts.themes, engines: opts.engines, maxPixelRatio: opts.maxPixelRatio, transparent }, runs: [], summary: null, ok: true };
  try {
    for (const engine of opts.engines) {
      if (!pwx[engine]) throw new Error(`unknown engine ${engine}`);
      const browser = await pwx[engine].launch();
      try {
        for (const width of opts.widths) for (const theme of opts.themes) {
          // bypassCSP: the freeze stylesheet is an inline <style>, which a page's strict policy would block. The policy
          // itself is for the page's own checks.
          const ctxOptions = { viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce', deviceScaleFactor: 1, bypassCSP: true };
          const deps = { browser };
          const r = await load(deps, ctxOptions, refUrl, opts.refRoot, theme, opts.readyTimeout, true, transparent);
          const c = await load(deps, ctxOptions, candUrl, opts.candRoot, theme, opts.readyTimeout, true, transparent);
          const runRes = { engine, width, theme, structure: [], styles: [], pixels: null, nodes: { ref: 0, cand: 0 }, errors: [], ok: true,
            settle: { ref: r.settle, cand: c.settle } };
          if (r.tree.error) runRes.errors.push(`ref: ${r.tree.error}`);
          if (c.tree.error) runRes.errors.push(`cand: ${c.tree.error}`);
          if (!runRes.errors.length) {
            runRes.nodes = { ref: countNodes(r.tree.nodes), cand: countNodes(c.tree.nodes) };
            for (const d of compareTrees(r.tree.nodes, c.tree.nodes)) (d.kind === 'style' ? runRes.styles : runRes.structure).push(d);
            const px = comparePixels(r.shot, c.shot, opts.pixelThreshold, PNG, pixelmatch);
            const { diff, ...pub } = px;
            runRes.pixels = pub;
            if (opts.diffDir && diff && px.diffPixels) {
              fs.mkdirSync(opts.diffDir, { recursive: true });
              const f = path.join(opts.diffDir, `${engine}-${width}-${theme}.png`);
              fs.writeFileSync(f, PNG.sync.write(diff));
              pub.diffImage = f;
            }
          }
          runRes.ok = !runRes.errors.length && !runRes.structure.length && !runRes.styles.length && !!runRes.pixels && runRes.pixels.ratio <= opts.maxPixelRatio;
          if (!runRes.ok) report.ok = false;
          report.runs.push(runRes);
        }
      } finally { await browser.close(); }
    }
  } finally { await targets.close(); }
  report.summary = {
    runs: report.runs.length, failedRuns: report.runs.filter((x) => !x.ok).length,
    structuralDifferences: report.runs.reduce((s, x) => s + x.structure.length, 0),
    styleDifferences: report.runs.reduce((s, x) => s + x.styles.length, 0),
    maxPixelRatio: report.runs.reduce((m, x) => Math.max(m, x.pixels?.ratio ?? 0), 0),
  };
  return report;
}

export function summarize(report, verbose = false) {
  const lines = [];
  for (const r of report.runs) {
    const px = r.pixels ? (r.pixels.sizeMismatch ? `size ${r.pixels.ref.join('x')} vs ${r.pixels.cand.join('x')}` : `pixels ${(r.pixels.ratio * 100).toFixed(4)}%`) : 'pixels n/a';
    const restless = ['ref', 'cand'].filter((k) => r.settle?.[k] && !r.settle[k].quiet).map((k) => `${k} not quiet after ${r.settle[k].ms} ms`);
    lines.push(`${r.ok ? 'ok  ' : 'FAIL'} ${r.engine} ${r.width} ${r.theme}: ${r.nodes.ref}/${r.nodes.cand} nodes, ${r.structure.length} structure, ${r.styles.length} style, ${px}${restless.length ? ` (${restless.join(', ')})` : ''}`);
    for (const e of r.errors) lines.push(`     ${e}`);
    const all = [...r.structure, ...r.styles];
    for (const d of all.slice(0, verbose ? all.length : 12)) {
      lines.push(`     ${d.kind} ${d.path}${d.property && d.kind !== 'text' ? ` [${d.property}]` : ''}: ${JSON.stringify(d.ref)} -> ${JSON.stringify(d.cand)}`);
    }
    if (!verbose && all.length > 12) lines.push(`     … ${all.length - 12} more (use --json or --verbose)`);
  }
  const s = report.summary;
  lines.push(`${report.ok ? 'EQUAL' : 'DIFFERENT'}: ${s.runs} runs, ${s.failedRuns} failed, ${s.structuralDifferences} structural, ${s.styleDifferences} style, max pixel ratio ${s.maxPixelRatio.toFixed(6)}`);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ CLI */

function parseArgs(argv) {
  const o = { ref: null, cand: null, refRoot: 'body', candRoot: 'body', widths: [1440, 375], themes: ['light', 'dark'], engines: ['chromium'],
    maxPixelRatio: 0.001, json: null, diffDir: null, readyTimeout: 3000, pixelThreshold: 0.1, verbose: false, transparent: [] };
  const list = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    switch (a) {
      case '--ref': o.ref = val(); break;
      case '--cand': o.cand = val(); break;
      case '--ref-root': o.refRoot = val(); break;
      case '--cand-root': o.candRoot = val(); break;
      case '--widths': o.widths = list(val()).map(Number); break;
      case '--themes': o.themes = list(val()); break;
      case '--engines': o.engines = list(val()); break;
      case '--max-pixel-ratio': o.maxPixelRatio = Number(val()); break;
      case '--json': o.json = val(); break;
      case '--diff-dir': o.diffDir = val(); break;
      case '--ready-timeout': o.readyTimeout = Number(val()); break;
      case '--pixel-threshold': o.pixelThreshold = Number(val()); break;
      case '--verbose': o.verbose = true; break;
      case '--transparent': o.transparent.push(val()); break;
      case '-h': case '--help': o.help = true; break;
      default: throw new Error(`unknown option ${a}`);
    }
  }
  return o;
}

async function main(argv) {
  let o;
  try { o = parseArgs(argv); } catch (e) { console.error(`render-equal: ${e.message}`); return 2; }
  if (o.help || !o.ref || !o.cand) {
    console.error('usage: node scripts/render-equal.mjs --ref <url|path> --cand <url|path> [--ref-root sel] [--cand-root sel] [--widths 1440,375] [--themes light,dark] [--engines chromium] [--max-pixel-ratio 0.001] [--json out.json] [--transparent sel]');
    return o.help ? 0 : 2;
  }
  if (o.widths.some((w) => !(w > 0)) || o.themes.some((t) => !['light', 'dark'].includes(t))) { console.error('render-equal: bad --widths or --themes'); return 2; }
  let report;
  try { report = await run(o); } catch (e) { console.error(`render-equal: ${e.message}`); return 2; }
  if (o.json) fs.writeFileSync(o.json, JSON.stringify(report, null, 2));
  console.log(summarize(report, o.verbose));
  return report.ok ? 0 : 1;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then((c) => process.exit(c));
}
