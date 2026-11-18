// node --test scripts/test/ : the 0.7 shell package.
//   - initial.js (no DOM): the same name draws the same glyph and tone; accents drop; other characters draw a diamond
//   - in Chromium: the quadrant chart (markup form, fd-chart element, keyboard, tooltip, phone list, states), go-to keys and
//     the shortcut sheet, found records in the command palette, the running pill and the service status control, and the
//     reading column in a band
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { initialMark, initialRows, initialTone, initialChar, INITIAL_TONES } from '../../fire/js/initial.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/* ---------- initial.js ---------- */
test('initial mark: seven rows of five cells, the same for the same name, accents dropped', () => {
  const q = initialRows('Quarry Labs');
  assert.equal(q.length, 7);
  assert.ok(q.every((row) => /^[01]{5}$/.test(row)));
  assert.deepEqual(initialRows('quarry'), q, 'case does not matter');
  assert.deepEqual(initialRows('Élan'), initialRows('E'));
  assert.equal(initialChar('  9 Lives'), '9');
  assert.equal(initialChar('—Quarry'), 'Q', 'the first letter or digit is drawn');
});

test('initial mark: other characters draw a diamond, and an empty name still draws', () => {
  assert.deepEqual(initialRows('✱'), ['00000', '00100', '01110', '11111', '11111', '01110', '00100']);
  assert.equal(initialRows('').length, 7);
});

test('initial mark: the tone is stable, comes from the list and is never danger', () => {
  for (const name of ['Quarry Labs', 'Personal', 'Acme Research', 'Northwind', 'Zephyr', 'x']) {
    assert.equal(initialTone(name), initialTone(name.toUpperCase()));
    assert.ok(INITIAL_TONES.includes(initialTone(name)));
  }
  assert.ok(!INITIAL_TONES.includes('danger'));
  assert.equal(new Set(['Quarry Labs', 'Personal', 'Acme Research', 'Northwind', 'Zephyr', 'Orbit', 'Delta', 'Harbor'].map(initialTone)).size > 2, true, 'names spread over several tones');
});

test('initial mark: the svg is decorative unless named, and escapes its label', () => {
  assert.match(initialMark('Quarry'), /^<svg class="fd-initial" viewBox="-1 0 7 7" fill="currentColor" aria-hidden="true">/);
  assert.match(initialMark('Quarry', { label: true }), /role="img" aria-label="Quarry"/);
  assert.match(initialMark('Q', { label: 'A "quoted" <name>' }), /aria-label="A &quot;quoted&quot; &lt;name>"/);
  assert.ok(!/ style=/.test(initialMark('Quarry')), 'no style attribute');
});

