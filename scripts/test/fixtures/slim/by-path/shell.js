// A product that vendors Fire next to its code and loads it by path, the way Fire's own templates do.
import { init, overlays, shell, tweaks } from '/fire/fire.js';
import { charts } from '../fire/fire.js';
import { safeImageUrl } from '/fire/js/content.js';
import * as F from '/fire/fire.js';

const { filters } = await import('/fire/fire.js');
const code = () => import('/fire/js/code.js');

init(document);
F.nav.selectTab(document.querySelector('[role="tab"]'));
tweaks.open();
export { overlays, shell, charts, safeImageUrl, filters, code };
