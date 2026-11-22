// node --test scripts/test/ : the 0.8 combined filter (fd-filters, fire/js/filters.js) and the toolbar that wraps on purpose.
//   In Chromium, on a test page (every field kind, a list it filters, the address kept) and on docs/data.html:
//   - every kind sets its filter: many (checkboxes), one (radio; again clears), date (preset), text (contains), flag
//   - the chip's operator flips is / is not and says so; the value reopens the panel; remove returns focus sensibly
//   - the search finds fields and values at once, sets "Status: Failed" in one step, and says when nothing matches
//   - the whole path works from the keyboard: F, arrows, Arrow Right / Left, Backspace, Escape, focus back on the button
//   - fd:filter carries { filters, source }; getFilters, setFilters, clearFilters and matches agree
//   - data-fd-for hides items, fills the counts, honours data-fd-out and shows [data-fd-none]; data-fd-url writes the
//     address and the back button restores the set
//   - below 640px the button opens the sheet: fields, then one field's values, back, Done
//   - the toolbar of templates/logs.html: one line when it fits, search and end group then the filters, and a scrolling
//     row on a phone, never one control alone on a line and nothing wider than the page
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };

const item = (value, label, extra = '') => `<button class="fd-menu-item" type="button" data-value="${value}"${extra}><span class="fd-menu-item-label">${label}</span><span class="fd-filters-count"></span></button>`;
const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>filters test</title><link rel="stylesheet" href="/fire/fire.css"><script src="/fire/boot.js"></script><script type="module" src="/fire/fire.js"></script></head>
<body><main class="fd-cq">
<input id="before" aria-label="Before">
<div class="fd-filters" id="f" data-fd-for="#items" data-fd-url data-now="2026-11-18">
  <button class="fd-btn fd-filters-add" id="add" type="button" data-fd-menu="f-menu"><i data-icon="list-filter"></i><span>Filter</span></button>
  <div class="fd-menu fd-filters-menu" id="f-menu" popover>
    <p class="fd-menu-label">Request</p>
    <button class="fd-menu-item" type="button" id="field-status" data-field="status" data-kind="many" data-fd-submenu="f-status"><span class="fd-menu-item-label">Status</span></button>
    <div class="fd-menu fd-filters-panel" id="f-status" popover>${item('success', 'Success')}${item('failed', 'Failed')}${item('queued', 'Queued')}</div>
    <button class="fd-menu-item" type="button" id="field-priority" data-field="priority" data-kind="one" data-fd-submenu="f-priority"><span class="fd-menu-item-label">Priority</span></button>
    <div class="fd-menu fd-filters-panel" id="f-priority" popover>${item('high', 'High')}${item('low', 'Low')}</div>
    <button class="fd-menu-item" type="button" id="field-labels" data-field="labels" data-kind="many" data-fd-submenu="f-labels"><span class="fd-menu-item-label">Labels</span></button>
    <div class="fd-menu fd-filters-panel" id="f-labels" popover>${['billing', 'captcha', 'docs', 'pdf', 'proxy', 'retry', 'timeout', 'webhook', 'zip'].map((l) => item(l, l)).join('')}</div>
    <button class="fd-menu-item" type="button" id="field-target" data-field="target" data-kind="text" data-fd-submenu="f-target"><span class="fd-menu-item-label">Target</span></button>
    <div class="fd-menu fd-filters-panel" id="f-target" popover><input class="fd-input" type="text" placeholder="docs" aria-label="Target contains"></div>
    <button class="fd-menu-item" type="button" id="field-date" data-field="date" data-kind="date" data-fd-submenu="f-date"><span class="fd-menu-item-label">Date</span></button>
    <div class="fd-menu fd-filters-panel" id="f-date" popover>${item('today', 'Today')}${item('7d', 'Last 7 days')}${item('30d', 'Last 30 days')}${item('custom', 'Custom range…')}</div>
    <button class="fd-menu-item" type="button" id="field-cached" data-field="cached" data-kind="flag"><span class="fd-menu-item-label">Cached</span></button>
  </div>
