// node --test scripts/test/ : pictures in the website grammar (0.8): fd-site-media, the image ground, the treatments
// and the imagery dial.
//   - a picture's place is held before it loads (data-ratio, or its own width and height)
//   - the image ground's text keeps 4.5:1 over a white and a black picture, both scrims, both schemes, 1440 and 375,
//     measured from pixels at rest (transitions off, then the text is made transparent, the section shot, each line
//     compared with what is under it)
//   - dials.imagery through the theme record (validate, expand, record round trip, themeToCss) and the Tweaks panel
//     (the attribute on <html>, toTheme, reset), and a picture's own data-treatment winning over the dial
//   - the lint's img-attrs warning
//   - nothing scrolls sideways at 320
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { validateTheme, expandTheme, themeToCss, toThemeRecord, fromThemeRecord, DIAL_DEFAULTS, DIAL_CHOICES } from '../../fire/js/theme.js';
import { lintText, prepareCatalog } from '../lint-markup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };

const flat = (v) => { const p = new PNG({ width: 48, height: 32 }); for (let i = 0; i < p.data.length; i += 4) { p.data[i] = p.data[i + 1] = p.data[i + 2] = v; p.data[i + 3] = 255; } return PNG.sync.write(p); };
const SOLID = { '/__white.png': flat(255), '/__black.png': flat(0) };

const HERO = (pic, scrim) => `<section class="fd-site-section fd-site-hero" data-layout="start" data-ground="image" data-scrim="${scrim}" id="sec">
  <div class="fd-site-backdrop"><img src="${pic}" alt="" width="1536" height="1024"></div>
  <div class="fd-site-container"><div class="fd-site-head"><p class="fd-site-eyebrow">Web data API</p><h1 class="fd-site-display">Pages in, structured data out.</h1>
  <p class="fd-site-lead">Send a URL and get clean Markdown back in under a second, or JSON that matches your schema.</p>
  <div class="fd-site-head-actions"><a class="fd-btn" data-variant="primary" data-size="lg" href="#">Start free</a><a class="fd-btn" data-size="lg" href="#">Read the docs</a></div>
  <p class="fd-site-hero-note">No card needed. 1,000 free credits a month.</p></div></div></section>`;

const page = (body, { theme = 'light', imagery = '' } = {}) => `<!doctype html><html lang="en" data-theme="${theme}"${imagery ? ` data-imagery="${imagery}"` : ''}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>imagery test</title><link rel="stylesheet" href="/fire/fire.css">
<script type="module" src="/fire/fire.js"></script></head><body><div class="fd-site" id="site"><main>${body}</main></div></body></html>`;

async function serve(pages) {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/__never.jpg') return; // a picture that never arrives
    if (SOLID[url]) { res.writeHead(200, { 'content-type': 'image/png' }); res.end(SOLID[url]); return; }
    if (pages[url]) { res.writeHead(200, { 'content-type': 'text/html' }); res.end(pages[url]); return; }
    const file = path.join(ROOT, url);
    try {
      if (!file.startsWith(ROOT)) throw new Error('outside');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  server.base = `http://127.0.0.1:${server.address().port}`;
  return server;
}

/* ---------- the theme record, in Node ---------- */
test('dials.imagery: default, choices, validation, expansion, record round trip, themeToCss', () => {
  assert.equal(DIAL_DEFAULTS.imagery, 'natural');
  assert.deepEqual(DIAL_CHOICES.imagery, ['natural', 'mono', 'duotone', 'wash']);
  assert.equal(validateTheme({ dials: { imagery: 'duotone' } }).ok, true);
  const bad = validateTheme({ dials: { imagery: 'sepia' } });
  assert.equal(bad.ok, false);
  assert.match(bad.errors.join(), /\/dials\/imagery/);
  assert.equal(expandTheme({ dials: { imagery: 'mono' } }).attributes['data-imagery'], 'mono');
  assert.equal('data-imagery' in expandTheme({ dials: { imagery: 'natural' } }).attributes, false, 'the default leaves no attribute');
  assert.match(themeToCss({ dials: { imagery: 'wash' } }), /data-imagery="wash"/);
  const record = { palette: 'volt', type: 'terminal', dials: { imagery: 'duotone' } };
  const state = fromThemeRecord(record);
  assert.equal(state.imagery, 'duotone');
  assert.equal(toThemeRecord(state).dials.imagery, 'duotone');
  assert.equal(toThemeRecord({}).dials.imagery, 'natural');
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/theme.schema.json'), 'utf8'));
  assert.deepEqual(schema.properties.dials.properties.imagery.enum, DIAL_CHOICES.imagery, 'the schema lists the same values');
});

test('named looks: each sets imagery, and steady stays natural', () => {
  const dir = path.join(ROOT, 'contract/looks/named');
  const got = Object.fromEntries(fs.readdirSync(dir).map((f) => { const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); return [j.name, j.record.dials.imagery]; }));
  assert.equal(got.steady, 'natural');
  for (const [name, v] of Object.entries(got)) assert.ok(DIAL_CHOICES.imagery.includes(v), `${name}: ${v}`);
  assert.equal(new Set(Object.values(got)).size, 4, 'the eight looks use all four treatments');
});

