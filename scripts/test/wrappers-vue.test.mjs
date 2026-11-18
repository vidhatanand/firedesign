// node --test scripts/test/ : the Vue wrapper (fire-design/vue).
//   - the generated types are current (build-wrappers-vue.mjs --check)
//   - the types compile in a usage project with vue-tsc (from starters/vue-vite/node_modules; skipped until the
//     starter's dependencies are installed), and wrong values are rejected
//   - in Chromium, with Vue's browser build, the plugin and the v-fire directive work: fd- tags are elements, data
//     goes in as a property, @fd:change is heard, v-fire runs Fire on mount and on update, and the router hook runs
//     Fire after a route change
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STARTER = path.join(ROOT, 'starters/vue-vite');
const VUE_TSC = path.join(STARTER, 'node_modules/.bin/vue-tsc');
const hasVue = existsSync(VUE_TSC) && existsSync(path.join(STARTER, 'node_modules/vue/package.json'));

test('generated types are current', () => {
  const run = spawnSync(process.execPath, ['scripts/build-wrappers-vue.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr + run.stdout);
});

test('the types compile in a usage file, and wrong values are rejected', { skip: hasVue ? false : 'run npm install in starters/vue-vite' }, () => {
  const tsc = (project) => spawnSync(VUE_TSC, ['--noEmit', '-p', path.join(ROOT, 'scripts/test/vue-usage', project)], { cwd: STARTER, encoding: 'utf8' });
  const ok = tsc('tsconfig.json');
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const bad = tsc('tsconfig.negative.json');
  assert.notEqual(bad.status, 0, 'Neg.vue must not compile');
  const errors = (bad.stdout.match(/Neg\.vue\(\d+,\d+\): error TS\d+/g) ?? []).map((m) => m.match(/\((\d+),/)[1]);
  // line 3: an unknown chart type; 4: an unknown icon size; 5: a number for `code`; 6: a handler with the wrong event type
  assert.deepEqual(errors, ['3', '4', '5', '6'], bad.stdout);
});

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function serve() {
  const server = createServer(async (req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    try {
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(file));
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('in Chromium the plugin and the v-fire directive work', { skip: hasVue ? false : 'run npm install in starters/vue-vite' }, async () => {
  const server = await serve();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/scripts/test/vue-fixtures/page.html`);
    await page.waitForFunction(() => window.ready === true);
    assert.deepEqual(errors, []);

    const result = await page.evaluate(() => ({ warnings: window.result.warnings, whitespace: window.result.whitespace, hasDirective: window.result.hasDirective,
      routes: window.result.routes.length, fd: window.result.isFireElement('fd-chart'), other: window.result.isFireElement('my-chart') }));
    assert.deepEqual(result.warnings, [], 'Vue warned (an fd- tag was looked up as a component?)');
    assert.equal(result.whitespace, 'preserve');
    assert.equal(result.hasDirective, true);
    assert.equal(result.routes, 1);
    assert.equal(result.fd, true);
    assert.equal(result.other, false);

    // fd- tags are elements, and `data` went in as a property: the chart drew itself, with no data="[object Object]" attribute
    assert.equal(await page.locator('#chart').getAttribute('data'), null);
    await page.waitForSelector('#chart svg');
    assert.equal(await page.locator('#chart').evaluate((el) => el.data.series[0].name), 'Runs');
    await page.waitForSelector('#icon svg');

    // v-fire ran Fire on mount: the <i data-icon> became an svg
    assert.equal(await page.locator('#inner i[data-icon]').count(), 0);
    assert.equal(await page.locator('#inner svg.fd-icon').count(), 1);
    // whitespace between inline elements is kept
    assert.match(await page.locator('#host p').innerText(), /bold italic/);

    // @fd:change on an element: a legend item toggles a series
    await page.locator('#chart .fd-legend-item').first().click();
    await page.waitForFunction(() => window.vm.changes.value.length > 0);
    assert.equal(await page.evaluate(() => window.vm.changes.value[0]), 'Runs');

    // v-fire ran Fire after an update that inserted markup
    await page.evaluate(() => { window.vm.extra.value = true; });
    await page.waitForSelector('#late svg.fd-icon');
    assert.equal(await page.locator('#late i[data-icon]').count(), 0);

    // the router hook runs Fire on the whole document after a route change
    await page.evaluate(async () => {
      document.querySelector('#outside').innerHTML = '<i data-icon="users"></i>';
      window.result.routes[0]();
    });
    await page.waitForSelector('#outside svg.fd-icon');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});
