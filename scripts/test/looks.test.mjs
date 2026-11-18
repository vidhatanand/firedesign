// node --test scripts/test/ : the named looks (contract/looks/named, fire/js/looks.js), the focus ring token, the
// Tweaks panel's Looks row and the ?look= preview (fire/boot.js, fire/js/tweaks.js).
//   Every look is a valid record the panel holds whole, on fonts Fire ships, passing every palette rule under its own
//   contrast level; the eight are far apart. --fd-focus is the accent where it reaches 3:1 on everything a control
//   sits on and the accent text otherwise, for every preset, toned map and generated palette. In Chromium: the Looks
//   row applies a record whole and says which look is active (Custom after a change), Copy theme copies the look's
//   record, ?look=<name> puts the look on <html> before the modules run and saves nothing, and an unknown name is
//   ignored.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOKS, getLook } from '../../fire/js/looks.js';
import { validateTheme, fromThemeRecord, toThemeRecord, paletteFrom } from '../../fire/js/theme.js';
import { PALETTES, paletteTokens, toneTokens, contrast, focusOf, focusGrounds } from '../../fire/js/palettes.js';
import { TYPEFACES, getTypeface, getFamily } from '../../fire/js/typefaces.js';
import { paletteFailures } from '../../fire/js/palette-rules.js';
import { startServer } from '../render-equal.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NAMES = ['steady', 'operator', 'folio', 'hearth', 'instrument', 'marquee', 'gentle', 'clear'];

/* ---------- The records ---------- */

test('eight named looks, in order, each { name, label, note, record } and a valid record the panel holds whole', () => {
  assert.deepEqual(LOOKS.map((l) => l.name), NAMES);
  const files = fs.readdirSync(path.join(ROOT, 'contract/looks/named')).filter((f) => f.endsWith('.json')).sort();
  assert.deepEqual(files, [...NAMES].sort().map((n) => `${n}.json`));
  for (const l of LOOKS) {
    const file = JSON.parse(fs.readFileSync(path.join(ROOT, `contract/looks/named/${l.name}.json`), 'utf8'));
    assert.deepEqual(file, { name: l.name, label: l.label, note: l.note, record: l.record });
    assert.ok(validateTheme(l.record).ok, l.name);
    assert.equal(typeof l.record.palette, 'string', `${l.name}: a preset palette`);
    assert.equal(typeof l.record.type, 'string', `${l.name}: a named type set`);
    assert.match(l.note, /^[A-Z][^.]*\.$/, `${l.name}: the note is one sentence`);
    assert.deepEqual(l.state, fromThemeRecord(l.record));
    const back = toThemeRecord(l.state);
    assert.deepEqual({ ...back, signature: back.signature ?? l.state.signature }, l.record, `${l.name}: the record round-trips`);
    assert.equal(getLook(l.name), l);
  }
  assert.equal(getLook('nope'), undefined);
});

test('every look renders from fonts Fire ships (fire/fonts)', () => {
  const files = fs.readdirSync(path.join(ROOT, 'fire/fonts'));
  for (const l of LOOKS) {
    const t = getTypeface(l.record.type);
    for (const family of new Set([t.display, t.sans, t.mono])) {
      const slug = family.toLowerCase().replace(/\s+/g, '-');
      assert.ok(files.some((f) => f.startsWith(slug)), `${l.name}: ${family} is in fire/fonts`);
      assert.ok(getFamily(family), `${l.name}: ${family} is in the catalogue`);
    }
  }
});

test('every look passes every palette rule, toned and at its own contrast level', () => {
  for (const l of LOOKS) {
    const tokens = toneTokens(paletteTokens(l.record.palette, { contrast: l.record.dials.contrast }), l.record.tone);
    assert.deepEqual(paletteFailures(tokens, { name: l.name }).filter((m) => !/line steps|surface is not lighter|accent-hover moves/.test(m)), [], l.name);
  }
});

