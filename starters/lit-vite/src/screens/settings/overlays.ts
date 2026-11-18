import { html } from 'lit';
import type { ScreenSettings } from './screen';

/** Menus and dialogs of the settings screen (templates/settings.html). */
export const settingsOverlays = (s: ScreenSettings) => html`
    <div class="fd-menu" id="menu-member" popover role="menu" aria-label="Member actions" @fd:select=${s.onMemberMenu}>
      <button class="fd-menu-item" data-value="copy"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg><span class="fd-menu-item-label">Copy email</span></button>
      <hr class="fd-menu-sep">
      <button class="fd-menu-item" data-value="remove" data-tone="danger"><svg class="fd-icon" data-icon="trash-2" aria-hidden="true"><use href="#i-trash-2"></use></svg><span class="fd-menu-item-label">Remove from team</span></button>
    </div>
    <div class="fd-menu" id="menu-invite" popover role="menu" aria-label="Invite actions" @fd:select=${s.onInviteMenu}>
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

    <dialog class="fd-dialog" id="dlg-confirm" data-size="sm" @fd:close=${s.onConfirmClose}>
      <div class="fd-dialog-head">
        <h2 class="fd-h3 fd-dialog-title" data-confirm-title>${s.confirm.title}</h2>
        <p class="fd-dialog-desc" data-confirm-desc>${s.confirm.desc}</p>
      </div>
      <div class="fd-dialog-foot">
        <button class="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close>Cancel</button>
        <button class="fd-btn" type="button" data-variant=${s.confirm.tone} data-fd-dialog-close value="ok" data-confirm-ok>${s.confirm.label}</button>
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

    <dialog class="fd-dialog fd-confirm" id="dlg-delete-team" data-size="sm" data-confirm="quarry-labs">
      <form method="dialog">
        <div class="fd-dialog-head">
          <h2 class="fd-h3 fd-dialog-title">Delete Quarry Labs</h2>
          <p class="fd-dialog-desc">This deletes the team, its 4 API keys, 12 monitors and 30 days of logs. Members lose access at once. You can’t undo this.</p>
        </div>
        <div class="fd-dialog-body">
          <div class="fd-field">
            <label class="fd-field-label" for="dt-confirm">Type <span class="fd-confirm-phrase">quarry-labs</span> to confirm</label>
            <input class="fd-input" id="dt-confirm" data-fd-confirm-input autocomplete="off" autocapitalize="off" spellcheck="false">
          </div>
        </div>
        <div class="fd-dialog-foot">
          <button class="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close>Cancel</button>
          <button class="fd-btn" type="submit" data-variant="danger" value="confirm" data-fd-confirm-submit disabled><span>Delete team</span></button>
        </div>
      </form>
    </dialog>
  `;
