import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lintText, prepareCatalog, expandInputs } from '../lint-markup.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = path.join(here, 'fixtures');
const catalogPath = path.join(fx, 'catalog.json');
const catalog = prepareCatalog(JSON.parse(fs.readFileSync(catalogPath, 'utf8')));
const lint = (file, text) => lintText(file, text, catalog);
const rules = (file, text) => lint(file, text).map((f) => f.rule);

test('fixtures: every good file passes', () => {
  for (const f of fs.readdirSync(path.join(fx, 'lint')).filter((n) => n.startsWith('good.'))) {
    const p = path.join(fx, 'lint', f);
    assert.deepEqual(lint(p, fs.readFileSync(p, 'utf8')), [], f);
  }
});

test('fixtures: every rule fires on the bad files, with position, message and fix', () => {
  const seen = new Set();
  for (const f of fs.readdirSync(path.join(fx, 'lint')).filter((n) => n.startsWith('bad.'))) {
    const p = path.join(fx, 'lint', f);
    const found = lint(p, fs.readFileSync(p, 'utf8'));
    assert.ok(found.length, f);
    for (const x of found) {
      seen.add(x.rule);
      assert.ok(x.line >= 1 && x.col >= 1 && x.message && x.fix && x.file === p);
    }
  }
  assert.deepEqual([...seen].sort(), ['icon-only-name', 'no-i-icon-in-framework', 'no-raw-color', 'no-raw-px', 'no-style',
    'unknown-attribute-value', 'unknown-class', 'unknown-element', 'unknown-icon']);
});

test('positions are exact for attributes over several lines', () => {
  const t = '<div\n  class="fd-btn\n     fd-bad"\n  data-variant="nope"></div>';
  const f = lint('a.html', t);
  assert.equal(f.length, 2);
  assert.deepEqual([f[0].rule, f[0].line, f[0].col], ['unknown-class', 3, 6]);
  assert.deepEqual([f[1].rule, f[1].line, f[1].col], ['unknown-attribute-value', 4, 17]);
});

test('unknown-class: unknown fd- fails, known and non-fd classes pass', () => {
  assert.deepEqual(rules('a.html', '<div class="fd-btn app-x fd-badge"></div>'), []);
  assert.deepEqual(rules('a.html', '<div class="fd-ghost"></div>'), ['unknown-class']);
});

test('unknown-attribute-value: only for attributes the catalogue lists for the component', () => {
  assert.deepEqual(rules('a.html', '<a class="fd-btn" data-variant="ghost" data-size="xl" data-other="zzz"></a>'), []);
  assert.deepEqual(rules('a.html', '<a class="fd-btn" data-size="huge"></a>'), ['unknown-attribute-value']);
  // data-size lists differ per component: the element's own component decides
  assert.deepEqual(rules('a.html', '<div class="fd-dialog" data-size="xl"></div>'), ['unknown-attribute-value']);
  assert.deepEqual(rules('a.html', '<div class="fd-dialog" data-size="lg"></div>'), []);
  assert.deepEqual(rules('a.html', '<div class="app" data-size="huge"></div>'), []);
});

test('unknown-attribute-value: the value "*" takes any value', () => {
  const star = structuredClone(JSON.parse(fs.readFileSync(catalogPath, 'utf8')));
  star.components.find((c) => c.id === 'button').attributes['data-size'] = ['*'];
  const any = prepareCatalog(star);
  const ids = (text) => lintText('a.html', text, any).map((f) => f.rule);
  assert.deepEqual(ids('<a class="fd-btn" data-size="huge"></a>'), []);
  assert.deepEqual(ids('<a class="fd-btn" data-size="240"></a>'), []);
  assert.deepEqual(ids('<a class="fd-btn" data-variant="nope"></a>'), ['unknown-attribute-value'], 'other attributes stay closed');
  assert.deepEqual(rules('a.html', '<a class="fd-btn" data-size="huge"></a>'), ['unknown-attribute-value'], 'without "*" the value is rejected');
});

test('unknown-attribute-value: data-size on a drawn icon is the icon size, whatever class it carries', () => {
  assert.deepEqual(rules('a.html', '<i class="fd-dialog" data-icon="x" data-size="14"></i>'), []);
  assert.deepEqual(rules('a.html', '<div class="fd-dialog" data-size="14"></div>'), ['unknown-attribute-value']);
});

