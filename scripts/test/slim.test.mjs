// fire slim (scripts/slim.mjs) and its map (contract/slim-map.json): what it keeps and why, the theme path, the entry
// it writes, --check, the report, the minimal product in a browser, and `component` level against the whole of Fire
// on a dozen of Fire's templates (render-equal: structure, styles and pixels at 1440 and 375, light and dark).
// The starters' `npm run check` is the proof on real production builds.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { slim, verify } from '../slim.mjs';
import { run as renderEqual } from '../render-equal.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MINIMAL = path.join(ROOT, 'scripts/test/fixtures/slim/minimal');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fire-slim-'));
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/slim-map.json'), 'utf8'));

/** Slims a product given as { 'file.html': text, … } and returns the report and the output folder. */
async function product(files, opts = {}) {
  const dir = tmp();
  for (const [f, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), text);
  const out = path.join(dir, 'out');
  const { report } = await slim({ sources: Object.keys(files), cwd: dir, out, level: 'component', ...opts });
  return { report, out, dir, css: fs.readFileSync(path.join(out, 'fire.css'), 'utf8'), js: fs.readFileSync(path.join(out, 'fire.js'), 'utf8') };
}
const kept = (r) => r.report.kept;

test('the map is generated from Fire\'s sources and current', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/build-slim-map.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(map.order[0], 'tokens.css');
  assert.equal(map.order.at(-1), 'layout.css');
  assert.deepEqual(map.components.toast.modules, ['overlays']);
  assert.deepEqual(map.components.button.modules, []);
  assert.ok(map.modules.filters.imports.includes('overlays'));
  assert.equal(map.exports.transition, 'transitions');
  assert.equal(map.wrappers.FireChart, 'fd-chart');
});

test('a class, an element, a wrapper and an attribute map to their components and modules', async () => {
  const r = await product({
    'page.html': '<div class="fd-card"><span data-fd-tooltip="Copy">x</span><fd-chart type="line"></fd-chart></div>',
    'view.tsx': 'export const V = () => <FireCode lang="bash" code="ls" />;',
  });
  assert.match(kept(r).components.card, /^page\.html:1 \(\.fd-card\)$/);
  assert.match(kept(r).components.chart, /<fd-chart>/);
  assert.match(kept(r).components.codeblock, /view\.tsx:1 \(<FireCode>\)/);
  assert.match(kept(r).modules.overlays, /data-fd-tooltip/);
  assert.ok(kept(r).components.tooltip, 'overlays builds the tooltip');
  assert.ok(kept(r).modules.charts && kept(r).modules.code);
  assert.ok(r.report.dropped.modules.includes('site') && r.report.dropped.components.includes('site-hero'));
  assert.doesNotMatch(r.css, /\.fd-site-hero\b/);
});

test('API use: named, namespace and dynamic imports from fire-design keep their modules', async () => {
  const r = await product({
    'a.ts': "import { overlays, type PageState } from 'fire-design';\noverlays.toast({ title: 'Saved' });",
    'b.ts': "import * as F from 'fire-design';\nF.charts.render(el, {});",
    'c.ts': "import('fire-design').then((fire) => fire.nav.selectTab(tab));",
    'd.ts': "import { transition } from 'fire-design';",
  });
  assert.match(kept(r).modules.overlays, /^a\.ts:1 \(overlays\)$/);
  assert.match(kept(r).modules.charts, /^b\.ts:2/);
  assert.match(kept(r).modules.nav, /^c\.ts:1/);
  assert.match(kept(r).modules.transitions, /^d\.ts:1 \(transition\)$/);
  assert.ok(kept(r).components.toast, 'toast() builds a toast');
  assert.ok(!r.report.unknown.some((u) => /PageState/.test(u.name)), 'a type import is not a name');
});

const BY_PATH = path.join(ROOT, 'scripts/test/fixtures/slim/by-path');
const byPath = async (sources) => (await slim({ sources, cwd: BY_PATH, out: path.join(tmp(), 'out'), level: 'component' })).report;

