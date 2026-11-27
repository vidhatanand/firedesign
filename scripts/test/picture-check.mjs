// The per-picture check of pictures.test.mjs (indexed, 300 to 1440 px wide, not blank) and the worker threads that run it
// over the whole set, since decoding the PNGs is what costs the time.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

/** Checks one picture file and returns its size in bytes. */
export function checkPicture(root, file) {
  const buf = fs.readFileSync(path.join(root, file));
  const png = PNG.sync.read(buf);
  assert.ok(png.width <= 1440 && png.width >= 300 && png.height >= 50 && png.height <= 1800, `${file} is ${png.width}x${png.height}`);
  assert.equal(buf[25], 3, `${file} is not an indexed PNG`);
  const seen = new Set();
  for (let i = 0; i < png.width * png.height; i += 7) seen.add(png.data.readUInt32LE(i * 4));
  assert.ok(seen.size > 3, `${file} is blank`);
  return buf.length;
}

/** Checks every file on up to availableParallelism() worker threads; resolves with the total size in bytes, rejects with
 *  the first failure. */
export function checkPicturesInWorkers(root, files) {
  const n = Math.max(1, Math.min(os.availableParallelism(), files.length));
  return Promise.all(Array.from({ length: n }, (_, k) => new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { root, files: files.filter((_, i) => i % n === k) } });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) => { if (code !== 0) reject(new Error(`picture check worker exited with ${code}`)); });
  }))).then((sizes) => sizes.reduce((a, b) => a + b, 0));
}

if (!isMainThread && workerData?.files) {
  parentPort.postMessage(workerData.files.reduce((sum, file) => sum + checkPicture(workerData.root, file), 0));
}
