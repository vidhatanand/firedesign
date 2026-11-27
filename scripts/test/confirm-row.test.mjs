// node --test scripts/test/ : Fire 0.14 row confirmation (fd-confirm-row), in Chromium, against the docs specimens
// (docs/data.html#confirm-row) and the API keys template. Every wait is for a condition, never for a fixed time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
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

async function open(url, width = 1440) {
  const p = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${base}/${url}`, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => 'fdReady' in document.documentElement.dataset);
  return { p, errors };
}
const shown = (p, sel) => p.waitForFunction((s) => { const el = document.querySelector(s); return el && el.getClientRects().length > 0; }, sel);
const gone = (p, sel) => p.waitForFunction((s) => { const el = document.querySelector(s); return !el || el.getClientRects().length === 0; }, sel);
const focused = (p, sel) => p.waitForFunction((s) => document.activeElement === document.querySelector(s), sel);
// Call a data.js export in the page; an options object's `trigger` is a selector there.
const api = (p, fn, ...args) => p.evaluate(async ([name, list]) => (await import('/fire/fire.js')).data[name](
  ...list.map((a) => (a && typeof a.trigger === 'string' ? { ...a, trigger: document.querySelector(a.trigger) } : a))), [fn, args]);
const opener = (n) => `[data-fd-menu="key-${n}-menu"]`;

test('a menu item opens its question with focus on Cancel; one at a time; Escape and Cancel return focus', async () => {
  const { p, errors } = await open('docs/data.html');
  // keyboard: open the menu, End to Revoke, Enter
  await p.locator(opener(1)).focus();
  await p.keyboard.press('Enter');
  await shown(p, '#key-1-menu');
  await p.keyboard.press('End');
  await p.keyboard.press('Enter');
  await shown(p, '#key-1-confirm');
  await focused(p, '#key-1-confirm [data-fd-confirm-row-cancel]');
  // the menu's opener holds no aria-expanded="true" from the question
  assert.notEqual(await p.locator(opener(1)).getAttribute('aria-expanded'), 'true');
  // a second question closes the first, and fd:open carries the opener
  await p.evaluate(() => { window.__open = null; document.addEventListener('fd:open', (e) => { if (e.target.matches('.fd-confirm-row')) window.__open = e.detail.trigger?.getAttribute('data-fd-menu'); }); });
  await p.locator(opener(3)).click();
  await p.locator('#key-3-menu [data-fd-confirm-row]').click();
  await shown(p, '#key-3-confirm');
  await focused(p, '#key-3-confirm [data-fd-confirm-row-cancel]');
  assert.equal(await p.locator('#key-1-confirm').isVisible(), false);
  assert.equal(await p.evaluate(() => window.__open), 'key-3-menu');
  // Escape closes it, returns focus to the opener, and is stopped there
  await p.evaluate(() => { window.__esc = null; document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.__esc = 'leaked'; }); });
  await p.keyboard.press('Escape');
  await gone(p, '#key-3-confirm');
  await focused(p, opener(3));
  assert.equal(await p.evaluate(() => window.__esc), null);
  // Cancel does the same
  await api(p, 'openConfirmRow', 'key-3-confirm', { trigger: '#cr-keys ' + opener(3) });
  await focused(p, '#key-3-confirm [data-fd-confirm-row-cancel]');
  await p.locator('#key-3-confirm [data-fd-confirm-row-cancel]').click();
  await gone(p, '#key-3-confirm');
  await focused(p, opener(3));
  assert.deepEqual(errors, []);
  await p.close();
});

test('a cancelled fd:confirm goes busy and ignores presses; closeConfirmRow focus "next" and failConfirmRow', async () => {
  const { p, errors } = await open('docs/data.html');
  await p.evaluate(() => { for (const q of document.querySelectorAll('#cr-keys .fd-confirm-row')) q.addEventListener('fd:confirm', (e) => { window.__detail = e.detail; e.preventDefault(); }); });
  await api(p, 'openConfirmRow', 'key-1-confirm', { trigger: '#cr-keys ' + opener(1) });
  await p.locator('#key-1-confirm [data-fd-confirm-row-submit]').click();
  const q = p.locator('#key-1-confirm');
  assert.equal(await q.getAttribute('aria-busy'), 'true');
  assert.deepEqual(await q.locator('.fd-btn').evaluateAll((bs) => bs.map((b) => [b.getAttribute('aria-disabled'), b.disabled])), [['true', false], ['true', false]]);
  assert.equal(await p.evaluate(() => window.__detail.row.matches('.fd-list-row') && window.__detail.trigger.getAttribute('data-fd-menu')), 'key-1-menu');
  // one shape with the dialog's fd:confirm: nothing typed, and the button that confirmed
  assert.deepEqual(await p.evaluate(() => [window.__detail.value, window.__detail.submitter?.hasAttribute('data-fd-confirm-row-submit')]), ['', true]);
  // presses and Escape do nothing while busy; focus stays on the danger button
  await q.locator('[data-fd-confirm-row-cancel]').dispatchEvent('click');
  await p.keyboard.press('Escape');
  assert.equal(await q.isVisible(), true);
  assert.equal(await p.evaluate(() => document.activeElement.matches('#key-1-confirm [data-fd-confirm-row-submit]')), true);
  // success: focus moves to the next row's opener (the caller then removes the row)
  await api(p, 'closeConfirmRow', 'key-1-confirm', { focus: 'next' });
  await focused(p, opener(2));
  assert.equal(await q.isVisible(), false);
  assert.equal(await q.getAttribute('aria-busy'), null);
  // from the last row it moves to the previous row's opener
  await api(p, 'openConfirmRow', 'key-3-confirm', { trigger: '#cr-keys ' + opener(3) });
  await api(p, 'closeConfirmRow', 'key-3-confirm', { focus: 'next' });
  await focused(p, opener(2));
  // failure: busy ends, the message shows, focus on the danger button (the markup has an error line here)
  await api(p, 'openConfirmRow', 'key-2-confirm', { trigger: '#cr-keys ' + opener(2) });
  await p.locator('#key-2-confirm [data-fd-confirm-row-submit]').click();
  await api(p, 'failConfirmRow', 'key-2-confirm', 'The key service did not answer.');
  assert.equal(await p.locator('#key-2-confirm .fd-confirm-row-error').textContent(), 'The key service did not answer.');
  assert.equal(await p.locator('#key-2-confirm .fd-confirm-row-error').isVisible(), true);
  assert.equal(await p.locator('#key-2-confirm').getAttribute('aria-busy'), null);
  await focused(p, '#key-2-confirm [data-fd-confirm-row-submit]');
  // with no error line in the markup, one is made before the actions
  await api(p, 'openConfirmRow', 'key-3-confirm', {});
  await api(p, 'failConfirmRow', 'key-3-confirm', 'No answer.');
  assert.equal(await p.locator('#key-3-confirm > .fd-confirm-row-error + .fd-confirm-row-actions').count(), 1);
  // opening again hides the earlier error
  await api(p, 'openConfirmRow', 'key-3-confirm', {});
  assert.equal(await p.locator('#key-3-confirm .fd-confirm-row-error').isVisible(), false);
  assert.deepEqual(errors, []);
  await p.close();
});

test('the docs demo: a confirmed row goes with a toast and focus moves on; a failed one shows its error', async () => {
  const { p, errors } = await open('docs/data.html');
  await p.locator(opener(1)).click();
  await p.locator('#key-1-menu [data-fd-confirm-row]').click();
  await focused(p, '#key-1-confirm [data-fd-confirm-row-cancel]');
  await p.locator('#key-1-confirm [data-fd-confirm-row-submit]').click();
  assert.equal(await p.locator('#key-1-confirm').getAttribute('aria-busy'), 'true');
  await p.waitForFunction(() => !document.getElementById('key-1-confirm'));
  await focused(p, opener(2));
  await shown(p, '.fd-toast');
  await p.locator(opener(2)).click();
  await p.locator('#key-2-menu [data-fd-confirm-row]').click();
  await p.locator('#key-2-confirm [data-fd-confirm-row-submit]').click();
  await shown(p, '#key-2-confirm .fd-confirm-row-error');
  await focused(p, '#key-2-confirm [data-fd-confirm-row-submit]');
  assert.equal(await p.locator('#key-2-confirm').getAttribute('aria-busy'), null);
  assert.deepEqual(errors, []);
  await p.close();
});

test('in a table: an empty data-fd-confirm-row on a shared menu opens its own row\'s question in the detail row', async () => {
  const { p, errors } = await open('docs/data.html');
  const t = p.locator('#confirm-row table.fd-table');
  const rows = t.locator('tbody > tr:not(.fd-table-detail)');
  // open in the markup: its row is marked expanded and loses its hairline
  assert.equal(await rows.nth(1).getAttribute('data-expanded'), '');
  assert.equal(await rows.nth(1).locator('td').first().evaluate((td) => getComputedStyle(td).borderBottomColor), 'rgba(0, 0, 0, 0)');
  // the first row's shared menu: the detail row un-hides, the open one in the same table closes
  await rows.nth(0).locator('[data-fd-menu]').click();
  await p.locator('#device-menu [data-fd-confirm-row]').click();
  await focused(p, '#device-1-confirm [data-fd-confirm-row-cancel]');
  assert.equal(await t.locator('tr.fd-table-detail').evaluateAll((trs) => trs.map((tr) => tr.hidden).join()), 'false,true,true');
  assert.equal(await rows.nth(0).getAttribute('data-expanded'), '');
  assert.equal(await rows.nth(1).getAttribute('data-expanded'), null);
  // Cancel hides the detail row and returns focus to that row's opener
  await p.locator('#device-1-confirm [data-fd-confirm-row-cancel]').click();
  await focused(p, '#confirm-row table.fd-table tbody > tr:first-child [data-fd-menu]');
  assert.equal(await t.locator('tr.fd-table-detail').first().evaluate((tr) => tr.hidden), true);
  // a confirm nobody cancels closes the question, with the item's row in the detail
  await rows.nth(2).locator('[data-fd-menu]').click();
  await p.locator('#device-menu [data-fd-confirm-row]').click();
  await focused(p, '#device-3-confirm [data-fd-confirm-row-cancel]');
  await p.evaluate(() => document.addEventListener('fd:confirm', (e) => { window.__row = e.detail.row?.cells[0].textContent; }, { once: true }));
  await p.locator('#device-3-confirm [data-fd-confirm-row-submit]').click();
  await gone(p, '#device-3-confirm');
  assert.equal(await p.evaluate(() => window.__row), 'ThinkPad · Firefox');
  await focused(p, '#confirm-row table.fd-table tbody > tr:nth-child(5) [data-fd-menu]');
  assert.deepEqual(errors, []);
  await p.close();
});

test('the specimens pass the markup lint, and at 375px nothing in an open question overflows its row', async () => {
  const { lintText } = await import('../lint-markup.mjs');
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/catalog.json'), 'utf8'));
  const html = fs.readFileSync(path.join(ROOT, 'docs/data.html'), 'utf8');
  const section = html.slice(html.indexOf('<section class="doc-section" id="confirm-row">'), html.indexOf('<section class="doc-section" id="list-detail">'));
  assert.ok(section.includes('fd-confirm-row'));
  const page = `<!doctype html><html lang="en" data-fd-surface="app"><body><main class="fd-page">${section}</main></body></html>`;
  const findings = lintText('confirm-row.html', page, catalog, 'html').filter((x) => x.severity === 'error');
  assert.deepEqual(findings.map((x) => `${x.rule}: ${x.message}`), []);

  for (const width of [375, 320]) {
    const { p, errors } = await open('docs/data.html', width);
    await api(p, 'openConfirmRow', 'key-2-confirm', {});
    await api(p, 'failConfirmRow', 'key-2-confirm', 'The key service did not answer, so the key still works.');
    await api(p, 'openConfirmRow', 'device-1-confirm', {});
    for (const id of ['key-2-confirm', 'device-1-confirm']) {
      const out = await p.evaluate((qid) => {
        const q = document.getElementById(qid);
        const row = q.closest('.fd-list-row') ?? q.closest('tr');
        const box = row.getBoundingClientRect();
        return [q, ...q.querySelectorAll('*')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width && (r.left < box.left - 0.5 || r.right > box.right + 0.5 || el.scrollWidth > el.clientWidth + 1);
        }).map((el) => el.className || el.tagName);
      }, id);
      assert.deepEqual(out, [], `${id} at ${width}px`);
    }
    // the stacked table's question is the last part of its row's card
    assert.equal(await p.locator('#confirm-row table.fd-table').evaluate((t) => getComputedStyle(t).display), 'block');
    assert.deepEqual(errors, []);
    await p.close();
  }
});

test('the API keys template revokes from the key\'s own card, then the card goes and focus moves to the next card', async () => {
  const { p, errors } = await open('templates/api-keys.html');
  await shown(p, '[data-key="k2"] [data-fd-menu]');
  assert.equal(await p.locator('#dlg-revoke').count(), 0);
  await p.locator('[data-key="k2"] [data-fd-menu]').click();
  await p.locator('#menu-key [data-value="revoke"]').click();
  await focused(p, '#k2-revoke [data-fd-confirm-row-cancel]');
  await p.locator('#k2-revoke [data-fd-confirm-row-submit]').click();
  await focused(p, '[data-key="k3"] [data-fd-menu]');
  await p.waitForFunction(() => !document.querySelector('[data-key="k2"]'));
  await shown(p, '.fd-toast');
  assert.deepEqual(errors, []);
  await p.close();
});

test('a trigger with no id opens only the question in its own row, and nothing when its row has none', async () => {
  const { p, errors } = await open('docs/data.html');
  await p.evaluate(() => {
    const list = document.getElementById('cr-keys');
    list.insertAdjacentHTML('beforeend', '<li class="fd-list-row" id="cr-bare"><div class="fd-list-body"><span class="fd-list-title">Staging</span></div>'
      + '<div class="fd-list-trail"><button class="fd-btn" type="button" data-size="sm" data-fd-confirm-row id="cr-bare-btn">Revoke</button></div></li>');
    document.getElementById('key-1-confirm').closest('.fd-list-row').querySelector('.fd-list-trail')
      .insertAdjacentHTML('beforeend', '<button class="fd-btn" type="button" data-size="sm" data-fd-confirm-row id="cr-own-btn">Revoke</button>');
  });
  await p.locator('#cr-bare-btn').click();
  assert.equal(await p.evaluate(() => [...document.querySelectorAll('#cr-keys .fd-confirm-row')].filter((q) => !q.hidden).length), 0, 'a row with no question opens no other row\'s');
  await p.locator('#cr-own-btn').click();
  await shown(p, '#key-1-confirm');
  await focused(p, '#key-1-confirm [data-fd-confirm-row-cancel]');
  await p.keyboard.press('Escape');
  await focused(p, '#cr-own-btn');
  assert.deepEqual(errors, []);
  await p.close();
});