test('Fire imported by path: every form keeps the modules it names, as the package does', async () => {
  const r = await byPath(['index.html', 'shell.js']);
  const mods = Object.keys(r.kept.modules);
  for (const m of ['shell', 'overlays', 'tweaks', 'charts', 'nav', 'filters', 'content', 'code']) assert.ok(mods.includes(m), `${m} is kept: ${mods}`);
  assert.match(r.kept.modules.tweaks, /^shell\.js:2 \(tweaks\)$/, 'a named import from /fire/fire.js');
  assert.match(r.kept.modules.charts, /^shell\.js:3 \(charts\)$/, 'a relative path');
  assert.match(r.kept.modules.content, /^shell\.js:4 \(\/fire\/js\/content\.js\)$/, 'one module file');
  assert.match(r.kept.modules.nav, /^shell\.js:11 \(nav\)$/, 'a namespace import read through a member');
  assert.match(r.kept.modules.filters, /^shell\.js:7 \(filters\)$/, 'a destructured import() of the entry');
  assert.match(r.kept.modules.code, /^shell\.js:8 \(\/fire\/js\/code\.js\)$/, 'import() of one module file');
  for (const m of ['agent', 'chat', 'site', 'docsite', 'texture', 'transitions']) assert.ok(r.dropped.modules.includes(m), `${m} is dropped`);
  assert.deepEqual(r.loadedBy.unresolved, []);
  assert.equal(r.unknown.length, 0, JSON.stringify(r.unknown));
});

test('Fire imported by path: a namespace used where no member can be read keeps every module and says where', async () => {
  const r = await byPath(['loose.html']);
  assert.deepEqual(Object.keys(r.kept.modules), Object.keys(map.modules));
  assert.deepEqual(r.loadedBy.unresolved, [{ at: 'loose.html:10', specifier: '/fire/fire.js' }]);
  assert.match(r.kept.modules.charts, /^loose\.html:10 .*no member can be read/);
  assert.deepEqual(r.dropped.modules, []);
  const lone = await product({ 'a.js': "const f = import('/fire/fire.js');", 'b.js': "const { init } = await import('/fire/fire.js');\nimport('/fire/fire.js').then((F) => F.nav.go());" });
  assert.deepEqual(lone.report.loadedBy.unresolved.map((u) => u.at), ['a.js:1']);
});

test('Fire loaded by a script tag alone: the markup decides, and the report names the tag and the path', async () => {
  const r = await byPath(['tag-only.html']);
  assert.deepEqual(Object.keys(r.kept.modules), ['overlays', 'content'], 'what the card and the base need, nothing the tag adds');
  assert.ok(r.kept.components.card && !r.kept.components.chart);
  assert.deepEqual(r.loadedBy, { by: 'path', specifiers: ['../fire/fire.js'], tags: [{ at: 'tag-only.html:9', src: '../fire/fire.js' }], unresolved: [] });
});

test('loadedBy says package, path or both; package imports are read exactly as before', async () => {
  const pkg = await product({ 'a.ts': "import { overlays } from 'fire-design';\nimport * as F from 'fire-design';\nregister(F);" });
  assert.deepEqual(pkg.report.loadedBy, { by: 'package', specifiers: ['fire-design'], tags: [], unresolved: [] });
  assert.deepEqual(Object.keys(kept(pkg).modules), ['overlays', 'content'], 'a package namespace passed around is not followed');
  const both = await product({ 'a.ts': "import { overlays } from 'fire-design';", 'b.ts': "import { charts } from '/fire/fire.js';" });
  assert.equal(both.report.loadedBy.by, 'both');
  assert.deepEqual(both.report.loadedBy.specifiers, ['/fire/fire.js', 'fire-design']);
  assert.equal((await product({ 'p.html': '<button class="fd-btn">Go</button>' })).report.loadedBy.by, 'none');
});

test('what Fire\'s behaviour builds is kept: a date field, the combined filter, a copy that raises a toast', async () => {
  const date = await product({ 'p.html': '<div class="fd-datefield" data-fd-datefield><input class="fd-input"></div>' });
  assert.ok(kept(date).modules.forms, 'forms runs the date field');
  for (const id of ['popover', 'button', 'date-picker']) assert.ok(kept(date).components[id], `a date field keeps ${id}`);
  const filters = await product({ 'p.html': '<div class="fd-filters" data-fd-filters></div>' });
  assert.ok(kept(filters).modules.filters && kept(filters).modules.overlays);
  for (const id of ['menu', 'sheet']) assert.ok(kept(filters).components[id], `filters keeps ${id}`);
  const copy = await product({ 'p.html': '<button class="fd-btn" data-fd-doc-copy-page>Copy page</button>' });
  assert.ok(kept(copy).modules.docsite && kept(copy).modules.overlays, 'the copy button\'s module imports toast() from overlays');
  assert.ok(kept(copy).components.toast);
  assert.match(copy.css, /\.fd-toast\b/);
});

