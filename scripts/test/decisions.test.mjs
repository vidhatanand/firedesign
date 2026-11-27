// node --test scripts/test/ : the decisions family in Chromium (fire/js/content.js and the held toast in overlays.js).
//   Reason and commit: the word budget, the checks, the locked line, fd:commit with the reason and its provenance.
//   Draft: Use fills the field and marks it used, then edited; Discard fires a cancelable fd:close.
//   Hold: inline and in a toast; Undo, Escape and Ctrl+Z stop it; the end and pagehide send it; announcements.
//   Done · Undo toasts, the queue (select, keys, removeItem, the narrow view), page states and the preview.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

const FIXTURE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="/fire/fire.css"><script type="module" src="/fire/fire.js"></script></head><body>
<form class="fd-commit" id="c1">
  <aside class="fd-draft" id="d1"><p class="fd-draft-by"><span>Drafted by Ember agent</span></p>
    <p class="fd-draft-text">Northwind lost 212 crawls in the outage.</p>
    <div class="fd-draft-actions"><button type="button" data-fd-draft="use">Use</button><button type="button" data-fd-draft="discard">Discard</button></div></aside>
  <div class="fd-field"><label class="fd-field-label" for="r1">Reason</label>
    <textarea class="fd-textarea" id="r1" required></textarea>
    <div class="fd-field-foot"><span class="fd-commit-budget" data-min-words="3" data-max-words="10"></span></div>
    <p class="fd-field-error" hidden><span></span></p></div>
  <div class="fd-commit-actions">
    <button class="fd-btn" type="submit" value="approve" data-verb="Approving the credit">Approve the credit</button>
    <button class="fd-btn" type="submit" value="decline">Decline</button></div>
</form>
<form class="fd-commit" id="c2" data-fd-hold="2">
  <div class="fd-field"><textarea class="fd-textarea" id="r2" required></textarea><p class="fd-field-error" hidden><span></span></p></div>
  <div class="fd-commit-actions"><button class="fd-btn" type="submit" value="approve" data-verb="Allowing the host">Allow the host</button>
    <button class="fd-btn" type="submit" value="decline" data-variant="danger" data-verb="Declining">Decline</button></div>
</form>
<form class="fd-commit" id="c3" data-fd-hold="2" data-fd-hold-in="toast">
  <div class="fd-field"><textarea class="fd-textarea" id="r3"></textarea></div>
  <div class="fd-commit-actions"><button class="fd-btn" type="submit" value="approve" data-verb="Shipping the change">Ship the change</button></div>
</form>
<div class="fd-commit" id="c4">
  <div class="fd-commit-actions"><button class="fd-btn" type="submit" value="approve">Raise to 200</button></div>
  <p class="fd-commit-lock"><span>Only owners decide limits.</span></p>
</div>
<button id="trigger" data-fd-hold-for="h1" data-verb="Cancelling run_8f2a91" value="cancel">Cancel the run</button>
<div class="fd-hold" id="h1" data-seconds="2" hidden>
  <span class="fd-hold-ring" aria-hidden="true"><span class="fd-hold-count"></span></span>
  <div class="fd-hold-text"><p class="fd-hold-title"></p><p class="fd-hold-note">Nothing is sent until then.</p></div>
  <button class="fd-btn fd-hold-undo" type="button">Undo</button>
</div>
<div class="fd-queue" id="q">
  <nav class="fd-queue-list">
    <div class="fd-queue-group" id="g1"><p class="fd-queue-group-label">Credits <span class="fd-queue-count">2</span></p>
      <button class="fd-queue-item" type="button" data-value="a" aria-current="true"><span class="fd-queue-title">A</span></button>
      <button class="fd-queue-item" type="button" data-value="b"><span class="fd-queue-title">B</span></button></div>
    <div class="fd-queue-group" id="g2"><p class="fd-queue-group-label">Hosts <span class="fd-queue-count">1</span></p>
      <button class="fd-queue-item" type="button" data-value="c"><span class="fd-queue-title">C</span></button></div>
  </nav>
  <div class="fd-queue-case"><button class="fd-btn fd-queue-back" type="button">Queue</button>
    <section data-case="a"><h2>Case A</h2></section><section data-case="b" hidden><h2>Case B</h2></section><section data-case="c" hidden><h2>Case C</h2></section></div>
