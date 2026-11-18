// node --test scripts/test/ : the theme record (fire/js/theme.js), its schema, the contract file and the looks.
//   paletteFrom: a sweep of 312 accents × every neutral option, labels asked for, and 50 brand sets; every result
//     passes the rules build-palettes.mjs --check holds the presets to (fire/js/palette-rules.js), and a moved
//     colour is always noted.
//   validateTheme agrees with contract/theme.schema.json under ajv (JSON Schema 2020-12), and the schema's enums are
//     Fire's palette and type set lists.
//   toThemeRecord / fromThemeRecord round-trip; themeToCss(toThemeRecord(state)) declares exactly what the Tweaks
//     panel's Copy CSS declares (checked in Chromium, where tweaks.js runs) and names the same attributes, except
//     data-theme: the light / dark / system choice is the viewer's and a record does not carry it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  paletteFrom, validateTheme, expandTheme, themeToCss, toThemeRecord, fromThemeRecord, INPUT_TOKENS, DEFAULT_RECORD,
} from '../../fire/js/theme.js';
import { PALETTES, PALETTE_TOKENS, oklch, toOklch, contrast } from '../../fire/js/palettes.js';
import { TYPEFACES } from '../../fire/js/typefaces.js';
import { paletteFailures } from '../../fire/js/palette-rules.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const schema = readJson('contract/theme.schema.json');
const ajv = new Ajv2020({ allErrors: true, strict: true });
const schemaValid = ajv.compile(schema);

/* ---------- paletteFrom ---------- */

/** Every rule, plus: the result is in the presets' form, and an accent that is not the one asked for is noted. */
function assertGood(p, asked, context) {
  assert.deepEqual(Object.keys(p.tokens), PALETTE_TOKENS, `${context}: token set`);
  for (const k of PALETTE_TOKENS) assert.equal(p.tokens[k].length, 2, `${context}: ${k} is a [light, dark] pair`);
  assert.deepEqual(paletteFailures(p.tokens, { name: context }), []);
  if (asked && p.tokens['--fd-accent'][0] !== asked) assert.ok(p.notes.some((n) => n.startsWith(`Accent ${asked} moved to ${p.tokens['--fd-accent'][0]}`)), `${context}: the moved accent is noted`);
  if (asked && p.tokens['--fd-accent'][0] === asked) assert.ok(!p.notes.some((n) => n.startsWith('Accent ')), `${context}: nothing moved, nothing noted`);
  // A generated palette is reproducible from its own spec.
  const again = paletteFrom(p.spec);
  assert.deepEqual(again.tokens, p.tokens, `${context}: paletteFrom(p.spec) reproduces it`);
}

const ACCENTS = [];
for (let h = 0; h < 360; h += 15) for (let i = 0; i < 13; i++) ACCENTS.push(oklch(0.2 + i * 0.06, 0.13, h));

test('paletteFrom: 312 accents across hue and lightness, with every neutral option, all pass', () => {
  assert.ok(new Set(ACCENTS).size >= 300);
  for (const neutral of ['tinted', 'pure', 'cool', 'warm', 300]) {
    for (const accent of ACCENTS) assertGood(paletteFrom({ from: 'accent', accent, neutral }), accent, `${accent} ${neutral}`);
  }
});

test('paletteFrom: an accent with no neutral given is tinted toward its own hue; greys are pure', () => {
  const p = paletteFrom({ from: 'accent', accent: '#1f6feb' });
  assert.equal(p.spec.hue, Math.round(toOklch('#1f6feb')[2] * 10) / 10);
  const g = paletteFrom({ from: 'accent', accent: '#777777' });
  assert.deepEqual(g.spec.tint, [0, 0]);
  assert.ok(g.notes.some((n) => /no hue/.test(n)));
});

