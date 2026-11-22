// node --test scripts/test/ : the structural dials (tokens.css data-surfaces, data-elevation, data-controls,
// data-headings), in Chromium.
//   Each value moves the semantic tokens components read, and the components follow with no selector of their own:
//     a card's edge, an input's fill and edge, the page under a card, a menu's shadow, the secondary button's fill and
//     edge (the primary keeps its depth), an eyebrow's face and case.
//   The Tweaks panel holds the four dials: set() writes the attributes (none for the default value), Copy CSS and
//   Copy theme name them, Reset removes them, the Structure section drives them, and fire/boot.js puts a saved value
//   back before the first paint. A value the page declares on <html> is the default.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

const SPECIMEN = `
  <div class="fd-card" id="card"><p class="fd-eyebrow" id="eyebrow">Last run</p><input class="fd-input" id="input" aria-label="Name"></div>
  <button class="fd-btn" id="secondary" type="button">Export CSV</button>
  <button class="fd-btn" data-variant="primary" id="primary" type="button">New monitor</button>
  <button class="fd-btn" data-variant="ghost" id="ghost" type="button">Cancel</button>
  <div class="fd-menu" data-static-demo role="menu" aria-label="Monitor" id="menu"><button class="fd-menu-item" role="menuitem">Pause</button></div>`;

function page(head = '<html>') {
  return `<!doctype html>${head}<head><meta charset="utf-8"><link rel="stylesheet" href="/fire/fire.css"><script src="/fire/boot.js"></script></head><body>${SPECIMEN}<script type="module" src="/fire/fire.js"></script></body></html>`;
}

async function withPage(fn) {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ colorScheme: 'light' });
    const p = await context.newPage();
    await p.route('http://fire.localhost/**', (route) => {
      const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
      if (rel === 'plain.html') return route.fulfill({ contentType: 'text/html', body: page() });
      if (rel === 'declared.html') return route.fulfill({ contentType: 'text/html', body: page('<html data-surfaces="outlined" data-headings="mono">') });
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ contentType: TYPES[path.extname(file)] ?? 'application/octet-stream', body: fs.readFileSync(file) });
    });
    await fn(p);
  } finally {
    await browser.close();
  }
}

/* What the specimen looks like, read from computed styles. */
const probe = (p) => p.evaluate(() => {
  const cs = (id) => getComputedStyle(document.getElementById(id));
  return {
    cardEdge: cs('card').borderTopColor,
    cardBg: cs('card').backgroundColor,
    cardShadow: cs('card').boxShadow,
    pageBg: getComputedStyle(document.body).backgroundColor,
    inputBg: cs('input').backgroundColor,
    inputShadow: cs('input').boxShadow,
    menuShadow: cs('menu').boxShadow,
    secondaryBg: cs('secondary').backgroundColor,
    secondaryShadow: cs('secondary').boxShadow,
    primaryShadow: cs('primary').boxShadow,
    ghostShadow: cs('ghost').boxShadow,
    eyebrowFont: cs('eyebrow').fontFamily,
    eyebrowCase: cs('eyebrow').textTransform,
    eyebrowWeight: cs('eyebrow').fontWeight,
  };
});
const setDials = (p, dials) => p.evaluate((d) => {
  const root = document.documentElement;
  root.style.setProperty('--fd-motion', '0');   // no transitions: read the settled value
  for (const k of ['surfaces', 'elevation', 'controls', 'headings']) root.removeAttribute(`data-${k}`);
  for (const [k, v] of Object.entries(d)) root.setAttribute(`data-${k}`, v);
}, dials);
const transparentEdge = (shadow) => shadow === 'none' || /rgba\(0, 0, 0, 0\)/.test(shadow);

