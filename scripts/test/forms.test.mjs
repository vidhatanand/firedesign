// node --test scripts/test/forms.test.mjs
// Fire 0.7 forms: date field, period with comparison, colour control and swatch, confirm on the page,
// disabled with a reason, recovery codes. Pure helpers run in Node; behaviour runs in Chromium (playwright-core)
// against docs/forms.html and docs/overlays.html, with and without script.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.document = { readyState: 'complete', querySelectorAll: () => [], querySelector: () => null, documentElement: { lang: '' } };
const forms = await import('../../fire/js/forms.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/* ---------- Pure helpers ---------- */

test('parseDateText reads ISO and named-month dates and refuses days that do not exist', () => {
  assert.equal(forms.parseDateText('2026-11-18'), '2026-11-18');
  assert.equal(forms.parseDateText('2026/1/5'), '2026-01-05');
  assert.equal(forms.parseDateText('Nov 18, 2026'), '2026-11-18');
  assert.equal(forms.parseDateText('18 November 2026'), '2026-11-18');
  assert.equal(forms.parseDateText('2026-02-30'), null);
  assert.equal(forms.parseDateText('2026-13-01'), null);
  assert.equal(forms.parseDateText('next week'), null);
  assert.equal(forms.parseDateText(''), null);
});

test('normalizeHex completes short and hash-less colours in lower case', () => {
  assert.equal(forms.normalizeHex('#14342B'), '#14342b');
  assert.equal(forms.normalizeHex('14342b'), '#14342b');
  assert.equal(forms.normalizeHex('#1f6'), '#11ff66');
  assert.equal(forms.normalizeHex('1f6fe'), null);
  assert.equal(forms.normalizeHex('rgb(0,0,0)'), null);
});

test('confirmProgress names where the typed text stands', () => {
  assert.deepEqual(forms.confirmProgress('', 'ember-prod'), { state: 'idle' });
  assert.deepEqual(forms.confirmProgress('ember-p', 'ember-prod'), { state: 'partial' });
  assert.deepEqual(forms.confirmProgress('ember_p', 'ember-prod'), { state: 'mismatch', at: 6 });
  assert.deepEqual(forms.confirmProgress('ember-prod2', 'ember-prod'), { state: 'mismatch', at: 11 });
  assert.deepEqual(forms.confirmProgress('ember-prod', 'ember-prod'), { state: 'match' });
});

/* ---------- Markup rules ---------- */

test('the new docs sections carry no style attribute and no inline handler', () => {
  for (const file of ['docs/forms.html', 'docs/overlays.html']) {
    const html = read(file);
    assert.ok(!/\sstyle="/.test(html), `${file} has a style attribute`);
    assert.ok(!/\son[a-z]+="/.test(html), `${file} has an inline handler`);
  }
});

test('every new component has a card that points at a docs section', () => {
  for (const id of ['datefield', 'period', 'swatch', 'color', 'confirm-inline', 'reason', 'codes']) {
    const card = JSON.parse(read(`contract/cards/${id}.json`));
    assert.equal(card.id, id);
    assert.equal(card.since, '0.7.0');
    const [file, anchor] = card.example.split('#');
    assert.ok(read(file).includes(`id="${anchor}"`), `${id}: ${card.example}`);
  }
});

/* ---------- Behaviour in a browser ---------- */

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

async function open(page, url, { script = true } = {}) {
  await page.goto(`${base}${url}`);
  if (script) await page.waitForFunction(() => document.querySelector('[data-fd-datefield][data-ready], [data-fd-color][data-ready], [data-fd-codes][data-ready]'));
}

test('date field: typing, ISO write-back, min and max, calendar keys, posted value', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/docs/forms.html');
  const input = page.locator('#df-keep');
  // out of range
  await input.fill('2028-01-01');
  await input.blur();
  assert.equal(await input.getAttribute('aria-invalid'), 'true');
  assert.match(await page.locator('#df-keep').evaluate((el) => el.validationMessage), /Nov 30, 2027 or earlier/);
  // typed in another form: written back as ISO and valid
  await input.fill('Dec 24, 2026');
  await input.blur();
  assert.equal(await input.inputValue(), '2026-12-24');
  assert.equal(await input.getAttribute('aria-invalid'), null);
  // change event carries the ISO date
  const seen = await page.evaluate(() => new Promise((resolve) => {
    const field = document.querySelector('#df-keep').closest('[data-fd-datefield]');
    field.addEventListener('fd:change', (e) => resolve(e.detail), { once: true });
    const el = document.querySelector('#df-keep');
    el.value = '2027-01-02';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }));
  assert.deepEqual(seen, { value: '2027-01-02', valid: true });
  // ArrowDown opens the calendar on the chosen day; Page Down moves a month; Enter picks
  await input.focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForSelector('#df-keep-cal[data-state="open"] .fd-calendar-day[tabindex="0"]');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.date), '2027-01-02');
  await page.keyboard.press('PageDown');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.date), '2027-02-02');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('#df-keep').value === '2027-02-03');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'df-keep');
  await page.close();
});

