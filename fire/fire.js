/* Fire — all behaviours. <script type="module" src="fire/fire.js"></script>
 * Each module is also importable on its own; all export init(root = document). */
import { ready, copyText, emit } from './js/core.js';
import { initIcons, upgradeIcons } from './js/icons.js';
import * as shell from './js/shell.js';
import * as nav from './js/nav.js';
import * as forms from './js/forms.js';
import * as overlays from './js/overlays.js';
import * as data from './js/data.js';
import * as content from './js/content.js';
import * as code from './js/code.js';
import * as agent from './js/agent.js';
import * as chat from './js/chat.js';
import * as charts from './js/charts.js';
import * as texture from './js/texture.js';
import * as docsite from './js/docsite.js';
import * as tweaks from './js/tweaks.js';
import * as site from './js/site.js';
import * as transitions from './js/transitions.js';

const modules = { shell, nav, forms, overlays, data, content, code, agent, chat, charts, texture, docsite, tweaks, site, transitions };

/** Initialise every behaviour inside `root`. Call again after inserting markup. */
export function init(root = document) {
  upgradeIcons(root);
  for (const [name, mod] of Object.entries(modules)) {
    try { mod.init?.(root); } catch (error) { console.error(`[fire] ${name}.init failed`, error); }
  }
}

// Copy buttons: <button data-fd-copy="text">, or data-fd-copy-from="#selector" to copy an element's text.
// The button carries data-state="done" for 1.4s, which .fd-btn-swap and CSS can react to.
function bindCopy() {
  document.addEventListener('click', async (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-fd-copy], [data-fd-copy-from]') : null;
    if (!button) return;
    const text = button.dataset.fdCopy || document.querySelector(button.dataset.fdCopyFrom)?.textContent?.trim() || '';
    if (!text || !(await copyText(text))) return;
    button.dataset.state = 'done';
    emit(button, 'fd:copy', { value: text });
    clearTimeout(button.fdCopyTimer);
    button.fdCopyTimer = setTimeout(() => { delete button.dataset.state; }, 1400);
  });
}

ready(() => { initIcons(); init(document); bindCopy(); document.documentElement.dataset.fdReady = ''; });

export * from './js/core.js';
export { icon, setIcon, ICONS } from './js/icons.js';
export { transition } from './js/transitions.js';
export { shell, nav, forms, overlays, data, content, code, agent, chat, charts, texture, docsite, tweaks, site, transitions };
