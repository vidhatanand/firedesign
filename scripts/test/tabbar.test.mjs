// node --test scripts/test/ : the 0.8 phone tab bar (fd-tabbar).
//   - the Ember shell renders it (templates/shell.js, no DOM) with the right current item and a "More" button
//   - in Chromium: it shows only under 640px, is fixed at the bottom and as tall as --fd-tabbar-h, items are at least 44px
//     and labels stay on one line at 320px, "More" opens and closes the menu sheet (aria-expanded, label kept, sheet stops
//     above the bar, Escape, focus), the top bar's menu button gives way to "More", badge and dot draw, and the parts that sit
//     at the bottom of the screen clear the bar (page, support button, sticky action bar, toast), in a page and in a contained shell
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { renderTabbar, renderShell, TABBAR } from '../../templates/shell.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/* ---------- the Ember shell (no DOM) ---------- */
test('shell: the tab bar is a nav, four links and a More button, the current page marked, no inline style', () => {
  const html = renderTabbar({ active: 'logs' });
  assert.match(html, /^<nav class="fd-tabbar" aria-label="Primary">/);
  assert.ok(!/role="tablist"|role="tab"/.test(html), 'links, not ARIA tabs');
  assert.equal((html.match(/<a class="fd-tabbar-item"/g) || []).length, TABBAR.length);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /href="logs\.html" aria-current="page"/);
  assert.match(html, /<button class="fd-tabbar-item" type="button" data-fd-mobile-nav aria-controls="ember-mobile-nav" aria-expanded="false"><i data-icon="ellipsis"><\/i><span class="fd-tabbar-label">More<\/span>/);
  assert.ok(!/ style=/.test(html));
  assert.equal((renderTabbar({ active: 'settings' }).match(/aria-current/g) || []).length, 0, 'a page outside the bar marks nothing');
  assert.match(renderTabbar({ mobileOpen: true }), /data-fd-mobile-nav aria-controls="ember-mobile-nav" aria-expanded="true"/);
});

test('shell: renderShell puts the tab bar directly in .fd-app, after the menu sheet', () => {
  const html = renderShell({ active: 'overview' });
  const sheet = html.indexOf('class="fd-mobile-nav"');
  const bar = html.indexOf('<nav class="fd-tabbar"');
  assert.ok(sheet > 0 && bar > sheet, 'the bar follows the sheet');
  assert.ok(html.indexOf('</nav>', bar) < html.indexOf('fd-app-fab'), 'and comes before the support button');
});

