/* Ember docs shell for documentation templates.
 *
 *   <body data-docs-shell data-section="docs|sdks|api|ai" data-active="introduction"
 *         [data-toc="false"] [data-foot="false"] [data-copy="false"] [data-updated="2026-11-12"]>
 *     <main><article class="fd-doc-article">…</article></main>
 *     <script type="module" src="../fire/fire.js"></script>
 *     <script type="module" src="./docs-shell.js"></script>
 *
 * On load the page's <main> becomes .fd-doc-main inside the full docs shell: the two-row top bar,
 * the section's nav, the "On this page" column (filled from the article's h2/h3 by docsite.js),
 * the article footer (helpful vote, edit links, last updated, previous / next), the site footer,
 * and the search palette with every page and endpoint. Or call it yourself:
 *
 *   import { mountDocs } from './docs-shell.js';
 *   mountDocs({ section: 'api', active: 'api-scrape' });
 *
 * renderDocs(options) returns the shell markup as a string (no DOM needed), with `content` as the
 * page body; `contained: true` renders the boxed variant used in docs specimens.
 * Overlay ids: `${prefix}-command` (palette), `-version`, `-lang`, `-more`, `-copy` (menus).
 */
import { EMBER_MARK } from './shell.js';

const PAGES = { introduction: 'docs-guide.html', 'api-scrape': 'docs-api.html', changelog: 'docs-changelog.html', home: 'docs-home.html' };
const href = (id) => PAGES[id] || `#${id}`;

export const SECTIONS = [
  { id: 'docs', label: 'Documentation', icon: 'book-open', href: 'docs-home.html' },
  { id: 'sdks', label: 'SDKs', icon: 'package', href: 'docs-guide.html#build-directly-with-the-api' },
  { id: 'api', label: 'API reference', icon: 'braces', href: 'docs-api.html' },
  { id: 'ai', label: 'Build with AI', icon: 'sparkles', href: 'docs-guide.html#set-up-with-an-agent' },
];

export const LINKS = [
  { id: 'playground', label: 'Playground', icon: 'play', href: 'playground.html' },
  { id: 'blog', label: 'Blog', icon: 'newspaper', href: '#blog' },
  { id: 'community', label: 'Community', icon: 'message-circle', href: '#community' },
  { id: 'changelog', label: 'Changelog', icon: 'scroll-text', href: 'docs-changelog.html' },
];

