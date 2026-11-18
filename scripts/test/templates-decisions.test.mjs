// node --test scripts/test/templates-decisions.test.mjs : the 0.7 decision templates in Chromium.
//   decisions.html  a commit leaves the queue while its toast holds; Undo puts it back; a viewer is locked out.
//   decision-case.html  the preview fills the reach for the scope chosen, goes stale on a change; decided keeps the brief.
//   answer.html  the held send ends in the done view with Undo; expired and already answered.
//   record.html  one section fails while the others render, and Retry loads it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

let browser;
test.before(async () => {
  const { chromium } = await import('playwright-core');
  browser = await chromium.launch();
});
test.after(async () => { await browser?.close(); });

async function open(url, { clock = false, width = 1280 } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('http://fire.localhost/**', (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ contentType: TYPES[path.extname(file)] ?? 'application/octet-stream', body: fs.readFileSync(file) });
  });
  if (clock) await page.clock.install();
  await page.goto(`http://fire.localhost/${url}`);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
  return { page, errors };
}

test('decisions: a commit leaves the queue while its toast holds, and Undo puts the case back', async () => {
  const { page, errors } = await open('templates/decisions.html');
  await page.waitForFunction(() => document.getElementById('dq-states').dataset.state === 'ready');
  const item = '#dq .fd-queue-item[data-value="credit-northwind"]';
  assert.equal(await page.getAttribute(item, 'aria-current'), 'true');
  await page.click('[data-case="credit-northwind"] [data-fd-draft="use"]');
  assert.match(await page.inputValue('#dq-credit-reason'), /212 crawls/);
  await page.click('[data-case="credit-northwind"] button[value="approve"]');
  await page.waitForSelector('.fd-toast[data-held]');
  assert.equal(await page.locator(item).count(), 0, 'the case left the queue');
  assert.equal(await page.isHidden('[data-case="credit-northwind"]'), true);
  assert.equal(await page.textContent('#dq-g-credits .fd-queue-count'), '1');
  // The next case is current now.
  assert.equal(await page.getAttribute('#dq .fd-queue-item[aria-current="true"]', 'data-value'), 'credit-halcyon');
  await page.click('.fd-toast[data-held] .fd-toast-action');
  await page.waitForSelector(item);
  assert.equal(await page.getAttribute(item, 'aria-current'), 'true');
  assert.equal(await page.isVisible('[data-case="credit-northwind"]'), true);
  assert.equal(await page.textContent('#dq-g-credits .fd-queue-count'), '2');
  assert.deepEqual(errors, []);
  await page.close();
});

test('decisions: a viewer reads every case, with locked commits and who decides', async () => {
  const { page } = await open('templates/decisions.html?state=viewer');
  assert.equal(await page.getAttribute('#dq-states', 'data-state'), 'ready');
  assert.equal(await page.isVisible('#dq-viewer'), true);
  assert.equal(await page.locator('#dq-credit-reason').count(), 0, 'no reason field for a viewer');
  assert.equal(await page.isDisabled('[data-case="credit-northwind"] button[value="approve"]'), true);
  assert.match(await page.textContent('[data-case="credit-northwind"] .fd-commit-lock'), /Only owners decide/);
  await page.close();
});

test('decisions: ?case= opens that case; page states come from ?state=', async () => {
  const { page } = await open('templates/decisions.html?case=host-halcyon');
  await page.waitForFunction(() => document.querySelector('#dq .fd-queue-item[aria-current="true"]')?.dataset.value === 'host-halcyon');
  assert.equal(await page.isVisible('[data-case="host-halcyon"]'), true);
  await page.close();
  for (const state of ['empty', 'error', 'no-access']) {
    const { page: p } = await open(`templates/decisions.html?state=${state}`);
    assert.equal(await p.getAttribute('#dq-states', 'data-state'), state);
    await p.close();
  }
});

