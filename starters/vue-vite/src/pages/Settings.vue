<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { $ as query, $$ as queryAll, content, focusQuiet, forms, nav, overlays, texture } from 'fire-design';
import type { FireEventMap, PageState } from 'fire-design';
import { LOAD_MS, SIMULATE_LOAD } from '../demo';

// Fire runs the dialogs, menus, segmented controls, the dirty bar and the confirm-inline form of this screen from its
// markup. What follows is the page's own behaviour, from templates/settings.html, kept to what an app would write:
// the tab in the URL, one save for the team form, the feature switches (Done · Undo), the delete, and the demo states.
const { toast } = overlays;
// Fire's selector helpers, typed for HTML elements (everything this page looks up is one).
const $ = <E extends HTMLElement = HTMLElement>(selector: string, root?: ParentNode) => query<E>(selector, root);
const $$ = <E extends HTMLElement = HTMLElement>(selector: string, root?: ParentNode) => queryAll<E>(selector, root);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const bind = (name: string, text: string) => $$(`[data-bind="${name}"]`).forEach((el) => { el.textContent = text; });
const setBusy = (el: Element, on: boolean) => (on ? el.setAttribute('aria-busy', 'true') : el.removeAttribute('aria-busy'));
/** The state of the .fd-states wrapper for a demo state: a member sees the page ready. */
const wrapperState = (state: string): PageState => (state === 'loading' || state === 'error' ? state : 'ready');

/** One inline error slot per field: shown in place of the hint. */
function fieldError(input: HTMLElement, message: string) {
  const slot = input.closest('.fd-field')?.querySelector<HTMLElement>(':scope > .fd-field-error');
  if (!slot) return;
  if (message) { slot.querySelector('span')!.textContent = message; slot.hidden = false; input.setAttribute('aria-invalid', 'true'); }
  else { slot.hidden = true; input.removeAttribute('aria-invalid'); }
}

