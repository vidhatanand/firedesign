import type { PropertyValues } from 'lit';
import { content, forms, init, nav, overlays, reducedMotion, setAccent, setDensity, setTheme, getTheme, texture, type PageState } from 'fire-design';
import { FireLight } from '../../lib/fire-light';
import { settingsView } from './view';

const { toast, openDialog } = overlays;

const TABS = ['account', 'notifications', 'team', 'features', 'billing', 'data-sources', 'connected-apps', 'advanced'] as const;
type Tab = (typeof TABS)[number];
const ALIASES: Record<string, Tab> = { sources: 'data-sources', datasources: 'data-sources', apps: 'connected-apps', connected: 'connected-apps' };
const tabFrom = (value: string | null): Tab => {
  const id = (value && ALIASES[value]) || value;
  return TABS.includes(id as Tab) ? (id as Tab) : 'team';
};

interface Confirm { title: string; desc: string; label: string; tone: string; resolve?: (ok: boolean) => void }
type Change = HTMLElementEventMap['fd:change'];
type Select = HTMLElementEventMap['fd:select'];

const PAGE_STATES = ['ready', 'loading', 'error', 'member'];
/** The state of the .fd-states wrapper for a demo state: a member sees the page ready. */
const wrapperState = (state: string): PageState => (state === 'loading' || state === 'error' ? state : 'ready');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const SLUG = /^[a-z0-9-]{3,32}$/;
const TAKEN = ['ember', 'admin', 'api', 'support'];

