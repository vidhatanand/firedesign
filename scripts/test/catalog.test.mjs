// node --test scripts/test/ : the catalogue build, its schemas, the cards and the shared helpers the audit uses.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import { ROOT, read, stripCss, attributeSheets, collectAttrValues } from '../lib/source.mjs';
import { buildCatalog } from '../build-catalog.mjs';

const json = (f) => JSON.parse(read(path.join(ROOT, f)));
const catalog = json('contract/catalog.json');
const cardSchema = json('contract/cards/card.schema.json');
const catalogSchema = json('contract/catalog.schema.json');

test('catalog.json validates against catalog.schema.json', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  ajv.addSchema(cardSchema);
  const validate = ajv.compile(catalogSchema);
  assert.ok(validate(catalog), JSON.stringify(validate.errors?.slice(0, 5), null, 1));
});

test('both schemas are valid JSON Schema 2020-12', () => {
  const ajv = new Ajv2020({ strict: true });
  assert.ok(ajv.validateSchema(cardSchema));
  assert.ok(ajv.validateSchema(catalogSchema));
});

test('every fd- class the CSS defines is assigned to exactly one component', () => {
  const files = ['fire/base.css', 'fire/layout.css', ...fs.readdirSync(path.join(ROOT, 'fire/components')).filter((f) => f.endsWith('.css')).map((f) => `fire/components/${f}`)];
  const defined = new Set();
  for (const f of files) for (const rule of stripCss(read(path.join(ROOT, f))).matchAll(/([^{}]+)\{/g)) {
    if (!rule[1].trim().startsWith('@')) for (const m of rule[1].matchAll(/\.(fd-[a-z0-9]+(?:-[a-z0-9]+)*)/g)) defined.add(m[1]);
  }
  assert.deepEqual(Object.keys(catalog.classes).sort(), [...defined].sort());
  const seen = new Map();
  for (const c of catalog.components) for (const cls of c.classes) {
    assert.ok(!seen.has(cls), `${cls} is in both ${seen.get(cls)} and ${c.id}`);
    seen.set(cls, c.id);
    assert.equal(catalog.classes[cls], c.id);
  }
  assert.equal(seen.size, defined.size);
  for (const c of catalog.components) assert.ok(c.classes.includes(c.root), `${c.id} lists its root`);
});

test('component ids are unique and every VOCABULARY root is a component or a part', async () => {
  const ids = catalog.components.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  const roots = new Set(catalog.components.map((c) => c.root));
  const text = read(path.join(ROOT, 'docs/_ref/VOCABULARY.md'));
  for (const m of text.matchAll(/^- \*\*[^*]+\*\*: (.*)$/gm)) {
    for (const name of m[1].replace(/\([^)]*\)/g, ' ').matchAll(/`(fd-[a-z0-9-]+)`/g)) {
      assert.ok(catalog.classes[name[1]], `${name[1]} from VOCABULARY.md is a class of some component`);
    }
  }
  assert.ok(roots.has('fd-btn') && roots.has('fd-table') && roots.has('fd-dialog'));
});

test('the catalogue lists attribute values from the styles', () => {
  const button = catalog.components.find((c) => c.id === 'button');
  assert.deepEqual(button.attributes['data-variant'], ['accent-soft', 'danger', 'danger-soft', 'ghost', 'inverse', 'outline', 'primary']);
  assert.deepEqual(button.attributes['data-size'], ['lg', 'sm', 'xl', 'xs']);
  assert.deepEqual(button.attributes['data-icon-only'], []);
  assert.ok(catalog.globalAttributes['data-gap'].includes('4'));
  assert.ok(catalog.events['fd:select'].detail.includes('value'));
  assert.ok(catalog.icons.includes('home') && catalog.tokens.includes('--fd-bg'));
  assert.ok(catalog.templates.some((t) => t.path === 'templates/overview.html' && t.job.length > 10));
});

test('the three reference cards are valid and merged into the catalogue', () => {
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(cardSchema);
  for (const id of ['button', 'table', 'dialog']) {
    const card = json(`contract/cards/${id}.json`);
    assert.ok(validate(card), `${id}: ${JSON.stringify(validate.errors)}`);
    assert.equal(card.id, id);
    assert.deepEqual(catalog.components.find((c) => c.id === id).card, card);
  }
});

test('a card missing a required field is rejected', () => {
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(cardSchema);
  const card = json('contract/cards/button.json');
  for (const field of cardSchema.required) {
    const copy = { ...card }; delete copy[field];
    assert.ok(!validate(copy), `a card without ${field} must fail`);
  }
  assert.ok(!validate({ ...card, job: 'Starts things' }), 'job ends with a full stop and is a sentence');
  assert.ok(!validate({ ...card, surfaces: ['kiosk'] }));
});

