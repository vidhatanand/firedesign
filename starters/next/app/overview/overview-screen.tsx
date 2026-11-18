'use client';
// The Overview screen's client part: the <main class="fd-page"> around the server-rendered markup, and the screen's
// behaviour (overview-behaviour.ts), started once Fire has loaded.
import type { ReactNode } from 'react';
import { useBehaviour } from '../screen-kit';
import { startOverview } from './overview-behaviour';

export function OverviewScreen({ children }: { children: ReactNode }) {
  useBehaviour(startOverview);
  return <main className="fd-page">{children}</main>;
}
