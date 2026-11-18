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

  test(`${engine}: framework wrappers, comments, framework attributes (data-v-*, vt-*: R14) and generated ids are ignored`, () => {
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

test('--transparent: a component host inside a Fire node is a difference, unless its selector is given', () => {
  let r = run('chromium', page('hosted.html'), ['--widths', '1440', '--themes', 'light']);
  assert.equal(r.status, 1);
  assert.ok(kinds(r.report).includes('extra') || kinds(r.report).includes('missing'), r.stdout);
  r = run('chromium', page('hosted.html'), ['--widths', '1440', '--themes', 'light', '--transparent', 'card-body']);
  assert.equal(r.status, 0, r.stdout);
  assert.equal(r.report.options.transparent, 'card-body');
});

const node = (tag, attrs = {}, children = [], extra = {}) => ({ t: 'el', tag, classes: [], attrs, styles: {}, children, ...extra });

test('compareTrees: Fire\'s generated ids and every reference to them are renamed, references after the element they point at (R9)', () => {
  // A dialog titled by an id from core.js id('fd-dialog-title'); two renders number it differently.
  const dialog = (n, label = n) => [node('dialog', { class: 'fd-dialog', 'aria-labelledby': `fd-dialog-title-${label}`, 'aria-describedby': 'fd-dialog-desc-1' }, [
    node('h2', { id: `fd-dialog-title-${n}` }), node('p', { id: 'fd-dialog-desc-1' }), node('label', { for: `fd-field-${n}` }), node('input', { id: `fd-field-${n}` }),
    node('button', { popovertarget: `fd-popover-${n}` }), node('div', { id: `fd-popover-${n}`, popover: '' })])];
  assert.deepEqual(compareTrees(dialog('a'), dialog('1f')), []);
  // pointing at another element is still a difference
  const d = compareTrees(dialog('a'), dialog('1f', 'zz'));
  assert.deepEqual(d.map((x) => x.property), ['aria-labelledby']);
  // authored ids are compared literally
  assert.equal(compareTrees([node('div', { id: 'logs' })], [node('div', { id: 'log' })]).length, 1);
});

test('compareTrees: chart gradient ids, their url(#…) references and ids local to one SVG are renamed (R9)', () => {
  const chart = (grad, clip, style = grad) => [node('svg', { class: 'fd-chart-svg', viewBox: '0 0 100 40' }, [
    node('defs', {}, [node('linearGradient', { id: grad }), node('clipPath', { id: clip })]),
    node('path', { class: 'fd-chart-area', fill: `url(#${grad})`, 'clip-path': `url("#${clip}")`, d: 'M0 0L10 10' }, [], { styles: { fill: `url("http://127.0.0.1:1/x#${style}")` } }),
    node('use', { href: `#${clip}` })])];
  assert.deepEqual(compareTrees(chart('fd-area-13', 'plot-7'), chart('fd-area-3', 'plot-2', 'fd-area-3')), []);
  // an id that something outside the SVG also references is not local: compared literally
  const outside = (clip) => [...chart('fd-area-1', clip), node('a', { href: `#${clip}` })];
  assert.ok(compareTrees(outside('plot-7'), outside('plot-2')).some((x) => x.property === 'id'));
});

test('compareTrees: SVG geometry is equal within 0.5 px, other attributes and larger moves are not (R10)', () => {
  const svg = (x, d, width = '20') => [node('svg', { viewBox: '0 0 664.2 40', width }, [node('rect', { x, y: '4', width: '2', height: '8' }), node('path', { d })])];
  assert.deepEqual(compareTrees(svg('664.2', 'M26 172.5H946L332.67 44'), svg('664.13', 'M26.3 172.1H945.6L332.5 44')), []);
  assert.deepEqual(compareTrees(svg('664.2', 'M0 0'), svg('664.8', 'M0 0')).map((x) => x.property), ['x']);
  assert.deepEqual(compareTrees(svg('1', 'M0 0L1 1'), svg('1', 'M0 0H1')).map((x) => x.property), ['d']);
  // outside an SVG, width is compared literally
  assert.equal(compareTrees([node('img', { width: '20' })], [node('img', { width: '20.2' })]).length, 1);
});

test('compareTrees: a margin difference counts only when the boxes differ by more than 0.5 px (R11)', () => {
  const frame = (margin, box) => [node('div', { class: 'fd-frame' }, [], { classes: ['fd-frame'], styles: { 'margin-left': margin, 'margin-right': margin, width: '1200px' }, box })];
  assert.deepEqual(compareTrees(frame('24px', [120, 0, 1200, 500]), frame('0px', [120.3, 0, 1200, 500])), []);
  const d = compareTrees(frame('24px', [144, 0, 1200, 500]), frame('0px', [120, 0, 1200, 500]));
  assert.deepEqual(d.map((x) => x.property).sort(), ['margin-left', 'margin-right']);
});

test('settle and CSP: a page that changes 600 ms after load and runs an animation under a strict policy is captured settled and frozen (R13)', () => {
  const r = run('chromium', page('late.html'), ['--widths', '1440', '--themes', 'light']);
  assert.equal(r.status, 0, r.stdout);
  assert.equal(r.report.summary.structuralDifferences + r.report.summary.styleDifferences, 0);
  const { cand } = r.report.runs[0].settle;
  assert.ok(cand.quiet && cand.ms >= 400, JSON.stringify(cand));
});

test('pixels: chrome painted over the root from outside is not part of the shot, a different root still fails (R15)', () => {
  const root = ['--ref-root', '.fd-page', '--cand-root', '.fd-page', '--widths', '375', '--themes', 'light'];
  const bar = (cand) => spawnSync(process.execPath, [script, '--ref', page('bar.html'), '--cand', cand, '--engines', 'chromium', '--json', path.join(tmp, `${path.basename(cand)}.json`), ...root], { encoding: 'utf8' });
  const same = bar(page('bar2.html'));
  const rep = JSON.parse(fs.readFileSync(path.join(tmp, 'bar2.html.json'), 'utf8'));
  assert.equal(same.status, 0, same.stdout);
  assert.equal(rep.runs[0].pixels.ratio, 0);
  const other = bar(page('bar-root.html'));
  assert.notEqual(other.status, 0);
  const rep2 = JSON.parse(fs.readFileSync(path.join(tmp, 'bar-root.html.json'), 'utf8'));
  assert.ok(rep2.runs[0].pixels.ratio > 0);
});
