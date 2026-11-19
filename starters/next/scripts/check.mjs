#!/usr/bin/env node
// npm run check: the starter against Fire's templates and Fire's rules.
//
//   1. Builds for production with Ember's look (FIRE_LOOK=ember, into .next-check), so the screens compare against
//      Fire's templates on the same palette; the starter's own look (ocean) is restored afterwards. The build uses the
//      slim Fire (fire slim, through prepare-fire.mjs); `fire slim --verify` fails when the bundle still holds a rule
//      or a module the report dropped, and prints the sizes before and after.
//   2. Serves the build (next start) and the Fire repository (../..) as static files, each on a free port.
//   3. Browser pass (Chromium, WebKit, Firefox) on every screen: no console error or warning, no uncaught error, no CSP
//      violation; the served HTML carries a strict policy (no 'unsafe-inline', no 'unsafe-eval'), boot.js is a blocking
//      classic script in <head> with the nonce, and every inline script has the nonce or is JSON. Then the screens'
//      behaviour: a row action fires fd:select and its toast shows, a settings tab switches, a client-side route change
//      gets Fire's init, the What's new dialog opens.
//   4. Hydration pass on `next dev` (Chromium): React's development build reports every hydration mismatch, attributes
//      included. Fails on any console error or warning. A planted mismatch (the server HTML of one screen altered in
//      flight) must be reported, or the check fails: it proves the check catches one.
//   5. render-equal on each screen: templates/<name>.html (.fd-page) against the route (.fd-page), widths 1440 and 375,
//      light and dark, Chromium, WebKit and Firefox: no structural or style difference, pixels under its default limit.
//   6. lint-markup over the starter's source, and lint-css over its own CSS.
// Every server is closed before exit. Exit code 1 on any failure.
//
// Options: --engines chromium,webkit,firefox  --widths 1440,375  --themes light,dark  --screens logs,settings,overview
//          --skip-build (reuse .next-check)  --skip-dev  --skip-render
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(HERE, '../..');
const OUT = path.join(HERE, '.check');
const DIST = '.next-check';
const NEXT = path.join(HERE, 'node_modules/next/dist/bin/next');
const requireRepo = createRequire(path.join(REPO, 'package.json'));
const playwright = await import(pathToFileURL(requireRepo.resolve('playwright-core')).href);
const { chromium, firefox, webkit } = playwright.default ?? playwright;
const { startServer } = await import(pathToFileURL(path.join(REPO, 'scripts/render-equal.mjs')).href);

const SCREENS = { logs: '/logs', settings: '/settings', overview: '/overview' };
const ENGINES = { chromium, webkit, firefox };
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const flag = (name) => process.argv.includes(`--${name}`);
const opts = {
  engines: arg('engines', 'chromium,webkit,firefox').split(','),
  widths: arg('widths', '1440,375'),
  themes: arg('themes', 'light,dark'),
  screens: arg('screens', Object.keys(SCREENS).join(',')).split(','),
};
const BAD_PORTS = new Set([4747, 4750, 4770, 4771, 4772]);

const failures = [];
const fail = (what) => { failures.push(what); console.log(`FAIL ${what}`); };
const ok = (what) => console.log(`ok   ${what}`);
const children = new Set();
const servers = [];

