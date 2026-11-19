import { texture, type IconName } from 'fire-design';
import { session, type Session } from './session';

/**
 * The router: the route table (src/routes.ts) matched against the address, screens loaded when first visited,
 * guards, a not-found route, a base path, and what a page load would do for free (title, focus, scroll).
 * No dependency. The server must answer every app path with index.html (README, "Going to production").
 */

export type Params = Readonly<Record<string, string>>;
/** The parameters a pattern names: `ParamsOf<'/logs/:id'>` is `{ id: string }`. */
export type ParamsOf<P extends string> = P extends `${string}:${infer Name}/${infer Rest}`
  ? { readonly [K in Name]: string } & ParamsOf<`/${Rest}`>
  : P extends `${string}:${infer Name}` ? { readonly [K in Name]: string } : {};

/** What a guard and a title see. */
export interface RouteContext {
  route: ScreenRoute;
  params: Params;
  query: URLSearchParams;
  /** The path inside the app, without the base: `/logs/req_8f3a21`. */
  path: string;
  session: Session;
}

/** `true` lets the visitor in; a path sends them there instead (the history entry is replaced). May be async. */
export type Guard = (context: RouteContext) => true | string | Promise<true | string>;

export interface ScreenRoute {
  /** `/logs`, `/logs/:id` (a parameter), `/docs/*` or `*` (the rest of the path, in `params['*']`). First match wins. */
  path: string;
  /** The custom element that renders the screen; `load` defines it. */
  tag: string;
  /** `() => import('./screens/logs/screen')`. Without it the element must already be defined (the status screens). */
  load?: () => Promise<unknown>;
  title: string | ((context: RouteContext) => string);
  guard?: Guard;
  /** Navigation: a route with a label is listed in the sidebar, the tab bar and the command palette. */
  label?: string;
  icon?: IconName;
  /** The label of the sidebar group the item sits under (items without one sit at the top). */
  group?: string;
  /** The go-to keys: `g o` (data-fd-keys). */
  keys?: string;
  /** Words the command palette also finds the page by. */
  keywords?: string;
}
/** An address that moved: `{ path: '/', redirect: '/overview' }`. */
export interface RedirectRoute { path: string; redirect: string }
export type Route = ScreenRoute | RedirectRoute;

/** What the outlet shows: the matched route with its context, and the error when its module failed to load. */
export interface View extends RouteContext { error?: unknown }

/** The element that shows screens (the app shell). */
export interface Outlet {
  /** Render the view; resolve with the screen element once it has rendered, and whether it is a new element. */
  show(view: View, first: boolean): Promise<{ screen: HTMLElement; changed: boolean }>;
  /** Say something politely to screen readers. */
  announce(text: string): void;
}

export interface RouterOptions {
  routes: Route[];
  outlet: Outlet;
  /** The path the app is served under (`/app/`): pass `import.meta.env.BASE_URL`, Vite's `base`. Default none. */
  base?: string;
  /** The document title from the route's: `(title) => `${title} · Ember``. */
  title?: (title: string) => string;
}

const MAX_REDIRECTS = 8;
const LOADING_BAR_DELAY_MS = 150;
const RESTORE_MS = 2000;
const STOP_ON = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
type Mode = 'first' | 'push' | 'pop' | 'replace' | 'retry';

let table: { route: Route; parts: string[] }[] = [];
let base = '';
let outlet: Outlet;
let format = (title: string) => title;
let token = 0;
let key = '';
const scrolls = new Map<string, number>();
const prefetched = new Set<Route>();
const newKey = () => Math.random().toString(36).slice(2);
const parts = (path: string) => path.split('/').filter(Boolean);
const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

/** A path of this app (`/logs`) as the browser's path (`/app/logs` under a base). Write every app link with it. */
export const href = (path: string): string => base + path;

/** The current URL's query, for example `routeQuery().get('state')`. */
export const routeQuery = (): URLSearchParams => new URLSearchParams(location.search);

/** The path inside the app for a URL path, or null when the URL is outside the base. */
function inApp(pathname: string): string | null {
  if (!base) return pathname;
  return pathname === base || pathname.startsWith(`${base}/`) ? pathname.slice(base.length) || '/' : null;
}

/** The first route whose pattern matches, with its parameters. `wildcard: false` skips `*` patterns. */
export function match(path: string, wildcard = true): { route: Route; params: Params } | null {
  const segments = parts(path);
  for (const { route, parts: pattern } of table) {
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < pattern.length && ok; i++) {
      const p = pattern[i];
      if (p === '*') {
        if (!wildcard) ok = false;
        else { params['*'] = segments.slice(i).map(decode).join('/'); return { route, params }; }
      } else if (segments[i] === undefined) ok = false;
      else if (p.startsWith(':')) params[p.slice(1)] = decode(segments[i]);
      else ok = p === segments[i];
    }
    if (ok && segments.length === pattern.length) return { route, params };
  }
  return null;
}

/** Go to a path of this app (`/logs/req_8f3a21`). `replace` replaces the current history entry. */
export function navigate(path: string, { replace = false } = {}): Promise<void> {
  if (replace) history.replaceState({ key }, '', href(path));
  else {
    scrolls.set(key, scrollY);
    key = newKey();
    history.pushState({ key }, '', href(path));
  }
  return resolve(replace ? 'replace' : 'push');
}

