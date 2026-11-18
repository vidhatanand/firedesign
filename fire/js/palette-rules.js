/* Fire palette rules — the contrast and structure rules every palette meets, as functions.
 *
 * Pure ES module: no DOM. scripts/build-palettes.mjs --check runs them on the 15 presets and every toned map;
 * fire/js/theme.js runs them on every palette paletteFrom() builds. One copy of the rules, so a generated palette
 * passes exactly what a preset passes.
 *
 * The rules (WCAG 2), in light and dark:
 *   --fd-text, --fd-text-2, --fd-text-3   4.5:1 on --fd-bg, --fd-bg-sunken, --fd-surface, --fd-surface-raised, --fd-fill
 *                                         laid over each of them, and --fd-accent-8 over the page and surface
 *   --fd-text-4                           3:1 on the same (placeholders, disabled text, decorative icons only)
 *   high contrast                         every text step mixes more ink than its default
 *   --fd-accent-contrast                  4.5:1 on --fd-accent and on --fd-accent-hover
 *   --fd-accent-text                      4.5:1 on --fd-bg, --fd-surface and --fd-accent-8 over each
 *   --fd-ink                              12:1 on --fd-bg
 *   --fd-focus                            3:1 on --fd-bg, --fd-bg-sunken, --fd-surface, --fd-surface-raised, --fd-fill on
 *                                         each and the accent wash on the page and surface (the ring is read against
 *                                         whatever the control sits on; WCAG 1.4.11)
 *   structure (presets and generated palettes, not toned maps): surfaces lighter than the page, lines stepping away
 *   from the page in order, the hover moving .02–.05 L away from its label.
 *
 * TEXT_LADDER is how tokens.css mixes each text step (ink-wash at an alpha, per mode and contrast level).
 * build-palettes.mjs reads the same ladder from tokens.css and fails when this copy differs from it.
 *
 * API
 *   TEXT_MIN, FAINT_MIN, FOCUS_MIN, BASES, BASE_SHORT, TEXT_STEPS, TEXT_LADDER
 *   over(fg, alpha, bg)                               fg at alpha over an opaque bg, composited in sRGB
 *   measureText(tokens, m, level, ladder?)            each text step's worst ratio over every ground, in mode m
 *   checkText(tokens, name, context, fail, opts?)     the text rules; calls fail(message) per violation
 *   measure(tokens, name, context, fail, opts?)       the accent, ink and structure rules; returns the ratios
 *   paletteFailures(tokens, { name, modes })          every violation of a palette's token map, as messages
 *   measureColours(tokens, m)                         the status and chart measurements in mode m (below)
 *   colourFailures(tokens, { name, modes })           every violation of the status and chart rules, as messages
 *   opts: { ladder, modes }   modes defaults to [0, 1] (light, dark)
 *
 * The status and chart rules (COLOUR_RULES in palettes.js), in light and dark:
 *   --fd-<tone>-text      4.5:1 on --fd-bg, --fd-bg-sunken, --fd-surface, --fd-surface-raised and on --fd-<tone>-bg
 *                         over the page, the surface and the raised surface (a banner, a callout, a toast)
 *   --fd-<tone>-contrast  4.5:1 on --fd-<tone>-fill
 *   --fd-<tone>-line      1.25:1 on the page at least. Not 3:1: the line is never the only boundary of a status part
 *                         (each also has its tinted -bg, its -text and an icon or a word), and ember's are 1.3–1.9:1.
 *   apart                 --fd-<tone>-solid and -fill at least 0.10 ΔE (OKLab) from the accent when the accent's hue is
 *                         in the tone's family, 0.05 otherwise; the solid's hue inside the tone's range
 *   --fd-chart-1…6        each 3:1 on the page and the surface; series 1 the accent or the accent text; every pair at
 *                         least 0.10 ΔE apart in normal vision and 0.06 under simulated protanopia, deuteranopia and
 *                         tritanopia (Machado et al. 2009, severity 1.0); neighbours (1–2, 2–3 … 5–6) 0.15 and 0.08;
 *                         series 3–6 at chroma 0.09 or more and, in light mode, outside the yellow band (70–128°);
 *                         two chromatic series within 30° of hue 0.25 apart in normal vision
 */
import {
  contrast, toOklch, parse, format, washOver, focusGrounds, deltaE, chartShortfall,
  COLOUR_RULES, STATUS_HUES, STATUS_TONES,
} from './palettes.js';