test('paletteFrom: a label asked for is honoured in light mode, moving the accent the least, and noted', () => {
  for (const accent of ACCENTS.filter((_, i) => i % 3 === 0)) {
    for (const on of ['white', 'dark']) {
      const p = paletteFrom({ from: 'accent', accent, on });
      assertGood(p, accent, `${accent} on ${on}`);
      const label = p.tokens['--fd-accent-contrast'][0];
      assert.equal(toOklch(label)[0] > 0.6, on === 'white', `${accent} on ${on}: label ${label}`);
    }
  }
  // Least: the moved accent is the first L step (of .0025) that passes, so one step less does not.
  const p = paletteFrom({ from: 'accent', accent: '#ffcc00', on: 'white' });
  const [L, C, h] = toOklch(p.tokens['--fd-accent'][0]);
  assert.ok(contrast('#ffffff', oklch(L + 0.0025, C, h)) < 4.5);
  assert.ok(p.notes[0].includes('a white label reaches only'));
});

test('paletteFrom: extreme accents (white, black, pure primaries) are moved and noted', () => {
  for (const accent of ['#ffffff', '#000000', '#fff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff']) {
    for (const neutral of ['pure', 'cool', 'warm', 'tinted']) {
      const p = paletteFrom({ from: 'accent', accent, neutral });
      const full = accent.length === 4 ? `#${[...accent.slice(1)].map((c) => c + c).join('')}` : accent;
      assertGood(p, full, `${accent} ${neutral}`);
    }
  }
  assert.ok(paletteFrom({ from: 'accent', accent: '#ffffff' }).notes.some((n) => n.startsWith('Accent #ffffff moved')));
});

test('paletteFrom: the dark-mode accent reaches 3:1 on the dark page', () => {
  for (const accent of ACCENTS.filter((_, i) => i % 5 === 0)) {
    const p = paletteFrom({ from: 'accent', accent, neutral: 'cool' });
    assert.ok(contrast(p.tokens['--fd-accent'][1], p.tokens['--fd-bg'][1]) >= 3, accent);
  }
});

/* A deterministic generator, so the 50 brand sets are the same on every run. */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

test('paletteFrom: 50 brand sets of 1 to 3 colours all pass, and the choice is explained', () => {
  const rand = rng(6);
  const hex = () => `#${Math.floor(rand() * 0xffffff).toString(16).padStart(6, '0')}`;
  const sets = [['#14342b', '#f2c14e'], ['#000000'], ['#ffffff', '#000000'], ['#ff5a00', '#111111', '#f4f4f4'], ['#5865f2']];
  while (sets.length < 50) sets.push(Array.from({ length: 1 + Math.floor(rand() * 3) }, hex));
  for (const colors of sets) {
    const p = paletteFrom({ from: 'brand', colors });
    assertGood(p, null, colors.join(' '));
    assert.ok(p.notes[0].startsWith('Brand: accent '), colors.join(' '));
  }
  // The documented example: gold is the accent, the neutrals lean toward the dark green.
  const p = paletteFrom({ from: 'brand', colors: ['#14342b', '#f2c14e'] });
  assert.equal(p.tokens['--fd-accent'][0], '#f2c14e');
  assert.ok(Math.abs(p.spec.hue - toOklch('#14342b')[2]) < 0.1);
  // Black and white beside an orange: pure grey neutrals.
  assert.deepEqual(paletteFrom({ from: 'brand', colors: ['#ff5a00', '#111111', '#f4f4f4'] }).spec.tint, [0, 0]);
});

