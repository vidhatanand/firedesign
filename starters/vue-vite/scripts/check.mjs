#!/usr/bin/env node
// `npm run check`: does this starter render Ember's three screens exactly as the templates do, under a strict CSP?
//   1. builds the app for production with the `ember` look, because the templates use Ember's palette (the starter's
//      own look would differ on both sides), and with VITE_FIRE_STATIC=1, so each screen stays in the state its markup
//      is written in (the sample screens otherwise simulate a first load with timers); then puts the starter's look back
//   2. serves the build (single-page fallback) and Fire's repository root (../..) on two free ports. The reference
//      templates are served WITHOUT their inline demo scripts (they simulate loading and run Ember's demo logic, which a
//      framework app replaces), and with links to the three screens as router paths (settings.html → /settings)
//   3. for each screen runs scripts/render-equal.mjs (.fd-page against .fd-page; 1440 and 375 wide; light and dark;
//      Chromium, WebKit and Firefox)
//   4. loads each screen in Chromium and fails on any Content Security Policy violation or console error, after using
//      the shell (Tweaks panel, phone menu) and a row menu
//   5. runs scripts/lint-markup.mjs and scripts/lint-css.mjs over the starter's source
// Every server is closed before the script exits.
// Options for debugging one screen: --screen <name>, --engines chromium,webkit,firefox, --no-build (reuse dist/, which must
// be an ember build), --serve (only start the servers and print their ports), --diff-dir <dir> (render-equal writes the pixel diffs there), --json <dir> (and its JSON reports).
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fireRoot = path.resolve(here, '../..');
const requireFire = createRequire(path.join(fireRoot, 'package.json'));
const { chromium } = requireFire('playwright-core');
const option = (name) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : undefined; };
const SCREENS = [{ name: 'overview', route: '/overview' }, { name: 'logs', route: '/logs' }, { name: 'settings', route: '/settings' }]
  .filter((s) => !option('--screen') || s.name === option('--screen'));
