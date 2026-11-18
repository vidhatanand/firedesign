/* Fire palettes — the palette data and the colour engine.
 *
 * Pure ES module: no DOM, importable from Node (scripts/build-palettes.mjs writes fire/palettes.css from it)
 * and from the browser (fire/js/tweaks.js tones palettes live).
 *
 * A palette is a full map of the colour tokens a palette owns (its twenty colours, then its status and chart colours),
 * each as [light, dark]:
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
 *   STATUS_TONES, STATUS_PARTS, STATUS_TOKENS, CHART_TOKENS, COLOUR_TOKENS   the status and chart colours a palette
 *                            also sets (PALETTE_TOKENS ends with them); presets, expandSpec() and toneTokens() derive them
 *                            on first read, so a rule check that never reads them never pays for them
 *   deriveColours(tokens)    { tokens, notes, chart }: the status and chart colours of a palette's twenty colours
 *   COLOUR_RULES, STATUS_HUES, CHART_SERIES, CHART_STEER, CHART_FALLBACK   the rules and the inputs (section below)
 *   oklab(c), deltaE(a, b)   OKLab and the distance of two colours
 *   CVD, simulate(c, kind), simulateRgb(rgb, kind)   colour-vision deficiency (Machado et al. 2009, severity 1.0)
 *   chartShortfall(colours, grounds, labs?, m?)   how far a chart set is from the chart rules in mode m: { short, worst }
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

/* The twenty colours a palette is made of; the status and chart colours (COLOUR_TOKENS) derive from them. */
const CORE_TOKENS = [
  '--fd-ink', '--fd-ink-inverse', '--fd-wash', '--fd-ink-wash', '--fd-bg', '--fd-bg-sunken', '--fd-surface',
  '--fd-surface-raised', '--fd-surface-inverse', '--fd-scrim', '--fd-thumb', '--fd-line-faint', '--fd-line',
  '--fd-line-strong', '--fd-accent', '--fd-accent-hover', '--fd-accent-contrast', '--fd-accent-text', '--fd-accent-glow',
  '--fd-focus',
];
export const STATUS_TONES = ['success', 'warning', 'danger', 'info'];
export const STATUS_PARTS = ['solid', 'text', 'bg', 'line', 'fill', 'contrast'];
export const STATUS_TOKENS = STATUS_TONES.flatMap((t) => STATUS_PARTS.map((p) => `--fd-${t}-${p}`));
export const CHART_TOKENS = ['--fd-chart-1', '--fd-chart-2', '--fd-chart-3', '--fd-chart-4', '--fd-chart-5', '--fd-chart-6'];
export const COLOUR_TOKENS = [...STATUS_TOKENS, ...CHART_TOKENS];
export const PALETTE_TOKENS = [...CORE_TOKENS, ...COLOUR_TOKENS];
export const CONTRAST_TOKENS = ['--fd-line-faint', '--fd-line', '--fd-line-strong'];
const ACCENT_GROUP = new Set(['--fd-accent', '--fd-accent-hover', '--fd-accent-text', '--fd-accent-glow']);
const NEUTRAL_GROUP = new Set(CORE_TOKENS.filter((t) => !ACCENT_GROUP.has(t) && t !== '--fd-accent-contrast' && t !== '--fd-focus'));
const COLOUR_SET = new Set(COLOUR_TOKENS);

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
  // Status and chart colours: the literals of tokens.css's :root, the reference every other palette derives from.
  '--fd-success-solid': ['#2fb457', '#4ccd75'],
  '--fd-success-text': ['#1a7a3a', '#6fdc91'],
  '--fd-success-bg': ['rgb(47 180 87 / 0.1)', 'rgb(76 205 117 / 0.12)'],
  '--fd-success-line': ['rgb(47 180 87 / 0.28)', 'rgb(76 205 117 / 0.28)'],
  '--fd-success-fill': ['#2fb457', '#4ccd75'],
  '--fd-success-contrast': ['#0e1910', '#0e1910'],
  '--fd-warning-solid': ['#e8a917', '#f0c550'],
  '--fd-warning-text': ['#8a5c00', '#f0c550'],
  '--fd-warning-bg': ['rgb(232 169 23 / 0.12)', 'rgb(240 197 80 / 0.12)'],
  '--fd-warning-line': ['rgb(232 169 23 / 0.36)', 'rgb(240 197 80 / 0.28)'],
  '--fd-warning-fill': ['#e8a917', '#f0c550'],
  '--fd-warning-contrast': ['#1a1200', '#1a1200'],
  '--fd-danger-solid': ['#e5372b', '#f05545'],
  '--fd-danger-text': ['#c2271c', '#ff7a6b'],
  '--fd-danger-bg': ['rgb(229 55 43 / 0.08)', 'rgb(240 85 69 / 0.13)'],
  '--fd-danger-line': ['rgb(229 55 43 / 0.28)', 'rgb(240 85 69 / 0.32)'],
  '--fd-danger-fill': ['#de2f25', '#d63c2f'],
  '--fd-danger-contrast': ['#ffffff', '#ffffff'],
  '--fd-info-solid': ['#2a6dfb', '#5a8ffc'],
  '--fd-info-text': ['#1d55d6', '#84adff'],
  '--fd-info-bg': ['rgb(42 109 251 / 0.08)', 'rgb(90 143 252 / 0.14)'],
  '--fd-info-line': ['rgb(42 109 251 / 0.26)', 'rgb(90 143 252 / 0.32)'],
  '--fd-info-fill': ['#286bf9', '#3e70db'],
  '--fd-info-contrast': ['#ffffff', '#ffffff'],
  // Series 3–6 are derived by the same rules as every palette's (0.8); these are what deriveColours gives for ember.
  '--fd-chart-1': ['#fa5d19', '#fb6a2a'],
  '--fd-chart-2': ['#262626', '#f5f5f5'],
  '--fd-chart-3': ['#00786d', '#00c5b6'],
  '--fd-chart-4': ['#b556b5', '#c360bd'],
  '--fd-chart-5': ['#006517', '#cbd549'],
  '--fd-chart-6': ['#2679dc', '#549bff'],
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
for (const [key, pair] of Object.entries({ ...Object.fromEntries(CORE_TOKENS.map((k) => [k, EMBER[k]])),'--hc-line-faint': EMBER_CONTRAST['--fd-line-faint'], '--hc-line': EMBER_CONTRAST['--fd-line'], '--hc-line-strong': EMBER_CONTRAST['--fd-line-strong'] })) {
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
   Status and chart colours
   Derived from a palette's twenty colours (the accent, its text shade, the ink, the page and the surfaces), so a
   preset, a generated palette and a toned map all get them the same way. Ember's are the reference: every other
   palette's status colours are ember's, bent; ember itself comes out unchanged (build-palettes.mjs --check asserts it).

   Status, per tone and mode:
     hue      ember's, pulled up to 5° toward the palette's neutral hue (its temperature: none on pure grey),
              never leaving the tone's range (STATUS_HUES.range)
     chroma   ember's × the palette's energy: 0.55 + 0.45 × accent chroma / ember's accent chroma, from 0.75 to 1
     apart    the solid and the fill keep COLOUR_RULES.separation from the accent in OKLab: 0.10 when the accent's hue is
              in the tone's family (a green accent and success, a red or rose one and danger), 0.05 otherwise; when
              short, hue (inside the range) and lightness move the least that reaches it
     -text    4.5:1 on the page, the well, the surfaces and the tone's own -bg over each (lightness moves until it does)
     -fill    4.5:1 under -contrast (white on danger and info, a tinted near-black on success and warning)
     -bg, -line  the solid at ember's alphas
   Chart, per mode (series 1 and 2 are given; 3–6 are placed):
     1        the accent where it reaches 3:1 on the page and the surface, else the accent text
     2        the ink; a mid neutral when series 1 is the ink (graphite)
     3–6      hues at +144°, +288°, +72°, +216° from the accent (a pentad, ordered so neighbours sit 144° apart), at
              stepped lightness (CHART_SERIES), chroma × the palette's energy, each at 3:1 on the page and the surface
     apart    COLOUR_RULES.chart: every pair, in normal vision and simulated protanopia, deuteranopia and tritanopia
              (Machado, Oliveira & Fernandes 2009, severity 1.0, on linear sRGB), and neighbours more strictly.
              When the template misses, series 3–6 move the least (hue, then lightness) until it holds; if no move
              does, the checked fallback set (CHART_FALLBACK, Okabe & Ito's hues, best four in the best order) is used.
     colour   series 3–6 keep chroma 0.09 or more; in the light scheme none sits in the yellow band (70–128°): a
              yellow dark enough for 3:1 on a light page is olive, so the template steers it to ochre (58°) or green
              (145°), the green side when the accent is warm; two chromatic series within 30° of hue are 0.25 apart
   Ember's chart set is derived like every other palette's (0.8; 0.7's blue and violet met under protanopia).
   ========================================================================== */

/** OKLab of a colour, and the distance of two (ΔE in OKLab; ×100 is the scale most tools print). */
export const oklab = (color) => rgbToOklab(typeof color === 'string' ? parse(color).rgb : color);
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
export const deltaE = (a, b) => dist(oklab(a), oklab(b));

/* Machado, Oliveira & Fernandes (2009), "A physiologically-based model for simulation of color vision deficiency",
   IEEE TVCG 15(6): the severity 1.0 matrices, applied to linear sRGB. */
export const CVD = Object.freeze({
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
});
const VISIONS = ['normal', ...Object.keys(CVD)];
/** Channels as a reader with that deficiency sees them ('normal' returns them unchanged). */
export function simulateRgb(rgb, kind) {
  if (kind === 'normal') return rgb;
  const M = CVD[kind];
  const lin = rgb.map(toLinear);
  return M.map((r) => toGamma(Math.min(1, Math.max(0, r[0] * lin[0] + r[1] * lin[1] + r[2] * lin[2]))));
}
/** A colour as a reader with that deficiency sees it, as '#rrggbb'. */
export const simulate = (color, kind) => format(simulateRgb(parse(color).rgb, kind));
/** OKLab of the colour in each vision: { normal, protanopia, deuteranopia, tritanopia }. */
const labCache = new Map();
const labsOf = (hex) => {
  let hit = labCache.get(hex);
  if (!hit) {
    const rgb = parse(hex).rgb;
    hit = VISIONS.map((v) => rgbToOklab(simulateRgb(rgb, v)));
    if (labCache.size > 20000) labCache.clear();
    labCache.set(hex, hit);
  }
  return hit;
};

/* The rules, in one place: the engine meets them and palette-rules.js checks them. ΔE is OKLab (0–1). */
export const COLOUR_RULES = Object.freeze({
  text: 4.5,          // -text on the page, the well, the surfaces and its own -bg over each
  label: 4.5,         // -contrast on -fill
  lineFloor: 1.25,    // -line against the page; never the only boundary (see palette-rules.js), so not 3:1
  separation: Object.freeze({ family: 0.1, other: 0.05 }),
  chart: Object.freeze({
    contrast: 3,      // each series on the page and on the surface
    normal: Object.freeze({ all: 0.1, adjacent: 0.15 }),
    cvd: Object.freeze({ all: 0.06, adjacent: 0.08 }),
    chroma: 0.09,     // series 3–6 read as a colour, not a grey
    yellow: Object.freeze([70, 128]),   // light scheme, series 3–6: no hue here (yellow at 3:1 on a light page is olive)
    sameHue: Object.freeze({ within: 30, chroma: 0.05, normal: 0.25 }),   // one hue family: 0.25 apart, not one colour in two strengths
  }),
});
/* Each tone's family (an accent there IS that colour) and the range its hue may move in, OKLCH degrees. */
export const STATUS_HUES = Object.freeze({
  success: Object.freeze({ family: [125, 175], range: [135, 160] }),
  warning: Object.freeze({ family: [55, 100], range: [65, 95] }),
  danger: Object.freeze({ family: [345, 38], range: [22, 33] }),   // never toward orange: it would read as warning
  info: Object.freeze({ family: [220, 290], range: [240, 270] }),
});
const inArc = (h, [a, b]) => (a <= b ? h >= a && h <= b : h >= a || h <= b);
const arc = (from, to) => ((to - from + 540) % 360) - 180; // signed shortest turn
const clampTo = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const EMBER_ACCENT_C = toOklch(EMBER['--fd-accent'][0])[1];
const energyOf = (accent) => Math.min(1, Math.max(0.75, 0.55 + 0.45 * toOklch(accent)[1] / EMBER_ACCENT_C));
/** Ember's colour with its hue turned, chroma scaled and L moved; unchanged (the same string) when nothing moves. */
function bentFrom(hex, dh, s, dL = 0) {
  if (!dh && s === 1 && !dL) return hex;
  const [L, C, h] = toOklch(hex);
  return oklch(clampTo(L + dL, 0.02, 0.99), C * s, (h + dh + 360) % 360);
}
const TONE_TARGET = 4.56; // a hair over 4.5 so the rounded hex still passes
const LINE_TARGET = 1.27; // over COLOUR_RULES.lineFloor, as ember's faintest line (warning, 1.28:1) is

function statusTone(tone, m, t, ctx, notes) {
  const ref = (part) => EMBER[`--fd-${tone}-${part}`][m];
  const v = (k) => t[k][m];
  const { family, range } = STATUS_HUES[tone];
  const h0 = toOklch(ref('solid'))[2];
  // Temperature: toward the neutral hue, inside the range.
  const pulled = clampTo(h0 + clampTo(arc(h0, ctx.neutralHue) * 0.3, -5, 5) * ctx.tint, range[0], range[1]);
  const dh0 = pulled - h0;
  const s = ctx.energy;
  const accent = v('--fd-accent');
  const [, aC, aH] = toOklch(accent);
  const need = aC >= 0.02 && inArc(aH, family) ? COLOUR_RULES.separation.family : COLOUR_RULES.separation.other;
  const label = ref('contrast') === WHITE ? WHITE : bentFrom(ref('contrast'), dh0, 1);
  const labelLight = isLightLabel(label);
  const labelled = (fill) => (contrast(label, fill) < TONE_TARGET ? ensureContrast(fill, [label], labelLight ? 0 : 1, TONE_TARGET) : fill);
  // The search measures the fill as it ends up, under its label (a label can pull a fill back toward the accent).
  const make = (dh, dL, final = true) => {
    const solid = bentFrom(ref('solid'), dh, s, dL);
    const raw = bentFrom(ref('fill'), dh, s, dL);
    const fill = final ? labelled(raw) : raw;
    return { solid, fill, apart: Math.min(deltaE(accent, solid), deltaE(accent, fill)) };
  };
  let pick = { dh: dh0, dL: 0, ...make(dh0, 0) };
  if (pick.apart < need) {
    let best = null;
    let free = false;
    const trial = (h, dL, final) => {
      // Lightness moves mostly away from the page (darker in light mode, lighter in dark): a pale tone on a pale page
      // stops reading as a mark. Only when nothing that way reaches the distance may it move the other way.
      const toward = m ? dL < -0.061 : dL > 0.061;
      if (h < range[0] - 1e-9 || h > range[1] + 1e-9 || Math.abs(dL) > (free === 'far' ? 0.36 : 0.26) || (toward && !free)) return;
      const dh = h - h0;
      const c = make(dh, dL, final);
      const cost = ((dh - dh0) / 6) ** 2 + (dL / 0.06) ** 2; // a lightness step reads as the same colour; a hue turn less so
      const ok = c.apart >= need;
      if (!best || (ok && (!best.ok || cost < best.cost)) || (!ok && !best.ok && c.apart > best.apart)) best = { dh, dL, ...c, cost, ok };
    };
    const search = () => {
      best = null;
      const far = free === 'far' ? 0.35 : 0.25;
      for (let h = range[0]; h <= range[1] + 1e-9; h += 5) for (let dL = -far; dL <= far + 1e-9; dL += 0.025) trial(h, dL, true);
      const [bh, bl] = [best.dh + h0, best.dL];
      best = null;
      for (let h = bh - 4; h <= bh + 4 + 1e-9; h += 1) for (let dL = bl - 0.03; dL <= bl + 0.03 + 1e-9; dL += 0.005) trial(h, dL, true);
    };
    search();
    if (!best.ok) { free = true; search(); }
    if (!best.ok) { free = 'far'; search(); }
    notes.push(`${tone} ${m ? 'dark' : 'light'}: ${best.ok ? 'moved' : 'could not move'} ${Math.round(best.dh - dh0)}° and ${best.dL >= 0 ? '+' : ''}${best.dL.toFixed(2)} L to keep ${need} from the accent (ΔE ${pick.apart.toFixed(3)} → ${best.apart.toFixed(3)})`);
    pick = best;
  }
  const { solid, fill, dh } = pick;
  const alpha = (part) => parse(ref(part)).alpha;
  const tint = (part) => (solid === ref('solid') ? ref(part) : format(parse(solid).rgb, alpha(part)));
  const bg = tint('bg');
  const grounds = ['--fd-bg', '--fd-bg-sunken', '--fd-surface', '--fd-surface-raised'].map(v);
  const tinted = ['--fd-bg', '--fd-surface', '--fd-surface-raised'].map((k) => format(parse(solid).rgb.map((c, i) => c * alpha('bg') + parse(v(k)).rgb[i] * (1 - alpha('bg')))));
  const text = ensureContrast(bentFrom(ref('text'), dh, s), [...grounds, ...tinted], m, TONE_TARGET);
  // The tinted edge stays at least as visible on the page as ember's faintest (1.28:1): a light solid takes more alpha.
  let line = tint('line');
  if (solid !== ref('solid')) {
    let a = alpha('line');
    const onPage = (x) => contrast(format(parse(solid).rgb.map((c, i) => c * x + parse(v('--fd-bg')).rgb[i] * (1 - x))), v('--fd-bg'));
    while (onPage(a) < LINE_TARGET && a < 0.6) a = Math.round((a + 0.02) * 100) / 100;
    line = format(parse(solid).rgb, a);
  }
  return { solid, text, bg, line, fill, contrast: label };
}

/* The chart template: series 3–6 as a hue turn from the accent and a lightness [light, dark]. */
export const CHART_SERIES = Object.freeze([
  Object.freeze({ turn: 144, L: [0.5, 0.74], C: 0.17 }),
  Object.freeze({ turn: 288, L: [0.62, 0.64], C: 0.17 }),
  Object.freeze({ turn: 72, L: [0.44, 0.84], C: 0.16 }),
  Object.freeze({ turn: 216, L: [0.58, 0.69], C: 0.17 }),
]);
/* Okabe & Ito (2008), "Color Universal Design": blue, vermillion, bluish green, reddish purple, orange, sky blue. */
export const CHART_FALLBACK = Object.freeze(['#0072b2', '#d55e00', '#009e73', '#cc79a7', '#e69f00', '#56b4e9']);
const CHART_TARGET = 3.03;
/* Where a light-scheme series in the yellow band goes: ochre (a burnt orange) below it, a clear green above. */
export const CHART_STEER = Object.freeze([58, 145]);

const inYellow = (h) => h >= COLOUR_RULES.chart.yellow[0] && h <= COLOUR_RULES.chart.yellow[1];
const lchOfLab = ([, a, b]) => { const C = Math.hypot(a, b); return [C, C < 1e-6 ? 0 : (Math.atan2(b, a) / RAD + 360) % 360]; };
const hueGap = (x, y) => Math.abs(arc(x, y));
/* What series i owes the rules on its own: 3:1 on the grounds; for series 3–6 a chroma that reads as a colour and, in
   the light scheme, a hue outside the yellow band (a yellow dark enough for 3:1 on a light page is olive). */
function seriesShort(i, c, lab, grounds, m) {
  const R = COLOUR_RULES.chart;
  let short = grounds.reduce((n, g) => n + Math.max(0, R.contrast - contrast(c, g)) * 0.1, 0);
  if (i >= 2) {
    const [C, h] = lchOfLab(lab[0]);
    if (C < R.chroma) short += R.chroma - C;
    if (m === 0 && inYellow(h)) short += 0.1;
  }
  return short;
}
/* What one pair (i < j) owes the rules: the summed shortfall over the four visions, and in normal vision a larger
   distance for two colours of one hue family (within R.sameHue.within degrees), so a pair never reads as one colour
   in two strengths (a brown beside an orange accent). */
function pairShort(i, j, li, lj) {
  const R = COLOUR_RULES.chart;
  const adjacent = j === i + 1;
  let short = 0;
  for (let k = 0; k < VISIONS.length; k++) {
    const need = k === 0 ? (adjacent ? R.normal.adjacent : R.normal.all) : (adjacent ? R.cvd.adjacent : R.cvd.all);
    const d = dist(li[k], lj[k]);
    if (d < need) short += need - d;
  }
  const [Ci, hi] = lchOfLab(li[0]);
  const [Cj, hj] = lchOfLab(lj[0]);
  if (Ci >= R.sameHue.chroma && Cj >= R.sameHue.chroma && hueGap(hi, hj) < R.sameHue.within) {
    const d = dist(li[0], lj[0]);
    if (d < R.sameHue.normal) short += R.sameHue.normal - d;
  }
  return short;
}

/** How far a chart set is from the rules in one mode m: the summed shortfall (0 when it passes) and the worst pairs. */
export function chartShortfall(colours, grounds, labs = colours.map(labsOf), m = 0) {
  const R = COLOUR_RULES.chart;
  let short = 0;
  const worst = { contrast: Infinity, normal: Infinity, normalAdjacent: Infinity, cvd: Infinity, cvdAdjacent: Infinity, cvdWhere: '', chroma: Infinity, hueGap: Infinity, yellow: [] };
  colours.forEach((c, i) => {
    for (const g of grounds) worst.contrast = Math.min(worst.contrast, contrast(c, g));
    short += seriesShort(i, c, labs[i], grounds, m);
    if (i >= 2) {
      const [C, h] = lchOfLab(labs[i][0]);
      worst.chroma = Math.min(worst.chroma, C);
      if (m === 0 && inYellow(h)) worst.yellow.push(i + 1);
    }
  });
  for (let i = 0; i < colours.length; i++) {
    for (let j = i + 1; j < colours.length; j++) {
      const adjacent = j === i + 1;
      short += pairShort(i, j, labs[i], labs[j]);
      const [Ci, hi] = lchOfLab(labs[i][0]);
      const [Cj, hj] = lchOfLab(labs[j][0]);
      if (Ci >= R.sameHue.chroma && Cj >= R.sameHue.chroma) worst.hueGap = Math.min(worst.hueGap, hueGap(hi, hj));
      VISIONS.forEach((vision, k) => {
        const d = dist(labs[i][k], labs[j][k]);
        if (k === 0) { worst.normal = Math.min(worst.normal, d); if (adjacent) worst.normalAdjacent = Math.min(worst.normalAdjacent, d); }
        else {
          if (d < worst.cvd) { worst.cvd = d; worst.cvdWhere = `${i + 1}–${j + 1} ${vision}`; }
          if (adjacent) worst.cvdAdjacent = Math.min(worst.cvdAdjacent, d);
        }
      });
    }
  }
  return { short, worst };
}

function chartSet(m, t, ctx) {
  const v = (k) => t[k][m];
  const grounds = [v('--fd-bg'), v('--fd-surface')];
  const reaches = (c) => grounds.every((g) => contrast(c, g) >= COLOUR_RULES.chart.contrast);
  const accent = v('--fd-accent');
  const c1 = reaches(accent) ? accent : v('--fd-accent-text');
  // Series 2 is the ink, unless the ink sits too close to series 1 (graphite's accent is the ink; volt's lime and the
  // near-white ink meet under tritanopia): then a mid neutral.
  let c2 = v('--fd-ink');
  const l1 = labsOf(c1);
  if (pairShort(0, 1, l1, labsOf(c2)) > 0) {
    const [, iC, iH] = toOklch(c2);
    const options = [c2, ...(m ? [0.66, 0.8, 0.58] : [0.52, 0.4, 0.6]).map((L) => ensureContrast(oklch(L, iC, iH), grounds, m, CHART_TARGET))];
    c2 = options.slice(1).reduce((best, c) => (pairShort(0, 1, l1, labsOf(c)) < pairShort(0, 1, l1, labsOf(best)) - 1e-9 ? c : best), options[1]);
  }
  const [, aC, aH] = toOklch(accent);
  const base = aC >= 0.02 ? aH : ctx.neutralHue;
  const warmAccent = aC >= 0.02 && aH >= 15 && aH <= 105;
  const s = ctx.energy;
  // Light scheme: a hue in the yellow band starts on the green side (a warm accent: away from it) or on the nearer
  // side, ochre below or green above; the search may still take the other side when that moves less.
  const [y0, y1] = COLOUR_RULES.chart.yellow;
  const steer = (h) => (m === 0 && inYellow(h) ? (warmAccent || h - y0 > y1 - h ? CHART_STEER[1] : CHART_STEER[0]) : h);
  const template = CHART_SERIES.map((x) => ensureContrast(oklch(x.L[m], x.C * s, steer((base + x.turn) % 360)), grounds, m, CHART_TARGET));
  const cols = [c1, c2, ...template];
  const labs = cols.map(labsOf);
  // The shortfall the series at index k is part of (its own and every pair with it), and the whole set's.
  const partOf = (k, c, lab) => {
    let n = seriesShort(k, c, lab, grounds, m);
    for (let j = 0; j < cols.length; j++) if (j !== k) n += j < k ? pairShort(j, k, labs[j], lab) : pairShort(k, j, lab, labs[j]);
    return n;
  };
  let short = chartShortfall(cols, grounds, labs, m).short;
  const moved = new Set();
  const moves = template.map(() => [0, 0]);
  // Move the least: series by series, a coarse grid of hue turns and lightness steps around the template, then a
  // finer one around the best, ranked by what is still short and then by how far it moved. Toward a warm accent the
  // ochre side costs more, so the set does not crowd it.
  // A second, wider round (half the wheel, a quarter of the lightness range) only when the near one cannot reach.
  for (let pass = 0; pass < 7 && short > 1e-9; pass++) {
    const [span, step, Lspan] = pass < 4 ? [60, 12, 0.15] : [96, 16, 0.25];
    for (let k = 2; k < cols.length && short > 1e-9; k++) {
      const [L0, C0, h0] = toOklch(template[k - 2]);
      const here = partOf(k, cols[k], labs[k]);
      const rest = short - here;
      let best = { part: here, cost: Infinity, c: null };
      const trial = (dh, dL) => {
        const h = (h0 + dh + 360) % 360;
        const c = oklch(clampTo(L0 + dL, 0.05, 0.97), Math.max(C0, COLOUR_RULES.chart.chroma + 0.06), h);
        const lab = labsOf(c);
        const part = partOf(k, c, lab);
        const cost = (dh / 30) ** 2 + (dL / 0.08) ** 2 + (warmAccent && m === 0 && hueGap(h, aH) < 30 ? 1 : 0);
        if (part < best.part - 1e-9 || (Math.abs(part - best.part) <= 1e-9 && cost < best.cost)) best = { part, cost, c, lab, move: [dh, dL] };
      };
      for (let dh = -span; dh <= span; dh += step) for (let dL = -Lspan; dL <= Lspan + 0.001; dL += 0.03) trial(dh, dL);
      if (best.c) {
        const [ch, cl] = best.move;
        for (let dh = ch - 6; dh <= ch + 6; dh += 3) for (let dL = cl - 0.015; dL <= cl + 0.0151; dL += 0.0075) trial(dh, dL);
      }
      if (best.c && best.c !== cols[k]) { cols[k] = best.c; labs[k] = best.lab; moves[k - 2] = best.move; short = rest + best.part; moved.add(k + 1); }
    }
  }
  let fallback = false;
  if (short > 1e-9) {
    // The checked fallback: the best four of Okabe & Ito's hues, in the best order, each at 3:1.
    const pool = CHART_FALLBACK.map((c) => ensureContrast(c, grounds, m, CHART_TARGET));
    const poolLabs = pool.map(labsOf);
    let best = null;
    for (let a = 0; a < pool.length; a++) for (let b = 0; b < pool.length; b++) for (let c = 0; c < pool.length; c++) for (let d = 0; d < pool.length; d++) {
      const idx = [a, b, c, d];
      if (new Set(idx).size < 4) continue;
      const r = chartShortfall([c1, c2, ...idx.map((i) => pool[i])], grounds, [labs[0], labs[1], ...idx.map((i) => poolLabs[i])], m);
      if (!best || r.short < best.r.short - 1e-9 || (Math.abs(r.short - best.r.short) <= 1e-9 && r.worst.cvd > best.r.worst.cvd)) best = { idx, r };
    }
    if (best.r.short < short) {
      best.idx.forEach((i, n) => { cols[n + 2] = pool[i]; labs[n + 2] = poolLabs[i]; });
      short = best.r.short; fallback = true; moved.clear();
    }
  }
  const result = chartShortfall(cols, grounds, labs, m);
  return { colours: cols, moved: [...moved], moves, fallback, passes: result.short <= 1e-9, worst: result.worst };
}

const deriveCache = new Map();
/** The status and chart colours of a palette's twenty colours: { tokens, notes, chart: [light, dark] reports }. */
export function deriveColours(t) {
  const key = CORE_TOKENS.map((k) => t[k].join()).join('|');
  const hit = deriveCache.get(key);
  if (hit) return hit;
  const [, tintC, neutralHue] = toOklch(t['--fd-bg'][0]);
  const ctx = { neutralHue, tint: Math.min(1, tintC / 0.008), energy: energyOf(t['--fd-accent'][0]) };
  const tokens = {};
  const notes = [];
  for (const tone of STATUS_TONES) {
    const pair = [0, 1].map((m) => statusTone(tone, m, t, ctx, notes));
    for (const part of STATUS_PARTS) tokens[`--fd-${tone}-${part}`] = [pair[0][part], pair[1][part]];
  }
  const chart = [0, 1].map((m) => chartSet(m, t, ctx));
  CHART_TOKENS.forEach((k, i) => { tokens[k] = [chart[0].colours[i], chart[1].colours[i]]; });
  chart.forEach((c, m) => {
    const mode = m ? 'dark' : 'light';
    if (c.fallback) notes.push(`chart ${mode}: the derived series could not meet the colour-blind rules, so the checked fallback set is used`);
    else if (c.moved.length) notes.push(`chart ${mode}: series ${c.moved.join(', ')} moved from the template to stay apart`);
    if (!c.passes) notes.push(`chart ${mode}: no set meets every chart rule (worst colour-blind pair ${c.worst.cvdWhere}, ΔE ${c.worst.cvd.toFixed(3)})`);
  });
  const out = { tokens, notes, chart };
  if (deriveCache.size > 4000) deriveCache.clear();
  deriveCache.set(key, out);
  return out;
}

/** Give a token map its status and chart colours, derived on first read (most rule checks never read them). */
function withColours(t, source = () => deriveColours(t).tokens, keys = COLOUR_TOKENS) {
  let derived = null;
  const get = () => (derived ??= source());
  for (const k of keys) {
    Object.defineProperty(t, k, {
      enumerable: true, configurable: true,
      get: () => get()[k],
      set(value) { Object.defineProperty(t, k, { value, writable: true, enumerable: true, configurable: true }); },
    });
  }
  return t;
}

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
  for (const key of CORE_TOKENS) tokens[key] = t[key];
  return { name: spec.name, label: spec.label, note: spec.note, tokens: withColours(tokens), contrast: hc };
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
  const keys = Object.keys(tokens);
  for (const k of keys) if (!COLOUR_SET.has(k)) out[k] = [...tokens[k]];
  const complete = CORE_TOKENS.every((k) => k in out);
  if (isDefaultTone(t)) {
    // An identical copy; the status and chart colours are copied when first read.
    const colours = keys.filter((k) => COLOUR_SET.has(k));
    if (colours.length) withColours(out, () => Object.fromEntries(colours.map((k) => [k, [...tokens[k]]])), colours);
    return out;
  }
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
  // The status and chart colours re-derive from the toned colours (on first read).
  if (complete) withColours(out);
  return out;
}
