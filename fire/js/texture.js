/* Fire texture & loading — the signature layer.
 *
 * ---------------------------------------------------------------------------
 * Generative character fields
 *   <div class="fd-ascii" data-fd-ascii="terrain" aria-hidden="true"></div>
 *
 *   Fills its positioned parent (or flows with `data-inline` and a height). The field is
 *   drawn into a <canvas> at devicePixelRatio, sized by a ResizeObserver, and coloured by
 *   the element's CSS `color` (so tone, theme and accent all come from CSS).
 *
 *   data-fd-ascii     terrain | waves | orbit | rain | grid | flame | halftone | spark | contour | stipple | bars | auto
 *                     or a field you registered; absent or "auto" takes the page's signature field (below)
 *   data-tone         neutral (default) | accent | contrast            (CSS only)
 *   data-fade         left | right | top | bottom | x | y | radial     (CSS mask; "left" fades out toward the left)
 *   data-style        chars (default) | dots | squares | plus | dashes   (the mark: dots are halftone discs; squares, plus
 *                     signs and dashes are drawn shapes whose size follows the ramp, all in the element's colour)
 *   data-ramp         default | soft | dense | glyph | rain, or a literal ramp such as " .:-=+*#"
 *   data-cell         cell size in px, "7x12" (default), "8" for square; dots default to "8x8"
 *   data-seed         number or string; defaults to the pattern name, so a page always looks the same
 *   data-animate      "true" | "false"; waves, orbit, rain and flame animate by default
 *   data-speed        time multiplier (default 1)
 *   data-intensity    luminance multiplier (default 1)
 *   data-interactive  characters near the pointer step up the ramp in a soft radius
 *   data-origin       "x,y" in 0..1 for orbit, flame, halftone and spark
 *   data-side         terrain: which side rises, "right" (default) | "left"
 *   data-variant      grid: "flat" (default) | "perspective"
 *   data-shape        "blob": clip any field to a soft, noisy disc
 *   data-signature    "own": pin the instance to its own field, mark, cell, ramp and intensity, whatever the page's dials say
 *
 *   Animation runs at ~12 fps on a shared requestAnimationFrame loop, pauses off-screen
 *   (IntersectionObserver) and in background tabs, and is a single static frame under
 *   prefers-reduced-motion. Colours are re-read on `fd:theme`, `fd:accent` and OS scheme changes.
 *
 * The page's signature
 *   Five attributes on <html> restyle every instance at once. Per option: an instance pinned with data-signature="own"
 *   keeps all its own options; otherwise a page dial that is set (not "auto") wins over the instance's own option;
 *   otherwise the instance's own option; otherwise Fire's default. With every dial on auto nothing changes. Fire's theme record writes them (fire/js/theme.js, "signature"),
 *   and so does the Tweaks panel. Changing one restyles every mounted field, glyph and loader at once.
 *     data-signature-field      a field name | auto (default: each instance keeps its own)   → data-fd-ascii
 *     data-signature-mark       chars | dots | squares | plus | dashes | auto                 → data-style
 *     data-signature-cell       cell width in px, 4 to 24 (height follows: 1.7× for characters, square for marks) → data-cell
 *     data-signature-ramp       default | soft | dense | glyph | rain | auto                  → data-ramp
 *     data-signature-intensity  luminance multiplier, 0.4 to 1.6 (default 1)                 → data-intensity
 *   The fifth dial, data-signature-marks (crosses | dots | corners | none), is the frame's: shell.css reads it.
 *
 * Glyph (empty states)
 *   <span class="fd-glyph" aria-hidden="true"></span>      data-size 40|48|56|64, data-tone, data-fd-ascii
 *
 * Text loaders
 *   <span class="fd-braille" role="status">Loading sessions…</span>   a braille frame is prepended and cycled
 *   <span class="fd-dots" role="status" aria-label="Loading"></span>    three dots are filled in
 *   <span class="fd-bars-loader" role="status" aria-label="Loading"></span>
 *
 * Skeleton screens
 *   An empty .fd-skeleton-{card|grid|table|stat|chart|list|thread|form|hero|page} or
 *   .fd-skeleton-text[data-lines] is filled with its parts on init, from fire/js/skeleton.js (fire-design/skeleton),
 *   which returns the same markup as a string for a page's static HTML. A preset that has children is left alone.
 *   data-rows, data-cols (table, list), data-count (grid, stat, form fields), data-variant="bars" (chart).
 *
 * Late line
 *   <p class="fd-skeleton-late">Still loading. This is taking longer than usual.</p>   inside a loading region
 *   Hidden (its space kept) until --fd-skeleton-late (6s) has passed while the region loads, then shown; the script
 *   adds a polite status inside it and writes the words there at that moment, so they are announced once per load,
 *   and empties it when loading ends.
 *
 * Content swap
 *   <div data-fd-loading="true">
 *     <div class="fd-skeleton-table" data-rows="5"></div>
 *     <div>…real content…</div>
 *   </div>
 *   setLoading(el, false) cross-fades to the content and sets aria-busy.
 *   Emits fd:change { value: 'loading' | 'ready' } on the container.
 *
 * Page bar
 *   pagebar.start(), pagebar.set(0..1), pagebar.done(); createPagebar(host) for a bar scoped to `host`.
 *
 * Exports: init, render, fields, registerField, ramps, renderText, setLoading, pagebar, createPagebar, MARKS, SIGNATURE_ATTRIBUTES
 * ------------------------------------------------------------------------- */

import { emit, reducedMotion, clamp } from './core.js';
import { SKELETON_PRESETS, skeletonParts } from './skeleton.js';

/* ======================================================================
   Noise: a seeded integer hash, value noise in 3D, fBm with rotated octaves.
   ====================================================================== */

function hash3(x, y, z, seed) {
  let h = seed ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x1b873593);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hashString(value) {
  const text = String(value);
  if (/^\d+$/.test(text)) return Number(text) >>> 0;
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
/** Hermite step from e0 to e1 (e0 may be greater than e1 for a falling edge). */
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;

function makeNoise(seed) {
  const noise = (x, y = 0, z = 0) => {
    const xi = Math.floor(x); const yi = Math.floor(y); const zi = Math.floor(z);
    const u = fade(x - xi); const v = fade(y - yi); const w = fade(z - zi);
    const a = lerp(lerp(hash3(xi, yi, zi, seed), hash3(xi + 1, yi, zi, seed), u), lerp(hash3(xi, yi + 1, zi, seed), hash3(xi + 1, yi + 1, zi, seed), u), v);
    if (w === 0) return a;
    const b = lerp(lerp(hash3(xi, yi, zi + 1, seed), hash3(xi + 1, yi, zi + 1, seed), u), lerp(hash3(xi, yi + 1, zi + 1, seed), hash3(xi + 1, yi + 1, zi + 1, seed), u), v);
    return lerp(a, b, w);
  };
  const fbm = (x, y = 0, z = 0, octaves = 4) => {
    let sum = 0; let amp = 0.5; let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x, y, z);
      norm += amp;
      const nx = (0.8 * x - 0.6 * y) * 2 + 17.13;
      y = (0.6 * x + 0.8 * y) * 2 + 3.71;
      x = nx;
      z = z * 2 + 5.3;
      amp *= 0.5;
    }
    return sum / norm;
  };
  const salt = seed ^ 0x5bd1e995;
  const rand = (a, b = 0, c = 0) => hash3(a, b, c, salt);
  return { noise, fbm, rand };
}

/* ======================================================================
   Ramps and the field registry
   ====================================================================== */

