#!/usr/bin/env node
// Design-system audit for the Fire CSS + HTML design system.
// Usage: node scripts/audit.mjs [--json]
// Exit code 1 if any ERROR-level finding exists, else 0.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AS_JSON = process.argv.includes('--json');
const CHECKS = ['icons', 'colors', 'classes', 'ids', 'links', 'tokens', 'literals', 'inline', 'sizes'];
const LEVELS = { icons: 'ERROR', colors: 'WARN', classes: 'WARN', ids: 'ERROR', links: 'ERROR', tokens: 'ERROR', literals: 'WARN', inline: 'WARN', sizes: 'INFO' };
const findings = []; // { check, level, file, line, message }

// ---------- helpers ----------
const rel = p => (path.isAbsolute(p) ? path.relative(ROOT, p).split(path.sep).join('/') : p);
const add = (check, level, file, line, message) => findings.push({ check, level, file: rel(file), line, message });
const read = p => fs.readFileSync(p, 'utf8');
// Replace every non-newline char with a space: keeps length, indices and line numbers intact.
const blank = s => s.replace(/[^\n]/g, ' ');

// Returns idx => 1-based line number, using precomputed line starts.
function lineFinder(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return idx => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= idx) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };
}

// Files directly inside one folder (not recursive), by extension. Absolute paths, sorted.
function topFiles(dir, exts) {
  return fs.readdirSync(path.join(ROOT, dir))
    .filter(n => exts.some(x => n.endsWith(x)))
    .sort()
    .map(n => path.join(ROOT, dir, n));
}

// Every file under the given folders (recursive), by extension. Absolute paths, sorted.
function walk(dirs, exts) {
  const out = [];
  const visit = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) visit(p);
      else if (exts.some(x => e.name.endsWith(x))) out.push(p);
    }
  };
  for (const d of dirs) visit(path.join(ROOT, d));
  return out.sort();
}

const cssFiles = () => [path.join(ROOT, 'fire/base.css'), ...topFiles('fire/components', ['.css'])].filter(f => fs.existsSync(f));
const htmlFiles = () => [...topFiles('docs', ['.html']), ...topFiles('templates', ['.html'])];
const jsFiles = () => [...topFiles('fire/js', ['.js']), path.join(ROOT, 'templates/shell.js')];

// Blank url("data:...") values and CSS comments, preserving positions.
function stripCss(t) {
  return t
    .replace(/url\(\s*(?:"data:[^"]*"|'data:[^']*'|data:[^)]*)\s*\)/gi, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank);
}

// Blank the contents of <template> and <script> blocks.
const stripBlocks = t => t.replace(/<(template|script)\b[\s\S]*?<\/\1\s*>/gi, blank);

// ---------- 1. icons ----------
async function loadIconNames() {
  const file = path.join(ROOT, 'fire/js/icons.js');
  try {
    const mod = await import(pathToFileURL(file).href);
    return new Set(Object.keys(mod.ICONS));
  } catch {
    // Module could not be imported (e.g. it touches `document`): read the keys from the text instead.
    const text = read(file);
    const body = text.slice(text.indexOf('export const ICONS'));
    return new Set([...body.matchAll(/"([^"\\]+)"\s*:\s*"/g)].map(m => m[1]));
  }
}

