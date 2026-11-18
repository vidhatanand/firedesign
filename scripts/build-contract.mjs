#!/usr/bin/env node
// Writes contract/fire-contract.json and contract/looks/<palette>.json from fire/tokens.css, fire/typefaces.css and
// fire/js/theme.js.
//   node scripts/build-contract.mjs           write the files
//   node scripts/build-contract.mjs --check   write nothing; exit 1 when a committed file differs from a fresh build
//
// fire-contract.json lists every global token (declared on :root, outside any @media) as
//   { name, type, tier, group, default, facetRole? }
//   type      color · dimension · duration · number · shadow · fontFamily · cubicBezier · other
//   tier      input    set by a theme record: the palette's colour inputs, the three families, the dial variables
//                      (theme.js INPUT_TOKENS)
//             scale    a step of a scale (type, space, radius, shadow, motion, sizes, layers, status tones, chart and
//                      code colours): values may change, steps may not be added or renamed
//             derived  computed by Fire from the palette (it refers to a palette colour or to another derived token);
//                      never authored
//   group     the family the token belongs to (an unknown token name fails the build, so a new token gets a group)
//   default   Ember's value, var() resolved; { light, dark } where the value is a light-dark() pair; color-mix() with
//             transparent written as rgb(r g b / a), calc(n × scale) at the default scale written as its result
//   facetRole the Facet colour role the token fills (ARCHITECTURE.md section 4)
// "breakpoints" names the widths (phone < 640, tablet 640–899, desktop >= 900, wide >= 1200), as fire/tokens.css's header says.
// and, under "facet", each role with its token and Ember's opaque values (muted is --fd-text-3 laid over the page).
// looks/<palette>.json is the theme record of each preset palette, as the Tweaks panel's Copy theme writes it.
// looks/named/<name>.json are the named looks, written by hand: { name, label, note, record }. Each record must pass
// validateTheme and be one the Tweaks panel can hold (a named palette, toned or not, and a named type set), so the
// panel and ?look= can apply it whole; build-palettes.mjs --check holds each to the contrast rules under its own
// surfaces and controls. From them this writes
//   fire/js/looks.js   LOOKS, in LOOK_ORDER: { name, label, note, record, state, swatch, attributes, props }
//   fire/boot.js       the block between "looks:begin" and "looks:end": each look's attributes and custom properties,
//                      so ?look=<name> puts a look on <html> before the first paint (names from this list only)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const { PALETTES, PALETTE_TOKENS, parse, format } = await load('fire/js/palettes.js');
const { INPUT_TOKENS, CONTRACT, toThemeRecord, validateTheme, fromThemeRecord, expandTheme } = await load('fire/js/theme.js');
const { paletteTokens, toneTokens, cssValue } = await load('fire/js/palettes.js');

