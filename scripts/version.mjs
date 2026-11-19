#!/usr/bin/env node
// version: one command that writes Fire's version everywhere it is stated, and a check that nothing is left behind.
//   node scripts/version.mjs 0.8.2     set the version (then run node scripts/build.mjs to regenerate what depends on it)
//   node scripts/version.mjs --check   fail when any place disagrees with package.json
// The places: package.json and package-lock.json; FIRE_VERSION in fire/js/theme.js; the "fire" field of the eight named
// looks and of spec/export-map.json; the tag in every `firedesign#v…` dependency example (GUIDE.md, docs/frameworks.html,
// spec/ARCHITECTURE.md, the starters' READMEs, starters/next/next.config.ts); the three starters' own version in their
// package.json and package-lock.json; and the minor version in the docs sidebar (docs/docs.js).
// A release also needs its CHANGELOG.md entry, which is written by hand: --check requires a heading for the version.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const STARTERS = ['starters/lit-vite', 'starters/next', 'starters/vue-vite'];
const LOOKS = fs.readdirSync(path.join(ROOT, 'contract/looks/named')).filter((f) => f.endsWith('.json')).map((f) => `contract/looks/named/${f}`);
const V = String.raw`\d+\.\d+\.\d+`;

// Each place: the file, a pattern with the version in group 2 (group 1 before it, group 3 after), and how many to expect at least.
const lockRoot = new RegExp(`^(\\{\\s*"name": "[^"]+",\\s*"version": ")(${V})(")`);
const lockSelf = new RegExp(`("packages": \\{\\s*"": \\{\\s*"name": "[^"]+",\\s*"version": ")(${V})(")`);
const PLACES = [
  ['package.json', new RegExp(`("version": ")(${V})(")`)],
  ['package-lock.json', lockRoot], ['package-lock.json', lockSelf],
  ['fire/js/theme.js', new RegExp(`(export const FIRE_VERSION = ')(${V})(')`)],
  ['spec/export-map.json', new RegExp(`("fire": ")(${V})(")`)],
  ...LOOKS.map((f) => [f, new RegExp(`("fire": ")(${V})(")`)]),
  ...['GUIDE.md', 'docs/frameworks.html', 'spec/ARCHITECTURE.md', 'starters/next/next.config.ts', ...STARTERS.map((s) => `${s}/README.md`)]
    .map((f) => [f, new RegExp(`(firedesign#v)(${V})()`, 'g')]),
  ...STARTERS.flatMap((s) => [[`${s}/package.json`, new RegExp(`("version": ")(${V})(")`)], [`${s}/package-lock.json`, lockRoot], [`${s}/package-lock.json`, lockSelf]]),
];
const MINOR = ['docs/docs.js', /(Fire <small>)(\d+\.\d+)(<\/small>)/];

export function check() {
  const version = JSON.parse(read('package.json')).version;
  const problems = [];
  for (const [file, re] of PLACES) {
    const found = [...read(file).matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))];
    if (!found.length) problems.push(`${file}: no version found (${re.source.slice(0, 40)}…)`);
    for (const m of found) if (m[2] !== version) problems.push(`${file}: says ${m[2]}, package.json says ${version}`);
  }
  const minor = read(MINOR[0]).match(MINOR[1]);
  if (!minor || minor[2] !== version.split('.').slice(0, 2).join('.')) problems.push(`${MINOR[0]}: the sidebar says ${minor?.[2]}, expected ${version.split('.').slice(0, 2).join('.')}`);
  if (!new RegExp(`^## ${version.replaceAll('.', '\\.')} `, 'm').test(read('CHANGELOG.md'))) problems.push(`CHANGELOG.md: no "## ${version}" entry`);
  return { version, problems };
}

export function set(version) {
  if (!new RegExp(`^${V}$`).test(version)) throw new Error(`not a version: ${version}`);
  const texts = new Map();
  for (const [file, re] of PLACES) {
    const text = texts.get(file) ?? read(file);
    texts.set(file, text.replace(re, (_, a, __, c) => `${a}${version}${c}`));
  }
  texts.set(MINOR[0], (texts.get(MINOR[0]) ?? read(MINOR[0])).replace(MINOR[1], (_, a, __, c) => `${a}${version.split('.').slice(0, 2).join('.')}${c}`));
  for (const [file, text] of texts) fs.writeFileSync(path.join(ROOT, file), text);
  return [...texts.keys()];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (!arg || arg === '--help') {
    console.log('usage: node scripts/version.mjs <x.y.z> | --check');
  } else if (arg === '--check') {
    const { version, problems } = check();
    if (problems.length) { for (const p of problems) console.error(`version: ${p}`); process.exitCode = 1; } else console.log(`version: ${version} everywhere (${PLACES.length + 1} places and the changelog)`);
  } else {
    const files = set(arg);
    console.log(`version: ${arg} written to ${files.length} files. Add the "## ${arg}" entry to CHANGELOG.md, then run node scripts/build.mjs.`);
  }
}