/** Character ramps, sparse to dense. Index 0 is always the empty cell. Tuned for a 0.6em monospace (Geist Mono). */
export const ramps = {
  default: ' .:-=+*x#%@',
  soft: ' .·:-=+*',
  dense: " .':-=+*xX#%&@",
  glyph: ' .:+*#%@',
  rain: ' .·:;|',
};

/** name → { sample, prepare, animate, ramp, style, chars, cell, speed } */
export const fields = new Map();
/** Every mounted field element (declared early: registerField refreshes live instances). */
const instances = new Set();

/**
 * Register a field. `sample(x, y, env, col, row)` returns luminance 0..1 for a cell centre
 * (x, y in 0..1 of the box). It may set `env.char` to force a specific character.
 * `env` carries: w, h, A (aspect w/h), cols, rows, cw, ch, t (seconds), noise(x,y,z), fbm(x,y,z,octaves),
 * rand(a,b,c), origin ([x,y] | null), side, variant, state (persistent per element).
 * Options: prepare(env) once per frame, animate (default false), ramp, style, chars (extra
 * glyphs `env.char` may use), charRamp (the ramp when a field whose own style is dots is drawn as characters),
 * cell ([w,h] default), speed.
 */
export function registerField(name, sample, options = {}) {
  const field = {
    name,
    sample,
    prepare: options.prepare || null,
    animate: Boolean(options.animate),
    ramp: options.ramp || 'default',
    charRamp: options.charRamp || 'default',
    style: options.style || 'chars',
    chars: options.chars || '',
    cell: options.cell || null,
    speed: options.speed ?? 1,
  };
  fields.set(name, field);
  for (const inst of instances) if (inst.field?.name === name) inst.refresh(true);
  return field;
}

/* ---------- terrain: stacked ridgelines, denser toward the front and one side ---------- */
const TERRAIN_LAYERS = 5;
registerField('terrain', (x, y, env, c, r) => {
  const s = env.state;
  const side = env.side === 'left' ? 1 - x : x;
  for (let k = TERRAIN_LAYERS - 1; k >= 0; k--) {
    const top = s.ridge[k * env.cols + c];
    if (y < top) continue;
    const kk = k / (TERRAIN_LAYERS - 1);
    const depth = (y - top) * env.rows;
    let l = 0.07 + 0.2 * kk + 0.3 * smooth(0, 11, depth) + 0.24 * smooth(0.6, 1, y) * side;
    l += (env.fbm(x * env.A * 9 + k * 13.1, y * 7, k, 3) - 0.5) * 0.34;
    if (depth < 1) l += 0.16 + 0.1 * kk;
    return l * (0.6 + 0.45 * smooth(0, 0.95, side));
  }
  return env.rand(c, r, 7) < 0.014 * (1 - y) * smooth(0.15, 0.85, side) ? 0.12 : 0;
}, {
  prepare(env) {
    const s = env.state;
    const size = env.cols * TERRAIN_LAYERS;
    if (!s.ridge || s.ridge.length !== size) s.ridge = new Float32Array(size);
    for (let k = 0; k < TERRAIN_LAYERS; k++) {
      const kk = k / (TERRAIN_LAYERS - 1);
      const freq = lerp(2.2, 1.25, kk);
      const base = lerp(0.6, 1.08, kk);
      const amp = lerp(0.34, 0.32, kk);
      const drift = env.t * 0.012 * (k + 1);
      for (let c = 0; c < env.cols; c++) {
        const x = env.cx(c);
        const side = env.side === 'left' ? 1 - x : x;
        const u = x * env.A + drift + k * 3.7;
        const n = env.fbm(u * freq, k * 7.7, 0, 4);
        const ridge = Math.pow(1 - Math.abs(2 * n - 1), 2.2);
        const roll = env.fbm(u * freq * 0.35 + 11, k * 3.3, 0, 2);
        const height = 0.7 * ridge + 0.3 * roll;
        const rise = 0.32 * smooth(0.05, 1, side) * (1 - kk * 0.45);
        s.ridge[k * env.cols + c] = clamp(base - amp * height - rise + 0.12 * (1 - side), 0.1, 1.4);
      }
    }
  },
});

/* ---------- waves: slow interference ribbons with long calm gaps ---------- */
registerField('waves', (x, y, env, c) => {
  const u = x * env.A;
  const t = env.t;
  const centres = env.state.centres;
  let band = 0;
  for (let i = 0; i < 3; i++) {
    const d = (y - centres[c * 3 + i]) / (0.06 + 0.022 * i);
    band += Math.exp(-d * d) * (0.75 - i * 0.12);
  }
  if (band < 0.02) return 0;
  const beat = 0.5 + 0.28 * Math.sin(u * 2.4 - t * 0.45 + 2 * env.noise(u * 0.7, y * 3, t * 0.08)) + 0.22 * Math.sin(u * 3.7 + y * 6 + t * 0.3);
  const patch = smooth(0.3, 0.64, env.fbm(u * 0.5 - t * 0.035, y * 1.4, 4.2, 3));
  const edge = smooth(0, 0.16, x) * smooth(1, 0.84, x);
  return Math.min(1, band * 1.3) * (0.25 + 0.75 * beat) * (0.3 + 0.7 * patch) * edge;
}, {
  animate: true,
  ramp: 'soft',
  prepare(env) {
    const s = env.state;
    if (!s.centres || s.centres.length !== env.cols * 3) s.centres = new Float32Array(env.cols * 3);
    const t = env.t;
    for (let c = 0; c < env.cols; c++) {
      const u = env.cx(c) * env.A;
      for (let i = 0; i < 3; i++) {
        const dir = i % 2 ? -1 : 1;
        s.centres[c * 3 + i] = 0.5 + (i - 1) * 0.07
          + 0.13 * Math.sin(u * (0.62 + i * 0.29) + i * 2.3 + t * (0.16 + i * 0.05) * dir)
          + 0.1 * (env.fbm(u * 0.4 + t * 0.03 * dir, i * 5.1, 0, 2) - 0.5);
      }
    }
  },
});

/* ---------- orbit: tilted rings around an off-centre body, a rotating lit arc, three satellites ---------- */
const ORBIT_TILT = 3;
const ORBIT_FREQ = 2.7;
const ORBIT_BODY = 0.15;
registerField('orbit', (x, y, env, c, r) => {
  const [ox, oy] = env.origin || [0.64, 0.52];
  const t = env.t;
  const dx = (x - ox) * env.A;
  const dy = y - oy;
  const pr = Math.hypot(dx, dy) / ORBIT_BODY;
  if (pr < 1) {
    const nz = Math.sqrt(1 - pr * pr);
    const lam = clamp(-0.62 * (dx / ORBIT_BODY) - 0.5 * (dy / ORBIT_BODY) + 0.6 * nz, 0, 1);
    const front = dy > 0 ? 0 : 1;
    return 0.16 + 0.5 * lam + 0.06 * front;
  }
  const ey = dy * ORBIT_TILT;
  const rr = Math.hypot(dx, ey);
  const th = Math.atan2(ey, dx);
  const wobble = 0.03 * (env.noise(Math.cos(th) * 1.5 + 4, Math.sin(th) * 1.5 + 9, t * 0.12) - 0.5);
  const phase = t * 0.4;
  const ring = Math.pow(0.5 + 0.5 * Math.cos((rr + wobble) * TAU * ORBIT_FREQ - phase), 6);
  const sweep = 0.5 + 0.5 * Math.cos(th - t * 0.3);
  const fall = smooth(1.55, 0.6, rr) * smooth(ORBIT_BODY * 1.2, ORBIT_BODY * 2.4, rr);
  let l = ring * fall * (0.3 + 0.7 * sweep * sweep) * 0.85;
  const sat = env.state.sats;
  if (sat) { const v = sat[r * env.cols + c]; if (v) l = Math.max(l, v); }
  return l;
}, {
  animate: true,
  prepare(env) {
    const s = env.state;
    const size = env.cols * env.rows;
    if (!s.sats || s.sats.length !== size) s.sats = new Float32Array(size);
    else s.sats.fill(0);
    const [ox, oy] = env.origin || [0.64, 0.52];
    const shift = (env.t * 0.4) / (TAU * ORBIT_FREQ);
    for (let i = 0; i < 3; i++) {
      const radius = (i + 1) / ORBIT_FREQ + (shift % (1 / ORBIT_FREQ));
      const angle = env.rand(i, 3) * TAU + env.t * (0.3 / (i + 1));
      const px = ox * env.w + Math.cos(angle) * radius * env.h;
      const py = oy * env.h + (Math.sin(angle) * radius * env.h) / ORBIT_TILT;
      const col = Math.floor((px - env.offX) / env.cw);
      const row = Math.floor((py - env.offY) / env.ch);
      if (col >= 0 && col < env.cols && row >= 0 && row < env.rows) s.sats[row * env.cols + col] = 0.78;
    }
  },
});

