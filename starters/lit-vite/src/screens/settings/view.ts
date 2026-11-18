import { html, nothing } from 'lit';
import { accountPanel } from './account';
import { advancedPanel } from './advanced';
import { billingPanel } from './billing';
import { connectedAppsPanel } from './connectedApps';
import { dataSourcesPanel } from './dataSources';
import { notificationsPanel } from './notifications';
import { settingsOverlays } from './overlays';
import { teamPanel } from './team';
import type { ScreenSettings } from './screen';

/**
 * The settings screen: a sub-navigation and one panel per tab (templates/settings.html). Every panel is rendered, and
 * the current one is the only one not hidden, so a form keeps what the user typed when they change tabs.
 */
export const settingsView = (s: ScreenSettings) => html`
    <main class="fd-page">
      <div class="fd-frame">

        <section class="fd-band fd-page-hero fd-rise">
          <div class="fd-page-hero-art" aria-hidden="true"><div class="fd-ascii" data-fd-ascii="terrain"></div></div>
          <h1 class="fd-display">Settings</h1>
          <p class="fd-page-hero-desc">Manage your team, billing and account preferences.</p>
        </section>

        <section class="fd-band fd-rise" data-fd-vars="--fd-i: 1" data-pad="none" data-grow aria-label="Settings">
          <div class="fd-split" data-side="start">

            <aside class="fd-panel" aria-label="Settings sections">
              <nav class="fd-subnav" aria-label="Settings" @click=${s.onTab}>
                <a class="fd-subnav-item" href="?tab=account" data-tab="account" aria-current=${s.tab === 'account' ? 'page' : nothing}><svg class="fd-icon" data-icon="user" aria-hidden="true"><use href="#i-user"></use></svg><span>Account</span></a>
                <a class="fd-subnav-item" href="?tab=team" data-tab="team" aria-current=${s.tab === 'team' ? 'page' : nothing}><svg class="fd-icon" data-icon="users" aria-hidden="true"><use href="#i-users"></use></svg><span>Team</span><span class="fd-subnav-meta" data-bind="member-count">4</span></a>
                <a class="fd-subnav-item" href="?tab=billing" data-tab="billing" aria-current=${s.tab === 'billing' ? 'page' : nothing}><svg class="fd-icon" data-icon="credit-card" aria-hidden="true"><use href="#i-credit-card"></use></svg><span>Billing</span></a>
                <a class="fd-subnav-item" href="?tab=data-sources" data-tab="data-sources" aria-current=${s.tab === 'data-sources' ? 'page' : nothing}><svg class="fd-icon" data-icon="database" aria-hidden="true"><use href="#i-database"></use></svg><span>Data sources</span></a>
                <a class="fd-subnav-item" href="?tab=connected-apps" data-tab="connected-apps" aria-current=${s.tab === 'connected-apps' ? 'page' : nothing}><svg class="fd-icon" data-icon="plug" aria-hidden="true"><use href="#i-plug"></use></svg><span>Connected apps</span></a>
                <a class="fd-subnav-item" href="?tab=notifications" data-tab="notifications" aria-current=${s.tab === 'notifications' ? 'page' : nothing}><svg class="fd-icon" data-icon="bell" aria-hidden="true"><use href="#i-bell"></use></svg><span>Notifications</span></a>
                <hr class="fd-subnav-sep">
                <a class="fd-subnav-item" href="?tab=advanced" data-tab="advanced" aria-current=${s.tab === 'advanced' ? 'page' : nothing}><svg class="fd-icon" data-icon="settings-2" aria-hidden="true"><use href="#i-settings-2"></use></svg><span>Advanced</span></a>
              </nav>
            </aside>

            <div class="fd-split-main">
            ${accountPanel(s)}
            ${teamPanel(s)}
            ${billingPanel(s)}
            ${dataSourcesPanel(s)}
            ${connectedAppsPanel(s)}
            ${notificationsPanel(s)}
            ${advancedPanel(s)}
            </div>
          </div>
        </section>
      </div>

      ${settingsOverlays(s)}
    </main>
  `;
