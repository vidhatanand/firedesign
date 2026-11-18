#!/usr/bin/env node
// Builds the Vue wrapper's element types from contract/custom-elements.json:
//   wrappers/vue/elements.d.ts   GlobalComponents for the fd- tags (typed props, typed @fd:* events), the typed
//                                `onFd:*` handlers on every HTML element, and the `v-fire` global directive.
// wrappers/vue/index.js and index.d.ts are written by hand (the plugin, the directive, the Vite helper).
// Usage: node scripts/build-wrappers-vue.mjs [--check]
//   --check exits 1 when the committed output differs from what the manifest produces.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'wrappers/vue/elements.d.ts');
const check = process.argv.includes('--check');

const manifest = JSON.parse(readFileSync(path.join(ROOT, 'contract/custom-elements.json'), 'utf8'));
const elements = [];
for (const mod of manifest.modules) {
  for (const decl of mod.declarations ?? []) {
    if (!decl.tagName) continue;
    elements.push({
      tag: decl.tagName,
      className: decl.name,
      summary: (decl.summary ?? '').trim(),
      // the public properties that have an attribute, by property name (an attribute `y-format` is the property `yFormat`)
      props: (decl.attributes ?? []).map((a) => a.fieldName).filter(Boolean),
      events: (decl.events ?? []).map((e) => e.name),
    });
  }
}
elements.sort((a, b) => a.tag.localeCompare(b.tag));
if (!elements.length) { console.error('no custom elements in contract/custom-elements.json'); process.exit(1); }

const union = (names) => names.map((n) => `'${n}'`).join(' | ');
const classes = elements.map((e) => e.className).sort();

const out = [];
out.push(`/* Types of the Fire custom elements for Vue templates (Volar, vue-tsc). BUILT by scripts/build-wrappers-vue.mjs from
 * contract/custom-elements.json: edit the generator and rebuild, never this file. Loaded by wrappers/vue/index.d.ts. */
import type { DefineComponent, HTMLAttributes, VNodeProps, AllowedComponentProps, ComponentCustomProps } from 'vue';
import type { FireEventMap } from '../../fire/fire.js';
import type { ${classes.join(', ')} } from '../../fire/elements.js';
import type { FireDirective } from './index.js';

/** \`@fd:change="fn"\`, \`@fd:select="fn"\` and the other Fire events, typed on every HTML element. Vue reads the handler as the prop \`onFd:change\`. */
export type FireEventHandlers = {
  [K in keyof FireEventMap as \`on\${Capitalize<K>}\`]?: (event: FireEventMap[K]) => void;
};

/** What every Fire element accepts besides its own properties: HTML's global attributes, \`key\`, \`ref\` and \`v-*\`. */
type Base = HTMLAttributes & VNodeProps & AllowedComponentProps & ComponentCustomProps;

/** A Fire element as a Vue component type: its properties (optional: the element has defaults), and its events. */
type FireElementComponent<Props, Events = unknown> = new () => { $props: Base & Props & FireEventHandlers & Events };
`);

for (const e of elements) {
  const props = e.props.length ? `Partial<Pick<${e.className}, ${union(e.props)}>>` : '{}';
  out.push(`/** \`<${e.tag}>\`${e.summary ? `: ${e.summary}` : ''} */`);
  out.push(`export type ${e.className}Props = ${props};`);
  if (e.events.length) out.push(`export type ${e.className}Events = { ${e.events.map((n) => `'on${n[0].toUpperCase()}${n.slice(1)}'?: (event: FireEventMap['${n}']) => void`).join('; ')} };`);
  out.push('');
}

out.push(`declare module 'vue' {
  /** The \`fd-\` tags. With \`isCustomElement\` (see \`fireVueOptions\`) the tags are real elements; these types check their properties. */
  interface GlobalComponents {`);
for (const e of elements) out.push(`    '${e.tag}': FireElementComponent<${e.className}Props${e.events.length ? `, ${e.className}Events` : ''}>;`);
out.push(`  }
  /** \`@fd:change\`, \`@fd:select\` and the others on any element. */
  interface HTMLAttributes extends FireEventHandlers {}
  /** \`<main v-fire>\`: runs Fire's \`init\` on the element's subtree after it mounts and after every update. */
  interface GlobalDirectives {
    vFire: FireDirective;
  }
}
`);
out.push('export {};');
const text = out.join('\n') + '\n';

if (check) {
  let current = '';
  try { current = readFileSync(OUT, 'utf8'); } catch {}
  if (current !== text) { console.error('wrappers/vue/elements.d.ts is stale: run node scripts/build-wrappers-vue.mjs'); process.exit(1); }
  console.log(`wrappers/vue/elements.d.ts is current (${elements.length} elements)`);
} else {
  writeFileSync(OUT, text);
  console.log(`wrote wrappers/vue/elements.d.ts (${elements.length} elements: ${elements.map((e) => e.tag).join(', ')})`);
}
