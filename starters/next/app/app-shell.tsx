// The app shell (a server component), converted from templates/shell-static.html per spec/EXPORT.md: sidebar, top bar
// (running-now pill, service status, search, shortcut sheet), phone menu, the running-now popover, the shortcut sheet
// and the command palette, plus the support launcher and chat panel that templates/shell.js adds to every Ember
// screen. The nav lists this starter's routes only; each item carries its go-to keys (data-fd-keys="g l"). Fire's shell
// behaviour (sidebar collapse, phone menu, rail tips, keys, palette, tweaks, chat) comes from fire.js; the shell is
// rendered once and React never re-renders it, so what Fire writes into it stays Fire's (O1, O2).
import type { ReactNode } from 'react';
import { NavLink } from './nav-link';

const NAV = [
  { group: null, items: [{ href: '/overview', icon: 'home', label: 'Overview', keys: 'g o', keywords: 'home dashboard credits' }] },
  {
    group: 'Account',
    items: [
      { href: '/logs', icon: 'list', label: 'Activity logs', keys: 'g l', keywords: 'requests history' },
      { href: '/settings', icon: 'settings', label: 'Settings', keys: 'g s', keywords: 'preferences team account' },
    ],
  },
];
/** What is running now: the pill counts the items of its popover. `value` is the progress, 0 to 1. */
const RUNNING = [
  { href: '/logs#run_8f2a91', kind: 'crawl', icon: 'network', tone: 'accent', title: 'Crawl docs.quarry.dev', time: '2m 08s', meta: '412 of 1,200 pages', value: 0.34 },
  { href: '/logs#mon_31e9b2', kind: 'monitor', icon: 'radar', tone: 'neutral', title: 'Monitor: acme.dev/changelog', time: '12s', meta: 'Checking now · 6 pages', value: 0.8 },
];

/** A Fire icon in its static SVG form (spec I2): what fire.js draws for <i data-icon="name">. */
function Icon({ name, className }: { name: string; className?: string }) {
  return <svg className={className ? `fd-icon ${className}` : 'fd-icon'} data-icon={name} aria-hidden="true"><use href={`#i-${name}`} /></svg>;
}

