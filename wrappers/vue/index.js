// fire-design/vue: Vue 3 support for Fire. See spec/EXPORT.md (C8, L1, L2, L3).
//
//   import Fire from 'fire-design/vue';
//   app.use(Fire, { router });          // the v-fire directive, and Fire's init after each route change
//
//   // vite.config.ts
//   import { fireVueOptions } from 'fire-design/vue';
//   vue(fireVueOptions())               // isCustomElement for fd- tags, whitespace: 'preserve'

// Fire's behaviour modules need a browser (`document` at import), while this file is also imported by vite.config in
// Node for `fireVueOptions`. So `fire.js` is loaded on first use. The bundler resolves the dynamic import to the module
// the app already imports (one instance), so after the first call `init` runs one microtask after it is asked for.
let fire;
const load = () => (fire ??= import('../../fire/fire.js'));
const init = (root) => load().then((m) => m.init(root));

/** True for Fire's custom elements: every tag that starts with `fd-`. */
export const isFireElement = (tag) => tag.startsWith('fd-');

/**
 * The `vue()` plugin options Fire needs (EXPORT C8 and T1): `fd-` tags are custom elements, and whitespace between
 * inline elements is kept. Options of your own are merged; a `isCustomElement` of yours still applies.
 * @param {import('@vue/compiler-sfc').SFCTemplateCompileOptions | object} [options] options for `vue()`
 */
export function fireVueOptions(options = {}) {
  const template = options.template ?? {};
  const compilerOptions = template.compilerOptions ?? {};
  const own = compilerOptions.isCustomElement;
  return {
    ...options,
    template: {
      ...template,
      compilerOptions: {
        ...compilerOptions,
        isCustomElement: (tag) => isFireElement(tag) || (own ? own(tag) : false),
        whitespace: 'preserve',
      },
    },
  };
}

/**
 * Runs Fire's `init` on `root`, once the subtree is ready to be measured:
 * - Fire's own elements (fd-chart, fd-code, …) enhance themselves after their first render, which Lit schedules as a
 *   microtask. If `init` reached them first, Fire's markup modules would read the element before its data is in the DOM
 *   and mark it done. So `init` waits for the Fire elements in the subtree that are still rendering.
 * - Charts measure their labels. A web font starts loading when text first uses it, which is after the mount hook, and
 *   Fire redraws charts for fonts that were loading when charts.js was imported, which in a single-page app is before
 *   anything is on the page. So a chart drawn at once keeps the measure of the fallback font. So the layout is forced
 *   (which starts the fonts the subtree uses) and `init` waits while the document is loading fonts. When no font is
 *   loading it runs in the microtask after the hook, before the first paint.
 * `init` is idempotent and cheap, so running it later than the hook is harmless.
 */
async function initWhenSettled(root) {
  const pending = [];
  for (const el of root.querySelectorAll('*')) if (isFireElement(el.localName) && el.updateComplete) pending.push(el.updateComplete);
  if (pending.length) await Promise.all(pending);
  const doc = root.ownerDocument ?? root;
  if (doc.fonts && doc.body) {
    void doc.body.offsetWidth;
    if (doc.fonts.status === 'loading') await doc.fonts.ready;
  }
  return init(root);
}

/** `v-fire`: runs Fire's `init` on the element's subtree when it mounts and after each update (idempotent). */
export const fireDirective = {
  mounted(el) { initWhenSettled(el); },
  updated(el) { initWhenSettled(el); },
};

/**
 * Runs `init(document)` after every route change, once Vue has rendered the new page (EXPORT L3).
 * @param {{ afterEach(guard: () => void): unknown }} router a vue-router instance
 */
export function fireRouter(router) {
  // vue-router calls the guard when the route has changed; Vue renders the new page in a microtask after that.
  return router.afterEach(() => { Promise.resolve().then(() => requestAnimationFrame(() => initWhenSettled(document))); });
}

/**
 * The plugin. `app.use(Fire)` installs the `v-fire` directive. It also sets the compiler options for templates that
 * Vue compiles in the browser (single-file components are compiled by Vite: use `fireVueOptions` there).
 * Options: `router` (a vue-router instance: Fire's `init` runs after each route change).
 */
const Fire = {
  install(app, options = {}) {
    app.directive('fire', fireDirective);
    const compiler = app.config.compilerOptions;
    const own = compiler.isCustomElement;
    compiler.isCustomElement = (tag) => isFireElement(tag) || (own ? own(tag) : false);
    compiler.whitespace = 'preserve';
    if (options.router) fireRouter(options.router);
  },
};

export default Fire;
export { Fire };