/**
 * Settings: seven panels behind a sub-navigation. Most buttons need no code here, because Fire does them from
 * markup (`data-fd-toast`, `data-fd-dialog-open`, switches, segmented controls). What this component adds:
 * the tab in the URL, the appearance controls, the team form (checked, saved, and the dirty bar cleared), the
 * feature switches with Done · Undo, removing a member or invite after a confirmation, and the demo state
 * (`?state=ready|loading|error|member`; a member reads the page but cannot change it).
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
    setTimeout(() => ['members-wrap', 'billing-summary'].forEach((id) => texture.setLoading(this.querySelector<HTMLElement>(`#${id}`), false)), reducedMotion() ? 0 : 600);
    // Fire's `fd:*` events bubble, and form events do too: one listener each, delegated, so Lit may re-render freely.
    this.addEventListener('input', this.onInput);
    this.addEventListener('focusout', this.onFocusOut);
    this.addEventListener('change', this.onFeatureChange);
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('submit', this.onSubmit);
    this.addEventListener('reset', this.onReset);
    this.addEventListener('click', this.onClick);
    this.addEventListener('fd:change', this.onStatesChange);
  }

  override disconnectedCallback(): void {
    for (const [type, fn] of [['input', this.onInput], ['focusout', this.onFocusOut], ['change', this.onFeatureChange], ['keydown', this.onKeyDown], ['submit', this.onSubmit], ['reset', this.onReset], ['click', this.onClick], ['fd:change', this.onStatesChange]] as const) this.removeEventListener(type, fn as EventListener);
    super.disconnectedCallback();
  }

  protected override render() {
    return settingsView(this);
  }

  /** Fire builds the segmented controls in `init`, so run it first (it skips anything done twice). */
  protected override firstUpdated(): void {
    init(this);
    this.syncAppearance();
    this.refreshCounts();
    this.syncFeatures();
    this.syncTeamForm();
    // After the first frame and the fonts, so the strip is measured at its final size.
    requestAnimationFrame(() => document.fonts.ready.then(() => this.revealTab()));
    this.setPageState(new URLSearchParams(location.search).get('state') ?? 'ready', false);
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
    history.replaceState(history.state, '', `?tab=${this.tab}`); // keep the router's state (scroll restore)
    this.updateComplete.then(() => { this.revealTab(true); this.querySelector<HTMLElement>(`#h-${this.tab}`)?.focus(); });
  };

  /** On a phone the sub-navigation is one scrolling strip: bring the current tab to its middle (at once on load). */
  private revealTab(smooth = false): void {
    const strip = this.querySelector<HTMLElement>('.fd-subnav');
    const active = strip?.querySelector<HTMLElement>(`[data-tab="${this.tab}"]`);
    if (!strip || !active || strip.scrollWidth <= strip.clientWidth) return;
    const offset = active.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
    strip.scrollTo({ left: offset - (strip.clientWidth - active.offsetWidth) / 2, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
  }

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
    text('team-summary', `${this.savedName} · ${members} member${members === 1 ? '' : 's'} · ${invites} pending invite${invites === 1 ? '' : 's'}`);
    text('pending-desc', invites ? `${invites} ${invites === 1 ? 'person has' : 'people have'} been invited and ${invites === 1 ? 'has' : 'have'} not joined yet. Invites expire after 7 days.` : 'No pending invites. Invite someone above and they will show up here.');
    for (const id of ['resend-all', 'revoke-all']) this.querySelector<HTMLButtonElement>(`#${id}`)!.disabled = !invites || this.member;
  }

  /* ------------------------------------------------------------------ team form: checked, saved, clean */

  private member = false;
  private savedName = 'Quarry Labs';
  private field = (id: string) => this.querySelector<HTMLInputElement>(`#${id}`)!;
  private bind = (name: string, value: string) => this.querySelectorAll(`[data-bind="${name}"]`).forEach((el) => { el.textContent = value; });

  private slugProblem(value: string): string {
    if (!value) return '';
    if (!SLUG.test(value)) return 'Use 3 to 32 lowercase letters, numbers or dashes.';
    return TAKEN.includes(value) ? `“${value}” is already taken. Try another slug.` : '';
  }

  /** One error slot per field, shown in place of the hint. */
  private fieldError(input: HTMLInputElement, message: string): void {
    const slot = input.closest('.fd-field')?.querySelector<HTMLElement>(':scope > .fd-field-error');
    if (!slot) return;
    if (message) { slot.querySelector('span')!.textContent = message; slot.hidden = false; input.setAttribute('aria-invalid', 'true'); }
    else { slot.hidden = true; input.removeAttribute('aria-invalid'); }
  }

  private syncTeamForm(): void {
    const name = this.field('team-name');
    const slug = this.field('team-slug');
    this.bind('slug-preview', slug.value || 'team_8fK2xQvLm');
    this.fieldError(slug, this.slugProblem(slug.value));
    this.fieldError(name, !name.value.trim() && 'touched' in name.dataset ? 'Enter a team name.' : '');
  }

  private onInput = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    if (target.id === 'team-name' || target.id === 'team-slug') this.syncTeamForm();
    else if (target.id === 'feature-search') this.searchFeatures(target.value);
  };

  private onFocusOut = (event: FocusEvent): void => {
    if ((event.target as HTMLElement).id !== 'team-name') return;
    this.field('team-name').dataset.touched = '';
    this.syncTeamForm();
  };

  /** Enter in a team field saves the form (the radio buttons keep Enter for themselves). */
  private onKeyDown = (event: KeyboardEvent): void => {
    const input = event.target as HTMLInputElement;
    if (event.key !== 'Enter' || !(input instanceof HTMLInputElement) || input.type === 'radio' || !input.form || input.form.id !== 'panel-team') return;
    event.preventDefault();
    if (input.form.hasAttribute('data-dirty')) this.querySelector<HTMLButtonElement>('#team-save-all')!.click();
  };

  /** Discard: the browser puts every field back to its default (the last saved value), then the form is clean again. */
  private onReset = (event: Event): void => {
    const form = event.target as HTMLFormElement;
    if (form.id !== 'panel-team') return;
    setTimeout(() => { delete this.field('team-name').dataset.touched; this.syncTeamForm(); forms.markClean(form); }, 0);
  };

  private onSubmit = async (event: SubmitEvent): Promise<void> => {
    const form = event.target as HTMLFormElement;
    if (form.id === 'delete-team') return this.deleteTeam(event, form);
    if (form.id !== 'panel-team') return;
    event.preventDefault();
    const button = event.submitter as HTMLButtonElement | null;
    if (button?.id !== 'team-save-all' || button.getAttribute('aria-busy') === 'true') return;
    const name = this.field('team-name');
    const slug = this.field('team-slug');
    name.dataset.touched = '';
    this.syncTeamForm();
    if (!name.value.trim() || this.slugProblem(slug.value)) { (!name.value.trim() ? name : slug).focus(); return; }
    button.setAttribute('aria-busy', 'true');
    await wait(700);
    button.removeAttribute('aria-busy');
    name.value = name.value.trim();
    this.savedName = name.value;
    // What was saved becomes the default, so Discard returns to it.
    for (const input of form.querySelectorAll<HTMLInputElement>('input[name]')) { input.defaultValue = input.value; input.defaultChecked = input.checked; }
    forms.markClean(form);
    this.refreshCounts();
    this.bind('team-changed-by', 'you, just now');
    toast({ title: 'Team settings saved', description: 'Every member sees the change now.', tone: 'success' });
  };

  /** Delete team: the confirm-inline form keeps its button off until the name matches; this only sends it. */
  private async deleteTeam(event: SubmitEvent, form: HTMLFormElement): Promise<void> {
    event.preventDefault();
    if (form.dataset.state !== 'match') return;
    const button = form.querySelector<HTMLButtonElement>('[data-fd-confirm-submit]')!;
    button.setAttribute('aria-busy', 'true');
    const job = wait(1200).then(() => { button.removeAttribute('aria-busy'); form.reset(); this.field('dt-confirm').dispatchEvent(new Event('input', { bubbles: true })); });
    toast.promise(job, { loading: 'Deleting Quarry Labs…', success: { title: 'Quarry Labs deleted', description: 'You were moved to your Personal team.', tone: 'neutral' }, error: 'Could not delete the team' });
  }

  /** Leave team says why it is off while you are the only owner; a member can leave. */
  private onClick = (event: MouseEvent): void => {
    const target = event.target as Element;
    if (target.closest('#leave-team') && !this.member) return;
    if (target.closest('#leave-team')) {
      this.ask({ title: 'Leave Quarry Labs?', desc: 'You lose access to its keys, runs and monitors at once. An admin can invite you again.', label: 'Leave team', tone: 'danger' })
        .then((ok) => ok && toast({ title: 'You left Quarry Labs', description: 'You were moved to your Personal team.', tone: 'neutral' }));
    } else if (target.closest('#features-clear')) {
      const search = this.field('feature-search');
      search.value = '';
      this.searchFeatures('');
      search.focus();
    }
  };

  /* ------------------------------------------------------------------ features: switches that apply at once */

  private featureRows = () => [...this.querySelectorAll<HTMLElement>('#features-table tr[data-feature]')];

  private syncFeatures(): void {
    const rows = this.featureRows();
    const on = rows.filter((row) => row.querySelector('input')!.checked).length;
    const shown = rows.filter((row) => !row.hidden).length;
    const q = this.field('feature-search').value.trim();
    this.bind('features-on', String(on));
    this.querySelector('#feature-count')!.textContent = q ? `${shown} of ${rows.length} match` : `${on} of ${rows.length} on`;
    this.querySelector<HTMLElement>('#features-wrap')!.hidden = shown === 0;
    this.querySelector<HTMLElement>('#features-none')!.hidden = shown !== 0;
  }

  private paintFeature(row: HTMLElement): void {
    const status = row.querySelector<HTMLElement>('.fd-status');
    if (!status) return;
    const on = row.querySelector('input')!.checked;
    status.dataset.tone = on ? 'success' : 'neutral';
    status.textContent = on ? 'On' : 'Off';
  }

  private searchFeatures(value: string): void {
    const q = value.trim().toLowerCase();
    for (const row of this.featureRows()) row.hidden = Boolean(q) && !row.textContent!.toLowerCase().includes(q);
    this.syncFeatures();
  }

  private onFeatureChange = (event: Event): void => {
    const input = (event.target as Element).closest<HTMLInputElement>('#features-table input[role="switch"]');
    if (!input) return;
    const row = input.closest<HTMLElement>('tr')!;
    const name = row.dataset.feature;
    this.paintFeature(row);
    this.syncFeatures();
    toast({
      title: `${name} ${input.checked ? 'on' : 'off'}`,
      description: input.checked ? 'Every key can use it now.' : 'Requests that ask for it now fail.',
      tone: 'success',
      id: 'feature',
      undo: async () => { await wait(300); input.checked = !input.checked; this.paintFeature(row); this.syncFeatures(); },
      undone: `${name} is ${input.checked ? 'off' : 'on'} again`,
    });
  };

  /* ------------------------------------------------------------------ demo state: ?state=ready|loading|error|member */

  /** A member reads the page and cannot change it: every control marked data-admin is off, and the lines say why. */
  private setMember(on: boolean): void {
    this.member = on;
    const locked = () => [...this.querySelectorAll<HTMLButtonElement | HTMLInputElement>('[data-admin], #members-list .fd-list-trail .fd-btn')];
    for (const el of locked()) el.disabled = on;
    this.querySelectorAll<HTMLElement>('[data-member-only]').forEach((el) => { el.hidden = !on; });
    this.querySelector<HTMLElement>('#team-editors')!.hidden = on;
    const leave = this.querySelector<HTMLElement>('#leave-team')!;
    if (on) leave.removeAttribute('aria-disabled'); else leave.setAttribute('aria-disabled', 'true');
    this.querySelector<HTMLElement>('#leave-reason')!.hidden = on;
    this.refreshCounts();
    if (on) forms.markClean(this.field('panel-team') as unknown as HTMLFormElement);
  }

  private setPageState(value: string, url = true): void {
    const state = PAGE_STATES.includes(value) ? value : 'ready';
    this.pageState = state;
    content.setState(this.querySelector<HTMLElement>('#settings-states'), wrapperState(state));
    this.setMember(state === 'member');
    const item = this.querySelector<HTMLElement>(`#state-switch .fd-segmented-item[data-value="${state}"]`);
    if (item) nav.selectSegment(item, { silent: true });
    if (!url) return;
    const next = new URL(location.href);
    if (state === 'ready') next.searchParams.delete('state'); else next.searchParams.set('state', state);
    history.replaceState(history.state, '', next);
  }
  private pageState = 'ready';

  onState = (event: Change): void => {
    if ('value' in event.detail && typeof event.detail.value === 'string' && event.detail.value !== this.pageState) this.setPageState(event.detail.value);
  };

  /** Try again, in the error state, goes to loading (data-fd-set-state), then the panels come back. */
  private onStatesChange = (event: Event): void => {
    const detail = (event as Change).detail;
    if (!(event.target as Element).matches('#settings-states') || !('value' in detail) || detail.value !== 'loading' || this.pageState === 'loading') return;
    this.setPageState('loading');
    setTimeout(() => this.pageState === 'loading' && this.setPageState('ready'), 700);
  };
}

customElements.define('screen-settings', ScreenSettings);
