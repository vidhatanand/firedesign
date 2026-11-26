// Builds Fire's custom elements from elements/src (Lit + TypeScript):
//   fire/elements.js             ES module, Lit bundled in, not minified; Fire's modules stay external (./js/*.js)
//   wrappers/lit/elements.js     the same elements with Lit left as bare imports (lit, lit/…), for an app that has
//                                Lit already (import 'fire-design/elements/lit'): its bundler then loads one Lit
//   fire/elements.d.ts           one declaration file (HTMLElementTagNameMap included); types from ./fire.js
//   contract/custom-elements.json  Custom Elements Manifest (analyzer with the Lit plugin)
// Usage: node scripts/build-elements.mjs [--check]
//   --check builds into a temporary folder and exits 1 when a committed output differs.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import ts from 'typescript';
import { create, ts as cemTs } from '@custom-elements-manifest/analyzer/index.js';
import { litPlugin } from '@custom-elements-manifest/analyzer/src/features/framework-plugins/lit/lit.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'elements/src');
const TSCONFIG = path.join(ROOT, 'elements/tsconfig.json');
const OUTPUTS = ['fire/elements.js', 'wrappers/lit/elements.js', 'fire/elements.d.ts', 'contract/custom-elements.json'];
const LIT_VERSION = JSON.parse(readFileSync(path.join(ROOT, 'node_modules/lit/package.json'), 'utf8')).version;

/* ---------- fire/elements.js ---------- */
// Fire's modules are imported from elements/src as ../../fire/js/<name>.js; in fire/elements.js they become ./js/<name>.js,
// the same URL fire/fire.js imports, so the browser runs one instance of each.
// wrappers/lit/elements.js sits outside fire/ (fire/ loads nothing from outside itself), so there they are ../../fire/js/<name>.js.
const fireModulesExternal = (prefix) => ({
  name: 'fire-modules-external',
  setup(build) {
    build.onResolve({ filter: /\/fire\/js\/[\w-]+\.js$/ }, (args) => ({ path: `${prefix}${path.basename(args.path)}`, external: true }));
  },
});

// wrappers/lit/elements.js leaves every Lit package to the app: the source imports lit and lit's own subpaths.
const LIT_PACKAGES = ['lit', 'lit-html', 'lit-element', '@lit/reactive-element'].flatMap((p) => [p, `${p}/*`]);

async function buildBundle({ peerLit = false } = {}) {
  const outfile = peerLit ? 'wrappers/lit/elements.js' : 'fire/elements.js';
  const lit = peerLit
    ? `Imports Lit from the app (import 'lit'): an app that has Lit 3 loads one copy of it. A page with no build step loads
 * fire/elements.js, which bundles Lit.`
    : `Bundles Lit ${LIT_VERSION} (https://lit.dev), Copyright Google LLC, BSD-3-Clause: see fire/LICENSE-lit.txt.`;
  const result = await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: ['elements/src/index.ts'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    minify: false,
    write: false,
    outfile,
    tsconfig: TSCONFIG,
    charset: 'utf8',
    legalComments: 'eof',
    // Paths in the output's comments stay node_modules/…, also where node_modules is a link (a git worktree's).
    preserveSymlinks: true,
    plugins: [fireModulesExternal(peerLit ? '../../fire/js/' : './js/')],
    external: peerLit ? LIT_PACKAGES : [],
    banner: {
      js: `/* Fire custom elements: fd-icon, fd-chart, fd-code, fd-texture. BUILT by scripts/build-elements.mjs from elements/src
 * (TypeScript, Lit): edit the source and rebuild, never this file. Fire's modules are imported from ${peerLit ? '../../fire/js/' : './js/'} and shared
 * with fire/fire.js. ${lit} */`,
    },
  });
  return result.outputFiles[0].text;
}

/* ---------- fire/elements.d.ts ---------- */
// What Fire's elements inherit from Lit, declared here because Lit is bundled into elements.js and is not a
// dependency of a product that imports fire-design/elements.
const LIT_SHIM = `/** The part of Lit's ReactiveElement that Fire's elements expose (Lit is bundled into elements.js). */
declare abstract class LitElement extends HTMLElement {
  /** Resolves (to true) once the element has rendered the latest property changes. */
  readonly updateComplete: Promise<boolean>;
  /** Schedule a render, for example after mutating an object held in a property. */
  requestUpdate(name?: PropertyKey, oldValue?: unknown): void;
  connectedCallback(): void;
  disconnectedCallback(): void;
  attributeChangedCallback(name: string, old: string | null, value: string | null): void;
}`;
const DTS_ORDER = ['fire-element', 'icon', 'chart', 'code', 'texture'];

