import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lintText, lintFiles, prepareContract, parseColor, parseLength, extractCss, expandInputs, RULES } from '../lint-css.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const fx = path.join(here, 'fixtures', 'product-css');
const contractPath = path.join(root, 'contract', 'fire-contract.json');
const contract = prepareContract(JSON.parse(fs.readFileSync(contractPath, 'utf8')));
const lint = (file, text, prefixes = ['acme']) => lintText(file, text, contract, { prefixes });
const at = (file, text, prefixes) => lint(file, text, prefixes).map((f) => `${f.rule}@${f.line}:${f.col}`);
// 'line:col' of the first `needle` in `text`: tests state where a finding is by pointing at the offending text
const where = (text, needle) => { const i = text.indexOf(needle); assert.ok(i >= 0, needle); const before = text.slice(0, i); return `${before.split('\n').length}:${i - before.lastIndexOf('\n')}`; };
const read = (...p) => fs.readFileSync(path.join(fx, ...p), 'utf8');
const inputsOf = (dir) => fs.readdirSync(path.join(fx, dir)).filter((n) => n !== 'package.json').sort()
  .map((n) => ({ file: path.join(dir, n), text: read(dir, n) }));
const lintDir = (dir) => lintFiles(inputsOf(dir), { contract, prefixes: ['acme'] });

test('fixtures: the good product stylesheet passes clean, across all of its files', () => {
  assert.deepEqual(lintDir('good'), []);
});

test('fixtures: every rule fires on the bad files, at exact lines and columns', () => {
  const found = lintDir('bad').map((f) => `${path.basename(f.file)} ${f.rule} ${f.line}:${f.col}`);
  assert.deepEqual(found, [
    'app.css no-raw-color 1:18',
    'app.css no-raw-color 3:31',
    'app.css no-raw-size 4:11',
    'app.css no-raw-size 6:20',
    'app.css no-raw-duration 7:31',
    'app.css unknown-token 8:22',
    'app.css no-fd-class-restyle 9:9',
    'app.css no-important 10:23',
    'app.css no-fd-class-restyle 11:9',
    'app.css no-important 13:32',
    'card.vue no-raw-color 6:25',
    'panel.html no-raw-size 5:26',
    'tokens.css reserved-prefix 3:3',
    'tokens.css token-override 4:3',
    'tokens.css token-override 5:3',
    'tokens.css unprefixed-token 6:3',
    'tokens.css duplicate-token 7:3',
    'tokens.css duplicate-token 8:3',
    'tokens.css duplicate-token 9:3',
    'tokens.css duplicate-token 10:3',
    'tokens.css duplicate-token 11:3',
    'tokens.css duplicate-token 12:3',
    'tokens.css near-token 13:3',
    'tokens.css near-token 14:3',
    'tokens.css duplicate-token 16:3',
    'widget.ts unknown-token 5:19',
    'widget.ts no-raw-size 5:55',
  ]);
  assert.deepEqual([...new Set(lintDir('bad').map((f) => f.rule))].sort(), [...RULES].sort(), 'the bad fixtures cover every rule');
});

test('findings carry file, position, message, fix and a severity that matches the rule', () => {
  const errors = new Set(['unknown-token', 'reserved-prefix', 'duplicate-token', 'no-raw-color']);
  for (const f of lintDir('bad')) {
    assert.ok(f.line >= 1 && f.col >= 1 && f.message && f.fix && f.file, f.rule);
    assert.equal(f.severity, errors.has(f.rule) ? 'error' : 'warning', f.rule);
  }
});

test('unknown-token: names the nearest tokens, or the family', () => {
  const [a] = lint('a.css', '.a { color: var(--fd-text-mutd); }');
  assert.equal(a.rule, 'unknown-token');
  assert.match(a.fix, /did you mean .*--fd-text/);
  assert.match(lint('a.css', '.a { color: var(--fd-text-muted); }')[0].fix, /--fd-text-… family/);
  assert.match(lint('a.css', '.a { color: var(--fd-color-bg); }')[0].fix, /--fd-bg/);
  assert.deepEqual(at('a.css', '.a { color: var(--fd-text, var(--fd-bg)); gap: var(--fd-gap); }'), [], 'listed tokens and component parameters are known');
});

