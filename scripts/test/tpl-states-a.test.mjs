// node --test scripts/test/ : the first twelve older templates, now with a card and their own states
//   (agent, api-keys, catalog, form, install, logs, monitoring, overview, parse, playground, provider, usage).
//   Each has a card in contract/cards/templates/<slug>.json. Every ?state=<name> a card names is in the page's own
//   allow-list; opening it in Chromium raises no script error; an unknown name renders exactly the default.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SLUGS = ['agent', 'api-keys', 'catalog', 'form', 'install', 'logs', 'monitoring', 'overview', 'parse', 'playground', 'provider', 'usage'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const card = (slug) => JSON.parse(read(`contract/cards/templates/${slug}.json`));
const askedStates = (c) => c.states.flatMap((s) => [...s.how.matchAll(/\?state=([a-z-]+)/g)].map((m) => m[1]));

/* ---------- cards ---------- */
test('templates A: each has a complete card, listed in the catalogue, whose states the page handles', () => {
  const catalog = JSON.parse(read('contract/catalog.json'));
  const templates = new Set(fs.readdirSync(path.join(ROOT, 'templates')).filter((f) => f.endsWith('.html')).map((f) => f.replace('.html', '')));
  for (const slug of SLUGS) {
    const c = card(slug);
    assert.equal(c.id, slug);
    for (const field of ['job', 'purpose', 'useWhen', 'avoidWhen', 'aka', 'surfaces', 'data', 'states', 'example', 'provenance', 'since']) assert.ok(c[field] != null, `${slug}: ${field}`);
    assert.match(c.job, /^[A-Z][^.]*\.$/, `${slug}: job is one sentence`);
    assert.ok(c.job.length <= 140 && c.purpose.length <= 500, `${slug}: budgets`);
    assert.ok(c.useWhen.length >= 1 && c.states.length >= 2, `${slug}: useWhen and states`);
    assert.ok(c.avoidWhen.every((a) => a.when && templates.has(a.instead)), `${slug}: avoidWhen names a template`);
    assert.equal(c.example, `templates/${slug}.html`);
    assert.equal(c.since, '0.8.0');
    assert.ok(catalog.templates.some((t) => t.path === c.example && t.job), `${slug}: in templates/index.html`);
    const html = read(c.example);
    assert.ok(!/\sstyle=/.test(html), `${slug}: no style attribute`);
    const states = askedStates(c);
    assert.ok(states.length >= 1, `${slug}: names at least one ?state=`);
    for (const state of states) assert.ok(html.includes(`'${state}'`) || html.includes(`"${state}"`), `${slug}: the page handles ?state=${state}`);
  }
});

/* ---------- in Chromium ---------- */
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