</div>
<div class="fd-states" id="s" data-state="loading">
  <div id="s-loading" data-when="loading">Loading</div>
  <div id="s-ready" data-when="ready">Ready</div>
  <div id="s-empty" class="fd-empty" data-when="empty filtered"><h3 class="fd-empty-title">Nothing</h3></div>
  <div id="s-error" class="fd-empty" data-when="error"><h3 class="fd-empty-title">Failed</h3><button id="retry" data-fd-set-state="loading">Try again</button></div>
</div>
<form class="fd-preview" id="p">
  <div class="fd-preview-edit"><input id="p-limit" name="limit" type="number" value="4" min="1" max="20" required>
    <button type="button" id="p-open" data-fd-preview-open>Preview</button></div>
  <p class="fd-preview-stale">Preview again.</p>
  <div class="fd-preview-result"><div class="fd-impact"><p class="fd-impact-count"><b>412</b> teams change</p></div>
    <div class="fd-commit" id="p-commit"><div class="fd-field"><textarea id="p-reason"></textarea></div>
      <div class="fd-commit-actions"><button type="submit" value="apply" id="p-apply">Change</button></div></div></div>
</form>
</body></html>`;

let browser;
let page;
const events = () => page.evaluate(() => window.__ev.splice(0));

test.before(async () => {
  const { chromium } = await import('playwright-core');
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.route('http://fire.localhost/**', (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
    if (rel === 'fixture.html') return route.fulfill({ contentType: 'text/html', body: FIXTURE });
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ contentType: TYPES[path.extname(file)] ?? 'application/octet-stream', body: fs.readFileSync(file) });
  });
  await page.goto('http://fire.localhost/fixture.html');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
  await page.evaluate(() => {
    window.__ev = [];
    for (const name of ['fd:hold', 'fd:undo', 'fd:commit', 'fd:accept', 'fd:close', 'fd:select', 'fd:change', 'fd:open']) {
      document.addEventListener(name, (e) => window.__ev.push({ name, id: e.target.id || e.target.className, detail: JSON.parse(JSON.stringify({ ...e.detail, item: undefined, trigger: undefined, value: e.detail?.value instanceof FormData ? Object.fromEntries(e.detail.value) : e.detail?.value })) }));
    }
  });
});
test.after(async () => { await browser?.close(); });

test('the budget counts words and turns near and over', async () => {
  const budget = page.locator('#c1 .fd-commit-budget');
  assert.equal(await budget.textContent(), '0 / 10 words');
  await page.fill('#r1', 'one two three four five six seven eight nine');
  assert.equal(await budget.textContent(), '9 / 10 words');
  assert.equal(await budget.getAttribute('data-state'), 'near');
  await page.fill('#r1', 'one two three four five six seven eight nine ten eleven');
  assert.equal(await budget.getAttribute('data-state'), 'over');
});

test('a commit checks the reason, shows the error in the field and keeps focus there', async () => {
  await page.fill('#r1', '');
  await events();
  await page.click('#c1 button[value="approve"]');
  assert.equal(await page.isVisible('#c1 .fd-field-error'), true);
  assert.equal(await page.textContent('#c1 .fd-field-error span'), 'Write a reason first.');
  assert.equal(await page.getAttribute('#r1', 'aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'r1');
  await page.fill('#r1', 'too short');
  await page.click('#c1 button[value="decline"]');
  assert.equal(await page.textContent('#c1 .fd-field-error span'), 'Write at least 3 words.');
  await page.fill('#r1', 'a b c d e f g h i j k l');
  await page.click('#c1 button[value="approve"]');
  assert.equal(await page.textContent('#c1 .fd-field-error span'), 'Keep it to 10 words. It has 12.');
  assert.deepEqual((await events()).filter((e) => e.name === 'fd:commit'), []);
  // Fixing the words clears the error as the person types.
  await page.fill('#r1', 'a b c');
  assert.equal(await page.isVisible('#c1 .fd-field-error'), false);
  assert.equal(await page.getAttribute('#r1', 'aria-invalid'), null);
});

test('a draft fills the reason when used, and the field records used, then edited', async () => {
  await page.fill('#r1', '');
  await events();
  await page.click('#d1 [data-fd-draft="use"]');
  assert.equal(await page.inputValue('#r1'), 'Northwind lost 212 crawls in the outage.');
  assert.equal(await page.getAttribute('#r1', 'data-fd-drafted'), 'used');
  assert.equal(await page.getAttribute('#d1', 'data-state'), 'used');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'r1');
  assert.equal((await events()).find((e) => e.name === 'fd:accept')?.detail.value, 'Northwind lost 212 crawls in the outage.');
  await page.type('#r1', ' Approve.');
  assert.equal(await page.getAttribute('#r1', 'data-fd-drafted'), 'edited');
  assert.equal(await page.getAttribute('#d1', 'data-state'), 'edited');
});

test('a commit without a hold fires fd:commit with the reason, the button and the provenance', async () => {
  await events();
  await page.click('#c1 button[value="approve"]');
  const commit = (await events()).find((e) => e.name === 'fd:commit');
  assert.deepEqual(commit.detail, { value: 'approve', reason: 'Northwind lost 212 crawls in the outage. Approve.', drafted: 'edited', verb: 'Approving the credit' });
  assert.equal(await page.getAttribute('#c1', 'data-state'), 'committed');
  assert.equal(await page.evaluate(() => document.getElementById('r1').readOnly), true);
  // A second press does nothing (the buttons are aria-disabled); reopen() makes it editable again.
  assert.equal(await page.getAttribute('#c1 button[value="approve"]', 'aria-disabled'), 'true');
  await page.evaluate(() => document.querySelector('#c1 button[value="approve"]').click());
  assert.equal((await events()).length, 0);
  await page.evaluate(async () => (await import('/fire/js/content.js')).reopen(document.getElementById('c1')));
  assert.equal(await page.getAttribute('#c1', 'data-state'), null);
  assert.equal(await page.evaluate(() => document.getElementById('r1').readOnly), false);
});

test('a visible lock line disables the commit buttons and describes them', async () => {
  const button = page.locator('#c4 button');
  assert.equal(await button.isDisabled(), true);
  const lock = await page.getAttribute('#c4 .fd-commit-lock', 'id');
  assert.ok(lock);
  assert.match(await button.getAttribute('aria-describedby'), new RegExp(lock));
});

test('an inline hold counts down with Undo; Undo and Escape stop it, the end sends it', async () => {
  await page.fill('#r2', 'A single named host.');
  await events();
  await page.click('#c2 button[value="approve"]');
  const hold = page.locator('#c2 .fd-hold');
  assert.equal(await hold.isVisible(), true);
  assert.equal(await hold.getAttribute('data-state'), 'running');
  assert.equal(await page.textContent('#c2 .fd-hold-title'), 'Allowing the host');
  assert.equal(await page.getAttribute('#c2', 'data-state'), 'held');
  assert.equal(await page.isVisible('#c2 .fd-commit-actions'), false);
  assert.match(await page.evaluate(() => document.activeElement.className), /fd-hold-undo/);
  await page.waitForTimeout(150);
  assert.match(await page.evaluate(() => document.querySelector('[aria-live="polite"].fd-sr-only')?.textContent ?? ''), /Allowing the host in 2 seconds/);
  await page.click('#c2 .fd-hold-undo');
  let ev = await events();
  assert.deepEqual(ev.map((e) => e.name), ['fd:hold', 'fd:undo']);
  assert.equal(ev[0].detail.seconds, 2);
  assert.equal(await hold.isHidden(), true);
  assert.equal(await page.getAttribute('#c2', 'data-state'), null);
  assert.equal(await page.evaluate(() => document.activeElement.value), 'approve');

  // Escape stops it too; a danger button gives the hold the danger tone.
  await page.click('#c2 button[value="decline"]');
  assert.equal(await hold.getAttribute('data-tone'), 'danger');
  await page.keyboard.press('Escape');
  ev = await events();
  assert.deepEqual(ev.map((e) => e.name), ['fd:hold', 'fd:undo']);

  // Left alone, it sends when the time runs out.
  await page.click('#c2 button[value="approve"]');
  await page.waitForTimeout(2400);
  ev = await events();
  assert.deepEqual(ev.map((e) => e.name), ['fd:hold', 'fd:commit']);
  assert.equal(ev[1].detail.cause, 'time');
  assert.equal(ev[1].detail.reason, 'A single named host.');
  assert.equal(await page.getAttribute('#c2', 'data-state'), 'committed');
  await page.evaluate(async () => (await import('/fire/js/content.js')).reopen(document.getElementById('c2')));
});

test('a standalone hold starts from its trigger, resolves hold(), and leaving the page sends it', async () => {
  await events();
  await page.click('#trigger');
  assert.equal(await page.isDisabled('#trigger'), true);
  assert.equal(await page.textContent('#h1 .fd-hold-title'), 'Cancelling run_8f2a91');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const ev = await events();
  assert.deepEqual(ev.map((e) => [e.name, e.id]), [['fd:hold', 'h1'], ['fd:commit', 'h1']]);
  assert.equal(ev[1].detail.cause, 'pagehide');
  assert.equal(ev[1].detail.value, 'cancel');
  assert.equal(await page.isDisabled('#trigger'), false);
  const sent = await page.evaluate(async () => {
    const { hold, cancelHold } = await import('/fire/js/content.js');
    const el = document.getElementById('h1');
    const p = hold(el, { seconds: 5, label: 'Revoking 3 keys' });
    setTimeout(() => cancelHold(el), 50);
    return p;
  });
  assert.equal(sent, false);
  await events();
});

test('a commit held in a toast frees the page, Ctrl+Z undoes it, and the end sends it', async () => {
  await events();
  // The first half only looks at the held toast and undoes it: give it a hold no slow machine can outlast, so the clock
  // cannot send it before Ctrl+Z. The second half needs the real two seconds and waits for the send itself.
  await page.evaluate(() => { document.getElementById('c3').dataset.fdHold = '60'; });
  await page.click('#c3 button[value="approve"]');
  const toast = page.locator('.fd-toaster .fd-toast[data-held]');
  assert.equal(await toast.count(), 1);
  assert.equal(await toast.locator('.fd-toast-title').textContent(), 'Shipping the change');
  assert.equal(await toast.locator('.fd-toast-close').count(), 0);
  assert.equal(await toast.locator('.fd-hold-ring[data-size="sm"]').count(), 1);
  let ev = await events();
  assert.deepEqual(ev.map((e) => [e.name, e.id]), [['fd:hold', 'c3']]);
  assert.ok(ev[0].detail.toast);
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Control+z');
  ev = await events();
  assert.deepEqual(ev.map((e) => [e.name, e.id]), [['fd:undo', 'c3']]);
  assert.equal(await page.getAttribute('#c3', 'data-state'), null);
  assert.equal(await page.locator('.fd-toaster .fd-toast').last().locator('.fd-toast-title').textContent(), 'Stopped');

  // Cancel fd:commit to keep the toast as a loading toast for the result.
  await page.evaluate(() => {
    const form = document.getElementById('c3');
    form.dataset.fdHold = '2';
    form.addEventListener('fd:commit', (e) => e.preventDefault(), { once: true });
  });
  await page.click('#c3 button[value="approve"]');
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => window.__ev.some((e) => e.name === 'fd:commit'));
  ev = await events();
  assert.deepEqual(ev.map((e) => e.name), ['fd:hold', 'fd:commit']);
  const id = ev[1].detail.toast;
  assert.equal(await page.getAttribute(`.fd-toast[data-id="${id}"]`, 'data-tone'), 'loading');
  assert.equal(await page.getAttribute('#c3', 'data-state'), 'committed');
  await page.evaluate(async () => { const { overlays } = await import('/fire/fire.js'); overlays.toast.dismiss(); });
});

test('Done · Undo: a toast with undo runs it and says it was undone', async () => {
  await page.waitForTimeout(400);
  await events();
  await page.evaluate(async () => {
    const { overlays } = await import('/fire/fire.js');
    window.__undone = 0;
    overlays.toast({ title: 'Monitor archived', tone: 'success', undo: () => { window.__undone += 1; }, undone: 'Monitor restored' });
  });
  const t = page.locator('.fd-toaster .fd-toast').last();
  await t.locator('[data-fd-toast-undo]').click();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__undone), 1);
  assert.equal(await t.locator('.fd-toast-title').textContent(), 'Monitor restored');
  assert.deepEqual((await events()).map((e) => e.name), ['fd:undo']);
  // A failing undo says so.
  await page.evaluate(async () => {
    const { overlays } = await import('/fire/fire.js');
    overlays.toast({ title: 'Key revoked', undo: () => Promise.reject(new Error('The key was already rotated.')) });
  });
  const t2 = page.locator('.fd-toaster .fd-toast').last();
  await t2.locator('[data-fd-toast-undo]').click();
  await page.waitForTimeout(100);
  assert.equal(await t2.getAttribute('data-tone'), 'danger');
  assert.equal(await t2.locator('.fd-toast-desc').textContent(), 'The key was already rotated.');
  await page.evaluate(async () => { const { overlays } = await import('/fire/fire.js'); overlays.toast.dismiss(); });
});

test('the queue: picking, keys, the narrow view and removing items', async () => {
  await events();
  await page.click('.fd-queue-item[data-value="b"]');
  assert.equal(await page.getAttribute('.fd-queue-item[data-value="b"]', 'aria-current'), 'true');
  assert.equal(await page.getAttribute('.fd-queue-item[data-value="a"]', 'aria-current'), null);
  assert.equal(await page.isVisible('[data-case="b"]'), true);
  assert.equal(await page.isHidden('[data-case="a"]'), true);
  assert.deepEqual((await events()).filter((e) => e.name === 'fd:select').map((e) => e.detail.value), ['b']);
  await page.focus('.fd-queue-item[data-value="a"]');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.value), 'b');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.value), 'c');
  await page.keyboard.press('Home');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.value), 'a');

  // Narrow: one at a time, the case heading takes focus, Queue goes back.
  await page.setViewportSize({ width: 375, height: 800 });
  await page.click('.fd-queue-back');
  assert.equal(await page.getAttribute('#q', 'data-view'), 'list');
  assert.equal(await page.isHidden('.fd-queue-case'), true);
  await page.click('.fd-queue-item[data-value="c"]');
  assert.equal(await page.isHidden('.fd-queue-list'), true);
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Case C');
  await page.setViewportSize({ width: 1200, height: 900 });

  // removeItem picks the next, keeps the counts and hides an empty group.
  const next = await page.evaluate(async () => {
    const { removeItem, select } = await import('/fire/js/content.js');
    select(document.querySelector('.fd-queue-item[data-value="a"]'), { focus: false });
    const n = removeItem(document.querySelector('.fd-queue-item[data-value="a"]'));
    return n?.dataset.value;
  });
  assert.equal(next, 'b');
  assert.equal(await page.textContent('#g1 .fd-queue-count'), '1');
  await page.evaluate(async () => { const { removeItem } = await import('/fire/js/content.js'); removeItem(document.querySelector('.fd-queue-item[data-value="c"]')); });
  assert.equal(await page.evaluate(() => document.getElementById('g2').hidden), true);
});

test('page states: only the parts of the state show, focus follows, fd:change fires', async () => {
  const shown = () => page.evaluate(() => [...document.getElementById('s').children].filter((c) => getComputedStyle(c).display !== 'none').map((c) => c.id));
  assert.deepEqual(await shown(), ['s-loading']);
  await events();
  await page.evaluate(async () => (await import('/fire/js/content.js')).setState(document.getElementById('s'), 'error'));
  assert.deepEqual(await shown(), ['s-error']);
  await page.focus('#retry');
  await page.click('#retry');
  assert.deepEqual(await shown(), ['s-loading']);
  const ev = (await events()).filter((e) => e.name === 'fd:change');
  assert.deepEqual(ev.map((e) => [e.detail.value, e.detail.previous]), [['error', 'loading'], ['loading', 'error']]);
  await page.evaluate(async () => (await import('/fire/js/content.js')).setState(document.getElementById('s'), 'filtered'));
  assert.deepEqual(await shown(), ['s-empty']);
  await page.evaluate(() => document.getElementById('s').removeAttribute('data-state'));
  assert.deepEqual(await shown(), ['s-ready']);
  // An unknown state is ignored.
  await page.evaluate(async () => (await import('/fire/js/content.js')).setState(document.getElementById('s'), 'gone'));
  assert.equal(await page.getAttribute('#s', 'data-state'), null);
});

test('preview: the commit waits for a preview and hides when the edit goes stale', async () => {
  await events();
  assert.equal(await page.isHidden('#p .fd-preview-result'), true);
  await page.evaluate(() => document.getElementById('p-apply').click());
  assert.deepEqual((await events()).filter((e) => e.name === 'fd:commit'), []);
  await page.click('#p-open');
  assert.equal(await page.getAttribute('#p', 'data-state'), 'preview');
  assert.equal(await page.isVisible('#p .fd-preview-result'), true);
  const open = (await events()).find((e) => e.name === 'fd:open');
  assert.deepEqual(open.detail.value, { limit: '4' });
  await page.fill('#p-limit', '6');
  assert.equal(await page.getAttribute('#p', 'data-state'), 'stale');
  assert.equal(await page.isHidden('#p .fd-preview-result'), true);
  assert.equal(await page.isVisible('#p .fd-preview-stale'), true);
  await page.click('#p-open');
  await page.fill('#p-reason', 'Teams waited on it.');
  await events();
  await page.click('#p-apply');
  const commit = (await events()).find((e) => e.name === 'fd:commit');
  assert.equal(commit.id, 'p-commit');
  assert.equal(commit.detail.value, 'apply');
  // An invalid edit field is not previewed.
  await page.evaluate(async () => (await import('/fire/js/content.js')).reopen(document.getElementById('p-commit')));
  await page.fill('#p-limit', '40');
  await page.click('#p-open');
  assert.equal(await page.getAttribute('#p', 'data-state'), 'stale');
});
