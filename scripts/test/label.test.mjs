// node --test scripts/test/ : label() lookup order and placeholders, against a stub document.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = {
  readyState: 'complete',
  querySelectorAll: () => [],
  querySelector: (sel) => (sel.includes('data-fd-labels') ? { textContent: '{"menu.open": "Menü öffnen", "secret.show": "{noun} anzeigen"}' } : null),
};
const { label } = await import('../../fire/js/core.js');
const el = (attrs, parent) => ({ closest(sel) { const a = sel.slice(1, -1); return a in attrs ? { getAttribute: () => attrs[a] } : parent?.closest(sel) ?? null; } });

test('page dictionary beats the English default', () => {
  assert.equal(label(el({}), 'menu.open', 'Open menu'), 'Menü öffnen');
  assert.equal(label(null, 'menu.close', 'Close menu'), 'Close menu');
});
test('data-label attribute on the element or an ancestor beats the dictionary', () => {
  const root = el({ 'data-label-menu-open': 'Ouvrir' });
  assert.equal(label(el({}, root), 'menu.open', 'Open menu'), 'Ouvrir');
});
test('placeholders are filled and unknown ones stay', () => {
  assert.equal(label(null, 'secret.show', 'Show {noun}', { noun: 'Schlüssel' }), 'Schlüssel anzeigen');
  assert.equal(label(null, 'x.y', 'A {a} {b}', { a: 1 }), 'A 1 {b}');
});

// Every key a label() call in fire/js uses is listed, with the same English default, in the table in core.js's label()
// comment and in docs/writing.html#translating, and the two lists are identical.
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
  const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  // Keys built at run time: the template, and what it expands to.
  const DYNAMIC = {
    'color.${key}.${level}': ['color.page.pass', 'color.page.warn', 'color.page.fail', 'color.accent.pass', 'color.accent.fail'],
    'status.${status}': ['status.operational', 'status.degraded', 'status.outage', 'status.maintenance'],
    'theme.${key}': ['theme.light', 'theme.dark', 'theme.system'],
  };
  const used = new Set();
  for (const f of fs.readdirSync(path.join(ROOT, 'fire/js')).filter((n) => n.endsWith('.js'))) {
    for (const m of read(`fire/js/${f}`).matchAll(/(?<![\w.$])(?:fdLabel|label)\(\s*[^,()]*(?:\([^()]*\))?[^,()]*,\s*(['"`])([a-z][\w-]*\.[^'"`]+)\1/g)) {
      if (m[2].includes('${')) { assert.ok(DYNAMIC[m[2]], `${f}: label key ${m[2]} is built at run time: add what it expands to in scripts/test/label.test.mjs`); DYNAMIC[m[2]].forEach((k) => used.add(k)); }
      else used.add(m[2]);
    }
  }
  const core = read('fire/js/core.js');
  const comment = core.slice(core.indexOf('Keys and English defaults'), core.indexOf('let dictionary'));
  const inCore = new Map([...comment.matchAll(/(?<![\w."-])([a-z][\w-]*\.[\w.-]+) "([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const page = read('docs/writing.html');
  const table = page.slice(page.indexOf('Labels Fire writes'), page.indexOf('</table>', page.indexOf('Labels Fire writes')));
  const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const inDocs = new Map([...table.matchAll(/<tr><td><span class="fd-mono">([^<]+)<\/span><\/td><td>([^<]*)<\/td>/g)].map((m) => [m[1], unescape(m[2])]));
  const diff = (a, b) => [...a].filter((k) => !b.has(k)).sort();

  test('every label key fire/js uses is in the table in core.js label()', () => {
    assert.ok(used.size > 60, `found ${used.size} keys`);
    assert.deepEqual(diff(used, inCore), [], 'used in fire/js, missing from the comment in core.js');
    assert.deepEqual(diff(inCore.keys(), used), [], 'listed in core.js, no label() call uses it');
  });
  test('docs/writing.html#translating lists the same keys, with the same English defaults', () => {
    assert.deepEqual(diff(used, inDocs), [], 'used in fire/js, missing from docs/writing.html');
    assert.deepEqual(diff(inDocs.keys(), used), [], 'listed in docs/writing.html, no label() call uses it');
    for (const [k, d] of inCore) assert.equal(inDocs.get(k), d, `${k}: default differs between core.js and docs/writing.html`);
  });
}