test('reserved-prefix, token-override and the contract tiers', () => {
  assert.deepEqual(at('a.css', ':root { --fd-accent: #f60; }'), [], 'an input token is what a theme record sets');
  assert.deepEqual(at('a.css', ':root { --fd-radius-scale: 1.5; --fd-hairline: 1.5px; }'), []);
  assert.deepEqual(at('a.css', ':root { --fd-radius-md: 4px; }'), ['token-override@1:9']);
  assert.match(lint('a.css', ':root { --fd-text-2: #111; }')[0].message, /derived/);
  assert.deepEqual(at('a.css', ':root { --fd-my-thing: 1; }'), ['reserved-prefix@1:9']);
  assert.match(lint('a.css', ':root { --fd-my-thing: 1; }')[0].fix, /--acme-my-thing/);
  assert.deepEqual(at('a.css', '.a { --fd-gap: 4; --fd-cols: 3; --fd-i: 2; --fd-panel-w: var(--fd-size-xl); }'), [], 'documented component parameters');
});

test('unprefixed-token: neither --fd-, --_ nor the prefix; once per name', () => {
  assert.deepEqual(at('a.css', ':root { --brand: 1; --_x: 2; --acme-ok: 3; }\n.a { --brand: 4; }'), ['unprefixed-token@1:9']);
  assert.match(lint('a.css', ':root { --brand: 1; }', [])[0].message, /no product prefix is declared/);
  assert.deepEqual(at('a.css', ':root { --tw-x: 1; --acme-y: 2; }', ['acme', 'tw']), []);
});

test('duplicate-token: colours compare by distance, lengths after conversion', () => {
  assert.deepEqual(at('a.css', ':root { --acme-r: 0.5rem; }'), [], 'no recognised name family: not compared');
  assert.deepEqual(at('a.css', ':root { --acme-radius: 0.5rem; }'), ['duplicate-token@1:9']);
  assert.deepEqual(at('a.css', ':root { --acme-radius: 8px; }'), ['duplicate-token@1:9']);
  assert.match(lint('a.css', ':root { --acme-radius: 8px; }')[0].message, /--fd-radius-md/);
  assert.deepEqual(at('a.css', ':root { --acme-radius: 7px; }'), ['near-token@1:9'], 'one pixel away is near, not the same');
  assert.deepEqual(at('a.css', ':root { --acme-radius: 5px; }'), ['near-token@1:9']);
  assert.deepEqual(at('a.css', ':root { --acme-radius: 45px; }'), []);
  assert.deepEqual(at('a.css', ':root { --acme-sidebar-w: 240px; --acme-panel-h: 360px; }'), [], 'layout sizes are not compared with the size steps');
  // paired colours: both the light and the dark value must match
  assert.deepEqual(at('a.css', ':root { --acme-bg: #fafafa; }\n:root[data-theme=dark] { --acme-bg: #0a0a0a; }'), ['duplicate-token@1:9']);
  assert.deepEqual(at('a.css', ':root { --acme-bg: #fafafa; }\n:root[data-theme=dark] { --acme-bg: #1a1a2e; }'), []);
  assert.deepEqual(at('a.css', ':root { --acme-paper: #f9f9f9; }'), ['near-token@1:9'], 'one of two values: Fire\'s token also adapts to dark');
  assert.deepEqual(at('a.css', ':root { --acme-on-accent: #fff; --acme-card: white; }'), [], 'pure white and black are primitives');
  assert.deepEqual(at('a.css', ':root { --acme-dur: 160ms; --acme-slow: 0.52s; --acme-odd: 175ms; }'), ['duplicate-token@1:9', 'duplicate-token@1:28']);
  assert.deepEqual(at('a.css', ':root { --acme-weight: 600; --acme-z-top: 70; }'), ['duplicate-token@1:9', 'duplicate-token@1:29']);
});