export const TEXT_MIN = 4.5;    // text that carries information
export const FAINT_MIN = 3;     // --fd-text-4: placeholders, disabled text, decoration
export const FOCUS_MIN = 3;     // --fd-focus on every ground
export const BASES = ['--fd-bg', '--fd-bg-sunken', '--fd-surface', '--fd-surface-raised'];
export const BASE_SHORT = { '--fd-bg': 'bg', '--fd-bg-sunken': 'sunken', '--fd-surface': 'surface', '--fd-surface-raised': 'raised' };
export const TEXT_STEPS = ['--fd-text', '--fd-text-2', '--fd-text-3', '--fd-text-4'];

/* tokens.css, resolved: { base: palette colour token, alpha: [light, dark] }. */
const step = (base, light, dark) => Object.freeze({ base, alpha: Object.freeze([light, dark]) });
export const TEXT_LADDER = Object.freeze({
  fill: step('--fd-wash', 0.04, 0.055),
  default: Object.freeze({
    '--fd-text': step('--fd-ink', 1, 1),
    '--fd-text-2': step('--fd-ink-wash', 0.72, 0.72),
    '--fd-text-3': step('--fd-ink-wash', 0.67, 0.56),
    '--fd-text-4': step('--fd-ink-wash', 0.52, 0.42),
  }),
  high: Object.freeze({
    '--fd-text': step('--fd-ink', 1, 1),
    '--fd-text-2': step('--fd-ink-wash', 0.88, 0.88),
    '--fd-text-3': step('--fd-ink-wash', 0.72, 0.72),
    '--fd-text-4': step('--fd-ink-wash', 0.64, 0.62),
  }),
});

const L = (c) => toOklch(parse(c).rgb)[0];

/** `fg` at `alpha` over the opaque `bg`, composited in sRGB as the browser does. */
export function over(fg, alpha, bg) {
  const f = parse(fg).rgb;
  const b = parse(bg).rgb;
  return format(f.map((c, i) => c * alpha + b[i] * (1 - alpha)));
}

/** Each text step's worst contrast over every background a palette offers, in one mode and contrast level. */
export function measureText(tokens, m, level, ladder = TEXT_LADDER) {
  const v = (k) => tokens[k][m];
  const fill = ladder.fill;
  const grounds = [];
  for (const b of BASES) {
    grounds.push([BASE_SHORT[b], v(b)]);
    grounds.push([`fill/${BASE_SHORT[b]}`, over(v(fill.base), fill.alpha[m], v(b))]);
  }
  // The accent wash sits on the page (the active nav item) and on surfaces (a selected row).
  for (const b of ['--fd-bg', '--fd-surface']) grounds.push([`wash/${BASE_SHORT[b]}`, washOver(v('--fd-accent'), v(b))]);
  const out = {};
  for (const s of TEXT_STEPS) {
    const { base } = ladder[level][s];
    const alpha = ladder[level][s].alpha[m];
    let worst = Infinity;
    let where = '';
    for (const [label, bg] of grounds) {
      const c = contrast(over(v(base), alpha, bg), bg);
      if (c < worst) { worst = c; where = label; }
    }
    out[s] = { worst, where, alpha };
  }
  return out;
}

/** The text rules for one palette map; returns, per mode, { default, high } measurements. */
export function checkText(tokens, name, context, fail, { ladder = TEXT_LADDER, modes = [0, 1] } = {}) {
  const result = [];
  for (const m of modes) {
    const mode = m === 0 ? 'light' : 'dark';
    const row = {};
    for (const level of ['default', 'high']) {
      const t = measureText(tokens, m, level, ladder);
      row[level] = t;
      const where = `${name} ${mode}${level === 'high' ? ' high contrast' : ''}${context ? ` (${context})` : ''}`;
      for (const s of TEXT_STEPS) {
        const min = s === '--fd-text-4' ? FAINT_MIN : TEXT_MIN;
        if (t[s].worst < min) fail(`${where}: ${s} ${t[s].worst.toFixed(2)} on ${t[s].where} < ${min}`);
      }
    }
    if (!context) {
      for (const s of TEXT_STEPS.slice(1)) {
        if (row.high[s].alpha <= row.default[s].alpha) fail(`${name} ${mode}: high-contrast ${s} (${row.high[s].alpha}) is not stronger than the default (${row.default[s].alpha})`);
      }
    }
    result.push(row);
  }
  return result;
}

