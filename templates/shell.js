/* Ember app shell for template screens.
 *
 *   <body data-shell data-active="logs" [data-title="Activity logs"]>
 *     <main class="fd-page"> …frame, bands… </main>
 *     <script type="module" src="../fire/fire.js"></script>
 *     <script type="module" src="./shell.js"></script>
 *
 * On load the page's <main> is wrapped in the full shell: sidebar (nav, usage card, account),
 * top bar, phone menu and the support button. Or call it yourself:
 *
 *   import { mountShell } from './shell.js';
 *   mountShell({ active: 'scrape', title: 'Scrape a page' });
 *
 * `active` is a nav id: overview, install, catalog, search, scrape, interact, parse, crawl, map,
 * batch, monitoring, agent, logs, usage, api-keys, settings. When omitted it is read from the URL.
 * renderShell(options) returns the markup as a string (no DOM needed).
 *
 * Overlays are rendered once into the shell (renderOverlays): team switcher menu, account menu, help menu,
 * notifications popover and the ⌘K command palette. Their ids are `${prefix}-menu-team`, `-menu-account`,
 * `-menu-help`, `-notifs` and `-command`. A page can open the palette from anywhere with
 * `<button data-fd-command-open="ember-command">`.
 */
const PLAYGROUND = 'playground.html?endpoint=';

export const NAV = [
  {
    items: [
      { id: 'overview', label: 'Overview', icon: 'home', href: 'overview.html' },
      { id: 'install', label: 'Add Ember to your agent', icon: 'bot', href: 'install.html' },
      { id: 'catalog', label: 'Catalog', icon: 'blocks', href: 'catalog.html', badge: 'New' },
    ],
  },
  {
    label: 'Playground',
    items: [
      { id: 'search', label: 'Search the web', icon: 'search', href: `${PLAYGROUND}search`, hint: '/search' },
      { id: 'scrape', label: 'Scrape a page', icon: 'file-text', href: `${PLAYGROUND}scrape`, hint: '/scrape' },
      { id: 'interact', label: 'Interact with a page', icon: 'mouse-pointer-click', href: `${PLAYGROUND}interact`, hint: '/interact' },
      { id: 'parse', label: 'Parse a file', icon: 'paperclip', href: 'parse.html', hint: '/parse' },
      {
        id: 'crawl-group', label: 'Crawl a website', icon: 'network',
        children: [
          { id: 'crawl', label: 'Crawl', icon: 'network', href: `${PLAYGROUND}crawl`, hint: '/crawl' },
          { id: 'map', label: 'Map', icon: 'map', href: `${PLAYGROUND}map`, hint: '/map' },
          { id: 'batch', label: 'Batch', icon: 'layers', href: `${PLAYGROUND}batch`, hint: '/batch' },
        ],
      },
      { id: 'monitoring', label: 'Monitor the web', icon: 'radar', href: 'monitoring.html' },
      { id: 'agent', label: 'Agent', icon: 'wand-sparkles', href: 'agent.html', hint: '/agent' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'logs', label: 'Activity logs', icon: 'list', href: 'logs.html' },
      { id: 'usage', label: 'Usage', icon: 'chart-column', href: 'usage.html' },
      { id: 'api-keys', label: 'API keys', icon: 'key-round', href: 'api-keys.html' },
      { id: 'settings', label: 'Settings', icon: 'settings', href: 'settings.html' },
    ],
  },
];

export const ACCOUNT = { email: 'maya@quarry.dev', initials: 'MR', team: 'Quarry Labs', teamInitial: 'Q', credits: '1,520', creditsLeft: 0.5, resets: 'Nov 23' };
export const TEAMS = [
  { id: 'quarry-labs', name: 'Quarry Labs', initial: 'Q', tone: 'accent', current: true },
  { id: 'personal', name: 'Personal', initial: 'P', tone: 'neutral' },
  { id: 'acme-research', name: 'Acme Research', initial: 'A', tone: 'violet' },
];
const DOCS = 'https://docs.ember.dev';

