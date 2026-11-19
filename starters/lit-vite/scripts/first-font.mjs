// The one font file the first paint needs: the theme's interface face, regular weight, Latin. Read from what
// `fire slim` reports (slim.json names the theme and the fonts it kept; its fire.css has the @font-face rules).
// vite.config.ts preloads it. Returns the file's name in Fire's fonts/, or undefined.
import fs from 'node:fs';
import path from 'node:path';
import { getTypeface } from 'fire-design/fire/js/typefaces.js';

export function firstPaintFont(slimDir) {
  const report = JSON.parse(fs.readFileSync(path.join(slimDir, 'slim.json'), 'utf8'));
  const record = report.theme ? JSON.parse(fs.readFileSync(report.theme, 'utf8')) : {};
  const family = typeof record.type === 'object' ? record.type.sans ?? 'Geist' : getTypeface(record.type ?? 'geist').sans;
  for (const [face] of fs.readFileSync(path.join(slimDir, 'fire.css'), 'utf8').matchAll(/@font-face\s*\{[^}]*\}/g)) {
    if (!face.includes(`font-family: "${family}"`) || !/unicode-range:\s*U\+0000-00FF/.test(face)) continue;
    const [lo, hi = lo] = (/font-weight:\s*(\d+)(?:\s+(\d+))?/.exec(face) ?? []).slice(1).filter(Boolean).map(Number);
    const file = /url\("[^"]*?([^/"]+\.woff2)"\)/.exec(face)?.[1];
    if (file && lo <= 400 && 400 <= hi && report.kept.fonts.includes(file)) return file;
  }
  return undefined;
}
