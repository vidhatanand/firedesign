// node --test scripts/test/gate.test.mjs : the fingerprints, the thresholds on today's library, and a near-copy of templates/logs.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';
import Ajv2020 from 'ajv/dist/2020.js';
import { ROOT, read } from '../lib/source.mjs';
import { structuralFingerprint as fp, structuralSimilarity as sim, dHash, hashDistance, lookDistance, bitCount } from '../fingerprint.mjs';
import { THRESHOLDS as T, evaluate, structuralFingerprints, readRelations, jobSimilarity, lookFingerprints } from '../gate.mjs';

const catalog = JSON.parse(read(path.join(ROOT, 'contract/catalog.json')));
const stored = JSON.parse(read(path.join(ROOT, 'contract/fingerprints.json')));
const logs = read(path.join(ROOT, 'templates/logs.html'));

/** logs.html with the columns reordered and every label changed: the copy a hurried contributor would make. */
function nearCopy(html) {
  const swap = (row) => {
    const cells = [...row.matchAll(/<(th|td)\b[\s\S]*?<\/\1>/g)].map((m) => m[0]);
    if (cells.length < 8) return row;
    const [sel, time, endpoint, target, status, credits, duration, actions] = cells;
    const order = [sel, status, endpoint, time, duration, credits, target, actions];
    let i = 0;
    return row.replace(/<(th|td)\b[\s\S]*?<\/\1>/g, () => order[i++]);
  };
  html = html.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/g, swap);
  const labels = { 'Activity logs': 'Request history', Time: 'When', Endpoint: 'Route', Target: 'URL', Status: 'Outcome', Credits: 'Cost', Duration: 'Took', 'Search requests': 'Find a call', 'Every request your keys made, with its endpoint, status and credits.': 'All calls made with your keys.' };
  for (const [a, b] of Object.entries(labels)) html = html.split(a).join(b);
  return html;
}

test('the fingerprint ignores text, ids, order and extra wrappers, and sees components and variants', () => {
  const a = '<div class="fd-card"><h3 class="fd-title">One</h3><span class="fd-status" data-tone="success">Ok</span><button class="fd-btn" data-variant="primary">Go</button></div>';
  const b = '<section class="fd-card" id="x"><div><button class="fd-btn" data-variant="primary">Send</button></div><span class="fd-status" data-tone="success">Fine</span><h3 class="fd-title">Two</h3></section>';
  const c = '<div class="fd-card"><span class="fd-status" data-tone="danger">Ok</span></div>';
  assert.equal(sim(fp(a, catalog), fp(a, catalog)), 1);
  assert.equal(sim(fp(a, catalog), fp(b, catalog)), 1);
  assert.ok(sim(fp(a, catalog), fp(c, catalog)) < 0.5);
  const wrapped = `<div class="fd-stack">${a}</div>`;
  assert.ok(sim(fp(a, catalog), fp(wrapped, catalog)) > 0.9, 'a layout wrapper barely moves the score');
  assert.equal(sim(fp('', catalog), fp('', catalog)), 0, 'two empty fingerprints are not duplicates');
});

test('dHash: identical pictures are 0 apart, a mirrored picture is far, a blank picture has no bits', () => {
  const png = (fn) => { const p = new PNG({ width: 200, height: 100 }); for (let y = 0; y < 100; y++) for (let x = 0; x < 200; x++) { const i = (y * 200 + x) * 4, v = fn(x, y); p.data[i] = p.data[i + 1] = p.data[i + 2] = v; p.data[i + 3] = 255; } return PNG.sync.write(p); };
  const a = dHash(png((x) => 255 - x));      // dark to the right: every neighbour pair falls
  assert.equal(hashDistance(a, a), 0);
  assert.equal(hashDistance(a, dHash(png((x) => x))), 1);   // mirrored: every bit flips
  assert.ok(hashDistance(a, dHash(png((x) => (x < 100 ? 255 - x : x)))) > 0.3);
  assert.equal(bitCount(dHash(png(() => 255))), 0);
  assert.equal(lookDistance({ w1440: a, w375: a }, { w1440: a, w375: a }), 0);
});

test('fingerprints.json is current for structure, and names the thresholds', () => {
  const st = structuralFingerprints(catalog);
  for (const pool of ['templates', 'specimens']) {
    assert.deepEqual(Object.keys(st[pool]), Object.keys(stored[pool]), `${pool}: run node scripts/gate.mjs`);
    for (const id of Object.keys(st[pool])) assert.deepEqual(st[pool][id].features, stored[pool][id].features, `${pool}/${id} changed: run node scripts/gate.mjs`);
  }
  assert.equal(Object.keys(stored.templates).length, catalog.templates.length);
  assert.deepEqual(stored.thresholds, T);
});

test("today's library passes with no relation needed, and the thresholds keep their margin", () => {
  const st = structuralFingerprints(catalog);
  const lk = { templates: Object.fromEntries(Object.entries(stored.templates).map(([k, v]) => [k, v.look])), specimens: Object.fromEntries(Object.entries(stored.specimens).map(([k, v]) => [k, v.look])) };
  const res = evaluate({ catalog, st, lk, relations: { components: {}, templates: {}, examples: readRelations().examples } });
  assert.deepEqual(res.violations, []);
  assert.deepEqual(res.problems, []);
  const top = (pool, key, dir) => res.pairs.filter((p) => p.pool === pool && p[key] != null).map((p) => p[key]).sort((x, y) => dir * (y - x))[0];
  assert.ok(top('templates', 'struct', 1) < T.STRUCT * 0.6, 'templates: structure margin');
  assert.ok(top('specimens', 'struct', 1) < T.STRUCT, 'specimens: structure margin');
  assert.ok(top('templates', 'look', -1) > T.LOOK * 2 && top('specimens', 'look', -1) > T.LOOK * 1.5, 'look margin');
  assert.ok(top('components', 'job', 1) < T.JOB, 'job margin');
});

