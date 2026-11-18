// node --test scripts/test/find.test.mjs : fire find ranks the right part first for the queries an agent types.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { load, search, stem } from '../find.mjs';
import { buildIndex, render } from '../build-index.mjs';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const db = load();

// [query, ids that are a right first answer (an array when two parts both fit), options]
const QUERIES = [
  ['toggle a setting', ['switch']],
  ['snackbar', ['toast']],
  ['list of runs with filters', ['table', 'filter', 'toolbar']],
  ['pick one of three', ['segmented', 'radio']],
  ['show trend', ['chart', 'sparkline']],
  ['sign in page', ['auth', 'auth-centered']],
  ['type the name to delete', ['confirm']],
  ['approve a request', ['approval-bar', 'decision', 'decisions', 'answer']],
  ['modal', ['dialog']],
  ['dropdown menu of actions', ['menu']],
  ['choose a country from a long list', ['combobox', 'select']],
  ['tooltip on an icon button', ['tooltip']],
  ['loading placeholder for content', ['skeleton']],
  ['spinner', ['loader']],
  ['progress bar for an import', ['progress']],
  ['how much of the quota is used', ['meter']],
  ['pagination', ['pagination']],
  ['tabs', ['tabs']],
  ['breadcrumbs', ['breadcrumb']],
  ['copy an API key', ['copy-field', 'secret', 'snippet']],
  ['hide a password until clicked', ['secret']],
  ['upload a file by drag and drop', ['file-upload']],
  ['date range picker', ['date-picker']],
  ['enter a verification code', ['otp']],
  ['multi line text input', ['textarea']],
  ['list of tags', ['tag-input']],
  ['edit key value pairs', ['pairs']],
  ['empty state', ['empty']],
  ['status dot for a monitor', ['status']],
  ['badge with a count', ['badge']],
  ['warning strip for the whole account', ['banner']],
  ['inline message next to content', ['callout']],
  ['side panel with details of a row', ['sheet']],
  ['command palette', ['command']],
  ['search box', ['search']],
  ['show json response', ['json']],
  ['code block with copy button', ['codeblock']],
  ['edit raw json', ['codefield']],
  ['show a diff of changes', ['diff']],
  ['activity heatmap by day', ['heatgrid']],
  ['percentage donut', ['donut']],
  ['ranked bar list', ['bars']],
  ['dashboard home page', ['overview']],
  ['404 page', ['not-found']],
  ['settings page', ['settings']],
  ['step by step wizard progress', ['steps', 'onboarding']],
  ['first run onboarding', ['onboarding']],
  ['api keys management page', ['api-keys']],
  ['request log with detail panel', ['logs', 'log']],
  ['documentation endpoint reference', ['docs-api', 'doc-endpoint']],
  ['changelog', ['docs-changelog', 'doc-changelog']],
  ['pricing plans', ['plan']],
  ['chat with an assistant', ['chat', 'agent', 'composer']],
  ['show what tool the agent called', ['toolcall']],
  ['floating action button', ['fab']],
  ['navigation sidebar', ['sidebar']],
  ['avatar', ['avatar']],
  ['collapsible faq sections', ['accordion']],
  ['slider for a value', ['slider']],
  ['yes or no checkbox in a form', ['checkbox', 'switch']],
  ['page header with actions', ['page-head']],
  ['table of records with sorting', ['table']],
];

const rank = (q, o) => search(db, q, { limit: 3, ...o }).map((r) => r.id);

test(`fire find: at least 90% of ${QUERIES.length} queries have the expected part first, and all are in the top three`, () => {
  assert.ok(QUERIES.length >= 40);
  const misses = [], notTop3 = [];
  for (const [q, ok] of QUERIES) {
    const got = rank(q);
    if (!ok.includes(got[0])) misses.push(`${q} -> ${got.join(', ') || 'nothing'} (wanted ${ok.join(' | ')})`);
    if (!got.some((g) => ok.includes(g))) notTop3.push(q);
  }
  assert.deepEqual(notTop3, [], 'every query has the expected part in the top three');
  const first = 1 - misses.length / QUERIES.length;
  assert.ok(first >= 0.9, `first-place rate ${(first * 100).toFixed(0)}% is under 90%:\n${misses.join('\n')}`);
});

test('ties go to the largest unit: a template before a component of the same score', () => {
  const r = search(db, 'sign in page', { limit: 5 });
  assert.equal(r[0].kind, 'template');
});

test('filters: --kind, --surface and --data narrow the results', () => {
  assert.ok(search(db, 'form', { kind: 'template' }).every((r) => r.kind === 'template'));
  assert.ok(search(db, 'navigation', { surface: 'phone', limit: 20 }).every((r) => r.surfaces.includes('phone')));
  assert.ok(search(db, 'show', { data: 'series', limit: 20 }).every((r) => r.data.includes('series')));
});

