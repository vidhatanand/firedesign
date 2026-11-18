// Types of fire/js/icons.js, for code that imports the module directly (`fire-design/fire/js/icons.js`): a server
// component that renders the icon sprite (spec/EXPORT.md N8), where fire.js itself cannot run. The same functions are
// exported by fire.js and typed in fire/fire.d.ts.
import type { IconName } from '../fire.js';

export type { IconName };

/** Every icon: name → the SVG children of its 24 × 24 symbol. Safe on a server (no DOM access). */
export declare const ICONS: Readonly<Record<IconName, string>>;

/** The markup of one drawn icon (`<svg class="fd-icon" data-icon … ><use href="#i-name"/></svg>`); in a browser it
 *  also puts the sprite on the page, once. */
export declare function icon(name: IconName, options?: { size?: 12 | 14 | 16 | 20 | 24 | `${number}`; cls?: string }): string;

/** Replace every `<i data-icon>` inside `root` (default: the document) with its SVG. Browser only. */
export declare function upgradeIcons(root?: ParentNode): void;

/** Change a drawn icon (or an `<i data-icon>`, or an element holding one icon) to another name. Browser only. */
export declare function setIcon(el: Element, name: IconName): void;

/** Add the sprite, draw every `<i data-icon>` and keep drawn icons in step with their `data-icon`. Browser only. */
export declare function initIcons(): void;
