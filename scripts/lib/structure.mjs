/*
 * structure: the structural rules of Fire's components, checked on a tree of plain objects. Pure: no fs, no DOM.
 * Two callers share it: the markup lint (scripts/lint-markup.mjs builds the tree from its tokens) and a check of the
 * rendered page, which serialises the live DOM into the same shape.
 *
 *   structureRules(catalog)        the rules, from the structure facts on the cards (contract/catalog.json,
 *                                  components[].card.parts[]: required, or, element, parent, inside, notInside, attrs,
 *                                  contains, skeleton; contract/cards/README.md) and the catalogue's nativeWrappers
 *   checkTree(root, rules, opts)   -> [{ rule, severity, message, fix, node }]   opts: { usesFire } (bare-control runs
 *                                  only when true; default: some node in the tree carries an fd- class)
 *
 * A node: { tag, classes: ['fd-…'], attrs: { name: 'value' | true | null }, children: [node…], dynamic, dynamicAttrs?,
 * text?, ref? }. attrs[name] is null when the value is an expression. dynamic: content the checker cannot see may be added
 * among its children (a hole, an expression, v-html). dynamicAttrs: attributes it cannot see may be added (a spread).
 * The root's tag is '#document' (a whole page: every parent is known) or '#fragment' (a template or a component: the
 * parents of its top elements are unknown).
 *
 * Rules (each an error, except bare-control, a warning):
 *   missing-part         a required part is absent from its component (`required`; `or` names classes that fill its place)
 *   wrong-element        a class on a tag it does not work on (`element`), or on the native element it must wrap (`contains`)
 *   wrong-parent         a part whose parent lacks the class it must sit in (`parent`), with no ancestor that carries one
 *                        of `inside`, or inside an ancestor that carries one of `notInside`
 *   missing-attribute    `attrs` { name: true } absent, or { name: "value" } absent or another value
 *   forbidden-attribute  `attrs` { name: false } present
 *   missing-child        no direct child of the tags in `contains` (`.fd-select > select`)
 *   bare-control         a <select>, <table>, <fieldset>, <textarea> or text <input> with no class, outside every Fire
 *                        class whose CSS styles that element (nativeWrappers), in markup that uses Fire
 *
 * What the tree cannot show is never reported. A required part or a child is not missing when the element that would
 * hold it has dynamic content or a child the checker cannot see into (a component, <slot>, <template>). `parent` and
 * `inside` are checked only when the parent or an ancestor is visible: never above a '#fragment' root or through such a
 * child. Attributes are not missing on a node with dynamicAttrs, and an expression's value is never forbidden. An element
 * with data-static-demo (an overlay drawn inline in docs) is exempt from `element` and `attrs`.
 */

const OPAQUE = new Set(['slot', 'template', 'component', 'transition', 'teleport', 'suspense']);
/** A node the checker cannot see into: a framework component (any capital, a dot or a colon), a JSX fragment, a custom
 *  element that is not one of Fire's, or a slot, template or framework built-in. */
export function opaque(node, rules) {
  const t = node.tag;
  if (!t) return true;   // a JSX fragment <>…</>: its children's parent is whatever holds it
  if (t[0] === '#') return false;
  if (/[A-Z.:]/.test(t) || OPAQUE.has(t)) return true;
  return t.includes('-') && !rules.elements.has(t);
}

