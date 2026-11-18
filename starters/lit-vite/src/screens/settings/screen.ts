import type { PropertyValues } from 'lit';
import { init, nav, overlays, setAccent, setDensity, setTheme, getTheme, texture } from 'fire-design';
import { FireLight } from '../../lib/fire-light';
import { settingsView } from './view';

const { toast, openDialog } = overlays;

const TABS = ['account', 'team', 'billing', 'data-sources', 'connected-apps', 'notifications', 'advanced'] as const;
type Tab = (typeof TABS)[number];
const ALIASES: Record<string, Tab> = { sources: 'data-sources', datasources: 'data-sources', apps: 'connected-apps', connected: 'connected-apps' };
const tabFrom = (value: string | null): Tab => {
  const id = (value && ALIASES[value]) || value;
  return TABS.includes(id as Tab) ? (id as Tab) : 'team';
};

interface Confirm { title: string; desc: string; label: string; tone: string; resolve?: (ok: boolean) => void }
type Change = HTMLElementEventMap['fd:change'];
type Select = HTMLElementEventMap['fd:select'];

/**
 * Settings: seven panels behind a sub-navigation. Most buttons need no code here, because Fire does them from
 * markup (`data-fd-toast`, `data-fd-dialog-open`, switches, segmented controls). What this component adds:
 * the tab in the URL, the appearance controls, and removing a member or invite after a confirmation.
 */
export class ScreenSettings extends FireLight {
  static override properties = { tab: { state: true }, confirm: { state: true }, themeLabel: { state: true } };
  declare tab: Tab;
  declare confirm: Confirm;
  declare themeLabel: string;

  constructor() {
    super();
    this.tab = tabFrom(new URLSearchParams(location.search).get('tab'));
    this.confirm = { title: 'Are you sure?', desc: '', label: 'Confirm', tone: 'danger' };
    this.themeLabel = 'Light (System)';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // First paint: skeletons swap to content after a moment.
    setTimeout(() => ['members-wrap', 'billing-summary'].forEach((id) => texture.setLoading(this.querySelector<HTMLElement>(`#${id}`), false)), 600);
  }

  protected override render() {
    return settingsView(this);
  }

  /** Fire builds the segmented controls in `init`, so run it first (it skips anything done twice). */
  protected override firstUpdated(): void {
    init(this);
    this.syncAppearance();
    this.refreshCounts();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('tab')) document.title = `${this.tab.replace('-', ' ')} settings · Ember`;
  }

  /* ------------------------------------------------------------------ tabs, kept in the URL */

  onTab = (event: MouseEvent): void => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('[data-tab]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
    event.preventDefault(); // the router leaves a link alone once its handler has done this
    this.tab = tabFrom(link.dataset.tab ?? null);
    history.replaceState(null, '', `?tab=${this.tab}`);
    this.updateComplete.then(() => this.querySelector<HTMLElement>(`#h-${this.tab}`)?.focus());
  };

  /* ------------------------------------------------------------------ appearance */

  /** Shows the current theme, density and accent in the three segmented controls. */
  private syncAppearance(): void {
    const pick = (id: string, value: string) => {
      const item = [...this.querySelectorAll<HTMLElement>(`#${id} .fd-segmented-item`)].find((el) => el.dataset.value === value);
      if (item) nav.selectSegment(item, { silent: true });
    };
    const theme = getTheme();
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    this.themeLabel = theme === 'system' ? `${dark ? 'Dark' : 'Light'} (System)` : theme === 'dark' ? 'Dark' : 'Light';
    pick('seg-theme', theme);
    pick('seg-density', document.documentElement.dataset.density === 'compact' ? 'compact' : 'comfortable');
    pick('seg-accent', document.documentElement.dataset.accent || 'ember');
  }

  onTheme = (event: Change): void => { if ('value' in event.detail && typeof event.detail.value === 'string') { setTheme(event.detail.value as 'light' | 'dark' | 'system'); this.syncAppearance(); } };
  onDensity = (event: Change): void => { if ('value' in event.detail && typeof event.detail.value === 'string') setDensity(event.detail.value as 'compact' | 'comfortable'); };
  onAccent = (event: Change): void => { if ('value' in event.detail && typeof event.detail.value === 'string') setAccent(event.detail.value as 'ember'); };

  /* ------------------------------------------------------------------ team: remove a member or an invite */

  /** Asks first; resolves true when the user confirms. The dialog's text comes from `confirm`. */
  private ask(confirm: Omit<Confirm, 'resolve'>): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirm = { ...confirm, resolve };
      this.updateComplete.then(() => openDialog('dlg-confirm'));
    });
  }

  onConfirmClose = (event: Event): void => {
    const dialog = event.currentTarget as HTMLDialogElement;
    if (event.target !== dialog) return;
    this.confirm.resolve?.(dialog.returnValue === 'ok');
  };

  private async removeRow(row: Element | null | undefined, invite: boolean): Promise<void> {
    if (!(row instanceof HTMLElement)) return;
    const who = (invite ? row.dataset.invite : row.dataset.member) ?? '';
    const ok = await this.ask(invite
      ? { title: `Revoke the invite for ${who}?`, desc: 'The link in their email stops working. You can invite them again later.', label: 'Revoke invite', tone: 'danger' }
      : { title: `Remove ${who}?`, desc: 'They lose access to this team’s keys, runs and monitors at once. Their own account is not deleted.', label: 'Remove member', tone: 'danger' });
    if (!ok) return;
    row.remove(); // a row is plain Fire markup that Lit does not own, so it can be removed from the DOM directly
    this.refreshCounts();
    toast({ title: invite ? 'Invite revoked' : 'Member removed', description: who, tone: 'neutral' });
  }

  onMemberMenu = (event: Select): void => {
    const row = event.detail.trigger?.closest('.fd-list-row');
    if (event.detail.value === 'copy') { navigator.clipboard?.writeText((row as HTMLElement | null)?.dataset.member ?? '').catch(() => {}); toast({ title: 'Email copied', tone: 'success' }); }
    else this.removeRow(row, false);
  };

  onInviteMenu = (event: Select): void => {
    const row = event.detail.trigger?.closest('.fd-list-row');
    if (event.detail.value === 'copy') { navigator.clipboard?.writeText((row as HTMLElement | null)?.dataset.invite ?? '').catch(() => {}); toast({ title: 'Email copied', tone: 'success' }); }
    else if (event.detail.value === 'resend') toast({ title: 'Invite resent', description: `A fresh link went to ${(row as HTMLElement | null)?.dataset.invite}.`, tone: 'success' });
    else this.removeRow(row, true);
  };

  /** The counts in the sub-navigation and the team panel follow the rows. */
  private refreshCounts(): void {
    const members = this.querySelectorAll('#members-list [data-member]').length;
    const invites = this.querySelectorAll('#members-list [data-invite]').length;
    const text = (name: string, value: string) => this.querySelectorAll(`[data-bind="${name}"]`).forEach((el) => { el.textContent = value; });
    text('member-count', String(members));
    text('member-badge', String(members + invites));
    text('team-summary', `Quarry Labs · ${members} member${members === 1 ? '' : 's'} · ${invites} pending invite${invites === 1 ? '' : 's'}`);
    for (const id of ['resend-all', 'revoke-all']) this.querySelector<HTMLButtonElement>(`#${id}`)!.disabled = !invites;
  }
}

customElements.define('screen-settings', ScreenSettings);
