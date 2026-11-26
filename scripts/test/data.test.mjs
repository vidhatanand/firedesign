// node --test scripts/test/ : Fire 0.7 "data, steps and logs" behaviour, in Chromium, against the docs specimens.
//   - table groups: toggles built from data-collapsible, open and close, sort within groups, group selection,
//     rowgroup labelling, a filtered-out group hides its heading, data-auto counts
//   - list and detail: aria-current moves, panels follow, one pane at a time on a phone with focus moved both ways
//   - listbox list: arrow keys move the selection and fd:change fires
//   - steps: setStep keeps a skipped step; the tracker turns vertical in a narrow container
//   - log: line numbers and anchors, the linked line on load and on click, first error, keyboard between numbers
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

let server, browser, base;
test.before(async () => {
  server = createServer(async (req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    try { res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(file)); }
    catch { res.writeHead(404).end('not found'); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
test.after(async () => { await browser?.close(); server?.close(); });

async function open(page, width = 1440) {
  const p = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${base}/docs/${page}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(150);
  return { p, errors };
}

test('table groups: toggles, sort within groups, selection, labelling, filtering', async () => {
  const { p, errors } = await open('data.html');
  const t = p.locator('#groups table[aria-label="API keys by environment"]');
  // data-collapsible built one toggle per heading, its state from the tbody
  assert.deepEqual(await t.locator('.fd-table-group-toggle').evaluateAll((b) => b.map((x) => x.getAttribute('aria-expanded'))), ['true', 'true', 'false']);
  assert.deepEqual(await t.locator('tbody.fd-table-group').evaluateAll((g) => g.map((x) => x.dataset.state)), ['open', 'open', 'closed']);
  // rowgroup semantics: th scope and the tbody labelled by the title
  const label = await t.locator('tbody.fd-table-group').first().evaluate((g) => document.getElementById(g.getAttribute('aria-labelledby'))?.textContent);
  assert.equal(label, 'Production');
  assert.equal(await t.locator('.fd-table-group-head th').first().getAttribute('scope'), 'rowgroup');
  // the closed group's rows do not show; opening it shows them and fires fd:open
  assert.equal(await t.locator('tr[data-value="key_trial"]').isVisible(), false);
  await p.evaluate(() => { window.__opened = null; document.addEventListener('fd:open', (e) => { window.__opened = e.detail.group?.className; }, { once: true }); });
  await t.locator('.fd-table-group-toggle').nth(2).focus();
  await p.keyboard.press('Enter');
  assert.equal(await t.locator('tr[data-value="key_trial"]').isVisible(), true);
  assert.equal(await p.evaluate(() => window.__opened), 'fd-table-group');
  await t.locator('.fd-table-group-toggle').first().click();
  assert.equal(await t.locator('tr[data-value="key_docs"]').isVisible(), false);
  await t.locator('.fd-table-group-toggle').first().click();
  // sorting by credits orders each group on its own, and every heading stays first in its group
  await t.locator('th:has(button:text("Credits")) .fd-th-sort').click();
  const order = await t.locator('tbody.fd-table-group').evaluateAll((gs) => gs.map((g) => [...g.rows].map((r) => r.classList.contains('fd-table-group-head') ? 'HEAD' : r.dataset.value)));
  assert.deepEqual(order[0], ['HEAD', 'key_agent', 'key_pricing', 'key_docs']);
  assert.deepEqual(order[1], ['HEAD', 'key_ci_nightly', 'key_ci_main']);
  // the heading checkbox selects its group; the header checkbox turns indeterminate and the bulk bar counts
  await t.locator('input[data-select-group]').first().check();
  assert.equal(await t.locator('tbody.fd-table-group').first().locator('tr[aria-selected="true"]').count(), 3);
  assert.equal(await t.locator('input[data-select-all]').evaluate((i) => i.indeterminate), true);
  assert.equal(await p.locator('#groups .fd-table-bulk [data-bulk-count]').first().textContent(), '3');
  // unticking one row makes the group checkbox indeterminate
  await t.locator('tr[data-value="key_docs"] input').uncheck();
  assert.equal(await t.locator('input[data-select-group]').first().evaluate((i) => i.indeterminate), true);
  // a heading row never takes the hover wash of a record
  const head = t.locator('.fd-table-group-head').first();
  await head.hover();
  assert.equal(await head.evaluate((r) => getComputedStyle(r).backgroundColor), 'rgba(0, 0, 0, 0)');
  // filtered: a group whose rows are all hidden is not shown; data-auto counts the rows shown
  const f = p.locator('#groups table[aria-label="Monitors by site, filtered"]');
  assert.deepEqual(await f.locator('tbody.fd-table-group').evaluateAll((g) => g.map((x) => getComputedStyle(x).display !== 'none')), [true, false, true]);
  assert.equal(await f.locator('.fd-table-group-count').first().textContent(), '1');
  await f.locator('tbody.fd-table-group').first().locator('tr[hidden]').evaluate((r) => { r.hidden = false; });
  await p.waitForTimeout(50);
  assert.equal(await f.locator('.fd-table-group-count').first().textContent(), '2');
  assert.deepEqual(errors, []);
  await p.close();
});

test('stacked table: an expandable row keeps its toggle and its detail inside its card', async () => {
  for (const width of [375, 320]) {
    const { p, errors } = await open('data.html', width);
    const t = p.locator('#expand table[aria-label="Agent runs, stacked"]');
    await t.scrollIntoViewIfNeeded();
    const box = (l) => l.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width }; });
    const row = (n) => t.locator('tbody > tr:not(.fd-table-detail)').nth(n);
    const toggles = t.locator('.fd-table-expand');
    // every toggle shows, as wide as the card's content, with its words from the header ("Details")
    assert.equal(await toggles.count(), 3);
    for (let i = 0; i < 3; i++) assert.equal(await toggles.nth(i).isVisible(), true, `toggle ${i} visible`);
    const cell = await box(toggles.nth(1));
    const title = await box(row(1).locator('td[data-stack-title]'));
    assert.ok(Math.abs(cell.left - title.left) <= 1 && cell.width >= title.width - 1, `toggle spans the card's content: ${JSON.stringify({ cell, title })}`);
    assert.equal(await t.locator('td[data-expand]').nth(1).getAttribute('data-label'), 'Details');
    assert.equal(await t.locator('td[data-expand]').nth(1).evaluate((td) => getComputedStyle(td, '::before').content), '"Details"');
    // it is the foot of its card: under every value of the row
    const values = await row(1).locator('td:not([data-expand], [data-select])').evaluateAll((tds) => Math.max(...tds.map((td) => td.getBoundingClientRect().bottom)));
    assert.ok(cell.top >= values, 'the toggle sits under the values');
    // an open detail is the last part of its row's card: flush under it, the same width, no line between
    assert.equal(await t.locator('#run-phone-detail-1').isVisible(), true);
    const open1 = await box(t.locator('#run-phone-detail-1'));
    const row1 = await box(row(0));
    assert.ok(Math.abs(open1.top - row1.bottom) <= 1 && Math.abs(open1.left - row1.left) <= 1 && Math.abs(open1.right - row1.right) <= 1, `detail joins the card: ${JSON.stringify({ open1, row1 })}`);
    assert.equal(await row(0).evaluate((r) => getComputedStyle(r).borderBottomWidth), '0px');
    assert.equal(await row(0).evaluate((r) => getComputedStyle(r).backgroundColor), await t.locator('#run-phone-detail-1').evaluate((r) => getComputedStyle(r).backgroundColor));
    // a closed detail stays hidden
    assert.equal(await t.locator('#run-phone-detail-2').isVisible(), false);
    // keyboard: Tab from the row's checkbox reaches the toggle; Enter and Space open and close it; focus stays
    await row(1).locator('.fd-table-check').focus();
    await p.keyboard.press('Tab');
    assert.equal(await p.evaluate(() => document.activeElement?.getAttribute('aria-controls')), 'run-phone-detail-2');
    await p.keyboard.press('Enter');
    assert.equal(await toggles.nth(1).getAttribute('aria-expanded'), 'true');
    assert.equal(await t.locator('#run-phone-detail-2').isVisible(), true);
    const open2 = await box(t.locator('#run-phone-detail-2'));
    const row2 = await box(row(1));
    assert.ok(Math.abs(open2.top - row2.bottom) <= 1, 'the opened detail sits in the same card');
    assert.equal(await p.evaluate(() => document.activeElement?.getAttribute('aria-controls')), 'run-phone-detail-2');
    await p.keyboard.press('Space');
    assert.equal(await toggles.nth(1).getAttribute('aria-expanded'), 'false');
    assert.equal(await t.locator('#run-phone-detail-2').isVisible(), false);
    assert.equal(await p.evaluate(() => document.activeElement?.getAttribute('aria-controls')), 'run-phone-detail-2');
    await toggles.nth(1).click();
    assert.equal(await t.locator('#run-phone-detail-2').isVisible(), true);
    // nothing overflows: not the page, not the scroller, not the code block in the detail
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the page does not scroll sideways');
    assert.ok(await t.evaluate((el) => el.parentElement.scrollWidth <= el.parentElement.clientWidth), 'the table scroller does not scroll sideways');
    const code = await box(t.locator('#run-phone-detail-2 .fd-codeblock'));
    const detail2 = await box(t.locator('#run-phone-detail-2'));
    assert.ok(code.left >= detail2.left && code.right <= detail2.right, 'the code block fits its card');
    assert.deepEqual(errors, []);
    await p.close();
  }
  // above the breakpoint nothing changes: the chevron is a small icon button in its own column, with no words
  const { p, errors } = await open('data.html', 1440);
  const wide = p.locator('#expand table[aria-label="Agent runs"]');
  assert.equal(await wide.locator('td[data-expand]').first().evaluate((td) => getComputedStyle(td).display), 'table-cell');
  assert.ok((await wide.locator('.fd-table-expand').first().evaluate((b) => b.getBoundingClientRect().width)) < 40, 'an icon-sized toggle');
  assert.equal(await wide.locator('td[data-expand]').first().evaluate((td) => getComputedStyle(td, '::before').content), 'none');
  assert.equal(await wide.locator('#run-detail-1').evaluate((r) => getComputedStyle(r).display), 'table-row');
  assert.deepEqual(errors, []);
  await p.close();
});

test('stacked table: expand with groups, skeletons, density, a nested table and reduced motion', async () => {
  const p = await browser.newPage({ viewport: { width: 375, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${base}/docs/data.html`, { waitUntil: 'networkidle' });
  const result = await p.evaluate(async () => {
    const { init } = await import('../fire/js/data.js');
    const host = document.createElement('div');
    host.setAttribute('data-density', 'compact');
    host.innerHTML = `<div class="fd-table-wrap"><div class="fd-table-scroll"><table class="fd-table" data-stack aria-label="Runs by agent">
      <thead><tr><th data-expand><span class="fd-sr-only">Details</span></th><th>Task</th><th data-num>Credits</th></tr></thead>
      <tbody class="fd-table-group"><tr class="fd-table-group-head"><td data-expand></td><th scope="rowgroup" colspan="2"><span class="fd-table-group-title">Crawler</span></th></tr>
        <tr data-value="r1"><td data-expand><button class="fd-table-expand" type="button" aria-expanded="false" aria-controls="x-d1" aria-label="Details for Crawl docs"><i data-icon="chevron-right"></i></button></td><td>Crawl docs</td><td data-num>12</td></tr>
        <tr class="fd-table-detail" id="x-d1" hidden><td colspan="3"><table class="fd-table" aria-label="Steps"><thead><tr><th>Step</th><th data-num>Pages</th></tr></thead><tbody><tr><td>Fetch</td><td data-num>40</td></tr></tbody></table></td></tr>
        <tr data-skeleton><td data-expand></td><td><span class="fd-table-skeleton"></span></td><td data-num><span class="fd-table-skeleton" data-size="xs"></span></td></tr>
      </tbody></table></div></div>`;
    document.body.append(host);
    init(host);
    const t = host.querySelector('table');
    const toggle = t.querySelector('.fd-table-expand');
    toggle.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const detail = t.querySelector('#x-d1');
    const inner = detail.querySelector('table');
    const out = {
      toggle: toggle.getBoundingClientRect().width > 100,
      detail: getComputedStyle(detail).display !== 'none',
      // the nested table keeps its own rows and cells: the outer table's stacking does not reach into it
      innerCell: getComputedStyle(inner.querySelector('td')).display,
      innerHead: getComputedStyle(inner.querySelector('thead')).position,
      // empty expand cells (a group heading, a skeleton row) take no room
      headCell: getComputedStyle(t.querySelector('.fd-table-group-head > td[data-expand]')).display,
      skeletonCell: getComputedStyle(t.querySelector('tr[data-skeleton] > td[data-expand]')).display,
      // reduced motion: the detail does not fade in, the chevron does not turn
      fade: parseFloat(getComputedStyle(inner).animationDuration) < 0.001,
      turn: getComputedStyle(document.querySelector('#expand table[aria-label="Agent runs, stacked"] .fd-table-expand .fd-icon')).transitionDuration,
      overflow: document.documentElement.scrollWidth <= innerWidth,
    };
    host.remove();
    return out;
  });
  assert.deepEqual(result, { toggle: true, detail: true, innerCell: 'table-cell', innerHead: 'static', headCell: 'none', skeletonCell: 'none', fade: true, turn: '0s', overflow: true });
  assert.deepEqual(errors, []);
  await p.close();
});

test('list and detail: selection, panels, phone view and focus', async () => {
  const { p, errors } = await open('data.html');
  const wide = p.locator('#list-detail .fd-list-detail').first();
  await wide.locator('button[data-value="req_key"]').click();
  assert.equal(await wide.locator('button[data-value="req_key"]').getAttribute('aria-current'), 'true');
  assert.equal(await wide.locator('button[data-value="req_limit"]').getAttribute('aria-current'), null);
  assert.equal(await wide.locator('[data-detail="req_key"]').isVisible(), true);
  assert.equal(await wide.locator('[data-detail="req_limit"]').isVisible(), false);
  // two panes: focus stays on the row, the back button is not shown
  assert.equal(await p.evaluate(() => document.activeElement?.dataset.value), 'req_key');
  assert.equal(await wide.locator('.fd-list-detail-back').isVisible(), false);
  // one pane at a time inside a phone-wide frame
  const phone = p.locator('#list-detail .fd-list-detail').nth(1);
  assert.equal(await phone.getAttribute('data-view'), 'list');
  assert.equal(await phone.locator('.fd-list-detail-main').isVisible(), false);
  await p.evaluate(() => { window.__view = []; document.addEventListener('fd:change', (e) => { if (e.detail?.source === 'view') window.__view.push(e.detail.value); }); });
  await phone.locator('button[data-value="req_key"]').click();
  assert.equal(await phone.getAttribute('data-view'), 'detail');
  assert.equal(await phone.locator('.fd-list-detail-list').isVisible(), false);
  assert.equal(await p.evaluate(() => document.activeElement?.id), 'phone-key-title');
  await phone.locator('.fd-list-detail-back').click();
  assert.equal(await phone.getAttribute('data-view'), 'list');
  assert.equal(await p.evaluate(() => document.activeElement?.dataset.value), 'req_key');
  assert.deepEqual(await p.evaluate(() => window.__view), ['detail', 'list']);
  // fd:select is cancelable
  await p.evaluate(() => document.addEventListener('fd:select', (e) => e.preventDefault(), { once: true }));
  await phone.locator('button[data-value="req_limit"]').click();
  assert.equal(await phone.getAttribute('data-view'), 'list');
  assert.equal(await phone.locator('button[data-value="req_limit"]').getAttribute('aria-current'), null);
  assert.deepEqual(errors, []);
  await p.close();
});

test('listbox list: one tab stop, arrows move the selection', async () => {
  const { p, errors } = await open('data.html');
  const list = p.locator('#lists .fd-list[role="listbox"]');
  assert.deepEqual(await list.locator('[role="option"]').evaluateAll((o) => o.map((x) => x.tabIndex)), [0, -1, -1]);
  await p.evaluate(() => { window.__lb = null; document.addEventListener('fd:change', (e) => { if (e.target.matches?.('[role="listbox"]')) window.__lb = e.detail.value; }); });
  await list.locator('[data-value="iad1"]').focus();
  await p.keyboard.press('ArrowDown');
  assert.equal(await list.locator('[data-value="fra1"]').getAttribute('aria-selected'), 'true');
  assert.equal(await list.locator('[data-value="iad1"]').getAttribute('aria-selected'), 'false');
  assert.equal(await p.evaluate(() => document.activeElement?.dataset.value), 'fra1');
  assert.equal(await p.evaluate(() => window.__lb), 'fra1');
  await p.keyboard.press('End');
  assert.equal(await list.locator('[data-value="sin1"]').getAttribute('aria-selected'), 'true');
  assert.deepEqual(errors, []);
  await p.close();
});

test('steps: setStep keeps skipped steps; the tracker turns vertical when narrow', async () => {
  const { p, errors } = await open('navigation.html');
  const states = await p.evaluate(async () => {
    const { setStep } = await import('../fire/js/nav.js');
    const ol = document.createElement('ol');
    ol.className = 'fd-steps';
    ol.innerHTML = '<li class="fd-step"></li><li class="fd-step" data-state="skipped"></li><li class="fd-step"></li><li class="fd-step"></li>';
    document.body.append(ol);
    setStep(ol, 2);
    const out = [...ol.children].map((li) => `${li.dataset.state ?? ''}:${li.getAttribute('aria-current') ?? ''}`);
    ol.remove();
    return out;
  });
  assert.deepEqual(states, ['done:', 'skipped:', 'current:step', ':']);
  const wide = p.locator('#tracker .fd-steps').first();
  const narrow = p.locator('#tracker [data-frame="phone"] .fd-steps');
  assert.equal(await wide.locator('.fd-step').first().evaluate((li) => getComputedStyle(li).flexDirection), 'column');
  assert.equal(await narrow.locator('.fd-step').first().evaluate((li) => getComputedStyle(li).flexDirection), 'row');
  // stages stack one under another in the narrow tracker
  const tops = await narrow.locator('.fd-step').evaluateAll((lis) => lis.map((li) => Math.round(li.getBoundingClientRect().top)));
  assert.ok(tops.every((t, i) => i === 0 || t > tops[i - 1]), `tops ${tops}`);
  assert.equal(await p.locator('#steps-live .fd-step[aria-current="step"]').first().getAttribute('data-state'), 'running');
  assert.deepEqual(errors, []);
  await p.close();
});

test('log: line anchors, the linked line, first error, keyboard', async () => {
  const { p, errors } = await open('code.html#crawl-L12');
  const log = p.locator('.fd-log[data-anchor="crawl"]');
  await p.waitForTimeout(100);
  assert.equal(await log.locator('.fd-log-row').count(), await log.locator('.fd-log-num').count());
  assert.equal(await log.locator('#crawl-L12').getAttribute('aria-current'), 'true');
  assert.ok(await log.locator('.fd-log-body').evaluate((b) => b.scrollTop) > 0, 'the log scrolled to the linked line');
  assert.equal(await log.locator('#crawl-L3 .fd-log-num').getAttribute('href'), '#crawl-L3');
  // one tab stop among the numbers: the linked line's
  assert.deepEqual(await log.locator('.fd-log-num[tabindex="0"]').evaluateAll((a) => a.map((x) => x.textContent)), ['12']);
  // first error
  await log.locator('[data-action="first-error"]').click();
  assert.equal(await log.locator('#crawl-L10').getAttribute('aria-current'), 'true');
  assert.equal(await log.locator('#crawl-L12').getAttribute('aria-current'), null);
  assert.equal(await p.evaluate(() => location.hash), '#crawl-L10');
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), '10');
  // arrows walk the numbers, Enter marks the line
  await p.keyboard.press('ArrowDown');
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), '11');
  await p.keyboard.press('Enter');
  assert.equal(await log.locator('#crawl-L11').getAttribute('aria-current'), 'true');
  assert.equal(await p.evaluate(() => location.hash), '#crawl-L11');
  // a log with no error rows disables the button; terminal rows can be errors too
  assert.equal(await p.locator('.fd-log[data-anchor="quiet"] [data-action="first-error"]').isDisabled(), true);
  await p.locator('.fd-log[data-anchor="build"] [data-action="first-error"]').click();
  assert.equal(await p.locator('#build-L4').getAttribute('aria-current'), 'true');
  // search ignores the numbers
  await log.locator('.fd-log-search input').fill('10');
  const shown = await log.locator('.fd-log-row:not([hidden])').evaluateAll((r) => r.map((x) => x.dataset.line));
  assert.ok(!shown.includes('10'), `line 10 matched its own number: ${shown}`);
  // hashchange marks the line
  await p.evaluate(() => { location.hash = '#crawl-L5'; });
  await p.waitForTimeout(50);
  assert.equal(await log.locator('#crawl-L5').getAttribute('aria-current'), 'true');
  assert.deepEqual(errors, []);
  await p.close();
});
