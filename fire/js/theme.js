/* Fire theme — the theme record and its expander.
 *
 * Pure ES module: no DOM, importable from Node and from the browser. A product's look is one JSON record (the
 * theme record); this module validates it, turns it into tokens and attributes, writes it as a stylesheet, builds a
 * palette from an accent or from brand colours, and converts between the record and the Tweaks panel's state.
 * The schema is contract/theme.schema.json; validateTheme() applies the same rules without a schema library.
 *
 * The record, version 1 (every field optional; a missing field is Fire's default; an unknown field is an error):
 *   {
 *     "contract": "fire/1",
 *     "fire": "0.6.1",                          the Fire release the record was written against (optional; pins the expander)
 *     "palette": "ember",                       a palette name, or a spec (below)
 *     "tone": { "hue": 0, "vivid": 100, "light": 0, "warmth": 0 },
 *     "type": "geist",                          a type set name, or { "display", "sans", "mono" } families the page loads
 *     "dials": { "corners": 1, "density": "comfortable", "lines": 1, "textSize": "md",
 *                "contrast": "default", "motion": "default", "texture": 1 }
 *   }
 *   Palette specs:
 *     { "from": "accent", "accent": "#1f6feb", "neutral"?: "pure" | "cool" | "warm" | "tinted" | <hue°>, "on"?: "white" | "dark" }
 *     { "from": "brand", "colors": ["#14342b", "#f2c14e"] }            1–3 colours
 *     { "hue", "tint", "ink", "accent", "on", "L"?, "surfaceTint"? }   the spec form fire/js/palettes.js uses
 *
 * The dials map to exactly what the Tweaks panel sets (fire/js/tweaks.js inlineProps and apply):
 *   corners   0…2     --fd-radius-scale          lines     1 · 1.5 · 2      --fd-hairline (px)
 *   motion    off · default · slow → --fd-motion 0 · 1 · 1.75
 *   texture   0…1.5   --fd-texture               density   compact · comfortable · spacious → data-density
 *   textSize  sm · md · lg → data-text-size      contrast  default · high → data-contrast="high"
 *   A named palette is data-palette; a toned or generated palette is written out as its nineteen colour tokens.
 *   A type set is data-type; families are written to --fd-font-display, --fd-font-sans and --fd-font-mono.
 *   Defaults leave no trace: no attribute, no token. The light / dark / system choice is the viewer's, not the
 *   look's, so a record has no theme field.
 *
 * API
 *   CONTRACT                     'fire/1'
 *   FIRE_VERSION                 the Fire release this module belongs to (a test keeps it equal to package.json)
 *   DEFAULT_RECORD               the full record of Fire's default look
 *   INPUT_TOKENS                 the tokens a record sets: the palette's colours, the three families, the dial variables
 *   expandTheme(record)          → { tokens: { name: [light, dark] | value }, attributes: { 'data-palette': … }, notes }
 *   themeToCss(record, { selector = ':root' })   → a stylesheet string (with the attributes to set, in its comment)
 *   paletteFrom(spec)            → { name, label, note, tokens, contrast, spec, notes }, the same form as the presets
 *   validateTheme(record)        → { ok, errors, notes }
 *   toThemeRecord(tweaksState)   → a full record (the theme choice is dropped)
 *   fromThemeRecord(record)      → a Tweaks state for tweaks.set() (named palettes and type sets only)
 */
import {
  PALETTES, PALETTE_TOKENS, DEFAULT_PALETTE, TONE_DEFAULT, TONE_RANGE, isDefaultTone, paletteTokens, toneTokens,
  cssValue, contrast, toOklch, oklch, expandSpec, shift, nearBlack,
} from './palettes.js';
import { TYPEFACES, DEFAULT_TYPEFACE } from './typefaces.js';
import { paletteFailures } from './palette-rules.js';

/* ==========================================================================
   The record's vocabulary
   ========================================================================== */

