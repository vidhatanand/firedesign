// node --test scripts/test/facet.test.mjs : facet/ (scripts/build-facet.mjs).
//   - the content meets Facet's rules for a design system (vendor/facet/src/system/models.ts and validation.ts, which
//     are reimplemented here: field patterns, caps, references, required pairings, WCAG AA in light and dark, the web
//     app state coverage, the API card rules, 128 KiB), and, when Facet's built command-line tool is present on this
//     machine, `facet system check` and `facet system build` agree (they only read the file). Set FACET_CLI to its
//     path, or it looks for ../design-kit/dist/cli.js, then ../codecrystal/vendor/facet/dist/cli.js;
//     without one that test is skipped and the reimplementation stands. The full variant (Facet's 0.6.2 schema: 200
//     components, 128 KiB + 768 KiB caps, the extra colour roles, rem line heights, numeric figures, 5-layer and dark
//     shadows, 48 sizes, 24 type steps, `contract`) and the fallback (the 0.6.1 rules) are each checked by their own rules.
//   - every required pairing is AA in both modes, computed here independently of the build
//   - extras.json lists files that exist with the right size and SHA-256; theme.json is Fire's default record
//   - the build writes the richest variant the installed Facet accepts: the full one (all components, a `contract`
//     field, Facet's raised limits) when its checker accepts it, else the 100-component fallback; both are built here
//     against stub checkers, and the committed files are valid under whichever variant they record
//   - the build is deterministic and the committed files are current.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DEFAULT_RECORD, validateTheme } from '../../fire/js/theme.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));
const content = readJson('facet/content.json');
const extras = readJson('facet/extras.json');
const DARK = 'org.codecrystal.dark';
const CLI = (process.env.FACET_CLI ? [process.env.FACET_CLI] : ['../design-kit/dist/cli.js', '../codecrystal/vendor/facet/dist/cli.js']).find((c) => fs.existsSync(c)) || '/nonexistent/facet/cli.js';

