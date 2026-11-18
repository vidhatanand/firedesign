/* Fire tweaks — the floating panel that changes the character of the whole system live, and the tweak state.
 *
 * Saved tweaks are applied synchronously when this module is evaluated, so a page renders in its tweaked look
 * without waiting for `ready`. The default state leaves no trace on <html>: no attribute, no inline property.
 * Module scripts still run after the first paint; add <script src="fire/boot.js"></script> in <head> to put the
 * saved look on <html> before it (this module keeps what boot.js needs in localStorage['fd-tweaks-boot']).
 *
 * Markup contract
 *  Trigger     any <button data-fd-tweaks-open> toggles the panel; it gets aria-expanded and aria-controls.
 *  Launcher    <html data-fd-tweaks> on a page with no trigger: init() adds a round floating button bottom-left.
 *  Panel       built once by JS on first open and appended to <body>; not modal (the page stays usable):
 *              <section class="fd-tweaks" id="fd-tweaks" role="dialog" aria-labelledby="fd-tweaks-title" data-state="open|closed">
 *                <header class="fd-tweaks-head">   drag handle on desktop (double-click to dock it again)
 *                  … <h2 class="fd-tweaks-title">Tweaks</h2>
 *                  <button class="fd-btn-text fd-tweaks-reset" data-tweaks-action="reset">Reset</button>
 *                  <button class="fd-btn" data-icon-only data-tweaks-action="close" aria-label="Close tweaks">
 *                <div class="fd-tweaks-body"> sections of .fd-tweaks-row; every control carries data-tweak="<key>":
 *                  .fd-segmented[data-tweak]           theme, density, lines, textSize, motion (nav.js drives them)
 *                  .fd-tweaks-palettes[role=radiogroup][data-tweak=palette] > .fd-tweaks-swatch[role=radio][data-palette][data-value]
 *                  .fd-tweaks-faces[role=radiogroup][data-tweak=type]       > .fd-tweaks-face[role=radio][data-value]
 *                      .fd-tweaks-face-sample[data-type]  "Ag" set in that type set (the tokens resolve on the sample itself)
 *                      .fd-tweaks-face-name               the label, in the panel's own font
 *                  .fd-tweaks-readout                  the selected type set's faces, e.g. "Fraunces · Instrument Sans"
 *                  .fd-slider[data-tweak] > input[type=range]   tone.hue, tone.vivid, tone.light, tone.warmth, corners, texture
 *                  .fd-tweaks-value[data-tweak-reset]  the value readout; click (or double-click the slider) to reset
 *                  .fd-switch > input[data-tweak="contrast"]
 *                <footer class="fd-tweaks-foot"> Copy CSS (data-tweaks-action="copy") and Copy theme (data-tweaks-action="copy-theme",
 *                  the theme record as JSON), each data-state="done" for 1.4s, + summary
 *              Escape closes it while focus is inside and returns focus to the trigger.
 *
 * Defaults  the page's own look: a data-palette / data-type the page declares on <html> is the default palette and
 *            type set (load, Reset, "is default", what is stored). fire/boot.js keeps the declared values in
 *            data-fd-default-palette / data-fd-default-type before it restores a saved look. Otherwise Ember and Geist.
 *
 * State (only keys that differ from the defaults are stored, as JSON in localStorage['fd-tweaks']; theme and density persist through core)
 *  palette   ember · volt · iris · …         data-palette on <html> (removed for ember, unless the page declared another)
 *  type      geist · editorial · book · …   data-type on <html> (removed for geist, likewise); the list is typefaces.js, the styles typefaces.css
 *  tone      { hue, vivid, light, warmth }  the toned palette written as inline light-dark() custom properties on <html>
 *  theme     system · light · dark          setTheme()
 *  density   compact · comfortable · spacious  setDensity()
 *  corners   0…2 (step .125)                --fd-radius-scale
 *  lines     1 · 1.5 · 2                    --fd-hairline
 *  textSize  sm · md · lg                   data-text-size
 *  contrast  default · high                 data-contrast="high"
 *  motion    off · default · slow           --fd-motion 0 · 1 · 1.75
 *  texture   0…1.5 (step .05)               --fd-texture
 *
 * API: init(root), open(trigger?), close(), toggle(trigger?), get(), set(partial), reset(), toCss(), toTheme()
 *      toTheme() is the state as a theme record (fire/js/theme.js): set(fromThemeRecord(record)) applies one.
 * Events: fd:change on <html> with detail { name: 'tweaks', value: state } after every change; fd:open / fd:close on the panel.
 */
import { $, $$, on, once, emit, copyText, ready, setTheme, getTheme, setDensity, clamp } from './core.js';
import { icon } from './icons.js';
import { init as initNav, selectSegment } from './nav.js';
import { init as initForms, syncSlider } from './forms.js';
import {
  PALETTES, PALETTE_TOKENS, DEFAULT_PALETTE, TONE_DEFAULT, TONE_RANGE, isDefaultTone,
  getPalette, paletteTokens, toneTokens, cssValue, oklch,
} from './palettes.js';
import { TYPEFACES, DEFAULT_TYPEFACE, getTypeface } from './typefaces.js';
import { toThemeRecord } from './theme.js';

