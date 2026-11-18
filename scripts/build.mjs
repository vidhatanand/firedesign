#!/usr/bin/env node
// Runs every Fire generator in dependency order. `--check` runs each in check mode and fails if any committed
// output is stale; nothing is written.
//   node scripts/build.mjs            regenerate everything
//   node scripts/build.mjs --check    verify everything is current (CI)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
// Order matters: the catalogue reads the elements' manifest; the Facet export reads the contract and the catalogue.
const steps = [
  ['build-palettes.mjs', check ? ['--check'] : []],
  ['build-elements.mjs', check ? ['--check'] : []],
  ['build-contract.mjs', check ? ['--check'] : []],
  ['build-catalog.mjs', check ? ['--check'] : []],   // strict: every component has a valid card
  ['build-wrappers.mjs', check ? ['--check'] : [], { optional: true }],
  ['build-wrappers-vue.mjs', check ? ['--check'] : [], { optional: true }],
  ['build-facet.mjs', check ? ['--check'] : [], { optional: true }],
];
let failed = 0;
for (const [script, args, opts = {}] of steps) {
  const file = path.join(ROOT, 'scripts', script);
  if (opts.optional) { try { await import('node:fs').then((fs) => fs.accessSync(file)); } catch { continue; } }
  const r = spawnSync(process.execPath, [file, ...args], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  const last = (r.stdout.trim().split('\n').pop() || '').slice(0, 160);
  console.log(`${r.status === 0 ? 'ok  ' : 'FAIL'} ${script}${args.length ? ' ' + args.join(' ') : ''}  ${last}`);
  if (r.status !== 0) { failed++; process.stderr.write(r.stderr.slice(-2000)); }
}
process.exit(failed ? 1 : 0);