/**
 * Run the current address again (the load-error state's Try again). WebKit remembers a module that failed to load
 * for the life of the page, so when the second try fails too while online, it loads the page again.
 */
export const retry = (): Promise<void> => resolve('retry');

async function resolve(mode: Mode): Promise<void> {
  const mine = ++token;
  const chain: string[] = [];
  let view: View | undefined;
  while (!view) {
    const path = inApp(location.pathname) ?? location.pathname;
    chain.push(path);
    const found = match(path);
    if (!found || chain.length > MAX_REDIRECTS) {
      console.error(`router: ${found ? `more than ${MAX_REDIRECTS} redirects: ${chain.join(' -> ')}` : `no route for ${path}; add a '*' route`}`);
      return;
    }
    if ('redirect' in found.route) { history.replaceState({ key }, '', href(found.route.redirect)); continue; }
    const context: RouteContext = { route: found.route, params: found.params, query: routeQuery(), path, session: session() };
    const verdict = found.route.guard ? await found.route.guard(context) : true;
    if (mine !== token) return;
    if (verdict === true) view = context;
    else history.replaceState({ key }, '', href(verdict));
  }
  // The current screen stays while the next one loads; Fire's page bar shows when that takes a moment.
  if (view.route.load) {
    const bar = setTimeout(() => texture.pagebar.start(), LOADING_BAR_DELAY_MS);
    try { await view.route.load(); } catch (error) {
      if (mode === 'retry' && navigator.onLine) return location.reload();
      view = { ...view, error };
    }
    clearTimeout(bar);
    texture.pagebar.done();
    if (mine !== token) return;
  }
  // Set before the screen renders, so that a screen may refine it (settings names its tab).
  const { title } = view.route;
  document.title = format(typeof title === 'function' ? title(view) : title);
  const { screen, changed } = await outlet.show(view, mode === 'first');
  if (mine !== token || mode === 'first' || !changed) return;
  // A new screen is a new page to the visitor: focus its heading, go to the top (or back to where they were).
  // A change inside one screen (/logs to /logs/:id opens a sheet) leaves focus and scroll to the screen.
  const target = screen.querySelector<HTMLElement>('h1') ?? screen.querySelector<HTMLElement>('main') ?? screen;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  scrollBack(mode === 'pop' ? scrolls.get(key) ?? 0 : 0);
  outlet.announce(document.title);
}

/** Scroll to `y`. A screen that is still loading may be too short for it, so try again as it grows, for a moment,
 *  until the visitor scrolls or types. */
function scrollBack(y: number): void {
  scrollTo(0, y);
  if (scrollY >= y) return;
  const until = performance.now() + RESTORE_MS;
  const watch = new ResizeObserver(() => (scrollY < y && performance.now() < until ? scrollTo(0, y) : stop()));
  const stop = () => { watch.disconnect(); for (const type of STOP_ON) removeEventListener(type, stop); };
  for (const type of STOP_ON) addEventListener(type, stop, { once: true, passive: true });
  watch.observe(document.body);
}

/** A link this router handles: same origin, inside the base, to a route that is not a wildcard. */
function routeLink(target: EventTarget | null): HTMLAnchorElement | null {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>('a[href]') : null;
  if (!link || link.target || link.hasAttribute('download') || link.origin !== location.origin) return null;
  const path = inApp(link.pathname);
  return path !== null && match(path, false) ? link : null;
}

function onClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = routeLink(event.target);
  // A link to a place on this page (#id) is the browser's.
  if (!link || (link.hash && link.pathname === location.pathname && link.search === location.search)) return;
  event.preventDefault();
  void navigate((inApp(link.pathname) ?? '/') + link.search + link.hash);
}

/** Hovering or focusing a link loads its screen's module, once. */
function onIntent(event: Event): void {
  const link = routeLink(event.target);
  const route = link && match(inApp(link.pathname) ?? '', false)?.route;
  if (!route || 'redirect' in route || !route.load || prefetched.has(route)) return;
  prefetched.add(route);
  route.load().catch(() => prefetched.delete(route));
}

/**
 * Starts the router: renders the current address, then follows links, the back and forward buttons and
 * `navigate()`. Links with a modifier key, `target` or `download`, whose click handler already called
 * `preventDefault`, outside the base or to an unknown path are left to the browser.
 */
export function startRouter(options: RouterOptions): Promise<void> {
  table = options.routes.map((route) => ({ route, parts: parts(route.path) }));
  base = (options.base ?? '').replace(/\/+$/, '');
  outlet = options.outlet;
  format = options.title ?? format;
  history.scrollRestoration = 'manual';
  key = (history.state as { key?: string } | null)?.key ?? newKey();
  history.replaceState({ ...history.state, key }, '');
  addEventListener('popstate', (event) => {
    scrolls.set(key, scrollY);
    key = (event.state as { key?: string } | null)?.key ?? newKey();
    void resolve('pop');
  });
  document.addEventListener('click', onClick);
  document.addEventListener('pointerover', onIntent);
  document.addEventListener('focusin', onIntent);
  return resolve('first');
}
