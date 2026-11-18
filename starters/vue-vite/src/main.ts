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

createApp(App)
  .use(router)
  // `v-fire` runs Fire's init on a subtree; `router` makes Fire run again after each route change (EXPORT L3).
  .use(Fire, { router })
  .mount('#app');