/* ---------- Facet's rules, reimplemented ---------- */
const ROLES = ['background', 'surface', 'text', 'muted', 'primary', 'on-primary', 'accent', 'border', 'success', 'warning', 'danger', 'focus'];
const OPTIONAL_ROLES = ['secondary', 'on-secondary', 'info', 'link'];
const FULL_ROLES = ['raised', 'sunken', 'on-success', 'on-warning', 'on-danger', 'on-info'];
const TONES = ['success', 'warning', 'danger', 'info'];
const REQUIRED_PAIRINGS = [['text', 'background'], ['text', 'surface'], ['muted', 'background'], ['on-primary', 'primary'], ['focus', 'background']];
const NEED = { text: 4.5, large_text: 3, ui: 3 };
const WEB_APP_STATES = ['empty', 'loading', 'error', 'disabled'];
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const DIMENSION_OLD = /^(0|-?\d{1,4}(\.\d{1,3})?(px|rem|em))$/;
const DIMENSION_NEW = /^(0|-?(\d{1,4}(\.\d{1,4})?rem|\d{1,4}(\.\d{1,3})?(px|em)))$/;
const REM_LINE = /^(?=[0-9.]*[1-9])\d{1,4}(\.\d{1,4})?rem$/;
const TOKEN_NAME = /^[a-z0-9][a-z0-9-]*$/;
const keys = (o) => Object.keys(o);
const isDict = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const only = (o, allowed, where) => { for (const k of keys(o)) assert.ok(allowed.includes(k), `${where}: unknown field ${k}`); };
const within = (o, min, max, where) => assert.ok(keys(o).length >= min && keys(o).length <= max, `${where}: ${keys(o).length} entries, allowed ${min}..${max}`);

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const n = parseInt(h.slice(1, 7), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// full: Facet's raised limits (200 components; 128 KiB without the components, 768 KiB for them) and the `contract` field.
function checkContent(c, { full = false } = {}) {
  const DIMENSION = full ? DIMENSION_NEW : DIMENSION_OLD;
  const ALLOWED_ROLES = [...ROLES, ...OPTIONAL_ROLES, ...(full ? FULL_ROLES : [])];
  only(c, ['name', 'platform', 'source', 'basis_revision_id', 'summary', 'tokens', 'pairings', 'motion', 'components', 'voice', 'responsive', 'component', 'component_bundle', ...(full ? ['contract'] : [])], 'content');
  assert.ok(c.name.length >= 1 && c.name.length <= 120);
  assert.ok(['website', 'web_app', 'both'].includes(c.platform));
  assert.ok(['extracted', 'proposed', 'edited'].includes(c.source));
  assert.ok((c.summary || '').length <= 2000);
  if (full) {
    const { components: comps, ...rest } = c;
    assert.ok(Buffer.byteLength(JSON.stringify(rest)) <= 128 * 1024, 'the document without components exceeds 128 KiB');
    assert.ok(Buffer.byteLength(JSON.stringify(comps)) <= 768 * 1024, 'the components exceed 768 KiB');
  } else assert.ok(Buffer.byteLength(JSON.stringify(c)) <= 128 * 1024, 'content exceeds 128 KiB');
  const t = c.tokens;
  only(t, ['color', 'palette', 'font', 'typography', 'space', 'radius', 'shadow', 'breakpoint', 'duration', 'easing', 'zIndex', 'opacity', 'borderWidth', 'iconSize', 'container', 'size', 'grid', 'focusRing', 'state'], 'tokens');
  // colour roles: all required, opaque light value, dark extension, nothing else
  for (const r of ROLES) assert.ok(r in t.color, `colour role ${r} missing`);
  within(t.color, ROLES.length, ALLOWED_ROLES.length, 'color');
  for (const [role, tk] of Object.entries(t.color)) {
    assert.ok(ALLOWED_ROLES.includes(role), `unknown role ${role}`);
    assert.equal(tk.$type, 'color');
    assert.match(tk.$value, /^#[0-9a-f]{6}$/, `${role} light is not an opaque hex`);
    assert.match(tk.$extensions[DARK], /^#[0-9a-f]{6}$/, `${role} dark is not an opaque hex`);
    assert.ok(!tk.$description || tk.$description.length <= 500);
  }
  if ('on-secondary' in t.color) assert.ok('secondary' in t.color);
  for (const tone of TONES) if (`on-${tone}` in t.color) assert.ok(tone in t.color, `on-${tone} needs ${tone}`);
  // palette
  within(t.palette, 0, 64, 'palette');
  for (const [n, tk] of Object.entries(t.palette)) {
    assert.match(n, TOKEN_NAME); assert.equal(tk.$type, 'color'); assert.match(tk.$value, HEX);
    if (tk.$extensions) assert.match(tk.$extensions[DARK], HEX);
  }
  // fonts and typography
  only(t.font, full ? ['family', 'numeric'] : ['family'], 'font');
  if (t.font.numeric !== undefined) assert.ok(['proportional', 'tabular'].includes(t.font.numeric));
  within(t.font.family, 1, 8, 'font.family');
  assert.ok('body' in t.font.family, 'font.family needs body');
  for (const f of Object.values(t.font.family)) {
    assert.equal(f.$type, 'fontFamily'); assert.ok(f.$value.length >= 1 && f.$value.length <= 8);
    for (const name of f.$value) assert.match(name, /^[^"'<>{};\\]+$/);
  }
  within(t.typography, 1, full ? 24 : 16, 'typography');
  for (const [n, tk] of Object.entries(t.typography)) {
    assert.match(n, TOKEN_NAME);
    const v = tk.$value;
    const fam = /^\{font\.family\.([a-z0-9][a-z0-9-]*)\}$/.exec(v.fontFamily);
    assert.ok(fam && fam[1] in t.font.family, `typography.${n} family`);
    assert.match(v.fontSize, DIMENSION);
    if (full && typeof v.lineHeight === 'string') assert.match(v.lineHeight, REM_LINE, `typography.${n} line height`);
    else assert.ok(typeof v.lineHeight === 'number' && v.lineHeight >= 0.8 && v.lineHeight <= 3);
    if (v.numeric !== undefined) { assert.ok(full); assert.ok(['proportional', 'tabular'].includes(v.numeric)); }
    assert.ok(Number.isInteger(v.fontWeight) && v.fontWeight >= 100 && v.fontWeight <= 900 && v.fontWeight % 50 === 0);
    assert.match(v.letterSpacing, DIMENSION);
  }
  // dimension groups
  for (const [g, max] of [['space', 24], ['radius', 12], ['breakpoint', 8], ['iconSize', 12], ['size', full ? 48 : 12]]) {
    within(t[g], 1, max, g);
    for (const [n, tk] of Object.entries(t[g])) { assert.match(n, TOKEN_NAME); assert.equal(tk.$type, 'dimension'); assert.match(tk.$value, DIMENSION, `${g}.${n}`); }
  }
  const px = (v) => (v === '0' ? 0 : /(rem|em)$/.test(v) ? parseFloat(v) * 16 : parseFloat(v));
  assert.ok(px(t.size.touch.$value) >= 24, 'size.touch below 24px');
  // shadows
  within(t.shadow, 0, 12, 'shadow');
  for (const [n, tk] of Object.entries(t.shadow)) {
    assert.equal(tk.$type, 'shadow'); const maxLayers = full ? 5 : 4;
    assert.ok(tk.$value.length >= 1 && tk.$value.length <= maxLayers, `shadow.${n} has ${tk.$value.length} layers`);
    if (tk.$extensions) { assert.ok(full); only(tk.$extensions, [DARK], `shadow.${n}`); assert.ok(tk.$extensions[DARK].length >= 1 && tk.$extensions[DARK].length <= maxLayers); }
    for (const l of [...tk.$value, ...(tk.$extensions?.[DARK] || [])]) { assert.match(l.color, HEX); for (const k of ['offsetX', 'offsetY', 'blur', 'spread']) assert.match(l[k], DIMENSION, `shadow.${n}.${k}`); }
  }
  // motion tokens
  within(t.duration, 1, 12, 'duration');
  for (const tk of Object.values(t.duration)) assert.match(tk.$value, /^\d{1,5}ms$/);
  within(t.easing, 1, 12, 'easing');
  for (const tk of Object.values(t.easing)) { assert.equal(tk.$value.length, 4); for (const n of tk.$value) assert.ok(n >= -2 && n <= 3); }
  within(t.zIndex, 1, 16, 'zIndex');
  for (const tk of Object.values(t.zIndex)) assert.ok(Number.isInteger(tk.$value) && tk.$value >= -1000);
  // focus ring
  const ring = t.focusRing;
  assert.ok(px(ring.width.$value) >= 1 && px(ring.width.$value) <= 8 && px(ring.offset.$value) >= -8 && px(ring.offset.$value) <= 8);
  const ringRole = /^\{color\.([a-z][a-z-]{1,19})\}$/.exec(ring.color.$value);
  assert.ok(ringRole && ringRole[1] in t.color);
  // interaction states
  within(t.state, 1, 4, 'state');
  for (const [s, roles] of Object.entries(t.state)) {
    assert.ok(['hover', 'pressed', 'selected', 'disabled'].includes(s));
    for (const [r, tk] of Object.entries(roles)) { assert.ok(r in t.color, `state.${s}.${r}`); assert.match(tk.$value, HEX); assert.match(tk.$extensions[DARK], HEX); }
  }
  // pairings
  assert.ok(c.pairings.length >= 1 && c.pairings.length <= 64);
  const declared = new Set();
  for (const p of c.pairings) {
    assert.ok(p.foreground in t.color && p.background in t.color && p.foreground !== p.background);
    assert.ok(p.usage in NEED);
    const key = `${p.foreground}\0${p.background}`;
    assert.ok(!declared.has(key), `pairing ${p.foreground}/${p.background} declared twice`);
    declared.add(key);
  }
  for (const [f, b] of REQUIRED_PAIRINGS) assert.ok(declared.has(`${f}\0${b}`), `required pairing ${f} on ${b} missing`);
  if ('link' in t.color) assert.ok(declared.has('link\0background'));
  if (full) {
    for (const surface of ['raised', 'sunken']) if (surface in t.color) { assert.ok(declared.has(`text\0${surface}`), `text on ${surface} missing`); }
    for (const tone of TONES) if (`on-${tone}` in t.color) assert.ok(declared.has(`on-${tone}\0${tone}`), `on-${tone} on ${tone} missing`);
  }
  if (c.contract !== undefined) {
    assert.ok(full);
    assert.match(c.contract.contract, /^[a-z][a-z0-9-]*\/[0-9]+$/);
    assert.match(c.contract.fire, /^\d+\.\d+\.\d+/);
    assert.ok(Buffer.byteLength(JSON.stringify(c.contract)) <= 16 * 1024, 'the contract exceeds 16 KiB');
  }
  // motion and voice
  assert.ok(['remove', 'reduce', 'keep_essential'].includes(c.motion.reduced_motion));
  assert.ok(c.voice.tone.length >= 1 && c.voice.tone.length <= 1000);
  for (const k of ['do', 'dont']) { assert.ok(c.voice[k].length <= 12); for (const s of c.voice[k]) assert.ok(s.length >= 1 && s.length <= 300); }
  // components
  assert.ok(c.components.length <= (full ? 200 : 100));
  const names = c.components.map((x) => x.name);
  assert.equal(new Set(names).size, names.length, 'component names are unique');
  const covered = new Set();
  for (const x of c.components) {
    only(x, ['name', 'purpose', 'variants', 'states', 'paths', 'usage', 'do', 'dont', 'api'], `component ${x.name}`);
    assert.match(x.name, /^[A-Z][A-Za-z0-9]{0,63}$/);
    assert.ok(x.purpose.length >= 1 && x.purpose.length <= 500, `${x.name} purpose`);
    assert.ok((x.variants || []).length <= 16 && (x.variants || []).every((v) => v.length >= 1 && v.length <= 40));
    assert.ok((x.states || []).length <= 16 && (x.states || []).every((s) => /^[a-z][a-z0-9-]{0,39}$/.test(s)));
    assert.ok((x.paths || []).length <= 8);
    if (x.usage !== undefined) assert.ok(x.usage.length >= 1 && x.usage.length <= 1000);
    for (const k of ['do', 'dont']) if (x[k] !== undefined) { assert.ok(x[k].length >= 1 && x[k].length <= 8); for (const s of x[k]) assert.ok(s.length >= 1 && s.length <= 300, `${x.name}.${k}`); }
    (x.states || []).forEach((s) => covered.add(s));
    if (x.api) {
      assert.ok(x.api.props.length <= 32 && x.api.parts.length <= 16);
      const seen = new Set();
      for (const p of x.api.props) {
        assert.match(p.name, /^[a-z][A-Za-z0-9]{0,31}$/);
        assert.ok(!['name', 'children'].includes(p.name), `${x.name}: reserved prop ${p.name}`);
        assert.ok(!seen.has(p.name)); seen.add(p.name);
        assert.ok(['string', 'enum', 'number', 'boolean', 'node', 'function', 'object', 'array'].includes(p.type));
        if (p.type === 'enum') { assert.ok(p.values && p.values.length >= 1 && p.values.length <= 32 && new Set(p.values).size === p.values.length); p.values.forEach((v) => assert.ok(v.length >= 1 && v.length <= 40)); } else assert.equal(p.values, undefined);
        if (p.description !== undefined) assert.ok(p.description.length >= 1 && p.description.length <= 300);
      }
      const parts = x.api.parts.map((p) => p.name);
      assert.equal(new Set(parts).size, parts.length);
      for (const p of x.api.parts) { assert.match(p.name, /^[a-z][a-z0-9-]{0,39}$/); assert.ok(p.description.length >= 1 && p.description.length <= 300); }
      if (x.api.example !== undefined) assert.ok(x.api.example.length >= 1 && x.api.example.length <= 2000);
    }
  }
  if (c.platform === 'web_app' || c.platform === 'both') for (const s of WEB_APP_STATES) assert.ok(covered.has(s), `no component covers the state ${s}`);
  // contrast: every declared pairing in both modes
  for (const p of c.pairings) {
    for (const mode of ['light', 'dark']) {
      const fg = mode === 'light' ? t.color[p.foreground].$value : t.color[p.foreground].$extensions[DARK];
      const bg = mode === 'light' ? t.color[p.background].$value : t.color[p.background].$extensions[DARK];
      assert.ok(ratio(fg, bg) >= NEED[p.usage], `${p.foreground} on ${p.background} (${mode}, ${p.usage}) is ${ratio(fg, bg).toFixed(2)}:1`);
    }
  }
}

const FULL = extras.facet.variant === 'full';
test('content.json is valid under Facet\'s rules (reimplemented from models.ts and validation.ts)', () => checkContent(content, { full: FULL }));

test('the reimplementation rejects what Facet rejects', () => {
  const bad = (mutate) => { const c = structuredClone(content); mutate(c); assert.throws(() => checkContent(c, { full: FULL })); };
  bad((c) => { c.tokens.color.text.$value = '#fafafa'; });
  bad((c) => { delete c.tokens.color.focus; });
  bad((c) => { c.tokens.color.muted.$extensions[DARK] = '#0b0b0b'; });
  bad((c) => { c.pairings = c.pairings.filter((p) => !(p.foreground === 'muted' && p.background === 'background')); });
  bad((c) => { c.tokens.shadow.md.$value = Array(FULL ? 6 : 5).fill(c.tokens.shadow.md.$value[0]); });
  bad((c) => { c.components[0].api.props.push({ name: 'children', type: 'string', required: false }); });
  bad((c) => { for (const x of c.components) x.states = x.states.filter((s) => s !== 'empty'); });
  bad((c) => { c.components.push({ ...c.components[0] }); });
  if (FULL) {
    bad((c) => { c.pairings = c.pairings.filter((p) => !(p.foreground === 'on-danger' && p.background === 'danger')); });
    bad((c) => { c.pairings = c.pairings.filter((p) => !(p.foreground === 'text' && p.background === 'raised')); });
    bad((c) => { c.tokens.typography.md.$value.lineHeight = '0rem'; });
    bad((c) => { c.tokens.typography.md.$value.numeric = 'oldstyle'; });
    bad((c) => { c.tokens.color['on-info'].$extensions[DARK] = c.tokens.color.info.$extensions[DARK]; });
  }
});

test('the full variant uses what Facet\'s schema accepts: every size, type step and shadow layer, the new roles, tabular figures', { skip: !FULL && 'the committed variant is the fallback' }, () => {
  const t = content.tokens;
  const contractTokens = readJson('contract/fire-contract.json').tokens;
  // all 16 type sizes, with Fire's own rem values and line heights
  const tokenValue = (n) => String(contractTokens.find((x) => x.name === n).default);
  const steps = Object.entries(t.typography);
  assert.equal(steps.length, 16);
  for (const [n, tk] of steps) {
    assert.equal(tk.$value.fontSize, tokenValue(`--fd-text-${n}`), `typography.${n} size`);
    assert.match(tk.$value.lineHeight, REM_LINE);
  }
  assert.equal(t.typography.md.$value.lineHeight, tokenValue('--fd-lh-md'));
  assert.equal(t.typography.h1.$value.lineHeight, tokenValue('--fd-lh-h1'));
  assert.equal(t.typography.stat.$value.numeric, 'tabular');
  assert.equal(t.font.numeric, 'proportional');
  // every pixel size Fire has, plus touch
  const pxSizes = contractTokens.filter((x) => x.group === 'size' && x.type === 'dimension' && /px$/.test(x.default) && !/^--fd-icon/.test(x.name));
  assert.equal(Object.keys(t.size).length, pxSizes.length + 1);
  for (const x of pxSizes) assert.equal(t.size[x.name.replace(/^--fd-/, '')].$value, x.default);
  // every shadow layer, light and dark
  const layers = (css) => { let d = 0, n = 1; for (const ch of css) { if (ch === '(') d++; else if (ch === ')') d--; else if (ch === ',' && d === 0) n++; } return n; };
  for (const x0 of contractTokens.filter((y) => y.group === 'shadow')) {
    // A shadow with one value in both modes (--fd-shadow-object, empty until data-elevation="lifted") is a plain string.
    const x = typeof x0.default === 'string' ? { ...x0, default: { light: x0.default, dark: x0.default } } : x0;
    const tk = t.shadow[x.name.replace(/^--fd-shadow-/, '')];
    assert.equal(tk.$value.length, layers(x.default.light), `${x.name} light layers`);
    if (tk.$extensions) assert.equal(tk.$extensions[DARK].length, layers(x.default.dark), `${x.name} dark layers`);
    else assert.equal(x.default.light, x.default.dark);
  }
  assert.equal(t.shadow.accent.$value.length, 5);
  assert.equal(t.shadow.accent.$extensions[DARK].length, 5);
  assert.ok(content.pairings.every((p) => p.usage !== undefined));
  // the new roles, from the tokens the task names
  const pairOf = (n) => contractTokens.find((x) => x.name === n).default;
  assert.equal(t.color.raised.$value, pairOf('--fd-surface-raised').light);
  assert.equal(t.color.sunken.$extensions[DARK], pairOf('--fd-bg-sunken').dark);
  for (const tone of TONES) {
    assert.equal(t.color[`on-${tone}`].$value, pairOf(`--fd-${tone}-contrast`).light ?? pairOf(`--fd-${tone}-contrast`));
    assert.ok(content.pairings.some((p) => p.foreground === `on-${tone}` && p.background === tone && p.usage === 'text'));
  }
  assert.ok(content.pairings.some((p) => p.foreground === 'text' && p.background === 'raised'));
  assert.ok(content.pairings.some((p) => p.foreground === 'text' && p.background === 'sunken'));
  // the contract is the theme record, byte for byte
  assert.deepEqual(content.contract, readJson('facet/theme.json'));
  // the two files Facet reads from ds/ are carried and say where they go
  const row = (p) => extras.files.find((f) => f.path === p);
  assert.equal(row('contract/catalog.json').ds, 'ds/catalog.json');
  assert.equal(row('contract/custom-elements.json').ds, 'ds/custom-elements.json');
  // sizes against Facet's caps (compact bytes; Facet counts canonical bytes, near the same)
  const { components, ...rest } = content;
  assert.ok(Buffer.byteLength(JSON.stringify(rest)) < 128 * 1024);
  assert.ok(Buffer.byteLength(JSON.stringify(components)) < 768 * 1024);
});

test('every required pairing is WCAG AA in light and dark, computed from the contract values', () => {
  const contract = readJson('contract/fire-contract.json').facet.roles;
  const checks = [['text', 'background', 4.5], ['text', 'surface', 4.5], ['muted', 'background', 4.5], ['on-primary', 'primary', 4.5], ['focus', 'background', 3], ['link', 'background', 4.5]];
  for (const [f, b, need] of checks) for (const mode of ['light', 'dark']) {
    assert.ok(ratio(contract[f][mode], contract[b][mode]) >= need, `${f} on ${b} ${mode}`);
    // and content.json carries the contract's values
    const get = (r) => (mode === 'light' ? content.tokens.color[r].$value : content.tokens.color[r].$extensions[DARK]);
    assert.equal(get(f), contract[f][mode]); assert.equal(get(b), contract[b][mode]);
  }
});

test('Facet\'s own checker accepts content.json and its generator builds from it', { skip: !fs.existsSync(CLI) && 'Facet\'s command-line tool is not on this machine' }, () => {
  const out = execFileSync(process.execPath, [CLI, 'system', 'check', path.join(ROOT, 'facet/content.json')], { encoding: 'utf8' });
  assert.match(out, /^ok: Fire is a valid design system/);
  if (FULL) assert.match(out, new RegExp(`${readJson('contract/catalog.json').components.length} components`));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-facet-'));
  try {
    const built = execFileSync(process.execPath, [CLI, 'system', 'build', path.join(ROOT, 'facet/content.json'), dir], { encoding: 'utf8' });
    assert.match(built, /wrote/);
    assert.ok(fs.existsSync(path.join(dir, 'ds')));
    const cards = JSON.parse(fs.readFileSync(path.join(dir, 'ds/components.json'), 'utf8'));
    assert.equal(Object.keys(cards.components).length, content.components.length);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  // and it refuses a broken one, so the check above means something
  const broken = structuredClone(content); broken.tokens.color.text.$value = '#fafafa';
  const tmp = path.join(os.tmpdir(), `fire-facet-bad-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify(broken));
  try {
    const r = spawnSync(process.execPath, [CLI, 'system', 'check', tmp], { encoding: 'utf8' });
    assert.equal(r.status, 1);
  } finally { fs.rmSync(tmp, { force: true }); }
});

test('extras.json lists files that exist, with their size and SHA-256', () => {
  assert.equal(extras.fire, readJson('contract/catalog.json').fire);
  const must = ['fire/fire.css', 'fire/boot.js', 'fire/fire.js', 'fire/elements.js', 'fire/js/theme.js', 'contract/fire-contract.json', 'contract/catalog.json', 'contract/custom-elements.json', 'contract/theme.schema.json'];
  const paths = extras.files.map((f) => f.path);
  for (const m of must) assert.ok(paths.includes(m), `${m} is not in extras`);
  assert.deepEqual(paths, [...new Set(paths)]);
  for (const f of extras.files) {
    const buf = fs.readFileSync(path.join(ROOT, f.path));
    assert.equal(f.size, buf.length, f.path);
    assert.equal(f.sha256, crypto.createHash('sha256').update(buf).digest('hex'), f.path);
    assert.ok(f.purpose && f.purpose.length > 10, `${f.path} has no purpose`);
  }
  // every stylesheet fire.css imports is carried
  for (const m of readText('fire/fire.css').matchAll(/@import "\.\/([^"]+)"/g)) assert.ok(paths.includes(`fire/${m[1]}`), `fire/${m[1]} is imported but not carried`);
  // the Geist files the default look needs
  assert.ok(extras.files.some((f) => /geist-latin-wght/.test(f.path) && f.required));
  assert.equal(extras.bundleSha256, crypto.createHash('sha256').update(extras.files.map((f) => `${f.sha256}  ${f.path}\n`).join('')).digest('hex'));
  // aliases name real tokens
  const tokens = new Set(readJson('contract/fire-contract.json').tokens.map((t) => t.name));
  for (const [facetVar, fireVar] of Object.entries(extras.aliases)) assert.ok(tokens.has(fireVar), `${facetVar} aliases ${fireVar}, which is not a token`);
  for (const role of Object.keys(content.tokens.color)) if (role !== 'accent') assert.ok(`--color-${role}` in extras.aliases, `no alias for role ${role}`);
});

test('theme.json is Fire\'s default record, names the release, and is valid', async () => {
  const rec = readJson('facet/theme.json');
  const { FIRE_VERSION } = await import('../../fire/js/theme.js');
  const { fire, ...rest } = rec;
  assert.equal(fire, FIRE_VERSION);
  assert.deepEqual(rest, JSON.parse(JSON.stringify(DEFAULT_RECORD)));
  assert.equal(validateTheme(rec).ok, true);
});

test('the voice comes from WRITING.md and the 100 components are chosen by the stated rule', () => {
  const writing = readText('WRITING.md');
  assert.match(writing, /Words to delete on sight/);
  assert.ok(content.voice.dont.some((d) => /simply, just, easily/.test(d)));
  const catalog = readJson('contract/catalog.json');
  assert.equal(content.components.length, FULL ? catalog.components.length : Math.min(100, catalog.components.length));
  const readme = readText('facet/README.md');
  const carried = new Set(content.components.map((c) => c.name));
  const excluded = catalog.components.filter((c) => !carried.has(c.id.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')));
  assert.equal(excluded.length, catalog.components.length - content.components.length);
  if (!FULL) for (const c of excluded) assert.ok(readme.includes(`- \`${c.id}\` (`), `${c.id} is not listed as excluded`);
  // the foundations are always carried, and nothing from the leave-out-first list is carried while a component
  // outside it is excluded
  const protectedFamilies = ['Layout', 'Forms', 'Buttons', 'Base', 'Navigation', 'Overlays', 'Data', 'Charts'];
  for (const c of catalog.components) if (protectedFamilies.includes(c.family)) assert.ok(!excluded.includes(c), `${c.id} (${c.family}) is a foundation and must be carried`);
  if (!FULL) for (const id of ['doc', 'chat', 'tweaks', 'playground']) assert.ok(excluded.some((c) => c.id === id), `${id} is specialised and is left out first`);
});

test('the build is deterministic and the committed files are current', () => {
  const run = (...args) => spawnSync(process.execPath, [path.join(ROOT, 'scripts/build-facet.mjs'), ...args], { encoding: 'utf8' });
  const check = run('--check');
  assert.equal(check.status, 0, check.stderr);
  // build twice into the same files: identical bytes
  const hash = () => crypto.createHash('sha256').update(['content.json', 'extras.json', 'theme.json', 'README.md'].map((f) => readText(`facet/${f}`)).join('\0')).digest('hex');
  const before = hash();
  assert.equal(run().status, 0);
  const once = hash();
  assert.equal(run().status, 0);
  assert.equal(hash(), once);
  assert.equal(once, before);
  // no style attributes or raw script in anything written
  for (const f of ['README.md', 'content.json', 'extras.json', 'theme.json']) assert.doesNotMatch(readText(`facet/${f}`), /\sstyle="/);
});

/* ---------- the two variants, against stub checkers ---------- */
const BUILD = path.join(ROOT, 'scripts/build-facet.mjs');
const stub = (dir, name, body) => { const f = path.join(dir, name); fs.writeFileSync(f, body); return f; };
const buildInto = (out, cli, ...args) => spawnSync(process.execPath, [BUILD, '--out', out, ...args], { encoding: 'utf8', env: { ...process.env, FACET_CLI: cli } });

test('the extras record which variant was written and which Facet build validated it', () => {
  assert.ok(['full', 'fallback'].includes(extras.facet.variant));
  assert.equal(extras.facet.components, content.components.length);
  assert.equal(extras.facet.contract, 'contract' in content);
  assert.ok(extras.facet.validatedBy === null || /^facet /.test(extras.facet.validatedBy));
  assert.match(readText('facet/README.md'), extras.facet.variant === 'full' ? /\*\*Full\.\*\*/ : /\*\*Fallback\.\*\*/);
});

test('a Facet that accepts the full variant gets all components and the contract field', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-facet-variant-'));
  try {
    const accept = stub(dir, 'accept.mjs', "console.log('ok: Fire is a valid design system');\n");
    const out = path.join(dir, 'out');
    const r = buildInto(out, accept);
    assert.equal(r.status, 0, r.stderr);
    const c = JSON.parse(fs.readFileSync(path.join(out, 'content.json'), 'utf8'));
    const x = JSON.parse(fs.readFileSync(path.join(out, 'extras.json'), 'utf8'));
    const theme = JSON.parse(fs.readFileSync(path.join(out, 'theme.json'), 'utf8'));
    assert.equal(c.components.length, readJson('contract/catalog.json').components.length);
    assert.deepEqual(c.contract, theme);
    assert.equal(c.contract.fire, readJson('facet/theme.json').fire);
    assert.equal(validateTheme(c.contract).ok, true);
    checkContent(c, { full: true });
    assert.equal(x.facet.variant, 'full');
    assert.equal(x.facet.contract, true);
    assert.match(x.facet.validatedBy, /^facet /);
    assert.match(fs.readFileSync(path.join(out, 'README.md'), 'utf8'), /\*\*Full\.\*\*/);
    // the same Facet build gives the same bytes, and --check agrees
    const again = path.join(dir, 'again');
    assert.equal(buildInto(again, accept).status, 0);
    for (const f of ['content.json', 'extras.json', 'theme.json', 'README.md']) assert.equal(fs.readFileSync(path.join(again, f), 'utf8'), fs.readFileSync(path.join(out, f), 'utf8'), f);
    assert.equal(buildInto(out, accept, '--check').status, 0);
    // with no Facet to ask, --check rebuilds the variant the files record
    assert.equal(buildInto(out, path.join(dir, 'missing.js'), '--check').status, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a Facet that rejects the full variant gets the 100-component fallback with no contract field', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-facet-variant-'));
  try {
    // accepts a document only when it has no contract field and at most 100 components: the Facet of today
    const strict = stub(dir, 'strict.mjs', "import fs from 'node:fs';\nconst c = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));\nif ('contract' in c || c.components.length > 100) { console.error('INVALID: stub'); process.exit(1); }\nconsole.log('ok: Fire is a valid design system');\n");
    const out = path.join(dir, 'out');
    assert.equal(buildInto(out, strict).status, 0);
    const c = JSON.parse(fs.readFileSync(path.join(out, 'content.json'), 'utf8'));
    const x = JSON.parse(fs.readFileSync(path.join(out, 'extras.json'), 'utf8'));
    assert.equal(c.components.length, 100);
    assert.ok(!('contract' in c));
    checkContent(c);
    assert.equal(x.facet.variant, 'fallback');
    assert.equal(x.facet.contract, false);
    assert.match(x.facet.validatedBy, /^facet /);
    assert.match(fs.readFileSync(path.join(out, 'README.md'), 'utf8'), /full variant was rejected/);
    // the real Facet, when present, takes the fallback too (it accepts older content as well as the full variant)
    if (fs.existsSync(CLI)) {
      const r = spawnSync(process.execPath, [CLI, 'system', 'check', path.join(out, 'content.json')], { encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /100 components/);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('with no Facet CLI the fallback is written and the build says so', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-facet-variant-'));
  try {
    const out = path.join(dir, 'out');
    const r = buildInto(out, path.join(dir, 'missing.js'));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /no Facet CLI found/);
    const x = JSON.parse(fs.readFileSync(path.join(out, 'extras.json'), 'utf8'));
    assert.equal(x.facet.variant, 'fallback');
    assert.equal(x.facet.validatedBy, null);
    assert.match(fs.readFileSync(path.join(out, 'README.md'), 'utf8'), /No Facet build validated it/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
