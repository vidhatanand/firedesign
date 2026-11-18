import type { IconName } from 'fire-design';

/** One screen of the app. Add a route here, write its component, and import the component in `main.ts`. */
export interface Route {
  /** The URL path, for example `/logs`. */
  path: string;
  /** The custom element that renders the screen. */
  tag: string;
  label: string;
  icon: IconName;
  /** The label of the sidebar group the item sits under (items without one sit at the top). */
  group?: string;
  /** The go-to keys: `g` then this letter goes here (data-fd-keys="g o"). */
  keys: string;
  /** Words the command palette also finds the page by. */
  keywords?: string;
}

export const routes: Route[] = [
  { path: '/overview', tag: 'screen-overview', label: 'Overview', icon: 'home', keys: 'g o', keywords: 'home dashboard credits' },
  { path: '/logs', tag: 'screen-logs', label: 'Activity logs', icon: 'list', group: 'Team', keys: 'g l', keywords: 'requests history' },
  { path: '/settings', tag: 'screen-settings', label: 'Settings', icon: 'settings', group: 'Account', keys: 'g s', keywords: 'preferences team account' },
  { path: '/elements', tag: 'screen-elements', label: 'Elements', icon: 'blocks', group: 'Fire', keys: 'g e', keywords: 'components charts code' },
];

/** The route for the current URL. An unknown path shows the first route. */
export function currentRoute(): Route {
  return routes.find((route) => route.path === location.pathname) ?? routes[0];
}

/** Go to a URL of this app and tell the shell. */
export function navigate(url: string): void {
  history.pushState(null, '', url);
  dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Turns clicks on links to a route of this app into navigation without a page load. Any other link (another
 * site, a file, a link with a modifier key, `target`, or a handler that already called `preventDefault`) is left to
 * the browser. The back button works through `popstate`, which the shell listens to.
 *
 * The server must answer every route path with index.html (Vite's dev and preview servers do).
 */
export function startRouter(): void {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!link || link.target || link.hasAttribute('download') || link.origin !== location.origin) return;
    if (!routes.some((route) => route.path === link.pathname)) return;
    event.preventDefault();
    navigate(link.pathname + link.search + link.hash);
  });
}

/** The current URL's query, for example `routeQuery().get('state')`. Screens read it when they are created. */
export function routeQuery(): URLSearchParams {
  return new URLSearchParams(location.search);
}
