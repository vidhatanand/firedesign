// node --test scripts/test/ : the finishing items of 0.8.
//   Every template (but the index and the site-* pages) says its surface on <html>: the first of app, website, phone,
//   email that its card lists; boot.js leaves that attribute alone (with a saved look, with ?look=).
//   A theme record's brand reaches the page through tweaks.set(fromThemeRecord(record)): setBrand() fills .fd-brand.
//   The picture frame's three tile texts are Fire labels (frame.empty, frame.refused, frame.failed); the figure's
//   data-label-frame-* attribute still overrides them.
//   not-found.html has a chip for every state it can show.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('every template says its surface: the first of its card\'s surfaces in the order app, website, phone, email', () => {
  const order = ['app', 'website', 'phone', 'email'];
  const files = fs.readdirSync(path.join(ROOT, 'templates')).filter((f) => f.endsWith('.html') && f !== 'index.html' && !f.startsWith('site-'));
  assert.ok(files.length >= 30);
  for (const f of files) {
    const id = f.replace(/\.html$/, '');
    const card = JSON.parse(read(`contract/cards/templates/${id}.json`));
    const want = order.find((s) => card.surfaces.includes(s));
    const html = /<html[^>]*>/.exec(read(`templates/${f}`))[0];
    assert.match(html, new RegExp(`\\sdata-fd-surface="${want}"`), `${f}: <html> says ${want}`);
  }
  for (const [dir, file, tag] of [['lit-vite', 'index.html', /<html[^>]*>/], ['vue-vite', 'index.html', /<html[^>]*>/], ['next', 'app/layout.tsx', /<html lang[^>]*>/]]) {
    assert.match(tag.exec(read(`starters/${dir}/${file}`))[0], /data-fd-surface="app"/, `starters/${dir}/${file}`);
  }
});

test('not-found.html has a chip for every state it can show', () => {
  const html = read('templates/not-found.html');
  const views = [...html.matchAll(/data-state-view="([^"]+)"/g)].map((m) => m[1]);
  const chips = [...html.matchAll(/data-state-link="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(views.includes('no-access'));
  assert.deepEqual([...chips].sort(), [...views].sort());
  for (const c of chips) assert.ok(c === '404' ? html.includes('href="not-found.html" data-state-link="404"') : html.includes(`href="not-found.html?state=${c}" data-state-link="${c}"`), c);
});

/* ---------- In a browser ---------- */

let chromium;
try { ({ chromium } = await import('playwright-core')); } catch { /* not installed */ }
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let server;
let browser;
let base = '';
if (chromium) {
  server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  try { browser = await chromium.launch(); } catch { browser = null; }
}
const skip = !browser && 'Chromium is not available';
async function open(page, url) {
  await page.goto(`${base}${url}`);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
}

test('boot.js keeps data-fd-surface: with a saved look, and under ?look=', { skip }, async () => {
  const page = await browser.newPage();
  const boot = read('fire/boot.js');
  const run = async (url) => {
    await page.goto(`${base}${url}`);   // a plain file on the server: no script of its own touches <html>
    return page.evaluate((source) => {
      document.documentElement.setAttribute('data-fd-surface', 'app');
      localStorage.setItem('fd-tweaks-boot', JSON.stringify({ attrs: { 'data-palette': 'volt', 'data-density': 'compact' }, props: {} }));
      (0, eval)(source);
      const d = document.documentElement.dataset;
      return { surface: d.fdSurface, palette: d.palette, look: d.fdLook };
    }, boot);
  };
  assert.deepEqual(await run('/fire/favicon.svg'), { surface: 'app', palette: 'volt', look: undefined });
  const looked = await run('/fire/favicon.svg?look=operator');
  assert.equal(looked.look, 'operator');
  assert.equal(looked.surface, 'app');
  await open(page, '/templates/overview.html?look=operator');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.fdSurface), 'app', 'and after the page has loaded');
  await page.close();
});

test('a theme record\'s brand fills every .fd-brand through tweaks.set(fromThemeRecord(record)); a record without one leaves it', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/templates/overview.html');
  const name = () => page.locator('.fd-brand').first().innerText();
  assert.equal((await name()).trim(), 'Ember');
  await page.evaluate(async () => {
    const { set } = await import('/fire/js/tweaks.js');
    const { fromThemeRecord } = await import('/fire/js/theme.js');
    set(fromThemeRecord({ palette: 'volt', brand: { name: 'Quarry Labs', href: '/home' } }));
  });
  assert.equal((await name()).trim(), 'Quarry Labs');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.palette), 'volt', 'the look was applied with it');
  // A logo of the page's own is used; a logo on another host is not (the record has no host list).
  await page.evaluate(async () => {
    const { set } = await import('/fire/js/tweaks.js');
    const { fromThemeRecord } = await import('/fire/js/theme.js');
    set(fromThemeRecord({ brand: { name: 'Quarry Labs', logo: '/fire/favicon.svg' } }));
  });
  assert.match(await page.locator('.fd-brand img.fd-brand-logo').first().getAttribute('src'), /\/fire\/favicon\.svg$/);
  await page.evaluate(async () => {
    const { set } = await import('/fire/js/tweaks.js');
    const { fromThemeRecord } = await import('/fire/js/theme.js');
    set(fromThemeRecord({ brand: { name: 'Northwind', logo: 'https://cdn.example.com/logo.svg' } }));
  });
  assert.equal(await page.locator('.fd-brand img.fd-brand-logo').count(), 0);
  assert.equal((await name()).trim(), 'Northwind');
  await page.evaluate(async () => {
    const { set } = await import('/fire/js/tweaks.js');
    const { fromThemeRecord } = await import('/fire/js/theme.js');
    set(fromThemeRecord({ palette: 'ocean' }));
  });
  assert.equal((await name()).trim(), 'Northwind', 'no brand in the record: the page\'s brand stays');
  await page.close();
});

test('picture frame tile texts are Fire labels; the figure\'s data-label-frame-* attribute overrides', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/docs/documentation.html');
  const text = (state) => page.locator(`#picture-frame figure[data-state="${state}"] .fd-doc-frame-placeholder`).innerText();
  await page.waitForFunction(() => [...document.querySelectorAll('#picture-frame figure[data-fd-src]')].every((el) => el.dataset.state && el.dataset.state !== 'loading'));
  assert.equal(await text('empty'), 'No picture');
  assert.equal(await text('refused'), "This address isn't allowed");
  assert.equal(await text('failed'), "The picture didn't load");
  await page.evaluate(async () => {
    const { setPicture } = await import('/fire/js/docsite.js');
    for (const [state, words] of [['empty', 'Kein Bild'], ['refused', 'Adresse nicht erlaubt'], ['failed', 'Bild nicht geladen']]) {
      const el = document.querySelector(`#picture-frame figure[data-state="${state}"]`);
      el.setAttribute(`data-label-frame-${state}`, words);
      setPicture(el);
    }
  });
  await page.waitForFunction(() => [...document.querySelectorAll('#picture-frame figure[data-fd-src]')].every((el) => el.dataset.state !== 'loading'));
  assert.equal(await text('empty'), 'Kein Bild');
  assert.equal(await text('refused'), 'Adresse nicht erlaubt');
  assert.equal(await text('failed'), 'Bild nicht geladen');
  await page.close();
});

test.after(async () => { await browser?.close(); server?.close(); });