/* ==========================================================================
   State
   ========================================================================== */

const KEY = 'fd-tweaks';
const POS_KEY = 'fd-tweaks-pos';
const BOOT_KEY = 'fd-tweaks-boot';
const MOTION = { off: 0, default: 1, slow: 1.75 };
const CHOICES = {
  theme: ['light', 'dark', 'system'],
  density: ['compact', 'comfortable', 'spacious'],
  lines: [1, 1.5, 2],
  textSize: ['sm', 'md', 'lg'],
  contrast: ['default', 'high'],
  motion: ['off', 'default', 'slow'],
};
const RANGES = { corners: [0, 2, 0.125], texture: [0, 1.5, 0.05] };
/* Every inline custom property this module may write on <html>. */
const OWNED = [...PALETTE_TOKENS, '--fd-radius-scale', '--fd-hairline', '--fd-motion', '--fd-texture'];

const root = document.documentElement;

/* The page's own look is the default. A page that declares data-palette or data-type on <html> keeps it: on load,
   after Reset, and as the base of what is saved. fire/boot.js may already have put a saved look on <html>; it keeps
   the page's value in data-fd-default-palette / data-fd-default-type first (empty: the page declared none). */
function declared(name, list, fallback) {
  const kept = `data-fd-default-${name}`;
  const value = root.hasAttribute(kept) ? root.getAttribute(kept) : root.getAttribute(`data-${name}`);
  return list.some((item) => item.name === value) ? value : fallback;
}
const PAGE = Object.freeze({
  palette: declared('palette', PALETTES, DEFAULT_PALETTE),
  type: declared('type', TYPEFACES, DEFAULT_TYPEFACE),
});
const DEFAULTS = Object.freeze({
  palette: PAGE.palette, type: PAGE.type, tone: TONE_DEFAULT, theme: 'system', density: 'comfortable', corners: 1, lines: 1,
  textSize: 'md', contrast: 'default', motion: 'default', texture: 1,
});
/* Storage can throw (private mode, sandboxed frames): every access stays inside the try. */
const store = {
  get(k, area = 'localStorage') { try { return globalThis[area].getItem(k); } catch { return null; } },
  set(k, v, area = 'localStorage') { try { if (v == null) globalThis[area].removeItem(k); else globalThis[area].setItem(k, v); } catch { /* ignore */ } },
};
const snap = (v, [min, max, step]) => clamp(Math.round(v / step) * step, min, max);
const fresh = () => ({ ...DEFAULTS, tone: { ...TONE_DEFAULT } });

function sanitize(input = {}) {
  const s = fresh();
  if (PALETTES.some((p) => p.name === input.palette)) s.palette = input.palette;
  if (TYPEFACES.some((t) => t.name === input.type)) s.type = input.type;
  if (input.tone && typeof input.tone === 'object') {
    for (const k of Object.keys(TONE_DEFAULT)) {
      const v = Number(input.tone[k]);
      if (Number.isFinite(v)) s.tone[k] = clamp(Math.round(v), ...TONE_RANGE[k]);
    }
  }
  for (const k of ['theme', 'density', 'textSize', 'contrast', 'motion']) if (CHOICES[k].includes(input[k])) s[k] = input[k];
  if (CHOICES.lines.includes(Number(input.lines))) s.lines = Number(input.lines);
  for (const k of Object.keys(RANGES)) {
    const v = Number(input[k]);
    if (input[k] !== undefined && input[k] !== null && input[k] !== '' && Number.isFinite(v)) s[k] = Number(snap(v, RANGES[k]).toFixed(3));
  }
  return s;
}

function load() {
  let saved = {};
  try { saved = JSON.parse(store.get(KEY) || '{}') || {}; } catch { saved = {}; }
  return sanitize({ ...saved, theme: getTheme(), density: root.getAttribute('data-density') || 'comfortable' });
}

const sameTone = (a, b) => Object.keys(TONE_DEFAULT).every((k) => a[k] === b[k]);
const differs = (a, b) => Object.keys(DEFAULTS).filter((k) => (k === 'tone' ? !sameTone(a.tone, b.tone) : a[k] !== b[k]));
const isDefault = (s) => differs(s, DEFAULTS).length === 0;

/** The inline custom properties a state needs on <html>. */
function inlineProps(s) {
  const out = {};
  if (!isDefaultTone(s.tone)) {
    const toned = toneTokens(paletteTokens(s.palette, { contrast: s.contrast }), s.tone);
    for (const k of PALETTE_TOKENS) out[k] = cssValue(toned[k]);
  }
  if (s.corners !== 1) out['--fd-radius-scale'] = String(s.corners);
  if (s.lines !== 1) out['--fd-hairline'] = `${s.lines}px`;
  if (s.motion !== 'default') out['--fd-motion'] = String(MOTION[s.motion]);
  if (s.texture !== 1) out['--fd-texture'] = String(s.texture);
  return out;
}

