#!/usr/bin/env node
// One picture for every entry of contract/index.json that is not a module: contract/pictures/<kind>/<id>.png.
//
//   node scripts/build-pictures.mjs                 render every picture (needs Chromium through playwright-core; npm run build:pictures)
//   node scripts/build-pictures.mjs --only a,b      render only these ids (an id, or kind/id when two kinds share one: agent, form)
//   node scripts/build-pictures.mjs --check         fail when an index entry has no picture or a picture has no entry (no pixels are compared:
//                                                   renders differ between machines; this is the check scripts/build.mjs runs)
//   (no picture is taller than 900 CSS px: a taller one is cut at the bottom on a clean edge)
//   --scale 1.5 --width 640                         a lighter set: the device scale factor and the widest picture in CSS pixels (default 2 and 720)
//
// WHAT IS PICTURED
//   component, pattern    the specimen its docs section shows first and that contains the part's root (catalog root class or tag),
//                         cropped to the specimen box with a 16 px margin on the page ground, in a 720 px wide window
//                         (a wider specimen is laid out in the narrower window, never scaled down). A part whose card says only `phone` is 375 wide.
//   layout, section       the same, in a 1200 px window, then scaled to 720.
//   template              the page's first screen, 1440 x 900 (375 x 812 when its card lists `phone` first), scaled to 720 wide.
// Light theme, default palette and look, device scale factor 2, animations and the caret frozen, Math.random seeded and the clock fixed, so a
// second run on the same machine gives the same bytes. The file is an indexed PNG (at most 256 colours, scripts/lib/png-palette.mjs).
// A new index entry is picked up by the rules above with no change here; OVERRIDES below is for the few that the rules get wrong.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, read } from './lib/source.mjs';
import { serve } from './gate.mjs';
import { decode, padImage, scaleDown, encodePalette } from './lib/png-palette.mjs';
import { pictureFor, PICTURES } from './build-index.mjs';

const DIR = path.join(ROOT, 'contract/pictures');
const MARGIN = 16;          // CSS px of page ground around a specimen
const TOP_LAYER_MARGIN = 24; // around an open overlay
const FIXED_TIME = '2026-03-12T10:00:00Z';
// The gate's freeze (scripts/gate.mjs) plus the caret and smooth scrolling; the docs top bar stops following the scroll (it would cover the top of a tall specimen).
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}.doc-top{position:static!important}';

