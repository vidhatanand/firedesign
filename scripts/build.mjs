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
// Order matters: the catalogue reads the elements' manifest.
const steps = [
  ['version.mjs', check ? ['--check'] : [], { onlyCheck: true }],   // the version is the same everywhere it is stated, and the changelog has its entry
  ['build-palettes.mjs', check ? ['--check'] : []],
  ['build-typefaces.mjs', check ? ['--check'] : []],   // fire/typefaces.css and fire/js/fonts.js from the specs
  ['build-elements.mjs', check ? ['--check'] : []],
  ['build-contract.mjs', check ? ['--check'] : []],
  ['build-catalog.mjs', check ? ['--check'] : []],   // strict: every component has a valid card
  ['build-index.mjs', check ? ['--check'] : []],     // the search index, from the catalogue
  ['build-skill.mjs', check ? ['--check'] : []],     // skills/fire/screens.md and parts.md: the lists the skill reads whole
  ['propose.mjs', check ? ['forms', '--check'] : ['forms']],   // .github/ISSUE_TEMPLATE, from the proposal's own text
  ['build-classes.mjs', check ? ['--check'] : []],   // docs/_ref/CLASSES.md: every class, from the catalogue
  ['build-slim-map.mjs', check ? ['--check'] : []],  // contract/slim-map.json: what fire slim knows of Fire's sources
  ['build-pictures.mjs', check ? ['--check'] : [], { onlyCheck: true }],   // a picture for every index entry (the render is `npm run build:pictures`)
  ['gate.mjs', check ? ['--check', '--no-look'] : ['--no-look']],   // near-duplicates by structure and job (npm run gate adds the look)
  ['build-wrappers.mjs', check ? ['--check'] : [], { optional: true }],
  ['build-wrappers-vue.mjs', check ? ['--check'] : [], { optional: true }],
];
let failed = 0;
for (const [script, args, opts = {}] of steps) {
  const file = path.join(ROOT, 'scripts', script);
  if (opts.onlyCheck && !check) continue;   // rendering needs a browser and minutes: never part of a plain build
  if (opts.optional) { try { await import('node:fs').then((fs) => fs.accessSync(file)); } catch { continue; } }
  const r = spawnSync(process.execPath, [file, ...args], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  const last = (r.stdout.trim().split('\n').pop() || '').slice(0, 160);
  console.log(`${r.status === 0 ? 'ok  ' : 'FAIL'} ${script}${args.length ? ' ' + args.join(' ') : ''}  ${last}`);
  if (r.status !== 0) { failed++; process.stderr.write(r.stderr.slice(-2000)); }
}
process.exit(failed ? 1 : 0);
