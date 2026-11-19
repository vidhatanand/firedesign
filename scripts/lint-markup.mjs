#!/usr/bin/env node
/*
 * lint-markup: checks markup against the Fire catalogue (contract/catalog.json).
 *
 *   node scripts/lint-markup.mjs [--catalog path] [--json] <files, directories or globs…>
 *
 * Runs in any project that installs Fire; it depends only on Node and the catalogue file. The catalogue is
 * --catalog, else `fire-design/catalog` resolved from the working directory or from this package, else
 * ../contract/catalog.json next to this script.
 *
 * Inputs: .html/.htm; .jsx/.tsx (string literals in className/class, data-*, aria-*, style props, element names);
 * .vue (the whole file is tokenised, <script> and <style> bodies are skipped); html`…` and svg`…` templates in
 * .ts/.js/.mjs/.mts (and in .jsx/.tsx). Static parts are linted. Anything dynamic (`${…}`, `{expr}` that is not a
 * plain string) is skipped, except that the string literals inside a class expression (clsx('fd-a', x && 'fd-b'))
 * are linted as class names. No parser dependencies: a small tokeniser that understands JS strings, template
 * literals, comments, regex literals and JSX.
 *
 * Rules (id: what it reports):
 *   unknown-class            an `fd-` class that the catalogue does not list
 *   unknown-attribute-value  a data-* value the component does not define (only for attributes the catalogue lists
 *                            for a component the element belongs to, through its classes or its tag)
 *   unknown-element          an `fd-` element (tag) that the catalogue does not list
 *   unknown-icon             an icon name that is not in the catalogue: data-icon, <fd-icon icon>, <use href="#i-…">;
 *                            also <fd-icon name>, which the element does not read (its attribute is `icon`)
 *   no-style                 any style attribute or style prop (style=, :style=, v-bind:style=, .style=)
 *   no-raw-color             a hex/rgb()/hsl()/oklch()… colour (or a named colour in fill/stroke/color…) in an attribute
 *   no-raw-px                a pixel size (`12px`) in an attribute
 *   icon-only-name           data-icon-only without aria-label, aria-labelledby, data-fd-tooltip or visible text
 *   no-i-icon-in-framework   <i data-icon> in .jsx/.tsx/.vue (use <fd-icon icon="…"> or the SVG form)
 *   surface-mismatch         (a warning) a part whose card's `surfaces` does not include the surface the page declares
 *                            with data-fd-surface="app|website|phone|email" (on <html> or any element; the nearest
 *                            ancestor that carries it decides). On a phone page a part that lists app is fine too.
 *                            Silent where nothing is declared. --surface <name> sets the surface for files that declare
 *                            none; --no-surface turns the rule off. An unknown data-fd-surface value is an error
 *                            (unknown-attribute-value).
 *   img-attrs                (a warning, 0.8) an <img> inside .fd-site without alt (alt="" for decoration), or without
 *                            both width and height: the browser cannot hold its place before it loads, so the page shifts
 *   Structure (0.10), from the facts on the cards' parts; scripts/lib/structure.mjs holds the rules and documents them:
 *   missing-part             a part the component requires is absent (a callout without fd-callout-icon)
 *   wrong-element            a class on a tag it does not work on, or on the native element it wraps (<select class="fd-select">)
 *   wrong-parent             a part outside the place it may sit (fd-form-section not a child of fd-form)
 *   missing-attribute        an attribute a part needs is absent; forbidden-attribute: one it must not carry (fd-menu hidden)
 *   missing-child            a wrapper without the native element it styles (label.fd-select with no <select>)
 *   bare-control             (a warning) a <select>, <table>, <fieldset>, <textarea> or text <input> with no class, outside
 *                            every Fire class whose CSS styles it (catalogue nativeWrappers), in markup that uses Fire
 *   The lint builds one tree per fragment (the page; each html`` template; each JSX expression; a Vue file's template)
 *   and reports only what that tree shows. It cannot see: a part that a hole, an expression, a slot or a child component
 *   may add (so it is never reported missing there); the parent of a fragment's top element (a template, a component, a
 *   partial), so `parent` and `inside` are checked only within the fragment; attributes a spread may add; the value of an
 *   expression. A check of the rendered page, which feeds the live DOM to the same rules, sees those. No comment turns a
 *   rule off for a line or a file: the lint has no such mechanism.
 *
 * Each finding has file, line, column, rule, severity ("error" or "warning"), message and fix. Exit code 1 when there
 * is any error (warnings never change it), 2 on usage errors. --json: {catalog, files, errors, warnings, findings}.
 *
 * An attribute whose catalogue values are ["*"] takes any value. `data-x=""` counts as the bare `data-x` (the JSX
 * spelling, EXPORT A7) where the attribute takes no value.
 *
 * Catalogue fields read: components[].{id, name, root, classes, attributes, partAttributes, stateAttributes, element, card.{surfaces, avoidWhen, related, parts}}, classes, icons,
 * nativeWrappers, and the tag names of components[].element and elements[].{tagName|tag|name}.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { structureRules, checkTree } from './lib/structure.mjs';

const HOLE = '\u0001';
const BAIL = Symbol('bail');
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
export const RULES = ['unknown-class', 'unknown-attribute-value', 'unknown-element', 'unknown-icon', 'no-style',
  'no-raw-color', 'no-raw-px', 'icon-only-name', 'no-i-icon-in-framework', 'surface-mismatch', 'img-attrs',
  'missing-part', 'wrong-element', 'wrong-parent', 'missing-attribute', 'forbidden-attribute', 'missing-child', 'bare-control'];
export const SURFACES = ['app', 'website', 'phone', 'email'];

const isWs = (c) => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';
const JSX_PREV = new Set(['', '(', ',', '=', ':', '?', '!', '&', '|', '{', '}', ';', '[', '>', 'return', 'yield', 'case', 'default', 'await', 'else', 'typeof', 'in', 'of']);
const REGEX_PREV = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', ';', '+', '-', '*', '%', '<', '>', '~', '^', 'return', 'typeof', 'case', 'in', 'of']);

/* ------------------------------------------------------------------ JS scanning */