// ---------------------------------------------------------------- overrides
// Keyed `kind/id` or `id`. Every key is a part whose first matching specimen is the wrong picture; say why in the comment.
//   docs: 'docs/x.html#id'     the part is shown better in another docs section than its card names
//   crop: 'css selector'       picture this element inside the chosen specimen instead of the whole specimen
//   spec: n | 'css selector'   which specimen of the section (index among the section's .doc-specimen, or a selector inside the section)
//   open: 'css selector'       a trigger to click first (the first visible match), for a part that is closed until it is used
//   focus: 'css selector'      an element in the specimen to give focus first, for a part that shows only when it has it
//   shot: selector             what to frame once open (an element in the page, often the overlay); with `union` the specimen too
//   union: true                frame the specimen and `shot` together
//   w: css px                  window width instead of the kind's default
//   top: css px                bring the specimen this far from the top of the window and frame all of the window above it (the page bar)
//   h: css px                  window height instead of the default
//   m: css px                  margin around `shot` instead of 24
const OVERRIDES = {
  // The card's section shows only a thinking dots and a half-written answer (loading states): picture a finished answer from the thread demo.
  message: { docs: 'docs/agent.html#thread', crop: '.fd-message[data-role="assistant"]:has(.fd-message-body)' },
  // The foundations section has no inline code in it: callouts do.
  'inline-code': { docs: 'docs/content.html#callout', crop: '.fd-callout:has(.fd-code)' },
  // Closed until used: open the way the docs specimen does, and frame the trigger with what opens.
  period: { open: '[data-fd-popover="pop-period"]', shot: '#pop-period', union: true },
  listbox: { open: '#cb-model', shot: '.fd-listbox:popover-open', m: 6 },   // the list itself; the combobox is the field, closed
  // The card's section pictures a pending label; the bar itself runs along the top of the window once started.
  pagebar: { spec: 1, open: '[data-demo-bar="start"]', top: 16 },
  // 0.14: the list's questions are closed until a menu opens one; the table specimen has one open in its markup.
  'confirm-row': { spec: 1 },
  // One part, one picture: where a docs section shows several parts, crop to the one the entry is about.
  delta: { crop: '.fd-decision-lead:has(.fd-delta)' },
  panel: { spec: 'aside.fd-panel', crop: 'aside.fd-panel' },
  sidebar: { crop: '.fd-sidebar', w: 1200 },
  impact: { open: '[data-fd-preview-open]', shot: '.fd-impact', m: 16 },   // the result of the preview, which is closed until the button is pressed
  preview: { open: '[data-fd-preview-open]' },
  back: { crop: '.fd-back' },
  breadcrumb: { crop: '.fd-breadcrumb' },
  'doc-frame': { crop: '.fd-doc-frame[data-zoom]' },
  divider: { crop: '[role="separator"]' },
  utilities: { docs: 'docs/forms.html#rows', crop: '.fd-cq' },
  // The layout primitives have no outlined-box specimen in the docs: the tightest element that shows each one.
  'layout/column': { crop: '.fd-column' },
  'layout/grid': { crop: '.fd-grid' },
  'layout/row': { docs: 'docs/foundations.html#layout', crop: '.fd-row' },
  'layout/stack': { docs: 'docs/data.html#progress', spec: 0, crop: '.fd-stack' },
  'layout/grow': { docs: 'docs/foundations.html#layout', crop: '.fd-search.fd-grow' },
  tweaks: { open: '[data-fd-tweaks-open]', shot: '.fd-tweaks', h: 1400, m: 0 },
  skip: { focus: '.fd-skip' },   // out of sight until it has focus (the first Tab on a page)
};

const override = (t) => OVERRIDES[t.key] || OVERRIDES[t.id] || {};

// ---------------------------------------------------------------- targets

/** What to render: every non-module index entry, with its docs target, root class or tag, and surfaces. */
export function targets(index, catalog) {
  const parts = new Map(catalog.components.map((c) => [c.id, c]));
  return index.entries.filter((e) => e.kind !== 'module').map((e) => {
    const c = parts.get(e.id);
    const isPage = e.kind === 'template';
    const [page, section] = isPage ? [e.docs, null] : (override({ key: `${e.kind}/${e.id}`, id: e.id }).docs || e.docs).split('#');
    return {
      id: e.id, kind: e.kind, key: `${e.kind}/${e.id}`, file: pictureFor(e.kind, e.id), page, section,
      root: !isPage && c ? c.root : null, classes: !isPage && c ? c.classes : [],
      phone: isPage ? e.surfaces[0] === 'phone' : e.surfaces.length === 1 && e.surfaces[0] === 'phone',
    };
  });
}

// ---------------------------------------------------------------- browser

// Mulberry32, seeded: the demos that draw random numbers (sparklines, ids) draw the same ones every time.
const SEED = () => { let s = 0x5eed1234; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; try { localStorage.setItem('fd-theme', 'light'); localStorage.setItem('ember-whats-new-seen', '1'); } catch {} };   // the overview's first-run dialog is not its picture