const attr = (name, value) => (value == null ? root.removeAttribute(name) : root.getAttribute(name) !== value && root.setAttribute(name, value));

function apply(s) {
  // Fire's own default leaves no attribute, unless the page declared another look that it must replace.
  attr('data-palette', s.palette === DEFAULT_PALETTE && PAGE.palette === DEFAULT_PALETTE ? null : s.palette);
  attr('data-type', s.type === DEFAULT_TYPEFACE && PAGE.type === DEFAULT_TYPEFACE ? null : s.type);
  attr('data-text-size', s.textSize === 'md' ? null : s.textSize);
  attr('data-contrast', s.contrast === 'high' ? 'high' : null);
  if (getTheme() !== s.theme) setTheme(s.theme);
  if ((root.getAttribute('data-density') || 'comfortable') !== s.density) setDensity(s.density);
  const props = inlineProps(s);
  for (const name of OWNED) if (!(name in props) && root.style.getPropertyValue(name)) root.style.removeProperty(name);
  for (const [name, value] of Object.entries(props)) if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
  if (root.hasAttribute('style') && !root.style.length) root.removeAttribute('style');
}

/* Writes are coalesced while a slider is dragged, and flushed when the page is hidden. */
let persistTimer = 0;
function flush() {
  if (!persistTimer) return;
  clearTimeout(persistTimer);
  persistTimer = 0;
  const out = {};
  for (const k of differs(state, DEFAULTS)) if (k !== 'theme' && k !== 'density') out[k] = k === 'tone' ? { ...state.tone } : state[k];
  store.set(KEY, Object.keys(out).length ? JSON.stringify(out) : null);
  // What fire/boot.js puts back on <html> before the first paint of the next page.
  const attrs = {};
  if (state.palette !== PAGE.palette) attrs['data-palette'] = state.palette;
  if (state.type !== PAGE.type) attrs['data-type'] = state.type;
  if (state.textSize !== 'md') attrs['data-text-size'] = state.textSize;
  if (state.contrast === 'high') attrs['data-contrast'] = 'high';
  const props = inlineProps(state);
  store.set(BOOT_KEY, Object.keys(attrs).length || Object.keys(props).length ? JSON.stringify({ attrs, props }) : null);
}
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(flush, 120);
}

/* An older version kept the heading font as an inline --fd-font-display (also in the boot cache): drop it, or it
   would sit above the type set's own value. */
try {
  const boot = JSON.parse(store.get(BOOT_KEY) || 'null');
  if (boot?.props && '--fd-font-display' in boot.props) {
    delete boot.props['--fd-font-display'];
    store.set(BOOT_KEY, Object.keys(boot.attrs || {}).length || Object.keys(boot.props).length ? JSON.stringify(boot) : null);
    root.style.removeProperty('--fd-font-display');
  }
} catch { /* a damaged boot entry is rewritten on the next change */ }

let state = load();
apply(state); // before `ready`: no flash of the default look

/** The full state. */
export function get() {
  return { ...state, tone: { ...state.tone }, theme: getTheme() };
}

function commit(next) {
  if (!differs(next, state).length) return false;
  state = next;
  apply(state);
  persist();
  sync();
  emit(root, 'fd:change', { name: 'tweaks', value: get() });
  return true;
}

/** Merge a partial state (tone may be partial too) and apply it. Returns the full state. */
export function set(partial = {}) {
  commit(sanitize({ ...state, ...partial, tone: { ...state.tone, ...(partial.tone || {}) } }));
  return get();
}

/** Everything back to the page's own look (its declared palette and type set, else Ember and Geist): no inline
 *  properties, and no attribute the page did not declare. */
export function reset() {
  commit(fresh());
  return get();
}

/* ==========================================================================
   Copy CSS
   ========================================================================== */

const MINUS = '−';
const fmtX = (v) => `${Number(v.toFixed(3))}×`;

function summary(s = state) {
  return `${s.palette}${isDefaultTone(s.tone) ? '' : ' (toned)'} · ${s.type === DEFAULT_TYPEFACE ? '' : `${s.type} · `}${s.density} · ${fmtX(s.corners)}`;
}

