// node --test scripts/test/docs-site.test.mjs : Fire 0.13, the docs shell and the skip link, in Chromium.
//   - the docs "Copy page" menu takes the product from the page (data-name, data-mcp-url on the menu or its button):
//     no name says "this docs page", no MCP address copies nothing, and a view-md link with its own href is followed
//     instead of opening the converted article; docsite.js names no product
//   - the docs top bar's links slot (nav.fd-doc-top-links): the current link in ink, nothing overlapping at 1440, 1280,
//     1024 and 900, hidden below 900 like the site header's links
//   - the skip link (fd-skip) in the app shell (scripted and static), the site shell, the docs shell and Fire's docs:
//     out of sight and taking no space until the first Tab, then shown at the top start corner with the ring; Enter
//     moves focus to the main with no ring; the static shell works with no script
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

async function serve() {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
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

let server, browser, origin;
test.before(async () => { server = await serve(); browser = await chromium.launch(); origin = `http://127.0.0.1:${server.address().port}`; });
test.after(async () => { await browser?.close(); server?.close(); });

async function open(url, { width = 1440, height = 900, js = true, ready = true } = {}) {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height }, javaScriptEnabled: js });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(origin + url, { waitUntil: 'load' });
  if (js && ready) await page.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
  return { context, page, errors };
}

/* ---------- 1. The copy menu ---------- */