export const CONTRACT = 'fire/1';
export const DIAL_DEFAULTS = Object.freeze({
  corners: 1, density: 'comfortable', lines: 1, textSize: 'md', contrast: 'default', motion: 'default', texture: 1,
});
export const DIAL_CHOICES = Object.freeze({
  density: ['compact', 'comfortable', 'spacious'],
  lines: [1, 1.5, 2],
  textSize: ['sm', 'md', 'lg'],
  contrast: ['default', 'high'],
  motion: ['off', 'default', 'slow'],
});
export const DIAL_RANGES = Object.freeze({ corners: [0, 2], texture: [0, 1.5] });
export const MOTION = Object.freeze({ off: 0, default: 1, slow: 1.75 });
export const FONT_TOKENS = Object.freeze({ display: '--fd-font-display', sans: '--fd-font-sans', mono: '--fd-font-mono' });
export const DIAL_TOKENS = Object.freeze({ corners: '--fd-radius-scale', lines: '--fd-hairline', motion: '--fd-motion', texture: '--fd-texture' });
/* Every token a record can set: the palette's colour inputs, the three families and the dial variables
   (--fd-space-scale is density's: data-density sets it with the control sizes). */
export const INPUT_TOKENS = Object.freeze([
  ...PALETTE_TOKENS, '--fd-font-display', '--fd-font-sans', '--fd-font-mono',
  '--fd-space-scale', '--fd-radius-scale', '--fd-hairline', '--fd-motion', '--fd-texture',
]);
export const NEUTRALS = Object.freeze(['pure', 'cool', 'warm', 'tinted']);
export const LABELS = Object.freeze(['white', 'dark']);
export const FIRE_VERSION = '0.6.1';

export const DEFAULT_RECORD = Object.freeze({
  contract: CONTRACT, palette: DEFAULT_PALETTE, tone: TONE_DEFAULT, type: DEFAULT_TYPEFACE, dials: DIAL_DEFAULTS,
});

const PALETTE_NAMES = PALETTES.map((p) => p.name);
const TYPE_NAMES = TYPEFACES.map((t) => t.name);
const SPEC_STEPS = ['bg', 'bgSunken', 'surface', 'raised', 'lineFaint', 'line', 'lineStrong', 'ink'];
/* The fallbacks tokens.css puts behind Geist and Geist Mono. */
const SANS_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/* ==========================================================================
   Validation (the same rules as contract/theme.schema.json, plus Fire's lists)
   ========================================================================== */

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
/* A family name, quoted in CSS: letters, digits, spaces and . _ & + ' - (no quotes, slashes or braces). */
const FAMILY = /^[\p{L}\p{N}][\p{L}\p{N} '._&+-]{0,63}$/u;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const inRange = (v, [min, max]) => isNum(v) && v >= min && v <= max;
const list = (values) => values.map((v) => JSON.stringify(v)).join(', ');

function only(obj, allowed, path, errors) {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) errors.push(`${path}/${k}: unknown field`);
}