// Every event carries `frag`: the markup it belongs to (0 the file, else one html`` template or one JSX expression),
// so the structure check can rebuild each fragment's tree (buildTrees).
function emitEvent(ctx, ev) { if (ev.frag === undefined) ev.frag = ctx.frag || 0; (ctx.cur || ctx.out).push(ev); }

// Scans JS from i. With opts.stop it returns the index of the unmatched `}` that ends the scan. opts.collect receives
// the string literals met outside nested JSX ({s, at}); template holes are masked with HOLE.
function scanCode(ctx, i, opts = {}) {
  const src = ctx.src;
  const n = opts.end ?? src.length;
  const collect = opts.collect || null;
  let depth = 0;
  let prev = '';
  while (i < n) {
    const c = src[i];
    if (isWs(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); i = e < 0 ? n : e; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
      if (collect) collect.push({ s: src.slice(i + 1, j), at: i + 1 });
      i = j + 1; prev = '"'; continue;
    }
    if (c === '`') {
      const lit = ctx.lit && (prev === 'html' || prev === 'svg');
      i = scanTemplate(ctx, i, lit, collect, n); prev = '`'; continue;
    }
    if (c === '{') { depth++; prev = '{'; i++; continue; }
    if (c === '}') {
      if (depth === 0 && opts.stop) return i;
      depth--; prev = '}'; i++; continue;
    }
    if (c === '/') {
      if (REGEX_PREV.has(prev)) {
        let j = i + 1, cls = false;
        while (j < n && src[j] !== '\n') {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false;
          else if (src[j] === '/' && !cls) break;
          j++;
        }
        if (src[j] === '/') { i = j + 1; while (/[a-z]/.test(src[i] || '')) i++; prev = 're'; continue; }
      }
      prev = '/'; i++; continue;
    }
    if (c === '<' && ctx.jsx && JSX_PREV.has(prev) && /[A-Za-z_$>]/.test(src[i + 1] || '')) {
      const r = tryJsx(ctx, i, n);
      if (r > 0) { i = r; prev = 'jsx'; continue; }
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(src[j])) j++;
      prev = src.slice(i, j); i = j; continue;
    }
    if (/[0-9]/.test(c)) { let j = i + 1; while (j < n && /[\w.]/.test(src[j])) j++; i = j; prev = '0'; continue; }
    prev = c; i++;
  }
  return i;
}

// i at the opening backtick. Returns the index after the closing one.
function scanTemplate(ctx, i, asMarkup, collect, n) {
  const src = ctx.src;
  let j = i + 1;
  const holes = [];
  while (j < n && src[j] !== '`') {
    if (src[j] === '\\') { j += 2; continue; }
    if (src[j] === '$' && src[j + 1] === '{') {
      const e = scanCode(ctx, j + 2, { stop: true, collect, end: n });
      holes.push([j, Math.min(e + 1, n)]);
      j = e + 1; continue;
    }
    j++;
  }
  const end = j;
  if (collect || asMarkup) {
    let masked = '';
    let at = i + 1;
    for (const [hs, he] of holes) {
      masked += src.slice(at, hs) + src.slice(hs, he).replace(/[^\n]/g, HOLE);
      at = he;
    }
    masked += src.slice(at, end);
    if (collect) collect.push({ s: masked, at: i + 1, template: true });
    if (asMarkup) { const f = ctx.frag; ctx.frag = ctx.frags = (ctx.frags || 0) + 1; markup(ctx, masked, i + 1, 'lit'); ctx.frag = f; }
  }
  return end + 1;
}

/* ------------------------------------------------------------------ JSX */

function tryJsx(ctx, i, n) {
  const saved = ctx.cur, frag = ctx.frag;
  ctx.cur = [];
  ctx.frag = ctx.frags = (ctx.frags || 0) + 1;
  try {
    const r = parseJsx(ctx, i, n);
    const buf = ctx.cur;
    ctx.cur = saved; ctx.frag = frag;
    for (const ev of buf) emitEvent(ctx, ev);
    return r;
  } catch (e) {
    ctx.cur = saved; ctx.frag = frag;
    if (e === BAIL) return -1;
    throw e;
  }
}