/* ---------- a server for the browser tests ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const QUAD = {
  x: { label: 'Credits per call', min: 0, max: 12, mid: 4 },
  y: { label: 'Success rate', min: 90, max: 100, mid: 97, format: 'percent' },
  corners: { topLeft: 'Cheap and reliable', topRight: { label: 'Worth it', tone: 'success' }, bottomLeft: 'Cheap and flaky', bottomRight: 'Costly and flaky' },
  size: { label: 'Calls', format: 'compact' },
  points: [
    { name: '/search', x: 1, y: 99.6, size: 400000, href: '#search' },
    { name: '/crawl', x: 7.5, y: 98.4, size: 90000 },
    { name: '/parse', x: 3, y: 95, size: 17000, tone: 'warning' },
    { name: '/agent', x: 11, y: 91.2 },
  ],
};
const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>shell test</title><script src="/fire/boot.js"></script><link rel="stylesheet" href="/fire/fire.css">
<script type="module" src="/fire/fire.js"></script><script type="module" src="/fire/elements.js"></script></head>
<body>
<div id="q-markup" class="fd-chart" data-fd-chart="quadrant" data-height="360"><script type="application/json">${JSON.stringify(QUAD)}</script></div>
<div id="q-narrow" style="width:360px"><div id="q-small" class="fd-chart" data-fd-chart="quadrant"><script type="application/json">${JSON.stringify(QUAD)}</script></div></div>
<div id="q-empty" class="fd-chart" data-fd-chart="quadrant"><script type="application/json">{"x":{"label":"A"},"y":{"label":"B"},"points":[]}</script></div>
<div id="q-loading" class="fd-chart" data-fd-chart="quadrant" data-state="loading"></div>
<fd-chart id="q-element" type="quadrant" height="360"></fd-chart>

<nav class="fd-nav" id="nav">
  <a class="fd-nav-item" id="go-logs" href="#logs" data-fd-keys="g l" data-fd-keys-label="Activity logs"><span class="fd-nav-text">Activity logs</span></a>
  <a class="fd-nav-item" id="go-usage" href="#usage" data-fd-keys="g u"><span class="fd-nav-text">Usage</span></a>
  <button class="fd-btn" id="open-search" type="button" data-fd-command-open="cmd" data-fd-keys="/" data-fd-keys-label="Search">Search</button>
  <button class="fd-btn" id="open-sheet" type="button" data-fd-dialog-open="sheet" data-fd-keys="?" data-fd-keys-label="Keyboard shortcuts">Shortcuts</button>
</nav>
<input id="field" aria-label="Field">
<dialog class="fd-dialog" id="sheet" data-fd-shortcuts><div class="fd-dialog-head"><h2 class="fd-dialog-title">Keyboard shortcuts</h2></div><div class="fd-dialog-body"><div data-fd-shortcuts-list></div></div></dialog>

<dialog class="fd-command" id="cmd" aria-label="Command palette">
  <div class="fd-command-search"><input class="fd-command-input" type="text" aria-label="Search"></div>
  <div class="fd-command-list"><div class="fd-command-group"><p class="fd-command-group-label">Pages</p>
    <a class="fd-command-item" href="#logs" data-keywords="requests"><span class="fd-command-item-label">Activity logs</span></a></div></div>
  <div class="fd-command-empty" hidden><p>No results for <span data-fd-command-query></span></p></div>
</dialog>

<button class="fd-running" id="pill" type="button" data-fd-running="runs" data-fd-popover="runs" hidden><span class="fd-running-dot"></span><span class="fd-running-count">0</span><span class="fd-running-label">running</span></button>
<div class="fd-popover" id="runs" popover><div class="fd-running-list" id="runs-list">
  <a class="fd-running-item" href="#a"><span class="fd-running-title">A</span></a><a class="fd-running-item" href="#b"><span class="fd-running-title">B</span></a>
</div></div>
<a class="fd-service-status" id="svc" data-status="operational" href="#status"><i data-icon="activity"></i><span class="fd-service-status-label">All systems operational</span></a>

<span class="fd-tile" id="tile" data-size="28" data-fd-initial="Quarry Labs"></span>
<span class="fd-tile" id="tile-tone" data-size="28" data-tone="danger" data-fd-initial="Quarry Labs"></span>
<span class="fd-brand-mark" id="brand" data-fd-initial="Northwind"></span>

<div class="fd-page"><div class="fd-frame"><section class="fd-band" id="band" data-column="md">Reading</section><section class="fd-band" id="band-xl" data-column="xl">Wide</section></div></div>
</body></html>`;

async function serve() {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/__test.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); return; }
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

async function open(browser, server, { width = 1440, height = 1000 } = {}) {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${server.address().port}/__test.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
  await page.evaluate(() => Promise.all([customElements.whenDefined('fd-chart'), document.fonts.ready]));
  return { context, page, errors };
}

test('browser: quadrant, go-to keys, records, running, service status, initial mark, reading column', async () => {
  const server = await serve();
  const browser = await chromium.launch();
  try {
    const { context, page, errors } = await open(browser, server);
    await page.evaluate((quad) => { const el = document.getElementById('q-element'); el.data = quad; return el.updateComplete; }, QUAD);

    /* ---- quadrant: markup form ---- */
    const q = await page.evaluate(() => {
      const root = document.getElementById('q-markup');
      const points = [...root.querySelectorAll('.fd-quadrant-point')];
      const box = (n) => n.getBoundingClientRect();
      const plot = box(root.querySelector('.fd-quadrant-plot'));
      return {
        state: root.dataset.state,
        count: points.length,
        tags: points.map((p) => p.tagName),
        labels: points.map((p) => p.getAttribute('aria-label')),
        xs: points.map((p) => Math.round(box(p).left + box(p).width / 2 - plot.left)),
        ys: points.map((p) => Math.round(box(p).top + box(p).height / 2 - plot.top)),
        plotW: Math.round(plot.width), plotH: Math.round(plot.height),
        corners: [...root.querySelectorAll('.fd-quadrant-point')].map((p) => p.dataset.corner),
        cell: [...root.querySelectorAll('.fd-quadrant-cell[data-tone]')].map((c) => c.dataset.corner + ':' + c.dataset.tone),
        list: getComputedStyle(root.querySelector('.fd-quadrant-list')).display,
        frame: getComputedStyle(root.querySelector('.fd-quadrant-frame')).display,
        ticks: [...root.querySelectorAll('.fd-quadrant-axis[data-axis="x"] .fd-quadrant-tick')].map((t) => t.textContent),
        yticks: [...root.querySelectorAll('.fd-quadrant-axis[data-axis="y"] .fd-quadrant-tick')].map((t) => t.textContent),
        group: root.querySelector('.fd-quadrant-frame').getAttribute('role'),
      };
    });
    assert.equal(q.state, 'ready');
    assert.equal(q.count, 4);
    assert.deepEqual(q.tags, ['A', 'BUTTON', 'BUTTON', 'BUTTON'], 'a point with an href is a link, the others are buttons');
    assert.match(q.labels[0], /^\/search: Credits per call 1, Success rate 99\.6%, Calls 400,000$/);
    assert.ok(q.xs[0] < q.xs[2] && q.xs[2] < q.xs[1] && q.xs[1] < q.xs[3], `x order ${q.xs}`);
    assert.ok(q.ys[0] < q.ys[1] && q.ys[1] < q.ys[2] && q.ys[2] < q.ys[3], `y order ${q.ys}`);
    assert.ok(q.xs.every((x) => x > 0 && x < q.plotW) && q.ys.every((y) => y > 0 && y < q.plotH), 'points stay inside the field');
    assert.deepEqual(q.corners, ['tl', 'tr', 'bl', 'br']);
    assert.deepEqual(q.cell, ['tr:success']);
    assert.equal(q.list, 'none', 'the list is the phone fallback');
    assert.equal(q.frame, 'grid');
    assert.deepEqual(q.ticks, ['0', '4', '12']);
    assert.deepEqual(q.yticks, ['90%', '97%', '100%']);
    assert.equal(q.group, 'group');

    /* ---- quadrant: tooltip, keyboard, events ---- */
    await page.evaluate(() => {
      window.__events = [];
      const root = document.getElementById('q-markup');
      root.addEventListener('fd:hover', (e) => window.__events.push(['hover', e.detail.name]));
      root.addEventListener('fd:select', (e) => window.__events.push(['select', e.detail.name, e.detail.href]));
    });
    await page.locator('#q-markup .fd-quadrant-point').nth(1).focus();
    assert.equal(await page.locator('#q-markup > .fd-chart-tooltip').getAttribute('data-state'), 'open');
    assert.match(await page.locator('#q-markup > .fd-chart-tooltip').innerText(), /\/crawl[\s\S]*7\.5[\s\S]*98\.4%/);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label').split(':')[0]), '/agent', 'down from /crawl is /agent, the nearest point below');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label').split(':')[0]), '/crawl', 'and up again is back');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label').split(':')[0]), '/parse', 'left of /crawl is /parse');
    await page.keyboard.press('Enter');
    await page.locator('#q-markup .fd-quadrant-point').nth(1).click();
    const events = await page.evaluate(() => window.__events);
    assert.deepEqual(events.filter((e) => e[0] === 'hover').map((e) => e[1]), ['/crawl', '/agent', '/crawl', '/parse', '/crawl']);
    assert.deepEqual(events.filter((e) => e[0] === 'select').map((e) => e[1]), ['/parse', '/crawl']);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#q-markup > .fd-chart-tooltip').getAttribute('data-state'), 'closed');

    /* ---- quadrant: phone fallback, states, redraw, element ---- */
    const narrow = await page.evaluate(() => {
      const root = document.getElementById('q-small');
      const groups = [...root.querySelectorAll('.fd-quadrant-group')];
      return {
        frame: getComputedStyle(root.querySelector('.fd-quadrant-frame')).display,
        list: getComputedStyle(root.querySelector('.fd-quadrant-list')).display,
        groups: groups.map((g) => [g.dataset.corner, g.querySelector('.fd-quadrant-group-label').firstChild.textContent, [...g.querySelectorAll('.fd-quadrant-row-name')].map((n) => n.textContent)]),
        links: root.querySelectorAll('a.fd-quadrant-row').length,
        key: root.querySelector('.fd-quadrant-key').textContent,
      };
    });
    assert.equal(narrow.frame, 'none');
    assert.equal(narrow.list, 'grid');
    assert.deepEqual(narrow.groups, [['tl', 'Cheap and reliable', ['/search']], ['tr', 'Worth it', ['/crawl']], ['bl', 'Cheap and flaky', ['/parse']], ['br', 'Costly and flaky', ['/agent']]]);
    assert.equal(narrow.links, 1);
    assert.equal(narrow.key, 'Credits per call · Success rate · Calls');

    const states = await page.evaluate(() => ({
      empty: document.querySelector('#q-empty .fd-chart-empty-title')?.textContent,
      emptyState: document.getElementById('q-empty').dataset.state,
      loading: document.getElementById('q-loading').getAttribute('aria-busy'),
      loadingRole: document.querySelector('#q-loading .fd-chart-loading')?.getAttribute('role'),
    }));
    assert.deepEqual(states, { empty: 'Nothing to place yet', emptyState: 'empty', loading: 'true', loadingRole: 'status' });

    const redraw = await page.evaluate(async () => {
      const { charts } = await import('/fire/fire.js');
      const root = document.getElementById('q-markup');
      charts.update(root, { points: [{ name: 'Only', x: 6, y: 95 }] });
      const after = [...root.querySelectorAll('.fd-quadrant-point')].map((p) => p.getAttribute('aria-label'));
      charts.update(root, { points: [] });
      const empty = root.dataset.state;
      charts.update(root, { points: [{ name: 'Back', x: 2, y: 98 }] });
      return { after, empty, back: root.dataset.state, axis: root.querySelector('.fd-quadrant-axis[data-axis="x"] .fd-quadrant-axis-title').textContent };
    });
    assert.deepEqual(redraw.after, ['Only: Credits per call 6, Success rate 95%']);
    assert.equal(redraw.empty, 'empty');
    assert.equal(redraw.back, 'ready', 'update merges into the config: the axes survive');
    assert.equal(redraw.axis, 'Credits per call');

    const twin = await page.evaluate(() => {
      const el = document.getElementById('q-element');
      return {
        root: el.className, type: el.getAttribute('data-fd-chart'), points: el.querySelectorAll('.fd-quadrant-point').length,
        script: !!el.querySelector(':scope > script[type="application/json"]'),
      };
    });
    assert.match(twin.root, /fd-chart/);
    assert.equal(twin.type, 'quadrant');
    assert.equal(twin.points, 4, 'fd-chart type="quadrant" draws the same chart from its data');
    assert.equal(twin.script, true);
    assert.equal(await page.locator('#q-element .fd-quadrant-plot').evaluate((n) => n.children.length), 8, 'the element draws four cells and four points');

    /* ---- initial mark ---- */
    const marks = await page.evaluate(() => ({
      tile: document.getElementById('tile').querySelectorAll('svg.fd-initial path').length,
      tone: document.getElementById('tile').dataset.tone,
      label: document.getElementById('tile').getAttribute('aria-label'),
      role: document.getElementById('tile').getAttribute('role'),
      kept: document.getElementById('tile-tone').dataset.tone,
      brand: document.getElementById('brand').querySelector('svg.fd-initial') ? document.getElementById('brand').getAttribute('role') : 'none',
    }));
    assert.equal(marks.tile, 2);
    assert.ok(INITIAL_TONES.includes(marks.tone));
    assert.equal(marks.tone, initialTone('Quarry Labs'));
    assert.equal(marks.label, 'Quarry Labs');
    assert.equal(marks.role, 'img');
    assert.equal(marks.kept, 'danger', 'a tone the author set is kept');
    assert.equal(marks.brand, null, 'a brand mark is decorative');

    /* ---- go-to keys ---- */
    await page.evaluate(() => { window.__clicks = []; for (const id of ['go-logs', 'go-usage']) document.getElementById(id).addEventListener('click', (e) => { e.preventDefault(); window.__clicks.push(id); }); });
    assert.equal(await page.locator('#go-logs .fd-nav-key').textContent(), 'L', 'the nav item shows its last key');
    await page.keyboard.press('g');
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-fd-keys-pending')), 'g');
    assert.equal(await page.locator('.fd-keys-hint').getAttribute('data-state'), 'open');
    await page.keyboard.press('l');
    assert.deepEqual(await page.evaluate(() => window.__clicks), ['go-logs']);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-fd-keys-pending')), false);
    await page.keyboard.press('g'); await page.keyboard.press('Escape'); await page.keyboard.press('u');
    assert.deepEqual(await page.evaluate(() => window.__clicks), ['go-logs'], 'Escape drops the first key');
    await page.keyboard.press('g'); await page.keyboard.press('x');
    assert.deepEqual(await page.evaluate(() => window.__clicks), ['go-logs'], 'a second key with no binding does nothing');
    await page.keyboard.press('g'); await page.keyboard.press('U');
    assert.deepEqual(await page.evaluate(() => window.__clicks), ['go-logs', 'go-usage'], 'letters are case-insensitive');
    await page.locator('#field').focus();
    await page.keyboard.press('g'); await page.keyboard.press('l');
    assert.deepEqual(await page.evaluate(() => window.__clicks), ['go-logs', 'go-usage'], 'keys are ignored in a field');
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-fd-keys-pending')), false);
    await page.locator('#field').blur();
    await page.keyboard.press('g');
    await page.waitForTimeout(1900);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-fd-keys-pending')), false, 'a waiting key times out');

    /* ---- shortcut sheet ---- */
    await page.keyboard.press('?');
    await page.waitForFunction(() => document.getElementById('sheet').open);
    const sheet = await page.evaluate(() => ({
      groups: [...document.querySelectorAll('#sheet .fd-shortcuts-group')].map((g) => [g.querySelector('.fd-shortcuts-label').textContent, [...g.querySelectorAll('.fd-shortcuts-row')].map((r) => r.querySelector('.fd-shortcuts-name').textContent + '=' + [...r.querySelectorAll('kbd')].map((k) => k.textContent).join('+'))]),
    }));
    assert.deepEqual(sheet.groups, [
      ['General', ['Search=/', 'Keyboard shortcuts=?']],
      ['Go to', ['Activity logs=G+L', 'Usage=G+U']],
    ]);
    // a modal is open: keys do nothing
    await page.keyboard.press('g'); await page.keyboard.press('l');
    assert.deepEqual(await page.evaluate(() => window.__clicks), ['go-logs', 'go-usage'], 'keys are ignored while a modal is open');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('sheet').open);

    /* ---- command palette: found records ---- */
    await page.evaluate(async () => {
      const { overlays } = await import('/fire/fire.js');
      window.__searches = [];
      window.__fail = false;
      overlays.command.records({
        group: 'Runs', icon: 'activity', palette: 'cmd', delay: 40,
        search: (query, { signal }) => new Promise((resolve, reject) => {
          window.__searches.push(query);
          const timer = setTimeout(() => (window.__fail ? reject(new Error('offline')) : resolve([
            { id: 'run_1', label: 'run_8f2a91', hint: 'Crawl docs', href: '#run-1' },
            { id: 'run_2', label: 'zzz unrelated name', hint: 'Scrape', href: '#run-2' },
          ])), query.length > 3 ? 120 : 400);
          signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
        }),
      });
    });
    await page.keyboard.press('/');
    await page.waitForFunction(() => document.getElementById('cmd').open);
    await page.keyboard.type('r');
    await page.waitForTimeout(120);
    assert.deepEqual(await page.evaluate(() => window.__searches), [], 'under the minimum length nothing is searched');
    await page.keyboard.type('un');
    await page.waitForTimeout(150);
    const loading = await page.evaluate(() => {
      const g = document.querySelector('#cmd .fd-command-group[data-records="Runs"]');
      return { busy: g.getAttribute('aria-busy'), hidden: g.hidden, note: g.querySelector('.fd-command-note')?.textContent, empty: document.querySelector('#cmd .fd-command-empty').hidden };
    });
    assert.deepEqual(loading, { busy: 'true', hidden: false, note: 'Searching runs…', empty: true });
    await page.keyboard.type('_');   // the earlier search is aborted by the new query
    await page.waitForFunction(() => document.querySelector('#cmd .fd-command-group[data-records="Runs"] .fd-command-item'));
    const found = await page.evaluate(() => ({
      searches: window.__searches,
      rows: [...document.querySelectorAll('#cmd .fd-command-group[data-records="Runs"] .fd-command-item')].map((i) => [i.querySelector('.fd-command-item-label').textContent, i.hasAttribute('data-found'), i.hidden]),
      busy: document.querySelector('#cmd .fd-command-group[data-records="Runs"]').hasAttribute('aria-busy'),
      pages: document.querySelector('#cmd .fd-command-group:not([data-records])').hidden,
      empty: document.querySelector('#cmd .fd-command-empty').hidden,
    }));
    assert.deepEqual(found.searches, ['run', 'run_'], 'a search per query, the older one aborted');
    assert.deepEqual(found.rows, [['run_8f2a91', true, false], ['zzz unrelated name', true, false]], 'the palette\'s own filter never hides a found row');
    assert.equal(found.busy, false);
    assert.equal(found.pages, true, 'actions that do not match are hidden as before');
    assert.equal(found.empty, true);
    // select a record
    await page.evaluate(() => { window.__selected = null; document.getElementById('cmd').addEventListener('fd:select', (e) => { window.__selected = e.detail.data?.id ?? null; }, { once: true }); });
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.__selected), 'run_1');
    await page.waitForFunction(() => !document.getElementById('cmd').open);
    // reopened: records cleared with the query; a failing search says so
    await page.evaluate(() => { window.__fail = true; });
    await page.keyboard.press('/');
    await page.waitForFunction(() => document.getElementById('cmd').open);
    assert.equal(await page.evaluate(() => document.querySelector('#cmd .fd-command-group[data-records="Runs"]').hidden), true, 'records are cleared when the palette reopens');
    await page.keyboard.type('crawl');
    await page.waitForFunction(() => document.querySelector('#cmd .fd-command-note[data-state="error"]'));
    assert.equal(await page.evaluate(() => document.querySelector('#cmd .fd-command-note[data-state="error"]').textContent), 'Could not search runs');
    assert.equal(await page.evaluate(() => document.querySelector('#cmd .fd-command-note[data-state="error"]').getAttribute('role')), 'alert');
    assert.equal(await page.evaluate(() => document.querySelector('#cmd .fd-command-empty').hidden), true, 'an error is not "no results"');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('cmd').open);

    /* ---- running pill ---- */
    const run = await page.evaluate(async () => {
      const pill = document.getElementById('pill');
      const list = document.getElementById('runs-list');
      const out = { start: [pill.hidden, pill.querySelector('.fd-running-count').textContent, pill.getAttribute('aria-label')] };
      list.lastElementChild.remove();
      await new Promise((r) => setTimeout(r, 30));
      out.one = [pill.hidden, pill.querySelector('.fd-running-count').textContent, pill.getAttribute('aria-label')];
      list.firstElementChild.remove();
      await new Promise((r) => setTimeout(r, 30));
      out.none = [pill.hidden, pill.dataset.count];
      return out;
    });
    assert.deepEqual(run.start, [false, '2', '2 running']);
    assert.deepEqual(run.one, [false, '1', '1 running']);
    assert.deepEqual(run.none, [true, '0'], 'with nothing running the pill is hidden');

    /* ---- service status ---- */
    const svc = await page.evaluate(async () => {
      const { shell } = await import('/fire/fire.js');
      const el = document.getElementById('svc');
      const events = [];
      el.addEventListener('fd:change', (e) => events.push(e.detail.value));
      const read = () => [el.dataset.status, el.getAttribute('aria-label'), el.querySelector('.fd-service-status-label').textContent, el.querySelector('svg')?.getAttribute('data-icon')];
      const label = () => getComputedStyle(el.querySelector('.fd-service-status-label')).position;
      const out = { operational: label() };
      shell.setServiceStatus(el, 'degraded');
      out.degraded = read();
      out.degradedLabel = label();
      shell.setServiceStatus(el, 'outage', 'API is down');
      out.outage = read();
      shell.setServiceStatus(el, 'operational');
      out.back = read();
      out.events = events;
      return out;
    });
    assert.equal(svc.operational, 'absolute', 'operational: the label is visually hidden');
    assert.deepEqual(svc.degraded, ['degraded', 'Degraded performance', 'Degraded performance', 'triangle-alert']);
    assert.equal(svc.degradedLabel, 'static', 'degraded: the label shows');
    assert.deepEqual(svc.outage, ['outage', 'API is down', 'API is down', 'circle-alert']);
    assert.deepEqual(svc.back, ['operational', 'All systems operational', 'All systems operational', 'activity']);
    assert.deepEqual(svc.events, ['degraded', 'outage', 'operational']);

    /* ---- reading column ---- */
    const col = await page.evaluate(() => {
      const pad = (id) => { const s = getComputedStyle(document.getElementById(id)); return [parseFloat(s.paddingLeft), parseFloat(s.paddingRight), document.getElementById(id).getBoundingClientRect().width]; };
      return { md: pad('band'), xl: pad('band-xl') };
    });
    assert.ok(Math.abs(col.md[2] - col.md[0] - col.md[1] - 560) < 1.5, `md column is 560px wide: ${col.md}`);
    assert.ok(Math.abs(col.xl[2] - col.xl[0] - col.xl[1] - 768) < 1.5, `xl column is 768px wide: ${col.xl}`);
    assert.ok(Math.abs(col.md[0] - col.md[1]) < 0.5, 'centred');
    await page.setViewportSize({ width: 375, height: 800 });
    const phone = await page.evaluate(() => { const s = getComputedStyle(document.getElementById('band')); return [parseFloat(s.paddingLeft), parseFloat(s.paddingRight), getComputedStyle(document.documentElement).getPropertyValue('--fd-gutter')]; });
    assert.ok(phone[0] < 40 && Math.abs(phone[0] - phone[1]) < 0.5, `on a phone the column fills the band: ${phone}`);

    assert.deepEqual(errors, [], 'nothing logs an error');
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }
});
