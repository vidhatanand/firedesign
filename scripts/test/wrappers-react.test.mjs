// node --test scripts/test/ : the React wrappers (wrappers/react, fire-design/react).
//   - the generated files are current (build-wrappers.mjs --check), and index.js re-exports every component
//   - the exporter's helpers are exactly the sources in spec/export-map.json
//   - the declarations type-check against scripts/test/wrappers-react-usage.tsx (tsc, @types/react)
//   - in Chromium, Firefox and WebKit, with React 19 (development build) from starters/next/node_modules bundled by
//     esbuild: each wrapper renders the same DOM as its element given the same properties; a new `data` redraws the
//     chart; a real legend click reaches onChange; useFireEvent gets fd:select and can cancel it; useFire enhances Fire
//     markup inserted by a later render; nothing logs an error or a React warning.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STARTER_MODULES = path.join(ROOT, 'starters/next/node_modules');
const node = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });

test('generated wrappers are current', () => {
  const run = node(['scripts/build-wrappers.mjs', '--check']);
  assert.equal(run.status, 0, run.stderr + run.stdout);
});

test('fire-export.js holds exactly the helpers of spec/export-map.json', async () => {
  const map = JSON.parse(readFileSync(path.join(ROOT, 'spec/export-map.json'), 'utf8'));
  const source = readFileSync(path.join(ROOT, 'wrappers/react/fire-export.js'), 'utf8');
  const defined = [...source.matchAll(/^export const (\w+) =/gm)].map((m) => m[1]).sort();
  assert.deepEqual(defined, Object.keys(map.helpers).sort());
  for (const [name, helper] of Object.entries(map.helpers)) assert.ok(source.includes(helper.source), `${name} differs from the spec`);
  const h = await import(path.join(ROOT, 'wrappers/react/fire-export.js'));
  assert.equal(h.jsonForScript({ a: '</script>' }), '{"a":"\\u003c/script>"}');
  assert.deepEqual([h.ccAttr(false), h.ccAttr(null), h.ccAttr(true), h.ccAttr(0)], [undefined, undefined, '', '0']);
  assert.deepEqual([h.ccText(undefined), h.ccText(true), h.ccText(3)], ['', '', '3']);
  assert.deepEqual([h.ccTruthy([]), h.ccTruthy([0]), h.ccTruthy('')], [false, true, false]);
});

test('wrapper declarations type-check against their usage file', () => {
  const run = node([path.join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--target', 'es2022', '--module', 'nodenext',
    '--moduleResolution', 'nodenext', '--lib', 'es2022,dom,dom.iterable', '--jsx', 'react-jsx', '--skipLibCheck', 'false',
    'scripts/test/wrappers-react-usage.tsx']);
  assert.equal(run.status, 0, run.stdout + run.stderr);
});

/* ---------- browsers ---------- */

