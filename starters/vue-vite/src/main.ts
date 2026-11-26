// Fire's stylesheet, then the look (a theme record turned into a file by `npm run theme`): the look comes after
// fire.css, so its tokens win at equal specificity (EXPORT H1, H3).
import 'fire-design/css';
import './fire-theme.css';
// Fire's custom elements are registered before the first render (EXPORT C1).
import 'fire-design/elements';
// Fire's behaviours: delegated listeners, and `init(document)` once the document is ready.
import 'fire-design';
import { createApp } from 'vue';
import Fire from 'fire-design/vue';
import App from './App.vue';
import { router } from './router';

const app = createApp(App)
  .use(router)
  // `v-fire` runs Fire's init on a subtree; `router` makes Fire run again after each route change (EXPORT L3).
  .use(Fire, { router });

// index.html's first-load skeleton stays until the first page's code has loaded; mounting replaces it in one frame.
// That first page's own skeletons then show at once: waiting --fd-skeleton-delay would blank it for a moment.
// Later pages wait as usual.
const root = document.getElementById('app')!;
root.style.setProperty('--fd-skeleton-delay', '0s');
router.afterEach((_to, from) => { if (from.matched.length) root.style.removeProperty('--fd-skeleton-delay'); });
void router.isReady().then(() => app.mount(root));
