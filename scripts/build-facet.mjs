#!/usr/bin/env node
// Writes facet/: Fire as a Facet design system (ARCHITECTURE.md sections 4 and 8).
//   node scripts/build-facet.mjs           write the files
//   node scripts/build-facet.mjs --check   write nothing; exit 1 when a committed file differs from a fresh build
//   --out <dir>                             write to (or check) <dir> instead of facet/ (used by the tests)
//
// Two variants, and the build writes the richest the installed Facet accepts. It probes with Facet's own checker
// (`node <cli.js> system check <file>`, read-only; the path is $FACET_CLI, else ../design-kit/dist/cli.js, else the old vendored ../codecrystal/vendor/facet/dist/cli.js):
//   full      all components with full cards, a top-level `contract` field holding facet/theme.json exactly, and every token
//             Facet's 0.6.2 schema takes (extra colour roles, 16 type steps in rem with numeric figures, 5-layer light and dark shadows, all sizes)
//   fallback  100 components chosen by the curated rule, cut to the richest detail level that fits 128 KiB, no `contract`
// With no CLI found the fallback is written and said so. The variant and the Facet build that validated it go in
// extras.json ("facet") and README.md. With --check and no CLI, the variant recorded in extras.json is rebuilt.
//
// Reads contract/fire-contract.json, contract/catalog.json (with its cards), contract/theme.schema.json,
// fire/js/theme.js, WRITING.md, templates/*.html, the CSS under fire/ and the files listed in extras.json.
// Writes
//   facet/content.json  Fire's default look (Ember, Geist) as a Facet DesignSystemContent
//   facet/extras.json   the files Facet carries beside the generated ones, with size and SHA-256, and the token aliases
//   facet/theme.json    the theme record the content was generated from (the default record)
//   facet/README.md     how Facet consumes these, the excluded components and every place Fire did not fit Facet
// Deterministic: no clock, no randomness, sorted traversal. The rules the content must meet are Facet's
// (vendor/facet/src/system/models.ts and validation.ts); scripts/test/facet.test.mjs checks them.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const OUT_I = process.argv.indexOf('--out');
const OUT = OUT_I > 0 ? path.resolve(process.argv[OUT_I + 1]) : path.join(ROOT, 'facet');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const { DEFAULT_RECORD, FIRE_VERSION, validateTheme } = await import(pathToFileURL(path.join(ROOT, 'fire/js/theme.js')).href);

const contract = json('contract/fire-contract.json');
const catalog = json('contract/catalog.json');
const TOKEN = new Map(contract.tokens.map((t) => [t.name, t]));
const tok = (name) => { const t = TOKEN.get(name); if (!t) throw new Error(`fire-contract.json has no ${name}`); return t; };
const DARK = 'org.codecrystal.dark';

/* ==========================================================================
   Colour maths: WCAG 2.2 contrast, alpha over a page colour, hex with alpha
   ========================================================================== */