test('colour and length arithmetic', () => {
  const a = parseColor('#fff'), b = parseColor('white'), c = parseColor('rgb(255 255 255)'), d = parseColor('rgb(255, 255, 255)');
  for (const x of [b, c, d]) assert.ok(Math.hypot(a.L - x.L, a.a - x.a, a.b - x.b) < 1e-6);
  assert.ok(Math.abs(parseColor('hsl(0 0% 100%)').L - 1) < 1e-6);
  assert.ok(Math.abs(parseColor('oklch(1 0 0)').L - 1) < 1e-6);
  assert.equal(parseColor('rgb(0 0 0 / 50%)').alpha, 0.5);
  assert.equal(parseColor('var(--x)'), null);
  assert.equal(parseColor('transparent'), null);
  assert.equal(parseLength('0.5rem'), 8);
  assert.equal(parseLength('8px'), 8);
  assert.equal(parseLength('1em'), null);
});

test('duplicate-token: a bare alias on :root is reported, a re-defined alias is not (across files too)', () => {
  assert.deepEqual(at('a.css', ':root { --acme-ink: var(--fd-text); }'), ['duplicate-token@1:9']);
  assert.match(lint('a.css', ':root { --acme-ink: var(--fd-text); }')[0].fix, /re-defined/);
  assert.deepEqual(at('a.css', ':root { --acme-ink: var(--fd-text); }\n[data-theme=dark] { --acme-ink: var(--fd-text-2); }'), []);
  assert.deepEqual(at('a.css', '.card { --acme-card-ink: var(--fd-text); }'), [], 'a parameter with a default, inside a component');
  const two = lintFiles([{ file: 'a.css', text: ':root { --acme-ink: var(--fd-text); }' }, { file: 'b.css', text: '@media (prefers-color-scheme: dark) { :root { --acme-ink: var(--fd-text-2); } }' }], { contract, prefixes: ['acme'] });
  assert.deepEqual(two, []);
  assert.deepEqual(at('a.css', ':root { --acme-base: var(--fd-radius-md); --acme-card: var(--acme-base); }'), ['duplicate-token@1:9', 'duplicate-token@1:43'], 'an alias of an alias resolves to the Fire token');
});

test('duplicate-token: two product tokens with the same value', () => {
  assert.deepEqual(at('a.css', ':root { --acme-line: #d4d0e8; --acme-divider: #d4d0e9; }'), ['duplicate-token@1:31']);
  assert.match(lint('a.css', ':root { --acme-line: #d4d0e8; --acme-divider: #d4d0e9; }')[0].message, /--acme-line/);
  assert.deepEqual(at('a.css', ':root { --acme-line: #d4d0e8; --acme-divider: #c0b8e0; }'), []);
});

test('no-raw-color: exceptions and what is reported', () => {
  const ok = '.a { color: transparent; border-color: currentColor; background: rgb(var(--acme-rgb) / 0.5); outline-color: oklch(from var(--fd-accent) l c h / 0.4); content: "#fff red"; fill: url(#g); background-image: url("data:image/svg+xml;utf8,<svg fill=\'%23fff\'/>"); --acme-brand: #123456; --_c: red; color-scheme: light dark; }';
  assert.deepEqual(at('a.css', ok), []);
  for (const [css, needle] of [['.a { color: #FFF; }', '#FFF'], ['.a { color: rgb(1 2 3); }', 'rgb('], ['.a { color: hsl(10 20% 30%); }', 'hsl('],
    ['.a { color: oklch(0.5 0.1 20); }', 'oklch('], ['.a { border: var(--fd-hairline) solid red; }', 'red']]) {
    assert.deepEqual(at('a.css', css), [`no-raw-color@${where(css, needle)}`], css);
  }
  assert.deepEqual(at('a.css', '.a { font-family: tan, gold; transition: color 0s; }'), [], 'named colours only count in colour properties');
  assert.match(lint('a.css', '.a { color: #fff; }')[0].fix, /--acme-…/);
});

