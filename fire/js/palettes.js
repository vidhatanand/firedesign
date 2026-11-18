/* Fire palettes — the palette data and the colour engine.
 *
 * Pure ES module: no DOM, importable from Node (scripts/build-palettes.mjs writes fire/palettes.css from it)
 * and from the browser (fire/js/tweaks.js tones palettes live).
 *
 * A palette is a full map of the colour tokens a palette owns, each as [light, dark]:
 *   { '--fd-bg': ['#f9f9f9', '#0a0a0a'], … }
 * Everything else (the ink ladder --fd-a*, text steps, fills, accent washes, the ring's shadow, the primary button's
 * shadow) re-derives from these on [data-palette] in tokens.css. --fd-focus, the focus ring's colour, is the accent
 * where it reaches 3:1 on everything a control sits on (focusGrounds), else the accent text (focusOf).
 *
 * `ember` is the default and is exactly the literals in tokens.css. The others are written as a compact spec
 * (neutral hue and tint, ink, accent, label) and expanded at module load against ember's lightness structure,
 * so every palette keeps the same hairline and contrast steps while its neutrals take their own temperature.
 *
 * API
 *   PALETTES                 [{ name, label, note, tokens, contrast }]   contrast = high-contrast line overrides
 *   DEFAULT_PALETTE          'ember'
 *   PALETTE_TOKENS           the token names a palette sets, in order
 *   TONE_DEFAULT             { hue: 0, vivid: 100, light: 0, warmth: 0 }
 *   getPalette(name)         the palette object (ember when unknown)
 *   paletteTokens(name, { contrast })   the token map, with high-contrast lines merged when contrast === 'high'
 *   toneTokens(tokens, tone) the same map bent by a tone; identity when tone equals TONE_DEFAULT
 *   cssValue([light, dark])  'light-dark(#…, #…)' (or the single value when both are equal)
 *   contrast(a, b)           WCAG 2 contrast ratio of two colours
 *   washOver(accent, bg)     the 8% accent wash composited over an opaque background
 *   toOklch(color)           [L, C, h] · oklch(L, C, h) → '#rrggbb' gamut-mapped by reducing chroma
 *   expandSpec(spec)         a compact spec (the SPECS form below) → a palette object, on ember's lightness structure
 *   shift(hex, dL)           the colour with its OKLCH L moved by dL (chroma and hue kept, gamut-mapped)
 *   nearBlack(accent)        the near-black label tinted toward an accent's hue that reaches 4.5:1 on it
 *   focusOf(accent, accentText, ink, grounds)   the focus ring colour: the first of the three at 3:1 on every ground
 *   focusGrounds(tokens, m)  those grounds: page, well, surfaces, the neutral fill on each, the accent wash on page and surface
 *   FOCUS_MIN                3 (WCAG 1.4.11, non-text contrast)
 *   (fire/js/theme.js builds palettes from an accent or brand colours with these; palette-rules.js checks them)
 */

/* ==========================================================================
   Colour math: sRGB ↔ OKLab / OKLCH
   ========================================================================== */

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** Parse '#rgb', '#rrggbb' or 'rgb(r g b / a)' → { rgb: [0..1 ×3], alpha }. */
export function parse(color) {
  const s = String(color).trim().toLowerCase();
  if (s[0] === '#') {
    let hex = s.slice(1);
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
    const n = parseInt(hex.slice(0, 6), 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255), alpha: 1 };
  }
  const m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+%?))?\s*\)$/);
  if (!m) throw new Error(`[palettes] cannot parse colour ${color}`);
  const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : Number(m[4]);
  return { rgb: [m[1], m[2], m[3]].map((v) => Number(v) / 255), alpha: a };
}

const byte = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);
/** [0..1 ×3] (+ alpha) → '#rrggbb' or 'rgb(r g b / a)'. */
export function format(rgb, alpha = 1) {
  const [r, g, b] = rgb.map(byte);
  if (alpha < 1) return `rgb(${r} ${g} ${b} / ${String(Number(alpha.toFixed(2)))})`;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function rgbToOklab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab → linear-free sRGB [0..1 ×3]; may fall outside the gamut. */
function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(toGamma);
}

