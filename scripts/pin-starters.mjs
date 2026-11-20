#!/usr/bin/env node
// pin-starters: each starter depends on the Fire release it ships in, "github:vidhatanand/firedesign#v<version>", locked
// in its package-lock.json as an installed package, so `npm ci` in a starter works outside Fire's repository (a copied
// starter, an exporter's proof).
//
//   node scripts/pin-starters.mjs <commit>   lock every starter to <commit>, the full id of a pushed commit whose
//                                            package.json has this version (the release commit). A lockfile cannot name
//                                            the commit that holds it: commit the lockfiles after the release commit
//                                            and tag that one. npm resolves the tag to a commit with the same files.
//   node scripts/pin-starters.mjs --check    fail when a starter is not pinned and locked to this version
//
// $NPM names another npm to write the lockfiles with (the starters' locks are written by npm 11).
//
// In Fire's repository, `npm install --no-save ../..` in a starter tries it against the working copy instead; neither
// package.json nor the lockfile changes.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = 'vidhatanand/firedesign';
export const STARTERS = ['starters/lit-vite', 'starters/next', 'starters/vue-vite'];
const json = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
export const spec = (version) => `github:${REPO}#v${version}`;
const RESOLVED = new RegExp(`^git\\+ssh://git@github\\.com/${REPO.replace('/', '\\/')}\\.git#[0-9a-f]{40}$`);

export function check() {
  const version = json('package.json').version;
  const want = spec(version);
  const problems = [];
  for (const s of STARTERS) {
    const dependency = json(`${s}/package.json`).dependencies?.['fire-design'];
    const lock = json(`${s}/package-lock.json`);
    const locked = lock.packages?.['']?.dependencies?.['fire-design'];
    const installed = lock.packages?.['node_modules/fire-design'];
    if (dependency !== want) problems.push(`${s}/package.json: fire-design is ${JSON.stringify(dependency)}, expected "${want}"`);
    if (locked !== want) problems.push(`${s}/package-lock.json: the root depends on fire-design ${JSON.stringify(locked)}, expected "${want}"`);
    if (installed?.version !== version || installed.link || !RESOLVED.test(installed.resolved ?? '')) {
      problems.push(`${s}/package-lock.json: fire-design is not locked to a ${REPO} commit of ${version}: ${JSON.stringify(installed)}`);
    }
  }
  return { version, problems };
}

export function pin(commit) {
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('give the full 40-character id of the pushed release commit');
  const { version } = json('package.json');
  const at = `github:${REPO}#${commit}`;
  for (const s of STARTERS) {
    const cwd = path.join(ROOT, s);
    const manifest = path.join(cwd, 'package.json');
    const written = fs.readFileSync(manifest, 'utf8');
    const r = spawnSync(process.env.NPM || 'npm', ['install', '--package-lock-only', '--save-exact', '--ignore-scripts', '--no-audit', '--no-fund', `fire-design@${at}`],
      { cwd, stdio: 'inherit' });
    if (r.status) throw new Error(`npm install failed in ${s}`);
    // npm rewrites package.json in its own layout: keep the file as written, with only the dependency changed. The
    // commit resolved the dependency; the release's tag names it, in package.json and in the lockfile.
    fs.writeFileSync(manifest, written.replace(/("fire-design":\s*)"[^"]*"/, `$1"${spec(version)}"`));
    const lock = path.join(cwd, 'package-lock.json');
    fs.writeFileSync(lock, fs.readFileSync(lock, 'utf8').replaceAll(`"${at}"`, `"${spec(version)}"`));
  }
  return check();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (!arg || arg === '--help') {
    console.log('usage: node scripts/pin-starters.mjs <commit> | --check');
    process.exit(0);
  }
  try {
    const { version, problems } = arg === '--check' ? check() : pin(arg);
    if (problems.length) { for (const p of problems) console.error(`pin-starters: ${p}`); process.exitCode = 1; }
    else console.log(`pin-starters: the ${STARTERS.length} starters are locked to Fire ${version}`);
  } catch (error) { console.error(`pin-starters: ${error.message}`); process.exitCode = 2; }
}