test('a near-copy of logs.html (columns reordered, labels changed) fails, and passes once the card declares the relation', () => {
  const copy = nearCopy(logs);
  assert.notEqual(copy, logs);
  const a = fp(logs, catalog), b = fp(copy, catalog);
  assert.ok(sim(a, b) >= 0.95, `structure ${sim(a, b)}`);
  const withCopy = (templatesRel) => {
    const st = structuralFingerprints(catalog);
    st.templates['logs-copy'] = { job: 'See every request.', nodes: b.nodes, features: b.features };
    const cat = { ...catalog, templates: [...catalog.templates, { path: 'templates/logs-copy.html', title: 'Copy', job: 'See every request.' }] };
    const lk = { templates: Object.fromEntries(Object.entries(stored.templates).map(([k, v]) => [k, v.look])), specimens: {} };
    return evaluate({ catalog: cat, st, lk, relations: { components: {}, templates: templatesRel, examples: {} } });
  };
  const failing = withCopy({});
  assert.equal(failing.violations.length, 1);
  assert.match(failing.violations[0], /logs and logs-copy|logs-copy and logs/);
  const rel = { 'logs-copy': { distinctFrom: 'logs', because: 'Use this one for the team-wide audit trail rather than your own keys.' } };
  assert.deepEqual(withCopy(rel).violations, []);
  assert.equal(withCopy({ 'logs-copy': { distinctFrom: 'logs', because: 'short' } }).violations.length, 1, 'a relation without a real reason does not count');
  assert.equal(withCopy({ 'logs-copy': { distinctFrom: 'agent', because: 'Use this one for the team-wide audit trail rather than your own keys.' } }).violations.length, 1, 'a relation naming another entry does not cover this pair');
});

test('the near-copy also renders: the look of an unchanged copy is within drift, the reordered copy is measured', async () => {
  const r = await lookFingerprints({ templates: [{ id: 'same', url: 'templates/__same.html' }, { id: 'copy', url: 'templates/__copy.html' }, { id: 'logs', url: 'templates/logs.html' }], specimens: [] },
    { '/templates/__same.html': logs, '/templates/__copy.html': nearCopy(logs) });
  assert.ok(lookDistance(r.templates.same, r.templates.logs) <= T.DRIFT, 'the same page renders the same twice');
  assert.ok(lookDistance(r.templates.same, stored.templates.logs.look) <= T.DRIFT, 'and matches the stored hash');
  const d = lookDistance(r.templates.copy, r.templates.logs);
  assert.ok(d >= 0 && d <= 1);
  console.log(`# logs vs near-copy: look distance ${d.toFixed(3)} (threshold ${T.LOOK}), structure ${sim(fp(logs, catalog), fp(nearCopy(logs), catalog)).toFixed(2)} (threshold ${T.STRUCT})`);
});

test('the card schema accepts one relation with a reason and rejects the rest', () => {
  const schema = JSON.parse(read(path.join(ROOT, 'contract/cards/card.schema.json')));
  const card = JSON.parse(read(path.join(ROOT, 'contract/cards/table.json')));
  const v = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  const ok = { distinctFrom: 'list', because: 'Use this when the rows have columns to sort.' };
  assert.ok(v(card), 'a card without a relation is valid');
  assert.ok(v({ ...card, relation: ok }));
  assert.ok(v({ ...card, relation: { variantOf: 'list', because: ok.because } }));
  assert.ok(!v({ ...card, relation: { variantOf: 'list', distinctFrom: 'grid', because: ok.because } }), 'not both');
  assert.ok(!v({ ...card, relation: { distinctFrom: 'list' } }), 'a reason is required');
  assert.ok(!v({ ...card, relation: { distinctFrom: 'list', because: 'too short' } }));
  assert.ok(!v({ ...card, relation: { distinctFrom: 'List', because: ok.because } }));
});

test('a relation that names no component, or itself, is a problem', () => {
  const st = { templates: {}, specimens: {} }, lk = { templates: {}, specimens: {} };
  const run = (components) => evaluate({ catalog, st, lk, relations: { components, templates: {}, examples: {} } }).problems;
  const because = 'Use this when the rows have columns to sort.';
  assert.deepEqual(run({ table: { distinctFrom: 'list', because } }), []);
  assert.match(run({ table: { distinctFrom: 'no-such-thing', because } })[0], /not a component/);
  assert.match(run({ table: { distinctFrom: 'table', because } })[0], /itself/);
  assert.match(run({ table: { distinctFrom: 'list' } })[0], /because/);
});

test('job similarity: the same sentence is 1, unrelated sentences are low', () => {
  assert.equal(jobSimilarity('Show and hide sections of text.', 'Show and hide sections of text.'), 1);
  assert.ok(jobSimilarity('Show and hide sections of text.', 'Pick a date from a calendar.') < 0.2);
});

test('gate.mjs --no-look --check exits 0 on the committed library', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/gate.mjs'), '--no-look', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
});