/** The rules every palette (and every toned palette) must meet. Returns the measured ratios, one row per mode.
 *  With no `context` the structure rules apply too (presets and generated palettes; toned maps pass a context). */
export function measure(tokens, name, context, fail, { modes = [0, 1] } = {}) {
  const rows = [];
  for (const m of modes) {
    const mode = m === 0 ? 'light' : 'dark';
    const v = (k) => tokens[k][m];
    const textBg = contrast(v('--fd-accent-text'), v('--fd-bg'));
    const textSurface = contrast(v('--fd-accent-text'), v('--fd-surface'));
    const textWash = Math.min(...['--fd-bg', '--fd-surface'].map((k) => contrast(v('--fd-accent-text'), washOver(v('--fd-accent'), v(k)))));
    const label = contrast(v('--fd-accent-contrast'), v('--fd-accent'));
    const labelHover = contrast(v('--fd-accent-contrast'), v('--fd-accent-hover'));
    const ink = contrast(v('--fd-ink'), v('--fd-bg'));
    const focus = Math.min(...focusGrounds(tokens, m).map((g) => contrast(v('--fd-focus'), g)));
    const hoverDL = L(v('--fd-accent-hover')) - L(v('--fd-accent'));
    const where = `${name} ${mode}${context ? ` (${context})` : ''}`;
    if (textBg < TEXT_MIN) fail(`${where}: accent-text on bg ${textBg.toFixed(2)} < ${TEXT_MIN}`);
    if (textSurface < TEXT_MIN) fail(`${where}: accent-text on surface ${textSurface.toFixed(2)} < ${TEXT_MIN}`);
    if (textWash < TEXT_MIN) fail(`${where}: accent-text on the accent wash ${textWash.toFixed(2)} < ${TEXT_MIN}`);
    if (label < TEXT_MIN) fail(`${where}: label on accent ${label.toFixed(2)} < ${TEXT_MIN}`);
    if (labelHover < TEXT_MIN) fail(`${where}: label on accent-hover ${labelHover.toFixed(2)} < ${TEXT_MIN}`);
    if (ink < 12) fail(`${where}: ink on bg ${ink.toFixed(2)} < 12`);
    if (focus < FOCUS_MIN) fail(`${where}: focus ring ${focus.toFixed(2)} on the page, well, a surface or a fill < ${FOCUS_MIN}`);
    if (!context) {
      // Structure: surfaces lighter than the page, lines stepping darker (light) / lighter (dark), hover direction.
      const bgL = L(v('--fd-bg'));
      if (L(v('--fd-surface')) <= bgL) fail(`${where}: surface is not lighter than the page`);
      const lines = ['--fd-line-faint', '--fd-line', '--fd-line-strong'].map((k) => L(v(k)));
      const ordered = m === 0 ? lines[0] > lines[1] && lines[1] > lines[2] : lines[0] < lines[1] && lines[1] < lines[2];
      if (!ordered) fail(`${where}: line steps out of order (${lines.map((x) => x.toFixed(3)).join(', ')})`);
      // The hover moves away from the label: darker under a light label, lighter under a dark one.
      const want = L(v('--fd-accent-contrast')) > 0.6 ? hoverDL < 0 : hoverDL > 0;
      if (!want) fail(`${where}: accent-hover moves toward its label (${hoverDL.toFixed(3)})`);
      if (Math.abs(hoverDL) > 0.05 || Math.abs(hoverDL) < 0.02) fail(`${where}: accent-hover moves ${hoverDL.toFixed(3)} L (want about .03–.04)`);
    }
    rows.push({ mode, textBg, textSurface, textWash, label, labelHover, ink, focus, hoverDL });
  }
  return rows;
}

/** Every rule a preset meets, run on one palette's token map ([light, dark] per token). [] when it passes. */
export function paletteFailures(tokens, { name = 'palette', modes = [0, 1] } = {}) {
  const errors = [];
  const fail = (msg) => errors.push(msg);
  measure(tokens, name, '', fail, { modes });
  checkText(tokens, name, '', fail, { modes });
  return errors;
}