test('no-raw-size and no-raw-duration: exceptions and what is reported', () => {
  const ok = '.a { margin: 0 auto; padding: 0px; width: 50%; height: calc(var(--fd-space-2) * 3); line-height: 1.5; z-index: 10; animation-delay: 0s; transition: opacity var(--fd-dur-2) var(--fd-ease-out); flex: 1 1 0; aspect-ratio: 16 / 9; width: min(100%, var(--fd-size-md)); }\n@media (min-width: 48rem) { .a { gap: var(--fd-space-4); } }\n@container (min-width: 300px) { .a { gap: var(--fd-space-4); } }';
  assert.deepEqual(at('a.css', ok), []);
  const one = (css, rule, needle) => assert.deepEqual(at('a.css', css), [`${rule}@${where(css, needle)}`], css);
  one('.a { width: calc(100% - 16px); }', 'no-raw-size', '16px');
  one('.a { border-bottom: 1px solid var(--fd-line); }', 'no-raw-size', '1px');
  assert.match(lint('a.css', '.a { border-bottom: 1px solid var(--fd-line); }')[0].fix, /--fd-hairline/);
  assert.match(lint('a.css', '.a { padding: 12px; }')[0].fix, /--fd-space-3 is 12px/);
  assert.match(lint('a.css', '.a { width: 777px; }')[0].fix, /--fd-size-|no Fire token is near/);
  one('.a { margin: -4px 0 0.5rem; }', 'no-raw-size', '-4px');
  assert.match(lint('a.css', '.a { margin: -4px 0 0.5rem; }')[0].message, /-4px, 0\.5rem/, 'one finding per declaration, listing every value');
  const t = '.a { transition: opacity 0.2s; animation: spin 1s linear; }';
  assert.deepEqual(at('a.css', t), [`no-raw-duration@${where(t, '0.2s')}`, `no-raw-duration@${where(t, '1s')}`]);
  assert.match(lint('a.css', '.a { transition: opacity 200ms; }')[0].fix, /--fd-dur-3/);
  assert.deepEqual(at('a.css', '@font-face { font-family: X; src: url(a.woff2); unicode-range: U+0-FF; }\n@property --acme-x { syntax: "<length>"; inherits: false; initial-value: 4px; }'), []);
});

test('no-fd-class-restyle: placement is fine, restyling is reported, the selector decides', () => {
  const ok = '.fd-btn { margin: 0; flex: 1; width: var(--fd-size-md); max-width: 100%; display: none; --fd-gap: 4px; align-self: end; grid-area: a; order: 2; position: relative; inset-inline-start: 0; }\n.fd-card .acme-x { padding: var(--fd-space-2); }\n.acme:not(.fd-btn) { color: var(--fd-text); }\n.acme-a > .fd-btn { margin-inline-start: auto; }';
  assert.deepEqual(at('a.css', ok), []);
  const one = (css, needle) => assert.deepEqual(at('a.css', css), [`no-fd-class-restyle@${where(css, needle)}`], css);
  one('.acme-a .fd-btn { color: var(--fd-text); }', '.fd-btn');
  one('.fd-btn:hover { opacity: 0.5; }', '.fd-btn');
  one('.acme-x, .acme-y .fd-badge { padding: var(--fd-space-1); }', '.fd-badge');
  one('.acme-a { .fd-btn { opacity: 1; } margin: 0; }', '.fd-btn');
  const w = '.fd-btn { width: 300px; }';
  assert.deepEqual(at('a.css', w).sort(), [`no-fd-class-restyle@1:1`, `no-raw-size@${where(w, '300px')}`].sort(), 'a fixed width is not placement through a token');
});

test('no-important: only on rules that style an fd- class', () => {
  assert.deepEqual(at('a.css', '.acme-a { color: var(--fd-text) !important; }'), []);
  const a = '.fd-badge { margin: 0 !important; }', b = '.acme .fd-badge { margin: 0 ! important; }';
  assert.deepEqual(at('a.css', a), [`no-important@${where(a, '!')}`]);
  assert.deepEqual(at('a.css', b).filter((x) => x.startsWith('no-important')), [`no-important@${where(b, '!')}`]);
});