const RAD = Math.PI / 180;
const lchToLab = ([L, C, h]) => [L, C * Math.cos(h * RAD), C * Math.sin(h * RAD)];
const labToLch = ([L, a, b]) => {
  const C = Math.hypot(a, b);
  return [L, C, C < 1e-6 ? 0 : (Math.atan2(b, a) / RAD + 360) % 360];
};
const inGamut = (rgb, eps = 1e-4) => rgb.every((v) => Number.isFinite(v) && v >= -eps && v <= 1 + eps);

/** OKLCH → in-gamut sRGB, keeping L and h and reducing chroma until it fits (never clipping a channel far). */
function fit([L, C, h]) {
  if (L >= 1) return [1, 1, 1];
  if (L <= 0) return [0, 0, 0];
  let rgb = oklabToRgb(lchToLab([L, C, h]));
  if (inGamut(rgb)) return rgb;
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const test = oklabToRgb(lchToLab([L, mid, h]));
    if (inGamut(test)) { lo = mid; rgb = test; } else hi = mid;
  }
  return inGamut(rgb) ? rgb : oklabToRgb(lchToLab([L, 0, h]));
}

/** Any colour → [L, C, h]. */
export function toOklch(color) {
  return labToLch(rgbToOklab(typeof color === 'string' ? parse(color).rgb : color));
}
/** [L, C, h] → '#rrggbb', gamut-mapped by reducing chroma. */
export function oklch(L, C, h, alpha = 1) {
  return format(fit([L, C, h]), alpha);
}

/**
 * A near-white neutral: white cannot carry chroma, so when a tint is asked for on a very light colour, the colour is
 * allowed to drop up to `give` in L to keep that chroma. Everything else uses plain chroma reduction.
 */
function neutral(L, C, h, give = 0.008) {
  if (C < 1e-4) return format(fit([L, 0, h]));
  let l = Math.min(L, 0.9999);
  const floor = L - give;
  while (l > floor && !inGamut(oklabToRgb(lchToLab([l, C, h])))) l -= 0.0005;
  return format(fit([l, C, h]));
}