async function checkIcons() {
  const names = await loadIconNames();
  // Only literal names are checked; a name built at runtime (concatenation, interpolation) is skipped.
  const dataRe = /data-icon=(["'])([a-z0-9-]+)\1/g;
  const callRe = /\bicon\(\s*(["'])([a-z0-9-]+)\1/g;
  for (const f of walk(['fire', 'docs', 'templates'], ['.html', '.js'])) {
    const text = read(f);
    const line = lineFinder(text);
    const scan = (re, from, to) => {
      for (const m of text.slice(from, to).matchAll(re)) {
        const name = m[2];
        if (name.includes('${') || names.has(name)) continue;
        add('icons', 'ERROR', f, line(from + m.index), `unknown icon "${name}"`);
      }
    };
    scan(dataRe, 0, text.length);
    if (f.endsWith('.js')) {
      scan(callRe, 0, text.length);
    } else {
      for (const s of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
        const end = s.index + s[0].length - '</script>'.length; // start of the closing tag
        scan(callRe, end - s[1].length, end);
      }
    }
  }
}

// ---------- 2. colors ----------
function checkColors() {
  const whiteBlackAlpha = /^rgb\(\s*(255|0)\s+\1\s+\1\s*\//i;
  const hexOk = new Set(['#fff', '#ffffff', '#000', '#000000']);
  const hexRe = /(?<![\w-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![\w-])/gi;
  const fnRe = /(?<![\w-])(?:rgba?|hsla?|oklch)\(/gi;
  for (const f of cssFiles()) {
    const raw = read(f);
    const clean = stripCss(raw);
    const line = lineFinder(raw);
    for (const m of clean.matchAll(hexRe)) {
      if (hexOk.has(m[0].toLowerCase())) continue;
      add('colors', 'WARN', f, line(m.index), `colour literal ${m[0]}`);
    }
    for (const m of clean.matchAll(fnRe)) {
      if (whiteBlackAlpha.test(clean.slice(m.index))) continue;
      const shown = raw.slice(m.index).match(/^[^)\n]*\)?/)[0].slice(0, 60);
      add('colors', 'WARN', f, line(m.index), `colour function ${shown}`);
    }
  }
}

// ---------- 3. classes ----------
function checkClasses() {
  const css = cssFiles().map(f => stripCss(read(f))).join('\n');
  const defined = new Set([...css.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)].map(m => m[1]));
  // Parts that exist only as hooks (for scripts or structure) and deliberately carry no styles.
  const HOOKS = new Set(['fd-model-chip-label', 'fd-suggestions-text', 'fd-diff-src', 'fd-table-foot-info', 'fd-notification-list', 'fd-sheet-close']);
  const isFd = t => t.startsWith('fd-') && !t.includes('${') && !HOOKS.has(t);
  const classAttr = /(?<![\w-])class="([^"]*)"/g;
  const tokens = (s, idx) => s.split(/\s+/).filter(isFd).map(tok => ({ tok, idx }));

  for (const f of htmlFiles()) {
    const text = read(f);
    const line = lineFinder(text);
    const reported = new Set();
    for (const m of text.matchAll(classAttr)) {
      for (const { tok, idx } of tokens(m[1], m.index)) {
        if (defined.has(tok) || reported.has(tok)) continue;
        reported.add(tok);
        add('classes', 'WARN', f, line(idx), `class "${tok}" is not defined in base.css or components`);
      }
    }
  }

  for (const f of jsFiles()) {
    // Comments often show markup examples; blank them so they are not read as created classes.
    const text = read(f).replace(/\/\*[\s\S]*?\*\/|(?<![:\\])\/\/[^\n]*/g, (c) => c.replace(/[^\n]/g, ' '));
    const line = lineFinder(text);
    const made = [];
    for (const m of text.matchAll(/\bclassName\s*=\s*(["'])([^"']*)\1/g)) made.push(...tokens(m[2], m.index));
    for (const m of text.matchAll(/classList\.add\(([^)]*)\)/g)) {
      for (const a of m[1].matchAll(/(["'])([^"']*)\1/g)) made.push(...tokens(a[2], m.index));
    }
    for (const m of text.matchAll(classAttr)) made.push(...tokens(m[1], m.index));
    const reported = new Set();
    for (const { tok, idx } of made) {
      if (defined.has(tok) || reported.has(tok)) continue;
      reported.add(tok);
      add('classes', 'WARN', f, line(idx), `class "${tok}" created in JS is not defined in CSS`);
    }
  }
}

// ---------- 4. ids ----------
function checkIds() {
  for (const f of htmlFiles()) {
    const text = read(f);
    const line = lineFinder(text);
    const first = new Map();
    for (const m of stripBlocks(text).matchAll(/(?<![\w-])id="([^"]*)"/g)) {
      const id = m[1];
      if (!id || id.includes('${')) continue;
      if (first.has(id)) {
        add('ids', 'ERROR', f, line(m.index), `duplicate id "${id}" (first at line ${first.get(id)})`);
      } else {
        first.set(id, line(m.index));
      }
    }
  }
}

// ---------- 5. links ----------
function checkLinks() {
  const external = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i; // any scheme (http:, mailto:, data:, ...), protocol-relative, fragment
  for (const f of htmlFiles()) {
    const text = read(f);
    const line = lineFinder(text);
    // Code samples inside <pre> are text, not links: blank them, keeping positions.
    const scan = text.replace(/<pre[\s\S]*?<\/pre>/g, (block) => block.replace(/[^\n]/g, ' '));
    for (const m of scan.matchAll(/(?<![\w-])(href|src)="([^"]*)"/g)) {
      const v = m[2].trim();
      if (!v || v.includes('${') || v.includes('\u2026') || external.test(v)) continue;
      const bare = v.split(/[?#]/)[0];
      if (!bare) continue;
      let target = bare;
      try { target = decodeURIComponent(bare); } catch { /* keep raw */ }
      // Leading slash is resolved against the project root (the dev server root).
      const abs = target.startsWith('/') ? path.join(ROOT, target) : path.resolve(path.dirname(f), target);
      if (!fs.existsSync(abs)) add('links', 'ERROR', f, line(m.index), `missing ${m[1]} target "${v}"`);
    }
  }
}

// ---------- 6. tokens ----------
function checkTokens() {
  const files = walk(['fire', 'docs', 'templates'], ['.css', '.html', '.js']);
  const texts = files.map(f => [f, read(f)]);
  const declared = new Set();
  for (const [, t] of texts) {
    for (const m of t.matchAll(/--fd-([\w-]+)\s*:/g)) declared.add(m[1]); // CSS (incl. inline style="--fd-x:")
    for (const m of t.matchAll(/setProperty\(\s*(["'`])--fd-([\w-]+)\1/g)) declared.add(m[2]);
  }
  for (const [f, t] of texts) {
    const line = lineFinder(t);
    const reported = new Set();
    for (const m of t.matchAll(/var\(\s*--fd-([\w-]+)\s*([,)])/g)) {
      const name = m[1];
      if (m[2] === ',' || declared.has(name) || reported.has(name)) continue; // fallback given: not reported
      reported.add(name);
      add('tokens', 'ERROR', f, line(m.index), `undeclared token --fd-${name}`);
    }
  }
}

// ---------- literals ----------
// Every length, time and type metric in a component must be a token, so the system can be retuned from
// variables alone. Token blocks (`:root { … }`) and at-rule conditions are the only places a raw value may live.
// Allowed anywhere: 0, percentages, unitless numbers, and relative units (em, ch, fr, dvh, vw, deg, turn).
function checkLiterals() {
  const files = [...fs.readdirSync(path.join(ROOT, 'fire/components')).filter(f => f.endsWith('.css')).map(f => `fire/components/${f}`), 'fire/base.css'];
  for (const f of files) {
    const raw = read(f);
    const text = stripCss(raw);
    const line = lineFinder(text);
    let i = 0, segStart = 0;
    const stack = [];
    const scan = (from, to, inTokens) => {
      if (inTokens) return;
      const body = text.slice(from, to);
      for (const d of body.matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)) {
        const prop = d[1]; const value = d[2];
        const at = from + d.index;
        const found = [];
        for (const m of value.matchAll(/(?<![\w.#-])(\d*\.?\d+)(px|rem|ms|s)(?![\w-])/g)) if (Number(m[1]) !== 0) found.push(m[0]);
        if (prop === 'letter-spacing') for (const m of value.matchAll(/(?<![\w.(-])-?(\d*\.?\d+)em\b/g)) if (Number(m[1]) !== 0) found.push(m[0]);
        if (prop === 'line-height' && /^\s*\d*\.\d+\s*$/.test(value)) found.push(value.trim());
        if (found.length) add('literals', 'WARN', f, line(at), `${prop}: ${value.trim().slice(0, 70)}  ← ${[...new Set(found)].join(', ')}`);
      }
    };
    while (i < text.length) {
      const ch = text[i];
      if (ch === '{') {
        const prelude = text.slice(segStart, i).trim();
        const top = stack[stack.length - 1];
        const isGroup = /^@(media|container|supports|layer|scope|starting-style)/.test(prelude);
        const tokens = /^:root(\s*,|\s*$|\[)/.test(prelude) || /^@(property|font-face)/.test(prelude) || (top && top.tokens && !isGroup);
        stack.push({ tokens, group: isGroup });
        i++; segStart = i; continue;
      }
      if (ch === '}') {
        const top = stack.pop() || {};
        if (!top.group) scan(segStart, i, top.tokens);
        i++; segStart = i; continue;
      }
      i++;
    }
  }
}

// ---------- 6b. inline: markup never carries a pixel value ----------
// Gaps and grid columns come from the layout attributes (fire/layout.css); widths come from structure
// (.fd-column, grids, forms) and from component variants, never from markup.
// An inline style may pass a token, a relative value or a unitless parameter, never px, rem or ms.
function checkInline() {
  const dirs = ['templates', 'docs'];
  const files = dirs.flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(f => /\.(html|js)$/.test(f)).map(f => `${d}/${f}`));
  for (const f of files) {
    const text = read(f);
    for (const m of text.matchAll(/style="([^"]*)"/g)) {
      const literals = [...m[1].matchAll(/(?<![\w.#-])(\d*\.?\d+)(px|rem|ms|s)(?![\w-])/g)].filter(x => Number(x[1]) !== 0).map(x => x[0]);
      if (literals.length) add('inline', 'WARN', f, text.slice(0, m.index).split('\n').length, `style="${m[1].slice(0, 70)}"  ← ${[...new Set(literals)].join(', ')}`);
    }
    // Widths and heights are not set in markup at all: structure and component variants decide them.
    for (const m of text.matchAll(/\sdata-(w|max-w|h|min-h)="[^"]*"/g)) add('inline', 'WARN', f, text.slice(0, m.index).split('\n').length, `${m[0].trim()}  ← width / height attribute`);
  }
}

// ---------- 7. sizes ----------
const countLines = t => (t.length === 0 ? 0 : t.split('\n').length - (t.endsWith('\n') ? 1 : 0));

function reportSizes() {
  const groups = [
    ['fire/components/*.css', topFiles('fire/components', ['.css'])],
    ['fire/js/*.js', topFiles('fire/js', ['.js'])],
  ];
  for (const [label, list] of groups) {
    let bytes = 0, lines = 0;
    for (const f of list) {
      const size = fs.statSync(f).size;
      const n = countLines(read(f));
      bytes += size;
      lines += n;
      add('sizes', 'INFO', f, null, `${size} bytes, ${n} lines`);
    }
    add('sizes', 'INFO', label, null, `total: ${bytes} bytes, ${lines} lines (${list.length} files)`);
  }
}

// ---------- main ----------
async function main() {
  await checkIcons();
  checkColors();
  checkClasses();
  checkIds();
  checkLinks();
  checkTokens();
  checkLiterals();
  checkInline();
  reportSizes();

  const byPlace = (a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0);
  const count = {};
  for (const c of CHECKS) count[c] = findings.filter(f => f.check === c).length;
  const levelCount = lvl => findings.filter(f => f.level === lvl).length;

  if (AS_JSON) {
    console.log(JSON.stringify(findings, null, 2));
  } else {
    const out = [];
    for (const c of CHECKS) {
      out.push(`== ${c} (${LEVELS[c]}) ==`);
      const list = findings.filter(f => f.check === c).sort(byPlace);
      for (const f of list) out.push(`  ${f.line ? `${f.file}:${f.line}` : f.file}  ${f.message}`);
      if (list.length === 0) out.push('  none');
      out.push('');
    }
    out.push(`summary: ${CHECKS.map(c => `${c}=${count[c]}`).join(' ')}`);
    out.push(`totals: ERROR=${levelCount('ERROR')} WARN=${levelCount('WARN')} INFO=${levelCount('INFO')}`);
    console.log(out.join('\n'));
  }
  process.exitCode = levelCount('ERROR') > 0 ? 1 : 0;
}

main().catch(err => {
  console.error(err);
  process.exitCode = 2;
});
