// Small pixel helpers for scripts/build-pictures.mjs, using only what Node ships and pngjs: pad an RGBA image with a
// ground colour, scale it down by area averaging, and write it as an indexed (palette) PNG, which is a fraction of the
// size of a truecolour one for flat interface pictures. Everything here is deterministic: the same pixels give the same bytes.
import zlib from 'node:zlib';
import { PNG } from 'pngjs';

/** Decode a PNG buffer to { width, height, data } (RGBA). */
export const decode = (buf) => { const p = PNG.sync.read(buf); return { width: p.width, height: p.height, data: p.data }; };

/** Put the image on a `pad`-pixel border of `bg` ([r,g,b]). */
export function padImage(img, pad, bg) {
  const W = img.width + 2 * pad, H = img.height + 2 * pad;
  const data = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { data[i * 4] = bg[0]; data[i * 4 + 1] = bg[1]; data[i * 4 + 2] = bg[2]; data[i * 4 + 3] = 255; }
  for (let y = 0; y < img.height; y++) img.data.copy(data, ((y + pad) * W + pad) * 4, y * img.width * 4, (y + 1) * img.width * 4);
  return { width: W, height: H, data };
}

/** Scale to `width` pixels wide (keeping the aspect) by area averaging. Returns the image itself when it is not wider. */
export function scaleDown(img, width) {
  if (img.width <= width) return img;
  const k = img.width / width, H = Math.max(1, Math.round(img.height / k));
  const out = Buffer.alloc(width * H * 4);
  const ky = img.height / H;
  for (let y = 0; y < H; y++) {
    const y0 = y * ky, y1 = (y + 1) * ky;
    for (let x = 0; x < width; x++) {
      const x0 = x * k, x1 = (x + 1) * k;
      let r = 0, g = 0, b = 0, wsum = 0;
      for (let sy = Math.floor(y0); sy < Math.min(img.height, Math.ceil(y1)); sy++) {
        const wy = Math.min(sy + 1, y1) - Math.max(sy, y0);
        for (let sx = Math.floor(x0); sx < Math.min(img.width, Math.ceil(x1)); sx++) {
          const w = wy * (Math.min(sx + 1, x1) - Math.max(sx, x0));
          const i = (sy * img.width + sx) * 4;
          r += img.data[i] * w; g += img.data[i + 1] * w; b += img.data[i + 2] * w; wsum += w;
        }
      }
      const o = (y * width + x) * 4;
      out[o] = Math.round(r / wsum); out[o + 1] = Math.round(g / wsum); out[o + 2] = Math.round(b / wsum); out[o + 3] = 255;
    }
  }
  return { width, height: H, data: out };
}

// ---------------------------------------------------------------- palette

/** Reduce to at most 256 colours by median cut over the distinct colours weighted by how many pixels use them. */
function quantise(img) {
  const n = img.width * img.height, d = img.data;
  const count = new Map();
  for (let i = 0; i < n; i++) { const k = (d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2]; count.set(k, (count.get(k) || 0) + 1); }
  const colours = [...count.entries()].map(([k, c]) => ({ k, c, r: k >> 16, g: (k >> 8) & 255, b: k & 255 })).sort((a, b) => a.k - b.k);
  const lookup = new Map();
  let boxes = [colours];
  while (boxes.length < 256) {
    // split the box with the most pixels times the widest channel range, at the pixel-weighted median
    let best = -1, score = 0, chan = 'r';
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (const ch of ['r', 'g', 'b']) {
        let lo = 255, hi = 0, tot = 0;
        for (const c of box) { if (c[ch] < lo) lo = c[ch]; if (c[ch] > hi) hi = c[ch]; tot += c.c; }
        const s = (hi - lo) * Math.sqrt(tot);
        if (s > score) { score = s; best = i; chan = ch; }
      }
    });
    if (best < 0) break;
    const box = boxes[best].slice().sort((a, b) => a[chan] - b[chan] || a.k - b.k);
    const half = box.reduce((s, c) => s + c.c, 0) / 2;
    let acc = 0, cut = 1;
    for (let i = 0; i < box.length - 1; i++) { acc += box[i].c; cut = i + 1; if (acc >= half) break; }
    boxes.splice(best, 1, box.slice(0, cut), box.slice(cut));
  }
  const palette = boxes.map((box, idx) => {
    let r = 0, g = 0, b = 0, t = 0;
    for (const c of box) { r += c.r * c.c; g += c.g * c.c; b += c.b * c.c; t += c.c; lookup.set(c.k, idx); }
    return [Math.round(r / t), Math.round(g / t), Math.round(b / t)];
  });
  const idx = Buffer.alloc(n);
  for (let i = 0; i < n; i++) idx[i] = lookup.get((d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2]);
  return { palette, idx };
}

const crc = zlib.crc32;
function chunk(type, data) {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, tail]);
}

/** Filter every row of 8-bit samples with `pick(prevRow, row)` -> filter type, return the filtered stream. */
function filtered(idx, W, H, mode) {
  const out = Buffer.alloc((W + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = idx.subarray(y * W, (y + 1) * W), up = y ? idx.subarray((y - 1) * W, y * W) : null;
    let type = 0;
    if (mode === 'adaptive') {
      let best = Infinity;
      for (const t of [0, 1, 2]) {
        let s = 0;
        for (let x = 0; x < W; x++) { const v = (row[x] - (t === 1 ? (x ? row[x - 1] : 0) : t === 2 ? (up ? up[x] : 0) : 0)) & 255; s += v === 0 ? 0 : 1; }
        if (s < best) { best = s; type = t; }
      }
    }
    out[y * (W + 1)] = type;
    for (let x = 0; x < W; x++) out[y * (W + 1) + 1 + x] = (row[x] - (type === 1 ? (x ? row[x - 1] : 0) : type === 2 ? (up ? up[x] : 0) : 0)) & 255;
  }
  return out;
}

/** Encode an opaque RGBA image as an indexed PNG (at most 256 colours); the smaller of two filterings is kept. */
export function encodePalette(img) {
  const { palette, idx } = quantise(img);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.width, 0); ihdr.writeUInt32BE(img.height, 4); ihdr[8] = 8; ihdr[9] = 3;
  const plte = Buffer.from(palette.flat());
  let best = null;
  for (const mode of ['none', 'adaptive']) {
    const z = zlib.deflateSync(filtered(idx, img.width, img.height, mode), { level: 9, memLevel: 9 });
    if (!best || z.length < best.length) best = z;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('IDAT', best), chunk('IEND', Buffer.alloc(0))]);
}
