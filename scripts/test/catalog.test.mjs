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
  // Classes the CSS defines are all there; the rest are hooks that scripts and module headers use and CSS never styles.
  assert.deepEqual([...defined].filter((c) => !catalog.classes[c]), []);
  assert.deepEqual(Object.keys(catalog.classes).filter((c) => !defined.has(c)).sort(), ['fd-diff-src', 'fd-model-chip-label', 'fd-notification-list', 'fd-sheet-close', 'fd-suggestions-text']);
  const seen = new Map();
  for (const c of catalog.components) for (const cls of c.classes) {
    assert.ok(!seen.has(cls), `${cls} is in both ${seen.get(cls)} and ${c.id}`);
    seen.set(cls, c.id);
    assert.equal(catalog.classes[cls], c.id);
  }
  assert.equal(seen.size, Object.keys(catalog.classes).length);
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
  assert.deepEqual(button.attributes['data-variant'], ['accent-soft', 'danger', 'danger-soft', 'ghost', 'inverse', 'outline', 'primary', 'secondary'], 'button.css: secondary (default)');
  assert.deepEqual(button.attributes['data-size'], ['lg', 'md', 'sm', 'xl', 'xs']);
  assert.deepEqual(button.attributes['data-icon-only'], [''], 'a bare presence attribute is ""');
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
    assert.equal(run('--check').status, 0);
    const file = path.join(dir, 'contract/catalog.json');
    fs.writeFileSync(file, read(file).replace('"fire-', '"fire-x').replace('"id": "button"', '"id": "buttons"'));
    const stale = run('--check');
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /stale: contract\/catalog\.json/);
    assert.equal(run().status, 0);
    assert.equal(run('--check').status, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a component without a card is an error unless --allow-missing, which writes _missing.json', () => {
  const { dir, run } = sandbox();
  try {
    assert.equal(run().status, 0, 'every component has a card');
    fs.rmSync(path.join(dir, 'contract/cards/switch.json'));
    const strict = run();
    assert.equal(strict.status, 1);
    assert.match(strict.stderr, /components? ha(s|ve) no card/);
    assert.equal(run('--allow-missing').status, 0);
    const missing = JSON.parse(read(path.join(dir, 'contract/cards/_missing.json')));
    assert.equal(missing.count, 1);
    assert.deepEqual(missing.components.map((m) => m.id), ['switch']);
    assert.ok(missing.components.every((m) => m.id && m.family && 'docs' in m));
    assert.ok(Array.isArray(missing.variants), '_missing.json lists the card variants the catalogue does not list');
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
    // A variant the catalogue does not list fails a strict build, and is listed in _missing.json with --allow-missing.
    assert.match(run().stderr, /cards\/button\.json: variant data-variant="primery" is not a value the catalogue lists/);
    assert.equal(run('--allow-missing').status, 0);
    assert.ok(JSON.parse(read(path.join(dir, 'contract/cards/_missing.json'))).variants.some((v) => v.includes('data-variant="primery"')));
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

test('allowed values: layout, vocabulary, comment, script and documented-default sources; free attributes are "*"', () => {
  const get = (id) => catalog.components.find((c) => c.id === id).attributes;
  assert.ok(get('texture')['data-fd-ascii'].includes('halftone'), 'a module header documents halftone');
  assert.ok(get('chat')['data-agent'].includes('away'), 'a CSS header documents the agent states');
  assert.ok(part('doc', 'fd-doc-method')['data-method'].includes('patch'), 'a selector list inside :is() is read per alternative');
  assert.ok(get('dialog')['data-size'].includes('md'), 'the documented default');
  assert.deepEqual(get('codeblock')['data-collapse'], ['*']);
  assert.deepEqual(part('menu', 'fd-menu-item')['data-fd-submenu'], ['*']);
});

// ---------- precision: a value belongs to a component only with evidence tied to that component ----------
const comp = (id) => catalog.components.find((c) => c.id === id);
const part = (id, cls) => comp(id).partAttributes[cls] || {};
const everywhere = (id, attr) => [comp(id).attributes[attr], comp(id).stateAttributes[attr], ...Object.values(comp(id).partAttributes).map((p) => p[attr])].filter(Boolean).flat();

test('1. data-variant is not pooled across the forms module', () => {
  for (const id of ['input', 'textarea', 'otp', 'pairs', 'tag-input', 'search']) {
    for (const v of ['ghost', 'steps', 'sticky', 'outline']) assert.ok(!(comp(id).attributes['data-variant'] || []).includes(v), `${id} does not list data-variant="${v}"`);
  }
  assert.deepEqual(comp('select').attributes['data-variant'], ['outline']);
  assert.deepEqual(comp('search').attributes['data-variant'], ['soft']);
  assert.deepEqual(comp('slider').attributes['data-variant'], ['steps']);
  assert.deepEqual(part('form', 'fd-form-actions')['data-variant'], ['sticky']);
  assert.equal(comp('form').attributes['data-variant'], undefined, 'sticky is the actions bar\'s, not the form\'s');
});

test('2. data-state is not pooled: each component has its own, as state the scripts set', () => {
  assert.deepEqual(comp('combobox').stateAttributes['data-state'], ['closed', 'open']);
  assert.deepEqual(comp('secret').stateAttributes['data-state'], ['masked', 'revealed']);
  assert.deepEqual(comp('file-upload').stateAttributes['data-state'], ['done', 'dragover', 'error', 'uploading']);
  assert.deepEqual(comp('field').stateAttributes['data-state'], ['limit', 'near']);
  for (const id of ['combobox', 'field', 'file-upload', 'secret']) {
    assert.equal(comp(id).attributes['data-state'], undefined, `${id}: data-state is not a prop`);
    for (const v of ['copied', 'masked', 'revealed', 'dragover', 'uploading', 'open', 'closed']) {
      const owner = { masked: 'secret', revealed: 'secret', dragover: 'file-upload', uploading: 'file-upload', open: 'combobox', closed: 'combobox', copied: null }[v];
      if (owner !== id) assert.ok(!everywhere(id, 'data-state').includes(v), `${id} does not list data-state="${v}"`);
    }
  }
});

test('3. data-mono: the bare form on the controls, key | value | both on pairs only', () => {
  for (const id of ['input', 'textarea', 'search', 'tag-input', 'input-group', 'number']) assert.deepEqual(comp(id).attributes['data-mono'], [''], id);
  assert.deepEqual(comp('pairs').attributes['data-mono'], ['', 'both', 'key', 'value']);
});

test('4. field: its only variant is schema', () => {
  assert.deepEqual(comp('field').attributes['data-variant'], ['schema']);
  assert.deepEqual(everywhere('field', 'data-variant'), ['schema']);
});

test('5. script-owned attributes are state, not props (tabs: data-indicator, data-overflow)', () => {
  const tabs = comp('tabs');
  assert.equal(tabs.attributes['data-indicator'], undefined);
  assert.equal(tabs.attributes['data-overflow'], undefined);
  assert.deepEqual(tabs.stateAttributes['data-indicator'], ['']);
  assert.deepEqual(tabs.stateAttributes['data-overflow'], ['both', 'end', 'start']);
  for (const id of ['chip-nav', 'subnav']) assert.deepEqual(comp(id).stateAttributes['data-overflow'], ['both', 'end', 'start'], id);
  for (const id of ['menu', 'popover', 'tooltip', 'hovercard']) assert.ok(comp(id).stateAttributes['data-state'].includes('open'), id);
});

test('6. icon sizes are the numeric steps only', () => {
  assert.deepEqual(comp('icon').attributes['data-size'], ['12', '14', '16', '20', '24', '32']);
});

test('7. the layout primitives list the layout attributes GUIDE.md documents for them', () => {
  const grid = comp('grid').attributes;
  assert.deepEqual(grid['data-min'], catalog.globalAttributes['data-min']);
  assert.deepEqual(grid['data-cols'], catalog.globalAttributes['data-cols']);
  assert.deepEqual(grid['data-gap'], catalog.globalAttributes['data-gap']);
  assert.deepEqual(comp('stack').attributes['data-gap'], catalog.globalAttributes['data-gap']);
  assert.deepEqual(comp('row').attributes['data-gap-x'], catalog.globalAttributes['data-gap-x']);
  assert.equal(grid['data-span'], undefined, 'data-span goes on a grid\'s child');
});

test('values on a part stay with the part: loader, app, sidebar, tweaks, texture', () => {
  assert.equal(catalog.classes['fd-bars-loader'], 'loader');
  assert.deepEqual(comp('loader').attributes['data-size'], ['12', '16', '20', '24', '32']);
  const app = comp('app');
  for (const a of ['data-corner', 'data-tone', 'data-marks', 'data-fill']) assert.equal(app.attributes[a], undefined, `app: ${a}`);
  assert.deepEqual(part('app', 'fd-crosshair')['data-corner'], ['', 'bl', 'br', 'tl', 'tr']);
  assert.deepEqual(part('app', 'fd-frame')['data-marks'], ['none']);
  assert.equal(comp('sidebar').attributes['data-side'], undefined);
  assert.deepEqual(part('sidebar', 'fd-rail-tip')['data-side'], ['left']);
  for (const a of ['data-palette', 'data-type']) assert.deepEqual(everywhere('tweaks', a), [], `tweaks: ${a} is the page's, not the panel's`);
  const texture = comp('texture').attributes;
  assert.equal(texture['data-gap'], undefined);
  assert.equal(texture['data-size'], undefined);
  assert.ok(!texture['data-fd-ascii'].includes('any'), '"any registered name" is prose, not a value');
  assert.deepEqual(part('doc', 'fd-doc-top')['data-doc-hide'], ['*'], 'a free attribute');
});

test('no size, variant or type pooled from a neighbour in the same sheet', () => {
  for (const id of ['card', 'empty', 'setting', 'callout', 'qr', 'status', 'feature-list', 'verified']) {
    assert.ok(comp(id).attributes['data-size'].every((v) => ['sm', 'lg'].includes(v)), `${id}: ${comp(id).attributes['data-size']}`);
  }
  for (const id of ['codeblock', 'snippet', 'endpoint', 'json']) assert.ok(!everywhere(id, 'data-variant').includes('terminal'), id);
  for (const id of ['snippet', 'endpoint', 'json']) assert.ok(!everywhere(id, 'data-variant').includes('framed'), id);
  assert.deepEqual(comp('codeblock').attributes['data-variant'], ['framed'], 'docsite.css: .fd-codeblock[data-variant="framed"]');
  assert.deepEqual(comp('donut').attributes['data-type'], ['progress']);
  assert.deepEqual(comp('sparkline').attributes['data-type'], ['bars']);
  assert.deepEqual(comp('stats').attributes['data-variant'], ['cards']);
  assert.deepEqual(comp('accordion').attributes['data-single'], ['']);
});

test('docs anchors: a card\'s example, else a section named for the component', () => {
  for (const c of catalog.components) if (c.card) assert.equal(c.docs, c.card.example, c.id);
  const own = (id, anchor) => { if (!comp(id).card) assert.equal(comp(id).docs, anchor, id); };
  own('popover', 'docs/overlays.html#popovers');
  own('kv', 'docs/data.html#kv');
  own('card', 'docs/content.html#card');
});

test('the lint accepts every value the catalogue lists, on the element that carries it, and Fire\'s pages lint clean', () => {
  const r = spawnSync(process.execPath, ['scripts/lint-markup.mjs', '--json', ...fs.readdirSync(path.join(ROOT, 'docs')).filter((f) => f.endsWith('.html')).map((f) => `docs/${f}`), ...fs.readdirSync(path.join(ROOT, 'templates')).filter((f) => f.endsWith('.html')).map((f) => `templates/${f}`)], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout.slice(0, 2000));
});
