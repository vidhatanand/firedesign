// Types of fire/js/skeleton.js: the filled markup of Fire's skeleton presets, as strings. Pure, no DOM
// (`fire-design/skeleton`): use it in a server, a build step or a template to write a skeleton that draws before any
// script runs. texture.js fills an empty preset with the same markup.
import type { SkeletonAppOptions, SkeletonOptions, SkeletonPreset } from '../fire.js';

export type { SkeletonAppOptions, SkeletonOptions, SkeletonPreset };

/** The presets, in order: text, card, grid, table, stat, chart, list, thread, form, hero, page. */
export declare const SKELETON_PRESETS: readonly SkeletonPreset[];
/** The inside of a preset: what texture.js writes into an empty .fd-skeleton-<name>. Throws for an unknown preset. */
export declare function skeletonParts(name: SkeletonPreset | `fd-skeleton-${SkeletonPreset}`, options?: SkeletonOptions): string;
/** A whole preset element, filled, with its data attributes (and aria-hidden="true", except text). */
export declare function skeleton(name: SkeletonPreset | `fd-skeleton-${SkeletonPreset}`, options?: SkeletonOptions): string;
/** The first-load app skeleton: sidebar, top bar, page head and one filled preset, for a page's static HTML. */
export declare function skeletonApp(options?: SkeletonAppOptions): string;