/* ---------- rain: sparse slow streaks, brightest at the falling head ---------- */
registerField('rain', (x, y, env, c) => {
  if (c % 2) return 0;
  const lane = c >> 1;
  if (env.rand(lane, 0) > 0.42) return 0;
  let l = 0;
  for (let k = 0; k < 2; k++) {
    const speed = 0.045 + 0.08 * env.rand(lane, 1, k);
    const len = 0.16 + 0.34 * env.rand(lane, 2, k);
    const head = ((env.rand(lane, 3, k) + env.t * speed) % 1) * (1 + len * 1.4) - len * 0.2;
    const d = head - y;
    if (d < 0 || d > len) continue;
    const v = d < env.ch / env.h ? 1 : 0.1 + 0.55 * Math.pow(1 - d / len, 1.8);
    l = Math.max(l, v);
  }
  return l * smooth(0, 0.18, y) * (0.7 + 0.3 * smooth(0, 1, y));
}, { animate: true, ramp: 'rain', speed: 1 });

/* ---------- grid: a blueprint lattice, flat or receding to a horizon ---------- */
const gridCell = (x, y, env, c, r) => {
  const s = env.state;
  const onV = (((c - s.oc) % s.sc) + s.sc) % s.sc === 0;
  const onH = (((r - s.or) % s.sr) + s.sr) % s.sr === 0;
  if (!onV && !onH) return 0;
  const n = env.fbm(x * env.A * 1.3 + env.t * 0.04, y * 1.3, 3.3, 3);
  const l = smooth(0.34, 0.62, n);
  if (onV && onH) { env.char = '+'; return 0.3 + 0.7 * l; }
  env.char = l < 0.45 ? '·' : onH ? '-' : '|';
  return 0.12 + 0.58 * l;
};
const gridPerspective = (x, y, env, c, r) => {
  const s = env.state;
  const hy = 0.3;
  const top = (env.offY + r * env.ch) / env.h;
  const bottom = top + env.ch / env.h;
  if (bottom <= hy) return env.rand(c, r, 5) < 0.01 * smooth(0, hy, y) ? 0.14 : 0;
  if (top <= hy) { if (c % 2) return 0; env.char = '·'; return 0.3; }
  const k = s.k;
  const t = env.t * 0.45;
  const gz = (yy) => k / (yy - hy) + t;
  const zc = k / (y - hy);
  // Lines closer than a couple of cells apart dissolve instead of filling the distance solid.
  const fadeZ = smooth(env.ch * 1.1, env.ch * 2.6, (env.h * (y - hy) * (y - hy)) / k);
  const fadeX = smooth(env.cw * 1.4, env.cw * 3.4, (env.h * (y - hy)) / k);
  const crossZ = fadeZ > 0.05 && Math.floor(gz(top)) !== Math.floor(gz(bottom));
  const xl = (env.offX + c * env.cw - env.w / 2) / env.h;
  const xr = xl + env.cw / env.h;
  const crossX = fadeX > 0.05 && Math.floor(xl * zc) !== Math.floor(xr * zc);
  if (!crossZ && !crossX) return 0;
  const patch = smooth(0.3, 0.6, env.fbm((x - 0.5) * zc * env.A * 0.25, (zc + t) * 0.22, 1.7, 3));
  const l = (0.3 + 0.7 * smooth(hy, 1, y)) * (0.4 + 0.6 * patch);
  if (crossZ && crossX) { env.char = '+'; return Math.min(1, l * Math.max(fadeZ, fadeX) + 0.1); }
  if (crossZ) { env.char = '-'; return l * 0.85 * fadeZ; }
  const slope = ((x - 0.5) * env.w) / ((y - hy) * env.h);
  if (Math.abs(slope) > 2.6) return 0;
  env.char = Math.abs(slope) < 0.45 ? '|' : slope > 0 ? '\\' : '/';
  return l * 0.85 * fadeX * smooth(2.6, 1.6, Math.abs(slope));
};
registerField('grid', (x, y, env, c, r) => (env.variant === 'perspective' ? gridPerspective(x, y, env, c, r) : gridCell(x, y, env, c, r)), {
  chars: '+-|/\\·',
  prepare(env) {
    const s = env.state;
    s.sc = Math.max(3, Math.round(48 / env.cw));
    s.sr = Math.max(2, Math.round(48 / env.ch));
    s.oc = Math.floor(((env.cols - 1) % s.sc) / 2);
    s.or = Math.floor(((env.rows - 1) % s.sr) / 2);
    s.k = env.h / 130;
  },
});

/* ---------- flame: an abstract heat plume advected upward, breaking into embers ---------- */
registerField('flame', (x, y, env, c, r) => {
  const [ox] = env.origin || [0.5, 1];
  const t = env.t;
  const X = (x - ox) * env.A;
  const h = 1 - y;
  const sway = (env.fbm(y * 1.2 + t * 0.3, 3.1, t * 0.08, 2) - 0.5) * 0.7 * h;
  const wx = X + sway;
  const profile = Math.exp(-((wx / (0.42 + 0.12 * h)) ** 2));
  const licks = env.fbm(wx * 4.2, y * 1.05 + t * 1.1, t * 0.3, 4);
  const heat = Math.pow(1 - h, 1.35);
  let l = profile * (heat * 1.05 + (licks - 0.5) * 1.9 * (0.25 + h));
  l = Math.max(0, l) * smooth(0.3, 0.55, licks + heat * 0.5);
  l += 0.2 * smooth(0.8, 1, y) * Math.exp(-((X / 1.3) ** 2));
  const embers = env.state.embers;
  if (embers) { const v = embers[r * env.cols + c]; if (v) l = Math.max(l, v); }
  return l * 0.95;
}, {
  animate: true,
  prepare(env) {
    const s = env.state;
    const size = env.cols * env.rows;
    if (!s.embers || s.embers.length !== size) s.embers = new Float32Array(size);
    else s.embers.fill(0);
    const [ox] = env.origin || [0.5, 1];
    const count = Math.max(5, Math.round(env.cols * 0.3));
    for (let i = 0; i < count; i++) {
      const speed = 0.06 + 0.09 * env.rand(i, 2);
      const life = (env.rand(i, 1) + env.t * speed) % 1;
      const rise = 0.3 + life * 0.8;
      const spread = (env.rand(i, 3) - 0.5) * (0.5 + life * 0.9);
      const sway = 0.05 * Math.sin(env.t * 1.1 + i * 1.7) * life;
      const px = ox * env.w + (spread + sway) * env.h;
      const py = (1 - rise) * env.h;
      const col = Math.floor((px - env.offX) / env.cw);
      const row = Math.floor((py - env.offY) / env.ch);
      if (col >= 0 && col < env.cols && row >= 0 && row < env.rows) {
        s.embers[row * env.cols + col] = (0.16 + 0.42 * env.rand(i, 4)) * (1 - life * 0.7);
      }
    }
  },
});