/** The Ember mark: a glowing coal (rounded diamond) and two sparks rising from it. */
export const EMBER_MARK = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4.5" y="7.5" width="12" height="12" rx="3.25" transform="rotate(45 10.5 13.5)"/><circle cx="19" cy="5" r="2.5"/><circle cx="14.25" cy="2.25" r="1.25" opacity=".55"/></svg>';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const i = (name, attrs = '') => `<i data-icon="${name}"${attrs}></i>`;
const current = (on) => (on ? ' aria-current="page"' : '');

/** Work out the active nav id from a URL (file name, ?endpoint=). */
export function activeFromUrl(url = typeof location !== 'undefined' ? location.href : '') {
  try {
    const u = new URL(url, 'http://x/');
    const file = u.pathname.split('/').pop().replace(/\.html$/, '');
    if (file === 'playground') return u.searchParams.get('endpoint') || 'scrape';
    return file;
  } catch {
    return '';
  }
}

function navItem(item, active) {
  const hint = item.hint ? `<span class="fd-nav-hint">${esc(item.hint)}</span>` : '';
  const badge = item.badge ? `<span class="fd-nav-badge">${esc(item.badge)}</span>` : '';
  return `<a class="fd-nav-item" href="${esc(item.href)}"${current(item.id === active)}>${i(item.icon)}<span class="fd-nav-text">${esc(item.label)}</span>${badge}${hint}</a>`;
}

function navGroup(item, active, prefix) {
  const open = item.children.some((c) => c.id === active);
  const id = `${prefix}-${item.id}`;
  const children = item.children.map((c) => {
    const hint = c.hint ? `<span class="fd-nav-hint">${esc(c.hint)}</span>` : '';
    return `<a class="fd-nav-item" href="${esc(c.href)}"${current(c.id === active)}><span class="fd-nav-text">${esc(c.label)}</span>${hint}</a>`;
  }).join('\n          ');
  return `<div class="fd-nav-group">
        <button class="fd-nav-item" type="button" aria-expanded="${open}" aria-controls="${id}">${i(item.icon)}<span class="fd-nav-text">${esc(item.label)}</span>${i('chevron-down', ' class="fd-nav-chevron"')}</button>
        <div class="fd-nav-sub" id="${id}"${open ? '' : ' hidden'}>
          ${children}
        </div>
      </div>`;
}

export function renderSidebar({ active = '', prefix = 'ember' } = {}) {
  const sections = NAV.map((section) => {
    const label = section.label ? `<p class="fd-nav-label">${esc(section.label)}</p>\n      ` : '';
    return label + section.items.map((item) => (item.children ? navGroup(item, active, prefix) : navItem(item, active))).join('\n      ');
  }).join('\n      ');
  const a = ACCOUNT;
  return `<aside class="fd-sidebar" aria-label="Ember">
  <div class="fd-sidebar-head">
    <a class="fd-brand" href="overview.html"><span class="fd-brand-mark">${EMBER_MARK}</span><span class="fd-brand-name">Ember</span></a>
    <button class="fd-btn fd-sidebar-toggle" type="button" data-variant="ghost" data-size="lg" data-icon-only data-fd-sidebar-toggle aria-label="Collapse sidebar">${i('panel-left')}</button>
  </div>
  <div class="fd-sidebar-body">
    <nav class="fd-nav" aria-label="Main">
      ${sections}
    </nav>
  </div>
  <div class="fd-sidebar-foot">
    <div class="fd-usage-card">
      <div class="fd-usage-card-head">
        <span class="fd-usage-card-ring" style="--value: ${a.creditsLeft}" aria-hidden="true"></span>
        <span class="fd-usage-card-title">${a.credits} credits left</span>
        <a class="fd-usage-card-link" href="usage.html" aria-label="View usage">${i('chart-column')}</a>
      </div>
      <p class="fd-usage-card-meta">Resets ${a.resets}</p>
      <a class="fd-btn" data-variant="inverse" data-block href="usage.html#plans">Upgrade</a>
    </div>
    <button class="fd-account" type="button" data-fd-menu="${prefix}-menu-account" data-placement="top-start" aria-label="Account menu, ${a.email}"><span class="fd-account-avatar" aria-hidden="true">${a.initials}</span><span class="fd-account-email">${a.email}</span>${i('chevrons-up-down')}</button>
  </div>
</aside>`;
}