async function open(url, width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  await page.addInitScript(() => { try { localStorage.setItem('ember-whats-new-seen', '1'); } catch { /* blocked */ } });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${base}/${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return { page, errors };
}
// What a person reads in the page's main area: stable across loads of the same state.
const text = (page) => page.evaluate(() => `${document.body.innerText.replace(/\s+/g, ' ').trim()} |busy ${document.querySelectorAll('[aria-busy="true"]').length} disabled ${document.querySelectorAll(':disabled').length} invalid ${document.querySelectorAll('[aria-invalid="true"]').length}`);

test('templates A: every state opens without a script error and differs from the default', async () => {
  for (const slug of SLUGS) {
    const { page: base_, errors: baseErrors } = await open(`templates/${slug}.html`);
    const def = await text(base_);
    assert.deepEqual(baseErrors, [], `${slug}: default raises no error`);
    await base_.close();
    for (const state of new Set(askedStates(card(slug)))) {
      const { page, errors } = await open(`templates/${slug}.html?state=${state}`);
      assert.deepEqual(errors, [], `${slug}?state=${state}: no script errors`);
      const shown = await text(page);
      assert.ok(shown.length > 40, `${slug}?state=${state}: renders content`);
      if (!['loaded', 'ready'].includes(state)) assert.notEqual(shown, def, `${slug}?state=${state}: differs from the default`);
      await page.close();
    }
  }
});

test('templates A: an unknown state falls back to the default', async () => {
  for (const slug of SLUGS) {
    if (slug === 'agent') continue; // the agent hero shows a rotating suggestion order; compared by its headline below
    const a = await open(`templates/${slug}.html`);
    const b = await open(`templates/${slug}.html?state=no-such-state`);
    assert.deepEqual(b.errors, [], `${slug}: unknown state raises no error`);
    assert.equal(await text(b.page), await text(a.page), `${slug}: unknown state renders the default`);
    await a.page.close(); await b.page.close();
  }
  const { page, errors } = await open('templates/agent.html?state=no-such-state');
  assert.deepEqual(errors, []);
  assert.match(await text(page), /Ask for any data on the web/);
  await page.close();
});

/* ---------- the states do what a card says ---------- */
test('templates A: states are built from Fire parts and say what failed', async () => {
  const check = async (url, selector, pattern) => {
    const { page } = await open(url);
    const found = await page.evaluate((s) => [...document.querySelectorAll(s)].filter((el) => el.offsetParent !== null).map((el) => el.innerText).join(' | '), selector);
    assert.match(found, pattern, url);
    await page.close();
  };
  await check('templates/api-keys.html?state=error', '.fd-empty[data-tone="danger"]', /Couldn’t load your API keys/);
  await check('templates/api-keys.html?state=empty', '.fd-empty', /No API keys yet/);
  await check('templates/overview.html?state=error', '.fd-empty[data-tone="danger"]', /Couldn’t load recent requests/);
  await check('templates/catalog.html?state=error', '.fd-empty[data-tone="danger"]', /Couldn’t load the catalog/);
  await check('templates/provider.html?state=not-found', '.fd-empty', /not in the catalog/);
  await check('templates/install.html?state=failed', '.fd-callout[data-tone="danger"]', /401 Unauthorized/);
  await check('templates/usage.html?state=over-limit', '.fd-callout[data-tone="danger"]', /used all 3,000 credits/);
  await check('templates/parse.html?state=failed', '.fd-empty[data-tone="danger"]', /Couldn’t parse/);
  await check('templates/playground.html?state=failed', '.fd-callout[data-tone="danger"]', /403 Blocked/);
  await check('templates/logs.html?state=error', '.fd-table-empty[data-tone="danger"]', /Couldn’t load activity logs/);
});

test('templates A: the form shows invalid, submitting and a refused ID', async () => {
  let { page } = await open('templates/form.html?state=invalid');
  assert.ok(await page.locator('.fd-field-error:visible').count() >= 3, 'invalid: field errors are visible');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ra-name', 'invalid: focus goes to the first problem');
  await page.close();
  ({ page } = await open('templates/form.html?state=submitting'));
  assert.equal(await page.getAttribute('#register-app [type="submit"]', 'aria-busy'), 'true');
  assert.equal(await page.isDisabled('#ra-name'), true);
  await page.close();
  ({ page } = await open('templates/form.html?state=error'));
  assert.ok(await page.locator('#ra-error').isVisible());
  assert.equal(await page.getAttribute('#ra-app-id', 'aria-invalid'), 'true');
  await page.fill('#ra-app-id', 'quarry-console-2');
  assert.ok(!(await page.locator('#ra-error').isVisible()), 'editing the ID clears the banner');
  await page.close();
});

test('templates A: Retry brings an error back to loaded content', async () => {
  let { page } = await open('templates/api-keys.html?state=error');
  await page.click('#keys-retry');
  await page.waitForTimeout(1400);
  assert.ok(await page.locator('#keys-list .fd-card').first().isVisible());
  assert.ok(!(await page.locator('#keys-error').isVisible()));
  await page.close();
  ({ page } = await open('templates/overview.html?state=error'));
  await page.click('#ov-activity-retry');
  await page.waitForTimeout(1400);
  assert.ok(await page.locator('#ov-activity table').isVisible());
  await page.close();
});
