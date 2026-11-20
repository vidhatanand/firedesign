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