export function renderTopbar({ prefix = 'ember', mobileOpen = false } = {}) {
  const a = ACCOUNT;
  return `<header class="fd-topbar">
  <a class="fd-topbar-brand" data-only="mobile" href="overview.html" aria-label="Ember overview">${EMBER_MARK}</a>
  <button class="fd-btn fd-team-switch" type="button" data-fd-menu="${prefix}-menu-team" data-placement="bottom-start"><span class="fd-team-switch-tile" aria-hidden="true" data-fd-team-tile>${a.teamInitial}</span><span data-fd-menu-value>${esc(a.team)}</span><span class="fd-team-switch-meta">Team</span>${i('chevrons-up-down')}</button>
  <div class="fd-topbar-actions">
    <button class="fd-btn" type="button" data-only="desktop" data-fd-search-trigger data-fd-command-open="${prefix}-command" style="width: 220px">${i('search')}<span class="fd-grow fd-muted">Search…</span><kbd class="fd-kbd">⌘K</kbd></button>
    <button class="fd-btn" type="button" data-icon-only data-fd-popover="${prefix}-notifs" data-placement="bottom-end" data-fd-tooltip="Notifications" aria-label="Notifications">${i('bell')}<span class="fd-overlay-count" data-fd-unread-count="${prefix}-notifs">2</span></button>
    <button class="fd-btn" type="button" data-icon-only data-only="desktop" data-fd-theme-toggle data-fd-tooltip="Theme" aria-label="Theme">${i('monitor')}</button>
    <button class="fd-btn" type="button" data-only="desktop" data-fd-menu="${prefix}-menu-help" data-placement="bottom-end">${i('circle-help')}<span>Help</span></button>
    <a class="fd-btn" data-only="desktop" href="${DOCS}" target="_blank" rel="noopener">${i('book-open')}<span>Docs</span></a>
    <a class="fd-btn" data-variant="primary" data-only="desktop" href="usage.html#plans"><span>Upgrade</span></a>
    <button class="fd-btn" type="button" data-icon-only data-only="mobile" data-fd-mobile-nav aria-controls="${prefix}-mobile-nav" aria-expanded="${mobileOpen}" aria-label="${mobileOpen ? 'Close menu' : 'Open menu'}">${i(mobileOpen ? 'x' : 'menu')}</button>
  </div>
</header>`;
}

export function renderMobileNav({ active = '', prefix = 'ember', open = false } = {}) {
  const a = ACCOUNT;
  const row = (item) => `<a class="fd-mobile-nav-item" href="${esc(item.href)}"${current(item.id === active)}><span>${esc(item.label)}</span>${item.badge ? `<span class="fd-nav-badge">${esc(item.badge)}</span>` : ''}${i(item.icon)}</a>`;
  const sections = NAV.map((section) => {
    const items = section.items.flatMap((item) => item.children || [item]);
    const label = section.label ? `<p class="fd-mobile-nav-label">${esc(section.label)}</p>\n    ` : '';
    return `<div class="fd-mobile-nav-section">
    ${label}${items.map(row).join('\n    ')}
  </div>`;
  }).join('\n  ');
  return `<div class="fd-mobile-nav" id="${prefix}-mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" data-state="${open ? 'open' : 'closed'}"${open ? '' : ' hidden'}>
  <div class="fd-mobile-nav-actions">
    <a class="fd-btn" data-variant="primary" data-size="xl" data-block href="usage.html#plans">Upgrade plan</a>
    <a class="fd-btn" data-size="xl" data-block href="#sales">Contact sales</a>
  </div>
  <a class="fd-mobile-nav-account" href="settings.html"><span>${a.email}</span><span class="fd-account-avatar" aria-hidden="true">${a.initials}</span></a>
  ${sections}
</div>`;
}

