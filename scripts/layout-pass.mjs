#!/usr/bin/env node
/* One-off: move pixel values out of inline styles in templates and docs.
 *
 *   node scripts/layout-pass.mjs            report only
 *   node scripts/layout-pass.mjs --write    rewrite the files
 *
 * A gap becomes data-gap, a width data-w / data-max-w, a height data-h, a grid minimum data-min
 * (see fire/layout.css). A component parameter that must stay a custom property (--h, --fd-chat-h,
 * --fd-panel-w …) keeps its place and reads a --fd-size-* token. Values that are not on a scale snap to
 * the nearest step and are listed, so each one can be looked at. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WRITE = process.argv.includes('--write');

const SPACE = { 0: '0', 2: '0-5', 4: '1', 6: '1-5', 8: '2', 10: '2-5', 12: '3', 14: '3-5', 16: '4', 20: '5', 24: '6', 32: '8', 40: '10', 48: '12', 64: '16', 80: '20', 96: '24' };
const SIZE = { 24: '4xs', 48: '3xs', 64: '2xs', 96: 'xs', 160: 'sm', 240: 'md', 320: 'lg', 400: 'xl', 480: '2xl', 560: '3xl', 640: '4xl', 768: '5xl', 960: '6xl' };
/* Sizes that mean a named thing keep their meaning instead of snapping. */
const NAMED = { 375: 'phone' };
const TOKEN = { 256: 'var(--fd-sidebar-w)', 308: 'var(--fd-doc-nav-w)' };

const notes = [];
const nearest = (table, px) => {
  const keys = Object.keys(table).map(Number);
  let best = keys[0];
  for (const k of keys) if (Math.abs(k - px) < Math.abs(best - px) || (Math.abs(k - px) === Math.abs(best - px) && k > best)) best = k;
  return [table[best], best];
};
const px = (v) => { const m = /^(-?\d*\.?\d+)px$/.exec(v.trim()); return m ? Number(m[1]) : v.trim() === '0' ? 0 : null; };

function convert(style, tag, where) {
  if (/\$\{/.test(style) && !/^[^$]*--(value|fd-i)\s*:/.test(style)) return null; // computed in a template string: leave
  const decls = style.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const i = d.indexOf(':'); return i < 0 ? [d, null] : [d.slice(0, i).trim(), d.slice(i + 1).trim()]; });
  const cls = (/class="([^"]*)"/.exec(tag) || [])[1] || '';
  const attrs = {};
  const keep = [];
  const snap = (table, n, what) => {
    const [name, at] = nearest(table, n);
    if (at !== n) notes.push(`${where}  ${what} ${n}px → ${name} (${at}px)   <${cls.split(' ')[0] || tag.slice(1, 12)}>`);
    return name;
  };
  const size = (n, what) => (NAMED[n] ? NAMED[n] : snap(SIZE, n, what));
  const hasWidth = decls.some(([p, v]) => (p === 'width' && (px(v) !== null || /^min\(100%/.test(v))));
  for (const [prop, value] of decls) {
    if (value === null) { keep.push(prop); continue; }
    const n = px(value);
    if (prop === '--fd-gap' || prop === 'gap') {
      const parts = value.split(/\s+/).map(px);
      if (parts.some((p) => p === null) || parts.length > 2) { keep.push(`${prop}: ${value}`); continue; }
      attrs['data-gap'] = snap(SPACE, parts[0], 'gap');
      if (parts.length === 2 && parts[1] !== parts[0]) attrs['data-gap-x'] = snap(SPACE, parts[1], 'gap-x');
    } else if (prop === '--fd-min' || prop === '--min') {
      if (value === '100%') attrs['data-min'] = 'full';
      else if (n === null || prop === '--min') keep.push(`${prop}: ${n === null ? value : `var(--fd-size-${size(n, prop)})`}`);
      else if (n === 260 && /\bfd-(grid|skeleton-grid)\b/.test(cls)) { /* the default */ }
      else if (n === 248 && /\bfd-card-grid\b/.test(cls)) { /* the default */ }
      else attrs['data-min'] = size(n, 'grid min');
    } else if (prop === 'width') {
      const m = /^min\(100%,\s*(\d+)px\)$/.exec(value);
      if (TOKEN[n]) keep.push(`width: ${TOKEN[n]}`);
      else if (n !== null) attrs['data-w'] = size(n, 'width');
      else if (m) attrs['data-w'] = size(Number(m[1]), 'width');
      else if (value === '100%') attrs['data-w'] = 'full';
      else keep.push(`${prop}: ${value}`);
    } else if (prop === 'max-width') {
      if (n !== null) attrs['data-max-w'] = size(n, 'max-width');
      else if (value === '100%') { if (!hasWidth) attrs['data-max-w'] = 'full'; }
      else if (value === 'none') attrs['data-max-w'] = 'none';
      else keep.push(`${prop}: ${value}`);
    } else if (prop === '--w') {
      if (n === null) keep.push(`${prop}: ${value}`);
      else if (/\bfd-table-trunc\b/.test(cls)) { const step = size(n, 'trunc'); if (step !== 'md') attrs['data-max-w'] = step; /* md is the default */ }
      else attrs['data-w'] = size(n, '--w');
    } else if (prop === 'height') {
      if (n !== null) attrs['data-h'] = size(n, 'height');
      else keep.push(`${prop}: ${value}`);
    } else if (/^(padding|margin)(-[a-z-]+)?$/.test(prop) && n !== null) {
      keep.push(`${prop}: var(--fd-space-${snap(SPACE, n, prop)})`);
    } else if (prop.startsWith('--') && n !== null && /px$/.test(value)) {
      keep.push(`${prop}: var(--fd-size-${size(n, prop)})`);
    } else {
      if (/\d(px|rem)\b/.test(value)) notes.push(`${where}  LEFT  ${prop}: ${value}`);
      keep.push(`${prop}: ${value}`);
    }
  }
  for (const name of Object.keys(attrs)) if (new RegExp(`\\s${name}=`).test(tag)) { notes.push(`${where}  CLASH ${name} already on the tag`); return null; }
  const out = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`);
  if (keep.length) out.push(`style="${keep.join('; ')}"`);
  return out.join(' ');
}

const files = ['templates', 'docs'].flatMap((dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.html')).map((f) => `${dir}/${f}`));
let changed = 0; let total = 0;
for (const file of files) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let out = ''; let last = 0;
  for (const m of text.matchAll(/style="([^"]*)"/g)) {
    const start = text.lastIndexOf('<', m.index);
    const end = text.indexOf('>', m.index);
    const tag = text.slice(start, end < 0 ? undefined : end);
    const line = text.slice(0, m.index).split('\n').length;
    total++;
    const next = convert(m[1], tag, `${file}:${line}`);
    if (next === null || next === m[0]) continue;
    // Dropping the attribute entirely also drops the space before it.
    const from = next === '' && text[m.index - 1] === ' ' ? m.index - 1 : m.index;
    out += text.slice(last, from) + next;
    last = m.index + m[0].length;
    changed++;
  }
  out += text.slice(last);
  if (WRITE && out !== text) fs.writeFileSync(path.join(ROOT, file), out);
}
console.log(notes.join('\n'));
console.log(`\n${changed} of ${total} inline styles ${WRITE ? 'rewritten' : 'would change'} in ${files.length} files; ${notes.length} notes`);