test('paletteFrom: presets given as full specs come back unchanged', () => {
  // Their accents pass already, so nothing may move; a derived dark accent (forest) is derived as palettes.js does.
  const specs = [
    { hue: 285, tint: [0.007, 0.014], ink: { c: 0.02 }, accent: ['#6a5cff', '#8478ff'], on: 'white' },
    { hue: 155, tint: [0.006, 0.011], ink: { c: 0.014 }, accent: ['#1f9d55'], on: 'white' },
    { hue: 255, tint: [0.0025, 0.004], ink: { c: 0.004 }, accent: 'ink', on: 'inverse', L: { ink: [0.235, 0.975], lineFaint: [0.94, 0.25], line: [0.922, 0.3], lineStrong: [0.85, 0.385] } },
    { hue: 265, tint: [0.008, 0.03], ink: { c: 0.02 }, accent: ['#4f6ef7', '#7c9cff'], on: ['white', 'dark'], L: { bg: [null, 0.16], bgSunken: [null, 0.13], surface: [null, 0.2], raised: [null, 0.235], lineFaint: [null, 0.265], line: [null, 0.305], lineStrong: [null, 0.38] } },
  ];
  const names = ['iris', 'forest', 'graphite', 'midnight'];
  specs.forEach((spec, i) => {
    const preset = PALETTES.find((p) => p.name === names[i]);
    const p = paletteFrom(spec);
    assert.deepEqual(p.tokens, preset.tokens, names[i]);
    assert.deepEqual(p.notes, [], names[i]);
  });
});

test('paletteFrom: a full spec whose neutrals cannot pass gives up the least and says so', () => {
  const p = paletteFrom({ hue: 250, tint: [0.04, 0.04], ink: { c: 0.04 }, accent: ['#1f6feb'], on: 'white', L: { bg: [0.6, null] } });
  assert.deepEqual(paletteFailures(p.tokens), []);
  assert.ok(p.notes.some((n) => n.startsWith('The lightness overrides were dropped')));
});

test('paletteFrom: bad specs throw with the field named', () => {
  assert.throws(() => paletteFrom({ from: 'accent', accent: 'blue' }), /\/palette\/accent/);
  assert.throws(() => paletteFrom({ from: 'brand', colors: [] }), /\/palette\/colors/);
  assert.throws(() => paletteFrom('volt'), /takes a spec/);
});

/* ---------- validateTheme and the schema ---------- */

const VALID = [
  {},
  DEFAULT_RECORD,
  { contract: 'fire/1', palette: 'volt' },
  { palette: { from: 'accent', accent: '#1f6feb', neutral: 'cool' } },
  { palette: { from: 'accent', accent: '#1F6', neutral: 210, on: 'dark' } },
  { palette: { from: 'brand', colors: ['#14342b', '#f2c14e'] } },
  { palette: { from: 'brand', colors: ['#14342b', '#f2c14e', '#ffffff'] } },
  { palette: { hue: 10, tint: [0.006, 0.012], ink: { c: 0.016, h: 20 }, accent: ['#e5386d'], on: 'white', surfaceTint: 0.5 } },
  { palette: { hue: 255, tint: [0.0025, 0.004], ink: { c: 0.004 }, accent: 'ink', on: ['inverse', 'dark'], L: { ink: [0.235, null] } } },
  { tone: { hue: -180, vivid: 150, light: 12, warmth: -100 } },
  { type: 'editorial' },
  { type: { display: 'Fraunces', sans: "Suisse Int'l", mono: 'JetBrains Mono' } },
  { type: { sans: 'Noto Sans JP' } },
  { dials: { corners: 0, density: 'spacious', lines: 1.5, textSize: 'lg', contrast: 'high', motion: 'off', texture: 1.5 } },
];
const INVALID = [
  null,
  [],
  'ember',
  { extra: 1 },
  { contract: 'fire/2' },
  { palette: 'neon' },
  { palette: 12 },
  { palette: { from: 'accent' } },
  { palette: { from: 'accent', accent: '#12345' } },
  { palette: { from: 'accent', accent: '#123456', neutral: 'hot' } },
  { palette: { from: 'accent', accent: '#123456', neutral: 400 } },
  { palette: { from: 'accent', accent: '#123456', on: 'black' } },
  { palette: { from: 'accent', accent: '#123456', colors: [] } },
  { palette: { from: 'brand', colors: [] } },
  { palette: { from: 'brand', colors: ['#111', '#222', '#333', '#444'] } },
  { palette: { from: 'brand', colors: ['red'] } },
  { palette: { from: 'image' } },
  { palette: { hue: 10, tint: [0.006], ink: { c: 0.016 }, accent: ['#e5386d'], on: 'white' } },
  { palette: { hue: 10, tint: [0.006, 0.012], ink: { c: 0.016 }, accent: ['#e5386d'] } },
  { palette: { hue: 10, tint: [0.006, 0.012], ink: { c: 0.016, x: 1 }, accent: ['#e5386d'], on: 'white' } },
  { palette: { hue: 10, tint: [0.006, 0.012], ink: { c: 0.016 }, accent: ['#e5386d'], on: 'white', L: { page: [0.9, 0.1] } } },
  { palette: { hue: 10, tint: [0.006, 0.012], ink: { c: 0.016 }, accent: ['#e5386d'], on: 'white', L: { bg: [1.2, null] } } },
  { palette: { hue: 10, tint: [0.006, 0.012], ink: { c: 0.016 }, accent: 'accent', on: 'white' } },
  { tone: { hue: 181 } },
  { tone: { vivid: 50.5 } },
  { tone: { saturation: 10 } },
  { tone: 'warm' },
  { type: 'comic' },
  { type: {} },
  { type: { display: 'Bad"Font' } },
  { type: { display: 'a; color: red' } },
  { type: { headings: 'Fraunces' } },
  { dials: { corners: 3 } },
  { dials: { corners: '1' } },
  { dials: { density: 'cozy' } },
  { dials: { lines: 3 } },
  { dials: { textSize: 'xl' } },
  { dials: { contrast: 'low' } },
  { dials: { motion: 'fast' } },
  { dials: { texture: -0.1 } },
  { dials: { theme: 'dark' } },
  { theme: 'dark' },
];

