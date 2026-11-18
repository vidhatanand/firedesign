// The Settings screen's behaviour: the page script of templates/settings.html, ported to TypeScript. Which tab shows
// first is decided on the server (?tab=, see tabs.ts); this keeps it in step when the subnav switches tabs. What Fire
// does declaratively stays Fire's: the dirty bar (data-fd-dirty), disabled-with-a-reason (.fd-reason), the inline
// delete confirm (data-fd-confirm-inline), the loading and error states (.fd-states).
import type { ToastOptions, ToastTone } from 'fire-design';
import { $, $$, $maybe, type Kit } from '../screen-kit';
import { TABS, resolveTab, type Tab } from './tabs';

export function startSettings({ fire, on, later }: Kit) {
  const { init, forms, overlays, nav, texture, setTheme, setAccent, setDensity, getTheme, reducedMotion } = fire;
  const { openDialog } = overlays;
  // fire.d.ts (0.7) does not yet declare content.setState or the toast's undo / undone options, which fire.js has.
  const toast = overlays.toast as typeof overlays.toast & ((input: ToastOptions & { undo?: () => unknown; undone?: string }) => string);
  const setState = (fire.content as typeof fire.content & { setState(el: Element, state: string): void }).setState;
  const wait = (ms: number) => new Promise<void>((resolve) => later(resolve, ms));
  const store = {
    get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
  };
  const bind = (name: string, text: string) => $$(`[data-bind="${name}"]`).forEach((el) => { el.textContent = text; });
  const select = (group: HTMLElement, value: string) => {
    const item = $$('.fd-segmented-item', group).find((el) => el.dataset.value === value);
    if (item) nav.selectSegment(item, { silent: true });
  };
  const setBusy = (button: HTMLElement, busy: boolean) => (busy ? button.setAttribute('aria-busy', 'true') : button.removeAttribute('aria-busy'));
  const isBusy = (button: HTMLElement) => button.getAttribute('aria-busy') === 'true';
  const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  const detail = <T>(event: Event) => (event as CustomEvent<T>).detail;

  /** One inline error slot per field: shown in place of the hint. */
  function fieldError(input: HTMLElement, message: string) {
    const field = input.closest('.fd-field');
    const slot = field?.querySelector<HTMLElement>(':scope > .fd-field-error');
    if (!slot) return;
    if (message) { $('span', slot).textContent = message; slot.hidden = false; input.setAttribute('aria-invalid', 'true'); }
    else { slot.hidden = true; input.removeAttribute('aria-invalid'); }
  }

  /** Ask before doing something that is hard to undo. Resolves true on confirm. */
  function confirmAction({ title, desc, label = 'Confirm', tone = 'danger' }: { title: string; desc: string; label?: string; tone?: string }) {
    const dialog = $<HTMLDialogElement>('#dlg-confirm');
    $('[data-confirm-title]', dialog).textContent = title;
    $('[data-confirm-desc]', dialog).textContent = desc;
    const ok = $('[data-confirm-ok]', dialog);
    ok.textContent = label;
    ok.dataset.variant = tone;
    return new Promise<boolean>((resolve) => {
      on(dialog, 'fd:close', () => resolve(dialog.returnValue === 'ok'), { once: true });
      openDialog(dialog);
    });
  }

  /* ---------------------------------------------------------------- Tabs in the URL */
  const subnav = $('.fd-subnav');

  function showTab(id: Tab, { animate = false, focus = false, url = false } = {}) {
    const panel = $(`#panel-${id}`);
    TABS.forEach((tab) => { $(`#panel-${tab}`).hidden = tab !== id; });
    $$('[data-tab]', subnav).forEach((link) => {
      if (link.dataset.tab === id) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    const active = $maybe(`[data-tab="${id}"]`, subnav);
    if (active && subnav.scrollWidth > subnav.clientWidth) {
      const offset = active.getBoundingClientRect().left - subnav.getBoundingClientRect().left + subnav.scrollLeft;
      subnav.scrollTo({ left: offset - (subnav.clientWidth - active.offsetWidth) / 2, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
    if (animate && !reducedMotion()) {
      panel.classList.remove('fd-rise');
      void panel.offsetWidth;
      panel.classList.add('fd-rise');
    }
    if (url) {
      const next = new URL(location.href);
      next.searchParams.set('tab', id);
      history.replaceState(history.state, '', next);
    }
    if (focus) $('h2', panel).focus();
    document.title = `${$('h2', panel).textContent} settings · Ember`;
  }

  on<MouseEvent>(subnav, 'click', (event) => {
    const link = (event.target as Element).closest<HTMLElement>('[data-tab]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
    event.preventDefault();
    showTab(resolveTab(link.dataset.tab), { animate: true, focus: true, url: true });
  });

  showTab(resolveTab(new URLSearchParams(location.search).get('tab')));

  /* ---------------------------------------------------------------- First paint: skeletons swap to content */
  later(() => ['members-wrap', 'billing-summary'].forEach((id) => texture.setLoading($<HTMLElement>(`#${id}`), false)), reducedMotion() ? 0 : 600);

  /* ---------------------------------------------------------------- Account: appearance, density, accent, privacy */
  const themeGroup = $('#seg-theme');
  const densityGroup = $('#seg-density');
  const accentGroup = $('#seg-accent');

  function syncTheme() {
    const theme = getTheme();
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    bind('theme-label', theme === 'system' ? `${dark ? 'Dark' : 'Light'} (System)` : theme === 'dark' ? 'Dark' : 'Light');
    select(themeGroup, theme);
  }
  syncTheme();
  select(densityGroup, document.documentElement.dataset.density === 'compact' ? 'compact' : 'comfortable');
  select(accentGroup, document.documentElement.dataset.accent || 'ember');
  on(themeGroup, 'fd:change', (event) => { setTheme(detail<{ value: Parameters<typeof setTheme>[0] }>(event).value); syncTheme(); });
  on(densityGroup, 'fd:change', (event) => setDensity(detail<{ value: Parameters<typeof setDensity>[0] }>(event).value));
  on(accentGroup, 'fd:change', (event) => setAccent(detail<{ value: Parameters<typeof setAccent>[0] }>(event).value));
  on(document.documentElement, 'fd:theme', syncTheme);
  on(document.documentElement, 'fd:accent', (event) => select(accentGroup, detail<{ accent: string }>(event).accent));

  // The privacy blur is set through CSSOM (element.style), which a strict CSP allows; it is not a style attribute in markup.
  const privacy = $<HTMLInputElement>('#privacy-switch');
  function applyPrivacy(hide: boolean) {
    privacy.checked = hide;
    bind('privacy-label', hide ? 'On' : 'Off');
    const email = $maybe('.fd-account-email');
    if (email) email.style.filter = hide ? 'blur(5px)' : '';
    store.set('ember-privacy', hide ? '1' : '0');
  }
  applyPrivacy(store.get('ember-privacy') === '1');
  on(privacy, 'change', () => applyPrivacy(privacy.checked));
  /* Hovering or focusing the account row reveals the email again. */
  const blurEmail = (row: Element | null, blurred: boolean) => { const email = row && $maybe('.fd-account-email', row); if (email) email.style.filter = blurred ? 'blur(5px)' : ''; };
  const accountRow = (event: Event) => (event.target instanceof Element ? event.target.closest('.fd-account') : null);
  for (const type of ['pointerover', 'focusin']) on(document, type, (event) => blurEmail(accountRow(event), false));
  for (const type of ['pointerout', 'focusout']) on<FocusEvent>(document, type, (event) => {
    const row = accountRow(event);
    if (row && !row.contains(event.relatedTarget as Node | null)) blurEmail(row, privacy.checked);
  });
  // Leaving the screen shows the email again (the shell outlives the route).
  const unblur = () => { const email = $maybe('.fd-account-email'); if (email) email.style.filter = ''; };

  /* Two-factor authentication */
  const twofa = $<HTMLInputElement>('#twofa-switch');
  const twofaDialog = $('#dlg-2fa');
  const otp = $('#otp-2fa');
  const otpError = $('#otp-2fa-error');
  let twofaDone = false;
  const otpValue = () => $$<HTMLInputElement>('input', otp).map((input) => input.value).join('');
  on(twofa, 'change', () => {
    if (twofa.checked) { twofaDone = false; openDialog(twofaDialog, { trigger: twofa }); }
    else toast({ title: 'Two-factor authentication is off', description: 'Sign-ins no longer ask for a code.', tone: 'neutral' });
  });
  on(twofaDialog, 'fd:open', () => { forms.setOtpInvalid(otp, false); otpError.hidden = true; $$<HTMLInputElement>('input', otp).forEach((input) => { input.value = ''; }); });
  on(twofaDialog, 'fd:change', (event) => { if (event.target === twofaDialog && detail<{ value: string }>(event).value === 'recovery') twofaDone = true; });
  on(twofaDialog, 'fd:close', () => {
    twofa.checked = twofaDone;
    if (twofaDone) toast({ title: 'Two-factor authentication is on', description: 'You will be asked for a code on new devices.', tone: 'success' });
  });
  on(otp, 'fd:change', (event) => {
    const d = detail<{ complete: boolean; value: string }>(event);
    if (!d.complete) { forms.setOtpInvalid(otp, false); otpError.hidden = true; return; }
    if (d.value === '482913') $('#twofa-verify').click();
    else { forms.setOtpInvalid(otp, true); otpError.hidden = false; }
  });
  on($('#twofa-verify'), 'click', (event) => {
    if (otpValue() === '482913') return;
    event.stopPropagation();
    event.preventDefault();
    forms.setOtpInvalid(otp, true);
    otpError.hidden = false;
  });

  /* Change email, delete account */
  on($('#dlg-email'), 'fd:close', (event) => {
    if ((event.target as HTMLDialogElement).returnValue !== 'send') return;
    toast({ title: 'Confirmation sent', description: `Open the link we sent to ${$<HTMLInputElement>('#new-email').value.trim()} to finish the change.`, tone: 'success' });
  });
  on($('#dlg-delete-account'), 'fd:close', (event) => {
    if ((event.target as HTMLDialogElement).returnValue === 'confirm') toast({ title: 'Account scheduled for deletion', description: 'You have 7 days to change your mind. Sign in to cancel.', tone: 'neutral' });
  });

  /* ---------------------------------------------------------------- Team */
  const teamForm = $<HTMLFormElement>('#panel-team');
  const nameInput = $<HTMLInputElement>('#team-name');
  const slugInput = $<HTMLInputElement>('#team-slug');
  const saved = { name: nameInput.value, slug: slugInput.value };
  const SLUG = /^[a-z0-9-]{3,32}$/;
  const TAKEN = ['ember', 'admin', 'api', 'support'];

  function slugProblem(value: string) {
    if (!value) return '';
    if (!SLUG.test(value)) return 'Use 3 to 32 lowercase letters, numbers or dashes.';
    if (TAKEN.includes(value)) return `“${value}” is already taken. Try another slug.`;
    return '';
  }
  const nameOk = () => nameInput.value.trim().length > 0;
  const slugOk = () => !slugProblem(slugInput.value);

  function syncTeamForm() {
    const slug = slugInput.value;
    bind('slug-preview', slug || 'team_8fK2xQvLm');
    fieldError(slugInput, slugProblem(slug));
    if (!nameOk() && 'touched' in nameInput.dataset) fieldError(nameInput, 'Enter a team name.'); else fieldError(nameInput, '');
  }
  on(nameInput, 'blur', () => { nameInput.dataset.touched = ''; syncTeamForm(); });
  on(teamForm, 'input', (event) => { if (event.target === nameInput || event.target === slugInput) syncTeamForm(); });
  /* Discard: the browser puts every field back to its default (the last saved value), then the form is clean again. */
  on(teamForm, 'reset', () => later(() => {
    delete nameInput.dataset.touched;
    syncTeamForm();
    forms.markClean(teamForm);
  }, 0));

  /* One save for the whole form, from the bar that appears when anything changed (data-fd-dirty). */
  on<SubmitEvent>(teamForm, 'submit', async (event) => {
    event.preventDefault();
    const button = event.submitter as HTMLElement | null;
    if (!button || button.id !== 'team-save-all') return;
    nameInput.dataset.touched = '';
    syncTeamForm();
    if (!nameOk() || !slugOk()) { (!nameOk() ? nameInput : slugInput).focus(); return; }
    if (isBusy(button)) return;
    setBusy(button, true);
    await wait(700);
    setBusy(button, false);
    nameInput.value = nameInput.value.trim();
    saved.name = nameInput.value; saved.slug = slugInput.value;
    // What was saved becomes the default, so Discard returns to it.
    for (const input of $$<HTMLInputElement>('input[name]', teamForm)) { input.defaultValue = input.value; input.defaultChecked = input.checked; }
    forms.markClean(teamForm);
    bind('team-summary', teamSummary());
    bind('team-changed-by', 'you, just now');
    toast({ title: 'Team settings saved', description: 'Every member sees the change now.', tone: 'success' });
  });
  on<KeyboardEvent>(teamForm, 'keydown', (event) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement) || event.target.type === 'radio') return;
    event.preventDefault();
    if (event.target.id === 'invite-email') { if (!inviteSend.disabled) inviteSend.click(); return; }
    if (teamForm.hasAttribute('data-dirty')) $('#team-save-all').click();
  });

  /* Members and invites */
  const list = $('#members-list');
  const pendingRows = () => $$('[data-invite]', list);
  const activeRows = () => $$('[data-member]', list);
  function teamSummary() {
    const people = activeRows().length;
    const pending = pendingRows().length;
    return `${saved.name} · ${people} member${people === 1 ? '' : 's'} · ${pending} pending invite${pending === 1 ? '' : 's'}`;
  }
  function refreshCounts() {
    const pending = pendingRows().length;
    bind('member-count', String(activeRows().length));
    bind('member-badge', String(activeRows().length + pending));
    bind('team-summary', teamSummary());
    bind('pending-desc', pending ? `${pending} ${pending === 1 ? 'person has' : 'people have'} been invited and ${pending === 1 ? 'has' : 'have'} not joined yet. Invites expire after 7 days.` : 'No pending invites. Invite someone above and they will show up here.');
    $<HTMLButtonElement>('#resend-all').disabled = !pending;
    $<HTMLButtonElement>('#revoke-all').disabled = !pending;
  }
  refreshCounts();

  const inviteEmail = $<HTMLInputElement>('#invite-email');
  const inviteSend = $<HTMLButtonElement>('#invite-send');
  on(inviteEmail, 'input', () => { inviteSend.disabled = !emailOk(inviteEmail.value); });
  on(inviteSend, 'click', async () => {
    const email = inviteEmail.value.trim().toLowerCase();
    const role = $<HTMLSelectElement>('#invite-role').value;
    if (!emailOk(email) || isBusy(inviteSend)) return;
    if ($$('[data-member], [data-invite]', list).some((row) => (row.dataset.member || row.dataset.invite) === email)) {
      toast({ title: 'Already on the team', description: `${email} is a member or has a pending invite.`, tone: 'warning' });
      return;
    }
    setBusy(inviteSend, true);
    await wait(700);
    setBusy(inviteSend, false);
    // Markup added by hand (L4): React does not render this list again, and init() enhances the new row.
    const row = document.createElement('li');
    row.className = 'fd-list-row';
    row.dataset.invite = email;
    row.dataset.roleName = role;
    row.innerHTML = `<span class="fd-list-lead" data-shape="round" data-tone="warning"><i data-icon="mail"></i></span>
    <div class="fd-list-body"><span class="fd-list-title"></span><span class="fd-list-desc">Invited Nov 14 · ${role}</span></div>
    <span class="fd-list-meta"><span class="fd-badge" data-tone="warning">Invite sent</span></span>
    <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-resend>Resend</button><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-menu="menu-invite" data-placement="bottom-end"><i data-icon="ellipsis"></i></button></span>`;
    $('.fd-list-title', row).textContent = email;
    $('[data-fd-menu]', row).setAttribute('aria-label', `Actions for ${email}`);
    list.append(row);
    init(row);
    inviteEmail.value = '';
    inviteSend.disabled = true;
    refreshCounts();
    toast({ title: 'Invite sent', description: `${email} will get an email to join as ${role}.`, tone: 'success' });
  });

  const rowName = (row: Element) => ($('.fd-list-title', row).childNodes[0].textContent ?? '').trim();
  async function resend(row: HTMLElement, button?: HTMLElement) {
    if (button) { if (isBusy(button)) return; setBusy(button, true); await wait(600); setBusy(button, false); }
    toast({ title: 'Invite resent', description: `A fresh link went to ${row.dataset.invite}.`, tone: 'success' });
  }
  async function removeRow(row: HTMLElement, { invite }: { invite: boolean }) {
    const who = invite ? row.dataset.invite ?? '' : rowName(row);
    const ok = await confirmAction(invite
      ? { title: `Revoke the invite for ${who}?`, desc: 'The link in their email stops working. You can invite them again later.', label: 'Revoke invite' }
      : { title: `Remove ${who}?`, desc: 'They lose access to this team’s keys, runs and monitors at once. Their own account is not deleted.', label: 'Remove member' });
    if (!ok) return;
    row.remove();
    refreshCounts();
    toast({ title: invite ? 'Invite revoked' : 'Member removed', description: invite ? `${who} can no longer join with that link.` : `${who} no longer has access to Quarry Labs.`, tone: 'neutral' });
  }
  on(list, 'click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-resend]');
    const row = button?.closest<HTMLElement>('[data-invite]');
    if (button && row) resend(row, button);
  });
  on(list, 'change', (event) => {
    const roleSelect = (event.target as Element).closest<HTMLSelectElement>('select[data-role]');
    const row = roleSelect?.closest('.fd-list-row');
    if (roleSelect && row) toast({ title: 'Role updated', description: `${rowName(row)} is now ${roleSelect.value === 'Admin' ? 'an Admin' : `a ${roleSelect.value}`}.`, tone: 'success' });
  });
  type MenuSelect = { value?: string; trigger?: Element | null };
  on($('#menu-member'), 'fd:select', (event) => {
    const d = detail<MenuSelect>(event);
    const row = d.trigger?.closest<HTMLElement>('.fd-list-row');
    if (!row) return;
    if (d.value === 'copy') { navigator.clipboard?.writeText(row.dataset.member ?? '').catch(() => {}); toast({ title: 'Email copied', tone: 'success' }); }
    else removeRow(row, { invite: false });
  });
  on($('#menu-invite'), 'fd:select', (event) => {
    const d = detail<MenuSelect>(event);
    const row = d.trigger?.closest<HTMLElement>('.fd-list-row');
    if (!row) return;
    if (d.value === 'copy') { navigator.clipboard?.writeText(row.dataset.invite ?? '').catch(() => {}); toast({ title: 'Email copied', tone: 'success' }); }
    else if (d.value === 'resend') resend(row);
    else removeRow(row, { invite: true });
  });
  on($('#resend-all'), 'click', async (event) => {
    const button = event.currentTarget as HTMLElement;
    if (isBusy(button)) return;
    setBusy(button, true);
    await wait(700);
    setBusy(button, false);
    toast({ title: 'Invites resent', description: `${pendingRows().length} people got a fresh link.`, tone: 'success' });
  });
  on($('#revoke-all'), 'click', async () => {
    const count = pendingRows().length;
    if (!await confirmAction({ title: `Revoke ${count} pending invite${count === 1 ? '' : 's'}?`, desc: 'Their links stop working. You can invite them again later.', label: 'Revoke all' })) return;
    pendingRows().forEach((row) => row.remove());
    refreshCounts();
    toast({ title: 'Invites revoked', tone: 'neutral' });
  });
  on($('#leave-team'), 'click', async (event) => {
    if ((event.currentTarget as Element).getAttribute('aria-disabled') === 'true') return;
    if (!await confirmAction({ title: 'Leave Quarry Labs?', desc: 'You lose access to its keys, runs and monitors at once. An admin can invite you again.', label: 'Leave team' })) return;
    toast({ title: 'You left Quarry Labs', description: 'You were moved to your Personal team.', tone: 'neutral' });
  });

  /* ---------------------------------------------------------------- Billing */
  on($('[data-update-card]'), 'click', (event) => { event.preventDefault(); toast({ title: 'Opening the secure card form', description: 'Card details go straight to the payment provider, never through Ember.', tone: 'info' }); });
  const comparePlans = () => {
    const compare = $<HTMLDetailsElement>('#compare-plans');
    compare.open = true;
    compare.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  on($('#panel-billing'), 'click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-upgrade], [data-plan], [data-downgrade], [data-sales], [data-download]');
    if (!target) return;
    if (target.matches('[data-plan]')) toast({ title: `Upgrade to ${target.dataset.plan}`, description: 'Review the prorated charge of $53.33 for the 20 days left in this cycle, then confirm in checkout.', tone: 'info' });
    else if (target.matches('[data-upgrade]')) { comparePlans(); toast({ title: 'Pick a plan to upgrade', description: 'Standard fits teams past 3,000 credits a month.', tone: 'info' }); }
    else if (target.matches('[data-downgrade]')) toast({ title: 'Downgrade scheduled', description: 'You move to Free on Dec 4 and keep Hobby until then.', tone: 'neutral' });
    else if (target.matches('[data-sales]')) toast({ title: 'Request sent', description: 'Someone from sales will email maya@quarry.dev today.', tone: 'success' });
    else {
      const file = target.dataset.download ?? '';
      toast({ title: `Downloading ${file}`, description: file.startsWith('INV') ? 'PDF · 38 KB' : 'ZIP · 5 PDFs', tone: 'success' });
    }
  });
  on($('#menu-plan'), 'fd:select', async (event) => {
    const value = detail<MenuSelect>(event).value;
    if (value === 'compare') comparePlans();
    else if (value === 'invoices') $('#bt-tab-invoices').click();
    else if (await confirmAction({ title: 'Cancel your Hobby subscription?', desc: 'You keep 3,000 credits a month until Dec 4, then move to Free with 1,000 credits.', label: 'Cancel subscription' })) toast({ title: 'Subscription canceled', description: 'Hobby ends on Dec 4. You can resubscribe any time.', tone: 'neutral' });
  });

  const rechargeSwitch = $<HTMLInputElement>('#recharge-switch');
  on(rechargeSwitch, 'change', () => {
    $('#recharge-fields').hidden = !rechargeSwitch.checked;
    toast({ title: rechargeSwitch.checked ? 'Auto-recharge is on' : 'Auto-recharge is off', tone: rechargeSwitch.checked ? 'success' : 'neutral' });
  });
  on($('#recharge-fields'), 'change', () => toast({ title: 'Auto-recharge updated', tone: 'success', id: 'recharge' }));

  on($('#seg-period'), 'fd:change', (event) => {
    const yearly = detail<{ value: string }>(event).value === 'yearly';
    $$('.fd-plan-amount[data-monthly]').forEach((el) => { el.textContent = (yearly ? el.dataset.yearly : el.dataset.monthly) ?? ''; });
    $$('[data-per]').forEach((el, index) => { el.textContent = yearly && index > 0 ? '/mo, billed yearly' : '/month'; });
  });

  const couponInput = $<HTMLInputElement>('#coupon-code');
  const couponApply = $<HTMLButtonElement>('#coupon-apply');
  const couponList = $('#coupon-list');
  const showCoupon = (applied: boolean) => {
    couponList.hidden = !applied;
    $('#coupon-empty').hidden = applied;
    $('#coupon-success').hidden = !applied;
  };
  on(couponInput, 'input', () => { couponApply.disabled = !couponInput.value.trim(); fieldError(couponInput, ''); });
  async function applyCoupon() {
    const couponCode = couponInput.value.trim().toUpperCase();
    if (!couponCode || isBusy(couponApply)) return;
    setBusy(couponApply, true);
    await wait(600);
    setBusy(couponApply, false);
    if (couponCode === 'QUARRY20') {
      fieldError(couponInput, '');
      showCoupon(true);
      couponInput.value = '';
      couponApply.disabled = true;
      toast({ title: 'Coupon applied', description: '20% off your next 3 invoices.', tone: 'success' });
    } else fieldError(couponInput, 'That code is not valid or has expired. Check the spelling and try again.');
  }
  on(couponApply, 'click', applyCoupon);
  on<KeyboardEvent>(couponInput, 'keydown', (event) => { if (event.key === 'Enter') applyCoupon(); });
  on($('#coupon-remove'), 'click', () => { showCoupon(false); toast({ title: 'Coupon removed', tone: 'neutral' }); });

  /* ---------------------------------------------------------------- Data sources */
  let termsCard: HTMLElement | null = null;
  const termsDialog = $<HTMLDialogElement>('#dlg-terms');
  const termsCheck = $<HTMLInputElement>('#terms-accept');
  const termsAccept = $<HTMLButtonElement>('#terms-accept-btn');

  function renderProvider(card: HTMLElement) {
    const accepted = card.dataset.terms;
    const status = $('[data-bind="terms-status"]', card);
    const button = $('[data-terms-open]', card);
    const toggle = $<HTMLInputElement>('.fd-switch input', card);
    status.dataset.tone = accepted ? 'success' : 'warning';
    status.textContent = accepted ? `Terms accepted ${accepted}` : 'Terms need review';
    button.textContent = accepted ? 'View terms' : 'Review terms';
    button.dataset.variant = accepted ? 'ghost' : 'outline';
    toggle.disabled = !accepted;
    $<HTMLInputElement>('.fd-input', card).disabled = !accepted || !toggle.checked;
    bind('sources-on', String($$('[data-provider] .fd-switch input:checked:not(:disabled)').length));
  }
  $$('[data-provider]').forEach(renderProvider);
  on($('#provider-grid'), 'click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-terms-open]');
    if (!button) return;
    termsCard = button.closest<HTMLElement>('[data-provider]');
    if (!termsCard) return;
    const accepted = termsCard.dataset.terms;
    $('[data-terms-title]', termsDialog).textContent = `${termsCard.dataset.provider} terms`;
    $('[data-terms-desc]', termsDialog).textContent = accepted ? `You accepted these terms on ${accepted}.` : 'Last updated Sep 12, 2026. Read the summary, then accept for Quarry Labs.';
    $('#terms-accept-wrap').hidden = Boolean(accepted);
    termsAccept.hidden = Boolean(accepted);
    termsCheck.checked = false;
    termsAccept.disabled = true;
    openDialog(termsDialog, { trigger: button });
  });
  on(termsCheck, 'change', () => { termsAccept.disabled = !termsCheck.checked; });
  on(termsDialog, 'fd:close', () => {
    if (termsDialog.returnValue !== 'accept' || !termsCard) return;
    termsCard.dataset.terms = 'Nov 14';
    renderProvider(termsCard);
    toast({ title: `${termsCard.dataset.provider} terms accepted`, description: 'Turn the provider on to let your agents call it.', tone: 'success' });
  });
  on($('#provider-grid'), 'change', (event) => {
    const target = event.target as HTMLInputElement;
    const card = target.closest<HTMLElement>('[data-provider]');
    if (!card) return;
    if (target.matches('.fd-switch input')) {
      renderProvider(card);
      toast({ title: `${card.dataset.provider} ${target.checked ? 'enabled' : 'disabled'}`, tone: target.checked ? 'success' : 'neutral', id: 'provider' });
    } else if (target.matches('.fd-input')) toast({ title: 'Spend cap saved', description: `${card.dataset.provider}: ${Number(target.value || 0).toLocaleString('en-US')} credits a month.`, tone: 'success', id: 'cap' });
  });

  /* ---------------------------------------------------------------- Connected apps */
  const apps = $('#apps-list');
  function refreshApps() {
    const count = $$('[data-app]', apps).length;
    apps.hidden = count === 0;
    $('#apps-empty').hidden = count !== 0;
    bind('apps-count', count ? `${count} app${count === 1 ? '' : 's'} connected` : 'No apps connected');
    bind('apps-total', String(count));
  }
  on(apps, 'click', async (event) => {
    const button = (event.target as Element).closest('[data-disconnect]');
    const row = button?.closest<HTMLElement>('[data-app]');
    if (!row) return;
    const name = row.dataset.app ?? '';
    if (!await confirmAction({ title: `Disconnect ${name}?`, desc: `${name} loses access to Quarry Labs right away. Anything it is running stops at the next request. You can connect it again later.`, label: 'Disconnect' })) return;
    const next = row.nextElementSibling;
    row.remove();
    refreshApps();
    toast({ title: `${name} disconnected`, description: 'It can no longer call Ember.', tone: 'success', undo: async () => { await wait(400); apps.insertBefore(row, next); refreshApps(); }, undone: `${name} is connected again` });
  });
  refreshApps();

  /* ---------------------------------------------------------------- Notifications */
  let savedTimer: ReturnType<typeof setTimeout> | undefined;
  const flashSaved = (label = 'Notification preferences') => {
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => toast({ title: `${label} saved`, tone: 'success', duration: 2200, id: 'saved' }), 600);
  };
  on($('#notif-matrix'), 'change', () => flashSaved());
  on(document, 'change', (event) => {
    const label = event.target instanceof HTMLElement ? event.target.dataset.savedToast : null;
    if (label) flashSaved(label);
  });

  const permStatus = $('#perm-status');
  const enableAlerts = $<HTMLButtonElement>('#enable-alerts');
  on(enableAlerts, 'click', async () => {
    if (isBusy(enableAlerts)) return;
    setBusy(enableAlerts, true);
    await wait(800);
    setBusy(enableAlerts, false);
    permStatus.dataset.tone = 'success';
    permStatus.textContent = 'Allowed';
    enableAlerts.disabled = true;
    $('span', enableAlerts).textContent = 'Desktop alerts enabled';
    toast({ title: 'Desktop alerts enabled', description: 'Ember will notify you here even when the tab is in the background.', tone: 'success' });
  });
  const quiet = $<HTMLInputElement>('#quiet-switch');
  on(quiet, 'change', () => { $('#quiet-fields').hidden = !quiet.checked; flashSaved('Quiet hours'); });

  /* ---------------------------------------------------------------- Advanced */
  const secret = $('#whsec');
  on(secret, 'fd:rotate', async () => {
    if (!await confirmAction({ title: 'Rotate the signing secret?', desc: 'The old secret stops working at once. Update your endpoints with the new one first, or their signature checks will fail.', label: 'Rotate secret' })) return;
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const next = `whsec_${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    const job = wait(900);
    toast.promise(job, { loading: 'Rotating signing secret…', success: { title: 'Signing secret rotated', description: 'Copy the new secret into your endpoints.', tone: 'success' }, error: 'Could not rotate the secret' });
    await job;
    secret.dataset.state = 'masked';
    forms.setSecret(secret, next);
  });

  const allowlist = $('#allowlist-tags');
  on(allowlist, 'fd:change', () => {
    const invalid = $$('.fd-token[data-invalid]', allowlist).length;
    fieldError($('#allowlist'), invalid ? 'Fix or remove the entries shown in red. Use an IPv4 address or a CIDR range.' : '');
    if (!invalid) flashSaved('IP allowlist');
  });

  const endpoints = $<HTMLTableSectionElement>('#endpoints-table tbody');
  const endpointCount = () => bind('endpoint-count', `${endpoints.rows.length} endpoint${endpoints.rows.length === 1 ? '' : 's'}`);
  on($('#menu-endpoint'), 'fd:select', async (event) => {
    const d = detail<MenuSelect>(event);
    const row = d.trigger?.closest<HTMLTableRowElement>('tr');
    if (!row) return;
    const url = row.dataset.endpoint ?? '';
    if (d.value === 'copy') { navigator.clipboard?.writeText(url).catch(() => {}); toast({ title: 'URL copied', tone: 'success' }); }
    else if (d.value === 'test') toast.promise(wait(900), { loading: 'Sending test event…', success: { title: 'Test event delivered', description: `${new URL(url).host} answered 200.`, tone: 'success' }, error: 'Delivery failed' });
    else if (await confirmAction({ title: 'Delete this endpoint?', desc: `${new URL(url).host} stops receiving events right away.`, label: 'Delete endpoint' })) {
      row.remove();
      endpointCount();
      toast({ title: 'Endpoint deleted', tone: 'neutral' });
    }
  });
  on($('#dlg-endpoint'), 'fd:close', (event) => {
    const dialog = event.target as HTMLDialogElement;
    if (dialog.returnValue !== 'add') return;
    const url = $<HTMLInputElement>('#ep-url').value.trim();
    const events = $$<HTMLInputElement>('input[name="events"]:checked', dialog).map((input) => input.value);
    const row = endpoints.insertRow();
    row.dataset.endpoint = url;
    row.innerHTML = `<td data-mono data-stack-title><span class="fd-table-trunc"></span></td>
    <td><span class="fd-row" data-wrap data-gap="1">${events.map((name) => `<span class="fd-badge" data-variant="mono">${name}</span>`).join('') || '<span class="fd-muted">No events</span>'}</span></td>
    <td><span class="fd-status" data-size="sm" data-tone="neutral">No deliveries yet</span></td>
    <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-menu="menu-endpoint" data-placement="bottom-end"><i data-icon="ellipsis"></i></button></td>`;
    $('.fd-table-trunc', row).textContent = url;
    $('[data-fd-menu]', row).setAttribute('aria-label', `Actions for ${new URL(url).host} endpoint`);
    init(row);
    endpointCount();
    toast({ title: 'Endpoint added', description: `${new URL(url).host} will get ${events.length} event type${events.length === 1 ? '' : 's'}.`, tone: 'success' });
  });

  on<Event>($('#zdr-switch'), 'change', (event) => {
    const on_ = (event.target as HTMLInputElement).checked;
    const tone: ToastTone = on_ ? 'success' : 'neutral';
    toast({ title: on_ ? 'Zero data retention is on' : 'Zero data retention is off', description: on_ ? 'New requests are not stored.' : 'Logs and run output are kept for 30 days again.', tone });
  });

  on($('#export-data'), 'click', (event) => {
    const button = event.currentTarget as HTMLElement;
    if (isBusy(button)) return;
    setBusy(button, true);
    const job = wait(1800).then(() => setBusy(button, false));
    toast.promise(job, { loading: 'Preparing your export…', success: { title: 'Export ready', description: 'quarry-labs-export.zip · 4.2 MB', tone: 'success', action: { label: 'Download' } }, error: 'Export failed' });
  });

  /* Delete team: the confirm-inline form keeps its button off until the name matches; the script only sends it. */
  const deleteTeam = $<HTMLFormElement>('#delete-team');
  on(deleteTeam, 'submit', (event) => {
    event.preventDefault();
    if (deleteTeam.dataset.state !== 'match') return;
    const button = $('[data-fd-confirm-submit]', deleteTeam);
    setBusy(button, true);
    const job = wait(1200).then(() => {
      setBusy(button, false);
      deleteTeam.reset();
      $('#dt-confirm').dispatchEvent(new Event('input', { bubbles: true }));
    });
    toast.promise(job, { loading: 'Deleting Quarry Labs…', success: { title: 'Quarry Labs deleted', description: 'You were moved to your Personal team.', tone: 'neutral' }, error: 'Could not delete the team' });
  });

  /* ---------------------------------------------------------------- Features: grouped switches, Done · Undo */
  const featureTable = $('#features-table');
  const featureSearch = $<HTMLInputElement>('#feature-search');
  const featureRows = () => $$<HTMLTableRowElement>('tr[data-feature]', featureTable);
  const switchOf = (row: Element) => $<HTMLInputElement>('input', row);
  function syncFeatures() {
    const rows = featureRows();
    const count = rows.filter((row) => switchOf(row).checked).length;
    bind('features-on', String(count));
    const shown = rows.filter((row) => !row.hidden);
    $('#feature-count').textContent = featureSearch.value.trim() ? `${shown.length} of ${rows.length} match` : `${count} of ${rows.length} on`;
    $('#features-wrap').hidden = shown.length === 0;
    $('#features-none').hidden = shown.length !== 0;
  }
  function paintFeature(row: Element) {
    const status = $maybe('.fd-status', row);
    if (!status) return;
    const isOn = switchOf(row).checked;
    status.dataset.tone = isOn ? 'success' : 'neutral';
    status.textContent = isOn ? 'On' : 'Off';
  }
  on(featureTable, 'change', (event) => {
    const input = (event.target as Element).closest<HTMLInputElement>('input[role="switch"]');
    const row = input?.closest<HTMLTableRowElement>('tr');
    if (!input || !row) return;
    const name = row.dataset.feature;
    paintFeature(row);
    syncFeatures();
    toast({
      title: `${name} ${input.checked ? 'on' : 'off'}`,
      description: input.checked ? 'Every key can use it now.' : 'Requests that ask for it now fail.',
      tone: 'success', id: 'feature',
      undo: async () => { await wait(300); input.checked = !input.checked; paintFeature(row); syncFeatures(); },
      undone: `${name} is ${input.checked ? 'off' : 'on'} again`,
    });
  });
  on(featureSearch, 'input', () => {
    const q = featureSearch.value.trim().toLowerCase();
    featureRows().forEach((row) => { row.hidden = Boolean(q) && !(row.textContent ?? '').toLowerCase().includes(q); });
    syncFeatures();
  });
  on($('#features-clear'), 'click', () => {
    featureSearch.value = '';
    featureSearch.dispatchEvent(new Event('input', { bubbles: true }));
    featureSearch.focus();
  });
  syncFeatures();

  /* ---------------------------------------------------------------- Page states and the demo band
     ?state=ready|loading|error|member. Member is the ready page as someone who can read but not change it: every
     control marked data-admin is disabled, and the who-can-edit lines turn into the reason. */
  const statesEl = $('#settings-states');
  const stateSwitch = $('#state-switch');
  const STATES = ['ready', 'loading', 'error', 'member'];
  let pageState = 'ready';
  type Lockable = HTMLElement & { disabled: boolean };
  const memberLocked = () => [...$$<Lockable>('[data-admin]'), ...$$<Lockable>('#members-list .fd-list-trail .fd-btn'), $<Lockable>('#resend-all'), $<Lockable>('#revoke-all')];
  function setMember(member: boolean) {
    if (member) memberLocked().forEach((el) => { el.disabled = true; });
    else {
      $$<Lockable>('[data-admin]').forEach((el) => { el.disabled = false; });
      $$<Lockable>('#members-list .fd-list-trail .fd-btn').forEach((el) => { el.disabled = false; });
      refreshCounts();
    }
    $$('[data-member-only]').forEach((el) => { el.hidden = !member; });
    $('#team-editors').hidden = member;
    // A member can leave; the only owner cannot, and says why.
    const leave = $('#leave-team');
    if (member) leave.removeAttribute('aria-disabled'); else leave.setAttribute('aria-disabled', 'true');
    $('#leave-reason').hidden = member;
    if (member) forms.markClean(teamForm);
  }
  function setPageState(value: string, { url = true } = {}) {
    pageState = STATES.includes(value) ? value : 'ready';
    setState(statesEl, pageState === 'member' ? 'ready' : pageState);
    setMember(pageState === 'member');
    const item = $maybe(`.fd-segmented-item[data-value="${pageState}"]`, stateSwitch);
    if (item) nav.selectSegment(item, { silent: true });
    if (url) {
      const next = new URL(location.href);
      if (pageState === 'ready') next.searchParams.delete('state'); else next.searchParams.set('state', pageState);
      history.replaceState(history.state, '', next);
    }
  }
  on(stateSwitch, 'fd:change', (event) => { const value = detail<{ value: string }>(event).value; if (value !== pageState) setPageState(value); });
  /* Try again in the error state goes to loading (data-fd-set-state), then the panel comes back. */
  on(statesEl, 'fd:change', (event) => {
    if (event.target !== statesEl || detail<{ value: string }>(event).value !== 'loading' || pageState === 'loading') return;
    setPageState('loading');
    later(() => { if (pageState === 'loading') setPageState('ready'); }, 700);
  });
  setPageState(new URLSearchParams(location.search).get('state') || 'ready', { url: false });

  syncTeamForm();

  return () => { clearTimeout(savedTimer); unblur(); };
}
