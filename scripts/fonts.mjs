#!/usr/bin/env node
/*
 * fonts: put a catalogue family's files in a product, so the product self-hosts only what it uses.
 *
 *   node scripts/fonts.mjs add "<family>" [--out <dir>]     copy or download the family's Latin woff2 files and its
 *                                                           licence into <dir> (default ./fonts), and declare them in
 *                                                           <dir>/fonts.css (the @font-face and its fallback face)
 *   node scripts/fonts.mjs list [--role display|interface|mono] [--voice <tag>]   the catalogue, filtered
 *   node scripts/fonts.mjs info "<family>"                  one family's entry: roles, voices, weights, metrics, licence
 *
 * The catalogue is contract/fonts.json (about fifty open-licensed families). A family Fire ships (fire/fonts/) is
 * copied from there; any other is downloaded from the npm package named in its entry (Fontsource) at the exact version
 * pinned, and every file is checked against the SHA-256 in the catalogue before it is written. Fire's own fire/fonts/
 * keeps the families of its type sets only; the rest are fetched when a product asks.
 *
 * <dir>/fonts.css is written between markers per family, so `add` is idempotent and can be run for each family a
 * product uses. Import it after fire.css. The theme record then names the family:  "type": { "sans": "Inter" }.
 * Set FIRE_FONTS_CDN to read the npm files from another place (a mirror, or a local server in a test); it holds the
 * layout of jsDelivr's npm endpoint: <base>/<package>@<version>/files/<file> and <base>/<package>@<version>/LICENSE.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CDN = (process.env.FIRE_FONTS_CDN || 'https://cdn.jsdelivr.net/npm').replace(/\/$/, '');
const catalogue = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/fonts.json'), 'utf8'));
const UNICODE = catalogue.subsets.latin.unicodeRange;

const fail = (msg) => { console.error(`fonts: ${msg}`); process.exit(1); };
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export function findFamily(name) {
  const n = norm(name);
  return catalogue.families.find((f) => norm(f.name) === n || f.slug === name.toLowerCase());
}
const suggest = (name) => {
  const n = norm(name);
  const near = catalogue.families.filter((f) => norm(f.name).includes(n) || n.includes(norm(f.name))).map((f) => f.name);
  return near.length ? ` Did you mean ${near.join(', ')}?` : ' Run `node scripts/fonts.mjs list` for the catalogue.';
};

/** The @font-face block `add` writes for a family: its files, then its metric-matched fallback face. */
export function faceBlock(f) {
  const lines = [`/* fire-font: ${f.name} (${f.licence}) */`];
  for (const file of f.files) {
    lines.push(`@font-face { font-family: "${f.name}"; font-style: normal; font-display: swap; font-weight: ${file.weight}; src: url("./${file.file}") format("${file.variable ? 'woff2-variations' : 'woff2'}"); unicode-range: ${UNICODE}; }`);
  }
  if (!f.core) {
    const k = f.fallback;
    lines.push(`@font-face { font-family: "${f.name} Fallback"; src: local("${k.local}"); size-adjust: ${k.sizeAdjust}%; ascent-override: ${k.ascentOverride}%; descent-override: ${k.descentOverride}%; line-gap-override: ${k.lineGapOverride}%; }`);
  }
  lines.push(`/* /fire-font: ${f.name} */`);
  return lines.join('\n');
}

const HEADER = '/* Self-hosted font faces, written by `node scripts/fonts.mjs add "<family>"` (Fire). Each family sits between its own\n   markers; add a family by running the command again. Import this file after fire.css. */\n';

