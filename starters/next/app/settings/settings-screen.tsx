'use client';
// The Settings screen's client part: the <main class="fd-page"> around the server-rendered markup, and the screen's
// behaviour (settings-behaviour.ts), started once Fire has loaded.
import { ViewTransition, type ReactNode } from 'react';
import { useBehaviour } from '../screen-kit';
import { startSettings } from './settings-behaviour';

// <ViewTransition> (React 19.3, stable in the App Router, no config flag) makes a route change a view transition. It adds no
// element (only vt-* attributes, which render-equal ignores: R14); Fire's stylesheet names this page region "fd-content"
// under <html data-fd-transition> (components/transitions.css), so the sidebar and top bar hold still and the page fades.
export function SettingsScreen({ children }: { children: ReactNode }) {
  useBehaviour(startSettings);
  return <ViewTransition><main className="fd-page">{children}</main></ViewTransition>;
}
