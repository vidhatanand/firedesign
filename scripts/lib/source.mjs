// Shared readers of Fire's source files, used by scripts/audit.mjs and scripts/build-catalog.mjs.
// Everything here is read-only and deterministic: no output depends on the clock or the machine.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (p) => fs.readFileSync(p, 'utf8');

/** Replace every non-newline char with a space: keeps length, indices and line numbers intact. */
export const blank = (s) => s.replace(/[^\n]/g, ' ');

/** Files directly inside one folder (not recursive), by extension. Absolute paths, sorted. */
export function topFiles(dir, exts) {
  return fs.readdirSync(path.join(ROOT, dir))
    .filter((n) => exts.some((x) => n.endsWith(x)))
    .sort()
    .map((n) => path.join(ROOT, dir, n));
}

/** base.css and every fire/components/*.css (the files the audit treats as component styles). */
export const cssFiles = () => [path.join(ROOT, 'fire/base.css'), ...topFiles('fire/components', ['.css'])].filter((f) => fs.existsSync(f));

/** Blank url("data:...") values and CSS comments, preserving positions. */
export function stripCss(t) {
  return t
    .replace(/url\(\s*(?:"data:[^"]*"|'data:[^']*'|data:[^)]*)\s*\)/gi, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank);
}

/** The names in `export const ICONS` of fire/js/icons.js. */
export async function loadIconNames() {
  const file = path.join(ROOT, 'fire/js/icons.js');
  try {
    const mod = await import(pathToFileURL(file).href);
    return new Set(Object.keys(mod.ICONS));
  } catch {
    // Module could not be imported (e.g. it touches `document`): read the keys from the text instead.
    const text = read(file);
    const body = text.slice(text.indexOf('export const ICONS'));
    return new Set([...body.matchAll(/"([^"\\]+)"\s*:\s*"/g)].map((m) => m[1]));
  }
}

/** Every style sheet whose data attributes the audit and the catalogue read (docs.css is page chrome, not Fire). */
export function attributeSheets({ docs = true } = {}) {
  const list = [...cssFiles(), ...['fire/layout.css', 'fire/tokens.css', 'fire/palettes.css', 'fire/typefaces.css', ...(docs ? ['docs/docs.css'] : [])].map((f) => path.join(ROOT, f))];
  return list.filter((f) => fs.existsSync(f));
}