export function structureRules(catalog) {
  const entries = new Map();   // class -> [entry]
  const required = new Map();  // root class -> [{ cls, or, parent }]
  const comps = catalog.components || [];
  for (const c of comps) {
    const parts = c.card?.parts || [];
    const skeleton = parts.find((p) => p.class === c.root)?.skeleton || null;
    for (const p of parts) {
      const facts = ['element', 'parent', 'inside', 'notInside', 'attrs', 'contains'].filter((k) => p[k]);
      if (facts.length) {
        const e = { id: c.id, name: c.name || c.id, root: c.root, cls: p.class, skeleton };
        for (const k of facts) e[k] = p[k];
        if (!entries.has(p.class)) entries.set(p.class, []);
        entries.get(p.class).push(e);
      }
      if (p.required) {
        if (!required.has(c.root)) required.set(c.root, []);
        required.get(c.root).push({ cls: p.class, or: p.or || [], parent: p.parent || null, id: c.id, name: c.name || c.id, skeleton });
      }
    }
  }
  const elements = new Set([...comps.map((c) => c.element).filter((t) => typeof t === 'string'),
    ...(catalog.elements || []).map((e) => (typeof e === 'string' ? e : e.tagName)).filter(Boolean)]);
  const wrappers = Object.fromEntries(Object.entries(catalog.nativeWrappers || {}).map(([t, list]) => [t, new Set(list)]));
  return { entries, required, elements, wrappers };
}

const TEXT_INPUT = new Set(['text', 'email', 'password', 'search', 'url', 'tel', 'number']);
const quote = (list) => list.map((x) => `\`${x}\``).join(' or ');
const open = (tag, cls, more = '') => `<${tag} class="${cls}"${more}>`;

