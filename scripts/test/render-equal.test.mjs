import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareTrees, startServer } from '../render-equal.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, '..', 'render-equal.mjs');
const dir = path.join(here, 'fixtures', 'render');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-equal-'));
const page = (n) => path.join(dir, n);

function run(engine, cand, extra = []) {
  const out = path.join(tmp, `${engine}-${path.basename(cand)}-${extra.length}.json`);
  const r = spawnSync(process.execPath, [script, '--ref', page('base.html'), '--cand', cand, '--engines', engine, '--json', out, ...extra],
    { encoding: 'utf8' });
  assert.ok(fs.existsSync(out), `no report: ${r.stderr}`);
  return { status: r.status, report: JSON.parse(fs.readFileSync(out, 'utf8')), stdout: r.stdout };
}
const kinds = (rep) => rep.runs.flatMap((r) => r.structure.map((d) => d.kind));

for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: a page against itself has no differences, at 1440 and 375, light and dark`, () => {
    const { status, report } = run(engine, page('base.html'));
    assert.equal(status, 0);
    assert.equal(report.runs.length, 4);
    assert.ok(report.ok && report.summary.structuralDifferences === 0 && report.summary.styleDifferences === 0);
    assert.ok(report.runs.every((r) => r.nodes.ref === 14 && r.pixels.ratio === 0));
  });

  test(`${engine}: framework wrappers, comments, framework attributes and generated ids are ignored`, () => {
    const { status, report, stdout } = run(engine, page('wrapped.html'));
    assert.equal(status, 0, stdout);
    assert.equal(report.summary.structuralDifferences, 0);
    assert.equal(report.summary.styleDifferences, 0);
    assert.ok(report.summary.maxPixelRatio <= 0.001);
  });

  test(`${engine}: a changed class, a changed text and a moved element are each detected`, () => {
    let r = run(engine, page('changed-class.html'), ['--widths', '1440', '--themes', 'light']);
    assert.equal(r.status, 1);
    assert.deepEqual(kinds(r.report), ['classes']);
    assert.ok(r.report.runs[0].styles.some((d) => d.property === 'color'));
    assert.match(r.report.runs[0].structure[0].path, /button\.fd-btn/);

    r = run(engine, page('changed-text.html'), ['--widths', '1440', '--themes', 'light']);
    assert.equal(r.status, 1);
    assert.deepEqual(kinds(r.report), ['text']);
    assert.equal(r.report.runs[0].structure[0].ref, 'Three services are healthy.');
    assert.equal(r.report.runs[0].structure[0].cand, 'Two services are healthy.');

    r = run(engine, page('moved.html'), ['--widths', '1440', '--themes', 'light']);
    assert.equal(r.status, 1);
    assert.deepEqual(kinds(r.report).sort(), ['extra', 'missing']);
    assert.ok(r.report.runs[0].pixels.ratio > 0.001);
  });
}

test('URLs from a test-owned server work, and a pixel ratio above the limit fails alone', async () => {
  const srv = await startServer(dir);
  try {
    const base = `http://127.0.0.1:${srv.port}`;
    const out = path.join(tmp, 'url.json');
    const args = (cand, ...more) => [script, '--ref', `${base}/base.html`, '--cand', `${base}/${cand}`, '--widths', '1440', '--themes', 'light', '--json', out, ...more];
    // async spawn: the server runs in this process's event loop
    const { spawn } = await import('node:child_process');
    const code = await new Promise((res) => spawn(process.execPath, args('wrapped.html'), { stdio: 'ignore' }).on('exit', res));
    assert.equal(code, 0);
    // an impossible limit turns sub-pixel noise into a failure with no structural or style difference
    const code2 = await new Promise((res) => spawn(process.execPath, args('wrapped.html', '--max-pixel-ratio', '-1'), { stdio: 'ignore' }).on('exit', res));
    const rep = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.equal(code2, 1);
    assert.equal(rep.summary.structuralDifferences + rep.summary.styleDifferences, 0);
  } finally { await srv.close(); }
});

test('compareTrees: ids that look generated are renamed, others are compared literally', () => {
  const el = (id) => ({ t: 'el', tag: 'input', classes: ['fd-input'], attrs: { id, 'data-v-abc': '', class: 'x fd-input', style: 'a:b' }, styles: {}, children: [] });
  assert.deepEqual(compareTrees([el(':r1:')], [el(':r9:')]), []);
  assert.deepEqual(compareTrees([el('v-0')], [el('«r3»')]), []);
  const d = compareTrees([el('email')], [el('mail')]);
  assert.deepEqual(d.map((x) => [x.kind, x.property, x.ref, x.cand]), [['attribute', 'id', 'email', 'mail']]);
});
