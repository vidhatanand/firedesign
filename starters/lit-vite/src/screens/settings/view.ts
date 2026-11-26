import { html, nothing } from 'lit';
import { accountPanel } from './account';
import { advancedPanel } from './advanced';
import { billingPanel } from './billing';
import { connectedAppsPanel } from './connectedApps';
import { dataSourcesPanel } from './dataSources';
import { notificationsPanel } from './notifications';
import { settingsOverlays } from './overlays';
import { featuresPanel } from './features';
import { teamPanel } from './team';
import type { ScreenSettings } from './screen';

const item = (s: ScreenSettings, tab: string, icon: string, label: string, bind?: string, count?: string) => html`<a class="fd-subnav-item" href="?tab=${tab}" data-tab=${tab} aria-current=${s.tab === tab ? 'page' : nothing}><svg class="fd-icon" data-icon=${icon} aria-hidden="true"><use href="#i-${icon}"></use></svg><span>${label}</span>${bind ? html`<span class="fd-subnav-meta" data-bind=${bind} .textContent=${count}></span>` : nothing}</a>`;

/**
 * The settings screen: a sub-navigation and one panel per tab (templates/settings.html). Every panel is rendered, and
 * the current one is the only one not hidden, so a form keeps what the user typed when they change tabs.
 */
export const settingsView = (s: ScreenSettings) => html`
    <main class="fd-page" id="main" tabindex="-1">
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
              <nav class="fd-subnav" aria-label="Settings" @click=${s.onTab}>
                ${item(s, 'account', 'user', 'Account')}
                ${item(s, 'notifications', 'bell', 'Notifications')}
                <hr class="fd-subnav-sep">
                ${item(s, 'team', 'users', 'Team', 'member-count', '4')}
                ${item(s, 'features', 'toggle-left', 'Features', 'features-on', '6')}
                ${item(s, 'billing', 'credit-card', 'Billing')}
                <hr class="fd-subnav-sep">
                ${item(s, 'data-sources', 'database', 'Data sources', 'sources-on', '4')}
                ${item(s, 'connected-apps', 'plug', 'Connected apps', 'apps-total', '4')}
                ${item(s, 'advanced', 'settings-2', 'Advanced')}
              </nav>
            </aside>

            <div class="fd-split-main">
              <div class="fd-states" id="settings-states" data-state="ready">

                <div class="fd-stack" data-gap="6" data-when="loading" aria-busy="true" aria-label="Loading settings">
                  <div class="fd-skeleton-text" data-lines="2"></div>
                  <div class="fd-skeleton-list" data-rows="5"></div>
                </div>

                <div class="fd-empty" data-tone="danger" data-when="error" role="alert">
                  <span class="fd-empty-icon"><svg class="fd-icon" data-icon="triangle-alert" aria-hidden="true"><use href="#i-triangle-alert"></use></svg></span>
                  <h2 class="fd-empty-title">Couldn’t load settings</h2>
                  <p class="fd-empty-text">The request timed out after 10 seconds. Nothing you saved was lost.</p>
                  <div class="fd-empty-actions"><button class="fd-btn" type="button" data-fd-set-state="loading"><svg class="fd-icon" data-icon="refresh-cw" aria-hidden="true"><use href="#i-refresh-cw"></use></svg><span>Try again</span></button></div>
                  <p class="fd-empty-meta"><span>Request ID</span><code class="fd-code">req_5c81d0e2</code><button class="fd-btn" type="button" data-size="xs" data-variant="ghost" data-icon-only data-fd-copy="req_5c81d0e2" aria-label="Copy request ID"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg></button></p>
                </div>

                <div data-when="ready">
                  ${accountPanel(s)}
                  ${teamPanel(s)}
                  ${featuresPanel(s)}
                  ${billingPanel(s)}
                  ${dataSourcesPanel(s)}
                  ${connectedAppsPanel(s)}
                  ${notificationsPanel(s)}
                  ${advancedPanel(s)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="fd-band" data-pad="sm" data-grow aria-label="Demo state">
          <div class="fd-row" data-wrap data-justify="between">
            <span class="fd-eyebrow">Demo state</span>
            <div class="fd-segmented" data-size="sm" id="state-switch" role="radiogroup" aria-label="Page state" @fd:change=${s.onState}>
              <button class="fd-segmented-item" type="button" role="radio" aria-checked="true" data-value="ready">Loaded</button>
              <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="loading">Loading</button>
              <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="error">Error</button>
              <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="member">As a member</button>
            </div>
          </div>
        </section>
      </div>

      ${settingsOverlays(s)}
    </main>
  `;
