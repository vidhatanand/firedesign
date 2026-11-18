// Lints the starter's Fire markup against Fire's catalogue (`npm run lint:markup`): Fire's lint-markup over src, or
// over the paths given.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const fire = path.dirname(createRequire(import.meta.url).resolve('fire-design/package.json'));
const run = spawnSync(process.execPath, [path.join(fire, 'scripts/lint-markup.mjs'), ...(process.argv.length > 2 ? process.argv.slice(2) : ['src'])], { stdio: 'inherit' });
process.exit(run.status ?? 1);
