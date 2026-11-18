// Evidence that a data-* value belongs to a component, read from the comments and the code of Fire's sources.
//
// A value is evidence for the fd- names it is written on, never for a whole file or module. Names are reported as
// ".fd-x" (a class), "<fd-x" (an element's tag) or "fd-x" (written bare, as in `fd-kv[data-cols]`: a class, else a tag):
//   - a selector `.fd-x[data-a="v"]` (or `fd-x[data-a="v"]` in prose): the names of its compound selector;
//   - markup `<tag class="fd-x" data-a="v">` (or `[data-a="v"]` written inside the tag as an optional attribute):
//     the names of that tag; a bare `data-a` inside a tag records the presence form "";
//   - a table line in a comment, `data-a  v1 | v2 (default) | v3`: the fd- names written before it on its line, else
//     in a style sheet the comment's first component root (each section comment documents one component), else
//     its first fd- name, and in a script the fd- names of the nearest line above it in the same comment;
//   - prose `data-a="v1|v2"  on input, textarea, …`: the components the line names after "on".
// One value in a specimen (`data-name="domains"`, `[data-placement="bottom-end"]`) is an example, not a list: it counts
// when a Fire script compares or writes that literal for the attribute (scriptValues), or when other evidence
// enumerates the attribute for the same component. Values a script compares or assigns on a variable
// (`el.dataset.state = 'open'`) name no component, so they are not evidence on their own;
// scripts/lib/catalog-assign.mjs lists the state such writes produce.

import path from 'node:path';
import { ROOT, read, topFiles, cssFiles, blank } from './source.mjs';

const NAME = /^fd-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALUE = /^[a-z0-9][a-z0-9.-]*$/;            // a value as markup writes it (lowercase token; "1.5" is a stroke weight)
const WORD_VALUE = /^[a-z][a-z0-9-]*$/;            // a single value from documentation: numbers there are examples
const ATTR_RE = String.raw`data-[a-z0-9]+(?:-[a-z0-9]+)*`;

/** The fd- names of the compound selector that ends at text[i] (exclusive): `.fd-a.fd-b[x]:is(.fd-c)` -> a, b, c. */
export function compoundBefore(text, i) {
  const names = [];
  let j = i;
  for (let guard = 0; j > 0 && guard < 50; guard++) {
    const ch = text[j - 1];
    if (ch === ']') { const k = text.lastIndexOf('[', j - 1); if (k < 0) break; j = k; continue; }
    if (ch === ')') {
      let depth = 0, k = j - 1;
      for (; k >= 0; k--) { if (text[k] === ')') depth++; else if (text[k] === '(' && --depth === 0) break; }
      if (k < 0) break;
      const fn = text.slice(0, k).match(/:{1,2}[a-z-]+$/);
      if (!fn) break;
      if (fn[0] !== ':not') for (const m of text.slice(k + 1, j - 1).matchAll(/(?<![\w-])(\.?)(fd-[a-z0-9]+(?:-[a-z0-9]+)*)(?![\w-])/g)) names.push(m[1] + m[2]);
      j = k - fn[0].length;
      continue;
    }
    const m = text.slice(Math.max(0, j - 120), j).match(/(\.|:{1,2})?([a-zA-Z][a-zA-Z0-9_-]*)$/);
    if (!m) break;
    if (m[1] !== ':' && m[1] !== '::' && NAME.test(m[2])) names.push((m[1] || '') + m[2]);
    j -= m[0].length;
    if (!m[1]) break;                                   // a tag (or a bare name) starts the compound
  }
  return names;
}