test('icon-only-name: a data-fd-tooltip names an icon-only button (overlays.js gives it the aria-label)', () => {
  assert.deepEqual(rules('a.html', '<button data-icon-only data-fd-tooltip="Copy key"><i data-icon="x"></i></button>'), []);
});

test('unknown-element: unknown fd- tag fails, catalogued and ordinary tags pass', () => {
  assert.deepEqual(rules('a.html', '<fd-icon name="x"></fd-icon><my-thing></my-thing>'), []);
  assert.deepEqual(rules('a.html', '<fd-nothing></fd-nothing>'), ['unknown-element']);
});

test('unknown-icon: data-icon, fd-icon name and use href', () => {
  assert.deepEqual(rules('a.html', '<i data-icon="home"></i><fd-icon name="trash"></fd-icon><svg><use href="#i-search"/></svg><svg><use xlink:href="#i-x"/></svg>'), []);
  assert.deepEqual(rules('a.html', '<i data-icon="homee"></i><fd-icon name="zip"></fd-icon><svg><use href="#i-nada"/></svg><use href="#other"/>'),
    ['unknown-icon', 'unknown-icon', 'unknown-icon']);
});

test('no-style: attribute, JSX prop, Vue binding and Lit attribute', () => {
  assert.deepEqual(rules('a.html', '<p class="fd-badge"></p>'), []);
  assert.deepEqual(rules('a.html', '<p style="margin:0"></p>'), ['no-style']);
  assert.deepEqual(rules('a.tsx', 'const a = <p style={{ margin: 0 }} />;'), ['no-style']);
  assert.deepEqual(rules('a.vue', '<template><p :style="s" v-bind:style="t" style="a:b"></p></template>'), ['no-style', 'no-style', 'no-style']);
  assert.deepEqual(rules('a.ts', 'const t = html`<p style=${x}></p>`;'), ['no-style']);
});

test('no-raw-color and no-raw-px in attributes, not in ids, hrefs, labels or class', () => {
  assert.deepEqual(rules('a.html', '<svg fill="currentColor" stroke="none"><path d="M0 0h24px"/></svg><a href="#fff" aria-label="12px" title="#fff"></a>'), []);
  assert.deepEqual(rules('a.html', '<svg fill="#fff"></svg>'), ['no-raw-color']);
  assert.deepEqual(rules('a.html', '<svg stroke="red"></svg>'), ['no-raw-color']);
  assert.deepEqual(rules('a.html', '<div data-x="rgb(1 2 3)"></div>'), ['no-raw-color']);
  assert.deepEqual(rules('a.html', '<img width="24px">'), ['no-raw-px']);
  assert.deepEqual(rules('a.html', '<img width="24">'), []);
  assert.deepEqual(rules('a.tsx', 'const a = <svg fill={"#000"} width={`10px`} />;'), ['no-raw-color', 'no-raw-px']);
});

test('icon-only-name: aria-label, aria-labelledby or visible text satisfy it', () => {
  assert.deepEqual(rules('a.html', '<button data-icon-only aria-label="Close"><i data-icon="x"></i></button>'), []);
  assert.deepEqual(rules('a.html', '<button data-icon-only aria-labelledby="t"><i data-icon="x"></i></button>'), []);
  assert.deepEqual(rules('a.html', '<button data-icon-only><i data-icon="x"></i><span>Close</span></button>'), []);
  assert.deepEqual(rules('a.html', '<button data-icon-only><i data-icon="x"></i></button>'), ['icon-only-name']);
  assert.deepEqual(rules('a.html', '<button data-icon-only>\n  <i data-icon="x"></i>\n</button><button data-icon-only="false"></button>'), ['icon-only-name']);
  assert.deepEqual(rules('a.tsx', 'const a = <button data-icon-only><fd-icon name="x" /></button>;'), ['icon-only-name']);
  assert.deepEqual(rules('a.tsx', 'const a = <button data-icon-only>{label}</button>;'), []);
  assert.deepEqual(rules('a.tsx', 'const a = <button data-icon-only {...rest} />;'), []);
});

test('no-i-icon-in-framework: only in jsx, tsx and vue', () => {
  assert.deepEqual(rules('a.html', '<i data-icon="home"></i>'), []);
  assert.deepEqual(rules('a.tsx', 'const a = <i data-icon="home" />;'), ['no-i-icon-in-framework']);
  assert.deepEqual(rules('a.jsx', 'const a = <i data-icon="home"></i>;'), ['no-i-icon-in-framework']);
  assert.deepEqual(rules('a.vue', '<template><i data-icon="home"></i></template>'), ['no-i-icon-in-framework']);
});