/* ---------- Status and chart colours ---------- */
const hueOf = (c) => toOklch(parse(c).rgb)[2];
// One degree of slack: the gamut fit can turn a hue a fraction when it takes chroma away.
const inRange = (h, [a, b]) => (a <= b ? h >= a - 1 && h <= b + 1 : h >= a - 1 || h <= b + 1);
const STATUS_GROUNDS = ['--fd-bg', '--fd-bg-sunken', '--fd-surface', '--fd-surface-raised'];

/** The status and chart measurements of one palette map in one mode. */
export function measureColours(tokens, m) {
  const v = (k) => tokens[k][m];
  const status = {};
  const accent = v('--fd-accent');
  const [, aC, aH] = toOklch(parse(accent).rgb);
  for (const tone of STATUS_TONES) {
    const k = (part) => v(`--fd-${tone}-${part}`);
    const tint = parse(k('bg'));
    const tinted = ['--fd-bg', '--fd-surface', '--fd-surface-raised'].map((g) => over(format(tint.rgb), tint.alpha, v(g)));
    const text = Math.min(...[...STATUS_GROUNDS.map(v), ...tinted].map((g) => contrast(k('text'), g)));
    const label = contrast(k('contrast'), k('fill'));
    const line = parse(k('line'));
    const lineOnPage = contrast(over(format(line.rgb), line.alpha, v('--fd-bg')), v('--fd-bg'));
    const fam = STATUS_HUES[tone].family;
    const family = aC >= 0.02 && (fam[0] <= fam[1] ? aH >= fam[0] && aH <= fam[1] : aH >= fam[0] || aH <= fam[1]);   // exact, as the engine decides it
    const apart = Math.min(deltaE(accent, k('solid')), deltaE(accent, k('fill')));
    const need = family ? COLOUR_RULES.separation.family : COLOUR_RULES.separation.other;
    status[tone] = { text, label, line: lineOnPage, apart, need, family, hue: hueOf(k('solid')), inRange: inRange(hueOf(k('solid')), STATUS_HUES[tone].range) };
  }
  const series = [1, 2, 3, 4, 5, 6].map((i) => v(`--fd-chart-${i}`));
  const { short, worst } = chartShortfall(series, [v('--fd-bg'), v('--fd-surface')], undefined, m);
  const lead = series[0] === accent || series[0] === v('--fd-accent-text');
  return { status, chart: { series, short, worst, lead } };
}

/** Every violation of the status and chart rules, as messages. [] when it passes. */
export function colourFailures(tokens, { name = 'palette', modes = [0, 1] } = {}) {
  const errors = [];
  const R = COLOUR_RULES;
  for (const m of modes) {
    const where = `${name} ${m ? 'dark' : 'light'}`;
    const { status, chart: c } = measureColours(tokens, m);
    for (const [tone, s] of Object.entries(status)) {
      if (s.text < R.text) errors.push(`${where}: --fd-${tone}-text ${s.text.toFixed(2)} on the page, a surface or its own -bg < ${R.text}`);
      if (s.label < R.label) errors.push(`${where}: --fd-${tone}-contrast on -fill ${s.label.toFixed(2)} < ${R.label}`);
      if (s.line < R.lineFloor) errors.push(`${where}: --fd-${tone}-line ${s.line.toFixed(2)} on the page < ${R.lineFloor}`);
      if (s.apart < s.need - 1e-6) errors.push(`${where}: --fd-${tone} is ${s.apart.toFixed(3)} from the accent < ${s.need}${s.family ? ' (the accent is in its family)' : ''}`);
      if (!s.inRange) errors.push(`${where}: --fd-${tone}-solid hue ${s.hue.toFixed(1)}° is outside ${STATUS_HUES[tone].range.join('–')}°`);
    }
    if (!c.lead) errors.push(`${where}: --fd-chart-1 is neither the accent nor the accent text`);
    if (c.short > 1e-9) {
      const w = c.worst;
      errors.push(`${where}: chart series miss the rules (contrast ${w.contrast.toFixed(2)}, normal ${w.normal.toFixed(3)} / neighbours ${w.normalAdjacent.toFixed(3)}, colour-blind ${w.cvd.toFixed(3)} at ${w.cvdWhere} / neighbours ${w.cvdAdjacent.toFixed(3)}, chroma ${w.chroma.toFixed(3)}, nearest hues ${w.hueGap.toFixed(0)}°${w.yellow.length ? `, series ${w.yellow.join(', ')} in the yellow band` : ''})`);
    }
  }
  return errors;
}