test('date field: a day before data-min cannot be picked', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/docs/forms.html');
  await page.click('[data-fd-popover="df-keep-cal"]');
  await page.waitForSelector('#df-keep-cal[data-state="open"]');
  // data-min is 2026-11-01: go back far enough and the previous-month button is disabled
  await page.evaluate(() => { document.querySelector('#df-keep').value = '2026-11-15'; });
  await page.keyboard.press('Escape');
  await page.click('[data-fd-popover="df-keep-cal"]');
  await page.waitForSelector('#df-keep-cal [data-cal-nav="-1"]');
  assert.equal(await page.locator('#df-keep-cal [data-cal-nav="-1"]').isDisabled(), true);
  await page.close();
});

test('date field without script posts the ISO date and hides the calendar button', { skip }, async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${base}/docs/forms.html`);
  assert.equal(await page.locator('#df-pause').isVisible(), true);
  assert.equal(await page.locator('[data-fd-popover="df-pause-cal"]').isVisible(), false);
  await ctx.close();
});

test('period: comparison modes, label slots and the change event', { skip }, async () => {
  const page = await browser.newPage();
  await page.goto(`${base}/docs/overlays.html`);
  await page.waitForFunction(() => document.querySelector('#pop-period .fd-calendar-day'));
  assert.match(await page.locator('[data-fd-popover="pop-period"] [data-fd-daterange-compare-label]').textContent(), /^vs /);
  await page.click('[data-fd-popover="pop-period"]');
  await page.waitForSelector('#pop-period[data-state="open"]');
  await page.click('#pop-period [data-preset="30d"]');
  await page.click('#pop-period input[value="previous"] + .fd-radio-box');
  const value = await page.evaluate(() => new Promise((resolve) => {
    document.querySelector('#pop-period [data-fd-daterange]').addEventListener('fd:change', (e) => resolve(e.detail.value), { once: true });
    document.querySelector('#pop-period [data-fd-daterange-apply]').click();
  }));
  assert.equal(value.preset, '30d');
  const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;
  assert.equal(days(value.start, value.end), 30);
  assert.equal(value.compare.mode, 'previous');
  assert.equal(days(value.compare.start, value.compare.end), 30);
  assert.equal(Math.round((Date.parse(value.start) - Date.parse(value.compare.end)) / 86400000), 1);
  assert.match(await page.locator('[data-fd-popover="pop-period"] [data-fd-daterange-label]').textContent(), /Last 30 days/);
  // none clears the comparison and its label
  await page.click('[data-fd-popover="pop-period"]');
  await page.waitForSelector('#pop-period[data-state="open"]');
  await page.click('#pop-period input[value="none"] + .fd-radio-box');
  const none = await page.evaluate(() => new Promise((resolve) => {
    document.querySelector('#pop-period [data-fd-daterange]').addEventListener('fd:change', (e) => resolve(e.detail.value), { once: true });
    document.querySelector('#pop-period [data-fd-daterange-apply]').click();
  }));
  assert.equal(none.compare, null);
  assert.equal(await page.locator('[data-fd-popover="pop-period"] [data-fd-daterange-compare-label]').textContent(), '');
  // same period last year keeps the dates one year back
  await page.click('[data-fd-popover="pop-period"]');
  await page.waitForSelector('#pop-period[data-state="open"]');
  await page.click('#pop-period input[value="year"] + .fd-radio-box');
  const year = await page.evaluate(() => new Promise((resolve) => {
    document.querySelector('#pop-period [data-fd-daterange]').addEventListener('fd:change', (e) => resolve(e.detail.value), { once: true });
    document.querySelector('#pop-period [data-fd-daterange-apply]').click();
  }));
  assert.equal(year.compare.mode, 'year');
  assert.equal(Number(year.start.slice(0, 4)) - Number(year.compare.start.slice(0, 4)), 1);
  assert.equal(year.start.slice(5), year.compare.start.slice(5));
  await page.close();
});

test('date range without a compare band keeps its event detail', { skip }, async () => {
  const page = await browser.newPage();
  await page.goto(`${base}/docs/overlays.html`);
  await page.waitForFunction(() => document.querySelector('#pop-range .fd-calendar-day'));
  await page.click('[data-fd-popover="pop-range"]');
  await page.waitForSelector('#pop-range[data-state="open"]');
  const value = await page.evaluate(() => new Promise((resolve) => {
    document.querySelector('#pop-range [data-fd-daterange]').addEventListener('fd:change', (e) => resolve(e.detail.value), { once: true });
    document.querySelector('#pop-range [data-fd-daterange-apply]').click();
  }));
  assert.deepEqual(Object.keys(value).sort(), ['end', 'preset', 'start']);
  await page.close();
});

test('colour control: hex and picker stay in step, bad hex is refused, contrast is measured live', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/docs/forms.html');
  const hex = page.locator('#co-brand');
  assert.equal(await page.locator('#co-brand').evaluate((el) => el.closest('[data-fd-color]').querySelector('[data-fd-color-picker]').hasAttribute('inert')), false);
  await hex.fill('F60');
  await hex.blur();
  assert.equal(await hex.inputValue(), '#ff6600');
  assert.equal(await page.locator('#co-brand').evaluate((el) => el.closest('[data-fd-color]').querySelector('[data-fd-color-picker]').value), '#ff6600');
  await hex.fill('ff66');
  await hex.blur();
  assert.equal(await hex.getAttribute('aria-invalid'), 'true');
  assert.equal(await hex.evaluate((el) => el.validity.valid), false);
  // white on a white page reads as hard to see; the rows say so in words
  await hex.fill('#ffffff');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await hex.blur();
  const rows = await page.locator('#co-brand').evaluate((el) => [...el.closest('[data-fd-color]').querySelectorAll('.fd-color-check')].map((r) => [r.dataset.level, r.querySelector('.fd-color-check-verdict').textContent]));
  assert.equal(rows[0][0], 'fail');
  assert.match(rows[0][1], /Too faint/);
  // the same colour is fine on a dark page: the feedback follows the theme
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.waitForFunction(() => document.querySelector('#co-brand').closest('[data-fd-color]').querySelector('.fd-color-check').dataset.level === 'pass');
  await page.close();
});

test('colour control without script keeps the picker inert and the hex box named', { skip }, async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${base}/docs/forms.html`);
  assert.equal(await page.locator('#co-brand').getAttribute('name'), 'brand_color');
  assert.equal(await page.locator('#co-brand').evaluate((el) => el.closest('[data-fd-color]').querySelector('[data-fd-color-picker]').hasAttribute('name')), false);
  await ctx.close();
});