async function openPage(browser, origin, url, w, h, scale) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'light', reducedMotion: 'reduce', deviceScaleFactor: scale, locale: 'en-US', timezoneId: 'UTC' });
  const page = await ctx.newPage();
  await page.addInitScript(SEED);
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  await page.goto(origin + url, { waitUntil: 'load' });
  await page.addStyleTag({ content: FREEZE });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);   // the starters end their loading skeletons and first-run prompts after 600 to 800 ms
  // settle as the gate does: the first moment two frames 200 ms apart are the same, at most 12 tries
  let prev = null;
  for (let i = 0; i < 12; i++) {
    const cur = (await page.screenshot({ type: 'png', scale: 'css' })).toString('base64');
    if (cur === prev) break;
    prev = cur; await page.waitForTimeout(200);
  }
  return { page, close: () => ctx.close() };
}

/** Marks the specimen to picture with data-pic-target and says how it was chosen. Runs in the page. */
function chooseSpecimen({ section, root, classes, spec }) {
  const sec = document.getElementById(section);
  if (!sec) return { error: `no section #${section}` };
  const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
  let list = [...sec.querySelectorAll('.doc-specimen')].filter((el) => !el.parentElement.closest('.doc-specimen'));
  if (!list.length) {
    // a section without a specimen box (foundations: theming): the block that holds the root, directly in the section or a pair of them
    const at = root ? sec.querySelector(`:scope > :not(.doc-section-head) .${root}, :scope > :not(.doc-section-head) ${root}`) : null;
    let el = at;
    while (el && el.parentElement !== sec && !el.parentElement.matches('.doc-pair, .doc-cell')) el = el.parentElement;
    if (!el) return { error: `no specimen in #${section}` };
    list = [el];
  }
  let pick = null, why = '';
  if (typeof spec === 'number') { pick = list[spec]; why = `override #${spec}`; }
  else if (typeof spec === 'string') { pick = list.find((s) => s.querySelector(spec) || s.matches(spec)); why = `override ${spec}`; }
  if (!pick) {
    const q = (s) => (root ? s.querySelector(`.${root}, ${root}`) : null);
    const rootEl = (s) => (root ? [...s.querySelectorAll(`.${root}, ${root}`)].find(shown) : null);
    pick = list.find((s) => shown(s) && rootEl(s)); why = 'root, shown';
    if (!pick) { pick = list.find((s) => q(s)); why = 'root, not shown'; }
    if (!pick) { pick = list.find((s) => shown(s) && classes.some((c) => s.querySelector(`.${c}`))); why = 'a class'; }
    if (!pick) { pick = list.find(shown) || list[0]; why = 'first specimen'; }
  }
  pick.setAttribute('data-pic-target', '');
  return { why, index: list.indexOf(pick), of: list.length };
}

async function frame(page, t, o, scale) {
  const holder = page.locator('[data-pic-target]').first();
  const spot = o.crop ? holder.locator(o.crop).first() : holder;
  await spot.scrollIntoViewIfNeeded();
  if (o.open) {
    const trig = page.locator(`${o.open} >> visible=true`).first();
    await trig.scrollIntoViewIfNeeded();
    await trig.click();
    await page.waitForTimeout(400);
  }
  if (o.focus) { await holder.locator(o.focus).first().focus(); await page.waitForTimeout(200); }
  if (o.top != null) {
    // a part that lives at the window's edge (the page bar): bring the specimen to `top` px from the top and frame everything above it
    await page.evaluate(({ at }) => { const r = document.querySelector('[data-pic-target]').getBoundingClientRect(); window.scrollBy(0, r.top - at); }, { at: o.top });
    const r = await spot.evaluate((el) => { const b = el.getBoundingClientRect(); return b.bottom; });
    const vp = page.viewportSize();
    return { img: decode(await page.screenshot({ clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, Math.ceil(r) + MARGIN) } })), bg: null };
  }
  const bg = await page.evaluate(() => (getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [255, 255, 255]).slice(0, 3).map(Number));
  if (o.shot) {
    // an overlay: a clip of the window around it (and the specimen), so the ground it sits on shows
    const rect = async (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; });
    const vp = page.viewportSize(), m = o.m ?? TOP_LAYER_MARGIN;
    let [x0, y0, x1, y1] = await rect(page.locator(`${o.shot} >> visible=true`).first());
    x0 -= m; y0 -= m; x1 += m; y1 += m;
    // with the specimen: its own edges stay exact (the page around it is not ground to show), the overlay may reach past them
    if (o.union) { const s = await rect(spot); x0 = Math.min(x0, s[0]); y0 = Math.min(y0, s[1]); x1 = Math.max(x1, s[2]); y1 = Math.max(y1, s[3]); }
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(vp.width, x1); y1 = Math.min(vp.height, y1);
    return { img: decode(await page.screenshot({ clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } })), bg };
  }
  return { img: padImage(decode(await spot.screenshot()), Math.round(MARGIN * scale), bg), bg };
}

