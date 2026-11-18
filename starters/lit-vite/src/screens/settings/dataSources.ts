import { html } from 'lit';
import type { ScreenSettings } from './screen';

/** The dataSources panel of the settings screen (templates/settings.html). */
export const dataSourcesPanel = (s: ScreenSettings) => html`
    <section class="fd-stack" data-gap="5" id="panel-data-sources" data-panel="data-sources" aria-labelledby="h-data-sources" ?hidden=${s.tab !== 'data-sources'}>
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
  `;
