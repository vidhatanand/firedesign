// node --test scripts/test/version.test.mjs : the version is stated the same everywhere (scripts/version.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from '../version.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('every place that states the version agrees with package.json, and the changelog has its entry', () => {
  const { version, problems } = check();
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(problems, []);
});

test('no document states an earlier release as the present', () => {
  // History is fine ("added in 0.7", a changelog entry, a `since`). These phrasings claim the present.
  const claims = /\bFire 0\.\d+ (works|ships|is|has|adds|supports)\b|Design system · 0\.\d+|\bStatus: Fire 0\.\d+\b|# Fire 0\.\d+ architecture/;
  const minor = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version.split('.').slice(0, 2).join('.');
  const files = ['README.md', 'GUIDE.md', 'AGENT-RULES.md', 'DESIGN.md', 'spec/ARCHITECTURE.md', 'spec/EXPORT.md',
    ...fs.readdirSync(path.join(ROOT, 'docs')).filter((f) => f.endsWith('.html')).map((f) => `docs/${f}`),
    ...['lit-vite', 'next', 'vue-vite'].map((s) => `starters/${s}/README.md`)];
  const stale = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of text.matchAll(new RegExp(claims.source, 'g'))) if (!m[0].includes(minor)) stale.push(`${f}: "${m[0]}"`);
  }
  assert.deepEqual(stale, []);
});
