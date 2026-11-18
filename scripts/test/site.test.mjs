// node --test scripts/test/ : the 0.8 website grammar (fire/components/site.css, fire/js/site.js), in Chromium.
//   - the header's sheet below desktop: aria-expanded, Escape closes and returns focus, a link closes it, growing to
//     desktop closes it; data-scrolled once the site scrolls
//   - the pricing period switch: data-period, the hidden prices, fd:change
//   - the logo marquee: copied once and moving with motion, a wrapping row and no copy under reduced motion
//   - compare on a phone: one plan column at a time, chosen with the tabs; versus keeps both columns
//   - the fluid type follows the container and the type set; nothing scrolls sideways at 320
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };

const PAGE = `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>site test</title><script src="/fire/boot.js"></script><link rel="stylesheet" href="/fire/fire.css">
<script type="module" src="/fire/fire.js"></script></head>
<body>
<div class="fd-site" id="site">
  <header class="fd-site-header" data-layout="inline" id="header">
    <div class="fd-site-container"><div class="fd-site-header-bar">
      <a class="fd-brand" id="brand" href="#"><span class="fd-brand-name">Ember</span></a>
      <nav class="fd-site-header-nav" id="nav" aria-label="Main"><ul class="fd-site-header-links">
        <li><a class="fd-site-header-link" id="link-docs" href="#docs">Docs</a></li>
        <li><a class="fd-site-header-link" id="link-pricing" href="#pricing">Pricing</a></li>
      </ul></nav>
      <div class="fd-site-header-actions"><a class="fd-btn" data-variant="ghost" id="signin" href="#">Sign in</a><a class="fd-btn" data-variant="primary" id="start" href="#">Start free</a>
        <button class="fd-btn fd-site-header-toggle" id="toggle" type="button" data-variant="ghost" data-icon-only aria-expanded="false" aria-controls="nav" aria-label="Menu"><i data-icon="menu"></i><i data-icon="x"></i></button></div>
    </div></div>
  </header>
  <main>
    <section class="fd-site-section fd-site-hero" data-layout="center" id="hero"><div class="fd-site-container"><div class="fd-site-head"><h1 class="fd-site-display" id="display">Read the web like an API.</h1><p class="fd-site-lead">Scrape, crawl and extract.</p></div></div></section>
    <section class="fd-site-section fd-site-logos" data-layout="marquee" id="logos"><div class="fd-site-container">
      <div class="fd-site-logos-track" id="track"><ul class="fd-site-logos-list" aria-label="Customers"><li class="fd-site-logos-item">Quarry</li><li class="fd-site-logos-item">Northwind</li><li class="fd-site-logos-item">Tessel</li></ul></div>
      <button class="fd-btn fd-site-logos-pause" id="pause" type="button" aria-pressed="false">Pause</button>
    </div></section>
    <section class="fd-site-section fd-site-pricing" data-layout="columns" id="pricing"><div class="fd-site-container">
      <div class="fd-site-pricing-period"><div class="fd-segmented" role="radiogroup" aria-label="Billing period" id="period">
        <button class="fd-segmented-item" role="radio" aria-checked="true" data-value="monthly" id="monthly">Monthly</button>
        <button class="fd-segmented-item" role="radio" aria-checked="false" data-value="yearly" id="yearly">Yearly</button></div></div>
      <div class="fd-site-pricing-plans"><article class="fd-site-pricing-plan"><h3 class="fd-site-pricing-name">Standard</h3>
        <p class="fd-site-pricing-price"><span class="fd-site-pricing-amount" data-period="monthly" id="p-m">$99</span><span class="fd-site-pricing-amount" data-period="yearly" id="p-y" hidden>$83</span></p></article></div>
    </div></section>
    <section class="fd-site-section fd-site-compare" id="compare"><div class="fd-site-container">
      <div class="fd-tabs fd-site-compare-tabs" role="tablist" aria-label="Plan to show"><button class="fd-tab" role="tab" aria-selected="true" data-value="hobby" id="t1">Hobby</button><button class="fd-tab" role="tab" aria-selected="false" tabindex="-1" data-value="standard" id="t2">Standard</button><button class="fd-tab" role="tab" aria-selected="false" tabindex="-1" data-value="scale" id="t3">Scale</button></div>
      <div class="fd-table-wrap fd-site-compare-table" data-variant="plain"><table class="fd-table" aria-label="Plans">
        <thead><tr><th scope="col">Feature</th><th scope="col">Hobby</th><th scope="col">Standard</th><th scope="col">Scale</th></tr></thead>
        <tbody><tr id="row"><th scope="row">Concurrent requests</th><td>5</td><td>50</td><td>200</td></tr></tbody></table></div>
    </div></section>
    <section class="fd-site-section fd-site-compare" data-layout="versus" id="versus"><div class="fd-site-container">
      <div class="fd-table-wrap fd-site-compare-table" data-variant="plain"><table class="fd-table" data-stack aria-label="Versus">
        <thead><tr><th scope="col">Job</th><th scope="col">Ember</th><th scope="col">Yours</th></tr></thead>
        <tbody><tr id="vrow"><th scope="row">Rendering</th><td>Built in</td><td>A browser fleet</td></tr></tbody></table></div>
    </div></section>
    <div id="spacer" class="fd-site-section"><div class="fd-site-container"><p class="fd-site-text">Long page.</p></div></div>
  </main>
</div>
</body></html>`;