/** A ready-to-paste block: the attributes to set on <html>, then :root with every overridden custom property. */
export function toCss(s = state) {
  const toned = !isDefaultTone(s.tone);
  const attrs = [];
  if ((s.palette !== DEFAULT_PALETTE || PAGE.palette !== DEFAULT_PALETTE) && !toned) attrs.push(`data-palette="${s.palette}"`);
  if (s.type !== DEFAULT_TYPEFACE || PAGE.type !== DEFAULT_TYPEFACE) attrs.push(`data-type="${s.type}"`);
  if (s.theme !== 'system') attrs.push(`data-theme="${s.theme}"`);
  if (s.density !== 'comfortable') attrs.push(`data-density="${s.density}"`);
  if (s.textSize !== 'md') attrs.push(`data-text-size="${s.textSize}"`);
  if (s.contrast === 'high') attrs.push('data-contrast="high"');
  const notes = [`On <html>: ${attrs.length ? attrs.join(' ') : 'nothing (default attributes)'}`];
  if (s.palette !== DEFAULT_PALETTE && !toned) notes.push('data-palette needs fire/palettes.css.');
  if (s.type !== DEFAULT_TYPEFACE) notes.push('Type sets need fire/typefaces.css (part of fire.css).');
  if (toned) notes.push(`The ${s.palette} palette, toned ${JSON.stringify(s.tone).replace(/"/g, '').replace(/,/g, ', ').replace(/:/g, ': ')}, is written out below.`);
  notes.push('Load this after fire.css.');
  const props = Object.entries(inlineProps(s));
  return [
    `/* Fire tweaks: ${summary(s)}`,
    ...notes.map((n) => `   ${n}`),
    '*/',
    ':root {',
    ...(props.length ? props.map(([k, v]) => `  ${k}: ${v};`) : ['  /* nothing overridden: the default look */']),
    '}',
    '',
  ].join('\n');
}

/** The state as a theme record (contract/theme.schema.json): what Copy theme copies. */
export function toTheme(s = state) {
  return toThemeRecord(s);
}

/* ==========================================================================
   Panel markup
   ========================================================================== */

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TONE_SLIDERS = [['hue', 'Hue'], ['vivid', 'Vividness'], ['light', 'Lightness'], ['warmth', 'Warmth']];

function valueText(key, v) {
  switch (key) {
    case 'tone.hue': return v > 0 ? `+${v}°` : v < 0 ? `${MINUS}${-v}°` : '0°';
    case 'tone.vivid': return `${v}%`;
    case 'tone.light': return v > 0 ? `+${v}` : v < 0 ? `${MINUS}${-v}` : '0';
    case 'tone.warmth': return v > 0 ? `warm ${v}` : v < 0 ? `cool ${-v}` : '0';
    case 'corners': return fmtX(v);
    case 'texture': return `${Math.round(v * 100)}%`;
    default: return String(v);
  }
}
function spokenText(key, v) {
  switch (key) {
    case 'tone.hue': return `${v} degrees`;
    case 'tone.vivid': case 'texture': return valueText(key, v).replace('%', ' percent');
    case 'tone.light': return String(v);
    case 'corners': return `${Number(v.toFixed(3))} times`;
    default: return valueText(key, v);
  }
}
const readKey = (s, key) => (key.startsWith('tone.') ? s.tone[key.slice(5)] : s[key]);
const defaultOf = (key) => readKey(DEFAULTS, key);

function segmented(key, options, labelledby = `fd-tw-${key}-label`) {
  const current = String(state[key]);
  return `<div class="fd-segmented" data-size="sm" data-block role="radiogroup" aria-labelledby="${labelledby}" data-tweak="${key}">${options
    .map(([value, content, aria]) => `<button class="fd-segmented-item" type="button" role="radio" aria-checked="${String(value) === current}" data-value="${value}"${aria ? ` aria-label="${aria}"` : ''}>${content}</button>`)
    .join('')}</div>`;
}
const inlineRow = (key, label, control) =>
  `<div class="fd-tweaks-row" data-inline><span class="fd-tweaks-label" id="fd-tw-${key}-label">${label}</span>${control}</div>`;

function sliderRow(key, label, [min, max, step], { tone = false, ends } = {}) {
  const id = `fd-tw-${key.replace('.', '-')}`;
  const value = readKey(state, key);
  const cls = tone ? 'fd-slider fd-tweaks-tone' : 'fd-slider';
  const slider = `<div class="${cls}" data-bubble="off" data-tweak="${key}"><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" aria-valuetext="${esc(spokenText(key, value))}"></div>`;
  return `<div class="fd-tweaks-row">
      <div class="fd-tweaks-row-head"><label class="fd-tweaks-label" for="${id}">${label}</label><button class="fd-tweaks-value" type="button" data-tweak-reset="${key}" tabindex="-1" aria-label="Reset ${label.toLowerCase()}">${esc(valueText(key, value))}</button></div>
      ${ends ? `<div class="fd-tweaks-range">${ends[0]}${slider}${ends[1]}</div>` : slider}
    </div>`;
}

function swatches() {
  return `<div class="fd-tweaks-palettes" role="radiogroup" aria-labelledby="fd-tw-palette-head" data-tweak="palette">${PALETTES.map((p) => {
    const on = p.name === state.palette;
    return `<button class="fd-tweaks-swatch" type="button" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-palette="${p.name}" data-value="${p.name}" title="${esc(p.note)}"><span class="fd-tweaks-swatch-tile" aria-hidden="true"><span class="fd-tweaks-swatch-dot"></span><span class="fd-tweaks-swatch-ink"></span></span><span class="fd-tweaks-swatch-name">${esc(p.label)}</span></button>`;
  }).join('')}</div>`;
}