/* ---------- halftone: a lit sphere and its soft halo, drawn as dots by default ---------- */
registerField('halftone', (x, y, env) => {
  const [ox, oy] = env.origin || [0.74, 0.62];
  const R = 0.58;
  const dx = ((x - ox) * env.A) / R;
  const dy = (y - oy) / R;
  const d2 = dx * dx + dy * dy;
  const a = 3.6 + env.t * 0.15;
  const lx = Math.cos(a) * 0.72;
  const ly = Math.sin(a) * 0.5 - 0.3;
  const lz = 0.62;
  if (d2 < 1) {
    const nz = Math.sqrt(1 - d2);
    const lam = clamp(dx * lx + dy * ly + nz * lz, 0, 1);
    const grain = (env.fbm(dx * 3 + 2, dy * 3 + 5, 0, 3) - 0.5) * 0.22;
    return 0.1 + 0.82 * Math.pow(1 - lam, 1.3) + grain;
  }
  const d = Math.sqrt(d2) - 1;
  return 0.36 * Math.exp(-d * 5) * (0.6 + 0.4 * smooth(0.2, 0.8, x));
}, { style: 'dots', ramp: ' 12345678', charRamp: 'default' });

/* ---------- spark: the empty-state glyph, a small ember of characters with a dotted halo ---------- */
registerField('spark', (x, y, env, c, r) => {
  const [ox, oy] = env.origin || [0.5, 0.52];
  const m = Math.min(env.w, env.h);
  let dx = ((x - ox) * env.w) / m;
  let dy = ((y - oy) * env.h) / m;
  if (dy < 0) { dy *= 1.15; dx *= 1 - dy * 1.2; }
  const d = Math.hypot(dx, dy) / 0.34;
  if (d > 1.12) return d < 1.42 && (c + r) % 2 === 0 ? 0.15 : 0;
  const flicker = env.noise(c * 0.9, r * 0.9 - env.t * 1.4, env.t * 0.5);
  return Math.pow(1 - Math.min(d, 1), 0.7) * (0.8 + 0.34 * flicker) + 0.14;
}, { ramp: 'glyph', cell: [7, 10] });

/* ---------- contour: iso-lines of a slow height field, every third line a little stronger ---------- */
const CONTOUR_LEVELS = 6;
registerField('contour', (x, y, env, c, r) => {
  const s = env.state;
  const cols = env.cols;
  const here = s.level[r * cols + c];
  const across = here !== s.level[r * cols + Math.min(c + 1, cols - 1)];
  const down = here !== s.level[Math.min(r + 1, env.rows - 1) * cols + c];
  if (!across && !down) return 0;
  env.char = across && down ? '+' : across ? '|' : '-';
  const side = env.side === 'left' ? 1 - x : x;
  const major = here % 3 === 0 ? 1 : 0.7;
  return (0.5 + 0.5 * major) * (0.35 + 0.65 * smooth(0, 0.8, side)) * (0.75 + 0.25 * smooth(0.1, 0.7, y));
}, {
  animate: false,
  ramp: 'soft',
  chars: '+-|',
  prepare(env) {
    const s = env.state;
    const size = env.cols * env.rows;
    if (!s.level || s.level.length !== size) s.level = new Int16Array(size);
    const drift = env.t * 0.02;
    for (let r = 0; r < env.rows; r++) {
      const y = env.cy(r);
      for (let c = 0; c < env.cols; c++) {
        const x = env.cx(c);
        const n = env.fbm(x * env.A * 1.1 + 3.7, y * 1.1 + drift, drift, 3);
        // fBm sits near the middle: stretch it so the lines spread over the whole box.
        s.level[r * env.cols + c] = Math.floor(((n - 0.5) * 2 + 0.5) * CONTOUR_LEVELS);
      }
    }
  },
});

/* ---------- stipple: random points whose density follows a soft lit form ---------- */
registerField('stipple', (x, y, env, c, r) => {
  const side = env.side === 'left' ? 1 - x : x;
  const lit = smooth(0.25, 0.62, env.fbm(x * env.A * 1.5 + 2.2, y * 1.5 + 5.1, 1.3, 3));
  const d = lit * (0.25 + 0.75 * smooth(0, 0.95, side)) * (0.55 + 0.45 * smooth(0, 1, y));
  if (env.rand(c, r, 11) >= d * 1.25) return 0;
  return 0.3 + 0.7 * Math.pow(d, 0.7) * (0.6 + 0.4 * env.rand(c, r, 12));
}, { animate: false, ramp: 'soft' });

/* ---------- bars: a skyline of columns, three cells wide with a one-cell gap, brightest at the cap ---------- */
const BAR_WIDTH = 3;
registerField('bars', (x, y, env, c) => {
  if (c % BAR_WIDTH === BAR_WIDTH - 1) return 0;
  const height = env.state.height[(c / BAR_WIDTH) | 0];
  const top = 1 - height;
  if (y < top) return 0;
  const depth = (y - top) / height;
  const cap = y - top < env.ch / env.h ? 0.28 : 0;
  return Math.min(1, (0.95 - 0.55 * depth) * (0.55 + 0.45 * height) + cap);
}, {
  animate: true,
  ramp: 'soft',
  speed: 0.7,
  prepare(env) {
    const s = env.state;
    const lanes = Math.ceil(env.cols / BAR_WIDTH);
    if (!s.height || s.height.length !== lanes) s.height = new Float32Array(lanes);
    for (let i = 0; i < lanes; i++) {
      const x = (env.offX + (i * BAR_WIDTH + 1.5) * env.cw) / env.w;
      const side = env.side === 'left' ? 1 - x : x;
      const n = env.fbm(i * 0.23 + env.t * 0.05, 4.4, 0, 3);
      const breathe = 0.05 * Math.sin(env.t * 0.6 + env.rand(i, 5) * TAU);
      s.height[i] = clamp(0.1 + 0.8 * smooth(0.12, 0.7, n) * (0.4 + 0.6 * smooth(0, 1, side)) + breathe, 0.06, 0.94);
    }
  },
});

/* ======================================================================
   Frame computation (shared by the canvas renderer and renderText)
   ====================================================================== */

const ALPHA_LEVELS = 6;
const ALPHA = Array.from({ length: ALPHA_LEVELS }, (_, i) => 0.42 + 0.58 * ((i + 1) / ALPHA_LEVELS));
const alphaLevel = (pos) => Math.min(ALPHA_LEVELS - 1, Math.max(0, Math.floor(pos * ALPHA_LEVELS - 1e-6)));

function blobMask(x, y, env) {
  const [ox, oy] = env.origin || [0.5, 0.5];
  const m = Math.min(env.w, env.h);
  const dx = ((x - ox) * env.w) / m;
  const dy = ((y - oy) * env.h) / m;
  const th = Math.atan2(dy, dx);
  const R = 0.42 + 0.12 * (env.noise(Math.cos(th) * 1.4 + 3, Math.sin(th) * 1.4 + 7, env.t * 0.15) - 0.5);
  return smooth(R, R * 0.55, Math.hypot(dx, dy));
}