/* ---------------------------------------------------------------- processes and servers */
async function freePort() {
  for (;;) {
    const port = await new Promise((resolve, reject) => {
      const s = net.createServer().once('error', reject).listen(0, '127.0.0.1', () => { const { port: p } = s.address(); s.close(() => resolve(p)); });
    });
    if (!BAD_PORTS.has(port)) return port;
  }
}
function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { cwd: HERE, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}
// Asynchronous: the Fire static server lives in this process and must keep answering while the child runs.
function runAsync(cmd, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: HERE, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (status) => resolve({ status, out }));
  });
}
function startNext(mode, port, env) {
  const child = spawn(process.execPath, [NEXT, mode, '-p', String(port), '-H', '127.0.0.1'], {
    cwd: HERE, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  children.add(child);
  child.on('exit', () => children.delete(child));
  return { child, log: () => log };
}
async function waitFor(url, ms = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(url, { redirect: 'manual' }); if (r.status < 500) return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`timed out waiting for ${url}`);
}
async function stopNext({ child }) {
  if (child.exitCode !== null) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch { /* gone */ }
  await new Promise((resolve) => {
    const t = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } resolve(); }, 5000);
    child.once('exit', () => { clearTimeout(t); resolve(); });
  });
}
function killAll() { for (const c of children) { try { process.kill(-c.pid, 'SIGKILL'); } catch { /* gone */ } } }
process.on('exit', killAll);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { killAll(); process.exit(130); });

