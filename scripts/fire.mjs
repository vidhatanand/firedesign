#!/usr/bin/env node
// fire <command> [args]: one entry point for Fire's agent tools. Proposed as package.json "bin": { "fire": "scripts/fire.mjs" }.
//   fire find "<what you need>" [options]   search the parts by what they are for (scripts/find.mjs)
//   fire lint <files>                       markup lint (scripts/lint-markup.mjs)
//   fire render-equal <args>                compare renders (scripts/render-equal.mjs)
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COMMANDS = { find: 'find.mjs', lint: 'lint-markup.mjs', 'render-equal': 'render-equal.mjs' };
const [cmd, ...rest] = process.argv.slice(2);
if (!COMMANDS[cmd]) {
  console.error(`usage: fire <${Object.keys(COMMANDS).join('|')}> [args]`);
  process.exit(cmd && cmd !== '--help' && cmd !== '-h' ? 2 : 0);
}
const r = spawnSync(process.execPath, [path.join(HERE, COMMANDS[cmd]), ...rest], { stdio: 'inherit' });
process.exit(r.status ?? 1);