test('the eight are far apart: no two share a palette, a type set, or the same structure', () => {
  const key = (k) => LOOKS.map((l) => (typeof k === 'function' ? k(l) : l.record[k]));
  assert.equal(new Set(key('palette')).size, LOOKS.length, 'palettes');
  assert.equal(new Set(key('type')).size, LOOKS.length, 'type sets');
  const structure = key((l) => ['surfaces', 'elevation', 'controls', 'headings', 'density'].map((k) => l.record.dials[k]).join());
  assert.equal(new Set(structure).size, LOOKS.length, 'structure');
});

/* ---------- The focus ring token ---------- */

test('--fd-focus: the accent where it reaches 3:1 on every ground, else the accent text; never under 3:1', () => {
  const check = (tokens, label) => {
    for (const m of [0, 1]) {
      const v = (k) => tokens[k][m];
      const grounds = focusGrounds(tokens, m);
      assert.ok(grounds.every((g) => contrast(v('--fd-focus'), g) >= 3), `${label} ${m ? 'dark' : 'light'}: ${v('--fd-focus')}`);
      assert.equal(v('--fd-focus'), focusOf(v('--fd-accent'), v('--fd-accent-text'), v('--fd-ink'), grounds), `${label}: focusOf`);
      if (grounds.every((g) => contrast(v('--fd-accent'), g) >= 3.02)) assert.equal(v('--fd-focus'), v('--fd-accent'), `${label}: the accent when it passes`);
    }
  };
  for (const p of PALETTES) {
    check(p.tokens, p.name);
    check(toneTokens(p.tokens, { hue: 90, vivid: 140, light: 12, warmth: -60 }), `${p.name} toned`);
  }
  // Volt's lime is 1.3:1 on its light page: the ring is the accent text there, the lime in dark mode.
  const volt = PALETTES.find((p) => p.name === 'volt').tokens;
  assert.equal(volt['--fd-focus'][0], volt['--fd-accent-text'][0]);
  assert.equal(volt['--fd-focus'][1], volt['--fd-accent'][1]);
  // Generated palettes carry it too.
  for (const accent of ['#b8f02c', '#ffe600', '#1f6feb', '#e5386d', '#7af6dd']) check(paletteFrom({ from: 'accent', accent }).tokens, `from ${accent}`);
  check(paletteFrom({ from: 'brand', colors: ['#f2c14e', '#14342b'] }).tokens, 'brand');
});

/* ---------- In the browser ---------- */