test('the tokeniser: comments, strings, url(), nesting, braces in custom properties, stray characters', () => {
  const t = '/* .fd-btn { color: red } */\n.acme-a {\n  background: url("data:image/svg+xml;utf8,<svg fill=\'%23fff\'/>");\n  content: "}{;";\n  --acme-j: { a: b };\n  &:hover { color: #fff; }\n}\n}\n.acme-b { color: red;; }\n@import url("a.css");\n@layer base, components;';
  assert.deepEqual(at('a.css', t), [`no-raw-color@${where(t, '#fff; }')}`, `no-raw-color@${where(t, 'red;;')}`]);
  assert.deepEqual(at('a.css', '.a{color:#fff}'), ['no-raw-color@1:10']);
  assert.deepEqual(at('a.css', '.a {\r\n  color: #fff;\r\n}\r\n'), ['no-raw-color@2:10']);
});

test('inputs: <style> in html and vue, css`` in ts and js; static parts only', () => {
  const html = '<p>\n</p>\n<style media="screen">\n  .a { color: #fff; }\n</style><style lang="scss">.a { color: #000; }</style>';
  assert.deepEqual(at('a.html', html), [`no-raw-color@${where(html, '#fff')}`]);
  const vue = '<template><p/></template>\n<style scoped>\n.a { color: #fff; }\n</style>';
  assert.deepEqual(at('a.vue', vue), [`no-raw-color@${where(vue, '#fff')}`]);
  const ts = 'const x = `.a { color: #111; }`;\nconst y = css`\n  .a { color: #fff; padding: ${p}; width: ${w}px; margin: 4px ${m}; }\n  ${mix}\n  .b { gap: 8px; }\n`;\nconst s = "css`.a{color:red}`"; // css`.a{color:red}`';
  assert.deepEqual(at('a.ts', ts), [`no-raw-color@${where(ts, '#fff')}`, `no-raw-size@${where(ts, '4px')}`, `no-raw-size@${where(ts, '8px')}`]);
  assert.deepEqual(extractCss('a.txt', '.a{color:red}'), []);
  assert.deepEqual(extractCss('a.ts', 'const a = 1;'), []);
  const tsx = 'const re = /`/; const y = css`.a { color: #fff; }`;';
  assert.deepEqual(at('a.tsx', tsx), [`no-raw-color@${where(tsx, '#fff')}`]);
});

test('prefixes: given, normalised in the CLI, and read from package.json', () => {
  const script = path.join(here, '..', 'lint-css.mjs');
  const run = (...a) => spawnSync(process.execPath, [script, '--contract', contractPath, ...a], { encoding: 'utf8' });
  const tokens = path.join(fx, 'bad', 'tokens.css');
  const withFlag = run('--json', '--prefix', '--acme-', tokens);   // package.json would say acme too; prove the flag is read as well
  assert.ok(JSON.parse(withFlag.stdout).findings.every((f) => f.rule !== 'duplicate-token' || f.message.includes('--acme')));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-css-'));
  try {
    fs.writeFileSync(path.join(tmp, 'a.css'), ':root { --zeta-x: 1; --acme-y: 2; }\n');
    assert.match(run(path.join(tmp, 'a.css')).stdout, /unprefixed-token.*--zeta-x[^\n]*\n[^\n]*\n[^\n]*unprefixed-token.*--acme-y/s, 'no prefix declared: both are unprefixed');
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ fire: { prefix: ['zeta'] } }));
    const out = run('--json', path.join(tmp, 'a.css'));
    assert.deepEqual(JSON.parse(out.stdout).findings.map((f) => f.message.split(' ')[0]), ['--acme-y']);
    assert.deepEqual(JSON.parse(run('--json', '--prefix', 'acme', path.join(tmp, 'a.css')).stdout).findings, [], 'the flag adds to package.json');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('CLI: text and JSON output, exit codes, directories and globs, the contract flag, fire lint-css', () => {
  const script = path.join(here, '..', 'lint-css.mjs');
  const run = (...a) => spawnSync(process.execPath, [script, '--contract', contractPath, ...a], { encoding: 'utf8' });
  let r = run(path.join(fx, 'good'));
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /5 files checked, 0 errors, 0 warnings/);
  r = run(path.join(fx, 'bad'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /bad\/tokens\.css:3:3 {2}error {2}reserved-prefix/);
  assert.match(r.stdout, /\n {4}fix: /);
  assert.match(r.stdout, /5 files checked, 13 errors, 14 warnings/);
  r = run('--json', path.join(fx, 'bad', '*.css'));
  const j = JSON.parse(r.stdout);
  assert.deepEqual([j.files, j.errors > 0, j.warnings > 0, typeof j.findings[0].rule], [2, true, true, 'string']);
  assert.equal(run().status, 2);
  assert.equal(run('--nope', 'x.css').status, 2);
  assert.equal(spawnSync(process.execPath, [script, '--contract', path.join(fx, 'missing.json'), 'x.css'], { encoding: 'utf8' }).status, 2);
  assert.deepEqual(expandInputs([path.join(fx, 'good', '*.{css,vue}')]).map((f) => path.basename(f)), ['app.css', 'card.vue', 'tokens.css']);
  const fire = spawnSync(process.execPath, [path.join(here, '..', 'fire.mjs'), 'lint-css', '--contract', contractPath, path.join(fx, 'good')], { encoding: 'utf8' });
  assert.equal(fire.status, 0, fire.stdout + fire.stderr);
});

