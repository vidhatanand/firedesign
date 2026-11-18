// node --test scripts/test/tagging.test.mjs : surfaces are declared, read and shown the same way everywhere.
// (surface-mismatch is tested in lint-markup.test.mjs, the find output in find.test.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const catalog = JSON.parse(read('contract/catalog.json'));
const index = JSON.parse(read('contract/index.json'));

test('data-fd-surface is a global attribute of the catalogue, with the four surfaces', () => {
  assert.deepEqual(catalog.globalAttributes['data-fd-surface'], ['app', 'email', 'phone', 'website']);
});

test('the Facet export carries the surfaces and the kind as a last line of the purpose', () => {
  const content = JSON.parse(read('facet/content.json'));
  const order = ['app', 'website', 'phone', 'email'];
  const byName = new Map(catalog.components.map((c) => [c.id.replace(/(^|-)([a-z0-9])/g, (_, __, ch) => ch.toUpperCase()), c]));
  let n = 0;
  for (const entry of content.components) {
    const m = /\nSurfaces: ([a-z, ]+)\. Kind: ([a-z]+)\.$/.exec(entry.purpose);
    assert.ok(m, `${entry.name}: purpose ends with the Surfaces line`);
    const c = byName.get(entry.name);
    if (!c) continue;
    n++;
    assert.deepEqual(m[1].split(', '), [...c.card.surfaces].sort((a, b) => order.indexOf(a) - order.indexOf(b)), entry.name);
    assert.equal(m[2], c.kind, entry.name);
    assert.ok(entry.purpose.length <= 500, `${entry.name}: purpose within Facet's 500 characters`);
  }
  assert.ok(n > 100, 'most entries were matched back to a catalogue component');
});

test('the catalogue page is in the docs navigation and reads the index it ships with', () => {
  assert.match(read('docs/docs.js'), /\['catalogue', 'Catalogue'/);
  const html = read('docs/catalogue.html');
  assert.match(html, /src="catalogue\.js"/);
  assert.match(read('docs/catalogue.js'), /\.\.\/contract\/index\.json/);
});

test('every docs section a card names exists, so its surface tags can be placed', () => {
  const missing = [];
  const pages = new Map();
  for (const e of index.entries) {
    if (e.kind === 'template' || !e.docs.startsWith('docs/')) continue;
    const [file, id] = e.docs.split('#');
    if (!pages.has(file)) pages.set(file, read(file));
    if (!new RegExp(`<section class="doc-section"[^>]*\\bid="${id}"`).test(pages.get(file))) missing.push(`${e.id} -> ${e.docs}`);
  }
  assert.deepEqual(missing, []);
});

test('the catalogue page lists a template by its path from docs/', () => {
  const t = index.entries.find((e) => e.kind === 'template');
  assert.ok(fs.existsSync(path.join(ROOT, t.docs)), t.docs);
});
