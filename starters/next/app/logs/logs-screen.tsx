'use client';
// The Activity logs screen's client part: it renders the <main class="fd-page"> around the server-rendered markup,
// starts the screen's behaviour once Fire has loaded, and handles Fire's events the React way (spec V1): fd:select
// from row actions, bulk actions and the row menu (a toast, the detail sheet), and fd:change from filters and the
// state switch, through useFireEvent on the page.
import { useRef, type ReactNode } from 'react';
import { useFireEvent } from 'fire-design/react';
import { useBehaviour } from '../screen-kit';
import { startLogs, type LogsBehaviour } from './logs-behaviour';

export function LogsScreen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const behaviour = useRef<LogsBehaviour | null>(null);
  useBehaviour((kit) => {
    behaviour.current = startLogs(kit);
    return () => { behaviour.current = null; };
  });
  useFireEvent(ref, 'fd:select', (event) => behaviour.current?.onSelect(event));
  useFireEvent(ref, 'fd:change', (event) => behaviour.current?.onChange(event));
  return <main className="fd-page" ref={ref}>{children}</main>;
}
