// node --test scripts/test/ : the publishing set of 0.8. The article section (plain, aside, cover) at 1440 and 375, the
//   aside's disclosure, footnote jumps and focus; fd-site-posts as a listing (filters, the address and Back, paging, the
//   empty state); the one sign-up form in its three places and every state; the email's section, story and list blocks
//   in HTML and text; the six templates: cards, links, one h1 and ordered headings, nothing sideways at 320, lint clean.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { renderEmail } from '../../fire/email/email.js';
import { newsletter, BRAND } from '../../fire/email/examples.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SLUGS = ['site-blog', 'site-post', 'site-resources', 'site-report', 'site-research', 'site-newsletter'];
const ALL = ['site-home', 'site-pricing', 'site-customers', 'site-changelog', ...SLUGS];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const card = (slug) => JSON.parse(read(`contract/cards/templates/${slug}.json`));
const askedStates = (c) => c.states.flatMap((s) => [...s.how.matchAll(/\?state=([a-z-]+)/g)].map((m) => m[1]));

/* ---------- email ---------- */
test('email: section, story and list render in HTML and in the text part', () => {
  const { html, text } = renderEmail(newsletter());
  assert.match(html, /<h2 [^>]*>Shipped<\/h2>/, 'a section is a labelled h2');
  assert.match(html, /<h3 [^>]*><a class="fe-ink" href="https:\/\/ember\.example\/changelog#v2-14-0"[^>]*>Monitors are generally available<\/a><\/h3>/, 'a story title is an h3 link after a section');
  assert.match(html, />Read the release notes<\/a>/, 'a story has a link line that names where it goes');
  assert.match(html, /<ul class="fe-ink"[^>]*><li[^>]*>Stealth proxies/, 'a list is a ul');
  assert.ok(!/<table(?![^>]*role="presentation")/.test(html), 'every table is presentation');
  assert.match(text, /\nSHIPPED\n=======\n\nRelease: Monitors are generally available\nPoint a monitor/);
  assert.match(text, /Read the release notes: https:\/\/ember\.example\/changelog#v2-14-0/);
  assert.match(text, /\n- The median scrape is 842 ms\. How we got there \(https:\/\/ember\.example\/blog\/median-842-ms\)\./);
  assert.ok(!/[<>]/.test(text), 'no markup in the text part');
  // a story without a section is an h2; an ordered list numbers its items
  const lone = renderEmail({ brand: BRAND, blocks: [{ type: 'heading', text: 'Hi' }, { type: 'story', title: 'One', text: 'Two.', href: 'https://ember.example/a' }, { type: 'list', ordered: true, items: ['a', 'b'] }] });
  assert.match(lone.html, /<h2 [^>]*><a /);
  assert.match(lone.html, /<ol /);
  assert.match(lone.text, /\n1\. a\n2\. b\n/);
  assert.throws(() => renderEmail({ brand: BRAND, blocks: [{ type: 'story', title: 'x', text: 'y', href: 'javascript:alert(1)' }] }), /story.*href/);
  assert.throws(() => renderEmail({ brand: BRAND, blocks: [{ type: 'list', items: [] }] }), /list/);
  assert.throws(() => renderEmail({ brand: BRAND, blocks: [{ type: 'section' }] }), /section.*title/);
  assert.ok(renderEmail({ brand: BRAND, blocks: [{ type: 'story', title: '<b>', text: '"&', href: 'https://ember.example/' }] }).html.includes('&lt;b&gt;'), 'values are escaped');
});

/* ---------- cards and markup ---------- */
test('publishing templates: complete website cards, in the index, each handles the ?state= it names', () => {
  const catalog = JSON.parse(read('contract/catalog.json'));
  const templates = new Set(fs.readdirSync(path.join(ROOT, 'templates')).filter((f) => f.endsWith('.html')).map((f) => f.replace('.html', '')));
  for (const slug of SLUGS) {
    const c = card(slug);
    assert.equal(c.id, slug);
    assert.match(c.job, /^[A-Z][^.]*\.$/);
    assert.ok(c.job.length <= 140 && c.purpose.length <= 500, `${slug}: budgets`);
    assert.deepEqual(c.surfaces, ['website']);
    assert.equal(c.since, '0.8.0');
    assert.ok(c.avoidWhen.every((a) => templates.has(a.instead)), `${slug}: avoidWhen names templates`);
    assert.ok(c.sections.length >= 3 && c.sections.every((s) => s.section && s.variant && s.why), `${slug}: sections`);
    assert.ok(catalog.templates.some((t) => t.path === c.example && t.job), `${slug}: in templates/index.html`);
    const html = read(c.example);
    assert.match(html, /<html lang="en" data-fd-surface="website" data-fd-transition="fade">/);
    assert.match(html, /<link rel="stylesheet" href="\.\.\/fire\/transitions\.css">/);
    assert.equal((html.match(/<script type="module" blocking="render"/g) || []).length, 2, `${slug}: render-blocking modules`);
    assert.ok(!/\sstyle=/.test(html), `${slug}: no style attribute`);
    for (const state of askedStates(c)) assert.ok(html.includes(`'${state}'`), `${slug}: handles ?state=${state}`);
  }
  const firsts = ALL.map((slug) => [...read(`templates/${slug}.html`).matchAll(/<(?:section|article) class="fd-site-section(?: fd-site-([a-z]+))?"(?: data-layout="([a-z]+)")?/g)].slice(0, 3).map((m) => `${m[1] || 'prose'}:${m[2] || ''}`).join(' '));
  assert.equal(new Set(firsts).size, ALL.length, firsts.join(' | '));
});

test('publishing templates: lint clean with the website surface', () => {
  const out = JSON.parse(execFileSync(process.execPath, ['scripts/lint-markup.mjs', '--json', ...SLUGS.map((s) => `templates/${s}.html`), 'docs/site-sections.html'], { cwd: ROOT, encoding: 'utf8' }));
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
  await page.waitForTimeout(400);
  return { page, errors };
}
const visible = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((el) => el.checkVisibility()).length, sel);
const box = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);

