// Lints the starter's Fire markup against Fire's catalogue (`npm run lint:markup`): Fire's lint-markup over src, or
// over the paths given. With --css (`npm run lint:css`) it lints the starter's own CSS and tokens against Fire's token
// contract instead: Fire's lint-css over src and index.html, or over the paths given after --css.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const fire = path.dirname(createRequire(import.meta.url).resolve('fire-design/package.json'));
const css = process.argv[2] === '--css';
const paths = process.argv.slice(css ? 3 : 2);
const run = spawnSync(process.execPath, [path.join(fire, css ? 'scripts/lint-css.mjs' : 'scripts/lint-markup.mjs'), ...(paths.length ? paths : css ? ['src', 'index.html'] : ['src'])], { stdio: 'inherit' });
process.exit(run.status ?? 1);