test('Tweaks Looks row, Copy theme, and the ?look= preview (Chromium)', async () => {
  const { chromium } = await import('playwright-core');
  const server = await startServer(ROOT);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.port}/docs/tweaks.html`);
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await page.click('.doc-top [data-fd-tweaks-open]');
    const tiles = await page.$$eval('.fd-tweaks-look', (els) => els.map((e) => [e.dataset.value, e.getAttribute('aria-checked'), e.tabIndex]));
    assert.deepEqual(tiles.map((t) => t[0]), NAMES);
    assert.ok(tiles.every((t) => t[1] === 'false'));
    assert.equal(tiles.filter((t) => t[2] === 0).length, 1, 'one tile in the tab order with no look active');
    assert.equal(await page.textContent('[data-tweaks-look]'), 'Fire default');

    await page.click('.fd-tweaks-look[data-value="operator"]');
    const html = await page.evaluate(() => Object.fromEntries([...document.documentElement.attributes].map((a) => [a.name, a.value])));
    assert.equal(html['data-palette'], 'volt');
    assert.equal(html['data-type'], 'terminal');
    assert.equal(html['data-surfaces'], 'outlined');
    assert.equal(html['data-density'], 'compact');
    assert.equal(await page.textContent('[data-tweaks-look]'), 'Operator');
    assert.equal(await page.getAttribute('.fd-tweaks-look[data-value="operator"]', 'aria-checked'), 'true');
    const copied = await page.evaluate(() => new Promise((resolve) => {
      const button = document.querySelector('[data-tweaks-action="copy-theme"]');
      button.addEventListener('fd:copy', (event) => resolve(event.detail.value), { once: true });
      button.click();
    }));
    assert.deepEqual(JSON.parse(copied), getLook('operator').record);
    assert.match(await page.evaluate(async () => (await import('/fire/js/tweaks.js')).toCss()), /The Operator look/);

    // Any change makes it Custom; applyLook from code applies another whole.
    await page.evaluate(async () => (await import('/fire/js/tweaks.js')).set({ corners: 1.5 }));
    assert.equal(await page.textContent('[data-tweaks-look]'), 'Custom');
    const state = await page.evaluate(async () => { const t = await import('/fire/js/tweaks.js'); t.applyLook('gentle'); return { look: t.look(), state: t.get() }; });
    assert.equal(state.look, 'gentle');
    assert.equal(state.state.palette, 'iris');
    assert.deepEqual(state.state.tone, getLook('gentle').record.tone);
    assert.ok(await page.evaluate(() => document.documentElement.style.getPropertyValue('--fd-accent') !== ''), 'a toned look writes its colours');
    // Arrow keys move through the strip and apply (the radio pattern).
    await page.focus('.fd-tweaks-look[data-value="gentle"]');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(async () => (await import('/fire/js/tweaks.js')).look()), 'clear');
    await page.waitForTimeout(300); // writes are coalesced (120 ms)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fd-tweaks')));
    assert.equal(saved.palette, 'graphite');

    // ?look=: a framed preview. The look is on <html> from boot.js, the panel holds it, nothing is saved.
    const before = await page.evaluate(() => [localStorage.getItem('fd-tweaks'), localStorage.getItem('fd-tweaks-boot'), localStorage.getItem('fd-density')]);
    const preview = await context.newPage(); // the same storage as the docs page
    await preview.goto(`http://127.0.0.1:${server.port}/templates/logs.html?look=folio`, { waitUntil: 'load' });
    const p = await preview.evaluate(async () => {
      const t = await import('/fire/js/tweaks.js');
      const r = document.documentElement;
      return { look: r.getAttribute('data-fd-look'), palette: r.getAttribute('data-palette'), type: r.getAttribute('data-type'), density: r.getAttribute('data-density'), held: t.look() };
    });
    assert.deepEqual(p, { look: 'folio', palette: 'paper', type: 'book', density: 'spacious', held: 'folio' });
    await preview.evaluate(async () => (await import('/fire/js/tweaks.js')).set({ corners: 2 }));
    await preview.waitForTimeout(300);
    const after = await preview.evaluate(() => [localStorage.getItem('fd-tweaks'), localStorage.getItem('fd-tweaks-boot'), localStorage.getItem('fd-density')]);
    assert.deepEqual(after, before, 'a preview saves nothing');

    // An unknown name is ignored: the viewer's own saved look applies.
    await preview.goto(`http://127.0.0.1:${server.port}/templates/logs.html?look=%3Cscript%3E`, { waitUntil: 'load' });
    const ignored = await preview.evaluate(() => [document.documentElement.getAttribute('data-fd-look'), document.documentElement.getAttribute('data-palette')]);
    assert.deepEqual(ignored, [null, 'graphite']);
  } finally {
    await browser.close();
    await server.close();
  }
});

test('docs/looks.html: every look, its record and three lazy template frames with ?look=', async () => {
  const { chromium } = await import('playwright-core');
  const server = await startServer(ROOT);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.port}/docs/looks.html`, { waitUntil: 'load' });
    const info = await page.evaluate(() => ({
      sections: [...document.querySelectorAll('.lk-look')].map((s) => s.id),
      frames: [...document.querySelectorAll('.lk-thumb iframe')].map((f) => [f.getAttribute('src'), f.getAttribute('loading')]),
      records: [...document.querySelectorAll('.lk-look .doc-code code')].map((c) => JSON.parse(c.textContent)),
      nav: !!document.querySelector('.doc-nav a[href="looks.html"]'),
    }));
    assert.deepEqual(info.sections, NAMES.map((n) => `look-${n}`));
    assert.equal(info.frames.length, NAMES.length * 3);
    assert.ok(info.frames.every(([src, loading]) => /^\.\.\/templates\/(logs|settings|overview)\.html\?look=[a-z]+$/.test(src) && loading === 'lazy'));
    assert.deepEqual(info.records, LOOKS.map((l) => l.record));
    assert.ok(info.nav, 'in the docs navigation');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await server.close();
  }
});