/** WCAG 2 relative luminance and contrast ratio. Alpha is ignored (both inputs are opaque in practice). */
export function luminance(color) {
  const [r, g, b] = (typeof color === 'string' ? parse(color).rgb : color).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/* ==========================================================================
   Tokens
   ========================================================================== */

export const PALETTE_TOKENS = [
  '--fd-ink', '--fd-ink-inverse', '--fd-wash', '--fd-ink-wash', '--fd-bg', '--fd-bg-sunken', '--fd-surface',
  '--fd-surface-raised', '--fd-surface-inverse', '--fd-scrim', '--fd-thumb', '--fd-line-faint', '--fd-line',
  '--fd-line-strong', '--fd-accent', '--fd-accent-hover', '--fd-accent-contrast', '--fd-accent-text', '--fd-accent-glow',
  '--fd-focus',
];
export const CONTRAST_TOKENS = ['--fd-line-faint', '--fd-line', '--fd-line-strong'];
const ACCENT_GROUP = new Set(['--fd-accent', '--fd-accent-hover', '--fd-accent-text', '--fd-accent-glow']);
const NEUTRAL_GROUP = new Set(PALETTE_TOKENS.filter((t) => !ACCENT_GROUP.has(t) && t !== '--fd-accent-contrast' && t !== '--fd-focus'));

/* The default, byte for byte the literals in tokens.css (scripts/build-palettes.mjs --check asserts it). */
const EMBER = {
  '--fd-ink': ['#262626', '#f5f5f5'],
  '--fd-ink-inverse': ['#ffffff', '#0a0a0a'],
  '--fd-wash': ['#000000', '#ffffff'],
  '--fd-ink-wash': ['#262626', '#ffffff'],
  '--fd-bg': ['#f9f9f9', '#0a0a0a'],
  '--fd-bg-sunken': ['#f4f4f4', '#060606'],
  '--fd-surface': ['#ffffff', '#141414'],
  '--fd-surface-raised': ['#ffffff', '#1c1c1c'],
  '--fd-surface-inverse': ['#262626', '#f5f5f5'],
  '--fd-scrim': ['rgb(249 249 249 / 0.72)', 'rgb(0 0 0 / 0.64)'],
  '--fd-thumb': ['#ffffff', '#f5f5f5'],
  '--fd-line-faint': ['#ededed', '#1f1f1f'],
  '--fd-line': ['#e8e8e8', '#2a2a2a'],
  '--fd-line-strong': ['#d4d4d4', '#3d3d3d'],
  '--fd-accent': ['#fa5d19', '#fb6a2a'],
  '--fd-accent-hover': ['#ff6d37', '#ff7c42'],      // lighter in both modes: away from the dark label
  '--fd-accent-contrast': ['#20120e', '#20120e'],  // white is 3.2:1 on this orange; this brown-black is 5.8
  '--fd-accent-text': ['#be4000', '#fb6a2a'],       // the orange is 3:1 as text on the light page
  '--fd-accent-glow': ['rgb(250 60 25 / 0.28)', 'rgb(250 60 25 / 0.36)'],
  '--fd-focus': ['#be4000', '#fb6a2a'],             // the orange is 2.9:1 on the light well, so the ring is the accent text
};
/* [data-contrast="high"] lines in tokens.css. */
const EMBER_CONTRAST = {
  '--fd-line-faint': ['#dcdcdc', '#333333'],
  '--fd-line': ['#cfcfcf', '#404040'],
  '--fd-line-strong': ['#b0b0b0', '#5a5a5a'],
};

/* Ember's lightness structure, measured from its literals: every palette sits on these steps. */
const Lof = (hex) => toOklch(hex)[0];
const REF = {};
for (const [key, pair] of Object.entries({ ...EMBER, '--hc-line-faint': EMBER_CONTRAST['--fd-line-faint'], '--hc-line': EMBER_CONTRAST['--fd-line'], '--hc-line-strong': EMBER_CONTRAST['--fd-line-strong'] })) {
  if (pair[0].startsWith('#')) REF[key] = pair.map(Lof);
}

/* ==========================================================================
   Accent rules
   ========================================================================== */

const AA = 4.5;
const LABEL_MIN = AA; // text on the accent fill (primary button, nav badge, team tile) is text like any other
const TEXT_TARGET = 4.56; // a hair over 4.5 so the rounded hex still passes

/** Move L (down in light mode, up in dark) until `color` reaches `min` against every colour in `against`. */
function ensureContrast(color, against, mode, min = TEXT_TARGET) {
  const ok = (hex) => against.every((bg) => contrast(hex, bg) >= min);
  if (ok(color)) return color;
  const [L, C, h] = toOklch(color);
  let lo = mode === 0 ? 0 : L; // the passing end of the search
  let hi = mode === 0 ? L : 1;
  let best = mode === 0 ? oklch(0, 0, h) : oklch(1, 0, h);
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const hex = oklch(mid, C, h);
    if (ok(hex)) { best = hex; if (mode === 0) lo = mid; else hi = mid; } else if (mode === 0) hi = mid; else lo = mid;
  }
  return best;
}

/** The 8% accent wash (--fd-accent-8: the active nav item, a selected row) laid over an opaque background. */
export function washOver(accent, bg, amount = 0.08) {
  const a = parse(accent).rgb;
  const b = parse(bg).rgb;
  return format(a.map((c, i) => c * amount + b[i] * (1 - amount)));
}
/** What accent text sits on: the page, a surface, and the accent wash on each. */
const accentGrounds = (accent, bg, surface) => [bg, surface, washOver(accent, bg), washOver(accent, surface)];

const WHITE = '#ffffff';
const isLightLabel = (label) => toOklch(label)[0] > 0.6;
/** The hovered accent moves away from its label, in both modes: lighter under a dark label, darker under a white
 *  one. The label then reads at least as well on the hover as on the fill. */