function glyphsFor(ramp, style, field) {
  if (style !== 'chars') return [...ramp.slice(1)];
  const list = [...ramp.slice(1)];
  for (const ch of field.chars) if (!list.includes(ch)) list.push(ch);
  return list;
}

/**
 * Fill `out.sprite` (index into the glyph list, -1 = empty) and `out.alpha` (alpha level)
 * for every cell. `job` holds field, env, ramp, style, shape, intensity, pointer, jitter, index.
 */
function computeCells(job, out) {
  const { field, env, ramp, style, shape, intensity, pointer, jitter, index } = job;
  const { cols, rows, cw, ch, w, h, offX, offY } = env;
  const n = ramp.length;
  const top = n - 1;
  const sample = field.sample;
  const chars = style === 'chars';
  const boost = pointer && pointer.s > 0.002;
  const inv = boost ? 1 / (pointer.radius * pointer.radius) : 0;
  field.prepare?.(env);
  for (let r = 0; r < rows; r++) {
    const y = (offY + (r + 0.5) * ch) / h;
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const x = (offX + (c + 0.5) * cw) / w;
      env.char = null;
      let l = sample(x, y, env, c, r);
      if (shape === 'blob') l *= blobMask(x, y, env);
      if (boost) {
        const px = x * w - pointer.x;
        const py = y * h - pointer.y;
        const g = Math.exp(-(px * px + py * py) * inv);
        if (g > 0.01) l += pointer.s * g * (0.16 + 0.75 * l);
      }
      l *= intensity;
      if (env.char && chars) {
        const s = index.get(env.char);
        if (l < 0.08 || s === undefined) { out.sprite[i] = -1; continue; }
        out.sprite[i] = s;
        out.alpha[i] = alphaLevel(l);
        continue;
      }
      const q = l * n + jitter[i];
      const k = q < 1 ? 0 : Math.min(top, q | 0);
      if (k === 0) { out.sprite[i] = -1; continue; }
      out.sprite[i] = k - 1;
      out.alpha[i] = alphaLevel(k / top);
    }
  }
}

function makeEnv(noise, seed) {
  return {
    w: 0, h: 0, A: 1, cols: 0, rows: 0, cw: 7, ch: 12, offX: 0, offY: 0, t: 0, seed,
    noise: noise.noise, fbm: noise.fbm, rand: noise.rand,
    origin: null, side: 'right', variant: 'flat', state: {}, char: null,
    cx(c) { return (this.offX + (c + 0.5) * this.cw) / this.w; },
    cy(r) { return (this.offY + (r + 0.5) * this.ch) / this.h; },
  };
}

function layoutEnv(env, w, h, cw, ch) {
  env.w = w; env.h = h; env.A = w / h; env.cw = cw; env.ch = ch;
  env.cols = Math.ceil(w / cw);
  env.rows = Math.ceil(h / ch);
  env.offX = (w - env.cols * cw) / 2;
  env.offY = (h - env.rows * ch) / 2;
}

function makeJitter(rand, cols, rows) {
  const jitter = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) jitter[r * cols + c] = (rand(c, r, 91) - 0.5) * 0.7;
  return jitter;
}

/** The ramp for an option value and a style: a field whose own style is dots has a character ramp for when it is drawn as characters. */
function resolveRamp(value, field, style = field.style) {
  const key = value || (style === 'chars' && field.style !== 'chars' ? field.charRamp : field.ramp);
  return ramps[key] ?? (key.startsWith(' ') ? key : ` ${key}`);
}

function parseCell(value, fallback) {
  if (!value) return fallback;
  const parts = String(value).split(/[x×,\s]+/).map(Number).filter((n) => n > 0);
  if (!parts.length) return fallback;
  return [clamp(parts[0], 3, 64), clamp(parts[1] ?? parts[0], 3, 64)];
}

function parseOrigin(value) {
  if (!value) return null;
  const parts = String(value).split(/[,\s]+/).map((p) => (p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p)));
  return parts.length >= 2 && parts.every(Number.isFinite) ? [parts[0], parts[1]] : null;
}

/**
 * Render a field as plain text (one string with newlines). Useful for <pre> art, tests,
 * server rendering and previews. Options: cols, rows, t, seed, ramp, style, cell, origin, side, variant, shape.
 */
export function renderText(name, options = {}) {
  const field = fields.get(name);
  if (!field) throw new Error(`[fire] unknown field "${name}"`);
  const style = 'chars';
  const ramp = resolveRamp(options.ramp, field, style);
  const [cw, ch] = parseCell(options.cell, field.cell || [7, 12]);
  const cols = options.cols ?? 80;
  const rows = options.rows ?? 20;
  const seed = options.seed != null ? hashString(options.seed) : hashString(name);
  const noise = makeNoise(seed);
  const env = makeEnv(noise, seed);
  layoutEnv(env, cols * cw, rows * ch, cw, ch);
  env.t = options.t ?? 0;
  env.origin = parseOrigin(options.origin);
  env.side = options.side || 'right';
  env.variant = options.variant || 'flat';
  const glyphs = glyphsFor(ramp, style, field);
  const index = new Map(glyphs.map((g, i) => [g, i]));
  const out = { sprite: new Int16Array(cols * rows), alpha: new Uint8Array(cols * rows) };
  computeCells({ field, env, ramp, style, shape: options.shape || null, intensity: options.intensity ?? 1, pointer: null, jitter: makeJitter(noise.rand, cols, rows), index }, out);
  const lines = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) { const s = out.sprite[r * cols + c]; line += s < 0 ? ' ' : glyphs[s]; }
    lines.push(line);
  }
  return lines.join('\n');
}

/* ======================================================================
   Canvas renderer
   ====================================================================== */

const FPS = 12;
/** The mark shapes a field can be drawn in (data-style, and the page's data-signature-mark). */
export const MARKS = Object.freeze(['chars', 'dots', 'squares', 'plus', 'dashes']);
/** The attributes on <html> that carry the page's signature (see the header). `marks` belongs to the frame (shell.css). */
export const SIGNATURE_ATTRIBUTES = Object.freeze({
  field: 'data-signature-field', mark: 'data-signature-mark', cell: 'data-signature-cell',
  ramp: 'data-signature-ramp', marks: 'data-signature-marks', intensity: 'data-signature-intensity',
});
const CHAR_CELL_RATIO = 12 / 7;
const byEl = new WeakMap();
const atlasCache = new Map();
const pendingFonts = new Set();
let resizeObserver = null;
let intersectionObserver = null;

function canvasColor(ctx, color) {
  ctx.fillStyle = '#010203';
  ctx.fillStyle = color;
  return ctx.fillStyle === '#010203' && color.replace(/\s/g, '') !== '#010203' ? 'rgba(128,128,128,0.24)' : color;
}

function watchFont(font, text) {
  if (!document.fonts || pendingFonts.has(font)) return;
  pendingFonts.add(font);
  try {
    if (document.fonts.check(font, text)) return;
    document.fonts.load(font, text).then(() => { atlasCache.clear(); refreshAll(); }, () => {});
  } catch { /* invalid font shorthand: keep the fallback */ }
}

