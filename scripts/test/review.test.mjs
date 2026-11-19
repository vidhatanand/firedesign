// node --test scripts/test/review.test.mjs: fire review (scripts/review.mjs).
//   The bad fixture app (scripts/test/fixtures/review/bad, valid markup composed badly) yields exactly the expected
//   rule on each page and the good one none; Fire's templates yield nothing but the known defects below (twelve
//   templates and every ?state= their cards name by default; all 42 with FIRE_REVIEW_ALL=1); the gallery lists every
//   screen with no inline style or script; --json has its documented shape; the DOM serialiser and the mapping of
//   structural findings, against a fake checkTree (scripts/lib/structure.mjs is another package).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';
import { review, expandRoutes, parseArgs, loadStructure, slug, cookieFor } from '../review.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-review-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const FIX = '/scripts/test/fixtures/review';
const PAGES = ['heads', 'form', 'settings', 'regions'];
const run = (routes, extra = {}) => review({ ...parseArgs(['--serve', ROOT, '--routes', 'x'], tmp), routes, out: path.join(tmp, extra.name ?? 'out'), jobs: 6, ...extra });
const rulesOf = (result, route) => [...new Set(result.findings.filter((f) => f.path === route).map((f) => f.rule))].sort();

/** Defects in Fire's own templates that the review found; reported, not hidden. Each is [template, state, rule, width]. */
// Defects the review found in Fire's own templates are fixed where they are found, so none is expected. If a
// template must carry one for a while, list it here as [template, state, rule, width] with the reason.
const KNOWN = [];

test('the bad app: exactly the expected rule on each page, at the widths where it applies', async () => {
  const routes = PAGES.map((p) => `${FIX}/bad/${p}.html`);
  const result = await run(routes.map((p) => ({ path: p })), { name: 'bad' });
  assert.deepEqual(rulesOf(result, `${FIX}/bad/heads.html`), ['one-page-head', 'one-primary']);
  // The form section squeezed into a grid column: beside the card at 1440; at 375 the grid has one column, and the
  // section, still laid out head beside body, runs past the page edge and cuts its select.
  const form = (w) => [...new Set(result.findings.filter((f) => f.path === `${FIX}/bad/form.html` && f.width === w).map((f) => f.rule))].sort();
  // The catalogue's structural rules see the same page: the section's wrong parent and the bare select.
  assert.deepEqual(form(1440), ['bare-control', 'nested-surface', 'unstyled-control', 'wrong-parent']);
  assert.deepEqual(form(375), ['bare-control', 'offscreen-control', 'overflow-x', 'unstyled-control', 'wrong-parent']);
  assert.deepEqual(rulesOf(result, `${FIX}/bad/settings.html`), ['stretched-button']);
  assert.deepEqual(rulesOf(result, `${FIX}/bad/regions.html`), ['overflow-x']);
  const at = (rule) => [...new Set(result.findings.filter((f) => f.rule === rule).map((f) => f.width))];
  assert.deepEqual(at('overflow-x'), [375]);
  assert.deepEqual(at('nested-surface'), [1440]);
  assert.deepEqual(at('stretched-button'), [1440]);
  assert.ok(result.findings.filter((f) => f.rule === 'stretched-button').every((f) => f.severity === 'warning'));
  assert.equal(result.findings.find((f) => f.rule === 'unstyled-control').ref, '#ap-2fa');
  assert.match(result.findings.find((f) => f.rule === 'overflow-x' && f.path.endsWith('regions.html')).ref, /div\.fd-row$/);
  assert.equal(result.errors, 24);   // 20 from the composition checks, 4 wrong-parent from the structural rules
  assert.equal(result.warnings, 6);  // 2 stretched buttons, 4 bare-control
});

test('the good app: no findings', async () => {
  const result = await run(PAGES.map((p) => ({ path: `${FIX}/good/${p}.html` })), { name: 'good' });
  assert.deepEqual(result.findings, []);
  assert.equal(result.screens, 16);
});

test(`Fire's templates: no findings (${process.env.FIRE_REVIEW_ALL ? 'all 42' : 'twelve'}, every ?state= their cards name)`, async () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/catalog.json'), 'utf8'));
  const DOZEN = ['overview', 'logs', 'settings', 'form', 'playground', 'provider', 'status', 'auth', 'support', 'docs-api', 'site-home', 'site-pricing'];
  const routes = catalog.templates.map((t) => {
    const id = path.basename(t.path, '.html');
    const card = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/cards/templates', `${id}.json`), 'utf8'));
    const states = [...new Set(card.states.flatMap((s) => [...(s.how ?? '').matchAll(/\?state=([a-z0-9-]+)/g)].map((m) => m[1])))];
    return { path: `/${t.path}`, name: id, states };
  }).filter((r) => process.env.FIRE_REVIEW_ALL || DOZEN.includes(r.name));
  const result = await run(routes, { name: 'templates', states: true, jobs: 8 });
  const key = (name, state, rule, width) => `${name}${state ? ` ?state=${state}` : ''} ${rule} ${width}`;
  const expected = KNOWN.filter(([t]) => routes.some((r) => r.name === t)).map((k) => key(...k)).sort();
  const got = [...new Set(result.findings.map((f) => key(f.route.split(' ')[0], f.state, f.rule, f.width)))].sort();
  assert.deepEqual(got, expected);
  assert.equal(result.warnings, 0);
});