test('validateTheme and theme.schema.json agree on every record', () => {
  for (const r of VALID) {
    assert.ok(schemaValid(r), `schema rejects ${JSON.stringify(r)}: ${JSON.stringify(schemaValid.errors)}`);
    const v = validateTheme(r);
    assert.ok(v.ok, `validateTheme rejects ${JSON.stringify(r)}: ${v.errors}`);
  }
  for (const r of INVALID) {
    assert.ok(!schemaValid(r), `schema accepts ${JSON.stringify(r)}`);
    const v = validateTheme(r);
    assert.ok(!v.ok && v.errors.length, `validateTheme accepts ${JSON.stringify(r)}`);
  }
});

test('validateTheme names the field, lists the choices, and notes the fonts a page must load', () => {
  assert.match(validateTheme({ palette: 'neon' }).errors[0], /^\/palette: unknown palette "neon" \(one of ember, volt/);
  assert.match(validateTheme({ type: 'comic' }).errors[0], /^\/type: unknown type set "comic" \(one of geist/);
  assert.equal(validateTheme({ dials: { blur: 1 } }).errors[0], '/dials/blur: unknown field');
  const v = validateTheme({ type: { display: 'Fraunces', sans: 'Inter' } });
  assert.ok(v.ok);
  // Fraunces is one of Fire's own families (typefaces.css loads it); Inter is not.
  assert.deepEqual(v.notes, ['The page must load Inter (an @font-face for each; node scripts/fonts.mjs add "<family>" fetches a catalogue family\'s files): Fire ships only the families of its type sets.']);
  assert.deepEqual(validateTheme({ type: 'editorial' }).notes, []);
});

test('the schema lists exactly Fire\'s palettes and type sets', () => {
  assert.deepEqual(schema.$defs.paletteName.enum, PALETTES.map((p) => p.name));
  assert.deepEqual(schema.$defs.typeName.enum, TYPEFACES.map((t) => t.name));
});

/* ---------- Tweaks state ↔ record ---------- */

const STATES = [
  {},
  { palette: 'volt' },
  { palette: 'paper', type: 'editorial', tone: { hue: 0, vivid: 100, light: 0, warmth: 30 } },
  { palette: 'midnight', tone: { hue: -24, vivid: 60, light: -12, warmth: -100 }, contrast: 'high' },
  { palette: 'graphite', type: 'terminal', density: 'compact', corners: 0, lines: 2, textSize: 'sm', motion: 'off', texture: 0 },
  { palette: 'honey', type: 'poster', density: 'spacious', corners: 1.625, lines: 1.5, textSize: 'lg', motion: 'slow', texture: 1.45, contrast: 'high' },
  { palette: 'ember', tone: { hue: 180, vivid: 150, light: 12, warmth: 100 }, corners: 0.125 },
  { palette: 'iris', tone: { hue: 45, vivid: 0, light: 0, warmth: 0 }, type: 'gallery', contrast: 'high', texture: 0.35 },
];
const full = (s) => ({
  palette: 'ember', type: 'geist', tone: { hue: 0, vivid: 100, light: 0, warmth: 0 }, theme: 'system', density: 'comfortable',
  corners: 1, lines: 1, textSize: 'md', contrast: 'default', motion: 'default', texture: 1, ...s,
});

test('toThemeRecord and fromThemeRecord round-trip every Tweaks state', () => {
  for (const s of STATES.map(full)) {
    const record = toThemeRecord(s);
    assert.ok(validateTheme(record).ok, JSON.stringify(record));
    assert.ok(schemaValid(record), JSON.stringify(schemaValid.errors));
    assert.equal(record.theme, undefined);
    const { theme, ...rest } = s;
    assert.deepEqual(fromThemeRecord(record), rest);
    assert.deepEqual(toThemeRecord(fromThemeRecord(record)), record);
  }
  // A partial record means Fire's defaults for the rest.
  assert.deepEqual(fromThemeRecord({ palette: 'volt', dials: { density: 'compact' } }), (({ theme, ...r }) => r)(full({ palette: 'volt', density: 'compact' })));
});

test('fromThemeRecord refuses what the Tweaks panel cannot hold', () => {
  assert.throws(() => fromThemeRecord({ palette: { from: 'accent', accent: '#1f6feb' } }), /named palette only/);
  assert.throws(() => fromThemeRecord({ type: { display: 'Fraunces' } }), /named type set only/);
  assert.throws(() => fromThemeRecord({ palette: 'neon' }), /invalid theme record/);
});

/* ---------- expandTheme / themeToCss ---------- */

test('expandTheme: defaults leave no trace; dials and names map as Tweaks maps them', () => {
  assert.deepEqual(expandTheme({}), { tokens: {}, attributes: {}, faces: [], notes: [] });
  assert.deepEqual(expandTheme(DEFAULT_RECORD), { tokens: {}, attributes: {}, faces: [], notes: [] });
  const e = expandTheme({ palette: 'volt', type: 'book', dials: { corners: 0.5, lines: 2, motion: 'slow', texture: 0, density: 'compact', textSize: 'lg', contrast: 'high' } });
  assert.deepEqual(e.attributes, { 'data-palette': 'volt', 'data-type': 'book', 'data-density': 'compact', 'data-text-size': 'lg', 'data-contrast': 'high' });
  assert.deepEqual(e.tokens, { '--fd-radius-scale': '0.5', '--fd-hairline': '2px', '--fd-motion': '1.75', '--fd-texture': '0' });
  // A generated palette is written out, with its high-contrast lines under data-contrast="high".
  const g = expandTheme({ palette: { from: 'accent', accent: '#1f6feb', neutral: 'cool' }, dials: { contrast: 'high' } });
  assert.deepEqual(Object.keys(g.tokens), PALETTE_TOKENS);
  assert.deepEqual(g.tokens['--fd-line'], paletteFrom({ from: 'accent', accent: '#1f6feb', neutral: 'cool' }).contrast['--fd-line']);
  // Families become the three font tokens.
  const f = expandTheme({ type: { display: 'Fraunces', mono: 'Berkeley Mono' } });
  assert.equal(f.tokens['--fd-font-display'], '"Fraunces", "Fraunces Fallback", ui-serif, "Iowan Old Style", "Palatino Linotype", Georgia, serif');
  assert.equal(f.tokens['--fd-font-mono'], '"Berkeley Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace');
  assert.equal(f.tokens['--fd-font-sans'], undefined);
  assert.throws(() => expandTheme({ palette: 'neon' }), /invalid theme record/);
});

test('themeToCss: a stylesheet with no style attribute, on any selector', () => {
  const css = themeToCss({ palette: { from: 'brand', colors: ['#14342b', '#f2c14e'] }, dials: { density: 'compact' } }, { selector: '.brand' });
  assert.match(css, /^\/\* Fire theme: custom palette · compact · 1×\n/);
  assert.match(css, /On the element \.brand matches: data-density="compact"/);
  assert.match(css, /\n\.brand \{\n {2}--fd-ink: light-dark\(/);
  assert.equal((css.match(/\/\*/g) || []).length, 1, 'one comment, closed once');
  assert.throws(() => themeToCss({}, { selector: 'a { color: red } b' }), /selector/);
  assert.match(themeToCss({}), /:root \{\n {2}\/\* nothing overridden: the default look \*\/\n\}/);
});

/* ---------- Agreement with the Tweaks panel's Copy CSS, in a browser ---------- */

const declsOf = (css) => css.slice(css.indexOf('*/')).match(/^ {2}--fd-[^\n]+$/gm) ?? [];
const attrsOf = (css) => {
  const line = css.split('\n').find((l) => /^ {3}On /.test(l)) ?? '';
  return [...line.matchAll(/(data-[\w-]+)="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`);
};

test('themeToCss(toThemeRecord(state)) declares what Tweaks Copy CSS declares', async () => {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
    await page.route('http://fire.localhost/**', (route) => {
      const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
      const file = path.join(ROOT, rel || 'index.html');
      if (rel === 'blank.html') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ contentType: types[path.extname(file)] ?? 'application/octet-stream', body: fs.readFileSync(file) });
    });
    await page.goto('http://fire.localhost/blank.html');
    const states = [...STATES, { theme: 'dark' }, { palette: 'mint', theme: 'light', density: 'compact', tone: { hue: 120, vivid: 60, light: -12, warmth: 100 } }].map(full);
    const out = await page.evaluate(async (list) => {
      const tweaks = await import('/fire/js/tweaks.js');
      return list.map((s) => ({ css: tweaks.toCss(s), theme: tweaks.toTheme(s) }));
    }, states);
    out.forEach(({ css, theme }, i) => {
      const s = states[i];
      assert.deepEqual(theme, toThemeRecord(s), 'tweaks.toTheme is toThemeRecord');
      const ours = themeToCss(toThemeRecord(s));
      assert.deepEqual(declsOf(ours), declsOf(css), `declarations for ${JSON.stringify(s)}`);
      assert.deepEqual(attrsOf(ours), attrsOf(css).filter((a) => !a.startsWith('data-theme=')), `attributes for ${JSON.stringify(s)}`);
    });
    // The spread exercises the output: toned palettes written out, dials, attributes.
    assert.ok(out.reduce((n, { css }) => n + declsOf(css).length, 0) > 3 * PALETTE_TOKENS.length);
    assert.ok(out.filter(({ css }) => attrsOf(css).length).length >= 6);

    // The panel's Copy theme button copies the record as JSON.
    await page.evaluate(async () => {
      const tweaks = await import('/fire/js/tweaks.js');
      tweaks.set({ palette: 'clay', type: 'book', corners: 0.5 });
      tweaks.open();
    });
    const copied = await page.evaluate(() => new Promise((resolve) => {
      const button = document.querySelector('[data-tweaks-action="copy-theme"]');
      button.addEventListener('fd:copy', (event) => resolve({ value: event.detail.value, text: button.textContent.trim() }), { once: true });
      button.click();
    }));
    assert.match(copied.text, /^Copy theme/);
    assert.deepEqual(JSON.parse(copied.value), toThemeRecord(full({ palette: 'clay', type: 'book', corners: 0.5 })));
  } finally {
    await browser.close();
  }
});

/* ---------- The contract file and the looks ---------- */

test('build-contract.mjs --check: the committed contract and looks are current', () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-contract.mjs'), '--check'], { stdio: 'pipe' });
});

test('fire-contract.json: every token typed and tiered; inputs are what a record sets; Facet roles mapped', () => {
  const c = readJson('contract/fire-contract.json');
  const TYPES = ['color', 'dimension', 'duration', 'number', 'shadow', 'fontFamily', 'cubicBezier', 'other'];
  const names = c.tokens.map((t) => t.name);
  assert.equal(new Set(names).size, names.length, 'each token once');
  for (const t of c.tokens) {
    assert.ok(TYPES.includes(t.type), `${t.name} type ${t.type}`);
    assert.ok(['input', 'scale', 'derived'].includes(t.tier), `${t.name} tier`);
    assert.ok(typeof t.group === 'string' && t.group, `${t.name} group`);
    assert.ok(typeof t.default === 'string' || (typeof t.default.light === 'string' && typeof t.default.dark === 'string'), `${t.name} default`);
  }
  assert.deepEqual(c.tokens.filter((t) => t.tier === 'input').map((t) => t.name).sort(), [...INPUT_TOKENS].sort());
  const by = Object.fromEntries(c.tokens.map((t) => [t.name, t]));
  assert.deepEqual(by['--fd-bg'].default, { light: '#f9f9f9', dark: '#0a0a0a' });
  assert.equal(by['--fd-text-2'].tier, 'derived');
  assert.equal(by['--fd-space-4'].tier, 'scale');
  assert.equal(by['--fd-space-4'].default, '16px');
  assert.equal(by['--fd-dur-3'].type, 'duration');
  assert.equal(by['--fd-ease-out'].type, 'cubicBezier');
  assert.equal(by['--fd-shadow-md'].type, 'shadow');
  assert.equal(by['--fd-chart-1'].tier, 'derived');
  assert.equal(by['--fd-chart-3'].tier, 'scale');
  const roles = Object.fromEntries(c.tokens.filter((t) => t.facetRole).map((t) => [t.facetRole, t.name]));
  assert.deepEqual(roles, {
    background: '--fd-bg', surface: '--fd-surface', text: '--fd-ink', muted: '--fd-text-3', primary: '--fd-accent',
    'on-primary': '--fd-accent-contrast', border: '--fd-line', focus: '--fd-focus', link: '--fd-accent-text',
    success: '--fd-success-fill', 'on-success': '--fd-success-contrast', warning: '--fd-warning-fill', 'on-warning': '--fd-warning-contrast',
    danger: '--fd-danger-fill', 'on-danger': '--fd-danger-contrast', info: '--fd-info-fill', 'on-info': '--fd-info-contrast',
  });
  // Muted is opaque: --fd-text-3 laid over the page, and still 4.5:1 on it.
  for (const m of ['light', 'dark']) {
    assert.match(c.facet.roles.muted[m], /^#[0-9a-f]{6}$/);
    assert.ok(contrast(c.facet.roles.muted[m], c.facet.roles.background[m]) >= 4.5);
  }
});

test('contract/looks: one valid record per preset palette', () => {
  const files = fs.readdirSync(path.join(ROOT, 'contract/looks')).filter((f) => f.endsWith('.json')).sort();
  assert.deepEqual(files, PALETTES.map((p) => `${p.name}.json`).sort());
  for (const f of files) {
    const record = readJson(`contract/looks/${f}`);
    assert.ok(schemaValid(record), `${f}: ${JSON.stringify(schemaValid.errors)}`);
    assert.ok(validateTheme(record).ok, f);
    assert.equal(record.palette, f.replace('.json', ''));
  }
});

test('a record names the Fire release it was written against, and the module knows its own', async () => {
  const { FIRE_VERSION, validateTheme, toThemeRecord } = await import('../../fire/js/theme.js');
  const pkg = JSON.parse((await import('node:fs')).readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(FIRE_VERSION, pkg.version);
  assert.equal(toThemeRecord({}).fire, FIRE_VERSION);
  assert.ok(validateTheme({ contract: 'fire/1', fire: '0.6.0', palette: 'ember' }).ok);
  assert.ok(!validateTheme({ fire: 'latest' }).ok);
});
