// node --test scripts/test/pictures.test.mjs : a picture for every index entry (scripts/build-pictures.mjs), the index field, fire find,
// the indexed-PNG writer and the Catalogue page's thumbnails, dialog and Pictures switch.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkPictures, targets, capHeight } from '../build-pictures.mjs';
import { pictureFor, PICTURES } from '../build-index.mjs';
import { encodePalette, padImage, scaleDown, decode } from '../lib/png-palette.mjs';
import { serve } from '../gate.mjs';
import { checkPicturesInWorkers } from './picture-check.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/index.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/catalog.json'), 'utf8'));
const pictured = index.entries.filter((e) => e.kind !== 'module');

test('every index entry but a module has a picture at contract/pictures/<kind>/<id>.png, and nothing else is in the folder', () => {
  assert.deepEqual(checkPictures(index), []);
  assert.deepEqual(index.pictures, PICTURES);
  for (const e of index.entries) {
    assert.equal(e.picture, undefined, 'the path is not repeated on each entry');
    const f = pictureFor(e.kind, e.id, index.pictures);
    assert.equal(f, e.kind === 'module' ? null : `contract/pictures/${e.kind}/${e.id}.png`);
    if (f) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  }
  assert.equal(pictured.length, catalog.components.length + catalog.templates.length);
});

test('--check names a missing picture, a stray one and a wrong index field', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-pics-'));
  const dir = path.join(tmp, 'contract/pictures');
  fs.mkdirSync(path.join(dir, 'template'), { recursive: true });
  const fake = { pictures: PICTURES, entries: [{ id: 'one', kind: 'template' }, { id: 'two', kind: 'template' }, { id: 'm', kind: 'module' }] };
  fs.writeFileSync(path.join(dir, 'template/one.png'), encodePalette(padImage({ width: 2, height: 2, data: Buffer.alloc(16, 255) }, 1, [255, 255, 255])));
  fs.writeFileSync(path.join(dir, 'template/stray.png'), 'x'.repeat(200));
  const problems = checkPictures(fake, dir);
  assert.ok(problems.some((p) => /template\/two\.png: an index entry has no picture/.test(p)), problems.join('\n'));
  assert.ok(problems.some((p) => /template\/stray\.png: a picture with no index entry/.test(p)));
  assert.equal(problems.length, 2);
  assert.ok(checkPictures({ entries: [{ id: 'one', kind: 'template' }] }, dir).some((p) => /no `pictures` rule/.test(p)));
  fs.rmSync(tmp, { recursive: true });
});

test('a new template entry is picked up by the rules: a target with its page, phone only when its card lists phone first', () => {
  const t = targets({ entries: [
    { id: 'new-page', kind: 'template', surfaces: ['website', 'phone'], docs: 'templates/new-page.html' },
    { id: 'mobile-first', kind: 'template', surfaces: ['phone', 'app'], docs: 'templates/mobile-first.html' },
    { id: 'tabbar', kind: 'component', surfaces: ['phone'], docs: 'docs/navigation.html#tabbar' },
    { id: 'table', kind: 'component', surfaces: ['app', 'phone'], docs: 'docs/data.html#table' },
    { id: 'email', kind: 'module', surfaces: ['email'], docs: 'docs/email.html#top' },
  ] }, catalog);
  assert.deepEqual(t.map((x) => x.key), ['template/new-page', 'template/mobile-first', 'component/tabbar', 'component/table']);
  assert.deepEqual(t.map((x) => x.phone), [false, true, true, false]);
  assert.equal(t[0].file, 'contract/pictures/template/new-page.png');
  assert.equal(t[2].root, catalog.components.find((c) => c.id === 'tabbar').root);
});

test('pictures are indexed PNGs at most 1440 px wide, none blank, and the set is under 12 MB', async () => {
  // Decoding 239 PNGs is the cost: a few worker threads each decode every n-th one (picture-check.mjs holds the check).
  const files = pictured.map((e) => pictureFor(e.kind, e.id));
  const total = await checkPicturesInWorkers(ROOT, files);
  assert.ok(total < 12 * 1024 * 1024, `the set is ${(total / 1048576).toFixed(1)} MB`);
});

test('no two entries have the same picture', () => {
  const seen = new Map();
  for (const e of pictured) {
    const f = pictureFor(e.kind, e.id);
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
    assert.ok(!seen.has(h), `${f} is byte-identical to ${seen.get(h)}`);
    seen.set(h, f);
  }
});

test('a picture taller than 900 CSS px is cut on a clean edge between blocks, or straight when there is none', () => {
  const w = 100, scale = 1, h = 1200, data = Buffer.alloc(w * h * 4, 255);
  for (let y = 0; y < h; y++) if (y % 100 < 60) for (let x = 20; x < 80; x++) data.fill(0, (y * w + x) * 4, (y * w + x) * 4 + 3);   // blocks 60 tall, gaps 40 tall
  const cut = capHeight({ width: w, height: h, data }, scale);
  assert.equal(cut.cut, 'clean');
  assert.ok(cut.img.height <= 900 && cut.img.height > 720 && cut.img.height % 100 >= 60, `cut at ${cut.img.height}`);
  const solid = Buffer.alloc(w * h * 4); for (let i = 0; i < solid.length; i += 4) { solid[i] = i % 7 * 30; solid[i + 3] = 255; }
  assert.deepEqual([capHeight({ width: w, height: h, data: solid }, scale).cut, capHeight({ width: w, height: h, data: solid }, scale).img.height], ['straight', 900]);
  assert.equal(capHeight({ width: w, height: 500, data: data.subarray(0, w * 500 * 4) }, scale).cut, null);
});