// Split a selector into compound selectors at combinators (space, >, +, ~) outside [] and ().
function compounds(selector) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of selector) {
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth--;
    if (depth === 0 && /[\s>+~]/.test(ch)) { if (cur) out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
// Split a selector list at top-level commas (not inside [] or ()).
function splitList(text) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of text) {
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth--;
    if (depth === 0 && ch === ',') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}
// Remove :not(...) groups (one nesting level): a negated value is not a value the component defines.
const withoutNot = (s) => s.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '');
// Remove :has(...) groups: what they test is on a descendant or a sibling, not on the compound itself.
const withoutHas = (s) => s.replace(/:has\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g, '');
// Expand :is(a, b) and :where(a, b) into one selector per alternative: `:is(.fd-a, .fd-b[data-x="y"] > select)`
// gives `.fd-a` and `.fd-b[data-x="y"] > select`, so a value tested on one alternative stays with that alternative.
function expandIs(selector, limit = 64) {
  const m = /:(?:is|where)\(/.exec(selector);
  if (!m) return [selector];
  let depth = 0, end = m.index + m[0].length - 1;
  for (; end < selector.length; end++) { if (selector[end] === '(') depth++; else if (selector[end] === ')' && --depth === 0) break; }
  const head = selector.slice(0, m.index), tail = selector.slice(end + 1);
  const out = [];
  for (const alt of splitList(selector.slice(m.index + m[0].length, end))) {
    for (const s of expandIs(head + alt.trim() + tail, limit)) { out.push(s); if (out.length >= limit) return out; }
  }
  return out;
}

/**
 * The data attribute values the styles define, per class context.
 * Returns a Map "class|data-attr" (or "*|data-attr" for any element, from fire/layout.css) -> Set(values).
 * The map also carries `.flags`: Map "class|data-attr" -> true for selectors that test only the presence of an attribute.
 *
 * scope 'selector' (the audit): every attribute in a selector counts for every fd- class anywhere in that selector.
 * scope 'compound' (the catalogue): an attribute counts for the fd- classes of its own compound selector only, and
 *   attributes on a compound with no fd- class (an ancestor state such as [data-theme="dark"]) are ignored;
 *   :is()/:where() lists are read one alternative at a time, and :not()/:has() groups are not read.
 */
export function collectAttrValues(sheets, { scope = 'selector' } = {}) {
  const known = new Map();
  known.flags = new Map();
  const note = (ctx, attr, value) => { const k = `${ctx}|${attr}`; if (!known.has(k)) known.set(k, new Set()); known.get(k).add(value); };
  for (const f of sheets) {
    const text = stripCss(read(f));
    const anyElement = f.endsWith('layout.css');
    for (const rule of text.matchAll(/([^{}]+)\{/g)) {
      for (const selector of scope === 'compound' ? splitList(rule[1]) : rule[1].split(/,(?![^()[\]]*[)\]])/)) {
        if (scope === 'selector') {
          const attrs = [...selector.matchAll(/\[(data-[a-z0-9-]+)[~|^$*]?="([^"]*)"\]/g)];
          if (!attrs.length) continue;
          const classes = [...selector.matchAll(/\.(fd-[a-z0-9-]+)/g)].map((m) => m[1]);
          // Only fire/layout.css defines attributes for any element; a class-less selector elsewhere is page chrome.
          const contexts = classes.length ? classes : (anyElement ? ['*'] : []);
          for (const [, attr, value] of attrs) for (const ctx of contexts) note(ctx, attr, value);
        } else for (const alternative of expandIs(withoutHas(withoutNot(selector)))) {
          let before = [];   // the fd- classes of the nearest compound to the left that has any: `.fd-table td[data-actions]` is the table's
          for (const compound of compounds(alternative)) {
            const c = withoutNot(compound);
            const classes = [...c.matchAll(/\.(fd-[a-z0-9-]+)/g)].map((m) => m[1]);
            if (classes.length && !/\[data-[a-z0-9-]+/.test(c)) { before = classes; continue; }
            const contexts = classes.length ? classes : before.length ? before : (anyElement && !/\[data-(theme|palette|type|density|text-size)\b/.test(c) ? ['*'] : []);
            if (classes.length) before = classes;
            if (!contexts.length) continue;
            for (const [, attr, value] of c.matchAll(/\[(data-[a-z0-9-]+)[~|^$*]?="([^"]*)"\]/g)) for (const ctx of contexts) note(ctx, attr, value);
            for (const [, attr] of c.matchAll(/\[(data-[a-z0-9-]+)\]/g)) for (const ctx of contexts) known.flags.set(`${ctx}|${attr}`, true);
          }
        }
      }
    }
  }
  return known;
}

/** fd- classes the behaviour modules refer to in selectors, classList calls and markup strings (comments included: they document hooks). */
export function scriptClasses() {
  const set = new Set();
  for (const file of topFiles('fire/js', ['.js'])) {
    const text = read(file);
    for (const x of text.matchAll(/(?<![\w-])\.(fd-[a-z0-9]+(?:-[a-z0-9]+)*)(?![\w-])/g)) set.add(x[1]);
    for (const x of text.matchAll(/classList\.(?:add|remove|toggle|contains)\(([^)]*)\)/g)) for (const y of x[1].matchAll(/['"](fd-[a-z0-9-]+)['"]/g)) set.add(y[1]);
    for (const x of text.matchAll(/class(?:Name)?\s*=\s*\\?["'`]([^"'`]*)/g)) for (const y of x[1].split(/\s+/)) if (/^fd-[a-z0-9]+(-[a-z0-9]+)*$/.test(y)) set.add(y);
  }
  return set;
}
