#!/usr/bin/env node
/*
 * looks-check: render real templates under every named look and under random valid theme records, and hold each
 * render to Fire's rules in the browser.
 *
 *   node scripts/looks-check.mjs            report (exit 0)
 *   node scripts/looks-check.mjs --check    exit 1 on any failure
 *   options  --looks steady,folio   only these named looks (default: all eight; "none" for none)
 *            --random 40            how many random records (default 40)
 *            --seed 8               the seed of the random records (default 8: every run checks the same records)
 *            --templates logs,settings,overview      --widths 1440,375      --jobs 4
 *            --json out.json        the full report      --verbose   every failure, not the first 40
 *
 * What is rendered
 *   Each named look (contract/looks/named, through fire/js/looks.js) by its preview URL, ?look=<name>, the way the
 *   look gallery frames it, in light and in dark. Each random record (seeded, reproducible: a preset palette, toned
 *   or not, or one paletteFrom() builds from a random accent or brand colours; a named type set or a type spec of
 *   families Fire ships; every dial and the signature at random) in one theme picked by the seed. A record the
 *   Tweaks panel can hold is put in its storage, so the panel applies it as it would for a user; a generated palette
 *   or a type spec is added as themeToCss()'s stylesheet, with the rest still through the panel.
 *   Every case renders templates/logs.html, settings.html and overview.html at 1440 and 375 wide.
 *
 * What is checked, per render
 *   errors      no console error and no uncaught exception
 *   overflow    no horizontal page overflow (the page's scroll width within its client width)
 *   text        every visible text node's colour against its effective background: 4.5:1, or 3:1 for large text
 *               (24px and up, or 18.66px and up at weight 700 or more). The background is found by walking up the
 *               ancestors and compositing their background colours (alpha included) until an opaque one; the
 *               text's own alpha and its ancestors' opacity are composited over it. Text over a background image or
 *               gradient, or over a canvas, video or image that sits under it, cannot be measured: it is skipped
 *               and counted. Skipped as not text a reader needs: disabled controls and their labels (aria-disabled
 *               too) and placeholders (their own 3:1 rule is build-palettes.mjs's), text inside a closed or inert
 *               part of the page, and Fire's generated textures (.fd-ascii, decoration by contract: aria-hidden,
 *               under 1.6:1 on purpose).
 *   focus       a keyboard focus ring on a sample of focusable controls (up to 14 per render, spread through the
 *               page): the ring's colour (the outermost solid box-shadow band, or the outline; the wrapper's ring
 *               when the wrapper draws it, as a filter does for its trigger) at 3:1 against the surface around it
 *               (the control's own background for an inset ring), and against the gap colour between control and
 *               ring when the ring has one. A control with no ring at all fails.
 *
 * Output: a summary, then each failure as  case · template@width theme · rule · element · ratio < min.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startServer } from './render-equal.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const { LOOKS } = await load('fire/js/looks.js');
const { PALETTES, TONE_DEFAULT, TONE_RANGE } = await load('fire/js/palettes.js');
const { TYPEFACES, checkTypeSpec } = await load('fire/js/typefaces.js');
const theme = await load('fire/js/theme.js');
const { validateTheme, themeToCss, expandTheme, paletteFrom, fromThemeRecord, DIAL_CHOICES, DIAL_RANGES, SIGNATURE_CHOICES, SIGNATURE_RANGES, CONTRACT, FIRE_VERSION } = theme;

/* ---------- Options ---------- */
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback; };
const CHECK = argv.includes('--check');
const VERBOSE = argv.includes('--verbose');
export const SEED_DEFAULT = 8;
export const RANDOM_DEFAULT = 40;
const SEED = Number(opt('seed', SEED_DEFAULT));
const RANDOM = Number(opt('random', RANDOM_DEFAULT));
const TEMPLATES = opt('templates', 'logs,settings,overview').split(',');
const WIDTHS = opt('widths', '1440,375').split(',').map(Number);
const JOBS = Math.max(1, Number(opt('jobs', 4)));
const lookArg = opt('looks', 'all');
const LOOK_LIST = lookArg === 'all' ? LOOKS : lookArg === 'none' ? [] : lookArg.split(',').map((n) => {
  const l = LOOKS.find((x) => x.name === n);
  if (!l) throw new Error(`looks-check: no look named ${n}`);
  return l;
});

