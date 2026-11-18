/* Type-checks fire/js/icons.d.ts, as a server component that renders the sprite uses it (spec/EXPORT.md N8). */
import { ICONS, icon, setIcon, upgradeIcons, initIcons, type IconName } from '../../fire/js/icons.js';

const symbols: string = Object.entries(ICONS).map(([n, p]) => `<symbol id="i-${n}" viewBox="0 0 24 24">${p}</symbol>`).join('');
const name: IconName = 'search';
const markup: string = icon(name, { size: 16, cls: 'x' });
upgradeIcons(document.body);
setIcon(document.body, 'home');
initIcons();
// @ts-expect-error not an icon name
icon('no-such-icon');
void symbols; void markup;
