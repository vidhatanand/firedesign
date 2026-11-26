// node --test scripts/test/ : Fire's custom elements.
//   - the committed build outputs are current (build-elements.mjs --check)
//   - fire/elements.js imports Fire's modules from ./js/ instead of bundling them, and the declarations type-check
//   - wrappers/lit/elements.js (fire-design/elements/lit) is the same elements with Lit left to the app: no copy of Lit,
//     the same tags and exports; in each browser, a page that maps `lit` with an import map loads Lit once and the
//     elements render on it, and fire/elements.js still works with no import map
//   - in Chromium, Firefox and WebKit, docs/elements.html renders every element exactly as its markup twin: the
//     element, as its component's root, has the markup root's classes, data-* and ARIA attributes and internals, and
//     each pair of specimens renders to the same pixels; a page that loads fire.js and elements.js runs one instance
//     of each module; the root class survives a framework replacing `class`; nothing logs an error.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright-core';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const node = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });

test('committed build outputs are current', () => {
  const run = node(['scripts/build-elements.mjs', '--check']);
  assert.equal(run.status, 0, run.stderr + run.stdout);
});

test('elements.js imports Fire modules from ./js/ and bundles none of them', () => {
  const js = readFileSync(path.join(ROOT, 'fire/elements.js'), 'utf8');
  const imports = [...js.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ['./js/charts.js', './js/code.js', './js/icons.js', './js/texture.js']);
  for (const marker of ['function niceScale', 'const LANGS', 'class AsciiField', 'function injectSprite', 'export function emit']) {
    assert.ok(!js.includes(marker), `elements.js contains Fire module code (${marker})`);
  }
  assert.match(js, /fire\/LICENSE-lit\.txt/);
});

test('fire.d.ts and elements.d.ts type-check against their usage files', () => {
  const run = node([path.join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--target', 'es2022', '--module', 'nodenext',
    '--moduleResolution', 'nodenext', '--lib', 'es2022,dom,dom.iterable', '--skipLibCheck', 'false',
    'scripts/test/types-usage.ts', 'scripts/test/elements-usage.ts']);
  assert.equal(run.status, 0, run.stdout + run.stderr);
});

/* ---------- wrappers/lit/elements.js: the elements on the app's own Lit ---------- */
const LIT_JS = readFileSync(path.join(ROOT, 'wrappers/lit/elements.js'), 'utf8');
const BUNDLED_JS = readFileSync(path.join(ROOT, 'fire/elements.js'), 'utf8');
const definedTags = (js) => [...js.matchAll(/customElements\.define\("(fd-[\w-]+)"/g)].map((m) => m[1]);
const exported = (js) => /^export \{([^}]*)\};\s*(?:\/\*[\s\S]*\*\/\s*)?$/m.exec(js)?.[1].split(',').map((n) => n.trim()).filter(Boolean).sort();

