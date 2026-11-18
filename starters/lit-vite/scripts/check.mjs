// `npm run check`: proves that the starter renders Fire's screens the way Fire's own templates do.
//
//   1. builds the app for production (typecheck, bundle sizes) with the starter's look, then once more with Ember's
//      look (in .check/dist): the reference pages are Ember's, so both sides of a comparison need the same palette
//   2. serves both builds (with a fallback to index.html, as a host would) and Fire's repository (the references)
//      on free ports
//   3. render-equal.mjs compares each screen's `.fd-page` with its template: structure, computed styles, pixels,
//      at 1440 and 375 wide, light and dark, in Chromium, WebKit and Firefox
//   4. a browser run visits every route (by URL and by clicking the navigation) and fails on a console error, an
//      uncaught error, a failed request or a Content Security Policy violation, and tries the Fire behaviours
//   5. lint-markup over src, and lint-css over the starter's own CSS
// Everything it starts is closed before it exits.
//
//   npm run check -- [--only overview,logs] [--engines chromium] [--widths 1440] [--themes light] [--skip-build]
//                    [--diff-dir .check/diff]   keeps render-equal's JSON reports and diff images there
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fire = path.dirname(createRequire(import.meta.url).resolve('fire-design/package.json'));
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const only = arg('only', 'overview,logs,settings').split(',');
const engines = arg('engines', 'chromium,webkit,firefox');
const widths = arg('widths', '1440,375');
const themes = arg('themes', 'light,dark');
const diffDir = arg('diff-dir', '');
const failures = [];
const fail = (message) => { failures.push(message); console.error(`FAIL ${message}`); };
/** Runs a command and collects its output. It must not block: this process is serving the pages the command loads. */
const capture = (cmd, args) => new Promise((resolve) => {
  const child = spawn(cmd, args, { cwd: root });
  let output = '';
  child.stdout.on('data', (d) => { output += d; });
  child.stderr.on('data', (d) => { output += d; });
  child.on('close', (status) => resolve({ status, output }));
});
const run = (cmd, args, options = {}) => spawnSync(cmd, args, { cwd: root, stdio: 'inherit', ...options });

/* ------------------------------------------------------------------ render-equal verdicts */

const reports = diffDir ? path.resolve(diffDir) : fs.mkdtempSync(path.join(os.tmpdir(), 'fire-check-'));
fs.mkdirSync(reports, { recursive: true });