test('each structural value moves the tokens components read, in both themes', async () => {
  await withPage(async (p) => {
    await p.goto('http://fire.localhost/plain.html');
    await p.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready') || document.querySelector('.fd-icon') || true);
    await setDials(p, {});
    const base = await probe(p);
    assert.notEqual(base.cardEdge, 'rgba(0, 0, 0, 0)', 'objects: a card has an edge');
    assert.ok(transparentEdge(base.secondaryShadow), 'soft: the secondary button has no edge');
    assert.match(base.eyebrowFont, /Geist Mono/);
    assert.equal(base.eyebrowCase, 'uppercase');

    // surfaces
    await setDials(p, { surfaces: 'flat' });
    const flat = await probe(p);
    assert.equal(flat.cardEdge, 'rgba(0, 0, 0, 0)', 'flat: no edge');
    assert.notEqual(flat.cardBg, flat.pageBg, 'flat: the card separates from the page by fill');
    assert.equal(flat.pageBg, base.cardBg, 'flat, light: the page takes the surface colour');
    assert.equal(flat.cardBg, base.pageBg, 'flat, light: objects take the page tint');
    assert.notEqual(flat.inputBg, base.inputBg, 'flat: the input is a tinted field');
    await setDials(p, { surfaces: 'outlined' });
    const outlined = await probe(p);
    assert.equal(outlined.cardBg, outlined.pageBg, 'outlined: page and surface are one colour');
    assert.notEqual(outlined.cardEdge, base.cardEdge, 'outlined: a stronger edge');
    assert.notEqual(outlined.inputShadow, base.inputShadow, 'outlined: a 3:1 input edge');

    // elevation
    await setDials(p, { elevation: 'none' });
    const none = await probe(p);
    assert.match(none.menuShadow, /^rgba?\([^)]*\) 0px 0px 0px 1px$/, 'none: the menu keeps only an edge');
    assert.equal(none.primaryShadow, base.primaryShadow, 'none: the primary button keeps its depth');
    await setDials(p, { elevation: 'lifted' });
    const lifted = await probe(p);
    assert.notEqual(lifted.menuShadow, base.menuShadow);
    assert.ok(!transparentEdge(lifted.cardShadow), 'lifted: a card lifts off the page');
    assert.ok(/rgba\(0, 0, 0, 0\)/.test(base.cardShadow) || base.cardShadow === 'none', 'soft: a card has no drop');

    // controls
    await setDials(p, { controls: 'outlined' });
    const co = await probe(p);
    assert.ok(!transparentEdge(co.secondaryShadow), 'outlined controls: the secondary button has an edge');
    assert.ok(transparentEdge(co.ghostShadow), 'outlined controls: a ghost button stays bare');
    assert.equal(co.secondaryBg, 'rgba(0, 0, 0, 0)');
    assert.equal(co.primaryShadow, base.primaryShadow);
    await setDials(p, { controls: 'filled' });
    const cf = await probe(p);
    assert.notEqual(cf.secondaryBg, base.secondaryBg, 'filled: a stronger wash');

    // headings
    await setDials(p, { headings: 'upper' });
    const up = await probe(p);
    assert.doesNotMatch(up.eyebrowFont, /Mono/, 'upper: the sans');
    assert.equal(up.eyebrowCase, 'uppercase');
    assert.equal(up.eyebrowWeight, '500');
    await setDials(p, { headings: 'mono' });
    const mono = await probe(p);
    assert.match(mono.eyebrowFont, /Geist Mono/);
    assert.equal(mono.eyebrowCase, 'none', 'mono: as written');

    // Dark: flat keeps the default pair (the page below, objects above), without edges.
    await p.emulateMedia({ colorScheme: 'dark' });
    await setDials(p, {});
    const darkBase = await probe(p);
    await setDials(p, { surfaces: 'flat' });
    const darkFlat = await probe(p);
    assert.equal(darkFlat.pageBg, darkBase.pageBg);
    assert.equal(darkFlat.cardBg, darkBase.cardBg);
    assert.equal(darkFlat.cardEdge, 'rgba(0, 0, 0, 0)');
  });
});

