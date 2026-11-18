import { html } from 'lit';

/** The table's empty and error states: one row that spans the table (the markup of templates/logs.html). */
export const emptyRow = (filtered: boolean) => html`
  <tr class="fd-table-state"><td colspan="8"><div class="fd-table-empty">
    <div class="fd-ascii" data-fd-ascii="waves" data-fade="x" aria-hidden="true"></div>
    <span class="fd-table-empty-icon"><svg class="fd-icon" data-icon="clock" aria-hidden="true"><use href="#i-clock"></use></svg></span>
    <p class="fd-table-empty-title">No activity logs found</p>
    <p class="fd-table-empty-text">${filtered ? 'Nothing matches these filters. Try a wider date range or clear them.' : 'Requests to the Ember API appear here a few seconds after they finish.'}</p>
    ${filtered
      ? html`<button class="fd-btn" type="button" data-action="clear-filters"><span>Clear filters</span></button>`
      : html`<a class="fd-btn" href="playground.html?endpoint=scrape"><svg class="fd-icon" data-icon="play" aria-hidden="true"><use href="#i-play"></use></svg><span>Send a test request</span></a>`}
  </div></td></tr>`;

export const errorRow = () => html`
  <tr class="fd-table-state" data-state="error"><td colspan="8"><div class="fd-table-empty" data-tone="danger" role="alert">
    <span class="fd-table-empty-icon"><svg class="fd-icon" data-icon="triangle-alert" aria-hidden="true"><use href="#i-triangle-alert"></use></svg></span>
    <p class="fd-table-empty-title">Couldn’t load activity logs</p>
    <p class="fd-table-empty-text">The request timed out after 10 seconds. Check your connection, then try again.</p>
    <button class="fd-btn" type="button" data-action="reload"><svg class="fd-icon" data-icon="refresh-cw" aria-hidden="true"><use href="#i-refresh-cw"></use></svg><span>Retry</span></button>
  </div></td></tr>`;