test('the three starters\' own CSS lints clean, and the run covers all of their files', () => {
  // Work, not time: a wall-clock limit measures the machine's load, not the linter. What a slowdown would show here is
  // work done, so the run must check every file the inputs expand to (each starter has many), not fewer.
  for (const [dir, inputs] of [['lit-vite', ['src', 'index.html']], ['vue-vite', ['src', 'index.html']], ['next', ['app']]]) {
    const cwd = path.join(root, 'starters', dir);
    const r = spawnSync(process.execPath, [path.join(here, '..', 'lint-css.mjs'), ...inputs], { cwd, encoding: 'utf8' });
    assert.equal(r.status, 0, `${dir}\n${r.stdout}${r.stderr}`);
    assert.match(r.stdout, / 0 errors, 0 warnings/, dir);
    const files = expandInputs(inputs, cwd).length;
    assert.ok(files > 0, dir);
    assert.match(r.stdout, new RegExp(`(^|\\n)${files} files checked,`), `${dir}: ${files} files expected\n${r.stdout}`);
  }
});

test('every look\'s generated theme CSS lints clean: what a theme record writes is not a finding', async () => {
  const { themeToCss } = await import(pathToFileURL(path.join(root, 'fire/js/theme.js')).href);
  const looks = fs.readdirSync(path.join(root, 'contract/looks')).filter((f) => f.endsWith('.json'));
  assert.ok(looks.length >= 10);
  for (const f of looks) {
    const css = themeToCss(JSON.parse(fs.readFileSync(path.join(root, 'contract/looks', f), 'utf8')), { selector: ':root' });
    assert.deepEqual(lint(`${f}.css`, css, []), [], f);
  }
});

test('performance: all of Fire\'s docs pages, in well under a second of lint time', () => {
  const files = fs.readdirSync(path.join(root, 'docs')).filter((f) => f.endsWith('.html')).map((f) => path.join(root, 'docs', f));
  const inputs = files.map((f) => ({ file: f, text: fs.readFileSync(f, 'utf8') }));
  const t0 = performance.now();
  lintFiles(inputs, { contract, prefixes: [] });
  assert.ok(performance.now() - t0 < 1000);
});

test('the skeleton timing tokens are parameters a product may set (0.13): --fd-skeleton-delay, --fd-skeleton-late', () => {
  assert.deepEqual(lint('a.css', '.acme-region { --fd-skeleton-delay: 0s; --fd-skeleton-late: 10s; }').filter((f) => f.rule === 'reserved-prefix'), []);
  assert.ok(lint('a.css', '.acme-region { --fd-skeleton-wait: 0s; }').some((f) => f.rule === 'reserved-prefix'));
});