function judge(name, report) {
  console.log(`\n== render-equal: ${name}  (${engines}; ${widths}; ${themes})`);
  for (const run of report.runs) {
    const real = [...run.structure, ...run.styles];
    const pixels = run.pixels?.sizeMismatch ? `size ${run.pixels.ref} vs ${run.pixels.cand}` : `pixels ${((run.pixels?.ratio ?? 1) * 100).toFixed(4)}%`;
    const ok = !run.errors.length && !real.length && run.pixels && run.pixels.ratio <= report.options.maxPixelRatio;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${run.engine} ${run.width} ${run.theme}: ${run.nodes.ref}/${run.nodes.cand} nodes, ${real.length} differences, ${pixels}`);
    for (const e of run.errors) console.log(`     ${e}`);
    for (const d of real.slice(0, 8)) console.log(`     ${d.kind} ${d.path.slice(-110)}${d.property ? ` [${d.property}]` : ''}: ${JSON.stringify(d.ref)} -> ${JSON.stringify(d.cand)}`);
    if (!ok) fail(`render-equal ${name} ${run.engine} ${run.width} ${run.theme}`);
  }
}

/* ------------------------------------------------------------------ 1. builds */

const checkDist = path.join(root, '.check/dist');
const realDist = path.join(root, 'dist');
if (!process.argv.includes('--skip-build')) {
  console.log('\n== build: production, the starter\'s look');
  if (run('npm', ['run', 'build']).status) { console.error('build failed'); process.exit(1); }
  console.log('\n== build: production, Ember\'s look (for the comparison)');
  run('node', ['scripts/prepare.mjs', '--theme', path.join(fire, 'contract/looks/ember.json')]);
  const built = run('npx', ['vite', 'build', '--outDir', checkDist, '--emptyOutDir', '--logLevel', 'warn']);
  run('node', ['scripts/prepare.mjs']); // back to the starter's own look
  if (built.status) { console.error('build failed'); process.exit(1); }
}

/* ------------------------------------------------------------------ 2. servers */

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png' };
/** Both sides run timers (skeletons that clear after 600 ms, a first-visit dialog at 800 ms); render-equal waits for
 *  each page to settle (spec R13), up to this long. */
const READY_TIMEOUT_MS = 6000;

function serve(dir, { fallback = false } = {}) {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(dir, pathname);
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && fallback && !path.extname(pathname)) file = path.join(dir, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => { server.closeAllConnections(); server.close(done); }),
  })));
}
const app = await serve(realDist, { fallback: true });       // the production build: the browser run
const compare = await serve(checkDist, { fallback: true });  // Ember's look, with the policy: render-equal
const ref = await serve(fire);
console.log(`\nApp ${app.origin}   App with Ember's look ${compare.origin}   Fire (references) ${ref.origin}`);

try {
  /* ---------------------------------------------------------------- 3. render-equal */
  for (const name of only) {
    const out = path.join(reports, `${name}.json`);
    const result = await capture(process.execPath, [path.join(fire, 'scripts/render-equal.mjs'),
      '--ref', `${ref.origin}/templates/${name}.html`, '--ref-root', '.fd-page',
      '--cand', `${compare.origin}/${name}`, '--cand-root', '.fd-page',
      '--widths', widths, '--themes', themes, '--engines', engines, '--ready-timeout', String(READY_TIMEOUT_MS),
      '--json', out, ...(diffDir ? ['--diff-dir', path.join(diffDir, name)] : [])]);
    if (!fs.existsSync(out)) { process.stdout.write(result.output); fail(`render-equal ${name} did not finish`); continue; }
    judge(name, JSON.parse(fs.readFileSync(out, 'utf8')));
  }

  /* ---------------------------------------------------------------- 4. browser run */
  console.log('\n== browser run: routes, Content Security Policy, Fire behaviours');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`console ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`uncaught: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.addInitScript(() => {
    window.__csp = [];
    try { localStorage.setItem('ember-whats-new-seen', '1'); } catch { /* the overview's first-visit dialog would cover the page */ }
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const step = async (label, fn) => {
    const before = problems.length;
    try { await fn(); } catch (error) { problems.push(`${label}: ${error.message.split('\n')[0]}`); }
    const csp = await page.evaluate(() => window.__csp.splice(0)).catch(() => []);
    for (const v of csp) problems.push(`CSP violation: ${v}`);
    const found = problems.slice(before);
    console.log(`${found.length ? 'FAIL' : 'ok  '} ${label}${found.map((p) => `\n       ${p}`).join('')}`);
    if (found.length) failures.push(`${label}: ${found.join('; ')}`);
  };
  const toast = () => page.locator('.fd-toast').first().waitFor({ timeout: 3000 });

  await step('/overview loads; skeletons clear; chart drawn', async () => {
    await page.goto(`${app.origin}/overview`);
    await page.locator('#ov-chart:not([data-fd-loading="true"]) .fd-chart svg').first().waitFor({ timeout: 4000 });
    if (!await page.locator('.fd-sidebar svg.fd-icon use, .fd-sidebar fd-icon svg').count()) throw new Error('the sidebar icons are not drawn');
  });
  await step('navigate to /logs by clicking the sidebar (init runs again)', async () => {
    await page.locator('.fd-nav a[href="/logs"]').click();
    await page.waitForURL('**/logs');
    await page.locator('#logs-body:not([hidden])').waitFor({ timeout: 4000 });
    if (!await page.locator('#logs-state-switch [aria-checked="true"]').count()) throw new Error('the segmented control was not enhanced');
    if (!await page.locator('.fd-table-check').first().isVisible()) throw new Error('the table was not enhanced');
  });
  await step('logs: search filters rows', async () => {
    await page.locator('#logs-search').fill('crawl');
    await page.waitForFunction(() => [...document.querySelectorAll('#logs-body > tr')].filter((r) => !r.hidden).length < 14);
    await page.locator('#logs-search').fill('');
  });
  await step('logs: row menu "Delete log" raises a toast (fd:select) and Undo restores', async () => {
    const rows = () => page.locator('#logs-body > tr:not([hidden])').count();
    const before = await rows();
    await page.locator('#logs-body > tr:not([hidden]) [data-fd-menu]').first().click();
    await page.locator('#menu-log-row [data-value="delete"]').click();
    await toast();
    if (await rows() !== before - 1) throw new Error('the row was not removed');
    await page.locator('.fd-toast button', { hasText: 'Undo' }).click();
    await page.waitForFunction((n) => document.querySelectorAll('#logs-body > tr:not([hidden])').length === n, before);
  });
  await step('logs: a row opens the detail sheet', async () => {
    await page.locator('#logs-body > tr:not([hidden])').first().click({ position: { x: 200, y: 10 } });
    await page.locator('#sheet-log[open]').waitFor({ timeout: 3000 });
    if (!(await page.locator('#lg-overview .fd-kv-item').count())) throw new Error('the detail is empty');
    await page.keyboard.press('Escape');
  });
  await step('logs: the Empty state', async () => {
    await page.locator('#logs-state-switch [data-value="empty"]').click();
    await page.locator('#logs-state .fd-table-empty-title').waitFor({ timeout: 3000 });
    await page.locator('#logs-state-switch [data-value="loaded"]').click();
  });
  await step('navigate to /settings; tabs, segmented control, confirm dialog', async () => {
    await page.locator('.fd-nav a[href="/settings"]').click();
    await page.locator('#panel-team:not([hidden])').waitFor({ timeout: 4000 });
    await page.locator('.fd-subnav [data-tab="billing"]').click();
    await page.locator('#panel-billing:not([hidden])').waitFor();
    if (!page.url().includes('tab=billing')) throw new Error('the tab is not in the URL');
    await page.locator('.fd-subnav [data-tab="team"]').click();
    await page.locator('#members-list [data-fd-menu]').first().click();
    await page.locator('#menu-member [data-value="remove"]').click();
    await page.locator('#dlg-confirm[open]').waitFor();
    await page.locator('#dlg-confirm [data-confirm-ok]').click();
    await toast();
    if (await page.locator('[data-bind="member-count"]').first().textContent() !== '3') throw new Error('the member count did not follow');
  });
  await step('/elements: fd-chart .data redraws, fd-code, fd-icon, fd-texture', async () => {
    await page.locator('.fd-nav a[href="/elements"]').click();
    await page.locator('screen-elements fd-chart svg').first().waitFor({ timeout: 4000 });
    const area = () => page.locator('screen-elements fd-chart svg path').evaluateAll((p) => p.map((e) => e.getAttribute('d')).join('|'));
    const before = await area();
    await page.getByRole('button', { name: 'New data' }).click();
    await page.waitForFunction((b) => [...document.querySelectorAll('screen-elements fd-chart svg path')].map((e) => e.getAttribute('d')).join('|') !== b, before);
    await page.locator('screen-elements fd-code .fd-codeblock-body').waitFor();
    await page.locator('screen-elements fd-icon svg').first().waitFor();
    const icon = () => page.locator('screen-elements fd-icon').first().getAttribute('data-icon');
    const name = await icon();
    await page.getByRole('button', { name: 'Next icon' }).click();
    await page.waitForFunction((n) => document.querySelector('screen-elements fd-icon')?.getAttribute('data-icon') !== n, name);
    await page.locator('screen-elements fd-texture canvas').waitFor({ timeout: 3000 });
  });
  await step('back button returns to the previous screen', async () => {
    await page.goBack();
    await page.locator('#panel-team').waitFor();
  });
  await step('phone width: the menu opens', async () => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.locator('[data-fd-mobile-nav]').click();
    await page.locator('#ember-mobile-nav:not([hidden])').waitFor();
    await page.setViewportSize({ width: 1440, height: 900 });
  });
  await browser.close();

  /* ---------------------------------------------------------------- 5. lint */
  console.log('\n== lint-markup');
  if (run('node', ['scripts/lint.mjs']).status) fail('lint-markup reported errors');
  console.log('\n== lint-css');
  if (run('node', ['scripts/lint.mjs', '--css']).status) fail('lint-css reported errors');
} finally {
  await app.close();
  await compare.close();
  await ref.close();
}

if (failures.length) { console.error(`\nCHECK FAILED (${failures.length})\n${failures.map((f) => `  - ${f}`).join('\n')}`); process.exit(1); }
console.log('\nCHECK PASSED');