test('decision-case: the preview fills the reach for the scope chosen, and a change makes it stale', async () => {
  const { page, errors } = await open('templates/decision-case.html');
  await page.waitForFunction(() => document.getElementById('dc-states').dataset.state === 'ready');
  await page.click('#dc-preview label:has(input[value="paid"])');
  await page.click('#dc-preview [data-fd-preview-open]');
  assert.equal(await page.getAttribute('#dc-preview', 'data-state'), 'preview');
  assert.equal(await page.textContent('#dc-count'), '18');
  assert.equal(await page.textContent('#dc-ship span'), 'Ship to 18 teams');
  assert.match(await page.textContent('#dc-impact-list'), /Northwind Labs/);
  assert.doesNotMatch(await page.textContent('#dc-impact-list'), /Halcyon/);
  await page.fill('#dc-cap', '10');
  await page.dispatchEvent('#dc-cap', 'input');
  assert.equal(await page.getAttribute('#dc-preview', 'data-state'), 'stale');
  assert.deepEqual(errors, []);
  await page.close();
});

test('decision-case: the held commit ends in the decided brief with the audit line', async () => {
  const { page } = await open('templates/decision-case.html', { clock: true });
  await page.clock.runFor(1000);
  await page.waitForFunction(() => document.getElementById('dc-states').dataset.state === 'ready');
  await page.click('#dc-preview [data-fd-preview-open]');
  await page.fill('#dc-reason', 'Fewer blocks are worth slower crawls.');
  await page.click('#dc-ship');
  assert.equal(await page.getAttribute('#dc-commit .fd-hold', 'data-state'), 'running');
  await page.clock.runFor(11000);
  await page.waitForSelector('#dc-outcome:not([hidden])');
  assert.equal(await page.textContent('#dc-status'), 'Shipped');
  assert.match(await page.textContent('#dc-audit'), /aud_7k2m9q.*29 teams/);
  assert.equal(await page.isHidden('#dc-decide'), true);
  assert.equal(await page.getAttribute('#dc-step-approve', 'data-state'), 'done');
  await page.close();
});

test('answer: the held send ends in the done view, and Undo returns to the ask', async () => {
  const { page, errors } = await open('templates/answer.html', { clock: true, width: 375 });
  await page.clock.runFor(1000);
  await page.waitForFunction(() => document.getElementById('an-states').dataset.state === 'ready');
  await page.fill('#an-reason', 'Covers the crawls lost in the outage.');
  await page.click('#an-commit button[value="decline"]');
  await page.clock.runFor(11000);
  await page.waitForSelector('#an-done:not([hidden])');
  assert.equal(await page.textContent('#an-done-title'), 'Declined');
  assert.equal(await page.isVisible('#an-undo'), true);
  await page.click('#an-undo');
  await page.clock.runFor(1000);
  await page.waitForSelector('#an-ask:not([hidden])');
  assert.equal(await page.isVisible('#an-undone'), true);
  assert.equal(await page.inputValue('#an-reason'), 'Covers the crawls lost in the outage.');
  assert.deepEqual(errors, []);
  await page.close();
});

test('answer: expired and already answered', async () => {
  const { page } = await open('templates/answer.html?state=expired');
  assert.equal(await page.getAttribute('#an-states', 'data-state'), 'expired');
  assert.equal(await page.isVisible('.fd-empty[data-when="expired"]'), true);
  await page.close();
  const { page: p } = await open('templates/answer.html?state=answered');
  assert.equal(await p.isVisible('#an-answered'), true);
  assert.equal(await p.isHidden('#an-ask'), true);
  await p.close();
});

test('record: one section fails while the others render, and Retry loads it', async () => {
  const { page, errors } = await open('templates/record.html');
  await page.waitForFunction(() => document.querySelector('[data-rc-section="activity"]').dataset.state === 'error');
  for (const s of ['usage', 'requests', 'details', 'plans']) {
    assert.equal(await page.getAttribute(`[data-rc-section="${s}"]`, 'data-state'), 'ready', s);
  }
  await page.click('[data-rc-section="activity"] [data-fd-set-state="loading"]');
  assert.equal(await page.getAttribute('[data-rc-section="activity"]', 'data-state'), 'loading');
  await page.waitForFunction(() => document.querySelector('[data-rc-section="activity"]').dataset.state === 'ready');
  assert.deepEqual(errors, []);
  await page.close();
  const { page: p } = await open('templates/record.html?state=not-found');
  assert.equal(await p.getAttribute('#rc-page', 'data-state'), 'not-found');
  await p.close();
});
