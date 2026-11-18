// The overview screen: the .fd-page of templates/overview.html, converted to JSX per spec/EXPORT.md (a server
// component: plain Fire markup, no Fire script). OverviewScreen renders the <main class="fd-page"> and runs the screen's
// behaviour in the browser once Fire has loaded.
import type { Metadata } from 'next';
import { jsonForScript } from 'fire-design/react';
import { askedState, type PageState } from '../page-state';
import { OverviewScreen } from './overview-screen';

export const metadata: Metadata = { title: 'Overview · Ember' };

const DATA_1 = {
  "labels": [
    "Nov 08",
    "Nov 09",
    "Nov 10",
    "Nov 11",
    "Nov 12",
    "Nov 13",
    "Nov 14"
  ],
  "titles": [
    "Nov 08, 2026",
    "Nov 09, 2026",
    "Nov 10, 2026",
    "Nov 11, 2026",
    "Nov 12, 2026",
    "Nov 13, 2026",
    "Nov 14, 2026"
  ],
  "yFormat": "number",
  "series": [
    {
      "name": "Credits used",
      "values": [
        118,
        164,
        142,
        201,
        187,
        66,
        108
      ]
    }
  ]
};

type Region = 'chart' | 'stats' | 'activity';

// ?state= picks the state of the first paint: `loading` keeps the skeletons, `empty` is a team with no traffic yet,
// `error` is the recent-requests section failing alone, with Retry, while the rest of the screen is up to date.
export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ state?: string | string[] }> }) {
  const state: PageState = askedState((await searchParams).state, ['loading', 'empty', 'error'] as const) ?? 'ready';
  /** What a region shows. While `loading` the data blocks stay under the skeletons, as the markup is written. */
  const region = (name: Region): PageState => (state === 'empty' ? 'empty' : state === 'error' && name === 'activity' ? 'error' : 'ready');
  return (
    <OverviewScreen state={state}>
      <div className="fd-frame">
        {/* 1 · Announcement */}
        <section className="fd-band fd-rise" data-pad="sm" aria-label="Announcement" data-fd-vars="--fd-i: 0" suppressHydrationWarning>
          <h1 className="fd-sr-only">Overview</h1>
          <div className="fd-announce">
            <div className="fd-announce-art" data-side="start">
              <div className="fd-ascii" data-fd-ascii="flame" data-tone="contrast" data-fade="right" data-origin="0.42,1" aria-hidden="true"></div>
            </div>
            <div className="fd-announce-art" data-side="end">
              <div className="fd-ascii" data-fd-ascii="flame" data-tone="contrast" data-fade="left" data-origin="0.58,1" data-seed="ember-east" aria-hidden="true"></div>
            </div>
            <div className="fd-noise" aria-hidden="true"></div>
            <div className="fd-announce-body">
              <span className="fd-announce-tag"><svg className="fd-icon" data-icon="radar" aria-hidden="true"><use href="#i-radar" /></svg>Monitors are live</span>
              <h2 className="fd-h1">Pages change. Your agent should know first.</h2>
              <p className="fd-body-lg">Point a monitor at any URL, decide what counts as a change, and get a webhook with the diff.</p>
              <div className="fd-announce-actions">
                <a className="fd-btn" data-variant="outline" href="monitoring.html">
                  <span>Create a monitor</span>
                  <svg className="fd-icon" data-icon="arrow-right" aria-hidden="true" data-nudge=""><use href="#i-arrow-right" /></svg>
                </a>
                <a className="fd-btn" data-variant="ghost" href="https://docs.ember.dev/changelog" target="_blank" rel="noopener">
                  <span>Read the announcement</span>
                </a>
              </div>
            </div>
          </div>
        </section>
        {/* 2 · Credits chart + API key and agent setup */}
        <section className="fd-band fd-rise" data-pad="none" aria-label="Credits and setup" data-fd-vars="--fd-i: 1" suppressHydrationWarning>
          <div className="fd-split" data-fd-vars="--fd-panel-w: var(--fd-size-xl)" suppressHydrationWarning>
            <div className="fd-split-main">
              <div id="ov-chart" data-fd-loading="true">
                <div className="fd-skeleton-chart"></div>
                <div className="fd-stack" data-gap="4" data-when="ready" hidden={region('chart') !== 'ready'}>
                  <div className="fd-row" data-justify="between" data-align="start">
                    <div>
                      <h2 className="fd-title">Credits used · Last 7 days</h2>
                      <p className="fd-small fd-muted">Across every key in Quarry Labs</p>
                    </div>
                    <span className="fd-stat">986</span>
                  </div>
                  <div className="fd-chart" data-fd-chart="area" data-height="264" data-label="Credits used per day, Nov 8 to Nov 14">
                    <script type="application/json" dangerouslySetInnerHTML={{ __html: jsonForScript(DATA_1) }} />
                  </div>
                </div>
                <div className="fd-empty" data-when="empty" aria-label="Credits used" hidden={region('chart') !== 'empty'}>
                  <span className="fd-empty-icon"><svg className="fd-icon" data-icon="chart-column" aria-hidden="true"><use href="#i-chart-column" /></svg></span>
                  <h3 className="fd-empty-title">No credits used yet</h3>
                  <p className="fd-empty-text">Credits used per day appear here after your first request. A test request in the playground costs 1 credit.</p>
                  <div className="fd-empty-actions"><a className="fd-btn" data-variant="outline" href="playground.html?endpoint=scrape"><svg className="fd-icon" data-icon="play" aria-hidden="true"><use href="#i-play" /></svg><span>Send a test request</span></a></div>
                </div>
              </div>
            </div>
            <div className="fd-panel">
              <div className="fd-stack" data-gap="3">
                <div>
                  <h2 className="fd-title">API key</h2>
                  <p className="fd-small fd-muted">Start scraping right away. Keep it out of client-side code.</p>
                </div>
                <div className="fd-secret" data-value="em-227cd9a41c3b8e07f52d6a9144b0f16" data-noun="API key" role="group" aria-label="Default API key">
                  <code className="fd-secret-value" data-tone="accent"></code>
                  <div className="fd-secret-actions">
                    <button type="button" className="fd-btn" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-field-action="reveal" aria-label="Show API key">
                      <svg className="fd-icon" data-icon="eye" aria-hidden="true"><use href="#i-eye" /></svg>
                    </button>
                    <button type="button" className="fd-btn" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-field-action="copy" aria-label="Copy API key">
                      <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
                    </button>
                  </div>
                </div>
              </div>
              <hr className="fd-divider" />
              <div className="fd-stack" data-gap="4">
                <div className="fd-row" data-justify="between" data-align="start">
                  <div className="fd-grow">
                    <h2 className="fd-title">Agent integrations</h2>
                    <p className="fd-small fd-muted">Give your AI agents web data.</p>
                  </div>
                  <a className="fd-btn" data-variant="accent-soft" href="install.html">
                    <svg className="fd-icon" data-icon="bot" aria-hidden="true"><use href="#i-bot" /></svg>
                    <span>Set up an agent</span>
                  </a>
                </div>
                <div className="fd-stack" data-gap="1-5">
                  <span className="fd-eyebrow">Skill</span>
                  <div className="fd-snippet" data-variant="accent">
                    <code className="fd-snippet-text"><span className="fd-snippet-dim">ember.dev/</span>agent-onboarding/<span className="fd-snippet-em">SKILL.md</span></code>
                    <button className="fd-snippet-copy" type="button" aria-label="Copy skill URL" data-copy="https://ember.dev/agent-onboarding/SKILL.md">
                      <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
                    </button>
                  </div>
                </div>
                <div className="fd-stack" data-gap="1-5">
                  <span className="fd-eyebrow">CLI</span>
                  <div className="fd-snippet">
                    <span className="fd-snippet-prompt" aria-hidden="true">$</span>
                    <code className="fd-snippet-text">npx -y ember-cli@latest init</code>
                    <button className="fd-snippet-copy" type="button" aria-label="Copy command">
                      <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
                    </button>
                  </div>
                </div>
                <div className="fd-copy-field" data-value="https://mcp.ember.dev/v2/mcp-oauth" data-noun="MCP URL">
                  <span className="fd-copy-field-label">MCP URL</span>
                  <div className="fd-copy-field-actions">
                    <button type="button" className="fd-btn" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-field-action="copy" aria-label="Copy MCP URL">
                      <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
                    </button>
                  </div>
                  <code className="fd-copy-field-value"></code>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* 3 · Stats strip */}
        <section className="fd-band fd-rise" data-pad="sm" aria-label="Last 24 hours" data-fd-vars="--fd-i: 2" suppressHydrationWarning>
          <div id="ov-stats" data-fd-loading="true">
            <div className="fd-skeleton-stat" data-count="4"></div>
            <div className="fd-stats" data-when="ready" hidden={region('stats') !== 'ready'}>
              <div className="fd-stat-tile">
                <span className="fd-stat-label">Requests · 24h</span>
                <div className="fd-stat-row">
                  <span className="fd-stat">4,812</span>
                  <span className="fd-stat-delta" data-tone="success" data-dir="up">12.4%</span>
                </div>
                <span className="fd-stat-sub">vs 4,281 yesterday</span>
                <div className="fd-stat-slot">
                  <span className="fd-sparkline" data-fluid="" data-area="" data-height="28" data-values="212,240,228,264,251,298,284,310,296,342,331,356" data-label="Requests per two hours, last 24 hours"></span>
                </div>
              </div>
              <div className="fd-stat-tile">
                <span className="fd-stat-label">Success rate</span>
                <div className="fd-stat-row">
                  <span className="fd-stat">99.2%</span>
                  <span className="fd-stat-delta" data-tone="success" data-dir="up">0.3%</span>
                </div>
                <span className="fd-stat-sub">38 failed of 4,812</span>
              </div>
              <div className="fd-stat-tile">
                <span className="fd-stat-label">p95 latency</span>
                <div className="fd-stat-row">
                  <span className="fd-stat">1.84 s</span>
                  <span className="fd-stat-delta" data-tone="success" data-dir="down">8.1%</span>
                </div>
                <span className="fd-stat-sub">faster than last week</span>
              </div>
              <div className="fd-stat-tile">
                <span className="fd-stat-label">Active monitors</span>
                <div className="fd-stat-row">
                  <span className="fd-stat">12</span>
                  <span className="fd-stat-delta" data-tone="success" data-dir="up">2</span>
                </div>
                <span className="fd-stat-sub">9 checked in the last hour</span>
              </div>
            </div>
            <div className="fd-empty" data-size="sm" data-when="empty" aria-label="Last 24 hours" hidden={region('stats') !== 'empty'}>
              <span className="fd-empty-icon"><svg className="fd-icon" data-icon="activity" aria-hidden="true"><use href="#i-activity" /></svg></span>
              <h3 className="fd-empty-title">Nothing in the last 24 hours</h3>
              <p className="fd-empty-text">Requests, success rate, latency and active monitors show here once Quarry Labs sends traffic.</p>
            </div>
          </div>
        </section>
        {/* 4 · Get started */}
        <section className="fd-band" aria-label="Get started">
          <div className="fd-stack" data-gap="4">
            <div>
              <h2 className="fd-title">Get started</h2>
              <p className="fd-small fd-muted">Three ways to see your first result in under a minute.</p>
            </div>
            <div className="fd-grid">
              <a className="fd-card" data-interactive="" href="playground.html?endpoint=scrape">
                <svg className="fd-icon fd-card-arrow" data-icon="arrow-up-right" aria-hidden="true"><use href="#i-arrow-up-right" /></svg>
                <div className="fd-card-head">
                  <span className="fd-tile" data-size="36" data-tone="accent">
                    <svg className="fd-icon" data-icon="file-text" aria-hidden="true"><use href="#i-file-text" /></svg>
                  </span>
                  <div className="fd-card-heading">
                    <span className="fd-card-name">Scrape a page</span>
                    <span className="fd-card-meta fd-mono">/scrape · 1 credit</span>
                  </div>
                </div>
                <p className="fd-card-text">Turn any URL into clean markdown, HTML or a screenshot.</p>
              </a>
              <a className="fd-card" data-interactive="" href="playground.html?endpoint=crawl">
                <svg className="fd-icon fd-card-arrow" data-icon="arrow-up-right" aria-hidden="true"><use href="#i-arrow-up-right" /></svg>
                <div className="fd-card-head">
                  <span className="fd-tile" data-size="36">
                    <svg className="fd-icon" data-icon="network" aria-hidden="true"><use href="#i-network" /></svg>
                  </span>
                  <div className="fd-card-heading">
                    <span className="fd-card-name">Start a crawl</span>
                    <span className="fd-card-meta fd-mono">/crawl · 1 credit per page</span>
                  </div>
                </div>
                <p className="fd-card-text">Follow every link under a path and get each page back as markdown.</p>
              </a>
              <a className="fd-card" data-interactive="" href="agent.html">
                <svg className="fd-icon fd-card-arrow" data-icon="arrow-up-right" aria-hidden="true"><use href="#i-arrow-up-right" /></svg>
                <div className="fd-card-head">
                  <span className="fd-tile" data-size="36">
                    <svg className="fd-icon" data-icon="wand-sparkles" aria-hidden="true"><use href="#i-wand-sparkles" /></svg>
                  </span>
                  <div className="fd-card-heading">
                    <span className="fd-card-name">Ask the agent</span>
                    <span className="fd-card-meta fd-mono">/agent · about 40 credits</span>
                  </div>
                </div>
                <p className="fd-card-text">Describe the data you need and let Ember browse, click and extract it.</p>
              </a>
            </div>
          </div>
        </section>
        {/* 5 · Recent activity */}
        <section className="fd-band" data-pad="sm" aria-label="Recent activity heading">
          <div className="fd-page-head">
            <div className="fd-page-head-text">
              <h2 className="fd-page-head-title">Recent activity</h2>
              <p className="fd-page-head-desc">Your last six requests across every key.</p>
            </div>
            <div className="fd-page-head-actions">
              <a className="fd-btn-text" href="logs.html">
                <span>See all in Activity logs</span>
                <svg className="fd-icon" data-icon="arrow-right" aria-hidden="true" data-nudge=""><use href="#i-arrow-right" /></svg>
              </a>
            </div>
          </div>
        </section>
        <section className="fd-band" data-pad="none" data-surface="surface" aria-label="Recent requests">
          <div id="ov-activity" data-fd-loading="true">
            <div className="fd-skeleton-table" data-rows="6" data-cols="5"></div>
            <div className="fd-table-wrap" data-when="ready" hidden={region('activity') !== 'ready'}>
              <div className="fd-table-scroll">
                <table className="fd-table" data-stack="" aria-label="Recent requests">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Endpoint</th>
                      <th>Target</th>
                      <th>Status</th>
                      <th data-num="">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr data-value="req_8f3a21">
                      <td>Nov 14, 4:29 PM</td>
                      <td data-mono="" data-stack-title="">/scrape</td>
                      <td data-mono="" data-muted="">
                        <span className="fd-table-trunc">docs.quarry.dev/changelog</span>
                      </td>
                      <td>
                        <span className="fd-status" data-tone="success">200 OK</span>
                      </td>
                      <td data-num="">1</td>
                    </tr>
                    <tr data-value="req_7c19be">
                      <td>Nov 14, 4:12 PM</td>
                      <td data-mono="" data-stack-title="">/crawl</td>
                      <td data-mono="" data-muted="">
                        <span className="fd-table-trunc">quarry.dev/docs</span>
                      </td>
                      <td>
                        <span className="fd-status" data-tone="info" data-live="">Running</span>
                      </td>
                      <td data-num="">48</td>
                    </tr>
                    <tr data-value="req_5d02e4">
                      <td>Nov 14, 3:57 PM</td>
                      <td data-mono="" data-stack-title="">/search</td>
                      <td data-mono="" data-muted="">
                        <span className="fd-table-trunc">“vector database pricing 2026”</span>
                      </td>
                      <td>
                        <span className="fd-status" data-tone="success">200 OK</span>
                      </td>
                      <td data-num="">5</td>
                    </tr>
                    <tr data-value="req_41b9a0">
                      <td>Nov 14, 3:41 PM</td>
                      <td data-mono="" data-stack-title="">/scrape</td>
                      <td data-mono="" data-muted="">
                        <span className="fd-table-trunc">status.quarry.dev</span>
                      </td>
                      <td>
                        <span className="fd-status" data-tone="warning">429 Rate limited</span>
                      </td>
                      <td data-num="">0</td>
                    </tr>
                    <tr data-value="req_3a77f1">
                      <td>Nov 14, 3:20 PM</td>
                      <td data-mono="" data-stack-title="">/agent</td>
                      <td data-mono="" data-muted="">
                        <span className="fd-table-trunc">Compare GPU cloud prices</span>
                      </td>
                      <td>
                        <span className="fd-status" data-tone="success">200 OK</span>
                      </td>
                      <td data-num="">38</td>
                    </tr>
                    <tr data-value="req_2e5c88">
                      <td>Nov 14, 2:58 PM</td>
                      <td data-mono="" data-stack-title="">/extract</td>
                      <td data-mono="" data-muted="">
                        <span className="fd-table-trunc">shop.northwind.dev/p/8812</span>
                      </td>
                      <td>
                        <span className="fd-status" data-tone="danger">403 Blocked</span>
                      </td>
                      <td data-num="">0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="fd-empty" data-when="empty" aria-label="Recent requests" hidden={region('activity') !== 'empty'}>
              <span className="fd-empty-icon"><svg className="fd-icon" data-icon="list" aria-hidden="true"><use href="#i-list" /></svg></span>
              <h3 className="fd-empty-title">No requests yet</h3>
              <p className="fd-empty-text">Your last six requests appear here a few seconds after they finish. Send one from the playground or with your API key.</p>
              <div className="fd-empty-actions"><a className="fd-btn" data-variant="outline" href="playground.html?endpoint=scrape"><svg className="fd-icon" data-icon="play" aria-hidden="true"><use href="#i-play" /></svg><span>Open the playground</span></a></div>
            </div>
            <div className="fd-empty" data-tone="danger" data-when="error" role="alert" aria-label="Recent requests" hidden={region('activity') !== 'error'}>
              <span className="fd-empty-icon"><svg className="fd-icon" data-icon="triangle-alert" aria-hidden="true"><use href="#i-triangle-alert" /></svg></span>
              <h3 className="fd-empty-title">Couldn’t load recent requests</h3>
              <p className="fd-empty-text">The activity service did not answer within 10 seconds. Credits, key and monitors above are up to date.</p>
              <div className="fd-empty-actions"><button className="fd-btn" type="button" id="ov-activity-retry"><svg className="fd-icon" data-icon="refresh-cw" aria-hidden="true"><use href="#i-refresh-cw" /></svg><span>Retry</span></button></div>
            </div>
          </div>
        </section>
        {/* 6 · What's new */}
        <section className="fd-band" data-pad="none" data-grow="" aria-label="What’s new">
          <div className="fd-split" data-side="start">
            <div className="fd-panel">
              <div>
                <h2 className="fd-title">What’s new</h2>
                <p className="fd-small fd-muted">Recent changes to Ember, newest first.</p>
              </div>
              <div className="fd-row" data-gap="4" data-wrap="">
                <button className="fd-btn-text" type="button" data-fd-dialog-open="dlg-whats-new">
                  <svg className="fd-icon" data-icon="sparkles" aria-hidden="true"><use href="#i-sparkles" /></svg>
                  <span>What’s new</span>
                </button>
                <a className="fd-btn-text" href="https://docs.ember.dev/changelog" target="_blank" rel="noopener">
                  <span>Read the changelog</span>
                  <svg className="fd-icon" data-icon="arrow-up-right" aria-hidden="true" data-nudge=""><use href="#i-arrow-up-right" /></svg>
                </a>
              </div>
            </div>
            <div className="fd-split-main">
              <div>
                <div className="fd-feature-row">
                  <span className="fd-tile" data-shape="wide" data-tone="accent">12x</span>
                  <div className="fd-feature-row-text">
                    <span className="fd-feature-row-title">Agent runs cost 12x fewer credits</span>
                    <span className="fd-feature-row-desc">Nov 12 · A typical research run is now 40 credits, down from 480.</span>
                  </div>
                </div>
                <div className="fd-feature-row">
                  <span className="fd-tile" data-shape="wide" data-tone="accent">
                    <svg className="fd-icon" data-icon="radar" aria-hidden="true"><use href="#i-radar" /></svg>
                  </span>
                  <div className="fd-feature-row-text">
                    <span className="fd-feature-row-title">Monitors send the diff</span>
                    <span className="fd-feature-row-desc">Nov 5 · Webhooks and emails now carry exactly what changed on the page.</span>
                  </div>
                </div>
                <div className="fd-feature-row">
                  <span className="fd-tile" data-shape="wide" data-tone="accent">
                    <svg className="fd-icon" data-icon="paperclip" aria-hidden="true"><use href="#i-paperclip" /></svg>
                  </span>
                  <div className="fd-feature-row-text">
                    <span className="fd-feature-row-title">/parse reads scanned PDFs</span>
                    <span className="fd-feature-row-desc">Oct 29 · Text is recovered from images, with page numbers on every block.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
<dialog className="fd-dialog" id="dlg-whats-new" data-size="md">
        <section data-step="monitors">
          <div className="fd-dialog-head">
            <p className="fd-eyebrow" data-tone="accent">What’s new</p>
            <h2 className="fd-h3 fd-dialog-title">Monitors are live</h2>
            <p className="fd-dialog-desc">Watch any page and hear the moment it changes.</p>
            <button className="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-dialog-close="" aria-label="Close">
              <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
            </button>
          </div>
          <div className="fd-dialog-body">
            <ul className="fd-dialog-features">
              <li className="fd-dialog-feature">
                <span className="fd-tile" data-shape="wide" data-tone="accent">
                  <svg className="fd-icon" data-icon="radar" aria-hidden="true"><use href="#i-radar" /></svg>
                </span>
                <div>
                  <p className="fd-dialog-feature-title">Any page, any schedule</p>
                  <p className="fd-dialog-feature-text">Check every 10 minutes or once a day. Each check costs 1 credit.</p>
                </div>
              </li>
              <li className="fd-dialog-feature">
                <span className="fd-tile" data-shape="wide" data-tone="accent">
                  <svg className="fd-icon" data-icon="webhook" aria-hidden="true"><use href="#i-webhook" /></svg>
                </span>
                <div>
                  <p className="fd-dialog-feature-title">A webhook with the diff</p>
                  <p className="fd-dialog-feature-text">Your endpoint receives what changed, not the whole page again.</p>
                </div>
              </li>
              <li className="fd-dialog-feature">
                <span className="fd-tile" data-shape="wide" data-tone="accent">
                  <svg className="fd-icon" data-icon="list-filter" aria-hidden="true"><use href="#i-list-filter" /></svg>
                </span>
                <div>
                  <p className="fd-dialog-feature-title">Quiet by default</p>
                  <p className="fd-dialog-feature-text">Ads, timestamps and cookie banners never count as a change.</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="fd-dialog-foot">
            <button className="fd-btn" type="button" data-variant="primary" data-block="" data-fd-dialog-step="next">Next</button>
            <div className="fd-dialog-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </section>
        <section data-step="agent" hidden>
          <div className="fd-dialog-head">
            <p className="fd-eyebrow" data-tone="accent">What’s new</p>
            <h2 className="fd-h3 fd-dialog-title">Agent runs, rebuilt</h2>
            <p className="fd-dialog-desc">Same API call. Faster, cheaper runs with sources you can check.</p>
            <button className="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-dialog-close="" aria-label="Close">
              <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
            </button>
          </div>
          <div className="fd-dialog-body">
            <ul className="fd-dialog-features">
              <li className="fd-dialog-feature">
                <span className="fd-tile" data-shape="wide" data-tone="accent">12x</span>
                <div>
                  <p className="fd-dialog-feature-title">Fewer credits</p>
                  <p className="fd-dialog-feature-text">A typical research run now costs 40 credits, down from 480.</p>
                </div>
              </li>
              <li className="fd-dialog-feature">
                <span className="fd-tile" data-shape="wide" data-tone="accent">3x</span>
                <div>
                  <p className="fd-dialog-feature-title">Faster answers</p>
                  <p className="fd-dialog-feature-text">Most runs finish in under a minute, even across dozens of pages.</p>
                </div>
              </li>
              <li className="fd-dialog-feature">
                <span className="fd-tile" data-shape="wide" data-tone="accent">
                  <svg className="fd-icon" data-icon="quote" aria-hidden="true"><use href="#i-quote" /></svg>
                </span>
                <div>
                  <p className="fd-dialog-feature-title">Cited sources</p>
                  <p className="fd-dialog-feature-text">Every claim links to the page it came from.</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="fd-dialog-foot">
            <button className="fd-btn" type="button" data-variant="primary" data-block="" data-fd-dialog-step="next">Next</button>
            <div className="fd-dialog-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </section>
        <section data-step="use" hidden>
          <div className="fd-dialog-head">
            <p className="fd-eyebrow" data-tone="accent">What’s new</p>
            <h2 className="fd-h3 fd-dialog-title">Use it from your agent</h2>
            <p className="fd-dialog-desc">Point any MCP client at Ember and the new runs are there.</p>
            <button className="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-dialog-close="" aria-label="Close">
              <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
            </button>
          </div>
          <div className="fd-dialog-body">
            <ul className="fd-dialog-features">
              <li className="fd-dialog-feature">
                <span className="fd-tile" data-shape="wide" data-tone="accent">
                  <svg className="fd-icon" data-icon="plug" aria-hidden="true"><use href="#i-plug" /></svg>
                </span>
                <div>
                  <p className="fd-dialog-feature-title">One endpoint</p>
                  <p className="fd-dialog-feature-text"><span className="fd-code">/agent</span> accepts the same body as before. Nothing to migrate.</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="fd-dialog-foot">
            <a className="fd-btn" data-variant="primary" data-block="" href="install.html">Add Ember to your agent</a>
            <div className="fd-dialog-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </section>
      </dialog>
    </OverviewScreen>
  );
}