/* ---------- Overlays: rendered once, shared by every control in the shell ---------- */
const flatNav = () => NAV.flatMap((section) => section.items.flatMap((item) => item.children || [item]));
const NAV_KEYWORDS = {
  overview: 'home dashboard credits', install: 'mcp skill cli agent claude cursor codex connect', catalog: 'providers data sources',
  search: 'web query results', scrape: 'page url markdown', interact: 'click browser actions session', parse: 'pdf document file upload',
  crawl: 'site website links', map: 'urls sitemap discover', batch: 'many urls bulk', monitoring: 'watch changes diff webhook',
  agent: 'research ask run', logs: 'requests history', usage: 'credits billing plan', 'api-keys': 'tokens secrets', settings: 'preferences team account',
};
const NAV_HINTS = {
  overview: 'Credits, keys and recent activity', install: 'Skill, CLI and MCP setup', catalog: 'Data providers', monitoring: 'Watch pages for changes',
  logs: 'Requests from the last 30 days', usage: 'Credits and concurrency', 'api-keys': '3 active keys', settings: 'Team, billing and account',
  parse: '/parse', agent: '/agent',
};
const navHint = (n) => (NAV_HINTS[n.id]
  ? `<span class="fd-command-item-hint">${esc(NAV_HINTS[n.id])}</span>`
  : `<span class="fd-command-item-hint fd-mono">${esc(n.hint)}</span>`);
const kbd = (keys) => keys.map((k) => `<kbd class="fd-kbd">${k}</kbd>`).join('');
const menuLink = (href, icon, label, external) => `<a class="fd-menu-item" href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${i(icon)}<span class="fd-menu-item-label">${esc(label)}</span>${external ? i('arrow-up-right') : ''}</a>`;