/* ---------------------------------------------------------------- browser helpers */
// Recorded in the page before any of its scripts: CSP violations (the event) and Fire's ready flag timing.
const RECORDER = () => {
  window.__fireCheck = { csp: [] };
  document.addEventListener('securitypolicyviolation', (e) => {
    const target = e.target && e.target.nodeType === 1 ? e.target.localName : '';
    window.__fireCheck.csp.push({ text: `${e.violatedDirective} blocked ${e.blockedURI || 'inline'} on ${target || 'the document'} (${e.sourceFile || ''}:${e.lineNumber || ''})`,
      selectQuirk: e.violatedDirective === 'style-src-attr' && (target === 'select' || !target) && !e.sample });
  });
};
function watch(page) {
  const problems = [];
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error' || t === 'warning' || t === 'warn' || /hydrat/i.test(m.text())) problems.push(`console.${t}: ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => problems.push(`uncaught: ${String(e.message || e).slice(0, 300)}`));
  return problems;
}
const fireReady = (page) => page.waitForFunction(() => document.documentElement.hasAttribute('data-fd-ready'), null, { timeout: 15000 });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- 3. served HTML and browser pass */
async function checkServedHtml(base) {
  for (const [name, route] of Object.entries(SCREENS)) {
    if (!opts.screens.includes(name)) continue;
    const res = await fetch(base + route);
    const html = await res.text();
    const csp = res.headers.get('content-security-policy') || '';
    const problems = [];
    if (res.status !== 200) problems.push(`status ${res.status}`);
    const directive = (d) => (csp.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${d} `)) || '');
    const scriptSrc = directive('script-src'), styleSrc = directive('style-src');
    if (!/'nonce-[^']+'/.test(scriptSrc)) problems.push(`no nonce in script-src (${scriptSrc})`);
    if (/unsafe-inline|unsafe-eval/.test(scriptSrc)) problems.push(`script-src allows ${scriptSrc}`);
    if (!styleSrc || /unsafe-inline/.test(styleSrc)) problems.push(`style-src is not strict (${styleSrc || 'missing'})`);
    const nonce = (scriptSrc.match(/'nonce-([^']+)'/) || [])[1];
    const head = html.slice(0, html.indexOf('</head>'));
    const boot = head.match(/<script[^>]*src="\/fire\/boot\.js"[^>]*>/);
    if (!boot) problems.push('boot.js is not a <script src> in <head>');
    else {
      if (/\s(async|defer)\b/.test(boot[0]) || /type="module"/.test(boot[0])) problems.push(`boot.js is not a blocking classic script: ${boot[0]}`);
      if (!boot[0].includes(`nonce="${nonce}"`)) problems.push('boot.js lacks the nonce');
    }
    for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
      const attrs = m[1];
      if (/\bsrc=/.test(attrs) || /type="application\/json"/.test(attrs)) continue;
      if (!attrs.includes(`nonce="${nonce}"`)) problems.push(`inline script without the nonce: <script${attrs}>`);
    }
    if (/\sstyle="/.test(html)) problems.push('a style attribute in the served HTML');
    if (/<style[\s>]/.test(html)) problems.push('a <style> element in the served HTML');
    if (!/id="fd-icon-sprite"[^>]*hidden/.test(html) && !/hidden[^>]*id="fd-icon-sprite"/.test(html)) problems.push('no server-rendered, hidden icon sprite');
    if (problems.length) fail(`served HTML ${route}: ${problems.join('; ')}`); else ok(`served HTML ${route}: strict CSP with nonce, blocking boot.js, sprite, no inline style`);
  }
}

async function browserPass(base) {
  for (const engineName of opts.engines) {
    const browser = await ENGINES[engineName].launch();
    try {
      for (const [name, route] of Object.entries(SCREENS)) {
        if (!opts.screens.includes(name)) continue;
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        await context.addInitScript(RECORDER);
        const page = await context.newPage();
        const problems = watch(page);
        const notes = [];
        try {
          await page.goto(base + route, { waitUntil: 'load' });
          await fireReady(page);
          await pause(1500); // the screens' timers (skeletons at 600 ms, What's new at 800 ms)
          if (name === 'logs') {
            // A row action menu item fires fd:select; the screen (useFireEvent) shows a toast.
            await page.locator('#logs-body tr').first().locator('[data-fd-menu]').click();
            await page.locator('#menu-log-row [data-value="retry"]').click();
            await page.locator('.fd-toast').first().waitFor({ timeout: 5000 });
            notes.push('row action → fd:select → toast');
            // A client-side route change (next/link) gets Fire's init (L3): the segmented control on settings has its thumb.
            await page.keyboard.press('Escape');
            await page.locator('.fd-sidebar a.fd-nav-item[href="/settings"]').click();
            await page.waitForURL('**/settings');
            await page.locator('.fd-segmented .fd-segmented-thumb').first().waitFor({ state: 'attached', timeout: 5000 });
            notes.push('route change → init');
          }
          if (name === 'settings') {
            await page.locator('.fd-subnav-item[data-tab="billing"]').click();
            await page.locator('#panel-billing').waitFor({ state: 'visible', timeout: 5000 });
            if (!page.url().includes('tab=billing')) throw new Error('the tab is not in the URL');
            notes.push('subnav tab → panel and URL');
          }
          if (name === 'overview') {
            await page.locator('#dlg-whats-new[open]').waitFor({ timeout: 5000 });
            notes.push("What's new dialog");
          }
        } catch (e) {
          problems.push(`behaviour: ${String(e.message || e).split('\n')[0]}`);
        }
        const csp = await page.evaluate(() => window.__fireCheck?.csp ?? []).catch(() => []);
        // WebKit artefact (spec/EXPORT.md P1): Playwright's WebKit reports every <select> under a strict style-src as a
        // style-src-attr violation (empty sample), with a console error "Refused to apply a stylesheet…", even on a
        // bare page holding nothing but a <select>; Chromium and Firefox report nothing. A <select> that React creates
        // during a client-side navigation is reported against the document (not yet connected). Those pairs, and only
        // those, are set aside in WebKit and counted; any other violation or console error fails.
        let quirks = engineName === 'webkit' ? csp.filter((v) => v.selectQuirk).length : 0;
        for (const v of csp) if (!(quirks && v.selectQuirk)) problems.push(`CSP violation: ${v.text}`);
        if (quirks) {
          let left = quirks;
          for (let i = problems.length - 1; i >= 0; i--) {
            if (left && /^console\.error: Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline'/.test(problems[i])) { problems.splice(i, 1); left -= 1; }
          }
          notes.push(`${quirks} WebKit <select> CSP reports set aside`);
        }
        await context.close();
        if (problems.length) fail(`${engineName} ${route}: ${problems.join(' | ')}`);
        else ok(`${engineName} ${route}: no console errors or warnings, no CSP violations; ${notes.join(', ')}`);
      }
    } finally { await browser.close(); }
  }
}

/* ---------------------------------------------------------------- 3b. ?state= */
// ?state= reaches the server page (searchParams) and the behaviour: the block asked for is the one shown. Chromium only,
// one page per state: browserPass counts the WebKit <select> CSP reports per page load, so it stays on the first visit.
async function statesPass(base) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => { try { localStorage.setItem('ember-whats-new-seen', '1'); } catch { /* storage blocked */ } });
    const visible = (page, selector) => page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 });
    const cases = {
      '/overview?state=empty': async (page) => { for (const id of ['ov-chart', 'ov-stats', 'ov-activity']) await visible(page, `#${id} [data-when="empty"]`); },
      '/overview?state=error': async (page) => {
        await visible(page, '#ov-activity [data-when="error"]');
        await visible(page, '#ov-chart .fd-chart svg');
        await page.locator('#ov-activity-retry').click();
        await visible(page, '#ov-activity [data-when="ready"]');
      },
      '/logs?state=empty': async (page) => { await visible(page, '#logs-state .fd-table-empty-title'); },
      '/logs?state=error': async (page) => {
        await visible(page, '#logs-state [data-state="error"]');
        await page.locator('#logs-state [data-action="reload"]').click();
        await visible(page, '#logs-body');
      },
      '/logs?state=no-results': async (page) => {
        await visible(page, '#logs-state [data-action="clear-filters"]');
        if (await page.locator('#logs-body > tr:not([hidden])').count()) throw new Error('a row matches the no-results search');
      },
    };
    for (const [route, expectState] of Object.entries(cases)) {
      const page = await context.newPage();
      const problems = watch(page);
      try {
        await page.goto(base + route, { waitUntil: 'load' });
        await fireReady(page);
        await pause(900);
        await expectState(page);
      } catch (e) { problems.push(`behaviour: ${String(e.message || e).split('\n')[0]}`); }
      await page.close();
      if (problems.length) fail(`${route}: ${problems.join(' | ')}`); else ok(`${route}: the state asked for is the one shown`);
    }
  } finally { await browser.close(); }
}