test('JSX: className template literals lint static parts and skip dynamic ones', () => {
  const t = 'const a = <div className={`fd-btn ${x} fd-${y} fd-ghost`} />;';
  const f = lint('a.tsx', t);
  assert.deepEqual(f.map((x) => x.message), ['unknown class "fd-ghost"']);
  assert.equal(f[0].col, t.indexOf('fd-ghost') + 1);
  assert.deepEqual(rules('a.tsx', 'const a = <div className={`fd-btn-${size}`} data-variant={v} data-size={`x${y}`} />;'), []);
  assert.deepEqual(rules('a.tsx', 'const a = <div className={clsx("fd-btn", on && \'fd-nope\')} />;'), ['unknown-class']);
});

test('JSX: generics, comparisons, regexes, strings with < and nested JSX do not confuse the scanner', () => {
  const t = [
    'const a: Array<string> = []; const b = a.length < 3 ? 1 : 2; const re = /<div class="fd-no">/g;',
    'const s = \'<div class="fd-no2">\'; // <div class="fd-no3">',
    'function F<T,>(p: T) { return p; }',
    'export const X = () => (<ul>{[1].map((i) => <li key={i} className="fd-badge" data-tone="loud">{"it\'s"}</li>)}</ul>);',
  ].join('\n');
  const f = lint('a.tsx', t);
  assert.deepEqual(f.map((x) => [x.rule, x.line]), [['unknown-attribute-value', 4]]);
});

test('JSX: comments and text containing quotes do not break parsing', () => {
  const t = 'const a = (<div>\n  {/* <i data-icon="x"/> */}\n  don\'t "worry" <b className="fd-zzz" />\n</div>);';
  assert.deepEqual(rules('a.tsx', t), ['unknown-class']);
});

test('Vue: class bindings, mustaches and script/style bodies', () => {
  assert.deepEqual(rules('a.vue', '<template><div class="fd-btn" :class="{ \'fd-ghost\': on }">{{ a < b }}</div></template><script>const s = "<i class=\\"fd-q\\">"</script>'), ['unknown-class']);
  assert.deepEqual(rules('a.vue', '<template><div :data-variant="v" :data-size="\'nope\'" class="fd-btn"></div></template>'), ['unknown-attribute-value']);
  assert.deepEqual(rules('a.vue', '<template><div @click="x = \'<fd-bad>\'" v-if="a > b" class="fd-btn"></div></template>'), []);
});

test('Lit: html and svg templates, holes, nested templates; plain template literals ignored', () => {
  const t = 'const a = html`<div class="fd-btn fd-${x} fd-bad" data-variant=${v} data-size="${s}">${html`<i class="fd-bad2"></i>`}</div>`;\n' +
    'const b = svg`<use href="#i-nope"/>`;\nconst c = `<div class="fd-ignored">`;';
  const f = lint('a.ts', t);
  assert.deepEqual(f.map((x) => [x.rule, x.line]), [['unknown-class', 1], ['unknown-class', 1], ['unknown-icon', 2]]);
  assert.equal(f[0].col, t.indexOf('fd-bad"') + 1);
  assert.deepEqual(rules('a.ts', 'const x = 1 < 2; const s = "<div class=\\"fd-bad\\">";'), []);
});

test('CLI: text and JSON output, exit codes, globs, catalogue flag', () => {
  const script = path.join(here, '..', 'lint-markup.mjs');
  const run = (...a) => spawnSync(process.execPath, [script, '--catalog', catalogPath, ...a], { encoding: 'utf8' });
  let r = run(path.join(fx, 'lint', 'good.html'));
  assert.equal(r.status, 0);
  r = run('--json', path.join(fx, 'lint', 'bad.*'));
  assert.equal(r.status, 1);
  const j = JSON.parse(r.stdout);
  assert.ok(j.errors > 10 && j.files === 4 && j.findings[0].rule);
  r = run(path.join(fx, 'lint', 'bad.html'));
  assert.match(r.stdout, /bad\.html:1:\d+ {2}error {2}unknown-class/);
  assert.equal(spawnSync(process.execPath, [script, '--catalog', path.join(fx, 'missing.json'), 'x.html'], { encoding: 'utf8' }).status, 2);
  assert.deepEqual(expandInputs([path.join(fx, 'lint', 'good.{html,vue}')]).map((f) => path.basename(f)), ['good.html', 'good.vue']);
});