/** Ask before doing something hard to undo (the page's #dlg-confirm). Resolves true on confirm. */
function confirmAction({ title, desc, label }: { title: string; desc: string; label: string }) {
  const dialog = $<HTMLDialogElement>('#dlg-confirm')!;
  $('[data-confirm-title]', dialog)!.textContent = title;
  $('[data-confirm-desc]', dialog)!.textContent = desc;
  $('[data-confirm-ok]', dialog)!.textContent = label;
  return new Promise<boolean>((resolve) => {
    dialog.addEventListener('fd:close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    overlays.openDialog(dialog);
  });
}

// ---------------------------------------------------------------- The tab is in the URL (?tab=)
const TABS = ['account', 'notifications', 'team', 'features', 'billing', 'data-sources', 'connected-apps', 'advanced'];
const ALIASES: Record<string, string> = { sources: 'data-sources', datasources: 'data-sources', apps: 'connected-apps', connected: 'connected-apps' };
const route = useRoute();
const router = useRouter();
const tab = computed(() => {
  const value = String(route.query.tab ?? '');
  const id = ALIASES[value] ?? value;
  return TABS.includes(id) ? id : 'team';
});
function onTab(event: MouseEvent) {
  const link = (event.target as Element).closest<HTMLElement>('[data-tab]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
  event.preventDefault();
  void router.replace({ query: { ...route.query, tab: link.dataset.tab } }).then(() => nextTick(() => focusQuiet($(`#h-${tab.value}`))));
}

// ---------------------------------------------------------------- Team: one form, one save (data-fd-dirty shows the bar)
const SLUG = /^[a-z0-9-]{3,32}$/;
const TAKEN = ['ember', 'admin', 'api', 'support'];
const slugProblem = (value: string) => (!value ? '' : !SLUG.test(value) ? 'Use 3 to 32 lowercase letters, numbers or dashes.' : TAKEN.includes(value) ? `“${value}” is already taken. Try another slug.` : '');
const teamFields = () => ({ form: $<HTMLFormElement>('#panel-team')!, name: $<HTMLInputElement>('#team-name')!, slug: $<HTMLInputElement>('#team-slug')! });
function syncTeamForm() {
  const { name, slug } = teamFields();
  bind('slug-preview', slug.value || 'team_8fK2xQvLm');
  fieldError(slug, slugProblem(slug.value));
  fieldError(name, !name.value.trim() && 'touched' in name.dataset ? 'Enter a team name.' : '');
}
function onTeamInput(event: Event) {
  if ((event.target as HTMLElement).matches('#team-name, #team-slug')) syncTeamForm();
}
/** Discard: the browser puts every field back to its default (the last saved value); then the form is clean again. */
function onTeamReset() {
  setTimeout(() => { delete teamFields().name.dataset.touched; syncTeamForm(); forms.markClean(teamFields().form); }, 0);
}
async function onTeamSave(event: SubmitEvent) {
  const { form, name, slug } = teamFields();
  const button = event.submitter as HTMLButtonElement | null;
  if (button?.id !== 'team-save-all') return;
  name.dataset.touched = '';
  syncTeamForm();
  const nameOk = name.value.trim().length > 0;
  if (!nameOk || slugProblem(slug.value)) { (nameOk ? slug : name).focus(); return; }
  if (button.getAttribute('aria-busy') === 'true') return;
  setBusy(button, true);
  await wait(700);
  setBusy(button, false);
  name.value = name.value.trim();
  // What was saved becomes the default, so Discard returns to it.
  for (const input of $$<HTMLInputElement>('input[name]', form)) { input.defaultValue = input.value; input.defaultChecked = input.checked; }
  forms.markClean(form);
  bind('team-changed-by', 'you, just now');
  toast({ title: 'Team settings saved', description: 'Every member sees the change now.', tone: 'success' });
}

// ---------------------------------------------------------------- Features: grouped switches, Done · Undo
const featureRows = () => $$<HTMLTableRowElement>('#features-table tr[data-feature]');
function syncFeatures() {
  const rows = featureRows();
  const on = rows.filter((row) => $<HTMLInputElement>('input', row)!.checked).length;
  const shown = rows.filter((row) => !row.hidden).length;
  const q = $<HTMLInputElement>('#feature-search')!.value.trim();
  bind('features-on', String(on));
  $('#feature-count')!.textContent = q ? `${shown} of ${rows.length} match` : `${on} of ${rows.length} on`;
  $('#features-wrap')!.hidden = shown === 0;
  $('#features-none')!.hidden = shown !== 0;
}
function paintFeature(row: HTMLElement) {
  const status = $('.fd-status', row);
  if (!status) return;
  const on = $<HTMLInputElement>('input', row)!.checked;
  status.dataset.tone = on ? 'success' : 'neutral';
  status.textContent = on ? 'On' : 'Off';
}
function onFeature(event: Event) {
  const input = (event.target as Element).closest<HTMLInputElement>('input[role="switch"]');
  if (!input) return;
  const row = input.closest('tr')!;
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
}
function onFeatureSearch(event: Event) {
  const q = (event.target as HTMLInputElement).value.trim().toLowerCase();
  featureRows().forEach((row) => { row.hidden = Boolean(q) && !row.textContent!.toLowerCase().includes(q); });
  syncFeatures();
}
function onFeaturesClear() {
  const search = $<HTMLInputElement>('#feature-search')!;
  search.value = '';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  search.focus();
}

// ---------------------------------------------------------------- Delete team (confirm-inline: Fire keeps the button off until the name matches) and leave
function onDeleteTeam(event: SubmitEvent) {
  const form = event.currentTarget as HTMLFormElement;
  if (form.dataset.state !== 'match') return;
  const button = $('[data-fd-confirm-submit]', form)!;
  setBusy(button, true);
  void toast.promise(wait(1200).then(() => { setBusy(button, false); form.reset(); $('#dt-confirm')!.dispatchEvent(new Event('input', { bubbles: true })); }), {
    loading: 'Deleting Quarry Labs…', success: { title: 'Quarry Labs deleted', description: 'You were moved to your Personal team.', tone: 'neutral' }, error: 'Could not delete the team',
  });
}
async function onLeave(event: MouseEvent) {
  if ((event.currentTarget as HTMLElement).getAttribute('aria-disabled') === 'true') return;
  if (!await confirmAction({ title: 'Leave Quarry Labs?', desc: 'You lose access to its keys, runs and monitors at once. An admin can invite you again.', label: 'Leave team' })) return;
  toast({ title: 'You left Quarry Labs', description: 'You were moved to your Personal team.', tone: 'neutral' });
}

// ---------------------------------------------------------------- Demo state: ?state=ready|loading|error|member
// Member is the ready page as someone who can read but not change it: every control marked data-admin is disabled and
// the who-can-edit lines turn into the reason.
const STATES = ['ready', 'loading', 'error', 'member'];
let pageState = 'ready';
function setMember(on: boolean) {
  const locked = [...$$<HTMLButtonElement>('[data-admin]'), ...$$<HTMLButtonElement>('#members-list .fd-list-trail .fd-btn')];
  locked.forEach((el) => { el.disabled = on; });
  $$('[data-member-only]').forEach((el) => { el.hidden = !on; });
  $('#team-editors')!.hidden = on;
  // A member can leave; the only owner cannot, and says why.
  if (on) $('#leave-team')!.removeAttribute('aria-disabled'); else $('#leave-team')!.setAttribute('aria-disabled', 'true');
  $('#leave-reason')!.hidden = on;
  if (on) forms.markClean(teamFields().form);
}
function setPageState(value: string) {
  pageState = STATES.includes(value) ? value : 'ready';
  content.setState($('#settings-states'), wrapperState(pageState));
  setMember(pageState === 'member');
  const item = $$<HTMLElement>('.fd-segmented-item', $('#state-switch')!).find((el) => el.dataset.value === pageState);
  if (item) nav.selectSegment(item, { silent: true });
  const query = { ...route.query };
  if (pageState === 'ready') delete query.state; else query.state = pageState;
  void router.replace({ query });
}
function onStateSwitch(event: FireEventMap['fd:change']) {
  if (event.detail.value !== pageState) setPageState(String(event.detail.value));
}
/** Try again in the error state goes to loading (data-fd-set-state); the panel comes back after a moment. */
function onStatesChange(event: FireEventMap['fd:change']) {
  if (event.target !== event.currentTarget || event.detail.value !== 'loading' || pageState === 'loading') return;
  setPageState('loading');
  retry = window.setTimeout(() => { if (pageState === 'loading') setPageState('ready'); }, 700);
}

let retry = 0;
let loaded = 0;
onMounted(() => {
  // The first paint: skeletons swap to content, as the template does (under VITE_FIRE_STATIC the screen stays as written).
  if (SIMULATE_LOAD) loaded = window.setTimeout(() => ['members-wrap', 'billing-summary'].forEach((id) => texture.setLoading($(`#${id}`), false)), LOAD_MS);
  const initial = String(route.query.state ?? '');
  if (STATES.includes(initial) && initial !== 'ready') setPageState(initial);
});
onBeforeUnmount(() => { window.clearTimeout(loaded); window.clearTimeout(retry); });
</script>

<template>
  <div class="fd-frame">

    <section class="fd-band fd-rise" data-pad="sm" aria-label="Page head">
      <div class="fd-page-head">
        <div class="fd-page-head-text">
          <h1 class="fd-page-head-title">Settings</h1>
          <p class="fd-page-head-desc">Your account, the Quarry Labs team and how it uses Ember.</p>
        </div>
        <div class="fd-page-head-actions">
          <a class="fd-btn" data-variant="outline" href="audit.html"><svg class="fd-icon" data-icon="scroll-text" aria-hidden="true"><use href="#i-scroll-text"></use></svg><span>Audit log</span></a>
        </div>
      </div>
    </section>

    <section class="fd-band fd-rise" data-fd-vars="--fd-i: 1" data-pad="none" data-grow aria-label="Settings">
      <div class="fd-split" data-side="start">

        <aside class="fd-panel" aria-label="Settings sections">
          <!-- Three groups (you, the team, developers), split by separators. Counts say what is inside.
               Below 760px of its own width the subnav becomes one scrolling strip. -->
          <nav class="fd-subnav" aria-label="Settings" @click="onTab">
            <a class="fd-subnav-item" href="?tab=account" data-tab="account" :aria-current="tab === 'account' ? 'page' : undefined"><svg class="fd-icon" data-icon="user" aria-hidden="true"><use href="#i-user"></use></svg><span>Account</span></a>
            <a class="fd-subnav-item" href="?tab=notifications" data-tab="notifications" :aria-current="tab === 'notifications' ? 'page' : undefined"><svg class="fd-icon" data-icon="bell" aria-hidden="true"><use href="#i-bell"></use></svg><span>Notifications</span></a>
            <hr class="fd-subnav-sep">
            <a class="fd-subnav-item" href="?tab=team" data-tab="team" :aria-current="tab === 'team' ? 'page' : undefined"><svg class="fd-icon" data-icon="users" aria-hidden="true"><use href="#i-users"></use></svg><span>Team</span><span class="fd-subnav-meta" data-bind="member-count">4</span></a>
            <a class="fd-subnav-item" href="?tab=features" data-tab="features" :aria-current="tab === 'features' ? 'page' : undefined"><svg class="fd-icon" data-icon="toggle-left" aria-hidden="true"><use href="#i-toggle-left"></use></svg><span>Features</span><span class="fd-subnav-meta" data-bind="features-on">6</span></a>
            <a class="fd-subnav-item" href="?tab=billing" data-tab="billing" :aria-current="tab === 'billing' ? 'page' : undefined"><svg class="fd-icon" data-icon="credit-card" aria-hidden="true"><use href="#i-credit-card"></use></svg><span>Billing</span></a>
            <hr class="fd-subnav-sep">
            <a class="fd-subnav-item" href="?tab=data-sources" data-tab="data-sources" :aria-current="tab === 'data-sources' ? 'page' : undefined"><svg class="fd-icon" data-icon="database" aria-hidden="true"><use href="#i-database"></use></svg><span>Data sources</span><span class="fd-subnav-meta" data-bind="sources-on">4</span></a>
            <a class="fd-subnav-item" href="?tab=connected-apps" data-tab="connected-apps" :aria-current="tab === 'connected-apps' ? 'page' : undefined"><svg class="fd-icon" data-icon="plug" aria-hidden="true"><use href="#i-plug"></use></svg><span>Connected apps</span><span class="fd-subnav-meta" data-bind="apps-total">4</span></a>
            <a class="fd-subnav-item" href="?tab=advanced" data-tab="advanced" :aria-current="tab === 'advanced' ? 'page' : undefined"><svg class="fd-icon" data-icon="settings-2" aria-hidden="true"><use href="#i-settings-2"></use></svg><span>Advanced</span></a>
          </nav>
        </aside>

        <div class="fd-split-main">
        <div class="fd-states" id="settings-states" data-state="ready" @fd:change="onStatesChange">

          <!-- Loading: the shape of a settings panel -->
          <div class="fd-stack" data-gap="6" data-when="loading" aria-busy="true" aria-label="Loading settings">
            <div class="fd-skeleton-text" data-lines="2"></div>
            <div class="fd-skeleton-list" data-rows="5"></div>
          </div>

          <!-- Error -->
          <div class="fd-empty" data-tone="danger" data-when="error" role="alert">
            <span class="fd-empty-icon"><svg class="fd-icon" data-icon="triangle-alert" aria-hidden="true"><use href="#i-triangle-alert"></use></svg></span>
            <h2 class="fd-empty-title">Couldn’t load settings</h2>
            <p class="fd-empty-text">The request timed out after 10 seconds. Nothing you saved was lost.</p>
            <div class="fd-empty-actions"><button class="fd-btn" type="button" data-fd-set-state="loading"><svg class="fd-icon" data-icon="refresh-cw" aria-hidden="true"><use href="#i-refresh-cw"></use></svg><span>Try again</span></button></div>
            <p class="fd-empty-meta"><span>Request ID</span><code class="fd-code">req_5c81d0e2</code><button class="fd-btn" type="button" data-size="xs" data-variant="ghost" data-icon-only data-fd-copy="req_5c81d0e2" aria-label="Copy request ID"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg></button></p>
          </div>

          <!-- Ready: one panel per subnav item -->
          <div data-when="ready">

          <!-- ===================================================== Account -->
          <section class="fd-stack" data-gap="1" id="panel-account" data-panel="account" aria-labelledby="h-account" :hidden="tab !== 'account'">
            <header class="fd-stack" data-gap="1">
              <h2 class="fd-h2" id="h-account" tabindex="-1">Account</h2>
              <p class="fd-muted">Sign-in, appearance and privacy for <span class="fd-mono">maya@quarry.dev</span>.</p>
            </header>
            <div>
              <div class="fd-setting">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Change password</h3><p class="fd-setting-desc">You sign in with Google. To also sign in with a password, we will email you a link to set one.</p></div>
                <div class="fd-setting-control"><button class="fd-btn" type="button" data-fd-toast='{"title":"Check your inbox","description":"We sent a link to maya@quarry.dev. It expires in 30 minutes.","tone":"success"}'><svg class="fd-icon" data-icon="key-round" aria-hidden="true"><use href="#i-key-round"></use></svg><span>Email me a link</span></button></div>
              </div>

              <div class="fd-setting">
                <div class="fd-setting-text">
                  <h3 class="fd-setting-title">Email preferences</h3>
                  <div class="fd-stack" data-gap="3">
                    <p class="fd-setting-desc">Ember emails <span class="fd-mono">maya@quarry.dev</span> about:</p>
                    <ul class="fd-feature-list" data-size="sm">
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Product updates and new endpoints, about twice a month</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Receipts and security notices, always on</span></li>
                    </ul>
                  </div>
                </div>
                <div class="fd-setting-control"><button class="fd-btn" type="button" data-fd-toast='{"title":"Preferences email sent","description":"Open it to change what Ember sends you.","tone":"success"}'><span>Send</span></button></div>
              </div>

              <div class="fd-setting">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Two-factor authentication</h3><p class="fd-setting-desc">Ask for a code from your authenticator app each time you sign in on a new device.</p></div>
                <div class="fd-setting-control"><label class="fd-switch"><input type="checkbox" role="switch" id="twofa-switch" aria-label="Two-factor authentication"><span class="fd-switch-track"></span></label></div>
              </div>

              <div class="fd-setting">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Appearance</h3><p class="fd-setting-desc">Current: <strong data-bind="theme-label">Light (System)</strong></p></div>
                <div class="fd-setting-control">
                  <div class="fd-segmented" data-icon-only role="radiogroup" aria-label="Appearance" id="seg-theme">
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Light" data-value="light"><svg class="fd-icon" data-icon="sun" aria-hidden="true"><use href="#i-sun"></use></svg></button>
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Dark" data-value="dark"><svg class="fd-icon" data-icon="moon" aria-hidden="true"><use href="#i-moon"></use></svg></button>
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="true" aria-label="System" data-value="system"><svg class="fd-icon" data-icon="monitor" aria-hidden="true"><use href="#i-monitor"></use></svg></button>
                  </div>
                </div>
              </div>

              <div class="fd-setting">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Density</h3><p class="fd-setting-desc">Compact tightens rows and controls so more fits on screen.</p></div>
                <div class="fd-setting-control">
                  <div class="fd-segmented" role="radiogroup" aria-label="Density" id="seg-density">
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="true" data-value="comfortable">Comfortable</button>
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="compact">Compact</button>
                  </div>
                </div>
              </div>

              <div class="fd-setting">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Accent</h3><p class="fd-setting-desc">Pick the colour for buttons, links and active states on this device.</p></div>
                <div class="fd-setting-control">
                  <div class="fd-segmented" data-icon-only data-size="sm" role="radiogroup" aria-label="Accent colour" id="seg-accent">
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="true" aria-label="Ember" data-value="ember"><span class="fd-badge" data-variant="solid" data-dot data-accent="ember"></span></button>
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Volt" data-value="volt"><span class="fd-badge" data-variant="solid" data-dot data-accent="volt"></span></button>
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Iris" data-value="iris"><span class="fd-badge" data-variant="solid" data-dot data-accent="iris"></span></button>
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Ocean" data-value="ocean"><span class="fd-badge" data-variant="solid" data-dot data-accent="ocean"></span></button>
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Forest" data-value="forest"><span class="fd-badge" data-variant="solid" data-dot data-accent="forest"></span></button>
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Ink" data-value="ink"><span class="fd-badge" data-variant="solid" data-dot data-accent="ink"></span></button>
                  </div>
                </div>
              </div>

              <div class="fd-setting">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Privacy mode</h3><p class="fd-setting-desc">Hide sensitive account details while you share your screen. Blurs your email in the sidebar; hover it to reveal.</p></div>
                <div class="fd-setting-control"><label class="fd-switch"><input type="checkbox" role="switch" id="privacy-switch" aria-label="Privacy mode"><span class="fd-switch-track"></span><span class="fd-switch-text"><span class="fd-switch-label" data-bind="privacy-label">Off</span></span></label></div>
              </div>

              <div class="fd-setting">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Account owner email</h3><p class="fd-setting-desc"><strong class="fd-mono">maya@quarry.dev</strong> owns this account and receives billing and security emails.</p></div>
                <div class="fd-setting-control"><button class="fd-btn" type="button" data-variant="outline" data-fd-dialog-open="dlg-email"><svg class="fd-icon" data-icon="pencil" aria-hidden="true"><use href="#i-pencil"></use></svg><span>Change email</span></button></div>
              </div>

              <div class="fd-setting" data-tone="danger">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Delete account</h3><p class="fd-setting-desc">Permanently delete your account, API keys and run history. <strong>This cannot be undone.</strong></p></div>
                <div class="fd-setting-control"><button class="fd-btn" type="button" data-variant="danger" data-fd-dialog-open="dlg-delete-account">Delete account</button></div>
              </div>
            </div>
          </section>

          <!-- ===================================================== Team -->
          <form class="fd-stack" data-gap="1" id="panel-team" data-panel="team" aria-labelledby="h-team" data-fd-dirty novalidate autocomplete="off" :hidden="tab !== 'team'" @input="onTeamInput" @reset="onTeamReset" @submit.prevent="onTeamSave">
            <header class="fd-stack" data-gap="1">
              <h2 class="fd-h2" id="h-team" tabindex="-1">Team</h2>
              <p class="fd-muted" data-bind="team-summary">Quarry Labs · 4 members · 2 pending invites</p>
              <!-- Who can edit: always on the page, so nobody finds out by trying -->
              <p class="fd-row fd-small fd-muted" data-gap="1-5" id="team-editors"><svg class="fd-icon" data-size="14" data-icon="users" aria-hidden="true"><use href="#i-users"></use></svg><span>Owners and admins can edit. Last changed by <span data-bind="team-changed-by">Tomasz Nowak, Nov 12</span>.</span></p>
              <p class="fd-row fd-small fd-muted" data-gap="1-5" id="team-viewer" data-member-only hidden><svg class="fd-icon" data-size="14" data-icon="lock" aria-hidden="true"><use href="#i-lock"></use></svg><span>You are a member, so you can read these settings. Ask Maya Reyes or Tomasz Nowak to change them.</span></p>
            </header>
            <div>
              <div class="fd-form-row" data-layout="stack">
                <div class="fd-form-row-text"><label class="fd-form-row-label" for="team-name">Team name</label><span class="fd-form-row-desc">Shown on invoices and to the people you invite.</span></div>
                <div class="fd-form-row-control">
                  <div class="fd-field">
                    <input class="fd-input" id="team-name" name="name" value="Quarry Labs" maxlength="40" autocomplete="off" aria-describedby="team-name-error" data-admin>
                    <p class="fd-field-error" id="team-name-error" hidden><svg class="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert"></use></svg><span>Enter a team name.</span></p>
                  </div>
                </div>
              </div>

              <div class="fd-form-row" data-layout="stack">
                <div class="fd-form-row-text"><label class="fd-form-row-label" for="team-slug">Team slug</label><span class="fd-form-row-desc">A vanity name for your team URLs. Leave it blank to use the team ID.</span></div>
                <div class="fd-form-row-control">
                  <div class="fd-field">
                    <input class="fd-input" id="team-slug" name="slug" value="quarry-labs" placeholder="e.g. quarry-labs" autocomplete="off" spellcheck="false" aria-describedby="team-slug-hint team-slug-error" data-admin>
                    <p class="fd-field-hint" id="team-slug-hint" data-mono>ember.dev/app/t/<span data-bind="slug-preview">quarry-labs</span>/usage</p>
                    <p class="fd-field-error" id="team-slug-error" hidden><svg class="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert"></use></svg><span>Use 3 to 32 lowercase letters, numbers or dashes.</span></p>
                  </div>
                </div>
              </div>

              <div class="fd-form-row" data-layout="stack">
                <div class="fd-form-row-text"><span class="fd-form-row-label" id="team-region-label">Default region</span><span class="fd-form-row-desc">Where new crawls and scrapes run unless a request names one.</span></div>
                <div class="fd-form-row-control">
                  <div class="fd-segmented" role="radiogroup" aria-labelledby="team-region-label" id="team-region">
                    <label class="fd-segmented-item"><input type="radio" name="region" value="us-east" data-admin><span>US East</span></label>
                    <label class="fd-segmented-item"><input type="radio" name="region" value="eu-west" checked data-admin><span>EU West</span></label>
                    <label class="fd-segmented-item"><input type="radio" name="region" value="ap-south" data-admin><span>Asia Pacific</span></label>
                  </div>
                </div>
              </div>

              <div class="fd-form-row" data-layout="stack">
                <div class="fd-form-row-text"><label class="fd-form-row-label" for="invite-email">Invite team members</label><span class="fd-form-row-desc">Add people to Quarry Labs. Invites expire after 7 days.</span></div>
                <div class="fd-form-row-control">
                  <div class="fd-field">
                    <div class="fd-input-pair">
                      <input class="fd-input" type="email" id="invite-email" placeholder="Enter email address" autocomplete="off" aria-describedby="invite-hint" data-admin>
                      <label class="fd-select"><span class="fd-sr-only">Role</span>
                        <select id="invite-role" data-admin><option>Member</option><option>Admin</option><option>Billing</option></select>
                      </label>
                      <button type="button" class="fd-btn" id="invite-send" disabled><svg class="fd-icon" data-icon="mail" aria-hidden="true"><use href="#i-mail"></use></svg><span>Send invite</span></button>
                    </div>
                    <p class="fd-field-hint" id="invite-hint">Invited members get an email with instructions to join your team.</p>
                  </div>
                </div>
              </div>

              <div class="fd-form-row" data-layout="stack">
                <div class="fd-form-row-text">
                  <span class="fd-form-row-label" id="members-label">Team members <span class="fd-badge" data-bind="member-badge">4</span></span>
                  <span class="fd-form-row-desc">Admins manage billing, keys and members. Members can use the API and playground.</span>
                </div>
                <div class="fd-form-row-control">
                  <div id="members-wrap" data-fd-loading="true">
                    <div class="fd-skeleton-list" data-rows="6"></div>
                    <ul class="fd-list" data-card aria-labelledby="members-label" id="members-list">
                      <li class="fd-list-row" data-member="maya@quarry.dev">
                        <span class="fd-list-lead" data-shape="round" data-tone="accent">MR</span>
                        <div class="fd-list-body"><span class="fd-list-title">Maya Reyes <span class="fd-badge" data-variant="outline">You</span></span><span class="fd-list-desc">maya@quarry.dev</span></div>
                        <span class="fd-list-meta"><span class="fd-badge">Owner</span></span>
                        <span class="fd-list-trail"></span>
                      </li>
                      <li class="fd-list-row" data-member="tomasz@quarry.dev">
                        <span class="fd-list-lead" data-shape="round" data-tone="info">TN</span>
                        <div class="fd-list-body"><span class="fd-list-title">Tomasz Nowak</span><span class="fd-list-desc">tomasz@quarry.dev</span></div>
                        <span class="fd-list-meta"><label class="fd-select" data-size="sm"><span class="fd-sr-only">Role for Tomasz Nowak</span><select data-role data-admin><option>Admin</option><option>Member</option><option>Billing</option></select></label></span>
                        <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Actions for Tomasz Nowak" data-fd-menu="menu-member" data-placement="bottom-end"><svg class="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis"></use></svg></button></span>
                      </li>
                      <li class="fd-list-row" data-member="amara@quarry.dev">
                        <span class="fd-list-lead" data-shape="round" data-tone="success">AO</span>
                        <div class="fd-list-body"><span class="fd-list-title">Amara Okafor</span><span class="fd-list-desc">amara@quarry.dev</span></div>
                        <span class="fd-list-meta"><label class="fd-select" data-size="sm"><span class="fd-sr-only">Role for Amara Okafor</span><select data-role data-admin><option>Admin</option><option selected>Member</option><option>Billing</option></select></label></span>
                        <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Actions for Amara Okafor" data-fd-menu="menu-member" data-placement="bottom-end"><svg class="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis"></use></svg></button></span>
                      </li>
                      <li class="fd-list-row" data-member="lukas@quarry.dev">
                        <span class="fd-list-lead" data-shape="round" data-tone="violet">LS</span>
                        <div class="fd-list-body"><span class="fd-list-title">Lukas Schmidt</span><span class="fd-list-desc">lukas@quarry.dev</span></div>
                        <span class="fd-list-meta"><label class="fd-select" data-size="sm"><span class="fd-sr-only">Role for Lukas Schmidt</span><select data-role data-admin><option>Admin</option><option>Member</option><option selected>Billing</option></select></label></span>
                        <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Actions for Lukas Schmidt" data-fd-menu="menu-member" data-placement="bottom-end"><svg class="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis"></use></svg></button></span>
                      </li>
                      <li class="fd-list-row" data-invite="jun@northwind.dev" data-role-name="Member">
                        <span class="fd-list-lead" data-shape="round" data-tone="warning"><svg class="fd-icon" data-icon="mail" aria-hidden="true"><use href="#i-mail"></use></svg></span>
                        <div class="fd-list-body"><span class="fd-list-title">jun@northwind.dev</span><span class="fd-list-desc">Invited Nov 11 · Member</span></div>
                        <span class="fd-list-meta"><span class="fd-badge" data-tone="warning">Invite sent</span></span>
                        <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-resend>Resend</button><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Actions for jun@northwind.dev" data-fd-menu="menu-invite" data-placement="bottom-end"><svg class="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis"></use></svg></button></span>
                      </li>
                      <li class="fd-list-row" data-invite="priya@brightline.io" data-role-name="Admin">
                        <span class="fd-list-lead" data-shape="round" data-tone="warning"><svg class="fd-icon" data-icon="mail" aria-hidden="true"><use href="#i-mail"></use></svg></span>
                        <div class="fd-list-body"><span class="fd-list-title">priya@brightline.io</span><span class="fd-list-desc">Invited Nov 13 · Admin</span></div>
                        <span class="fd-list-meta"><span class="fd-badge" data-tone="warning">Invite sent</span></span>
                        <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-resend>Resend</button><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Actions for priya@brightline.io" data-fd-menu="menu-invite" data-placement="bottom-end"><svg class="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis"></use></svg></button></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <hr class="fd-divider">

              <div class="fd-setting" data-size="sm">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Pending invites</h3><p class="fd-setting-desc" data-bind="pending-desc">2 people have been invited and have not joined yet. Invites expire after 7 days.</p></div>
                <div class="fd-setting-control">
                  <button class="fd-btn" type="button" data-size="sm" id="resend-all">Resend all</button>
                  <button class="fd-btn" type="button" data-variant="danger-soft" data-size="sm" id="revoke-all">Revoke all</button>
                </div>
              </div>

              <div class="fd-setting" data-size="sm">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Leave team</h3><p class="fd-setting-desc">Leave Quarry Labs and lose access to its keys, runs and monitors.</p></div>
                <div class="fd-setting-control">
                  <div class="fd-reason">
                    <button class="fd-btn" type="button" data-variant="ghost" id="leave-team" aria-disabled="true" aria-describedby="leave-reason" @click="onLeave"><svg class="fd-icon" data-icon="log-out" aria-hidden="true"><use href="#i-log-out"></use></svg><span>Leave team</span></button>
                    <p class="fd-reason-text" id="leave-reason"><svg class="fd-icon" data-icon="lock" aria-hidden="true"><use href="#i-lock"></use></svg><span><span class="fd-reason-why">You are the only owner.</span> <span class="fd-reason-who">Make another member an owner first.</span></span></p>
                  </div>
                </div>
              </div>
            </div>

            <div class="fd-form-actions" data-variant="sticky" hidden>
              <span class="fd-form-actions-text">You have unsaved changes</span>
              <button type="reset" class="fd-btn" data-variant="ghost">Discard</button>
              <button type="submit" class="fd-btn" data-variant="primary" id="team-save-all">Save changes</button>
            </div>
          </form>

          <!-- ===================================================== Features: a list of switches, grouped rows in one table -->
          <section class="fd-stack" data-gap="4" id="panel-features" data-panel="features" aria-labelledby="h-features" :hidden="tab !== 'features'">
            <header class="fd-stack" data-gap="1">
              <h2 class="fd-h2" id="h-features" tabindex="-1">Features</h2>
              <p class="fd-muted">What every key on Quarry Labs can use. A switch applies at once.</p>
              <p class="fd-row fd-small fd-muted" data-gap="1-5"><svg class="fd-icon" data-size="14" data-icon="users" aria-hidden="true"><use href="#i-users"></use></svg><span>Owners and admins turn features on and off.</span></p>
              <p class="fd-row fd-small fd-muted" data-gap="1-5" data-member-only hidden><svg class="fd-icon" data-size="14" data-icon="lock" aria-hidden="true"><use href="#i-lock"></use></svg><span>You are a member, so the switches are read-only. Ask Maya Reyes or Tomasz Nowak.</span></p>
            </header>

            <div class="fd-toolbar" aria-label="Find a feature">
              <div class="fd-search fd-toolbar-search" data-variant="soft">
                <svg class="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search"></use></svg>
                <input class="fd-search-input" id="feature-search" type="search" placeholder="Screenshots" aria-label="Search features" autocomplete="off" @input="onFeatureSearch">
                <button type="button" class="fd-search-clear" aria-label="Clear search"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
              </div>
              <div class="fd-toolbar-end"><span class="fd-small fd-muted" id="feature-count" aria-live="polite">6 of 10 on</span></div>
            </div>

            <div class="fd-table-wrap" id="features-wrap">
              <div class="fd-table-scroll">
                <table class="fd-table" id="features-table" data-collapsible data-stack aria-label="Features by area" @change="onFeature">
                  <thead>
                    <tr><th>Feature</th><th data-col="sm" data-stack="hide">Status</th><th data-col="fit">On</th></tr>
                  </thead>
                  <tbody class="fd-table-group">
                    <tr class="fd-table-group-head"><th scope="rowgroup" colspan="3"><span class="fd-table-group-title">Crawling</span><span class="fd-table-group-count" data-auto>4</span></th></tr>
                    <tr data-feature="JavaScript rendering">
                      <td data-stack-title><div class="fd-table-two"><span class="fd-table-title">JavaScript rendering</span><span class="fd-table-sub">Render pages in a browser before extracting. 1 extra credit a page.</span></div></td>
                      <td data-stack="hide"><span class="fd-status" data-tone="success">On</span></td>
                      <td><label class="fd-switch"><input type="checkbox" role="switch" checked aria-label="JavaScript rendering" data-admin><span class="fd-switch-track"></span></label></td>
                    </tr>
                    <tr data-feature="Stealth proxies">
                      <td data-stack-title><div class="fd-table-two"><span class="fd-table-title">Stealth proxies</span><span class="fd-table-sub">Retry blocked pages through residential proxies.</span></div></td>
                      <td data-stack="hide"><span class="fd-status" data-tone="success">On</span></td>
                      <td><label class="fd-switch"><input type="checkbox" role="switch" checked aria-label="Stealth proxies" data-admin><span class="fd-switch-track"></span></label></td>
                    </tr>
                    <tr data-feature="Follow subdomains">
                      <td data-stack-title><div class="fd-table-two"><span class="fd-table-title">Follow subdomains</span><span class="fd-table-sub">Crawls may leave the start host for its subdomains.</span></div></td>
                      <td data-stack="hide"><span class="fd-status" data-tone="neutral">Off</span></td>
                      <td><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Follow subdomains" data-admin><span class="fd-switch-track"></span></label></td>
                    </tr>
                    <tr data-feature="Full-page screenshots">
                      <td data-stack-title><div class="fd-table-two"><span class="fd-table-title">Full-page screenshots</span><span class="fd-table-sub">Add a screenshot to every scrape result.</span></div></td>
                      <td data-stack="hide"><span class="fd-status" data-tone="neutral">Off</span></td>
                      <td><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Full-page screenshots" data-admin><span class="fd-switch-track"></span></label></td>
                    </tr>
                  </tbody>
                  <tbody class="fd-table-group">
                    <tr class="fd-table-group-head"><th scope="rowgroup" colspan="3"><span class="fd-table-group-title">Agents</span><span class="fd-table-group-count" data-auto>3</span></th></tr>
                    <tr data-feature="Agent endpoint">
                      <td data-stack-title><div class="fd-table-two"><span class="fd-table-title">Agent endpoint</span><span class="fd-table-sub">Let keys call <span class="fd-mono">/agent</span> for research that takes many steps.</span></div></td>
                      <td data-stack="hide"><span class="fd-status" data-tone="success">On</span></td>
                      <td><label class="fd-switch"><input type="checkbox" role="switch" checked aria-label="Agent endpoint" data-admin><span class="fd-switch-track"></span></label></td>
                    </tr>
                    <tr data-feature="Browser actions">
                      <td data-stack-title><div class="fd-table-two"><span class="fd-table-title">Browser actions</span><span class="fd-table-sub">Agents can click, type and scroll with <span class="fd-mono">/interact</span>.</span></div></td>
                      <td data-stack="hide"><span class="fd-status" data-tone="success">On</span></td>
                      <td><label class="fd-switch"><input type="checkbox" role="switch" checked aria-label="Browser actions" data-admin><span class="fd-switch-track"></span></label></td>
                    </tr>
                    <tr data-feature="Ask before large runs">
                      <td data-stack-title><div class="fd-table-two"><span class="fd-table-title">Ask before large runs</span><span class="fd-table-sub">An agent pauses and asks before a run passes 200 credits.</span></div></td>
                      <td data-stack="hide"><span class="fd-status" data-tone="success">On</span></td>
                      <td><label class="fd-switch"><input type="checkbox" role="switch" checked aria-label="Ask before large runs" data-admin><span class="fd-switch-track"></span></label></td>
                    </tr>
                  </tbody>
                  <tbody class="fd-table-group">
                    <tr class="fd-table-group-head"><th scope="rowgroup" colspan="3"><span class="fd-table-group-title">Monitors</span><span class="fd-table-group-count" data-auto>1</span></th></tr>
                    <tr data-feature="Change history">
                      <td data-stack-title><div class="fd-table-two"><span class="fd-table-title">Change history</span><span class="fd-table-sub">Keep a diff of every change a monitor finds, for 90 days.</span></div></td>
                      <td data-stack="hide"><span class="fd-status" data-tone="success">On</span></td>
                      <td><label class="fd-switch"><input type="checkbox" role="switch" checked aria-label="Change history" data-admin><span class="fd-switch-track"></span></label></td>
                    </tr>
                  </tbody>
                  <tbody class="fd-table-group">
                    <tr class="fd-table-group-head"><th scope="rowgroup" colspan="3"><span class="fd-table-group-title">Preview</span><span class="fd-table-group-count" data-auto>2</span></th></tr>
                    <tr data-feature="Deep research">
                      <td data-stack-title><div class="fd-table-two"><span class="fd-table-title">Deep research <span class="fd-badge" data-tone="violet">Preview</span></span><span class="fd-table-sub">Agents read up to 200 pages for one answer. May change.</span></div></td>
                      <td data-stack="hide"><span class="fd-status" data-tone="neutral">Off</span></td>
                      <td><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Deep research" data-admin><span class="fd-switch-track"></span></label></td>
                    </tr>
                    <tr data-feature="Schema extraction" data-locked>
                      <td data-stack-title><div class="fd-stack" data-gap="1-5"><div class="fd-table-two"><span class="fd-table-title">Schema extraction</span><span class="fd-table-sub">Extract to a JSON schema you define, checked on every page.</span></div>
                        <p class="fd-reason-text" id="reason-schema"><svg class="fd-icon" data-icon="lock" aria-hidden="true"><use href="#i-lock"></use></svg><span><span class="fd-reason-why">On the Standard plan.</span> <span class="fd-reason-who">Billing admins can upgrade.</span></span></p></div></td>
                      <td data-stack="hide"><span class="fd-badge" data-variant="outline">Standard</span></td>
                      <td><label class="fd-switch"><input type="checkbox" role="switch" disabled aria-label="Schema extraction" aria-describedby="reason-schema"><span class="fd-switch-track"></span></label></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="fd-empty" data-size="sm" id="features-none" hidden>
              <span class="fd-empty-icon"><svg class="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search"></use></svg></span>
              <h3 class="fd-empty-title">No feature matches</h3>
              <p class="fd-empty-text">Try another word, like “proxies” or “agent”.</p>
              <div class="fd-empty-actions"><button class="fd-btn" type="button" id="features-clear" @click="onFeaturesClear"><span>Clear search</span></button></div>
            </div>
          </section>

          <!-- ===================================================== Billing -->
          <section class="fd-stack" data-gap="4" id="panel-billing" data-panel="billing" aria-labelledby="h-billing" :hidden="tab !== 'billing'">
            <header class="fd-stack" data-gap="1">
              <h2 class="fd-h2" id="h-billing" tabindex="-1">Billing</h2>
              <p class="fd-muted">Your plan, credits and payment method for Quarry Labs.</p>
            </header>

            <div id="billing-summary" data-fd-loading="true">
              <div class="fd-skeleton-stat" data-count="4"></div>
              <div class="fd-stats">
                <div class="fd-stat-tile">
                  <span class="fd-stat-label">Plan</span>
                  <span class="fd-stat">Hobby</span>
                  <span class="fd-stat-sub">$19 per month</span>
                </div>
                <div class="fd-stat-tile">
                  <span class="fd-stat-label">Renews</span>
                  <span class="fd-stat">Dec 4</span>
                  <span class="fd-stat-sub">in 20 days</span>
                </div>
                <div class="fd-stat-tile">
                  <span class="fd-stat-label">Credits remaining</span>
                  <span class="fd-stat">1,520</span>
                  <div class="fd-meter" data-size="sm" data-value="1520" data-max="3000" aria-label="Credits remaining this cycle"><div class="fd-meter-track"><div class="fd-meter-fill"></div></div></div>
                  <span class="fd-stat-sub">of 3,000 · resets Nov 23</span>
                </div>
                <div class="fd-stat-tile">
                  <span class="fd-stat-label">Payment method</span>
                  <span class="fd-stat">Visa</span>
                  <span class="fd-stat-sub"><span class="fd-mono">•••• 4242</span> · exp 08/28</span>
                  <a class="fd-stat-action" href="#update-card" data-update-card>Update card</a>
                </div>
              </div>
            </div>

            <div class="fd-tabs" role="tablist" aria-label="Billing" data-size="sm">
              <button class="fd-tab" role="tab" id="bt-tab-plan" aria-selected="true" aria-controls="bt-plan" data-value="plan">Plan</button>
              <button class="fd-tab" role="tab" id="bt-tab-coupons" aria-selected="false" aria-controls="bt-coupons" data-value="coupons">Coupons</button>
              <button class="fd-tab" role="tab" id="bt-tab-invoices" aria-selected="false" aria-controls="bt-invoices" data-value="invoices">Invoices <span class="fd-tab-count">5</span></button>
              <button class="fd-tab" role="tab" id="bt-tab-referrals" aria-selected="false" aria-controls="bt-referrals" data-value="referrals">Referrals</button>
            </div>

            <!-- Plan -->
            <div class="fd-tab-panel" role="tabpanel" id="bt-plan" aria-labelledby="bt-tab-plan">
              <div class="fd-setting">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Current plan</h3><p class="fd-setting-desc">Manage your subscription and payment method.</p></div>
                <div class="fd-plan" data-variant="row">
                  <div class="fd-plan-info"><span class="fd-plan-name">Hobby</span><span class="fd-badge" data-variant="mono">$19/month</span><span class="fd-plan-allowance">3,000 credits/mo</span></div>
                  <div class="fd-plan-actions">
                    <button class="fd-btn" type="button" data-variant="primary" data-upgrade>Upgrade</button>
                    <button class="fd-btn" type="button" data-variant="outline" data-icon-only aria-label="Plan actions" data-fd-menu="menu-plan" data-placement="bottom-end"><svg class="fd-icon" data-icon="ellipsis-vertical" aria-hidden="true"><use href="#i-ellipsis-vertical"></use></svg></button>
                  </div>
                </div>
              </div>

              <div class="fd-setting" data-align="start">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Smart upgrade</h3><p class="fd-setting-desc">When your credits run out mid-cycle, Ember moves you to Standard so jobs keep running, and bills only the prorated difference. Downgrade at any time and the extra credits stay until they reset.</p></div>
                <div class="fd-setting-control"><label class="fd-switch"><input type="checkbox" role="switch" data-saved-toast="Smart upgrade" aria-label="Smart upgrade"><span class="fd-switch-track"></span></label></div>
              </div>

              <div class="fd-setting" data-align="start">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Auto-recharge</h3><p class="fd-setting-desc">Buy a credit pack automatically when your balance drops below a threshold. Charged to Visa <span class="fd-mono">•••• 4242</span>, at most once a day.</p></div>
                <div class="fd-setting-control"><label class="fd-switch"><input type="checkbox" role="switch" id="recharge-switch" checked aria-label="Auto-recharge"><span class="fd-switch-track"></span></label></div>
                <div class="fd-form-cols" id="recharge-fields">
                  <div class="fd-field">
                    <label class="fd-field-label" for="recharge-threshold">When credits fall below</label>
                    <div class="fd-number">
                      <button type="button" class="fd-number-step" data-fd-step="-1" aria-label="Decrease threshold"><svg class="fd-icon" data-icon="minus" aria-hidden="true"><use href="#i-minus"></use></svg></button>
                      <input class="fd-number-input" type="number" id="recharge-threshold" value="500" min="100" max="5000" step="100">
                      <button type="button" class="fd-number-step" data-fd-step="1" aria-label="Increase threshold"><svg class="fd-icon" data-icon="plus" aria-hidden="true"><use href="#i-plus"></use></svg></button>
                    </div>
                  </div>
                  <div class="fd-field">
                    <label class="fd-field-label" for="recharge-pack">Add this pack</label>
                    <div class="fd-select" data-variant="outline">
                      <select id="recharge-pack"><option>5,000 credits · $25</option><option>20,000 credits · $100</option><option>50,000 credits · $225</option></select>
                    </div>
                  </div>
                </div>
              </div>

              <div class="fd-setting" data-align="start">
                <div class="fd-setting-text">
                  <details class="fd-disclosure" id="compare-plans">
                    <summary class="fd-disclosure-trigger"><span>Compare plans</span><svg class="fd-icon" data-icon="chevron-down" aria-hidden="true"><use href="#i-chevron-down"></use></svg></summary>
                    <div class="fd-disclosure-panel"><div class="fd-disclosure-inner fd-stack" data-gap="5">
                      <div class="fd-row">
                        <div class="fd-segmented" role="radiogroup" aria-label="Billing period" id="seg-period">
                          <button class="fd-segmented-item" type="button" role="radio" aria-checked="true" data-value="monthly">Monthly</button>
                          <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="yearly">Yearly · save 20%</button>
                        </div>
                      </div>
                      <div class="fd-plan-grid fd-column" data-size="lg">
                        <div class="fd-plan">
                          <div class="fd-plan-head"><h3 class="fd-plan-name">Free</h3></div>
                          <div class="fd-plan-price"><span class="fd-plan-amount" data-monthly="$0" data-yearly="$0">$0</span><span class="fd-plan-per" data-per>/month</span></div>
                          <p class="fd-plan-pitch">Try Ember on side projects.</p>
                          <ul class="fd-feature-list" data-size="sm">
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>1,000 credits per month</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>2 concurrent requests</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Community support</span></li>
                            <li data-excluded><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg><span>Webhooks</span></li>
                            <li data-excluded><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg><span>Team seats</span></li>
                          </ul>
                          <div class="fd-plan-cta"><button class="fd-btn" type="button" data-block data-downgrade>Downgrade to Free</button></div>
                        </div>
                        <div class="fd-plan" data-current>
                          <div class="fd-plan-head"><h3 class="fd-plan-name">Hobby</h3><span class="fd-status" data-size="sm" data-tone="success">Current</span></div>
                          <div class="fd-plan-price"><span class="fd-plan-amount" data-monthly="$19" data-yearly="$15">$19</span><span class="fd-plan-per" data-per>/month</span></div>
                          <p class="fd-plan-pitch">For apps that scrape on a schedule.</p>
                          <ul class="fd-feature-list" data-size="sm">
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>3,000 credits per month</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>5 concurrent requests</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Email support</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Webhooks</span></li>
                            <li data-excluded><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg><span>Team seats</span></li>
                          </ul>
                          <div class="fd-plan-cta"><button class="fd-btn" type="button" data-block disabled>Current plan</button></div>
                        </div>
                        <div class="fd-plan" data-recommended>
                          <div class="fd-plan-head"><h3 class="fd-plan-name">Standard</h3><span class="fd-badge" data-variant="solid">Recommended</span></div>
                          <div class="fd-plan-price"><span class="fd-plan-amount" data-monthly="$99" data-yearly="$79">$99</span><span class="fd-plan-per" data-per>/month</span></div>
                          <p class="fd-plan-pitch">For products with real traffic.</p>
                          <ul class="fd-feature-list" data-size="sm" data-tone="accent">
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>100,000 credits per month</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>50 concurrent requests</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Priority queue</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Webhooks and audit log</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>5 team seats</span></li>
                          </ul>
                          <div class="fd-plan-cta"><button class="fd-btn" type="button" data-variant="accent-soft" data-block data-plan="Standard">Upgrade to Standard</button></div>
                        </div>
                        <div class="fd-plan">
                          <div class="fd-plan-head"><h3 class="fd-plan-name">Scale</h3></div>
                          <div class="fd-plan-price"><span class="fd-plan-amount" data-monthly="$399" data-yearly="$319">$399</span><span class="fd-plan-per" data-per>/month</span></div>
                          <p class="fd-plan-pitch">For data teams running large crawls.</p>
                          <ul class="fd-feature-list" data-size="sm">
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>500,000 credits per month</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>150 concurrent requests</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Dedicated support channel</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>SSO and custom retention</span></li>
                            <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Unlimited team seats</span></li>
                          </ul>
                          <div class="fd-plan-cta"><button class="fd-btn" type="button" data-variant="outline" data-block data-sales>Talk to sales</button></div>
                        </div>
                      </div>
                    </div></div>
                  </details>
                </div>
              </div>
            </div>

            <!-- Coupons -->
            <div class="fd-tab-panel" role="tabpanel" id="bt-coupons" aria-labelledby="bt-tab-coupons" hidden>
              <div class="fd-setting" data-align="start" data-control="wide">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Redeem a coupon</h3><p class="fd-setting-desc">Coupons apply to your next invoice. One coupon can be active at a time.</p></div>
                <div class="fd-setting-control">
                  <div class="fd-field">
                    <label class="fd-field-label fd-sr-only" for="coupon-code">Coupon code</label>
                    <div class="fd-input-pair" data-joined>
                      <input class="fd-input" id="coupon-code" data-mono placeholder="Enter coupon code" autocomplete="off" spellcheck="false" aria-describedby="coupon-hint coupon-error">
                      <button type="button" class="fd-btn" data-variant="outline" id="coupon-apply" disabled>Apply</button>
                    </div>
                    <p class="fd-field-hint" id="coupon-hint">For this demo, <span class="fd-mono">QUARRY20</span> is a valid code.</p>
                    <p class="fd-field-error" id="coupon-error" hidden><svg class="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert"></use></svg><span>That code is not valid or has expired. Check the spelling and try again.</span></p>
                  </div>
                </div>
                <div class="fd-callout" data-tone="success" role="status" id="coupon-success" hidden>
                  <svg class="fd-icon fd-callout-icon" data-icon="circle-check" aria-hidden="true"><use href="#i-circle-check"></use></svg>
                  <div class="fd-callout-content"><p class="fd-callout-title">Coupon applied</p><p class="fd-callout-body">20% off your next 3 invoices. Your Dec 4 invoice will be $15.20.</p></div>
                </div>
              </div>
              <div class="fd-setting" data-align="start">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Applied coupons</h3><p class="fd-setting-desc" id="coupon-empty">No coupons applied yet. Codes you redeem show up here.</p></div>
                <ul class="fd-list" data-card id="coupon-list" aria-label="Applied coupons" hidden>
                  <li class="fd-list-row">
                    <span class="fd-list-lead" data-tone="accent"><svg class="fd-icon" data-icon="tag" aria-hidden="true"><use href="#i-tag"></use></svg></span>
                    <div class="fd-list-body"><span class="fd-list-title fd-mono">QUARRY20</span><span class="fd-list-desc">20% off for 3 months · applied Nov 14</span></div>
                    <span class="fd-list-meta"><span class="fd-badge" data-tone="success" data-dot>Active</span></span>
                    <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" id="coupon-remove">Remove</button></span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Invoices -->
            <div class="fd-tab-panel" role="tabpanel" id="bt-invoices" aria-labelledby="bt-tab-invoices" hidden>
              <div class="fd-setting" data-align="start">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Invoices</h3><p class="fd-setting-desc">Receipts for your Hobby subscription and credit packs. Invoices are sent to <span class="fd-mono">maya@quarry.dev</span>.</p></div>
                <div class="fd-table-wrap">
                  <div class="fd-table-scroll">
                    <table class="fd-table" data-stack aria-label="Invoices">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Invoice</th>
                          <th data-num>Amount</th>
                          <th>Status</th>
                          <th data-actions><span class="fd-sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td data-stack-title>Nov 14, 2026</td>
                          <td data-mono>INV-2026-0121</td>
                          <td data-num>$25.00</td>
                          <td><span class="fd-status" data-tone="warning">Open</span></td>
                          <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-download="INV-2026-0121" aria-label="Download INV-2026-0121"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg></button></td>
                        </tr>
                        <tr>
                          <td data-stack-title>Nov 4, 2026</td>
                          <td data-mono>INV-2026-0118</td>
                          <td data-num>$19.00</td>
                          <td><span class="fd-status" data-tone="success">Paid</span></td>
                          <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-download="INV-2026-0118" aria-label="Download INV-2026-0118"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg></button></td>
                        </tr>
                        <tr>
                          <td data-stack-title>Oct 21, 2026</td>
                          <td data-mono>INV-2026-0107</td>
                          <td data-num>$25.00</td>
                          <td><span class="fd-status" data-tone="success">Paid</span></td>
                          <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-download="INV-2026-0107" aria-label="Download INV-2026-0107"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg></button></td>
                        </tr>
                        <tr>
                          <td data-stack-title>Oct 4, 2026</td>
                          <td data-mono>INV-2026-0096</td>
                          <td data-num>$19.00</td>
                          <td><span class="fd-status" data-tone="success">Paid</span></td>
                          <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-download="INV-2026-0096" aria-label="Download INV-2026-0096"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg></button></td>
                        </tr>
                        <tr>
                          <td data-stack-title>Sep 4, 2026</td>
                          <td data-mono>INV-2026-0081</td>
                          <td data-num>$19.00</td>
                          <td><span class="fd-status" data-tone="neutral">Refunded</span></td>
                          <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-download="INV-2026-0081" aria-label="Download INV-2026-0081"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg></button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="fd-table-foot">
                    <span class="fd-table-foot-info">5 of 5 invoices · last 90 days</span>
                    <div class="fd-table-foot-actions">
                      <button class="fd-btn" type="button" data-size="sm" data-download="all invoices"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg><span>Download all</span></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Referrals -->
            <div class="fd-tab-panel" role="tabpanel" id="bt-referrals" aria-labelledby="bt-tab-referrals" hidden>
              <div class="fd-setting" data-align="start">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Your referral link</h3><p class="fd-setting-desc">Share it with a friend. When they run their first request, you both get 500 credits.</p></div>
                <div class="fd-copy-field" data-value="https://ember.dev/r/quarry-labs-7k2q" data-noun="referral link">
                  <span class="fd-copy-field-label">Referral link</span>
                  <div class="fd-copy-field-actions"><button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-icon-only data-fd-field-action="copy" aria-label="Copy referral link" data-fd-toast='{"title":"Referral link copied","tone":"success"}'><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg></button></div>
                  <code class="fd-copy-field-value"></code>
                </div>
                <div class="fd-stats fd-column" data-size="sm">
                  <div class="fd-stat-tile"><span class="fd-stat-label">Friends joined</span><span class="fd-stat">3</span><span class="fd-stat-sub">1 invite pending</span></div>
                  <div class="fd-stat-tile"><span class="fd-stat-label">Credits earned</span><span class="fd-stat">1,500</span><span class="fd-stat-sub">500 per friend</span></div>
                </div>
              </div>
              <div class="fd-setting" data-align="start">
                <div class="fd-setting-text">
                  <h3 class="fd-setting-title">How it works</h3>
                  <div class="fd-stack" data-gap="3">
                    <p class="fd-setting-desc">Three steps, and nobody has to copy a code.</p>
                    <ul class="fd-feature-list">
                      <li><svg class="fd-icon" data-icon="share-2" aria-hidden="true"><use href="#i-share-2"></use></svg><span>Send your link to a developer who needs web data.</span></li>
                      <li><svg class="fd-icon" data-icon="user-plus" aria-hidden="true"><use href="#i-user-plus"></use></svg><span>They create an Ember account and make their first request.</span></li>
                      <li><svg class="fd-icon" data-icon="gift" aria-hidden="true"><use href="#i-gift"></use></svg><span>You each get 500 credits, added within a minute and valid for 90 days.</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ===================================================== Data sources -->
          <section class="fd-stack" data-gap="5" id="panel-data-sources" data-panel="data-sources" aria-labelledby="h-data-sources" :hidden="tab !== 'data-sources'">
            <header class="fd-stack" data-gap="1">
              <h2 class="fd-h2" id="h-data-sources" tabindex="-1">Data sources</h2>
              <p class="fd-muted">Choose which catalog providers your agents can call and cap what each one can spend every month.</p>
            </header>
            <div class="fd-stack" data-gap="5">
              <div class="fd-callout" data-tone="info" role="note">
                <svg class="fd-icon fd-callout-icon" data-icon="info" aria-hidden="true"><use href="#i-info"></use></svg>
                <div class="fd-callout-content"><p class="fd-callout-title">Providers set their own terms</p><p class="fd-callout-body">Each provider is a separate data licensor. Accepting its terms lets everyone on Quarry Labs call it, and Ember bills credits at the provider’s rate. When a provider updates its terms you will be asked to review them again.</p></div>
              </div>
              <div class="fd-grid" data-min="lg" data-gap="4" id="provider-grid">
                <article class="fd-card" data-provider="Northwind People" data-terms="Oct 3">
                  <header class="fd-card-head">
                    <span class="fd-tile" data-size="36" data-tone="info">NP</span>
                    <div class="fd-card-heading"><h3 class="fd-title">Northwind People <span class="fd-verified" role="img" aria-label="Verified"></span></h3><p class="fd-card-desc">People and company enrichment</p></div>
                    <div class="fd-card-action"><label class="fd-switch"><input type="checkbox" role="switch" checked aria-label="Enable Northwind People"><span class="fd-switch-track"></span></label></div>
                  </header>
                  <div class="fd-card-body fd-row" data-wrap data-justify="between" data-gap="2">
                    <span class="fd-status" data-size="sm" data-tone="success" data-bind="terms-status">Terms accepted Oct 3</span>
                    <button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-terms-open>View terms</button>
                  </div>
                  <footer class="fd-card-foot">
                    <label class="fd-field-label" for="cap-northwind">Monthly spend cap</label>
                    <div class="fd-input-group" data-fit><input class="fd-input" type="number" size="6" id="cap-northwind" value="1000" min="0" step="50"><span class="fd-input-affix" data-kind="unit">credits</span></div>
                  </footer>
                </article>
                <article class="fd-card" data-provider="Tessera Finance" data-terms="Oct 3">
                  <header class="fd-card-head">
                    <span class="fd-tile" data-size="36" data-tone="violet">TF</span>
                    <div class="fd-card-heading"><h3 class="fd-title">Tessera Finance <span class="fd-verified" role="img" aria-label="Verified"></span></h3><p class="fd-card-desc">Filings, ratios and segment revenue</p></div>
                    <div class="fd-card-action"><label class="fd-switch"><input type="checkbox" role="switch" checked aria-label="Enable Tessera Finance"><span class="fd-switch-track"></span></label></div>
                  </header>
                  <div class="fd-card-body fd-row" data-wrap data-justify="between" data-gap="2">
                    <span class="fd-status" data-size="sm" data-tone="success" data-bind="terms-status">Terms accepted Oct 3</span>
                    <button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-terms-open>View terms</button>
                  </div>
                  <footer class="fd-card-foot">
                    <label class="fd-field-label" for="cap-tessera">Monthly spend cap</label>
                    <div class="fd-input-group" data-fit><input class="fd-input" type="number" size="6" id="cap-tessera" value="500" min="0" step="50"><span class="fd-input-affix" data-kind="unit">credits</span></div>
                  </footer>
                </article>
                <article class="fd-card" data-provider="Halyard Funding" data-terms="Oct 3">
                  <header class="fd-card-head">
                    <span class="fd-tile" data-size="36" data-tone="accent">HF</span>
                    <div class="fd-card-heading"><h3 class="fd-title">Halyard Funding <span class="fd-verified" role="img" aria-label="Verified"></span></h3><p class="fd-card-desc">Startup funding rounds since 2026</p></div>
                    <div class="fd-card-action"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Enable Halyard Funding"><span class="fd-switch-track"></span></label></div>
                  </header>
                  <div class="fd-card-body fd-row" data-wrap data-justify="between" data-gap="2">
                    <span class="fd-status" data-size="sm" data-tone="success" data-bind="terms-status">Terms accepted Oct 3</span>
                    <button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-terms-open>View terms</button>
                  </div>
                  <footer class="fd-card-foot">
                    <label class="fd-field-label" for="cap-halyard">Monthly spend cap</label>
                    <div class="fd-input-group" data-fit><input class="fd-input" type="number" size="6" id="cap-halyard" value="200" min="0" step="50" disabled><span class="fd-input-affix" data-kind="unit">credits</span></div>
                  </footer>
                </article>
                <article class="fd-card" data-provider="Parcel Retail" data-terms="">
                  <header class="fd-card-head">
                    <span class="fd-tile" data-size="36" data-tone="success">PR</span>
                    <div class="fd-card-heading"><h3 class="fd-title">Parcel Retail <span class="fd-verified" role="img" aria-label="Verified"></span></h3><p class="fd-card-desc">Prices, stock and variants</p></div>
                    <div class="fd-card-action"><label class="fd-switch"><input type="checkbox" role="switch" disabled aria-label="Enable Parcel Retail"><span class="fd-switch-track"></span></label></div>
                  </header>
                  <div class="fd-card-body fd-row" data-wrap data-justify="between" data-gap="2">
                    <span class="fd-status" data-size="sm" data-tone="warning" data-bind="terms-status">Terms need review</span>
                    <button class="fd-btn" type="button" data-variant="outline" data-size="sm" data-terms-open>Review terms</button>
                  </div>
                  <footer class="fd-card-foot">
                    <label class="fd-field-label" for="cap-parcel">Monthly spend cap</label>
                    <div class="fd-input-group" data-fit><input class="fd-input" type="number" size="6" id="cap-parcel" value="300" min="0" step="50" disabled><span class="fd-input-affix" data-kind="unit">credits</span></div>
                  </footer>
                </article>
                <article class="fd-card" data-provider="Mapleton Places" data-terms="Nov 2">
                  <header class="fd-card-head">
                    <span class="fd-tile" data-size="36" data-tone="info">MP</span>
                    <div class="fd-card-heading"><h3 class="fd-title">Mapleton Places <span class="fd-verified" role="img" aria-label="Verified"></span></h3><p class="fd-card-desc">Listings, hours and reviews</p></div>
                    <div class="fd-card-action"><label class="fd-switch"><input type="checkbox" role="switch" checked aria-label="Enable Mapleton Places"><span class="fd-switch-track"></span></label></div>
                  </header>
                  <div class="fd-card-body fd-row" data-wrap data-justify="between" data-gap="2">
                    <span class="fd-status" data-size="sm" data-tone="success" data-bind="terms-status">Terms accepted Nov 2</span>
                    <button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-terms-open>View terms</button>
                  </div>
                  <footer class="fd-card-foot">
                    <label class="fd-field-label" for="cap-mapleton">Monthly spend cap</label>
                    <div class="fd-input-group" data-fit><input class="fd-input" type="number" size="6" id="cap-mapleton" value="250" min="0" step="50"><span class="fd-input-affix" data-kind="unit">credits</span></div>
                  </footer>
                </article>
                <article class="fd-card" data-provider="Docsmith" data-terms="Oct 3">
                  <header class="fd-card-head">
                    <span class="fd-tile" data-size="36" data-tone="neutral">DS</span>
                    <div class="fd-card-heading"><h3 class="fd-title">Docsmith <span class="fd-verified" role="img" aria-label="Verified"></span></h3><p class="fd-card-desc">Developer docs, repos and changelogs</p></div>
                    <div class="fd-card-action"><label class="fd-switch"><input type="checkbox" role="switch" checked aria-label="Enable Docsmith"><span class="fd-switch-track"></span></label></div>
                  </header>
                  <div class="fd-card-body fd-row" data-wrap data-justify="between" data-gap="2">
                    <span class="fd-status" data-size="sm" data-tone="success" data-bind="terms-status">Terms accepted Oct 3</span>
                    <button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-terms-open>View terms</button>
                  </div>
                  <footer class="fd-card-foot">
                    <label class="fd-field-label" for="cap-docsmith">Monthly spend cap</label>
                    <div class="fd-input-group" data-fit><input class="fd-input" type="number" size="6" id="cap-docsmith" value="100" min="0" step="50"><span class="fd-input-affix" data-kind="unit">credits</span></div>
                  </footer>
                </article>
              </div>
            </div>
          </section>

          <!-- ===================================================== Connected apps -->
          <section class="fd-stack" data-gap="4" id="panel-connected-apps" data-panel="connected-apps" aria-labelledby="h-connected-apps" :hidden="tab !== 'connected-apps'">
            <header class="fd-stack" data-gap="1">
              <h2 class="fd-h2" id="h-connected-apps" tabindex="-1">Connected apps</h2>
              <p class="fd-muted">MCP clients and OAuth apps that can use Ember on behalf of Quarry Labs.</p>
            </header>
            <div class="fd-stack" data-gap="4">
              <div class="fd-row" data-justify="between" data-wrap>
                <p class="fd-small fd-muted" data-bind="apps-count">4 apps connected</p>
                <a class="fd-btn" data-variant="outline" href="install.html"><svg class="fd-icon" data-icon="plus" aria-hidden="true"><use href="#i-plus"></use></svg><span>Connect an app</span></a>
              </div>
              <ul class="fd-list" data-card id="apps-list" aria-label="Connected apps">
                <li class="fd-list-row" data-app="Claude Code">
                  <span class="fd-list-lead"><svg class="fd-icon" data-icon="terminal" aria-hidden="true"><use href="#i-terminal"></use></svg></span>
                  <div class="fd-list-body">
                    <span class="fd-list-title">Claude Code</span>
                    <div class="fd-stack" data-gap="1-5"><span class="fd-list-desc">Connected Nov 2 by maya@quarry.dev</span><span class="fd-row" data-wrap data-gap="1"><span class="fd-badge" data-variant="mono">search</span><span class="fd-badge" data-variant="mono">scrape</span><span class="fd-badge" data-variant="mono">crawl</span><span class="fd-badge" data-variant="mono">agent</span></span></div>
                  </div>
                  <span class="fd-list-meta"></span>
                  <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="danger-soft" data-size="sm" data-disconnect>Disconnect</button></span>
                </li>
                <li class="fd-list-row" data-app="Cursor">
                  <span class="fd-list-lead"><svg class="fd-icon" data-icon="square-terminal" aria-hidden="true"><use href="#i-square-terminal"></use></svg></span>
                  <div class="fd-list-body">
                    <span class="fd-list-title">Cursor</span>
                    <div class="fd-stack" data-gap="1-5"><span class="fd-list-desc">Connected Oct 19 by tomasz@quarry.dev</span><span class="fd-row" data-wrap data-gap="1"><span class="fd-badge" data-variant="mono">search</span><span class="fd-badge" data-variant="mono">scrape</span></span></div>
                  </div>
                  <span class="fd-list-meta"></span>
                  <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="danger-soft" data-size="sm" data-disconnect>Disconnect</button></span>
                </li>
                <li class="fd-list-row" data-app="n8n">
                  <span class="fd-list-lead" data-tone="success"><svg class="fd-icon" data-icon="workflow" aria-hidden="true"><use href="#i-workflow"></use></svg></span>
                  <div class="fd-list-body">
                    <span class="fd-list-title">n8n</span>
                    <div class="fd-stack" data-gap="1-5"><span class="fd-list-desc">Connected Sep 27 by maya@quarry.dev</span><span class="fd-row" data-wrap data-gap="1"><span class="fd-badge" data-variant="mono">scrape</span><span class="fd-badge" data-variant="mono">extract</span><span class="fd-badge" data-variant="mono">webhooks:write</span></span></div>
                  </div>
                  <span class="fd-list-meta"></span>
                  <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="danger-soft" data-size="sm" data-disconnect>Disconnect</button></span>
                </li>
                <li class="fd-list-row" data-app="Slack">
                  <span class="fd-list-lead" data-tone="violet"><svg class="fd-icon" data-icon="hash" aria-hidden="true"><use href="#i-hash"></use></svg></span>
                  <div class="fd-list-body">
                    <span class="fd-list-title">Slack</span>
                    <div class="fd-stack" data-gap="1-5"><span class="fd-list-desc">Connected Sep 9 by amara@quarry.dev</span><span class="fd-row" data-wrap data-gap="1"><span class="fd-badge" data-variant="mono">monitors:read</span></span></div>
                  </div>
                  <span class="fd-list-meta"></span>
                  <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="danger-soft" data-size="sm" data-disconnect>Disconnect</button></span>
                </li>
              </ul>
              <div class="fd-empty" data-size="sm" id="apps-empty" hidden>
                <span class="fd-empty-icon"><svg class="fd-icon" data-icon="plug" aria-hidden="true"><use href="#i-plug"></use></svg></span>
                <h3 class="fd-empty-title">No connected apps</h3>
                <p class="fd-empty-text">Apps you connect, like Claude Code or Cursor, show up here with the scopes they can use.</p>
                <div class="fd-empty-actions"><a class="fd-btn" data-variant="outline" href="install.html"><svg class="fd-icon" data-icon="plus" aria-hidden="true"><use href="#i-plus"></use></svg><span>Connect an app</span></a></div>
              </div>
            </div>
          </section>

          <!-- ===================================================== Notifications -->
          <section class="fd-stack" data-gap="1" id="panel-notifications" data-panel="notifications" aria-labelledby="h-notifications" :hidden="tab !== 'notifications'">
            <header class="fd-stack" data-gap="1">
              <h2 class="fd-h2" id="h-notifications" tabindex="-1">Notifications</h2>
              <p class="fd-muted">Choose what reaches you and where. These settings are personal, so teammates keep their own.</p>
            </header>
            <div>
              <div class="fd-setting">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Email notifications</h3><p class="fd-setting-desc">Usage alerts, run summaries and billing notices sent to <span class="fd-mono">maya@quarry.dev</span>.</p></div>
                <div class="fd-setting-control"><button class="fd-btn" type="button" data-variant="outline" data-fd-dialog-open="dlg-email-prefs"><svg class="fd-icon" data-icon="mail" aria-hidden="true"><use href="#i-mail"></use></svg><span>Manage email notifications</span></button></div>
              </div>

              <div class="fd-form-row" data-layout="stack">
                <div class="fd-form-row-text"><span class="fd-form-row-label">Your notifications</span><span class="fd-form-row-desc">Choose what shows up in Ember and as desktop alerts.</span></div>
                <div class="fd-form-row-control">
                  <div class="fd-matrix" data-cols="2" id="notif-matrix">
                    <div class="fd-matrix-head"><span>Category</span><span class="fd-matrix-cell">In-app</span><span class="fd-matrix-cell">Browser</span></div>
                    <div class="fd-matrix-row">
                      <div class="fd-matrix-text"><span class="fd-matrix-label">Billing &amp; payments</span><span class="fd-matrix-desc">Failed payments, top-ups and plan changes. Always shown in-app.</span></div>
                      <div class="fd-matrix-cell"><span class="fd-switch-lock"><svg class="fd-icon" data-icon="lock" aria-hidden="true"><use href="#i-lock"></use></svg>Always</span></div>
                      <div class="fd-matrix-cell"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Billing and payments, browser" checked><span class="fd-switch-track"></span></label></div>
                    </div>
                    <div class="fd-matrix-row">
                      <div class="fd-matrix-text"><span class="fd-matrix-label">Usage &amp; limits</span><span class="fd-matrix-desc">Credit thresholds, rate limits and concurrency limits.</span></div>
                      <div class="fd-matrix-cell"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Usage and limits, in-app" checked><span class="fd-switch-track"></span></label></div>
                      <div class="fd-matrix-cell"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Usage and limits, browser"><span class="fd-switch-track"></span></label></div>
                    </div>
                    <div class="fd-matrix-row">
                      <div class="fd-matrix-text"><span class="fd-matrix-label">Monitors</span><span class="fd-matrix-desc">Changes detected on the pages you watch.</span></div>
                      <div class="fd-matrix-cell"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Monitors, in-app" checked><span class="fd-switch-track"></span></label></div>
                      <div class="fd-matrix-cell"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Monitors, browser" checked><span class="fd-switch-track"></span></label></div>
                    </div>
                    <div class="fd-matrix-row">
                      <div class="fd-matrix-text"><span class="fd-matrix-label">Jobs</span><span class="fd-matrix-desc">Crawls, batch scrapes and agent runs finishing or failing.</span></div>
                      <div class="fd-matrix-cell"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Jobs, in-app" checked><span class="fd-switch-track"></span></label></div>
                      <div class="fd-matrix-cell"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Jobs, browser" checked><span class="fd-switch-track"></span></label></div>
                    </div>
                    <div class="fd-matrix-row">
                      <div class="fd-matrix-text"><span class="fd-matrix-label">Team &amp; account</span><span class="fd-matrix-desc">Members joining, API keys created and security changes.</span></div>
                      <div class="fd-matrix-cell"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Team and account, in-app" checked><span class="fd-switch-track"></span></label></div>
                      <div class="fd-matrix-cell"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Team and account, browser"><span class="fd-switch-track"></span></label></div>
                    </div>
                    <div class="fd-matrix-row">
                      <div class="fd-matrix-text"><span class="fd-matrix-label">Product updates</span><span class="fd-matrix-desc">New endpoints, providers and changes to the API.</span></div>
                      <div class="fd-matrix-cell"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Product updates, in-app" checked><span class="fd-switch-track"></span></label></div>
                      <div class="fd-matrix-cell"><label class="fd-switch"><input type="checkbox" role="switch" aria-label="Product updates, browser"><span class="fd-switch-track"></span></label></div>
                    </div>
                  </div>
                </div>
              </div>

              <hr class="fd-divider">

              <div class="fd-setting">
                <div class="fd-setting-text">
                  <h3 class="fd-setting-title">Browser alerts</h3>
                  <p class="fd-setting-desc">Permission: <span class="fd-status" data-size="sm" data-tone="warning" id="perm-status" role="status">Not enabled</span></p>
                  <p class="fd-setting-desc">Ember needs your browser’s permission to show alerts while this tab is in the background.</p>
                </div>
                <div class="fd-setting-control"><button class="fd-btn" type="button" data-variant="outline" id="enable-alerts"><svg class="fd-icon" data-icon="bell" aria-hidden="true"><use href="#i-bell"></use></svg><span>Enable desktop alerts</span></button></div>
              </div>

              <div class="fd-setting" data-align="start">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Quiet hours</h3><p class="fd-setting-desc">Pause browser alerts overnight. In-app notifications still collect so you can catch up in the morning.</p></div>
                <div class="fd-setting-control"><label class="fd-switch"><input type="checkbox" role="switch" id="quiet-switch" checked aria-label="Quiet hours"><span class="fd-switch-track"></span></label></div>
                <div class="fd-form-cols" id="quiet-fields">
                  <div class="fd-field">
                    <label class="fd-field-label" for="quiet-from">From</label>
                    <div class="fd-select" data-variant="outline"><select id="quiet-from" data-saved-toast="Quiet hours"><option>9:00 PM</option><option selected>10:00 PM</option><option>11:00 PM</option><option>12:00 AM</option></select></div>
                  </div>
                  <div class="fd-field">
                    <label class="fd-field-label" for="quiet-to">To</label>
                    <div class="fd-select" data-variant="outline"><select id="quiet-to" data-saved-toast="Quiet hours"><option>6:00 AM</option><option selected>7:00 AM</option><option>8:00 AM</option><option>9:00 AM</option></select></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ===================================================== Advanced -->
          <section class="fd-stack" data-gap="1" id="panel-advanced" data-panel="advanced" aria-labelledby="h-advanced" :hidden="tab !== 'advanced'">
            <header class="fd-stack" data-gap="1">
              <h2 class="fd-h2" id="h-advanced" tabindex="-1">Advanced</h2>
              <p class="fd-muted">Webhooks, network access and data handling for Quarry Labs.</p>
            </header>
            <div>
              <div class="fd-form-row" data-layout="stack">
                <div class="fd-form-row-text"><span class="fd-form-row-label" id="whsec-label">Webhook signing secret</span><span class="fd-form-row-desc">Verify that webhook requests really come from Ember by checking the signature header with this secret.</span></div>
                <div class="fd-form-row-control">
                  <div class="fd-field">
                    <div class="fd-secret" id="whsec" role="group" aria-labelledby="whsec-label" data-value="whsec_9d2e7a41b6c04f58a3e17c92d0b85f64" data-mask="full" data-noun="signing secret">
                      <code class="fd-secret-value"></code>
                      <div class="fd-secret-actions">
                        <button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-icon-only data-fd-field-action="reveal" aria-label="Show signing secret"><svg class="fd-icon" data-icon="eye" aria-hidden="true"><use href="#i-eye"></use></svg></button>
                        <button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-icon-only data-fd-field-action="copy" aria-label="Copy signing secret"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg></button>
                        <button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-icon-only data-fd-field-action="rotate" aria-label="Rotate signing secret"><svg class="fd-icon" data-icon="rotate-ccw" aria-hidden="true"><use href="#i-rotate-ccw"></use></svg></button>
                      </div>
                    </div>
                    <p class="fd-field-hint">Keep it out of client code. Rotating invalidates the old secret at once. <a class="fd-link" href="#docs">Webhook security</a></p>
                  </div>
                </div>
              </div>

              <div class="fd-form-row" data-layout="stack">
                <div class="fd-form-row-text"><span class="fd-form-row-label" id="endpoints-label">Webhook endpoints</span><span class="fd-form-row-desc">Ember sends signed events to these HTTPS URLs when runs and monitors finish.</span></div>
                <div class="fd-form-row-control">
                  <div class="fd-table-wrap">
                    <div class="fd-table-scroll">
                      <table class="fd-table" data-stack aria-labelledby="endpoints-label" id="endpoints-table">
                        <thead>
                          <tr><th>URL</th><th>Events</th><th>Last delivery</th><th data-actions><span class="fd-sr-only">Actions</span></th></tr>
                        </thead>
                        <tbody>
                          <tr data-endpoint="https://api.quarry.dev/hooks/ember">
                            <td data-mono data-stack-title><span class="fd-table-trunc">https://api.quarry.dev/hooks/ember</span></td>
                            <td><span class="fd-row" data-wrap data-gap="1"><span class="fd-badge" data-variant="mono">crawl.completed</span><span class="fd-badge" data-variant="mono">monitor.changed</span></span></td>
                            <td><span class="fd-status" data-size="sm" data-tone="success">200 · 4 min ago</span></td>
                            <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Actions for api.quarry.dev endpoint" data-fd-menu="menu-endpoint" data-placement="bottom-end"><svg class="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis"></use></svg></button></td>
                          </tr>
                          <tr data-endpoint="https://n8n.quarry.dev/webhook/ember-runs">
                            <td data-mono data-stack-title><span class="fd-table-trunc">https://n8n.quarry.dev/webhook/ember-runs</span></td>
                            <td><span class="fd-row" data-wrap data-gap="1"><span class="fd-badge" data-variant="mono">agent.finished</span></span></td>
                            <td><span class="fd-status" data-size="sm" data-tone="danger">503 · 2 hr ago</span></td>
                            <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Actions for n8n.quarry.dev endpoint" data-fd-menu="menu-endpoint" data-placement="bottom-end"><svg class="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis"></use></svg></button></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div class="fd-table-foot">
                      <span class="fd-table-foot-info" data-bind="endpoint-count">2 endpoints</span>
                      <div class="fd-table-foot-actions">
                        <button class="fd-btn" type="button" data-size="sm" data-fd-dialog-open="dlg-endpoint"><svg class="fd-icon" data-icon="plus" aria-hidden="true"><use href="#i-plus"></use></svg><span>Add endpoint</span></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="fd-form-row" data-layout="stack">
                <div class="fd-form-row-text"><label class="fd-form-row-label" for="allowlist">IP allowlist</label><span class="fd-form-row-desc">Only requests from these addresses can use your API keys. Leave it empty to allow any address.</span></div>
                <div class="fd-form-row-control">
                  <div class="fd-field">
                    <div class="fd-tag-input" id="allowlist-tags" data-fd-tag-input data-mono data-value="203.0.113.0/24,198.51.100.7" data-pattern="^((25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])(/(3[0-2]|[12]?[0-9]))?$">
                      <input class="fd-tag-input-field" id="allowlist" placeholder="Add an IP or CIDR, like 203.0.113.0/24" autocomplete="off" spellcheck="false" aria-describedby="allowlist-hint allowlist-error">
                    </div>
                    <p class="fd-field-hint" id="allowlist-hint">Changes apply at once. Include your own address so you do not lock yourself out.</p>
                    <p class="fd-field-error" id="allowlist-error" hidden><svg class="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert"></use></svg><span>Fix or remove the entries shown in red. Use an IPv4 address or a CIDR range.</span></p>
                  </div>
                </div>
              </div>

              <div class="fd-setting" data-align="start">
                <div class="fd-setting-text"><h3 class="fd-setting-title" id="sso-title">Require single sign-on</h3><p class="fd-setting-desc">Members sign in through your identity provider only.</p></div>
                <div class="fd-setting-control"><label class="fd-switch"><input type="checkbox" role="switch" disabled aria-labelledby="sso-title" aria-describedby="reason-sso"><span class="fd-switch-track"></span></label></div>
                <p class="fd-reason-text" id="reason-sso"><svg class="fd-icon" data-icon="lock" aria-hidden="true"><use href="#i-lock"></use></svg><span><span class="fd-reason-why">Single sign-on is on the Scale plan.</span> <span class="fd-reason-who">Billing admins can upgrade.</span></span></p>
              </div>

              <div class="fd-setting">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Data retention</h3><p class="fd-setting-desc">How long Ember keeps request logs and run output before deleting them.</p></div>
                <div class="fd-setting-control"><label class="fd-select"><span class="fd-sr-only">Data retention</span>
                  <select id="retention" data-saved-toast="Data retention"><option>7 days</option><option selected>30 days</option><option>90 days</option><option>1 year</option></select></label></div>
              </div>

              <div class="fd-setting" data-align="start">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Zero data retention</h3><p class="fd-setting-desc">Ember stores no page content or request bodies for this team.</p></div>
                <div class="fd-setting-control"><label class="fd-switch"><input type="checkbox" role="switch" id="zdr-switch" aria-label="Zero data retention"><span class="fd-switch-track"></span></label></div>
                <div class="fd-callout" data-tone="info" data-size="sm" role="note">
                  <svg class="fd-icon fd-callout-icon" data-icon="info" aria-hidden="true"><use href="#i-info"></use></svg>
                  <div class="fd-callout-content"><p class="fd-callout-body">Logs keep only the URL, status, timing and credits. Runs cannot be replayed and monitors cannot show diffs while this is on.</p></div>
                </div>
              </div>

              <div class="fd-setting">
                <div class="fd-setting-text"><h3 class="fd-setting-title">Export data</h3><p class="fd-setting-desc">Download your runs, logs and usage as a ZIP of CSV files. Large exports are emailed to <span class="fd-mono">maya@quarry.dev</span>.</p></div>
                <div class="fd-setting-control"><button class="fd-btn" type="button" data-variant="outline" id="export-data"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg><span>Export data</span></button></div>
              </div>

              <!-- Destructive, and on its own section: confirmed on the page, not in a dialog -->
              <div class="fd-setting" data-tone="danger" data-align="start" id="delete-team-row">
                <div class="fd-setting-text">
                  <div class="fd-row" data-align="start" data-gap="3">
                    <span class="fd-tile" data-size="44" data-tone="accent">QL</span>
                    <div>
                      <h3 class="fd-setting-title" id="delete-team-title">Delete team</h3>
                      <p class="fd-setting-desc"><span class="fd-label">Quarry Labs</span> and its 4 API keys, 12 monitors and 30 days of logs will be permanently deleted. <strong>This cannot be undone.</strong></p>
                    </div>
                  </div>
                </div>
                <form class="fd-confirm-inline" method="dialog" id="delete-team" data-fd-confirm-inline data-confirm="quarry-labs" aria-labelledby="delete-team-title" @submit.prevent="onDeleteTeam">
                  <div class="fd-field">
                    <label class="fd-field-label" for="dt-confirm">Type <span class="fd-confirm-phrase">quarry-labs</span> to confirm</label>
                    <input class="fd-input" id="dt-confirm" name="confirm" autocomplete="off" autocapitalize="off" spellcheck="false" required data-fd-confirm-input aria-describedby="dt-confirm-rule" data-admin>
                    <p class="fd-confirm-inline-rule" id="dt-confirm-rule" data-fd-confirm-rule>Type it exactly as shown. Case counts.</p>
                  </div>
                  <div class="fd-form-actions"><button class="fd-btn" type="submit" data-variant="danger" data-fd-confirm-submit>Delete team</button></div>
                </form>
              </div>
            </div>
          </section>

          </div>
        </div>
        </div>
      </div>
    </section>

    <section class="fd-band" data-pad="sm" data-grow aria-label="Demo state">
      <div class="fd-row" data-wrap data-justify="between">
        <span class="fd-eyebrow">Demo state</span>
        <div class="fd-segmented" data-size="sm" id="state-switch" role="radiogroup" aria-label="Page state" @fd:change="onStateSwitch">
          <button class="fd-segmented-item" type="button" role="radio" aria-checked="true" data-value="ready">Loaded</button>
          <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="loading">Loading</button>
          <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="error">Error</button>
          <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="member">As a member</button>
        </div>
      </div>
    </section>
  </div>

  <!-- ===================================================== Menus -->
  <div class="fd-menu" id="menu-member" popover role="menu" aria-label="Member actions">
    <button class="fd-menu-item" data-value="copy"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg><span class="fd-menu-item-label">Copy email</span></button>
    <hr class="fd-menu-sep">
    <button class="fd-menu-item" data-value="remove" data-tone="danger"><svg class="fd-icon" data-icon="trash-2" aria-hidden="true"><use href="#i-trash-2"></use></svg><span class="fd-menu-item-label">Remove from team</span></button>
  </div>
  <div class="fd-menu" id="menu-invite" popover role="menu" aria-label="Invite actions">
    <button class="fd-menu-item" data-value="resend"><svg class="fd-icon" data-icon="send" aria-hidden="true"><use href="#i-send"></use></svg><span class="fd-menu-item-label">Resend invite</span></button>
    <button class="fd-menu-item" data-value="copy"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg><span class="fd-menu-item-label">Copy email</span></button>
    <hr class="fd-menu-sep">
    <button class="fd-menu-item" data-value="remove" data-tone="danger"><svg class="fd-icon" data-icon="trash-2" aria-hidden="true"><use href="#i-trash-2"></use></svg><span class="fd-menu-item-label">Revoke invite</span></button>
  </div>
  <div class="fd-menu" id="menu-plan" popover role="menu" aria-label="Plan actions">
    <button class="fd-menu-item" data-value="compare"><svg class="fd-icon" data-icon="layers" aria-hidden="true"><use href="#i-layers"></use></svg><span class="fd-menu-item-label">Compare plans</span></button>
    <button class="fd-menu-item" data-value="invoices"><svg class="fd-icon" data-icon="receipt" aria-hidden="true"><use href="#i-receipt"></use></svg><span class="fd-menu-item-label">View invoices</span></button>
    <hr class="fd-menu-sep">
    <button class="fd-menu-item" data-value="cancel" data-tone="danger"><svg class="fd-icon" data-icon="circle-x" aria-hidden="true"><use href="#i-circle-x"></use></svg><span class="fd-menu-item-label">Cancel subscription</span></button>
  </div>
  <div class="fd-menu" id="menu-endpoint" popover role="menu" aria-label="Endpoint actions">
    <button class="fd-menu-item" data-value="test"><svg class="fd-icon" data-icon="send" aria-hidden="true"><use href="#i-send"></use></svg><span class="fd-menu-item-label">Send test event</span></button>
    <button class="fd-menu-item" data-value="copy"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg><span class="fd-menu-item-label">Copy URL</span></button>
    <hr class="fd-menu-sep">
    <button class="fd-menu-item" data-value="delete" data-tone="danger"><svg class="fd-icon" data-icon="trash-2" aria-hidden="true"><use href="#i-trash-2"></use></svg><span class="fd-menu-item-label">Delete endpoint</span></button>
  </div>

  <!-- ===================================================== Dialogs -->
  <dialog class="fd-dialog" id="dlg-confirm" data-size="sm">
    <div class="fd-dialog-head">
      <h2 class="fd-h3 fd-dialog-title" data-confirm-title>Are you sure?</h2>
      <p class="fd-dialog-desc" data-confirm-desc></p>
    </div>
    <div class="fd-dialog-foot">
      <button class="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close>Cancel</button>
      <button class="fd-btn" type="button" data-variant="danger" data-fd-dialog-close value="ok" data-confirm-ok>Confirm</button>
    </div>
  </dialog>

  <dialog class="fd-dialog" id="dlg-2fa" data-size="md">
    <section data-step="scan">
      <div class="fd-dialog-head">
        <h2 class="fd-h3 fd-dialog-title">Set up two-factor authentication</h2>
        <p class="fd-dialog-desc">Scan the code with an authenticator app, then enter the 6-digit code it shows.</p>
        <button class="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
      </div>
      <div class="fd-dialog-body fd-stack">
        <div class="fd-row" data-wrap data-align="start" data-gap="6">
          <figure class="fd-qr" data-size="sm"><svg viewBox="0 0 33 33" role="img" aria-label="Authenticator setup code for Ember"><path fill="currentColor" d="M4 4h1v1h-1zM5 4h1v1h-1zM6 4h1v1h-1zM7 4h1v1h-1zM8 4h1v1h-1zM9 4h1v1h-1zM10 4h1v1h-1zM17 4h1v1h-1zM22 4h1v1h-1zM23 4h1v1h-1zM24 4h1v1h-1zM25 4h1v1h-1zM26 4h1v1h-1zM27 4h1v1h-1zM28 4h1v1h-1zM4 5h1v1h-1zM10 5h1v1h-1zM14 5h1v1h-1zM15 5h1v1h-1zM16 5h1v1h-1zM17 5h1v1h-1zM18 5h1v1h-1zM19 5h1v1h-1zM22 5h1v1h-1zM28 5h1v1h-1zM4 6h1v1h-1zM6 6h1v1h-1zM7 6h1v1h-1zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM13 6h1v1h-1zM14 6h1v1h-1zM15 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM25 6h1v1h-1zM26 6h1v1h-1zM28 6h1v1h-1zM4 7h1v1h-1zM6 7h1v1h-1zM7 7h1v1h-1zM8 7h1v1h-1zM10 7h1v1h-1zM12 7h1v1h-1zM15 7h1v1h-1zM17 7h1v1h-1zM18 7h1v1h-1zM19 7h1v1h-1zM20 7h1v1h-1zM22 7h1v1h-1zM24 7h1v1h-1zM25 7h1v1h-1zM26 7h1v1h-1zM28 7h1v1h-1zM4 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM25 8h1v1h-1zM26 8h1v1h-1zM28 8h1v1h-1zM4 9h1v1h-1zM10 9h1v1h-1zM12 9h1v1h-1zM14 9h1v1h-1zM15 9h1v1h-1zM16 9h1v1h-1zM19 9h1v1h-1zM20 9h1v1h-1zM22 9h1v1h-1zM28 9h1v1h-1zM4 10h1v1h-1zM5 10h1v1h-1zM6 10h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1zM9 10h1v1h-1zM10 10h1v1h-1zM12 10h1v1h-1zM14 10h1v1h-1zM16 10h1v1h-1zM18 10h1v1h-1zM20 10h1v1h-1zM22 10h1v1h-1zM23 10h1v1h-1zM24 10h1v1h-1zM25 10h1v1h-1zM26 10h1v1h-1zM27 10h1v1h-1zM28 10h1v1h-1zM12 11h1v1h-1zM14 11h1v1h-1zM16 11h1v1h-1zM19 11h1v1h-1zM20 11h1v1h-1zM4 12h1v1h-1zM6 12h1v1h-1zM7 12h1v1h-1zM8 12h1v1h-1zM9 12h1v1h-1zM10 12h1v1h-1zM13 12h1v1h-1zM16 12h1v1h-1zM17 12h1v1h-1zM18 12h1v1h-1zM19 12h1v1h-1zM22 12h1v1h-1zM23 12h1v1h-1zM24 12h1v1h-1zM25 12h1v1h-1zM26 12h1v1h-1zM5 13h1v1h-1zM6 13h1v1h-1zM11 13h1v1h-1zM15 13h1v1h-1zM16 13h1v1h-1zM20 13h1v1h-1zM23 13h1v1h-1zM27 13h1v1h-1zM5 14h1v1h-1zM6 14h1v1h-1zM7 14h1v1h-1zM8 14h1v1h-1zM10 14h1v1h-1zM11 14h1v1h-1zM12 14h1v1h-1zM13 14h1v1h-1zM14 14h1v1h-1zM16 14h1v1h-1zM19 14h1v1h-1zM21 14h1v1h-1zM23 14h1v1h-1zM25 14h1v1h-1zM27 14h1v1h-1zM28 14h1v1h-1zM7 15h1v1h-1zM8 15h1v1h-1zM11 15h1v1h-1zM14 15h1v1h-1zM18 15h1v1h-1zM19 15h1v1h-1zM20 15h1v1h-1zM21 15h1v1h-1zM22 15h1v1h-1zM23 15h1v1h-1zM28 15h1v1h-1zM4 16h1v1h-1zM5 16h1v1h-1zM6 16h1v1h-1zM8 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM11 16h1v1h-1zM12 16h1v1h-1zM14 16h1v1h-1zM17 16h1v1h-1zM18 16h1v1h-1zM19 16h1v1h-1zM21 16h1v1h-1zM22 16h1v1h-1zM24 16h1v1h-1zM26 16h1v1h-1zM27 16h1v1h-1zM28 16h1v1h-1zM4 17h1v1h-1zM6 17h1v1h-1zM7 17h1v1h-1zM11 17h1v1h-1zM16 17h1v1h-1zM17 17h1v1h-1zM20 17h1v1h-1zM23 17h1v1h-1zM25 17h1v1h-1zM27 17h1v1h-1zM4 18h1v1h-1zM9 18h1v1h-1zM10 18h1v1h-1zM14 18h1v1h-1zM19 18h1v1h-1zM22 18h1v1h-1zM23 18h1v1h-1zM24 18h1v1h-1zM25 18h1v1h-1zM27 18h1v1h-1zM28 18h1v1h-1zM4 19h1v1h-1zM7 19h1v1h-1zM11 19h1v1h-1zM12 19h1v1h-1zM13 19h1v1h-1zM16 19h1v1h-1zM18 19h1v1h-1zM20 19h1v1h-1zM23 19h1v1h-1zM24 19h1v1h-1zM28 19h1v1h-1zM4 20h1v1h-1zM6 20h1v1h-1zM8 20h1v1h-1zM10 20h1v1h-1zM11 20h1v1h-1zM12 20h1v1h-1zM13 20h1v1h-1zM16 20h1v1h-1zM17 20h1v1h-1zM18 20h1v1h-1zM20 20h1v1h-1zM21 20h1v1h-1zM22 20h1v1h-1zM23 20h1v1h-1zM24 20h1v1h-1zM26 20h1v1h-1zM12 21h1v1h-1zM13 21h1v1h-1zM14 21h1v1h-1zM18 21h1v1h-1zM19 21h1v1h-1zM20 21h1v1h-1zM24 21h1v1h-1zM25 21h1v1h-1zM4 22h1v1h-1zM5 22h1v1h-1zM6 22h1v1h-1zM7 22h1v1h-1zM8 22h1v1h-1zM9 22h1v1h-1zM10 22h1v1h-1zM13 22h1v1h-1zM14 22h1v1h-1zM15 22h1v1h-1zM16 22h1v1h-1zM17 22h1v1h-1zM20 22h1v1h-1zM22 22h1v1h-1zM24 22h1v1h-1zM26 22h1v1h-1zM27 22h1v1h-1zM28 22h1v1h-1zM4 23h1v1h-1zM10 23h1v1h-1zM12 23h1v1h-1zM13 23h1v1h-1zM14 23h1v1h-1zM15 23h1v1h-1zM19 23h1v1h-1zM20 23h1v1h-1zM24 23h1v1h-1zM25 23h1v1h-1zM4 24h1v1h-1zM6 24h1v1h-1zM7 24h1v1h-1zM8 24h1v1h-1zM10 24h1v1h-1zM12 24h1v1h-1zM13 24h1v1h-1zM14 24h1v1h-1zM15 24h1v1h-1zM19 24h1v1h-1zM20 24h1v1h-1zM21 24h1v1h-1zM22 24h1v1h-1zM23 24h1v1h-1zM24 24h1v1h-1zM26 24h1v1h-1zM27 24h1v1h-1zM28 24h1v1h-1zM4 25h1v1h-1zM6 25h1v1h-1zM7 25h1v1h-1zM8 25h1v1h-1zM10 25h1v1h-1zM12 25h1v1h-1zM13 25h1v1h-1zM16 25h1v1h-1zM17 25h1v1h-1zM19 25h1v1h-1zM20 25h1v1h-1zM21 25h1v1h-1zM22 25h1v1h-1zM24 25h1v1h-1zM25 25h1v1h-1zM26 25h1v1h-1zM27 25h1v1h-1zM28 25h1v1h-1zM4 26h1v1h-1zM6 26h1v1h-1zM7 26h1v1h-1zM8 26h1v1h-1zM10 26h1v1h-1zM12 26h1v1h-1zM17 26h1v1h-1zM18 26h1v1h-1zM19 26h1v1h-1zM25 26h1v1h-1zM26 26h1v1h-1zM28 26h1v1h-1zM4 27h1v1h-1zM10 27h1v1h-1zM13 27h1v1h-1zM16 27h1v1h-1zM17 27h1v1h-1zM20 27h1v1h-1zM21 27h1v1h-1zM22 27h1v1h-1zM23 27h1v1h-1zM24 27h1v1h-1zM25 27h1v1h-1zM28 27h1v1h-1zM4 28h1v1h-1zM5 28h1v1h-1zM6 28h1v1h-1zM7 28h1v1h-1zM8 28h1v1h-1zM9 28h1v1h-1zM10 28h1v1h-1zM12 28h1v1h-1zM14 28h1v1h-1zM16 28h1v1h-1zM18 28h1v1h-1zM21 28h1v1h-1zM22 28h1v1h-1zM23 28h1v1h-1zM24 28h1v1h-1zM25 28h1v1h-1zM26 28h1v1h-1zM27 28h1v1h-1zM28 28h1v1h-1z"/></svg></figure>
          <div class="fd-stack fd-column" data-size="xs" data-gap="2">
            <p class="fd-small fd-muted">Cannot scan it? Enter this key in your app instead.</p>
            <code class="fd-code">EMBR 7K2Q 9XJM 4TWP</code>
          </div>
        </div>
        <div class="fd-field">
          <span class="fd-field-label" id="otp-2fa-label">Verification code</span>
          <div class="fd-otp" id="otp-2fa" data-fd-otp data-length="6" role="group" aria-labelledby="otp-2fa-label"></div>
          <p class="fd-field-hint" id="otp-2fa-hint">For this demo the code is <span class="fd-mono">482913</span>.</p>
          <p class="fd-field-error" id="otp-2fa-error" hidden><svg class="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert"></use></svg><span>That code is not right. Check your app and try again.</span></p>
        </div>
      </div>
      <div class="fd-dialog-foot">
        <button class="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close>Cancel</button>
        <button class="fd-btn" type="button" data-variant="primary" id="twofa-verify" data-fd-dialog-step="recovery" data-fd-dialog-step-delay="600"><span>Verify and continue</span></button>
      </div>
    </section>
    <section data-step="recovery" hidden>
      <div class="fd-dialog-head">
        <h2 class="fd-h3 fd-dialog-title">Save your recovery codes</h2>
        <p class="fd-dialog-desc">Each code works once if you lose access to your authenticator app.</p>
        <button class="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
      </div>
      <div class="fd-dialog-body fd-stack">
        <div class="fd-callout" data-tone="warning" role="note">
          <svg class="fd-icon fd-callout-icon" data-icon="triangle-alert" aria-hidden="true"><use href="#i-triangle-alert"></use></svg>
          <div class="fd-callout-content"><p class="fd-callout-title">Store them somewhere safe</p><p class="fd-callout-body">We show these once. A password manager is a good place for them.</p></div>
        </div>
        <figure class="fd-codeblock">
          <button class="fd-codeblock-copy" aria-label="Copy recovery codes"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg></button>
          <pre class="fd-codeblock-body"><code data-lang="text">k7f2-9xqm  p4vd-83hn
t2zc-6wje  m9ra-4ukb
h5ns-1dyq  x8gp-7ltv
c3bw-0fok  v6ie-2rnz</code></pre>
        </figure>
      </div>
      <div class="fd-dialog-foot">
        <button class="fd-btn" type="button" data-variant="primary" data-fd-dialog-close value="done">I have saved them</button>
      </div>
    </section>
  </dialog>

  <dialog class="fd-dialog" id="dlg-email" data-size="sm" data-reset>
    <form method="dialog" data-fd-validate>
      <div class="fd-dialog-head">
        <h2 class="fd-h3 fd-dialog-title">Change account email</h2>
        <p class="fd-dialog-desc">We send a confirmation link to the new address. Your email changes once you open it.</p>
        <button class="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
      </div>
      <div class="fd-dialog-body fd-stack">
        <div class="fd-field">
          <span class="fd-field-label">Current email</span>
          <input class="fd-input" value="maya@quarry.dev" readonly aria-label="Current email">
        </div>
        <div class="fd-field">
          <label class="fd-field-label" for="new-email" data-required>New email</label>
          <input class="fd-input" type="email" id="new-email" name="email" required autocomplete="off" placeholder="maya@newdomain.dev" data-error-required="Enter the new email address." data-error-type="Enter a valid email address, like maya@newdomain.dev.">
        </div>
      </div>
      <div class="fd-dialog-foot">
        <button class="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close>Cancel</button>
        <button class="fd-btn" type="submit" value="send" data-variant="primary"><span>Send confirmation</span></button>
      </div>
    </form>
  </dialog>

  <dialog class="fd-dialog fd-confirm" id="dlg-delete-account" data-size="sm" data-confirm="maya@quarry.dev">
    <form method="dialog">
      <div class="fd-dialog-head">
        <h2 class="fd-h3 fd-dialog-title">Delete your account</h2>
        <p class="fd-dialog-desc">This deletes your account, your API keys and your run history. Teams you own must be deleted or transferred first. You can’t undo this.</p>
      </div>
      <div class="fd-dialog-body">
        <div class="fd-field">
          <label class="fd-field-label" for="da-confirm">Type <span class="fd-confirm-phrase">maya@quarry.dev</span> to confirm</label>
          <input class="fd-input" id="da-confirm" data-fd-confirm-input autocomplete="off" autocapitalize="off" spellcheck="false">
        </div>
      </div>
      <div class="fd-dialog-foot">
        <button class="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close>Cancel</button>
        <button class="fd-btn" type="submit" data-variant="danger" value="confirm" data-fd-confirm-submit disabled><span>Delete account</span></button>
      </div>
    </form>
  </dialog>

  <dialog class="fd-dialog" id="dlg-terms" data-size="md">
    <div class="fd-dialog-head">
      <h2 class="fd-h3 fd-dialog-title" data-terms-title>Provider terms</h2>
      <p class="fd-dialog-desc" data-terms-desc>Last updated Sep 12, 2026.</p>
      <button class="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
    </div>
    <div class="fd-dialog-body fd-stack">
      <ul class="fd-feature-list" data-size="sm">
        <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Results can be used inside your product and shown to your own customers.</span></li>
        <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Raw data cannot be resold, redistributed or used to build a competing dataset.</span></li>
        <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Calls are billed in credits at the rate on the provider page, with no minimum.</span></li>
        <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Either side can end access with 30 days’ notice.</span></li>
      </ul>
      <label class="fd-checkbox" id="terms-accept-wrap"><input type="checkbox" id="terms-accept"><span class="fd-checkbox-box"></span>
        <span class="fd-checkbox-text"><span class="fd-checkbox-label">I accept these terms for Quarry Labs</span><span class="fd-checkbox-desc">Everyone on the team can then call this provider.</span></span></label>
    </div>
    <div class="fd-dialog-foot">
      <button class="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close>Close</button>
      <button class="fd-btn" type="button" data-variant="primary" data-fd-dialog-close value="accept" id="terms-accept-btn" disabled>Accept terms</button>
    </div>
  </dialog>

  <dialog class="fd-dialog" id="dlg-email-prefs" data-size="md">
    <div class="fd-dialog-head">
      <h2 class="fd-h3 fd-dialog-title">Email notifications</h2>
      <p class="fd-dialog-desc">Sent to <span class="fd-mono">maya@quarry.dev</span>.</p>
      <button class="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
    </div>
    <div class="fd-dialog-body fd-options">
      <label class="fd-switch"><input type="checkbox" role="switch" checked><span class="fd-switch-track"></span><span class="fd-switch-text"><span class="fd-switch-label">Failed runs</span><span class="fd-switch-desc">One email per failing crawl, batch or monitor, at most once an hour.</span></span></label>
      <label class="fd-switch"><input type="checkbox" role="switch" checked><span class="fd-switch-track"></span><span class="fd-switch-text"><span class="fd-switch-label">Usage alerts</span><span class="fd-switch-desc">When you pass 80% and 95% of your monthly credits.</span></span></label>
      <label class="fd-switch"><input type="checkbox" role="switch"><span class="fd-switch-track"></span><span class="fd-switch-text"><span class="fd-switch-label">Weekly usage summary</span><span class="fd-switch-desc">Credits used per endpoint, every Monday.</span></span></label>
      <label class="fd-switch" data-locked><input type="checkbox" role="switch" checked disabled><span class="fd-switch-track"></span><span class="fd-switch-text"><span class="fd-switch-label">Billing and security</span></span><span class="fd-switch-lock"><svg class="fd-icon" data-icon="lock" aria-hidden="true"><use href="#i-lock"></use></svg>Always</span></label>
    </div>
    <div class="fd-dialog-foot">
      <button class="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close>Cancel</button>
      <button class="fd-btn" type="button" data-variant="primary" data-fd-dialog-close value="save">Save preferences</button>
    </div>
  </dialog>

  <dialog class="fd-dialog" id="dlg-endpoint" data-size="md" data-reset>
    <form method="dialog" data-fd-validate>
      <div class="fd-dialog-head">
        <h2 class="fd-h3 fd-dialog-title">Add webhook endpoint</h2>
        <p class="fd-dialog-desc">Ember sends a signed POST to this URL. It must answer with a 2xx within 10 seconds.</p>
        <button class="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
      </div>
      <div class="fd-dialog-body fd-stack">
        <div class="fd-field">
          <label class="fd-field-label" for="ep-url" data-required>Endpoint URL</label>
          <input class="fd-input" data-mono type="url" id="ep-url" name="url" required pattern="https://.+" autocomplete="off" spellcheck="false" placeholder="https://api.quarry.dev/hooks/ember" data-error-required="Enter the URL that should receive events." data-error-type="Enter a full URL starting with https://." data-error-pattern="Endpoints must use https://.">
        </div>
        <div class="fd-field" role="group" aria-labelledby="ep-events-label">
          <span class="fd-field-label" id="ep-events-label">Events</span>
          <div class="fd-options">
            <label class="fd-checkbox"><input type="checkbox" name="events" value="crawl.completed" checked><span class="fd-checkbox-box"></span><span class="fd-checkbox-text"><span class="fd-checkbox-label fd-mono">crawl.completed</span></span></label>
            <label class="fd-checkbox"><input type="checkbox" name="events" value="monitor.changed"><span class="fd-checkbox-box"></span><span class="fd-checkbox-text"><span class="fd-checkbox-label fd-mono">monitor.changed</span></span></label>
            <label class="fd-checkbox"><input type="checkbox" name="events" value="agent.finished"><span class="fd-checkbox-box"></span><span class="fd-checkbox-text"><span class="fd-checkbox-label fd-mono">agent.finished</span></span></label>
            <label class="fd-checkbox"><input type="checkbox" name="events" value="batch.completed"><span class="fd-checkbox-box"></span><span class="fd-checkbox-text"><span class="fd-checkbox-label fd-mono">batch.completed</span></span></label>
          </div>
        </div>
      </div>
      <div class="fd-dialog-foot">
        <button class="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close>Cancel</button>
        <button class="fd-btn" type="submit" value="add" data-variant="primary"><span>Add endpoint</span></button>
      </div>
    </form>
  </dialog>
</template>
