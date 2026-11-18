'use client';
// The Activity logs screen's client part: it renders the <main class="fd-page"> around the server-rendered markup,
// starts the screen's behaviour once Fire has loaded, and handles Fire's events the React way (spec V1): fd:select
// from row actions, bulk actions and the row menu (a toast, the detail sheet), and fd:change from filters and the
// state switch, through useFireEvent on the page.
import { useRef, ViewTransition, type ReactNode } from 'react';
import { useFireEvent } from 'fire-design/react';
import { useBehaviour } from '../screen-kit';
import { startLogs, type LogsBehaviour } from './logs-behaviour';
import type { AskedLogsState } from './logs-state';

// <ViewTransition> (React 19.3, stable in the App Router, no config flag) makes a route change a view transition. It adds no
// element (only vt-* attributes, which render-equal ignores: R14); Fire's stylesheet names this page region "fd-content"
// under <html data-fd-transition> (components/transitions.css), so the sidebar and top bar hold still and the page fades.
export function LogsScreen({ children, asked }: { children: ReactNode; asked?: AskedLogsState }) {
  const ref = useRef<HTMLElement>(null);
  const behaviour = useRef<LogsBehaviour | null>(null);
  useBehaviour((kit) => {
    behaviour.current = startLogs(kit, asked);
    return () => { behaviour.current = null; };
  });
  useFireEvent(ref, 'fd:select', (event) => behaviour.current?.onSelect(event));
  useFireEvent(ref, 'fd:change', (event) => behaviour.current?.onChange(event));
  return <ViewTransition><main className="fd-page" ref={ref}>{children}</main></ViewTransition>;
}