function getAtlas(spec) {
  const key = [spec.style, spec.glyphs.join(''), spec.color, spec.font, spec.sw, spec.sh, spec.dpr].join('|');
  let atlas = atlasCache.get(key);
  if (atlas) return atlas;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, spec.sw * spec.glyphs.length);
  canvas.height = Math.max(1, spec.sh);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = canvasColor(ctx, spec.color);
  if (spec.style !== 'chars') {
    const levels = spec.glyphs.length;
    const cx = (i) => i * spec.sw + spec.sw / 2;
    const cy = spec.sh / 2;
    const stroke = Math.max(1, Math.round(spec.dpr));
    const room = Math.min(spec.sw, spec.sh);
    for (let i = 0; i < levels; i++) {
      const level = (i + 1) / levels;
      if (spec.style === 'dots') {
        const radius = Math.max(0.55 * spec.dpr, room * 0.46 * Math.sqrt(level));
        ctx.beginPath();
        ctx.arc(cx(i), cy, radius, 0, TAU);
        ctx.fill();
      } else if (spec.style === 'squares') {
        // Side grows with the square root of the level, so the ink grows with the level.
        const side = Math.max(stroke, Math.round(room * 0.7 * Math.sqrt(level)));
        ctx.fillRect(Math.round(cx(i) - side / 2), Math.round(cy - side / 2), side, side);
      } else if (spec.style === 'plus') {
        const arm = Math.max(stroke * 2 + 1, Math.round(room * 0.74 * level)) | 1;
        const x = Math.round(cx(i) - arm / 2);
        const y = Math.round(cy - arm / 2);
        const t = Math.round(cx(i) - stroke / 2);
        const u = Math.round(cy - stroke / 2);
        ctx.fillRect(x, u, arm, stroke);
        ctx.fillRect(t, y, stroke, arm);
      } else {
        const length = Math.max(stroke * 2, Math.round(spec.sw * 0.86 * level));
        const thick = Math.max(stroke, Math.round(spec.dpr * 1.5));
        ctx.fillRect(Math.round(cx(i) - length / 2), Math.round(cy - thick / 2), length, thick);
      }
    }
  } else {
    ctx.font = spec.scaledFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    spec.glyphs.forEach((g, i) => ctx.fillText(g, i * spec.sw + spec.sw / 2, spec.sh / 2 + 0.5 * spec.dpr));
  }
  if (atlasCache.size > 64) atlasCache.clear();
  atlas = { canvas, sw: spec.sw, sh: spec.sh };
  atlasCache.set(key, atlas);
  return atlas;
}

/** The page's signature, read from <html>: each dial is a string, or null for "auto" (the instance decides). */
function pageSignature() {
  const root = document.documentElement;
  const read = (key) => {
    const value = root.getAttribute(SIGNATURE_ATTRIBUTES[key]);
    return value && value !== 'auto' ? value : null;
  };
  const cell = parseFloat(read('cell'));
  const intensity = parseFloat(read('intensity'));
  const mark = read('mark');
  return {
    field: read('field'),
    mark: MARKS.includes(mark) ? mark : null,
    cell: Number.isFinite(cell) && cell > 0 ? clamp(cell, 3, 64) : null,
    ramp: read('ramp'),
    intensity: Number.isFinite(intensity) ? clamp(intensity, 0, 3) : null,
  };
}

