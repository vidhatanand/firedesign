// node --test scripts/test/small.test.mjs
// Fire 0.8, the small parts: the legal foot of a centred screen, the picture frame with a safe address, the brand set
// once, the logo field, per-row menu items, and two icons. Pure helpers run in Node; behaviour runs in Chromium
// (playwright-core) against docs/shell.html, docs/documentation.html, docs/forms.html and docs/overlays.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.document = { readyState: 'complete', querySelectorAll: () => [], querySelector: () => null, documentElement: { lang: '' } };
const { safeImageUrl } = await import('../../fire/js/content.js');
const { ICONS } = await import('../../fire/js/icons.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/* ---------- Pure helpers ---------- */

test('safeImageUrl accepts https on a listed host and anything on the page origin', () => {
  const base = 'https://app.ember.dev/runs/1';
  assert.equal(safeImageUrl('/shots/a.png', { base }), 'https://app.ember.dev/shots/a.png');
  assert.equal(safeImageUrl('shots/a.png', { base }), 'https://app.ember.dev/runs/shots/a.png');
  assert.equal(safeImageUrl('https://cdn.ember.dev/a.png', { base, hosts: ['cdn.ember.dev'] }), 'https://cdn.ember.dev/a.png');
  assert.equal(safeImageUrl('https://x.files.ember.dev/a.png', { base, hosts: ['*.files.ember.dev'] }), 'https://x.files.ember.dev/a.png');
  assert.equal(safeImageUrl('http://localhost:4000/a.png', { base: 'http://localhost:4000/' }), 'http://localhost:4000/a.png');
});

test('safeImageUrl refuses other hosts, plain http, other schemes, credentials and junk', () => {
  const base = 'https://app.ember.dev/';
  const hosts = ['cdn.ember.dev', '*.files.ember.dev'];
  for (const bad of [
    'https://evil.example/a.png', 'http://cdn.ember.dev/a.png', 'javascript:alert(1)', ' JavaScript:alert(1)', 'jav\tascript:alert(1)',
    'blob:https://app.ember.dev/1', 'file:///etc/passwd', 'ftp://cdn.ember.dev/a.png', 'https://user:pw@cdn.ember.dev/a.png',
    'https://files.ember.dev.evil.example/a.png', 'https://evilfiles.ember.dev/a.png', 'https://files.ember.dev/a.png', '', '   ', 'data:image/png;base64,AAAA',
  ]) assert.equal(safeImageUrl(bad, { base, hosts }), null, bad);
  for (const bad of [null, undefined, 42, {}, ['https://cdn.ember.dev/a.png']]) assert.equal(safeImageUrl(bad, { base, hosts }), null);
  assert.equal(safeImageUrl('/a.png'), null, 'a relative address with no base and no page has no origin to belong to');
});

test('safeImageUrl takes data: only for images, and only when asked', () => {
  const base = 'https://app.ember.dev/';
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  assert.equal(safeImageUrl(png, { base }), null);
  assert.equal(safeImageUrl(png, { base, data: true }), png);
  assert.equal(safeImageUrl('data:text/html;base64,PHNjcmlwdD4=', { base, data: true }), null);
  assert.equal(safeImageUrl('data:image/svg+xml,%3Csvg%2F%3E', { base, data: true }), 'data:image/svg+xml,%3Csvg%2F%3E');
});

test('the icon set has wrench and calendar-check, drawn from Lucide', () => {
  for (const name of ['wrench', 'calendar-check']) {
    assert.ok(ICONS[name] && ICONS[name].includes('<path'), name);
    assert.ok(read('fire/fire.d.ts').includes(`'${name}'`), `${name} is in IconName`);
  }
});

/* ---------- Markup rules ---------- */

test('the new docs sections carry no style attribute and no inline handler', () => {
  for (const file of ['docs/shell.html', 'docs/documentation.html', 'docs/forms.html', 'docs/overlays.html', 'scripts/test/fixtures/screen-foot.html']) {
    const html = read(file);
    assert.ok(!/\sstyle="/.test(html), `${file} has a style attribute`);
    assert.ok(!/\son[a-z]+="/.test(html), `${file} has an inline handler`);
  }
});

test('every card this package touches points at a docs section that exists', () => {
  for (const id of ['screen', 'doc-frame', 'brand', 'file-upload', 'menu']) {
    const card = JSON.parse(read(`contract/cards/${id}.json`));
    assert.equal(card.id, id);
    const [file, anchor] = card.example.split('#');
    assert.ok(read(file).includes(`id="${anchor}"`), `${id}: ${card.example}`);
  }
  assert.ok(JSON.parse(read('contract/cards/doc-frame.json')).surfaces.includes('app'));
});

/* ---------- Behaviour in a browser ---------- */

let chromium;
try { ({ chromium } = await import('playwright-core')); } catch { /* not installed */ }
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let server;
let browser;
let base = '';
const requested = [];
if (chromium) {
  server = http.createServer((req, res) => {
    requested.push(req.url);
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
async function open(page, url) {
  await page.goto(`${base}${url}`);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test('the legal foot wraps, sits at the bottom of a tall screen and under the card on a short one', { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await open(page, '/scripts/test/fixtures/screen-foot.html');
  const rect = (sel) => page.locator(sel).evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; });
  let foot = await rect('.fd-screen-foot');
  assert.ok(900 - foot.bottom < 40, `the foot is at the bottom of a tall screen (${foot.bottom})`);
  assert.equal(await page.locator('.fd-screen-foot').evaluate((el) => getComputedStyle(el).flexWrap), 'wrap');
  // a short viewport, as with the keyboard open: the page grows, the foot follows the card and never covers it
  await page.setViewportSize({ width: 320, height: 300 });
  foot = await rect('.fd-screen-foot');
  const card = await rect('.fd-card');
  assert.ok(foot.top >= card.bottom, `foot (${foot.top}) starts below the card (${card.bottom})`);
  assert.equal(await page.locator('.fd-screen-foot').evaluate((el) => getComputedStyle(el).position), 'static');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll at 320');
  assert.ok(foot.left >= 0 && foot.right <= 320);
  await page.close();
});

test('picture frame: loaded, loading, failed, refused and empty, with the ratio held and nothing refused requested', { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  requested.length = 0;
  await open(page, '/docs/documentation.html');
  const states = await page.locator('#picture-frame figure.fd-doc-frame').evaluateAll((els) => els.map((el) => el.dataset.state));
  await page.waitForFunction(() => [...document.querySelectorAll('#picture-frame figure[data-fd-src]')].every((el) => el.dataset.state && el.dataset.state !== 'loading'));
  const settled = await page.locator('#picture-frame figure.fd-doc-frame').evaluateAll((els) => els.map((el) => el.dataset.state));
  assert.deepEqual(settled, ['loaded', 'loading', 'failed', 'refused', 'empty', 'loaded', 'loaded'], JSON.stringify(states));
  assert.ok(!requested.some((u) => /alert|javascript/.test(u)), 'a refused address is not requested');
  const failed = page.locator('#picture-frame figure[data-state="failed"]');
  assert.match(await failed.locator('.fd-doc-frame-placeholder').innerText(), /didn.t load/);
  assert.match(await page.locator('#picture-frame figure[data-state="refused"] .fd-doc-frame-placeholder').innerText(), /isn.t allowed/);
  assert.match(await page.locator('#picture-frame figure[data-state="empty"] .fd-doc-frame-placeholder').innerText(), /No picture/);
  // the media keeps 16:9 in every state, so nothing moves
  const ratios = await page.locator('#picture-frame .doc-specimen:first-of-type .fd-doc-frame-media').evaluateAll((els) => els.map((el) => Math.round((el.getBoundingClientRect().width / el.getBoundingClientRect().height) * 100) / 100));
  for (const r of ratios) assert.equal(r, 1.78);
  // only a loaded picture opens larger
  const zoom = page.locator('#picture-frame figure[data-zoom] .fd-doc-frame-media');
  assert.equal(await zoom.getAttribute('role'), 'button');
  await zoom.click();
  await page.waitForSelector('dialog.fd-doc-zoom[open] img');
  await page.keyboard.press('Escape');
  await page.close();
});

test('picture frame: setPicture moves a frame between states, fires fd:change and drops zoom when the picture goes', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/docs/documentation.html');
  const out = await page.evaluate(async () => {
    const { docsite } = await import('/fire/fire.js');
    const frame = document.createElement('figure');
    frame.className = 'fd-doc-frame';
    frame.setAttribute('data-zoom', '');
    frame.innerHTML = '<div class="fd-doc-frame-media"></div><figcaption class="fd-doc-frame-caption">A run</figcaption>';
    document.body.append(frame);
    const seen = [];
    frame.addEventListener('fd:change', (e) => seen.push(e.detail.value));
    docsite.setPicture(frame, '/fire/favicon.svg');
    await new Promise((r) => setTimeout(r, 300));
    const loaded = { state: frame.dataset.state, role: frame.querySelector('.fd-doc-frame-media').getAttribute('role'), alt: frame.querySelector('img').alt };
    docsite.setPicture(frame, 'javascript:alert(1)');
    const refused = { state: frame.dataset.state, role: frame.querySelector('.fd-doc-frame-media').getAttribute('role'), imgs: frame.querySelectorAll('img').length };
    docsite.setPicture(frame, '');
    return { seen, loaded, refused, empty: frame.dataset.state };
  });
  assert.deepEqual(out.seen, ['loading', 'loaded', 'refused', 'empty']);
  assert.deepEqual(out.loaded, { state: 'loaded', role: 'button', alt: 'A run' });
  assert.deepEqual(out.refused, { state: 'refused', role: null, imgs: 0 });
  assert.equal(out.empty, 'empty');
  await page.close();
});

test('brand: one record fills every fd-brand, with no inline style, a sized logo, a dark swap and a scope', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/docs/shell.html');
  const specimens = page.locator('#brand [data-fd-brand]');
  // initial mark from the name
  assert.equal(await specimens.nth(0).locator('.fd-brand-name').innerText(), 'Quarry Labs');
  assert.ok(await specimens.nth(0).locator('.fd-brand-mark svg.fd-initial').count());
  // a picture mark and a link
  assert.equal(await specimens.nth(1).locator('.fd-brand-mark img').getAttribute('src'), `${base}/fire/favicon.svg`);
  assert.equal(await specimens.nth(1).locator('a.fd-brand').getAttribute('href'), '#brand');
  // a logo: an img with width and height, alt from the name, no name span, no style attribute
  const logo = specimens.nth(2).locator('img.fd-brand-logo');
  assert.equal(await logo.getAttribute('width'), '96');
  assert.equal(await logo.getAttribute('height'), '24');
  assert.equal(await logo.getAttribute('alt'), 'Quarry Labs');
  assert.equal(await specimens.nth(2).locator('.fd-brand-name').count(), 0);
  assert.equal(await page.locator('#brand .fd-brand [style]').count(), 0);
  const light = await logo.getAttribute('src');
  await page.evaluate(async () => { const { setTheme } = await import('/fire/js/core.js'); setTheme('dark'); });
  await page.waitForFunction((was) => document.querySelector('#brand [data-fd-brand] img.fd-brand-logo').getAttribute('src') !== was, light);
  await page.evaluate(async () => { const { setTheme } = await import('/fire/js/core.js'); setTheme('light'); });
  await page.waitForFunction((was) => document.querySelector('#brand [data-fd-brand] img.fd-brand-logo').getAttribute('src') === was, light);
  // the page-level brand and keep, a refused picture
  const out = await page.evaluate(async () => {
    const { shell } = await import('/fire/fire.js');
    document.body.insertAdjacentHTML('beforeend', '<div id="t"><a class="fd-brand" href="#"><span class="fd-brand-mark"></span><span class="fd-brand-name">Ember</span></a><a class="fd-brand" data-fd-brand-keep href="#"><span class="fd-brand-name">Partner</span></a></div>');
    shell.setBrand({ name: 'Acme', logo: 'https://evil.example/logo.png', mark: 'javascript:alert(1)' }, document.getElementById('t'));
    const [a, b] = document.querySelectorAll('#t .fd-brand');
    return { a: a.querySelector('.fd-brand-name').textContent, initial: !!a.querySelector('.fd-initial'), imgs: a.querySelectorAll('img').length, keep: b.textContent.trim(), outside: document.querySelector('#screen .fd-brand-name').textContent };
  });
  assert.deepEqual(out, { a: 'Acme', initial: true, imgs: 0, keep: 'Partner', outside: 'Ember' });
  await page.close();
});

test('logo field: Upload opens the picker, a file previews at once, errors are field errors, Remove restores the tile', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/docs/forms.html');
  const zone = page.locator('#logo-live-label + [data-layout="logo"]');
  const field = page.locator('#logo-live-label').locator('xpath=..');
  assert.ok(await zone.locator('.fd-tile .fd-initial').count(), 'the initial tile shows with no logo');
  assert.equal(await zone.locator('[data-fd-file-clear]').isVisible(), false, 'nothing to remove yet');
  const chooser = page.waitForEvent('filechooser');
  await zone.locator('[data-fd-file-pick]').click();
  await chooser;
  await page.evaluate(() => { window.__seen = []; const z = document.querySelector('#logo-live-label + [data-layout="logo"]'); for (const t of ['fd:files', 'fd:change']) z.addEventListener(t, (e) => window.__seen.push([t, e.detail.files?.length ?? e.detail.value.length])); window.__revoked = []; const r = URL.revokeObjectURL; URL.revokeObjectURL = (u) => { window.__revoked.push(u); r(u); }; });
  await zone.locator('input[type="file"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForSelector('#logo-live-label + [data-layout="logo"] .fd-dropzone-preview > img');
  const first = await zone.locator('.fd-dropzone-preview > img').getAttribute('src');
  assert.match(first, /^blob:/);
  assert.equal(await zone.locator('.fd-dropzone-preview .fd-tile').isVisible(), false);
  assert.equal(await zone.getAttribute('data-state'), 'uploading');
  assert.deepEqual(await page.evaluate(() => window.__seen), [['fd:files', 1], ['fd:change', 1]]);
  await page.waitForFunction(() => document.querySelector('#logo-live-label + [data-layout="logo"]').dataset.state === 'done');
  // a second file replaces the first and revokes its object URL
  await zone.locator('input[type="file"]').setInputFiles({ name: 'logo2.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForFunction((was) => document.querySelector('#logo-live-label + [data-layout="logo"] .fd-dropzone-preview > img').src !== was, first);
  assert.ok((await page.evaluate(() => window.__revoked)).includes(first));
  // wrong type and too large: a field error, the picture stays
  await zone.locator('input[type="file"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await page.waitForFunction(() => document.querySelector('#logo-live-label + [data-layout="logo"]').dataset.state === 'error');
  assert.match(await field.locator('.fd-field-error').innerText(), /not supported/);
  assert.equal(await field.locator('.fd-field-error').isVisible(), true);
  assert.equal(await zone.locator('input[type="file"]').getAttribute('aria-invalid'), 'true');
  assert.equal(await zone.locator('.fd-dropzone-preview > img').count(), 1);
  await zone.locator('input[type="file"]').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(3 * 1024 * 1024, 1) });
  await page.waitForFunction(() => /Larger than 2 MB/.test(document.querySelector('#logo-live-label').parentElement.querySelector('.fd-field-error').textContent));
  // Remove: the tile returns, the error goes, fd:change carries an empty list
  const shown = await zone.locator('.fd-dropzone-preview > img').getAttribute('src');
  await zone.locator('[data-fd-file-clear]').click();
  assert.equal(await zone.locator('.fd-dropzone-preview > img').count(), 0);
  assert.equal(await zone.locator('.fd-dropzone-preview .fd-tile').isVisible(), true);
  assert.equal(await field.locator('.fd-field-error').isVisible(), false);
  assert.equal(await zone.getAttribute('data-state'), null);
  assert.ok((await page.evaluate(() => window.__revoked)).includes(shown));
  assert.deepEqual((await page.evaluate(() => window.__seen)).at(-1), ['fd:change', 0]);
  await page.close();
});

test('logo field: cancelling fd:files leaves the upload to the page, which reports with setFileProgress', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/docs/forms.html');
  const out = await page.evaluate(async () => {
    const { forms } = await import('/fire/fire.js');
    const zone = document.querySelector('#logo-live-label + [data-layout="logo"]');
    zone.addEventListener('fd:files', (e) => e.preventDefault());
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'mark.png', { type: 'image/png' });
    forms.addFiles(zone, [file]);
    await new Promise((r) => setTimeout(r, 900));
    const stalled = zone.dataset.state;
    forms.setFileProgress(zone, 40);
    const at40 = zone.querySelector('.fd-file-bar').getAttribute('aria-valuenow');
    forms.setFileProgress(zone, 100, { message: 'Uploaded' });
    return { stalled, at40, done: zone.dataset.state, text: zone.querySelector('.fd-file-status').textContent };
  });
  assert.deepEqual(out, { stalled: 'uploading', at40: '40', done: 'done', text: 'Uploaded' });
  await page.close();
});

test('row menu: items follow the row, hidden items are skipped by the arrow keys, an empty menu stays shut', { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await open(page, '/docs/overlays.html');
  const opener = (id) => page.locator(`#menu-rows tr[data-value="${id}"] [data-fd-menu]`);
  const labels = () => page.locator('#menu-runs .fd-menu-item:not([hidden])').allInnerTexts();
  await page.evaluate(() => { window.__sel = []; document.addEventListener('fd:select', (e) => { if (e.target.closest('#menu-runs')) window.__sel.push({ row: e.detail.row?.dataset.value, trigger: e.detail.trigger?.getAttribute('aria-label'), value: e.detail.value }); }); });
  await opener('run_c41b07').click();
  await page.waitForSelector('#menu-runs[data-state="open"]');
  assert.deepEqual(await labels(), ['Resume', 'Transfer to a teammate', 'Cancel run']);
  assert.equal(await page.locator('#menu-runs .fd-menu-item[data-fd-else]').getAttribute('aria-disabled'), 'true');
  // the arrow keys skip what is hidden and what is dimmed: Resume, then Cancel run, then round to Resume
  const focused = () => page.evaluate(() => document.activeElement.textContent.trim());
  await page.keyboard.press('ArrowDown');
  assert.equal(await focused(), 'Resume');
  await page.keyboard.press('ArrowDown');
  assert.equal(await focused(), 'Cancel run');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Resume');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Cancel run');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('#menu-runs').dataset.state !== 'open');
  assert.deepEqual(await page.evaluate(() => window.__sel), [{ row: 'run_c41b07', trigger: 'Actions for run_c41b07', value: 'Resume' }]);
  // another row, the same menu: the flags are read again; a separator that has nothing above it goes
  await opener('run_77d0e2').click();
  await page.waitForSelector('#menu-runs[data-state="open"]');
  assert.deepEqual(await labels(), ['View output', 'Retry run', 'Transfer to a teammate']);
  assert.equal(await page.locator('#menu-runs .fd-menu-item[data-fd-else]').getAttribute('aria-disabled'), null, 'the admin flag enables Transfer');
  assert.equal(await page.locator('#menu-runs .fd-menu-sep').isVisible(), false);
  await page.keyboard.press('Escape');
  // a row with nothing to show: the opener is already aria-disabled and the menu does not open
  const expired = opener('run_5b02c8');
  assert.equal(await expired.getAttribute('aria-disabled'), 'true');
  assert.equal(await expired.getAttribute('data-fd-empty'), '');
  await expired.click({ force: true });
  await page.waitForTimeout(250);
  assert.notEqual(await page.locator('#menu-runs').getAttribute('data-state'), 'open');
  // a row's flags change: pressing the opener checks again and wakes it
  await page.evaluate(() => { document.querySelector('#menu-rows tr[data-value="run_5b02c8"]').setAttribute('data-fd-flags', 'paused'); });
  await expired.click({ force: true });
  await page.waitForSelector('#menu-runs[data-state="open"]');
  assert.equal(await expired.getAttribute('aria-disabled'), null);
  assert.deepEqual(await labels(), ['Resume', 'Transfer to a teammate', 'Cancel run']);
  await page.close();
});