test('--include keeps what no scan can see; a class built from a string is reported with its line', async () => {
  const src = { 'v.ts': "const tone = 'ok';\nexport const t = html`<span class=\"fd-badge fd-badge-${tone}\">x</span>`;\nel.className = cls;" };
  const r = await product(src, { include: ['charts', 'site'] });
  assert.ok(kept(r).modules.charts && kept(r).components.chart);
  assert.ok(kept(r).components['site-hero'] && kept(r).modules.site);
  assert.ok(r.report.dynamic.some((d) => d.at === 'v.ts:2' && /fd-badge-\$\{…\}/.test(d.expr)), JSON.stringify(r.report.dynamic));
  await assert.rejects(() => product(src, { include: ['nope'] }), /--include nope/);
});

test('the theme path: one palette, one type set, its fonts copied; without a theme everything stays', async () => {
  const markup = { 'p.html': '<button class="fd-btn">Go</button>' };
  const r = await product(markup, { theme: { contract: 'fire/1', palette: 'ocean', type: 'poster', dials: { density: 'compact' } } });
  assert.deepEqual(kept(r).palettes, ['ocean']);
  assert.deepEqual(kept(r).typeSets, ['poster']);
  assert.match(r.css, /\[data-palette="ocean"\]/);
  assert.doesNotMatch(r.css, /\[data-palette="volt"\]/);
  assert.match(r.css, /\[data-type="poster"\]/);
  assert.doesNotMatch(r.css, /\[data-type="editorial"\]/);
  assert.deepEqual(kept(r).dials['data-density'], ['compact']);
  assert.doesNotMatch(r.css, /\[data-density="spacious"\]/);
  assert.match(r.css, /\[data-density="compact"\]/);
  const fonts = fs.readdirSync(path.join(r.out, 'fonts')).sort();
  assert.deepEqual(fonts, kept(r).fonts);
  assert.ok(fonts.some((f) => f.startsWith('big-shoulders')) && fonts.some((f) => f.startsWith('archivo')) && fonts.some((f) => f.startsWith('geist-mono')));
  assert.ok(!fonts.some((f) => f.startsWith('geist-latin')), 'poster does not use Geist');
  for (const m of r.css.matchAll(/url\("\.\/fonts\/([^"]+)"\)/g)) assert.ok(fonts.includes(m[1]), m[1]);
  // A family-level slim keeps whole stylesheets, the theme path is the same at both levels.
  const fam = await product(markup, { level: 'family', theme: { contract: 'fire/1', palette: 'ocean' } });
  assert.deepEqual(kept(fam).palettes, ['ocean']);
  assert.match(fam.css, /\[data-density="spacious"\]/, 'dials are only trimmed at component level');
  const none = await product(markup);
  assert.equal(kept(none).palettes, 'all');
  assert.match(none.css, /\[data-palette="volt"\]/);
  const tweaks = await product({ 'p.html': '<button data-fd-tweaks-open>Tweaks</button>' }, { theme: { contract: 'fire/1', palette: 'ocean' } });
  assert.equal(kept(tweaks).palettes, 'all');
  assert.match(tweaks.report.tweaks, /Tweaks panel/);
});

test('the entry: kept modules work, a dropped one fails the build by name', async () => {
  const r = await product({ 'p.html': '<div class="fd-field"><input class="fd-input"></div>', 'a.ts': "import { overlays } from 'fire-design';" });
  assert.match(r.js, /^const modules = \{ forms, overlays, content \};$/m);
  assert.match(r.js, /^export \{ forms, overlays, content \};$/m);
  assert.doesNotMatch(r.js, /transitions\.js/);
  const esbuild = path.join(ROOT, 'node_modules/esbuild/bin/esbuild');
  const build = (code) => {
    fs.writeFileSync(path.join(r.dir, 'entry.js'), code);
    return spawnSync(esbuild, ['entry.js', '--bundle', '--format=esm', `--alias:fire-design=${path.join(r.out, 'fire.js')}`, '--outfile=bundle.js', '--log-level=error'], { cwd: r.dir, encoding: 'utf8' });
  };
  const ok = build("import { overlays, init, toast } from 'fire-design';\nconsole.log(overlays.toast, init);");
  assert.match(ok.stderr, /No matching export.*"toast"/, 'toast is a member of overlays, not an export');
  const good = build("import { overlays, init, copyText, icon } from 'fire-design';\nconsole.log(overlays.toast, init, copyText, icon);");
  assert.equal(good.status, 0, good.stderr);
  const bad = build("import { charts } from 'fire-design';\nconsole.log(charts);");
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /No matching export in ".*fire\.js" for import "charts"/);
  assert.match(r.js, /Dropped: shell, nav, data, filters, code, agent, chat, charts/);
});

