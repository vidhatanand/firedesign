// Builds Fire's custom elements from elements/src (Lit + TypeScript):
//   fire/elements.js             ES module, Lit bundled in, not minified; Fire's modules stay external (./js/*.js)
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
const OUTPUTS = ['fire/elements.js', 'fire/elements.d.ts', 'contract/custom-elements.json'];
const LIT_VERSION = JSON.parse(readFileSync(path.join(ROOT, 'node_modules/lit/package.json'), 'utf8')).version;

/* ---------- fire/elements.js ---------- */
// Fire's modules are imported from elements/src as ../../fire/js/<name>.js; in fire/elements.js they become ./js/<name>.js,
// the same URL fire/fire.js imports, so the browser runs one instance of each.
const fireModulesExternal = {
  name: 'fire-modules-external',
  setup(build) {
    build.onResolve({ filter: /\/fire\/js\/[\w-]+\.js$/ }, (args) => ({ path: `./js/${path.basename(args.path)}`, external: true }));
  },
};

async function buildBundle() {
  const result = await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: ['elements/src/index.ts'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    minify: false,
    write: false,
    outfile: 'fire/elements.js',
    tsconfig: TSCONFIG,
    charset: 'utf8',
    legalComments: 'eof',
    plugins: [fireModulesExternal],
    banner: {
      js: `/* Fire custom elements: fd-icon, fd-chart, fd-code, fd-texture. BUILT by scripts/build-elements.mjs from elements/src
 * (TypeScript, Lit): edit the source and rebuild, never this file. Fire's modules are imported from ./js/ and shared
 * with fire/fire.js. Bundles Lit ${LIT_VERSION} (https://lit.dev), Copyright Google LLC, BSD-3-Clause: see fire/LICENSE-lit.txt. */`,
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
  const head = `/* Types of fire/elements.js (import 'fire-design/elements'). BUILT by scripts/build-elements.mjs from elements/src:
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
  for (const file of OUTPUTS) {
    mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
    writeFileSync(path.join(ROOT, file), outputs[file]);
  }
  console.log(`elements: wrote ${OUTPUTS.join(', ')} (elements.js ${(Buffer.byteLength(outputs['fire/elements.js']) / 1024).toFixed(1)} KB)`);
}
