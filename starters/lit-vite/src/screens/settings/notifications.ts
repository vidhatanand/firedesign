import { html } from 'lit';
import type { ScreenSettings } from './screen';

/** The notifications panel of the settings screen (templates/settings.html). */
export const notificationsPanel = (s: ScreenSettings) => html`
    <section class="fd-stack" data-gap="1" id="panel-notifications" data-panel="notifications" aria-labelledby="h-notifications" ?hidden=${s.tab !== 'notifications'}>
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
  `;