/* ---------------------------------------------------------------- 4. hydration on next dev */
// React's development build reports an attribute mismatch with console.error; Next 16's dev server reports a text or
// structure mismatch in its overlay and forwards it to the terminal as a "[browser] …" line, not to the browser console.
// Both are watched.
async function hydrationPass(base, serverLog) {
  // Local Network Access checks block a page served through page.route from loading 127.0.0.1 scripts.
  const browser = await chromium.launch({ args: ['--disable-features=LocalNetworkAccessChecks'] });
  const visit = async (route, plant) => {
    const page = await browser.newPage();
    const problems = watch(page);
    const from = serverLog().length;
    if (plant) {
      await page.route(`${base}${route}`, async (r) => {
        const res = await r.fetch();
        const headers = { ...res.headers() };
        delete headers['content-encoding'];
        delete headers['content-length'];
        await r.fulfill({ status: res.status(), headers, body: plant(await res.text()) });
      });
    }
    await page.goto(base + route, { waitUntil: 'load' });
    await fireReady(page).catch(() => problems.push('Fire did not load'));
    await pause(1500);
    await page.close();
    const forwarded = serverLog().slice(from).split('\n').filter((l) => l.startsWith('[browser]')).map((l) => `dev server: ${l.slice(0, 300)}`);
    return [...problems, ...forwarded].filter((p) => !/Download the React DevTools|_next\/hmr|WebSocket connection/.test(p));
  };
  try {
    for (const [name, route] of Object.entries(SCREENS)) {
      if (!opts.screens.includes(name)) continue;
      const problems = await visit(route);
      if (problems.length) fail(`dev ${route}: ${problems.join(' | ')}`); else ok(`dev ${route}: hydrated with no warnings`);
    }
    // Controls: the server HTML of /logs altered in flight must be reported, or this pass cannot see a mismatch.
    const controls = [
      ['an attribute', (html) => html.replace('aria-label="Requests"', 'aria-label="Requests (planted)"')],
      ['a text', (html) => html.replace('>Activity logs</h1>', '>Activity logs (planted)</h1>')],
    ];
    for (const [what, plant] of controls) {
      const problems = await visit('/logs', plant);
      if (problems.some((p) => /hydrat/i.test(p))) ok(`dev /logs with ${what} mismatch planted: reported, so the check catches it`);
      else fail(`dev /logs with ${what} mismatch planted: not reported (${problems.join(' | ') || 'nothing logged'}), so this check cannot see one`);
    }
  } finally { await browser.close(); }
}