function checkPalette(v, errors) {
  const P = '/palette';
  if (typeof v === 'string') {
    if (!PALETTE_NAMES.includes(v)) errors.push(`${P}: unknown palette ${JSON.stringify(v)} (one of ${PALETTE_NAMES.join(', ')})`);
    return;
  }
  if (!isObj(v)) { errors.push(`${P}: must be a palette name or a palette spec`); return; }
  if (v.from === 'accent') {
    only(v, ['from', 'accent', 'neutral', 'on'], P, errors);
    if (!HEX.test(v.accent ?? '')) errors.push(`${P}/accent: must be a hex colour (#rgb or #rrggbb)`);
    if (v.neutral !== undefined && !NEUTRALS.includes(v.neutral) && !inRange(v.neutral, [0, 360])) errors.push(`${P}/neutral: must be one of ${list(NEUTRALS)} or a hue from 0 to 360`);
    if (v.on !== undefined && !LABELS.includes(v.on)) errors.push(`${P}/on: must be one of ${list(LABELS)}`);
  } else if (v.from === 'brand') {
    only(v, ['from', 'colors'], P, errors);
    if (!Array.isArray(v.colors) || v.colors.length < 1 || v.colors.length > 3) errors.push(`${P}/colors: must be a list of 1 to 3 hex colours`);
    else v.colors.forEach((c, i) => { if (typeof c !== 'string' || !HEX.test(c)) errors.push(`${P}/colors/${i}: must be a hex colour (#rgb or #rrggbb)`); });
  } else if (v.from === undefined) {
    only(v, ['hue', 'tint', 'ink', 'accent', 'on', 'L', 'surfaceTint'], P, errors);
    for (const k of ['hue', 'tint', 'ink', 'accent', 'on']) if (v[k] === undefined) errors.push(`${P}/${k}: required in a full palette spec (or give "from": "accent" or "brand")`);
    if (v.hue !== undefined && !inRange(v.hue, [0, 360])) errors.push(`${P}/hue: must be a hue from 0 to 360`);
    if (v.tint !== undefined && !(Array.isArray(v.tint) && v.tint.length === 2 && v.tint.every((t) => inRange(t, [0, 0.04])))) errors.push(`${P}/tint: must be [light, dark] chroma, each from 0 to 0.04`);
    if (v.ink !== undefined) {
      if (!isObj(v.ink)) errors.push(`${P}/ink: must be { c, h? }`);
      else {
        only(v.ink, ['c', 'h'], `${P}/ink`, errors);
        if (!inRange(v.ink.c, [0, 0.04])) errors.push(`${P}/ink/c: must be a chroma from 0 to 0.04`);
        if (v.ink.h !== undefined && !inRange(v.ink.h, [0, 360])) errors.push(`${P}/ink/h: must be a hue from 0 to 360`);
      }
    }
    if (v.accent !== undefined && v.accent !== 'ink' && !(Array.isArray(v.accent) && v.accent.length >= 1 && v.accent.length <= 2 && v.accent.every((c) => typeof c === 'string' && HEX.test(c)))) errors.push(`${P}/accent: must be "ink" or [light, dark?] hex colours`);
    const ON = ['white', 'dark', 'inverse'];
    if (v.on !== undefined && !ON.includes(v.on) && !(Array.isArray(v.on) && v.on.length === 2 && v.on.every((o) => ON.includes(o)))) errors.push(`${P}/on: must be one of ${list(ON)} or a [light, dark] pair of them`);
    if (v.L !== undefined) {
      if (!isObj(v.L)) errors.push(`${P}/L: must be { step: [light, dark] }`);
      else {
        only(v.L, SPEC_STEPS, `${P}/L`, errors);
        for (const [k, pair] of Object.entries(v.L)) {
          if (SPEC_STEPS.includes(k) && !(Array.isArray(pair) && pair.length === 2 && pair.every((x) => x === null || inRange(x, [0, 1])))) errors.push(`${P}/L/${k}: must be [light, dark], each a lightness from 0 to 1 or null`);
        }
      }
    }
    if (v.surfaceTint !== undefined && !inRange(v.surfaceTint, [0, 1])) errors.push(`${P}/surfaceTint: must be a number from 0 to 1`);
  } else {
    errors.push(`${P}/from: must be "accent" or "brand" (or leave it out for a full spec)`);
  }
}

function checkType(v, errors, notes) {
  const P = '/type';
  if (typeof v === 'string') {
    if (!TYPE_NAMES.includes(v)) errors.push(`${P}: unknown type set ${JSON.stringify(v)} (one of ${TYPE_NAMES.join(', ')})`);
    return;
  }
  if (!isObj(v)) { errors.push(`${P}: must be a type set name or { display, sans, mono } families`); return; }
  only(v, Object.keys(FONT_TOKENS), P, errors);
  const given = Object.keys(FONT_TOKENS).filter((k) => v[k] !== undefined);
  if (!given.length) errors.push(`${P}: name at least one of display, sans, mono`);
  for (const k of given) if (typeof v[k] !== 'string' || !FAMILY.test(v[k])) errors.push(`${P}/${k}: must be a font family name (letters, digits, spaces and . _ & + ' -, up to 64)`);
  const families = [...new Set(given.map((k) => v[k]).filter((f) => typeof f === 'string' && FAMILY.test(f)))];
  if (families.length) notes.push(`The page must load ${families.join(', ')} (an @font-face for each): Fire ships only the families of its type sets.`);
}