const hoverOf = (accent, label) => shift(accent, isLightLabel(label) ? -0.035 : 0.035);

/** A near-black label tinted toward the accent's hue (olive-black on lime, brown-black on amber) at L 0.2, or
 *  darker on a mid-light accent where 0.2 does not reach the label rule (rose, periwinkle). */
export const nearBlack = (accent) => {
  const [, C, h] = toOklch(accent);
  const c = Math.min(0.024, C * 0.14);
  for (let l = 0.2; l > 0; l -= 0.005) {
    const hex = oklch(l, c, h);
    if (contrast(hex, accent) >= LABEL_MIN) return hex;
  }
  return oklch(0, 0, h);
};

/** Label on the accent: the preferred colour while it reaches 4.5:1, otherwise the other of white and the tinted
 *  near-black. White or black always reaches 4.5 on an opaque colour, so one of them passes. */
function pickLabel(accent, preferred) {
  const passes = (c) => contrast(c, accent) >= LABEL_MIN;
  const options = isLightLabel(preferred) ? [preferred, WHITE, nearBlack(accent)] : [preferred, nearBlack(accent), WHITE];
  return options.find(passes) ?? options.reduce((a, b) => (contrast(b, accent) > contrast(a, accent) ? b : a));
}

/** The warm inner shade of the primary button: a darker, richer accent at about 0.3 alpha. */
function glowOf(accent, mode) {
  const [L, C, h] = toOklch(accent);
  if (C < 0.02) return format([0, 0, 0], mode === 0 ? 0.3 : 0.1);
  return format(fit([Math.max(0.32, L - 0.16), C * 1.2, h]), mode === 0 ? 0.3 : 0.38);
}
/* The focus ring's colour: the accent while it reaches 3:1 (WCAG 1.4.11) on the page, the well, the surface and the
   raised surface, so the ring reads wherever a control sits; otherwise the accent text (4.5:1 on the page and the
   surface by its own rule), and the ink when even that misses on the well or the raised surface. */
export const FOCUS_MIN = 3;
const FOCUS_TARGET = 3.02; // a hair over 3 so the rounded hex still passes
export function focusOf(accent, accentText, ink, grounds) {
  return [accent, accentText, ink].find((c) => grounds.every((g) => contrast(c, g) >= FOCUS_TARGET)) ?? ink;
}
/* What a focused control sits on: the page, the well, the surfaces, the neutral fill on each (--fd-fill: the wash at
   4% light, 5.5% dark, as tokens.css mixes it) and the accent wash on the page and the surface (a selected row, an
   accent snippet). */
const FILL_ALPHA = [0.04, 0.055];
export function focusGrounds(t, m) {
  const bases = ['--fd-bg', '--fd-bg-sunken', '--fd-surface', '--fd-surface-raised'].map((k) => t[k][m]);
  const wash = parse(t['--fd-wash'][m]).rgb;
  const fills = bases.map((b) => format(wash.map((c, i) => c * FILL_ALPHA[m] + parse(b).rgb[i] * (1 - FILL_ALPHA[m]))));
  return [...bases, ...fills, washOver(t['--fd-accent'][m], t['--fd-bg'][m]), washOver(t['--fd-accent'][m], t['--fd-surface'][m])];
}

export const shift = (hex, dL) => {
  const [L, C, h] = toOklch(hex);
  return oklch(Math.min(0.999, Math.max(0.02, L + dL)), C, h);
};

/* ==========================================================================
   Palette specs
   hue      neutral hue (OKLCH degrees)
   tint     page chroma [light, dark]; surfaces, lines and washes scale from it
   ink      { c, h } chroma and hue of the light-mode ink (dark-mode ink is near white)
   L        per-step lightness overrides { step: [light, dark] } (null keeps ember's)
   accent   [light, dark?] hex; dark defaults to a slightly lighter accent; 'ink' uses the palette's own ink
   on       label on the accent: 'white' | 'dark' | 'inverse', or [light, dark]
   ========================================================================== */