const ENGINES = option('--engines') ?? 'chromium,webkit,firefox';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.ico': 'image/x-icon', '.map': 'application/json', '.txt': 'text/plain' };

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: here, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const bin = (name) => path.join(here, 'node_modules/.bin', name);
const servers = [];
const listen = (handler) => new Promise((resolve) => {
  const server = createServer(handler);
  servers.push(server);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const closeAll = () => Promise.all(servers.map((s) => new Promise((r) => { s.closeAllConnections?.(); s.close(r); })));
const send = (res, file, body) => res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body);

let failed = 0;
const fail = (message) => { failed += 1; console.error(`FAIL ${message}`); };

try {
  // 1. build
  console.log('building with the ember look (strict CSP, static screens)');
  for (const [cmd, args, env] of process.argv.includes('--no-build') ? [] : [
    [process.execPath, ['scripts/build-theme.mjs', 'ember'], {}],
    [bin('vue-tsc'), ['--noEmit'], {}],
    [bin('vite'), ['build'], { VITE_FIRE_STATIC: '1' }],
  ]) {
    const r = run(cmd, args, { env: { ...process.env, ...env } });
    if (r.status !== 0) { console.error(r.stdout + r.stderr); throw new Error(`${path.basename(cmd)} ${args.join(' ')} failed`); }
  }
  const dist = path.join(here, 'dist');
  const index = readFileSync(path.join(dist, 'index.html'), 'utf8').replaceAll('&#39;', "'");
  if (!/<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'self'; style-src 'self'/.test(index)) fail('dist/index.html has no strict Content-Security-Policy');
  if (/unsafe-inline|unsafe-eval/.test(index)) fail('the policy allows unsafe-inline or unsafe-eval');
  if (/<style\b|\sstyle=|<script(?![^>]*\bsrc=)/.test(index.replace(/<script[^>]*type="application\/json"[^>]*>[\s\S]*?<\/script>/g, ''))) fail('dist/index.html has an inline script or style');
  const sizes = {};
  for (const f of ['assets']) {
    const dir = path.join(dist, f);
    for (const name of existsSync(dir) ? run('ls', [dir]).stdout.split('\n').filter(Boolean) : []) {
      if (/\.(js|css)$/.test(name)) sizes[name.replace(/-[\w-]{8}\./, '.')] = statSync(path.join(dir, name)).size;
    }
  }
  console.log('bundle sizes (bytes):', JSON.stringify(sizes));

  // 2. servers: the build as it ships (CSP meta in place; render-equal bypasses it for its freeze stylesheet, and the
  // CSP run in step 4 checks it)
  const app = async (req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = path.join(dist, decodeURIComponent(url.pathname));
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(dist, 'index.html');
    send(res, file, await readFile(file));
  };
  const appPort = await listen(app);
  const refPort = await listen(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const file = path.join(fireRoot, decodeURIComponent(url.pathname));
    if (!file.startsWith(fireRoot + path.sep) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end('not found'); return; }
    if (/\/templates\/(overview|logs|settings)\.html$/.test(file)) {
      const html = (await readFile(file, 'utf8'))
        .replace(/<script type="module">[\s\S]*?<\/script>/g, '')
        .replace(/href="(overview|logs|settings)\.html(#[^"]*)?"/g, (m, name, hash) => `href="/${name}${hash ?? ''}"`);
      send(res, file, html);
      return;
    }
    send(res, file, await readFile(file));
  });

  if (process.argv.includes('--serve')) {
    console.log(`serving: reference http://127.0.0.1:${refPort}/templates/<name>.html, app http://127.0.0.1:${appPort}/<route>. Ctrl-C to stop.`);
    await new Promise(() => {});
  }

  // 3. render-equal
  for (const { name, route } of SCREENS) {
    console.log(`\nrender-equal ${name}: templates/${name}.html .fd-page  vs  ${route} .fd-page`);
    const args = [path.join(fireRoot, 'scripts/render-equal.mjs'), '--ref', `http://127.0.0.1:${refPort}/templates/${name}.html`, '--ref-root', '.fd-page',
      '--cand', `http://127.0.0.1:${appPort}${route}`, '--cand-root', '.fd-page', '--widths', '1440,375', '--themes', 'light,dark', '--engines', ENGINES];
    if (option('--diff-dir')) args.push('--diff-dir', path.join(option('--diff-dir'), name));
    if (option('--json')) args.push('--json', path.join(option('--json'), `${name}.json`));
    const r = await new Promise((resolve) => {
      const child = spawn(process.execPath, args, { cwd: here });
      let out = '';
      child.stdout.on('data', (d) => { out += d; });
      child.stderr.on('data', (d) => { out += d; });
      child.on('close', (status) => resolve({ status, out }));
    });
    console.log(r.out.trimEnd());
    if (r.status !== 0) fail(`render-equal ${name} exited ${r.status}`);
  }

  // 4. CSP violations and console errors, in a browser, while the app is used
  console.log('\nContent Security Policy and console');
  const browser = await chromium.launch();
  try {
    for (const { name, route } of SCREENS) {
      const page = await browser.newPage();
      const problems = [];
      page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`console ${m.type()}: ${m.text()}`); });
      page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
      page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
      await page.addInitScript(() => {
        window.__csp = [];
        document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} blocked ${e.blockedURI || 'inline'}`));
      });
      await page.goto(`http://127.0.0.1:${appPort}${route}`);
      await page.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'));
      await page.waitForSelector('.fd-page svg.fd-icon use');
      // use the shell: the Tweaks panel (builds its markup and writes custom properties), then a menu or dialog if the screen has one
      await page.click('[data-fd-tweaks-open]');
      await page.waitForSelector('.fd-tweaks, [data-fd-tweaks]', { state: 'attached', timeout: 3000 }).catch(() => {});
      await page.keyboard.press('Escape');
      const trigger = page.locator('.fd-page [data-fd-menu], .fd-page [popovertarget]').first();
      if (await trigger.count()) { await trigger.click().catch(() => {}); await page.keyboard.press('Escape'); }
      await page.waitForTimeout(300);
      const csp = await page.evaluate(() => window.__csp);
      for (const v of csp) problems.push(`CSP violation: ${v}`);
      const iconless = await page.locator('.fd-page i[data-icon]').count();
      if (iconless) problems.push(`${iconless} <i data-icon> left in the page`);
      console.log(`  ${name}: ${problems.length ? 'FAIL' : 'ok'}  (${csp.length} CSP violations)`);
      for (const p of problems) { console.log(`    ${p}`); }
      if (problems.length) fail(`${name}: ${problems.length} problem(s)`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  // 5. lint
  const lint = run(process.execPath, [path.join(fireRoot, 'scripts/lint-markup.mjs'), 'src', 'index.html']);
  console.log(`\nlint-markup: ${lint.stdout.trim().split('\n').pop()}`);
  if (lint.status !== 0) { console.error(lint.stdout); fail('lint-markup'); }
  const lintCss = run(process.execPath, [path.join(fireRoot, 'scripts/lint-css.mjs'), 'src', 'index.html']);
  console.log(`lint-css: ${lintCss.stdout.trim().split('\n').pop()}`);
  if (lintCss.status !== 0) { console.error(lintCss.stdout); fail('lint-css'); }
} catch (error) {
  fail(error.message);
} finally {
  await closeAll();
  const restored = run(process.execPath, ['scripts/build-theme.mjs']);
  if (restored.status !== 0) console.error('could not restore the starter look:', restored.stderr);
}
console.log(failed ? `\ncheck FAILED (${failed})` : '\ncheck passed');
process.exit(failed ? 1 : 0);
