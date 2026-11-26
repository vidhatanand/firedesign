#!/usr/bin/env node
/*
 * lint-css: checks a product's own CSS against Fire's token contract (contract/fire-contract.json). The twin of
 * lint-markup, which checks the markup.
 *
 *   node scripts/lint-css.mjs [--contract path] [--prefix name]… [--json] <files, directories or globs…>
 *   fire lint-css …
 *
 * Runs in any project that installs Fire; it depends only on Node and the contract file. The contract is --contract,
 * else `fire-design/contract` resolved from the working directory or from this package, else
 * ../contract/fire-contract.json next to this script.
 *
 * Inputs: .css; <style> blocks in .html/.htm and .vue (a block with lang="scss|sass|less|stylus" is skipped); css`…`
 * templates in .ts/.tsx/.js/.jsx/.mjs/.mts/.cjs (static parts only: a ${…} hole is skipped). No parser
 * dependency: a small tokeniser for comments, strings, at-rules, nested rules and declarations.
 *
 * The product's token prefix: --prefix acme (repeat it for several), and `"fire": { "prefix": "acme" }` (a string or a
 * list) in the nearest package.json. Both are used. `--acme-radius` belongs to the prefix `acme`; `--fd-` is Fire's.
 * Custom properties named `--_x` are private to their rule, as in Fire's own CSS, and are never reported.
 *
 * Rules (id, E = error, W = warning: what it reports):
 *   unknown-token        E  var(--fd-x) where --fd-x is not in the contract; names the nearest tokens
 *   reserved-prefix      E  a custom property starting --fd- that the contract does not list (the prefix is Fire's)
 *   token-override       W  a listed --fd- token set in product CSS. The contract's tier decides: an `input` token is what
 *                           a theme record sets, so setting it is not reported; a `scale` or `derived` token is reported
 *                           (a theme record, or a product token, is the place for it)
 *   unprefixed-token     W  a custom property that is neither --fd-*, --_* nor under a declared prefix
 *   duplicate-token      E  a product token that repeats a Fire token (the same colour, length, duration, easing, font,
 *                           weight or z-index value, or a bare alias of one that is defined once on :root), or repeats
 *                           another product token
 *   near-token           W  a product colour or length that is close to a Fire token but not equal
 *   no-raw-color         E  a hex, rgb(), hsl(), oklch()… or named colour in a declaration (a product token definition is
 *                           the one place a colour value may be written)
 *   no-raw-size          W  px or rem lengths outside a token definition (0, %, unitless and calc() that multiplies a
 *                           token are fine; at-rule conditions such as @media are not declarations)
 *   no-raw-duration      W  ms or s outside a token definition (0s and calc() that multiplies a token are fine)
 *   no-fd-class-restyle  W  a rule whose subject is an fd-* class and that sets more than placement (margin, grid-area,
 *                           order, align-self, justify-self, flex, position, inset, width and height through tokens,
 *                           display: none, custom properties). Use a variant, or a class of your own on a wrapper
 *   no-important         W  !important in a rule whose selector has an fd-* class
 *
 * What counts as a duplicate. Kinds come from the value (a colour, a duration, a cubic-bezier) and, for lengths and
 * numbers, from the token's name: radius, space (gap, pad, margin, gutter…), text (font size), line height, hairline
 * (border width), weight, z-index. A colour is compared by distance in OKLab (#fff = white = rgb(255 255 255); a very
 * small distance counts as the same), a length after unit conversion (0.5rem = 8px). A token that is re-defined (per
 * scope or per colour scheme) with different values is not a duplicate: `--acme-ink: var(--fd-text)` defined once on
 * :root is, `--acme-ink` defined as var(--fd-text) on :root and as something else under [data-theme=dark] is not.
 * Lengths named by size (width, height, max, panel, sidebar…) are NOT compared with Fire's size steps: a layout
 * constant that happens to be 240px is not a copy of --fd-size-md.
 *
 * Component parameters. A few --fd-* names are not global tokens but documented parameters of components and layout
 * primitives (PARAMS below: --fd-gap, --fd-cols, --fd-i, --fd-panel-w …). They may be set and read.
 *
 * Each finding has file, line, column, rule, severity, message and fix. Exit code 1 when there is any error, 2 on
 * usage errors. Tokens are collected across all the files given, so a token defined on :root in one file and re-defined
 * for dark mode in another counts as re-defined.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const RULES = ['unknown-token', 'reserved-prefix', 'token-override', 'unprefixed-token', 'duplicate-token', 'near-token',
  'no-raw-color', 'no-raw-size', 'no-raw-duration', 'no-fd-class-restyle', 'no-important'];
const ERRORS = new Set(['unknown-token', 'reserved-prefix', 'duplicate-token', 'no-raw-color']);

// Documented component and layout parameters: set through data-fd-vars or CSS, read by Fire's CSS. They are not global
// tokens, so the contract does not list them (a contract record for them would replace this list).
export const PARAMS = new Set(['--fd-gap', '--fd-min', '--fd-cols', '--fd-i', '--fd-panel-w', '--fd-chat-h', '--fd-swatch-color',
  '--fd-progress', '--fd-table-max', '--fd-skeleton-delay', '--fd-skeleton-late']);

const MASK = '\u0002';   // the inside of a string
const HOLE = '\u0003';   // a ${…} in a css`` template
const isWs = (c) => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';

/* ------------------------------------------------------------------ the CSS tokeniser */