test('--check passes when current and fails when the sources changed; the report says why each part is there', async () => {
  const r = await product({ 'p.html': '<button class="fd-btn">Go</button>' });
  const again = await slim({ sources: ['p.html'], cwd: r.dir, out: r.out, level: 'component', check: true });
  assert.deepEqual(again.stale, []);
  fs.writeFileSync(path.join(r.dir, 'p.html'), '<button class="fd-btn">Go</button><table class="fd-table"></table>');
  const stale = await slim({ sources: ['p.html'], cwd: r.dir, out: r.out, level: 'component', check: true });
  assert.ok(stale.stale.includes('fire.css') && stale.stale.includes('slim.json'));
  const report = JSON.parse(fs.readFileSync(path.join(r.out, 'slim.json'), 'utf8'));
  assert.equal(report.kept.components.button, 'p.html:1 (.fd-btn)');
  assert.ok(report.kept.stylesheets.includes('components/button.css'));
  assert.ok(report.dropped.stylesheets.includes('components/site.css'));
  for (const k of ['css', 'js', 'fonts']) for (const w of ['before', 'after']) assert.ok(report.sizes[k][w].raw >= report.sizes[k][w].gzip || k === 'fonts');
  assert.ok(report.sizes.css.after.raw < report.sizes.css.before.raw / 4);
  // --verify: a bundle of the whole of Fire holds what the report dropped.
  const whole = tmp();
  fs.copyFileSync(path.join(ROOT, 'fire/js/site.js'), path.join(whole, 'a.js'));
  fs.writeFileSync(path.join(whole, 'a.css'), '.fd-site-hero{color:red}.fd-btn{color:blue}');
  const v = verify(whole, report);
  assert.ok(v.problems.some((p) => /fd-site-hero/.test(p)) && v.problems.some((p) => /module site/.test(p)), v.problems.join('\n'));
  assert.equal(verify(r.out, report).problems.length, 0);
});

/* ------------------------------------------------------------------ in a browser */

function serve(routes) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const hit = routes(url) ?? { file: path.join(ROOT, url) };
    if (hit.body === undefined && (!fs.existsSync(hit.file) || fs.statSync(hit.file).isDirectory())) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[hit.type ?? path.extname(hit.file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(hit.body ?? fs.readFileSync(hit.file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }) })));
}
// The slim entry imports Fire's modules by a path relative to its folder; served, they are Fire's /fire/js/ files.
const servedJs = (out) => fs.readFileSync(path.join(out, 'fire.js'), 'utf8').replace(/from '[^']*\/fire\/js\//g, "from '/fire/js/");

