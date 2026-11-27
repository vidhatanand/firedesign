// The check every generated palette must pass (shared by theme.test.mjs and its worker threads), and the sweep that
// runs it over many accents on a few worker threads.
import assert from 'node:assert/strict';
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { paletteFrom } from '../../fire/js/theme.js';
import { PALETTE_TOKENS } from '../../fire/js/palettes.js';
import { paletteFailures } from '../../fire/js/palette-rules.js';

/** Every rule, plus: the result is in the presets' form, and an accent that is not the one asked for is noted. */
export function assertGood(p, asked, context) {
  assert.deepEqual(Object.keys(p.tokens), PALETTE_TOKENS, `${context}: token set`);
  for (const k of PALETTE_TOKENS) assert.equal(p.tokens[k].length, 2, `${context}: ${k} is a [light, dark] pair`);
  assert.deepEqual(paletteFailures(p.tokens, { name: context }), []);
  if (asked && p.tokens['--fd-accent'][0] !== asked) assert.ok(p.notes.some((n) => n.startsWith(`Accent ${asked} moved to ${p.tokens['--fd-accent'][0]}`)), `${context}: the moved accent is noted`);
  if (asked && p.tokens['--fd-accent'][0] === asked) assert.ok(!p.notes.some((n) => n.startsWith('Accent ')), `${context}: nothing moved, nothing noted`);
  // A generated palette is reproducible from its own spec.
  const again = paletteFrom(p.spec);
  assert.deepEqual(again.tokens, p.tokens, `${context}: paletteFrom(p.spec) reproduces it`);
}

/** Runs assertGood over [{ accent, neutral }] on up to availableParallelism() worker threads; resolves with the count
 *  checked, rejects with the first failure (its message names the accent and neutral). */
export function sweep(cases) {
  const n = Math.max(1, Math.min(os.availableParallelism(), cases.length));
  return Promise.all(Array.from({ length: n }, (_, k) => new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { cases: cases.filter((_, i) => i % n === k) } });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) => { if (code !== 0) reject(new Error(`palette sweep worker exited with ${code}`)); });
  }))).then((counts) => counts.reduce((a, b) => a + b, 0));
}

if (!isMainThread && workerData?.cases) {
  for (const { accent, neutral } of workerData.cases) assertGood(paletteFrom({ from: 'accent', accent, neutral }), accent, `${accent} ${neutral}`);
  parentPort.postMessage(workerData.cases.length);
}
