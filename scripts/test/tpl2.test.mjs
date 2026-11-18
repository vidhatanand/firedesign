// node --test scripts/test/ : the 0.7 templates (settings, audit, status-admin, status, proof).
//   Each has a template card in contract/cards/templates/<slug>.json whose states are the page's own: the segmented
//   control #state-switch lists the same values, ?state=<value> opens it and the switch follows, and switching writes
//   the state back into the URL. In Chromium every state loads without a script error.
//   Settings: one save from the unsaved-changes bar, Discard, the member view, grouped feature switches with
//   Done · Undo, and the delete confirmed on the page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SLUGS = ['settings', 'audit', 'status-admin', 'status', 'proof'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const card = (slug) => JSON.parse(read(`contract/cards/templates/${slug}.json`));
const switchValues = (html) => {
  const at = html.indexOf('id="state-switch"');
  const end = html.indexOf('</div>', at);
  return [...html.slice(at, end).matchAll(/data-value="([^"]+)"/g)].map((m) => m[1]);
};

/* ---------- cards and the catalogue ---------- */
test('templates: each has a complete card, listed in the catalogue, whose states are the page switch', () => {
  const catalog = JSON.parse(read('contract/catalog.json'));
  for (const slug of SLUGS) {
    const c = card(slug);
    assert.equal(c.id, slug);
    for (const field of ['job', 'purpose', 'useWhen', 'avoidWhen', 'aka', 'surfaces', 'data', 'states', 'example', 'provenance', 'since']) assert.ok(c[field] != null, `${slug}: ${field}`);
    assert.match(c.job, /^[A-Z][^.]*\.$/, `${slug}: job is one sentence`);
    assert.ok(c.job.length <= 140 && c.purpose.length <= 500, `${slug}: budgets`);
    assert.ok(c.avoidWhen.every((a) => a.when && a.instead), `${slug}: avoidWhen names the alternative`);
    assert.equal(c.example, `templates/${slug}.html`);
    assert.match(c.since, /^\d+\.\d+\.\d+$/);
    assert.ok(catalog.templates.some((t) => t.path === c.example && t.job), `${slug}: in templates/index.html`);
    const html = read(c.example);
    assert.deepEqual(c.states.map((s) => s.name).sort(), switchValues(html).sort(), `${slug}: card states = #state-switch values`);
    assert.ok(!/\sstyle=/.test(html), `${slug}: no style attribute`);
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

async function openPage(url, width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/${url}`, { waitUntil: 'networkidle' });
  return { page, errors };
}
const checked = (page) => page.getAttribute('#state-switch [aria-checked="true"]', 'data-value');

test('templates: every state opens from ?state=, the switch follows, and switching writes the URL', async () => {
  for (const slug of SLUGS) {
    const values = switchValues(read(`templates/${slug}.html`));
    for (const value of values) {
      const { page, errors } = await openPage(`templates/${slug}.html?state=${value}`);
      await page.waitForTimeout(150);
      assert.equal(await checked(page), value, `${slug}?state=${value}`);
      assert.deepEqual(errors, [], `${slug}?state=${value}: no script errors`);
      await page.close();
    }
    const { page } = await openPage(`templates/${slug}.html?state=${values[0]}`);
    const other = values.find((v) => v !== 'loading' && v !== values[0]);
    await page.click(`#state-switch [data-value="${other}"]`);
    await page.waitForTimeout(150);
    assert.equal(await checked(page), other);
    const inUrl = new URL(page.url()).searchParams.get('state');
    assert.ok(inUrl === other || (inUrl === null && ['ready'].includes(other)), `${slug}: the URL follows (${inUrl})`);
    await page.close();
  }
});

test('settings: one save from the unsaved-changes bar; Discard puts the saved values back', async () => {
  const { page, errors } = await openPage('templates/settings.html?tab=team');
  const bar = '#panel-team .fd-form-actions[data-variant="sticky"]';
  assert.ok(await page.isHidden(bar));
  await page.fill('#team-name', 'Quarry Research');
  assert.ok(await page.isVisible(bar), 'an edit shows the bar');
  await page.click(`${bar} button[type="reset"]`);
  await page.waitForTimeout(50);
  assert.equal(await page.inputValue('#team-name'), 'Quarry Labs');
  assert.ok(await page.isHidden(bar), 'Discard hides it');
  await page.fill('#team-name', 'Quarry Research');
  await page.click('#team-save-all');
  await page.waitForFunction(() => document.querySelector('#panel-team .fd-form-actions').hidden);
  assert.equal(await page.textContent('[data-bind="team-changed-by"]'), 'you, just now');
  await page.fill('#team-name', 'Other');
  await page.click(`${bar} button[type="reset"]`);
  await page.waitForTimeout(50);
  assert.equal(await page.inputValue('#team-name'), 'Quarry Research', 'Discard returns to the last save');
  assert.equal(await page.getAttribute('#leave-team', 'aria-disabled'), 'true', 'the only owner cannot leave');
  assert.ok((await page.getAttribute('#leave-team', 'aria-describedby')).includes('leave-reason'));
  assert.deepEqual(errors, []);
  await page.close();
});

test('settings: the member view disables what members cannot change and says who can', async () => {
  const { page } = await openPage('templates/settings.html?state=member&tab=team');
  assert.ok(await page.isDisabled('#team-name'));
  assert.ok(await page.isDisabled('#invite-email'));
  assert.ok(await page.isVisible('#team-viewer'));
  assert.ok(await page.isHidden('#team-editors'));
  assert.equal(await page.getAttribute('#leave-team', 'aria-disabled'), null, 'a member can leave');
  await page.click('#state-switch [data-value="ready"]');
  assert.ok(await page.isEnabled('#team-name'));
  assert.ok(await page.isHidden('#team-viewer'));
  await page.close();
});

test('settings: feature switches update the count and offer Undo; a locked one says why', async () => {
  const { page } = await openPage('templates/settings.html?tab=features');
  assert.equal(await page.textContent('[data-bind="features-on"]'), '6');
  await page.click('tr[data-feature="Follow subdomains"] .fd-switch');
  assert.equal(await page.textContent('[data-bind="features-on"]'), '7');
  assert.equal(await page.textContent('tr[data-feature="Follow subdomains"] .fd-status'), 'On');
  await page.click('.fd-toast [data-fd-toast-undo]');
  await page.waitForFunction(() => document.querySelector('[data-bind="features-on"]').textContent === '6');
  assert.ok(await page.isDisabled('tr[data-locked] input'));
  assert.equal(await page.getAttribute('tr[data-locked] input', 'aria-describedby'), 'reason-schema');
  await page.fill('#feature-search', 'nothing like this');
  assert.ok(await page.isVisible('#features-none'));
  await page.click('#features-clear');
  assert.ok(await page.isVisible('#features-table'));
  await page.close();
});

test('settings: deleting the team is confirmed on the page', async () => {
  const { page } = await openPage('templates/settings.html?tab=advanced');
  const submit = '#delete-team [data-fd-confirm-submit]';
  await page.fill('#dt-confirm', 'quarry-lab');
  assert.ok(await page.isDisabled(submit));
  await page.fill('#dt-confirm', 'quarry-labs');
  assert.ok(await page.isEnabled(submit));
  assert.equal(await page.getAttribute('#delete-team', 'data-state'), 'match');
  await page.close();
});