class AsciiField {
  constructor(el) {
    this.el = el;
    this.isGlyph = el.classList.contains('fd-glyph');
    el.querySelectorAll(':scope > canvas.fd-ascii-canvas').forEach((node) => node.remove());
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fd-ascii-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    el.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.w = 0; this.h = 0; this.dpr = 1;
    this.t = 0; this.last = 0;
    this.visible = true;
    this.destroyed = false;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0, radius: 72 };
    this.onMove = this.onMove.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.configure();
    instances.add(this);
    byEl.set(el, this);
    resizeObserver.observe(el);
    intersectionObserver.observe(el);
  }

  configure() {
    const d = this.el.dataset;
    const page = pageSignature();
    const fallback = this.isGlyph ? 'spark' : 'terrain';
    // Precedence per option: data-signature="own" keeps the instance's options; else a set page dial; else the
    // instance's own option; else Fire's default.
    const own = d.signature === 'own';
    const pick = (mine, theirs) => (own ? mine : theirs ?? mine);
    const named = d.fdAscii && d.fdAscii !== 'auto' ? d.fdAscii : null;
    this.field = fields.get(pick(named, page.field)) || fields.get(named || fallback);
    const ownStyle = MARKS.includes(d.style) ? d.style : null;
    this.style = pick(ownStyle, page.mark) || this.field.style;
    const ownRamp = d.ramp || null;
    this.ramp = resolveRamp(pick(ownRamp, page.ramp && ramps[page.ramp] ? page.ramp : null), this.field, this.style);
    const mark = this.style !== 'chars';
    const fallbackCell = this.field.cell || (mark ? [8, 8] : [7, 12]);
    const pageCell = page.cell ? [page.cell, mark ? page.cell : Math.round(page.cell * CHAR_CELL_RATIO)] : null;
    const ownCell = d.cell ? parseCell(d.cell, null) : null;
    [this.cw, this.ch] = (own ? ownCell : pageCell || ownCell) || fallbackCell;
    this.animate = d.animate == null ? this.field.animate : d.animate !== 'false';
    this.speed = Number.isFinite(parseFloat(d.speed)) ? parseFloat(d.speed) : 1;
    const ownIntensity = Number.isFinite(parseFloat(d.intensity)) ? parseFloat(d.intensity) : null;
    this.intensity = pick(ownIntensity, page.intensity) ?? 1;
    this.shape = d.shape || null;
    this.seed = hashString(d.seed ?? this.field.name);
    this.noise = makeNoise(this.seed);
    this.env = makeEnv(this.noise, this.seed);
    this.env.origin = parseOrigin(d.origin);
    this.env.side = d.side === 'left' ? 'left' : 'right';
    this.env.variant = d.variant || 'flat';
    this.glyphs = glyphsFor(this.ramp, this.style, this.field);
    this.index = new Map(this.glyphs.map((g, i) => [g, i]));
    this.interactive = d.interactive != null && d.interactive !== 'false';
    const host = this.isGlyph ? this.el : this.el.parentElement || this.el;
    if (this.host && this.host !== host) this.unbindPointer();
    if (this.interactive && !this.host) {
      this.host = host;
      host.addEventListener('pointermove', this.onMove, { passive: true });
      host.addEventListener('pointerleave', this.onLeave, { passive: true });
    } else if (!this.interactive && this.host) this.unbindPointer();
    this.atlas = null;
    if (this.w) this.layout(this.w, this.h);
  }

  unbindPointer() {
    if (!this.host) return;
    this.host.removeEventListener('pointermove', this.onMove);
    this.host.removeEventListener('pointerleave', this.onLeave);
    this.host = null;
    this.pointer.s = this.pointer.ts = 0;
  }

  onMove(event) {
    if (reducedMotion()) return;
    const rect = this.el.getBoundingClientRect();
    const p = this.pointer;
    p.tx = event.clientX - rect.left;
    p.ty = event.clientY - rect.top;
    if (p.s < 0.02) { p.x = p.tx; p.y = p.ty; }
    p.ts = 1;
    wake(this);
  }

  onLeave() {
    this.pointer.ts = 0;
    wake(this);
  }

  layout(w, h) {
    this.w = w; this.h = h;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(w * this.dpr));
    const H = Math.max(1, Math.round(h * this.dpr));
    if (this.canvas.width !== W) this.canvas.width = W;
    if (this.canvas.height !== H) this.canvas.height = H;
    layoutEnv(this.env, w, h, this.cw, this.ch);
    const { cols, rows, offX, offY } = this.env;
    const count = cols * rows;
    this.out = { sprite: new Int16Array(count), alpha: new Uint8Array(count) };
    this.jitter = makeJitter(this.noise.rand, cols, rows);
    this.px = new Float32Array(cols);
    this.py = new Float32Array(rows);
    for (let c = 0; c < cols; c++) this.px[c] = Math.round((offX + c * this.cw) * this.dpr);
    for (let r = 0; r < rows; r++) this.py[r] = Math.round((offY + r * this.ch) * this.dpr);
    this.env.state = {};
  }

  readStyle() {
    const cs = getComputedStyle(this.el);
    const size = parseFloat(cs.fontSize) || 10;
    const family = cs.fontFamily || 'monospace';
    const weight = cs.fontWeight || '400';
    const sw = Math.ceil(this.cw * this.dpr);
    const sh = Math.ceil(this.ch * this.dpr);
    const spec = {
      style: this.style,
      glyphs: this.glyphs,
      color: cs.color,
      font: `${weight} ${size}px ${family}`,
      scaledFont: `${weight} ${size * this.dpr}px ${family}`,
      sw, sh, dpr: this.dpr,
    };
    if (this.style === 'chars') watchFont(spec.font, this.glyphs.join(''));
    return spec;
  }

  refresh(reconfigure = false) {
    if (reconfigure) this.configure();
    this.atlas = null;
    this.draw();
  }

  animating() { return this.animate && !reducedMotion(); }

  easing() {
    if (!this.interactive) return false;
    const p = this.pointer;
    return Math.abs(p.ts - p.s) > 0.004 || (p.s > 0.004 && (Math.abs(p.tx - p.x) > 0.5 || Math.abs(p.ty - p.y) > 0.5));
  }

  wantsFrames() {
    return !this.destroyed && this.visible && !document.hidden && this.w > 0 && (this.animating() || this.easing());
  }

  step(now) {
    const easing = this.easing();
    const interval = easing ? 1000 / 30 : 1000 / FPS;
    if (this.last && now - this.last < interval - 2) return;
    const dt = this.last ? Math.min(now - this.last, 200) : 0;
    this.last = now;
    if (this.animating()) this.t += (dt / 1000) * this.speed * this.field.speed;
    if (easing) {
      const p = this.pointer;
      p.x += (p.tx - p.x) * 0.4;
      p.y += (p.ty - p.y) * 0.4;
      p.s += (p.ts - p.s) * 0.2;
      if (Math.abs(p.ts - p.s) < 0.004) p.s = p.ts;
    }
    this.draw();
  }

  draw() {
    if (this.destroyed || !this.w || !this.h) return;
    if (!this.atlas) {
      const spec = this.readStyle();
      this.atlas = getAtlas(spec);
    }
    const env = this.env;
    env.t = this.t;
    computeCells({
      field: this.field, env, ramp: this.ramp, style: this.style, shape: this.shape,
      intensity: this.intensity, pointer: this.interactive ? this.pointer : null, jitter: this.jitter, index: this.index,
    }, this.out);
    const { ctx, canvas, atlas, px, py } = this;
    const { sprite, alpha } = this.out;
    const { cols, rows } = env;
    const { sw, sh } = atlas;
    const img = atlas.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let a = 0; a < ALPHA_LEVELS; a++) {
      ctx.globalAlpha = ALPHA[a];
      for (let r = 0; r < rows; r++) {
        const base = r * cols;
        const dy = py[r];
        for (let c = 0; c < cols; c++) {
          const i = base + c;
          const s = sprite[i];
          if (s < 0 || alpha[i] !== a) continue;
          ctx.drawImage(img, s * sw, 0, sw, sh, px[c], dy, sw, sh);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unbindPointer();
    resizeObserver?.unobserve(this.el);
    intersectionObserver?.unobserve(this.el);
    instances.delete(this);
    awake.delete(this);
  }
}

/* ---------- Shared frame loop ---------- */
const awake = new Set();
let frameId = 0;

function wake(inst) {
  if (!inst.wantsFrames()) return;
  awake.add(inst);
  if (!frameId) frameId = requestAnimationFrame(loop);
}

function loop(now) {
  frameId = 0;
  for (const inst of awake) {
    if (!inst.el.isConnected) { inst.destroy(); continue; }
    if (!inst.wantsFrames()) { awake.delete(inst); inst.last = 0; continue; }
    inst.step(now);
  }
  if (awake.size) frameId = requestAnimationFrame(loop);
}

function refreshAll(reconfigure = false) {
  for (const inst of [...instances]) {
    if (!inst.el.isConnected) { inst.destroy(); continue; }
    inst.refresh(reconfigure);
    if (reconfigure) wake(inst);
  }
}

function wakeAll() {
  for (const inst of instances) { inst.last = 0; wake(inst); }
}

function prune() {
  for (const inst of [...instances]) if (!inst.el.isConnected) inst.destroy();
}

function mountField(el) {
  const existing = byEl.get(el);
  if (existing && !existing.destroyed) return existing;
  return new AsciiField(el);
}

/* ======================================================================
   Text loaders
   ====================================================================== */

const BRAILLE = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
const BRAILLE_STILL = '⠶';
const brailles = new Set();
let brailleTimer = 0;
let brailleFrame = 0;

function tickBraille() {
  brailleFrame = (brailleFrame + 1) % BRAILLE.length;
  const still = reducedMotion();
  for (const node of brailles) {
    if (!node.isConnected) { brailles.delete(node); continue; }
    node.textContent = still ? BRAILLE_STILL : BRAILLE[brailleFrame];
  }
  if (!brailles.size) { clearInterval(brailleTimer); brailleTimer = 0; }
}

function mountBraille(el) {
  let frame = el.querySelector(':scope > .fd-braille-frame');
  if (!frame) {
    frame = document.createElement('span');
    frame.className = 'fd-braille-frame';
    frame.setAttribute('aria-hidden', 'true');
    el.prepend(frame);
  }
  frame.textContent = reducedMotion() ? BRAILLE_STILL : BRAILLE[brailleFrame];
  brailles.add(frame);
  if (!brailleTimer) brailleTimer = setInterval(tickBraille, 80);
}

function fillLoader(el) {
  if (el.children.length) return;
  for (let i = 0; i < 3; i++) el.append(document.createElement('span'));
}

/* ======================================================================
   Skeleton screens: an empty preset is filled with its parts
   ====================================================================== */

// The markup comes from skeleton.js (fire-design/skeleton), which a server or a build step can use to write the same
// filled presets into the first HTML; a preset that already has children is left as it is.
const PRESET_ATTRIBUTES = ['rows', 'cols', 'count', 'lines', 'variant'];
const builders = Object.fromEntries(SKELETON_PRESETS.map((name) => [`fd-skeleton-${name}`, (el) => {
  const options = {};
  for (const key of PRESET_ATTRIBUTES) if (el.hasAttribute(`data-${key}`)) options[key] = el.getAttribute(`data-${key}`);
  el.innerHTML = skeletonParts(name, options);
}]));
const SKELETON_SELECTOR = Object.keys(builders).map((cls) => `.${cls}`).join(', ');

function buildSkeleton(el) {
  if (el.dataset.fdBuilt != null) return;
  const cls = Object.keys(builders).find((name) => el.classList.contains(name));
  if (!cls) return;
  if (!el.childElementCount) builders[cls](el);
  el.dataset.fdBuilt = '';
  if (cls !== 'fd-skeleton-text' && !el.parentElement?.closest('[aria-hidden="true"]')) el.setAttribute('aria-hidden', 'true');
  el.querySelectorAll(SKELETON_SELECTOR).forEach(buildSkeleton);
}

/* ======================================================================
   Content swap and the page bar
   ====================================================================== */

/** Show the skeleton (true) or cross-fade to the real content (false). */
export function setLoading(el, loading) {
  if (!el) return;
  const value = Boolean(loading);
  el.dataset.fdLoading = String(value);
  el.setAttribute('aria-busy', String(value));
  emit(el, 'fd:change', { value: value ? 'loading' : 'ready' });
}

/* The late line (.fd-skeleton-late): a muted sentence, hidden until --fd-skeleton-late has passed while its region
   loads. CSS shows it on its own. With this script its words stay in place (hidden from assistive technology, so the
   line keeps its height and nothing moves), and a polite status inside it gets the same words when the time is up,
   so a screen reader announces them once per load; the status is emptied when loading ends. The region is the
   nearest [data-fd-loading] or .fd-states; with neither (the first-load app skeleton) it loads while it is on the page. */
const lateStatus = new WeakMap();
const lateTimers = new WeakMap();

function lateRegionLoading(el) {
  const region = el.closest('[data-fd-loading], .fd-states');
  if (!region) return true;
  return region.matches('[data-fd-loading]') ? region.dataset.fdLoading === 'true' : region.dataset.state === 'loading';
}

// The time as the browser resolves it (a calc() or a var() included): the waiting line carries it as its animation-delay.
function lateDelay(el) {
  const value = getComputedStyle(el).animationDelay.split(',')[0].trim();
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 6000;
  return value.endsWith('ms') ? n : n * 1000;
}

function syncLate(el) {
  let status = lateStatus.get(el);
  if (!status) {
    const words = document.createElement('span');
    words.setAttribute('aria-hidden', 'true');
    words.append(...el.childNodes);
    status = document.createElement('span');
    status.className = 'fd-sr-only';
    status.setAttribute('role', 'status');
    el.append(words, status);
    lateStatus.set(el, status);
  }
  const loading = el.isConnected && lateRegionLoading(el);
  if (loading && lateTimers.has(el)) return;   // this load is already timed (or the line already shows)
  clearTimeout(lateTimers.get(el));
  lateTimers.delete(el);
  status.textContent = '';
  el.dataset.fdLate = 'wait';
  if (!loading) return;
  lateTimers.set(el, setTimeout(() => {
    if (!el.isConnected) return;
    status.textContent = el.firstElementChild.textContent.trim();
    el.dataset.fdLate = 'shown';
  }, lateDelay(el)));
}

/** A 2px accent progress line. Pass a positioned element to scope it; defaults to the top of the page. */
export function createPagebar(host) {
  let el = null;
  let progress = 0;
  let trickle = 0;
  let hide = 0;
  const ensure = () => {
    if (el && el.isConnected) return el;
    el = document.createElement('div');
    el.className = 'fd-pagebar';
    el.dataset.state = 'idle';
    el.setAttribute('role', 'progressbar');
    el.setAttribute('aria-label', 'Loading');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');
    el.innerHTML = '<span class="fd-pagebar-fill"></span>';
    if (host) el.dataset.scoped = '';
    (host || document.body).append(el);
    return el;
  };
  const set = (value) => {
    progress = clamp(value, 0, 1);
    ensure().style.setProperty('--_sk-p', progress.toFixed(4));
    el.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  };
  return {
    start() {
      clearTimeout(hide);
      clearInterval(trickle);
      ensure();
      if (el.dataset.state !== 'running') { el.dataset.state = 'running'; set(0); void el.offsetWidth; }
      set(Math.max(progress, 0.12));
      trickle = setInterval(() => set(progress + (0.94 - progress) * (0.04 + Math.random() * 0.08)), 360);
    },
    set(value) {
      ensure();
      if (el.dataset.state !== 'running') el.dataset.state = 'running';
      set(value);
    },
    done() {
      clearInterval(trickle);
      if (!el || el.dataset.state === 'idle') return;
      set(1);
      el.dataset.state = 'done';
      hide = setTimeout(() => { el.dataset.state = 'idle'; set(0); }, 760);
    },
    get value() { return progress; },
  };
}

/** The page-level bar: pagebar.start(), pagebar.set(n), pagebar.done(). */
export const pagebar = createPagebar();

/* ======================================================================
   Init
   ====================================================================== */

let installed = false;

function install() {
  if (installed) return;
  installed = true;
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const inst = byEl.get(entry.target);
      if (!inst || inst.destroyed) continue;
      const box = entry.contentBoxSize?.[0];
      const w = box ? box.inlineSize : entry.contentRect.width;
      const h = box ? box.blockSize : entry.contentRect.height;
      if (w < 1 || h < 1) { inst.w = 0; continue; }
      if (Math.abs(w - inst.w) < 0.5 && Math.abs(h - inst.h) < 0.5 && inst.dpr === Math.min(window.devicePixelRatio || 1, 2)) continue;
      inst.layout(w, h);
      inst.atlas = null;
      inst.draw();
      wake(inst);
    }
  });
  intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const inst = byEl.get(entry.target);
      if (!inst) continue;
      inst.visible = entry.isIntersecting;
      if (inst.visible) wake(inst); else inst.last = 0;
    }
  }, { rootMargin: '96px' });

  const root = document.documentElement;
  const restyle = () => requestAnimationFrame(() => refreshAll());
  root.addEventListener('fd:theme', restyle);
  root.addEventListener('fd:accent', restyle);
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', restyle);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => { refreshAll(); wakeAll(); });
  // The page's signature: any change to one of its attributes re-reads every instance, once per frame.
  let signatureFrame = 0;
  new MutationObserver(() => {
    if (signatureFrame) return;
    signatureFrame = requestAnimationFrame(() => { signatureFrame = 0; refreshAll(true); });
  }).observe(root, { attributes: true, attributeFilter: Object.values(SIGNATURE_ATTRIBUTES) });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wakeAll(); });
  document.fonts?.ready.then(() => { atlasCache.clear(); refreshAll(); });

  // A region that starts or stops loading restarts or clears the timers of its late lines.
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      const region = m.target;
      if (region.matches('[data-fd-loading], .fd-states')) region.querySelectorAll('.fd-skeleton-late').forEach(syncLate);
    }
  }).observe(root, { subtree: true, attributes: true, attributeFilter: ['data-fd-loading', 'data-state'] });

  new MutationObserver((mutations) => {
    let removed = false;
    for (const m of mutations) {
      if (!removed) for (const node of m.removedNodes) if (node.nodeType === 1) { removed = true; break; }
      for (const node of m.addedNodes) if (node.nodeType === 1 && !node.classList.contains('fd-ascii-canvas')) scan(node);
    }
    if (removed) queueMicrotask(prune);
  }).observe(root, { childList: true, subtree: true });
}