export function checkTree(root, rules, opts = {}) {
  const out = [];
  const report = (rule, node, message, fix, severity = 'error') => out.push({ rule, severity, message, fix, node });
  const usesFire = opts.usesFire ?? (function any(n) { return n.classes?.some((k) => k.startsWith('fd-')) || n.children.some(any); })(root);
  const hidden = (n) => n.dynamic || n.children.some((ch) => opaque(ch, rules));
  // ancestors: nearest first, ending at the root. Returns 'yes', 'no', or 'unknown' (the chain leaves what is visible).
  const hasAncestor = (ancestors, classes) => {
    for (const a of ancestors) {
      if (a.classes?.some((k) => classes.includes(k))) return 'yes';
      if (a.tag === '#fragment' || opaque(a, rules)) return 'unknown';
    }
    return 'no';
  };
  const where = (e) => `${e.name} (${e.id})`;
  const tagOf = (cls) => rules.entries.get(cls)?.find((x) => x.element)?.element[0] || 'div';

  function visit(node, ancestors) {
    const parent = ancestors[0];
    const tag = node.tag;
    const native = !opaque(node, rules);
    const demo = node.attrs && 'data-static-demo' in node.attrs;
    for (const cls of node.classes || []) {
      for (const e of rules.entries.get(cls) || []) {
        if (native && !demo && e.contains?.includes(tag)) {
          report('wrong-element', node, `${where(e)}: \`${cls}\` is on the <${tag}> itself; it goes on the element that wraps the <${tag}>`,
            e.skeleton || `${open(e.element?.[0] || 'label', cls)}<${tag}>…</${tag}></${e.element?.[0] || 'label'}>`);
        } else if (native && !demo && e.element && !e.element.includes(tag)) {
          report('wrong-element', node, `${where(e)}: \`${cls}\` works on <${e.element.join('>, <')}>, not on <${tag}>`,
            `${open(e.element[0], cls)}…</${e.element[0]}>`);
        } else if (native && e.contains && !hidden(node) && !node.children.some((ch) => e.contains.includes(ch.tag))) {
          report('missing-child', node, `${where(e)}: \`${cls}\` must hold a <${e.contains.join('> or <')}> as a direct child`,
            e.skeleton || `${open(tag, cls)}<${e.contains[0]}>…</${e.contains[0]}></${tag}>`);
        }
        if (e.parent && parent.tag !== '#fragment' && !opaque(parent, rules) && !parent.classes?.some((k) => e.parent.includes(k))) {
          report('wrong-parent', node, `${where(e)}: \`${cls}\` must be a direct child of ${quote(e.parent)}`,
            `${open(tagOf(e.parent[0]), e.parent[0])}${open(tag, cls)}…</${tag}>…</${tagOf(e.parent[0])}>`);
        }
        if (e.inside && hasAncestor(ancestors, e.inside) === 'no') {
          report('wrong-parent', node, `${where(e)}: \`${cls}\` works only inside ${quote(e.inside)}`,
            `${open(tagOf(e.inside[0]), e.inside[0])}…${open(tag, cls)}…</${tag}>…</${tagOf(e.inside[0])}>`);
        }
        if (e.notInside) {
          const bad = ancestors.find((a) => a.classes?.some((k) => e.notInside.includes(k)));
          if (bad) report('wrong-parent', node, `${where(e)}: \`${cls}\` must not sit inside \`${bad.classes.find((k) => e.notInside.includes(k))}\``,
            `move the ${open(tag, cls)} out of it`);
        }
        if (e.attrs && !demo) {
          for (const [name, want] of Object.entries(e.attrs)) {
            const have = node.attrs?.[name];
            if (want === false) {
              if (have !== undefined && have !== null) report('forbidden-attribute', node, `${where(e)}: \`${cls}\` must not carry ${name}${name === 'hidden' ? ' ([hidden] is display: none !important, so it never shows; Fire keeps it shut until it opens)' : ''}`,
                `remove ${name}: ${e.skeleton || `${open(tag, cls)}…</${tag}>`}`);
            } else if (have === undefined && !node.dynamicAttrs || typeof want === 'string' && typeof have === 'string' && have !== want) {
              const attr = want === true ? name : `${name}="${want}"`;
              report('missing-attribute', node, `${where(e)}: \`${cls}\` needs ${attr}`, `${open(tag, cls, ` ${attr}`)}…</${tag}>`);
            }
          }
        }
      }
      for (const r of native ? rules.required.get(cls) || [] : []) {   // a component carrying the class renders its own inside
        const want = [r.cls, ...r.or];
        const found = (function find(n) { return n.children.some((ch) => ch.classes?.some((k) => want.includes(k)) || find(ch)); })(node);
        if (found) continue;
        // where the part would sit: the root itself when it is a direct child of the root, else anywhere inside
        const holders = [];
        (function collect(n, top) {
          if (top || !r.parent || n.classes?.some((k) => r.parent.includes(k))) holders.push(n);
          for (const ch of n.children) if (!opaque(ch, rules)) collect(ch, false);
        })(node, !r.parent || r.parent.includes(cls));
        if (holders.some(hidden)) continue;
        report('missing-part', node, `${r.name} (${r.id}): \`${cls}\` has no \`${r.cls}\`${r.or.length ? ` (or ${quote(r.or)})` : ''}`,
          r.skeleton || `${open(tag, cls)}${open('div', r.cls)}…</div>…</${tag}>`);
      }
    }
    if (usesFire && native && !node.classes?.length && node.attrs?.class !== null && !String(node.attrs?.class ?? '').trim()) {
      const type = typeof node.attrs?.type === 'string' ? node.attrs.type.toLowerCase() : 'text';
      const control = ['select', 'table', 'fieldset', 'textarea'].includes(tag) || (tag === 'input' && TEXT_INPUT.has(type) && node.attrs?.type !== null);
      // In a fragment the wrapper may sit above what is visible: report only a control laid inside Fire markup.
      const wrapped = hasAncestor(ancestors, [...(rules.wrappers[tag] || [])]);
      const inFire = ancestors.some((a) => a.classes?.some((k) => k.startsWith('fd-')));
      if (control && !node.dynamicAttrs && (wrapped === 'no' || wrapped === 'unknown' && inFire)) {
        const as = { select: '<label class="fd-select"><select>…</select></label>', table: '<div class="fd-table-wrap"><div class="fd-table-scroll"><table class="fd-table">…</table></div></div>',
          fieldset: '<div class="fd-field" role="group" aria-labelledby="…">, or give the fieldset the Fire class of what it groups', textarea: '<textarea class="fd-textarea">',
          input: `<input class="fd-input" type="${type}">` };
        report('bare-control', node, `a bare <${tag}> on a page that uses Fire: no Fire class styles it`, `write ${as[tag]}`, 'warning');
      }
    }
    for (const ch of node.children) visit(ch, [node, ...ancestors]);
  }
  for (const ch of root.children) visit(ch, [root]);
  return out;
}
