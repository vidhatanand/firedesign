// The app shell (a server component), converted from templates/shell-static.html per spec/EXPORT.md: sidebar, top bar
// and phone menu, plus the support launcher and chat panel that templates/shell.js adds to every Ember screen. Fire's
// shell behaviour (sidebar collapse, phone menu, rail tips, tweaks, chat) comes from fire.js; the shell is rendered
// once and React never re-renders it, so what Fire writes into it stays Fire's (O1, O2).
import type { ReactNode } from 'react';
import { NavLink } from './nav-link';

const NAV = [
  { group: null, items: [{ href: '/overview', icon: 'home', label: 'Overview' }] },
  { group: 'Account', items: [{ href: '/logs', icon: 'list', label: 'Activity logs' }, { href: '/settings', icon: 'settings', label: 'Settings' }] },
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
                <NavLink className="fd-nav-item" href={item.href} key={item.href}>
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
      <button className="fd-fab fd-app-fab fd-chat-launcher" type="button" data-fd-chat-toggle="ember-chat" data-fd-tooltip="Chat with support" data-placement="left" aria-label="Chat with support">
        <span className="fd-chat-launcher-icon" data-role="open"><Icon name="message-circle" /></span>
        <span className="fd-chat-launcher-icon" data-role="close"><Icon name="chevron-down" /></span>
        <span className="fd-chat-launcher-badge" hidden></span>
      </button>
      <section className="fd-chat" id="ember-chat" data-mode="panel" data-state="closed" data-fd-chat-demo="" aria-label="Ember support"></section>
    </div>
  );
}
