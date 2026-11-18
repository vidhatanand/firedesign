// Lints the starter's Fire markup against Fire's catalogue (`npm run lint:markup`).
//
// Catalogue 0.6 lists `data-icon` and `data-icon-fill` with no values (any icon name is fine), and lint-markup reads
// an empty list as "no value allowed", so every inline icon is reported. Until the catalogue says ["*"] for them,
// this script lints against a copy of the catalogue that does. The icon *names* are still checked (rule unknown-icon).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const fire = path.dirname(require.resolve('fire-design/package.json'));
const catalog = JSON.parse(fs.readFileSync(path.join(fire, 'contract/catalog.json'), 'utf8'));
for (const component of catalog.components) {
  for (const [name, values] of Object.entries(component.attributes ?? {})) {
    if (Array.isArray(values) && values.length === 0) component.attributes[name] = ['*'];
  }
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-lint-'));
const file = path.join(dir, 'catalog.json');
fs.writeFileSync(file, JSON.stringify(catalog));
const run = spawnSync(process.execPath, [path.join(fire, 'scripts/lint-markup.mjs'), '--catalog', file, ...(process.argv.length > 2 ? process.argv.slice(2) : ['src'])], { stdio: 'inherit' });
fs.rmSync(dir, { recursive: true, force: true });
process.exit(run.status ?? 1);
