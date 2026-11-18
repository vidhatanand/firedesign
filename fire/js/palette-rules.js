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
 *   structure (presets and generated palettes, not toned maps): surfaces lighter than the page, lines stepping away
 *   from the page in order, the hover moving .02–.05 L away from its label.
 *
 * TEXT_LADDER is how tokens.css mixes each text step (ink-wash at an alpha, per mode and contrast level).
 * build-palettes.mjs reads the same ladder from tokens.css and fails when this copy differs from it.
 *
 * API
 *   TEXT_MIN, FAINT_MIN, BASES, BASE_SHORT, TEXT_STEPS, TEXT_LADDER
 *   over(fg, alpha, bg)                               fg at alpha over an opaque bg, composited in sRGB
 *   measureText(tokens, m, level, ladder?)            each text step's worst ratio over every ground, in mode m
 *   checkText(tokens, name, context, fail, opts?)     the text rules; calls fail(message) per violation
 *   measure(tokens, name, context, fail, opts?)       the accent, ink and structure rules; returns the ratios
 *   paletteFailures(tokens, { name, modes })          every violation of a palette's token map, as messages
 *   opts: { ladder, modes }   modes defaults to [0, 1] (light, dark)
 */
import { contrast, toOklch, parse, format, washOver } from './palettes.js';

export const TEXT_MIN = 4.5;    // text that carries information
export const FAINT_MIN = 3;     // --fd-text-4: placeholders, disabled text, decoration
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
    const hoverDL = L(v('--fd-accent-hover')) - L(v('--fd-accent'));
    const where = `${name} ${mode}${context ? ` (${context})` : ''}`;
    if (textBg < TEXT_MIN) fail(`${where}: accent-text on bg ${textBg.toFixed(2)} < ${TEXT_MIN}`);
    if (textSurface < TEXT_MIN) fail(`${where}: accent-text on surface ${textSurface.toFixed(2)} < ${TEXT_MIN}`);
    if (textWash < TEXT_MIN) fail(`${where}: accent-text on the accent wash ${textWash.toFixed(2)} < ${TEXT_MIN}`);
    if (label < TEXT_MIN) fail(`${where}: label on accent ${label.toFixed(2)} < ${TEXT_MIN}`);
    if (labelHover < TEXT_MIN) fail(`${where}: label on accent-hover ${labelHover.toFixed(2)} < ${TEXT_MIN}`);
    if (ink < 12) fail(`${where}: ink on bg ${ink.toFixed(2)} < 12`);
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
    rows.push({ mode, textBg, textSurface, textWash, label, labelHover, ink, hoverDL });
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
