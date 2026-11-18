/* Types of the Fire custom elements for Vue templates (Volar, vue-tsc). BUILT by scripts/build-wrappers-vue.mjs from
 * contract/custom-elements.json: edit the generator and rebuild, never this file. Loaded by wrappers/vue/index.d.ts. */
import type { DefineComponent, HTMLAttributes, VNodeProps, AllowedComponentProps, ComponentCustomProps } from 'vue';
import type { FireEventMap } from '../../fire/fire.js';
import type { FdChart, FdCode, FdIcon, FdTexture } from '../../fire/elements.js';
import type { FireDirective } from './index.js';

/** `@fd:change="fn"`, `@fd:select="fn"` and the other Fire events, typed on every HTML element. Vue reads the handler as the prop `onFd:change`. */
export type FireEventHandlers = {
  [K in keyof FireEventMap as `on${Capitalize<K>}`]?: (event: FireEventMap[K]) => void;
};

/** What every Fire element accepts besides its own properties: HTML's global attributes, `key`, `ref` and `v-*`. */
type Base = HTMLAttributes & VNodeProps & AllowedComponentProps & ComponentCustomProps;

/** A Fire element as a Vue component type: its properties (optional: the element has defaults), and its events. */
type FireElementComponent<Props, Events = unknown> = new () => { $props: Base & Props & FireEventHandlers & Events };

/** `<fd-chart>`: A chart drawn from data, safe to render from a framework. */
export type FdChartProps = Partial<Pick<FdChart, 'type' | 'variant' | 'data' | 'height' | 'width' | 'legend' | 'grid' | 'state' | 'label' | 'yFormat' | 'values' | 'area' | 'dot' | 'invert' | 'fluid' | 'tone' | 'size' | 'thickness' | 'value' | 'max' | 'format'>>;
export type FdChartEvents = { 'onFd:hover'?: (event: FireEventMap['fd:hover']) => void; 'onFd:select'?: (event: FireEventMap['fd:select']) => void; 'onFd:change'?: (event: FireEventMap['fd:change']) => void };

/** `<fd-code>`: A highlighted code block, safe to render from a framework. */
export type FdCodeProps = Partial<Pick<FdCode, 'code' | 'language' | 'lines' | 'highlight' | 'collapse' | 'wrap' | 'filename' | 'copy'>>;

/** `<fd-icon>`: An icon from Fire's set, safe to render from a framework. */
export type FdIconProps = Partial<Pick<FdIcon, 'icon' | 'size'>>;

/** `<fd-texture>`: A generative texture field, safe to render from a framework. */
export type FdTextureProps = Partial<Pick<FdTexture, 'pattern' | 'tone' | 'fade' | 'marks' | 'ramp' | 'cell' | 'seed' | 'animated' | 'speed' | 'intensity' | 'interactive' | 'origin' | 'side' | 'variant' | 'shape' | 'inline'>>;

declare module 'vue' {
  /** The `fd-` tags. With `isCustomElement` (see `fireVueOptions`) the tags are real elements; these types check their properties. */
  interface GlobalComponents {
    'fd-chart': FireElementComponent<FdChartProps, FdChartEvents>;
    'fd-code': FireElementComponent<FdCodeProps>;
    'fd-icon': FireElementComponent<FdIconProps>;
    'fd-texture': FireElementComponent<FdTextureProps>;
  }
  /** `@fd:change`, `@fd:select` and the others on any element. */
  interface HTMLAttributes extends FireEventHandlers {}
  /** `<main v-fire>`: runs Fire's `init` on the element's subtree after it mounts and after every update. */
  interface GlobalDirectives {
    vFire: FireDirective;
  }
}

export {};