test('wrappers/lit/elements.js imports Lit from the app and carries no copy of it', () => {
  const imports = [...LIT_JS.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
  const lit = [...new Set(imports.filter((s) => !s.startsWith('../../fire/js/')))].sort();
  assert.deepEqual(lit, ['lit', 'lit/decorators.js', 'lit/directives/if-defined.js', 'lit/directives/keyed.js']);
  // It sits outside fire/ (fire/ loads nothing from outside itself) and reaches Fire's modules there, the files fire.js loads.
  assert.deepEqual([...new Set(imports.filter((s) => s.startsWith('../../fire/js/')))].sort(), ['../../fire/js/charts.js', '../../fire/js/code.js', '../../fire/js/icons.js', '../../fire/js/texture.js']);
  // What each Lit package does as it loads: in wrappers/lit/elements.js, any of these is a second Lit.
  for (const marker of ['litElementVersions', 'litHtmlVersions', 'reactiveElementVersions', '_$litDirective$', 'node_modules/', 'Google LLC']) {
    assert.ok(!LIT_JS.includes(marker), `wrappers/lit/elements.js contains Lit's code (${marker})`);
    if (marker !== 'node_modules/') assert.ok(BUNDLED_JS.includes(marker), `elements.js no longer bundles Lit (${marker})`);
  }
  const [peer, bundled] = [Buffer.byteLength(LIT_JS), Buffer.byteLength(BUNDLED_JS)];
  assert.ok(peer < bundled / 2, `wrappers/lit/elements.js is ${peer} bytes, elements.js ${bundled}`);
});

test('wrappers/lit/elements.js registers the same elements and exports the same names as elements.js', () => {
  assert.deepEqual(definedTags(LIT_JS), ['fd-icon', 'fd-chart', 'fd-code', 'fd-texture']);
  assert.deepEqual(definedTags(LIT_JS), definedTags(BUNDLED_JS));
  assert.deepEqual(exported(LIT_JS), ['FdChart', 'FdCode', 'FdIcon', 'FdTexture', 'FireElement']);
  assert.deepEqual(exported(LIT_JS), exported(BUNDLED_JS));
});

test('package.json: fire-design/elements/lit is the peer build, with the same types, and lit is an optional peer', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.exports['./elements'], { types: './fire/elements.d.ts', default: './fire/elements.js' });
  assert.deepEqual(pkg.exports['./elements/lit'], { types: './fire/elements.d.ts', default: './wrappers/lit/elements.js' });
  assert.ok(pkg.files.includes('fire'), 'fire/ is packed');
  assert.match(pkg.peerDependencies.lit, /^\^3\./);
  assert.equal(pkg.peerDependenciesMeta.lit?.optional, true);
  // The range covers the Lit the elements are built and tested with.
  const [major] = pkg.devDependencies.lit.split('.');
  assert.equal(`^${major}`, pkg.peerDependencies.lit.split('.')[0]);
});

/* ---------- browsers ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.ico': 'image/x-icon' };
function serve(pages = {}) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (pages[url.pathname]) { res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' }).end(pages[url.pathname]); return; }
    const file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/* Runs in the page: each twin pair's specimens, serialised so that an element and its markup root compare alike.
 * A component root (an element host, or the markup's svg.fd-icon, .fd-chart, .fd-codeblock, …) is written as <root>
 * with its classes as a set and only the attributes the markup form defines (data-*, aria-*, role, tabindex, style,
 * id); the SVG an fd-icon draws inside itself stands for the markup SVG's own children. Comments (Lit's markers) and
 * whitespace-only text are dropped, attributes sorted, generated ids numbered in order, JSON configs reparsed. */
function compareTwins() {
  const HOSTS = 'fd-icon, fd-chart, fd-code, fd-texture';
  const ROOTS = `${HOSTS}, svg.fd-icon, .fd-chart, .fd-sparkline, .fd-donut, .fd-heatgrid, .fd-codeblock, .fd-ascii`;
  const ROOT_ATTR = /^(data-|aria-|role$|tabindex$|style$|id$)/;
  const serialise = (spec) => {
    const clone = spec.cloneNode(true);
    clone.querySelectorAll('fd-icon > svg').forEach((svg) => svg.replaceWith(...svg.childNodes));
    const ids = [...clone.querySelectorAll('[id]')].map((el) => el.id).sort((a, b) => b.length - a.length);
    const order = [...clone.querySelectorAll('[id]')].map((el) => el.id);
    const fix = (value) => ids.reduce((v, id) => v.split(id).join(`#id${order.indexOf(id)}`), value);
    const out = [];
    const walk = (n) => {
      if (n.nodeType === 3) { if (n.textContent.trim()) out.push(fix(n.textContent)); return; }
      if (n.nodeType !== 1) return;
      const root = n.matches(ROOTS);
      const tag = root ? 'root' : n.localName;
      const attrs = [...n.attributes]
        .filter((a) => !root || a.name === 'class' || ROOT_ATTR.test(a.name))
        .map((a) => `${a.name}="${a.name === 'class' ? a.value.split(/\s+/).filter(Boolean).sort().join(' ') : fix(a.value)}"`)
        .sort().join(' ');
      out.push(`<${tag} ${attrs}>`);
      if (n.localName === 'script' && n.getAttribute('type') === 'application/json') out.push(JSON.stringify(JSON.parse(n.textContent)));
      else n.childNodes.forEach(walk);
      out.push(`</${tag}>`);
    };
    clone.childNodes.forEach(walk);
    return out.join('');
  };
  const pairs = {};
  for (const spec of document.querySelectorAll('[data-twin]')) (pairs[spec.dataset.twin] ??= {})[spec.dataset.form] = spec;
  return Object.entries(pairs).map(([name, { element, markup }]) => {
    const a = serialise(element);
    const b = serialise(markup);
    let at = 0;
    while (at < a.length && a[at] === b[at]) at += 1;
    return { name, hosts: element.querySelectorAll(HOSTS).length, equal: a === b, length: a.length, element: a.slice(Math.max(0, at - 120), at + 200), markup: b.slice(Math.max(0, at - 120), at + 200) };
  });
}