function buildDeclarations() {
  const config = ts.getParsedCommandLineOfConfigFile(TSCONFIG, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (d) => { throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n')); } });
  const files = new Map();
  const program = ts.createProgram(config.fileNames, { ...config.options, noEmit: false, outDir: '/dts' });
  const emit = program.emit(undefined, (name, text) => { files.set(path.basename(name, '.d.ts'), text); }, undefined, true);
  const problems = [...ts.getPreEmitDiagnostics(program), ...emit.diagnostics];
  if (problems.length) {
    throw new Error(ts.formatDiagnostics(problems, { getCanonicalFileName: (f) => f, getCurrentDirectory: () => ROOT, getNewLine: () => '\n' }));
  }
  const types = new Set();
  const bodies = DTS_ORDER.map((name) => {
    const text = files.get(name);
    if (text == null) throw new Error(`no declarations emitted for elements/src/${name}.ts`);
    return text.replace(/^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)';\n/gm, (line, _type, names, from) => {
      if (from === '../../fire/fire.js') names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => types.add(n));
      else if (from === 'lit' && names.trim() === 'LitElement') { /* the shim below */ }
      else if (!from.startsWith('./')) throw new Error(`elements/src/${name}.ts: a public declaration imports from ${from}`);
      return '';
    }).trim();
  });
  const head = `/* Types of fire/elements.js (import 'fire-design/elements') and of wrappers/lit/elements.js, the same elements on the app's
 * own Lit (import 'fire-design/elements/lit'). BUILT by scripts/build-elements.mjs from elements/src:
 * edit the source and rebuild, never this file. Data and event types come from fire.d.ts. */
import type { ${[...types].sort().join(', ')} } from './fire.js';

${LIT_SHIM}`;
  return `${[head, ...bodies].join('\n\n')}\n`;
}

/* ---------- contract/custom-elements.json ---------- */
function buildManifest() {
  // The analyzer's API, as `cem analyze --litelement` runs it, without its CLI's habit of writing package.json.
  // fire.ts (typed module imports) and json.ts (the data converter) are internal: not in the manifest.
  const names = readdirSync(SRC).filter((f) => f.endsWith('.ts') && !['fire.ts', 'json.ts'].includes(f)).sort();
  const modules = names.map((f) => {
    const rel = `elements/src/${f}`;
    // The analyzer walks the tree with its own TypeScript (5.4), so the source files must come from that one.
    return cemTs.createSourceFile(rel, readFileSync(path.join(ROOT, rel), 'utf8'), cemTs.ScriptTarget.ES2015, true);
  });
  const manifest = create({ modules, plugins: litPlugin(), context: { dev: false } });
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/* ---------- run ---------- */
const check = process.argv.includes('--check');
const outputs = {
  'fire/elements.js': await buildBundle(),
  'wrappers/lit/elements.js': await buildBundle({ peerLit: true }),
  'fire/elements.d.ts': buildDeclarations(),
  'contract/custom-elements.json': buildManifest(),
};

if (check) {
  const dir = mkdtempSync(path.join(tmpdir(), 'fire-elements-'));
  let stale = 0;
  try {
    for (const file of OUTPUTS) {
      const fresh = path.join(dir, file);
      mkdirSync(path.dirname(fresh), { recursive: true });
      writeFileSync(fresh, outputs[file]);
      const committed = path.join(ROOT, file);
      if (!existsSync(committed) || readFileSync(committed, 'utf8') !== readFileSync(fresh, 'utf8')) {
        console.error(`stale: ${file} (run node scripts/build-elements.mjs)`);
        stale += 1;
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (stale) process.exit(1);
  console.log(`elements: ${OUTPUTS.length} outputs up to date`);
} else {
  const kb = (file) => `${(Buffer.byteLength(outputs[file]) / 1024).toFixed(1)} KB`;
  for (const file of OUTPUTS) {
    mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
    writeFileSync(path.join(ROOT, file), outputs[file]);
  }
  console.log(`elements: wrote ${OUTPUTS.join(', ')} (elements.js ${kb('fire/elements.js')}, the Lit entry ${kb('wrappers/lit/elements.js')})`);
}
