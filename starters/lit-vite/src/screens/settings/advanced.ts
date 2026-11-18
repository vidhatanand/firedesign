import { html } from 'lit';
import type { ScreenSettings } from './screen';

/** The advanced panel of the settings screen (templates/settings.html). */
export const advancedPanel = (s: ScreenSettings) => html`
    <section class="fd-stack" data-gap="1" id="panel-advanced" data-panel="advanced" aria-labelledby="h-advanced" ?hidden=${s.tab !== 'advanced'}>
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
              <div class="fd-tag-input" id="allowlist-tags" data-fd-tag-input data-mono data-value="203.0.113.0/24,198.51.100.7" data-pattern="^((25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])(/(3[0-2]|[12]?[0-9]))?$">
                <input class="fd-tag-input-field" id="allowlist" placeholder="Add an IP or CIDR, like 203.0.113.0/24" autocomplete="off" spellcheck="false" aria-describedby="allowlist-hint allowlist-error">
              </div>
              <p class="fd-field-hint" id="allowlist-hint">Changes apply at once. Include your own address so you do not lock yourself out.</p>
              <p class="fd-field-error" id="allowlist-error" hidden><svg class="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert"></use></svg><span>Fix or remove the entries shown in red. Use an IPv4 address or a CIDR range.</span></p>
            </div>
          </div>
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

        <div class="fd-setting" data-tone="danger">
          <div class="fd-setting-text">
            <div class="fd-row" data-align="start" data-gap="3">
              <span class="fd-tile" data-size="44" data-tone="accent">QL</span>
              <div>
                <h3 class="fd-setting-title">Delete team</h3>
                <p class="fd-setting-desc"><span class="fd-label">Quarry Labs</span> and its 4 API keys, 12 monitors and 30 days of logs will be permanently deleted. <strong>This cannot be undone.</strong></p>
              </div>
            </div>
          </div>
          <div class="fd-setting-control"><button class="fd-btn" type="button" data-variant="danger" data-fd-dialog-open="dlg-delete-team">Delete</button></div>
        </div>
      </div>
    </section>
  `;