/* ---------- the lint ---------- */
test('lint: img-attrs warns for a site picture without alt, width or height', () => {
  const catalog = prepareCatalog(JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/catalog.json'), 'utf8')));
  const lint = (t) => lintText('a.html', t, catalog).filter((f) => f.rule === 'img-attrs');
  const ok = lint('<div class="fd-site"><figure class="fd-site-media" data-ratio="photo"><img src="a.jpg" alt="A desk" width="1536" height="1024"></figure><div class="fd-site-backdrop"><img src="b.jpg" alt="" width="10" height="10"></div></div>');
  assert.deepEqual(ok, []);
  const found = lint('<div class="fd-site"><main><img src="a.jpg" width="1" height="1"><figure class="fd-site-media"><img src="b.jpg" alt="B"></figure></main></div>');
  assert.equal(found.length, 2);
  assert.ok(found.every((f) => f.severity === 'warning' && f.message && f.fix));
  assert.match(found[0].message, /alt/);
  assert.match(found[1].message, /width, height/);
  assert.deepEqual(lint('<p><img src="a.jpg"></p>'), [], 'only inside .fd-site');
});

/* ---------- in Chromium ---------- */
test('browser: ratio before load, the ground over white and black, the dial and the override, 320 wide', async () => {
  const media = `<section class="fd-site-section"><div class="fd-site-container">
    <figure class="fd-site-media" data-ratio="photo" id="m-photo"><img src="/__never.jpg" alt="Never arrives" width="1536" height="1024"></figure>
    <figure class="fd-site-media" id="m-own"><img src="/__never.jpg" alt="Never arrives" width="1536" height="1024"></figure>
    <figure class="fd-site-media" data-ratio="tall" id="m-tall"><img src="/__never.jpg" alt="Never arrives" width="1536" height="1024"></figure>
    <figure class="fd-site-media" id="m-dial"><img src="/templates/media/desk.jpg" alt="A desk" width="1536" height="1024"></figure>
    <figure class="fd-site-media" data-treatment="natural" id="m-natural"><img src="/templates/media/desk.jpg" alt="A desk" width="1536" height="1024"></figure>
    <figure class="fd-site-media" data-treatment="duotone" id="m-duo"><img src="/templates/media/desk.jpg" alt="A desk" width="1536" height="1024"></figure>
  </div></section>`;
  const pages = {
    '/media.html': page(media, { imagery: 'mono' }),
    '/tweaks.html': page('<p>tweaks</p>'),
    '/narrow.html': page(`${HERO('/templates/media/desk.jpg', 'dark')}${media}
      <section class="fd-site-section fd-site-cta" data-layout="band" data-ground="image"><div class="fd-site-backdrop"><img src="/templates/media/ridge.jpg" alt="" width="1536" height="1024"></div>
      <div class="fd-site-container"><div class="fd-site-head"><h2 class="fd-site-title">Read your first page in 2 minutes.</h2><p class="fd-site-lead">1,000 free credits a month.</p></div>
      <div class="fd-site-head-actions"><a class="fd-btn" data-variant="primary" href="#">Start free</a><a class="fd-btn" href="#">See pricing</a></div></div></section>`),
  };
  for (const theme of ['light', 'dark']) for (const pic of ['white', 'black']) for (const scrim of ['dark', 'light']) pages[`/g-${theme}-${pic}-${scrim}.html`] = page(HERO(`/__${pic}.png`, scrim), { theme });
  const server = await serve(pages);
  const browser = await chromium.launch();
  try {
    /* ratio held before the picture loads */
    {
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
      const p = await ctx.newPage();
      await p.goto(`${server.base}/media.html`, { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
      const box = (id) => p.evaluate((id) => { const r = document.querySelector(`#${id} > img`).getBoundingClientRect(); return { w: r.width, h: r.height, done: document.querySelector(`#${id} > img`).complete }; }, id);
      const photo = await box('m-photo');
      assert.equal(photo.done, false, 'the picture has not arrived');
      assert.ok(photo.w > 0 && Math.abs(photo.h - photo.w * 3 / 4) < 1, `photo holds 4:3 before load: ${JSON.stringify(photo)}`);
      const own = await box('m-own');
      assert.ok(Math.abs(own.h - own.w * 1024 / 1536) < 1, `no data-ratio: the picture's own shape from width and height ${JSON.stringify(own)}`);
      const tall = await box('m-tall');
      assert.ok(Math.abs(tall.h - tall.w * 3 / 2) < 1, 'tall holds 2:3');

      /* the dial on <html> and a picture's own data-treatment */
      const filter = (id) => p.evaluate((id) => getComputedStyle(document.querySelector(`#${id} > img`)).filter, id);
      assert.match(await filter('m-dial'), /grayscale\(1\)/, 'data-imagery="mono" on <html> treats a picture without its own');
      assert.equal(await filter('m-natural'), 'none', 'data-treatment="natural" wins over the dial');
      assert.match(await filter('m-duo'), /grayscale\(1\) contrast/, 'data-treatment="duotone" wins over the dial');
      assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('m-duo'), '::before').mixBlendMode), 'multiply');
      await ctx.close();
    }

    /* the dial through the Tweaks panel */
    {
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
      const p = await ctx.newPage();
      await p.goto(`${server.base}/tweaks.html`);
      await p.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
      const out = await p.evaluate(async () => {
        const tweaks = await import('/fire/js/tweaks.js');
        const root = document.documentElement;
        const start = root.getAttribute('data-imagery');
        tweaks.set({ imagery: 'wash' });
        const set = root.getAttribute('data-imagery');
        const record = tweaks.toTheme().dials.imagery;
        const css = tweaks.toCss();
        tweaks.open();
        const row = !!document.querySelector('.fd-tweaks .fd-segmented[data-tweak="imagery"] [data-value="duotone"]');
        document.querySelector('.fd-tweaks .fd-segmented[data-tweak="imagery"] [data-value="duotone"]').click();
        const clicked = root.getAttribute('data-imagery');
        tweaks.reset();
        return { start, set, record, css, row, clicked, after: root.getAttribute('data-imagery') };
      });
      assert.equal(out.start, null);
      assert.equal(out.set, 'wash');
      assert.equal(out.record, 'wash');
      assert.match(out.css, /data-imagery="wash"/);
      assert.equal(out.row, true, 'the panel has a Pictures row');
      assert.equal(out.clicked, 'duotone');
      assert.equal(out.after, null, 'reset leaves no attribute');
      await ctx.close();
    }

    /* the image ground: every text line at 4.5:1 over a white and a black picture */
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const worst = [];
    for (const width of [1440, 375]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const p = await ctx.newPage();
      for (const theme of ['light', 'dark']) for (const pic of ['white', 'black']) for (const scrim of ['dark', 'light']) {
        await p.goto(`${server.base}/g-${theme}-${pic}-${scrim}.html`);
        await p.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready') && [...document.images].every((i) => i.complete) && document.fonts.status === 'loaded');
        // at rest, before any colour is read: a transition still running would be measured part of the way
        await p.addStyleTag({ content: '#sec, #sec *, #sec *::before, #sec *::after { transition: none !important; }' });
        const lines = await p.evaluate(() => {
          const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
          const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); return [...cx.getImageData(0, 0, 1, 1).data]; };
          const out = [];
          const w = document.createTreeWalker(document.getElementById('sec'), NodeFilter.SHOW_TEXT);
          for (let n; (n = w.nextNode());) {
            const el = n.parentElement;
            // the primary button is opaque and holds its own contrast (the palette check); everything else stands on the picture
            if (!n.textContent.trim() || el.closest('.fd-btn[data-variant="primary"]')) continue;
            const r = document.createRange(); r.selectNodeContents(n);
            for (const q of r.getClientRects()) if (q.width > 2) out.push({ x: q.left, y: q.top + scrollY, w: q.width, h: q.height, color: rgba(getComputedStyle(el).color), text: n.textContent.trim().slice(0, 20) });
          }
          return out;
        });
        assert.ok(lines.length >= 6, `the text lines were found (${lines.length})`);
        await p.addStyleTag({ content: '#sec, #sec * { color: transparent !important; } #sec svg { visibility: hidden }' });
        const png = PNG.sync.read(await p.screenshot({ fullPage: true }));
        for (const ln of lines) {
          const [tr, tg, tb, ta] = ln.color; const a = ta / 255;
          let min = Infinity;
          for (let y = Math.max(0, Math.floor(ln.y)); y < Math.min(png.height, Math.ceil(ln.y + ln.h)); y++) {
            for (let x = Math.max(0, Math.floor(ln.x)); x < Math.min(png.width, Math.ceil(ln.x + ln.w)); x++) {
              const i = (y * png.width + x) * 4; const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
              const L1 = lum(tr * a + r * (1 - a), tg * a + g * (1 - a), tb * a + b * (1 - a)); const L2 = lum(r, g, b);
              min = Math.min(min, (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05));
            }
          }
          if (min < 4.5) worst.push(`${width} ${theme} page, ${scrim} scrim, ${pic} picture: "${ln.text}" ${min.toFixed(2)}`);
        }
      }
      await ctx.close();
    }
    assert.deepEqual(worst, [], 'every text line at 4.5:1 or more');

    /* 320 wide: nothing scrolls sideways */
    {
      const ctx = await browser.newContext({ viewport: { width: 320, height: 800 } });
      const p = await ctx.newPage();
      await p.goto(`${server.base}/narrow.html`, { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
      const band = await p.evaluate(() => {
        const s = document.getElementById('sec'); const b = s.querySelector('.fd-site-backdrop').getBoundingClientRect(); const h = s.querySelector('.fd-site-eyebrow').getBoundingClientRect();
        return { backdropEnd: b.bottom, textStart: h.top };
      });
      assert.ok(band.backdropEnd <= band.textStart + 1, `below desktop the picture ends before the text starts ${JSON.stringify(band)}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