test('publishing templates: shell, links, one h1, ordered headings, nothing sideways at 320', async () => {
  for (const slug of SLUGS) {
    const { page, errors } = await open(`templates/${slug}.html`);
    assert.deepEqual(errors, [], `${slug}: no script errors`);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
    for (const other of ['site-blog', 'site-resources', 'site-home', 'site-changelog']) assert.ok(hrefs.some((h) => h.split(/[?#]/)[0] === `${other}.html`), `${slug} links to ${other}`);
    for (const h of hrefs) {
      const file = h.split(/[?#]/)[0];
      if (file && !/^[a-z]+:/.test(h)) assert.ok(fs.existsSync(path.join(ROOT, 'templates', file)), `${slug}: ${h} resolves`);
    }
    const current = await page.evaluate(() => document.querySelector('.fd-site-header-link[aria-current]')?.getAttribute('href'));
    assert.equal(current, { 'site-post': 'site-blog.html', 'site-newsletter': 'site-blog.html', 'site-report': 'site-resources.html', 'site-research': 'site-resources.html' }[slug] || `${slug}.html`, `${slug}: its section is current`);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => {
      const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter((h) => !h.closest('[hidden]')).map((h) => Number(h.tagName[1]));
      return { h1: levels.filter((l) => l === 1).length, first: levels[0], skips: levels.filter((l, i) => i > 0 && l > levels[i - 1] + 1), wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.equal(r.h1, 1, `${slug}: one h1`);
    assert.equal(r.first, 1, `${slug}: the h1 comes first`);
    assert.deepEqual(r.skips, [], `${slug}: no skipped level`);
    assert.ok(r.wide <= 0, `${slug}: nothing sideways at 320 (${r.wide}px)`);
    await page.close();
  }
});

test('article: plain is one column, cover spans the head, aside sets a rail beside the text at 1440 and a disclosure at 375', async () => {
  let { page } = await open('templates/site-post.html');
  const text = await box(page, '.fd-site-article-text > p');
  const quote = await box(page, '.fd-site-article-text > .fd-site-quote');
  assert.ok(text.w <= 760 && text.w >= 600, `plain: a reading measure (${text.w})`);
  assert.ok(quote.w > text.w + 100, 'a [data-breakout] block spans wider than the measure');
  const size = await page.evaluate(() => getComputedStyle(document.querySelector('.fd-site-article-text > p')).fontSize);
  assert.equal(size, '18px', 'prose data-size=lg reads at 18px');
  await page.close();

  ({ page } = await open('templates/site-report.html'));
  const head = await box(page, '.fd-site-article-head');
  const facts = await box(page, '.fd-site-article-head > .fd-kv');
  assert.ok(head.w > 1100 && facts.x > head.x + head.w / 2, 'cover: the head spans the container, key facts at its end');
  assert.ok((await box(page, '.fd-site-article-cover')).h > 200, 'cover: a wide frame');
  await page.close();

  ({ page } = await open('templates/site-research.html'));
  const aside = await box(page, '.fd-site-article-aside');
  const body = await box(page, '.fd-site-article-text');
  assert.ok(aside.x + aside.w < body.x, 'aside: the rail sits before the text');
  assert.equal(await page.evaluate(() => document.querySelector('.fd-site-article-aside').open), true);
  assert.equal(await visible(page, '.fd-site-article-aside > summary'), 0, 'no summary on desktop');
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => document.querySelector('.fd-site-article-aside').open), false, 'below desktop the rail is a closed disclosure');
  const a2 = await box(page, '.fd-site-article-aside');
  const b2 = await box(page, '.fd-site-article-text');
  assert.ok(a2.y < b2.y, 'above the text');
  await page.focus('.fd-site-article-aside > summary');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(450);
  assert.equal(await page.evaluate(() => document.querySelector('.fd-site-article-aside').open), true, 'Enter opens it');
  await page.click('.fd-site-article-aside .fd-toc-item[href="#results"]');
  await page.waitForTimeout(450);
  assert.equal(await page.evaluate(() => document.querySelector('.fd-site-article-aside').open), false, 'a link chosen in it closes it');
  await page.close();
});

test('article: a footnote reference moves focus to the note and its back link returns it', async () => {
  const { page } = await open('templates/site-research.html');
  await page.click('#ref-2');
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'note-2');
  assert.equal(await page.evaluate(() => location.hash), '#note-2');
  assert.equal(await page.getAttribute('#ref-2', 'aria-describedby'), 'notes-title');
  await page.click('#note-2 .fd-site-notes-back');
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ref-2');
  const inView = await page.evaluate(() => { const r = document.querySelector('#ref-2').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
  assert.ok(inView, 'the reference is back in view');
  await page.goBack();
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => location.hash), '#note-2', 'Back walks the jumps');
  await page.close();
});

test('listing: filters, the count, the address and Back, paging and the empty state', async () => {
  const { page, errors } = await open('templates/site-resources.html');
  const shown = () => visible(page, '#list .fd-site-posts-item');
  assert.equal(await shown(), 12, 'page 1 of 30');
  assert.equal(await page.textContent('.fd-site-posts-count'), '30 resources');
  assert.equal(await page.getAttribute('.fd-site-posts-count', 'role'), 'status');
  await page.click('#tools [data-value="report"]');
  assert.equal(await shown(), 5);
  assert.equal(await page.textContent('.fd-site-posts-count'), '5 of 30 resources');
  assert.match(page.url(), /\?kind=report$/);
  await page.selectOption('#tools select', 'pricing');
  assert.equal(await shown(), 2);
  assert.match(page.url(), /kind=report&topic=pricing/);
  await page.goBack();
  await page.waitForTimeout(100);
  assert.equal(await shown(), 5, 'Back restores the previous filter');
  assert.equal(await page.inputValue('#tools select'), 'all');
  await page.click('#tools [data-value="all"]');
  // paging
  await page.click('.fd-pagination [data-page="2"]');
  await page.waitForTimeout(300);
  assert.equal(await shown(), 12);
  assert.match(page.url(), /page=2/);
  const firstOfPage = await page.evaluate(() => [...document.querySelectorAll('#list .fd-site-posts-item')].find((i) => !i.hidden).querySelector('a').textContent);
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), firstOfPage, 'focus moves to the first entry of the page');
  await page.click('.fd-pagination [data-page="3"]');
  assert.equal(await shown(), 6, 'the last page holds the rest');
  // search, then nothing matches, then clear
  await page.fill('#tools .fd-search-input', 'quantum');
  await page.waitForTimeout(100);
  assert.equal(await visible(page, '#no-results'), 1, 'the empty state');
  assert.equal(await visible(page, '#list'), 0);
  assert.equal(await visible(page, '.fd-pagination'), 0);
  assert.match(page.url(), /q=quantum/);
  await page.click('#no-results [data-clear]');
  assert.equal(await shown(), 12);
  assert.equal(await page.inputValue('#tools .fd-search-input'), '');
  assert.deepEqual(errors, []);
  await page.close();

  // the address opens a filtered view
  const { page: p2 } = await open('templates/site-resources.html?kind=guide&q=crawl');
  assert.equal(await visible(p2, '#list .fd-site-posts-item'), 3);
  assert.equal(await p2.getAttribute('#tools [data-value="guide"]', 'aria-pressed'), 'true');
  await p2.close();

  // Show more
  const { page: p3 } = await open('templates/site-newsletter.html');
  assert.equal(await visible(p3, '#issues .fd-site-posts-item'), 5);
  await p3.click('#issues [data-more]');
  assert.equal(await visible(p3, '#issues .fd-site-posts-item'), 10);
  assert.equal(await p3.evaluate(() => document.activeElement?.textContent), 'June 2026', 'focus moves to the first new entry');
  await p3.click('#issues [data-more]');
  assert.equal(await visible(p3, '#issues [data-more]'), 0, 'Show more goes when everything is shown');
  await p3.close();

  // every ?state= of the library
  const expect = { loading: '#list[aria-busy="true"]', empty: '.fd-empty', 'no-results': '#no-results', error: '.fd-empty[data-tone="danger"]' };
  for (const state of askedStates(card('site-resources'))) {
    const { page: p, errors: e } = await open(`templates/site-resources.html?state=${state}`);
    assert.deepEqual(e, [], `?state=${state}: no errors`);
    assert.ok(await visible(p, expect[state]) >= 1, `?state=${state} shows its view`);
    await p.close();
  }
});

test('sign-up: one form in three places, every state', async () => {
  const places = [['templates/site-newsletter.html', '#signup'], ['templates/site-post.html', '.fd-site-article-foot .fd-site-cta-form'], ['templates/site-resources.html', '.fd-site-footer-signup .fd-site-cta-form']];
  for (const [url, sel] of places) {
    const { page } = await open(url);
    const input = `${sel} input[type="email"]`;
    await page.fill(input, 'dana@quarry');
    await page.click(`${sel} button[type="submit"]`);
    assert.equal(await page.getAttribute(sel, 'data-state'), 'invalid', `${url}: invalid`);
    assert.equal(await page.getAttribute(input, 'aria-invalid'), 'true');
    assert.equal(await visible(page, `${sel} .fd-field-error`), 1);
    assert.equal(await page.evaluate((s) => document.activeElement === document.querySelector(s), input), true, 'focus stays on the field');
    await page.fill(input, 'maya@acme.example');
    await page.click(`${sel} button[type="submit"]`);
    assert.equal(await page.getAttribute(sel, 'data-state'), 'busy', `${url}: busy`);
    assert.equal(await page.getAttribute(`${sel} button[type="submit"]`, 'aria-busy'), 'true');
    await page.waitForSelector(`${sel}[data-state="sent"] .fd-site-cta-done[data-state="sent"]`);
    assert.equal(await visible(page, `${sel} .fd-field`), 0, 'sent: the field gives way');
    await page.close();
  }
  for (const state of askedStates(card('site-newsletter'))) {
    const { page, errors } = await open(`templates/site-newsletter.html?state=${state}`);
    assert.deepEqual(errors, []);
    assert.equal(await page.getAttribute('#signup', 'data-state'), state);
    if (state === 'subscribed' || state === 'sent') assert.equal(await visible(page, `#signup .fd-site-cta-done[data-state="${state}"]`), 1);
    if (state === 'failed') {
      assert.equal(await page.getAttribute('#signup-error', 'role'), 'alert');
      assert.match(await page.textContent('#signup-error'), /couldn’t add you/);
      assert.equal(await visible(page, '#signup-email'), 1, 'failed keeps the field');
    }
    await page.close();
  }
  const { page } = await open('templates/site-newsletter.html');
  await page.fill('#signup-email', 'dana@quarry.dev');
  await page.click('#signup button[type="submit"]');
  await page.waitForSelector('#signup[data-state="subscribed"]');
  await page.close();
});

test('report: the gated download in every state, and Copy link', async () => {
  const expect = { invalid: '#gate-email[aria-invalid="true"]', busy: '#gate-form button[aria-busy="true"]', sent: '#gate-sent', failed: '#gate-failed' };
  for (const state of askedStates(card('site-report'))) {
    const { page, errors } = await open(`templates/site-report.html?state=${state}`);
    assert.deepEqual(errors, [], `?state=${state}`);
    assert.equal(await visible(page, expect[state]), 1, `?state=${state} shows its view`);
    await page.close();
  }
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${base}/templates/site-post.html`, { waitUntil: 'networkidle' });
  await page.click('[data-fd-copy-link]');
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'https://ember.example/blog/median-842-ms', 'copies the canonical link');
  assert.match(await page.textContent('[data-fd-copy-link]'), /Copied/);
  await ctx.close();
});

test('docs: the article, listing and sign-up specimens render without errors and with no sideways scroll', async () => {
  const { page, errors } = await open('docs/site-sections.html');
  assert.deepEqual(errors, []);
  assert.ok(await page.evaluate(() => document.querySelectorAll('#article .fd-site-article').length >= 5));
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('#cta .fd-site-cta-form[data-state]')].map((f) => f.dataset.state).join(',')).then((s) => ['invalid', 'busy', 'sent', 'subscribed', 'failed'].every((x) => s.includes(x))));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
  await page.close();
});