async function render(browser, origin, t, opts) {
  const o = override(t), scale = opts.scale;
  const cap = scale * opts.width;   // widest picture, device pixels
  if (t.kind === 'template') {
    const [w, h] = t.phone ? [375, 812] : [1440, 900];
    const { page, close } = await openPage(browser, origin, '/' + t.page, w, h, scale);
    const shot = decode(await page.screenshot());
    await close();
    return { img: scaleDown(shot, cap), note: `${w}x${h}` };
  }
  const wide = t.kind === 'layout' || t.kind === 'section';
  const w = o.w || (t.phone ? 375 : wide ? 1200 : opts.width), h = o.h || 1000;
  const { page, close } = await openPage(browser, origin, '/' + t.page, w, h, scale);
  try {
    const pick = await page.evaluate(chooseSpecimen, { section: t.section, root: t.root, classes: t.classes, spec: o.spec });
    if (pick.error) throw new Error(pick.error);
    const { img } = await frame(page, t, o, scale);
    return { img: scaleDown(img, cap), note: `${w}w #${pick.index}/${pick.of} (${pick.why})` };
  } finally { await close(); }
}

const CAP = 900;   // the tallest picture, CSS px

/**
 * A picture taller than CAP is cut at the bottom on a clean edge: the middle of the last blank band (rows that are one flat colour
 * across the middle of the picture, so the gap between two rows or blocks) within the lowest fifth of the allowed height; with none, a straight cut.
 */
export function capHeight(img, scale, cap = CAP) {
  const max = Math.round(cap * scale);
  if (img.height <= max) return { img, cut: null };
  const x0 = Math.floor(img.width * 0.06), x1 = Math.ceil(img.width * 0.94), need = Math.round(6 * scale);
  const flat = (y) => { const o = y * img.width * 4; for (let x = x0 + 1; x < x1; x++) { const i = o + x * 4; if (img.data[i] !== img.data[o + x0 * 4] || img.data[i + 1] !== img.data[o + x0 * 4 + 1] || img.data[i + 2] !== img.data[o + x0 * 4 + 2]) return false; } return true; };
  let cutAt = max, run = 0, found = false;
  for (let y = max - 1; y > max * 0.8; y--) {
    run = flat(y) ? run + 1 : 0;
    if (run >= need) { cutAt = y + Math.floor(run / 2); found = true; break; }
  }
  return { img: { width: img.width, height: cutAt, data: img.data.subarray(0, img.width * cutAt * 4) }, cut: found ? 'clean' : 'straight' };
}

/** The share of pixels that are not the picture's most common colour: a nearly empty picture is a defect to look at. */
function emptiness(img) {
  const seen = new Map();
  for (let i = 0; i < img.width * img.height; i++) { const k = img.data.readUInt32LE(i * 4); seen.set(k, (seen.get(k) || 0) + 1); }
  return 1 - Math.max(...seen.values()) / (img.width * img.height);
}

// ---------------------------------------------------------------- check

function listPictures(dir = DIR) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const kind of fs.readdirSync(dir)) {
    const d = path.join(dir, kind);
    if (fs.statSync(d).isDirectory()) for (const f of fs.readdirSync(d)) out.push(`contract/pictures/${kind}/${f}`);
  }
  return out.sort();
}