export function renderOverlays({ prefix = 'ember' } = {}) {
  const teams = TEAMS.map((t) => `<button class="fd-menu-item" role="menuitemradio" aria-checked="${t.current ? 'true' : 'false'}" data-value="${t.id}" data-initial="${t.initial}"><span class="fd-tile" data-size="20" data-tone="${t.tone}"${t.current ? ' data-bordered' : ''}>${t.initial}</span><span class="fd-menu-item-label">${esc(t.name)}</span></button>`).join('\n    ');
  const navItems = flatNav().map((n) => `<a class="fd-command-item" href="${esc(n.href)}" data-keywords="${esc(NAV_KEYWORDS[n.id] || '')}">${i(n.icon)}<span class="fd-command-item-label">${esc(n.label)}</span>${NAV_HINTS[n.id] || n.hint ? navHint(n) : ''}</a>`).join('\n      ');
  return `<div class="fd-menu" id="${prefix}-menu-team" popover role="menu" data-variant="switcher" aria-label="Teams">
    <div class="fd-menu-head"><p class="fd-menu-title">Teams</p><button class="fd-menu-close" type="button" aria-label="Close menu">${i('x')}</button></div>
    ${teams}
    <hr class="fd-menu-sep">
    <button class="fd-menu-item" data-value="new-team">${i('plus')}<span class="fd-menu-item-label">New team</span></button>
    <a class="fd-menu-item" href="settings.html#team">${i('settings')}<span class="fd-menu-item-label">Team settings</span></a>
    <button class="fd-menu-item" data-value="invite">${i('user-plus')}<span class="fd-menu-item-label">Invite members</span></button>
  </div>
  <div class="fd-menu" id="${prefix}-menu-account" popover role="menu" aria-label="Account" data-placement="top-start">
    <div class="fd-menu-head"><p class="fd-menu-title">Account</p><button class="fd-menu-close" type="button" aria-label="Close menu">${i('x')}</button></div>
    ${menuLink('settings.html', 'settings', 'Settings')}
    ${menuLink('settings.html#billing', 'credit-card', 'Billing')}
    ${menuLink('usage.html', 'chart-column', 'Usage')}
    <hr class="fd-menu-sep">
    ${menuLink('https://ember.dev/tools/domain-checker', 'globe', 'Domain checker', true)}
    ${menuLink(`${DOCS}/changelog`, 'scroll-text', 'Changelog', true)}
    ${menuLink(DOCS, 'book-open', 'Documentation', true)}
    ${menuLink('https://community.ember.dev', 'users', 'Join the community', true)}
    <hr class="fd-menu-sep">
    <button class="fd-menu-item" data-value="sign-out">${i('log-out')}<span class="fd-menu-item-label">Sign out</span></button>
  </div>
  <div class="fd-menu" id="${prefix}-menu-help" popover role="menu" aria-label="Help" data-placement="bottom-end">
    ${menuLink(DOCS, 'book-open', 'Documentation', true)}
    ${menuLink(`${DOCS}/api-reference`, 'braces', 'API reference', true)}
    ${menuLink('https://status.ember.dev', 'activity', 'Status', true)}
    <button class="fd-menu-item" data-value="shortcuts">${i('keyboard')}<span class="fd-menu-item-label">Keyboard shortcuts</span>${kbd(['⌘K'])}</button>
    <hr class="fd-menu-sep">
    ${menuLink('mailto:support@ember.dev', 'mail', 'Contact support')}
  </div>
  <div class="fd-popover" id="${prefix}-notifs" popover data-fd-notifications data-size="lg" aria-label="Notifications">
    <div class="fd-popover-head">
      <p class="fd-popover-title">Notifications</p>
      <div class="fd-popover-actions">
        <button class="fd-btn-text" type="button" data-fd-mark-read>${i('check-check')}<span>Mark all read</span></button>
        <a class="fd-btn" data-variant="ghost" data-size="sm" data-icon-only href="settings.html#notifications" aria-label="Notification settings" data-fd-tooltip="Notification settings">${i('settings-2')}</a>
      </div>
    </div>
    <div class="fd-popover-toolbar">
      <div class="fd-segmented" role="radiogroup" aria-label="Show" data-size="sm">
        <button class="fd-segmented-item" type="button" role="radio" aria-checked="true" data-fd-show="all">All</button>
        <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" data-fd-show="unread">Unread</button>
      </div>
      <label class="fd-select" data-size="sm"><span class="fd-sr-only">Category</span>
        <select data-fd-category><option value="all">All categories</option><option value="jobs">Jobs</option><option value="monitors">Monitors</option><option value="billing">Billing</option></select>
      </label>
    </div>
    <div class="fd-popover-body">
      <div class="fd-notification-list">
        <a class="fd-notification" href="logs.html" data-unread data-category="jobs">
          <span class="fd-tile" data-size="28" data-tone="success">${i('circle-check')}</span>
          <span class="fd-notification-body"><span class="fd-notification-title">Crawl finished</span><span class="fd-notification-text">docs.quarry.dev · 1,204 pages in 3m 12s</span></span>
          <span class="fd-notification-meta">2m</span>
        </a>
        <a class="fd-notification" href="monitoring.html" data-unread data-category="monitors">
          <span class="fd-tile" data-size="28" data-tone="neutral">${i('radar')}</span>
          <span class="fd-notification-body"><span class="fd-notification-title">Monitor detected changes</span><span class="fd-notification-text">northwind.dev/pricing changed in 3 places since yesterday’s check.</span></span>
          <span class="fd-notification-meta">48m</span>
        </a>
        <a class="fd-notification" href="usage.html" data-category="billing">
          <span class="fd-tile" data-size="28" data-tone="warning">${i('gauge')}</span>
          <span class="fd-notification-body"><span class="fd-notification-title">Half your credits are used</span><span class="fd-notification-text">1,520 of 3,000 credits left. They reset on Nov 23.</span></span>
          <span class="fd-notification-meta">Yesterday</span>
        </a>
        <a class="fd-notification" href="logs.html" data-category="jobs">
          <span class="fd-tile" data-size="28" data-tone="danger">${i('webhook')}</span>
          <span class="fd-notification-body"><span class="fd-notification-title">Webhook delivery failed</span><span class="fd-notification-text">hooks.quarry.dev returned 502 for run_8f2a91.</span></span>
          <span class="fd-notification-meta">Nov 12</span>
        </a>
      </div>
      <div class="fd-popover-empty" hidden>
        <p class="fd-popover-empty-title">You’re all caught up</p>
        <p class="fd-popover-empty-text">Finished jobs, monitor changes and billing alerts will show up here.</p>
      </div>
    </div>
    <div class="fd-popover-foot" data-align="center"><a class="fd-btn-text" href="logs.html"><span>View all notifications</span>${i('arrow-right', ' data-nudge')}</a></div>
  </div>
  <dialog class="fd-command" id="${prefix}-command" aria-label="Command palette">
    <div class="fd-command-search">
      ${i('search')}
      <input class="fd-command-input" type="text" placeholder="Search pages, actions and docs…" aria-label="Search commands" autocomplete="off" spellcheck="false">
      <kbd class="fd-kbd">esc</kbd>
    </div>
    <div class="fd-command-list">
      <div class="fd-command-group">
        <p class="fd-command-group-label">Navigation</p>
        ${navItems}
      </div>
      <div class="fd-command-group">
        <p class="fd-command-group-label">Actions</p>
        <a class="fd-command-item" href="${PLAYGROUND}scrape" data-keywords="page url markdown">${i('file-text')}<span class="fd-command-item-label">Scrape a page</span><span class="fd-command-item-hint fd-mono">/scrape</span></a>
        <a class="fd-command-item" href="${PLAYGROUND}crawl" data-keywords="site website links">${i('workflow')}<span class="fd-command-item-label">Start a crawl</span><span class="fd-command-item-hint fd-mono">/crawl</span></a>
        <a class="fd-command-item" href="api-keys.html#create" data-keywords="token new secret">${i('plus')}<span class="fd-command-item-label">Create API key</span></a>
        <a class="fd-command-item" href="settings.html#team" data-keywords="member team people invite">${i('user-plus')}<span class="fd-command-item-label">Invite a teammate</span></a>
        <div class="fd-command-item" data-value="theme" data-keywords="dark light mode appearance">${i('moon')}<span class="fd-command-item-label">Switch theme</span><span class="fd-command-item-hint">Light, dark or system</span></div>
      </div>
      <div class="fd-command-group">
        <p class="fd-command-group-label">Docs</p>
        <a class="fd-command-item" href="${DOCS}/quickstart" target="_blank" rel="noopener" data-keywords="start guide first request">${i('book-open')}<span class="fd-command-item-label">Quickstart</span><span class="fd-command-item-hint">Your first request in two minutes</span></a>
        <a class="fd-command-item" href="${DOCS}/api-reference" target="_blank" rel="noopener" data-keywords="endpoints reference openapi">${i('book-open')}<span class="fd-command-item-label">API reference</span><span class="fd-command-item-hint">Every endpoint and parameter</span></a>
        <a class="fd-command-item" href="${DOCS}/crawl-options" target="_blank" rel="noopener" data-keywords="depth limits include paths">${i('book-open')}<span class="fd-command-item-label">Crawl options</span><span class="fd-command-item-hint">Depth, include paths, limits</span></a>
        <a class="fd-command-item" href="${DOCS}/rate-limits" target="_blank" rel="noopener" data-keywords="concurrency 429 throttle">${i('book-open')}<span class="fd-command-item-label">Rate limits</span><span class="fd-command-item-hint">Concurrency on each plan</span></a>
      </div>
    </div>
    <div class="fd-command-empty" hidden>
      ${i('search')}
      <p class="fd-command-empty-title">No results for “<span data-fd-command-query></span>”</p>
      <p class="fd-command-empty-text">Try a page name, an endpoint like /crawl, or a doc title.</p>
    </div>
    <div class="fd-command-foot">
      <span>${kbd(['↑', '↓'])}navigate</span>
      <span>${kbd(['↵'])}select</span>
      <span>${kbd(['esc'])}close</span>
    </div>
  </dialog>`;
}