test('docsite.js names no product: the copy menu reads it from the page', () => {
  const code = fs.readFileSync(path.join(ROOT, 'fire/js/docsite.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /ember/i);
  const shell = fs.readFileSync(path.join(ROOT, 'templates/docs-shell.js'), 'utf8');
  assert.match(shell, /data-fd-doc-copy-menu data-name="Ember" data-mcp-url="https:\/\/mcp\.ember\.dev\/v2\/mcp"/);
});

test('copy menu: the name and MCP address come from the page; without them the prompt says "this docs page" and MCP copies nothing', async () => {
  const { context, page, errors } = await open('/docs/documentation.html');
  await page.evaluate(() => {
    window.__copied = []; window.__opened = []; window.__events = [];
    navigator.clipboard.writeText = async (t) => { window.__copied.push(t); };
    window.open = (u) => { window.__opened.push(String(u)); return null; };
    document.addEventListener('fd:copy', (e) => window.__events.push(e.detail.value));
  });
  const choose = async (value) => {
    await page.click('[data-fd-menu="hd-copy"]');
    await page.waitForSelector('#hd-copy:popover-open');
    await page.click(`#hd-copy [data-value="${value}"]`);
    await page.waitForTimeout(100);
  };
  const state = () => page.evaluate(() => ({ copied: window.__copied.slice(), opened: window.__opened.slice(), events: window.__events.slice(), hash: location.hash }));

  await choose('open-ai');
  await choose('mcp');
  let s = await state();
  assert.match(s.copied[0], /^Read the Ember docs page "Crawl a website" below and help me use it\.\n\n# Crawl a website/);
  assert.equal(s.copied[1], 'https://mcp.ember.dev/v2/mcp');
  assert.deepEqual(s.events, ['open-ai', 'mcp']);

  // The attributes may sit on the button that opens the menu instead.
  await page.evaluate(() => {
    const menu = document.getElementById('hd-copy');
    const opener = document.querySelector('[data-fd-menu="hd-copy"]');
    opener.dataset.name = 'Quarry'; opener.dataset.mcpUrl = 'https://mcp.quarry.dev/mcp';
    menu.removeAttribute('data-name'); menu.removeAttribute('data-mcp-url');
  });
  await choose('open-ai');
  await choose('mcp');
  s = await state();
  assert.match(s.copied[2], /^Read the Quarry docs page "Crawl a website"/);
  assert.equal(s.copied[3], 'https://mcp.quarry.dev/mcp');

  // Neither: a neutral prompt, and the MCP item copies nothing and fires nothing.
  await page.evaluate(() => { const o = document.querySelector('[data-fd-menu="hd-copy"]'); delete o.dataset.name; delete o.dataset.mcpUrl; });
  await choose('open-ai');
  await choose('mcp');
  s = await state();
  assert.match(s.copied[4], /^Read this docs page "Crawl a website" below/);
  assert.equal(s.copied.length, 5, 'no MCP address: nothing copied');
  assert.deepEqual(s.events, ['open-ai', 'mcp', 'open-ai', 'mcp', 'open-ai']);

  // view-md as a button opens the converted article; as a link with its own href it is followed, with no blob.
  await choose('view-md');
  s = await state();
  assert.equal(s.opened.length, 1);
  assert.match(s.opened[0], /^blob:/);
  await page.evaluate(() => {
    const btn = document.querySelector('#hd-copy [data-value="view-md"]');
    const a = document.createElement('a');
    a.className = 'fd-menu-item'; a.dataset.value = 'view-md'; a.href = '#crawl.md';
    a.append(...btn.childNodes);
    btn.replaceWith(a);
  });
  await choose('view-md');
  s = await state();
  assert.equal(s.opened.length, 1, 'the link is followed, no blob opens');
  assert.equal(s.hash, '#crawl.md');
  assert.deepEqual(errors, []);
  await context.close();
});

/* ---------- 6. The top bar's links slot ---------- */

test('docs top bar: the website links sit in the tools row, the current one in ink, nothing overlapping; hidden below 900', async () => {
  const { context, page, errors } = await open('/templates/docs-guide.html');
  const measure = () => page.evaluate(() => {
    const row = document.querySelector('.fd-doc-top-row[data-row="tools"]');
    const nav = row.querySelector('nav.fd-doc-top-links');
    const shown = (el) => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
    const links = nav ? [...nav.querySelectorAll('a')] : [];
    const boxes = [row.querySelector('.fd-doc-top-start'), row.querySelector('.fd-doc-search'), ...links, ...row.querySelectorAll('.fd-doc-top-end > :not(nav)')]
      .filter(shown).map((el) => { const r = el.getBoundingClientRect(); return { name: el.textContent.trim().slice(0, 12) || el.className, l: r.left, r: r.right }; });
    const overlaps = [];
    for (let i = 1; i < boxes.length; i++) if (boxes[i].l < boxes[i - 1].r - 0.5) overlaps.push(`${boxes[i - 1].name} / ${boxes[i].name}`);
    return {
      shown: shown(nav),
      labels: links.map((a) => a.textContent),
      current: links.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent),
      colours: links.map((a) => getComputedStyle(a).color),
      clipped: links.filter((a) => a.scrollWidth > a.clientWidth + 0.5).map((a) => a.textContent),
      overlaps,
      scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  for (const width of [1440, 1280, 1024, 900]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(50);
    const m = await measure();
    assert.equal(m.shown, true, `links shown at ${width}`);
    assert.deepEqual(m.labels, ['Pricing', 'Changelog', 'Docs']);
    assert.deepEqual(m.current, ['Docs']);
    assert.notEqual(m.colours[2], m.colours[0], 'the current link is in ink, the others are not');
    assert.deepEqual(m.clipped, [], `no label shrinks at ${width}`);
    assert.deepEqual(m.overlaps, [], `nothing overlaps at ${width}`);
    assert.equal(m.scroll, 0);
  }
  for (const width of [899, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(50);
    assert.equal((await measure()).shown, false, `links hidden at ${width}`);
  }
  // On a phone the other two are in the "More" menu.
  const more = await page.evaluate(() => [...document.querySelectorAll('#docs-more a.fd-menu-item')].map((a) => a.textContent.trim()));
  assert.ok(more.includes('Pricing') && more.includes('Changelog'), more.join());
  assert.deepEqual(errors, []);
  await context.close();
});

/* ---------- 7. The skip link ---------- */

const SHELLS = [
  ['app shell (shell.js)', '/templates/logs.html'],
  ['app shell, static markup', '/templates/shell-static.html'],
  ['site shell', '/templates/site-home.html'],
  ['docs shell', '/templates/docs-guide.html'],
  ['Fire docs', '/docs/navigation.html'],
];

async function skipCheck(page, label) {
  const look = () => page.evaluate(() => {
    const skip = document.querySelector('body > .fd-skip');
    const main = document.getElementById(skip?.getAttribute('href')?.slice(1) || '');
    const r = skip?.getBoundingClientRect(), m = main?.getBoundingClientRect();
    const cs = skip && getComputedStyle(skip);
    return {
      // first in body (icons.js may put its hidden SVG sprite before it: that is not content and takes no focus)
      first: [...document.body.children].find((el) => !(el instanceof SVGElement && el.getAttribute('aria-hidden') === 'true')) === skip,
      text: skip?.textContent, target: main?.tagName, tabindex: main?.getAttribute('tabindex'),
      box: r && [r.width, r.height, r.left, r.top].map(Math.round), main: m && [m.left, m.top, m.width].map(Math.round),
      ring: cs?.boxShadow, bg: cs?.backgroundColor, decoration: cs?.textDecorationLine, active: document.activeElement === skip ? 'skip' : document.activeElement?.tagName,
      mainRing: main && getComputedStyle(main).boxShadow,
    };
  });
  const before = await look();
  assert.equal(before.first, true, `${label}: the skip link is first in body`);
  assert.equal(before.text, 'Skip to content');
  assert.equal(before.target, 'MAIN', `${label}: it points at the main`);
  assert.equal(before.tabindex, '-1');
  assert.ok(before.box[0] <= 1 && before.box[1] <= 1, `${label}: out of sight before focus ${before.box}`);
  await page.keyboard.press('Tab');
  const shown = await look();
  assert.equal(shown.active, 'skip', `${label}: the first Tab lands on it`);
  assert.ok(shown.box[0] > 80 && shown.box[1] >= 28, `${label}: shown as a control ${shown.box}`);
  assert.ok(shown.box[2] >= 4 && shown.box[2] <= 24 && shown.box[3] >= 4 && shown.box[3] <= 24, `${label}: at the top start corner ${shown.box}`);
  assert.match(shown.ring, /rgb/, `${label}: with the focus ring`);
  assert.notEqual(shown.bg, 'rgba(0, 0, 0, 0)', `${label}: on a surface, not a bare link`);
  assert.equal(shown.decoration, 'none');
  assert.deepEqual(shown.main, before.main, `${label}: showing it moves nothing`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
  const after = await look();
  assert.equal(after.active, 'MAIN', `${label}: Enter moves focus to the main`);
  assert.equal(after.mainRing, 'none', `${label}: no ring around the main`);
  assert.ok(after.box[0] <= 1, `${label}: out of sight again`);
}

for (const [label, url] of SHELLS) {
  test(`skip link: ${label}`, async () => {
    const { context, page, errors } = await open(url);
    await page.waitForSelector('body > .fd-skip', { state: 'attached' });
    await page.waitForTimeout(150);
    await skipCheck(page, label);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('skip link: the static shell works with no script', async () => {
  const { context, page } = await open('/templates/shell-static.html', { js: false });
  await skipCheck(page, 'no script');
  await context.close();
});

test('skip link: the card, the specimen and the guide', () => {
  const card = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/cards/skip.json'), 'utf8'));
  assert.deepEqual(card.surfaces, ['app', 'website', 'phone']);
  assert.equal(card.since, '0.13.0');
  assert.match(fs.readFileSync(path.join(ROOT, 'docs/navigation.html'), 'utf8'), /<section class="doc-section" id="skip">[\s\S]*?<a class="fd-skip" href="#sk-main">Skip to content<\/a>/);
  assert.match(fs.readFileSync(path.join(ROOT, 'GUIDE.md'), 'utf8'), /<a class="fd-skip" href="#main">Skip to content<\/a>/);
});

// Found by the skip link: with one more stop in the tab order, the looks check sampled the current chip of a narrow
// subnav, whose own line had replaced the focus ring since the chip row was added.
test('subnav as chips (a narrow settings page): the current chip keeps the focus ring and its shape', async () => {
  const { context, page } = await open('/templates/settings.html', { width: 375, height: 812 });
  await page.keyboard.press('Tab');
  const chips = await page.evaluate(() => [...document.querySelectorAll('a.fd-subnav-item')].map((el) => {
    el.focus({ focusVisible: true });
    const cs = getComputedStyle(el);
    return { current: el.hasAttribute('aria-current'), focused: el.matches(':focus-visible'), shadow: cs.boxShadow, radius: parseFloat(cs.borderTopLeftRadius), height: el.getBoundingClientRect().height };
  }));
  assert.ok(chips.length > 3 && chips.some((c) => c.current), 'the template has a chip row with a current chip');
  const ring = chips.find((c) => !c.current).shadow;
  for (const chip of chips) {
    assert.ok(chip.focused, 'the chip takes keyboard focus');
    assert.equal(chip.shadow, ring, `${chip.current ? 'the current' : 'a'} chip shows the ring`);
    assert.ok(!/inset/.test(chip.shadow), 'the ring, not the chip\'s own line');
    assert.ok(chip.radius >= chip.height / 2, 'the ring follows the round chip');
  }
  await context.close();
});