// Returns a tree: { kind: 'root'|'rule'|'at', prelude, preludeAt, name, decls: [{prop, propAt, value, valueAt, important,
// importantAt}], children }. Offsets are into `text`. Comments become spaces and string contents become MASK
// characters in the copy the scanner reads (`m`), so offsets stay the same; values keep their strings (`value`) beside
// the masked form (`vm`).
export function parseCss(text) {
  const n = text.length;
  let clean = '';
  let m = '';
  for (let i = 0; i < n;) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '*') {
      let e = text.indexOf('*/', i + 2);
      e = e < 0 ? n : e + 2;
      const blank = text.slice(i, e).replace(/[^\n]/g, ' ');
      clean += blank; m += blank; i = e; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && text[j] !== c && text[j] !== '\n') { if (text[j] === '\\') j++; j++; }
      const end = text[j] === c ? j + 1 : j;
      clean += text.slice(i, end);
      m += c + MASK.repeat(Math.max(0, end - i - 2)) + (text[j] === c ? c : MASK);
      i = end; continue;
    }
    clean += c; m += c; i++;
  }
  clean = clean.slice(0, n); m = m.slice(0, n);

  const root = { kind: 'root', prelude: '', preludeAt: 0, name: '', decls: [], children: [], parent: null };
  let i = 0;

  function block(node) {
    for (;;) {
      while (i < n && (isWs(m[i]) || m[i] === ';')) i++;
      if (i >= n) return;
      if (m[i] === '}') { if (node.kind === 'root') { i++; continue; } return; }
      if (m[i] === HOLE) {   // an interpolated statement or mixin: skip it
        while (i < n && m[i] === HOLE) i++;
        continue;
      }
      const start = i;
      let depth = 0;
      let ended = '';
      while (i < n) {
        const c = m[i];
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
        else if (depth === 0 && (c === ';' || c === '}')) { ended = c; break; }
        else if (depth === 0 && c === '{') {
          if (/^\s*--[\w-]*\s*:/.test(m.slice(start, i))) {   // a custom property whose value is a {…} block
            let d = 0;
            for (; i < n; i++) { if (m[i] === '{') d++; else if (m[i] === '}') { d--; if (d === 0) break; } }
            if (i < n) i++;
            continue;
          }
          ended = '{'; break;
        }
        i++;
      }
      const stmt = m.slice(start, i);
      if (ended === '{') {
        const raw = stmt.replace(/\s+$/, '');
        const lead = raw.length - raw.replace(/^\s+/, '').length;
        const prelude = raw.slice(lead);
        const kind = prelude.startsWith('@') ? 'at' : 'rule';
        const child = { kind, prelude, preludeAt: start + lead, name: kind === 'at' ? (/^@([\w-]+)/.exec(prelude)?.[1] || '').toLowerCase() : '',
          decls: [], children: [], parent: node };
        node.children.push(child);
        i++;
        block(child);
        if (m[i] === '}') i++;
        continue;
      }
      // a declaration or an at-statement (@import …;)
      if (stmt.trimStart().startsWith('@')) { if (ended) i++; continue; }
      const colon = stmt.indexOf(':');
      if (colon > 0) {
        const prop = stmt.slice(0, colon).trim();
        let lead = colon + 1;
        let vm = stmt.slice(lead);
        const ws = vm.length - vm.trimStart().length;
        lead += ws; vm = vm.trim();
        const important = /!\s*important\s*$/i.exec(vm);
        let importantAt = -1;
        if (important) { importantAt = start + lead + important.index; vm = vm.slice(0, important.index).trim(); }
        if (/^-?[\w-]+$/.test(prop) && !prop.includes(HOLE)) {
          node.decls.push({ prop: prop.startsWith('--') ? prop : prop.toLowerCase(), propAt: start + stmt.indexOf(prop), value: clean.slice(start + lead, start + lead + vm.length),
            vm, valueAt: start + lead, important: !!important, importantAt });
        }
      }
      if (ended) i++;
    }
  }
  block(root);
  return root;
}

/* ------------------------------------------------------------------ inputs: css, <style>, css`` */

// Every piece of CSS in a file: { text, base } with base the offset of `text` in the file.
export function extractCss(file, text) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.css') return [{ text, base: 0 }];
  if (ext === '.html' || ext === '.htm' || ext === '.vue') {
    const out = [];
    for (const mt of text.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi)) {
      if (/\blang\s*=\s*["']?(?:scss|sass|less|stylus|styl)\b/i.test(mt[1])) continue;
      out.push({ text: mt[2], base: mt.index + mt[0].indexOf('>') + 1 });
    }
    return out;
  }
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs'].includes(ext)) return /\bcss\s*`/.test(text) ? findCssTemplates(text) : [];
  return [];
}

const REGEX_PREV = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);

function findCssTemplates(src) {
  const n = src.length;
  const out = [];
  scan(0, false);
  return out;

  function scan(i, stop) {
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
        i = j + 1; prev = '"'; continue;
      }
      if (c === '`') { i = template(i); prev = '`'; continue; }
      if (c === '{') { depth++; prev = '{'; i++; continue; }
      if (c === '}') {
        if (depth === 0 && stop) return i;
        depth--; prev = '}'; i++; continue;
      }
      if (c === '/' && REGEX_PREV.has(prev)) {
        let j = i + 1, cls = false;
        while (j < n && src[j] !== '\n') {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false;
          else if (src[j] === '/' && !cls) break;
          j++;
        }
        if (src[j] === '/') { i = j + 1; while (/[a-z]/.test(src[i] || '')) i++; prev = 're'; continue; }
      }
      prev = c; i++;
    }
    return i;
  }

  function template(i) {
    const isCss = /(?:^|[^\w$.])css\s*$/.test(src.slice(Math.max(0, i - 40), i));
    let j = i + 1;
    let css = '';
    let at = i + 1;
    while (j < n && src[j] !== '`') {
      if (src[j] === '\\') { j += 2; continue; }
      if (src[j] === '$' && src[j + 1] === '{') {
        const e = Math.min(scan(j + 2, true) + 1, n);
        if (isCss) { css += src.slice(at, j) + src.slice(j, e).replace(/[^\n]/g, HOLE); at = e; }
        j = e; continue;
      }
      j++;
    }
    if (isCss) { css += src.slice(at, j); out.push({ text: css, base: i + 1 }); }
    return j + 1;
  }
}

/* ------------------------------------------------------------------ colour and length arithmetic */

const NAMED_HEX = 'aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc bisque ffe4c4 black 000000 blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00 chocolate d2691e coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c cyan 00ffff darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b darkgray a9a9a9 darkgreen 006400 darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b darkolivegreen 556b2f darkorange ff8c00 darkorchid 9932cc darkred 8b0000 darksalmon e9967a darkseagreen 8fbc8f darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff firebrick b22222 floralwhite fffaf0 forestgreen 228b22 fuchsia ff00ff gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520 gray 808080 green 008000 greenyellow adff2f grey 808080 honeydew f0fff0 hotpink ff69b4 indianred cd5c5c indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 lightcoral f08080 lightcyan e0ffff lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 lightsalmon ffa07a lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de lightyellow ffffe0 lime 00ff00 limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 mediumaquamarine 66cdaa mediumblue 0000cd mediumorchid ba55d3 mediumpurple 9370db mediumseagreen 3cb371 mediumslateblue 7b68ee mediumspringgreen 00fa9a mediumturquoise 48d1cc mediumvioletred c71585 midnightblue 191970 mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080 oldlace fdf5e6 olive 808000 olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6 palegoldenrod eee8aa palegreen 98fb98 paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9 peru cd853f pink ffc0cb plum dda0dd powderblue b0e0e6 purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 sandybrown f4a460 seagreen 2e8b57 seashell fff5ee sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd slategray 708090 slategrey 708090 snow fffafa springgreen 00ff7f steelblue 4682b4 tan d2b48c teal 008080 thistle d8bfd8 tomato ff6347 turquoise 40e0d0 violet ee82ee wheat f5deb3 white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32';
const NAMED = new Map();
{ const w = NAMED_HEX.split(' '); for (let i = 0; i < w.length; i += 2) NAMED.set(w[i], w[i + 1]); }

