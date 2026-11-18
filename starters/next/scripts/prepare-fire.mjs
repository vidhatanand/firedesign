// Runs before `next dev`, `next build` and the check (npm's predev / prebuild):
//   1. copies Fire's boot.js to public/fire/boot.js, served as a blocking <script src> in <head> (spec N2);
//   2. turns the look (contract/looks/<FIRE_LOOK>.json, default ocean) into app/fire-theme.css with themeToCss, and
//      its <html> attributes into app/fire-look.ts (spec H1, H4). No <style> element at run time: a strict CSP blocks it.
// FIRE_LOOK=ember is what the check uses, so the screens compare against Fire's templates on the same palette.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(HERE, 'package.json'));
const fire = path.dirname(require.resolve('fire-design/package.json'));
const { themeToCss, expandTheme, validateTheme } = await import(pathToFileURL(path.join(fire, 'fire/js/theme.js')).href);

mkdirSync(path.join(HERE, 'public/fire'), { recursive: true });
for (const file of ['boot.js', 'favicon.svg']) copyFileSync(path.join(fire, 'fire', file), path.join(HERE, 'public/fire', file));

const look = process.env.FIRE_LOOK || 'ocean';
const record = JSON.parse(readFileSync(path.join(fire, `contract/looks/${look}.json`), 'utf8'));
const valid = validateTheme(record);
if (!valid.ok) throw new Error(`contract/looks/${look}.json: ${valid.errors.join('; ')}`);
const { attributes, notes } = expandTheme(record);
writeFileSync(path.join(HERE, 'app/fire-theme.css'), themeToCss(record));
writeFileSync(path.join(HERE, 'app/fire-look.ts'),
  `// Written by scripts/prepare-fire.mjs from contract/looks/${look}.json: the look's attributes for <html>.\n`
  + `export const look = ${JSON.stringify(look)};\n`
  + `export const theme = ${JSON.stringify(attributes, null, 2)} as const;\n`);
console.log(`fire: boot.js copied; look ${look} (${Object.entries(attributes).map(([k, v]) => `${k}="${v}"`).join(' ')})${notes.length ? `; ${notes.join('; ')}` : ''}`);
