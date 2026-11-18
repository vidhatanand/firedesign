import { html } from 'lit';
import type { ScreenSettings } from './screen';

/** The connectedApps panel of the settings screen (templates/settings.html). */
export const connectedAppsPanel = (s: ScreenSettings) => html`
    <section class="fd-stack" data-gap="4" id="panel-connected-apps" data-panel="connected-apps" aria-labelledby="h-connected-apps" ?hidden=${s.tab !== 'connected-apps'}>
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
  `;