// The page's script: renders the wrappers with React, the same elements by hand, and reports.
const ENTRY = `
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { FireChart, FireCode, FireIcon, FireTexture, useFire, useFireEvent } from ${JSON.stringify(path.join(ROOT, 'wrappers/react/index.js'))};

const h = React.createElement;
const LINE = { labels: ['Mon', 'Tue', 'Wed', 'Thu'], series: [{ name: 'Requests', values: [3, 5, 4, 8] }, { name: 'Errors', values: [1, 0, 2, 1] }] };
const SPECIMENS = [
  ['fd-icon', FireIcon, { icon: 'search', size: '20' }],
  ['fd-icon', FireIcon, { icon: 'key-round' }],
  ['fd-chart', FireChart, { type: 'sparkline', data: [3, 5, 4, 8], area: true, dot: true }],
  ['fd-chart', FireChart, { type: 'line', data: LINE, legend: true, height: 160 }],
  ['fd-chart', FireChart, { type: 'donut', data: { segments: [{ label: '/scrape', value: 4210, tone: 'info' }, { label: '/crawl', value: 1200, tone: 'violet' }], caption: 'Credits' } }],
  ['fd-code', FireCode, { code: '{ "ok": true, "n": 3 }', language: 'json', lines: true, copy: true, filename: 'response.json' }],
  ['fd-texture', FireTexture, { pattern: 'waves', tone: 'accent', fade: 'x', inline: true }],
];

const log = { changes: [], selects: [], cancelled: null };
let setData, setExtra;
function Wrappers() {
  const [data, set] = React.useState([3, 5, 4, 8]);
  setData = set;
  return h('div', null,
    ...SPECIMENS.map(([, C, props], i) => h('div', { key: i, className: 'pair', 'data-i': i }, h(C, props))),
    h('div', { className: 'pair', id: 'live' }, h(FireChart, { type: 'sparkline', data })),
    h('div', { className: 'pair', id: 'events' }, h(FireChart, { type: 'line', data: LINE, legend: true, height: 160,
      onChange: (e) => log.changes.push(e.detail), onSelect: (e) => log.selects.push(e.detail.index) })));
}
function Hooks() {
  const ref = React.useRef(null);
  const [extra, set] = React.useState(false);
  setExtra = set;
  useFire(ref);
  useFireEvent(ref, 'fd:select', (event) => { log.selects.push(event.detail.action); if (event.detail.action === 'delete') event.preventDefault(); });
  const seg = (id) => h('div', { className: 'fd-segmented', id, role: 'radiogroup', 'aria-label': id },
    h('button', { className: 'fd-segmented-item', type: 'button', role: 'radio', 'aria-checked': 'true', 'data-value': 'a' }, 'A'),
    h('button', { className: 'fd-segmented-item', type: 'button', role: 'radio', 'aria-checked': 'false', 'data-value': 'b' }, 'B'));
  return h('div', { ref, id: 'hooks' }, seg('seg-1'), extra ? seg('seg-2') : null, h('span', { id: 'source' }, 'x'));
}

// The same elements by hand, with the same properties (made when run() starts, so both sides measure the same fonts).
const renderPlain = () => SPECIMENS.forEach(([tag, , props], i) => {
  const box = document.createElement('div');
  box.className = 'pair'; box.dataset.i = i;
  box.append(Object.assign(document.createElement(tag), props));
  document.getElementById('plain').append(box);
});

const serialise = (box) => {
  const clone = box.cloneNode(true);
  // Attributes as a set (render-equal R3): a redraw may write them in another order.
  for (const el of clone.querySelectorAll('*')) {
    const attrs = [...el.attributes].map((a) => [a.name, a.value]).sort(([a], [b]) => a.localeCompare(b));
    for (const [n] of attrs) el.removeAttribute(n);
    for (const [n, v] of attrs) el.setAttribute(n, v);
  }
  const order = [...clone.querySelectorAll('[id]')].map((el) => el.id);
  let html = clone.innerHTML.replace(/<!--[^]*?-->/g, '');
  for (const id of [...order].sort((a, b) => b.length - a.length)) html = html.split(id).join('#id' + order.indexOf(id));
  return html;
};
const settle = async () => {
  await Promise.all(['fd-icon', 'fd-chart', 'fd-code', 'fd-texture'].map((t) => customElements.whenDefined(t)));
  await Promise.all([...document.querySelectorAll('fd-icon, fd-chart, fd-code, fd-texture')].map((el) => el.updateComplete));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};

window.run = async () => {
  await document.fonts.ready;
  renderPlain();
  createRoot(document.getElementById('react')).render(h(React.StrictMode, null, h(Wrappers), h(Hooks)));
  await settle();
  await new Promise((r) => setTimeout(r, 300));
  await settle();
  const out = { pairs: [], live: {}, events: {}, hooks: {} };
  // Charts draw again when their size settles (ResizeObserver): compare once both sides have stopped changing.
  const react = [...document.querySelectorAll('#react .pair[data-i]')];
  const snap = () => react.map((box) => {
    const twin = document.querySelector('#plain .pair[data-i="' + box.dataset.i + '"]');
    return { i: box.dataset.i, tag: box.firstElementChild.localName, react: serialise(box), plain: serialise(twin) };
  });
  for (let k = 0; k < 20; k++) {
    out.pairs = snap();
    if (out.pairs.every((p) => p.react === p.plain)) break;
    await new Promise((r) => setTimeout(r, 100));
    await settle();
  }
  // A new data value redraws.
  const live = document.querySelector('#live fd-chart');
  const before = live.innerHTML;
  flushSync(() => setData([9, 1, 9, 1, 9]));
  await settle();
  out.live = { changed: live.innerHTML !== before, data: JSON.stringify(live.data) };
  // A real legend click reaches onChange.
  document.querySelector('#events .fd-legend-item').click();
  out.events = { changes: log.changes.map((d) => ({ value: d.value, index: d.index, visible: d.visible })) };
  // useFireEvent: fd:select from a descendant, cancellable.
  const source = document.getElementById('source');
  const kept = source.dispatchEvent(new CustomEvent('fd:select', { bubbles: true, cancelable: true, detail: { action: 'open' } }));
  const cancelled = !source.dispatchEvent(new CustomEvent('fd:select', { bubbles: true, cancelable: true, detail: { action: 'delete' } }));
  out.hooks.select = { kept, cancelled, seen: log.selects.filter((s) => typeof s === 'string') };
  // useFire: Fire markup inserted by a later render is enhanced.
  // Enhancement happens after a frame or two (and later still on a busy machine): wait for the condition, not a time.
  const until = async (test, ms = 8000) => { const end = performance.now() + ms; while (!test() && performance.now() < end) await new Promise((r) => setTimeout(r, 25)); return !!test(); };
  out.hooks.thumbBefore = await until(() => document.querySelector('#seg-1 .fd-segmented-thumb'));
  flushSync(() => setExtra(true));
  out.hooks.thumbAfter = await until(() => document.querySelector('#seg-2 .fd-segmented-thumb'));
  return out;
};
`;

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>wrappers</title>
<link rel="stylesheet" href="/fire/fire.css"><script type="module" src="/__test/bundle.js"></script></head>
<body><div id="react"></div><div id="plain"></div></body></html>`;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

async function bundle() {
  const esbuild = await import('esbuild');
  const result = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022',
    conditions: ['development'], define: { 'process.env.NODE_ENV': '"development"' },
    nodePaths: [STARTER_MODULES], logLevel: 'silent',
    // Fire's own files stay separate, as in an app: one copy of each module, loaded from /fire/.
    plugins: [{ name: 'fire-external', setup(b) {
      b.onResolve({ filter: /fire\/(elements|fire)\.js$/ }, (args) => ({ path: `/fire/${path.basename(args.path)}`, external: true }));
    } }],
  });
  return result.outputFiles[0].text;
}

function serve(js) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/__test/index.html') { res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE); return; }
    if (url.pathname === '/__test/bundle.js') { res.writeHead(200, { 'content-type': 'text/javascript' }).end(js); return; }
    const file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const haveReact = existsSync(path.join(STARTER_MODULES, 'react/package.json')) && existsSync(path.join(STARTER_MODULES, 'react-dom/package.json'));

test('wrappers render the same DOM as their elements, and the hooks work (3 engines)', { skip: !haveReact && 'run npm install in starters/next first (React comes from there)' }, async () => {
  const js = await bundle();
  const server = await serve(js);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const engine of [chromium, firefox, webkit]) {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage({ reducedMotion: 'reduce' });
        const problems = [];
        page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`); });
        page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
        await page.goto(`${base}/__test/index.html`);
        await page.waitForFunction(() => typeof window.run === 'function');
        const out = await page.evaluate(() => window.run());
        const name = engine.name();
        assert.equal(out.pairs.length, 7, name);
        for (const p of out.pairs) {
          assert.ok(p.react.length > `<${p.tag}></${p.tag}>`.length, `${name} ${p.tag} #${p.i}: the element drew nothing`);
          let at = 0;
          while (at < p.react.length && p.react[at] === p.plain[at]) at++;
          assert.equal(p.react, p.plain, `${name} ${p.tag} #${p.i}: the wrapper's DOM differs from the element's at ` +
            `${JSON.stringify(p.react.slice(Math.max(0, at - 80), at + 80))} vs ${JSON.stringify(p.plain.slice(Math.max(0, at - 80), at + 80))}`);
        }
        assert.ok(out.live.changed, `${name}: a new data prop did not redraw`);
        assert.equal(out.live.data, '[9,1,9,1,9]', name);
        assert.deepEqual(out.events.changes, [{ value: 'Requests', index: 0, visible: false }], `${name}: onChange`);
        assert.deepEqual(out.hooks.select, { kept: true, cancelled: true, seen: ['open', 'delete'] }, `${name}: useFireEvent`);
        assert.ok(out.hooks.thumbBefore, `${name}: useFire did not enhance the first segmented control`);
        assert.ok(out.hooks.thumbAfter, `${name}: useFire did not enhance markup inserted by a later render`);
        assert.deepEqual(problems, [], `${name}: console`);
      } finally { await browser.close(); }
    }
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
});