async function fetchBuf(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Copy or download one family into `out`. Returns { files, licence, css }. */
export async function addFamily(f, out) {
  fs.mkdirSync(path.join(out, 'licenses'), { recursive: true });
  const written = [];
  for (const file of f.files) {
    const shipped = path.join(ROOT, 'fire/fonts', file.file);
    let buf;
    let from;
    if (fs.existsSync(shipped)) { buf = fs.readFileSync(shipped); from = 'copied from fire/fonts/'; }
    else { from = `downloaded from ${f.source.npm}@${f.source.version}`; buf = await fetchBuf(`${CDN}/${f.source.npm}@${f.source.version}/files/${file.file}`); }
    if (sha(buf) !== file.sha256) throw new Error(`${file.file}: the checksum does not match contract/fonts.json (a changed or corrupted file); nothing written for it`);
    fs.writeFileSync(path.join(out, file.file), buf);
    written.push({ file: file.file, from, bytes: buf.length });
  }
  const own = path.join(ROOT, 'fire/fonts/licenses', `${f.slug}.txt`);
  const geist = path.join(ROOT, 'fire/fonts/LICENSE-geist.txt');
  const licence = path.join(out, 'licenses', `${f.slug}.txt`);
  if (fs.existsSync(own)) fs.copyFileSync(own, licence);
  else if (f.core && fs.existsSync(geist)) fs.copyFileSync(geist, licence);
  else fs.writeFileSync(licence, await fetchBuf(`${CDN}/${f.source.npm}@${f.source.version}/LICENSE`));
  // fonts.css: replace this family's block, or append it.
  const cssPath = path.join(out, 'fonts.css');
  let css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : HEADER;
  const block = faceBlock(f);
  const re = new RegExp(`/\\* fire-font: ${f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(.*?\\*/[\\s\\S]*?/\\* /fire-font: ${f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\*/`);
  css = re.test(css) ? css.replace(re, () => block) : `${css.replace(/\n*$/, '\n')}\n${block}\n`;
  fs.writeFileSync(cssPath, css);
  return { files: written, licence, css: cssPath };
}

function parse(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); args[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; } else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parse(process.argv.slice(2));
  const [cmd, ...rest] = args._;
  if (cmd === 'add') {
    if (!rest.length) fail('usage: node scripts/fonts.mjs add "<family>" [--out <dir>]');
    const out = path.resolve(typeof args.out === 'string' ? args.out : 'fonts');
    for (const name of rest) {
      const f = findFamily(name);
      if (!f) fail(`"${name}" is not in the catalogue (contract/fonts.json).${suggest(name)}`);
      const r = await addFamily(f, out).catch((e) => fail(e.message));
      console.log(`${f.name} (${f.licence}${f.shipped ? ', one of Fire\'s own families' : ''}): ${r.files.map((x) => `${x.file} ${(x.bytes / 1024).toFixed(1)} KB ${x.from}`).join('; ')}`);
      console.log(`  licence: ${path.relative(process.cwd(), r.licence)}   faces: ${path.relative(process.cwd(), r.css)}`);
      const slot = f.roles.includes('interface') && !f.roles.includes('mono') ? 'sans' : f.roles.includes('mono') ? 'mono' : 'display';
      console.log(`  theme record:  "type": { "${slot}": "${f.name}" }`);
    }
  } else if (cmd === 'list') {
    const rows = catalogue.families.filter((f) => (!args.role || f.roles.includes(args.role)) && (!args.voice || f.voices.includes(args.voice)));
    if (!rows.length) fail('no family matches');
    for (const f of rows) console.log(`${f.name.padEnd(22)} ${f.roles.join('/').padEnd(24)} ${f.voices.join(', ').padEnd(34)} x ${f.metrics.xHeightRatio}  ${f.variable ? `${f.weightRange[0]}-${f.weightRange[1]}` : f.weights.join('/')}${f.displayOnly ? '  display-only' : ''}${f.shipped ? '  (shipped)' : ''}`);
  } else if (cmd === 'info') {
    const f = rest[0] && findFamily(rest[0]);
    if (!f) fail(`"${rest[0] ?? ''}" is not in the catalogue.${suggest(rest[0] ?? '')}`);
    const { files, source, ...short } = f;
    console.log(JSON.stringify({ ...short, files: files.map((x) => x.file), source }, null, 2));
  } else {
    fail('commands: add "<family>" [--out <dir>] · list [--role r] [--voice v] · info "<family>"');
  }
}
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) main();