/* The type sets: a tile each. The sample carries data-type, so the set's tokens resolve on it by themselves;
   the name stays outside it and keeps the panel's own font. */
const typeFaces = (t) => (t.display === t.sans ? t.display : `${t.display} · ${t.sans}`);
function typefaces() {
  return `<div class="fd-tweaks-faces" role="radiogroup" aria-label="Typeface" data-tweak="type">${TYPEFACES.map((t) => {
    const on = t.name === state.type;
    return `<button class="fd-tweaks-face" type="button" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-value="${t.name}" title="${esc(t.note)}"><span class="fd-tweaks-face-sample" data-type="${t.name}" aria-hidden="true">Ag</span><span class="fd-tweaks-face-name">${esc(t.label)}</span></button>`;
  }).join('')}</div>`;
}

const section = (id, title, body) =>
  `<section class="fd-tweaks-section" aria-labelledby="fd-tw-${id}-head"><h3 class="fd-eyebrow fd-tweaks-eyebrow" id="fd-tw-${id}-head">${title}</h3>${body}</section>`;

function markup() {
  // The weight is an attribute, not an inline style, so the panel also works under a strict Content Security Policy.
  const rule = (w) => `<span class="fd-tweaks-rule" data-weight="${w}" aria-hidden="true"></span>`;
  return `
  <header class="fd-tweaks-head">
    <span class="fd-tweaks-grab" aria-hidden="true"></span>
    ${icon('sliders-horizontal')}
    <h2 class="fd-tweaks-title" id="fd-tweaks-title">Tweaks</h2>
    <button class="fd-btn-text fd-tweaks-reset" type="button" data-tweaks-action="reset">Reset</button>
    <button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Close tweaks" data-tweaks-action="close">${icon('x')}</button>
  </header>
  <div class="fd-tweaks-body">
    ${section('theme', 'Theme', segmented('theme', [
      ['light', `${icon('sun', { size: 14 })}<span>Light</span>`],
      ['dark', `${icon('moon', { size: 14 })}<span>Dark</span>`],
      ['system', `${icon('monitor', { size: 14 })}<span>System</span>`],
    ], 'fd-tw-theme-head'))}
    ${section('palette', 'Palette', swatches())}
    ${section('tone', 'Tone', TONE_SLIDERS.map(([k, label]) => sliderRow(`tone.${k}`, label, [...TONE_RANGE[k], 1], { tone: true })).join(''))}
    ${section('shape', 'Shape', [
      inlineRow('density', 'Density', segmented('density', [['compact', 'Compact'], ['comfortable', 'Default'], ['spacious', 'Spacious']])),
      sliderRow('corners', 'Corners', RANGES.corners, { ends: ['<span class="fd-tweaks-corner" data-shape="square" aria-hidden="true"></span>', '<span class="fd-tweaks-corner" data-shape="round" aria-hidden="true"></span>'] }),
      inlineRow('lines', 'Lines', segmented('lines', [[1, `${rule(1)}<span>1</span>`, '1 pixel'], [1.5, `${rule(1.5)}<span>1.5</span>`, '1.5 pixels'], [2, `${rule(2)}<span>2</span>`, '2 pixels']])),
    ].join(''))}
    ${section('type', 'Type', [
      `<div class="fd-tweaks-row"><div class="fd-tweaks-row-head"><span class="fd-tweaks-label" id="fd-tw-type-label">Typeface</span><span class="fd-tweaks-readout" data-tweaks-typeface>${esc(typeFaces(getTypeface(state.type)))}</span></div>${typefaces()}</div>`,
      inlineRow('textSize', 'Text size', segmented('textSize', [['sm', 'S', 'Small'], ['md', 'M', 'Medium'], ['lg', 'L', 'Large']])),
      `<label class="fd-switch" data-size="sm" data-label="start"><input type="checkbox" role="switch" data-tweak="contrast"${state.contrast === 'high' ? ' checked' : ''}><span class="fd-switch-track"></span><span class="fd-switch-text"><span class="fd-tweaks-label">High contrast</span></span></label>`,
    ].join(''))}
    ${section('motion', 'Motion and texture', [
      inlineRow('motion', 'Motion', segmented('motion', [['off', 'Off'], ['default', 'Default'], ['slow', 'Slow']])),
      sliderRow('texture', 'Texture', RANGES.texture),
    ].join(''))}
  </div>
  <footer class="fd-tweaks-foot">
    <button class="fd-btn" type="button" data-size="sm" data-tweaks-action="copy">${icon('copy')}<span class="fd-btn-swap"><span>Copy CSS</span><span>Copied</span></span></button>
    <button class="fd-btn" type="button" data-size="sm" data-tweaks-action="copy-theme">${icon('braces')}<span class="fd-btn-swap"><span>Copy theme</span><span>Copied</span></span></button>
    <p class="fd-tweaks-summary"></p>
    <span class="fd-sr-only" role="status" data-tweaks-status></span>
  </footer>`;
}

