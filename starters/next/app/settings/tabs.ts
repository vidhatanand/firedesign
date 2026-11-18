// The settings tabs, shared by the page (server: which panel the first paint shows, from ?tab=) and its behaviour.
export const TABS = ['account', 'team', 'features', 'billing', 'data-sources', 'connected-apps', 'notifications', 'advanced'] as const;
export type Tab = (typeof TABS)[number];
const ALIASES: Record<string, Tab> = { sources: 'data-sources', datasources: 'data-sources', apps: 'connected-apps', connected: 'connected-apps' };

/** ?tab= → a tab; anything unknown is Team, as in templates/settings.html. */
export function resolveTab(value: string | string[] | null | undefined): Tab {
  const raw = Array.isArray(value) ? value[0] : value ?? '';
  const id = ALIASES[raw] ?? raw;
  return (TABS as readonly string[]).includes(id) ? (id as Tab) : 'team';
}
