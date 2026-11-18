import { html } from 'lit';
import type { ScreenSettings } from './screen';

/** The account panel of the settings screen (templates/settings.html). */
export const accountPanel = (s: ScreenSettings) => html`
    <section class="fd-stack" data-gap="1" id="panel-account" data-panel="account" aria-labelledby="h-account" ?hidden=${s.tab !== 'account'}>
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
          <div class="fd-setting-text"><h3 class="fd-setting-title">Appearance</h3><p class="fd-setting-desc">Current: <strong data-bind="theme-label">${s.themeLabel}</strong></p></div>
          <div class="fd-setting-control">
            <div class="fd-segmented" data-icon-only role="radiogroup" aria-label="Appearance" id="seg-theme" @fd:change=${s.onTheme}>
              <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Light" data-value="light"><svg class="fd-icon" data-icon="sun" aria-hidden="true"><use href="#i-sun"></use></svg></button>
              <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Dark" data-value="dark"><svg class="fd-icon" data-icon="moon" aria-hidden="true"><use href="#i-moon"></use></svg></button>
              <button class="fd-segmented-item" type="button" role="radio" aria-checked="true" aria-label="System" data-value="system"><svg class="fd-icon" data-icon="monitor" aria-hidden="true"><use href="#i-monitor"></use></svg></button>
            </div>
          </div>
        </div>

        <div class="fd-setting">
          <div class="fd-setting-text"><h3 class="fd-setting-title">Density</h3><p class="fd-setting-desc">Compact tightens rows and controls so more fits on screen.</p></div>
          <div class="fd-setting-control">
            <div class="fd-segmented" role="radiogroup" aria-label="Density" id="seg-density" @fd:change=${s.onDensity}>
              <button class="fd-segmented-item" type="button" role="radio" aria-checked="true" data-value="comfortable">Comfortable</button>
              <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="compact">Compact</button>
            </div>
          </div>
        </div>

        <div class="fd-setting">
          <div class="fd-setting-text"><h3 class="fd-setting-title">Accent</h3><p class="fd-setting-desc">Pick the colour for buttons, links and active states on this device.</p></div>
          <div class="fd-setting-control">
            <div class="fd-segmented" data-icon-only data-size="sm" role="radiogroup" aria-label="Accent colour" id="seg-accent" @fd:change=${s.onAccent}>
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
  `;