const SPECS = [
  { name: 'volt', label: 'Volt', note: 'Electric lime on warm stone. High-energy, terminal.',
    hue: 95, tint: [0.007, 0.009], ink: { c: 0.012 }, accent: ['#b8f02c', '#c6f63f'], on: 'dark' },
  { name: 'iris', label: 'Iris', note: 'Indigo-violet on cool slate. Calm, product-like.',
    hue: 285, tint: [0.007, 0.014], ink: { c: 0.02 }, accent: ['#6a5cff', '#8478ff'], on: 'white' },
  { name: 'ocean', label: 'Ocean', note: 'Developer blue on blue-grey. Familiar.',
    hue: 250, tint: [0.006, 0.013], ink: { c: 0.018 }, accent: ['#1f6feb', '#4b8ff5'], on: 'white' },
  { name: 'forest', label: 'Forest', note: 'Green on green-grey. Quiet, operational.',
    hue: 155, tint: [0.006, 0.011], ink: { c: 0.014 }, accent: ['#1f9d55'], on: 'white' },
  { name: 'graphite', label: 'Graphite', note: 'Monochrome. The ink is the accent; no colour anywhere.',
    hue: 255, tint: [0.0025, 0.004], ink: { c: 0.004 }, accent: 'ink', on: 'inverse',
    L: { ink: [0.235, 0.975], lineFaint: [0.94, 0.25], line: [0.922, 0.3], lineStrong: [0.85, 0.385] } },
  { name: 'rose', label: 'Rose', note: 'Rose on warm pink-grey. Warm, consumer.',
    hue: 10, tint: [0.006, 0.012], ink: { c: 0.016 }, accent: ['#e5386d'], on: 'white' },
  { name: 'honey', label: 'Honey', note: 'Amber on cream. Friendly and warm.',
    hue: 85, tint: [0.01, 0.01], ink: { c: 0.02, h: 65 }, accent: ['#f5a50b'], on: 'dark' },
  { name: 'plum', label: 'Plum', note: 'Magenta-purple on purple-grey. Rich, night-time.',
    hue: 320, tint: [0.007, 0.017], ink: { c: 0.022 }, accent: ['#a03cc8'], on: 'white' },
  { name: 'lagoon', label: 'Lagoon', note: 'Teal on teal-grey. Fresh, data-heavy.',
    hue: 200, tint: [0.006, 0.012], ink: { c: 0.016 }, accent: ['#0e9aa0'], on: 'white' },
  { name: 'paper', label: 'Paper', note: 'Cobalt ink on sepia paper. Editorial.',
    hue: 85, tint: [0.018, 0.011], ink: { c: 0.024, h: 60 }, accent: ['#2b4bd6'], on: 'white',
    L: { bg: [0.974, null], bgSunken: [0.958, null], ink: [0.255, null] }, surfaceTint: 0.45 },
  { name: 'clay', label: 'Clay', note: 'Terracotta on sand. Earthy, muted.',
    hue: 60, tint: [0.009, 0.011], ink: { c: 0.018, h: 50 }, accent: ['#c2552d'], on: 'white' },
  { name: 'mint', label: 'Mint', note: 'Mint on pale grey-green. Light and airy.',
    hue: 170, tint: [0.006, 0.01], ink: { c: 0.014 }, accent: ['#3ddc97'], on: 'dark' },
  { name: 'glacier', label: 'Glacier', note: 'Sky blue on icy grey. Crisp.',
    hue: 230, tint: [0.008, 0.014], ink: { c: 0.018 }, accent: ['#0ea5e9'], on: 'white' },
  { name: 'midnight', label: 'Midnight', note: 'Periwinkle on navy. Made for dark mode.',
    hue: 265, tint: [0.008, 0.03], ink: { c: 0.02 }, accent: ['#4f6ef7', '#7c9cff'], on: ['white', 'dark'],
    L: { bg: [null, 0.16], bgSunken: [null, 0.13], surface: [null, 0.2], raised: [null, 0.235], lineFaint: [null, 0.265], line: [null, 0.305], lineStrong: [null, 0.38] } },
];

/* Chroma of each neutral step relative to the page tint, [light, dark]. Lines carry a little more; the whitest
   surface carries much less (it is barely tinted white). */
