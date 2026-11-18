// Reads docs/_ref/VOCABULARY.md, the authority for what a component is and what its parts are.
//
// In a family line, every backticked `fd-` name at the top level (outside parentheses) is a component root.
// `a`/`b`/`c` joined by slashes is one component rooted at `a`: b and c are its parts. Names in the parentheses after
// a root are its parts. A backtick that holds several names (the Base list) gives one root each.

import path from 'node:path';
import { ROOT, read } from './source.mjs';

export function parseVocabulary(file = path.join(ROOT, 'docs/_ref/VOCABULARY.md')) {
  const roots = new Map();   // root class -> { family, order }
  const parts = new Map();   // part class -> root class
  const families = [];
  for (const line of read(file).split('\n').filter((l) => /^- \*\*/.test(l))) {
    const family = line.match(/^- \*\*([^*]+?)\*\*/)[1].replace(/\s*\(done\)\s*$/, '').trim();
    families.push(family);
    const body = line.slice(line.indexOf(':', line.indexOf('**', 4)) + 1);
    let depth = 0, current = null;
    for (const m of body.matchAll(/`([^`]*)`|([()])/g)) {
      if (m[2]) { depth += m[2] === '(' ? 1 : -1; continue; }
      const names = m[1].split(/\s+/).filter((t) => /^fd-[a-z0-9-]+$/.test(t));
      for (const name of names) {
        if (depth > 0) { if (current && !parts.has(name)) parts.set(name, current); continue; }
        const slashed = body[m.index - 1] === '/' && body[m.index - 2] === '`';
        if (slashed && current) { parts.set(name, current); continue; }
        if (!roots.has(name)) roots.set(name, { family });   // a name listed again keeps its first family
        current = name;
      }
    }
  }
  // A name that is also a root (listed again in another family) stays a root.
  for (const name of roots.keys()) parts.delete(name);
  return { roots, parts, families };
}