/* ---------- Random records (seeded) ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SHIPPED = (() => {
  const families = new Set(TYPEFACES.flatMap((t) => [t.spec.display, t.spec.sans, t.spec.mono]));
  return [...families];
})();

function randomRecord(rand) {
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const int = (min, max) => Math.round(min + rand() * (max - min));
  const hex = () => `#${Array.from({ length: 3 }, () => int(0, 255).toString(16).padStart(2, '0')).join('')}`;
  const step = ([min, max], s) => Number((Math.round((min + rand() * (max - min)) / s) * s).toFixed(3));
  const record = { contract: CONTRACT, fire: FIRE_VERSION };
  // Palette: a preset most of the time, else one generated from an accent or brand colours.
  const p = rand();
  if (p < 0.6) record.palette = pick(PALETTES).name;
  else if (p < 0.85) record.palette = { from: 'accent', accent: hex(), ...(rand() < 0.6 ? { neutral: rand() < 0.75 ? pick(['pure', 'cool', 'warm', 'tinted']) : int(0, 360) } : {}) };
  else record.palette = { from: 'brand', colors: Array.from({ length: int(1, 3) }, hex) };
  record.tone = rand() < 0.5 ? { ...TONE_DEFAULT } : Object.fromEntries(Object.keys(TONE_DEFAULT).map((k) => [k, int(...TONE_RANGE[k])]));
  // Type: a named set, or a spec of families Fire ships (redrawn until the pairing rules accept it).
  if (rand() < 0.7) record.type = pick(TYPEFACES).name;
  else {
    for (let i = 0; i < 50; i++) {
      const spec = { display: pick(SHIPPED), sans: pick(SHIPPED), mono: pick(SHIPPED) };
      if (rand() < 0.5) spec.headingCase = pick(['sentence', 'upper']);
      if (rand() < 0.5) spec.figures = pick(['proportional', 'tabular']);
      if (!checkTypeSpec(spec, { path: '/type' }).errors.length) { record.type = spec; break; }
    }
    record.type ??= pick(TYPEFACES).name;
  }
  record.dials = {
    corners: step(DIAL_RANGES.corners, 0.125),
    texture: step(DIAL_RANGES.texture, 0.05),
    ...Object.fromEntries(Object.entries(DIAL_CHOICES).map(([k, choices]) => [k, pick(choices)])),
  };
  if (rand() < 0.6) {
    record.signature = {
      ...Object.fromEntries(Object.entries(SIGNATURE_CHOICES).map(([k, choices]) => [k, pick(choices)])),
      cell: rand() < 0.5 ? 'auto' : int(...SIGNATURE_RANGES.cell),
      intensity: step(SIGNATURE_RANGES.intensity, 0.05),
    };
  }
  return record;
}

export function randomCases(count, seed) {
  const rand = mulberry32(seed);
  const out = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 20) {
    const record = randomRecord(rand);
    const themeChoice = rand() < 0.5 ? 'light' : 'dark';
    if (!validateTheme(record).ok) continue;
    if (typeof record.palette !== 'string') {
      try { paletteFrom(record.palette); } catch { continue; } // a spec no accent can satisfy is an error, not a look
    }
    out.push({ id: `random-${String(out.length + 1).padStart(2, '0')}`, record, themes: [themeChoice] });
  }
  return out;
}

/* How a random record reaches the page: the Tweaks state it holds (stored, so the panel applies it), plus
   themeToCss() for a generated palette or a type spec, which the panel cannot hold. */
function setupFor(record) {
  const palette = typeof record.palette === 'string' ? record.palette : undefined;
  const type = typeof record.type === 'string' ? record.type : undefined;
  const held = { ...record, palette: palette ?? 'ember', type: type ?? 'geist' };
  if (!palette) held.tone = { ...TONE_DEFAULT }; // the generated palette is toned in the stylesheet
  const state = fromThemeRecord(held);
  delete state.density;
  const extra = {};
  if (!palette) extra.palette = record.palette;
  if (!type) extra.type = record.type;
  const cssRecord = Object.keys(extra).length ? { ...extra, ...(palette ? {} : { tone: record.tone, dials: { contrast: record.dials?.contrast ?? 'default' } }) } : null;
  // The attributes a type spec sets (heading case, figures): the panel does not own them, so they stay.
  const attrs = cssRecord ? Object.fromEntries(Object.entries(expandTheme(cssRecord).attributes).filter(([k]) => k === 'data-heading-case' || k === 'data-figures')) : {};
  return { state, density: record.dials?.density ?? 'comfortable', css: cssRecord ? themeToCss(cssRecord) : '', attrs };
}

