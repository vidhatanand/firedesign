// node --test scripts/test/ : the type declarations stay complete.
//   fire/fire.d.ts is hand-written. This test fails when
//     - a runtime export of fire/fire.js, or of a module in fire/js/ or fire/email/, has no declaration;
//     - a declared value name does not exist at runtime (a rename or a removal that left its declaration behind);
//     - a module in fire/js/ has no declaration at all (neither a namespace in fire.d.ts nor a sibling .d.ts);
//     - an `fd:*` event is dispatched and is not in FireEventMap, or is in it and never dispatched;
//     - scripts/test/types-usage.ts does not compile under TypeScript with "moduleResolution": "bundler" (and a
//       self-reference import by package path, `fire-design/fire/email/email.js`, resolves to the sibling .d.ts).
//   Runtime exports are read from the source (export statements, followed through `export * from`), and for the
//   modules that load in Node (no DOM) cross-checked against the module's real namespace object.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ---------- runtime exports, from the source ---------- */
function runtimeExports(rel, seen = new Set()) {
  if (seen.has(rel)) return new Set();
  seen.add(rel);
  const source = ts.createSourceFile(rel, read(rel), ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
  const names = new Set();
  for (const node of source.statements) {
    const exported = ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) for (const e of node.exportClause.elements) names.add(e.name.text);
      else if (!node.exportClause && node.moduleSpecifier) {
        const target = path.posix.join(path.posix.dirname(rel), node.moduleSpecifier.text);
        for (const n of runtimeExports(target, seen)) names.add(n);
      }
    } else if (ts.isExportAssignment(node)) names.add('default');
    else if (exported) {
      if (ts.isVariableStatement(node)) for (const d of node.declarationList.declarations) names.add(d.name.getText(source));
      else if (node.name) names.add(node.name.text);   // function, class
      if (ts.getModifiers(node).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) names.add('default');
    }
  }
  return names;
}