function skipJsxWs(src, j, n) {
  for (;;) {
    while (j < n && isWs(src[j])) j++;
    if (src[j] === '/' && src[j + 1] === '*') { const e = src.indexOf('*/', j + 2); if (e < 0) throw BAIL; j = e + 2; continue; }
    if (src[j] === '/' && src[j + 1] === '/') { const e = src.indexOf('\n', j); if (e < 0) throw BAIL; j = e; continue; }
    return j;
  }
}

function parseJsx(ctx, i, n) {
  const src = ctx.src;
  let j = i + 1;
  const nameStart = j;
  while (j < n && !isWs(src[j]) && src[j] !== '/' && src[j] !== '>' && src[j] !== '{') j++;
  const tag = src.slice(nameStart, j);
  if (tag && !/^[A-Za-z_$][\w.$:-]*$/.test(tag)) throw BAIL;
  const attrs = [];
  let selfClosing = false, spread = false;
  for (;;) {
    j = skipJsxWs(src, j, n);
    if (j >= n) throw BAIL;
    if (src[j] === '/' && src[j + 1] === '>') { selfClosing = true; j += 2; break; }
    if (src[j] === '>') { j++; break; }
    if (src[j] === '{') {
      const e = scanCode(ctx, j + 1, { stop: true, end: n });
      if (e >= n) throw BAIL;
      spread = true; j = e + 1; continue;
    }
    const as = j;
    while (j < n && !isWs(src[j]) && !'=/>{}"\'<'.includes(src[j])) j++;
    if (j === as) throw BAIL;
    const attr = { name: src.slice(as, j), at: as, strings: [], dynamic: false, value: null, hasValue: false };
    const k = skipJsxWs(src, j, n);
    if (src[k] === '=') {
      j = skipJsxWs(src, k + 1, n);
      attr.hasValue = true;
      if (src[j] === '"' || src[j] === "'") {
        const e = src.indexOf(src[j], j + 1);
        if (e < 0) throw BAIL;
        attr.value = src.slice(j + 1, e); attr.valueAt = j + 1;
        attr.strings.push({ s: attr.value, at: j + 1 });
        j = e + 1;
      } else if (src[j] === '{') {
        const collect = [];
        const e = scanCode(ctx, j + 1, { stop: true, collect, end: n });
        if (e >= n) throw BAIL;
        const expr = src.slice(j + 1, e).trim();
        attr.strings = collect;
        const one = collect.length === 1 && !collect[0].s.includes(HOLE) &&
          expr.length === collect[0].s.length + 2 && /^(["'`])/.test(expr);
        if (one) { attr.value = collect[0].s; attr.valueAt = collect[0].at; } else attr.dynamic = true;
        j = e + 1;
      } else throw BAIL;
    } else j = k;
    attrs.push(attr);
  }
  emitEvent(ctx, { type: 'open', tag, attrs, selfClosing, spread, at: i });
  if (selfClosing) return j;
  for (;;) {
    if (j >= n) throw BAIL;
    if (src[j] === '<') {
      if (src[j + 1] === '/') {
        const k = src.indexOf('>', j);
        if (k < 0) throw BAIL;
        emitEvent(ctx, { type: 'close', tag: src.slice(j + 2, k).trim(), at: j });
        return k + 1;
      }
      j = parseJsx(ctx, j, n);
    } else if (src[j] === '{') {
      const e = scanCode(ctx, j + 1, { stop: true, end: n });
      if (e >= n) throw BAIL;
      const inner = src.slice(j + 1, e).replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (inner) emitEvent(ctx, { type: 'text', expr: true, at: j });
      j = e + 1;
    } else {
      let e = j;
      while (e < n && src[e] !== '<' && src[e] !== '{') e++;
      if (/\S/.test(src.slice(j, e))) emitEvent(ctx, { type: 'text', expr: false, at: j });
      j = e;
    }
  }
}

/* ------------------------------------------------------------------ HTML, Vue templates, Lit templates */

// `text` is the markup (masked for Lit); positions are base + index. Vue: base 0 and text === ctx.src.
function markup(ctx, text, base, mode) {
  const n = text.length;
  let i = 0;
  const emitText = (s, at) => {
    const expr = s.includes(HOLE) || (mode === 'vue' && s.includes('{{'));
    if (expr || /\S/.test(s)) emitEvent(ctx, { type: 'text', expr, at: base + at });
  };
  while (i < n) {
    const lt = text.indexOf('<', i);
    if (lt < 0) { emitText(text.slice(i), i); break; }
    if (lt > i) emitText(text.slice(i, lt), i);
    const nx = text[lt + 1];
    if (text.startsWith('<!--', lt)) { const e = text.indexOf('-->', lt + 4); i = e < 0 ? n : e + 3; continue; }
    if (nx === '!' || nx === '?') { const e = text.indexOf('>', lt); i = e < 0 ? n : e + 1; continue; }
    if (nx === '/') {
      const e = text.indexOf('>', lt);
      const end = e < 0 ? n : e;
      emitEvent(ctx, { type: 'close', tag: text.slice(lt + 2, end).trim(), at: base + lt });
      i = end + 1; continue;
    }
    if (!/[A-Za-z]/.test(nx || '')) { i = lt + 1; continue; }
    // open tag
    let j = lt + 1;
    while (j < n && !isWs(text[j]) && text[j] !== '/' && text[j] !== '>') j++;
    const tag = text.slice(lt + 1, j);
    const attrs = [];
    let selfClosing = false, attrHole = false;
    for (;;) {
      while (j < n && isWs(text[j])) j++;
      if (j >= n) break;
      if (text[j] === '>') { j++; break; }
      if (text[j] === '/') { if (text[j + 1] === '>') { selfClosing = true; j += 2; break; } j++; continue; }
      const as = j;
      while (j < n && !isWs(text[j]) && text[j] !== '=' && text[j] !== '>' && !(text[j] === '/' && text[j + 1] === '>')) j++;
      let name = text.slice(as, j);
      let k = j;
      while (k < n && isWs(text[k])) k++;
      const attr = { name, at: base + as, strings: [], dynamic: false, value: null, hasValue: false };
      if (text[k] === '=') {
        k++;
        while (k < n && isWs(text[k])) k++;
        let vs, ve;
        if (text[k] === '"' || text[k] === "'") {
          vs = k + 1; ve = text.indexOf(text[k], vs); if (ve < 0) ve = n; j = ve + 1;
        } else {
          vs = k; ve = k;
          while (ve < n && !isWs(text[ve]) && text[ve] !== '>') ve++;
          j = ve;
        }
        attr.hasValue = true;
        const raw = text.slice(vs, ve);
        attr.valueAt = base + vs;
        attr.raw = raw;
        attr.rawStart = vs;
        attr.strings = [{ s: raw, at: base + vs }];
        if (raw.includes(HOLE)) attr.dynamic = true; else attr.value = raw;
      } else j = k;
      if (name.includes(HOLE)) { attrHole = true; continue; } // attribute-position hole: attributes the lint cannot see
      if (mode === 'vue') {
        if (name.startsWith(':') || name.startsWith('v-bind:')) {
          attr.name = name.replace(/^(:|v-bind:)/, '');
          attr.bound = true;
          if (attr.hasValue) {
            const collect = [];
            scanCode(ctx, attr.rawStart, { collect, end: attr.rawStart + attr.raw.length });
            attr.strings = collect;
            const expr = attr.raw.trim();
            const one = collect.length === 1 && expr.length === collect[0].s.length + 2 && /^(["'`])/.test(expr) && !collect[0].s.includes(HOLE);
            attr.value = one ? collect[0].s : null; attr.dynamic = !one;
            if (one) attr.valueAt = collect[0].at;
          }
        } else if (name.startsWith('@') || name.startsWith('v-') || name.startsWith('#')) {
          attr.directive = true;
        }
      } else if (mode === 'lit') {
        if (name.startsWith('@')) attr.directive = true;
        else if (name.startsWith('?') || name.startsWith('.')) { attr.name = name.slice(1); attr.dynamic = true; attr.value = null; }
      }
      attrs.push(attr);
    }
    const lname = tag.toLowerCase();
    emitEvent(ctx, { type: 'open', tag, attrs, selfClosing: selfClosing || VOID.has(lname), spread: false, attrHole, at: base + lt });
    i = j;
    if ((lname === 'script' || lname === 'style') && !selfClosing) {
      const re = new RegExp('</' + lname + '\\b', 'i');
      const m = re.exec(text.slice(i));
      i = m ? i + m.index : n;
    }
  }
}

/* ------------------------------------------------------------------ catalogue */

export function prepareCatalog(raw) {
  const comps = raw.components || [];
  const byId = new Map(comps.map((c) => [c.id, c]));
  const classes = new Map();
  for (const c of comps) for (const k of c.classes || []) classes.set(k, c.id);
  for (const [k, id] of Object.entries(raw.classes || {})) classes.set(k, id);
  const tags = new Map();
  for (const c of comps) if (typeof c.element === 'string' && c.element) tags.set(c.element.toLowerCase(), c.id);
  for (const e of raw.elements || []) {
    const t = typeof e === 'string' ? e : (e.tagName || e.tag || e.name);
    if (typeof t === 'string' && t.includes('-')) tags.set(t.toLowerCase(), e.component || null);
  }
  return { classes, byId, tags, icons: new Set(raw.icons || []), version: raw.fire, structure: structureRules(raw) };
}

function distance(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function nearest(word, candidates) {
  let best = null, bd = Infinity;
  for (const c of candidates) { const d = distance(word, c); if (d < bd) { bd = d; best = c; } }
  return best !== null && bd <= Math.max(2, Math.floor(word.length * 0.34)) ? best : null;
}

/* ------------------------------------------------------------------ checks */

const NO_VALUE_CHECK = new Set(['class', 'classname', 'id', 'href', 'xlink:href', 'xlinkhref', 'src', 'srcset', 'for', 'htmlfor', 'name',
  'value', 'placeholder', 'title', 'alt', 'content', 'action', 'd', 'points', 'transform', 'viewbox', 'type', 'lang', 'rel',
  'target', 'role', 'key', 'ref', 'is', 'slot', 'style', 'media', 'sizes', 'pattern', 'accept', 'autocomplete', 'enterkeyhint']);
const COLOR_ATTRS = new Set(['fill', 'stroke', 'color', 'bgcolor', 'stop-color', 'flood-color', 'lighting-color']);
const COLOR_OK = /^(none|currentcolor|inherit|transparent|initial|unset|context-fill|context-stroke|url\(.*\)|var\(.*\))$/i;
const COLOR_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/i;
const PX_RE = /(?:^|[\s,(:])-?(?:\d+\.?\d*|\.\d+)px\b/i;

function normName(name, mode) {
  let n = name.toLowerCase();
  if (n === 'classname') n = 'class';
  if (n === 'htmlfor') n = 'for';
  if (n === 'xlinkhref') n = 'xlink:href';
  return n;
}

// opts: { surface } the surface for a file that declares none; { noSurface: true } turns surface-mismatch off.
export function lintText(file, text, rawCatalog, kind, opts = {}) {
  const cat = rawCatalog.classes instanceof Map ? rawCatalog : prepareCatalog(rawCatalog);
  kind = kind || kindOf(file);
  const findings = [];
  if (!kind) return findings;
  if (kind === 'lit' && !/\b(html|svg)\s*`/.test(text)) return findings;

  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  const loc = (p) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= p) lo = mid; else hi = mid - 1; }
    return { line: lo + 1, col: p - starts[lo] + 1 };
  };
  const report = (at, rule, message, fix, severity = 'error') => findings.push({ file, ...loc(at), rule, severity, message, fix });

  const events = [];
  const ctx = { src: text, out: events, cur: null, jsx: kind === 'jsx', lit: kind === 'jsx' || kind === 'lit' };
  if (kind === 'html') markup(ctx, text, 0, 'html');
  else if (kind === 'vue') markup(ctx, text, 0, 'vue');
  else scanCode(ctx, 0);

  const framework = kind === 'jsx' || kind === 'vue';
  const classNames = [...cat.classes.keys()];
  const tagNames = [...cat.tags.keys()];
  const iconNames = [...cat.icons];
  const stack = [];
  const surfaceStack = [];   // open elements: { tag, surface, flagged: component ids already reported by an ancestor }
  const evalFrame = (f) => {
    if (!f.hasText) report(f.at, 'icon-only-name', `icon-only button <${f.tag}> has no accessible name`,
      'add aria-label="…" (or aria-labelledby), or put visible text inside the button');
  };

  for (const ev of events) {
    if (ev.type === 'text') { for (const f of stack) f.hasText = true; continue; }
    if (ev.type === 'close') {
      const t = ev.tag.toLowerCase();
      let sk = surfaceStack.length - 1;
      while (sk >= 0 && surfaceStack[sk].tag !== t) sk--;
      if (sk >= 0) surfaceStack.splice(sk);
      let k = stack.length - 1;
      while (k >= 0 && stack[k].tag !== t) k--;
      if (k >= 0) { for (const f of stack.splice(k)) evalFrame(f); }
      continue;
    }
    const tag = ev.tag.toLowerCase();
    const attrs = ev.attrs.filter((a) => !a.directive).map((a) => ({ ...a, key: normName(a.name, kind) }));
    const get = (k) => attrs.find((a) => a.key === k);

    // unknown element
    if (tag.startsWith('fd-') && !cat.tags.has(tag)) {
      const s = nearest(tag, tagNames);
      report(ev.at + 1, 'unknown-element', `unknown element <${ev.tag}>`,
        s ? `did you mean <${s}>? Elements are listed in the catalogue (elements).` : 'use an element from the catalogue (elements), or the fd- class form');
    }

    // classes
    const classTokens = [];
    for (const a of attrs) {
      if (a.key !== 'class') continue;
      for (const { s, at } of a.strings) {
        for (const m of s.matchAll(/\S+/g)) if (!m[0].includes(HOLE)) classTokens.push({ t: m[0], at: at + m.index });
      }
    }
    const comps = new Set();
    if (cat.tags.get(tag)) comps.add(cat.tags.get(tag));
    for (const { t, at } of classTokens) {
      if (!t.startsWith('fd-')) continue;
      if (cat.classes.has(t)) { comps.add(cat.classes.get(t)); continue; }
      const s = nearest(t, classNames);
      report(at, 'unknown-class', `unknown class "${t}"`, s ? `did you mean "${s}"?` : 'use a class from the catalogue (classes)');
    }

    // surfaces: the nearest data-fd-surface decides for the element and everything inside it
    const parent = surfaceStack[surfaceStack.length - 1];
    let surface = parent ? parent.surface : opts.surface || null;
    const ds = get('data-fd-surface');
    if (ds && !ds.dynamic && ds.value !== null) {
      if (SURFACES.includes(ds.value)) surface = ds.value;
      else report(ds.valueAt ?? ds.at, 'unknown-attribute-value', `data-fd-surface="${ds.value}" is not a surface`,
        `allowed: ${SURFACES.map((v) => `"${v}"`).join(', ')}`);
    }
    const flagged = new Set(parent ? parent.flagged : []);
    if (surface && !opts.noSurface) {
      for (const id of comps) {
        const card = cat.byId.get(id)?.card;
        if (!card || !Array.isArray(card.surfaces) || flagged.has(id)) continue;
        if (card.surfaces.includes(surface) || (surface === 'phone' && card.surfaces.includes('app'))) continue;
        flagged.add(id);
        const here = (x) => { const k = cat.byId.get(x)?.card?.surfaces || []; return k.includes(surface) || (surface === 'phone' && k.includes('app')); };
        const alt = [...(card.avoidWhen || []).map((a) => a.instead), ...(card.related || [])].filter((x, i, a) => cat.byId.has(x) && x !== id && here(x) && a.indexOf(x) === i)[0];
        report(ev.at + 1, 'surface-mismatch',
          `${cat.byId.get(id).name || id} (${id}) is for ${card.surfaces.join(', ')}, not ${surface}: the page declares data-fd-surface="${surface}"`,
          alt ? `on ${surface} use ${alt} (${cat.byId.get(alt).name || alt}); the card names it as the alternative` : `leave it out of ${surface} pages, or put it in an element that declares data-fd-surface="${card.surfaces[0]}"`,
          'warning');
      }
    }
    // a picture on a site: a text alternative, and its size so its place is held before it loads
    const inSite = Boolean(parent?.site);
    if (tag === 'img' && inSite && !ev.spread) {
      const missing = ['alt', 'width', 'height'].filter((k) => !get(k));
      if (missing.length) report(ev.at + 1, 'img-attrs', `<img> on a site without ${missing.join(', ')}`,
        missing.includes('alt') ? 'add alt="…" that says what the picture shows (alt="" when it is decoration, as a backdrop is), and the picture\'s own width and height'
          : 'add the picture\'s own width and height (its pixel size): the browser holds its place before it loads, so nothing moves', 'warning');
    }
    if (!ev.selfClosing) surfaceStack.push({ tag, surface, flagged, site: inSite || classTokens.some((c) => c.t === 'fd-site') });

    // data-* values the component defines
    for (const a of attrs) {
      if (!a.key.startsWith('data-') || a.dynamic || a.value === null) continue;
      if (a.key === 'data-size' && attrs.some((x) => x.key === 'data-icon')) continue;   // icons.js: a drawn icon takes 12|14|16|20|24 whatever class it carries
      let listed = null;
      for (const id of comps) {
        const c = cat.byId.get(id);
        // The component's own values, the state its scripts set, and the values of the parts this element carries.
        const defs = [c?.attributes?.[a.key], c?.stateAttributes?.[a.key], ...classTokens.map(({ t }) => c?.partAttributes?.[t]?.[a.key])];
        for (const def of defs) if (Array.isArray(def)) listed = (listed || []).concat(def);
      }
      // `data-x=""` is the bare `data-x` (JSX must write presence attributes so, spec A7): fine where the attribute
      // takes no value (an empty list, or only the bare form).
      const presenceOnly = listed && listed.every((v) => v === '');
      if (listed && !listed.includes('*') && !listed.includes(a.value) && !(a.value === '' && presenceOnly)) {   // "*" in the catalogue: any value
        const s = nearest(a.value, listed);
        report(a.valueAt ?? a.at, 'unknown-attribute-value', `${a.key}="${a.value}" is not defined for ${[...comps].join('/')}`,
          `${s ? `did you mean "${s}"? ` : ''}allowed: ${listed.map((v) => `"${v}"`).join(', ')}`);
      }
    }

    // icons
    const checkIcon = (name, at) => {
      if (!name || name.includes(HOLE) || cat.icons.has(name)) return;
      const s = nearest(name, iconNames);
      report(at, 'unknown-icon', `unknown icon "${name}"`, s ? `did you mean "${s}"?` : 'use a name from the catalogue (icons)');
    };
    const di = get('data-icon');
    if (di && !di.dynamic && di.value) checkIcon(di.value, di.valueAt ?? di.at);
    if (tag === 'fd-icon') {
      const ic = get('icon');
      if (ic && !ic.dynamic && ic.value) checkIcon(ic.value, ic.valueAt ?? ic.at);
      const nm = get('name');   // fd-icon's attribute is `icon` (elements/src/icon.ts); a `name` draws nothing
      if (nm && !ic) report(nm.at, 'unknown-icon', '<fd-icon> has no name attribute, so it draws nothing',
        `use <fd-icon icon="${nm.value && !nm.dynamic ? nm.value : '…'}">`);
    }
    if (tag === 'use') {
      for (const a of attrs) {
        if ((a.key === 'href' || a.key === 'xlink:href') && !a.dynamic && a.value && a.value.startsWith('#i-')) checkIcon(a.value.slice(3), (a.valueAt ?? a.at) + 3);
      }
    }
    if (tag === 'i' && di && framework) {
      report(di.at, 'no-i-icon-in-framework', '<i data-icon> is drawn by Fire\'s boot script, which framework rendering does not run',
        `use <fd-icon icon="${di.value && !di.dynamic ? di.value : '…'}"></fd-icon> (or the inline SVG <use href="#i-…"> form)`);
    }

    // style
    for (const a of attrs) {
      if (a.key === 'style') report(a.at, 'no-style', 'style attributes and style props are not allowed',
        'use a Fire class or data-* variant; if none exists, add it to the stylesheet with tokens instead of inline styles');
    }

    // raw colours and px sizes
    for (const a of attrs) {
      if (NO_VALUE_CHECK.has(a.key) || a.key.startsWith('aria-')) continue;
      for (const { s, at } of a.strings) {
        const v = s.trim();
        if (!v || v.includes(HOLE) && !/\S/.test(v.replaceAll(HOLE, ''))) continue;
        const off = at + s.indexOf(v[0]);
        const named = COLOR_ATTRS.has(a.key) && !COLOR_OK.test(v) && !v.includes(HOLE);
        if (COLOR_RE.test(v) || named) {
          report(off, 'no-raw-color', `raw colour "${v}" in ${a.name}`, 'use currentColor or a token-driven Fire class (colours come from --fd-* tokens)');
        } else if (PX_RE.test(v)) {
          report(off, 'no-raw-px', `raw pixel size "${v}" in ${a.name}`, 'use a Fire size attribute or token (data-size, --fd-space-*, --fd-size-*) instead of px');
        }
      }
    }

    // icon-only buttons
    const io = get('data-icon-only');
    if (io && !(io.value === 'false')) {
      const named = get('aria-label') || get('aria-labelledby') || get('data-fd-tooltip');   // overlays.js: a tooltip names an icon-only trigger
      if (!named && !ev.spread) {
        const f = { tag, at: io.at, hasText: false };
        if (ev.selfClosing) evalFrame(f); else stack.push(f);
      }
    }
  }
  for (const f of stack) evalFrame(f);

  // structure (scripts/lib/structure.mjs): one tree per fragment; bare-control only in markup that uses Fire
  const trees = buildTrees(events, kind);
  const usesFire = events.some((e) => e.type === 'open' && e.attrs.some((a) => normName(a.name) === 'class' && a.strings.some(({ s }) => /(^|\s)fd-/.test(s))));
  for (const tree of trees) {
    for (const f of cat.structure ? checkTree(tree, cat.structure, { usesFire }) : []) report(f.node.ref.at + 1, f.rule, f.message, f.fix, f.severity);
  }
  findings.sort((a, b) => a.line - b.line || a.col - b.col);
  return findings;
}

/** The tokeniser on its own (fire slim reads product source with it): the open/close/text events of the markup, and
 *  for code (`lit`, `jsx`) every string literal met outside markup, holes masked with HOLE. */
export function scanSource(text, kind) {
  const events = [];
  const strings = [];
  const ctx = { src: text, out: events, cur: null, jsx: kind === 'jsx', lit: kind === 'jsx' || kind === 'lit' };
  if (kind === 'html') markup(ctx, text, 0, 'html');
  else if (kind === 'vue') markup(ctx, text, 0, 'vue');
  else scanCode(ctx, 0, { collect: strings });
  return { events, strings };
}
export { HOLE };

/** The events as trees in the shape scripts/lib/structure.mjs reads: one root per fragment (the file, each html``
 *  template, each JSX expression). A full HTML page's root is `#document`; every other root is `#fragment`, whose
 *  children have parents the lint cannot see. A node is dynamic when a hole, an expression, v-html or v-text sits
 *  among its children; dynamicAttrs when a spread or an attribute-position hole may add attributes. Vue's own
 *  <template> wrappers (v-if, v-for, #slot) are transparent: their children are the parent's. */
export function buildTrees(events, kind) {
  const roots = new Map();
  const doc = kind === 'html' && events.some((e) => e.type === 'open' && /^(html|body)$/i.test(e.tag));
  for (const ev of events) {
    const f = ev.frag || 0;
    if (!roots.has(f)) roots.set(f, [{ tag: '', node: { tag: doc && f === 0 ? '#document' : '#fragment', classes: [], attrs: {}, children: [], dynamic: false } }]);
    const stack = roots.get(f);
    const top = stack[stack.length - 1].node;
    if (ev.type === 'text') { if (ev.expr) top.dynamic = true; else top.text = true; continue; }
    if (ev.type === 'close') {
      let k = stack.length - 1;
      while (k > 0 && stack[k].tag !== ev.tag.toLowerCase()) k--;
      if (k > 0) stack.length = k;
      continue;
    }
    const lower = ev.tag.toLowerCase();
    if (kind === 'vue' && lower === 'template') {   // the SFC's own <template> is the fragment; inner ones are transparent
      if (!ev.selfClosing) stack.push({ tag: lower, node: top });
      continue;
    }
    const node = { tag: kind === 'html' ? lower : ev.tag, classes: [], attrs: {}, children: [], dynamic: false, ref: { at: ev.at } };
    if (ev.spread || ev.attrHole) node.dynamicAttrs = true;
    for (const a of ev.attrs) {
      if (a.directive) {
        if (a.name === 'v-bind') node.dynamicAttrs = true;
        if (a.name === 'v-html' || a.name === 'v-text') node.dynamic = true;
        continue;
      }
      const key = normName(a.name);
      if (key === 'class') {
        for (const { s } of a.strings) for (const t of s.split(/\s+/)) if (t.startsWith('fd-') && !t.includes(HOLE) && !node.classes.includes(t)) node.classes.push(t);
        if (node.attrs.class !== null) node.attrs.class = a.dynamic ? null : `${node.attrs.class ?? ''} ${a.value ?? ''}`.trim();   // null: unseen classes may join
        continue;
      }
      if (key === 'dangerouslysetinnerhtml' || key === 'innerhtml') node.dynamic = true;
      node.attrs[key] = a.dynamic ? null : a.hasValue ? a.value : true;
    }
    top.children.push(node);
    if (!ev.selfClosing) stack.push({ tag: lower, node });
  }
  return [...roots.values()].map((s) => s[0].node);
}

export function kindOf(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html' || ext === '.htm') return 'html';
  if (ext === '.vue') return 'vue';
  if (ext === '.jsx' || ext === '.tsx') return 'jsx';
  if (['.ts', '.js', '.mjs', '.mts', '.cjs'].includes(ext)) return 'lit';
  return null;
}

/* ------------------------------------------------------------------ files and CLI */

function globToRegExp(g) {
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') { i++; if (g[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*'; } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') { re += '(?:'; }
    else if (c === '}') re += ')';
    else if (c === ',' && /\{[^}]*$/.test(g.slice(0, i))) re += '|';
    else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}

function walk(dir, out) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
}

export function expandInputs(inputs, cwd = process.cwd()) {
  const files = new Set();
  for (const input of inputs) {
    const abs = path.resolve(cwd, input);
    if (/[*?{]/.test(input)) {
      const posix = input.split(path.sep).join('/');
      const firstMagic = posix.search(/[*?{]/);
      const baseDir = path.resolve(cwd, posix.slice(0, posix.lastIndexOf('/', firstMagic) + 1) || '.');
      const re = globToRegExp(path.resolve(cwd, posix).split(path.sep).join('/'));
      const all = []; walk(baseDir, all);
      for (const f of all) if (re.test(f.split(path.sep).join('/')) && kindOf(f)) files.add(f);
    } else if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      const all = []; walk(abs, all);
      for (const f of all) if (kindOf(f)) files.add(f);
    } else if (fs.existsSync(abs)) files.add(abs);
    else console.error(`lint-markup: no such file: ${input}`);
  }
  return [...files].sort();
}

export function findCatalog(explicit) {
  if (explicit) return path.resolve(explicit);
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const base of [path.join(process.cwd(), 'noop.js'), import.meta.url.replace('file://', '')]) {
    try { return createRequire(base).resolve('fire-design/catalog'); } catch { /* next */ }
  }
  return path.resolve(here, '../contract/catalog.json');
}

function main(argv) {
  let catalogPath = null, json = false, surface = null, noSurface = false;
  const inputs = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--catalog') catalogPath = argv[++i];
    else if (a.startsWith('--catalog=')) catalogPath = a.slice(10);
    else if (a === '--no-surface') noSurface = true;
    else if (a === '--surface') surface = argv[++i];
    else if (a.startsWith('--surface=')) surface = a.slice(10);
    else if (a === '-h' || a === '--help') { console.log('usage: node scripts/lint-markup.mjs [--catalog path] [--json] [--surface app|website|phone|email] [--no-surface] <files, directories or globs…>'); return 0; }
    else if (a.startsWith('--')) { console.error(`lint-markup: unknown option ${a}`); return 2; }
    else inputs.push(a);
  }
  if (!inputs.length) { console.error('lint-markup: no input files'); return 2; }
  if (surface !== null && !SURFACES.includes(surface)) { console.error(`lint-markup: --surface is one of ${SURFACES.join(', ')}`); return 2; }
  const cpath = findCatalog(catalogPath);
  let catalog;
  try { catalog = prepareCatalog(JSON.parse(fs.readFileSync(cpath, 'utf8'))); } catch (e) {
    console.error(`lint-markup: cannot read the catalogue ${cpath}: ${e.message}`); return 2;
  }
  const files = expandInputs(inputs);
  const findings = [];
  for (const f of files) {
    const rel = path.relative(process.cwd(), f) || f;
    findings.push(...lintText(rel, fs.readFileSync(f, 'utf8'), catalog, undefined, { surface, noSurface }));
  }
  const errors = findings.filter((x) => x.severity === 'error').length;
  const warnings = findings.length - errors;
  if (json) {
    console.log(JSON.stringify({ catalog: cpath, files: files.length, errors, warnings, findings }, null, 2));
  } else {
    for (const x of findings) console.log(`${x.file}:${x.line}:${x.col}  ${x.severity}  ${x.rule}  ${x.message}\n    fix: ${x.fix}`);
    console.log(`${files.length} file${files.length === 1 ? '' : 's'} checked, ${errors} error${errors === 1 ? '' : 's'}${warnings ? `, ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}`);
  }
  return errors ? 1 : 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  process.exit(main(process.argv.slice(2)));
}
