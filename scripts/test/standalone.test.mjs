// node --test scripts/test/standalone.test.mjs
// Two facts a tool that adapts Fire relies on, held here so they stay true:
//  1. The folder fire/ is a complete install: no stylesheet or module in it loads a file from outside it.
//  2. contract/fire-contract.json names Fire's default look, and that file is the default theme record.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_RECORD, FIRE_VERSION, validateTheme } from '../../fire/js/theme.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIRE = path.join(ROOT, 'fire');

// Files a product completes itself and Fire never loads: the template for a licensed font names files Fire does not ship.
const TEMPLATES = new Set(['fire/fonts/suisse.css']);

function files(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) files(p, out); else out.push(p);
  }
  return out;
}
// What a file loads: static and dynamic imports and re-exports in a module; @import and url() in a stylesheet.
function loads(file) {
  const text = fs.readFileSync(file, 'utf8');
  const found = [];
  const patterns = file.endsWith('.css')
    ? [/@import\s+(?:url\(\s*)?["']([^"']+)["']/g, /url\(\s*["']?([^"')\s]+)["']?\s*\)/g]
    : [/^\s*(?:import|export)\b[^'"\n;]*?\bfrom\s*["']([^"']+)["']/gm, /^\s*import\s*["']([^"']+)["']/gm, /\bimport\(\s*["']([^"']+)["']\s*\)/g];
  for (const re of patterns) for (const m of text.matchAll(re)) found.push(m[1]);
  return found;
}

test('fire/ is a complete install: nothing in it loads a file outside the folder', () => {
  const all = files(FIRE).filter((f) => /\.(css|js|mjs)$/.test(f));
  assert.ok(all.length > 40, 'the stylesheets and modules were found');
  const outside = [];
  let relative = 0;
  for (const file of all) {
    for (const target of loads(file)) {
      if (target.startsWith('node:')) continue;   // a script that runs in Node (the email examples), not part of what a page loads
      if (/^(data:|https?:|#|%23|about:|blob:)/.test(target)) { if (/^https?:/.test(target)) outside.push(`${path.relative(ROOT, file)} loads ${target}`); continue; }
      if (!target.startsWith('.') && !target.startsWith('/')) { outside.push(`${path.relative(ROOT, file)} imports the package ${target}`); continue; }
      relative++;
      const resolved = path.resolve(path.dirname(file), target.split(/[?#]/)[0]);
      if (!resolved.startsWith(FIRE + path.sep)) outside.push(`${path.relative(ROOT, file)} loads ${target}`);
      else if (!fs.existsSync(resolved) && !TEMPLATES.has(path.relative(ROOT, file))) outside.push(`${path.relative(ROOT, file)} loads ${target}, which does not exist`);
    }
  }
  assert.ok(relative > 100, 'the loads were read');
  assert.deepEqual(outside, []);
});

test('the token contract names the default look, and it is the default theme record', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/fire-contract.json'), 'utf8'));
  assert.match(contract.defaultLook, /^contract\/looks\/[a-z]+\.json$/);
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, contract.defaultLook), 'utf8'));
  assert.equal(record.fire, FIRE_VERSION);
  const { fire, ...rest } = record;
  assert.deepEqual(rest, JSON.parse(JSON.stringify(DEFAULT_RECORD)));
  assert.equal(validateTheme(record).ok, true);
});
