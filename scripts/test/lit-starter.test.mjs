// The Lit starter (starters/lit-vite): static rules that need no build and no browser.
// The full proof (production build, render-equal on three screens, CSP, behaviours) is `npm run check` in the starter.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const starter = path.join(root, 'starters/lit-vite');
const read = (rel) => fs.readFileSync(path.join(starter, rel), 'utf8');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const sources = walk(path.join(starter, 'src')).filter((f) => /\.(ts|css)$/.test(f) && !f.includes('fire-theme'));

test('the starter has the files a new project starts from', () => {
  for (const f of ['package.json', 'package-lock.json', 'README.md', 'index.html', 'theme.json', 'vite.config.ts', 'tsconfig.json',
    'scripts/prepare.mjs', 'scripts/check.mjs', 'scripts/lint.mjs', 'src/main.ts', 'src/lib/fire-light.ts', 'src/lib/router.ts',
    'src/shell/app-shell.ts', 'src/screens/overview/screen.ts', 'src/screens/logs/screen.ts', 'src/screens/settings/screen.ts']) {
    assert.ok(fs.existsSync(path.join(starter, f)), f);
  }
});

test('versions are pinned exactly, and Fire comes from the repository', () => {
  const pkg = JSON.parse(read('package.json'));
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.equal(all.lit, '3.3.3');
  assert.equal(all.vite, '8.3.8');
  assert.equal(all.typescript, '5.9.3');
  assert.equal(all['fire-design'], 'file:../..');
  for (const [name, version] of Object.entries(all)) if (name !== 'fire-design') assert.match(version, /^\d+\.\d+\.\d+$/, `${name} is not pinned`);
});

test('no style attribute, styleMap, inline handler or <i data-icon> in the source (spec A17, A18, I1, P4)', () => {
  for (const file of sources) {
    const text = fs.readFileSync(file, 'utf8');
    const name = path.relative(starter, file);
    assert.doesNotMatch(text, /[\s"'`]style\s*=\s*["'$]/, `${name}: style attribute`);
    assert.doesNotMatch(text, /styleMap|unsafeCSS|unsafeHTML/, `${name}: styleMap or unsafe directive`);
    assert.doesNotMatch(text, /<[a-z][^>]*\son(click|change|input|submit|load)=[\"'$]/i, `${name}: inline handler`);
    assert.doesNotMatch(text, /<i\s[^>]*data-icon/, `${name}: <i data-icon>`);
    assert.doesNotMatch(text, /\beval\s*\(|new Function\(/, `${name}: eval`);
  }
});

test('components render to the light DOM and run Fire after every render (L1, L2, L6)', () => {
  const base = read('src/lib/fire-light.ts');
  assert.match(base, /createRenderRoot\(\)[^{]*\{\s*return this;/);
  assert.match(base, /init\(this\)/);
  for (const file of sources.filter((f) => /screens|shell/.test(f) && /screen\.ts$|app-shell\.ts$/.test(f))) {
    assert.match(fs.readFileSync(file, 'utf8'), /extends FireLight/, path.relative(starter, file));
  }
});

test('the bundle order is Fire CSS, then the theme, and elements are registered before the first render (H3, C1)', () => {
  const main = read('src/main.ts');
  const at = (s) => main.indexOf(s);
  assert.ok(at("'fire-design/css'") >= 0 && at("'fire-design/css'") < at("'./fire-theme.css'"));
  assert.ok(at("'fire-design/elements'") >= 0 && at("'fire-design/elements'") < at("'./shell/app-shell'"));
});

test('index.html loads boot.js as a classic script before the app, and carries no inline script or style (N2, P1)', () => {
  const html = read('index.html');
  assert.match(html, /<script src="\/fire\/boot\.js"><\/script>/);
  assert.ok(html.indexOf('boot.js') < html.indexOf('src/main.ts'));
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>[^<]/);
  assert.doesNotMatch(html, /<style|\sstyle=/);
});

test('the production policy has no unsafe-inline and no unsafe-eval (P1)', () => {
  const config = read('vite.config.ts');
  assert.match(config, /style-src 'self'/);
  assert.match(config, /script-src 'self'/);
  assert.doesNotMatch(config, /unsafe-inline|unsafe-eval/);
});

test('the three screens are the .fd-page of Fire\'s templates, and each begins with <main class="fd-page">', () => {
  for (const [dir, template] of [['overview', 'overview'], ['logs', 'logs'], ['settings', 'settings']]) {
    const view = read(`src/screens/${dir}/view.ts`);
    assert.match(view, /<main class="fd-page">/, dir);
    assert.ok(fs.existsSync(path.join(root, 'templates', `${template}.html`)));
  }
});

test('the source lints clean against the catalogue (needs `npm install` in the starter)', { skip: !fs.existsSync(path.join(starter, 'node_modules/fire-design')) }, () => {
  const run = spawnSync(process.execPath, ['scripts/lint.mjs'], { cwd: starter, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});
