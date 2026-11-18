// Consistency of spec/EXPORT.md and spec/export-map.json: the data form parses, documents its keys, cites only known
// checks, names only rules the prose has, never writes a style attribute, and its helpers behave as specified.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const map = JSON.parse(readFileSync(new URL('spec/export-map.json', root), 'utf8'));
const prose = readFileSync(new URL('spec/EXPORT.md', root), 'utf8');
const proseIds = new Set([...prose.matchAll(/^\| ([A-Z]\d+) \|/gm)].map((m) => m[1]));

test('every top-level key is described in the schema', () => {
  const meta = new Set(['$description', 'schema', 'version', 'fire', 'placeholders']);
  for (const key of Object.keys(map)) if (!meta.has(key)) assert.ok(key in map.schema, `schema lacks ${key}`);
  for (const key of Object.keys(map.schema)) assert.ok(key in map, `schema describes missing key ${key}`);
});

test('checks cite only known experiments', () => {
  const known = new Set(Object.keys(map.verification));
  const walk = (node, path) => {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (k === 'check') for (const id of v) assert.ok(known.has(id), `${path}.check cites unknown ${id}`);
      else walk(v, `${path}.${k}`);
    }
  };
  walk(map, '$');
});

test('rule ids in the data form are rows in the prose', () => {
  for (const section of ['text', 'fields', 'specialElements', 'svg', 'lifecycle', 'next', 'theme', 'csp', 'labels', 'facet', 'renderEqual']) {
    for (const id of Object.keys(map[section]).filter((k) => /^[A-Z]\d+$/.test(k))) {
      assert.ok(proseIds.has(id), `${section}.${id} has no row in EXPORT.md`);
    }
  }
});

test('no template writes a style attribute or prop', () => {
  const { forbidden } = map.attributes;
  const text = JSON.stringify({ ...map, attributes: { ...map.attributes, forbidden: [] }, schema: {} });
  assert.doesNotMatch(text, /\bstyle=\\?["{]/, 'a template writes style');
  assert.doesNotMatch(text, /:style=|v-show=|styleMap\(/, 'a template writes a style binding');
  assert.ok(forbidden.some((f) => /style/.test(f.what)));
});

test('React renames are lowercase HTML names mapped to distinct props', () => {
  const rename = map.attributes.rename.react;
  for (const [from, to] of Object.entries(rename)) {
    assert.equal(from, from.toLowerCase(), from);
    assert.notEqual(from, to, from);
  }
  assert.equal(new Set(Object.values(rename)).size, Object.keys(rename).length);
});

test('helpers behave as specified', async () => {
  const source = Object.values(map.helpers).map((h) => h.source).join('\n');
  const mod = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  const json = mod.jsonForScript({ a: '</script><b>' });
  assert.ok(!json.includes('</'), json);
  assert.deepEqual(JSON.parse(json), { a: '</script><b>' });
  assert.equal(mod.ccAttr(false), undefined);
  assert.equal(mod.ccAttr(null), undefined);
  assert.equal(mod.ccAttr(true), '');
  assert.equal(mod.ccAttr(0), '0');
  assert.equal(mod.ccText(true), '');
  assert.equal(mod.ccText(undefined), '');
  assert.equal(mod.ccText(3), '3');
  assert.equal(mod.ccTruthy([]), false);
  assert.equal(mod.ccTruthy([0]), true);
  assert.equal(mod.ccTruthy(''), false);
});

test('the prose shows the same helpers', () => {
  for (const { source } of Object.values(map.helpers)) {
    assert.ok(prose.includes(source.slice(source.indexOf('=>'))), `EXPORT.md lacks ${source.slice(0, 40)}`);
  }
});

test('the static icon form matches what icons.js draws', async () => {
  const { icon } = await import(new URL('fire/js/icons.js', root));
  const drawn = icon('search', {});
  assert.equal(drawn.replace('class="fd-icon "', 'class="fd-icon"').replace('<use href="#i-search"/>', '<use href="#i-search"></use>'),
    map.icons.staticSvg.template.replace('{class}', '').replace('{size}', '').replace('{rest}', '').replaceAll('{name}', 'search'));
});