/** The fd- class tokens and fd- tag name of the markup tag that encloses text[i], or null when i is not inside a tag. */
export function enclosingTag(text, i) {
  let k = i - 1;
  for (; k >= 0; k--) {
    const ch = text[k];
    if (ch === '>' && text[k - 1] !== '=') return null;
    if (ch === '\n' && /^\s*\*?\s*$/.test(text.slice(text.lastIndexOf('\n', k - 1) + 1, k)) ) return null;
    if (ch === '<' && /[a-z]/i.test(text[k + 1] || '')) break;
  }
  if (k < 0) return null;
  let end = i;
  while (end < text.length && !(text[end] === '>' && text[end - 1] !== '=')) end++;
  const tag = text.slice(k, end);
  const names = [];
  const tagName = tag.match(/^<([a-z][a-z0-9-]*)/i)?.[1];
  if (tagName && NAME.test(tagName)) names.push('<' + tagName);
  for (const c of tag.matchAll(/class(?:Name)?=\\?["'`]([^"'`\\]*)/g)) for (const t of c[1].split(/\s+/)) if (NAME.test(t)) names.push('.' + t);
  // `<i data-icon="…">` is an icon (fire/js/icons.js draws it), whatever element carries it.
  if (!names.length && /\sdata-icon(?=[\s=>\\])/.test(tag)) names.push('.fd-icon');
  return names;
}

const splitValues = (s, single) => (s.includes('|') ? s.split('|').map((v) => v.trim()) : [s]).filter((v) => (single ? WORD_VALUE : VALUE).test(v));

/**
 * The values of one `data-a  …` table segment: `v1 | v2 (default) | v3 — prose`, `"a" (default) | "b"`, or one value
 * followed by two spaces, a parenthesis or the end of the line. Parenthesised notes and prose after a dash, colon,
 * comma or semicolon are dropped; an item of several words ("any registered name") is not a value.
 */
export function tableValues(seg) {
  if (seg.includes('|') && /"[^"]+"\s*(?:\([^)]*\)\s*)?\|/.test(seg)) {
    return [...seg.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((v) => VALUE.test(v));
  }
  if (!seg.includes('|')) {
    const m = seg.match(/^([a-z0-9][a-z0-9.-]*)(?:\s{2,}|\s*\(|\s*$)/);
    return m && !/^\d+$/.test(m[1]) ? [m[1]] : [];
  }
  return seg.split('|').map((item) => item.replace(/\([^)]*\)?/g, ' ').split(/\s+—|:|,|;/)[0].trim()).filter((v) => VALUE.test(v));
}

/**
 * Scan one text (a comment or a script with its comments blanked) for values written next to fd- names.
 * `comment`: 'css' | 'js' for comments (table lines and prose are read), false for code. `ids`: component id -> root
 * class, for prose that names components. Calls note(names, attr, value, how, enumerates) for every finding.
 */
export function scanText(text, { comment = false, ids = new Map(), isRoot = () => false, note }) {
  const lines = text.split('\n');
  let offset = 0;
  const lineStarts = lines.map((l) => { const s = offset; offset += l.length + 1; return s; });
  const lineAt = (i) => { let lo = 0, hi = lineStarts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= i) lo = mid; else hi = mid - 1; } return lo; };
  const namesOnLine = (n) => {
    const l = lines[n];
    const out = [];
    for (const c of l.matchAll(/class=\\?["']([^"'\\]*)/g)) for (const t of c[1].split(/\s+/)) if (NAME.test(t)) out.push('.' + t);
    for (const m of l.matchAll(/(?<![\w-])\.(fd-[a-z0-9]+(?:-[a-z0-9]+)*)(?![\w-])/g)) out.push('.' + m[1]);
    return out;
  };
  // A style sheet's section comment documents one component: the root its title names ("Popover — a generic
  // anchored panel", even when the specimen starts with the trigger button), else its first root, else its first name.
  const firstName = (() => {
    const all = lines.flatMap((_, n) => namesOnLine(n));
    const title = (lines.map((l) => l.replace(/^[\s/*=-]+/, '')).find((l) => /[a-z]/i.test(l)) || '').toLowerCase();
    const named = all.find((x) => isRoot(x.slice(1)) && new RegExp(`(^|[^\\w-])${x.slice(4).replace(/-/g, '[ -]')}s?([^\\w-]|$)`).test(title));
    const root = named || all.find((x) => isRoot(x.slice(1)));
    return root ? [root] : all.slice(0, 1);
  })();
  const used = new Set();   // start offsets already read as a table segment

  // 1. Table lines: `data-a   v | w   data-b   x` (comments only).
  if (comment) {
    lines.forEach((l, n) => {
      const body = l.replace(/^\s*\*?\s*/, '');
      const atStart = new RegExp(`^${ATTR_RE}\\s`).test(body);
      const start = lineStarts[n] + l.length - body.length;
      const segRe = new RegExp(`(?<![\\w\\[="'.-])(${ATTR_RE})[ \\t]+(.*?)(?=\\s{2,}${ATTR_RE}(?:\\s|=)|,\\s*${ATTR_RE}|$)`, 'g');
      for (const seg of body.matchAll(segRe)) {
        const lead = seg.index === 0 || (atStart && /^\s{2,}$/.test(body.slice(seg.index - 2, seg.index)));
        if (!lead && !seg[2].includes('|')) continue;             // prose that mentions an attribute
        if (enclosingTag(text, start + seg.index)) continue;       // `<div data-fd-x data-y="…" […]>`: markup, read below
        const values = tableValues(seg[2]).filter((v) => !v.startsWith('data-'));
        if (!values.length) continue;
        used.add(start + seg.index);
        const before = namesOnLine(n).filter((x) => body.indexOf(x.slice(1)) < seg.index);
        let subject = before;
        if (!subject.length && comment === 'css') subject = firstName;
        if (!subject.length && comment === 'js') for (let p = n - 1; p >= 0 && !subject.length; p--) subject = namesOnLine(p);
        if (!subject.length) continue;
        for (const v of values) note(subject, seg[1], v, 'table', true);
      }
    });
  }

  // 2. In code, a comparison or a write on an element a selector names: `$('.fd-chat-receipt', el)?.dataset.state === 'sending'`.
  if (!comment) {
    const cmp = /(?:\$|querySelector|closest)\(\s*['"]\.(fd-[a-z0-9]+(?:-[a-z0-9]+)*)['"][^)]*\)\??\.(?:dataset\.([a-zA-Z0-9]+)|getAttribute\(\s*['"](data-[a-z0-9-]+)['"]\s*\))\s*(?:===|!==|==|!=|=(?!=))\s*['"]([a-z0-9][a-z0-9-]*)['"]/g;
    for (const m of text.matchAll(cmp)) note(['.' + m[1]], m[3] || 'data-' + m[2].replace(/[A-Z]/g, (x) => '-' + x.toLowerCase()), m[4], 'script', true);
  }

  // 3. Selectors `[data-a="v"]` / `[data-a]` and markup `data-a="v"` / bare `data-a`.
  const re = new RegExp(String.raw`(\[)?(${ATTR_RE})(?:\s*[~|^$*]?=\s*(?:\\?"([^"\\]*)\\?"|'([^']*)'))?(\])?`, 'g');
  for (const m of text.matchAll(re)) {
    const [whole, open, attr, dq, sq, close] = m;
    const i = m.index;
    const prev = text[i - 1] || '';
    if (!open && /[\w.$-]/.test(prev)) continue;                 // dataset-ish identifiers, other attribute names
    if (open && !close) continue;
    if (used.has(i)) continue;
    const raw = dq ?? sq ?? null;
    if (raw !== null && /\$\{|…/.test(raw)) continue;            // dynamic or placeholder
    const values = raw === null ? null : splitValues(raw, comment !== false && !raw.includes('|'));
    const list = raw !== null && raw.includes('|');
    if (open) {
      const names = compoundBefore(text, i);
      if (names.length) { if (values) for (const v of values) note(names, attr, v, 'selector', true); continue; }
      const tag = enclosingTag(text, i);                          // `<div class="fd-x" [data-a="v"]>`: an optional attribute
      if (tag?.length && values) for (const v of values) note(tag, attr, v, 'markup', list);
      continue;
    }
    if (prev === "'" || prev === '"' || prev === '`') {
      // `'data-a'` as a string argument (getAttribute, setAttribute): not markup.
      if (!/^\s/.test(text.slice(i + whole.length, i + whole.length + 1)) && text[i + whole.length] !== '=') continue;
    }
    const tag = enclosingTag(text, i);
    if (tag?.length) {
      // A list (`data-a="v|w"`) enumerates; one value in a specimen is an example (data-name="domains"); a bare
      // attribute in documentation is its presence form.
      if (values) for (const v of values) note(tag, attr, v, 'markup', list);
      // Behaviour hooks (data-fd-*) often take a value (data-fd-dialog-close="reject"): their bare form is an example.
      else if (/^[\s>/\\'"]|^$/.test(text.slice(i + whole.length, i + whole.length + 1))) note(tag, attr, '', 'markup', comment !== false && !attr.startsWith('data-fd-'));
      continue;
    }
    if (comment && values) {
      // Prose that names its components: `data-size="sm|lg"   on input, textarea, input-group, …`.
      const n = lineAt(i);
      const line = lines[n];
      const on = line.slice(line.indexOf(attr)).match(/\s(?:on|for)\s+((?:[a-z][a-z-]*(?:,\s*|\s+and\s+|\s*$))+)/);
      if (on) {
        const roots = on[1].split(/,\s*|\s+and\s+/).map((w) => w.trim()).filter((w) => ids.has(w)).map((w) => '.' + ids.get(w));
        if (roots.length) { for (const v of values) note(roots, attr, v, 'prose', true); continue; }
      }
      // A script comment's row that starts with the attribute (`data-state="loading|empty" on the element works too`)
      // belongs to the entry above it, like a table row.
      if (comment === 'js' && list && line.replace(/^\s*\*?\s*/, '').startsWith(attr + '=')) {
        let subject = [];
        for (let p = n - 1; p >= 0 && !subject.length; p--) subject = namesOnLine(p);
        if (subject.length) for (const v of values) note(subject, attr, v, 'table', true);
      }
    }
  }
}

/**
 * All evidence from Fire's style-sheet comments and its scripts (comments and code).
 * Returns a list of { names, attr, value, file, how, enumerates }. `enumerates` is false for one value written in a
 * specimen or a script's markup (an example such as data-name="domains"): it counts only for an attribute that other
 * evidence enumerates for the same component.
 */
export function sourceEvidence({ ids = new Map(), isRoot = () => false } = {}) {
  const out = [];
  const push = (file) => (names, attr, value, how, enumerates) => out.push({ names: [...new Set(names)], attr, value, file, how, enumerates });
  for (const file of cssFiles()) {
    const text = read(file);
    for (const c of text.matchAll(/\/\*[\s\S]*?\*\//g)) scanText(c[0], { comment: 'css', ids, isRoot, note: push(path.basename(file)) });
  }
  for (const file of topFiles('fire/js', ['.js'])) {
    const text = read(file);
    for (const c of text.matchAll(/\/\*[\s\S]*?\*\//g)) scanText(c[0], { comment: 'js', ids, note: push(path.basename(file)) });
    const code = text.replace(/\/\*[\s\S]*?\*\/|(?<![:\\'"`])\/\/[^\n]*/g, blank);
    scanText(code, { comment: false, ids, note: push(path.basename(file)) });
  }
  return out;
}

/**
 * What Fire's scripts write: attribute -> Set(literal values written), from `dataset.a = 'v'`, `dataset.a = c ? 'v' : 'w'`,
 * `setAttribute('data-a', 'v')`, `toggleAttribute('data-a')` (""), `delete x.dataset.a` and `removeAttribute('data-a')`
 * (the attribute is written, no value), and `data-a="v"` in the markup a script renders. Used to check scripts/lib/catalog-assign.mjs's STATE_ATTRIBUTES.
 */
export function scriptWrites() {
  const out = new Map();
  const add = (attr, v) => { if (!out.has(attr)) out.set(attr, new Set()); if (v !== undefined) out.get(attr).add(v); };
  const name = (camel) => 'data-' + camel.replace(/[A-Z]/g, (x) => '-' + x.toLowerCase());
  for (const file of topFiles('fire/js', ['.js'])) {
    const code = read(file).replace(/\/\*[\s\S]*?\*\/|(?<![:\\'"`])\/\/[^\n]*/g, blank);
    for (const m of code.matchAll(/dataset\.([a-zA-Z0-9]+)\s*=(?!=)([^;\n]*)/g)) { add(name(m[1])); for (const v of m[2].matchAll(/['"]([a-z0-9][a-z0-9-]*)['"]/g)) add(name(m[1]), v[1]); }
    for (const m of code.matchAll(/delete\s+[\w.$[\]]+\.dataset\.([a-zA-Z0-9]+)/g)) add(name(m[1]));
    for (const m of code.matchAll(/setAttribute\(\s*['"](data-[a-z0-9-]+)['"]\s*,\s*([^)]*)\)/g)) { add(m[1]); for (const v of m[2].matchAll(/['"]([a-z0-9][a-z0-9-]*)['"]/g)) add(m[1], v[1]); }
    for (const m of code.matchAll(/toggleAttribute\(\s*['"](data-[a-z0-9-]+)['"]/g)) add(m[1], '');
    for (const m of code.matchAll(/removeAttribute\(\s*['"](data-[a-z0-9-]+)['"]/g)) add(m[1]);
    for (const m of code.matchAll(/(?<![\w\[-])(data-[a-z0-9-]+)=\\?["']([a-z0-9][a-z0-9-]*)?/g)) add(m[1], m[2]);   // markup a script renders
  }
  return out;
}

/**
 * Literal values each Fire script (by file name) compares or writes for an attribute: `dataset.a === 'v'`,
 * `'v' !== dataset.a`, `getAttribute('data-a') === 'v'`, `dataset.a = 'v'`, `setAttribute('data-a', 'v')`, `[data-a="v"]`.
 * And, per attribute, every quoted literal of the modules that write it (`modules`), to check a state's values.
 */
export function scriptValues() {
  const compared = new Map();   // file -> attribute -> values
  const modules = new Map();
  const add = (map, attr, v) => { if (!/^[a-z0-9][a-z0-9-]*$/.test(v)) return; if (!map.has(attr)) map.set(attr, new Set()); map.get(attr).add(v); };
  const REF = String.raw`(?:getAttribute\(\s*['"](data-[a-z0-9-]+)['"]\s*\)|dataset\.([a-zA-Z0-9]+)|dataset\[\s*['"]([a-zA-Z0-9]+)['"]\s*\])`;
  const name = (a, b, c) => a || 'data-' + (b || c).replace(/[A-Z]/g, (x) => '-' + x.toLowerCase());
  for (const file of topFiles('fire/js', ['.js'])) {
    const code = read(file).replace(/\/\*[\s\S]*?\*\/|(?<![:\\'"`])\/\/[^\n]*/g, blank);
    const own = new Map();
    compared.set(path.basename(file), own);
    for (const x of code.matchAll(new RegExp(REF + String.raw`\s*(?:===|!==|==|!=|=)\s*['"]([^'"]+)['"]`, 'g'))) add(own, name(x[1], x[2], x[3]), x[4]);
    for (const x of code.matchAll(new RegExp(String.raw`['"]([^'"]+)['"]\s*(?:===|!==|==|!=)\s*` + REF, 'g'))) add(own, name(x[2], x[3], x[4]), x[1]);
    for (const x of code.matchAll(/setAttribute\(\s*['"](data-[a-z0-9-]+)['"]\s*,\s*['"]([^'"]+)['"]/g)) add(own, x[1], x[2]);
    for (const x of code.matchAll(/\[(data-[a-z0-9-]+)[~|^$*]?=\\?["']([^"'\\]+)\\?["']\]/g)) add(own, x[1], x[2]);
    for (const x of code.matchAll(/dataset\.([a-zA-Z0-9]+)\s*=(?!=)\s*['"]([^'"]+)['"]/g)) add(own, name(null, x[1]), x[2]);
    const literals = [...code.matchAll(/['"]([a-z0-9][a-z0-9-]*)['"]/g)].map((m) => m[1]);
    const written = new Set();
    for (const m of code.matchAll(/dataset\.([a-zA-Z0-9]+)\s*=(?!=)|setAttribute\(\s*['"](data-[a-z0-9-]+)['"]|toggleAttribute\(\s*['"](data-[a-z0-9-]+)['"]/g)) written.add(m[2] || m[3] || name(null, m[1]));
    for (const a of written) for (const v of literals) add(modules, a, v);
  }
  return { compared, modules };
}