test('row menu: filterMenu counts what shows, and the sub-menus of a menu follow the root opener', { skip }, async () => {
  const page = await browser.newPage();
  await open(page, '/docs/overlays.html');
  const out = await page.evaluate(async () => {
    const { overlays } = await import('/fire/fire.js');
    document.body.insertAdjacentHTML('beforeend', `
      <ul><li data-fd-flags="admin"><button id="o" data-fd-menu="m2">More</button></li></ul>
      <div class="fd-menu" id="m2" popover>
        <p class="fd-menu-label" id="l1">Run</p>
        <button class="fd-menu-item" data-fd-when="paused">Resume</button>
        <hr class="fd-menu-sep" id="s1">
        <p class="fd-menu-label" id="l2">Team</p>
        <button class="fd-menu-item" data-fd-when="admin">Transfer</button>
        <button class="fd-menu-item" data-fd-unless="admin">Leave</button>
        <button class="fd-menu-item" data-fd-submenu="m3" data-fd-when="admin">Move to</button>
        <div class="fd-menu" id="m3" popover><button class="fd-menu-item" data-fd-when="admin">Staging</button><button class="fd-menu-item" data-fd-unless="admin">Prod</button></div>
      </div>`);
    overlays.init(document);
    const menu = document.getElementById('m2');
    const count = overlays.filterMenu(menu, document.getElementById('o'));
    const hidden = (id) => document.getElementById(id).hidden;
    return { count, l1: hidden('l1'), s1: hidden('s1'), l2: hidden('l2'), leave: [...menu.querySelectorAll(':scope > .fd-menu-item')].map((b) => [b.textContent, b.hidden]) };
  });
  assert.equal(out.count, 2);
  assert.equal(out.l1, true, 'a label with no item under it goes');
  assert.equal(out.s1, true, 'a separator with nothing before it goes');
  assert.equal(out.l2, false);
  assert.deepEqual(out.leave, [['Resume', true], ['Transfer', false], ['Leave', true], ['Move to', false]]);
  await page.evaluate(() => document.getElementById('o').click());
  await page.waitForSelector('#m2[data-state="open"]');
  await page.locator('#m2 [data-fd-submenu]').click();
  await page.waitForSelector('#m3[data-state="open"]');
  assert.deepEqual(await page.locator('#m3 .fd-menu-item:not([hidden])').allInnerTexts(), ['Staging']);
  await page.close();
});

test.after(async () => { await browser?.close(); server?.close(); });
