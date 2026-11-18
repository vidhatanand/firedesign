// node --test scripts/test/ : the font catalogue (contract/fonts.json), the type set spec in the theme record, the
// generated fire/typefaces.css and fire/js/fonts.js, and scripts/fonts.mjs.
//   The catalogue: about fifty open-licensed families, every shipped family's files in fire/fonts/ match their checksums,
//     the fallback metrics follow from the measured ones, the roles are consistent with the x-height rule.
//   The spec: validateTheme enforces the pairing rules; expandTheme writes the tokens, attributes and fallback faces;
//     the twelve named sets are valid specs, with the two excused interface x-height rule named.
//   build-typefaces --check: the generated files are current; the CSS carries every named set.
//   fonts.mjs add: copies a shipped family, downloads another (from a local server standing in for the npm CDN, with the
//     checksum checked), and is idempotent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateTheme, expandTheme, themeToCss, INPUT_TOKENS } from '../../fire/js/theme.js';
import {
  TYPEFACES, FONT_FAMILIES, INTERFACE_MIN_XHEIGHT, VOICES, checkTypeSpec, fontStack, fallbackFace, getFamily,
} from '../../fire/js/typefaces.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const catalogue = JSON.parse(read('contract/fonts.json'));
const byName = Object.fromEntries(catalogue.families.map((f) => [f.name, f]));
const node = (...args) => execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

test('catalogue: about fifty open-licensed families, each complete', () => {
  assert.ok(catalogue.families.length >= 48 && catalogue.families.length <= 60, `${catalogue.families.length} families`);
  assert.equal(new Set(catalogue.families.map((f) => f.name)).size, catalogue.families.length);
  assert.equal(new Set(catalogue.families.map((f) => f.slug)).size, catalogue.families.length);
  const voices = Object.keys(catalogue.voices);
  assert.deepEqual(VOICES, voices);
  for (const f of catalogue.families) {
    const ctx = f.name;
    assert.ok(['OFL-1.1', 'Apache-2.0'].includes(f.licence), `${ctx}: licence ${f.licence}`);
    assert.ok(['sans', 'serif', 'mono'].includes(f.stack), ctx);
    assert.ok(f.roles.length && f.roles.every((r) => ['display', 'interface', 'mono'].includes(r)), ctx);
    assert.ok(f.voices.length >= 1 && f.voices.every((v) => voices.includes(v)), `${ctx}: voices`);
    // Metrics measured, ratios consistent with them.
    const m = f.metrics;
    for (const k of ['unitsPerEm', 'ascent', 'descent', 'lineGap', 'xHeight', 'capHeight', 'xWidthAvg']) assert.ok(Number.isFinite(m[k]), `${ctx}: ${k}`);
    assert.ok(m.descent <= 0 && m.ascent > 0 && m.xHeight <= m.capHeight, `${ctx}: metric signs`);
    assert.equal(m.xHeightRatio, Number((m.xHeight / m.unitsPerEm).toFixed(3)), `${ctx}: x-height ratio`);
    // The rule the roles must keep: an interface family has an x-height of at least the minimum, and is not display-only.
    if (f.roles.includes('interface')) { assert.ok(m.xHeightRatio >= INTERFACE_MIN_XHEIGHT, `${ctx}: interface needs x-height ${INTERFACE_MIN_XHEIGHT}`); assert.ok(!f.displayOnly, `${ctx}: display-only and interface`); }
    if (f.stack === 'mono' && !f.displayOnly) assert.ok(f.roles.includes('mono') || f.roles.includes('display'), ctx);
    assert.equal(f.roles.includes('mono'), f.stack === 'mono' && !['Doto', 'Pixelify Sans'].includes(f.name), `${ctx}: the mono role belongs to monospaced faces`);
    // The fallback follows from the measured metrics and the reference font (capsize's formulas).
    const ref = catalogue.fallbackAgainst[f.stack];
    assert.equal(f.fallback.local, ref.local, ctx);
    const size = (m.xWidthAvg / m.unitsPerEm) / (ref.xWidthAvg / ref.unitsPerEm);
    assert.ok(Math.abs(f.fallback.sizeAdjust - size * 100) <= 0.006, `${ctx}: size-adjust ${f.fallback.sizeAdjust} vs ${(size * 100).toFixed(3)}`);
    assert.ok(Math.abs(f.fallback.ascentOverride - (m.ascent / (m.unitsPerEm * size)) * 100) <= 0.006, `${ctx}: ascent-override`);
    assert.ok(Math.abs(f.fallback.descentOverride - (Math.abs(m.descent) / (m.unitsPerEm * size)) * 100) <= 0.006, `${ctx}: descent-override`);
    assert.ok(Math.abs(f.fallback.lineGapOverride - (m.lineGap / (m.unitsPerEm * size)) * 100) <= 0.006, `${ctx}: line-gap-override`);
    // Files: a latin subset each, with a checksum; weights are what the files give.
    assert.ok(f.files.length >= 1);
    for (const file of f.files) assert.match(file.sha256, /^[0-9a-f]{64}$/, `${ctx}: ${file.file}`);
    if (f.variable) { assert.equal(f.files.length, 1); assert.deepEqual(f.weightRange, f.axes.wght); } else assert.deepEqual(f.files.map((x) => Number(x.weight)), f.weights);
  }
  // The roles every voice needs exist in number: headings, interface and mono families.
  for (const role of ['display', 'interface', 'mono']) assert.ok(catalogue.families.filter((f) => f.roles.includes(role)).length >= 8, role);
  for (const v of voices) assert.ok(catalogue.families.some((f) => f.voices.includes(v)), `voice ${v} is used`);
});

