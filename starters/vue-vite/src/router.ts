import { createRouter, createWebHistory } from 'vue-router';

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