</div>
<ul class="fd-list" id="items">
  <li id="i1" data-status="success" data-priority="high" data-labels="docs retry" data-target="https://docs.ember.dev" data-date="2026-11-18" data-cached>one</li>
  <li id="i2" data-status="failed" data-priority="low" data-labels="timeout" data-target="https://ember.dev/blog" data-date="2026-11-14">two</li>
  <li id="i3" data-status="failed" data-priority="high" data-labels="retry timeout" data-target="https://shop.example.com" data-date="2026-10-20">three</li>
  <li id="i4" data-status="queued" data-priority="low" data-target="https://docs.example.io" data-date="2026-11-17">four</li>
  <li data-fd-none hidden id="none">Nothing matches</li>
</ul>
</main></body></html>`;

let server, browser, base;
test.before(async () => {
  server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/__filters.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); return; }
    const file = path.join(ROOT, url);
    try {
      if (!file.startsWith(ROOT)) throw new Error('outside');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
test.after(async () => { await browser?.close(); server?.close(); });

async function open(url, { width = 1280, height = 900 } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/${url}`);
  await page.waitForFunction(() => document.documentElement.dataset.fdReady !== undefined);
  await page.evaluate(() => {
    window.__events = [];
    document.addEventListener('fd:filter', (e) => window.__events.push({ id: e.target.id, ...e.detail }));
  });
  return { page, errors };
}
const filters = (page, id = 'f') => page.evaluate((id) => window.fdFilters?.getFilters(id) ?? null, id);
const visible = (page) => page.evaluate(() => [...document.querySelectorAll('#items > li:not([data-fd-none])')].filter((li) => !li.hidden).map((li) => li.id));
const active = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('aria-label') || document.activeElement?.className);
const chips = (page) => page.evaluate(() => [...document.querySelectorAll('#f .fd-filter-token')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()));
const live = (page) => page.textContent('#f [data-fd-filters-live]');
async function withApi(page) {
  await page.evaluate(async () => { window.fdFilters = (await import('/fire/fire.js')).filters; });
}

test('setup: roles, the search, the key, a panel search past eight values, chips list and Clear', async () => {
  const { page, errors } = await open('__filters.html');
  const facts = await page.evaluate(() => ({
    menuRole: document.getElementById('f-menu').getAttribute('role'),
    innerMenu: !!document.querySelector('#f-menu > [role="menu"]:not(.fd-menu)'),
    search: document.querySelector('#f-menu .fd-filters-search input')?.getAttribute('aria-label'),
    status: [...document.querySelectorAll('#f-status .fd-menu-item')].map((i) => i.getAttribute('role')),
    priority: document.querySelector('#f-priority .fd-menu-item').getAttribute('role'),
    flag: document.getElementById('field-cached').getAttribute('role'),
    labelsSearch: !!document.querySelector('#f-labels > .fd-filters-search'),
    statusSearch: !!document.querySelector('#f-status > .fd-filters-search'),
    panelName: document.getElementById('f-status').getAttribute('aria-label'),
    keys: document.getElementById('add').dataset.fdKeys,
    shortcut: document.getElementById('add').getAttribute('aria-keyshortcuts'),
    kbd: document.querySelector('#add > .fd-kbd')?.textContent,
    list: document.querySelector('#f .fd-filters-list')?.getAttribute('role'),
    clearHidden: document.querySelector('#f .fd-filters-clear')?.hidden,
    counts: [...document.querySelectorAll('#f-status .fd-filters-count')].map((c) => c.textContent),
  }));
  assert.equal(facts.menuRole, 'dialog');
  assert.ok(facts.innerMenu, 'items sit in a role="menu" beside the search');
  assert.equal(facts.search, 'Add filter');
  assert.deepEqual(facts.status, ['menuitemcheckbox', 'menuitemcheckbox', 'menuitemcheckbox']);
  assert.equal(facts.priority, 'menuitemradio');
  assert.equal(facts.flag, 'menuitemcheckbox');
  assert.ok(facts.labelsSearch && !facts.statusSearch, 'only a panel of more than eight values gets a search');
  assert.equal(facts.panelName, 'Status');
  assert.equal(facts.keys, 'f');
  assert.equal(facts.shortcut, 'F');
  assert.equal(facts.kbd, 'F');
  assert.equal(facts.list, 'list');
  assert.equal(facts.clearHidden, true);
  assert.deepEqual(facts.counts, ['1', '2', '1'], 'counts come from the items');
  assert.deepEqual(errors, []);
  await page.close();
});

