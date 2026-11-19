#!/usr/bin/env node
// build-classes: writes docs/_ref/CLASSES.md, the complete list of Fire's classes, from contract/catalog.json.
//   node scripts/build-classes.mjs           write the file
//   node scripts/build-classes.mjs --check   fail when the file is stale
// docs/_ref/VOCABULARY.md is written by hand and explains the parts people use most; it cannot keep up with every
// class. This file is generated, so it is always complete: every component with its root, every part class, every
// attribute with its values (on the root, on a part, and set by Fire as state), its events and its custom element.
// Run build-catalog first. Deterministic: the order is the catalogue's families, then component names.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/_ref/CLASSES.md');

const code = (s) => `\`${s}\``;
const values = (list) => {
  const named = list.filter((v) => v !== '');
  if (!named.length) return '';   // presence only
  return `="${named.join('|')}"${list.includes('') ? ' (or bare)' : ''}`;
};
const attrs = (map) => Object.keys(map).sort().map((a) => code(`${a}${values(map[a])}`)).join(', ');

export function render(catalog) {
  const lines = [
    '# Fire: every class',
    '',
    `Generated from \`contract/catalog.json\` by \`node scripts/build-classes.mjs\` (Fire ${catalog.fire}). Do not edit: change the CSS or the`,
    'catalogue and run the build. `VOCABULARY.md` beside this file explains the parts in prose; this file is the complete list.',
    '',
    'For each component: its root class, its part classes, the attributes it reads with their values (on the root, then per',
    'part), the attributes Fire sets as state, its events, and its custom element where it has one. "(or bare)" means the',
    'attribute also works with no value.',
    '',
  ];
  const families = [];
  for (const c of catalog.components) if (!families.includes(c.family)) families.push(c.family);
  let classes = 0;
  for (const family of families) {
    lines.push(`## ${family}`, '');
    const list = catalog.components.filter((c) => c.family === family).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    for (const c of list) {
      classes += c.classes.length;
      lines.push(`### ${c.name} (${code(c.id)}, ${c.kind})`, '');
      lines.push(`- Root: ${code(c.root)}${c.docs ? `, shown at \`${c.docs}\`` : ''}`);
      const parts = c.classes.filter((k) => k !== c.root);
      if (parts.length) lines.push(`- Parts: ${parts.map(code).join(', ')}`);
      if (Object.keys(c.attributes).length) lines.push(`- On the root: ${attrs(c.attributes)}`);
      for (const part of Object.keys(c.partAttributes).sort()) lines.push(`- On ${code(part)}: ${attrs(c.partAttributes[part])}`);
      if (Object.keys(c.stateAttributes).length) lines.push(`- State, set by Fire: ${attrs(c.stateAttributes)}`);
      if (c.events.length) lines.push(`- Events: ${c.events.map(code).join(', ')}`);
      if (c.element) lines.push(`- Element: ${code(`<${typeof c.element === 'string' ? c.element : c.element.tag}>`)}`);
      lines.push('');
    }
  }
  if (catalog.modules?.length) {
    lines.push('## Modules', '', 'Parts with no class of their own: functions a page calls.', '');
    for (const m of catalog.modules) lines.push(`- ${code(m.id)}: ${m.name}${m.docs ? `, shown at \`${m.docs}\`` : ''}`);
    lines.push('');
  }
  lines.push(`${catalog.components.length} components, patterns, layouts and sections; ${classes} classes.`, '');
  return lines.join('\n');
}

export function build({ check = false } = {}) {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/catalog.json'), 'utf8'));
  const text = render(catalog);
  const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (check) {
    if (have !== text) { console.error('build-classes: docs/_ref/CLASSES.md is stale: run node scripts/build-classes.mjs'); return 1; }
    console.log('build-classes: up to date');
    return 0;
  }
  if (have !== text) fs.writeFileSync(OUT, text);
  console.log(`build-classes: docs/_ref/CLASSES.md (${catalog.components.length} components)`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = build({ check: process.argv.includes('--check') });