test('the indexed PNG writer: same bytes twice, the same picture back within a few levels, a border and an area-average scale', () => {
  const w = 64, h = 40, data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; data[i] = x * 4; data[i + 1] = y * 6; data[i + 2] = (x * y) % 256; data[i + 3] = 255; }
  const img = { width: w, height: h, data };
  const a = encodePalette(img), b = encodePalette(img);
  assert.ok(a.equals(b), 'deterministic');
  const back = decode(a);
  assert.equal(back.width, w);
  let worst = 0;
  for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(back.data[i + c] - data[i + c]));
  assert.ok(worst < 40, `worst channel error ${worst}`);
  const padded = padImage(img, 8, [10, 20, 30]);
  assert.deepEqual([padded.width, padded.height], [w + 16, h + 16]);
  assert.deepEqual([...padded.data.subarray(0, 4)], [10, 20, 30, 255]);
  const half = scaleDown({ width: 4, height: 2, data: Buffer.from([0, 0, 0, 255, 100, 100, 100, 255, 200, 200, 200, 255, 200, 200, 200, 255, 0, 0, 0, 255, 100, 100, 100, 255, 200, 200, 200, 255, 200, 200, 200, 255]) }, 2);
  assert.deepEqual([half.width, half.height, half.data[0], half.data[4]], [2, 1, 50, 200]);
});

test('fire find --json carries the picture path of a part and of a template, and none for a module', () => {
  const run = (...a) => JSON.parse(spawnSync(process.execPath, ['scripts/find.mjs', ...a, '--json'], { cwd: ROOT, encoding: 'utf8' }).stdout);
  assert.equal(run('snackbar', '--limit', '1')[0].picture, 'contract/pictures/component/toast.png');   // resolved from the index's rule
  assert.equal(run('activity log page', '--kind', 'template', '--limit', '1')[0].picture, 'contract/pictures/template/logs.png');
  assert.equal(run('send a sign-in email', '--limit', '1')[0].picture, undefined);
});

let chromium;
try { ({ chromium } = await import('playwright-core')); } catch { /* not installed */ }
let browser = null;
if (chromium) try { browser = await chromium.launch(); } catch { /* no browser */ }

test('Catalogue page: lazy thumbnails with a size and alt text open a dialog; the Pictures switch shows a grid and is kept in the address', { skip: !browser && 'no Chromium' }, async () => {
  const srv = await serve();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(`${srv.origin}/docs/catalogue.html?q=accordion`);
    await page.waitForSelector('#cat-list .doc-cat-thumb');
    const img = page.locator('#cat-list .doc-cat-thumb img').first();
    assert.equal(await img.getAttribute('loading'), 'lazy');
    assert.ok(Number(await img.getAttribute('width')) > 0 && Number(await img.getAttribute('height')) > 0);
    assert.equal(await img.getAttribute('alt'), 'Accordion, component');
    assert.match(await img.getAttribute('src'), /contract\/pictures\/component\/accordion\.png$/);
    // Enter on the thumbnail opens the large picture in a dialog
    await page.locator('#cat-list .doc-cat-thumb').first().focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#cat-picture[open]');
    assert.equal(await page.locator('#cat-picture-title').textContent(), 'Accordion');
    await page.waitForFunction(() => document.getElementById('cat-picture-img').complete && document.getElementById('cat-picture-img').naturalWidth > 0);
    assert.match(await page.locator('#cat-picture-docs').getAttribute('href'), /content\.html#accordion$/);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('cat-picture').open);
    // the Pictures switch: a grid, in the address, kept by Clear filters
    await page.locator('label:has(#cat-pictures)').click();
    await page.waitForSelector('#cat-grid:not([hidden]) .doc-cat-card');
    assert.ok(await page.locator('#cat-list').isHidden());
    assert.match(page.url(), /view=pictures/);
    await page.fill('#cat-q', 'zzzz nothing');
    await page.locator('#cat-clear').click();   // the empty state's button
    assert.match(page.url(), /view=pictures/);
    assert.doesNotMatch(page.url(), /q=/);
    assert.ok(await page.locator('#cat-grid .doc-cat-card').count() > 100);
    await page.goto(`${srv.origin}/docs/catalogue.html?view=pictures&kind=template`);
    await page.waitForSelector('#cat-grid .doc-cat-card');
    assert.equal(await page.locator('#cat-pictures').isChecked(), true);
    assert.equal(await page.locator('#cat-grid .doc-cat-card').count(), index.entries.filter((e) => e.kind === 'template').length);
  } finally { await ctx.close(); await srv.close(); }
});

test.after(async () => { if (browser) await browser.close(); });