/** Full shell markup with `content` as the page. */
export function renderShell({ active = '', content = '', sidebar = 'expanded', contained = false, prefix = 'ember', mobileOpen = false } = {}) {
  return `<div class="fd-app" data-sidebar="${sidebar}"${contained ? ' data-contained' : ''}>
${renderSidebar({ active, prefix })}
<div class="fd-main">
${renderTopbar({ prefix, mobileOpen })}
${content}
</div>
${renderMobileNav({ active, prefix, open: mobileOpen })}
<button class="fd-fab fd-app-fab" type="button" data-fd-tooltip="Chat with support" data-placement="left" aria-label="Chat with support">${i('message-circle')}</button>
${renderOverlays({ prefix })}
</div>`;
}

function savedSidebar() {
  try { return localStorage.getItem('fd-sidebar') === 'collapsed' ? 'collapsed' : 'expanded'; } catch { return 'expanded'; }
}

/* ---------- Demo behaviour for the overlays (bound once per page) ---------- */
let behaviourBound = false;
function bindBehaviour(fire, prefix) {
  if (behaviourBound) return;
  behaviourBound = true;
  const { toast, command } = fire.overlays;
  const say = (title, description, tone = 'neutral') => toast({ title, description, tone });
  document.addEventListener('fd:select', (event) => {
    const item = event.target instanceof Element ? event.target : null;
    if (!item) return;
    const value = event.detail?.value;
    if (item.closest(`#${prefix}-menu-team`)) {
      if (item.getAttribute('role') === 'menuitemradio') {
        const tile = document.querySelector('[data-fd-team-tile]');
        if (tile && item.dataset.initial) tile.textContent = item.dataset.initial;
        say(`Switched to ${item.querySelector('.fd-menu-item-label')?.textContent.trim()}`, 'Keys, credits and runs now belong to this team.', 'success');
      } else if (value === 'new-team') say('New team', 'Creating teams is not part of this demo.', 'info');
      else if (value === 'invite') say('Invite members', 'Invitations are not part of this demo.', 'info');
    } else if (item.closest(`#${prefix}-menu-account`) && value === 'sign-out') {
      say('Signed out', 'This is a demo, so you are still signed in.', 'info');
    } else if (item.closest(`#${prefix}-menu-help`) && value === 'shortcuts') {
      setTimeout(() => command.open(`${prefix}-command`), 60);
    } else if (item.closest(`#${prefix}-command`) && value === 'theme') {
      fire.shell.cycleTheme();
    }
  });
  // The search control only earns its width on large screens.
  const wide = matchMedia('(min-width: 1100px)');
  const sync = () => document.querySelectorAll('[data-fd-search-trigger]').forEach((el) => { el.hidden = !wide.matches; });
  wide.addEventListener('change', sync);
  sync();
}

