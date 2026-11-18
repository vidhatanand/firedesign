'use client';
// The Settings screen's client part: the <main class="fd-page"> around the server-rendered markup, and the screen's
// behaviour (settings-behaviour.ts), started once Fire has loaded.
import type { ReactNode } from 'react';
import { useBehaviour } from '../screen-kit';
import { startSettings } from './settings-behaviour';

export function SettingsScreen({ children }: { children: ReactNode }) {
  useBehaviour(startSettings);
  return <main className="fd-page">{children}</main>;
}