const agent = (id, label, letter) => ({ id, label, tile: letter });
/** The docs tree per section. Items: { id, label, icon?, tile?, method?, tag?, desc?, children? }. */
export const NAV = {
  docs: [
    {
      label: 'Get started',
      items: [
        { id: 'introduction', label: 'Introduction', desc: 'The context API for AI agents: search the web, scrape any page and interact with it through one API.' },
        { id: 'quickstart', label: 'Quickstart', desc: 'Make your first scrape in two minutes with cURL, Python, Node or the CLI.' },
        {
          id: 'mcp', label: 'MCP server', desc: 'Connect Ember to any agent that speaks the Model Context Protocol.',
          children: [agent('mcp-claude-code', 'Claude Code', 'C'), agent('mcp-codex', 'Codex', 'X'), agent('mcp-cursor', 'Cursor', 'R'), { id: 'mcp-remote', label: 'Remote server' }],
        },
        { id: 'cli', label: 'CLI', desc: 'Install the ember CLI, sign in from the browser and scrape from your terminal.' },
        { id: 'advanced-scraping', label: 'Advanced scraping guide', desc: 'Wait for selectors, run actions, use stealth proxies and cache results.' },
        {
          id: 'billing', label: 'Plans and billing', desc: 'How credits are counted, what each plan includes and how concurrency works.',
          children: [{ id: 'credits', label: 'Credits' }, { id: 'rate-limits', label: 'Rate limits' }, { id: 'enterprise', label: 'Enterprise' }],
        },
      ],
    },
    {
      label: 'Core endpoints',
      items: [
        { id: 'search', label: 'Search', icon: 'search', desc: 'Search the web and get full page content for every result.' },
        {
          id: 'scrape', label: 'Scrape', icon: 'file-text', desc: 'Turn any URL into clean Markdown, HTML, screenshots or structured JSON.',
          children: [{ id: 'scrape-overview', label: 'Scrape' }, { id: 'scrape-formats', label: 'Scrape formats' }, { id: 'scrape-actions', label: 'Actions' }, { id: 'batch-scrape', label: 'Batch scrape' }],
        },
        { id: 'interact', label: 'Interact', icon: 'mouse-pointer-click', desc: 'Keep a browser session open: click, type and extract after a scrape.' },
        { id: 'parse', label: 'Parse', icon: 'paperclip', desc: 'Upload PDFs, Word and spreadsheet files and get Markdown back.' },
        { id: 'crawl', label: 'Crawl', icon: 'network', desc: 'Follow links across a site and scrape every page you allow.' },
        { id: 'map', label: 'Map', icon: 'map', desc: 'List every URL on a site in seconds, without scraping them.' },
        { id: 'extract', label: 'Extract', icon: 'braces', desc: 'Pull typed JSON from one page or many with a schema or a prompt.' },
        { id: 'agent', label: 'Agent', icon: 'wand-sparkles', tag: 'Beta', desc: 'Describe what you need; the agent searches, browses and returns sourced data.' },
        { id: 'monitor', label: 'Monitor', icon: 'radar', tag: 'New', tagTone: 'accent', desc: 'Watch pages for changes and get a webhook with the diff.' },
      ],
    },
    {
      label: 'Guides',
      items: [
        { id: 'guide-llm-ready', label: 'LLM-ready Markdown', desc: 'Strip boilerplate, keep tables and links, and size pages for a context window.' },
        { id: 'guide-json-schemas', label: 'Structured data with schemas', desc: 'Write JSON schemas that extract reliably across page layouts.' },
        { id: 'guide-stealth', label: 'Proxies and stealth mode', desc: 'When to use stealth proxies, and what they cost.' },
        { id: 'guide-agents', label: 'Building research agents', desc: 'Combine search, scrape and extract into an agent loop with citations.' },
      ],
    },
    {
      label: 'Webhooks',
      items: [
        { id: 'webhooks', label: 'Overview', desc: 'Receive crawl, batch and monitor events at your own endpoint.' },
        { id: 'webhook-events', label: 'Event types', desc: 'Every event Ember sends, with example payloads.' },
        { id: 'webhook-signatures', label: 'Verify signatures', desc: 'Check the Ember-Signature header with your signing secret.' },
      ],
    },
  ],
  sdks: [
    {
      label: 'SDKs',
      items: [
        { id: 'sdk-python', label: 'Python', icon: 'code', desc: 'pip install ember-py. Sync and async clients with typed responses.' },
        { id: 'sdk-node', label: 'Node', icon: 'code', desc: 'npm install @ember/sdk. Works in Node 18+, Bun and edge runtimes.' },
      ],
    },
    {
      label: 'Tools',
      items: [
        { id: 'cli', label: 'CLI', icon: 'square-terminal', desc: 'The ember CLI: scrape, crawl and manage keys from your terminal.' },
        { id: 'mcp', label: 'MCP server', icon: 'plug', desc: 'Give any MCP client the Ember tools.' },
      ],
    },
  ],
  api: [
    {
      label: 'Using the API',
      items: [
        { id: 'api-introduction', label: 'Introduction', desc: 'Base URL, versioning and request format.' },
        { id: 'api-authentication', label: 'Authentication', desc: 'Send your key as a bearer token.' },
        { id: 'api-errors', label: 'Errors', desc: 'Status codes and the error object.' },
        { id: 'api-rate-limits', label: 'Rate limits', desc: 'Requests per minute and concurrent jobs per plan.' },
      ],
    },
    { label: 'Search endpoints', items: [{ id: 'api-search', label: 'Search', method: 'post', path: '/v2/search', desc: 'Search the web and scrape the results.' }] },
    {
      label: 'Scrape endpoints',
      items: [
        { id: 'api-scrape', label: 'Scrape', method: 'post', path: '/v2/scrape', desc: 'Scrape one URL into Markdown, HTML, JSON or a screenshot.' },
        { id: 'api-batch-scrape', label: 'Batch scrape', method: 'post', path: '/v2/batch/scrape', desc: 'Scrape many URLs in one job.' },
        { id: 'api-batch-status', label: 'Get batch scrape status', method: 'get', path: '/v2/batch/scrape/{id}', desc: 'Poll a batch job and page through its results.' },
        { id: 'api-batch-cancel', label: 'Cancel batch scrape', method: 'delete', path: '/v2/batch/scrape/{id}', desc: 'Stop a running batch job.' },
        { id: 'api-batch-errors', label: 'Get batch scrape errors', method: 'get', path: '/v2/batch/scrape/{id}/errors', desc: 'URLs that failed, with reasons.' },
      ],
    },
    {
      label: 'Interact endpoints',
      items: [
        { id: 'api-interact', label: 'Create interact session', method: 'post', path: '/v2/scrape/{scrapeId}/interact', desc: 'Open a browser session on a scraped page.' },
        { id: 'api-interact-stop', label: 'Stop interact session', method: 'delete', path: '/v2/interact/{sessionId}', desc: 'Close a session and stop billing.' },
      ],
    },
    {
      label: 'Crawl and map',
      items: [
        { id: 'api-crawl', label: 'Crawl', method: 'post', path: '/v2/crawl', desc: 'Start a crawl job.' },
        { id: 'api-crawl-status', label: 'Get crawl status', method: 'get', path: '/v2/crawl/{id}', desc: 'Progress and pages of a crawl.' },
        { id: 'api-crawl-cancel', label: 'Cancel crawl', method: 'delete', path: '/v2/crawl/{id}', desc: 'Stop a crawl job.' },
        { id: 'api-map', label: 'Map', method: 'post', path: '/v2/map', desc: 'List the URLs of a site.' },
      ],
    },
    {
      label: 'Extract and agent',
      items: [
        { id: 'api-extract', label: 'Extract', method: 'post', path: '/v2/extract', desc: 'Typed JSON from one or many pages.' },
        { id: 'api-parse', label: 'Parse', method: 'post', path: '/v2/parse', desc: 'Files to Markdown.' },
        { id: 'api-agent', label: 'Agent', method: 'post', path: '/v2/agent', tag: 'Beta', desc: 'Start an agent run.' },
        { id: 'api-agent-status', label: 'Get agent run', method: 'get', path: '/v2/agent/{id}', desc: 'Steps, sources and result of a run.' },
      ],
    },
    {
      label: 'Monitors',
      items: [
        { id: 'api-monitor-create', label: 'Create monitor', method: 'post', path: '/v2/monitors', desc: 'Watch a URL on a schedule.' },
        { id: 'api-monitor-update', label: 'Update monitor', method: 'patch', path: '/v2/monitors/{id}', desc: 'Change a monitor’s schedule or rules.' },
        { id: 'api-monitor-delete', label: 'Delete monitor', method: 'delete', path: '/v2/monitors/{id}', desc: 'Stop and remove a monitor.' },
      ],
    },
  ],
  ai: [
    {
      label: 'Build with AI',
      items: [
        { id: 'ai-overview', label: 'Overview', icon: 'sparkles', desc: 'Give agents the web: skills, MCP and llms.txt.' },
        { id: 'mcp', label: 'MCP server', icon: 'plug', desc: 'Connect Ember to any MCP client.' },
        { id: 'ai-skills', label: 'Agent skills', icon: 'scroll-text', desc: 'Install the Ember skill in coding agents.' },
        { id: 'ai-llms-txt', label: 'llms.txt', icon: 'file-text', desc: 'These docs as one Markdown file for your model.' },
      ],
    },
  ],
};

