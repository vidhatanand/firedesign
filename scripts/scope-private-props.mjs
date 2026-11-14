// One-off refactor: give each component family its own namespace for private custom properties.
//   --_px in forms.css  ->  --_f-px      (so a container's --_px can never leak into an input)
// A rule whose subject is another family's class keeps talking to that family:
//   forms.css  .fd-input-affix > .fd-btn { --_radius: … }  ->  --_b-radius
// Usage: node scripts/scope-private-props.mjs [--write]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const WRITE = process.argv.includes('--write');
const PFX = { button: 'b', shell: 's', nav: 'n', forms: 'f', overlays: 'o', data: 'd', content: 'c', code: 'k', agent: 'a', charts: 'ch', texture: 'tx', skeleton: 'sk' };
const dir = new URL('../fire/components/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.css'));
const src = Object.fromEntries(files.map((f) => [f.replace('.css', ''), readFileSync(new URL(f, dir), 'utf8')]));
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

// Class ownership: the family whose stylesheet mentions the class most.
const counts = {};
for (const [fam, css] of Object.entries(src)) for (const m of strip(css).matchAll(/\.(fd-[a-z0-9-]+)/g)) ((counts[m[1]] ||= {})[fam] = (counts[m[1]][fam] || 0) + 1);
const BASE = new Set([...strip(readFileSync(new URL('../fire/base.css', import.meta.url), 'utf8')).matchAll(/\.(fd-[a-z0-9-]+)/g)].map((m) => m[1]));
const owner = (cls) => { if (BASE.has(cls)) return null; const c = counts[cls]; if (!c) return null; return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };

const subjectFamilies = (prelude) => {
  const fams = new Set();
  // split the selector list at top-level commas
  let depth = 0, cur = '', parts = [];
  for (const ch of prelude) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch; }
  parts.push(cur);
  for (const sel of parts) {
    // last compound: text after the last top-level combinator
    let d = 0, last = 0;
    for (let i = 0; i < sel.length; i++) { const ch = sel[i]; if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (d === 0 && /[\s>+~]/.test(ch) && sel.slice(i).trim()) last = i + 1; }
    const compound = sel.slice(last).replace(/:(?:not|has)\([^()]*(?:\([^()]*\)[^()]*)*\)/g, '');
    for (const m of compound.matchAll(/\.(fd-[a-z0-9-]+)/g)) { const o = owner(m[1]); if (o) fams.add(o); }
  }
  return fams;
};

const log = [];
const out = {};
for (const [fam, css] of Object.entries(src)) {
  const clean = strip(css);
  let res = '', i = 0, stack = [];
  const rename = (text, target) => text.replace(/--_([a-z][\w-]*)/g, (m, name) => `--_${PFX[target]}-${name}`);
  let segStart = 0;
  while (i < clean.length) {
    const ch = clean[i];
    if (ch === '{') {
      const prelude = clean.slice(segStart, i);
      const trimmed = prelude.trim();
      let target = fam, kind = 'rule';
      if (/^@(media|container|supports|layer|scope|starting-style)/.test(trimmed)) kind = 'group';
      else if (/^@property/.test(trimmed) || /^@keyframes/.test(trimmed) || /^@font-face/.test(trimmed)) kind = 'own';
      else if (stack.length && stack[stack.length - 1].kind === 'own') kind = 'own';
      else {
        const fams = subjectFamilies(trimmed);
        const others = [...fams].filter((f) => f !== fam);
        if (others.length === 1 && !fams.has(fam)) { target = others[0]; if (/--_/.test(clean.slice(i, clean.indexOf('}', i)))) log.push(`${fam}.css: "${trimmed.slice(0, 80)}" -> ${target}`); }
        else if (others.length && /--_/.test(clean.slice(i, clean.indexOf('}', i)))) log.push(`${fam}.css: MIXED "${trimmed.slice(0, 90)}" [${[...fams]}] kept as ${fam}`);
      }
      // prelude itself may name a private property (@property --_x)
      res += rename(css.slice(segStart, i), fam) + '{';
      stack.push({ kind, target: kind === 'group' ? (stack.length ? stack[stack.length - 1].target : fam) : target });
      i++; segStart = i; continue;
    }
    if (ch === '}') {
      const top = stack.pop() || { target: fam };
      res += rename(css.slice(segStart, i), top.target) + '}';
      i++; segStart = i; continue;
    }
    i++;
  }
  res += css.slice(segStart);
  out[fam] = res;
}
// JS: each module sets private properties on its own family's elements.
const jsDir = new URL('../fire/js/', import.meta.url);
const JS_FAMS = { shell: ['shell'], nav: ['nav'], forms: ['forms'], overlays: ['overlays'], data: ['data'], content: ['content'], code: ['code'], agent: ['agent'], charts: ['charts'], texture: ['texture', 'skeleton'] };
const jsOut = {};
for (const [mod, fams] of Object.entries(JS_FAMS)) {
  const js = readFileSync(new URL(`${mod}.js`, jsDir), 'utf8');
  jsOut[mod] = js.replace(/--_([a-z][\w-]*)/g, (m, name) => {
    const hits = fams.filter((f) => new RegExp(`--_${name}(?![\\w-])`).test(strip(src[f])));
    if (hits.length !== 1) { log.push(`${mod}.js: --_${name} ${hits.length ? 'in ' + hits : 'not found in css'} -> ${hits[0] || fams[0]}`); }
    return `--_${PFX[hits[0] || fams[0]]}-${name}`;
  });
}
console.log(log.join('\n'));
if (WRITE) {
  for (const [fam, css] of Object.entries(out)) writeFileSync(new URL(`${fam}.css`, dir), css);
  for (const [mod, js] of Object.entries(jsOut)) writeFileSync(new URL(`${mod}.js`, jsDir), js);
  console.log('written');
}
