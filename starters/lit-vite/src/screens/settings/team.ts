import { html } from 'lit';
import type { ScreenSettings } from './screen';

/** The team panel of the settings screen (templates/settings.html): one dirty-tracked form. */
export const teamPanel = (s: ScreenSettings) => html`
      <form class="fd-stack" data-gap="1" id="panel-team" data-panel="team" aria-labelledby="h-team" data-fd-dirty novalidate autocomplete="off" ?hidden=${s.tab !== 'team'}>
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
                <button class="fd-btn" type="button" data-variant="ghost" id="leave-team" aria-disabled="true" aria-describedby="leave-reason"><svg class="fd-icon" data-icon="log-out" aria-hidden="true"><use href="#i-log-out"></use></svg><span>Leave team</span></button>
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
  `;