/** Check a record against the schema's rules and Fire's palette and type set lists. */
export function validateTheme(record) {
  const errors = [];
  const notes = [];
  if (!isObj(record)) return { ok: false, errors: ['(record): must be an object'], notes };
  only(record, ['contract', 'fire', 'palette', 'tone', 'type', 'dials'], '', errors);
  if (record.contract !== undefined && record.contract !== CONTRACT) errors.push(`/contract: must be ${JSON.stringify(CONTRACT)}`);
  if (record.fire !== undefined && !(typeof record.fire === 'string' && /^\d+\.\d+\.\d+$/.test(record.fire))) errors.push('/fire: must be a Fire release, such as "0.6.0"');
  if (record.palette !== undefined) checkPalette(record.palette, errors);
  if (record.tone !== undefined) {
    if (!isObj(record.tone)) errors.push('/tone: must be { hue, vivid, light, warmth }');
    else {
      only(record.tone, Object.keys(TONE_DEFAULT), '/tone', errors);
      for (const k of Object.keys(TONE_DEFAULT)) {
        const v = record.tone[k];
        if (v !== undefined && !(Number.isInteger(v) && inRange(v, TONE_RANGE[k]))) errors.push(`/tone/${k}: must be a whole number from ${TONE_RANGE[k][0]} to ${TONE_RANGE[k][1]}`);
      }
    }
  }
  if (record.type !== undefined) checkType(record.type, errors, notes);
  if (record.dials !== undefined) {
    if (!isObj(record.dials)) errors.push('/dials: must be an object');
    else {
      only(record.dials, Object.keys(DIAL_DEFAULTS), '/dials', errors);
      for (const [k, choices] of Object.entries(DIAL_CHOICES)) {
        const v = record.dials[k];
        if (v !== undefined && !choices.includes(v)) errors.push(`/dials/${k}: must be one of ${list(choices)}`);
      }
      for (const [k, range] of Object.entries(DIAL_RANGES)) {
        const v = record.dials[k];
        if (v !== undefined && !inRange(v, range)) errors.push(`/dials/${k}: must be a number from ${range[0]} to ${range[1]}`);
      }
    }
  }
  return { ok: errors.length === 0, errors, notes };
}

function assertValid(record) {
  const result = validateTheme(record);
  if (!result.ok) throw new TypeError(`[theme] invalid theme record:\n  ${result.errors.join('\n  ')}`);
  return result;
}

/** The record with every missing field set to Fire's default. */
function complete(record) {
  return {
    contract: CONTRACT,
    palette: record.palette ?? DEFAULT_PALETTE,
    tone: { ...TONE_DEFAULT, ...(record.tone || {}) },
    type: record.type ?? DEFAULT_TYPEFACE,
    dials: { ...DIAL_DEFAULTS, ...(record.dials || {}) },
  };
}

/* ==========================================================================
   paletteFrom: an accent or brand colours → a palette that passes every preset rule
   ========================================================================== */

const WHITE = '#ffffff';
const LABEL_MIN = 4.5;
/* The dark-mode accent is also the focus ring and the switch track: it reaches 3:1 on the dark page (WCAG 1.4.11). */
const NONTEXT_MIN = 3;
const CHROMATIC = 0.02; // below this chroma a colour reads as grey and has no useful hue
const isLight = (hex) => toOklch(hex)[0] > 0.6; // the test palettes.js uses for a light label
const hexOf = (hex) => {
  const s = hex.toLowerCase();
  return s.length === 4 ? `#${[...s.slice(1)].map((c) => c + c).join('')}` : s;
};
const r2 = (n) => n.toFixed(2);

/* Neutral temperatures, in the presets' own amounts: tint is the page chroma [light, dark], ink the light-mode
   ink's chroma (and hue, when it leans away from the neutral). Cool is ocean's, warm sits between honey and clay,
   tinted takes the accent's hue at the presets' typical strength. */
function neutralSpec(neutral, accentHue) {
  if (neutral === 'pure') return { hue: 0, tint: [0, 0], ink: { c: 0 } };
  if (neutral === 'cool') return { hue: 250, tint: [0.006, 0.013], ink: { c: 0.018 } };
  if (neutral === 'warm') return { hue: 70, tint: [0.009, 0.011], ink: { c: 0.018, h: 55 } };
  const hue = neutral === 'tinted' ? accentHue : neutral;
  return { hue: Math.round(hue * 10) / 10, tint: [0.007, 0.012], ink: { c: 0.016 } };
}
const neutralName = (n) => (typeof n === 'number' ? `neutrals at hue ${Math.round(n)}°` : `${n} neutrals`);

