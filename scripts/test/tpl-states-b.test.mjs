// node --test scripts/test/tpl-states-b.test.mjs : cards and ?state= for the older templates, package B (0.8).
//   auth, auth-centered, blank, not-found, onboarding, support, docs-api, docs-changelog, docs-guide, docs-home, shell-static.
//   Every card validates and is in the catalogue. Every state a card names with ?state=<name> is handled by the page's
//   own script (checked in Chromium: the page shows something different from the default and has no script error), and
//   an unknown name falls back to the default render. Templates with no states of their own say so in the card.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SLUGS = ['auth', 'auth-centered', 'blank', 'not-found', 'onboarding', 'support', 'docs-api', 'docs-changelog', 'docs-guide', 'docs-home', 'shell-static'];
const NO_STATES = ['blank', 'docs-home', 'shell-static'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const card = (slug) => JSON.parse(read(`contract/cards/templates/${slug}.json`));
const askedStates = (c) => c.states.map((s) => /\?state=([a-z0-9-]+)/.exec(s.how)?.[1]).filter(Boolean);

test('cards: complete, one sentence job, within budgets, in the catalogue', () => {
  const catalog = JSON.parse(read('contract/catalog.json'));
  for (const slug of SLUGS) {
    const c = card(slug);
    assert.equal(c.id, slug);
    for (const field of ['job', 'purpose', 'useWhen', 'avoidWhen', 'aka', 'surfaces', 'data', 'states', 'example', 'provenance', 'since']) assert.ok(c[field] != null, `${slug}: ${field}`);
    assert.match(c.job, /^[A-Z][^.]*\.$/, `${slug}: job is one sentence`);
    assert.ok(c.job.length <= 140 && c.purpose.length <= 500, `${slug}: budgets`);
    assert.ok(c.avoidWhen.length > 0 && c.avoidWhen.every((a) => a.when && a.instead), `${slug}: avoidWhen names the alternative`);
    assert.ok(c.states.length > 0 && c.states.every((s) => s.name && s.how && s.how.length <= 120), `${slug}: states`);
    assert.equal(c.example, `templates/${slug}.html`);
    assert.equal(c.since, '0.8.0');
    assert.ok(c.surfaces.every((s) => ['app', 'website', 'phone', 'email'].includes(s)), `${slug}: surfaces`);
    assert.ok(catalog.templates.some((t) => t.path === c.example && t.job), `${slug}: in templates/index.html`);
    assert.ok(!/\sstyle=/.test(read(c.example)), `${slug}: no style attribute`);
    // docs-* are website; every provenance path that is a repo file exists
    if (slug.startsWith('docs-')) assert.deepEqual(c.surfaces, ['website']);
    for (const p of c.provenance) assert.ok(fs.existsSync(path.join(ROOT, p.split('#')[0])), `${slug}: provenance ${p}`);
    // avoidWhen.instead names a real template
    for (const a of c.avoidWhen) if (SLUGS.includes(a.instead) || fs.existsSync(path.join(ROOT, 'templates', `${a.instead}.html`))) assert.notEqual(a.instead, slug);
  }
  for (const slug of NO_STATES) assert.deepEqual(askedStates(card(slug)), [], `${slug}: no ?state= (the card says so)`);
  for (const slug of SLUGS.filter((s) => !NO_STATES.includes(s))) assert.ok(askedStates(card(slug)).length > 0, `${slug}: names its ?state= values`);
});

test('pages: each state the card names is in the page allow-list; the pages without states read no ?state=', () => {
  for (const slug of SLUGS) {
    const html = read(`templates/${slug}.html`);
    const reads = /get\('state'\)/.test(html);
    if (NO_STATES.includes(slug)) { assert.ok(!reads, `${slug}: no state script`); continue; }
    assert.ok(reads, `${slug}: reads ?state=`);
    for (const name of askedStates(card(slug))) assert.ok(html.includes(`'${name}'`) || html.includes(`${name}:`) || html.includes(`"${name}"`), `${slug}: allow-list has ${name}`);
  }
});

let server, browser, base;
test.before(async () => {
  server = createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
  browser = await chromium.launch();
});
test.after(async () => { await browser?.close(); server?.close(); });

async function open(url, width = 1280) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/templates/${url}`);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
  await page.waitForTimeout(200);
  return { page, errors };
}
const visible = (page, sel) => page.locator(sel).first().isVisible();

test('auth and auth-centered: each state shows what its card says', async () => {
  for (const slug of ['auth', 'auth-centered']) {
    const expect = { sent: '#view-sent', 'wrong-password': '#signin-error', locked: '#signin-locked', error: '#signin-failed' };
    for (const [state, sel] of Object.entries(expect)) {
      const { page, errors } = await open(`${slug}.html?state=${state}`);
      assert.equal(await visible(page, sel), true, `${slug} ${state}: ${sel} shows`);
      assert.deepEqual(errors, [], `${slug} ${state}: no script error`);
      await page.close();
    }
    let { page } = await open(`${slug}.html?state=locked`);
    assert.equal(await page.isDisabled('#signin-submit'), true, `${slug} locked: Sign in disabled`);
    assert.equal(await page.isDisabled('#si-password'), true);
    assert.equal(await page.isEnabled('#magic-link'), true, `${slug} locked: the email link is the way on`);
    await page.close();
    ({ page } = await open(`${slug}.html?state=submitting`));
    assert.equal(await page.getAttribute('#signin-submit', 'aria-busy'), 'true');
    await page.close();
    ({ page } = await open(`${slug}.html?state=wrong-password`));
    assert.equal(await page.getAttribute('#si-password', 'aria-invalid'), 'true');
    await page.close();
    ({ page } = await open(`${slug}.html?state=bogus`));
    assert.equal(await visible(page, '#view-signin'), true, `${slug}: unknown falls back to sign in`);
    for (const sel of ['#signin-error', '#signin-locked', '#signin-failed']) assert.equal(await visible(page, sel), false);
    await page.close();
  }
  const { page } = await open('auth.html?state=signup');
  assert.equal(await visible(page, '#view-signup'), true);
  assert.equal(await visible(page, '#view-signin'), false);
  await page.close();
});

test('not-found: every state, including no-access; unknown names (and inherited ones) fall back to 404', async () => {
  for (const state of ['error', 'offline', 'no-access', 'locked', 'maintenance']) {
    const { page, errors } = await open(`not-found.html?state=${state}`);
    assert.equal(await visible(page, `[data-state-view="${state}"]`), true, state);
    assert.equal(await page.locator('[data-state-view]:visible').count(), 1, `${state}: only one view`);
    assert.deepEqual(errors, []);
    await page.close();
  }
  for (const bad of ['bogus', 'constructor', 'toString']) {
    const { page } = await open(`not-found.html?state=${bad}`);
    assert.equal(await visible(page, '[data-state-view="404"]'), true, bad);
    await page.close();
  }
});

test('onboarding: later steps, invalid, and the key step loading or failed with Retry', async () => {
  const titles = { 'step-2': 'What are you building?', 'step-3': 'Your API key', done: "You're set" };
  for (const [state, title] of Object.entries(titles)) {
    const { page, errors } = await open(`onboarding.html?state=${state}`);
    assert.equal((await page.textContent('#ob-title')).trim(), title, state);
    assert.deepEqual(errors, []);
    await page.close();
  }
  let { page } = await open('onboarding.html?state=invalid');
  assert.equal(await visible(page, '#ob-team-error'), true);
  assert.equal(await page.getAttribute('#ob-team', 'aria-invalid'), 'true');
  await page.close();
  ({ page } = await open('onboarding.html?state=loading'));
  assert.equal(await visible(page, '[data-key-state="loading"]'), true);
  assert.equal(await page.isDisabled('#ob-next'), true, 'Continue waits for a key');
  assert.equal(await visible(page, '.fd-secret'), false);
  await page.close();
  ({ page } = await open('onboarding.html?state=error'));
  assert.equal(await visible(page, '[data-key-state="error"]'), true);
  await page.click('[data-key-retry]');
  assert.equal(await visible(page, '[data-key-state="loading"]'), true);
  await page.waitForSelector('.fd-secret', { state: 'visible' });
  assert.equal(await page.isEnabled('#ob-next'), true, 'Retry brings the key and enables Continue');
  await page.close();
  ({ page } = await open('onboarding.html?state=bogus'));
  assert.equal((await page.textContent('#ob-title')).trim(), 'Name your team');
  await page.close();
});

test('support: loading, empty, error and after-hours change the page; unknown stays the default', async () => {
  let { page, errors } = await open('support.html?state=loading');
  assert.ok(await page.locator('.fd-skeleton-thread').count() > 0 && await page.locator('.fd-panel .fd-skeleton-list').count() === 1 && await page.locator('.fd-panel [aria-label="Loading service status"]').count() === 1);
  assert.equal(await page.locator('.fd-panel .fd-chat-thread').count(), 0);
  await page.close();
  ({ page } = await open('support.html?state=error'));
  assert.equal(await page.locator('[data-support-retry]').count(), 2);
  await page.close();
  ({ page } = await open('support.html?state=empty'));
  assert.equal(await page.locator('.fd-panel .fd-chat-thread').count(), 0);
  assert.match(await page.textContent('.fd-panel'), /No conversations yet/);
  await page.close();
  ({ page } = await open('support.html?state=after-hours'));
  assert.match(await page.textContent('[data-support="person"]'), /Offline/);
  assert.equal(await page.locator('#support-inbox [data-view="offline"]').isVisible(), true);
  await page.close();
  ({ page } = await open('support.html?state=bogus'));
  assert.equal(await page.locator('.fd-panel .fd-chat-thread').count(), 4);
  assert.deepEqual(errors, []);
  await page.close();
});

test('docs pages: loading and error replace the body and keep the head; unknown names show the page', async () => {
  const cases = { 'docs-guide': ['loading', 'error'], 'docs-api': ['loading', 'error'], 'docs-changelog': ['loading', 'error', 'empty'] };
  for (const [slug, states] of Object.entries(cases)) {
    for (const state of states) {
      const { page, errors } = await open(`${slug}.html?state=${state}`);
      assert.equal(await page.locator('.fd-doc-title').count(), 1, `${slug} ${state}: the head stays`);
      const sel = state === 'loading' ? '[aria-busy="true"]' : state === 'error' ? '[data-docs-retry]' : '.fd-empty';
      assert.ok(await page.locator(`.fd-doc-article ${sel}`).count() > 0, `${slug} ${state}`);
      assert.equal(await page.locator('.fd-doc-foot').count(), 0, `${slug} ${state}: no vote or pager`);
      assert.deepEqual(errors, [], `${slug} ${state}`);
      await page.close();
    }
    const { page } = await open(`${slug}.html?state=bogus`);
    assert.equal(await page.locator('.fd-doc-article [aria-busy="true"], .fd-doc-article [data-docs-retry]').count(), 0, `${slug}: unknown is the default`);
    await page.close();
  }
  const { page } = await open('docs-guide.html?state=error');
  await page.click('[data-docs-retry]');
  await page.waitForFunction(() => !location.search);
  await page.close();
});