/* ---------- CSS: every rule with its at-rule parents ---------- */
function rulesOf(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const stack = [];
  let buf = '';
  for (const ch of text) {
    if (ch === '{') { stack.push({ prelude: buf.trim().replace(/\s+/g, ' '), body: '' }); buf = ''; }
    else if (ch === '}') {
      const rule = stack.pop();
      rule.body += buf;
      buf = '';
      rule.parents = stack.map((s) => s.prelude);
      out.push(rule);
    } else buf += ch;
  }
  return out;
}
const declsOf = (body) => [...body.matchAll(/(--fd-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')]);
const isGlobal = (rule) => !rule.parents.length && rule.prelude.split(',').map((s) => s.trim()).includes(':root');

const TABLE = new Map(); // name → declared value (the last global declaration wins, as in the cascade)
const ORDER = [];
for (const file of ['fire/tokens.css', 'fire/typefaces.css']) {
  for (const rule of rulesOf(fs.readFileSync(path.join(ROOT, file), 'utf8'))) {
    if (!isGlobal(rule)) continue;
    for (const [name, value] of declsOf(rule.body)) {
      if (!TABLE.has(name)) ORDER.push(name);
      TABLE.set(name, value);
    }
  }
}

/* ---------- Resolving a value for Ember, in one mode ---------- */
/** Split on top-level commas. */
function args(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}
/** Replace each `fn(…)` call (outermost first) by what `swap(inner)` returns. */
function replaceCalls(text, fn, swap) {
  let out = '';
  let i = 0;
  for (;;) {
    const at = text.indexOf(`${fn}(`, i);
    if (at < 0) return out + text.slice(i);
    let depth = 0;
    let j = at + fn.length;
    for (; j < text.length; j++) {
      if (text[j] === '(') depth++;
      if (text[j] === ')' && --depth === 0) break;
    }
    out += text.slice(i, at) + swap(text.slice(at + fn.length + 1, j));
    i = j + 1;
  }
}
const num = (n) => String(Number(n.toFixed(4)));
function resolve(value, m, seen = new Set()) {
  let v = replaceCalls(value, 'var', (inner) => {
    const [name] = args(inner);
    if (seen.has(name)) throw new Error(`cycle at ${name}`);
    if (!TABLE.has(name)) throw new Error(`${name} is not declared globally`);
    return resolve(TABLE.get(name), m, new Set([...seen, name]));
  });
  v = replaceCalls(v, 'light-dark', (inner) => resolve(args(inner)[m], m, seen));
  v = replaceCalls(v, 'color-mix', (inner) => {
    const mm = inner.match(/^in srgb, (.+) ([\d.]+)%, transparent$/);
    if (mm) {
      const { rgb, alpha } = parse(mm[1]);
      return format(rgb, alpha * Number(mm[2]) / 100);
    }
    // Two opaque colours, one of them with a percentage: color-mix(in srgb, A p%, B) or (in srgb, A, B p%).
    const [space, a, b] = args(inner);
    const pct = (part) => { const pm = part.match(/^(.+) ([\d.]+)%$/); return pm ? [pm[1], Number(pm[2]) / 100] : [part, null]; };
    const [ca, pa] = pct(a);
    const [cb, pb] = pct(b);
    if (space !== 'in srgb' || (pa === null) === (pb === null)) throw new Error(`cannot resolve color-mix(${inner})`);
    const wa = pa ?? 1 - pb;
    const [A, B] = [parse(ca), parse(cb)];
    if (A.alpha !== 1 || B.alpha !== 1) throw new Error(`cannot resolve color-mix(${inner}): translucent colours`);
    return format(A.rgb.map((c, i) => c * wa + B.rgb[i] * (1 - wa)));
  });
  v = replaceCalls(v, 'calc', (inner) => {
    const mm = inner.match(/^(-?[\d.]+)([a-z%]*) \* (-?[\d.]+)$/);
    if (!mm) throw new Error(`cannot resolve calc(${inner})`);
    return `${num(Number(mm[1]) * Number(mm[3]))}${mm[2]}`;
  });
  return v;
}
/** Does the declared value (with what it refers to) depend on light-dark()? */
function paired(value, seen = new Set()) {
  if (value.includes('light-dark(')) return true;
  return [...value.matchAll(/var\((--fd-[\w-]+)/g)].some(([, name]) => !seen.has(name) && paired(TABLE.get(name), new Set([...seen, name])));
}
function defaultOf(name) {
  const value = TABLE.get(name);
  return paired(value) ? { light: resolve(value, 0), dark: resolve(value, 1) } : resolve(value, 0);
}

/* ---------- Group, type, tier, Facet role ---------- */
const GROUPS = [
  [/^--fd-font-/, 'font'],
  [/^--fd-text-(display|h[1-3]|title|lg|md|sm|xs|2xs|3xs|4xs|stat|3xl|xl|compose)$/, 'type'],
  [/^--fd-(lh|ls|weight)-/, 'type'],
  [/^--fd-text(-[2-5]|-inverse)?$/, 'text'],
  [/^--fd-(space-scale|radius-scale|motion|texture|hairline)$/, 'dial'],
  [/^--fd-space-/, 'space'],
  [/^--fd-radius-/, 'radius'],
  [/^--fd-(focus|ring|ring-inset)$/, 'focus'],
  [/^--fd-shadow-/, 'shadow'],
  [/^--fd-(ease-|dur-|loop-|stagger$|press-scale$)/, 'motion'],
  [/^--fd-(control-(xs|sm|md|lg|xl|px)|icon(-\w+)?|row|row-px|sidebar-w|rail-w|topbar-h|panel-w|subnav-w|gutter|content-max|measure|size-\w+)$/, 'size'],
  [/^--fd-z-/, 'layer'],
  [/^--fd-a\d+$/, 'ink-ladder'],
  [/^--fd-(fill(-\w+)?|control-line(-hover)?)$/, 'fill'],
  [/^--fd-(surface-(edge|flush|head)|field(-hover)?|control-(bg|edge)(-hover|-active)?)$/, 'structure'],
  [/^--fd-(eyebrow|section-label)-/, 'label'],
  [/^--fd-accent-\d+$/, 'accent-wash'],
  [/^--fd-(success|warning|danger|info|violet)-/, 'status'],
  [/^--fd-chart-/, 'chart'],
  [/^--fd-syntax-/, 'syntax'],
];
function groupOf(name) {
  // The ring's colour is set by each palette (an input) but stays with the ring in the focus group.
  if (name === '--fd-focus') return 'focus';
  // Status and chart colours are set by each palette too (inputs) but stay in their own groups.
  if (PALETTE_TOKENS.includes(name) && !/^--fd-(success|warning|danger|info|chart)-/.test(name)) return 'palette';
  const hit = GROUPS.find(([re]) => re.test(name));
  if (!hit) throw new Error(`${name}: no group; add it to GROUPS in scripts/build-contract.mjs`);
  return hit[1];
}
const COLOR_GROUPS = new Set(['palette', 'text', 'ink-ladder', 'fill', 'structure', 'accent-wash', 'status', 'chart', 'syntax']);
function typeOf(name, group, def) {
  const v = typeof def === 'string' ? def : def.light;
  if (group === 'font' || name === '--fd-eyebrow-font' || name === '--fd-section-label-font') return 'fontFamily';
  if (group === 'shadow' || name.startsWith('--fd-ring')) return 'shadow';
  if (/^cubic-bezier\(/.test(v)) return 'cubicBezier';
  if (COLOR_GROUPS.has(group) || name === '--fd-focus' || /^(#|rgb|hsl|oklch|transparent$)/.test(v)) return 'color';
  if (/^-?[\d.]+m?s$/.test(v)) return 'duration';
  if (/^-?[\d.]+(px|rem|em|ch|%|vw|vh)$/.test(v) || (v === '0' && ['space', 'radius', 'size'].includes(group))) return 'dimension';
  if (/^-?[\d.]+$/.test(v)) return 'number';
  return 'other';
}
const INPUTS = new Set(INPUT_TOKENS);
const tiers = new Map();
function tierOf(name) {
  if (tiers.has(name)) return tiers.get(name);
  tiers.set(name, 'scale'); // provisional, against cycles
  let tier = 'scale';
  if (INPUTS.has(name)) tier = 'input';
  else {
    const refs = [...TABLE.get(name).matchAll(/var\((--fd-[\w-]+)/g)].map((m) => m[1]);
    if (refs.some((r) => PALETTE_TOKENS.includes(r) || tierOf(r) === 'derived')) tier = 'derived';
  }
  tiers.set(name, tier);
  return tier;
}
const ROLES = {
  '--fd-bg': 'background', '--fd-surface': 'surface', '--fd-ink': 'text', '--fd-text-3': 'muted',
  '--fd-accent': 'primary', '--fd-accent-contrast': 'on-primary', '--fd-line': 'border', '--fd-focus': 'focus',
  '--fd-accent-text': 'link',
};
for (const tone of ['success', 'warning', 'danger', 'info']) {
  ROLES[`--fd-${tone}-fill`] = tone;
  ROLES[`--fd-${tone}-contrast`] = `on-${tone}`;
}

/* ---------- Build ---------- */
const missingInputs = INPUT_TOKENS.filter((t) => !TABLE.has(t));
if (missingInputs.length) throw new Error(`theme.js INPUT_TOKENS not declared on :root: ${missingInputs.join(', ')}`);
const missingRoles = Object.keys(ROLES).filter((t) => !TABLE.has(t));
if (missingRoles.length) throw new Error(`Facet role tokens not declared on :root: ${missingRoles.join(', ')}`);

const tokens = ORDER.map((name) => {
  const group = groupOf(name);
  const def = defaultOf(name);
  const entry = { name, type: typeOf(name, group, def), tier: tierOf(name), group, default: def };
  if (ROLES[name]) entry.facetRole = ROLES[name];
  return entry;
});

/** An opaque colour: a translucent one laid over the page of the same mode, as the browser composites it. */
function opaque(color, m) {
  const { rgb, alpha } = parse(color);
  if (alpha >= 1) return format(rgb);
  const bg = parse(resolve('var(--fd-bg)', m)).rgb;
  return format(rgb.map((c, i) => c * alpha + bg[i] * (1 - alpha)));
}
const roles = {};
for (const [name, role] of Object.entries(ROLES)) {
  roles[role] = { token: name, light: opaque(resolve(TABLE.get(name), 0), 0), dark: opaque(resolve(TABLE.get(name), 1), 1) };
  if (name === '--fd-text-3') roles[role].over = '--fd-bg';
}

const contract = {
  contract: CONTRACT,
  description: 'Every global Fire token with its type, tier, group, Ember default and Facet role. GENERATED by scripts/build-contract.mjs from fire/tokens.css, fire/typefaces.css and fire/js/theme.js; do not edit by hand.',
  tiers: {
    input: 'Set by a theme record (contract/theme.schema.json): the palette colour inputs, the three font families and the dial variables.',
    scale: 'A step of a scale: its value may change, but steps are not added or renamed.',
    derived: 'Computed by Fire from the palette; never authored.',
  },
  tokens,
  breakpoints: {
    description: 'Named widths in px. Fire measures them on a container where it can (the app shell, the docs kit, a .fd-site), else on the viewport. min is inclusive; max is the last width the name covers.',
    phone: { max: 639.98 },
    tablet: { min: 640, max: 899.98 },
    desktop: { min: 900 },
    wide: { min: 1200 },
  },
  facet: {
    description: 'Facet colour roles: each role, the token that fills it, and Ember\'s opaque value in each mode (muted is --fd-text-3 laid over --fd-bg). Facet\'s accent role is left to Facet.',
    roles,
  },
};

const outputs = new Map();
outputs.set('contract/fire-contract.json', `${JSON.stringify(contract, null, 2)}\n`);
for (const p of PALETTES) {
  const record = toThemeRecord({ palette: p.name });
  const { ok, errors } = validateTheme(record);
  if (!ok) throw new Error(`looks/${p.name}.json: ${errors.join('; ')}`);
  outputs.set(`contract/looks/${p.name}.json`, `${JSON.stringify(record, null, 2)}\n`);
}

/* ---------- The named looks ---------- */
const LOOK_ORDER = ['steady', 'operator', 'folio', 'hearth', 'instrument', 'marquee', 'gentle', 'clear'];
const NAMED_DIR = path.join(ROOT, 'contract/looks/named');
const namedFiles = fs.readdirSync(NAMED_DIR).filter((f) => f.endsWith('.json')).sort();
if (JSON.stringify(namedFiles) !== JSON.stringify([...LOOK_ORDER].sort().map((n) => `${n}.json`))) {
  throw new Error(`contract/looks/named: expected ${LOOK_ORDER.map((n) => `${n}.json`).join(', ')}; found ${namedFiles.join(', ')}`);
}
const looks = LOOK_ORDER.map((name) => {
  const file = `contract/looks/named/${name}.json`;
  const look = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const keys = Object.keys(look).sort().join(',');
  if (keys !== 'label,name,note,record') throw new Error(`${file}: want exactly { name, label, note, record }, got ${keys}`);
  if (look.name !== name) throw new Error(`${file}: name must be "${name}"`);
  if (!/^[A-Z][a-z]+$/.test(look.label)) throw new Error(`${file}: label must be one capitalised word`);
  if (typeof look.note !== 'string' || !/^[A-Z].*\.$/.test(look.note) || look.note.split(/(?<=\.)\s/).length !== 1) throw new Error(`${file}: note must be one sentence`);
  const { ok, errors } = validateTheme(look.record);
  if (!ok) throw new Error(`${file}: ${errors.join('; ')}`);
  // The panel holds it whole (named palette and type set), and the record round-trips through the panel's state.
  const state = fromThemeRecord(look.record);
  const back = toThemeRecord(state);
  const full = { ...back, signature: back.signature ?? state.signature };
  if (JSON.stringify(full) !== JSON.stringify(look.record)) throw new Error(`${file}: write the record in full, as Copy theme does:\n${JSON.stringify(full, null, 2)}`);
  // What ?look= puts on <html>: every attribute the panel would set (the palette and type set always, so a page's
  // own replaces nothing), and the custom properties (a toned palette's colours, the dial variables).
  const { tokens, attributes } = expandTheme(look.record);
  const attrs = { 'data-palette': state.palette, 'data-type': state.type, ...attributes };
  const props = Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, Array.isArray(v) ? cssValue(v) : v]));
  // The swatch: page, ink and accent of the palette as the look tones it.
  const t = toneTokens(paletteTokens(state.palette, { contrast: state.contrast }), state.tone);
  const swatch = { bg: cssValue(t['--fd-bg']), ink: cssValue(t['--fd-ink']), accent: cssValue(t['--fd-accent']) };
  return { name, label: look.label, note: look.note, record: look.record, state, swatch, attributes: attrs, props };
});
const looksJs = [
  '/* Fire looks — the named looks: complete theme records, each a far-apart starting point.',
  ' * GENERATED by scripts/build-contract.mjs from contract/looks/named/*.json; do not edit by hand.',
  ' *',
  ' * LOOKS        [{ name, label, note, record, state, swatch, attributes, props }] in display order',
  ' *   record     the theme record (fire/js/theme.js), as Copy theme writes it',
  ' *   state      the Tweaks state it describes (fromThemeRecord(record)): tweaks.set(state) applies it',
  ' *   swatch     { bg, ink, accent } as CSS values (light-dark() pairs): the palette as the look tones it',
  ' *   attributes the attributes the look puts on <html> (fire/boot.js does the same for ?look=<name>)',
  ' *   props      the custom properties it writes on <html> (a toned palette, the dial variables)',
  ' * getLook(name) → the look, or undefined',
  ' */',
  `export const LOOKS = Object.freeze(${JSON.stringify(looks, null, 2)});`,
  'export const LOOK_NAMES = Object.freeze(LOOKS.map((l) => l.name));',
  'export const getLook = (name) => LOOKS.find((l) => l.name === name);',
  '',
].join('\n');
outputs.set('fire/js/looks.js', looksJs);
// fire/boot.js: the block between the markers.
const BOOT = fs.readFileSync(path.join(ROOT, 'fire/boot.js'), 'utf8');
const BEGIN = '/* looks:begin (GENERATED by scripts/build-contract.mjs from contract/looks/named) */';
const END = '/* looks:end */';
const at = BOOT.indexOf(BEGIN);
const until = BOOT.indexOf(END);
if (at < 0 || until < at) throw new Error('fire/boot.js: the looks:begin / looks:end markers are missing');
const table = Object.fromEntries(looks.map((l) => [l.name, { a: l.attributes, p: l.props }]));
outputs.set('fire/boot.js', `${BOOT.slice(0, at)}${BEGIN}\n    var LOOKS = ${JSON.stringify(table)};\n    ${BOOT.slice(until)}`);

if (CHECK) {
  const stale = [];
  for (const [rel, text] of outputs) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) stale.push(rel);
  }
  if (stale.length) {
    console.error(`stale: ${stale.join(', ')}\nrun node scripts/build-contract.mjs`);
    process.exitCode = 1;
  } else {
    console.log(`ok: contract/fire-contract.json (${tokens.length} tokens), ${PALETTES.length} palette looks and ${looks.length} named looks (fire/js/looks.js, fire/boot.js) are current.`);
  }
} else {
  fs.mkdirSync(path.join(ROOT, 'contract/looks'), { recursive: true });
  for (const [rel, text] of outputs) fs.writeFileSync(path.join(ROOT, rel), text);
  const count = (tier) => tokens.filter((t) => t.tier === tier).length;
  console.log(`wrote contract/fire-contract.json (${tokens.length} tokens: ${count('input')} input, ${count('scale')} scale, ${count('derived')} derived), ${PALETTES.length} palette looks and ${looks.length} named looks`);
}
