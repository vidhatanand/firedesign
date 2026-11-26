#!/usr/bin/env node
// Prints where Fire is, for the Fire skill: the copy the project in the working directory has installed, the copy
// this skill belongs to, and which of the two to read the reference screens, the docs pages and the pictures from.
//   node where.mjs [--json] [--cwd <folder>]
// The project's Fire is the one its pages are built with, so it is read when it has the reference screens (they are
// in the package from 0.13.0). An older or copied Fire has none: then the skill's own Fire is read, and the line says
// that the versions differ.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fs.realpathSync(fileURLToPath(import.meta.url)));

/** What a folder holds, or null when it is not a Fire. */
export function describe(root) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (pkg.name !== 'fire-design') return null;
    const has = (rel) => fs.existsSync(path.join(root, rel));
    return { root, version: pkg.version, screens: has('templates/logs.html'), pictures: has('contract/pictures/template'), tools: has('scripts/find.mjs') };
  } catch { return null; }
}

/** The Fire a project installed: node_modules/fire-design here, in a folder above, or in a folder one or two levels down (a workspace). */
export function projectFire(cwd) {
  const at = (dir) => describe(path.join(dir, 'node_modules', 'fire-design'));
  for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
    const found = at(dir);
    if (found) return found;
    if (dir === path.dirname(dir)) break;
  }
  const below = (dir, depth) => {
    let names = [];
    try { names = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules').map((d) => d.name).sort(); } catch { return null; }
    for (const name of names) { const found = at(path.join(dir, name)); if (found) return found; }
    if (depth > 1) for (const name of names) { const found = below(path.join(dir, name), depth - 1); if (found) return found; }
    return null;
  };
  return below(path.resolve(cwd), 2);
}

export function where(cwd = process.cwd()) {
  const skill = describe(path.resolve(HERE, '..', '..'));
  const self = describe(path.resolve(cwd));   // working inside Fire's own repository
  const project = self || projectFire(cwd);
  const read = project?.screens ? project : (skill?.screens ? skill : project || skill);
  let note = '';
  if (!read) note = 'No Fire found. Install it in the project (the fire-design package), or run this from a Fire checkout.';
  else if (!read.screens) note = `Fire ${read.version} has no reference screens in its package (they ship from 0.13.0). Update Fire, or read them from Fire's repository at the tag v${read.version}.`;
  else if (project && read !== project) note = `The project builds with Fire ${project.version}, which has no reference screens in its package; these are Fire ${read.version}. A part whose card says "since" a later version is not in the project yet. Lint with the project's own Fire.`;
  return { project, skill, read: read?.root || null, note };
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--cwd');
  const result = where(at >= 0 ? args[at + 1] : process.cwd());
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    const row = (label, f) => console.log(`${label.padEnd(10)}${f ? `${f.root}   Fire ${f.version}   reference screens: ${f.screens ? 'yes' : 'no'}   pictures: ${f.pictures ? 'yes' : 'no'}` : 'none'}`);
    row('project', result.project);
    row('skill', result.skill);
    console.log(`${'read from'.padEnd(10)}${result.read || 'nowhere'}`);
    if (result.note) console.log(result.note);
  }
  process.exit(result.read ? 0 : 1);
}