/* Brand colours → an accent and a neutral temperature.
   The accent is the colour that works best as a fill: the most chromatic, discounted for being very dark or very
   light (score = chroma × (1 − |L − 0.62|)); a tie goes to the colour listed first. When every colour is grey, the
   first one listed is the accent (a monochrome brand).
   The neutrals lean toward the hue of the darkest remaining chromatic colour (a brand's dark colour is usually its
   ink and its backgrounds); when the remaining colours are all grey, black or white, the neutrals are pure grey;
   with a single colour they are tinted toward the accent's own hue. */
function fromBrand(colors) {
  const items = colors.map((hex, i) => { const [L, C, h] = toOklch(hexOf(hex)); return { hex: hexOf(hex), L, C, h, i }; });
  const chromatic = items.filter((c) => c.C >= CHROMATIC);
  const score = (c) => c.C * (1 - Math.abs(c.L - 0.62));
  const accent = chromatic.length ? chromatic.reduce((a, b) => (score(b) > score(a) ? b : a)) : items[0];
  const rest = items.filter((c) => c !== accent);
  const restChromatic = rest.filter((c) => c.C >= CHROMATIC);
  let neutral;
  let why;
  if (!rest.length) { neutral = accent.C >= CHROMATIC ? 'tinted' : 'pure'; why = neutral === 'tinted' ? 'neutrals tinted toward it' : 'pure grey neutrals'; }
  else if (!restChromatic.length) { neutral = 'pure'; why = `pure grey neutrals (${rest.map((c) => c.hex).join(', ')} ${rest.length > 1 ? 'are' : 'is'} grey)`; }
  else {
    const ink = restChromatic.reduce((a, b) => (b.L < a.L ? b : a));
    neutral = Math.round(ink.h * 10) / 10;
    why = `neutrals toward ${ink.hex} (hue ${Math.round(ink.h)}°)`;
  }
  const how = chromatic.length ? (colors.length > 1 ? 'the brand colour that works best as a fill' : 'the brand colour') : 'every brand colour is grey, so the first';
  return { accent: accent.hex, neutral, note: `Brand: accent ${accent.hex} (${how}); ${why}.` };
}

/** The dark-mode accent: a little lighter than the light one (as the presets are), never so light that a preferred
 *  white label drops under 4.5:1, then lifted until it reaches 3:1 on the dark page. */
function darkAccentFor(light, preferWhite, darkBg) {
  let lift = 0.05;
  let dark = shift(light, lift);
  if (preferWhite) while (lift > 0 && contrast(WHITE, dark) < LABEL_MIN + 0.05) { lift = Math.max(0, lift - 0.005); dark = shift(light, lift); }
  if (contrast(dark, darkBg) < NONTEXT_MIN) {
    const [L, C, h] = toOklch(dark);
    let lo = L;
    let hi = 0.98;
    if (contrast(oklch(hi, C, h), darkBg) >= NONTEXT_MIN + 0.02) {
      for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (contrast(oklch(mid, C, h), darkBg) >= NONTEXT_MIN + 0.02) hi = mid; else lo = mid; }
      dark = oklch(hi, C, h);
    }
  }
  return dark;
}

/** The colour nearest `hex` in OKLCH lightness (chroma and hue kept, gamut-mapped) for which ok() holds. */
function nearestPassing(hex, ok) {
  if (ok(hex)) return hex;
  const [L, C, h] = toOklch(hex);
  const tried = new Set([hex]);
  for (let k = 1; k <= 400; k++) {
    for (const sign of [-1, 1]) {
      const l = L + sign * k * 0.0025;
      if (l < 0.02 || l > 0.99) continue;
      const c = oklch(l, C, h);
      if (tried.has(c)) continue;
      tried.add(c);
      if (ok(c)) return c;
    }
  }
  return null;
}

