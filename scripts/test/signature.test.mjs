// node --test scripts/test/ : the signature, Fire's generated texture and frame marks as dials in the theme record.
//   - the "signature" record field: validateTheme agrees with the schema (ajv), expandTheme writes data-signature-*
//     attributes only where not the default, toThemeRecord / fromThemeRecord round-trip it, the default record is unchanged
//   - texture.js reads the same attribute names theme.js writes
//   - the new fields (contour, stipple, bars) are deterministic, seeded, not empty, and different from one another
//   - in Chromium: a set page dial wins over an instance's own option, data-signature="own" pins an instance, a change on
//     <html> restyles live instances, Tweaks writes the attributes (Copy CSS and Copy theme carry them), the frame's
//     marks follow data-signature-marks (and a band's data-marks wins), a still frame under reduced motion
//   - cost: every field computes a frame of a wide hero within budget (printed)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { chromium } from 'playwright-core';
import {
  validateTheme, expandTheme, themeToCss, toThemeRecord, fromThemeRecord, DEFAULT_RECORD,
  SIGNATURE_DEFAULT, SIGNATURE_CHOICES, SIGNATURE_ATTRIBUTES,
} from '../../fire/js/theme.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/theme.schema.json'), 'utf8'));
const schemaValid = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

/* ---------- the record ---------- */
const GOOD = [
  {},
  { signature: {} },
  { signature: { field: 'contour', mark: 'squares', cell: 10, ramp: 'soft', marks: 'corners', intensity: 1.25 } },
  { signature: { cell: 'auto', field: 'bars' } },
  { signature: { marks: 'none', intensity: 0.4 } },
];
const BAD = [
  { signature: { field: 'lava' } },
  { signature: { mark: 'stars' } },
  { signature: { cell: 3 } },
  { signature: { cell: 25 } },
  { signature: { cell: 'big' } },
  { signature: { ramp: ' .:-=+*#' } },
  { signature: { marks: 'auto' } },
  { signature: { intensity: 1.7 } },
  { signature: { intensity: '1' } },
  { signature: { texture: 1 } },
  { signature: 'contour' },
];

test('validateTheme and the schema agree on the signature', () => {
  for (const record of GOOD) {
    assert.equal(validateTheme(record).ok, true, JSON.stringify(record));
    assert.equal(schemaValid(record), true, `${JSON.stringify(record)} ${JSON.stringify(schemaValid.errors)}`);
  }
  for (const record of BAD) {
    assert.equal(validateTheme(record).ok, false, JSON.stringify(record));
    assert.equal(schemaValid(record), false, JSON.stringify(record));
  }
});

test('the schema enums are the theme module lists', () => {
  const props = schema.properties.signature.properties;
  for (const key of ['field', 'mark', 'ramp', 'marks']) assert.deepEqual(props[key].enum, SIGNATURE_CHOICES[key], key);
  assert.deepEqual(Object.keys(props).sort(), Object.keys(SIGNATURE_DEFAULT).sort());
});

test('expandTheme writes data-signature-* only where not the default', () => {
  assert.deepEqual(expandTheme({}).attributes, {});
  assert.deepEqual(expandTheme({ signature: {} }).attributes, {});
  assert.deepEqual(expandTheme({ signature: { ...SIGNATURE_DEFAULT } }).attributes, {});
  const { attributes } = expandTheme({ signature: { field: 'contour', mark: 'plus', cell: 9, marks: 'corners', intensity: 1.2 } });
  assert.deepEqual(attributes, {
    'data-signature-field': 'contour', 'data-signature-mark': 'plus', 'data-signature-cell': '9',
    'data-signature-marks': 'corners', 'data-signature-intensity': '1.2',
  });
  const css = themeToCss({ signature: { field: 'bars', ramp: 'dense' } });
  assert.match(css, /data-signature-field="bars"/);
  assert.match(css, /data-signature-ramp="dense"/);
  assert.doesNotMatch(css, /data-signature-mark=/);
});

test('toThemeRecord and fromThemeRecord round-trip the signature; the default record has none', () => {
  assert.equal('signature' in DEFAULT_RECORD, false);
  assert.equal('signature' in toThemeRecord({}), false);
  assert.equal('signature' in toThemeRecord({ signature: { ...SIGNATURE_DEFAULT } }), false);
  const signature = { field: 'stipple', mark: 'dashes', cell: 'auto', ramp: 'auto', marks: 'dots', intensity: 0.8 };
  const record = toThemeRecord({ signature });
  assert.deepEqual(record.signature, signature);
  assert.equal(validateTheme(record).ok, true);
  assert.deepEqual(fromThemeRecord(record).signature, signature);
  assert.deepEqual(fromThemeRecord({}).signature, SIGNATURE_DEFAULT);
});

