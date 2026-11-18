/* Types of fire-design/vue. The element types (GlobalComponents, `onFd:*` handlers, GlobalDirectives) are in
 * elements.d.ts, BUILT by scripts/build-wrappers-vue.mjs. */
/// <reference path="./elements.d.ts" />
import type { Plugin, ObjectDirective } from 'vue';

export type { FireEventHandlers } from './elements.js';

/** Options of `app.use(Fire, options)`. */
export interface FireVueOptions {
  /** A vue-router instance: Fire's `init(document)` runs after each route change, once Vue has rendered the page. */
  router?: { afterEach(guard: (...args: any[]) => any): unknown };
}

/** `v-fire`: runs Fire's `init` on the element's subtree after it mounts and after every update. */
export type FireDirective = ObjectDirective<Element>;
export declare const fireDirective: FireDirective;

/** True for Fire's custom elements: every tag that starts with `fd-`. */
export declare function isFireElement(tag: string): boolean;

/** Options for the `vue()` Vite plugin: `isCustomElement` for `fd-` tags and `whitespace: 'preserve'`, merged into yours. */
export declare function fireVueOptions<T extends { template?: { compilerOptions?: Record<string, any>; [key: string]: any } }>(options?: T): T & {
  template: { compilerOptions: { isCustomElement: (tag: string) => boolean; whitespace: 'preserve'; [key: string]: any }; [key: string]: any };
};

/** Runs `init(document)` after every route change (what `app.use(Fire, { router })` does). */
export declare function fireRouter(router: FireVueOptions['router'] & object): unknown;

/** The plugin: `app.use(Fire)`. */
declare const Fire: Plugin<[FireVueOptions?]>;
export default Fire;
export { Fire };
