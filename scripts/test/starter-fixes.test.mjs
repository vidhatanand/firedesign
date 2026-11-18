// Fixes the starters found in Fire 0.6: fd-chart drawn the same whenever a parent's init runs, charts that follow
// every font load, and the catalogue's free icon attribute. (render-equal's and lint-markup's own fixes are tested in
// render-equal.test.mjs and lint-markup.test.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from '../render-equal.mjs';
import { lintText } from '../lint-markup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/fire/fire.css">
<script type="module">
  import * as fire from '/fire/fire.js';
  import '/fire/elements.js';
  window.fire = fire;
  document.documentElement.dataset.testReady = '';
</script></head><body><main class="fd-page"></main></body></html>`;

async function withPage(fn) {
  const server = await startServer(ROOT);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
    const origin = `http://127.0.0.1:${server.port}`;
    await page.route(`${origin}/__test.html`, (route) => route.fulfill({ body: PAGE, contentType: 'text/html' }));
    await page.goto(`${origin}/__test.html`);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-test-ready'));
    return await fn(page);
  } finally {
    await browser.close();
    await server.close();
  }
}

const SAMPLES = {
  area: { labels: ['Mon', 'Tue', 'Wed', 'Thu'], series: [{ name: 'Credits', values: [3, 8, 5, 9] }] },
  bar: { labels: ['Mon', 'Tue', 'Wed'], series: [{ name: 'Runs', values: [12, 4, 7] }] },
  sparkline: [3, 5, 4, 8, 6],
  donut: { segments: [{ label: '/scrape', value: 40 }, { label: '/crawl', value: 25 }] },
  heatgrid: { start: '2026-06-29', values: [0, 3, 8, 1, 0, 12, 5, 2, 9] },
};

test('fd-chart: init(parent) before or after the first update, or data set late, gives the same drawing', async () => {
  const results = await withPage((page) => page.evaluate(async (samples) => {
    // Settled: Fire's resize redraw (80 ms) and the frame that clears a tooltip's data-snap have run.
    const frame = () => new Promise((r) => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 150));
    // The drawing: elements with their attributes as a set and text, without comments (Lit's markers), with the
    // counters Fire puts in generated ids (fd-area-3) taken out.
    const snap = (node) => {
      if (node.nodeType === 3) return node.data;
      if (node.nodeType !== 1) return '';
      const attrs = [...node.attributes].map((a) => `${a.name}=${a.value}`).sort().join(' ');
      return `<${node.localName} ${attrs}>${[...node.childNodes].map(snap).join('')}</>`.replace(/fd-(area|spark)-[0-9a-z]+/g, 'fd-$1-#');
    };
    const make = (type, data) => {
      const host = document.createElement('div');
      host.className = 'fd-card';
      document.querySelector('main').append(host);
      const el = document.createElement('fd-chart');
      el.setAttribute('type', type);
      if (type === 'area' || type === 'bar') el.setAttribute('height', '200');
      if (data !== undefined) el.data = data;
      return { host, el };
    };
    const out = {};
    for (const [type, data] of Object.entries(samples)) {
      const runs = {};
      // init after the element's first update (what happens when the parent waits)
      { const { host, el } = make(type, data); host.append(el); await el.updateComplete; window.fire.init(host); await frame(); runs.after = snap(el); }
      // init before it: a Lit parent's firstUpdated, a Vue mounted hook
      { const { host, el } = make(type, data); host.append(el); window.fire.init(host); await el.updateComplete; await frame(); runs.before = snap(el); }
      // init before it, with the data set between connection and the first update
      { const { host, el } = make(type); host.append(el); window.fire.init(host); el.data = data; await el.updateComplete; await frame(); runs.between = snap(el); }
      // connected and drawn without data, then given data
      { const { host, el } = make(type); host.append(el); window.fire.init(host); await el.updateComplete; await frame(); runs.emptyFirst = snap(el); el.data = data; await el.updateComplete; await frame(); runs.late = snap(el); }
      out[type] = runs;
    }
    return out;
  }, SAMPLES));
  for (const [type, runs] of Object.entries(results)) {
    assert.match(runs.after, /<svg|fd-heatgrid-grid/, `${type}: drawn`);
    assert.doesNotMatch(runs.after, /data-state=empty/, `${type}: not empty`);
    assert.equal(runs.before, runs.after, `${type}: init before the first update`);
    assert.equal(runs.between, runs.after, `${type}: data set after an early init`);
    assert.equal(runs.late, runs.after, `${type}: data set after an empty first draw`);
  }
  assert.match(results.area.emptyFirst, /data-state=empty/);
});

test('charts redraw when fonts finish loading, also for a chart first drawn after the page\'s fonts were ready', async () => {
  const redrawn = await withPage((page) => page.evaluate(async (data) => {
    await document.fonts.ready;
    const el = document.createElement('fd-chart');
    el.setAttribute('type', 'line');
    el.data = data;
    document.querySelector('main').append(el);
    await el.updateComplete;
    // The chart's labels start loading the page's fonts, which redraws it once they are in; wait for that first.
    await new Promise((r) => setTimeout(r, 50));
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 150));
    const plot = el.querySelector('.fd-chart-plot');
    let draws = 0;
    const watch = new MutationObserver(() => { draws++; });
    watch.observe(plot, { childList: true });
    // No new font: nothing to lay out again.
    document.fonts.dispatchEvent(new Event('loadingdone'));
    await new Promise((r) => setTimeout(r, 50));
    const idle = draws;
    // A font loads later (a route that uses another type set): one relayout, though both `loadingdone` and `ready` fire.
    const face = new FontFace('Fire test face', 'url(/fire/fonts/archivo-latin-wght-normal.woff2)');
    document.fonts.add(face);
    await face.load();
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 50));
    watch.disconnect();
    return { idle, draws };
  }, SAMPLES.area));
  assert.deepEqual(redrawn, { idle: 0, draws: 1 });
});

test('catalogue: data-icon takes any name wherever it is listed, so the static SVG form lints clean', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/catalog.json'), 'utf8'));
  const listed = [];
  for (const c of catalog.components) {
    for (const attrs of [c.attributes, c.stateAttributes, ...Object.values(c.partAttributes ?? {})]) {
      if (attrs?.['data-icon']) listed.push([c.id, attrs['data-icon']]);
    }
  }
  assert.ok(listed.some(([id]) => id === 'icon'), 'svg.fd-icon lists data-icon');
  for (const [id, values] of listed) assert.deepEqual(values, ['*'], id);
  const html = '<span class="fd-badge"><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg>Ok</span>' +
    '<button class="fd-badge-remove" aria-label="Remove"><svg class="fd-icon fd-badge-remove" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>' +
    '<li class="fd-menu-item" data-icon="search">Search</li><svg class="fd-icon" data-icon="nope"></svg>';
  assert.deepEqual(lintText('a.html', html, catalog).map((f) => f.rule), ['unknown-icon']);
});

test('fire/js/icons.d.ts types the module a server component imports for the sprite (N8)', () => {
  const run = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--target', 'es2022',
    '--module', 'nodenext', '--moduleResolution', 'nodenext', '--lib', 'es2022,dom,dom.iterable', 'scripts/test/icons-usage.ts'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});