const label = (record) => {
  const pal = typeof record.palette === 'string' ? record.palette : record.palette.from === 'brand' ? `brand ${record.palette.colors.join('+')}` : `accent ${record.palette.accent}`;
  const typ = typeof record.type === 'string' ? record.type : `${record.type.display}/${record.type.sans}`;
  const d = record.dials;
  return `${pal}${Object.values(record.tone).join() === '0,100,0,0' ? '' : ' toned'} · ${typ} · ${d.density} ${d.textSize} · ${d.surfaces}/${d.controls}/${d.elevation}/${d.headings}${d.contrast === 'high' ? ' · high' : ''}`;
};

/* ---------- In the page ---------- */
/* Runs in the browser: returns { text: [...failures], skipped: { image, gradient, media }, measured, focus: [...] }. */
function measurePage() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  /** Any CSS colour → [r, g, b, a] (0–255, alpha 0–1). */
  function rgba(c) {
    if (cache.has(c)) return cache.get(c);
    let out;
    const m = c.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
    const s = c.match(/^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/);
    const alpha = (v) => (v === undefined ? 1 : v.endsWith('%') ? parseFloat(v) / 100 : Number(v));
    if (m) out = [Number(m[1]), Number(m[2]), Number(m[3]), alpha(m[4])];
    else if (s) out = [Number(s[1]) * 255, Number(s[2]) * 255, Number(s[3]) * 255, alpha(s[4])];
    else {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      out = [d[0], d[1], d[2], d[3] / 255];
    }
    cache.set(c, out);
    return out;
  }
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const over = (top, bottom) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1); };
  const dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.getAttribute('data-theme') !== 'light' || document.documentElement.getAttribute('data-theme') === 'dark';
  const CANVAS = dark ? [18, 18, 18, 1] : [255, 255, 255, 1];

  /** The opaque colour behind `el` (its own background included when `self`), or { skip } when an image, a
   *  gradient or media is in the way. Opacity of the elements walked through fades their layers. */
  function background(el, self = true) {
    const layers = [];
    let node = self ? el : el.parentElement;
    while (node) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { skip: /gradient/.test(cs.backgroundImage) ? 'gradient' : 'image' };
      const c = rgba(cs.backgroundColor);
      if (c[3] > 0) {
        layers.push(c);
        if (c[3] >= 0.999) break;
      }
      node = node.parentElement;
    }
    let out = layers.length && layers[layers.length - 1][3] >= 0.999 ? layers.pop() : CANVAS;
    while (layers.length) out = over(layers.pop(), out);
    return { color: out };
  }
  /** Media drawn under the element's box by a positioned sibling (a hero image, a chart canvas). */
  function overMedia(el, rect) {
    const x = rect.left + Math.min(rect.width / 2, 4);
    const y = rect.top + rect.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
    for (const hit of document.elementsFromPoint(x, y)) {
      if (hit === el || el.contains(hit)) continue;
      if (/^(IMG|CANVAS|VIDEO|PICTURE)$/.test(hit.tagName) && !hit.closest('[aria-hidden="true"].fd-ascii, .fd-ascii')) return true;
      if (hit.contains(el)) return false;
    }
    return false;
  }
  const hidden = (el) => !!el.closest('[inert], [hidden], dialog:not([open]), template, script, style, noscript, title');
  const texture = (el) => !!el.closest('.fd-ascii, [data-fd-ascii]');
  const disabled = (el) => !!el.closest(':disabled, [aria-disabled="true"], fieldset:disabled, .fd-field[data-disabled], [data-state="disabled"]');
  function opacityOf(el) {
    let o = 1;
    for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o;
  }
  const describe = (el) => {
    const cls = [...el.classList].filter((c) => c.startsWith('fd-')).slice(0, 2).join('.');
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`;
  };

  const failures = [];
  const skipped = { gradient: 0, image: 0, media: 0, texture: 0 };
  let measured = 0;
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const text = t.textContent.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const el = t.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    if (hidden(el) || disabled(el)) continue;
    if (texture(el)) { skipped.texture++; continue; }
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || cs.display === 'none') continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    const rect = range.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2 || rect.right <= 0 || rect.bottom + scrollY <= 0) continue;
    // Clipped away (a visually hidden label, an overflow-hidden collapsed panel).
    let clipped = false;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.clipPath && s.clipPath !== 'none' && /inset\(50%|rect\(0/.test(s.clipPath + s.clip)) { clipped = true; break; }
      if (s.clip && s.clip !== 'auto') { clipped = true; break; }
      if (s.overflow !== 'visible') {
        const r = n.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || rect.left >= r.right || rect.right <= r.left || rect.top >= r.bottom || rect.bottom <= r.top) { clipped = true; break; }
      }
    }
    if (clipped) continue;
    const opacity = opacityOf(el);
    if (opacity < 0.05) continue;
    const isSvg = el instanceof SVGElement;
    const fg = rgba(isSvg ? cs.fill : cs.color);
    if (fg[3] === 0) continue; // transparent text: a gradient or image clipped to it
    const bg = background(el);
    if (bg.skip) { skipped[bg.skip]++; continue; }
    if (overMedia(el, rect)) { skipped.media++; continue; }
    const shown = over([fg[0], fg[1], fg[2], fg[3] * opacity], bg.color);
    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const min = large ? 3 : 4.5;
    const r = ratio(shown, bg.color);
    measured++;
    if (r < min - 0.005) failures.push({ rule: 'text', element: describe(el), text: text.slice(0, 40), ratio: Number(r.toFixed(2)), min, color: cs.color, background: `rgb(${bg.color.slice(0, 3).map(Math.round).join(' ')})`, size });
  }
  return { failures, skipped, measured };
}

/* Runs in the browser on the focused element: the ring's colour and what it is read against. */
function measureFocus() {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const over = (top, bottom) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1); };
  const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.getAttribute('data-theme') !== 'light');
  const CANVAS = dark ? [18, 18, 18, 1] : [255, 255, 255, 1];
  function background(node) {
    const layers = [];
    for (; node; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = rgba(cs.backgroundColor);
      if (c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; }
    }
    let out = layers.length && layers[layers.length - 1][3] >= 0.999 ? layers.pop() : CANVAS;
    while (layers.length) out = over(layers.pop(), out);
    return out;
  }
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2 || cs.visibility !== 'visible') return null;
  const cls = [...el.classList].filter((c) => c.startsWith('fd-')).slice(0, 2).join('.');
  const name = `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''} "${(el.getAttribute('aria-label') || el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 30)}"`;
  // The shadows, split at top-level commas: "rgb(…) 0px 0px 0px 2px [inset]".
  const shadows = [];
  let depth = 0;
  let cur = '';
  for (const ch of cs.boxShadow === 'none' ? '' : cs.boxShadow) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { shadows.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) shadows.push(cur.trim());
  const bands = shadows.map((s) => {
    const color = (s.match(/^(rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]+)/i) || [])[1];
    const nums = s.replace(/^(rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]+)/i, '').match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
    return { color, inset: /inset/.test(s), x: nums[0] ?? 0, y: nums[1] ?? 0, blur: nums[2] ?? 0, spread: nums[3] ?? 0 };
  }).filter((b) => b.color && b.x === 0 && b.y === 0 && b.blur === 0 && b.spread > 0 && rgba(b.color)[3] > 0.5);
  const outer = bands.filter((b) => !b.inset).sort((a, b) => b.spread - a.spread);
  const inner = bands.filter((b) => b.inset).sort((a, b) => b.spread - a.spread);
  let ring;
  let against;
  let gap = null;
  if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1 && rgba(cs.outlineColor)[3] > 0.5) {
    ring = rgba(cs.outlineColor);
    against = parseFloat(cs.outlineOffset) < 0 ? background(el) : background(el.parentElement);
  } else if (outer.length) {
    ring = rgba(outer[0].color);
    against = background(el.parentElement);
    if (outer[1]) gap = rgba(outer[1].color);
  } else if (inner.length) {
    ring = rgba(inner[0].color);
    against = background(el);
  } else {
    // A control whose wrapper draws its ring (a filter's trigger: .fd-filter:has(> :focus-visible)), or its focus line
    // (a search field: .fd-search:has(> input:focus) draws an inset line in --fd-focus and a transparent halo).
    // Transparent bands are not a ring, so they are skipped; an outer band is read against what is behind the wrapper,
    // an inset one against the wrapper's own ground.
    for (let n = el.parentElement, i = 0; n && i < 2; n = n.parentElement, i++) {
      const ps = getComputedStyle(n).boxShadow;
      if (ps === 'none') continue;
      const all = [...ps.matchAll(/(rgba?\([^)]*\)|color\([^)]*\)) 0px 0px 0px ([\d.]+)px( inset)?/g)]
        .map((m) => ({ color: m[1], spread: Number(m[2]), inset: Boolean(m[3]) }))
        .filter((b) => b.spread > 0 && rgba(b.color)[3] > 0.5)
        .sort((a, b) => b.spread - a.spread);
      const out = all.filter((b) => !b.inset);
      const ins = all.filter((b) => b.inset);
      if (out.length) {
        ring = rgba(out[0].color);
        against = background(n.parentElement);
        if (out[1]) gap = rgba(out[1].color);
        break;
      }
      if (ins.length) {
        ring = rgba(ins[0].color);
        against = background(n);
        break;
      }
    }
    if (!ring) return { name, ring: null };
  }
  if (!against) return { name, skipped: true };
  const shown = over(ring, against);
  const r = Math.min(ratio(shown, against), gap ? ratio(shown, over(gap, against)) : Infinity);
  return { name, ring: `rgb(${ring.slice(0, 3).join(' ')})`, against: `rgb(${against.slice(0, 3).map(Math.round).join(' ')})`, ratio: Number(r.toFixed(2)) };
}

/* ---------- Driver ---------- */
const FREEZE = '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}';

async function render(browser, port, job) {
  const { kase, template, width, colorScheme } = job;
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  // Storage: the template's one-off dialog seen; a random record's Tweaks state; no saved theme (the scheme decides).
  await page.addInitScript(({ setup }) => {
    try {
      localStorage.clear();
      localStorage.setItem('ember-whats-new-seen', '1');
      if (setup) {
        localStorage.setItem('fd-tweaks', JSON.stringify(setup.state));
        if (setup.density !== 'comfortable') localStorage.setItem('fd-density', setup.density);
        for (const [k, v] of Object.entries(setup.attrs)) document.documentElement.setAttribute(k, v);
        if (setup.css) {
          document.addEventListener('DOMContentLoaded', () => {
            const style = document.createElement('style');
            style.dataset.looksCheck = '';
            style.textContent = setup.css;
            document.head.append(style);
          });
        }
      }
    } catch { /* storage blocked */ }
  }, { setup: kase.setup ?? null });
  const query = kase.look ? `?look=${kase.look}` : '';
  const out = { case: kase.id, template, width, theme: colorScheme, errors, overflow: null, text: [], focus: [], skipped: null, measured: 0, focusMeasured: 0 };
  try {
    await page.goto(`http://127.0.0.1:${port}/templates/${template}.html${query}`, { waitUntil: 'load' });
    await page.addStyleTag({ content: FREEZE });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    if (kase.look) {
      const applied = await page.evaluate(() => document.documentElement.getAttribute('data-fd-look'));
      if (applied !== kase.look) errors.push(`?look=${kase.look} was not applied (data-fd-look is ${applied})`);
    }
    const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    if (overflow.scroll > overflow.client + 1) out.overflow = overflow;
    const text = await page.evaluate(measurePage);
    out.text = text.failures;
    out.skipped = text.skipped;
    out.measured = text.measured;
    // Focus: keyboard modality first (one Tab), then a sample of the focusable controls, focused in turn.
    await page.keyboard.press('Tab');
    const count = await page.evaluate(() => {
      const all = [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [tabindex="0"], summary')]
        .filter((el) => !el.closest('[inert], [hidden], dialog:not([open])') && !el.disabled && el.getClientRects().length && getComputedStyle(el).visibility === 'visible');
      const pick = [];
      const n = Math.min(14, all.length);
      for (let i = 0; i < n; i++) pick.push(all[Math.floor((i * all.length) / n)]);
      pick.forEach((el, i) => el.setAttribute('data-looks-focus', String(i)));
      return pick.length;
    });
    for (let i = 0; i < count; i++) {
      const r = await page.evaluate((i) => {
        const el = document.querySelector(`[data-looks-focus="${i}"]`);
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
        el.focus({ focusVisible: true });
        return document.activeElement === el && el.matches(':focus-visible');
      }, i);
      if (!r) continue;
      const m = await page.evaluate(measureFocus);
      if (!m || m.skipped) continue;
      out.focusMeasured++;
      if (m.ring === null) out.focus.push({ rule: 'focus', element: m.name, ratio: 0, min: 3, note: 'no ring' });
      else if (m.ratio < 2.995) out.focus.push({ rule: 'focus', element: m.name, ratio: m.ratio, min: 3, ring: m.ring, against: m.against });
      await page.evaluate(() => document.activeElement?.blur?.());
    }
  } catch (e) {
    errors.push(`render failed: ${e.message.split('\n')[0]}`);
  } finally {
    await context.close();
  }
  return out;
}

