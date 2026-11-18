/* Fire's behaviour modules, typed by fire/fire.d.ts. They stay external imports of fire/elements.js
 * (`./js/charts.js`, …), so a page that loads fire/fire.js too runs one copy of each. */
import * as chartsModule from '../../fire/js/charts.js';
import * as codeModule from '../../fire/js/code.js';
import * as textureModule from '../../fire/js/texture.js';
import * as iconsModule from '../../fire/js/icons.js';
import type { charts as Charts, code as Code, texture as Texture, icon as Icon, ICONS as Icons } from '../../fire/fire.js';

export const charts = chartsModule as unknown as typeof Charts;
export const code = codeModule as unknown as typeof Code;
export const texture = textureModule as unknown as typeof Texture;
/** The SVG markup of one icon (it also puts the sprite the icon draws from on the page, once). */
export const icon = iconsModule.icon as unknown as typeof Icon;
/** Fire's icon set: name → SVG paths. */
export const ICONS = iconsModule.ICONS as unknown as typeof Icons;
/** Replace every `<i data-icon>` inside `root` with its SVG. */
export const upgradeIcons = iconsModule.upgradeIcons as (root?: ParentNode) => void;