/* ---------- a server and two pages for the browser tests ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const BAR = `<nav class="fd-tabbar" aria-label="Primary">
  <a class="fd-tabbar-item" id="t-overview" href="#overview" aria-current="page"><i data-icon="home"></i><span class="fd-tabbar-label">Overview</span></a>
  <a class="fd-tabbar-item" id="t-logs" href="#logs" data-dot><i data-icon="list"></i><span class="fd-tabbar-label">Logs</span><span class="fd-sr-only">New activity</span></a>
  <a class="fd-tabbar-item" id="t-decisions" href="#decisions"><i data-icon="inbox"></i><span class="fd-tabbar-label">Decisions</span><span class="fd-tabbar-badge" id="badge">3</span></a>
  <a class="fd-tabbar-item" id="t-usage" href="#usage"><i data-icon="chart-column"></i><span class="fd-tabbar-label">Usage</span></a>
  <button class="fd-tabbar-item" id="more" type="button" data-fd-mobile-nav aria-controls="sheet" aria-expanded="false"><i data-icon="ellipsis"></i><span class="fd-tabbar-label">More</span></button>
</nav>`;
const APP = (attrs) => `<div class="fd-app" data-sidebar="expanded"${attrs}>
  <div class="fd-main">
    <header class="fd-topbar"><span class="fd-topbar-title">Quarry Labs</span>
      <div class="fd-topbar-actions"><button class="fd-btn" id="menu" type="button" data-icon-only data-only="mobile" data-fd-mobile-nav aria-controls="sheet" aria-expanded="false" aria-label="Open menu"><i data-icon="menu"></i></button></div>
    </header>
    <main class="fd-page"><div class="fd-frame"><section class="fd-band" data-grow>
      <form class="fd-form" id="form" aria-label="Webhook">
        ${Array.from({ length: 12 }, (_, n) => `<div class="fd-field"><label class="fd-label" for="f${n}">Field ${n}</label><input class="fd-input" id="f${n}"></div>`).join('\n        ')}
        <div class="fd-form-actions" id="actions" data-variant="sticky"><span class="fd-form-actions-text">Unsaved changes</span><button class="fd-btn" type="submit" data-variant="primary">Save</button></div>
      </form>
    </section></div></main>
  </div>
  <div class="fd-mobile-nav" id="sheet" role="dialog" aria-modal="true" aria-label="Menu" data-state="closed" hidden>
    <div class="fd-mobile-nav-section"><a class="fd-mobile-nav-item" href="#overview"><span>Overview</span><i data-icon="home"></i></a><a class="fd-mobile-nav-item" href="#keys"><span>API keys</span><i data-icon="key-round"></i></a></div>
  </div>
  ${BAR}
  <button class="fd-fab fd-app-fab" id="fab" type="button" aria-label="Chat with support"><i data-icon="message-circle"></i></button>
</div>`;
const page = (attrs) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>tabbar test</title><script src="/fire/boot.js"></script><link rel="stylesheet" href="/fire/fire.css"><script type="module" src="/fire/fire.js"></script></head>
<body>${APP(attrs)}</body></html>`;

async function serve() {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/__page.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(page('')); return; }
    if (url === '/__contained.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(page(' data-contained')); return; }
    const file = path.join(ROOT, url);
    try {
      if (!file.startsWith(ROOT)) throw new Error('outside');
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function open(browser, server, file, { width = 375, height = 700 } = {}) {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height } });
  const pg = await context.newPage();
  const errors = [];
  pg.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  pg.on('pageerror', (error) => errors.push(String(error)));
  await pg.goto(`http://127.0.0.1:${server.address().port}/${file}`, { waitUntil: 'load' });
  await pg.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
  await pg.evaluate(() => document.fonts.ready);
  return { context, page: pg, errors };
}
const box = (pg, sel) => pg.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; }, sel);

test('browser: shows under 640px only, fixed at the bottom, items 44px, labels on one line at 320px', async () => {
  const server = await serve();
  const browser = await chromium.launch();
  try {
    const { context, page: pg, errors } = await open(browser, server, '__page.html', { width: 375 });
    const bar = await pg.evaluate(() => { const s = getComputedStyle(document.querySelector('.fd-tabbar')); return { display: s.display, position: s.position, h: parseFloat(s.height), tablist: !!document.querySelector('[role=tablist]'), direct: document.querySelector('.fd-tabbar').parentElement.classList.contains('fd-app') }; });
    assert.equal(bar.display, 'flex');
    assert.equal(bar.position, 'fixed');
    assert.equal(bar.tablist, false);
    assert.ok(bar.direct);
    const b375 = await box(pg, '.fd-tabbar');
    assert.ok(Math.abs(b375.bottom - 700) < 0.5, `at the bottom of the window: ${b375.bottom}`);
    assert.ok(Math.abs(b375.height - 56) < 0.5, `the token height (56px): ${b375.height}`);
    const current = await pg.evaluate(() => [getComputedStyle(document.getElementById('t-overview')).color, getComputedStyle(document.getElementById('t-usage')).color, getComputedStyle(document.getElementById('t-overview').firstElementChild).strokeWidth, getComputedStyle(document.getElementById('t-usage').firstElementChild).strokeWidth]);
    assert.notEqual(current[0], current[1], 'the current item has its own colour');
    assert.ok(parseFloat(current[2]) > parseFloat(current[3]), 'and a stronger icon');

    await pg.setViewportSize({ width: 320, height: 700 });
    const items = await pg.evaluate(() => [...document.querySelectorAll('.fd-tabbar-item')].map((el) => {
      const r = el.getBoundingClientRect(); const l = el.querySelector('.fd-tabbar-label');
      return { w: r.width, h: r.height, labelH: l.getBoundingClientRect().height, lineH: parseFloat(getComputedStyle(l).lineHeight), over: l.scrollWidth > l.clientWidth };
    }));
    assert.equal(items.length, 5);
    for (const it of items) {
      assert.ok(it.w >= 44 && it.h >= 44, `target at least 44px: ${it.w} x ${it.h}`);
      assert.ok(it.labelH <= it.lineH + 0.5, `the label does not wrap: ${it.labelH}`);
    }
    const overflow = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `nothing overflows at 320px: ${overflow}`);

    await pg.setViewportSize({ width: 639, height: 700 });
    assert.equal(await pg.evaluate(() => getComputedStyle(document.querySelector('.fd-tabbar')).display), 'flex', 'still shown at 639px');
    await pg.setViewportSize({ width: 640, height: 700 });
    assert.equal(await pg.evaluate(() => getComputedStyle(document.querySelector('.fd-tabbar')).display), 'none', 'gone from 640px');
    assert.equal(await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fd-tabbar-space').trim()), '0px');
    assert.equal(await pg.evaluate(() => getComputedStyle(document.querySelector('.fd-main')).paddingBottom), '0px', 'nothing is reserved above 640px');
    assert.notEqual(await pg.evaluate(() => getComputedStyle(document.getElementById('menu')).display), 'none', 'the top bar menu button is back above 640px');
    await pg.setViewportSize({ width: 1440, height: 900 });
    assert.equal(await pg.evaluate(() => getComputedStyle(document.querySelector('.fd-tabbar')).display), 'none');

    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }
});

test('browser: More opens the menu sheet above the bar, keeps its label, closes on Escape and on growth', async () => {
  const server = await serve();
  const browser = await chromium.launch();
  try {
    const { context, page: pg, errors } = await open(browser, server, '__page.html', { width: 375 });
    assert.equal(await pg.evaluate(() => getComputedStyle(document.getElementById('menu')).display), 'none', 'the top bar menu button gives way to More');
    await pg.focus('#more');
    await pg.keyboard.press('Enter');
    await pg.waitForSelector('#sheet[data-state="open"]');
    assert.equal(await pg.getAttribute('#more', 'aria-expanded'), 'true');
    assert.equal(await pg.getAttribute('#more', 'aria-label'), null, 'its own text is its name');
    assert.equal(await pg.textContent('#more .fd-tabbar-label'), 'More');
    assert.equal(await pg.evaluate(() => document.querySelectorAll('#more svg').length), 1, 'and its own icon');
    const sheet = await box(pg, '#sheet');
    const bar = await box(pg, '.fd-tabbar');
    assert.ok(Math.abs(sheet.bottom - bar.top) < 1, `the sheet stops where the bar starts: ${sheet.bottom} vs ${bar.top}`);
    const dimmed = await pg.evaluate(() => [getComputedStyle(document.getElementById('more')).color, getComputedStyle(document.getElementById('t-overview')).color, getComputedStyle(document.getElementById('t-usage')).color]);
    assert.notEqual(dimmed[0], dimmed[2], 'the open item takes the accent colour');
    assert.equal(dimmed[1], dimmed[2], 'and the current page steps back while the sheet is open');
    assert.equal(await pg.evaluate(() => document.activeElement.closest('#sheet') !== null), true, 'focus moves into the sheet');
    await pg.keyboard.press('Escape');
    await pg.waitForFunction(() => document.getElementById('sheet').hidden);
    assert.equal(await pg.getAttribute('#more', 'aria-expanded'), 'false');
    assert.equal(await pg.evaluate(() => document.activeElement.id), 'more', 'focus returns to More');

    await pg.click('#more');
    await pg.waitForSelector('#sheet[data-state="open"]');
    await pg.setViewportSize({ width: 700, height: 700 });
    await pg.waitForFunction(() => document.getElementById('sheet').dataset.state === 'closed');
    assert.equal(await pg.getAttribute('#more', 'aria-expanded'), 'false', 'growing to 640px closes a sheet opened from the bar');

    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }
});

test('browser: a count and a dot draw; the page, support button, sticky actions and toasts clear the bar', async () => {
  const server = await serve();
  const browser = await chromium.launch();
  try {
    const { context, page: pg, errors } = await open(browser, server, '__page.html', { width: 375 });
    const badge = await box(pg, '#badge');
    assert.ok(badge.width >= 18 && badge.height >= 18, 'the count is a tag');
    const decisions = await box(pg, '#t-decisions');
    assert.ok(badge.left > decisions.left + decisions.width / 2 - 1 && badge.right < decisions.right + 12, 'after the icon, inside the item');
    const dot = await pg.evaluate(() => { const s = getComputedStyle(document.getElementById('t-logs'), '::after'); return { content: s.content, w: parseFloat(s.width), bg: s.backgroundColor }; });
    assert.equal(dot.content, '""');
    assert.ok(dot.w >= 6 && dot.w < 12, `a small dot: ${dot.w}`);
    assert.notEqual(dot.bg, 'rgba(0, 0, 0, 0)');

    const space = await pg.evaluate(() => { const probe = document.createElement('div'); probe.style.blockSize = 'var(--fd-tabbar-space)'; document.body.append(probe); const h = probe.getBoundingClientRect().height; probe.remove(); return h; });
    assert.equal(space, 56);
    assert.equal(await pg.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.fd-main')).paddingBottom)), 56, 'the page reserves the bar');
    await pg.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const last = await box(pg, '#actions');
    const bar = await box(pg, '.fd-tabbar');
    assert.ok(last.bottom <= bar.top + 0.5, `the sticky action bar sits above the tab bar: ${last.bottom} vs ${bar.top}`);
    const fab = await box(pg, '#fab');
    assert.ok(fab.bottom <= bar.top - 8, `the support button sits above the bar: ${fab.bottom} vs ${bar.top}`);
    await pg.evaluate(async () => { const { overlays } = await import('/fire/fire.js'); overlays.toast({ title: 'Saved', description: 'Webhook updated.', tone: 'success', duration: 60000 }); });
    await pg.waitForSelector('.fd-toaster .fd-toast');
    await pg.waitForTimeout(300);
    const toast = await box(pg, '.fd-toaster .fd-toast');
    assert.ok(toast.bottom <= bar.top + 0.5, `a toast sits above the bar: ${toast.bottom} vs ${bar.top}`);

    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }
});

test('browser: in a contained shell the bar sits inside the app and the scrolling column stops above it', async () => {
  const server = await serve();
  const browser = await chromium.launch();
  try {
    const { context, page: pg, errors } = await open(browser, server, '__contained.html', { width: 375, height: 600 });
    const r = await pg.evaluate(() => {
      const app = document.querySelector('.fd-app'); const main = document.querySelector('.fd-main'); const bar = document.querySelector('.fd-tabbar'); const sheet = document.getElementById('sheet');
      const a = app.getBoundingClientRect(); const m = main.getBoundingClientRect(); const t = bar.getBoundingClientRect();
      return { position: getComputedStyle(bar).position, appBottom: a.bottom, mainBottom: m.bottom, barTop: t.top, barBottom: t.bottom, sheetBottom: getComputedStyle(sheet).insetBlockEnd, stickyRoom: getComputedStyle(document.getElementById('actions')).getPropertyValue('--fd-tabbar-space') };
    });
    assert.equal(r.position, 'absolute');
    assert.ok(Math.abs(r.barBottom - r.appBottom) < 0.5);
    assert.ok(Math.abs(r.mainBottom - r.barTop) < 1.5, `the scrolling column ends where the bar begins: ${r.mainBottom} vs ${r.barTop}`);
    assert.equal(r.sheetBottom, '56px');
    assert.equal(r.stickyRoom.trim(), '0px', 'what sticks inside the column needs no extra room');
    await pg.evaluate(() => { document.querySelector('.fd-main').scrollTop = 99999; });
    const actions = await box(pg, '#actions');
    const bar = await box(pg, '.fd-tabbar');
    assert.ok(actions.bottom <= bar.top + 0.5, `the sticky bar is above the tab bar: ${actions.bottom} vs ${bar.top}`);
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }
});

test('browser: the Ember templates show the bar under 640px and do not change from 640px up', async () => {
  const server = await serve();
  const browser = await chromium.launch();
  try {
    for (const name of ['overview', 'logs', 'decisions']) {
      const { context, page: pg } = await open(browser, server, `templates/${name}.html`, { width: 375 });
      await pg.waitForSelector('.fd-tabbar');
      assert.equal(await pg.evaluate(() => getComputedStyle(document.querySelector('.fd-tabbar')).display), 'flex', `${name}: shown at 375`);
      assert.equal(await pg.evaluate(() => document.querySelectorAll('.fd-tabbar [aria-current="page"]').length), name === 'overview' || name === 'logs' || name === 'decisions' ? 1 : 0, `${name}: the current page is marked`);
      assert.equal(await pg.evaluate(() => getComputedStyle(document.querySelector('.fd-topbar [data-fd-mobile-nav]')).display), 'none', `${name}: the top bar's menu button gives way to More`);
      await pg.setViewportSize({ width: 640, height: 800 });
      assert.equal(await pg.evaluate(() => getComputedStyle(document.querySelector('.fd-tabbar')).display), 'none', `${name}: hidden at 640`);
      assert.equal(await pg.evaluate(() => getComputedStyle(document.querySelector('.fd-main')).paddingBottom), '0px', `${name}: nothing reserved at 640`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