function Mark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4.5" y="7.5" width="12" height="12" rx="3.25" transform="rotate(45 10.5 13.5)"></rect>
      <circle cx="19" cy="5" r="2.5"></circle>
      <circle cx="14.25" cy="2.25" r="1.25" opacity=".55"></circle>
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="fd-app" data-sidebar="expanded">
      <aside className="fd-sidebar" aria-label="Ember">
        <div className="fd-sidebar-head">
          <a className="fd-brand" href="/overview">
            <span className="fd-brand-mark"><Mark /></span>
            <span className="fd-brand-name">Ember</span>
          </a>
          <button className="fd-btn fd-sidebar-toggle" type="button" data-variant="ghost" data-size="lg" data-icon-only="" data-fd-sidebar-toggle="" aria-label="Collapse sidebar">
            <Icon name="panel-left" />
          </button>
        </div>
        <div className="fd-sidebar-body">
          <nav className="fd-nav" aria-label="Main">
            {NAV.flatMap(({ group, items }) => [
              group ? <p className="fd-nav-label" key={group}>{group}</p> : null,
              ...items.map((item) => (
                <NavLink className="fd-nav-item" href={item.href} keys={item.keys} key={item.href}>
                  <Icon name={item.icon} />
                  <span className="fd-nav-text">{item.label}</span>
                </NavLink>
              )),
            ])}
          </nav>
        </div>
        <div className="fd-sidebar-foot">
          <a className="fd-account" href="/settings" aria-label="Account, maya@quarry.dev">
            <span className="fd-account-avatar" aria-hidden="true">MR</span>
            <span className="fd-account-email">maya@quarry.dev</span>
          </a>
        </div>
      </aside>
      <div className="fd-main">
        <header className="fd-topbar">
          <a className="fd-topbar-brand" data-only="mobile" href="/overview" aria-label="Ember overview"><Mark /></a>
          <span className="fd-topbar-title">Quarry Labs</span>
          <div className="fd-topbar-actions">
            <button className="fd-running" type="button" data-fd-running="ember-running" data-fd-popover="ember-running" data-placement="bottom-end" aria-label={`${RUNNING.length} running`}>
              <span className="fd-running-dot" aria-hidden="true"></span>
              <span className="fd-running-count">{RUNNING.length}</span>
              <span className="fd-running-label">running</span>
            </button>
            <a className="fd-service-status" data-status="operational" href="https://status.ember.dev" target="_blank" rel="noopener" data-fd-tooltip="All systems operational" aria-label="All systems operational">
              <Icon name="activity" />
              <span className="fd-service-status-label">All systems operational</span>
            </a>
            <button className="fd-btn" type="button" data-only="desktop" data-fd-command-open="ember-command" data-fd-keys="/" data-fd-keys-label="Search">
              <Icon name="search" />
              <span className="fd-grow fd-muted">Search…</span>
              <kbd className="fd-kbd">⌘K</kbd>
            </button>
            <button className="fd-btn" type="button" data-icon-only="" data-only="desktop" data-fd-dialog-open="ember-shortcuts" data-fd-keys="?" data-fd-keys-label="Keyboard shortcuts" data-fd-tooltip="Keyboard shortcuts" aria-label="Keyboard shortcuts">
              <Icon name="keyboard" />
            </button>
            <button className="fd-btn" type="button" data-icon-only="" data-fd-tweaks-open="" data-fd-tooltip="Tweaks" aria-label="Tweaks" aria-expanded="false">
              <Icon name="sliders-horizontal" />
            </button>
            <a className="fd-btn" data-variant="ghost" data-only="desktop" href="https://docs.ember.dev">
              <Icon name="book-open" />
              <span>Docs</span>
            </a>
            <a className="fd-btn" data-only="desktop" href="/settings">
              <Icon name="user" />
              <span>Your account</span>
            </a>
            <button className="fd-btn" type="button" data-icon-only="" data-only="mobile" data-fd-mobile-nav="" aria-controls="ember-mobile-nav" aria-expanded="false" aria-label="Open menu">
              <Icon name="menu" />
            </button>
          </div>
        </header>
        {children}
      </div>
      <div className="fd-mobile-nav" id="ember-mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" data-state="closed" hidden>
        <a className="fd-mobile-nav-account" href="/settings">
          <span>maya@quarry.dev</span>
          <span className="fd-account-avatar" aria-hidden="true">MR</span>
        </a>
        {NAV.map(({ group, items }) => (
          <div className="fd-mobile-nav-section" key={group ?? 'top'}>
            {group ? <p className="fd-mobile-nav-label">{group}</p> : null}
            {items.map((item) => (
              <NavLink className="fd-mobile-nav-item" href={item.href} key={item.href}>
                <span>{item.label}</span>
                <Icon name={item.icon} />
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="fd-popover" id="ember-running" popover="" data-size="lg" aria-label="Running now">
        <div className="fd-popover-head">
          <p className="fd-popover-title">Running now</p>
        </div>
        <div className="fd-popover-body">
          <div className="fd-running-list">
            {RUNNING.map((run) => (
              <a className="fd-running-item" href={run.href} data-kind={run.kind} key={run.href}>
                <span className="fd-tile" data-size="28" data-tone={run.tone}><Icon name={run.icon} /></span>
                <span className="fd-running-title">{run.title}</span>
                <span className="fd-running-time">{run.time}</span>
                <span className="fd-running-meta">{run.meta}</span>
                {/* data-fd-vars: boot.js moves it into a custom property before hydration (N4) */}
                <span className="fd-running-bar" data-fd-vars={`--value: ${run.value}`} aria-hidden="true" suppressHydrationWarning></span>
              </a>
            ))}
          </div>
        </div>
        <div className="fd-popover-foot" data-align="center">
          <a className="fd-btn-text" href="/logs">
            <span>View all runs</span>
            <svg className="fd-icon" data-icon="arrow-right" aria-hidden="true" data-nudge=""><use href="#i-arrow-right" /></svg>
          </a>
        </div>
      </div>
      <dialog className="fd-dialog" id="ember-shortcuts" data-size="md" data-fd-shortcuts="">
        <div className="fd-dialog-head">
          <h2 className="fd-h3 fd-dialog-title">Keyboard shortcuts</h2>
          <p className="fd-dialog-desc">They work anywhere except in a field.</p>
          <button className="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-dialog-close="" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="fd-dialog-body"><div data-fd-shortcuts-list=""></div></div>
      </dialog>
      <dialog className="fd-command" id="ember-command" aria-label="Command palette">
        <div className="fd-command-search">
          <Icon name="search" />
          <input className="fd-command-input" type="text" placeholder="Search pages and records…" aria-label="Search commands" autoComplete="off" spellCheck="false" />
          <kbd className="fd-kbd">esc</kbd>
        </div>
        <div className="fd-command-list">
          <div className="fd-command-group">
            <p className="fd-command-group-label">Navigation</p>
            {NAV.flatMap(({ items }) => items).map((item) => (
              <a className="fd-command-item" href={item.href} data-keywords={item.keywords} key={item.href}>
                <Icon name={item.icon} />
                <span className="fd-command-item-label">{item.label}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="fd-command-empty" hidden>
          <Icon name="search" />
          <p className="fd-command-empty-title">No results for “<span data-fd-command-query=""></span>”</p>
          <p className="fd-command-empty-text">Try a page name or a run ID.</p>
        </div>
        <div className="fd-command-foot">
          <span><kbd className="fd-kbd">↑</kbd><kbd className="fd-kbd">↓</kbd>navigate</span>
          <span><kbd className="fd-kbd">↵</kbd>select</span>
          <span><kbd className="fd-kbd">esc</kbd>close</span>
        </div>
      </dialog>
      <button className="fd-fab fd-app-fab fd-chat-launcher" type="button" data-fd-chat-toggle="ember-chat" data-fd-tooltip="Chat with support" data-placement="left" aria-label="Chat with support">
        <span className="fd-chat-launcher-icon" data-role="open"><Icon name="message-circle" /></span>
        <span className="fd-chat-launcher-icon" data-role="close"><Icon name="chevron-down" /></span>
        <span className="fd-chat-launcher-badge" hidden></span>
      </button>
      <section className="fd-chat" id="ember-chat" data-mode="panel" data-state="closed" data-fd-chat-demo="" aria-label="Ember support"></section>
    </div>
  );
}
