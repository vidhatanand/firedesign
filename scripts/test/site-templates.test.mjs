// node --test scripts/test/ : the four website templates (site-home, site-pricing, site-customers, site-changelog) and
//   their shared chrome (templates/site-shell.js). Cards are complete and honest about the surface; every ?state= a card
//   names opens; the header and footer link the four pages to each other and every page link resolves; one h1 and no
//   skipped heading level; nothing scrolls sideways at 320; the markup lints clean with the website surface declared.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SLUGS = ['site-home', 'site-pricing', 'site-customers', 'site-changelog'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const card = (slug) => JSON.parse(read(`contract/cards/templates/${slug}.json`));
const askedStates = (c) => c.states.flatMap((s) => [...s.how.matchAll(/\?state=([a-z-]+)/g)].map((m) => m[1]));

/* ---------- cards and markup ---------- */
test('site templates: each has a complete website card that names its sections and neighbours', () => {
  const catalog = JSON.parse(read('contract/catalog.json'));
  const templates = new Set(fs.readdirSync(path.join(ROOT, 'templates')).filter((f) => f.endsWith('.html')).map((f) => f.replace('.html', '')));
  const ids = new Set(catalog.components.map((c) => c.id));
  const heroes = new Set();
  for (const slug of SLUGS) {
    const c = card(slug);
    assert.equal(c.id, slug);
    for (const field of ['job', 'purpose', 'useWhen', 'avoidWhen', 'aka', 'surfaces', 'data', 'states', 'example', 'provenance', 'since', 'sections']) assert.ok(c[field] != null, `${slug}: ${field}`);
    assert.match(c.job, /^[A-Z][^.]*\.$/, `${slug}: job is one sentence`);
    assert.ok(c.job.length <= 140 && c.purpose.length <= 500, `${slug}: budgets`);
    assert.deepEqual(c.surfaces, ['website'], `${slug}: website only`);
    assert.equal(c.since, '0.8.0');
    assert.equal(c.example, `templates/${slug}.html`);
    assert.ok(c.avoidWhen.every((a) => a.when && (templates.has(a.instead) || ids.has(a.instead))), `${slug}: avoidWhen names a template`);
    assert.ok(c.avoidWhen.some((a) => SLUGS.includes(a.instead)), `${slug}: avoidWhen names a neighbouring site template`);
    assert.ok(c.sections.length >= 4 && c.sections.every((s) => s.section && s.variant && s.why), `${slug}: sections with variant and why`);
    assert.ok(catalog.templates.some((t) => t.path === c.example && t.job), `${slug}: in templates/index.html`);
    const html = read(c.example);
    assert.match(html, /<html lang="en" data-fd-surface="website"[ >]/, `${slug}: declares the website surface`);
    assert.ok(!/\sstyle=/.test(html), `${slug}: no style attribute`);
    for (const state of askedStates(c)) assert.ok(html.includes(`'${state}'`), `${slug}: the page handles ?state=${state}`);
    const hero = html.match(/fd-site-hero" data-layout="([a-z]+)"/)?.[1];
    assert.ok(hero && !heroes.has(hero), `${slug}: a hero variant of its own (${hero})`);
    heroes.add(hero);
  }
  // Every section type is used somewhere across the four pages (header and footer come from the shell).
  const all = SLUGS.map((s) => read(`templates/${s}.html`)).join('\n') + read('templates/site-shell.js');
  for (const type of ['header', 'hero', 'logos', 'features', 'split', 'stats', 'steps', 'quote', 'pricing', 'compare', 'faq', 'cta', 'footer', 'posts']) {
    assert.ok(all.includes(`fd-site-${type}`), `fd-site-${type} is used`);
  }
});

test('site templates: no two start with the same three sections', () => {
  const firsts = SLUGS.map((slug) => [...read(`templates/${slug}.html`).matchAll(/<section class="fd-site-section(?: fd-site-([a-z]+))?"(?: data-layout="([a-z]+)")?/g)].slice(0, 3).map((m) => `${m[1] || 'prose'}:${m[2] || ''}`).join(' '));
  assert.equal(new Set(firsts).size, SLUGS.length, firsts.join(' | '));
});

test('site templates: lint clean with the website surface declared', () => {
  const out = JSON.parse(execFileSync(process.execPath, ['scripts/lint-markup.mjs', '--json', ...SLUGS.map((s) => `templates/${s}.html`)], { cwd: ROOT, encoding: 'utf8' }));
  assert.equal(out.errors, 0, JSON.stringify(out.findings.slice(0, 3)));
  assert.deepEqual(out.findings.filter((f) => f.rule === 'surface-mismatch'), []);
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
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${base}/${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  return { page, errors };
}
const visible = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((el) => el.checkVisibility()).length, sel);

test('site templates: the shell mounts, the four link to each other, and every page link resolves', async () => {
  for (const slug of SLUGS) {
    const { page, errors } = await open(`templates/${slug}.html`);
    assert.deepEqual(errors, [], `${slug}: no script errors`);
    const shape = await page.evaluate(() => ({
      mounted: document.body.dataset.siteShell,
      site: !!document.querySelector('body > .fd-site > header.fd-site-header + main + footer.fd-site-footer'),
      shown: getComputedStyle(document.body).visibility,
      current: document.querySelector('.fd-site-header-link[aria-current="page"]')?.getAttribute('href'),
      hrefs: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    }));
    assert.equal(shape.mounted, 'mounted', `${slug}: shell mounted`);
    assert.ok(shape.site && shape.shown === 'visible', `${slug}: header, main and footer inside .fd-site, shown`);
    if (slug !== 'site-home') assert.equal(shape.current, `${slug}.html`, `${slug}: its header link is current`);
    for (const other of SLUGS) assert.ok(shape.hrefs.some((h) => h.split('#')[0] === `${other}.html`), `${slug} links to ${other}`);
    for (const h of shape.hrefs) {
      const file = h.split(/[?#]/)[0];
      if (!file || /^[a-z]+:/.test(h)) continue;
      assert.ok(fs.existsSync(path.join(ROOT, 'templates', file)), `${slug}: ${h} resolves`);
    }
    await page.close();
  }
});

test('site templates: one h1, no skipped heading level, nothing sideways at 320', async () => {
  for (const slug of SLUGS) {
    const { page } = await open(`templates/${slug}.html`, 320);
    const result = await page.evaluate(() => {
      const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]));
      const skips = levels.filter((l, i) => i > 0 && l > levels[i - 1] + 1);
      return { h1: levels.filter((l) => l === 1).length, first: levels[0], skips, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.equal(result.h1, 1, `${slug}: one h1`);
    assert.equal(result.first, 1, `${slug}: the h1 comes first`);
    assert.deepEqual(result.skips, [], `${slug}: no skipped level`);
    assert.ok(result.wide <= 0, `${slug}: no sideways scroll at 320 (${result.wide}px)`);
    await page.close();
  }
});

test('site-pricing: ?state=yearly shows the yearly prices, and the switch moves them back', async () => {
  const { page, errors } = await open('templates/site-pricing.html?state=yearly');
  assert.deepEqual(errors, []);
  const amounts = () => page.evaluate(() => [...document.querySelectorAll('#plans .fd-site-pricing-amount')].filter((el) => el.checkVisibility()).map((el) => el.textContent));
  assert.deepEqual(await amounts(), ['$0', '$16', '$83', '$416']);
  await page.click('#period [data-value="monthly"]');
  assert.deepEqual(await amounts(), ['$0', '$19', '$99', '$499']);
  await page.close();
});

test('site-changelog: the filter, every ?state= and the subscribe form', async () => {
  const { page } = await open('templates/site-changelog.html');
  assert.equal(await visible(page, '#posts .fd-site-posts-item'), 9);
  await page.click('#kinds [data-value="engineering"]');
  assert.equal(await visible(page, '#posts .fd-site-posts-item'), 2, 'Engineering shows two');
  await page.click('#kinds [data-value="deprecation"]');
  assert.equal(await visible(page, '#no-results'), 1, 'a filter that matches nothing shows the empty state');
  await page.click('#no-results [data-show-all]');
  assert.equal(await visible(page, '#posts .fd-site-posts-item'), 9, 'Show every update clears the filter');

  await page.fill('#subscribe-email', 'dana@quarry');
  await page.click('#subscribe-form button[type="submit"]');
  assert.equal(await page.getAttribute('#subscribe-email', 'aria-invalid'), 'true');
  assert.equal(await visible(page, '#subscribe-error'), 1);
  await page.fill('#subscribe-email', 'dana@quarry.dev');
  await page.click('#subscribe-form button[type="submit"]');
  assert.equal(await page.getAttribute('#subscribe-form button[type="submit"]', 'aria-busy'), 'true');
  await page.waitForSelector('.fd-site-cta-done[role="status"]');
  await page.close();

  const expect = { loading: '[aria-busy="true"] .fd-skeleton-title', error: '.fd-empty[data-tone="danger"]', empty: '.fd-empty', 'no-results': '#no-results' };
  for (const state of askedStates(card('site-changelog'))) {
    const { page: p, errors } = await open(`templates/site-changelog.html?state=${state}`);
    assert.deepEqual(errors, [], `?state=${state}: no script errors`);
    assert.ok(await visible(p, expect[state]) >= 1, `?state=${state} shows its view`);
    assert.equal(await visible(p, '#latest'), state === 'no-results' ? 1 : 0, `?state=${state}: the latest release ${state === 'no-results' ? 'stays' : 'gives way'}`);
    await p.close();
  }
});

test('site templates: the header sheet opens below desktop and Escape returns focus', async () => {
  const { page } = await open('templates/site-customers.html', 375);
  await page.click('.fd-site-header-toggle');
  assert.equal(await page.getAttribute('.fd-site-header', 'data-state'), 'open');
  assert.ok(await visible(page, '#site-nav .fd-site-header-link[href="site-pricing.html"]') >= 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('fd-site-header-toggle')), true);
  await page.close();
});