/** Wrap the page's <main> in the Ember shell. Returns the .fd-app element. */
export function mountShell({ active, title } = {}) {
  const body = document.body;
  const existing = body.querySelector(':scope > .fd-app');
  if (existing) return existing;
  const main = body.querySelector('main') || Object.assign(document.createElement('main'), { className: 'fd-page' });
  main.classList.add('fd-page');
  const id = active ?? body.dataset.active ?? activeFromUrl();
  const t = document.createElement('template');
  t.innerHTML = renderShell({ active: id, sidebar: savedSidebar() });
  const app = t.content.firstElementChild;
  // Rendered hidden below 1100px so the search control never flashes on narrow screens.
  if (typeof matchMedia === 'function' && !matchMedia('(min-width: 1100px)').matches) app.querySelectorAll('[data-fd-search-trigger]').forEach((el) => { el.hidden = true; });
  if (main.isConnected) main.before(app); else body.prepend(app);
  app.querySelector('.fd-main').append(main);
  const heading = title ?? body.dataset.title;
  if (heading) document.title = `${heading} · Ember`;
  body.setAttribute('data-shell', 'mounted');
  // fire.js initialises the document once on load. If that already happened, the markup inserted above still
  // needs it; every Fire init is idempotent, so a page that also calls init() cannot double-bind.
  const fireReady = document.documentElement.hasAttribute('data-fd-ready');
  import('../fire/fire.js')
    .then((fire) => { if (fireReady) fire.init(app); bindBehaviour(fire, 'ember'); })
    .catch((error) => console.error('[ember] shell init failed', error));
  return app;
}

if (typeof document !== 'undefined' && document.body?.hasAttribute('data-shell') && document.body.dataset.shell !== 'mounted') {
  mountShell();
}