test('texture.js reads the attribute names theme.js writes', async () => {
  const source = fs.readFileSync(path.join(ROOT, 'fire/js/texture.js'), 'utf8');
  const block = source.match(/export const SIGNATURE_ATTRIBUTES = Object\.freeze\(\{([\s\S]*?)\}\);/)[1];
  const found = Object.fromEntries([...block.matchAll(/(\w+): '([\w-]+)'/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(found, { ...SIGNATURE_ATTRIBUTES });
});

/* ---------- in the browser ---------- */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };


/** Serve the repository, open docs/signature.html in Chromium and run `fn(page, port)`. */
async function inChromium(fn, contextOptions = { viewport: { width: 1200, height: 900 } }) {
  const server = createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext(contextOptions)).newPage();
    return await fn(page, server.address().port);
  } finally {
    await browser.close();
    server.close();
  }
}

/* ---------- the fields (texture.js needs a DOM, so these run in the page) ---------- */
test('contour, stipple and bars are registered, deterministic, seeded and different', () => inChromium(async (page, port) => {
  await page.goto(`http://127.0.0.1:${port}/docs/signature.html`);
  const result = await page.evaluate(async () => {
    const { renderText, fields } = await import('/fire/js/texture.js');
    const out = { names: ['contour', 'stipple', 'bars'].map((n) => fields.has(n)), fields: {} };
    for (const name of ['contour', 'stipple', 'bars']) {
      const a = renderText(name, { cols: 90, rows: 24 });
      out.fields[name] = { a, again: renderText(name, { cols: 90, rows: 24 }), other: renderText(name, { cols: 90, rows: 24, seed: 'other' }), ink: [...a].filter((c) => c.trim()).length };
    }
    out.halftone = renderText('halftone', { cols: 60, rows: 16 });
    return out;
  });
  assert.deepEqual(result.names, [true, true, true]);
  const seen = new Set();
  for (const [name, f] of Object.entries(result.fields)) {
    assert.equal(f.a, f.again, `${name} is deterministic`);
    assert.notEqual(f.a, f.other, `${name} follows its seed`);
    assert.ok(f.ink > 90 * 24 * 0.03 && f.ink < 90 * 24 * 0.9, `${name} has ink and calm areas (${f.ink})`);
    assert.ok(!seen.has(f.a), `${name} differs from the others`);
    seen.add(f.a);
  }
  // A dots field drawn as characters uses the character ramp, not digits.
  assert.doesNotMatch(result.halftone, /[1-8]/);
}));

test('every field computes a frame of a wide hero within budget', () => inChromium(async (page, port) => {
  await page.goto(`http://127.0.0.1:${port}/docs/signature.html`);
  const times = await page.evaluate(async () => {
    const { renderText, fields } = await import('/fire/js/texture.js');
    const out = {};
    for (const name of fields.keys()) {
      renderText(name, { cols: 200, rows: 34, t: 1 });
      const start = performance.now();
      for (let i = 0; i < 10; i++) renderText(name, { cols: 200, rows: 34, t: i });
      out[name] = (performance.now() - start) / 10;
    }
    return out;
  });
  console.log('# ms per frame (200x34 cells):', Object.entries(times).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', '));
  const budget = Math.max(...['terrain', 'waves', 'orbit', 'rain', 'grid', 'flame', 'halftone', 'spark'].map((n) => times[n])) * 1.5 + 1;
  for (const name of ['contour', 'stipple', 'bars']) assert.ok(times[name] <= budget, `${name} ${times[name].toFixed(2)}ms against a budget of ${budget.toFixed(2)}ms`);
}));