const STEP_CHROMA = {
  bg: [1, 0.9], bgSunken: [1.15, 0.85], surface: [0.3, 1], raised: [0.22, 1],
  lineFaint: [1.25, 1.1], line: [1.35, 1.15], lineStrong: [1.5, 1.2],
};
const STEP_TOKEN = {
  bg: '--fd-bg', bgSunken: '--fd-bg-sunken', surface: '--fd-surface', raised: '--fd-surface-raised',
  lineFaint: '--fd-line-faint', line: '--fd-line', lineStrong: '--fd-line-strong', ink: '--fd-ink',
};

function expand(spec) {
  const { hue, tint } = spec;
  const inkHue = spec.ink.h ?? hue;
  const Lfor = (step, mode) => spec.L?.[step]?.[mode] ?? REF[STEP_TOKEN[step]][mode];
  const t = {};
  const pair = (fn) => [fn(0), fn(1)];

  for (const step of Object.keys(STEP_CHROMA)) {
    t[STEP_TOKEN[step]] = pair((m) => {
      let c = tint[m] * STEP_CHROMA[step][m];
      if (m === 0 && (step === 'surface' || step === 'raised') && spec.surfaceTint) c = tint[0] * spec.surfaceTint * (step === 'raised' ? 0.6 : 1);
      return neutral(Lfor(step, m), c, hue);
    });
  }
  t['--fd-ink'] = [oklch(Lfor('ink', 0), spec.ink.c, inkHue), neutral(Lfor('ink', 1), Math.min(0.01, tint[1] * 0.45), hue)];
  t['--fd-surface-inverse'] = [...t['--fd-ink']];
  t['--fd-ink-inverse'] = [t['--fd-surface'][0], t['--fd-bg'][1]];
  t['--fd-thumb'] = [t['--fd-surface'][0], t['--fd-ink'][1]];
  // Washes: the colours whose alpha steps make every fill (wash) and every text step (ink-wash).
  const lightWash = oklch(0.2, Math.min(0.03, spec.ink.c * 1.4), inkHue);
  const darkWash = neutral(0.985, Math.min(0.006, tint[1] * 0.4), hue);
  t['--fd-wash'] = [lightWash, darkWash];
  t['--fd-ink-wash'] = [t['--fd-ink'][0], darkWash];
  const bgRgb = parse(t['--fd-bg'][0]).rgb;
  t['--fd-scrim'] = [format(bgRgb, 0.72), format(fit([0.1, tint[1] * 0.9, hue]), 0.64)];

  // Accent
  const on = Array.isArray(spec.on) ? [...spec.on] : [spec.on, spec.on];
  const prefer = (m) => (on[m] === 'white' ? WHITE : on[m] === 'inverse' ? t['--fd-ink-inverse'][m] : null);
  let accent;
  if (spec.accent === 'ink') {
    accent = [...t['--fd-ink']];
  } else {
    const light = spec.accent[0];
    // A white label that cannot reach 4.5:1 on the light accent (forest's green, glacier's sky blue) gives way to
    // near-black in both modes.
    if (contrast(WHITE, light) < LABEL_MIN) on.forEach((v, m) => { if (v === 'white') on[m] = 'dark'; });
    let dark = spec.accent[1];
    if (!dark) {
      // A little lighter in dark mode, but never so light that a white label drops under 4.5:1.
      let lift = 0.05;
      dark = shift(light, lift);
      while (on[1] === 'white' && lift > 0 && contrast(WHITE, dark) < LABEL_MIN + 0.05) { lift = Math.max(0, lift - 0.005); dark = shift(light, lift); }
    }
    accent = [light, dark];
  }
  t['--fd-accent'] = accent;
  t['--fd-accent-contrast'] = pair((m) => pickLabel(accent[m], prefer(m) ?? nearBlack(accent[m])));
  t['--fd-accent-hover'] = pair((m) => hoverOf(accent[m], t['--fd-accent-contrast'][m]));
  t['--fd-accent-text'] = pair((m) => ensureContrast(accent[m], accentGrounds(accent[m], t['--fd-bg'][m], t['--fd-surface'][m]), m));
  t['--fd-accent-glow'] = pair((m) => glowOf(accent[m], m));
  t['--fd-focus'] = pair((m) => focusOf(accent[m], t['--fd-accent-text'][m], t['--fd-ink'][m], focusGrounds(t, m)));

  // High-contrast lines: tokens.css's [data-contrast="high"] steps, in this palette's hue.
  const hc = {};
  for (const [step, key] of [['lineFaint', '--fd-line-faint'], ['line', '--fd-line'], ['lineStrong', '--fd-line-strong']]) {
    const ref = REF[key.replace('--fd-', '--hc-')];
    hc[key] = pair((m) => neutral(ref[m], tint[m] * STEP_CHROMA[step][m] * 1.1, hue));
  }

  const tokens = {};
  for (const key of PALETTE_TOKENS) tokens[key] = t[key];
  return { name: spec.name, label: spec.label, note: spec.note, tokens, contrast: hc };
}