const h2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
function parseColor(v) {
  v = String(v).trim();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (m) {
    const d = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
    return { r: parseInt(d.slice(0, 2), 16), g: parseInt(d.slice(2, 4), 16), b: parseInt(d.slice(4, 6), 16), a: 1 };
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[\/,]\s*([\d.]+))?\s*\)$/.exec(v);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  throw new Error(`cannot parse colour ${v}`);
}
const hex = ({ r, g, b }) => `#${h2(r)}${h2(g)}${h2(b)}`;
const hexA = (c) => (c.a >= 1 ? hex(c) : `${hex(c)}${h2(c.a * 255)}`);
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => { const [x, y] = [lum(parseColor(a)), lum(parseColor(b))]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const pair = (t) => (t.default && typeof t.default === 'object' ? t.default : { light: t.default, dark: t.default });
const pagePair = () => pair(tok('--fd-bg'));
const surfacePair = () => pair(tok('--fd-surface'));
const opaquePair = (t, base) => {
  const p = pair(t);
  return { light: hex(over(parseColor(p.light), parseColor(base.light))), dark: hex(over(parseColor(p.dark), parseColor(base.dark))) };
};

/* ==========================================================================
   Dimensions and names
   ========================================================================== */
// Facet's dimension: rem takes four decimals, px and em three. The fallback (the 0.6.1 Facet) takes three for all.
const DIM = /^(0|-?(\d{1,4}(\.\d{1,4})?rem|\d{1,4}(\.\d{1,3})?(px|em)))$/;
const DIM_FALLBACK = /^(0|-?\d{1,4}(\.\d{1,3})?(px|rem|em))$/;
const fmt = (n) => String(Math.round(n * 1000) / 1000);
function dim(v, full = false) {
  v = String(v).trim();
  if ((full ? DIM : DIM_FALLBACK).test(v)) return v;
  const m = /^(-?[\d.]+)(px|rem|em)$/.exec(v);
  if (!m) throw new Error(`not a Facet dimension: ${v}`);
  const px = m[2] === 'px' ? +m[1] : +m[1] * 16;
  return `${fmt(px)}px`;
}
const pxOf = (v) => (v === '0' ? 0 : /rem|em$/.test(v) ? parseFloat(v) * 16 : parseFloat(v));
const strip = (name) => name.replace(/^--fd-/, '');
const pascal = (id) => id.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
const ratio3 = (n) => Math.round(n * 1000) / 1000;
const cut = (s, n) => {
  s = String(s).replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const c = s.slice(0, n - 1);
  return c.slice(0, Math.max(c.lastIndexOf(' '), n >> 1)).replace(/[\s,;:.]+$/, '') + '…';
};
const sentence = (s) => { s = String(s).trim(); return /[.!?]$/.test(s) ? s : s + '.'; };

const roleSpec = contract.facet.roles;
const group = (g, exclude = []) => contract.tokens.filter((t) => t.group === g && !exclude.includes(t.name));
const val = (name) => String(tok(name).default);

// The CSS the build reads: component states, the file a component lives in, and how often a token is used.
const cssFiles = [
  ...['tokens', 'palettes', 'typefaces', 'base', 'layout'].map((n) => `fire/${n}.css`),
  ...fs.readdirSync(path.join(ROOT, 'fire/components')).filter((f) => f.endsWith('.css')).sort().map((f) => `fire/components/${f}`),
];
const cssText = new Map(cssFiles.map((f) => [f, read(f).replace(/\/\*[\s\S]*?\*\//g, '')]));
const allCss = [...cssText.values()].join('\n');
const useCount = (name) => (allCss.match(new RegExp(`var\\(${name}(?![\\w-])`, 'g')) || []).length;

// Shadows: layers split on top-level commas.
function splitTop(s) {
  const out = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++; if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}
function layerOf(s) {
  const inset = /^inset\s+/.test(s);
  s = s.replace(/^inset\s+/, '');
  const m = /^(.*?)\s*(rgba?\([^)]*\))$/.exec(s);
  const nums = m[1].trim().split(/\s+/);
  if (nums.length < 3) throw new Error(`shadow layer ${s}`);
  const [x, y, blur, spread = '0'] = nums;
  return { inset, x, y, blur, spread, color: parseColor(m[2]) };
}
// The fallback variant only: more than four layers, merge the last two layers of the same kind and colour into one
// (the smaller offset, blur and spread of the two, the alpha of their composition: 1 - (1 - a)(1 - b)).
function fold(layers) {
  const notes = [];
  while (layers.length > 4) {
    const b = layers.pop(), a = layers.pop();
    if (a.inset !== b.inset || hex(a.color) !== hex(b.color)) throw new Error('cannot fold shadow layers of different kinds');
    const alpha = 1 - (1 - a.color.a) * (1 - b.color.a);
    notes.push(`${a.x} ${a.y} ${a.blur} + ${b.x} ${b.y} ${b.blur}`);
    layers.push({ ...a, x: b.x, y: b.y, blur: b.blur, spread: b.spread, color: { ...a.color, a: alpha } });
  }
  return notes;
}

const ROLE_ORDER_FALLBACK = ['background', 'surface', 'text', 'muted', 'primary', 'on-primary', 'accent', 'border', 'success', 'warning', 'danger', 'focus', 'info', 'link'];
const ROLE_ORDER_FULL = ['background', 'surface', 'raised', 'sunken', 'text', 'muted', 'primary', 'on-primary', 'accent', 'border', 'success', 'on-success', 'warning', 'on-warning', 'danger', 'on-danger', 'focus', 'info', 'on-info', 'link'];
const TONES = ['success', 'warning', 'danger', 'info'];
const MAX_SIZES_FALLBACK = 12;

/* ==========================================================================
   The tokens, pairings and notes of one variant. `full` uses everything Facet's schema now accepts: the extra roles,
   all 16 type steps with Fire's rem line heights and rem sizes, tabular figures, every size, and every shadow layer
   in both themes. The fallback is what the 0.6.1 Facet accepted.
   ========================================================================== */
function tokenSet(full) {
  const ALIASES = {};
  const alias = (facetVar, fireToken) => { ALIASES[facetVar] = fireToken; };
  const d = (v) => dim(v, full);

  /* ---- tokens.color: roles ---- */
  const color = {};
  const colorRole = (role, light, dark, description) => {
    color[role] = { $type: 'color', $value: light, $description: description, $extensions: { [DARK]: dark } };
  };
  const describe = {
    background: 'Fire --fd-bg: the page.', surface: 'Fire --fd-surface: cards, panels and inputs.',
    raised: 'Fire --fd-surface-raised: a surface above a card (popovers, menus).', sunken: 'Fire --fd-bg-sunken: a recessed area below the page (wells, code blocks).',
    text: 'Fire --fd-ink: body text and headings.',
    muted: 'Fire --fd-text-3 (an alpha token) laid over --fd-bg, so the value is opaque.',
    primary: 'Fire --fd-accent: the accent fill (Ember orange).',
    'on-primary': 'Fire --fd-accent-contrast: the label on the accent fill.',
    border: 'Fire --fd-line: hairlines and dividers.', focus: 'Fire --fd-focus: the focus ring colour.',
    link: 'Fire --fd-accent-text: accent text on the page, darkened to pass 4.5:1.',
    success: 'Fire --fd-success-fill.', warning: 'Fire --fd-warning-fill.', danger: 'Fire --fd-danger-fill.', info: 'Fire --fd-info-fill.',
    'on-success': 'Fire --fd-success-contrast: the label on the success fill.', 'on-warning': 'Fire --fd-warning-contrast: the label on the warning fill.',
    'on-danger': 'Fire --fd-danger-contrast: the label on the danger fill.', 'on-info': 'Fire --fd-info-contrast: the label on the info fill.',
  };
  for (const role of ['background', 'surface', 'text', 'muted', 'primary', 'on-primary']) {
    const r = roleSpec[role];
    colorRole(role, r.light, r.dark, describe[role]);
    alias(`--color-${role}`, r.token);
  }
  // Facet's accent role has no Fire counterpart (Fire has one accent): it repeats the primary and Facet may change it.
  colorRole('accent', roleSpec.primary.light, roleSpec.primary.dark, 'Fire has one accent, so this repeats primary; Facet may set another.');
  for (const role of ['border', 'success', 'warning', 'danger', 'focus', 'info', 'link']) {
    const r = roleSpec[role];
    colorRole(role, r.light, r.dark, describe[role]);
    alias(`--color-${role}`, r.token);
  }
  const roleTokens = {};
  if (full) {
    for (const [role, token] of [['raised', '--fd-surface-raised'], ['sunken', '--fd-bg-sunken']]) {
      const p = pair(tok(token));
      colorRole(role, hex(parseColor(p.light)), hex(parseColor(p.dark)), describe[role]);
      alias(`--color-${role}`, token); roleTokens[role] = token;
    }
    for (const tone of TONES) {
      const r = roleSpec[`on-${tone}`];
      colorRole(`on-${tone}`, r.light, r.dark, describe[`on-${tone}`]);
      alias(`--color-on-${tone}`, r.token);
    }
  }
  const ROLE_ORDER = full ? ROLE_ORDER_FULL : ROLE_ORDER_FALLBACK;
  const colorOrdered = Object.fromEntries(ROLE_ORDER.map((r) => [r, color[r]]));
  // The roles Fire's contract fills that this variant has no role for.
  const DROPPED_ROLES = Object.keys(roleSpec).filter((r) => !ROLE_ORDER.includes(r)).sort();

  /* ---- tokens.palette ---- */
  const PALETTE_TOKENS = [
    ...contract.tokens.filter((t) => t.group === 'palette').map((t) => t.name),
    ...['success', 'warning', 'danger', 'info', 'violet'].flatMap((t) => ['solid', 'text', 'bg', 'line'].map((k) => `--fd-${t}-${k}`)),
    ...['--fd-chart-2', '--fd-chart-3', '--fd-chart-4', '--fd-chart-5', '--fd-chart-6'],
    ...contract.tokens.filter((t) => t.group === 'syntax').map((t) => t.name),
    ...contract.tokens.filter((t) => t.group === 'accent-wash').map((t) => t.name),
    '--fd-text-2', '--fd-text-4', '--fd-text-5', '--fd-fill', '--fd-fill-hover', '--fd-fill-active',
  ];
  const palette = {};
  for (const name of [...new Set(PALETTE_TOKENS)]) {
    const t = tok(name);
    const p = pair(t);
    const l = hexA(parseColor(p.light)), dk = hexA(parseColor(p.dark));
    palette[strip(name)] = { $type: 'color', $value: l, ...(l === dk ? {} : { $extensions: { [DARK]: dk } }) };
    alias(`--palette-${strip(name)}`, name);
  }

  /* ---- tokens.font, typography ---- */
  const families = (name) => tok(name).default.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
  const font = { family: {
    body: { $type: 'fontFamily', $value: families('--fd-font-sans') },
    display: { $type: 'fontFamily', $value: families('--fd-font-display') },
    mono: { $type: 'fontFamily', $value: families('--fd-font-mono') },
  } };
  // Fire sets no figure style on the page: proportional is the default, and tabular figures are asked for per use
  // (.fd-stat and .fd-num, the numeric columns of tables and charts).
  if (full) font.numeric = 'proportional';
  alias('--font-body', '--fd-font-sans'); alias('--font-display', '--fd-font-display'); alias('--font-mono', '--fd-font-mono');

  const weight = (n) => Number(val(`--fd-weight-${n}`));
  // step → [size token, line-height token, letter-spacing token | null, weight, family, numeric]
  const TYPE = {
    display: ['display', 'display', 'display', 'display', 'display'],
    '3xl': ['3xl', '3xl', null, 'display', 'display'],
    h1: ['h1', 'h1', 'h1', 'display', 'display'],
    h2: ['h2', 'h2', 'h2', 'display', 'display'],
    h3: ['h3', 'h3', 'h3', 'label', 'display'],
    xl: ['xl', 'xl', null, 'regular', 'body'],
    title: ['title', 'title', 'title', 'label', 'body'],
    lg: ['lg', 'lg', 'lg', 'regular', 'body'],
    md: ['md', 'md', null, 'regular', 'body'],
    sm: ['sm', 'sm', null, 'regular', 'body'],
    xs: ['xs', 'xs', null, 'regular', 'body'],
    '2xs': ['2xs', '2xs', null, 'regular', 'body'],
    '3xs': ['3xs', '2xs', null, 'regular', 'body'],
    stat: ['stat', 'stat', 'stat', 'medium', 'body', 'tabular'],
  };
  // The two sizes the fallback leaves out. Fire sets no line height for either; its CSS pairs the composer size
  // with --fd-lh-lg (agent.css) and the smallest with --fd-lh-2xs.
  const TYPE_FULL_ONLY = { compose: ['compose', 'lg', null, 'regular', 'body'], '4xs': ['4xs', '2xs', null, 'regular', 'body'] };
  const typeSteps = full ? { ...TYPE, ...TYPE_FULL_ONLY } : TYPE;
  const typography = {};
  for (const [step, [size, lh, ls, w, fam, numeric]] of Object.entries(typeSteps)) {
    const fs_ = d(val(`--fd-text-${size}`));
    const lhTok = val(`--fd-lh-${lh}`);
    typography[step] = {
      $type: 'typography',
      $value: {
        fontFamily: `{font.family.${fam}}`, fontSize: fs_,
        lineHeight: full ? lhTok : ratio3(pxOf(dim(lhTok)) / pxOf(fs_)),
        fontWeight: weight(w), letterSpacing: ls ? d(val(`--fd-ls-${ls}`)) : '0',
        ...(full && numeric ? { numeric } : {}),
      },
    };
    alias(`--typography-${step}`, `--fd-text-${size}`);
  }
  const TYPE_DROPPED = full ? [] : ['--fd-text-compose (15px, the composer input)', '--fd-text-4xs (9px)'];

  /* ---- space, radius, shadow, breakpoint, motion, layers, icons, sizes, focus, state ---- */
  const space = {}, radius = {};
  for (const t of group('space')) { const n = strip(t.name).replace(/^space-/, ''); space[n] = { $type: 'dimension', $value: d(t.default) }; alias(`--space-${n}`, t.name); }
  for (const t of group('radius')) { const n = strip(t.name).replace(/^radius-/, ''); radius[n] = { $type: 'dimension', $value: d(t.default) }; alias(`--radius-${n}`, t.name); }

  const shadow = {};
  const SHADOW_FOLDED = [];
  const layerJson = (l) => ({ color: hexA(l.color), offsetX: d(l.x), offsetY: d(l.y), blur: d(l.blur), spread: d(l.spread), inset: l.inset });
  for (const t of group('shadow')) {
    const n = strip(t.name).replace(/^shadow-/, '');
    const p = pair(t);
    const light = splitTop(p.light).map(layerOf);
    if (full) {
      const dark = splitTop(p.dark).map(layerOf);
      if (Math.max(light.length, dark.length) > 5) throw new Error(`${t.name} has more than 5 layers`);
      const same = JSON.stringify(light.map(layerJson)) === JSON.stringify(dark.map(layerJson));
      shadow[n] = { $type: 'shadow', $value: light.map(layerJson), ...(same ? {} : { $extensions: { [DARK]: dark.map(layerJson) } }) };
    } else {
      const was = light.length;
      if (fold(light).length) SHADOW_FOLDED.push(`${t.name} (${was} layers to 4)`);
      shadow[n] = { $type: 'shadow', $value: light.map(layerJson) };
    }
    alias(`--shadow-${n}`, t.name);
  }

  const breakpoint = { tablet: { $type: 'dimension', $value: '641px' }, desktop: { $type: 'dimension', $value: '900px' } };

  const ms = (v) => { const m = /^([\d.]+)(ms|s)$/.exec(v); return `${Math.round(m[2] === 's' ? m[1] * 1000 : +m[1])}ms`; };
  const duration = {};
  for (const n of ['1', '2', '3', '4', '5']) { duration[n] = { $type: 'duration', $value: ms(val(`--fd-dur-${n}`)) }; alias(`--duration-${n}`, `--fd-dur-${n}`); }
  duration.stagger = { $type: 'duration', $value: ms(val('--fd-stagger')) }; alias('--duration-stagger', '--fd-stagger');
  const easing = {};
  for (const n of ['out', 'in-out', 'in', 'emphasized', 'spring']) {
    const m = /cubic-bezier\(([^)]*)\)/.exec(val(`--fd-ease-${n}`));
    easing[n] = { $type: 'cubicBezier', $value: m[1].split(',').map(Number) };
    alias(`--easing-${n}`, `--fd-ease-${n}`);
  }
  const zIndex = {};
  for (const t of group('layer')) { const n = strip(t.name).replace(/^z-/, ''); zIndex[n] = { $type: 'number', $value: Number(t.default) }; alias(`--z-index-${n}`, t.name); }
  const iconSize = {};
  for (const [n, name] of [['xs', '--fd-icon-xs'], ['sm', '--fd-icon-sm'], ['md', '--fd-icon'], ['lg', '--fd-icon-lg'], ['xl', '--fd-icon-xl']]) {
    iconSize[n] = { $type: 'dimension', $value: d(val(name)) }; alias(`--icon-size-${n}`, name);
  }

  // size: the fallback keeps the touch target plus the 11 most referenced pixel sizes (Facet allowed 12); the full
  // variant keeps every pixel size (Facet allows 48).
  const SIZE_CANDIDATES = group('size').filter((t) => t.type === 'dimension' && /px$/.test(t.default) && !/^--fd-icon/.test(t.name)).map((t) => ({ name: t.name, uses: useCount(t.name) }));
  SIZE_CANDIDATES.sort((a, b) => b.uses - a.uses || (a.name < b.name ? -1 : 1));
  const SIZE_KEPT = full ? SIZE_CANDIDATES : SIZE_CANDIDATES.slice(0, MAX_SIZES_FALLBACK - 1);
  const SIZE_DROPPED = full ? [] : SIZE_CANDIDATES.slice(MAX_SIZES_FALLBACK - 1);
  const size = { touch: { $type: 'dimension', $value: '40px', $description: 'The default control on a coarse pointer (Fire grows --fd-control-md to 40px there).' } };
  for (const c of [...SIZE_KEPT].sort((a, b) => (a.name < b.name ? -1 : 1))) {
    size[strip(c.name)] = { $type: 'dimension', $value: d(val(c.name)) };
    alias(`--size-${strip(c.name)}`, c.name);
  }

  const focusRing = {
    width: { $type: 'dimension', $value: '2px' }, offset: { $type: 'dimension', $value: '2px' },
    style: { $type: 'strokeStyle', $value: 'solid' }, color: { $type: 'color', $value: '{color.focus}' },
  };

  // state: Fire's hover, selected and disabled washes laid over the surface (Facet needs opaque-looking colours per role).
  const surf = pair(tok('--fd-surface'));
  const washOn = (name) => opaquePair(tok(name), surf);
  const hoverPrimary = pair(tok('--fd-accent-hover'));
  const stateTokens = {
    hover: {
      primary: { $type: 'color', $value: hoverPrimary.light, $extensions: { [DARK]: hoverPrimary.dark } },
      surface: { $type: 'color', $value: washOn('--fd-fill-hover').light, $extensions: { [DARK]: washOn('--fd-fill-hover').dark } },
    },
    selected: { surface: { $type: 'color', $value: washOn('--fd-accent-12').light, $extensions: { [DARK]: washOn('--fd-accent-12').dark } } },
    disabled: { surface: { $type: 'color', $value: washOn('--fd-fill-disabled').light, $extensions: { [DARK]: washOn('--fd-fill-disabled').dark } } },
  };

  /* ---- pairings: the required five, link on background, the new roles' text pairings, and extras that pass in both modes ---- */
  const roleVal = (role, mode) => (mode === 'light' ? color[role].$value : color[role].$extensions[DARK]);
  const need = { text: 4.5, large_text: 3, ui: 3 };
  const passes = (f, b, u) => ['light', 'dark'].every((m) => contrast(roleVal(f, m), roleVal(b, m)) >= need[u]);
  const REQUIRED = [['text', 'background', 'text'], ['text', 'surface', 'text'], ['muted', 'background', 'text'], ['on-primary', 'primary', 'text'], ['focus', 'background', 'ui'], ['link', 'background', 'text'],
    ...(full ? [['text', 'raised', 'text'], ['text', 'sunken', 'text'], ...TONES.map((t) => [`on-${t}`, t, 'text'])] : [])];
  const EXTRA = [['muted', 'surface', 'text'], ['link', 'surface', 'text'], ['primary', 'background', 'ui'], ['danger', 'background', 'ui'], ['info', 'background', 'ui'], ['success', 'background', 'ui'], ['warning', 'background', 'ui'], ['border', 'background', 'ui'], ['primary', 'surface', 'ui']];
  for (const [f, b, u] of REQUIRED) if (!passes(f, b, u)) throw new Error(`required pairing ${f} on ${b} (${u}) fails WCAG AA in a mode`);
  const PAIR_DROPPED = EXTRA.filter(([f, b, u]) => !passes(f, b, u));
  const pairings = [...REQUIRED, ...EXTRA.filter(([f, b, u]) => passes(f, b, u))].map(([foreground, background, usage]) => ({ foreground, background, usage }));

  const roleMap = Object.fromEntries(ROLE_ORDER.filter((r) => roleSpec[r] || roleTokens[r]).map((r) => [r, roleSpec[r] ? roleSpec[r].token : roleTokens[r]]));
  return {
    full, ALIASES, ROLE_ORDER, colorOrdered, DROPPED_ROLES, palette, font, typography, TYPE_DROPPED, space, radius, shadow, SHADOW_FOLDED,
    breakpoint, duration, easing, zIndex, iconSize, size, SIZE_CANDIDATES, SIZE_KEPT, SIZE_DROPPED, focusRing, stateTokens, pairings, PAIR_DROPPED, roleMap,
  };
}

/* ==========================================================================
   Voice (WRITING.md sections 1, 6 and 7)
   ========================================================================== */
const voice = {
  tone: 'Plain, specific, direct, calm and honest. The screen is the explanation and words fill only the gaps. Second person, active voice, present tense. Developers think in endpoints, keys, credits and requests: use those words, with identifiers in mono. No exclamation marks, no "Oops", no padding "please" or "sorry".',
  do: [
    'Name tasks by what the person does and places by what they are: "Scrape a page", "API keys".',
    'Give every button a verb or a verb and its object ("Create key", "Export CSV"); the primary button in a dialog repeats the dialog title\'s verb.',
    'Replace adjectives with facts: numbers, names, dates ("about 2 seconds", "Nov 23", "1,520 credits").',
    'Say each thing once: if the title says "API keys", the description does not begin "API keys are".',
    'Write errors as what happened, then what to do: "Couldn\'t reach docs.example.com. Check the URL, or try again in a minute."',
    'Write empty states as a short title, one sentence saying what will appear, and one action.',
    'Use sentence case; titles, labels and buttons have no full stop, descriptions and errors do.',
    'Set identifiers (keys, IDs, paths, endpoints, file names) in mono and never reword them.',
    'Confirm only what cannot be undone or costs money; otherwise act and offer Undo.',
    'Name one thing one way across the interface, the docs and the API (Create, Add, Remove, Delete, Revoke).',
  ],
  dont: [
    'Do not write "OK", "Submit", "Yes", "Click here" or a bare "Continue" on a button.',
    'Do not use simply, just, easily, quickly, successfully, basically, actually or very.',
    'Do not restate the title, the label or the value in a description or hint.',
    'Do not blame the person ("You entered an invalid URL") or show a raw status code as the whole error.',
    'Do not put anything a person must read to finish the task in a tooltip.',
    'Do not list the allowed answers in a hint under a text box: the control is wrong, use a select, segmented control or switch.',
    'Do not describe emptiness ("There is nothing here") or apologise in an empty state.',
    'Do not stack callouts: one that interrupts is useful, three mean none matter.',
    'Do not invent product names for ordinary things.',
  ],
};

/* ==========================================================================
   Components
   ========================================================================== */
// Which components to carry (Facet caps a system at 100). A designer building a board needs the foundations first,
// so the families below are always carried. Specialised parts that only make sense inside Fire's own docs site,
// chat, agent playground or Tweaks panel are left out first. Any remaining slots go by the number of
// templates/*.html that use one of a component's classes (most first), then id.
const PROTECTED_FAMILIES = new Set(['Layout', 'Forms', 'Buttons', 'Base', 'Navigation', 'Overlays', 'Data', 'Charts']);
const LEAVE_OUT_FIRST = new Set([
  // Fire's documentation site
  'doc', 'doc-endpoint', 'doc-setup', 'doc-ask', 'doc-cards', 'doc-changelog', 'doc-frame',
  // chat widget internals and the review-only Tweaks panel
  'chat', 'chat-launcher', 'chat-message', 'chat-lightbox', 'tweaks',
  // agent playground pieces (the composer, message, thread, tool call, reasoning and sources stay)
  'agent', 'playground', 'result', 'session-list', 'suggestions', 'use-agent',
  // narrow content and code pieces
  'qr', 'verified', 'announce', 'pagebar', 'endpoint', 'schema', 'viewswitch',
]);
const templateFiles = fs.readdirSync(path.join(ROOT, 'templates')).filter((f) => f.endsWith('.html')).sort();
const usage = new Map(catalog.components.map((c) => [c.id, 0]));
for (const f of templateFiles) {
  const seen = new Set();
  for (const m of read(`templates/${f}`).matchAll(/\bfd-[a-z0-9-]+/g)) { const id = catalog.classes[m[0]]; if (id) seen.add(id); }
  for (const id of seen) usage.set(id, usage.get(id) + 1);
}
const tier = (c) => (PROTECTED_FAMILIES.has(c.family) ? 0 : LEAVE_OUT_FIRST.has(c.id) ? 2 : 1);
const ranked = [...catalog.components].sort((a, b) =>
  tier(a) - tier(b) || usage.get(b.id) - usage.get(a.id) || (a.id < b.id ? -1 : 1));
const MAX_COMPONENTS = 100; // what Facet accepted when this rule was written; the full variant lifts it
if (ranked.slice(0, MAX_COMPONENTS).filter((c) => tier(c) === 0).length !== catalog.components.filter((c) => tier(c) === 0).length) {
  throw new Error('build-facet: the protected families alone exceed the component cap');
}
const byId = new Map(catalog.components.map((c) => [c.id, c]));

// States from the CSS: a state selector (:disabled, [aria-invalid], :hover, ...) in a compound that carries the
// component's class gives that component the state.
function rulesOf(css) {
  const out = []; const stack = []; let buf = '';
  for (const ch of css) {
    if (ch === '{') { stack.push(buf.trim().replace(/\s+/g, ' ')); buf = ''; }
    else if (ch === '}') { if (stack.length) out.push(stack.pop()); buf = ''; }
    else if (ch === ';') buf = '';
    else buf += ch;
  }
  return out;
}
const STATE_SELECTORS = [
  ['disabled', /:disabled|\[disabled\]|\[aria-disabled=["']?true/], ['error', /\[aria-invalid|:user-invalid|:invalid|\[data-invalid|\[data-error/],
  ['loading', /\[aria-busy|\[data-loading|\[data-state=["']?loading/], ['hover', /:hover/], ['focus', /:focus/],
  ['pressed', /\[aria-pressed=["']?true|:active/], ['selected', /:checked|\[aria-selected=["']?true|\[aria-current/], ['open', /\[open\]|\[aria-expanded=["']?true|\[data-state=["']?open/],
];
const cssStates = new Map(); // component id → Set of states
const cssFileOf = new Map(); // component id → the file with the most selectors on its root class
const cssFileCount = new Map();
for (const [file, text] of cssText) {
  for (const prelude of rulesOf(text)) {
    if (prelude.startsWith('@')) continue;
    for (const selector of prelude.split(',')) {
      for (const compound of selector.trim().split(/\s*[>+~]\s*|\s+/)) {
        const classes = [...compound.matchAll(/\.(fd-[a-z0-9-]+)/g)].map((m) => catalog.classes[m[1]]).filter(Boolean);
        for (const id of classes) {
          const c = byId.get(id);
          if (c && compound.includes(`.${c.root}`)) { const k = `${id}\0${file}`; cssFileCount.set(k, (cssFileCount.get(k) || 0) + 1); }
          for (const [state, re] of STATE_SELECTORS) if (re.test(compound)) { if (!cssStates.has(id)) cssStates.set(id, new Set()); cssStates.get(id).add(state); }
        }
      }
    }
  }
}
for (const [k, n] of cssFileCount) {
  const [id, file] = k.split('\0');
  const best = cssFileOf.get(id);
  if (!best || n > cssFileCount.get(`${id}\0${best}`)) cssFileOf.set(id, file);
}
// Facet's state vocabulary for Fire's: card state names map by pattern; a name no pattern takes is dropped.
const STATE_MAP = [
  [/load|busy|pending|progress/, 'loading'], [/disab|readonly|read-only/, 'disabled'], [/error|invalid|fail|danger/, 'error'], [/empty/, 'empty'],
  [/held|press|active/, 'pressed'], [/select|check|current|\bon\b/, 'selected'], [/open|expand/, 'open'], [/copied|done|success|saved|verified/, 'success'],
  [/hover/, 'hover'], [/focus/, 'focus'],
];
const STATE_ORDER = ['empty', 'loading', 'error', 'success', 'disabled', 'hover', 'focus', 'pressed', 'selected', 'open'];
const mapState = (name) => { const n = String(name).toLowerCase(); const hit = STATE_MAP.find(([re]) => re.test(n)); return hit ? hit[1] : null; };

// Facet's content may not exceed 128 KiB (MAX_CONTENT_BYTES), and a hundred full cards do not fit: the entries are built
// at the richest of these levels whose whole document fits, and the README says which. The full cards stay in catalog.json.
const LEVELS = [
  { purpose: 500, usage: 300, items: 4, item: 200, parts: 8, part: 120, prop: 120, paths: 2, props: 32, variants: 16 },
  { purpose: 300, usage: 160, items: 3, item: 140, parts: 6, part: 80, prop: 80, paths: 2, props: 32, variants: 16 },
  { purpose: 220, usage: 120, items: 2, item: 120, parts: 5, part: 60, prop: 60, paths: 1, props: 32, variants: 16 },
  { purpose: 160, usage: 0, items: 2, item: 100, parts: 4, part: 40, prop: 0, paths: 1, props: 32, variants: 16 },
  { purpose: 120, usage: 0, items: 1, item: 100, parts: 3, part: 30, prop: 0, paths: 1, props: 32, variants: 16 },
  { purpose: 100, usage: 0, items: 1, item: 80, parts: 2, part: 24, prop: 0, paths: 0, props: 8, variants: 8 },
  { purpose: 80, usage: 0, items: 1, item: 60, parts: 1, part: 20, prop: 0, paths: 0, props: 4, variants: 6 },
];
// The full variant: every field at the length Facet allows it (models.ts), nothing cut but what overruns that.
const FULL_LEVEL = { purpose: 500, usage: 1000, items: 8, item: 300, parts: 16, part: 300, prop: 300, paths: 8, props: 32, variants: 16 };
const MAX_BYTES = 126 * 1024; // 2 KiB under Facet's limit, for the difference between JSON and Python's canonical form

function buildComponents(L, carried) {
const droppedStates = new Set();
// Components that take no content: a `children` slot is not offered.
const VOID = new Set(['icon', 'texture', 'divider', 'input', 'checkbox', 'radio', 'switch', 'slider', 'progress', 'meter', 'loader', 'qr', 'sparkline', 'bars', 'donut', 'heatgrid', 'chart', 'number', 'otp', 'textarea', 'skeleton']);
const camel = (attr) => attr.replace(/^data-/, '').replace(/^fd-/, '').replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const attrShort = (attr) => attr.replace(/^data-/, '').replace(/^fd-/, '');
const NOT_PROPS = new Set(['data-state', 'data-fill', 'data-fd-instant']);

const noCard = [];
const propNotes = [];
const components = [];
for (const c of carried) {
  const card = c.card || null;
  if (!card) noCard.push(c.id);
  const name = pascal(c.id);
  const attrs = Object.entries(c.attributes).sort(([a], [b]) => (a < b ? -1 : 1));

  // variants: the values of data-variant first, then the other attributes' values as "<attr>-<value>"
  const variants = [];
  const addVariant = (attr, value) => { const v = attr === 'data-variant' ? (value || 'default') : value ? `${attrShort(attr)}-${value}` : attrShort(attr); if (v.length <= 40 && !variants.includes(v)) variants.push(v); };
  if (card && card.variants.length) for (const v of card.variants) addVariant(v.attribute, v.value);
  else for (const [a, vs] of attrs) if (a === 'data-variant') vs.forEach((v) => addVariant(a, v));
  if (!card || !card.variants.length) for (const [a, vs] of attrs) if (a === 'data-size' || a === 'data-tone') vs.forEach((v) => addVariant(a, v));
  variants.length = Math.min(variants.length, L.variants);

  // states
  const states = new Set(cssStates.get(c.id) || []);
  if (c.id === 'empty') states.add('empty');
  for (const s of card ? card.states.map((x) => x.name) : (c.attributes['data-state'] || [])) { const m = mapState(s); if (m) states.add(m); else droppedStates.add(`${c.id}:${s}`); }
  const stateList = STATE_ORDER.filter((s) => states.has(s));

  // api
  const props = [];
  const used = new Set(['name', 'children']);
  for (const [attr, values] of attrs) {
    if (NOT_PROPS.has(attr)) continue;
    let prop = camel(attr);
    if (used.has(prop)) { prop += 'Value'; }
    if (used.has(prop) || !/^[a-z][A-Za-z0-9]{0,31}$/.test(prop)) { propNotes.push(`${c.id} ${attr}`); continue; }
    // "*" marks a free value (an icon name, a height, an id): a string prop. "" is the bare (presence) form.
    if (values.includes('*')) { used.add(prop); props.push({ name: prop, type: 'string', required: false, ...(L.prop ? { description: sentence(cut(`Sets ${attr}.`, L.prop)) } : {}) }); continue; }
    const vals = [...new Set(values.filter((x) => x !== ''))];
    const v = card && card.variants.find((x) => x.attribute === attr);
    const description = L.prop ? sentence(cut(v ? `Sets ${attr}. ${v.useWhen}` : `Sets ${attr}.`, L.prop)) : undefined;
    const withDesc = (o) => ({ ...o, required: false, ...(description ? { description } : {}) });
    used.add(prop);
    if (!vals.length) props.push(withDesc({ name: prop, type: 'boolean' }));
    else if (vals.length <= 32 && vals.every((x) => x.length >= 1 && x.length <= 40)) props.push(withDesc({ name: prop, type: 'enum', values: vals }));
    else { props.push(withDesc({ name: prop, type: 'string' })); propNotes.push(`${c.id} ${attr} (${vals.length} values, a string)`); }
  }
  const PROP_ORDER = ['variant', 'size', 'tone'];
  const rank = (n) => (PROP_ORDER.includes(n) ? PROP_ORDER.indexOf(n) : 99);
  props.sort((x, y) => rank(x.name) - rank(y.name) || (x.name < y.name ? -1 : 1));
  props.length = Math.min(props.length, L.props);

  const parts = [];
  const hasChildren = !VOID.has(c.id);
  if (hasChildren) parts.push({ name: 'children', description: cut("Slot: the component's content, given as the children of <cc-component>.", L.part) });
  if (card && card.parts.length) {
    for (const p of card.parts) { const n = p.class.replace(/^fd-/, ''); if (/^[a-z][a-z0-9-]{0,39}$/.test(n) && !parts.some((x) => x.name === n)) parts.push({ name: n, description: cut(p.role, L.part) }); }
  } else {
    for (const cl of c.classes) { const n = cl.replace(/^fd-/, ''); if (/^[a-z][a-z0-9-]{0,39}$/.test(n) && !parts.some((x) => x.name === n)) parts.push({ name: n, description: cut(`Class ${cl}.`, L.part) }); }
  }
  parts.length = Math.min(parts.length, L.parts);

  const given = props.filter((p) => p.type === 'enum').sort((a, b) => (a.name === 'variant' ? -1 : b.name === 'variant' ? 1 : 0)).slice(0, 2);
  const firstValue = (p) => (card && card.variants.find((x) => camel(x.attribute) === p.name && p.values.includes(x.value))?.value) || p.values[0];
  const example = `<cc-component name="${name}"${given.map((p) => ` ${p.name}="${firstValue(p)}"`).join('')}>${hasChildren ? 'Content' : ''}</cc-component>`;

  const entry = {
    name,
    purpose: card ? cut(card.purpose, L.purpose) : cut(`The Fire ${c.family} ${c.kind} (${c.root}); no card yet, so this entry comes from the catalogue.`, L.purpose),
    variants, states: stateList,
    paths: [...(cssFileOf.has(c.id) ? [cssFileOf.get(c.id)] : []), ...(c.docs ? [c.docs.replace(/#.*/, '')] : [])].slice(0, L.paths),
  };
  if (card) {
    if (L.usage) entry.usage = cut(`${card.job}${card.aka.length ? ` Also called: ${card.aka.join(', ')}.` : ''}`, L.usage);
    if (card.useWhen.length) entry.do = card.useWhen.slice(0, L.items).map((s) => cut(s, L.item));
    if (card.avoidWhen.length) {
      entry.dont = card.avoidWhen.slice(0, L.items).map((a) => cut(`${sentence(a.when)} ${byId.has(a.instead) ? `Use ${pascal(a.instead)}.` : sentence(a.instead)}`, L.item));
    }
  }
  entry.api = { props, parts, example };
  components.push(entry);
}
if (new Set(components.map((c) => c.name)).size !== components.length) throw new Error('component names collide');
return { components, noCard, propNotes, droppedStates };
}

/* ==========================================================================
   content.json
   ========================================================================== */
const buildContent = (T, components, contractRecord) => ({
  name: 'Fire',
  platform: 'web_app',
  source: 'proposed',
  summary: `Fire ${catalog.fire}: a design system for developer, agent and AI products, in its default look (the Ember palette, Geist and Geist Mono). Plain HTML and CSS are the contract: classes fd-*, variants and states through data-* and ARIA, tokens --fd-*. Light and dark values are exact; this content is generated from contract/fire-contract.json and contract/catalog.json, so edit the theme record (facet/theme.json), not these tokens.`,
  tokens: {
    color: T.colorOrdered, palette: T.palette, font: T.font, typography: T.typography, space: T.space, radius: T.radius, shadow: T.shadow, breakpoint: T.breakpoint,
    duration: T.duration, easing: T.easing, zIndex: T.zIndex, iconSize: T.iconSize, size: T.size, focusRing: T.focusRing, state: T.stateTokens,
  },
  pairings: T.pairings,
  motion: {
    reduced_motion: 'remove',
    notes: 'Fire collapses every duration through one token: under prefers-reduced-motion it sets --fd-motion to 0 and --fd-press-scale to 1, and each duration is the token times --fd-motion, so nothing animates. Looping spinners and shimmers stop with it.',
  },
  components,
  voice,
  ...(contractRecord ? { contract: contractRecord } : {}),
});

/* ==========================================================================
   theme.json
   ========================================================================== */
// The record names the Fire release it was written against, so Facet pins the expander by it.
const { contract: recordContract, ...recordRest } = JSON.parse(JSON.stringify(DEFAULT_RECORD));
const themeRecord = { contract: recordContract, fire: FIRE_VERSION, ...recordRest };
{ const v = validateTheme(themeRecord); if (!v.ok) throw new Error(`default theme record invalid: ${v.errors.join('; ')}`); }

/* ==========================================================================
   Which variant: ask the installed Facet
   ========================================================================== */
// $FACET_CLI when set (even if it names nothing: then there is no Facet to ask), else the first of the two known builds that exists.
const CLI_CANDIDATES = process.env.FACET_CLI ? [process.env.FACET_CLI] : ['../design-kit/dist/cli.js', '../codecrystal/vendor/facet/dist/cli.js'];
const CLI = CLI_CANDIDATES.find((c) => fs.existsSync(c)) || CLI_CANDIDATES[0];
const cliFound = fs.existsSync(CLI);
// A name for the Facet build: its MANIFEST.json commit when the CLI sits in a vendored tree, else the CLI file's hash.
function facetId() {
  const manifest = path.join(path.dirname(path.dirname(CLI)), 'MANIFEST.json');
  try { const m = JSON.parse(fs.readFileSync(manifest, 'utf8')); if (m.commit) return `facet ${String(m.commit).slice(0, 12)}`; } catch { /* no manifest */ }
  return `facet cli sha256:${sha256(fs.readFileSync(CLI)).slice(0, 12)}`;
}
// Facet's own checker, read-only, on a copy in a temp folder.
function facetAccepts(doc) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-facet-probe-'));
  try {
    const file = path.join(dir, 'content.json');
    fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
    const r = spawnSync(process.execPath, [CLI, 'system', 'check', file], { encoding: 'utf8' });
    return { ok: r.status === 0, why: String(r.stderr || r.stdout || '').trim().split('\n')[0] };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const T_FULL = tokenSet(true), T_FALLBACK = tokenSet(false);
const buildFull = () => { const b = buildComponents(FULL_LEVEL, ranked); return { T: T_FULL, built: b, content: buildContent(T_FULL, b.components, themeRecord), level: FULL_LEVEL, levelNo: null }; };
function buildFallback() {
  const carried = ranked.slice(0, MAX_COMPONENTS);
  for (let n = 0; n < LEVELS.length; n++) {
    const b = buildComponents(LEVELS[n], carried);
    const c = buildContent(T_FALLBACK, b.components, null);
    if (Buffer.byteLength(JSON.stringify(c)) <= MAX_BYTES) return { T: T_FALLBACK, built: b, content: c, level: LEVELS[n], levelNo: n };
  }
  throw new Error('content.json does not fit 128 KiB even at the smallest level');
}
let variant, chosen, validatedBy = null, probeNote = '';
const committedFacet = (() => { try { return JSON.parse(fs.readFileSync(path.join(OUT, 'extras.json'), 'utf8')).facet || null; } catch { return null; } })();
if (cliFound) {
  const full = buildFull();
  const r = facetAccepts(full.content);
  if (r.ok) { variant = 'full'; chosen = full; validatedBy = facetId(); }
  else {
    variant = 'fallback'; chosen = buildFallback();
    probeNote = `the full variant was rejected: ${r.why}`;
    validatedBy = facetAccepts(chosen.content).ok ? facetId() : null;
  }
} else if (CHECK && committedFacet) {
  // Nothing to probe with: rebuild what the committed files say they are.
  variant = committedFacet.variant; chosen = variant === 'full' ? buildFull() : buildFallback(); validatedBy = committedFacet.validatedBy;
  probeNote = 'no Facet CLI on this machine; the committed variant is rebuilt as recorded';
} else {
  variant = 'fallback'; chosen = buildFallback();
  probeNote = `no Facet CLI found (set FACET_CLI to a Facet dist/cli.js, or install one at ${CLI_CANDIDATES.join(' or ')}); the fallback is written and no Facet build validated it`;
  console.warn(`build-facet: ${probeNote}`);
}
const { T, built, content, level: LV, levelNo } = chosen;
const { ROLE_ORDER, DROPPED_ROLES, palette, typography, size, pairings, ALIASES, SHADOW_FOLDED, SIZE_CANDIDATES, SIZE_KEPT, SIZE_DROPPED, TYPE_DROPPED } = T;
const { components, noCard, propNotes, droppedStates } = built;
const carriedIds = new Set(components.map((c) => c.name));
const excluded = ranked.filter((c) => !carriedIds.has(pascal(c.id)));
const contentBytes = Buffer.byteLength(JSON.stringify(content));
// Facet's own caps, in compact bytes (Facet measures canonical bytes, which are close): the document without the components, the components, the contract.
const { components: _inv, ...docRest } = content;
const docBytes = Buffer.byteLength(JSON.stringify(docRest)), compBytes = Buffer.byteLength(JSON.stringify(components));
const contractBytes = content.contract ? Buffer.byteLength(JSON.stringify(content.contract)) : 0;
const facetRecord = { variant, components: components.length, contract: variant === 'full', validatedBy, checker: 'facet system check' };

/* ==========================================================================
   extras.json
   ========================================================================== */
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(rel)); else out.push(rel);
  }
  return out;
}
const PURPOSE = [
  [/^fire\/fire\.css$/, 'Fire\'s one stylesheet: imports every layer below.'],
  [/^fire\/tokens\.css$/, 'Every --fd-* token: type, space, radius, shadow, motion, layers, sizes, status and code colours.'],
  [/^fire\/palettes\.css$/, 'The 15 palettes as [data-palette] blocks; Ember is the default.'],
  [/^fire\/typefaces\.css$/, 'The @font-face rules and the 12 type sets as [data-type] blocks.'],
  [/^fire\/base\.css$/, 'Reset, type roles and the global rules every component relies on.'],
  [/^fire\/layout\.css$/, 'The layout primitives (stack, row, grid, column, grow).'],
  [/^fire\/components\//, 'A component sheet imported by fire.css.'],
  [/^fire\/fonts\/LICENSE|^fire\/fonts\/licenses\//, 'Font licence text, carried with the font files.'],
  [/^fire\/fonts\//, 'A variable font file the type sets name; Geist and Geist Mono are the default look.'],
  [/^fire\/boot\.js$/, 'Sets theme, palette, density and type attributes before first paint, so there is no flash.'],
  [/^fire\/fire\.js$/, 'The behaviour module: delegated listeners, init(root), fd:* events.'],
  [/^fire\/elements\.js$/, 'Fire\'s custom elements (fd-icon, fd-chart, fd-code, fd-texture) with Lit bundled in.'],
  [/^fire\/js\/theme\.js$/, 'The theme record to tokens expander (expandTheme, themeToCss, paletteFrom, validateTheme).'],
  [/^fire\/js\//, 'A behaviour or data module that fire.js imports.'],
  [/^fire\/LICENSE-/, 'Licence text of bundled code (Lit in elements.js, Lucide icons).'],
  [/^contract\/fire-contract\.json$/, 'Every global token with tier, type, group, default and Facet role.'],
  [/^contract\/catalog\.json$/, 'Components, classes, attribute values, elements, events, icons and cards: what the lint and agents read; Facet carries it as ds/catalog.json.'],
  [/^contract\/custom-elements\.json$/, 'Custom Elements Manifest of Fire\'s elements (tags, attributes, events); Facet carries it as ds/custom-elements.json.'],
  [/^contract\/theme\.schema\.json$/, 'JSON Schema of the theme record Facet stores.'],
];
const extraPaths = [
  'fire/fire.css', 'fire/tokens.css', 'fire/palettes.css', 'fire/typefaces.css', 'fire/base.css', 'fire/layout.css',
  ...fs.readdirSync(path.join(ROOT, 'fire/components')).filter((f) => f.endsWith('.css')).sort().map((f) => `fire/components/${f}`),
  ...walk('fire/fonts').filter((f) => /\.woff2$|LICENSE|\/licenses\//.test(f)),
  'fire/boot.js', 'fire/fire.js', 'fire/elements.js',
  ...fs.readdirSync(path.join(ROOT, 'fire/js')).filter((f) => f.endsWith('.js')).sort().map((f) => `fire/js/${f}`),
  'fire/LICENSE-lit.txt', 'fire/LICENSE-lucide.txt',
  'contract/fire-contract.json', 'contract/catalog.json', 'contract/custom-elements.json', 'contract/theme.schema.json',
].filter((f, i, a) => a.indexOf(f) === i && fs.existsSync(path.join(ROOT, f)));
// Where Facet reads these two from the canvas it builds: the folder ds/ (Facet's generated files live there too).
const DS_PATHS = { 'contract/catalog.json': 'ds/catalog.json', 'contract/custom-elements.json': 'ds/custom-elements.json' };
const files = extraPaths.map((p) => {
  const buf = fs.readFileSync(path.join(ROOT, p));
  const row = { path: p, purpose: PURPOSE.find(([re]) => re.test(p))[1], size: buf.length, sha256: sha256(buf) };
  if (/^fire\/fonts\/.*\.woff2$/.test(p)) row.required = /geist/.test(p);
  if (DS_PATHS[p]) row.ds = DS_PATHS[p];
  return row;
});
const bundleSha256 = sha256(files.map((f) => `${f.sha256}  ${f.path}\n`).join(''));
const extras = {
  fire: catalog.fire, package: 'fire-design', tag: `v${catalog.fire}`,
  description: 'The files a Facet system carries beside the generated content: copy them as they are, under the same relative paths. fire/ stays copyable on its own (load boot.js, fire.css and fire.js); the contract files are for the lint and the exporter.',
  facet: facetRecord,
  bundleSha256, totalBytes: files.reduce((n, f) => n + f.size, 0),
  roleMap: T.roleMap,
  aliases: Object.fromEntries(Object.entries(ALIASES).sort(([a], [b]) => (a < b ? -1 : 1))),
  files,
};

/* ==========================================================================
   README.md
   ========================================================================== */
const md = [];
const w = (s = '') => md.push(s);
w('# facet/: Fire as a Facet design system');
w();
w(`GENERATED by \`node scripts/build-facet.mjs\` from Fire ${catalog.fire} (\`contract/fire-contract.json\`, \`contract/catalog.json\`, \`WRITING.md\`). Do not edit; \`node scripts/build-facet.mjs --check\` fails when a file is stale.`);
w();
w('## Files');
w();
w('| File | What it is |');
w('|---|---|');
w(`| \`content.json\` | Fire's default look (Ember, Geist) as a Facet \`DesignSystemContent\`: ${ROLE_ORDER.length} colour roles, ${Object.keys(palette).length} palette entries, ${Object.keys(typography).length} type steps, space, radius, shadow, breakpoint, duration, easing, zIndex, iconSize, ${Object.keys(size).length} sizes, focus ring, state, ${pairings.length} pairings, motion, voice and ${components.length} components with \`api\` cards${variant === 'full' ? ', and a top-level \`contract\` field that holds \`theme.json\`' : ''}. It passes Facet's \`validateContent\` (checked by \`scripts/test/facet.test.mjs\`, with \`facet system check\` when the CLI is present). |`);
w(`| \`extras.json\` | The ${files.length} files Facet carries beside the generated ones, each with its purpose, size and SHA-256, plus \`roleMap\` (Facet role to Fire token) and \`aliases\` (Facet's generated custom property to the Fire token holding the same value). |`);
w('| `theme.json` | The theme record `content.json` was generated from: Fire\'s default record (`contract` "fire/1", `fire` the release, palette ember, type geist, default dials). |');
w('| `README.md` | This file. |');
w();
w('## Which variant was written');
w();
w(variant === 'full'
  ? `**Full.** All ${components.length} components with full cards (each field at the length Facet allows), and a top-level \`contract\` field holding \`theme.json\` exactly as Fire writes it. The installed Facet accepted it (validated by ${validatedBy}).`
  : `**Fallback.** ${components.length} components chosen by the rule below, cut to detail level ${levelNo}, and no \`contract\` field. ${probeNote ? `${probeNote.charAt(0).toUpperCase()}${probeNote.slice(1)}. ` : ''}${validatedBy ? `This variant was accepted by ${validatedBy}.` : 'No Facet build validated it.'}`);
w();
w('The build tries the full variant first and falls back only when Facet\'s own checker (`facet system check`) rejects it, so a Facet that raises its limits and adds `contract` needs no change here: run `node scripts/build-facet.mjs` again. The variant and the Facet build are recorded in `extras.json` under `facet`. Set `FACET_CLI` to a Facet `dist/cli.js` to choose the Facet to ask.');
w();
w('## How Facet should consume it');
w();
w(`1. **Opt in with the contract field.** A Facet system that follows Fire stores \`{ "contract": "fire/1", "record": <theme record> }\` (as \`theme.json\`), not the generated tokens. Facet calls \`expandTheme(record)\` from \`fire/js/theme.js\` (pure ES module, runs in Node and the browser) for tokens, and \`themeToCss(record)\` for a stylesheet a strict CSP allows. \`content.json\` is what Facet shows and validates for the default record${variant === 'full' ? ' (its \`contract\` field is that record, the same bytes as \`theme.json\`)' : ''}; for any other record Facet regenerates it the same way (palette, type set and dials change, the scales do not).`);
w(`2. **Pin the release.** Fire ${catalog.fire}, git tag \`${extras.tag}\` (\`github:vidhatanand/firedesign#${extras.tag}\`). The extras bundle hash is \`${bundleSha256}\` (SHA-256 of the lines "sha256  path" of \`extras.json\` files, in order). A Facet system records the tag and the bundle hash, and verifies each file's hash before an export is offered.`);
w('3. **Carry the extras.** Copy every `extras.json` file to the same relative path in the canvas or the export. Fonts marked `required: false` belong to the other type sets (`data-type`); a system on Geist needs only the required ones, and may drop the rest and the matching @font-face rules. Two files have a `ds` field: `contract/catalog.json` and `contract/custom-elements.json` are the ones Facet reads from the canvas as `ds/catalog.json` and `ds/custom-elements.json`.');
w('4. **Use the aliases.** `aliases` maps each custom property Facet generates (`--color-primary`, `--space-4`, `--shadow-md`, ...) to the Fire token with the same value, so a Facet-generated sheet can be written as `--color-primary: var(--fd-accent)` and follow the theme. Fire\'s tokens stay the source: Facet\'s `component` references should name Facet tokens only where an alias exists.');
w('5. **Components.** Each component is `<cc-component name="Button" variant="primary">`; its props are the data attributes of the Fire markup (`variant` is `data-variant`, `iconOnly` is `data-icon-only`) and the exporter writes the Fire class (`root` in the catalogue) plus those attributes. A `children` part marks a component that takes content. Facet runs `scripts/lint-markup.mjs` on the export and `scripts/render-equal.mjs` against the board.');
w();
w(variant === 'full' ? '## Components' : `## Which ${MAX_COMPONENTS} components, and the rest`);
w();
if (variant === 'full') {
  w(`All ${catalog.components.length} components in the catalogue are carried, in this order: the foundation families first, then the rest by use in \`templates/*.html\`. ${noCard.length ? `Carried without a card (${noCard.length}): ${noCard.map((i) => `\`${i}\``).join(', ')}.` : 'Every one has a card.'} Text is cut at a word with an ellipsis only where it overruns the length Facet allows; the complete cards are in \`contract/catalog.json\`, carried in the extras.`);
  w();
} else {
w(`Fire has ${catalog.components.length} components in the catalogue; Facet caps a system at ${MAX_COMPONENTS}. Rule: the foundation families (${[...PROTECTED_FAMILIES].join(', ')}) are always carried; specialised parts of Fire's docs site, chat widget, agent playground and Tweaks panel are left out first; any remaining slots go by the number of \`templates/*.html\` that use the component. Facet's cap is what the fallback works to; when the installed Facet accepts more, the full variant carries all ${catalog.components.length}.`);
w();
w(`Excluded (${excluded.length}, for the Facet session to decide; id, kind, templates that use it):`);
w();
for (const c of excluded) w(`- \`${c.id}\` (${c.kind}, ${usage.get(c.id)})`);
w();
w(`Carried without a card (${noCard.length}; each has a minimal entry from the catalogue: purpose, classes as parts, attribute values as props, states from the CSS and the \`data-state\` values): ${noCard.length ? noCard.map((i) => `\`${i}\``).join(', ') : 'none'}.`);
w();
}
w(`- **Modules are not carried.** The catalogue also lists ${(catalog.modules || []).length} modules (${(catalog.modules || []).map((m) => `\`${m.id}\``).join(', ')}): JS-only parts such as the email renderer and the theme record, each with a card. They are not Facet components and are not in \`components\`; their cards are in \`contract/catalog.json\` under \`modules\`, carried in the extras.`);
w();
w('## Where Fire\'s model did not fit Facet\'s');
w();
w('- **Accent role.** Facet requires an `accent` colour; Fire has one accent. `accent` repeats `primary` and Facet may set another.');
if (variant === 'full') {
  w('- **Surface and status roles.** `raised` (Fire `--fd-surface-raised`), `sunken` (`--fd-bg-sunken`) and the four `on-<tone>` roles (`--fd-<tone>-contrast`, the label on `--fd-<tone>-fill`) are carried, each with its text pairing at 4.5:1 in both themes (`text` on `raised`, `text` on `sunken`, `on-<tone>` on `<tone>`). Fire has no secondary colour, so `secondary` and `on-secondary` are not written.');
} else {
  w(`- **Status labels.** The fallback has no label role for a status fill (Fire's ${DROPPED_ROLES.join(', ')}) and no \`raised\` or \`sunken\`, so the contrast of Fire's labels on status fills is not in \`pairings\`. The fills are the roles; the labels stay in \`fire-contract.json\`.`);
}
w('- **Alpha colours.** Roles must be opaque: `muted` is `--fd-text-3` laid over `--fd-bg` in each mode (the contract does the same). `palette` and `state` keep the alpha as 8-digit hex (accent washes, fills, status backgrounds, lines), rounded to 1/255; state colours that Facet shows as a role (`hover.surface`, `selected.surface`, `disabled.surface`) are laid over `--fd-surface`.');
if (variant === 'full') {
  w('- **Shadows.** Every shadow keeps all its layers (up to 5; `--fd-shadow-accent` has 5) in the light value, and Fire\'s stronger dark layers go in the shadow\'s `org.codecrystal.dark` extension. Nothing is folded. Fire\'s focus ring is a two-layer shadow; Facet\'s `focusRing` holds its 2px width and 2px offset.');
  w(`- **Sizes.** All ${SIZE_CANDIDATES.length} of Fire's pixel sizes are carried, plus \`touch\` (40px, the default control on a coarse pointer; below the 44px Facet recommends, so its accessibility report shows an advisory). Icon sizes are in \`iconSize\`. Sizes in \`ch\` (\`--fd-measure\`) and unitless ones (\`--fd-icon-stroke\`) are not dimensions Facet takes.`);
  w('- **Type scale.** All 16 of Fire\'s type sizes are steps, with Fire\'s sizes and line heights in rem and its letter spacing in em, as the CSS writes them. Fire sets no line height for `3xs` and `4xs` (the build uses `--fd-lh-2xs`, as chat.css does for `3xs`) or for `compose` (it uses `--fd-lh-lg`, as agent.css does). Body is `md` (14px, 1.25rem), so Facet\'s accessibility report shows advisories for body size and line height; Fire sets text 14px on purpose.');
  w('- **Numeric figures.** `font.numeric` is `proportional`: Fire sets no figure style on the page. Tabular figures are asked for per use (`.fd-stat`, `.fd-num`, numeric columns, chart labels), and the one type step built for numbers, `stat`, carries `numeric: tabular`. Fire uses tabular figures in 12 component sheets for columns of numbers; those are component rules, not type steps, and are not repeated here.');
} else {
  w('- **Dark mode.** Facet\'s `org.codecrystal.dark` extension carries dark colours. In the fallback, shadows have no dark value: `shadow` holds the light layers; Fire\'s dark shadows are stronger (Facet should take them from the theme record).');
  w(`- **Shadow layers.** The fallback allows 4 layers per shadow; \`--fd-shadow-accent\` has 5. ${SHADOW_FOLDED.length ? `Folded: ${SHADOW_FOLDED.join(', ')}: the last two outer layers (blur 1px and 0.5px, the same colour) became one layer with the smaller one's offset and blur and the alpha of both together, 1 - (1 - 0.14)(1 - 0.2) = 0.312.` : 'None needed folding.'}`);
  w(`- **Sizes.** The fallback allows 12 \`size\` tokens, Fire has ${SIZE_CANDIDATES.length} pixel sizes. Kept: \`touch\` (40px) and the 11 most referenced by var() in Fire's CSS: ${SIZE_KEPT.map((c) => `${strip(c.name)} (${c.uses})`).join(', ')}. Left out: ${SIZE_DROPPED.map((c) => strip(c.name)).join(', ')}.`);
  w(`- **Type scale.** The fallback carries 14 of Fire's 16 type sizes. Left out: ${TYPE_DROPPED.join(', ')}. \`3xs\` borrows \`--fd-lh-2xs\`. Line heights are the ratio of Fire's line height to its size, and sizes such as 0.8125rem become 13px (three decimals, px).`);
}
w('- **Breakpoints.** Facet\'s breakpoints are min-width and mobile first; Fire writes `max-width: 640px` for the phone layout and `min-width: 900px` for the wide one. `tablet` is 641px (where the wide layout starts) and `desktop` is 900px. `responsive` overrides are not written: Fire\'s phone overrides (smaller display and h1, 16px gutter) are max-width rules that a mobile-first override cannot say without inverting the base values.');
w('- **Durations.** `duration` holds the five interaction durations and the stagger. The looping durations (spin 0.7s, shimmer 1.6s, pulse 1.8s, blink 1.1s, dots 1.2s) are left out: they are ambient loops, not transitions, and would make Facet report durations above 500ms. Reduced motion is `remove`: Fire sets `--fd-motion` to 0 and every duration is the token times that.');
w('- **Dials and density.** Corners, density, line weight, text size, contrast, motion and texture are theme-record dials, not tokens Facet can model; they travel in `theme.json`.');
w(`- **Component states.** Facet takes any lower-case state name, and a web app must cover empty, loading, error and disabled. Card states map to a short vocabulary (${STATE_ORDER.join(', ')}); names that no pattern takes are dropped (${droppedStates.size} of them, mostly transient or per-component states such as closing, dragover, masked or sending; for example ${[...droppedStates].sort().slice(0, 8).join(', ')}). States are also read from the CSS selectors that carry the component's class (:hover, :focus, [disabled], [aria-invalid], [aria-busy], [aria-pressed], :checked, [open]); that is a heuristic, not a card.`);
w('- **Props.** Fire attributes with values are `enum` props; attributes with no value are `boolean`. `data-state`, `data-fill` and `data-fd-instant` are not props (state is set by the page; the others are layout toggles). Enums with more than 32 values would be strings; ' + (propNotes.length ? `affected: ${propNotes.join('; ')}.` : 'none are.') + ' `children` is Facet\'s own name, so no prop is called that; a `children` part says the component takes content. Components that take none are listed in the build script (`VOID`).');
w('- **Examples.** Each `api.example` is a `<cc-component>` tag with the first value of the first two enums, not Fire markup: the docs sections that show the real markup are named in the card (`example`) and in `paths`.');
if (variant === 'full') w(`- **Size.** ${components.length} components: ${(docBytes / 1024).toFixed(1)} KiB for the document without them (cap 128 KiB), ${(compBytes / 1024).toFixed(1)} KiB for the components (cap 768 KiB) and ${(contractBytes / 1024).toFixed(1)} KiB for the contract (cap 16 KiB), compact bytes; Facet measures canonical bytes, which the installed Facet accepted. Text is cut only where a field overruns its length cap.`);
else w(`- **Size.** A Facet content document may not exceed 128 KiB, and ${MAX_COMPONENTS} full cards do not fit. The build takes the richest of ${LEVELS.length} levels whose document fits in ${MAX_BYTES / 1024} KiB: this one is level ${levelNo} (${(contentBytes / 1024).toFixed(1)} KiB compact). At this level an entry keeps a purpose of up to ${LV.purpose} characters, ${LV.usage ? `usage up to ${LV.usage}` : 'no usage line'}, up to ${LV.items} do and ${LV.items} don't lines of up to ${LV.item} characters, up to ${LV.parts} parts (descriptions up to ${LV.part}), up to ${LV.props} props, up to ${LV.variants} variants, ${LV.prop ? `prop descriptions up to ${LV.prop}` : 'no prop descriptions'} and ${LV.paths} path${LV.paths === 1 ? '' : 's'}. Longer text is cut at a word and ends with an ellipsis; the complete cards are in \`contract/catalog.json\`, which is carried in the extras. Level 0 is the richest; the level moves when cards are written.`);
w();
const readme = md.join('\n') + '\n';

/* ==========================================================================
   Write or check
   ========================================================================== */
const out = {
  'content.json': JSON.stringify(content, null, 2) + '\n',
  'extras.json': JSON.stringify(extras, null, 2) + '\n',
  'theme.json': JSON.stringify(themeRecord, null, 2) + '\n',
  'README.md': readme,
};
let stale = 0;
for (const [rel, text] of Object.entries(out)) {
  const file = path.join(OUT, rel);
  if (CHECK) {
    const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (now !== text) { stale++; console.error(`stale: facet/${rel}`); }
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
}
if (CHECK) {
  if (stale) { console.error('facet/ is out of date: run node scripts/build-facet.mjs'); process.exit(1); }
  console.log(`facet/ is current (${variant} variant, ${components.length} components, ${files.length} extras)`);
} else console.log(`wrote facet/ (${variant} variant, ${components.length} components, ${files.length} extras, ${noCard.length} without a card)`);