/* Failures that come from the accent (label, hover, accent text, text over the accent wash) and from the neutrals. */
const ACCENT_FAILURE = /accent|label|wash\//;
const strip = (msg) => msg.replace(/^palette (light|dark)(?: high contrast)?: /, '');

/** A palette spec in any of its three forms → a palette in the presets' form, held to the presets' rules. */
export function paletteFrom(input) {
  const result = validateTheme({ palette: input });
  if (!result.ok) throw new TypeError(`[theme] invalid palette spec:\n  ${result.errors.join('\n  ')}`);
  if (typeof input === 'string') throw new TypeError('[theme] paletteFrom takes a spec; use getPalette(name) for a preset');
  const notes = [];
  let spec;
  let label = null;         // a label the request asked for explicitly: it must be honoured in light mode
  let derivedDark = false;  // the dark accent is ours to derive (and to move without a note)
  let summary;

  if (input.from === 'accent' || input.from === 'brand') {
    let accent;
    let neutral;
    if (input.from === 'brand') {
      const b = fromBrand(input.colors);
      ({ accent, neutral } = b);
      notes.push(b.note);
    } else {
      accent = hexOf(input.accent);
      neutral = input.neutral ?? 'tinted';
      label = input.on ?? null;
    }
    const [, C, h] = toOklch(accent);
    if (neutral === 'tinted' && C < CHROMATIC) { neutral = 'pure'; if (input.from === 'accent') notes.push(`${accent} has no hue to tint the neutrals with, so they are pure grey.`); }
    // The label: the one asked for, else whichever of white and the tinted near-black reads better on the accent.
    const on = label ?? (contrast(WHITE, accent) >= contrast(nearBlack(accent), accent) ? 'white' : 'dark');
    spec = { ...neutralSpec(neutral, h), accent: [accent], on };
    derivedDark = true;
    summary = `From ${input.from === 'brand' ? `brand colours ${input.colors.map(hexOf).join(', ')}` : `accent ${accent}`}, ${neutralName(neutral)}.`;
  } else {
    spec = JSON.parse(JSON.stringify(input));
    if (Array.isArray(spec.accent)) spec.accent = spec.accent.map(hexOf);
    derivedDark = Array.isArray(spec.accent) && spec.accent.length === 1;
    summary = `From a palette spec at hue ${spec.hue}°.`;
  }

  // 1. Neutrals: the page, surfaces, lines and ink must pass on their own. A full spec may ask for more than they
  //    can carry: drop its lightness overrides first, then reduce its tint until they pass.
  const neutralFailures = (s) => paletteFailures(expandSpec({ ...s, accent: s.accent === 'ink' ? 'ink' : [s.accent[0], s.accent[1] ?? s.accent[0]] }).tokens).filter((m) => !ACCENT_FAILURE.test(m));
  let nf = neutralFailures(spec);
  if (nf.length && spec.L) {
    notes.push(`The lightness overrides were dropped: ${strip(nf[0])}.`);
    delete spec.L;
    nf = neutralFailures(spec);
  }
  if (nf.length) {
    const from = [...spec.tint];
    for (let i = 0; i < 40 && nf.length; i++) {
      spec.tint = spec.tint.map((t) => t * 0.85);
      spec.ink = { ...spec.ink, c: spec.ink.c * 0.85 };
      nf = neutralFailures(spec);
    }
    if (nf.length) { spec.tint = [0, 0]; spec.ink = { ...spec.ink, c: 0 }; }
    notes.push(`The neutral tint was reduced from ${from.map((t) => t.toFixed(4)).join('/')} to ${spec.tint.map((t) => t.toFixed(4)).join('/')} so the text steps pass.`);
  }

  if (spec.accent !== 'ink') {
    const darkBg = expandSpec({ ...spec, accent: [spec.accent[0], spec.accent[0]] }).tokens['--fd-bg'][1];
    // As palettes.js does: a white label that cannot reach 4.5:1 on the light accent gives way to near-black.
    const preferWhite = (light) => (Array.isArray(spec.on) ? spec.on[1] : spec.on) === 'white' && contrast(WHITE, light) >= LABEL_MIN;
    const darkOf = (light) => (derivedDark ? darkAccentFor(light, preferWhite(light), darkBg) : spec.accent[1]);
    const build = (light, dark = darkOf(light)) => expandSpec({ ...spec, accent: [light, dark] });

    // 2. The light accent: the requested colour, or the nearest in lightness that passes in light mode (and wears
    //    the label the request asked for).
    const lightProblem = (hex) => {
      const p = build(hex, hex);
      const f = paletteFailures(p.tokens, { modes: [0] });
      if (f.length) return strip(f[0]);
      if (label && isLight(p.tokens['--fd-accent-contrast'][0]) !== (label === 'white')) {
        const want = label === 'white' ? WHITE : nearBlack(hex);
        return `a ${label} label reaches only ${r2(contrast(want, hex))}:1 on it`;
      }
      return null;
    };
    const asked = spec.accent[0];
    const problem = lightProblem(asked);
    const light = problem ? nearestPassing(asked, (hex) => !lightProblem(hex)) : asked;
    if (!light) throw new Error(`[theme] no accent near ${asked} passes Fire's palette rules`);
    if (problem) notes.push(`Accent ${asked} moved to ${light} (OKLCH L ${r2(toOklch(asked)[0])} → ${r2(toOklch(light)[0])}): ${problem}.`);

    // 3. The dark accent: derived from the light one, or the one the spec gave, moved the least until it passes.
    const darkProblem = (hex) => { const f = paletteFailures(build(light, hex).tokens, { modes: [1] }); return f.length ? strip(f[0]) : null; };
    const askedDark = darkOf(light);
    const dProblem = darkProblem(askedDark);
    const dark = dProblem ? nearestPassing(askedDark, (hex) => !darkProblem(hex)) : askedDark;
    if (!dark) throw new Error(`[theme] no dark-mode accent near ${askedDark} passes Fire's palette rules`);
    if (dProblem && !derivedDark) notes.push(`Dark-mode accent ${askedDark} moved to ${dark} (OKLCH L ${r2(toOklch(askedDark)[0])} → ${r2(toOklch(dark)[0])}): ${dProblem}.`);
    spec.accent = [light, dark];
  }

  const palette = expandSpec(spec);
  const failures = paletteFailures(palette.tokens);
  if (failures.length) throw new Error(`[theme] the generated palette fails: ${failures[0]}`);
  return { name: 'custom', label: 'Custom', note: summary, tokens: palette.tokens, contrast: palette.contrast, spec, notes };
}