const METHOD_LABEL = { get: 'GET', post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DEL' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const i = (name, attrs = '') => `<i data-icon="${name}"${attrs}></i>`;
const current = (on) => (on ? ' aria-current="page"' : '');
const kbd = (keys) => keys.map((k) => `<kbd class="fd-kbd">${k}</kbd>`).join('');

/** Items of a section in reading order (children replace their parent). */
export function flatItems(section) {
  return (NAV[section] || []).flatMap((g) => g.items.flatMap((item) => (item.children ? item.children.map((c) => ({ ...c, group: g.label, parent: item })) : [{ ...item, group: g.label }])));
}
function findItem(section, id) {
  for (const s of [section, ...Object.keys(NAV)]) {
    const found = flatItems(s).find((it) => it.id === id) || (NAV[s] || []).flatMap((g) => g.items.map((it) => ({ ...it, group: g.label }))).find((it) => it.id === id);
    if (found) return found;
  }
  return LINKS.find((l) => l.id === id) || null;
}

/* ---------- Top bar ---------- */
export function renderTop({ section = 'docs', active = '', prefix = 'docs' } = {}) {
  const item = findItem(section, active);
  const crumbs = item?.group
    ? `<span>${esc(item.group)}</span>${i('chevron-right')}<span aria-current="page">${esc(item.label)}</span>`
    : `<span aria-current="page">${esc(item?.label || 'Documentation')}</span>`;
  return `<header class="fd-doc-top">
  <div class="fd-doc-top-row" data-row="tools">
    <div class="fd-doc-top-start">
      <a class="fd-brand" href="docs-home.html" aria-label="Ember docs home"><span class="fd-brand-mark">${EMBER_MARK}</span><span class="fd-brand-name">Ember</span><span class="fd-doc-brand-tag">docs</span></a>
      <button class="fd-btn fd-doc-switch" type="button" data-variant="ghost" data-size="sm" data-mono data-doc-hide="sm" data-fd-menu="${prefix}-version" aria-label="Version"><span data-fd-menu-value>v2</span>${i('chevron-down')}</button>
      <button class="fd-btn fd-doc-switch" type="button" data-variant="ghost" data-size="sm" data-doc-hide="md sm" data-fd-menu="${prefix}-lang" aria-label="Language"><span data-fd-menu-value>English</span>${i('chevron-down')}</button>
    </div>
    <button class="fd-doc-search" type="button" data-fd-command-open="${prefix}-command" aria-label="Search the docs" aria-keyshortcuts="Meta+K Control+K">${i('search')}<span>Search…</span><kbd class="fd-kbd">⌘K</kbd></button>
    <div class="fd-doc-top-end">
      <a class="fd-doc-repo" href="https://code.ember.dev/ember/ember" target="_blank" rel="noopener" data-doc-hide="md sm" aria-label="Ember repository, 48,213 stars">${i('git-branch')}<span class="fd-doc-repo-name">ember/ember</span><span class="fd-doc-repo-stars">${i('star')}48,213</span></a>
      <a class="fd-btn" href="https://status.ember.dev" target="_blank" rel="noopener" data-doc-hide="lg md sm">Status</a>
      <a class="fd-btn" href="mailto:support@ember.dev" data-doc-hide="lg md sm">Support</a>
      <a class="fd-btn" data-variant="primary" href="auth.html" data-doc-hide="sm">Sign up</a>
      <button class="fd-btn" type="button" data-variant="ghost" data-icon-only data-doc-hide="sm" data-fd-tweaks-open data-fd-tooltip="Tweaks" aria-label="Tweaks" aria-expanded="false">${i('sliders-horizontal')}</button>
      <button class="fd-btn" type="button" data-variant="ghost" data-icon-only data-doc-hide="sm" data-fd-theme-toggle data-fd-tooltip="Theme" aria-label="Theme">${i('monitor')}</button>
      <button class="fd-btn" type="button" data-variant="ghost" data-icon-only data-doc-show="sm" data-fd-command-open="${prefix}-command" aria-label="Search the docs">${i('search')}</button>
      <button class="fd-btn" type="button" data-variant="ghost" data-icon-only data-doc-show="sm" data-fd-menu="${prefix}-more" data-placement="bottom-end" aria-label="More">${i('ellipsis-vertical')}</button>
    </div>
  </div>
  <div class="fd-doc-top-row" data-row="sections">
    <nav class="fd-tabs fd-doc-sections" aria-label="Sections">
      ${SECTIONS.map((s) => `<a class="fd-tab" href="${esc(s.href)}"${current(s.id === section)}>${esc(s.label)}</a>`).join('\n      ')}
    </nav>
  </div>
  <div class="fd-doc-top-row" data-row="crumbs">
    <button class="fd-doc-crumbs" type="button" data-fd-doc-nav-open aria-label="Open navigation">${i('menu')}${crumbs}</button>
  </div>
</header>`;
}

/* ---------- Nav ---------- */
function navItem(item, active, nested = false) {
  const lead = item.method
    ? `<span class="fd-doc-method" data-method="${item.method}">${METHOD_LABEL[item.method]}</span>`
    : item.tile ? `<span class="fd-tile" data-size="20" data-tone="neutral">${esc(item.tile)}</span>`
      : item.icon && !nested ? i(item.icon) : '';
  const tag = item.tag ? `<span class="fd-doc-nav-tag"${item.tagTone ? ` data-tone="${item.tagTone}"` : ''}>${esc(item.tag)}</span>` : '';
  return `<a class="fd-doc-nav-item" href="${esc(href(item.id))}"${current(item.id === active)}>${lead}<span class="fd-doc-nav-text">${esc(item.label)}</span>${tag}</a>`;
}
function navGroupItem(item, active, section, prefix) {
  const id = `${prefix}-nav-${section}-${item.id}`;
  const open = item.children.some((c) => c.id === active);
  const lead = item.icon ? i(item.icon) : '';
  const tag = item.tag ? `<span class="fd-doc-nav-tag">${esc(item.tag)}</span>` : '';
  return `<button class="fd-doc-nav-item" type="button" aria-expanded="${open}" aria-controls="${id}" data-key="${section}/${item.id}">${lead}<span class="fd-doc-nav-text">${esc(item.label)}</span>${tag}${i('chevron-right', ' class="fd-doc-nav-chevron"')}</button>
        <div class="fd-doc-nav-sub" id="${id}"${open ? '' : ' hidden'}>
          ${item.children.map((c) => navItem(c, active, true)).join('\n          ')}
        </div>`;
}
export function renderNav({ section = 'docs', active = '', prefix = 'docs' } = {}) {
  const groups = (NAV[section] || []).map((g) => `<div class="fd-doc-nav-group">
        <p class="fd-doc-nav-label">${esc(g.label)}</p>
        ${g.items.map((item) => (item.children ? navGroupItem(item, active, section, prefix) : navItem(item, active))).join('\n        ')}
      </div>`).join('\n      ');
  return `<nav class="fd-doc-nav" aria-label="${esc(SECTIONS.find((s) => s.id === section)?.label || 'Documentation')}">
    <div class="fd-doc-nav-scroll">
      <div class="fd-doc-nav-sections">
        ${SECTIONS.map((s) => `<a class="fd-doc-nav-item" href="${esc(s.href)}"${current(s.id === section)}>${i(s.icon)}<span class="fd-doc-nav-text">${esc(s.label)}</span></a>`).join('\n        ')}
      </div>
      <div class="fd-doc-nav-links">
        ${LINKS.map((l) => `<a class="fd-doc-nav-item" href="${esc(l.href)}"${current(l.id === active)}>${i(l.icon)}<span class="fd-doc-nav-text">${esc(l.label)}</span></a>`).join('\n        ')}
      </div>
      ${groups}
    </div>
  </nav>`;
}

/* ---------- Aside, article parts, footer ---------- */
export function renderAside({ prefix = 'docs' } = {}) {
  return `<aside class="fd-doc-aside" aria-label="On this page">
    <nav class="fd-toc fd-doc-toc" data-fd-scrollspy data-offset="128" aria-labelledby="${prefix}-toc-title">
      <p class="fd-toc-title fd-doc-toc-title" id="${prefix}-toc-title">${i('align-left')}On this page</p>
      <div class="fd-toc-list" data-fd-doc-toc></div>
    </nav>
    <div class="fd-card fd-doc-cta" data-variant="accent">
      <p class="fd-doc-cta-brand">${EMBER_MARK}<span>Ember</span></p>
      <p class="fd-doc-cta-title">Ready to build?</p>
      <p class="fd-doc-cta-text">Search, scrape and interact with the web from one API. <b>500 free credits, no card needed.</b></p>
      <a class="fd-btn" data-variant="primary" data-block href="auth.html">Start for free</a>
    </div>
  </aside>`;
}

export function renderOtp() {
  return `<details class="fd-disclosure fd-doc-otp">
    <summary class="fd-disclosure-trigger">${i('align-left')}<span>On this page</span>${i('chevron-down')}</summary>
    <div class="fd-disclosure-panel"><div class="fd-disclosure-inner"><nav class="fd-doc-otp-list" aria-label="On this page"></nav></div></div>
  </details>`;
}

export function renderCopy({ prefix = 'docs' } = {}) {
  return `<div class="fd-btn-group fd-doc-copy" role="group" aria-label="Copy page">
      <button class="fd-btn" type="button" data-variant="outline" data-fd-doc-copy-page>${i('copy')}<span class="fd-btn-swap"><span>Copy page</span><span>Copied</span></span></button>
      <button class="fd-btn" type="button" data-variant="outline" data-icon-only data-fd-menu="${prefix}-copy" data-placement="bottom-end" aria-label="More ways to use this page">${i('chevron-down')}</button>
    </div>`;
}

const fmtDate = (iso) => { try { return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return iso; } };
export function renderFoot({ section = 'docs', active = '', updated = '2026-11-12', prefix = 'docs' } = {}) {
  const list = flatItems(section);
  const at = list.findIndex((it) => it.id === active);
  const prev = at > 0 ? list[at - 1] : null;
  const next = at > -1 && at < list.length - 1 ? list[at + 1] : null;
  const link = (it, dir) => (it
    ? `<a class="fd-doc-pager-link" data-dir="${dir}" href="${esc(href(it.id))}"><span class="fd-doc-pager-eyebrow">${dir === 'prev' ? 'Previous' : 'Next'}</span><span class="fd-doc-pager-title">${dir === 'prev' ? i('arrow-left') : ''}<span>${esc(it.label)}</span>${dir === 'next' ? i('arrow-right') : ''}</span></a>`
    : '');
  const pager = prev || next ? `<nav class="fd-doc-pager" aria-label="Previous and next page">${link(prev, 'prev')}${link(next, 'next')}</nav>` : '';
  return `<footer class="fd-doc-foot">
    <div class="fd-doc-foot-row">
      <div class="fd-doc-helpful">
        <p class="fd-doc-helpful-q">Was this page helpful?</p>
        <div class="fd-doc-helpful-actions">
          <button class="fd-btn" type="button" data-size="sm" data-fd-doc-vote="yes">${i('thumbs-up')}<span>Yes</span></button>
          <button class="fd-btn" type="button" data-size="sm" data-fd-doc-vote="no">${i('thumbs-down')}<span>No</span></button>
        </div>
        <p class="fd-doc-helpful-thanks" hidden>${i('circle-check')}<span data-fd-doc-thanks-text>Thanks for letting us know.</span></p>
        <form class="fd-doc-helpful-form" hidden>
          <label class="fd-sr-only" for="${prefix}-feedback">What was missing or wrong?</label>
          <textarea class="fd-textarea" id="${prefix}-feedback" rows="3" placeholder="What were you looking for? A link or a code sample helps."></textarea>
          <div class="fd-row"><button class="fd-btn" type="submit" data-size="sm">Send feedback</button></div>
        </form>
      </div>
      <div class="fd-doc-foot-links">
        <a class="fd-btn-text" href="https://code.ember.dev/ember/docs/edit/main/${esc(active || 'index')}.mdx" target="_blank" rel="noopener">${i('square-pen')}<span>Suggest edits</span></a>
        <a class="fd-btn-text" href="https://code.ember.dev/ember/docs/issues/new" target="_blank" rel="noopener">${i('bug')}<span>Raise an issue</span></a>
      </div>
    </div>
    <p class="fd-doc-updated">Last updated <time datetime="${esc(updated)}">${esc(fmtDate(updated))}</time></p>
    ${pager}
  </footer>`;
}

export function renderFooter() {
  const col = (title, links) => `<div class="fd-doc-footer-col"><p>${title}</p>${links.map(([label, url]) => `<a href="${esc(url)}">${esc(label)}</a>`).join('')}</div>`;
  return `<footer class="fd-doc-footer">
    <div class="fd-doc-footer-inner">
      <div class="fd-doc-footer-brand">
        <a class="fd-brand" href="docs-home.html"><span class="fd-brand-mark">${EMBER_MARK}</span><span class="fd-brand-name">Ember</span></a>
        <p class="fd-doc-footer-note">The web-data and agent API. Search, scrape and interact with any page from one key.</p>
      </div>
      ${col('Product', [['Playground', 'playground.html'], ['Pricing', 'usage.html#plans'], ['Changelog', 'docs-changelog.html'], ['Status', 'https://status.ember.dev']])}
      ${col('Developers', [['API reference', 'docs-api.html'], ['Python SDK', '#sdk-python'], ['Node SDK', '#sdk-node'], ['MCP server', '#mcp']])}
      ${col('Company', [['About', '#about'], ['Blog', '#blog'], ['Careers', '#careers'], ['Contact', 'mailto:hello@ember.dev']])}
    </div>
    <div class="fd-doc-footer-bar">
      <span>© 2026 Ember Labs, Inc.</span>
      <div class="fd-row">
        <a class="fd-status" data-tone="success" data-size="sm" href="https://status.ember.dev" target="_blank" rel="noopener">All systems normal</a>
        <button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-theme-toggle aria-label="Theme">${i('monitor')}</button>
      </div>
    </div>
  </footer>`;
}

/* ---------- Overlays: menus and the search palette ---------- */
const commandItem = (it, icon, hint, mono = false) => `<a class="fd-command-item" href="${esc(href(it.id))}" data-keywords="${esc(`${it.group || ''} ${it.desc || ''} ${it.path || ''}`)}" data-fd-doc-text="${esc(it.desc || '')}">${i(icon)}<span class="fd-command-item-label">${esc(it.label)}</span><span class="fd-command-item-hint${mono ? ' fd-mono' : ''}">${esc(hint)}</span></a>`;

export function renderOverlays({ prefix = 'docs' } = {}) {
  const docsItems = NAV.docs.filter((g) => g.label !== 'Guides').flatMap((g) => g.items.map((it) => ({ ...it, group: g.label })));
  const pages = [...docsItems, ...NAV.sdks.flatMap((g) => g.items.map((it) => ({ ...it, group: g.label }))).filter((it) => !docsItems.some((d) => d.id === it.id))]
    .map((it) => commandItem(it, it.icon || 'file-text', it.group)).join('\n        ');
  const endpoints = NAV.api.flatMap((g) => g.items.filter((it) => it.method).map((it) => ({ ...it, group: g.label })))
    .map((it) => commandItem(it, 'braces', `${METHOD_LABEL[it.method]} ${it.path}`, true)).join('\n        ');
  const guides = [...NAV.docs.find((g) => g.label === 'Guides').items, ...NAV.docs.find((g) => g.label === 'Webhooks').items]
    .map((it) => commandItem({ ...it, group: 'Guides' }, 'book-open', it.desc.split('.')[0])).join('\n        ');
  const radio = (value, label, checked, desc = '') => `<button class="fd-menu-item" role="menuitemradio" aria-checked="${checked}" data-value="${value}"><span class="fd-menu-item-label">${esc(label)}${desc ? `<span class="fd-menu-item-desc">${esc(desc)}</span>` : ''}</span></button>`;
  return `<div class="fd-menu" id="${prefix}-version" popover role="menu" aria-label="Version">
    ${radio('v2', 'v2', true, 'Current')}
    ${radio('v1', 'v1', false, 'Supported until Jun 30, 2027')}
    <hr class="fd-menu-sep">
    <a class="fd-menu-item" href="#migrate">${i('arrow-up-right')}<span class="fd-menu-item-label">Migrate from v1</span></a>
  </div>
  <div class="fd-menu" id="${prefix}-lang" popover role="menu" aria-label="Language">
    ${radio('en', 'English', true)}
    ${radio('es', 'Español', false)}
    ${radio('fr', 'Français', false)}
    ${radio('de', 'Deutsch', false)}
    ${radio('ja', '日本語', false)}
  </div>
  <div class="fd-menu" id="${prefix}-more" popover role="menu" aria-label="More">
    <a class="fd-menu-item" href="auth.html">${i('log-in')}<span class="fd-menu-item-label">Sign up</span></a>
    <a class="fd-menu-item" href="https://status.ember.dev" target="_blank" rel="noopener">${i('activity')}<span class="fd-menu-item-label">Status</span></a>
    <a class="fd-menu-item" href="mailto:support@ember.dev">${i('mail')}<span class="fd-menu-item-label">Support</span></a>
    <a class="fd-menu-item" href="https://code.ember.dev/ember/ember" target="_blank" rel="noopener">${i('git-branch')}<span class="fd-menu-item-label">Repository</span><span class="fd-menu-item-hint fd-mono">48,213</span></a>
    <hr class="fd-menu-sep">
    <button class="fd-menu-item" data-value="tweaks" data-fd-tweaks-open>${i('sliders-horizontal')}<span class="fd-menu-item-label">Tweaks</span></button>
    <button class="fd-menu-item" data-value="theme" data-fd-theme-toggle>${i('moon')}<span class="fd-menu-item-label">Switch theme</span></button>
  </div>
  <div class="fd-menu" id="${prefix}-copy" popover role="menu" aria-label="Use this page" data-fd-doc-copy-menu>
    <button class="fd-menu-item" data-value="copy-md">${i('copy')}<span class="fd-menu-item-label">Copy page as Markdown<span class="fd-menu-item-desc">For pasting into an LLM</span></span></button>
    <button class="fd-menu-item" data-value="view-md">${i('file-text')}<span class="fd-menu-item-label">View as Markdown<span class="fd-menu-item-desc">Opens the plain text in a new tab</span></span></button>
    <button class="fd-menu-item" data-value="open-ai">${i('sparkles')}<span class="fd-menu-item-label">Open in an AI assistant<span class="fd-menu-item-desc">Copies a prompt with this page</span></span></button>
    <button class="fd-menu-item" data-value="mcp">${i('plug')}<span class="fd-menu-item-label">Connect via MCP<span class="fd-menu-item-desc">Copies the MCP server URL</span></span></button>
  </div>
  <dialog class="fd-command" id="${prefix}-command" aria-label="Search the docs" data-fd-doc-search>
    <div class="fd-command-search">
      ${i('search')}
      <input class="fd-command-input" type="text" placeholder="Search pages, endpoints and guides…" aria-label="Search the docs" autocomplete="off" spellcheck="false">
      <kbd class="fd-kbd">esc</kbd>
    </div>
    <div class="fd-command-list">
      <div class="fd-command-group">
        <p class="fd-command-group-label">Pages</p>
        ${pages}
      </div>
      <div class="fd-command-group">
        <p class="fd-command-group-label">API endpoints</p>
        ${endpoints}
      </div>
      <div class="fd-command-group">
        <p class="fd-command-group-label">Guides</p>
        ${guides}
      </div>
    </div>
    <div class="fd-command-empty" hidden>
      ${i('search')}
      <p class="fd-command-empty-title">No results for “<span data-fd-command-query></span>”</p>
      <p class="fd-command-empty-text">Try an endpoint like /crawl, a parameter like formats, or a guide title.</p>
    </div>
    <div class="fd-command-foot">
      <span>${kbd(['↑', '↓'])}navigate</span>
      <span>${kbd(['↵'])}open</span>
      <span>${kbd(['esc'])}close</span>
    </div>
  </dialog>`;
}

/* ---------- Whole shell ---------- */
/** Full docs shell markup with `content` (an article) as the page. */
export function renderDocs({ section = 'docs', active = '', content = '', toc = true, nav = true, contained = false, prefix = 'docs', overlays = true } = {}) {
  return `<div class="fd-doc"${contained ? ' data-contained' : ''} data-section="${esc(section)}">
${renderTop({ section, active, prefix })}
<div class="fd-doc-body">
  ${nav ? renderNav({ section, active, prefix }) : ''}
  <main class="fd-doc-main">
    <div class="fd-doc-content">
      ${content}
      ${toc ? renderAside({ prefix }) : ''}
    </div>
    ${renderFooter()}
  </main>
</div>
${overlays ? renderOverlays({ prefix }) : ''}
</div>`;
}

/** Add the shell's article parts: the copy button in the head, the small-screen contents disclosure, the footer. */
export function enhanceArticle(article, { section = 'docs', active = '', toc = true, copy = true, foot = true, updated = '2026-11-12', prefix = 'docs' } = {}) {
  const head = article.querySelector('.fd-doc-head');
  if (copy && head && !head.querySelector('.fd-doc-copy')) head.querySelector('.fd-doc-title')?.insertAdjacentHTML('afterend', renderCopy({ prefix }));
  if (toc && !article.querySelector('.fd-doc-otp')) {
    if (head) head.insertAdjacentHTML('afterend', renderOtp()); else article.insertAdjacentHTML('afterbegin', renderOtp());
  }
  if (foot && !article.querySelector('.fd-doc-foot')) article.insertAdjacentHTML('beforeend', renderFoot({ section, active, updated: updated || '2026-11-12', prefix }));
  return article;
}

/** Render a boxed shell into `host` around the article it holds (docs specimens). */
export function mountDemo(host, { section = 'docs', active = '', toc = true, nav = true, prefix = 'demo', base = '' } = {}) {
  const article = host.querySelector('.fd-doc-article');
  if (!article || host.querySelector('.fd-doc')) return null;
  enhanceArticle(article, { section, active, toc, prefix });
  const t = document.createElement('template');
  t.innerHTML = renderDocs({ section, active, toc, nav, contained: true, prefix, content: '<template data-slot></template>' });
  const shell = t.content.firstElementChild;
  // Shell links are relative to templates/; a page elsewhere passes `base` to reach them.
  if (base) shell.querySelectorAll('a[href]').forEach((a) => { const h = a.getAttribute('href'); if (!/^(#|[a-z][a-z0-9+.-]*:|\/)/i.test(h)) a.setAttribute('href', base + h); });
  shell.querySelector('template[data-slot]').replaceWith(article);
  // The host's own placement (a phone-width frame, a fixed height) moves to the shell that replaces it.
  for (const attr of ['style', 'data-w', 'data-max-w', 'data-h', 'data-min-h']) if (host.hasAttribute(attr)) shell.setAttribute(attr, host.getAttribute(attr));
  host.replaceWith(shell);
  return shell;
}

/** Wrap the page's <main> in the docs shell. Returns the .fd-doc element. */
export function mountDocs({ section, active, title } = {}) {
  const body = document.body;
  const existing = body.querySelector(':scope > .fd-doc');
  if (existing) return existing;
  const sec = section ?? body.dataset.section ?? 'docs';
  const id = active ?? body.dataset.active ?? '';
  const toc = body.dataset.toc !== 'false';
  const main = body.querySelector('main') || document.createElement('main');
  let article = main.querySelector('.fd-doc-article');
  if (!article) {
    article = document.createElement('article');
    article.className = 'fd-doc-article';
    article.append(...main.childNodes);
  }

  enhanceArticle(article, { section: sec, active: id, toc, copy: body.dataset.copy !== 'false', foot: body.dataset.foot !== 'false', updated: body.dataset.updated });

  const t = document.createElement('template');
  t.innerHTML = renderDocs({ section: sec, active: id, toc, content: '<template data-slot></template>' });
  const shell = t.content.firstElementChild;
  const slot = shell.querySelector('template[data-slot]');
  slot.replaceWith(article);
  // Keep the page's own <main> element (and anything else it carried, like dialogs) as the main column.
  const generated = shell.querySelector('.fd-doc-main');
  main.className = 'fd-doc-main';
  main.prepend(...generated.childNodes);
  generated.replaceWith(main);

  body.prepend(shell);
  const item = findItem(sec, id);
  const heading = title ?? body.dataset.title ?? item?.label;
  if (heading) document.title = `${heading} · Ember docs`;
  body.setAttribute('data-docs-shell', 'mounted');

  // fire.js initialises the document once on load; if that already happened, initialise the new markup.
  const fireReady = document.documentElement.hasAttribute('data-fd-ready');
  if (fireReady) {
    import('../fire/fire.js')
      .then((fire) => fire.init(shell))
      .catch((error) => console.error('[ember] docs shell init failed', error));
  }
  return shell;
}

if (typeof document !== 'undefined' && document.body?.hasAttribute('data-docs-shell') && document.body.dataset.docsShell !== 'mounted') {
  mountDocs();
}