export { expand as expandSpec };

export const DEFAULT_PALETTE = 'ember';
export const PALETTES = [
  { name: 'ember', label: 'Ember', note: 'Orange on pure grey. The default.', tokens: EMBER, contrast: EMBER_CONTRAST },
  ...SPECS.map(expand),
];
const BY_NAME = new Map(PALETTES.map((p) => [p.name, p]));
export const getPalette = (name) => BY_NAME.get(name) ?? BY_NAME.get(DEFAULT_PALETTE);

/** A palette's token map; with { contrast: 'high' } its high-contrast lines replace the normal ones. */
export function paletteTokens(name, { contrast: level = 'default' } = {}) {
  const p = getPalette(name);
  const out = {};
  for (const [k, v] of Object.entries(p.tokens)) out[k] = [...v];
  if (level === 'high') for (const [k, v] of Object.entries(p.contrast)) out[k] = [...v];
  return out;
}

/** [light, dark] → a CSS value. Equal halves collapse to one value. */
export function cssValue([light, dark]) {
  return light === dark ? light : `light-dark(${light}, ${dark})`;
}

/* ==========================================================================
   Tone: bends whichever palette is selected
   hue    −180…180°   rotates the accent group
   vivid  0…150 %     scales the accent group's chroma (0 is a grey accent)
   light  −12…12      shifts the accent's L by that many hundredths
   warmth −100…100    tints the neutrals toward blue (−) or yellow-orange (+) in OKLab a/b
   ========================================================================== */

export const TONE_DEFAULT = Object.freeze({ hue: 0, vivid: 100, light: 0, warmth: 0 });
export const TONE_RANGE = Object.freeze({ hue: [-180, 180], vivid: [0, 150], light: [-12, 12], warmth: [-100, 100] });
export const isDefaultTone = (tone = {}) => Object.keys(TONE_DEFAULT).every((k) => (tone[k] ?? TONE_DEFAULT[k]) === TONE_DEFAULT[k]);

const WARM_HUE = 78;   // yellow-orange
const COOL_HUE = 245;  // blue
/* Near white the sRGB gamut is narrow (at the page's L, blue holds about .009 chroma, yellow-orange about .017),
   so a warmed or cooled light colour may give up to this much L to carry its tint. */
const WARMTH_GIVE = 0.008;
const WARMTH_MAX = 0.018;
/* How much of the warmth each neutral takes, [light, dark]: the page is the reference; lines and dark mode take a
   little more, the whitest surface proportionally less. */
const WARMTH_WEIGHT = {
  '--fd-bg': [1, 1.15], '--fd-bg-sunken': [1.05, 1.1], '--fd-surface': [0.35, 1.2], '--fd-surface-raised': [0.3, 1.2],
  '--fd-line-faint': [1.2, 1.3], '--fd-line': [1.25, 1.35], '--fd-line-strong': [1.3, 1.4],
  '--fd-ink': [0.9, 0.45], '--fd-surface-inverse': [0.9, 0.45], '--fd-ink-inverse': [0.35, 1.15],
  '--fd-wash': [0.9, 0.45], '--fd-ink-wash': [0.9, 0.45], '--fd-thumb': [0.3, 0.45], '--fd-scrim': [1, 1.1],
};

