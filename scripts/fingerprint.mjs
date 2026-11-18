// Fingerprints for the near-duplicate gate (scripts/gate.mjs). Two kinds, both small and deterministic enough to store.
//
// STRUCTURAL fingerprint: what a page is made of, ignoring what it says.
//   The markup is parsed to a tree. Each element that carries fd- classes becomes a node labelled with the sorted set of
//   component ids those classes belong to (contract/catalog.json: classes -> component id). Plain elements (div, span, p)
//   drop out and their children move up. Text, ids, hrefs, data and every attribute value are ignored, except the
//   variant attributes a component declares (data-variant, data-tone, data-size, data-kind, data-state-style).
//   Layout primitives (stack, row, column, grid, grow) are transparent for parent->child pairs, so wrapping a block in
//   one more stack does not change what it is; they count only as single nodes at low weight.
//   The fingerprint is a bag of features with counts:
//     p:parent>child   a Fire component directly inside another (layout and plain elements skipped)   weight 1
//     d:id@depth       a component at a depth in the Fire tree (0, 1, 2, 3+)                          weight 0.5
//     v:id[attr=value] a variant in use                                                               weight 0.5
//     l:layout         a layout primitive                                                             weight 0.25
//   Similarity is the weighted multiset Jaccard of two bags: sum(w*min(a,b)) / sum(w*max(a,b)), 0..1.
//   Why not tree edit distance: it is O(n^2..n^3) per pair and punishes reordering, while "the same screen with the
//   columns swapped" is exactly the case to catch. Pair counts ignore sibling order, so reordering scores 1.0.
//   Why the common chrome does not drown it: every page has fd-page > fd-frame > fd-band; those features are in both
//   bags and count, but a different body (a table against a form) moves most of the weight. The gate's thresholds are
//   calibrated on the real library (scripts/gate.mjs, `--calibrate`), not guessed.
//
// LOOK fingerprint: what a page looks like. A screenshot at 1440 and at 375 wide (one theme, one palette), reduced to a
//   16x16 grayscale grid and hashed by differences between horizontal neighbours (dHash): 256 bits per viewport, as hex.
//   Distance is the share of differing bits, averaged over the two viewports, 0..1. A uniform page hashes to zeros, so
//   the hash is taken after stretching contrast to the page's own range.
import { PNG } from 'pngjs';

const LAYOUT = new Set(['stack', 'row', 'column', 'grid', 'grow']);
const VARIANT_ATTRS = new Set(['data-variant', 'data-tone', 'data-size', 'data-kind']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'use', 'stop']);
const WEIGHT = { p: 1, d: 0.5, v: 0.5, l: 0.25 };

/** Parse markup into { tag, attrs, kids } elements. Scripts, styles, comments and text are dropped. */
export function parseTree(html) {
  html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|template|svg)\b[\s\S]*?<\/\1>/gi, '');
  const root = { tag: '#root', attrs: {}, kids: [] };
  const stack = [root];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*?)(\/?)>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, close, name, rest, self] = m;
    const tag = name.toLowerCase();
    if (close) {
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    const attrs = {};
    for (const a of rest.matchAll(/([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    const el = { tag, attrs, kids: [] };
    stack[stack.length - 1].kids.push(el);
    if (!self && !VOID.has(tag)) stack.push(el);
  }
  return root;
}

/** Component ids for an element: its fd- classes mapped through catalog.classes, plus its fd-* tag's component. */
function labelOf(el, classMap) {
  const ids = new Set();
  for (const c of (el.attrs.class || '').split(/\s+/)) if (classMap[c]) ids.add(classMap[c]);
  if (el.tag.startsWith('fd-') && classMap[el.tag]) ids.add(classMap[el.tag]);
  return [...ids].sort();
}

/**
 * Structural fingerprint of markup (a string, or a tree from parseTree): { features: { key: count }, nodes }.
 * `catalog` supplies classes (class -> id) and component kinds (to know which ids are layout primitives).
 */
export function structuralFingerprint(html, catalog) {
  const classMap = catalog.classes;
  const features = {};
  let nodes = 0;
  const add = (k, n = 1) => { features[k] = (features[k] || 0) + n; };
  const walk = (el, parent, depth) => {
    const ids = el.tag === '#root' ? [] : labelOf(el, classMap);
    let nextParent = parent, nextDepth = depth;
    if (ids.length) {
      const layout = ids.filter((i) => LAYOUT.has(i));
      const real = ids.filter((i) => !LAYOUT.has(i));
      layout.forEach((i) => add(`l:${i}`));
      if (real.length) {
        const label = real.join('+');
        nodes++;
        add(`d:${label}@${Math.min(depth, 3)}`);
        if (parent) add(`p:${parent}>${label}`);
        for (const [a, v] of Object.entries(el.attrs)) if (VARIANT_ATTRS.has(a)) add(`v:${label}[${a}=${v}]`);
        nextParent = label; nextDepth = depth + 1;
      }
    }
    for (const k of el.kids) walk(k, nextParent, nextDepth);
  };
  walk(typeof html === 'string' ? parseTree(html) : html, null, 0);
  return { nodes, features };
}

/** Weighted multiset Jaccard of two structural fingerprints, 0..1. Two empty fingerprints score 0. */
export function structuralSimilarity(a, b) {
  let num = 0, den = 0;
  const keys = new Set([...Object.keys(a.features), ...Object.keys(b.features)]);
  for (const k of keys) {
    const w = WEIGHT[k[0]] ?? 1, x = a.features[k] || 0, y = b.features[k] || 0;
    num += w * Math.min(x, y); den += w * Math.max(x, y);
  }
  return den ? num / den : 0;
}

/** dHash of a PNG buffer: 17x16 grayscale grid, contrast-stretched, 256 bits as 64 hex digits. */
export function dHash(png) {
  const { width: W, height: H, data } = PNG.sync.read(png);
  const GW = 17, GH = 16;
  const grid = new Float64Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) {
    const y0 = Math.floor((gy * H) / GH), y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * H) / GH));
    for (let gx = 0; gx < GW; gx++) {
      const x0 = Math.floor((gx * W) / GW), x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * W) / GW));
      let s = 0, n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * W + x) * 4; s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; n++; }
      grid[gy * GW + gx] = s / n;
    }
  }
  let min = Infinity, max = -Infinity;
  for (const v of grid) { if (v < min) min = v; if (v > max) max = v; }
  const span = max - min || 1;
  let bits = '';
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW - 1; gx++) {
    const l = (grid[gy * GW + gx] - min) / span, r = (grid[gy * GW + gx + 1] - min) / span;
    bits += l > r + 0.03 ? '1' : '0';   // a dead band (3% of the page range) keeps flat areas from flipping on noise
  }
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** Share of differing bits between two equal-length hex hashes, 0..1. */
export function hashDistance(a, b) {
  if (a.length !== b.length) return 1;
  let d = 0;
  for (let i = 0; i < a.length; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { d += x & 1; x >>= 1; } }
  return d / (a.length * 4);
}

/** Look distance between two { w1440, w375 } hash pairs: the mean over the viewports both have, 0..1. */
export function lookDistance(a, b) {
  const ds = ['w1440', 'w375'].filter((k) => a[k] && b[k]).map((k) => hashDistance(a[k], b[k]));
  return ds.length ? ds.reduce((x, y) => x + y, 0) / ds.length : 1;
}

/** Set bits in a hex hash. A hash with few of them is a nearly empty picture and says little about what is on it. */
export function bitCount(hex) {
  let n = 0;
  for (const c of hex) { let x = parseInt(c, 16); while (x) { n += x & 1; x >>= 1; } }
  return n;
}
