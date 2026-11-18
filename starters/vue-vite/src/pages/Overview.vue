<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { texture } from 'fire-design';
import { jsonForScript } from '../fire-export';
import { LOAD_MS, SIMULATE_LOAD } from '../demo';

// The data of the credits chart (M2: JSON for a <script> goes through jsonForScript, in a <component is="script">).
const data1 = jsonForScript({
  labels: [
    'Nov 08',
    'Nov 09',
    'Nov 10',
    'Nov 11',
    'Nov 12',
    'Nov 13',
    'Nov 14'
  ],
  titles: [
    'Nov 08, 2026',
    'Nov 09, 2026',
    'Nov 10, 2026',
    'Nov 11, 2026',
    'Nov 12, 2026',
    'Nov 13, 2026',
    'Nov 14, 2026'
  ],
  yFormat: 'number',
  series: [
    {
      name: 'Credits used',
      values: [
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
});

// The regions start as skeletons (data-fd-loading="true"); after a short first load they show their content.
// Fire owns `data-fd-loading` and `aria-busy` once it runs, so they are changed with Fire's API, never bound.
let timer = 0;
onMounted(() => {
  if (!SIMULATE_LOAD) return;
  timer = window.setTimeout(() => {
    for (const id of ['ov-chart', 'ov-stats', 'ov-activity']) texture.setLoading(document.getElementById(id), false);
  }, LOAD_MS);
});
onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <div class="fd-frame">

    <!-- 1 · Announcement -->
    <section class="fd-band fd-rise" data-pad="sm" aria-label="Announcement" data-fd-vars="--fd-i: 0">
      <h1 class="fd-sr-only">Overview</h1>
      <div class="fd-announce">
        <div class="fd-announce-art" data-side="start"><div class="fd-ascii" data-fd-ascii="flame" data-tone="contrast" data-fade="right" data-origin="0.42,1" aria-hidden="true"></div></div>
        <div class="fd-announce-art" data-side="end"><div class="fd-ascii" data-fd-ascii="flame" data-tone="contrast" data-fade="left" data-origin="0.58,1" data-seed="ember-east" aria-hidden="true"></div></div>
        <div class="fd-noise" aria-hidden="true"></div>
        <div class="fd-announce-body">
          <span class="fd-announce-tag"><svg class="fd-icon" data-icon="radar" aria-hidden="true"><use href="#i-radar"></use></svg>Monitors are live</span>
          <h2 class="fd-h1">Pages change. Your agent should know first.</h2>
          <p class="fd-body-lg">Point a monitor at any URL, decide what counts as a change, and get a webhook with the diff.</p>
          <div class="fd-announce-actions">
            <a class="fd-btn" data-variant="outline" href="monitoring.html"><span>Create a monitor</span><svg class="fd-icon" data-icon="arrow-right" aria-hidden="true" data-nudge><use href="#i-arrow-right"></use></svg></a>
            <a class="fd-btn" data-variant="ghost" href="https://docs.ember.dev/changelog" target="_blank" rel="noopener"><span>Read the announcement</span></a>
          </div>
        </div>
      </div>
    </section>

    <!-- 2 · Credits chart + API key and agent setup -->
    <section class="fd-band fd-rise" data-pad="none" aria-label="Credits and setup" data-fd-vars="--fd-i: 1">
      <div class="fd-split" data-fd-vars="--fd-panel-w: var(--fd-size-xl)">
        <div class="fd-split-main">
          <div id="ov-chart" data-fd-loading="true">
            <div class="fd-skeleton-chart"></div>
            <div class="fd-stack" data-gap="4">
              <div class="fd-row" data-justify="between" data-align="start">
                <div>
                  <h2 class="fd-title">Credits used · Last 7 days</h2>
                  <p class="fd-small fd-muted">Across every key in Quarry Labs</p>
                </div>
                <span class="fd-stat">986</span>
              </div>
              <div class="fd-chart" data-fd-chart="area" data-height="264" data-label="Credits used per day, Nov 8 to Nov 14">
                <component is="script" type="application/json" v-text="data1"></component>
              </div>
            </div>
          </div>
        </div>
        <div class="fd-panel">
          <div class="fd-stack" data-gap="3">
            <div>
              <h2 class="fd-title">API key</h2>
              <p class="fd-small fd-muted">Start scraping right away. Keep it out of client-side code.</p>
            </div>
            <div class="fd-secret" data-value="em-227cd9a41c3b8e07f52d6a9144b0f16" data-noun="API key" role="group" aria-label="Default API key">
              <code class="fd-secret-value" data-tone="accent"></code>
              <div class="fd-secret-actions">
                <button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-icon-only data-fd-field-action="reveal" aria-label="Show API key"><svg class="fd-icon" data-icon="eye" aria-hidden="true"><use href="#i-eye"></use></svg></button>
                <button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-icon-only data-fd-field-action="copy" aria-label="Copy API key"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg></button>
              </div>
            </div>
          </div>
          <hr class="fd-divider">
          <div class="fd-stack" data-gap="4">
            <div class="fd-row" data-justify="between" data-align="start">
              <div class="fd-grow">
                <h2 class="fd-title">Agent integrations</h2>
                <p class="fd-small fd-muted">Give your AI agents web data.</p>
              </div>
              <a class="fd-btn" data-variant="accent-soft" href="install.html"><svg class="fd-icon" data-icon="bot" aria-hidden="true"><use href="#i-bot"></use></svg><span>Set up an agent</span></a>
            </div>
            <div class="fd-stack" data-gap="1-5">
              <span class="fd-eyebrow">Skill</span>
              <div class="fd-snippet" data-variant="accent">
                <code class="fd-snippet-text"><span class="fd-snippet-dim">ember.dev/</span>agent-onboarding/<span class="fd-snippet-em">SKILL.md</span></code>
                <button class="fd-snippet-copy" type="button" aria-label="Copy skill URL" data-copy="https://ember.dev/agent-onboarding/SKILL.md"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg></button>
              </div>
            </div>
            <div class="fd-stack" data-gap="1-5">
              <span class="fd-eyebrow">CLI</span>
              <div class="fd-snippet">
                <span class="fd-snippet-prompt" aria-hidden="true">$</span>
                <code class="fd-snippet-text">npx -y ember-cli@latest init</code>
                <button class="fd-snippet-copy" type="button" aria-label="Copy command"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg></button>
              </div>
            </div>
            <div class="fd-copy-field" data-value="https://mcp.ember.dev/v2/mcp-oauth" data-noun="MCP URL">
              <span class="fd-copy-field-label">MCP URL</span>
              <div class="fd-copy-field-actions"><button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-icon-only data-fd-field-action="copy" aria-label="Copy MCP URL"><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg></button></div>
              <code class="fd-copy-field-value"></code>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3 · Stats strip -->
    <section class="fd-band fd-rise" data-pad="sm" aria-label="Last 24 hours" data-fd-vars="--fd-i: 2">
      <div id="ov-stats" data-fd-loading="true">
        <div class="fd-skeleton-stat" data-count="4"></div>
        <div class="fd-stats">
          <div class="fd-stat-tile">
            <span class="fd-stat-label">Requests · 24h</span>
            <div class="fd-stat-row"><span class="fd-stat">4,812</span><span class="fd-stat-delta" data-tone="success" data-dir="up">12.4%</span></div>
            <span class="fd-stat-sub">vs 4,281 yesterday</span>
            <div class="fd-stat-slot"><span class="fd-sparkline" data-fluid data-area data-height="28" data-values="212,240,228,264,251,298,284,310,296,342,331,356" data-label="Requests per two hours, last 24 hours"></span></div>
          </div>
          <div class="fd-stat-tile">
            <span class="fd-stat-label">Success rate</span>
            <div class="fd-stat-row"><span class="fd-stat">99.2%</span><span class="fd-stat-delta" data-tone="success" data-dir="up">0.3%</span></div>
            <span class="fd-stat-sub">38 failed of 4,812</span>
          </div>
          <div class="fd-stat-tile">
            <span class="fd-stat-label">p95 latency</span>
            <div class="fd-stat-row"><span class="fd-stat">1.84 s</span><span class="fd-stat-delta" data-tone="success" data-dir="down">8.1%</span></div>
            <span class="fd-stat-sub">faster than last week</span>
          </div>
          <div class="fd-stat-tile">
            <span class="fd-stat-label">Active monitors</span>
            <div class="fd-stat-row"><span class="fd-stat">12</span><span class="fd-stat-delta" data-tone="success" data-dir="up">2</span></div>
            <span class="fd-stat-sub">9 checked in the last hour</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 4 · Get started -->
    <section class="fd-band" aria-label="Get started">
      <div class="fd-stack" data-gap="4">
        <div>
          <h2 class="fd-title">Get started</h2>
          <p class="fd-small fd-muted">Three ways to see your first result in under a minute.</p>
        </div>
        <div class="fd-grid">
          <a class="fd-card" data-interactive href="playground.html?endpoint=scrape">
            <svg class="fd-icon fd-card-arrow" data-icon="arrow-up-right" aria-hidden="true"><use href="#i-arrow-up-right"></use></svg>
            <div class="fd-card-head"><span class="fd-tile" data-size="36" data-tone="accent"><svg class="fd-icon" data-icon="file-text" aria-hidden="true"><use href="#i-file-text"></use></svg></span>
              <div class="fd-card-heading"><span class="fd-card-name">Scrape a page</span><span class="fd-card-meta fd-mono">/scrape · 1 credit</span></div></div>
            <p class="fd-card-text">Turn any URL into clean markdown, HTML or a screenshot.</p>
          </a>
          <a class="fd-card" data-interactive href="playground.html?endpoint=crawl">
            <svg class="fd-icon fd-card-arrow" data-icon="arrow-up-right" aria-hidden="true"><use href="#i-arrow-up-right"></use></svg>
            <div class="fd-card-head"><span class="fd-tile" data-size="36"><svg class="fd-icon" data-icon="network" aria-hidden="true"><use href="#i-network"></use></svg></span>
              <div class="fd-card-heading"><span class="fd-card-name">Start a crawl</span><span class="fd-card-meta fd-mono">/crawl · 1 credit per page</span></div></div>
            <p class="fd-card-text">Follow every link under a path and get each page back as markdown.</p>
          </a>
          <a class="fd-card" data-interactive href="agent.html">
            <svg class="fd-icon fd-card-arrow" data-icon="arrow-up-right" aria-hidden="true"><use href="#i-arrow-up-right"></use></svg>
            <div class="fd-card-head"><span class="fd-tile" data-size="36"><svg class="fd-icon" data-icon="wand-sparkles" aria-hidden="true"><use href="#i-wand-sparkles"></use></svg></span>
              <div class="fd-card-heading"><span class="fd-card-name">Ask the agent</span><span class="fd-card-meta fd-mono">/agent · about 40 credits</span></div></div>
            <p class="fd-card-text">Describe the data you need and let Ember browse, click and extract it.</p>
          </a>
        </div>
      </div>
    </section>

    <!-- 5 · Recent activity -->
    <section class="fd-band" data-pad="sm" aria-label="Recent activity heading">
      <div class="fd-page-head">
        <div class="fd-page-head-text">
          <h2 class="fd-page-head-title">Recent activity</h2>
          <p class="fd-page-head-desc">Your last six requests across every key.</p>
        </div>
        <div class="fd-page-head-actions">
          <RouterLink class="fd-btn-text" to="/logs"><span>See all in Activity logs</span><svg class="fd-icon" data-icon="arrow-right" aria-hidden="true" data-nudge><use href="#i-arrow-right"></use></svg></RouterLink>
        </div>
      </div>
    </section>
    <section class="fd-band" data-pad="none" data-surface="surface" aria-label="Recent requests">
      <div id="ov-activity" data-fd-loading="true">
        <div class="fd-skeleton-table" data-rows="6" data-cols="5"></div>
        <div class="fd-table-wrap">
          <div class="fd-table-scroll">
            <table class="fd-table" data-stack aria-label="Recent requests">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Endpoint</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th data-num>Credits</th>
                </tr>
              </thead>
              <tbody>
                <tr data-value="req_8f3a21">
                  <td>Nov 14, 4:29 PM</td>
                  <td data-mono data-stack-title>/scrape</td>
                  <td data-mono data-muted><span class="fd-table-trunc">docs.quarry.dev/changelog</span></td>
                  <td><span class="fd-status" data-tone="success">200 OK</span></td>
                  <td data-num>1</td>
                </tr>
                <tr data-value="req_7c19be">
                  <td>Nov 14, 4:12 PM</td>
                  <td data-mono data-stack-title>/crawl</td>
                  <td data-mono data-muted><span class="fd-table-trunc">quarry.dev/docs</span></td>
                  <td><span class="fd-status" data-tone="info" data-live>Running</span></td>
                  <td data-num>48</td>
                </tr>
                <tr data-value="req_5d02e4">
                  <td>Nov 14, 3:57 PM</td>
                  <td data-mono data-stack-title>/search</td>
                  <td data-mono data-muted><span class="fd-table-trunc">“vector database pricing 2026”</span></td>
                  <td><span class="fd-status" data-tone="success">200 OK</span></td>
                  <td data-num>5</td>
                </tr>
                <tr data-value="req_41b9a0">
                  <td>Nov 14, 3:41 PM</td>
                  <td data-mono data-stack-title>/scrape</td>
                  <td data-mono data-muted><span class="fd-table-trunc">status.quarry.dev</span></td>
                  <td><span class="fd-status" data-tone="warning">429 Rate limited</span></td>
                  <td data-num>0</td>
                </tr>
                <tr data-value="req_3a77f1">
                  <td>Nov 14, 3:20 PM</td>
                  <td data-mono data-stack-title>/agent</td>
                  <td data-mono data-muted><span class="fd-table-trunc">Compare GPU cloud prices</span></td>
                  <td><span class="fd-status" data-tone="success">200 OK</span></td>
                  <td data-num>38</td>
                </tr>
                <tr data-value="req_2e5c88">
                  <td>Nov 14, 2:58 PM</td>
                  <td data-mono data-stack-title>/extract</td>
                  <td data-mono data-muted><span class="fd-table-trunc">shop.northwind.dev/p/8812</span></td>
                  <td><span class="fd-status" data-tone="danger">403 Blocked</span></td>
                  <td data-num>0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- 6 · What's new -->
    <section class="fd-band" data-pad="none" data-grow aria-label="What’s new">
      <div class="fd-split" data-side="start">
        <div class="fd-panel">
          <div>
            <h2 class="fd-title">What’s new</h2>
            <p class="fd-small fd-muted">Recent changes to Ember, newest first.</p>
          </div>
          <div class="fd-row" data-gap="4" data-wrap>
            <button class="fd-btn-text" type="button" data-fd-dialog-open="dlg-whats-new"><svg class="fd-icon" data-icon="sparkles" aria-hidden="true"><use href="#i-sparkles"></use></svg><span>What’s new</span></button>
            <a class="fd-btn-text" href="https://docs.ember.dev/changelog" target="_blank" rel="noopener"><span>Read the changelog</span><svg class="fd-icon" data-icon="arrow-up-right" aria-hidden="true" data-nudge><use href="#i-arrow-up-right"></use></svg></a>
          </div>
        </div>
        <div class="fd-split-main">
          <div>
            <div class="fd-feature-row">
              <span class="fd-tile" data-shape="wide" data-tone="accent">12x</span>
              <div class="fd-feature-row-text"><span class="fd-feature-row-title">Agent runs cost 12x fewer credits</span><span class="fd-feature-row-desc">Nov 12 · A typical research run is now 40 credits, down from 480.</span></div>
            </div>
            <div class="fd-feature-row">
              <span class="fd-tile" data-shape="wide" data-tone="accent"><svg class="fd-icon" data-icon="radar" aria-hidden="true"><use href="#i-radar"></use></svg></span>
              <div class="fd-feature-row-text"><span class="fd-feature-row-title">Monitors send the diff</span><span class="fd-feature-row-desc">Nov 5 · Webhooks and emails now carry exactly what changed on the page.</span></div>
            </div>
            <div class="fd-feature-row">
              <span class="fd-tile" data-shape="wide" data-tone="accent"><svg class="fd-icon" data-icon="paperclip" aria-hidden="true"><use href="#i-paperclip"></use></svg></span>
              <div class="fd-feature-row-text"><span class="fd-feature-row-title">/parse reads scanned PDFs</span><span class="fd-feature-row-desc">Oct 29 · Text is recovered from images, with page numbers on every block.</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- What's new dialog: opens once per browser, reopened from band 6 -->
  <dialog class="fd-dialog" id="dlg-whats-new" data-size="md">
    <section data-step="monitors">
      <div class="fd-dialog-head">
        <p class="fd-eyebrow" data-tone="accent">What’s new</p>
        <h2 class="fd-h3 fd-dialog-title">Monitors are live</h2>
        <p class="fd-dialog-desc">Watch any page and hear the moment it changes.</p>
        <button class="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
      </div>
      <div class="fd-dialog-body">
        <ul class="fd-dialog-features">
          <li class="fd-dialog-feature"><span class="fd-tile" data-shape="wide" data-tone="accent"><svg class="fd-icon" data-icon="radar" aria-hidden="true"><use href="#i-radar"></use></svg></span><div><p class="fd-dialog-feature-title">Any page, any schedule</p><p class="fd-dialog-feature-text">Check every 10 minutes or once a day. Each check costs 1 credit.</p></div></li>
          <li class="fd-dialog-feature"><span class="fd-tile" data-shape="wide" data-tone="accent"><svg class="fd-icon" data-icon="webhook" aria-hidden="true"><use href="#i-webhook"></use></svg></span><div><p class="fd-dialog-feature-title">A webhook with the diff</p><p class="fd-dialog-feature-text">Your endpoint receives what changed, not the whole page again.</p></div></li>
          <li class="fd-dialog-feature"><span class="fd-tile" data-shape="wide" data-tone="accent"><svg class="fd-icon" data-icon="list-filter" aria-hidden="true"><use href="#i-list-filter"></use></svg></span><div><p class="fd-dialog-feature-title">Quiet by default</p><p class="fd-dialog-feature-text">Ads, timestamps and cookie banners never count as a change.</p></div></li>
        </ul>
      </div>
      <div class="fd-dialog-foot">
        <button class="fd-btn" type="button" data-variant="primary" data-block data-fd-dialog-step="next">Next</button>
        <div class="fd-dialog-dots" aria-hidden="true"><span></span><span></span><span></span></div>
      </div>
    </section>
    <section data-step="agent" hidden>
      <div class="fd-dialog-head">
        <p class="fd-eyebrow" data-tone="accent">What’s new</p>
        <h2 class="fd-h3 fd-dialog-title">Agent runs, rebuilt</h2>
        <p class="fd-dialog-desc">Same API call. Faster, cheaper runs with sources you can check.</p>
        <button class="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
      </div>
      <div class="fd-dialog-body">
        <ul class="fd-dialog-features">
          <li class="fd-dialog-feature"><span class="fd-tile" data-shape="wide" data-tone="accent">12x</span><div><p class="fd-dialog-feature-title">Fewer credits</p><p class="fd-dialog-feature-text">A typical research run now costs 40 credits, down from 480.</p></div></li>
          <li class="fd-dialog-feature"><span class="fd-tile" data-shape="wide" data-tone="accent">3x</span><div><p class="fd-dialog-feature-title">Faster answers</p><p class="fd-dialog-feature-text">Most runs finish in under a minute, even across dozens of pages.</p></div></li>
          <li class="fd-dialog-feature"><span class="fd-tile" data-shape="wide" data-tone="accent"><svg class="fd-icon" data-icon="quote" aria-hidden="true"><use href="#i-quote"></use></svg></span><div><p class="fd-dialog-feature-title">Cited sources</p><p class="fd-dialog-feature-text">Every claim links to the page it came from.</p></div></li>
        </ul>
      </div>
      <div class="fd-dialog-foot">
        <button class="fd-btn" type="button" data-variant="primary" data-block data-fd-dialog-step="next">Next</button>
        <div class="fd-dialog-dots" aria-hidden="true"><span></span><span></span><span></span></div>
      </div>
    </section>
    <section data-step="use" hidden>
      <div class="fd-dialog-head">
        <p class="fd-eyebrow" data-tone="accent">What’s new</p>
        <h2 class="fd-h3 fd-dialog-title">Use it from your agent</h2>
        <p class="fd-dialog-desc">Point any MCP client at Ember and the new runs are there.</p>
        <button class="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
      </div>
      <div class="fd-dialog-body">
        <ul class="fd-dialog-features">
          <li class="fd-dialog-feature"><span class="fd-tile" data-shape="wide" data-tone="accent"><svg class="fd-icon" data-icon="plug" aria-hidden="true"><use href="#i-plug"></use></svg></span><div><p class="fd-dialog-feature-title">One endpoint</p><p class="fd-dialog-feature-text"><span class="fd-code">/agent</span> accepts the same body as before. Nothing to migrate.</p></div></li>
        </ul>
      </div>
      <div class="fd-dialog-foot">
        <a class="fd-btn" data-variant="primary" data-block href="install.html">Add Ember to your agent</a>
        <div class="fd-dialog-dots" aria-hidden="true"><span></span><span></span><span></span></div>
      </div>
    </section>
  </dialog>
</template>