test('catalogue: Fire ships exactly the nineteen families its sets use, and their files match the checksums', () => {
  const shipped = catalogue.families.filter((f) => f.shipped);
  assert.equal(shipped.length, 19);
  const used = new Set(TYPEFACES.flatMap((t) => [t.spec.display, t.spec.sans, t.spec.mono]));
  assert.deepEqual([...used].sort(), shipped.map((f) => f.name).sort());
  for (const f of shipped) {
    for (const file of f.files) assert.equal(sha(fs.readFileSync(path.join(ROOT, 'fire/fonts', file.file))), file.sha256, file.file);
    const lic = f.core ? 'fire/fonts/LICENSE-geist.txt' : `fire/fonts/licenses/${f.slug}.txt`;
    assert.ok(fs.existsSync(path.join(ROOT, lic)), `${f.name}: ${lic}`);
  }
  // fire/fonts/ holds no family the catalogue does not mark as shipped.
  const files = new Set(shipped.flatMap((f) => f.files.map((x) => x.file)));
  for (const file of fs.readdirSync(path.join(ROOT, 'fire/fonts')).filter((n) => n.endsWith('.woff2') && !/latin-ext/.test(n))) assert.ok(files.has(file), `${file} is not in the catalogue as shipped`);
});

test('the twelve named sets are valid specs; only Grotesk and Book are excused the interface x-height rule', () => {
  assert.equal(TYPEFACES.length, 12);
  const excused = [];
  for (const t of TYPEFACES) {
    const strict = checkTypeSpec(t.spec, { path: `/${t.name}` });
    const lenient = checkTypeSpec(t.spec, { path: `/${t.name}`, legacy: t.legacy ?? [] });
    assert.deepEqual(lenient.errors, [], t.name);
    if (strict.errors.length) { excused.push(t.name); assert.match(strict.errors[0], /x-height ratio/); }
    assert.equal(t.display, t.spec.display);
  }
  assert.deepEqual(excused, ['grotesk', 'book']);
});