test('keyboard: F, search "fail", Enter sets Status is Failed in one step; focus returns to the button', async () => {
  const { page } = await open('__filters.html');
  await withApi(page);
  await page.focus('#before');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('f');
  assert.equal(await page.evaluate(() => document.activeElement.matches('#f-menu .fd-filters-search input')), true, 'F opens the menu with focus in the search');
  await page.keyboard.type('fail');
  const results = await page.evaluate(() => [...document.querySelectorAll('#f-menu [data-fd-result]')].map((r) => r.getAttribute('aria-label')));
  assert.deepEqual(results, ['Status: Failed']);
  await page.keyboard.press('Enter');
  assert.equal(await page.getAttribute('#f-menu', 'data-state'), 'closed');
  assert.equal(await active(page), 'add');
  assert.deepEqual(await filters(page), [{ field: 'status', op: 'is', values: ['failed'], kind: 'many' }]);
  assert.deepEqual(await visible(page), ['i2', 'i3']);
  assert.deepEqual(await chips(page), ['Status is Failed']);
  assert.equal(await live(page), 'Status is Failed. 1 filter, 2 results.');
  const event = await page.evaluate(() => window.__events.at(-1));
  assert.equal(event.source, 'search');
  assert.deepEqual(event.filters, [{ field: 'status', op: 'is', values: ['failed'], kind: 'many' }]);
  // Nothing matches: one quiet line.
  await page.keyboard.press('f');
  await page.keyboard.type('invoice');
  assert.equal((await page.textContent('#f-menu [data-fd-filters-empty]')).trim(), 'Nothing matches “invoice”');
  await page.keyboard.press('Escape');
  assert.equal(await page.inputValue('#f-menu .fd-filters-search input'), '', 'Escape clears the search first');
  await page.keyboard.press('Escape');
  assert.equal(await active(page), 'add', 'then closes and returns focus');
  await page.close();
});

test('keyboard: arrows into a field, Arrow Right opens its values, Arrow Left and Escape step back, typing goes to the search', async () => {
  const { page } = await open('__filters.html');
  await withApi(page);
  await page.focus('#add');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  assert.equal(await active(page), 'field-status');
  await page.keyboard.press('ArrowUp');
  assert.ok(await page.evaluate(() => document.activeElement.matches('.fd-filters-search input')), 'Arrow Up from the first item returns to the search');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  assert.equal(await active(page), 'field-priority');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getAttribute('#f-priority', 'data-state'), 'open');
  assert.equal(await page.evaluate(() => document.activeElement.querySelector('.fd-menu-item-label').textContent), 'High');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await active(page), 'field-priority');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  assert.equal(await active(page), 'field-priority', 'Escape steps back one level');
  // one: a radio; choosing closes the menu; choosing it again clears it
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  assert.deepEqual(await filters(page), [{ field: 'priority', op: 'is', values: ['high'], kind: 'one' }]);
  assert.equal(await active(page), 'add');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-checked')), 'true');
  await page.keyboard.press('Enter');
  assert.deepEqual(await filters(page), [], 'choosing the same value again clears it');
  // a long panel: typing filters its values, Backspace in its empty search returns to the fields
  await page.keyboard.press('Enter');
  await page.keyboard.type('lab');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type('ti');
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#f-labels .fd-menu-item')].filter((i) => !i.hidden).map((i) => i.dataset.value)), ['timeout']);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  assert.deepEqual(await filters(page), [{ field: 'labels', op: 'is', values: ['timeout'], kind: 'many' }], 'many keeps the panel open');
  assert.equal(await page.getAttribute('#f-labels', 'data-state'), 'open');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  assert.equal(await active(page), 'field-labels', 'Backspace in an empty panel search goes back to the fields');
  await page.keyboard.press('Tab');
  assert.equal(await page.getAttribute('#f-menu', 'data-state'), 'closed', 'Tab closes the menu');
  await page.close();
});