/* ==========================================================================
   Expansion
   ========================================================================== */

const fontStack = (family, voice) => `"${family}", ${voice === 'mono' ? MONO_STACK : SANS_STACK}`;

/** A record → the tokens and attributes that make the look, as the Tweaks panel writes them. */
export function expandTheme(record = {}) {
  const { notes: found } = assertValid(record);
  const r = complete(record);
  const tokens = {};
  const attributes = {};
  const notes = [...found];
  const toned = !isDefaultTone(r.tone);

  if (typeof r.palette === 'string') {
    // A named palette is one attribute; toned, it is written out (data-palette would only be overridden).
    if (toned) {
      const t = toneTokens(paletteTokens(r.palette, { contrast: r.dials.contrast }), r.tone);
      for (const k of PALETTE_TOKENS) tokens[k] = t[k];
    } else if (r.palette !== DEFAULT_PALETTE) attributes['data-palette'] = r.palette;
  } else {
    const p = paletteFrom(r.palette);
    notes.push(...p.notes);
    const base = { ...p.tokens, ...(r.dials.contrast === 'high' ? p.contrast : {}) };
    const t = toneTokens(base, r.tone);
    for (const k of PALETTE_TOKENS) tokens[k] = t[k];
  }

  if (typeof r.type === 'string') {
    if (r.type !== DEFAULT_TYPEFACE) attributes['data-type'] = r.type;
  } else {
    for (const [voice, token] of Object.entries(FONT_TOKENS)) if (r.type[voice]) tokens[token] = fontStack(r.type[voice], voice);
  }

  const d = r.dials;
  if (d.corners !== 1) tokens['--fd-radius-scale'] = String(d.corners);
  if (d.lines !== 1) tokens['--fd-hairline'] = `${d.lines}px`;
  if (d.motion !== 'default') tokens['--fd-motion'] = String(MOTION[d.motion]);
  if (d.texture !== 1) tokens['--fd-texture'] = String(d.texture);
  if (d.density !== 'comfortable') attributes['data-density'] = d.density;
  if (d.textSize !== 'md') attributes['data-text-size'] = d.textSize;
  if (d.contrast === 'high') attributes['data-contrast'] = 'high';
  return { tokens, attributes, notes };
}