test('website sections are kind "section" and --kind section finds them', () => {
  const r = search(db, 'pricing table', { kind: 'section', limit: 5 });
  assert.ok(r.length && r.every((x) => x.kind === 'section'));
  assert.equal(r[0].id, 'site-pricing');
  assert.equal(search(db, 'logo wall', { limit: 1 })[0].id, 'site-logos');
  assert.ok(search(db, 'hero', { kind: 'section', limit: 5 }).some((x) => x.id === 'site-hero'));
  const run = spawnSync('node', [path.join(ROOT, 'scripts/find.mjs'), 'faq', '--kind', 'section', '--limit', '1'], { encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /site-faq\s+\[section\]/);
});

test('stemming and synonyms: plural, -ing and hand-written synonyms reach the same part', () => {
  assert.equal(stem('toggles'), stem('toggle'));
  assert.equal(stem('filtering'), stem('filter'));
  assert.equal(rank('toggles')[0], 'switch');
  assert.equal(rank('snackbars')[0], 'toast');
});

test('nonsense gives no result, and the order is the same on every run', () => {
  assert.deepEqual(search(db, 'zzzqqq xyzzy'), []);
  assert.deepEqual(rank('table of records'), rank('table of records'));
});

test('the command line prints id, kind, why, use-when and docs, as text and as JSON, in under 100 ms of search', () => {
  const run = (...a) => spawnSync('node', [path.join(ROOT, 'scripts/find.mjs'), ...a], { encoding: 'utf8' });
  const text = run('toggle a setting', '--limit', '2');
  assert.equal(text.status, 0);
  assert.match(text.stdout, /switch/);
  assert.match(text.stdout, /matched:/);
  assert.match(text.stdout, /use when:/);
  assert.match(text.stdout, /docs: docs\/[a-z-]+\.html#/);
  const json = JSON.parse(run('snackbar', '--json', '--limit', '1').stdout);
  assert.equal(json[0].id, 'toast');
  assert.ok(json[0].docs && json[0].why && json[0].use);
  assert.equal(run('x', '--kind', 'nope').status, 2);
  const t0 = performance.now();
  for (const [q] of QUERIES) search(db, q, { limit: 5 });
  assert.ok((performance.now() - t0) / QUERIES.length < 100, 'one search takes under 100 ms');
});

test('contract/index.json is current and complete', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/catalog.json'), 'utf8'));
  assert.equal(fs.readFileSync(path.join(ROOT, 'contract/index.json'), 'utf8'), render(buildIndex(catalog)));
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/index.json'), 'utf8'));
  assert.equal(idx.entries.length, catalog.components.length + catalog.modules.length + catalog.templates.length);
  assert.ok(idx.entries.some((e) => e.kind === "module" && e.id === "email"), "modules are in the index");
  for (const e of idx.entries) {
    for (const k of ['id', 'kind', 'name', 'family', 'job', 'aka', 'surfaces', 'data', 'use', 'not', 'docs']) assert.ok(e[k] !== undefined, `${e.id}.${k}`);
    assert.ok(e.surfaces.length && e.data.length && e.docs, e.id);
  }
  assert.ok(render(idx).length / 4 < 25000, 'the whole index stays readable in one pass');
});

test('fire find finds the email module', () => {
  const r = spawnSync(process.execPath, ['scripts/find.mjs', 'send a sign-in email', '--json'], { cwd: ROOT, encoding: 'utf8' });
  const top = JSON.parse(r.stdout)[0];
  assert.deepEqual([top.id, top.kind], ['email', 'module']);
});

test('fire find: results carry their surfaces, and a query that fits better elsewhere says so', async () => {
  const { betterElsewhere, betterNote } = await import('../find.mjs');
  const fxIndex = path.join(ROOT, 'scripts/test/fixtures/surface/index.json');
  const small = load(fxIndex);
  const run = (...a) => spawnSync(process.execPath, ['scripts/find.mjs', ...a], { cwd: ROOT, encoding: 'utf8' });
  // JSON and text both carry the surfaces
  const json = JSON.parse(run('snackbar', '--json', '--limit', '1').stdout);
  assert.ok(Array.isArray(json[0].surfaces) && json[0].surfaces.length);
  assert.match(run('snackbar', '--limit', '1').stdout, /^toast {2}\[component\] {2}[a-z]+( · [a-z]+)* {2}[\d.]+$/m);
  // nothing for the surface: the parts for other surfaces are named
  const none = betterElsewhere(small, 'bottom navigation tab bar', { surface: 'app' }, search(small, 'bottom navigation tab bar', { surface: 'app' }));
  assert.equal(none[0].id, 'tabbar');
  assert.match(betterNote('app', none, false), /^1 match exists for other surfaces: tabbar \[component\] \(phone\)/);
  // a better match elsewhere than the best on the surface
  const here = search(small, 'navigation bar', { surface: 'app' });
  assert.equal(here[0].id, 'sidebar');
  // no --surface, or the surface already has the best answer: silent
  assert.deepEqual(betterElsewhere(small, 'bottom navigation tab bar', {}), []);
  assert.deepEqual(betterElsewhere(small, 'side navigation', { surface: 'app' }), []);
  // the real index: a documentation-only part searched on the app surface
  const r = run('table of contents', '--surface', 'app');
  assert.match(r.stdout, /better match(es)? exists? for other surfaces: toc \[component\] \(website\)/);
  // --json keeps stdout a plain array; the note goes to stderr
  const j = run('table of contents', '--surface', 'app', '--json');
  assert.ok(Array.isArray(JSON.parse(j.stdout)));
  assert.match(j.stderr, /other surfaces: toc/);
});