/* ==========================================================================
   Panel behaviour
   ========================================================================== */

let panel = null;
let lastTrigger = null;
const desktop = typeof matchMedia === 'function' ? matchMedia('(min-width: 641px)') : { matches: true };
const GRIDS = '.fd-tweaks-palettes, .fd-tweaks-faces'; // the radio grids; data-tweak names the state key
const triggers = () => $$('[data-fd-tweaks-open]');
const isOpen = () => panel?.dataset.state === 'open';

function build() {
  if (panel) return panel;
  panel = document.createElement('section');
  panel.className = 'fd-tweaks';
  panel.id = 'fd-tweaks';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'fd-tweaks-title');
  panel.dataset.state = 'closed';
  panel.innerHTML = markup();
  document.body.append(panel);
  initNav(panel);
  initForms(panel);
  bindPanel(panel);
  restorePosition();
  sync();
  panel.getBoundingClientRect(); // commit the closed state so the first open animates
  return panel;
}

/** Tone track gradients: the real toned colours, stop for stop under the thumb's centre. */
function trackGradient(colours) {
  const n = colours.length - 1;
  const stops = colours.map((c, i) => `${c} calc(var(--fd-tweaks-thumb) / 2 + (100% - var(--fd-tweaks-thumb)) * ${Number((i / n).toFixed(4))})`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
function accentAt(param, value) {
  const base = { '--fd-accent': getPalette(state.palette).tokens['--fd-accent'] };
  return cssValue(toneTokens(base, { ...state.tone, warmth: 0, [param]: value })['--fd-accent']);
}
function paintTracks() {
  const steps = (min, max, count) => Array.from({ length: count }, (_, i) => min + ((max - min) * i) / (count - 1));
  const tracks = {
    'tone.hue': steps(-180, 180, 13).map((v) => accentAt('hue', v)),
    'tone.vivid': steps(0, 150, 7).map((v) => accentAt('vivid', v)),
    'tone.light': steps(-12, 12, 5).map((v) => accentAt('light', v)),
    // Warmth is subtle on the page itself, so its track shows the direction: blue, the palette's own line, amber.
    'tone.warmth': [
      `light-dark(${oklch(0.66, 0.11, 245)}, ${oklch(0.62, 0.1, 245)})`,
      cssValue(getPalette(state.palette).tokens['--fd-line-strong']),
      `light-dark(${oklch(0.78, 0.13, 78)}, ${oklch(0.72, 0.12, 78)})`,
    ],
  };
  for (const [key, colours] of Object.entries(tracks)) {
    const el = $(`.fd-slider[data-tweak="${key}"]`, panel);
    const value = trackGradient(colours);
    if (el && el.style.getPropertyValue('--_tw-track') !== value) el.style.setProperty('--_tw-track', value);
  }
}

/** State → controls. */
function sync() {
  if (!panel) return;
  for (const group of $$('.fd-segmented[data-tweak]', panel)) {
    const value = String(readKey(state, group.dataset.tweak));
    const item = $$('.fd-segmented-item', group).find((i) => i.dataset.value === value);
    if (item && item.getAttribute('aria-checked') !== 'true') selectSegment(item, { silent: true });
  }
  for (const grid of $$(GRIDS, panel)) {
    for (const item of $$('[role="radio"]', grid)) {
      const on = item.dataset.value === state[grid.dataset.tweak];
      item.setAttribute('aria-checked', String(on));
      item.tabIndex = on ? 0 : -1;
    }
  }
  const faceReadout = $('[data-tweaks-typeface]', panel);
  if (faceReadout) faceReadout.textContent = typeFaces(getTypeface(state.type));
  for (const el of $$('.fd-slider[data-tweak]', panel)) {
    const key = el.dataset.tweak;
    const value = readKey(state, key);
    const input = $('input[type="range"]', el);
    if (Number(input.value) !== value) input.value = String(value);
    syncSlider(el);
    input.setAttribute('aria-valuetext', spokenText(key, value));
    const readout = $(`[data-tweak-reset="${key}"]`, panel);
    if (readout) {
      readout.textContent = valueText(key, value);
      const changed = value !== defaultOf(key);
      readout.toggleAttribute('data-changed', changed);
      readout.tabIndex = changed ? 0 : -1;
      readout.setAttribute('aria-label', changed ? `Reset ${$(`label[for="${input.id}"]`, panel).textContent.toLowerCase()} to ${valueText(key, defaultOf(key))}` : valueText(key, value));
    }
  }
  const contrastInput = $('input[data-tweak="contrast"]', panel);
  if (contrastInput) contrastInput.checked = state.contrast === 'high';
  $('.fd-tweaks-reset', panel).disabled = isDefault(state);
  $('.fd-tweaks-summary', panel).textContent = summary();
  paintTracks();
}

const parseValue = (key, raw) => (key === 'lines' ? Number(raw) : raw);
function setKey(key, value) {
  if (key.startsWith('tone.')) set({ tone: { [key.slice(5)]: value } });
  else set({ [key]: value });
}

function bindPanel(el) {
  // Segmented controls (nav.js fires fd:change on the group). Keep the controls' own events inside the panel:
  // the only fd:change the page hears from here is { name: 'tweaks' } on <html>.
  el.addEventListener('fd:change', (event) => {
    event.stopPropagation();
    const group = event.target.closest?.('.fd-segmented[data-tweak]');
    if (group && event.target === group) setKey(group.dataset.tweak, parseValue(group.dataset.tweak, event.detail.value));
  });
  el.addEventListener('input', (event) => {
    const input = event.target;
    const slider = input.closest?.('.fd-slider[data-tweak]');
    if (slider) setKey(slider.dataset.tweak, Number(input.value));
  });
  el.addEventListener('change', (event) => {
    if (event.target.matches?.('input[data-tweak="contrast"]')) set({ contrast: event.target.checked ? 'high' : 'default' });
  });
  el.addEventListener('dblclick', (event) => {
    const slider = event.target.closest?.('.fd-slider[data-tweak]');
    if (slider) setKey(slider.dataset.tweak, defaultOf(slider.dataset.tweak));
  });
  el.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const readout = target.closest('[data-tweak-reset]');
    if (readout) {
      const key = readout.dataset.tweakReset;
      if (readKey(state, key) !== defaultOf(key)) {
        setKey(key, defaultOf(key));
        $(`.fd-slider[data-tweak="${key}"] input`, el)?.focus({ preventScroll: true });
      }
      return;
    }
    const choice = target.closest('.fd-tweaks-swatch, .fd-tweaks-face');
    if (choice) { set({ [choice.closest(GRIDS).dataset.tweak]: choice.dataset.value }); return; }
    const action = target.closest('[data-tweaks-action]')?.dataset.tweaksAction;
    if (action === 'close') close();
    else if (action === 'reset') { reset(); $('.fd-segmented[data-tweak="theme"] [aria-checked="true"]', el)?.focus({ preventScroll: true }); }
    else if (action === 'copy') copyCss(target.closest('[data-tweaks-action]'));
    else if (action === 'copy-theme') copyTheme(target.closest('[data-tweaks-action]'));
  });
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.target.matches?.('.fd-tweaks-swatch, .fd-tweaks-face')) gridKeys(event);
  });
  bindDrag(el);
}