test('Tweaks holds the four dials: attributes, Copy CSS, Copy theme, Reset, the panel and boot.js', async () => {
  await withPage(async (p) => {
    await p.goto('http://fire.localhost/plain.html');
    const out = await p.evaluate(async () => {
      const tweaks = await import('/fire/js/tweaks.js');
      tweaks.reset();
      const root = document.documentElement;
      const attrs = () => ['surfaces', 'elevation', 'controls', 'headings'].map((k) => root.getAttribute(`data-${k}`));
      const before = attrs();
      tweaks.set({ surfaces: 'flat', elevation: 'lifted', controls: 'outlined', headings: 'mono', palette: 'ocean', tone: { hue: 30 } });
      const after = attrs();
      const css = tweaks.toCss();
      const theme = tweaks.toTheme();
      // A value the dial does not know falls back to the default, as every other dial does.
      tweaks.set({ surfaces: 'glass' });
      const kept = root.getAttribute('data-surfaces');
      tweaks.set({ surfaces: 'flat' });
      // The panel's Structure section drives the same state.
      tweaks.open();
      const group = document.querySelector('.fd-segmented[data-tweak="elevation"]');
      group.querySelector('[data-value="none"]').click();
      await new Promise((r) => setTimeout(r, 50));
      const fromPanel = root.getAttribute('data-elevation');
      const checked = group.querySelector('[aria-checked="true"]').dataset.value;
      await new Promise((r) => setTimeout(r, 200));
      return { before, after, css, theme, kept, fromPanel, checked, boot: localStorage.getItem('fd-tweaks-boot') };
    });
    assert.deepEqual(out.before, [null, null, null, null], 'the default leaves no attribute');
    assert.deepEqual(out.after, ['flat', 'lifted', 'outlined', 'mono']);
    assert.match(out.css, /data-surfaces="flat" data-elevation="lifted" data-controls="outlined" data-headings="mono"/);
    assert.match(out.css, /--fd-surface: light-dark/, 'a toned palette is still written out whole');
    assert.deepEqual(
      { surfaces: out.theme.dials.surfaces, elevation: out.theme.dials.elevation, controls: out.theme.dials.controls, headings: out.theme.dials.headings },
      { surfaces: 'flat', elevation: 'lifted', controls: 'outlined', headings: 'mono' },
    );
    assert.equal(out.kept, null);
    assert.equal(out.fromPanel, 'none');
    assert.equal(out.checked, 'none');
    assert.match(out.boot, /"data-surfaces":"flat"/);

    // boot.js puts the saved look back before the modules run.
    await p.goto('http://fire.localhost/plain.html');
    const early = await p.evaluate(() => document.documentElement.getAttribute('data-surfaces'));
    assert.equal(early, 'flat');

    // Reset removes every dial attribute.
    const reset = await p.evaluate(async () => {
      const tweaks = await import('/fire/js/tweaks.js');
      tweaks.reset();
      return ['surfaces', 'elevation', 'controls', 'headings'].map((k) => document.documentElement.getAttribute(`data-${k}`));
    });
    assert.deepEqual(reset, [null, null, null, null]);
  });
});

test('a dial the page declares on <html> is the default Tweaks returns to', async () => {
  await withPage(async (p) => {
    await p.goto('http://fire.localhost/declared.html');
    const out = await p.evaluate(async () => {
      localStorage.clear();
      const tweaks = await import('/fire/js/tweaks.js');
      const root = document.documentElement;
      const start = tweaks.get();
      tweaks.set({ surfaces: 'objects' });
      const replaced = root.getAttribute('data-surfaces');
      const css = tweaks.toCss();
      tweaks.reset();
      return { start: [start.surfaces, start.headings], replaced, css, after: [root.getAttribute('data-surfaces'), root.getAttribute('data-headings')] };
    });
    assert.deepEqual(out.start, ['outlined', 'mono']);
    assert.equal(out.replaced, 'objects', 'moving away from the page\'s value writes the new one');
    assert.match(out.css, /data-surfaces="objects"/);
    assert.deepEqual(out.after, ['outlined', 'mono']);
  });
});