test('the minimal product, slimmed, loads with no console error and Fire\'s styles; it is the floor', async () => {
  const out = tmp();
  const { report } = await slim({ sources: ['index.html', 'main.js'], cwd: MINIMAL, out, theme: path.join(MINIMAL, 'theme.json'), level: 'component' });
  assert.deepEqual(Object.keys(report.kept.modules), ['forms', 'overlays', 'content']);
  assert.deepEqual(report.kept.palettes, []);
  assert.deepEqual(report.kept.families, ['Geist', 'Geist Mono']);
  const page = (slimmed) => fs.readFileSync(path.join(MINIMAL, 'index.html'), 'utf8')
    .replace('./.fire-slim/fire.css', slimmed ? '/__out/fire.css' : '/fire/fire.css').replace('./.fire-slim/fire.js', slimmed ? '/__out/fire.js' : '/fire/fire.js')
    .replace('./main.js', '/scripts/test/fixtures/slim/minimal/main.js');
  const srv = await serve((url) => {
    if (url === '/slim.html' || url === '/full.html') return { body: page(url === '/slim.html'), type: '.html' };
    if (url === '/__out/fire.js') return { body: servedJs(out), type: '.js' };
    if (url.startsWith('/__out/')) return { file: path.join(out, url.slice(7)) };
    return null;
  });
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch();
  try {
    const look = async (name) => {
      const p = await browser.newPage();
      const problems = [];
      p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text()); });
      p.on('pageerror', (e) => problems.push(e.message));
      p.on('requestfailed', (r) => problems.push(`failed ${r.url()}`));
      await p.goto(`${srv.origin}/${name}`);
      await p.waitForFunction(() => 'fdReady' in document.documentElement.dataset);
      await p.evaluate(() => document.fonts.ready);
      const styles = await p.evaluate(() => Object.fromEntries(['.fd-btn', '.fd-input', '.fd-field-label', 'body'].map((s) => {
        const cs = getComputedStyle(document.querySelector(s));
        return [s, ['background-color', 'color', 'font-family', 'font-size', 'border-top-color', 'border-radius', 'padding-top', 'height'].map((k) => cs.getPropertyValue(k)).join(' | ')];
      })));
      await p.click('.fd-btn');
      await p.locator('.fd-toast').first().waitFor({ timeout: 3000 });
      const toast = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('.fd-toast')); return [cs.backgroundColor, cs.borderRadius, cs.position].join(' | '); });
      const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).sort().join());
      await p.close();
      return { problems, styles, toast, fonts };
    };
    const full = await look('full.html');
    const slimmed = await look('slim.html');
    assert.deepEqual(slimmed.problems, []);
    assert.deepEqual(slimmed.styles, full.styles);
    assert.equal(slimmed.toast, full.toast);
    assert.match(slimmed.fonts, /Geist/);
  } finally { await browser.close(); await srv.close(); }
});

// Fire's own templates: each slimmed at `component` level from its own markup and scripts, against the whole of Fire.
const TEMPLATES = ['overview', 'logs', 'settings', 'api-keys', 'auth', 'form', 'usage', 'status', 'record', 'onboarding', 'docs-guide', 'site-pricing'];

test('component level renders Fire\'s templates exactly as the whole of Fire (render-equal, 1440 and 375, light and dark)', { timeout: 30 * 60 * 1000 }, async () => {
  const outs = {};
  for (const name of TEMPLATES) {
    const html = fs.readFileSync(path.join(ROOT, `templates/${name}.html`), 'utf8');
    const local = [...html.matchAll(/(?:src="|from ')\.\/([\w-]+\.js)/g)].map((m) => `templates/${m[1]}`);
    outs[name] = tmp();
    await slim({ sources: [`templates/${name}.html`, ...new Set(local)], cwd: ROOT, out: outs[name], level: 'component' });
  }
  const srv = await serve((url) => {
    const page = /^\/templates\/([\w-]+)\.slim\.html$/.exec(url);
    if (page) {
      const name = page[1];
      const html = fs.readFileSync(path.join(ROOT, `templates/${name}.html`), 'utf8')
        .replace('<head>', `<head>\n<script type="importmap">{ "imports": { "/fire/fire.js": "/__slim/${name}/fire.js" } }</script>`)
        .replace('href="../fire/fire.css"', `href="/__slim/${name}/fire.css"`).replace('src="../fire/fire.js"', `src="/__slim/${name}/fire.js"`);
      return { body: html, type: '.html' };
    }
    const slimmed = /^\/__slim\/([\w-]+)\/(.+)$/.exec(url);
    if (slimmed) return slimmed[2] === 'fire.js' ? { body: servedJs(outs[slimmed[1]]), type: '.js' } : { file: path.join(outs[slimmed[1]], slimmed[2]) };
    return null;
  });
  const failed = [];
  try {
    for (const name of TEMPLATES) {
      const report = await renderEqual({ ref: `${srv.origin}/templates/${name}.html`, cand: `${srv.origin}/templates/${name}.slim.html`,
        refRoot: 'body', candRoot: 'body', widths: [1440, 375], themes: ['light', 'dark'], engines: ['chromium'],
        maxPixelRatio: 0.001, pixelThreshold: 0.1, readyTimeout: 6000 });
      for (const r of report.runs) if (!r.ok) failed.push(`${name} ${r.width} ${r.theme}: ${[...r.errors, ...r.structure, ...r.styles].slice(0, 3).map((d) => JSON.stringify(d).slice(0, 200)).join('; ')} pixels ${r.pixels?.ratio}`);
      assert.equal(report.runs.length, 4);
    }
  } finally { await srv.close(); }
  assert.deepEqual(failed, []);
});