test('confirm on the page: the button follows the text, the rule line says where it stands', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/docs/forms.html');
  const form = page.locator('#ci-idle').locator('xpath=ancestor::form');
  const button = form.locator('[data-fd-confirm-submit]');
  const rule = form.locator('[data-fd-confirm-rule]');
  assert.equal(await button.isDisabled(), true);
  await page.fill('#ci-idle', 'ember-p');
  assert.equal(await form.getAttribute('data-state'), 'partial');
  assert.match(await rule.textContent(), /Matches so far/);
  await page.fill('#ci-idle', 'ember_prod');
  assert.equal(await form.getAttribute('data-state'), 'mismatch');
  assert.match(await rule.textContent(), /character 6/);
  assert.equal(await button.isDisabled(), true);
  await page.fill('#ci-idle', '  ember-prod ');
  assert.equal(await form.getAttribute('data-state'), 'match');
  assert.equal(await button.isDisabled(), false);
  await page.fill('#ci-idle', '');
  assert.match(await rule.textContent(), /Type it exactly as shown/);
  assert.equal(await button.isDisabled(), true);
  await page.close();
});

test('confirm on the page without script leaves the button enabled for the server to check', { skip }, async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${base}/docs/forms.html`);
  assert.equal(await page.locator('#ci-idle').locator('xpath=ancestor::form').locator('[data-fd-confirm-submit]').isDisabled(), false);
  await ctx.close();
});

test('disabled with a reason: an aria-disabled control stays focusable and does nothing', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/docs/forms.html');
  const button = page.locator('[aria-describedby="rs-delete"]');
  await button.focus();
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-describedby')), 'rs-delete');
  const clicked = await page.evaluate(() => {
    let hit = false;
    const el = document.querySelector('[aria-describedby="rs-delete"]');
    el.addEventListener('click', () => { hit = true; });
    el.click();
    return hit;
  });
  assert.equal(clicked, false);
  assert.equal(await page.locator('#rs-delete').isVisible(), true);
  // a native disabled button is out of the tab order but still points at its reason
  assert.equal(await page.locator('[aria-describedby="rs-key"]').isDisabled(), true);
  await page.close();
});

test('recovery codes: copy all and download leave out used codes', { skip }, async () => {
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  await open(page, '/docs/forms.html');
  const card = page.locator('#rc2-title').locator('xpath=ancestor::section[1]');
  assert.equal(await card.locator('[data-fd-codes-copy]').isVisible(), true);
  await card.locator('[data-fd-codes-copy]').click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(copied, '9tbn-wr3e\nh5xa-p8vc\nr4ug-n9kq\nc8sl-3ehw');
  assert.match(await card.locator('[data-fd-codes-copy]').textContent(), /Copied/);
  const [download] = await Promise.all([page.waitForEvent('download'), card.locator('[data-fd-codes-download]').click()]);
  assert.equal(download.suggestedFilename(), 'ember-recovery-codes.txt');
  const text = fs.readFileSync(await download.path(), 'utf8');
  assert.equal(text, '9tbn-wr3e\nh5xa-p8vc\nr4ug-n9kq\nc8sl-3ehw\n');
  await ctx.close();
});

test('recovery codes without script: the buttons are hidden and the codes are text', { skip }, async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${base}/docs/forms.html`);
  assert.equal(await page.locator('#rc-title').locator('xpath=ancestor::section[1]').locator('[data-fd-codes-copy]').isVisible(), false);
  assert.equal(await page.locator('.fd-codes-item code').first().evaluate((el) => getComputedStyle(el).userSelect), 'all');
  await ctx.close();
});

test.after(async () => { await browser?.close(); server?.close(); });
