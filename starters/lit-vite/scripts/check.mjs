// `npm run check`: proves that the starter renders Fire's screens the way Fire's own templates do.
//
//   1. builds the app for production (typecheck, bundle sizes) with the starter's look, then once more with Ember's
//      look (in .check/dist): the reference pages are Ember's, so both sides of a comparison need the same palette.
//      Both builds use the slim Fire (fire slim, through scripts/prepare.mjs); `fire slim --verify` fails when a
//      bundle still holds a rule or a module the report dropped, and prints the sizes before and after
//      Then the sizes: a table of every chunk (raw and gzip) and the budgets in package.json ("fire": { "budget" }):
//      the JavaScript of the first route (the entry, its static imports and the route's chunk), the largest route
//      chunk, and the CSS, in kB gzip
//   2. serves both builds (with a fallback to index.html, as a host would) and Fire's repository (the references)
//      on free ports
//   3. render-equal.mjs compares each screen's `.fd-page` with its template: structure, computed styles, pixels,
//      at 1440 and 375 wide, light and dark, in Chromium, WebKit and Firefox
//   4. a browser run visits every route (by URL and by clicking the navigation) and fails on a console error, an
//      uncaught error, a failed request or a Content Security Policy violation, and tries the Fire behaviours
//      and proves the router: a deep link to /logs/:id, a guard's redirect, not-found, back and forward restoring
//      scroll and focus, the title, route chunks loaded only on a visit or a hover, and a failed chunk's error state
//   5. lint-markup over src, and lint-css over the starter's own CSS
//   6. fire review: every route and ?state= in package.json "fire": { "review" }, at 1440 and 375, light and dark; fails
//      on an error; the gallery a person looks at before a release is .fire-review/index.html
// Everything it starts is closed before it exits.
//
//   npm run check -- [--only overview,logs] [--engines chromium] [--widths 1440] [--themes light] [--skip-build]
//                    [--diff-dir .check/diff]   keeps render-equal's JSON reports and diff images there
import fs from 'node:fs';
import zlib from 'node:zlib';
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
  // The slim build (fire slim, run by prepare.mjs): the bundle must not hold a rule or a module slim.json dropped.
  if (run('node', [path.join(fire, 'scripts/slim.mjs'), '--verify', realDist]).status) fail('the production build holds parts fire slim dropped');
  console.log('\n== build: production, Ember\'s look (for the comparison)');
  run('node', ['scripts/prepare.mjs', '--theme', path.join(fire, 'contract/looks/ember.json')]);
  const built = run('npx', ['vite', 'build', '--outDir', checkDist, '--emptyOutDir', '--logLevel', 'warn']);
  if (!built.status && run('node', [path.join(fire, 'scripts/slim.mjs'), '--verify', checkDist]).status) fail('the Ember build holds parts fire slim dropped');
  run('node', ['scripts/prepare.mjs']); // back to the starter's own look
  if (built.status) { console.error('build failed'); process.exit(1); }
}

/* ------------------------------------------------------------------ 1b. sizes and budgets */