test('the build reproduces the committed files', async () => {
  const { catalog: fresh, errors } = await buildCatalog({ allowMissing: true });
  assert.deepEqual(errors, []);
  assert.equal(JSON.stringify(fresh, null, 2) + '\n', read(path.join(ROOT, 'contract/catalog.json')));
});

// Runs the build in a copy of the repository, so the real files are never touched.
function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-catalog-'));
  for (const d of ['scripts', 'fire', 'docs', 'templates', 'contract']) {
    fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true, filter: (src) => !src.includes(`${path.sep}fonts`) });
  }
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  const run = (...args) => spawnSync(process.execPath, ['scripts/build-catalog.mjs', ...args], { cwd: dir, encoding: 'utf8' });
  return { dir, run };
}

test('--check passes when fresh, fails when the committed file differs, and a rebuild repairs it', () => {
  const { dir, run } = sandbox();
  try {
    assert.equal(run('--allow-missing', '--check').status, 0);
    const file = path.join(dir, 'contract/catalog.json');
    fs.writeFileSync(file, read(file).replace('"fire-', '"fire-x').replace('"id": "button"', '"id": "buttons"'));
    const stale = run('--allow-missing', '--check');
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /stale: contract\/catalog\.json/);
    assert.equal(run('--allow-missing').status, 0);
    assert.equal(run('--allow-missing', '--check').status, 0);
    fs.rmSync(path.join(dir, 'contract/cards/_missing.json'));
    assert.equal(run('--allow-missing', '--check').status, 1, 'a missing _missing.json is stale too');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a component without a card is an error unless --allow-missing, which writes _missing.json', () => {
  const { dir, run } = sandbox();
  try {
    const strict = run();
    assert.equal(strict.status, 1);
    assert.match(strict.stderr, /components have no card/);
    fs.rmSync(path.join(dir, 'contract/cards/_missing.json'));
    assert.equal(run('--allow-missing').status, 0);
    const missing = JSON.parse(read(path.join(dir, 'contract/cards/_missing.json')));
    assert.equal(missing.count, catalog.components.length - 3);
    assert.ok(missing.components.every((m) => m.id && m.family && 'docs' in m));
    assert.ok(!missing.components.some((m) => ['button', 'table', 'dialog'].includes(m.id)));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a class that fits no component, and a broken card, fail the build', () => {
  const { dir, run } = sandbox();
  try {
    fs.appendFileSync(path.join(dir, 'fire/components/button.css'), '\n.fd-zzz-unplaced { color: inherit; }\n');
    const r = run('--allow-missing');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /class fd-zzz-unplaced fits no component/);
    fs.copyFileSync(path.join(ROOT, 'fire/components/button.css'), path.join(dir, 'fire/components/button.css'));
    const card = path.join(dir, 'contract/cards/button.json');
    const parsed = JSON.parse(read(card));
    fs.writeFileSync(card, JSON.stringify({ ...parsed, related: ['no-such-component', ...parsed.related] }));
    const r2 = run('--allow-missing');
    assert.equal(r2.status, 1);
    assert.match(r2.stderr, /related "no-such-component" is not a component/);
    fs.writeFileSync(card, read(path.join(ROOT, 'contract/cards/button.json')).replace('"value": "primary"', '"value": "primery"'));
    assert.match(run('--allow-missing').stderr, /variant data-variant="primery" is not a value the styles define/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// The audit's attribute check reads the shared collector; this is the code it had before the extraction.
function referenceKnown() {
  const sheets = attributeSheets();
  const known = new Map();
  const note = (ctx, attr, value) => { const k = `${ctx}|${attr}`; if (!known.has(k)) known.set(k, new Set()); known.get(k).add(value); };
  for (const f of sheets) {
    const text = stripCss(read(f));
    for (const rule of text.matchAll(/([^{}]+)\{/g)) {
      for (const selector of rule[1].split(/,(?![^()[\]]*[)\]])/)) {
        const attrs = [...selector.matchAll(/\[(data-[a-z0-9-]+)[~|^$*]?="([^"]*)"\]/g)];
        if (!attrs.length) continue;
        const classes = [...selector.matchAll(/\.(fd-[a-z0-9-]+)/g)].map((m) => m[1]);
        const contexts = classes.length ? classes : (f.endsWith('layout.css') ? ['*'] : []);
        for (const [, attr, value] of attrs) for (const ctx of contexts) note(ctx, attr, value);
      }
    }
  }
  return known;
}

test('the shared attribute collector gives the audit exactly what its own code gave', () => {
  const now = collectAttrValues(attributeSheets());
  const before = referenceKnown();
  assert.deepEqual([...now.keys()].sort(), [...before.keys()].sort());
  for (const [k, set] of before) assert.deepEqual([...now.get(k)].sort(), [...set].sort(), k);
  assert.ok(now.size > 200);
});

test('the audit still reports no errors', () => {
  const r = spawnSync(process.execPath, ['scripts/audit.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /totals: ERROR=0 /);
  assert.match(r.stdout, /literals=0 inline=0 attrs=0/);
});
