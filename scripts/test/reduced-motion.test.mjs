// node --test scripts/test/reduced-motion.test.mjs : a person's reduced-motion setting wins over every theme, in
// Chromium, Firefox and WebKit (an engine that is not installed is skipped).
//   With prefers-reduced-motion: reduce, --fd-motion is 0 and transitions take no time, whatever sets the motion dial
//   afterwards: a theme written by themeToCss, the Tweaks panel's set(), a named look, or a product's own rule.
//   With no such setting each of those still takes effect, so the test can tell.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { themeToCss } from '../../fire/js/theme.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
// A named look that sets the motion dial to slow.
const SLOW_LOOK = (await import('../../fire/js/looks.js')).LOOKS.find((look) => look.record?.dials?.motion === 'slow')?.name;

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/fire/fire.css">
<link rel="stylesheet" href="/theme.css" id="theme" disabled><link rel="stylesheet" href="/product.css" id="product" disabled></head>
<body><button class="fd-btn" id="b" type="button">Save</button>
<script type="module" src="/page.js"></script></body></html>`;
// enable(id): switch a stylesheet on and wait until it has loaded, so a reading taken next sees it.
const SCRIPT = `import { tweaks } from '/fire/fire.js'; window.tweaks = tweaks;
window.enable = (id) => new Promise((done) => { const link = document.getElementById(id); link.addEventListener('load', () => done(), { once: true }); link.disabled = false; });
window.ready = true;`;

const pw = await import('playwright-core');
const ENGINES = ['chromium', 'firefox', 'webkit'].filter((name) => fs.existsSync(pw[name].executablePath()));

async function withPage(reducedMotion, fn, engine = 'chromium') {
  const browser = await pw[engine].launch();
  try {
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();
    await page.route('http://fire.localhost/**', (route) => {
      const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
      if (rel === 'index.html') return route.fulfill({ contentType: 'text/html', body: PAGE });
      if (rel === 'page.js') return route.fulfill({ contentType: 'text/javascript', body: SCRIPT });
      if (rel === 'theme.css') return route.fulfill({ contentType: 'text/css', body: themeToCss({ dials: { motion: 'slow' } }) });
      if (rel === 'product.css') return route.fulfill({ contentType: 'text/css', body: ':root { --fd-motion: 2; }' });
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
    });
    await page.goto('http://fire.localhost/index.html');
    await page.waitForFunction(() => window.ready === true);
    await fn(page);
  } finally { await browser.close(); }
}
// The dial as the page sees it, and how long a button's transition takes.
const read = (page) => page.evaluate(() => ({
  motion: Number(getComputedStyle(document.documentElement).getPropertyValue('--fd-motion')),
  longest: Math.max(...getComputedStyle(document.getElementById('b')).transitionDuration.split(',').map((d) => parseFloat(d))),
}));
const WAYS = [
  ['a theme from themeToCss', (page) => page.evaluate(() => enable('theme'))],
  ['the Tweaks panel', (page) => page.evaluate(() => window.tweaks.set({ motion: 'slow' }))],
  ['a named look', (page) => page.evaluate((name) => window.tweaks.applyLook(name), SLOW_LOOK)],
  ['a product\'s own rule', (page) => page.evaluate(() => enable('product'))],
];

test('a named look that slows motion exists, so the test covers that way in', () => assert.ok(SLOW_LOOK));
test('Chromium is installed, so the test runs at all', () => assert.ok(ENGINES.includes('chromium')));

for (const [name, apply] of WAYS) {
  for (const engine of ENGINES) {
    test(`${engine}: reduced motion wins over ${name}`, async () => {
      await withPage('reduce', async (page) => {
        assert.deepEqual(await read(page), { motion: 0, longest: 0 }, 'before');
        await apply(page);
        assert.deepEqual(await read(page), { motion: 0, longest: 0 }, 'after');
      }, engine);
    });
  }
  test(`with no such setting, ${name} still changes the motion`, async () => {
    await withPage('no-preference', async (page) => {
      const before = await read(page);
      assert.equal(before.motion, 1);
      assert.ok(before.longest > 0);
      await apply(page);
      const after = await read(page);
      assert.ok(after.motion > 1, `motion is ${after.motion}`);
      assert.ok(after.longest > before.longest);
    });
  });
}