test('kinds: text contains, date preset, flag; the operator flips; the value reopens its panel; remove and Clear move focus', async () => {
  const { page } = await open('__filters.html');
  await withApi(page);
  // text
  await page.click('#add');
  await page.click('#field-target');
  await page.fill('#f-target input', 'docs');
  await page.keyboard.press('Enter');
  assert.deepEqual(await filters(page), [{ field: 'target', op: 'contains', values: ['docs'], kind: 'text' }]);
  assert.deepEqual(await visible(page), ['i1', 'i4']);
  // date and flag
  await page.evaluate(() => window.fdFilters.setFilters('f', [{ field: 'date', values: ['7d'] }, { field: 'cached', values: [] }]));
  const set = await filters(page);
  assert.deepEqual(set.map((f) => [f.field, f.op, f.values, f.range ?? null]), [['date', 'is', ['7d'], { start: '2026-11-12', end: '2026-11-18' }], ['cached', 'is', [], null]]);
  assert.deepEqual(await visible(page), ['i1']);
  assert.deepEqual(await chips(page), ['Date is Last 7 days', 'Cached']);
  assert.equal((await page.evaluate(() => window.__events.at(-1))).source, 'api');
  // operator
  await page.evaluate(() => window.fdFilters.setFilters('f', [{ field: 'status', values: ['failed', 'queued'] }]));
  assert.deepEqual(await chips(page), ['Status is any of 2']);
  assert.equal(await page.getAttribute('#f .fd-filters-value', 'title'), 'Failed, Queued');
  await page.click('#f .fd-filters-op');
  assert.deepEqual(await chips(page), ['Status is not any of 2']);
  assert.equal(await page.getAttribute('#field-status', 'data-op'), 'not');
  assert.deepEqual(await visible(page), ['i1']);
  assert.match(await page.getAttribute('#f .fd-filters-op', 'aria-label'), /Status is not\. Change to is/);
  assert.equal(await live(page), 'Status is not Failed, Queued. 1 filter, 1 result.');
  // the value reopens the panel under the chip, focus inside; Escape returns to the chip
  await page.focus('#f .fd-filters-value');
  await page.keyboard.press('Enter');
  assert.equal(await page.getAttribute('#f-status', 'data-state'), 'open');
  assert.equal(await page.getAttribute('#f .fd-filters-value', 'aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  assert.ok(await page.evaluate(() => document.activeElement.matches('.fd-filters-value')));
  // remove: focus goes to the next chip, then the button; Clear removes all
  await page.evaluate(() => window.fdFilters.setFilters('f', [{ field: 'status', values: ['failed'] }, { field: 'priority', values: ['low'] }]));
  await page.click('#f .fd-filter-token[data-field="status"] .fd-filter-token-remove');
  assert.equal(await page.evaluate(() => document.activeElement.closest('.fd-filter-token')?.dataset.field), 'priority');
  await page.keyboard.press('Enter');
  assert.equal(await active(page), 'add');
  await page.evaluate(() => window.fdFilters.setFilters('f', [{ field: 'status', values: ['failed'] }, { field: 'priority', values: ['low'] }]));
  await page.click('#f .fd-filters-clear');
  assert.deepEqual(await filters(page), []);
  assert.equal((await page.evaluate(() => window.__events.at(-1))).source, 'clear');
  assert.equal(await live(page), 'Filters cleared. No filters, 4 results.');
  await page.close();
});

test('data-fd-for: counts follow the other filters, data-fd-out stays out, and [data-fd-none] shows when nothing matches', async () => {
  const { page } = await open('__filters.html');
  await withApi(page);
  await page.evaluate(() => window.fdFilters.setFilters('f', [{ field: 'priority', values: ['high'] }]));
  const counts = () => page.evaluate(() => [...document.querySelectorAll('#f-status .fd-filters-count')].map((c) => c.textContent));
  assert.deepEqual(await counts(), ['1', '1', '0']);
  await page.evaluate(() => document.getElementById('i3').setAttribute('data-fd-out', ''));
  await page.waitForTimeout(50);
  assert.deepEqual(await visible(page), ['i1']);
  assert.deepEqual(await counts(), ['1', '0', '0']);
  await page.evaluate(() => window.fdFilters.setFilters('f', [{ field: 'status', values: ['queued'] }, { field: 'priority', values: ['high'] }]));
  assert.equal(await page.isVisible('#none'), true);
  assert.equal(await page.evaluate(() => window.fdFilters.matches([{ field: 'labels', op: 'not', values: ['retry'] }], { labels: ['timeout'] })), true);
  assert.equal(await page.evaluate(() => window.fdFilters.matches([{ field: 'date', op: 'is', values: ['30d'], kind: 'date' }], { date: '2026-10-01' }, { now: '2026-11-18' })), false);
  await page.close();
});

test('data-fd-url: the set goes to the address, other parameters stay, and the back button restores it', async () => {
  const { page } = await open('__filters.html?state=ready');
  await withApi(page);
  await page.evaluate(() => window.fdFilters.setFilters('f', [{ field: 'status', op: 'not', values: ['failed', 'queued'] }, { field: 'cached', values: [] }]));
  assert.equal(await page.evaluate(() => location.search), '?state=ready&status!=failed,queued&cached=yes');
  await page.evaluate(() => window.fdFilters.setFilters('f', [{ field: 'date', values: ['2026-11-03/2026-11-09'] }]));
  assert.equal(await page.evaluate(() => location.search), '?state=ready&date=2026-11-03..2026-11-09');
  await page.goBack();
  await page.waitForTimeout(100);
  assert.deepEqual((await filters(page)).map((f) => [f.field, f.op, f.values]), [['status', 'not', ['failed', 'queued']], ['cached', 'is', []]]);
  assert.equal((await page.evaluate(() => window.__events.at(-1))).source, 'url');
  // A shared address opens with its set.
  await page.goto(`${base}/__filters.html?priority=low&target=ember`);
  await page.waitForFunction(() => document.documentElement.dataset.fdReady !== undefined);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#items > li:not([data-fd-none])')].filter((li) => !li.hidden).map((li) => li.id)), ['i2']);
  await page.close();
});

test('phone: the button opens a bottom sheet, fields then values, back, Done; the chips stay on one row', async () => {
  const { page, errors } = await open('__filters.html', { width: 375, height: 740 });
  await withApi(page);
  await page.evaluate(() => window.fdFilters.setFilters('f', [{ field: 'status', values: ['failed'] }, { field: 'priority', values: ['high'] }, { field: 'labels', values: ['retry'] }], { silent: true }));
  const row = await page.evaluate(() => { const list = document.querySelector('#f .fd-filters-list'); const ys = new Set([...list.children].map((c) => Math.round(c.getBoundingClientRect().top))); return { lines: ys.size, scrolls: list.scrollWidth > list.clientWidth }; });
  assert.equal(row.lines, 1, 'the chips do not wrap');
  await page.click('#add');
  const sheet = '#f .fd-filters-sheet';
  assert.equal(await page.evaluate((s) => document.querySelector(s).open, sheet), true);
  assert.equal(await page.textContent(`${sheet} .fd-sheet-title`), 'Filter');
  assert.ok(await page.evaluate(() => document.activeElement.matches('.fd-filters-sheet .fd-filters-search input')));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.equal(await page.textContent(`${sheet} .fd-sheet-title`), 'Status');
  assert.equal(await page.isVisible(`${sheet} .fd-filters-back`), true);
  assert.equal(await page.isVisible('#f-status'), true);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  assert.deepEqual((await filters(page))[0].values, ['failed', 'queued']);
  await page.keyboard.press('Escape');
  assert.equal(await page.textContent(`${sheet} .fd-sheet-title`), 'Filter', 'Escape goes back to the fields');
  assert.equal(await active(page), 'field-status');
  await page.click(`${sheet} [data-fd-dialog-close]`);
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate((s) => document.querySelector(s).open, sheet), false);
  assert.ok(await page.evaluate(() => !!document.querySelector('#f > .fd-filters-menu, #f-menu')?.closest('#f') && !document.getElementById('f-menu').closest('.fd-filters-sheet')), 'the menu goes back where it was');
  assert.equal(await active(page), 'add');
  assert.deepEqual(errors, []);
  await page.close();
});

test('docs and template: the live specimen and templates/audit.html filter their tables; F is in the shortcut sheet', async () => {
  const { page, errors } = await open('docs/data.html#combined');
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('#req-table > tbody:first-of-type > tr')].filter((tr) => !tr.hidden).length), 5);
  await page.fill('#req-search', 'crawl');
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('#req-table > tbody:first-of-type > tr')].filter((tr) => !tr.hidden).length), 3);
  assert.deepEqual(errors, []);
  await page.close();
  const audit = await open('templates/audit.html?state=ready');
  await audit.page.keyboard.press('f');
  await audit.page.keyboard.type('maya');
  await audit.page.keyboard.press('Enter');
  await audit.page.waitForTimeout(50);
  assert.match(await audit.page.textContent('#audit-info'), /^5 events/);
  assert.equal(await audit.page.textContent('[data-stat="events"] [data-figure]'), '5');
  const keys = await audit.page.evaluate(() => [...document.querySelectorAll('[data-fd-keys]')].map((el) => [el.dataset.fdKeys, el.dataset.fdKeysLabel]));
  assert.ok(keys.some(([k, l]) => k === 'f' && l === 'Filter'), 'the Filter key is a data-fd-keys binding, so the shortcut sheet lists it');
  assert.deepEqual(audit.errors, []);
  await audit.page.close();
});

