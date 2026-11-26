'use client';
// The Overview screen's client part: the <main class="fd-page"> around the server-rendered markup, and the screen's
// behaviour (overview-behaviour.ts), started once Fire has loaded.
import { ViewTransition, type ReactNode } from 'react';
import { useBehaviour } from '../screen-kit';
import type { PageState } from '../page-state';
import { startOverview } from './overview-behaviour';

// <ViewTransition> (React 19.3, stable in the App Router, no config flag) makes a route change a view transition. It adds no
// element (only vt-* attributes, which render-equal ignores: R14); Fire's stylesheet names this page region "fd-content"
// under <html data-fd-transition> (components/transitions.css), so the sidebar and top bar hold still and the page fades.
export function OverviewScreen({ children, state }: { children: ReactNode; state: PageState }) {
  useBehaviour((kit) => startOverview(kit, state));
  return <ViewTransition><main className="fd-page" id="main" tabIndex={-1}>{children}</main></ViewTransition>;
}