/* ---------------------------------------------------------------- 5. render-equal */
// One render-equal call; returns its runs (or an error string).
async function renderEqualRuns(app, fire, name, engines, widths, themes, tag) {
  const json = path.join(OUT, `render-equal-${name}${tag}.json`);
  const r = await runAsync(process.execPath, [path.join(REPO, 'scripts/render-equal.mjs'),
    '--ref', `${fire}/templates/${name}.html`, '--ref-root', '.fd-page',
    '--cand', `${app}${SCREENS[name]}`, '--cand-root', '.fd-page',
    '--widths', String(widths), '--themes', themes, '--engines', engines,
    '--json', json, '--diff-dir', path.join(OUT, `diff-${name}${tag}`)]);
  if (!existsSync(json)) return `no report (exit ${r.status})\n${r.out.slice(-2000)}`;
  const report = JSON.parse(readFileSync(json, 'utf8'));
  for (const x of report.runs) x.limit = report.options.maxPixelRatio;
  return report.runs;
}

async function renderEqual(app, fire) {
  const summary = [];
  for (const name of opts.screens) {
    const runs = await renderEqualRuns(app, fire, name, opts.engines.join(','), opts.widths, opts.themes, '');
    if (typeof runs === 'string') { fail(`render-equal ${name}: ${runs}`); continue; }
    for (const x of runs) {
      const limit = x.limit;
      const structural = x.structure.length;
      const px = x.pixels ? (x.pixels.sizeMismatch ? `size ${x.pixels.ref.join('x')} vs ${x.pixels.cand.join('x')}` : `${(x.pixels.ratio * 100).toFixed(4)}%`) : 'n/a';
      const good = !x.errors.length && !structural && !x.styles.length && x.pixels && !x.pixels.sizeMismatch && x.pixels.ratio <= limit;
      const line = `render-equal ${name} ${x.engine} ${x.width} ${x.theme}: ${x.nodes.ref}/${x.nodes.cand} nodes, ${structural} structural, `
        + `${x.styles.length} style, pixels ${px}`;
      summary.push({ name, engine: x.engine, width: x.width, theme: x.theme, good, structural, styles: x.styles.length, px });
      if (good) ok(line);
      else {
        const first = [...x.errors, ...x.structure, ...x.styles].slice(0, 6)
          .map((d) => (typeof d === 'string' ? d : `${d.kind} ${d.path}${d.property ? ` [${d.property}]` : ''}: ${JSON.stringify(d.ref)} -> ${JSON.stringify(d.cand)}`));
        fail(`${line}\n       ${first.join('\n       ')}`);
      }
    }
  }
  return summary;
}

