#!/usr/bin/env node
// Turns a theme record (contract/looks/<name>.json in Fire) into what the app loads (EXPORT H1 to H3):
//   src/fire-theme.css    the look's tokens as a stylesheet (themeToCss), imported after fire.css in main.ts
//   src/fire-theme.json   the attributes for <html> (data-palette, data-density, …), which vite.config puts on <html>
//   public/fire/boot.js   Fire's boot script, copied, loaded in <head> by index.html
// Usage: node scripts/build-theme.mjs [look]
//   no argument: the starter's own record, look.json (Fire's forest look with rounder corners and heavier lines)
//   a name:      that record from fire-design/contract/looks (`npm run check` uses `ember`, the palette the templates use)
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const fire = path.dirname(require.resolve('fire-design/package.json'));
const { themeToCss, expandTheme, validateTheme } = await import(pathToFileURL(path.join(fire, 'fire/js/theme.js')).href);

const look = process.argv[2];
const record = JSON.parse(readFileSync(look ? path.join(fire, 'contract/looks', `${look}.json`) : path.join(root, 'look.json'), 'utf8'));
const verdict = validateTheme(record);
if (!verdict.ok) { console.error(`look ${look ?? 'look.json'} is not a valid theme record:\n${verdict.errors.join('\n')}`); process.exit(1); }

writeFileSync(path.join(root, 'src/fire-theme.css'), themeToCss(record, { selector: ':root' }));
writeFileSync(path.join(root, 'src/fire-theme.json'), JSON.stringify(expandTheme(record).attributes, null, 2) + '\n');
mkdirSync(path.join(root, 'public/fire'), { recursive: true });
copyFileSync(path.join(fire, 'fire/boot.js'), path.join(root, 'public/fire/boot.js'));
console.log(`look ${look ?? 'look.json'}: src/fire-theme.css, src/fire-theme.json, public/fire/boot.js`);