function srgbToOklab(r, g, b) {   // 0..1
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const mm = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return { L: 0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s, a: 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s };
}

function hslToRgb(h, s, l) {   // h in degrees, s and l 0..1
  h = ((h % 360) + 360) % 360;
  const k = (nn) => (nn + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (nn) => l - a * Math.max(-1, Math.min(k(nn) - 3, Math.min(9 - k(nn), 1)));
  return [f(0), f(8), f(4)];
}

// A single colour value → { L, a, b, alpha }, or null (transparent, currentColor, var(), anything else).
export function parseColor(input) {
  const s = String(input).trim().toLowerCase();
  if (!s) return null;
  let rgb = null, alpha = 1;
  let mt = /^#([0-9a-f]{3,8})$/.exec(s);
  if (mt) {
    let h = mt[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    rgb = [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
    if (h.length === 8) alpha = parseInt(h.slice(6, 8), 16) / 255;
  } else if (NAMED.has(s)) {
    const h = NAMED.get(s);
    rgb = [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
  } else if ((mt = /^(rgba?|hsla?|oklch|oklab)\(([^()]*)\)$/.exec(s))) {
    const fn = mt[1];
    const parts = mt[2].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;
    const num = (p, pct) => {
      const x = /^([+-]?(?:\d+\.?\d*|\.\d+))(%|deg)?$/.exec(p);
      if (!x) return NaN;
      return x[2] === '%' ? parseFloat(x[1]) / 100 * pct : parseFloat(x[1]);
    };
    if (parts.length === 4) { const a = num(parts[3], 1); if (Number.isNaN(a)) return null; alpha = Math.max(0, Math.min(1, a)); }
    if (fn.startsWith('rgb')) {
      rgb = parts.slice(0, 3).map((p) => num(p, 255) / 255);
    } else if (fn.startsWith('hsl')) {
      const h = num(parts[0], 360), sat = num(parts[1], 1), lig = num(parts[2], 1);
      rgb = hslToRgb(h, sat > 1 ? sat / 100 : sat, lig > 1 ? lig / 100 : lig);
    } else {
      const L = num(parts[0], 1);
      if (fn === 'oklab') {
        const a = num(parts[1], 0.4), b = num(parts[2], 0.4);
        if ([L, a, b].some(Number.isNaN)) return null;
        return { L, a, b, alpha };
      }
      const C = num(parts[1], 0.4), H = num(parts[2], 360);
      if ([L, C, H].some(Number.isNaN)) return null;
      return { L, a: C * Math.cos(H * Math.PI / 180), b: C * Math.sin(H * Math.PI / 180), alpha };
    }
    if (rgb.some(Number.isNaN)) return null;
    rgb = rgb.map((x) => Math.max(0, Math.min(1, x)));
  } else return null;
  return { ...srgbToOklab(...rgb), alpha };
}

const colorDistance = (p, q) => Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b) + Math.abs(p.alpha - q.alpha) * 0.5;
const SAME_COLOR = 0.012;   // OKLab distance: below this two colours are the same to the eye (#fafafa vs #f9f9f9 is 0.004)
// Pure white and pure black are primitives, not design decisions: they are never reported as copies.
const isPrimitive = (c) => Math.hypot(c.a, c.b) < 0.004 && (c.L > 0.995 || c.L < 0.005);
const RANK = new Set(['palette', 'text', 'font', 'space', 'radius', 'motion']);
const rankOf = (t) => (RANK.has(t.group) ? 0 : 1);
const NEAR_SKIP = new Set(['chart', 'syntax', 'ink-ladder', 'accent-wash']);   // palettes that are not roles to pick from
const NEAR_COLOR = 0.03;    // within this, but not the same: "did you mean"

// '8px', '0.5rem' → px; anything else → null.
export function parseLength(input) {
  const mt = /^([+-]?(?:\d+\.?\d*|\.\d+))(px|rem)$/i.exec(String(input).trim());
  if (!mt) return null;
  return parseFloat(mt[1]) * (mt[2].toLowerCase() === 'rem' ? 16 : 1);
}
function parseTime(input) {
  const mt = /^([+-]?(?:\d+\.?\d*|\.\d+))(ms|s)$/i.exec(String(input).trim());
  return mt ? parseFloat(mt[1]) * (mt[2].toLowerCase() === 's' ? 1000 : 1) : null;
}
function parseBezier(input) {
  const mt = /^cubic-bezier\(\s*([^)]*)\)$/i.exec(String(input).trim());
  if (!mt) return null;
  const v = mt[1].split(/[\s,]+/).filter(Boolean).map(Number);
  return v.length === 4 && v.every((x) => Number.isFinite(x)) ? v : null;
}
const normText = (s) => String(s).toLowerCase().replace(/["']/g, '').replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ').replace(/\b0(?:px|ms|s)\b/g, '0').trim();

/* ------------------------------------------------------------------ names, families, kinds */

// Families of lengths and numbers that are compared with Fire's scales. `size` is deliberately absent (see the header).
const FAMILIES = new Set(['radius', 'space', 'text', 'lh', 'hairline']);

// The family a product token's name belongs to, from its words.
function familyOfName(name) {
  const words = name.replace(/^--/, '').toLowerCase().split(/[-_]+/).filter(Boolean);
  const has = (...ws) => ws.some((w) => words.includes(w));
  if (has('radius', 'rounded', 'corner', 'corners')) return 'radius';
  if (has('hairline', 'hair') || (has('border', 'stroke', 'rule', 'outline', 'line') && has('width', 'w', 'thickness'))) return 'hairline';
  if (has('lh', 'leading') || (has('line') && has('height', 'h'))) return 'lh';
  if (has('weight')) return 'weight';
  if (has('z', 'zindex', 'layer', 'elevation') && !has('shadow')) return 'z';
  if (has('shadow')) return 'shadow';
  if (has('ease', 'easing', 'curve', 'bezier')) return 'ease';
  if (has('dur', 'duration', 'delay', 'time', 'speed')) return 'dur';
  if (has('font') && has('family', 'sans', 'serif', 'mono', 'display', 'body', 'heading')) return 'font';
  if (has('family')) return 'font';
  if (has('fs', 'font', 'text', 'type', 'heading', 'caption') && !has('color', 'colour')) return 'text';
  if (has('space', 'spacing', 'gap', 'pad', 'padding', 'margin', 'gutter', 'inset')) return 'space';
  return null;
}

function fireFamily(t) {
  const n = t.name;
  if (t.type === 'dimension') {
    if (t.group === 'space') return 'space';
    if (t.group === 'radius') return 'radius';
    if (t.group === 'type' && n.startsWith('--fd-text-')) return 'text';
    if (t.group === 'type' && n.startsWith('--fd-lh-')) return 'lh';
    if (n === '--fd-hairline') return 'hairline';
    return null;
  }
  if (t.type === 'number') return n.startsWith('--fd-weight-') ? 'weight' : n.startsWith('--fd-z-') ? 'z' : null;
  if (t.type === 'duration') return 'dur';
  if (t.type === 'cubicBezier') return 'ease';
  if (t.type === 'fontFamily') return 'font';
  if (t.type === 'shadow') return 'shadow';
  return null;
}

// A literal value as { kind, family, ... } or null. `name` is the product token's name (for the family).
function classifyValue(value, name) {
  const v = value.trim();
  if (!v || v.includes('var(') || v.includes(HOLE)) return null;
  const color = parseColor(v);
  if (color) return { kind: 'color', color };
  const fam = familyOfName(name);
  const bz = parseBezier(v);
  if (bz) return { kind: 'ease', family: 'ease', key: bz };
  const ms = parseTime(v);
  if (ms !== null) return { kind: 'dur', family: 'dur', key: ms };
  const px = parseLength(v);
  if (px !== null) return fam && FAMILIES.has(fam) ? { kind: 'len', family: fam, key: px } : null;
  if (/^-?\d+(\.\d+)?$/.test(v) && (fam === 'weight' || fam === 'z')) return { kind: 'num', family: fam, key: Number(v) };
  if (fam === 'font' && /[,"']/.test(v)) return { kind: 'text', family: 'font', key: normText(v) };
  if (fam === 'shadow' && /\d/.test(v) && !/^none$/i.test(v)) return { kind: 'text', family: 'shadow', key: normText(v) };
  return null;
}

/* ------------------------------------------------------------------ the contract */

export function prepareContract(raw) {
  const tokens = new Map();
  const colors = [], lens = [], sizes = [], others = [];
  for (const t of raw.tokens || []) {
    const variants = t.default && typeof t.default === 'object' ? Object.values(t.default) : [t.default];
    const entry = { name: t.name, tier: t.tier, type: t.type, group: t.group, variants, family: fireFamily(t), classes: [] };
    tokens.set(t.name, entry);
    if (t.type === 'color') {
      const cs = variants.map(parseColor);
      if (cs.length && cs.every(Boolean)) { entry.colors = cs; colors.push(entry); }
    } else if (t.type === 'dimension' && t.group === 'size') {
      const px = variants.map(parseLength);
      if (px.every((x) => x !== null)) { entry.px = px; sizes.push(entry); }
    } else if (t.type === 'dimension' && entry.family) {
      const px = variants.map(parseLength);
      if (px.every((x) => x !== null)) { entry.px = px; lens.push(entry); }
    } else if (entry.family) {
      entry.classes = variants.map((v) => classifyValue(v, `--${entry.family}`)).filter(Boolean);
      if (entry.type === 'fontFamily') entry.classes = variants.map((v) => ({ kind: 'text', family: 'font', key: normText(v) }));
      if (entry.type === 'shadow') entry.classes = variants.map((v) => ({ kind: 'text', family: 'shadow', key: normText(v) }));
      if (entry.type === 'duration') entry.classes = variants.map((v) => ({ kind: 'dur', family: 'dur', key: parseTime(v) }));
      if (entry.type === 'cubicBezier') entry.classes = variants.map((v) => ({ kind: 'ease', family: 'ease', key: parseBezier(v) }));
      if (entry.type === 'number') entry.classes = variants.map((v) => ({ kind: 'num', family: entry.family, key: Number(v) }));
      others.push(entry);
    }
  }
  return { tokens, names: [...tokens.keys()], colors, lens, sizes, others, version: raw.contract };
}

/* ------------------------------------------------------------------ names: nearest */

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
function nearestNames(word, candidates, count = 3) {
  const limit = Math.max(2, Math.floor(word.length / 6));
  const ranked = candidates.map((c) => [c, distance(word, c)]).filter(([, d]) => d <= limit).sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1));
  const out = ranked.slice(0, count).map(([c]) => c);
  if (!out.length) {   // share the last word: --fd-color-bg → --fd-bg
    const last = word.split('-').pop();
    for (const c of candidates) if (out.length < count && last.length >= 2 && c.split('-').includes(last)) out.push(c);
  }
  return out;
}
// The longest leading part of the name that is itself a token or a family: --fd-text-muted → --fd-text.
function familyRoot(word, names) {
  const segs = word.split('-').filter(Boolean);   // ['', ...] after the leading --
  for (let k = segs.length - 1; k >= 2; k--) {
    const root = '--' + segs.slice(0, k).join('-');
    if (names.includes(root) || names.some((c) => c.startsWith(root + '-'))) return root;
  }
  return null;
}

/* ------------------------------------------------------------------ selectors */

// Splits at top-level commas: [{ text, at }] with `at` the offset in the prelude.
function splitList(s) {
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i <= s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
    else if ((c === ',' && depth === 0) || i === s.length) { out.push({ text: s.slice(start, i), at: start }); start = i + 1; }
  }
  return out;
}
// The last compound of a complex selector: after the last top-level combinator.
function subjectOf(sel) {
  sel = sel.replace(/\s+$/, '');
  let depth = 0, cut = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0 && (isWs(c) || c === '>' || c === '+' || c === '~')) cut = i + 1;
  }
  return { text: sel.slice(cut), at: cut };
}
const FD_CLASS = /\.(fd-[\w-]+)/;
// fd- classes outside :not()/:is()/:where()/:has() arguments.
function fdClassIn(compound) {
  let depth = 0;
  for (let i = 0; i < compound.length; i++) {
    const c = compound[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
    else if (c === '.' && depth === 0) { const mt = /^\.(fd-[\w-]+)/.exec(compound.slice(i)); if (mt) return { name: mt[1], at: i }; }
  }
  return null;
}

const PLACEMENT = /^(margin(-[a-z]+)*|grid-area|grid-(column|row)(-[a-z]+)?|order|align-self|justify-self|place-self|flex|flex-(grow|shrink|basis)|position|inset(-[a-z]+)*|top|right|bottom|left|z-index|scroll-margin(-[a-z]+)*|(min-|max-)?(width|height|inline-size|block-size))$/;
const SIZE_PROP = /^(min-|max-)?(width|height|inline-size|block-size)$/;
function isPlacement(d) {
  if (d.prop.startsWith('--')) return true;
  if (!PLACEMENT.test(d.prop)) return d.prop === 'display' && /^(none|contents)$/i.test(d.vm);
  if (SIZE_PROP.test(d.prop)) return /^(var\([^)]*\)|\d+%|0|auto|none|fit-content|min-content|max-content|inherit|initial|unset)$/i.test(d.vm) || /^(?:calc|min|max|clamp)\([^]*\bvar\(/.test(d.vm);
  return true;
}

/* ------------------------------------------------------------------ the check */

const COLOR_PROP = /color|^(background|background-image|border(-[a-z]+)*|outline|fill|stroke|box-shadow|text-shadow|filter|text-decoration|column-rule)$/;
const COLOR_FN = /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
const HEX = /(?<![\w&#-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const NOT_A_COLOR = new Set(['transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'revert', 'none']);
const LEN_RE = /(?<![\w.#-])[+-]?(?:\d+\.?\d*|\.\d+)(?:px|rem)(?![\w-])/gi;
const TIME_RE = /(?<![\w.#-])[+-]?(?:\d+\.?\d*|\.\d+)(?:ms|s)(?![\w-])/gi;

// The value with url(...) contents and calc()-style spans that multiply a token blanked, and blocks of balanced parens found.
function blankSpans(v) {
  let out = v.replace(/url\([^)]*\)/gi, (x) => ' '.repeat(x.length));
  const re = /\b(?:calc|min|max|clamp)\(/gi;
  let mt;
  while ((mt = re.exec(out))) {
    let d = 0, j = mt.index + mt[0].length - 1;
    for (; j < out.length; j++) { if (out[j] === '(') d++; else if (out[j] === ')') { d--; if (d === 0) break; } }
    const span = out.slice(mt.index, j + 1);
    if (/\bvar\(/.test(span) && /\*/.test(span.replace(/\bvar\([^)]*\)/g, ''))) {
      out = out.slice(0, mt.index) + ' '.repeat(span.length) + out.slice(j + 1);
    }
  }
  return out;
}

// A function's arguments as text starting at `open` (index of the paren).
function argsAt(s, open) {
  let d = 0;
  for (let j = open; j < s.length; j++) { if (s[j] === '(') d++; else if (s[j] === ')') { d--; if (d === 0) return s.slice(open + 1, j); } }
  return s.slice(open + 1);
}

const PROP_FAMILY = [
  [/^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left|scroll-margin|scroll-padding)(-|$)/, 'space'],
  [/radius/, 'radius'],
  [/^font-size$/, 'text'],
  [/^line-height$/, 'lh'],
  [/^(border|outline|stroke)(-[a-z]+)*-width$|^stroke-width$/, 'hairline'],
];

export function lintFiles(inputs, options = {}) {
  const contract = options.contract;
  const prefixesFor = options.prefixesFor || (() => options.prefixes || []);
  const findings = [];
  const products = new Map();   // name → { name, defs: [{ file, at, value, global, order, prefixed }] }
  const unprefixedSeen = new Set();
  let order = 0;

  const lineStarts = new Map();
  const loc = (file, text, p) => {
    let starts = lineStarts.get(file);
    if (!starts) { starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1); lineStarts.set(file, starts); }
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= p) lo = mid; else hi = mid - 1; }
    return { line: lo + 1, col: p - starts[lo] + 1 };
  };

  const fireNames = contract.names;
  const firstPrefix = (file) => prefixesFor(file)[0] || 'yourprefix';
  const sizeSuggestion = (prop, px, file) => {
    const fam = PROP_FAMILY.find(([re]) => re.test(prop))?.[1] || null;
    const pool = fam ? contract.lens.filter((t) => t.family === fam) : /^(min-|max-)?(width|height|inline-size|block-size)$|^(grid-template|grid-auto|flex-basis|columns)/.test(prop) ? contract.sizes : [...contract.lens.filter((t) => t.family === 'space'), ...contract.sizes];
    let best = null, bd = Infinity;
    for (const t of pool) { const d = Math.abs(t.px[0] - px); if (d < bd) { bd = d; best = t; } }
    if (!best || bd / px > 0.35) return `no Fire token is near ${px}px; define one under your prefix (--${firstPrefix(file)}-…) and use that`;
    const shown = /rem$/.test(best.variants[0]) ? `${best.variants[0]} = ${best.px[0]}px` : best.variants[0];
    return bd === 0 ? `${best.name} is ${shown}` : `the nearest is ${best.name} (${shown})`;
  };
  const durSuggestion = (ms) => {
    let best = null, bd = Infinity;
    for (const t of contract.others) {
      if (t.type !== 'duration') continue;
      const d = Math.abs(t.classes[0].key - ms);
      if (d < bd) { bd = d; best = t; }
    }
    return best ? (bd === 0 ? `${best.name} is ${best.variants[0]}` : `the nearest is ${best.name} (${best.variants[0]})`) : '';
  };
  for (const { file, text } of inputs) {
    const report = (at, rule, message, fix) => findings.push({ file, ...loc(file, text, at), rule, severity: ERRORS.has(rule) ? 'error' : 'warning', message, fix });
    const prefixes = prefixesFor(file);
    const prefixOf = (name) => prefixes.find((p) => name.startsWith(`--${p}-`));

    for (const piece of extractCss(file, text)) {
      const base = piece.base;
      const root = parseCss(piece.text);

      const define = (name, nameAt, value, node) => {
        // --fd-: Fire's own
        if (name.startsWith('--fd-')) {
          if (PARAMS.has(name)) return;
          const t = contract.tokens.get(name);
          if (!t) {
            const rest = name.slice(5);
            report(base + nameAt, 'reserved-prefix', `${name} is not a Fire token: the --fd- prefix is Fire's, and the contract does not list this name`,
              `name your own token under your prefix, as --${firstPrefix(file)}-${rest}; to set a Fire token, check the name against the contract (a theme record sets the inputs)`);
          } else if (t.tier !== 'input') {
            report(base + nameAt, 'token-override', `${name} is a Fire ${t.tier === 'derived' ? 'derived token (Fire computes it from the palette)' : 'scale step'}; setting it here changes it for everything that reads it`,
              t.tier === 'derived' ? 'change the palette inputs in the theme record instead (contract/theme.schema.json); a derived token is never authored'
                : 'put the value in the theme record (contract/theme.schema.json); for one component, set your own token and use it there');
          }
          return;
        }
        if (name.startsWith('--_')) return;
        const pre = prefixOf(name);
        if (!pre && !unprefixedSeen.has(name)) {
          unprefixedSeen.add(name);
          report(base + nameAt, 'unprefixed-token', prefixes.length
            ? `${name} is neither a Fire token nor under your prefix (${prefixes.map((p) => `--${p}-`).join(', ')})`
            : `${name} has no prefix to belong to: no product prefix is declared`,
            prefixes.length ? `rename it ${`--${prefixes[0]}-${name.slice(2)}`}, or add its prefix to "fire": { "prefix": [...] } in package.json`
              : 'declare your prefix, "fire": { "prefix": "acme" } in package.json (or --prefix acme), and name tokens --acme-…');
        }
        let tok = products.get(name);
        if (!tok) products.set(name, tok = { name, defs: [] });
        let scope = node, global = false;
        if (scope.kind === 'rule' && /^(:root|html|:host)$/.test(scope.prelude.trim())) {
          global = true;
          for (let p = scope.parent; p && p.kind !== 'root'; p = p.parent) if (!(p.kind === 'at' && p.name === 'layer')) global = false;
        }
        tok.defs.push({ file, text, at: base + nameAt, value, global, order: order++ });
      };

      const visit = (node, ancestors) => {
        const inProperty = node.kind === 'at' && node.name === 'property';
        const skipValues = node.kind === 'at' && ['font-face', 'property', 'page', 'counter-style', 'font-palette-values', 'view-transition'].includes(node.name);
        if (inProperty) {
          const nm = /--[\w-]+/.exec(node.prelude);
          if (nm) {
            const init = node.decls.find((d) => d.prop === 'initial-value');
            define(nm[0], node.preludeAt + nm.index, init ? init.value : '', node);
          }
        }
        // selectors
        let fdTouch = false, restyle = null;
        if (node.kind === 'rule' && !node.prelude.includes(HOLE)) {
          for (const sel of splitList(node.prelude)) {
            const subj = subjectOf(sel.text);
            const hit = fdClassIn(subj.text);
            if (FD_CLASS.test(sel.text)) fdTouch = true;
            if (hit && !restyle) restyle = { at: node.preludeAt + sel.at + subj.at + hit.at, cls: hit.name };
          }
        }
        if (restyle) {
          const props = [...new Set(node.decls.filter((d) => !isPlacement(d)).map((d) => d.prop))];
          if (props.length) {
            report(base + restyle.at, 'no-fd-class-restyle', `.${restyle.cls} is restyled here (${props.slice(0, 4).join(', ')}${props.length > 4 ? ', …' : ''}): Fire's own CSS owns how it looks`,
              'ask for a variant (a data-* value from the catalogue) or put your own class on a wrapper or on another element; margin, grid-area, order, align-self and width through a token are fine here');
          }
        }
        for (const d of node.decls) {
          const vAt = base + d.valueAt;
          if (d.important && fdTouch) {
            report(base + d.importantAt, 'no-important', '!important on a rule that styles an fd- class makes Fire\'s own rules and its variants stop working',
              'remove it, and fix the specificity with a more specific selector of your own (a wrapper class), or a variant from the catalogue');
          }
          if (inProperty) continue;
          const v = d.vm;
          // var(--fd-…): unknown tokens
          for (const mt of v.matchAll(/var\(\s*(--fd-[\w-]+)/g)) {
            const name = mt[1];
            if (contract.tokens.has(name) || PARAMS.has(name)) continue;
            const near = nearestNames(name, fireNames);
            const root = near.length ? null : familyRoot(name, fireNames);
            report(vAt + mt.index + mt[0].indexOf(name), 'unknown-token', `${name} is not a Fire token`,
              near.length ? `did you mean ${near.join(', ')}? Every token is listed in the contract (fire-design/contract)`
                : root ? `Fire has ${contract.tokens.has(root) ? `${root} and ` : ''}the ${root}-… family, and no token of this name: look the step up in the contract (fire-design/contract), or define your own under your prefix`
                  : 'use a token from the contract (fire-design/contract), or define your own under your prefix');
          }
          if (d.prop.startsWith('--')) {
            if (d.prop.includes(HOLE)) continue;
            define(d.prop, d.propAt, d.value, node);
            continue;
          }
          if (skipValues || !v || v.includes(HOLE) && !/\S/.test(v.replaceAll(HOLE, ''))) continue;
          const vb = blankSpans(v);
          // raw colours (one finding per declaration)
          const colors = [];
          for (const mt of vb.matchAll(HEX)) colors.push({ s: mt[0], at: mt.index });
          for (const mt of vb.matchAll(COLOR_FN)) {
            const args = argsAt(vb, mt.index + mt[0].length - 1);
            if (/\bvar\(/.test(args) || /\bfrom\b/.test(args)) continue;   // built from tokens
            if (mt[1].toLowerCase() === 'color') continue;
            colors.push({ s: `${mt[1]}(${args})`, at: mt.index });
          }
          if (COLOR_PROP.test(d.prop)) {
            for (const mt of vb.matchAll(/(?<![\w$.#-])([a-z]+)(?![\w(-])/gi)) {
              const w = mt[1].toLowerCase();
              if (NAMED.has(w) && !NOT_A_COLOR.has(w) && !/^--/.test(vb.slice(Math.max(0, mt.index - 2), mt.index))) colors.push({ s: mt[1], at: mt.index });
            }
          }
          if (colors.length) {
            colors.sort((p, q) => p.at - q.at);
            const first = colors[0];
                    report(vAt + first.at, 'no-raw-color', `raw colour ${colors.map((c) => c.s).join(', ')} in ${d.prop}`,
              `use a colour token (var(--fd-bg), var(--fd-text), var(--fd-accent), var(--fd-line)…; the contract lists them by group), or define the colour once as a product token (--${firstPrefix(file)}-…: …) and use that`);
          }
          // raw sizes and durations, one finding per declaration
          const lens = [...vb.matchAll(LEN_RE)].filter((mt) => parseFloat(mt[0]) !== 0);
          if (lens.length) {
            const px = parseLength(lens[0][0].replace(/^\+/, ''));
            const hair = Math.abs(px) === 1 && lens[0][0].endsWith('px');
            report(vAt + lens[0].index, 'no-raw-size', `raw size ${lens.map((l) => l[0]).join(', ')} in ${d.prop}`,
              hair ? 'a 1px line is --fd-hairline (it follows the density and the theme); other sizes come from the space, radius, size and text tokens'
                : `use a size token (${sizeSuggestion(d.prop, Math.abs(px), file)})`);
          }
          const times = [...vb.matchAll(TIME_RE)].filter((mt) => parseFloat(mt[0]) !== 0);
          if (times.length) {
            const ms = parseTime(times[0][0]);
            report(vAt + times[0].index, 'no-raw-duration', `raw duration ${times.map((t) => t[0]).join(', ')} in ${d.prop}`,
              `use a duration token, so reduced motion and the motion dial apply: ${durSuggestion(ms)}`);
          }
        }
        for (const c of node.children) visit(c, [...ancestors, node]);
      };
      for (const c of root.children) visit(c, [root]);
      // top-level declarations (a css`` fragment with bare declarations)
      for (const d of root.decls) if (d.prop.startsWith('--')) define(d.prop, d.propAt, d.value, root);
    }
  }

  /* ---------------------------------------------------------------- tokens across files */
  const resolve = (tok, defIdx, depth = 0) => {
    const def = tok.defs[defIdx];
    const v = def.value.trim();
    const mt = /^var\(\s*(--[\w-]+)\s*(?:,[^]*)?\)$/.exec(v);
    if (mt) {
      const target = mt[1];
      if (contract.tokens.has(target)) return { alias: target };
      const p = products.get(target);
      if (p && p.defs.length === 1 && depth < 5) return resolve(p, 0, depth + 1);
      return null;
    }
    return { lit: classifyValue(v, tok.name) };
  };
  const reportAt = (def, rule, message, fix) => findings.push({ file: def.file, ...loc(def.file, def.text, def.at), rule, severity: ERRORS.has(rule) ? 'error' : 'warning', message, fix });
  const same = (p, q) => {
    if (p.kind !== q.kind || p.family !== q.family) return false;
    if (p.kind === 'color') return colorDistance(p.color, q.color) <= SAME_COLOR;
    if (p.kind === 'len') return Math.abs(p.key - q.key) < 0.01;
    if (p.kind === 'dur') return Math.abs(p.key - q.key) < 0.5;
    if (p.kind === 'ease') return p.key.every((x, i) => Math.abs(x - q.key[i]) < 1e-6);
    if (p.kind === 'num') return p.key === q.key;
    return p.key === q.key;
  };
  const uniq = (list) => { const out = []; for (const x of list) if (!out.some((y) => same(x, y))) out.push(x); return out; };

  const lits = [];   // product tokens fully resolved to literals
  const flagged = new Set();
  for (const tok of products.values()) {
    const name = tok.name;
    const resolved = tok.defs.map((_, i) => resolve(tok, i));
    const first = tok.defs[0];
    // a bare alias of a Fire token, defined once on :root
    if (tok.defs.length === 1 && resolved[0]?.alias && tok.defs[0].global && !tok.defs[0].value.includes(',')) {
      reportAt(first, 'duplicate-token', `${name} is only another name for ${resolved[0].alias}: defined once on :root, with no other definition for a scope or a colour scheme`,
        `use var(${resolved[0].alias}) where you need it. An alias is fine when it carries a role Fire lacks and is re-defined somewhere (per scope, or per colour scheme in [data-theme=dark]); this one is neither`);
      flagged.add(name); continue;
    }
    if (resolved.some((r) => !r || !r.lit)) continue;
    const vals = uniq(resolved.map((r) => r.lit));
    const kind = vals[0].kind;
    if (!vals.every((x) => x.kind === kind && x.family === vals[0].family)) continue;
    lits.push({ tok, vals });
    let pool = [];
    if (kind === 'color') {
      if (vals.every((x) => isPrimitive(x.color))) continue;
      pool = contract.colors.filter((t) => {
        const fv = t.colors;
        return vals.every((x) => fv.some((y) => colorDistance(x.color, y) <= SAME_COLOR)) && fv.every((y) => vals.some((x) => colorDistance(x.color, y) <= SAME_COLOR));
      });
    } else if (kind === 'len') {
      pool = contract.lens.filter((t) => t.family === vals[0].family && vals.length === 1 && t.px.length === 1 && Math.abs(t.px[0] - vals[0].key) < 0.01);
    } else {
      pool = contract.others.filter((t) => vals.length === t.classes.length && t.classes.length && vals.every((x) => t.classes.some((y) => same(x, y))));
      if (kind === 'text' || kind === 'num' || kind === 'dur' || kind === 'ease') pool = pool.filter((t) => t.family === vals[0].family);
    }
    pool = pool.map((t, i) => [t, i]).sort((x, y) => rankOf(x[0]) - rankOf(y[0]) || x[1] - y[1]).map(([t]) => t);
    if (pool.length) {
      const names = pool.slice(0, 3).map((t) => t.name);
      const redefined = tok.defs.length > 1;
      reportAt(first, 'duplicate-token', `${name} has the same value as ${names.join(', ')}${pool.length > 3 ? ` (and ${pool.length - 3} more)` : ''}${redefined ? ' in every scope it is defined in' : ''}`,
        `use ${names[0]} instead of ${name}. A token of your own is worth it only for a role Fire lacks, with a value that differs in some scope or colour scheme`);
      flagged.add(name); continue;
    }
    // near a Fire token
    if (tok.defs.length === 1) {
      if (kind === 'color' && !isPrimitive(vals[0].color)) {
        const c = vals[0].color;
        let best = null, bd = Infinity, which = '', bk = Infinity;
        for (const t of contract.colors) {
          if (NEAR_SKIP.has(t.group)) continue;
          t.colors.forEach((y, i) => {
            const d = colorDistance(c, y);
            const key = (d <= SAME_COLOR ? 0 : d) + rankOf(t) * 1e-4;   // among the same colour, a palette token comes first
            if (key < bk) { bk = key; bd = d; best = t; which = t.colors.length > 1 ? (i === 0 ? ' in light mode' : ' in dark mode') : ''; }
          });
        }
        if (best && bd <= NEAR_COLOR) {
          reportAt(first, 'near-token', `${name} is ${bd <= SAME_COLOR ? 'the same as' : 'close to'} ${best.name}${which}`,
            `did you mean ${best.name}? ${best.colors.length > 1 ? 'It also adapts to the other colour scheme. ' : ''}If the difference is on purpose, keep ${name} and give it a role of its own`);
        }
      } else if (kind === 'len') {
        const near = contract.lens.filter((t) => t.family === vals[0].family && t.px.length === 1 && Math.abs(t.px[0] - vals[0].key) > 0.01 && Math.abs(t.px[0] - vals[0].key) <= 1.0001);
        if (near.length) {
          reportAt(first, 'near-token', `${name} is ${tok.defs[0].value.trim()}, one pixel from ${near.map((t) => `${t.name} (${t.variants[0]})`).slice(0, 2).join(' or ')}`,
            `did you mean ${near[0].name}? If the difference is on purpose, keep ${name} and give it a role of its own`);
        }
      }
    }
  }
  // two product tokens with the same value
  const done = new Set();
  lits.sort((a, b) => a.tok.defs[0].order - b.tok.defs[0].order);
  for (let i = 0; i < lits.length; i++) {
    for (let j = i + 1; j < lits.length; j++) {
      const a = lits[i], b = lits[j];
      if (flagged.has(b.tok.name) || done.has(b.tok.name)) continue;
      if (a.vals.length !== b.vals.length || a.vals[0].kind !== b.vals[0].kind || a.vals[0].family !== b.vals[0].family) continue;
      if (!a.vals.every((x) => b.vals.some((y) => same(x, y)))) continue;
      if (a.vals.every((x) => x.kind === 'color' && isPrimitive(x.color))) continue;
      done.add(b.tok.name);
      reportAt(b.tok.defs[0], 'duplicate-token', `${b.tok.name} has the same value as ${a.tok.name}`,
        `keep one. If they are two roles, give them different values in some scope or colour scheme; as a single alias of ${a.tok.name} it would be a duplicate again`);
    }
  }

  findings.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) || a.line - b.line || a.col - b.col);
  return findings;
}

// One file, one contract. Prefixes: options.prefixes.
export function lintText(file, text, contract, options = {}) {
  const c = contract.tokens instanceof Map ? contract : prepareContract(contract);
  return lintFiles([{ file, text }], { ...options, contract: c });
}

/* ------------------------------------------------------------------ files and CLI */

export const isInput = (f) => /\.(css|html?|vue|[cm]?[jt]sx?)$/i.test(f);

function globToRegExp(g) {
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') { i++; if (g[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*'; } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') re += '(?:';
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
      for (const f of all) if (re.test(f.split(path.sep).join('/')) && isInput(f)) files.add(f);
    } else if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      const all = []; walk(abs, all);
      for (const f of all) if (isInput(f) && !/\.d\.ts$/.test(f)) files.add(f);
    } else if (fs.existsSync(abs)) files.add(abs);
    else console.error(`lint-css: no such file: ${input}`);
  }
  return [...files].sort();
}

export function findContract(explicit) {
  if (explicit) return path.resolve(explicit);
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const base of [path.join(process.cwd(), 'noop.js'), fileURLToPath(import.meta.url)]) {
    try { return createRequire(base).resolve('fire-design/contract'); } catch { /* next */ }
  }
  return path.resolve(here, '../contract/fire-contract.json');
}

// `"fire": { "prefix": "acme" }` (or a list) in the nearest package.json above a file.
const pkgCache = new Map();
export function packagePrefixes(file) {
  let dir = path.dirname(path.resolve(file));
  for (;;) {
    if (pkgCache.has(dir)) return pkgCache.get(dir);
    const p = path.join(dir, 'package.json');
    if (fs.existsSync(p)) {
      let out = [];
      try { const pre = JSON.parse(fs.readFileSync(p, 'utf8'))?.fire?.prefix; out = (Array.isArray(pre) ? pre : pre ? [pre] : []).map(normPrefix).filter(Boolean); } catch { /* none */ }
      pkgCache.set(dir, out);
      return out;
    }
    const up = path.dirname(dir);
    if (up === dir) return [];
    dir = up;
  }
}
export const normPrefix = (p) => String(p).trim().replace(/^-+/, '').replace(/-+$/, '');

function main(argv) {
  let contractPath = null, json = false;
  const flagPrefixes = [];
  const inputs = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--contract') contractPath = argv[++i];
    else if (a.startsWith('--contract=')) contractPath = a.slice(11);
    else if (a === '--prefix') flagPrefixes.push(normPrefix(argv[++i] || ''));
    else if (a.startsWith('--prefix=')) flagPrefixes.push(normPrefix(a.slice(9)));
    else if (a === '-h' || a === '--help') { console.log('usage: node scripts/lint-css.mjs [--contract path] [--prefix name]… [--json] <files, directories or globs…>'); return 0; }
    else if (a.startsWith('--')) { console.error(`lint-css: unknown option ${a}`); return 2; }
    else inputs.push(a);
  }
  if (!inputs.length) { console.error('lint-css: no input files'); return 2; }
  const cpath = findContract(contractPath);
  let contract;
  try { contract = prepareContract(JSON.parse(fs.readFileSync(cpath, 'utf8'))); } catch (e) {
    console.error(`lint-css: cannot read the contract ${cpath}: ${e.message}`); return 2;
  }
  const files = expandInputs(inputs);
  const loaded = files.map((f) => ({ abs: f, file: path.relative(process.cwd(), f) || f, text: fs.readFileSync(f, 'utf8') }));
  const prefixesFor = (rel) => {
    const f = loaded.find((x) => x.file === rel);
    return [...new Set([...flagPrefixes.filter(Boolean), ...packagePrefixes(f ? f.abs : rel)])];
  };
  const findings = lintFiles(loaded.map(({ file, text }) => ({ file, text })), { contract, prefixesFor });
  const errors = findings.filter((x) => x.severity === 'error').length;
  const warnings = findings.length - errors;
  if (json) {
    console.log(JSON.stringify({ contract: cpath, files: files.length, errors, warnings, findings }, null, 2));
  } else {
    for (const x of findings) console.log(`${x.file}:${x.line}:${x.col}  ${x.severity}  ${x.rule}  ${x.message}\n    fix: ${x.fix}`);
    console.log(`${files.length} file${files.length === 1 ? '' : 's'} checked, ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`);
  }
  return errors ? 1 : 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  process.exit(main(process.argv.slice(2)));
}