function bend(value, fn) {
  const { rgb, alpha } = parse(value);
  return format(fn(rgb), alpha);
}

function warm(value, key, mode, warmth, weightKey = key) {
  if (!warmth) return value;
  const amount = WARMTH_MAX * (Math.abs(warmth) / 100) * (WARMTH_WEIGHT[weightKey]?.[mode] ?? 1);
  const dir = (warmth > 0 ? WARM_HUE : COOL_HUE) * RAD;
  return bend(value, (rgb) => {
    const [L, a, b] = rgbToOklab(rgb);
    const [, C, h] = labToLch([L, a + amount * Math.cos(dir), b + amount * Math.sin(dir)]);
    return parse(neutral(L, C, h, WARMTH_GIVE * (Math.abs(warmth) / 100))).rgb;
  });
}

function toneAccent(value, tone) {
  return bend(value, (rgb) => {
    const [L, C, h] = toOklch(rgb);
    const L2 = Math.min(0.99, Math.max(0.02, L + tone.light / 100));
    return fit([L2, C * (tone.vivid / 100), (h + tone.hue + 360) % 360]);
  });
}

/** Re-apply the palette rules after a tone: accent text AA on page, surface and their accent wash, a readable label
 *  on the accent, and a hover that moves away from that label. */
function enforce(t, labels) {
  for (const m of [0, 1]) {
    t['--fd-accent-text'][m] = ensureContrast(t['--fd-accent-text'][m], accentGrounds(t['--fd-accent'][m], t['--fd-bg'][m], t['--fd-surface'][m]), m);
    t['--fd-accent-contrast'][m] = pickLabel(t['--fd-accent'][m], labels[m]);
    // The bent hover follows the label the bent accent ended up with.
    if (t['--fd-accent-hover']) t['--fd-accent-hover'][m] = hoverOf(t['--fd-accent'][m], t['--fd-accent-contrast'][m]);
    // The ring follows the bent accent and the warmed neutrals.
    if (t['--fd-focus'] && t['--fd-ink'] && t['--fd-bg-sunken'] && t['--fd-surface-raised'] && t['--fd-wash']) t['--fd-focus'][m] = focusOf(t['--fd-accent'][m], t['--fd-accent-text'][m], t['--fd-ink'][m], focusGrounds(t, m));
  }
  return t;
}

/** Bend a resolved token map by a tone. Zero tone returns an identical copy. */
export function toneTokens(tokens, tone = TONE_DEFAULT) {
  const t = { ...TONE_DEFAULT, ...tone };
  const out = {};
  for (const [k, v] of Object.entries(tokens)) out[k] = [...v];
  if (isDefaultTone(t)) return out;
  // An achromatic accent (graphite) is the ink, so it follows the ink's warmth instead of the accent controls.
  const inkAccent = tokens['--fd-accent'] && tokens['--fd-accent'].every((c) => toOklch(parse(c).rgb)[1] < 0.015);
  for (const key of Object.keys(out)) {
    out[key] = out[key].map((value, mode) => {
      if (ACCENT_GROUP.has(key)) {
        const toned = toneAccent(value, t);
        return inkAccent ? warm(toned, key, mode, t.warmth, '--fd-ink') : toned;
      }
      if (NEUTRAL_GROUP.has(key)) return warm(value, key, mode, t.warmth);
      return value;
    });
  }
  if (out['--fd-accent'] && out['--fd-accent-text'] && out['--fd-bg'] && out['--fd-surface']) {
    // Keep the kind of label the palette chose: a light label stays as it is while it reads, a dark one is
    // re-tinted toward the bent accent's hue.
    const labels = (tokens['--fd-accent-contrast'] ?? [WHITE, WHITE]).map((label, m) => (toOklch(label)[0] > 0.6 ? label : nearBlack(out['--fd-accent'][m])));
    enforce(out, labels);
  }
  return out;
}