test('the gallery lists every screen and holds no inline style or script', () => {
  const html = fs.readFileSync(path.join(tmp, 'bad', 'index.html'), 'utf8');
  assert.equal((html.match(/<section class="screen/g) ?? []).length, 4);
  for (const p of PAGES) assert.ok(html.includes(`id="${slug(`${FIX}/bad/${p}.html`)}"`), p);
  assert.ok(!/\sstyle=|<style|<script|\son[a-z]+=/i.test(html), 'no inline style, script or handler');
  assert.ok(!/(src|href)="(https?:)?\/\//.test(html), 'no external request');
  assert.ok(fs.existsSync(path.join(tmp, 'bad', 'review.css')));
  for (const src of html.matchAll(/src="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(tmp, 'bad', src[1])), src[1]);
  assert.ok((html.match(/class="crop"/g) ?? []).length >= 4, 'findings carry a crop of their element');
});

test('--json prints { routes, screens, errors, warnings, findings, out } and exits 1 on an error', () => {
  const out = path.join(tmp, 'json');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/review.mjs'), '--serve', ROOT, '--routes', `${FIX}/bad/regions.html`,
    '--widths', '375', '--themes', 'dark', '--no-shots', '--json', '--out', out], { encoding: 'utf8', cwd: tmp });
  assert.equal(r.status, 1, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(j), ['routes', 'screens', 'errors', 'warnings', 'findings', 'out']);
  assert.deepEqual([j.routes, j.screens, j.errors, j.warnings], [1, 1, 1, 0]);
  const f = j.findings[0];
  for (const k of ['route', 'width', 'theme', 'rule', 'ref', 'message', 'severity', 'fix']) assert.ok(k in f, k);
  assert.deepEqual([f.route, f.width, f.theme, f.rule], [`${FIX}/bad/regions.html`, 375, 'dark', 'overflow-x']);
  assert.equal(j.out, path.join(out, 'index.html'));
  assert.equal(spawnSync(process.execPath, [path.join(ROOT, 'scripts/review.mjs'), '--routes', '/a'], { encoding: 'utf8', cwd: tmp }).status, 2);
});

test('routes: paths, states and setup; the configuration comes from package.json "fire": { "review" }', () => {
  const rows = expandRoutes([{ path: '/logs', name: 'logs', states: ['empty', 'error'] }, '/settings'].map((r) => (typeof r === 'string' ? { path: r } : r)),
    { states: true, setup: { storage: { seen: '1' } } });
  assert.deepEqual(rows.map((r) => r.name), ['logs', 'logs ?state=empty', 'logs ?state=error', '/settings']);
  assert.deepEqual(rows[1].setup, { storage: { seen: '1' } });
  assert.equal(expandRoutes([{ path: '/logs', states: ['empty'] }]).length, 1, 'states only with --states');
  const dir = fs.mkdtempSync(path.join(tmp, 'pkg-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ fire: { review: { serve: 'dist', spa: true, routes: ['/a', { path: '/b', state: 'empty' }], widths: [800], out: '.r' } } }));
  const o = parseArgs(['--themes', 'dark'], dir);
  assert.equal(o.serve, path.join(dir, 'dist'));
  assert.deepEqual([o.spa, o.widths, o.themes, o.out], [true, [800], ['dark'], path.join(dir, '.r')]);
  assert.deepEqual(o.routes, [{ path: '/a' }, { path: '/b', state: 'empty' }]);
});

test('structural rules: absent module degrades to a note; the serialised DOM and the mapping, with a fake checkTree', async () => {
  assert.match((await loadStructure(path.join(tmp, 'none.mjs'))).note, /^structural rules unavailable/);
  const fake = path.join(tmp, 'structure.mjs');
  fs.writeFileSync(fake, `export const trees = [];
export function structureRules(catalog) { return { components: Object.keys(catalog.components ?? {}).length }; }
export function checkTree(root, rules, opts) {
  trees.push(root);
  const out = [];
  const walk = (n) => { if (n.tag === 'select' && !n.hidden) out.push({ rule: 'select-wrapper', severity: 'error', message: 'a select outside fd-select', fix: 'wrap it', node: n }); n.children.forEach(walk); };
  walk(root);
  return out;
}
`);
  const result = await run([{ path: `${FIX}/bad/form.html` }], { name: 'structure', structureFile: fake, widths: [1440], themes: ['light'] });
  const s = result.findings.filter((f) => f.source === 'structure');
  assert.equal(s.length, 1);
  assert.deepEqual([s[0].rule, s[0].severity, s[0].ref, s[0].fix], ['select-wrapper', 'error', '#ap-2fa', 'wrap it']);
  assert.ok(s[0].crop && fs.existsSync(path.join(tmp, 'structure', s[0].crop)), 'the finding has a crop of its element');
  const { trees } = await import(pathToFileURL(fake).href);
  // the root is the page ('#document': every parent is known); its one child is <body>
  assert.equal(trees[0].tag, '#document');
  const body = trees[0].children[0];
  assert.equal(body.tag, 'body');
  const all = [];
  const walk = (n, parent) => { all.push([n, parent]); n.children.forEach((c) => walk(c, n)); };
  walk(body, null);
  for (const [n] of all) {
    assert.deepEqual(Object.keys(n).filter((k) => !['hidden', 'text'].includes(k)), ['tag', 'classes', 'attrs', 'children', 'dynamic', 'ref']);
    assert.equal(n.dynamic, false);
  }
  assert.ok(!all.some(([n]) => ['script', 'style', 'link'].includes(n.tag)));
  const form = all.find(([n]) => n.attrs.id === 'register-app')[0];
  assert.equal(form.ref, '#register-app');
  assert.deepEqual(form.classes, ['fd-form']);
  const select = all.find(([n]) => n.tag === 'select')[0];
  assert.equal(select.attrs.id, 'ap-2fa');
  assert.equal(all.find(([n]) => n.tag === 'option' && n.attrs.selected)[0].attrs.selected, true, 'a valueless attribute is true');
  assert.ok(all.find(([n]) => n.tag === 'label')[0].text, 'an element with its own text has text: true');
  const main = all.find(([n]) => n.tag === 'main')[0];
  assert.ok(!main.hidden);
  const callout = all.find(([n]) => n.attrs.id === 'ap-error')[0];   // the form's error callout, hidden until it fails
  assert.equal(callout.attrs.hidden, true);
  const inside = [];
  (function collect(n) { inside.push(n); n.children.forEach(collect); })(callout);
  assert.ok(inside.length > 3 && inside.every((n) => n.hidden === true), 'every node of a hidden subtree is marked hidden');
  assert.ok(all.filter(([n]) => n.hidden).every(([n, p]) => !p || p.hidden || n.hidden), 'hidden marks whole subtrees');
});

test('setup.cookie: a __Host- cookie signs the screen in over http://localhost; a cookie may be an object', async () => {
  // A server that answers 401 unless the session cookie comes back: what an app with a __Host- session does.
  const seen = [];
  const server = http.createServer((req, res) => {
    const cookies = req.headers.cookie ?? '';
    seen.push(cookies);
    const ok = /(^|; )__Host-a=1(;|$)/.test(cookies) && (!req.url.startsWith('/both') || /(^|; )plain=2(;|$)/.test(cookies));
    res.writeHead(ok ? 200 : 401, { 'content-type': 'text/html' });
    res.end(`<!doctype html><html lang="en"><head><title>Session</title></head><body><main><h1>${ok ? 'Signed in' : 'Sign in'}</h1></main></body></html>`);
  });
  await new Promise((r) => server.listen(0, 'localhost', r));
  const base = `http://localhost:${server.address().port}`;
  try {
    const go = (routes, name) => review({ ...parseArgs(['--base', base, '--routes', 'x'], tmp), routes, out: path.join(tmp, name), widths: [1440], themes: ['light'], shots: false });
    const without = await go([{ path: '/' }], 'cookie-0');
    assert.ok(without.findings.some((f) => f.rule === 'failed-request'), 'with no cookie the server refuses the page');
    const signedIn = await go([{ path: '/', setup: { cookie: '__Host-a=1' } }], 'cookie-1');
    assert.deepEqual(signedIn.findings, []);
    const objects = await go([{ path: '/both', setup: { cookie: [{ name: '__Host-a', value: '1', httpOnly: true, sameSite: 'Strict' }, 'plain=2'] } }], 'cookie-2');
    assert.deepEqual(objects.findings, []);
  } finally { server.close(); }
  // the shape handed to the browser
  const url = new URL('http://localhost:4010/x');
  assert.deepEqual(cookieFor('plain=2', url), { name: 'plain', value: '2', url: 'http://localhost:4010' });
  assert.deepEqual(cookieFor('__Host-s=a=b', url), { name: '__Host-s', value: 'a=b', domain: 'localhost', path: '/', secure: true, sameSite: 'Lax' });
  assert.deepEqual(cookieFor({ name: '__Secure-t', value: '1', path: '/app' }, url), { name: '__Secure-t', value: '1', domain: 'localhost', path: '/app', secure: true, sameSite: 'Lax' });
  assert.deepEqual(cookieFor({ name: 'x', value: '1', url: 'https://example.test' }, url), { name: 'x', value: '1', url: 'https://example.test' });
  assert.throws(() => cookieFor({ value: '1' }, url), /name/);
});
