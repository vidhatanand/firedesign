import { html } from 'lit';
import type { ScreenSettings } from './screen';

/** The features panel of the settings screen: switches in one grouped table (templates/settings.html). */
export const featuresPanel = (s: ScreenSettings) => html`
      <section class="fd-stack" data-gap="4" id="panel-features" data-panel="features" aria-labelledby="h-features" ?hidden=${s.tab !== 'features'}>
        <header class="fd-stack" data-gap="1">
          <h2 class="fd-h2" id="h-features" tabindex="-1">Features</h2>
          <p class="fd-muted">What every key on Quarry Labs can use. A switch applies at once.</p>
          <p class="fd-row fd-small fd-muted" data-gap="1-5"><svg class="fd-icon" data-size="14" data-icon="users" aria-hidden="true"><use href="#i-users"></use></svg><span>Owners and admins turn features on and off.</span></p>
          <p class="fd-row fd-small fd-muted" data-gap="1-5" data-member-only hidden><svg class="fd-icon" data-size="14" data-icon="lock" aria-hidden="true"><use href="#i-lock"></use></svg><span>You are a member, so the switches are read-only. Ask Maya Reyes or Tomasz Nowak.</span></p>
        </header>
    
        <div class="fd-toolbar" aria-label="Find a feature">
          <div class="fd-search fd-toolbar-search" data-variant="soft">
            <svg class="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search"></use></svg>
            <input class="fd-search-input" id="feature-search" type="search" placeholder="Screenshots" aria-label="Search features" autocomplete="off">
            <button type="button" class="fd-search-clear" aria-label="Clear search"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
          </div>
          <div class="fd-toolbar-end"><span class="fd-small fd-muted" id="feature-count" aria-live="polite">6 of 10 on</span></div>
        </div>
    
        <div class="fd-table-wrap" id="features-wrap">
          <div class="fd-table-scroll">
            <table class="fd-table" id="features-table" data-collapsible data-stack aria-label="Features by area">
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
          <div class="fd-empty-actions"><button class="fd-btn" type="button" id="features-clear"><span>Clear search</span></button></div>
        </div>
      </section>
  `;
