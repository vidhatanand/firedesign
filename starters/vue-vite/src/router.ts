import { transition } from 'fire-design';
import { createRouter, createWebHistory } from 'vue-router';
import { nextTick } from 'vue';

declare module 'vue-router' {
  interface RouteMeta { title: string }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/overview' },
    { path: '/overview', component: () => import('./pages/Overview.vue'), meta: { title: 'Overview' } },
    { path: '/logs', component: () => import('./pages/Logs.vue'), meta: { title: 'Activity logs' } },
    { path: '/settings', component: () => import('./pages/Settings.vue'), meta: { title: 'Settings' } },
  ],
  scrollBehavior: (to) => (to.hash ? { el: to.hash } : { top: 0 }),
});

router.afterEach((to) => { document.title = `${to.meta.title} · Ember`; });

// A route change is one view transition (Fire's transition(): the sidebar and top bar hold still, the page fades). The
// guard opens the transition and lets the navigation go on once the browser has the old page; the page swaps while the
// transition's update is pending, and afterEach (which also runs for a cancelled or failed navigation) ends it.
let finish: (() => void) | undefined;
router.beforeResolve((to, from) => {
  if (from.matched.length === 0 || to.path === from.path) return;
  return new Promise<void>((proceed) => {
    void transition(() => {
      proceed();
      return new Promise<void>((done) => { finish = done; });
    });
  });
});
router.afterEach(() => {
  const done = finish;
  finish = undefined;
  if (done) void nextTick(done);
});
router.onError(() => { finish?.(); finish = undefined; });