const fmtX = (v) => `${Number(v.toFixed(3))}×`;
function summaryOf(r) {
  const palette = typeof r.palette === 'string' ? r.palette : 'custom palette';
  const type = typeof r.type === 'string' ? (r.type === DEFAULT_TYPEFACE ? '' : `${r.type} · `) : 'custom type · ';
  return `${palette}${isDefaultTone(r.tone) ? '' : ' (toned)'} · ${type}${r.dials.density} · ${fmtX(r.dials.corners)}`;
}

/** A record → a stylesheet: the tokens on `selector`, the attributes to set in its comment. Load it after fire.css. */
export function themeToCss(record = {}, { selector = ':root' } = {}) {
  if (typeof selector !== 'string' || !selector.trim() || /[{};]|\/\*|\*\//.test(selector)) throw new TypeError(`[theme] not a usable selector: ${selector}`);
  const { tokens, attributes, notes } = expandTheme(record);
  const r = complete(record);
  const attrs = Object.entries(attributes).map(([k, v]) => `${k}="${v}"`);
  const where = selector === ':root' ? '<html>' : `the element ${selector} matches`;
  const lines = [`On ${where}: ${attrs.length ? attrs.join(' ') : 'nothing (default attributes)'}`];
  if (attributes['data-palette']) lines.push('data-palette needs fire/palettes.css.');
  if (attributes['data-type']) lines.push('Type sets need fire/typefaces.css (part of fire.css).');
  if (selector !== ':root' && PALETTE_TOKENS.some((k) => k in tokens)) lines.push('Off <html>, give that element data-palette too, so the text steps and fills recompute from these colours.');
  lines.push(...notes, 'Load this after fire.css.');
  const decls = Object.entries(tokens).map(([k, v]) => `  ${k}: ${Array.isArray(v) ? cssValue(v) : v};`);
  return [
    `/* Fire theme: ${summaryOf(r)}`,
    ...lines.map((n) => `   ${n}`),
    '*/',
    `${selector} {`,
    ...(decls.length ? decls : ['  /* nothing overridden: the default look */']),
    '}',
    '',
  ].join('\n');
}

/* ==========================================================================
   Tweaks state ↔ record
   ========================================================================== */

/** The Tweaks state (tweaks.get()) → a full record. The theme (light / dark / system) is the viewer's and is dropped. */
export function toThemeRecord(state = {}) {
  const tone = {};
  for (const k of Object.keys(TONE_DEFAULT)) tone[k] = state.tone?.[k] ?? TONE_DEFAULT[k];
  const dials = {};
  for (const k of Object.keys(DIAL_DEFAULTS)) dials[k] = state[k] ?? DIAL_DEFAULTS[k];
  return { contract: CONTRACT, fire: FIRE_VERSION, palette: state.palette ?? DEFAULT_PALETTE, tone, type: state.type ?? DEFAULT_TYPEFACE, dials };
}

/** A record → the Tweaks state it describes (for tweaks.set()). Tweaks holds named palettes and type sets only;
 *  a record with a palette spec or font families throws (apply it with themeToCss instead). */
export function fromThemeRecord(record = {}) {
  assertValid(record);
  if (record.palette !== undefined && typeof record.palette !== 'string') throw new TypeError('[theme] the Tweaks panel holds a named palette only; apply a palette spec with themeToCss()');
  if (record.type !== undefined && typeof record.type !== 'string') throw new TypeError('[theme] the Tweaks panel holds a named type set only; apply font families with themeToCss()');
  const r = complete(record);
  return { palette: r.palette, type: r.type, tone: { ...r.tone }, ...r.dials };
}
