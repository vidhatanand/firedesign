// node --test scripts/test/skeleton.test.mjs : loading screens (0.13).
//   - The skeleton bars read in every palette, light and dark: the fill is clearly stronger than the hairline of its
//     theme, and the soft fill (a table head, axis ticks) is no fainter than the fill was before 0.13.
//   - fire/js/skeleton.js returns the markup texture.js writes, a filled preset is left alone, and with boot.js and no
//     module its widths are right at first paint. An empty fd-skeleton-text[data-lines] draws its lines with CSS at the
//     height of the filled ones.
//   - fd-skeleton-app has the shell's geometry at 1440 and 375, and nothing overflows at 320.
//   - In a loading region a skeleton waits --fd-skeleton-delay with its space held; the late line shows after
//     --fd-skeleton-late, is written once (a polite status), and resets when loading ends. With reduced motion too.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skeleton, skeletonApp, skeletonParts, SKELETON_PRESETS } from '../../fire/js/skeleton.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' };
const PALETTES = [...new Set(fs.readFileSync(path.join(ROOT, 'fire/palettes.css'), 'utf8').match(/data-palette="([a-z-]+)"/g).map((s) => s.slice(14, -1)))];
const { chromium } = await import('playwright-core');

const head = (modules) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/fire/fire.css"><script src="/fire/boot.js"></script>
${modules ? '<script type="module">import { init, texture } from "/fire/fire.js"; window.texture = texture; init(document); window.ready = true;</script>' : ''}</head>`;

async function withPage(body, fn, { modules = true, reducedMotion = 'no-preference', width = 1280, height = 800 } = {}) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ reducedMotion, viewport: { width, height } });
    const page = await context.newPage();
    await page.route('http://fire.localhost/**', (route) => {
      const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
      if (rel === 'index.html') return route.fulfill({ contentType: 'text/html', body: `${head(modules)}<body>${body}</body></html>` });
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
    });
    await page.goto('http://fire.localhost/index.html');
    if (modules) await page.waitForFunction(() => window.ready === true);
    await fn(page);
  } finally { await browser.close(); }
}

/* ---------- contrast ---------- */

// The contrast of a part's background over the ground it sits on, and of the theme's hairline over the page.
const MEASURE = () => {
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const g = c.getContext('2d', { willReadFrequently: true });
  const over = (...colours) => { g.clearRect(0, 0, 1, 1); for (const col of colours) { g.fillStyle = col; g.fillRect(0, 0, 1, 1); } return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3); };
  const lum = (rgb) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bg = (el) => getComputedStyle(el).backgroundColor;
  const pageBg = bg(document.body);
  const on = (bar, ...grounds) => ratio(over(pageBg, ...grounds), over(pageBg, ...grounds, bg(bar)));
  const list = document.querySelector('#list');
  const table = document.querySelector('#table');
  const probe = document.createElement('span'); probe.style.color = 'var(--fd-line)'; document.body.append(probe);
  const line = ratio(over(pageBg), over(pageBg, getComputedStyle(probe).color)); probe.remove();
  return {
    page: on(document.querySelector('#bar')),
    surface: on(list.querySelector('.fd-skeleton-title'), bg(list)),
    soft: on(table.querySelector('.fd-skeleton-table-head .fd-skeleton'), bg(table)),
    line,
  };
};

test('skeleton bars read in every palette, light and dark, with reduced motion (still bars)', async () => {
  const body = `<main class="fd-page"><div class="fd-frame"><section class="fd-band"><span id="bar" class="fd-skeleton-title" data-size="h2"></span>
    ${skeleton('list', { rows: 2 }).replace('<div', '<div id="list"')}${skeleton('table', { rows: 2 }).replace('<div', '<div id="table"')}</section></div></main>`;
  await withPage(body, async (page) => {
    const low = [];
    for (const palette of PALETTES) for (const theme of ['light', 'dark']) {
      await page.evaluate(([p, t]) => { document.documentElement.dataset.palette = p; document.documentElement.dataset.theme = t; }, [palette, theme]);
      const m = await page.evaluate(MEASURE);
      // Floors: the fill near 1.25:1 in light and 1.45:1 in dark, and above the hairline of the same theme; the soft
      // fill no fainter than the 0.12 bar (1.13:1 light, 1.22:1 dark).
      const floor = theme === 'light' ? { fill: 1.22, soft: 1.13 } : { fill: 1.45, soft: 1.22 };
      for (const [name, value] of [['page', m.page], ['surface', m.surface]]) {
        if (value < floor.fill) low.push(`${palette} ${theme}: the fill on the ${name} is ${value.toFixed(3)}:1, under ${floor.fill}`);
        if (value < m.line + 0.03) low.push(`${palette} ${theme}: the fill on the ${name} (${value.toFixed(3)}) is not clearly above the hairline (${m.line.toFixed(3)})`);
      }
      if (m.soft < floor.soft) low.push(`${palette} ${theme}: the soft fill is ${m.soft.toFixed(3)}:1, under ${floor.soft}`);
    }
    assert.deepEqual(low, []);
    // Reduced motion: no sweep on the bars, and they are as strong as with motion.
    const still = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#bar')); return { image: s.backgroundImage, animation: s.animationName }; });
    assert.equal(still.image, 'none');
    assert.equal(still.animation, 'none');
  }, { reducedMotion: 'reduce' });
});

test('with motion the bars sweep: a sheen over the fill', async () => {
  await withPage('<span id="bar" class="fd-skeleton-title" data-size="h2"></span>', async (page) => {
    const s = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('#bar')); return { image: c.backgroundImage, animation: c.animationName }; });
    assert.match(s.image, /linear-gradient/);
    assert.equal(s.animation, 'fd-shimmer');
  });
});

/* ---------- markup ahead of time ---------- */

test('skeleton.js: every preset as a string; unknown presets throw; numbers are clamped', () => {
  for (const name of SKELETON_PRESETS) {
    const html = skeleton(name);
    assert.match(html, new RegExp(`^<div class="fd-skeleton-${name}"`));
    assert.ok(html.includes(skeletonParts(name)), name);
    assert.equal(html.includes('aria-hidden="true"'), name !== 'text', name);
  }
  assert.throws(() => skeleton('spinner'), /unknown preset/);
  assert.equal((skeletonParts('table', { rows: 99, cols: 2 }).match(/fd-skeleton-table-row/g) || []).length, 40);
  assert.equal((skeletonParts('text', { lines: 'x' }).match(/<span>/g) || []).length, 3);
  assert.match(skeleton('chart', { variant: 'bars' }), /data-variant="bars"/);
  const app = skeletonApp({ preset: 'list', rows: 3, nav: 4, tabbar: 5, label: 'Loading "Ember"' });
  assert.match(app, /^<div class="fd-skeleton-app" role="status" aria-label="Loading &quot;Ember&quot;">/);
  assert.equal((app.match(/<i><\/i>/g) || []).length, 4 + 4 + 5);
  assert.match(app, /fd-skeleton-list" data-rows="3"/);
  assert.doesNotMatch(skeletonApp(), /fd-skeleton-app-tabbar/);
});

// 0.13.1: the markup is written into a page's static HTML, so it has to pass the lint a product runs on that page.
// Four presets (chart, thread, form, page) wrote pixel widths into data-fd-vars, which the lint reports as no-raw-px.
test('skeleton() and skeletonApp() write markup that passes the markup lint: no pixel value, only declared width tokens', async () => {
  const { lintText } = await import('../lint-markup.mjs');
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/catalog.json'), 'utf8'));
  const css = fs.readFileSync(path.join(ROOT, 'fire/components/skeleton.css'), 'utf8');
  const page = (body) => `<!doctype html><html lang="en" data-fd-surface="app"><body>${body}</body></html>`;
  const outputs = [
    ...SKELETON_PRESETS.map((p) => [p, skeleton(p, { rows: 4 })]),
    ...SKELETON_PRESETS.map((p) => [`app with ${p}`, skeletonApp({ preset: p, nav: 9, tabbar: 5, rows: 4 })]),
  ];
  let tokens = 0;
  for (const [name, html] of outputs) {
    assert.doesNotMatch(html, /\d(?:\.\d+)?px/, `${name}: no pixel value`);
    assert.doesNotMatch(html, /\sstyle=/, `${name}: no style attribute`);
    for (const m of html.matchAll(/var\((--fd-skeleton-w-\d+)\)/g)) {
      tokens += 1;
      assert.match(css, new RegExp(`^\\s*${m[1]}: \\d+px;`, 'm'), `${name}: ${m[1]} is declared in skeleton.css`);
    }
    const errors = lintText(`${name}.html`, page(name.startsWith('app') ? html : `<main class="fd-page">${html}</main>`), catalog, 'html').filter((x) => x.severity === 'error');
    assert.deepEqual(errors.map((x) => `${x.rule}: ${x.message}`), [], `${name} lints clean`);
  }
  assert.ok(tokens >= 11, 'the fixed widths are still written (as tokens)');
  // Every width token the stylesheet declares is one a preset uses: none is left behind.
  const used = new Set(outputs.flatMap(([, html]) => [...html.matchAll(/--fd-skeleton-w-\d+/g)].map((m) => m[0])));
  for (const m of css.matchAll(/^\s*(--fd-skeleton-w-\d+):/gm)) assert.ok(used.has(m[1]), `${m[1]} is used by a preset`);
});

test('texture.js writes the same markup as skeleton.js, and leaves a filled preset alone', async () => {
  const empty = SKELETON_PRESETS.map((name) => `<div class="fd-skeleton-${name}" data-kind="${name}"${name === 'text' ? ' data-lines="4"' : ''}></div>`).join('');
  await withPage(`<div id="empty">${empty}</div><div id="filled">${SKELETON_PRESETS.map((name) => skeleton(name, name === 'text' ? { lines: 4 } : {})).join('')}</div>`, async (page) => {
    const shape = await page.evaluate(() => {
      const walk = (el) => `${el.tagName}.${el.className}[${el.getAttribute('style') || ''}](${[...el.children].map(walk).join(',')})`;
      return { empty: [...document.querySelector('#empty').children].map(walk), filled: [...document.querySelector('#filled').children].map(walk) };
    });
    assert.deepEqual(shape.empty, shape.filled);
    // A preset written filled keeps its own children: init does not rebuild it.
    const kept = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'fd-skeleton-list'; el.innerHTML = '<div class="fd-skeleton-list-row" id="mine"></div>';
      document.body.append(el); window.texture.init(el);
      return el.children.length === 1 && el.firstElementChild.id === 'mine';
    });
    assert.equal(kept, true);
  });
});

test('with boot.js and no module, a filled preset has its widths at first paint, and empty text lines draw with CSS', async () => {
  const lines = [1, 2, 3, 5, 8].map((n) => `<div class="fd-skeleton-text" data-lines="${n}" data-n="${n}"></div>`).join('');
  await withPage(`<div class="fd-frame">${skeleton('table', { rows: 2, cols: 3 })}<div id="lines">${lines}</div></div>`, async (page) => {
    const widths = await page.evaluate(() => [...document.querySelectorAll('.fd-skeleton-table-row:first-of-type .fd-skeleton, .fd-skeleton-table-row .fd-skeleton')].slice(0, 3).map((bar) => {
      const cell = bar.parentElement.getBoundingClientRect().width;
      return { left: bar.hasAttribute('data-fd-vars'), share: Math.round(bar.getBoundingClientRect().width / cell * 100), want: parseInt(bar.style.getPropertyValue('--_sk-w'), 10) };
    }));
    for (const w of widths) { assert.equal(w.left, false); assert.ok(Math.abs(w.share - w.want) <= 1, JSON.stringify(w)); }
    const css = await page.evaluate(() => [...document.querySelectorAll('#lines > *')].map((el) => {
      const lh = parseFloat(getComputedStyle(el).getPropertyValue('--_sk-lh')) || parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fd-lh-md')) * 16;
      return { n: Number(el.dataset.n), height: el.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(el, '::after').height) > 0, last: getComputedStyle(el, '::after').backgroundColor, first: getComputedStyle(el, '::before').display };
    }));
    const lh = await page.evaluate(() => { const p = document.createElement('p'); p.style.lineHeight = 'var(--fd-lh-md)'; document.body.append(p); const v = parseFloat(getComputedStyle(p).lineHeight); p.remove(); return v; });
    for (const line of css) {
      assert.equal(line.height, line.n * lh, `data-lines=${line.n}`);
      assert.ok(line.lh && line.last !== 'rgba(0, 0, 0, 0)', `data-lines=${line.n} draws its last line`);
      assert.equal(line.first, line.n === 1 ? 'none' : 'block');
    }
  }, { modules: false });
});

test('an empty text skeleton keeps its height when the script fills it', async () => {
  await withPage('<div class="fd-skeleton-text" data-lines="5" id="t"></div>', async (page) => {
    const filled = await page.evaluate(() => ({ children: document.querySelector('#t').children.length, height: document.querySelector('#t').getBoundingClientRect().height }));
    assert.equal(filled.children, 5);
    const lh = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#t > span')).height));
    assert.equal(filled.height, 5 * lh);
  });
});

/* ---------- the first-load app skeleton ---------- */

test('fd-skeleton-app has the shell\'s geometry at 1440 and 375, with no module', async () => {
  const body = skeletonApp({ preset: 'table', tabbar: 5 });
  await withPage(body, async (page) => {
    const g = await page.evaluate(() => {
      const box = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
      const px = (name) => { const p = document.createElement('div'); p.style.width = `var(${name})`; document.body.append(p); const v = p.getBoundingClientRect().width; p.remove(); return v; };
      return { side: box('.fd-skeleton-app-side'), top: box('.fd-skeleton-app-top'), tabbar: getComputedStyle(document.querySelector('.fd-skeleton-app-tabbar')).display, sw: px('--fd-sidebar-w'), th: px('--fd-topbar-h') };
    });
    assert.deepEqual(g.side.slice(0, 3), [0, 0, g.sw]);
    assert.deepEqual([g.top[0], g.top[1], g.top[3]], [g.sw, 0, g.th]);
    assert.equal(g.tabbar, 'none');
  }, { modules: false, width: 1440, height: 900 });
  await withPage(body, async (page) => {
    const g = await page.evaluate(() => ({
      side: getComputedStyle(document.querySelector('.fd-skeleton-app-side')).display,
      tabbar: document.querySelector('.fd-skeleton-app-tabbar').getBoundingClientRect().bottom,
      top: document.querySelector('.fd-skeleton-app-top').getBoundingClientRect().x,
    }));
    assert.equal(g.side, 'none');
    assert.equal(g.tabbar, 812);
    assert.equal(g.top, 0);
  }, { modules: false, width: 375, height: 812 });
  await withPage(body, async (page) => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
  }, { modules: false, width: 320, height: 640 });
});

/* ---------- the wait and the late line ---------- */

for (const reducedMotion of ['no-preference', 'reduce']) {
  test(`a loading region shows its skeleton after --fd-skeleton-delay, its space held (${reducedMotion})`, async () => {
    const body = `<p>Before</p><div id="swap" data-fd-loading="false">${skeleton('list', { rows: 3 })}<ul><li>Maya Reyes</li></ul></div><p id="after">After</p>
      <div class="fd-states" id="states" data-state="ready"><div data-when="loading">${skeleton('table', { rows: 2 })}</div><div data-when="ready">Ready</div></div>`;
    await withPage(body, async (page) => {
      const read = () => page.evaluate(() => ({
        list: Number(getComputedStyle(document.querySelector('#swap > .fd-skeleton-list')).opacity),
        table: Number(getComputedStyle(document.querySelector('#states > [data-when="loading"]')).opacity),
        after: document.querySelector('#after').getBoundingClientRect().top,
      }));
      await page.evaluate(() => { window.texture.setLoading(document.querySelector('#swap'), true); document.querySelector('#states').dataset.state = 'loading'; });
      await page.waitForTimeout(50);
      const early = await read();
      assert.equal(early.list, 0);
      assert.equal(early.table, 0);
      await page.waitForTimeout(400);
      const late = await read();
      assert.equal(late.list, 1);
      assert.equal(late.table, 1);
      assert.equal(late.after, early.after, 'nothing moves when the skeleton appears');
      // 0s turns the wait off.
      await page.evaluate(() => { const s = document.querySelector('#swap'); s.style.setProperty('--fd-skeleton-delay', '0s'); window.texture.setLoading(s, false); });
      await page.waitForTimeout(400);
      await page.evaluate(() => window.texture.setLoading(document.querySelector('#swap'), true));
      await page.waitForTimeout(60);
      assert.ok((await read()).list > 0, 'no wait with 0s');
    }, { reducedMotion });
  });

  test(`the late line: hidden, then shown and written once, then reset when loading ends (${reducedMotion})`, async () => {
    const body = `<div id="swap" data-fd-loading="true" data-fd-vars="--fd-skeleton-late: 400ms"><p class="fd-skeleton-late" id="late">Still loading. This is taking longer than usual.</p>${skeleton('list', { rows: 2 })}<div>Done</div></div>`;
    await withPage(body, async (page) => {
      await page.evaluate(() => {
        window.writes = 0;
        new MutationObserver((records) => { for (const r of records) if (r.type === 'childList' && r.addedNodes.length) window.writes++; }).observe(document.querySelector('#late [role="status"]'), { childList: true });
      });
      const read = () => page.evaluate(() => { const el = document.querySelector('#late'); const status = el.querySelector('[role="status"]'); return { visibility: getComputedStyle(el).visibility, text: status.textContent, live: status.getAttribute('role'), writes: window.writes, list: document.querySelector('.fd-skeleton-list').getBoundingClientRect().top }; });
      const first = await read();
      assert.deepEqual([first.visibility, first.text, first.live], ['hidden', '', 'status']);
      await page.waitForTimeout(700);
      const shown = await read();
      assert.deepEqual([shown.visibility, shown.text, shown.writes], ['visible', 'Still loading. This is taking longer than usual.', 1]);
      assert.equal(shown.list, first.list, 'the skeleton does not move when the line shows');
      await page.waitForTimeout(500);
      assert.equal((await read()).writes, 1, 'announced once');
      await page.evaluate(() => window.texture.setLoading(document.querySelector('#swap'), false));
      await page.waitForTimeout(50);
      const done = await read();
      assert.deepEqual([done.text, await page.evaluate(() => document.querySelector('#late').dataset.fdLate)], ['', 'wait']);
      await page.evaluate(() => window.texture.setLoading(document.querySelector('#swap'), true));
      await page.waitForTimeout(150);
      assert.equal((await read()).visibility, 'hidden', 'the next load waits again');
      await page.waitForTimeout(600);
      const again = await read();
      assert.deepEqual([again.visibility, again.writes], ['visible', 2]);
    }, { reducedMotion });
  });
}

test('without script the late line still shows by CSS once the time has passed', async () => {
  const body = '<div class="fd-skeleton-app" data-fd-vars="--fd-skeleton-late: 300ms"><p class="fd-skeleton-late" id="late">Still loading.</p></div>';
  await withPage(body, async (page) => {
    const vis = () => page.evaluate(() => getComputedStyle(document.querySelector('#late')).visibility);
    assert.equal(await vis(), 'hidden');
    await page.waitForTimeout(700);
    assert.equal(await vis(), 'visible');
  }, { modules: false });
});