/* ---------- declared value names, from the .d.ts ---------- */
const isExported = (node) => ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
function declaredValues(statements, source, { requireExport = true } = {}) {
  const top = new Set();
  const namespaces = new Map();
  for (const node of statements) {
    if (requireExport && !isExported(node) && !ts.isExportDeclaration(node)) continue;
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) { if (node.name) top.add(node.name.text); }
    else if (ts.isVariableStatement(node)) for (const d of node.declarationList.declarations) top.add(d.name.getText(source));
    else if (ts.isModuleDeclaration(node) && node.body && ts.isModuleBlock(node.body) && ts.isIdentifier(node.name)) {
      top.add(node.name.text);
      namespaces.set(node.name.text, declaredValues(node.body.statements, source, { requireExport: false }).top);
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const e of node.exportClause.elements) if (!e.isTypeOnly) top.add(e.name.text);
    }
  }
  return { top, namespaces };
}
function declarations(rel) {
  const source = ts.createSourceFile(rel, read(rel), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  return declaredValues(source.statements, source);
}
const sorted = (set) => [...set].sort();
const diff = (a, b) => sorted(a).filter((n) => !b.has(n));

/* ---------- which declaration covers which module ---------- */
const FIRE_D = declarations('fire/fire.d.ts');
const jsModules = fs.readdirSync(path.join(ROOT, 'fire/js')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
const SIBLING_ONLY = [...jsModules.filter((m) => fs.existsSync(path.join(ROOT, `fire/js/${m}.d.ts`))).map((m) => `fire/js/${m}`), 'fire/email/email'];

test('fire.js: every runtime export is declared in fire.d.ts, and every declared value exists', () => {
  const runtime = runtimeExports('fire/fire.js');
  const declared = FIRE_D.top;
  assert.deepEqual(diff(runtime, declared), [], 'exported by fire.js but not declared in fire.d.ts');
  assert.deepEqual(diff(declared, runtime), [], 'declared in fire.d.ts but not exported by fire.js');
});

test('fire.js: every namespace is a module of fire/js/ and every module that fire.js exports has its namespace', () => {
  const imported = [...read('fire/fire.js').matchAll(/import \* as (\w+) from '\.\/js\/(\w+)\.js'/g)];
  assert.ok(imported.length >= 10);
  for (const [, name, file] of imported) {
    assert.equal(name, file, `fire.js imports js/${file}.js as ${name}`);
    assert.ok(FIRE_D.namespaces.has(name), `fire.d.ts has no namespace ${name}`);
  }
  for (const name of FIRE_D.namespaces.keys()) assert.ok(imported.some(([, n]) => n === name), `namespace ${name} is not a module fire.js exports`);
});

for (const mod of jsModules) {
  test(`fire/js/${mod}.js: its exports and its declaration agree`, () => {
    const rel = `fire/js/${mod}.js`;
    const runtime = runtimeExports(rel);
    assert.ok(runtime.size > 0, `${rel} exports nothing`);
    let declared;
    if (FIRE_D.namespaces.has(mod)) declared = FIRE_D.namespaces.get(mod);
    else if (SIBLING_ONLY.includes(`fire/js/${mod}`)) declared = declarations(`fire/js/${mod}.d.ts`).top;
    else if (mod === 'core') declared = FIRE_D.top;   // fire.js re-exports core.js whole
    else assert.fail(`${rel} has no declaration: add a namespace to fire/fire.d.ts or a sibling ${mod}.d.ts`);
    const missing = diff(runtime, declared);
    assert.deepEqual(missing, [], `${rel} exports names with no declaration`);
    if (mod !== 'core') assert.deepEqual(diff(declared, runtime), [], `declared names that ${rel} does not export`);
  });
}

test('fire/email/email.js: its exports and its declaration agree', () => {
  const runtime = runtimeExports('fire/email/email.js');
  const declared = declarations('fire/email/email.d.ts').top;
  assert.deepEqual(diff(runtime, declared), []);
  assert.deepEqual(diff(declared, runtime), []);
});

test('the source reader agrees with the real module namespace for every module that loads in Node', async () => {
  let loaded = 0;
  for (const rel of [...jsModules.map((m) => `fire/js/${m}.js`), 'fire/email/email.js']) {
    let mod;
    try { mod = await import(pathToFileURL(path.join(ROOT, rel)).href); } catch { continue; }   // needs a DOM
    loaded += 1;
    assert.deepEqual(sorted(new Set(Object.keys(mod))), sorted(runtimeExports(rel)), rel);
  }
  assert.ok(loaded >= 6, `only ${loaded} modules loaded in Node: the pure modules should`);
});

test('every .d.ts beside a module has a module beside it', () => {
  for (const dir of ['fire/js', 'fire/email']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.d.ts'))) {
      assert.ok(fs.existsSync(path.join(ROOT, dir, f.replace(/\.d\.ts$/, '.js'))), `${dir}/${f} describes a module that does not exist`);
    }
  }
});

/* ---------- events ---------- */
function dispatchedEvents() {
  const found = new Set();
  const files = [...jsModules.map((m) => `fire/js/${m}.js`), 'fire/fire.js'];
  for (const rel of files) {
    for (const line of read(rel).split('\n')) {
      if (!/\bemit\(/.test(line)) continue;
      for (const m of line.matchAll(/'(fd:[a-z-]+)'/g)) found.add(m[1]);
    }
  }
  return found;
}
function declaredEvents() {
  const source = ts.createSourceFile('fire.d.ts', read('fire/fire.d.ts'), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const names = new Set();
  for (const node of source.statements) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'FireEventMap') {
      for (const member of node.members) names.add(member.name.text ?? member.name.getText(source).replace(/['"]/g, ''));
    }
  }
  return names;
}

test('every fd:* event that Fire dispatches is in FireEventMap, and every event in it is dispatched', () => {
  const runtime = dispatchedEvents();
  const declared = declaredEvents();
  assert.ok(runtime.size >= 20, `found only ${runtime.size} events`);
  assert.deepEqual(diff(runtime, declared), [], 'dispatched but not in FireEventMap');
  assert.deepEqual(diff(declared, runtime), [], 'in FireEventMap but never dispatched');
});

/* ---------- the usage file compiles ---------- */
const tsc = (args) => spawnSync(process.execPath, [path.join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--target', 'es2022',
  '--lib', 'es2022,dom,dom.iterable', '--skipLibCheck', 'false', ...args], { cwd: ROOT, encoding: 'utf8' });

test('types-usage.ts compiles with moduleResolution "bundler" (and every @ts-expect-error is an error)', () => {
  const run = tsc(['--module', 'esnext', '--moduleResolution', 'bundler', 'scripts/test/types-usage.ts']);
  assert.equal(run.status, 0, run.stdout + run.stderr);
});

test('a package-path import of a JS-only module type-checks (fire-design/fire/email/email.js, js/theme.js, js/initial.js)', () => {
  const dir = fs.mkdtempSync(path.join(ROOT, 'scripts/test/.types-'));
  try {
    const file = path.join(dir, 'self.ts');
    fs.writeFileSync(file, [
      `import { renderEmail } from 'fire-design/fire/email/email.js';`,
      `import { expandTheme, FIRE_VERSION } from 'fire-design/fire/js/theme.js';`,
      `import { initialMark } from 'fire-design/fire/js/initial.js';`,
      `import { init, shell } from 'fire-design';`,
      `const html: string = renderEmail({ brand: { name: 'Ember' }, blocks: [{ type: 'divider' }] }).html;`,
      `const v: string = FIRE_VERSION; const t: string[] = expandTheme({ palette: 'volt' }).notes; const m: string = initialMark('Ember');`,
      `// @ts-expect-error renderEmail needs a brand`,
      `renderEmail({ blocks: [] });`,
      `void html; void v; void t; void m; void init; void shell;`,
      ``,
    ].join('\n'));
    const run = tsc(['--module', 'esnext', '--moduleResolution', 'bundler', file]);
    assert.equal(run.status, 0, run.stdout + run.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
