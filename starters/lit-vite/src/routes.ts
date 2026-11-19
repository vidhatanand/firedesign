import type { Guard, Route } from './lib/router';

/** Lets the visitor in when the session has the permission; anyone else sees the no-access page. */
const allow = (permission: string): Guard => ({ session }) => session.can(permission) || '/no-access';

const overview = () => import('./screens/overview/screen');
const logs = () => import('./screens/logs/screen');

/**
 * Every address of the app, in the order they are tried. A route with `label` is in the navigation. Each screen is
 * its own chunk, loaded on the first visit (or when a link to it is hovered or focused). The status screens
 * (not-found, no-access) are in the shell's chunk, as they must show when nothing else loads.
 */
export const routes: Route[] = [
  { path: '/', redirect: '/overview' },
  { path: '/overview', tag: 'screen-overview', load: overview, title: 'Overview', label: 'Overview', icon: 'home', keys: 'g o', keywords: 'home dashboard credits' },
  { path: '/logs', tag: 'screen-logs', load: logs, title: 'Activity logs', label: 'Activity logs', icon: 'list', group: 'Team', keys: 'g l', keywords: 'requests history' },
  // The same screen with a request open in its detail sheet: a link can point at one request.
  { path: '/logs/:id', tag: 'screen-logs', load: logs, title: ({ params }) => `Request ${params.id}` },
  { path: '/settings', tag: 'screen-settings', load: () => import('./screens/settings/screen'), title: 'Settings', label: 'Settings', icon: 'settings', group: 'Account', keys: 'g s', keywords: 'preferences team account' },
  { path: '/elements', tag: 'screen-elements', load: () => import('./screens/elements/screen'), title: 'Elements', guard: allow('elements:view'), label: 'Elements', icon: 'blocks', group: 'Fire', keys: 'g e', keywords: 'components charts code' },
  { path: '/no-access', tag: 'screen-no-access', title: 'No access' },
  { path: '*', tag: 'screen-not-found', title: 'Page not found' },
];