test('validateTheme: the pairing rules, with the field and the reason', () => {
  const type = (spec) => validateTheme({ type: spec });
  assert.ok(type({ display: 'Fraunces', sans: 'Inter', mono: 'JetBrains Mono', displayWeight: 600, displayTracking: -0.02, headingCase: 'upper', figures: 'tabular' }).ok);
  assert.ok(type({ sans: 'Geist Mono' }).ok, 'a mono may be the interface face');
  assert.ok(type({ display: 'Anton' }).ok);
  // An interface family needs an x-height of at least 0.5.
  assert.match(type({ sans: 'Newsreader' }).errors[0], /^\/type\/sans: "Newsreader" has an x-height ratio of 0\.426; an interface face needs at least 0\.5/);
  assert.match(type({ sans: 'Space Grotesk' }).errors[0], /x-height ratio of 0\.486/);
  // A display-only family cannot be the interface face.
  assert.match(type({ sans: 'Bebas Neue' }).errors[0], /^\/type\/sans: "Bebas Neue" is marked display-only/);
  assert.match(type({ sans: 'Syne' }).errors[0], /display-only/);
  // The mono must be a mono.
  assert.match(type({ mono: 'Inter' }).errors[0], /^\/type\/mono: "Inter" is not a mono face/);
  // The heading face must be a heading face (a plain code face is not).
  assert.match(type({ display: 'Source Code Pro' }).errors[0], /^\/type\/display: "Source Code Pro" is not a heading face/);
  // The weight is one the display family has.
  assert.match(type({ display: 'Bebas Neue', displayWeight: 700 }).errors[0], /has only the weights 400, not 700/);
  assert.match(type({ display: 'Syne', displayWeight: 900 }).errors[0], /spans 400 to 800, not 900/);
  assert.ok(type({ display: 'Syne', displayWeight: 800 }).ok);
  assert.ok(type({ display: 'Space Mono', displayWeight: 700 }).ok);
  assert.match(type({ display: 'Syne', displayWeight: 650.5 }).errors[0], /whole number/);
  // Shape.
  assert.equal(type({ sans: 'Inter', fontSize: 3 }).errors[0], '/type/fontSize: unknown field (one of display, sans, mono, displayWeight, displayTracking, headingCase, figures)');
  assert.match(type({ displayWeight: 600 }).errors[0], /name at least one of display, sans, mono/);
  assert.match(type({ sans: 'Inter', displayTracking: 0.5 }).errors[0], /displayTracking: must be a number of em from -0\.1 to 0\.3/);
  assert.match(type({ sans: 'Inter', headingCase: 'title' }).errors[0], /headingCase: must be one of "sentence", "upper"/);
  assert.match(type({ sans: 'Inter', figures: 'old' }).errors[0], /figures: must be one of/);
  assert.match(type({ sans: 'Bad"Font' }).errors[0], /must be a font family name/);
  // Families outside the catalogue are allowed, noted as unchecked; shipped families need no loading note.
  const licensed = type({ display: 'Fraunces', sans: "Suisse Int'l" });
  assert.ok(licensed.ok);
  assert.deepEqual(licensed.notes, [
    'The page must load Suisse Int\'l (an @font-face for each): Fire ships only the families of its type sets.',
    'Suisse Int\'l is not in the font catalogue (contract/fonts.json): Fire cannot check the pairing or match a fallback to it.',
  ]);
  assert.deepEqual(type({ display: 'Fraunces', sans: 'Instrument Sans', mono: 'Geist Mono' }).notes, []);
  assert.match(type({ sans: 'Inter' }).notes[0], /^The page must load Inter \(an @font-face for each; node scripts\/fonts\.mjs add/);
});

test('expandTheme: a spec writes the font tokens with their fallbacks, the heading tokens, attributes and fallback faces', () => {
  const e = expandTheme({ type: { display: 'Fraunces', sans: 'Inter', mono: 'JetBrains Mono', displayWeight: 600, displayTracking: -0.02, headingCase: 'upper', figures: 'tabular' } });
  assert.equal(e.tokens['--fd-font-display'], `"Fraunces", "Fraunces Fallback", ${catalogue.stacks.serif}`);
  assert.equal(e.tokens['--fd-font-sans'], `"Inter", "Inter Fallback", ${catalogue.stacks.sans}`);
  assert.equal(e.tokens['--fd-font-mono'], `"JetBrains Mono", "JetBrains Mono Fallback", ${catalogue.stacks.mono}`);
  assert.equal(e.tokens['--fd-weight-display'], '600');
  for (const l of ['display', 'h1', 'h2', 'h3']) assert.equal(e.tokens[`--fd-ls-${l}`], '-0.02em');
  assert.deepEqual(e.attributes, { 'data-heading-case': 'upper', 'data-figures': 'tabular' });
  assert.equal(e.faces.length, 3);
  assert.ok(e.faces.includes('@font-face { font-family: "Inter Fallback"; src: local("Arial"); size-adjust: 107.12%; ascent-override: 90.44%; descent-override: 22.52%; line-gap-override: 0%; }'));
  assert.ok(Object.keys(e.tokens).every((k) => INPUT_TOKENS.includes(k)), 'every token a spec writes is an input token');
  // A key left out writes nothing; the default's own families have no fallback face; zero tracking is "0em", not "-0em".
  const g = expandTheme({ type: { sans: 'Geist', displayTracking: 0 } });
  assert.deepEqual(Object.keys(g.tokens), ['--fd-font-sans', '--fd-ls-display', '--fd-ls-h1', '--fd-ls-h2', '--fd-ls-h3']);
  assert.equal(g.tokens['--fd-font-sans'], `"Geist", ${catalogue.stacks.sans}`);
  assert.equal(g.tokens['--fd-ls-h1'], '0em');
  assert.deepEqual(g.faces, []);
  assert.deepEqual(expandTheme({ type: { sans: 'Inter', figures: 'proportional', headingCase: 'sentence' } }).attributes, {});
  // A family outside the catalogue keeps the old behaviour: its own name, then the voice's system stack.
  assert.equal(expandTheme({ type: { mono: 'Berkeley Mono' } }).tokens['--fd-font-mono'], `"Berkeley Mono", ${catalogue.stacks.mono}`);
  // A named set writes the attribute only, as before.
  assert.deepEqual(expandTheme({ type: 'poster' }), { tokens: {}, attributes: { 'data-type': 'poster' }, faces: [], notes: [] });
  assert.throws(() => expandTheme({ type: { sans: 'Hanken Grotesk' } }), /\/type\/sans: "Hanken Grotesk" has an x-height ratio of 0\.493/);
});

test('themeToCss: the fallback faces come before the rule, and the attributes are named', () => {
  const css = themeToCss({ type: { display: 'Playfair Display', sans: 'Inter', headingCase: 'upper' } });
  assert.match(css, /data-heading-case="upper"/);
  assert.match(css, /heading case and figures need fire\/typefaces\.css/);
  assert.ok(css.indexOf('@font-face') > 0 && css.indexOf('@font-face') < css.indexOf(':root {'));
  assert.equal((css.match(/^@font-face \{/gm) || []).length, 2);
  assert.ok(!/style=/.test(css));
});

test('the schema takes the spec, and agrees with validateTheme on its shape', () => {
  const schema = JSON.parse(read('contract/theme.schema.json'));
  const valid = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  for (const record of [
    { type: { display: 'Fraunces', sans: 'DM Sans', mono: 'DM Mono', displayWeight: 600, displayTracking: -0.01, headingCase: 'sentence', figures: 'proportional' } },
    { type: { sans: 'Inter' } },
    { type: 'poster' },
  ]) { assert.ok(valid(record), JSON.stringify(valid.errors)); assert.ok(validateTheme(record).ok); }
  for (const record of [
    { type: { displayWeight: 600 } }, { type: { sans: 'Inter', headingCase: 'title' } }, { type: { sans: 'Inter', figures: 'old' } },
    { type: { sans: 'Inter', displayTracking: 1 } }, { type: { sans: 'Inter', displayWeight: 50 } }, { type: { sans: 'Inter', size: 2 } },
  ]) { assert.ok(!valid(record), JSON.stringify(record)); assert.ok(!validateTheme(record).ok, JSON.stringify(record)); }
});

test('build-typefaces --check: fonts.js and typefaces.css are generated from the catalogue and the sets', () => {
  assert.match(node('scripts/build-typefaces.mjs', '--check'), /up to date/);
  const css = read('fire/typefaces.css');
  assert.match(css, /^\/\* =+\n   Fire — typefaces\n   GENERATED by scripts\/build-typefaces\.mjs/);
  for (const t of TYPEFACES) assert.ok(css.includes(`[data-type="${t.name}"] {`), t.name);
  // Every font file of a non-core shipped family a set uses is declared once; the fallback faces are there; no px or ms.
  for (const f of catalogue.families.filter((x) => x.shipped && !x.core)) {
    for (const file of f.files) assert.equal(css.split(`url("./fonts/${file.file}")`).length - 1, 1, file.file);
    assert.ok(css.includes(fallbackFace(f.name)), `${f.name} fallback`);
  }
  assert.ok(!/\d(px|ms)\b/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'no raw px or ms');
  // The default's block restores tokens.css, and the sets that step the headings keep their sizes.
  assert.match(css, /\[data-type="geist"\] \{\n  --fd-font-sans: "Geist", system-ui/);
  assert.match(css, /\[data-type="poster"\] \{[^}]*--fd-text-display: 3\.25rem; --fd-lh-display: 3\.25rem;/);
  assert.match(css, /\[data-type="loud"\] \{[^}]*--fd-text-h3: 1\.0625rem; --fd-lh-h3: 1\.5rem;/);
  assert.match(css, /\[data-heading-case="upper"\] :is\(/);
  assert.match(css, /\[data-figures="tabular"\] \{ font-variant-numeric: tabular-nums; \}/);
  // A stale file is caught.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-typefaces-'));
  try {
    fs.cpSync(path.join(ROOT, 'fire/js'), path.join(tmp, 'fire/js'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts/build-typefaces.mjs'), path.join(tmp, 'scripts/build-typefaces.mjs'));
    fs.mkdirSync(path.join(tmp, 'contract'));
    fs.copyFileSync(path.join(ROOT, 'contract/fonts.json'), path.join(tmp, 'contract/fonts.json'));
    fs.copyFileSync(path.join(ROOT, 'fire/typefaces.css'), path.join(tmp, 'fire/typefaces.css'));
    fs.appendFileSync(path.join(tmp, 'fire/typefaces.css'), '\n/* hand edit */\n');
    assert.throws(() => execFileSync(process.execPath, [path.join(tmp, 'scripts/build-typefaces.mjs'), '--check'], { stdio: 'pipe' }), (e) => /stale: fire\/typefaces\.css/.test(String(e.stderr)));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('fonts.mjs: list, info, and add (copy a shipped family, download another, idempotent, checksum checked)', async () => {
  assert.match(node('scripts/fonts.mjs', 'list', '--role', 'mono', '--voice', 'technical'), /JetBrains Mono/);
  assert.doesNotMatch(node('scripts/fonts.mjs', 'list', '--role', 'mono'), /Inter/);
  assert.equal(JSON.parse(node('scripts/fonts.mjs', 'info', 'inter')).metrics.xHeightRatio, 0.546);
  assert.throws(() => execFileSync(process.execPath, ['scripts/fonts.mjs', 'add', 'Intr'], { cwd: ROOT, stdio: 'pipe' }), (e) => /is not in the catalogue/.test(String(e.stderr)));

  // A local server stands in for the npm CDN: <base>/<package>@<version>/files/<file> and .../LICENSE.
  const inter = byName.Inter;
  const goodFile = Buffer.from('good woff2 bytes');
  const served = new Map([
    [`/${inter.source.npm}@${inter.source.version}/files/${inter.files[0].file}`, goodFile],
    [`/${inter.source.npm}@${inter.source.version}/LICENSE`, Buffer.from('SIL OPEN FONT LICENSE Version 1.1\n')],
  ]);
  const server = http.createServer((req, res) => { const body = served.get(req.url); if (!body) { res.statusCode = 404; res.end(); } else res.end(body); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-fonts-'));
  const run = (...a) => new Promise((resolve) => {
    import('node:child_process').then(({ execFile }) => execFile(process.execPath, ['scripts/fonts.mjs', ...a], { cwd: ROOT, env: { ...process.env, FIRE_FONTS_CDN: base } }, (error, stdout, stderr) => resolve({ error, stdout, stderr })));
  });
  try {
    // A shipped family is copied from fire/fonts/ (no download); its licence comes along.
    let r = await run('add', 'DM Mono', '--out', out);
    assert.ifError(r.error);
    assert.match(r.stdout, /copied from fire\/fonts\//);
    for (const w of ['400', '500']) assert.equal(sha(fs.readFileSync(path.join(out, `dm-mono-latin-${w}-normal.woff2`))), byName['DM Mono'].files.find((x) => x.weight === w).sha256);
    assert.ok(fs.readFileSync(path.join(out, 'licenses/dm-mono.txt'), 'utf8').includes('Open Font License'));
    let css = fs.readFileSync(path.join(out, 'fonts.css'), 'utf8');
    assert.match(css, /font-family: "DM Mono Fallback"; src: local\("Courier New"\)/);

    // A file that does not match the catalogue's checksum is refused, and nothing is written for it.
    r = await run('add', 'Inter', '--out', out);
    assert.ok(r.error, 'the checksum differs');
    assert.match(r.stderr, /checksum does not match/);
    assert.ok(!fs.existsSync(path.join(out, inter.files[0].file)));

    // With the right bytes (the catalogue's checksum swapped for the test's), the download is written once.
    const patched = JSON.parse(read('contract/fonts.json'));
    patched.families.find((f) => f.name === 'Inter').files[0].sha256 = sha(goodFile);
    const mirror = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fire-fonts-root-')));
    fs.mkdirSync(path.join(mirror, 'scripts')); fs.mkdirSync(path.join(mirror, 'contract'));
    fs.copyFileSync(path.join(ROOT, 'scripts/fonts.mjs'), path.join(mirror, 'scripts/fonts.mjs'));
    fs.writeFileSync(path.join(mirror, 'contract/fonts.json'), JSON.stringify(patched));
    const run2 = (...a) => new Promise((resolve) => import('node:child_process').then(({ execFile }) => execFile(process.execPath, [path.join(mirror, 'scripts/fonts.mjs'), ...a], { env: { ...process.env, FIRE_FONTS_CDN: base } }, (error, stdout, stderr) => resolve({ error, stdout, stderr }))));
    r = await run2('add', 'Inter', '--out', out);
    assert.ifError(r.error);
    assert.match(r.stdout, /downloaded from @fontsource-variable\/inter@5\.3\.0/);
    assert.deepEqual(fs.readFileSync(path.join(out, inter.files[0].file)), goodFile);
    assert.match(fs.readFileSync(path.join(out, 'licenses/inter.txt'), 'utf8'), /OPEN FONT LICENSE/);
    // Idempotent: one block per family in fonts.css.
    await run2('add', 'Inter', '--out', out);
    css = fs.readFileSync(path.join(out, 'fonts.css'), 'utf8');
    assert.equal(css.split('/* fire-font: Inter (OFL-1.1) */').length - 1, 1);
    assert.equal(css.split('/* fire-font: DM Mono (OFL-1.1) */').length - 1, 1);
    assert.match(css, /font-family: "Inter Fallback"; src: local\("Arial"\); size-adjust: 107\.12%/);
    fs.rmSync(mirror, { recursive: true, force: true });
  } finally { server.close(); fs.rmSync(out, { recursive: true, force: true }); }
});

test('getFamily and fontStack agree with the catalogue', () => {
  assert.equal(getFamily('Inter').roles.includes('interface'), true);
  assert.equal(getFamily('toString'), undefined);
  assert.equal(Object.keys(FONT_FAMILIES).length, catalogue.families.length);
  assert.equal(fontStack('Geist Mono', 'mono'), `"Geist Mono", ${catalogue.stacks.mono}`);
  assert.equal(fontStack('Unknown Face', 'sans'), `"Unknown Face", ${catalogue.stacks.sans}`);
  assert.equal(fallbackFace('Geist'), null);
});