/** The module of the first route a visitor sees (`/` redirects to /overview). */
const FIRST_ROUTE = 'src/screens/overview/screen.ts';
{
  const budget = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).fire?.budget ?? {};
  const manifest = JSON.parse(fs.readFileSync(path.join(realDist, '.vite/manifest.json'), 'utf8'));
  const kB = (n) => (n / 1000).toFixed(2).padStart(8);
  const sizes = new Map();
  const size = (file) => {
    if (!sizes.has(file)) { const buf = fs.readFileSync(path.join(realDist, file)); sizes.set(file, { raw: buf.length, gzip: zlib.gzipSync(buf).length }); }
    return sizes.get(file);
  };
  /** A manifest entry's file and its static imports, recursively. */
  const closure = (key, seen = new Set()) => {
    if (seen.has(key)) return seen;
    seen.add(key);
    for (const k of manifest[key].imports ?? []) closure(k, seen);
    return seen;
  };
  const entry = Object.keys(manifest).find((k) => manifest[k].isEntry);
  const first = new Set([...closure(entry), ...closure(FIRST_ROUTE)].map((k) => manifest[k].file));
  const routeChunks = Object.values(manifest).filter((m) => m.isDynamicEntry).map((m) => m.file);
  const assets = fs.readdirSync(path.join(realDist, 'assets')).filter((f) => /\.(js|css)$/.test(f)).map((f) => `assets/${f}`);
  console.log('\n== sizes (kB; gzip is what the browser downloads from a host that compresses)');
  console.log(`${'file'.padEnd(34)}${'raw'.padStart(8)}${'gzip'.padStart(8)}  role`);
  for (const file of assets.sort((a, b) => size(b).gzip - size(a).gzip)) {
    const role = [first.has(file) && 'first route', routeChunks.includes(file) && 'route', file.endsWith('.css') && 'css'].filter(Boolean).join(', ');
    console.log(`${file.padEnd(34)}${kB(size(file).raw)}${kB(size(file).gzip)}  ${role}`);
  }
  const fonts = fs.readdirSync(path.join(realDist, 'assets')).filter((f) => f.endsWith('.woff2'));
  console.log(`${fonts.length} font files, ${kB(fonts.reduce((n, f) => n + fs.statSync(path.join(realDist, 'assets', f)).size, 0)).trim()} kB (a page downloads only the faces it uses)`);
  const sum = (files) => [...files].reduce((n, f) => n + size(f).gzip, 0);
  const measured = {
    initialJs: sum(first),
    routeJs: Math.max(...routeChunks.map((f) => size(f).gzip)),
    css: sum(assets.filter((f) => f.endsWith('.css'))),
  };
  for (const [name, value] of Object.entries(measured)) {
    const limit = budget[name];
    const over = limit !== undefined && value / 1000 > limit;
    console.log(`${over ? 'FAIL' : 'ok  '} budget ${name}: ${(value / 1000).toFixed(2)} kB gzip of ${limit ?? '(no budget)'} kB`);
    if (over) fail(`budget ${name}: ${(value / 1000).toFixed(2)} kB gzip is over ${limit} kB (package.json "fire": { "budget" })`);
  }
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
  const step = async (label, fn, on = page) => {
    const before = problems.length;
    try { await fn(); } catch (error) { problems.push(`${label}: ${error.message.split('\n')[0]}`); }
    const csp = await on.evaluate(() => window.__csp.splice(0)).catch(() => []);
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
  await step('?state= on overview and logs shows the state asked for', async () => {
    const visible = (selector) => page.locator(selector).first().waitFor({ state: 'visible', timeout: 4000 });
    await page.goto(`${app.origin}/overview?state=empty`);
    await visible('#ov-chart .fd-empty[data-when="empty"]');
    await visible('#ov-stats .fd-empty[data-when="empty"]');
    await visible('#ov-activity .fd-empty[data-when="empty"]');
    await page.goto(`${app.origin}/overview?state=error`);
    await visible('#ov-activity .fd-empty[data-when="error"]');
    await visible('#ov-chart .fd-chart svg');
    await page.locator('#ov-activity-retry').click();
    await visible('#ov-activity .fd-table-wrap[data-when="ready"]');
    await page.goto(`${app.origin}/logs?state=empty`);
    await visible('#logs-state .fd-table-empty-title');
    await page.goto(`${app.origin}/logs?state=error`);
    await visible('#logs-state [data-state="error"]');
    await page.goto(`${app.origin}/logs?state=no-results`);
    await visible('#logs-state .fd-table-empty [data-action="clear-filters"]');
    if (await page.locator('#logs-body > tr:not([hidden])').count()) throw new Error('a row matches the no-results search');
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
  /* ---------------------------------------------------------------- 4b. the router */
  console.log('\n== router: deep link, guard, not-found, history, lazy chunks, a failed chunk');
  // A page of its own, so a request the step blocks on purpose (the failed chunk) is not a problem of the others.
  const routing = await context.newPage();
  routing.setDefaultTimeout(6000);
  const blocked = /\/assets\/elements-[\w-]+\.js/;
  const fetched = [];
  routing.on('request', (r) => fetched.push(r.url()));
  routing.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !blocked.test(m.text()) && !m.text().includes('net::ERR_FAILED')) problems.push(`console ${m.type()}: ${m.text()}`); });
  routing.on('pageerror', (e) => problems.push(`uncaught: ${e.message}`));
  routing.on('requestfailed', (r) => { if (!blocked.test(r.url())) problems.push(`request failed: ${r.url()}`); });
  routing.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
  await routing.addInitScript(() => {
    window.__csp = [];
    try { localStorage.setItem('ember-whats-new-seen', '1'); } catch { /* see above */ }
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const title = async (expected) => { await routing.waitForFunction((t) => document.title === t, expected).catch(() => { throw new Error(`the title is not "${expected}"`); }); };

  await step('a deep link to /logs/:id opens that request; closing it leaves /logs', async () => {
    await routing.goto(`${app.origin}/logs/req_7c19be`);
    await routing.locator('#sheet-log[open] #lg-id', { hasText: 'req_7c19be' }).waitFor();
    await title('Request req_7c19be · Ember');
    await routing.keyboard.press('Escape');
    await routing.waitForURL(`${app.origin}/logs`);
    if (await routing.locator('#sheet-log[open]').count()) throw new Error('the sheet is still open');
  }, routing);
  await step('a row pushes /logs/:id; Back closes the sheet', async () => {
    await routing.locator('#logs-body > tr:not([hidden])').first().click({ position: { x: 200, y: 10 } });
    await routing.waitForURL(/\/logs\/req_\w+$/);
    await routing.locator('#sheet-log[open]').waitFor();
    await routing.goBack();
    await routing.waitForURL(`${app.origin}/logs`);
    await routing.waitForFunction(() => !document.querySelector('#sheet-log[open]'));
  }, routing);
  await step('an unknown address shows not-found, in the shell, with the address kept', async () => {
    await routing.goto(`${app.origin}/billing/plans`);
    await routing.locator('screen-not-found h1', { hasText: 'This page moved or never existed' }).waitFor();
    if (!routing.url().endsWith('/billing/plans')) throw new Error(`the address changed to ${routing.url()}`);
    if (await routing.locator('screen-not-found .fd-empty-hint').textContent() !== '/billing/plans') throw new Error('the hint does not name the address');
    if (!await routing.locator('.fd-sidebar').isVisible()) throw new Error('the shell is missing');
    await title('Page not found · Ember');
  }, routing);
  await step('a guard that says no redirects, replacing the history entry', async () => {
    await routing.goto(`${app.origin}/overview`);
    await routing.locator('screen-overview h1').waitFor({ state: 'attached' });
    await routing.evaluate(() => sessionStorage.setItem('ember-deny', 'elements:view'));
    await routing.locator('.fd-nav a[href="/elements"]').click();
    await routing.waitForURL(`${app.origin}/no-access`);
    await routing.locator('screen-no-access h1').waitFor();
    await title('No access · Ember');
    await routing.goBack();
    await routing.waitForURL(`${app.origin}/overview`);
    await routing.evaluate(() => sessionStorage.removeItem('ember-deny'));
  }, routing);
  await step('back and forward restore scroll and focus; the title and the live region follow', async () => {
    await routing.goto(`${app.origin}/overview`);
    await routing.locator('screen-overview h1').waitFor({ state: 'attached' });
    await routing.evaluate(() => scrollTo(0, 600));
    await routing.waitForFunction(() => scrollY === 600);
    await routing.locator('.fd-nav a[href="/logs"]').focus();
    await routing.keyboard.press('Enter');
    await routing.waitForFunction(() => document.activeElement?.matches('screen-logs h1'));
    await title('Activity logs · Ember');
    await routing.waitForFunction(() => document.querySelector('#ember-route-status')?.textContent === 'Activity logs · Ember');
    if (await routing.evaluate(() => scrollY) !== 0) throw new Error('a new page did not start at the top');
    await routing.goBack();
    await routing.waitForFunction(() => document.activeElement?.matches('screen-overview h1') && scrollY === 600);
    await title('Overview · Ember');
    await routing.goForward();
    await routing.waitForFunction(() => document.activeElement?.matches('screen-logs h1') && scrollY === 0);
  }, routing);
  await step('a route chunk is fetched on a visit or a hover, not before', async () => {
    const chunk = (name) => fetched.some((url) => new RegExp(`/assets/${name}-[\\w-]+\\.js$`).test(url));
    await routing.goto('about:blank');
    fetched.length = 0;
    await routing.goto(`${app.origin}/overview`);
    await routing.locator('screen-overview h1').waitFor({ state: 'attached' });
    if (!chunk('overview')) throw new Error('the first route was not fetched');
    if (['logs', 'settings', 'elements'].some(chunk)) throw new Error('another route was fetched up front');
    await routing.locator('.fd-nav a[href="/settings"]').hover();
    await routing.waitForFunction(() => performance.getEntriesByType('resource').some((e) => /\/assets\/settings-/.test(e.name)));
    if (chunk('elements') || chunk('logs')) throw new Error('hovering one link fetched another route');
  }, routing);
  await step('a chunk that fails to load shows the error state; Try again loads it', async () => {
    await routing.route(blocked, (r) => r.abort());
    await routing.locator('.fd-nav a[href="/elements"]').click();
    await routing.locator('screen-load-error h1').waitFor();
    if (!await routing.locator('screen-load-error [data-action="reload"]').isVisible()) throw new Error('no Reload for a stale deploy');
    if (!await routing.locator('.fd-sidebar').isVisible()) throw new Error('the shell is missing');
    await routing.unroute(blocked);
    await routing.locator('screen-load-error [data-action="retry"]').click();
    await routing.locator('screen-elements fd-chart svg').first().waitFor();
  }, routing);
  await routing.close();

  await step('phone width: the menu opens', async () => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.locator('.fd-tabbar [data-fd-mobile-nav]').click();   // at phone width the tab bar's More opens the menu (the top bar's button is hidden)
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

/* ------------------------------------------------------------------ 6. review */
console.log('\n== fire review (the gallery: .fire-review/index.html)');
if (run('node', [path.join(fire, 'scripts/review.mjs'), '--states']).status) fail('fire review reported errors (see .fire-review/index.html)');

if (failures.length) { console.error(`\nCHECK FAILED (${failures.length})\n${failures.map((f) => `  - ${f}`).join('\n')}`); process.exit(1); }
console.log('\nCHECK PASSED');
