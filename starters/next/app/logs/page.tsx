// The logs screen: the .fd-page of templates/logs.html, converted to JSX per spec/EXPORT.md (a server
// component: plain Fire markup, no Fire script). LogsScreen renders the <main class="fd-page"> and runs the screen's
// behaviour in the browser once Fire has loaded.
import type { Metadata } from 'next';
import { LogsScreen } from './logs-screen';

export const metadata: Metadata = { title: 'Activity logs · Ember' };

export default function LogsPage() {
  return (
    <LogsScreen>
      <div className="fd-frame">
        <section className="fd-band fd-page-hero fd-rise">
          <div className="fd-page-hero-art" aria-hidden="true">
            <div className="fd-ascii" data-fd-ascii="terrain"></div>
          </div>
          <h1 className="fd-display">Activity logs</h1>
          <p className="fd-page-hero-desc">Every request your keys made, with its endpoint, status and credits.</p>
        </section>
        <section className="fd-band fd-rise" data-fd-vars="--fd-i: 1" data-pad="sm" aria-label="Filters" suppressHydrationWarning>
          <div className="fd-stack" data-gap="3">
            <div className="fd-toolbar">
              <div className="fd-search fd-toolbar-search" data-variant="soft">
                <svg className="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search" /></svg>
                <input className="fd-search-input" id="logs-search" type="search" placeholder="Search requests" aria-label="Search requests" autoComplete="off" data-fd-search-hotkey="" />
                <button type="button" className="fd-search-clear" aria-label="Clear search">
                  <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
                </button>
                <kbd className="fd-kbd">/</kbd>
              </div>
              <div className="fd-filter" data-default="All endpoints">
                <button className="fd-filter-trigger" type="button" data-fd-popover="pop-endpoint" data-placement="bottom-start">
                  <svg className="fd-icon" data-icon="funnel" aria-hidden="true"><use href="#i-funnel" /></svg>
                  <span className="fd-filter-value" data-fd-filter-label="" data-empty="All endpoints">All endpoints</span>
                  <svg className="fd-icon fd-filter-chevron" data-size="14" data-icon="chevron-down" aria-hidden="true"><use href="#i-chevron-down" /></svg>
                </button>
              </div>
              <div className="fd-filter" data-default="All API keys (3)">
                <button className="fd-filter-trigger" type="button" data-fd-popover="pop-key" data-placement="bottom-start">
                  <svg className="fd-icon" data-icon="key-round" aria-hidden="true"><use href="#i-key-round" /></svg>
                  <span className="fd-filter-value" data-fd-filter-label="" data-empty="All API keys (3)">All API keys (3)</span>
                  <svg className="fd-icon fd-filter-chevron" data-size="14" data-icon="chevron-down" aria-hidden="true"><use href="#i-chevron-down" /></svg>
                </button>
              </div>
              <div className="fd-filter" data-default="All statuses">
                <button className="fd-filter-trigger" type="button" data-fd-popover="pop-status" data-placement="bottom-start">
                  <svg className="fd-icon" data-icon="circle-dot" aria-hidden="true"><use href="#i-circle-dot" /></svg>
                  <span className="fd-filter-value" data-fd-filter-label="" data-empty="All statuses">All statuses</span>
                  <svg className="fd-icon fd-filter-chevron" data-size="14" data-icon="chevron-down" aria-hidden="true"><use href="#i-chevron-down" /></svg>
                </button>
              </div>
              <div className="fd-toolbar-end">
                <div className="fd-filter">
                  <button className="fd-filter-trigger" type="button" data-fd-popover="pop-range" data-placement="bottom-end">
                    <svg className="fd-icon" data-icon="calendar" aria-hidden="true"><use href="#i-calendar" /></svg>
                    <span className="fd-filter-value" data-fd-daterange-label="">Last 7 days</span>
                    <svg className="fd-icon fd-filter-chevron" data-size="14" data-icon="chevron-down" aria-hidden="true"><use href="#i-chevron-down" /></svg>
                  </button>
                </div>
                <button className="fd-btn" type="button" id="logs-export">
                  <svg className="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download" /></svg>
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
            <div className="fd-filter-applied" id="logs-applied" aria-label="Applied filters" hidden></div>
          </div>
        </section>
        <section className="fd-band" data-pad="none" data-surface="surface" aria-label="Requests">
          <div className="fd-table-wrap" data-variant="plain">
            <div className="fd-table-scroll">
              <table className="fd-table" id="logs-table" data-stack="" aria-label="Activity log" aria-busy="true">
                <thead>
                  <tr>
                    <th data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-all="" aria-label="Select all rows" />
                    </th>
                    <th aria-sort="descending" data-sort-type="date">
                      <button className="fd-th-sort" type="button">Time</button>
                    </th>
                    <th aria-sort="none">
                      <button className="fd-th-sort" type="button">Endpoint</button>
                    </th>
                    <th>Target</th>
                    <th aria-sort="none">
                      <button className="fd-th-sort" type="button">Status</button>
                    </th>
                    <th data-num="" aria-sort="none" data-sort-type="number">
                      <button className="fd-th-sort" type="button">Credits</button>
                    </th>
                    <th data-num="" aria-sort="none" data-sort-type="number">
                      <button className="fd-th-sort" type="button">Duration</button>
                    </th>
                    <th data-actions="">
                      <span className="fd-sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody id="logs-body" hidden>
                  <tr data-value="req_8f3a21" data-href="#req_8f3a21" data-key="Production crawler" data-status="success" data-code="200">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_8f3a21" />
                    </td>
                    <td data-sort-value="2026-11-14T16:29">Nov 14, 4:29 PM</td>
                    <td data-mono="" data-stack-title="">/scrape</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">https://docs.ember.dev/guides/webhooks</span>
                    </td>
                    <td data-sort-value="success">
                      <span className="fd-status" data-tone="success">Success</span>
                    </td>
                    <td data-num="" data-sort-value="1">1</td>
                    <td data-num="" data-sort-value="1.84">1.84 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_8f3a21" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_7c19be" data-href="#req_7c19be" data-key="Production crawler" data-status="running" data-code="202">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_7c19be" />
                    </td>
                    <td data-sort-value="2026-11-14T16:27">Nov 14, 4:27 PM</td>
                    <td data-mono="" data-stack-title="">/crawl</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">https://ember.dev/blog</span>
                    </td>
                    <td data-sort-value="running">
                      <span className="fd-status" data-tone="info" data-live="">Running</span>
                    </td>
                    <td data-num="" data-sort-value="48">48</td>
                    <td data-num="" data-sort-value="">—</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_7c19be" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_6d02f4" data-href="#req_6d02f4" data-key="Default" data-status="success" data-code="200">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_6d02f4" />
                    </td>
                    <td data-sort-value="2026-11-14T16:21">Nov 14, 4:21 PM</td>
                    <td data-mono="" data-stack-title="">/search</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">best vector databases for agents 2026</span>
                    </td>
                    <td data-sort-value="success">
                      <span className="fd-status" data-tone="success">Success</span>
                    </td>
                    <td data-num="" data-sort-value="5">5</td>
                    <td data-num="" data-sort-value="2.31">2.31 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_6d02f4" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_5a77c0" data-href="#req_5a77c0" data-key="CI" data-status="failed" data-code="502">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_5a77c0" />
                    </td>
                    <td data-sort-value="2026-11-14T15:58">Nov 14, 3:58 PM</td>
                    <td data-mono="" data-stack-title="">/extract</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">https://shop.example.com/products/trail-runner-2</span>
                    </td>
                    <td data-sort-value="failed">
                      <span className="fd-status" data-tone="danger">Failed</span>
                    </td>
                    <td data-num="" data-sort-value="0">0</td>
                    <td data-num="" data-sort-value="12.07">12.07 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_5a77c0" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_4e91d8" data-href="#req_4e91d8" data-key="Default" data-status="cached" data-code="200">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_4e91d8" />
                    </td>
                    <td data-sort-value="2026-11-14T15:40">Nov 14, 3:40 PM</td>
                    <td data-mono="" data-stack-title="">/scrape</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">https://news.example.org/2026/11/rate-limits-explained</span>
                    </td>
                    <td data-sort-value="cached">
                      <span className="fd-status" data-tone="violet">Cached</span>
                    </td>
                    <td data-num="" data-sort-value="0">0</td>
                    <td data-num="" data-sort-value="0.04">0.04 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_4e91d8" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_3b6a5e" data-href="#req_3b6a5e" data-key="Production crawler" data-status="queued" data-code="202">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_3b6a5e" />
                    </td>
                    <td data-sort-value="2026-11-14T15:12">Nov 14, 3:12 PM</td>
                    <td data-mono="" data-stack-title="">/agent</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">Compare pricing for the five largest EU hosting providers</span>
                    </td>
                    <td data-sort-value="queued">
                      <span className="fd-status" data-tone="neutral">Queued</span>
                    </td>
                    <td data-num="" data-sort-value="">—</td>
                    <td data-num="" data-sort-value="">—</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_3b6a5e" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_2f4c83" data-href="#req_2f4c83" data-key="CI" data-status="success" data-code="200">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_2f4c83" />
                    </td>
                    <td data-sort-value="2026-11-14T14:47">Nov 14, 2:47 PM</td>
                    <td data-mono="" data-stack-title="">/scrape</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">https://github.com/ember-dev/ember-js/releases</span>
                    </td>
                    <td data-sort-value="success">
                      <span className="fd-status" data-tone="success">Success</span>
                    </td>
                    <td data-num="" data-sort-value="1">1</td>
                    <td data-num="" data-sort-value="1.12">1.12 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_2f4c83" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_1a08e9" data-href="#req_1a08e9" data-key="Production crawler" data-status="failed" data-code="403">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_1a08e9" />
                    </td>
                    <td data-sort-value="2026-11-14T13:05">Nov 14, 1:05 PM</td>
                    <td data-mono="" data-stack-title="">/crawl</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">https://docs.example.io</span>
                    </td>
                    <td data-sort-value="failed">
                      <span className="fd-status" data-tone="danger">Failed</span>
                    </td>
                    <td data-num="" data-sort-value="120">120</td>
                    <td data-num="" data-sort-value="48.6">48.60 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_1a08e9" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_0e5d77" data-href="#req_0e5d77" data-key="Default" data-status="success" data-code="200">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_0e5d77" />
                    </td>
                    <td data-sort-value="2026-11-14T11:52">Nov 14, 11:52 AM</td>
                    <td data-mono="" data-stack-title="">/map</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">https://northwind.io</span>
                    </td>
                    <td data-sort-value="success">
                      <span className="fd-status" data-tone="success">Success</span>
                    </td>
                    <td data-num="" data-sort-value="1">1</td>
                    <td data-num="" data-sort-value="3.4">3.40 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_0e5d77" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_f91b02" data-href="#req_f91b02" data-key="Production crawler" data-status="failed" data-code="429">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_f91b02" />
                    </td>
                    <td data-sort-value="2026-11-14T10:18">Nov 14, 10:18 AM</td>
                    <td data-mono="" data-stack-title="">/scrape</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">https://lumenapi.com/pricing</span>
                    </td>
                    <td data-sort-value="failed">
                      <span className="fd-status" data-tone="danger">Failed</span>
                    </td>
                    <td data-num="" data-sort-value="0">0</td>
                    <td data-num="" data-sort-value="0.31">0.31 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_f91b02" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_e4c8a9" data-href="#req_e4c8a9" data-key="Default" data-status="success" data-code="200">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_e4c8a9" />
                    </td>
                    <td data-sort-value="2026-11-13T18:40">Nov 13, 6:40 PM</td>
                    <td data-mono="" data-stack-title="">/parse</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">quarterly-report-q3.pdf</span>
                    </td>
                    <td data-sort-value="success">
                      <span className="fd-status" data-tone="success">Success</span>
                    </td>
                    <td data-num="" data-sort-value="12">12</td>
                    <td data-num="" data-sort-value="6.72">6.72 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_e4c8a9" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_d27a60" data-href="#req_d27a60" data-key="Production crawler" data-status="success" data-code="200">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_d27a60" />
                    </td>
                    <td data-sort-value="2026-11-13T14:15">Nov 13, 2:15 PM</td>
                    <td data-mono="" data-stack-title="">/extract</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">https://northwind.io/plans</span>
                    </td>
                    <td data-sort-value="success">
                      <span className="fd-status" data-tone="success">Success</span>
                    </td>
                    <td data-num="" data-sort-value="5">5</td>
                    <td data-num="" data-sort-value="4.18">4.18 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_d27a60" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_c10f3e" data-href="#req_c10f3e" data-key="CI" data-status="cached" data-code="200">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_c10f3e" />
                    </td>
                    <td data-sort-value="2026-11-12T09:03">Nov 12, 9:03 AM</td>
                    <td data-mono="" data-stack-title="">/search</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">ember api rate limits</span>
                    </td>
                    <td data-sort-value="cached">
                      <span className="fd-status" data-tone="violet">Cached</span>
                    </td>
                    <td data-num="" data-sort-value="0">0</td>
                    <td data-num="" data-sort-value="0.06">0.06 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_c10f3e" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                  <tr data-value="req_b83d19" data-href="#req_b83d19" data-key="CI" data-status="success" data-code="200">
                    <td data-select="">
                      <input type="checkbox" className="fd-table-check" data-select-row="" aria-label="Select req_b83d19" />
                    </td>
                    <td data-sort-value="2026-11-11T17:47">Nov 11, 5:47 PM</td>
                    <td data-mono="" data-stack-title="">/scrape</td>
                    <td data-mono="" data-muted="">
                      <span className="fd-table-trunc">https://status.quarry.dev</span>
                    </td>
                    <td data-sort-value="success">
                      <span className="fd-status" data-tone="success">Success</span>
                    </td>
                    <td data-num="" data-sort-value="1">1</td>
                    <td data-num="" data-sort-value="0.97">0.97 s</td>
                    <td data-actions="">
                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for req_b83d19" data-fd-menu="menu-log-row" data-placement="bottom-end">
                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tbody id="logs-skeleton" aria-hidden="true">
                  <tr data-skeleton="">
                    <td data-select=""></td>
                    <td>
                      <span className="fd-table-skeleton" data-size="md"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="xs"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="xl"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-shape="pill" data-size="sm"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="2xs"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="xs"></span>
                    </td>
                    <td data-actions=""></td>
                  </tr>
                  <tr data-skeleton="">
                    <td data-select=""></td>
                    <td>
                      <span className="fd-table-skeleton" data-size="md"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="sm"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="lg"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-shape="pill" data-size="sm"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="2xs"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="xs"></span>
                    </td>
                    <td data-actions=""></td>
                  </tr>
                  <tr data-skeleton="">
                    <td data-select=""></td>
                    <td>
                      <span className="fd-table-skeleton" data-size="md"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="xs"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="xl"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-shape="pill" data-size="sm"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="2xs"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="xs"></span>
                    </td>
                    <td data-actions=""></td>
                  </tr>
                  <tr data-skeleton="">
                    <td data-select=""></td>
                    <td>
                      <span className="fd-table-skeleton" data-size="md"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="sm"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="xl"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-shape="pill" data-size="sm"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="2xs"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="xs"></span>
                    </td>
                    <td data-actions=""></td>
                  </tr>
                  <tr data-skeleton="">
                    <td data-select=""></td>
                    <td>
                      <span className="fd-table-skeleton" data-size="md"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="xs"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="lg"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-shape="pill" data-size="sm"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="2xs"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="xs"></span>
                    </td>
                    <td data-actions=""></td>
                  </tr>
                  <tr data-skeleton="">
                    <td data-select=""></td>
                    <td>
                      <span className="fd-table-skeleton" data-size="md"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="sm"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-size="xl"></span>
                    </td>
                    <td>
                      <span className="fd-table-skeleton" data-shape="pill" data-size="sm"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="2xs"></span>
                    </td>
                    <td data-num="">
                      <span className="fd-table-skeleton" data-size="xs"></span>
                    </td>
                    <td data-actions=""></td>
                  </tr>
                </tbody>
                <tbody id="logs-state" hidden></tbody>
              </table>
            </div>
            <div className="fd-table-foot">
              <span className="fd-table-foot-info" id="logs-info" aria-live="polite">Loading requests</span>
              <div className="fd-table-foot-actions">
                <label className="fd-table-rows">
                  <span>Rows per page</span>
                  <select aria-label="Rows per page" defaultValue="25">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                    <option>100</option>
                  </select>
                </label>
                <div className="fd-btn-group">
                  <button className="fd-btn" type="button" id="logs-prev" data-size="sm" data-icon-only="" disabled aria-label="Previous page">
                    <svg className="fd-icon" data-icon="chevron-left" aria-hidden="true"><use href="#i-chevron-left" /></svg>
                  </button>
                  <button className="fd-btn" type="button" id="logs-next" data-size="sm" data-icon-only="" disabled aria-label="Next page">
                    <svg className="fd-icon" data-icon="chevron-right" aria-hidden="true"><use href="#i-chevron-right" /></svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="fd-table-bulk" data-state="closed" role="region" aria-label="Bulk actions">
              <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-bulk-clear="" aria-label="Clear selection">
                <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
              </button>
              <span className="fd-table-bulk-count" aria-live="polite"><span data-bulk-count="">0</span> selected</span>
              <div className="fd-table-bulk-actions">
                <button className="fd-btn" type="button" data-variant="outline" data-size="sm" data-action="retry">
                  <svg className="fd-icon" data-icon="rotate-ccw" aria-hidden="true"><use href="#i-rotate-ccw" /></svg>
                  <span>Retry</span>
                </button>
                <button className="fd-btn" type="button" data-variant="outline" data-size="sm" data-action="export">
                  <svg className="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download" /></svg>
                  <span>Export</span>
                </button>
                <button className="fd-btn" type="button" data-variant="danger-soft" data-size="sm" data-action="delete">
                  <svg className="fd-icon" data-icon="trash-2" aria-hidden="true"><use href="#i-trash-2" /></svg>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </section>
        <section className="fd-band" data-pad="sm" data-grow="" aria-label="Demo state">
          <div className="fd-row" data-wrap="" data-justify="between">
            <span className="fd-eyebrow">Demo state</span>
            <div className="fd-segmented" data-size="sm" id="logs-state-switch" role="radiogroup" aria-label="Table state">
              <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="loaded">Loaded</button>
              <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="loading">Loading</button>
              <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="empty">Empty</button>
              <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="error">Error</button>
            </div>
          </div>
        </section>
      </div>
<div className="fd-menu" id="menu-log-row" popover="" role="menu" aria-label="Request actions">
        <button className="fd-menu-item" type="button" data-value="open">
          <svg className="fd-icon" data-icon="panel-right" aria-hidden="true"><use href="#i-panel-right" /></svg>
          <span className="fd-menu-item-label">Open details</span>
        </button>
        <button className="fd-menu-item" type="button" data-value="copy">
          <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
          <span className="fd-menu-item-label">Copy request ID</span>
        </button>
        <button className="fd-menu-item" type="button" data-value="retry">
          <svg className="fd-icon" data-icon="rotate-ccw" aria-hidden="true"><use href="#i-rotate-ccw" /></svg>
          <span className="fd-menu-item-label">Retry request</span>
        </button>
        <hr className="fd-menu-sep" />
        <button className="fd-menu-item" type="button" data-value="delete" data-tone="danger">
          <svg className="fd-icon" data-icon="trash-2" aria-hidden="true"><use href="#i-trash-2" /></svg>
          <span className="fd-menu-item-label">Delete log</span>
        </button>
      </div>
<div className="fd-popover" id="pop-endpoint" popover="" data-fd-filter-list="" data-filter="endpoint" data-size="sm" aria-label="Filter by endpoint">
        <label className="fd-popover-search">
          <svg className="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search" /></svg>
          <input type="search" placeholder="Filter endpoints" aria-label="Filter endpoints" data-fd-filter-search="" autoComplete="off" />
        </label>
        <div className="fd-popover-body">
          <div className="fd-checklist" aria-label="Endpoints">
            <div className="fd-checklist-item" data-value="/scrape">
              <span className="fd-checklist-label fd-mono">/scrape</span>
              <span className="fd-checklist-count">548</span>
            </div>
            <div className="fd-checklist-item" data-value="/search">
              <span className="fd-checklist-label fd-mono">/search</span>
              <span className="fd-checklist-count">231</span>
            </div>
            <div className="fd-checklist-item" data-value="/crawl">
              <span className="fd-checklist-label fd-mono">/crawl</span>
              <span className="fd-checklist-count">132</span>
            </div>
            <div className="fd-checklist-item" data-value="/extract">
              <span className="fd-checklist-label fd-mono">/extract</span>
              <span className="fd-checklist-count">118</span>
            </div>
            <div className="fd-checklist-item" data-value="/map">
              <span className="fd-checklist-label fd-mono">/map</span>
              <span className="fd-checklist-count">74</span>
            </div>
            <div className="fd-checklist-item" data-value="/agent">
              <span className="fd-checklist-label fd-mono">/agent</span>
              <span className="fd-checklist-count">63</span>
            </div>
            <div className="fd-checklist-item" data-value="/parse">
              <span className="fd-checklist-label fd-mono">/parse</span>
              <span className="fd-checklist-count">38</span>
            </div>
          </div>
          <p className="fd-checklist-empty" hidden>No endpoints match “<span data-fd-filter-query=""></span>”</p>
        </div>
        <div className="fd-popover-foot">
          <span data-fd-filter-summary="">None selected</span>
          <button className="fd-btn-text" type="button" data-fd-filter-clear="">Clear</button>
        </div>
      </div>
<div className="fd-popover" id="pop-key" popover="" data-fd-filter-list="" data-filter="key" data-size="sm" aria-label="Filter by API key">
        <div className="fd-popover-body">
          <div className="fd-checklist" aria-label="API keys">
            <div className="fd-checklist-item" data-value="Production crawler">
              <span className="fd-checklist-label">Production crawler</span>
              <span className="fd-checklist-count">812</span>
            </div>
            <div className="fd-checklist-item" data-value="Default">
              <span className="fd-checklist-label">Default</span>
              <span className="fd-checklist-count">276</span>
            </div>
            <div className="fd-checklist-item" data-value="CI">
              <span className="fd-checklist-label">CI</span>
              <span className="fd-checklist-count">116</span>
            </div>
          </div>
        </div>
        <div className="fd-popover-foot">
          <span data-fd-filter-summary="">None selected</span>
          <button className="fd-btn-text" type="button" data-fd-filter-clear="">Clear</button>
        </div>
      </div>
<div className="fd-popover" id="pop-status" popover="" data-fd-filter-list="" data-filter="status" data-size="sm" aria-label="Filter by status">
        <div className="fd-popover-body">
          <div className="fd-checklist" aria-label="Statuses">
            <div className="fd-checklist-item" data-value="success">
              <span className="fd-checklist-label">Success</span>
              <span className="fd-checklist-count">1,019</span>
            </div>
            <div className="fd-checklist-item" data-value="failed">
              <span className="fd-checklist-label">Failed</span>
              <span className="fd-checklist-count">62</span>
            </div>
            <div className="fd-checklist-item" data-value="running">
              <span className="fd-checklist-label">Running</span>
              <span className="fd-checklist-count">3</span>
            </div>
            <div className="fd-checklist-item" data-value="queued">
              <span className="fd-checklist-label">Queued</span>
              <span className="fd-checklist-count">5</span>
            </div>
            <div className="fd-checklist-item" data-value="cached">
              <span className="fd-checklist-label">Cached</span>
              <span className="fd-checklist-count">115</span>
            </div>
          </div>
        </div>
        <div className="fd-popover-foot">
          <span data-fd-filter-summary="">None selected</span>
          <button className="fd-btn-text" type="button" data-fd-filter-clear="">Clear</button>
        </div>
      </div>
<div className="fd-popover" id="pop-range" popover="" data-size="auto" aria-label="Date range">
        <div className="fd-daterange" data-fd-daterange="" data-preset="7d" data-max="today">
          <div className="fd-daterange-presets" role="group" aria-label="Presets">
            <button className="fd-daterange-preset" type="button" data-preset="24h">Last 24 hours</button>
            <button className="fd-daterange-preset" type="button" data-preset="7d">Last 7 days</button>
            <button className="fd-daterange-preset" type="button" data-preset="30d">Last 30 days</button>
            <button className="fd-daterange-preset" type="button" data-preset="month">This month</button>
            <button className="fd-daterange-preset" type="button" data-preset="custom">Custom</button>
          </div>
          <div className="fd-daterange-main">
            <div className="fd-calendar"></div>
          </div>
          <div className="fd-daterange-foot">
            <span className="fd-daterange-summary" data-fd-daterange-summary=""></span>
            <button className="fd-btn" type="button" data-size="sm" data-variant="ghost" data-fd-daterange-cancel="">Cancel</button>
            <button className="fd-btn" type="button" data-size="sm" data-variant="primary" data-fd-daterange-apply="">Apply</button>
          </div>
        </div>
      </div>
<dialog className="fd-sheet" id="sheet-log" data-side="right" data-size="md">
        <div className="fd-sheet-head">
          <div className="fd-sheet-bar">
            <span className="fd-status" id="lg-status" data-tone="success" data-variant="pill" data-size="sm">200</span>
            <h2 className="fd-sheet-title">
              <span className="fd-mono" id="lg-id">req_8f3a21</span>
            </h2>
            <button className="fd-btn" type="button" id="lg-copy" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-tooltip="Copy request ID" aria-label="Copy request ID">
              <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
            </button>
            <button className="fd-btn fd-sheet-close" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-dialog-close="" aria-label="Close">
              <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
            </button>
          </div>
          <p className="fd-sheet-desc" id="lg-desc"></p>
          <div className="fd-tabs" role="tablist" aria-label="Request detail" data-size="sm">
            <button className="fd-tab" type="button" role="tab" aria-selected="true" aria-controls="lg-overview">Overview</button>
            <button className="fd-tab" type="button" role="tab" aria-selected="false" aria-controls="lg-request">Request</button>
            <button className="fd-tab" type="button" role="tab" aria-selected="false" aria-controls="lg-response">Response</button>
            <button className="fd-tab" type="button" role="tab" aria-selected="false" aria-controls="lg-timeline">Timeline</button>
          </div>
        </div>
        <div className="fd-sheet-body">
          <div className="fd-tab-panel fd-stack" role="tabpanel" id="lg-overview"></div>
          <div className="fd-tab-panel" role="tabpanel" id="lg-request" hidden>
            <div className="fd-json" id="lg-request-json" data-depth="3" data-json="{}"></div>
          </div>
          <div className="fd-tab-panel" role="tabpanel" id="lg-response" hidden>
            <div className="fd-json" id="lg-response-json" data-depth="3" data-json="{}"></div>
          </div>
          <div className="fd-tab-panel" role="tabpanel" id="lg-timeline" hidden>
            <ol className="fd-timeline" id="lg-timeline-list"></ol>
          </div>
        </div>
        <div className="fd-sheet-foot">
          <a className="fd-btn" id="lg-playground" data-variant="ghost" data-start="" href="playground.html?endpoint=scrape">
            <svg className="fd-icon" data-icon="play" aria-hidden="true"><use href="#i-play" /></svg>
            <span>Open in playground</span>
          </a>
          <button className="fd-btn" type="button" id="lg-retry" data-variant="primary">
            <svg className="fd-icon" data-icon="rotate-ccw" aria-hidden="true"><use href="#i-rotate-ccw" /></svg>
            <span>Retry</span>
          </button>
        </div>
      </dialog>
    </LogsScreen>
  );
}