async function serve() {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/__site.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); return; }
    const file = path.join(ROOT, url);
    try {
      if (!file.startsWith(ROOT)) throw new Error('outside');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function open(browser, server, { width = 1440, height = 900, motion = 'reduce' } = {}) {
  const context = await browser.newContext({ reducedMotion: motion, viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${server.address().port}/__site.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
  return { context, page, errors };
}

test('browser: header sheet, scrolled state, pricing period, marquee, compare on a phone, fluid type', async () => {
  const server = await serve();
  const browser = await chromium.launch();
  try {
    /* ---- phone: the header's sheet ---- */
    {
      const { context, page, errors } = await open(browser, server, { width: 375 });
      const state = () => page.evaluate(() => ({
        expanded: document.getElementById('toggle').getAttribute('aria-expanded'),
        open: document.getElementById('header').dataset.state || '',
        navShown: getComputedStyle(document.getElementById('nav')).display !== 'none',
        focus: document.activeElement?.id || '',
      }));
      const s0 = await state(); assert.deepEqual(s0, { expanded: 'false', open: '', navShown: false, focus: '' }, 'the sheet starts closed ' + JSON.stringify(s0));
      const events = page.evaluate(() => new Promise((resolve) => { const seen = []; const h = document.getElementById('header'); h.addEventListener('fd:open', () => seen.push('open')); h.addEventListener('fd:close', () => { seen.push('close'); resolve(seen); }); }));
      events.catch(() => {});
      const tabs = async (from, n, shift = false) => { await page.focus(from); const seen = []; for (let i = 0; i < n; i++) { await page.keyboard.press(shift ? 'Shift+Tab' : 'Tab'); seen.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)); } return seen; };
      assert.deepEqual(await tabs('#brand', 2), ['start', 'toggle'], 'closed on a phone: brand, primary action, menu button');
      await page.focus('#toggle');
      await page.keyboard.press('Enter');
      let s = await state();
      assert.equal(s.expanded, 'true'); assert.equal(s.open, 'open'); assert.equal(s.navShown, true);
      assert.deepEqual(await tabs('#brand', 4), ['start', 'toggle', 'link-docs', 'link-pricing'], 'open: brand, primary, menu button, then the links');
      assert.deepEqual(await tabs('#link-docs', 2, true), ['toggle', 'start'], 'and back again');
      assert.notEqual(await tabs('#link-pricing', 1).then((x) => x[0]), 'start', 'past the last link, focus leaves the header');
      await page.focus('#toggle');
      await page.keyboard.press('Escape');
      s = await state();
      assert.deepEqual(s, { expanded: 'false', open: '', navShown: false, focus: 'toggle' }, 'Escape closes and returns focus');
      assert.deepEqual(await events, ['open', 'close']);
      await page.click('#toggle');
      await page.click('#link-docs');
      assert.equal((await state()).open, '', 'following a link closes the sheet');
      await page.click('#toggle');
      await page.setViewportSize({ width: 1200, height: 900 });
      await page.waitForFunction(() => !document.getElementById('header').dataset.state);
      assert.equal((await state()).navShown, true, 'at desktop the links are in the bar');
      assert.deepEqual(await tabs('#brand', 4), ['link-docs', 'link-pricing', 'signin', 'start'], 'desktop: brand, links, actions');
      await page.setViewportSize({ width: 375, height: 900 });

      /* ---- compare: one column at a time ---- */
      const cells = (id) => page.evaluate((id) => [...document.getElementById(id).children].map((c) => getComputedStyle(c).display !== 'none'), id);
      assert.deepEqual(await cells('row'), [true, true, false, false], 'the first plan shows');
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#compare .fd-site-compare-tabs')).display), 'flex');
      const change = page.evaluate(() => new Promise((r) => document.getElementById('compare').addEventListener('fd:change', (e) => { if (e.target.id === 'compare') r(e.detail.value); })));
      change.catch(() => {});
      await page.focus('#t1');
      await page.keyboard.press('ArrowRight');
      assert.equal(await change, 2);
      assert.equal(await page.evaluate(() => document.getElementById('compare').dataset.show), '2');
      assert.deepEqual(await cells('row'), [true, false, true, false], 'the chosen plan shows');
      await page.click('#t3');
      assert.deepEqual(await cells('row'), [true, false, false, true]);
      const vs = await page.evaluate(() => { const row = document.getElementById('vrow'); const [th, a, b] = row.children; return { row: getComputedStyle(row).display, stacked: a.getBoundingClientRect().top > th.getBoundingClientRect().bottom - 1 && b.getBoundingClientRect().top > a.getBoundingClientRect().bottom - 1, label: a.getAttribute('data-label'), head: document.querySelector('#versus thead th:nth-child(2)').textContent }; });
      assert.deepEqual(vs, { row: 'grid', stacked: true, label: 'Ember', head: 'Ember' }, 'versus on a phone: the job, then each answer under its label; the table stays a table');

      /* ---- every split combination stacks, text first, at 375 and 700 ---- */
      await page.evaluate(() => {
        const host = document.querySelector('#site main');
        let html = '';
        for (const side of ['', 'start', 'end']) for (const ratio of ['', 'even', 'media']) for (const sticky of [false, true]) {
          html += `<section class="fd-site-section fd-site-split split-case"${side ? ` data-side="${side}"` : ''}${ratio ? ` data-ratio="${ratio}"` : ''}${sticky ? ' data-sticky' : ''}><div class="fd-site-container"><div class="fd-site-split-text"><h2 class="fd-site-title">Claim</h2></div><div class="fd-site-split-media"><div class="fd-site-text">Media</div></div></div></section>`;
        }
        host.insertAdjacentHTML('beforeend', html);
      });
      for (const width of [375, 700]) {
        await page.setViewportSize({ width, height: 800 });
        const bad = await page.evaluate(() => [...document.querySelectorAll('.split-case')].filter((sec) => {
          const t = sec.querySelector('.fd-site-split-text').getBoundingClientRect(), m = sec.querySelector('.fd-site-split-media').getBoundingClientRect(), c = sec.querySelector('.fd-site-container').getBoundingClientRect();
          return !(m.top >= t.bottom && Math.abs(t.width - m.width) < 1 && m.width > c.width * 0.8);
        }).map((sec) => [sec.dataset.side, sec.dataset.ratio, sec.hasAttribute('data-sticky')].join('/')));
        assert.deepEqual(bad, [], `every split stacks at ${width}`);
      }
      await page.setViewportSize({ width: 375, height: 900 });

      /* ---- nothing scrolls sideways at 320 ---- */
      await page.setViewportSize({ width: 320, height: 800 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
      assert.deepEqual(errors, []);
      await context.close();
    }

    /* ---- desktop: scrolled state, pricing, fluid type, reduced-motion marquee ---- */
    {
      const { context, page, errors } = await open(browser, server, { width: 1440, height: 500 });
      assert.equal(await page.evaluate(() => document.getElementById('header').hasAttribute('data-scrolled')), false);
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForFunction(() => document.getElementById('header').hasAttribute('data-scrolled'));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => !document.getElementById('header').hasAttribute('data-scrolled'));

      const price = () => page.evaluate(() => ({ period: document.getElementById('pricing').dataset.period, m: document.getElementById('p-m').hidden, y: document.getElementById('p-y').hidden }));
      assert.deepEqual(await price(), { period: 'monthly', m: false, y: true }, 'the checked period is applied on load');
      const change = page.evaluate(() => new Promise((r) => document.getElementById('pricing').addEventListener('fd:change', (e) => { if (e.target.id === 'pricing') r(e.detail.value); })));
      change.catch(() => {});
      await page.click('#yearly');
      assert.equal(await change, 'yearly');
      assert.deepEqual(await price(), { period: 'yearly', m: true, y: false });
      await page.focus('#yearly');
      await page.keyboard.press('ArrowLeft');
      assert.deepEqual(await price(), { period: 'monthly', m: false, y: true }, 'the arrow keys switch it too');

      // Reduced motion: no copy, no animation, a wrapping row.
      const marquee = () => page.evaluate(() => {
        const track = document.getElementById('track');
        const lists = track.querySelectorAll('.fd-site-logos-list');
        return { lists: lists.length, cloned: track.hasAttribute('data-cloned'), animation: getComputedStyle(lists[0]).animationName, wrap: getComputedStyle(lists[0]).flexWrap };
      });
      assert.deepEqual(await marquee(), { lists: 1, cloned: false, animation: 'none', wrap: 'wrap' });

      // Fluid type: the display step grows with the container and follows the type set.
      const size = () => page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('display')).fontSize));
      const wide = await size();
      assert.ok(wide >= 70 && wide <= 73, `display at 1440 is about 72px (${wide})`);
      await page.evaluate(() => document.documentElement.setAttribute('data-type', 'poster'));
      assert.ok(await size() > wide * 1.1, 'a type set that steps its headings up scales the display step');
      await page.evaluate(() => document.documentElement.removeAttribute('data-type'));
      await page.setViewportSize({ width: 375, height: 800 });
      const narrow = await size();
      assert.ok(narrow >= 38 && narrow <= 42, `display at 375 is about 40px (${narrow})`);
      assert.deepEqual(errors, []);
      await context.close();
    }

    /* ---- with motion: the marquee is copied once and moves; the pause button stops it ---- */
    {
      const { context, page, errors } = await open(browser, server, { width: 1440, motion: 'no-preference' });
      const m = await page.evaluate(() => {
        const track = document.getElementById('track');
        const [a, b] = track.querySelectorAll('.fd-site-logos-list');
        return { lists: track.querySelectorAll('.fd-site-logos-list').length, hidden: b?.getAttribute('aria-hidden'), inert: b?.inert, animation: getComputedStyle(a).animationName };
      });
      assert.deepEqual(m, { lists: 2, hidden: 'true', inert: true, animation: 'fd-site-marquee' });
      await page.click('#pause');
      assert.equal(await page.evaluate(() => [document.getElementById('pause').getAttribute('aria-pressed'), getComputedStyle(document.querySelector('#track > .fd-site-logos-list')).animationPlayState].join()), 'true,paused');
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