test('page dials, explicit options, Tweaks and the frame, in Chromium', async () => {
  const server = createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/docs/signature.html`);
    await page.waitForFunction(() => document.querySelector('.fd-ascii-canvas'));
    const probe = () => page.evaluate(() => {
      const bare = document.querySelector('#dials .fd-ascii:not([data-fd-ascii])');
      const named = document.querySelector('#fields .fd-ascii[data-fd-ascii="grid"]');
      const sum = (el) => { const c = el.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) n += d[i]; return n; };
      return { bare: sum(bare), named: sum(named) };
    });
    const before = await probe();
    assert.ok(before.bare > 0 && before.named > 0, 'fields are drawn');

    // A set page field wins over an instance's own field (unpinned); a pinned instance keeps all its own options.
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'precedence';
      host.innerHTML = '<div class="fd-ascii" data-inline data-fd-ascii="grid" id="p-free"></div><div class="fd-ascii" data-inline data-fd-ascii="grid" data-signature="own" id="p-own"></div>';
      document.body.append(host);
    });
    await page.waitForFunction(() => document.querySelector('#p-own canvas'));
    const hashes = () => page.evaluate(() => ({ free: document.querySelector('#p-free canvas').toDataURL(), own: document.querySelector('#p-own canvas').toDataURL() }));
    await page.waitForTimeout(600);
    const base = await hashes();
    assert.equal(base.free, base.own, 'with every dial on auto the pin changes nothing');
    await page.evaluate(() => document.documentElement.setAttribute('data-signature-field', 'bars'));
    await page.waitForTimeout(300);
    const withField = await hashes();
    assert.notEqual(withField.free, base.free, 'the page field replaces the instance field');
    assert.equal(withField.own, base.own, 'a pinned instance keeps its own field');
    await page.evaluate(() => document.documentElement.setAttribute('data-signature-mark', 'squares'));
    await page.waitForTimeout(300);
    const withMark = await hashes();
    assert.notEqual(withMark.free, withField.free, 'the page mark restyles the unpinned instance');
    assert.equal(withMark.own, base.own, 'a pinned instance keeps its own mark');
    // The page's mark wins over an explicit data-style too, on an unpinned instance.
    await page.evaluate(() => document.getElementById('p-free').setAttribute('data-style', 'dashes'));
    await page.evaluate(async () => (await import('/fire/js/texture.js')).render(document.getElementById('p-free')));
    assert.equal((await hashes()).free, withMark.free, 'an unpinned data-style yields to the page mark');
    await page.evaluate(() => document.getElementById('precedence').remove());

    await page.evaluate(() => {
      const root = document.documentElement;
      ['field', 'mark'].forEach((k) => root.removeAttribute(`data-signature-${k}`));
    });

    // The frame's marks.
    const marks = await page.evaluate(async () => {
      const root = document.documentElement;
      const host = document.createElement('div');
      host.innerHTML = '<div class="fd-frame"><div class="fd-band">a</div><div class="fd-band" id="b1">b</div><div class="fd-band" id="b2" data-marks="dots">c</div></div>';
      document.body.append(host);
      const read = (id) => { const cs = getComputedStyle(document.getElementById(id), '::after'); return { display: cs.display, mask: cs.maskImage || cs.webkitMaskImage }; };
      const out = { crosses: read('b1') };
      root.setAttribute('data-signature-marks', 'none'); out.none = read('b1'); out.noneExplicit = read('b2');
      root.setAttribute('data-signature-marks', 'corners'); out.corners = read('b1'); out.cornersExplicit = read('b2');
      root.removeAttribute('data-signature-marks');
      host.remove();
      return out;
    });
    assert.equal(marks.crosses.display, 'block');
    assert.equal(marks.none.display, 'none');
    assert.equal(marks.noneExplicit.display, 'block', 'a band data-marks wins over the page');
    assert.notEqual(marks.corners.mask, marks.crosses.mask, 'corners change the mask');
    assert.equal(marks.cornersExplicit.mask, marks.noneExplicit.mask, 'an explicit band mark ignores the page');

    // Tweaks: set() writes the attributes, Copy CSS and Copy theme carry them, Reset removes them.
    const tweaks = await page.evaluate(async () => {
      const t = await import('/fire/js/tweaks.js');
      t.set({ signature: { field: 'stipple', mark: 'plus', marks: 'dots', intensity: 1.25 } });
      const root = document.documentElement;
      const attrs = ['field', 'mark', 'marks', 'intensity', 'cell', 'ramp'].map((k) => root.getAttribute(`data-signature-${k}`));
      const css = t.toCss();
      const theme = t.toTheme();
      t.reset();
      const after = ['field', 'mark', 'marks', 'intensity'].map((k) => root.getAttribute(`data-signature-${k}`));
      return { attrs, css, theme, after };
    });
    assert.deepEqual(tweaks.attrs, ['stipple', 'plus', 'dots', '1.25', null, null]);
    assert.match(tweaks.css, /data-signature-field="stipple"/);
    assert.match(tweaks.css, /data-signature-marks="dots"/);
    assert.deepEqual(tweaks.theme.signature, { field: 'stipple', mark: 'plus', cell: 'auto', ramp: 'auto', marks: 'dots', intensity: 1.25 });
    assert.deepEqual(tweaks.after, [null, null, null, null]);

    // The panel's Signature section drives the same state.
    await page.click('[data-fd-tweaks-open]');
    await page.click('.fd-tweaks-chips[data-tweak="signature.field"] [data-value="contour"]');
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-signature-field')), 'contour');
    await page.click('.fd-segmented[data-tweak="signature.marks"] [data-value="corners"]');
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-signature-marks')), 'corners');
    await page.click('[data-tweaks-action="reset"]');
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-signature-field')), null);

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});

test('under reduced motion an animated field is one still frame', async () => {
  const server = createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/docs/signature.html`);
    await page.waitForFunction(() => document.querySelector('#fields .fd-ascii[data-fd-ascii="bars"] canvas'));
    await page.locator('#fields .fd-ascii[data-fd-ascii="bars"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const shot = () => page.evaluate(() => document.querySelector('#fields .fd-ascii[data-fd-ascii="bars"] canvas').toDataURL());
    const a = await shot();
    await page.waitForTimeout(1200);
    assert.equal(await shot(), a);
  } finally {
    await browser.close();
    server.close();
  }
});