function collect(root, selector) {
  const list = root.querySelectorAll ? [...root.querySelectorAll(selector)] : [];
  if (root.matches?.(selector)) list.unshift(root);
  return list;
}

function scan(root) {
  collect(root, SKELETON_SELECTOR).forEach(buildSkeleton);
  collect(root, '[data-fd-ascii], .fd-ascii, .fd-glyph').forEach(mountField);
  collect(root, '.fd-braille').forEach(mountBraille);
  collect(root, '.fd-dots, .fd-bars-loader').forEach(fillLoader);
  collect(root, '[data-fd-loading]').forEach((el) => el.setAttribute('aria-busy', String(el.dataset.fdLoading === 'true')));
  collect(root, '.fd-skeleton-late').forEach(syncLate);
}

/** Mount every texture, loader and skeleton preset inside `root`. Idempotent. */
export function init(root = document) {
  if (typeof window === 'undefined') return;
  install();
  scan(root);
}

/**
 * Re-read an element's data attributes and colours and redraw it (mounting it if needed).
 * Call with no argument to refresh every field, for example after changing data-theme on a subtree.
 */
export function render(el) {
  if (typeof window === 'undefined') return;
  install();
  if (!el) { refreshAll(); return; }
  const inst = mountField(el);
  inst.refresh(true);
  wake(inst);
}
