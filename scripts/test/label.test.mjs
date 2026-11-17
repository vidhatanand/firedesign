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