async function main() {
  const { chromium } = await import('playwright-core');
  const cases = [
    ...LOOK_LIST.map((l) => ({ id: l.name, look: l.name, record: l.record, themes: ['light', 'dark'] })),
    ...randomCases(RANDOM, SEED).map((c) => ({ ...c, setup: setupFor(c.record) })),
  ];
  const jobs = [];
  for (const kase of cases) for (const template of TEMPLATES) for (const width of WIDTHS) for (const colorScheme of kase.themes) jobs.push({ kase, template, width, colorScheme });
  const server = await startServer(ROOT);
  const browser = await chromium.launch();
  const results = [];
  const started = Date.now();
  try {
    let next = 0;
    await Promise.all(Array.from({ length: JOBS }, async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        results.push(await render(browser, server.port, job));
      }
    }));
  } finally {
    await browser.close();
    await server.close();
  }

  /* ---------- Report ---------- */
  const lines = [];
  const failures = [];
  for (const r of results) {
    const where = `${r.case} · ${r.template}@${r.width} ${r.theme}`;
    for (const e of r.errors) failures.push(`${where} · console · ${e.slice(0, 200)}`);
    if (r.overflow) failures.push(`${where} · overflow · the page scrolls sideways (${r.overflow.scroll} > ${r.overflow.client})`);
    for (const f of [...r.text, ...r.focus]) failures.push(`${where} · ${f.rule} · ${f.element}${f.text ? ` "${f.text}"` : ''} · ${f.note ?? `${f.ratio}:1 < ${f.min}`}${f.color ? ` (${f.color} on ${f.background}, ${f.size}px)` : ''}${f.ring ? ` (ring ${f.ring} on ${f.against})` : ''}`);
  }
  const sum = (k) => results.reduce((n, r) => n + (r[k] || 0), 0);
  const skipped = results.reduce((acc, r) => { for (const [k, v] of Object.entries(r.skipped || {})) acc[k] = (acc[k] || 0) + v; return acc; }, {});
  lines.push(`looks-check: ${cases.length} cases (${LOOK_LIST.length} named looks, ${cases.length - LOOK_LIST.length} random records, seed ${SEED}) × ${TEMPLATES.join(', ')} × ${WIDTHS.join(', ')}: ${results.length} renders in ${Math.round((Date.now() - started) / 1000)}s`);
  lines.push(`  text nodes measured ${sum('measured')}; skipped over a gradient ${skipped.gradient || 0}, over an image ${skipped.image || 0}, over media ${skipped.media || 0}, generated textures (decoration) ${skipped.texture || 0}; focus rings measured ${sum('focusMeasured')}`);
  // Per case: failures by rule.
  const byCase = new Map();
  for (const r of results) {
    const c = byCase.get(r.case) ?? { console: 0, overflow: 0, text: 0, focus: 0 };
    c.console += r.errors.length; c.overflow += r.overflow ? 1 : 0; c.text += r.text.length; c.focus += r.focus.length;
    byCase.set(r.case, c);
  }
  for (const kase of cases) {
    const c = byCase.get(kase.id);
    const bad = Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ');
    lines.push(`  ${bad ? 'FAIL' : 'ok  '} ${kase.id.padEnd(10)} ${kase.look ? '' : `${label(kase.record)}`}${bad ? `  [${bad}]` : ''}`);
  }
  if (failures.length) {
    lines.push(`\n${failures.length} failure(s):`);
    for (const f of VERBOSE ? failures : failures.slice(0, 40)) lines.push(`  ✗ ${f}`);
    if (!VERBOSE && failures.length > 40) lines.push(`  … and ${failures.length - 40} more (--verbose)`);
  } else {
    lines.push('\nok: no console errors, no sideways scroll, every measured text and focus ring reaches its minimum.');
  }
  console.log(lines.join('\n'));
  const json = opt('json', null);
  if (json) fs.writeFileSync(json, JSON.stringify({ seed: SEED, cases: cases.map(({ id, look, record, themes }) => ({ id, look, record, themes })), results }, null, 2));
  if (CHECK && failures.length) process.exitCode = 1;
}

// Run when called as a script; scripts/build-palettes.mjs imports randomCases to hold the same records to the colour rules.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