/* ---------------------------------------------------------------- main */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let prod, dev, fire;
try {
  if (!flag('skip-build')) {
    const prep = run(process.execPath, ['scripts/prepare-fire.mjs'], { FIRE_LOOK: 'ember' });
    if (prep.status) throw new Error(`prepare-fire failed\n${prep.out}`);
    const build = run(process.execPath, [NEXT, 'build'], { FIRE_DIST_DIR: DIST, NEXT_TELEMETRY_DISABLED: '1' });
    if (build.status) throw new Error(`next build failed\n${build.out.slice(-4000)}`);
    const sizes = build.out.split('\n').filter((l) => /First Load|kB|Route/.test(l));
    ok(`next build (production, look ember, ${DIST})${sizes.length ? '\n' + sizes.join('\n') : ''}`);
    // The build uses the slim Fire (fire slim, run by prepare-fire.mjs): it must not hold a rule or a module the
    // report dropped. Prints the sizes before and after.
    const verified = run(process.execPath, [path.join(REPO, 'scripts/slim.mjs'), '--verify', path.join(DIST, 'static')]);
    if (verified.status) fail(`the production build holds parts fire slim dropped\n${verified.out}`); else ok(`fire slim --verify\n${verified.out.trim()}`);
  }
  fire = await startServer(REPO);
  const fireBase = `http://127.0.0.1:${fire.port}`;
  const prodPort = await freePort();
  prod = startNext('start', prodPort, { FIRE_DIST_DIR: DIST, NEXT_TELEMETRY_DISABLED: '1' });
  const appBase = `http://127.0.0.1:${prodPort}`;
  await waitFor(`${appBase}/overview`);
  ok(`servers: app ${appBase} (next start), Fire ${fireBase}`);

  await checkServedHtml(appBase);
  await browserPass(appBase);
  await statesPass(appBase);
  let summary = [];
  if (!flag('skip-render')) {
    summary = await renderEqual(appBase, fireBase);
  }
  await stopNext(prod);

  if (!flag('skip-dev')) {
    const devPort = await freePort();
    dev = startNext('dev', devPort, { FIRE_DIST_DIR: DIST, NEXT_TELEMETRY_DISABLED: '1' });
    const devBase = `http://127.0.0.1:${devPort}`;
    await waitFor(`${devBase}/overview`, 180000);
    await hydrationPass(devBase, dev.log);
    await stopNext(dev);
  }

  // lint-markup over app/. Its report goes to a file: a large report written to a pipe is cut short when the lint exits.
  const lintFile = path.join(OUT, 'lint-markup.json');
  const fd = openSync(lintFile, 'w');
  const lint = spawnSync(process.execPath, [path.join(REPO, 'scripts/lint-markup.mjs'), '--surface', 'app', '--json', 'app'], { cwd: HERE, stdio: ['ignore', fd, 'pipe'], encoding: 'utf8' });
  closeSync(fd);
  let findings;
  try { findings = JSON.parse(readFileSync(lintFile, 'utf8')).findings; } catch { findings = null; }
  if (!findings) fail(`lint-markup app: no report (exit ${lint.status})\n${lint.stderr}`);
  else {
    if (findings.length) fail(`lint-markup app: ${findings.length} error(s)\n${findings.map((f) => `       ${f.file}:${f.line}:${f.col} ${f.rule} ${f.message}`).join('\n')}`);
    else ok('lint-markup app: 0 errors');
  }
  // lint-css over app/: the starter's own CSS and tokens against Fire's token contract (errors fail; warnings are printed)
  const css = spawnSync(process.execPath, [path.join(REPO, 'scripts/lint-css.mjs'), 'app'], { cwd: HERE, encoding: 'utf8' });
  if (css.status) fail(`lint-css app: errors\n${css.stdout}${css.stderr}`);
  else ok(`lint-css app: ${css.stdout.trim().split('\n').pop()}`);

  if (summary.length) {
    const bad = summary.filter((s) => !s.good).length;
    console.log(`render-equal: ${summary.length} runs, ${bad} failed`);
  }
} catch (e) {
  fail(String(e.stack || e));
  if (prod) console.log(prod.log().slice(-3000));
  if (dev) console.log(dev.log().slice(-3000));
} finally {
  if (prod) await stopNext(prod);
  if (dev) await stopNext(dev);
  if (fire) await fire.close();
  run(process.execPath, ['scripts/prepare-fire.mjs']); // back to the starter's own look
}
console.log(failures.length ? `\nCHECK FAILED: ${failures.length} problem(s)` : '\nCHECK PASSED');
process.exit(failures.length ? 1 : 0);