/* Swatch and tile grids (palette 5 × 3, typeface 4 × 3): arrows move through the grid and select (the radio
   pattern), Home / End jump. The column count is the grid's own, so the CSS decides it. */
function gridKeys(event) {
  const grid = event.target.closest(GRIDS);
  const items = $$('[role="radio"]', grid);
  const i = items.indexOf(event.target);
  const n = items.length;
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
  const rtl = getComputedStyle(panel).direction === 'rtl';
  const key = rtl ? ({ ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' }[event.key] ?? event.key) : event.key;
  let j = null;
  if (key === 'ArrowRight') j = (i + 1) % n;
  else if (key === 'ArrowLeft') j = (i - 1 + n) % n;
  else if (key === 'ArrowDown') j = i + cols < n ? i + cols : i % cols;
  else if (key === 'ArrowUp') j = i - cols >= 0 ? i - cols : i + cols * Math.floor((n - 1 - i) / cols);
  else if (key === 'Home') j = 0;
  else if (key === 'End') j = n - 1;
  if (j === null) return;
  event.preventDefault();
  items[j].focus();
  set({ [grid.dataset.tweak]: items[j].dataset.value });
}

async function copyOut(button, text, done) {
  if (!(await copyText(text))) return;
  button.dataset.state = 'done';
  const status = $('[data-tweaks-status]', panel);
  if (status) status.textContent = done;
  clearTimeout(button.fdCopyTimer);
  button.fdCopyTimer = setTimeout(() => { delete button.dataset.state; if (status) status.textContent = ''; }, 1400);
  emit(button, 'fd:copy', { value: text });
}
const copyCss = (button) => copyOut(button, toCss(), 'CSS copied');
const copyTheme = (button) => copyOut(button, `${JSON.stringify(toTheme(), null, 2)}\n`, 'Theme copied');

/* ---------- Dragging (desktop): the header is the handle; the position is kept for the session ---------- */
const EDGE = 8;
function place(x, y) {
  const rect = panel.getBoundingClientRect();
  const vw = root.clientWidth;
  const vh = innerHeight;
  const head = $('.fd-tweaks-head', panel).offsetHeight;
  const nx = Math.round(clamp(x, EDGE, Math.max(EDGE, vw - rect.width - EDGE)));
  const ny = Math.round(clamp(y, EDGE, Math.max(EDGE, vh - head * 4)));
  panel.style.setProperty('--_tw-x', `${nx}px`);
  panel.style.setProperty('--_tw-y', `${ny}px`);
  panel.setAttribute('data-moved', '');
  return { x: nx, y: ny };
}
function dock() {
  panel.removeAttribute('data-moved');
  panel.style.removeProperty('--_tw-x');
  panel.style.removeProperty('--_tw-y');
  store.set(POS_KEY, null, 'sessionStorage');
}
function restorePosition() {
  try {
    const pos = JSON.parse(store.get(POS_KEY, 'sessionStorage') || 'null');
    if (pos && desktop.matches) place(pos.x, pos.y);
  } catch { /* ignore */ }
}
function bindDrag(el) {
  const head = $('.fd-tweaks-head', el);
  head.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !desktop.matches || event.target.closest('button')) return;
    event.preventDefault();
    const rect = el.getBoundingClientRect();
    const dx = event.clientX - rect.left;
    const dy = event.clientY - rect.top;
    head.setPointerCapture(event.pointerId);
    el.setAttribute('data-dragging', '');
    let pos = null;
    const move = (e) => { pos = place(e.clientX - dx, e.clientY - dy); };
    const end = () => {
      head.removeEventListener('pointermove', move);
      head.removeEventListener('pointerup', end);
      head.removeEventListener('pointercancel', end);
      el.removeAttribute('data-dragging');
      if (pos) store.set(POS_KEY, JSON.stringify(pos), 'sessionStorage');
    };
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
  });
  head.addEventListener('dblclick', (event) => { if (!event.target.closest('button') && el.hasAttribute('data-moved')) dock(); });
  addEventListener('resize', () => {
    if (!el.hasAttribute('data-moved')) return;
    if (!desktop.matches) return;
    const rect = el.getBoundingClientRect();
    const pos = place(rect.left, rect.top);
    store.set(POS_KEY, JSON.stringify(pos), 'sessionStorage');
  }, { passive: true });
}

