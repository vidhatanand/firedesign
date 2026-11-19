// The CSS side of `fire slim` (scripts/slim.mjs) and of its map (scripts/build-slim-map.mjs): a rule splitter with byte
// offsets, and what a selector needs in order to match. No parser dependency, like lint-css's tokeniser.
//
//   splitCss(text)          top-level statements as nodes { type: 'rule' | 'at' | 'stmt', start, end, prelude, name,
//                           children }; the children of @media, @container, @supports, @layer and @starting-style
//                           blocks are split too, so they can be walked. Comments outside rules are not nodes.
//   selectorsOf(prelude)    a selector list split at its top-level commas
//   needs(selector)         { classes, tags, attrs }: the fd- classes, fd- tags and [attr="value"] pairs a selector
//                           requires. What sits inside :not(), :is(), :where(), :has() and the like is not required (a
//                           class there may be absent and the selector still match), so it is never counted.

export const GROUPS = new Set(['media', 'container', 'supports', 'layer', 'starting-style']);

/** Skips a comment or a string at i; returns the index after it, or i when there is none. */
function skip(text, i) {
  const c = text[i];
  if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); return e < 0 ? text.length : e + 2; }
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < text.length && text[j] !== c && text[j] !== '\n') { if (text[j] === '\\') j++; j++; }
    return j + 1;
  }
  return i;
}

/** The index of the `}` that closes the block opened at `open`. */
function closeOf(text, open) {
  let depth = 0;
  for (let i = open; i < text.length;) {
    const k = skip(text, i);
    if (k !== i) { i = k; continue; }
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
    i++;
  }
  return text.length - 1;
}

export function splitCss(text, from = 0, to = text.length) {
  const nodes = [];
  let i = from;
  while (i < to) {
    const k = skip(text, i);
    if (k !== i && text[i] === '/') { i = k; continue; }
    if (/\s|;|\}/.test(text[i])) { i++; continue; }
    const start = i;
    let j = i;
    while (j < to && text[j] !== '{' && text[j] !== ';') { const s = skip(text, j); j = s === j ? j + 1 : s; }
    const prelude = text.slice(start, j).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (text[j] !== '{') { nodes.push({ type: 'stmt', start, end: Math.min(j + 1, to), prelude }); i = j + 1; continue; }
    const close = closeOf(text, j);
    const name = prelude.startsWith('@') ? (/^@([\w-]+)/.exec(prelude)?.[1] || '').toLowerCase() : '';
    const node = { type: name ? 'at' : 'rule', start, end: close + 1, prelude, name, open: j };
    if (GROUPS.has(name)) node.children = splitCss(text, j + 1, close);
    nodes.push(node);
    i = close + 1;
  }
  return nodes;
}

/** Splits at top-level commas (not inside (), [] or strings). */
export function selectorsOf(prelude) {
  const out = [];
  let depth = 0, last = 0;
  for (let i = 0; i < prelude.length; i++) {
    const k = skip(prelude, i);
    if (k !== i) { i = k - 1; continue; }
    const c = prelude[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push(prelude.slice(last, i).trim()); last = i + 1; }
  }
  out.push(prelude.slice(last).trim());
  return out.filter(Boolean);
}

const ANY_OF = new Set(['is', 'where', 'matches', '-webkit-any', 'has']);

/** What a selector needs to match: { classes, tags, attrs, groups }. Outside functional pseudo-classes everything
 *  is required. :is(), :where() and :has() are groups: at least one of their selectors must be able to match. What is
 *  inside :not() or :nth-child(… of …) is never required. [class~="fd-x"] counts as the class. */
export function needs(selector) {
  let flat = '';
  const groups = [];
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === '"' || c === "'") { const k = skip(selector, i); flat += selector.slice(i, k); i = k - 1; continue; }
    if (c === '(') {
      const name = /:([\w-]+)$/.exec(flat)?.[1]?.toLowerCase();
      let depth = 1, j = i + 1;
      for (; j < selector.length && depth; j++) {
        const k = skip(selector, j);
        if (k !== j) { j = k - 1; continue; }
        if (selector[j] === '(') depth++; else if (selector[j] === ')') depth--;
      }
      const inner = selector.slice(i + 1, j - 1);
      if (ANY_OF.has(name)) groups.push(selectorsOf(inner).map((s) => needs(s.replace(/^[>+~]\s*/, ''))));
      flat += '()'; i = j - 1; continue;
    }
    flat += c;
  }
  const classes = [...flat.matchAll(/\.(fd-[\w-]+)/g), ...flat.matchAll(/\[\s*class\s*~=\s*["']?(fd-[\w-]+)/g)].map((m) => m[1]);
  const tags = [...flat.matchAll(/(?:^|[\s>+~])(fd-[a-z][\w-]*)/g)].map((m) => m[1]);
  const attrs = [...flat.matchAll(/\[\s*([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\s*[is]?)?\s*\]/g)]
    .map((m) => ({ name: m[1].toLowerCase(), op: m[2] || '', value: m[3] ?? m[4] ?? m[5] ?? null }))
    .filter((a) => a.name !== 'class');
  return { classes, tags, attrs, groups };
}

/** Whether a selector can still match. `has` answers for a class ('.fd-x'), a tag ('fd-x') or an attribute
 *  ({ name, op, value }): true when it may be on the page. */
export function canMatch(n, has) {
  return n.classes.every((c) => has('.' + c)) && n.tags.every((t) => has(t)) && n.attrs.every((a) => has(a))
    && n.groups.every((g) => g.some((s) => canMatch(s, has)));
}

/** Every Fire class, tag and attribute a selector names anywhere, required or not (for the map and the reports). */
export function named(n, out = { classes: new Set(), tags: new Set(), attrs: new Set() }) {
  n.classes.forEach((c) => out.classes.add(c)); n.tags.forEach((t) => out.tags.add(t)); n.attrs.forEach((a) => out.attrs.add(a.name));
  for (const g of n.groups) for (const s of g) named(s, out);
  return out;
}
