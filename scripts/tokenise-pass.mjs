// One-off mechanical pass: literal spacing and hairline widths become tokens, without changing any value.
// Usage: node scripts/tokenise-pass.mjs [--write]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const WRITE = process.argv.includes('--write');
const SPACE = { 2: '0-5', 4: '1', 6: '1-5', 8: '2', 10: '2-5', 12: '3', 14: '3-5', 16: '4', 20: '5', 24: '6', 32: '8', 40: '10', 48: '12', 64: '16', 80: '20', 96: '24' };
const files = [...readdirSync(new URL('../fire/components/', import.meta.url)).filter((f) => f.endsWith('.css')).map((f) => `fire/components/${f}`), 'fire/base.css'];
const SPACE_PROPS = /^(padding|margin|gap|row-gap|column-gap|scroll-padding|scroll-margin)(-[a-z-]+)?$/;
let total = { space: 0, hairline: 0 };
for (const file of files) {
  const url = new URL(`../${file}`, import.meta.url);
  let css = readFileSync(url, 'utf8');
  // Work declaration by declaration, leaving comments and custom-property declarations alone.
  css = css.replace(/(?<=[;{\s])([a-z-]+)(\s*:\s*)([^;{}]+)(?=[;}])/g, (m, prop, sep, value) => {
    if (prop.startsWith('--')) return m;
    let v = value;
    if (SPACE_PROPS.test(prop) && !/calc\(|clamp\(|min\(|max\(/.test(v)) {
      v = v.split(/(\s+)/).map((tok) => {
        const mm = tok.match(/^(-?)(\d+)px$/);
        if (!mm || !SPACE[mm[2]]) return tok;
        total.space++;
        return mm[1] ? `calc(var(--fd-space-${SPACE[mm[2]]}) * -1)` : `var(--fd-space-${SPACE[mm[2]]})`;
      }).join('');
    }
    if (/^border(-(top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?$/.test(prop) || /^(border(-[a-z-]+)?-width|outline)$/.test(prop)) {
      v = v.replace(/(^|\s)1px(?=\s|$)/g, (x, pre) => { total.hairline++; return `${pre}var(--fd-hairline)`; });
    }
    if (prop === 'box-shadow') {
      v = v.replace(/((?:inset\s+)?0 0 0 )1px(?=\s)/g, (x, pre) => { total.hairline++; return `${pre}var(--fd-hairline)`; });
    }
    return prop + sep + v;
  });
  if (WRITE) writeFileSync(url, css);
}
console.log(total, WRITE ? 'written' : 'dry run');