/** Problems between the index and the folder: [] when every entry has a picture and every picture has an entry. */
export function checkPictures(index, dir = DIR) {
  const pictured = index.entries.filter((e) => e.kind !== 'module');
  const want = new Set(pictured.map((e) => pictureFor(e.kind, e.id)));
  const have = new Set(listPictures(dir));
  const problems = [];
  if (JSON.stringify(index.pictures) !== JSON.stringify(PICTURES)) problems.push('the index has no `pictures` rule, or a different one (run node scripts/build-index.mjs)');
  for (const f of want) if (!have.has(f)) problems.push(`${f}: an index entry has no picture`);
  for (const f of have) if (!want.has(f)) problems.push(`${f}: a picture with no index entry`);
  for (const f of have) if (want.has(f)) {
    const b = fs.readFileSync(path.join(path.dirname(path.dirname(dir)), f));
    if (b.length < 50 || b.readUInt32BE(0) !== 0x89504e47) problems.push(`${f}: not a PNG`);
  }
  return problems;
}

// ---------------------------------------------------------------- main

async function main() {
  const args = process.argv.slice(2);
  const arg = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
  const index = JSON.parse(read(path.join(ROOT, 'contract/index.json')));
  if (args.includes('--check')) {
    const problems = checkPictures(index);
    for (const p of problems) console.error(`pictures: ${p}`);
    if (problems.length) { console.error('pictures: run `npm run build:pictures` (node scripts/build-pictures.mjs) and review the new files.'); process.exit(1); }
    console.log(`pictures: ${index.entries.filter((e) => e.kind !== 'module').length} entries, ${listPictures().length} pictures`);
    return;
  }
  const catalog = JSON.parse(read(path.join(ROOT, 'contract/catalog.json')));
  const opts = { scale: Number(arg('--scale') || 2), width: Number(arg('--width') || 720) };
  let list = targets(index, catalog);
  if (arg('--only')) {
    const want = new Set(arg('--only').split(',').map((s) => s.trim()).filter(Boolean));
    list = list.filter((t) => want.has(t.id) || want.has(t.key));
    const missing = [...want].filter((w) => !list.some((t) => t.id === w || t.key === w));
    if (missing.length) { console.error(`pictures: not in the index: ${missing.join(', ')}`); process.exit(2); }
  }
  const { chromium } = await import('playwright-core');
  const srv = await serve();
  const browser = await chromium.launch();
  let total = 0, failed = 0, next = 0;
  const lines = [];
  try {
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < list.length) {
        const t = list[next++];
        try {
          const r = await render(browser, srv.origin, t, opts);
          const { img, cut } = capHeight(r.img, opts.scale);
          const note = r.note + (cut ? `, cut ${cut}` : '');
          const png = encodePalette(img);
          const file = path.join(ROOT, t.file);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          if (!fs.existsSync(file) || !fs.readFileSync(file).equals(png)) fs.writeFileSync(file, png);
          total += png.length;
          const empty = emptiness(img);
          lines.push(`${t.key.padEnd(34)} ${String(img.width).padStart(4)}x${String(img.height).padEnd(5)} ${String(Math.round(png.length / 1024)).padStart(4)} KB  ${note}${empty < 0.02 ? '  NEARLY EMPTY' : ''}`);
        } catch (e) { failed++; lines.push(`${t.key.padEnd(34)} FAILED: ${e.message.split('\n')[0]}`); }
      }
    }));
  } finally { await browser.close(); await srv.close(); }
  console.log(lines.sort().join('\n'));
  console.log(`pictures: ${list.length - failed} written, ${failed} failed, ${(total / 1048576).toFixed(2)} MB`);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] === new URL(import.meta.url).pathname) main().catch((e) => { console.error(e); process.exit(1); });