/* ---------- Open / close ---------- */
function setExpanded(open) {
  for (const t of triggers()) {
    t.setAttribute('aria-expanded', String(open));
    t.setAttribute('aria-controls', 'fd-tweaks');
  }
}

export function open(trigger) {
  build();
  if (isOpen()) return;
  lastTrigger = trigger instanceof Element ? trigger : document.activeElement instanceof Element ? document.activeElement : null;
  sync();
  panel.dataset.state = 'open';
  setExpanded(true);
  $('.fd-segmented[data-tweak="theme"] [aria-checked="true"]', panel)?.focus({ preventScroll: true });
  emit(panel, 'fd:open', {});
}

export function close() {
  if (!panel || !isOpen()) return;
  if (panel.contains(document.activeElement)) {
    const back = lastTrigger?.isConnected ? lastTrigger : triggers()[0];
    back?.focus({ preventScroll: true });
  }
  panel.dataset.state = 'closed';
  setExpanded(false);
  emit(panel, 'fd:close', {});
}

export function toggle(trigger) {
  if (isOpen()) close();
  else open(trigger);
}

/* ==========================================================================
   Init
   ========================================================================== */

function addLauncher() {
  if (!root.hasAttribute('data-fd-tweaks') || triggers().length || !document.body) return;
  const button = document.createElement('button');
  button.className = 'fd-tweaks-launcher';
  button.type = 'button';
  button.setAttribute('data-fd-tweaks-open', '');
  button.setAttribute('aria-label', 'Tweaks');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('data-fd-tooltip', 'Tweaks');
  button.innerHTML = icon('sliders-horizontal');
  document.body.append(button);
}

/** Bind the triggers (once) and add the launcher when the page asks for one. Safe to call again; the panel and
 *  its triggers are document-wide, so `scope` is accepted for the family signature only. */
export function init(scope = document) { // eslint-disable-line no-unused-vars
  if (once(document, 'fd-tweaks')) {
    on(document, 'click', '[data-fd-tweaks-open]', (event, trigger) => { event.preventDefault(); toggle(trigger); });
    // The theme can change elsewhere (a top-bar switch): follow it.
    root.addEventListener('fd:theme', (event) => {
      const theme = event.detail?.theme;
      if (!theme || theme === state.theme) return;
      state = { ...state, theme };
      sync();
      emit(root, 'fd:change', { name: 'tweaks', value: get() });
    });
    addEventListener('pagehide', flush);
    // Another tab changed the tweaks: follow it.
    addEventListener('storage', (event) => {
      if (event.key !== KEY && event.key !== 'fd-theme' && event.key !== 'fd-density') return;
      const next = load();
      if (!differs(next, state).length) return;
      state = next;
      apply(state);
      sync();
      emit(root, 'fd:change', { name: 'tweaks', value: get() });
    });
  }
  addLauncher();
  setExpanded(isOpen());
}

ready(() => init());