/* Screenshot both specimens of a pair and count the pixels that differ (anti-aliasing excluded, as pixelmatch does). */
async function pixelDiff(page, twin) {
  const shot = async (form) => PNG.sync.read(await page.locator(`[data-twin="${twin}"][data-form="${form}"]`).screenshot({ animations: 'disabled', caret: 'hide' }));
  const a = await shot('element');
  const b = await shot('markup');
  if (a.width !== b.width || a.height !== b.height) return { size: `${a.width}x${a.height} vs ${b.width}x${b.height}`, pixels: Infinity };
  return { size: `${a.width}x${a.height}`, pixels: pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 }) };
}

async function settle(page) {
  await page.evaluate(async () => {
    await Promise.all(['fd-icon', 'fd-chart', 'fd-code', 'fd-texture'].map((n) => customElements.whenDefined(n)));
    await Promise.all([...document.querySelectorAll('fd-icon, fd-chart, fd-code, fd-texture')].map((el) => el.updateComplete));
    await document.fonts.ready;
  });
}

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  test(`docs/elements.html in ${name}: every element renders as its markup twin, modules are shared`, async () => {
    const server = await serve();
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      const errors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.goto(`http://127.0.0.1:${server.address().port}/docs/elements.html`, { waitUntil: 'load' });
      await settle(page);

      // Charts redraw on resize and after fonts load (debounced); compare until both forms have settled.
      let twins;
      for (let tries = 0; tries < 20; tries++) {
        await page.waitForTimeout(250);
        twins = await page.evaluate(compareTwins);
        if (twins.every((t) => t.equal)) break;
      }
      assert.ok(twins.length >= 11, `found ${twins.length} twin pairs`);
      for (const t of twins) {
        assert.ok(t.hosts > 0 && t.length > 80, `${t.name}: nothing rendered`);
        assert.ok(t.equal, `${t.name} differs\n element: ${t.element}\n markup:  ${t.markup}`);
      }
      await page.mouse.move(0, 0);
      for (const t of twins) {
        const diff = await pixelDiff(page, t.name);
        assert.equal(diff.pixels, 0, `${t.name}: ${diff.pixels} pixels differ (${diff.size})`);
      }

      const shared = await page.evaluate(async () => {
        const fire = await import('/fire/fire.js'); // the URL the page loaded: the same module instance
        const root = document.querySelector('[data-twin="line"][data-form="element"] fd-chart');
        fire.charts.update(root, { labels: ['1', '2', '3', '4', '5', '6', '7', '8'], series: [{ name: 'A', values: [1, 2, 3, 4, 5, 6, 7, 8] }] });
        const loads = (file) => performance.getEntriesByType('resource').filter((e) => new URL(e.name).pathname === `/fire/js/${file}`).length;
        return {
          plots: root.querySelectorAll(':scope > .fd-chart-plot').length,
          rows: root.querySelectorAll('table tbody tr').length,
          loads: ['core.js', 'icons.js', 'charts.js', 'code.js', 'texture.js'].map(loads),
        };
      });
      // A second copy of charts.js would not know this chart and would draw a second plot into it.
      assert.equal(shared.plots, 1, 'charts.update from fire.js reached the chart elements.js drew');
      assert.equal(shared.rows, 8);
      assert.deepEqual(shared.loads, [1, 1, 1, 1, 1], 'each Fire module is fetched once');

      const behaviour = await page.evaluate(async () => {
        const out = {};
        // Registering twice is a no-op: a second copy of elements.js loads without an error.
        await import('/fire/elements.js?second-copy');
        out.defined = customElements.get('fd-chart') === document.querySelector('fd-chart').constructor;
        // Data as a property redraws in place, and the chart's events bubble out of the element.
        const host = document.querySelector('[data-twin="bar"][data-form="element"] fd-chart');
        const plot = host.querySelector(':scope > .fd-chart-plot');
        host.data = { labels: ['a', 'b', 'c'], series: [{ name: 'S', values: [3, 1, 2] }, { name: 'T', values: [1, 1, 1] }] };
        host.legend = true;
        await host.updateComplete;
        out.samePlot = host.querySelector(':scope > .fd-chart-plot') === plot;
        out.legendAttr = host.hasAttribute('data-legend');
        out.rows = host.querySelectorAll('table tbody tr').length;
        let change = null;
        host.addEventListener('fd:change', (e) => { change = e.detail; });
        host.querySelector('.fd-legend-item').click();
        out.change = change;
        // A changed icon draws a new SVG; a class set by the page stays, and the root class comes back after a
        // framework replaces the class attribute.
        const icon = document.querySelector('fd-icon');
        icon.classList.add('mine');
        icon.icon = 'zap';
        await icon.updateComplete;
        out.icon = [icon.dataset.icon, icon.querySelector(':scope > svg > use')?.getAttribute('href')];
        icon.className = 'theirs';
        icon.size = '20';
        await icon.updateComplete;
        out.classes = icon.className;
        // New code renders a fresh, highlighted block.
        const code = document.querySelector('fd-code');
        code.code = 'const a = 1;\nconst b = 2;';
        await code.updateComplete;
        out.lines = code.querySelectorAll('.fd-codeblock-line').length;
        out.keyword = code.querySelector('.fd-syntax-keyword')?.textContent;
        return out;
      });
      assert.deepEqual(behaviour, {
        defined: true, samePlot: true, legendAttr: true, rows: 3, change: { value: 'S', index: 0, visible: false },
        icon: ['zap', '#i-zap'], classes: 'theirs fd-icon', lines: 2, keyword: 'const',
      });

      assert.deepEqual(errors, [], 'console errors');
      await context.close();
    } finally {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

/* An app with its own Lit: an import map stands for its bundler. The app imports lit, defines a Lit element that
 * renders Fire's elements, then imports Fire's elements. `elements` picks which file. */
const IMPORT_MAP = JSON.stringify({ imports: {
  lit: '/node_modules/lit/index.js',
  'lit/': '/node_modules/lit/',
  'lit-html': '/node_modules/lit-html/lit-html.js',
  'lit-html/': '/node_modules/lit-html/',
  'lit-element/': '/node_modules/lit-element/',
  '@lit/reactive-element': '/node_modules/@lit/reactive-element/reactive-element.js',
  '@lit/reactive-element/': '/node_modules/@lit/reactive-element/',
} });
const litApp = (elements) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Ember runs</title>
<link rel="stylesheet" href="/fire/fire.css">
<script type="importmap">${IMPORT_MAP}</script>
<script type="module">
import { LitElement, html } from 'lit';
import { FdIcon } from '${elements}';
class EmberRuns extends LitElement {
  createRenderRoot() { return this; }
  render() {
    return html\`<h1><fd-icon icon="zap"></fd-icon> Deploys</h1>
      <fd-chart type="bar" .data=\${{ labels: ['Mon', 'Tue', 'Wed'], series: [{ name: 'Deploys', values: [4, 7, 5] }] }}></fd-chart>\`;
  }
}
customElements.define('ember-runs', EmberRuns);
window.app = { LitElement, FdIcon };
</script></head><body><ember-runs></ember-runs></body></html>`;
const noBuild = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Ember runs</title>
<link rel="stylesheet" href="/fire/fire.css">
<script type="module" src="/fire/elements.js"></script>
</head><body><h1><fd-icon icon="zap"></fd-icon> Deploys</h1><fd-code lang="bash" code="ember deploy --prod"></fd-code></body></html>`;

/* Runs in the page: how many copies of Lit loaded, and what the elements drew. */
async function litReport() {
  await Promise.all(['fd-icon', 'fd-chart', 'fd-code', 'fd-texture'].map((n) => customElements.whenDefined(n)));
  await document.querySelector('ember-runs')?.updateComplete;
  await Promise.all([...document.querySelectorAll('fd-icon, fd-chart, fd-code')].map((el) => el.updateComplete));
  const icon = document.querySelector('fd-icon');
  const chart = document.querySelector('fd-chart');
  const code = document.querySelector('fd-code');
  return {
    litElement: globalThis.litElementVersions?.length ?? 0,
    litHtml: globalThis.litHtmlVersions?.length ?? 0,
    reactiveElement: globalThis.reactiveElementVersions?.length ?? 0,
    // The elements are built on the app's LitElement, not on a copy of their own.
    appLit: window.app ? icon instanceof window.app.LitElement && icon instanceof window.app.FdIcon : null,
    tags: ['fd-icon', 'fd-chart', 'fd-code', 'fd-texture'].filter((n) => customElements.get(n)),
    icon: [icon.className, icon.querySelector(':scope > svg > use')?.getAttribute('href')],
    chart: chart ? [chart.querySelectorAll(':scope > .fd-chart-plot').length, chart.querySelectorAll('table tbody tr').length] : null,
    code: code ? code.querySelectorAll('.fd-codeblock-line').length : null,
  };
}

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  test(`in ${name}: a Lit app loads one Lit with wrappers/lit/elements.js, two with elements.js; elements.js alone needs no import map`, async () => {
    const server = await serve({ '/peer.html': litApp('/wrappers/lit/elements.js'), '/bundled.html': litApp('/fire/elements.js'), '/plain.html': noBuild });
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const open = async (file) => {
        const page = await context.newPage();
        const errors = [];
        page.on('console', (msg) => { if (msg.type() === 'error' || /multiple versions of lit/i.test(msg.text())) errors.push(msg.text()); });
        page.on('pageerror', (error) => errors.push(String(error)));
        await page.goto(`http://127.0.0.1:${server.address().port}/${file}`, { waitUntil: 'load' });
        const report = await page.evaluate(litReport);
        await page.close();
        return { ...report, errors };
      };
      const tags = ['fd-icon', 'fd-chart', 'fd-code', 'fd-texture'];
      const peer = await open('peer.html');
      console.log(`${name} peer.html ${JSON.stringify(peer)}`);
      assert.deepEqual(peer, { litElement: 1, litHtml: 1, reactiveElement: 1, appLit: true, tags, icon: ['fd-icon', '#i-zap'], chart: [1, 3], code: null, errors: [] });
      // The bug the peer build fixes: the bundled file brings its own Lit into a Lit app.
      const bundled = await open('bundled.html');
      console.log(`${name} bundled.html ${JSON.stringify(bundled)}`);
      assert.equal(bundled.litElement, 2);
      assert.equal(bundled.appLit, false);
      const plain = await open('plain.html');
      console.log(`${name} plain.html ${JSON.stringify(plain)}`);
      assert.deepEqual(plain, { litElement: 1, litHtml: 1, reactiveElement: 1, appLit: null, tags, icon: ['fd-icon', '#i-zap'], chart: null, code: 1, errors: [] });
      await context.close();
    } finally {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    }
  });
}
