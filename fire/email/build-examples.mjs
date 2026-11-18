#!/usr/bin/env node
// Writes the rendered examples the docs page frames: docs/assets/email/<name>.html and <name>.txt.
//   node fire/email/build-examples.mjs           write them
//   node fire/email/build-examples.mjs --check   exit 1 when a file differs from a fresh render (scripts/test/email.test.mjs runs this)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderEmail } from './email.js';
import { THEMES, signIn } from './examples.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/assets/email');
export function examples() {
  const files = {};
  for (const [name, theme] of Object.entries(THEMES)) {
    const { html, text } = renderEmail({ theme, ...signIn() });
    files[`signin-${name}.html`] = html;
    files[`signin-${name}.txt`] = text;
  }
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  let stale = 0;
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, body] of Object.entries(examples())) {
    const file = path.join(OUT, name);
    if (check) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== body) { console.error(`stale: docs/assets/email/${name}`); stale++; } } else fs.writeFileSync(file, body);
  }
  process.exit(stale ? 1 : 0);
}