/* ---------- the toolbar wraps on purpose ---------- */
async function lines(page) {
  return page.evaluate(() => {
    const bar = document.querySelector('.fd-toolbar');
    const box = bar.getBoundingClientRect();
    const rows = new Map();
    for (const el of bar.children) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const y = Math.round(r.top);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push(el.classList.contains('fd-toolbar-search') ? 'search' : el.classList.contains('fd-toolbar-end') ? 'end' : 'filter');
    }
    return { rows: [...rows].sort((a, b) => a[0] - b[0]).map(([, row]) => row.join(' ')), wide: document.documentElement.scrollWidth > innerWidth, box: box.width };
  });
}
test('toolbar (templates/logs.html): one line, then search + end over the filters, then a scrolling row on a phone', async () => {
  const expected = [
    [1440, ['search filter filter filter end']],
    [1200, ['search end', 'filter filter filter']],
    [1000, ['search end', 'filter filter filter']],
    [800, ['search end', 'filter filter filter']],
    [375, ['search', 'filter filter filter', 'end']],
    [320, ['search', 'filter filter filter', 'end']],
  ];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(`${base}/templates/logs.html?state=ready`);
  await page.waitForFunction(() => document.documentElement.dataset.fdReady !== undefined);
  for (const [width, rows] of expected) {
    await page.setViewportSize({ width: Number(width), height: 900 });
    await page.waitForTimeout(80);
    const got = await lines(page);
    assert.deepEqual(got.rows, rows, `${width}px`);
    // Line edges: wrapped, the end group ends at the toolbar's right edge; on a phone it starts at its left edge.
    const edge = await page.evaluate(() => {
      const bar = document.querySelector('.fd-toolbar');
      const cs = getComputedStyle(bar);
      const box = bar.getBoundingClientRect();
      const kids = [...bar.querySelector('.fd-toolbar-end').children].map((k) => k.getBoundingClientRect());
      return { right: Math.round(box.right - parseFloat(cs.paddingRight) - Math.max(...kids.map((k) => k.right))), left: Math.round(Math.min(...kids.map((k) => k.left)) - box.left - parseFloat(cs.paddingLeft)) };
    });
    if (rows.length === 2) assert.equal(edge.right, 0, `${width}px: the end group ends at the toolbar's right edge`);
    if (rows.length === 3) assert.equal(edge.left, 0, `${width}px: the end group starts at the toolbar's left edge`);
    assert.equal(got.wide, false, `${width}px: nothing wider than the page`);
  }
  // On a phone the filters row scrolls inside the toolbar, and the search and end group stay put.
  const scroll = await page.evaluate(() => {
    const bar = document.querySelector('.fd-toolbar');
    const search = bar.querySelector('.fd-toolbar-search');
    const before = search.getBoundingClientRect().left;
    bar.scrollLeft = 100;
    return { scrolls: bar.scrollWidth > bar.clientWidth, moved: bar.scrollLeft > 0, still: Math.abs(search.getBoundingClientRect().left - before) < 1 };
  });
  assert.deepEqual(scroll, { scrolls: true, moved: true, still: true });
  // Tab order stays the DOM order: search, filters, end.
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.focus('#logs-search');
  const order = [];
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => (document.activeElement.closest('.fd-toolbar-end') ? 'end' : document.activeElement.closest('.fd-filter') ? 'filter' : document.activeElement.closest('.fd-toolbar-search') ? 'search' : 'other')));
  }
  assert.deepEqual(order.slice(0, 3), ['filter', 'filter', 'filter'], 'from the search, Tab reaches the filters first');
  assert.ok(order.indexOf('end') > order.lastIndexOf('filter'), `tab order ${order.join(', ')}`);
  await page.close();
});
