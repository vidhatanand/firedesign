import { html, nothing } from 'lit';
import { FireLight } from '../lib/fire-light';
import { currentRoute, routes, type Route } from '../lib/router';

/** Ember's mark, used by the sidebar brand and the phone top bar (templates/shell-static.html). */
const mark = html`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4.5" y="7.5" width="12" height="12" rx="3.25" transform="rotate(45 10.5 13.5)"/><circle cx="19" cy="5" r="2.5"/><circle cx="14.25" cy="2.25" r="1.25" opacity=".55"/></svg>`;

const ACCOUNT = { email: 'maya@quarry.dev', initials: 'MR' };

/**
 * The app shell: sidebar, top bar, phone menu, the support chat, and the page area where the current screen sits.
 * It follows templates/shell-static.html. Fire's `shell` module collapses the sidebar and opens the phone menu on
 * its own, from the `data-fd-*` attributes below, so this component only renders and swaps the screen.
 */
export class AppShell extends FireLight {
  static override properties = { route: { state: true } };
  declare route: Route;
  private screen?: HTMLElement;

  constructor() {
    super();
    this.route = currentRoute();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addEventListener('popstate', this.onRoute);
  }

  override disconnectedCallback(): void {
    removeEventListener('popstate', this.onRoute);
    super.disconnectedCallback();
  }

  private onRoute = (): void => {
    const next = currentRoute();
    if (next !== this.route) this.route = next;
  };

  /** One element per screen: a new route makes a new element, so the old screen's state goes with it. */
  private screenFor(route: Route): HTMLElement {
    if (this.screen?.localName !== route.tag) this.screen = document.createElement(route.tag);
    return this.screen;
  }

  protected override willUpdate(): void {
    document.title = `${this.route.label} · Ember`;
  }

  private navItem(route: Route) {
    return html`<a class="fd-nav-item" href=${route.path} aria-current=${route === this.route ? 'page' : nothing}><fd-icon icon=${route.icon}></fd-icon><span class="fd-nav-text">${route.label}</span></a>`;
  }

  /** Nav items in order, with a label wherever the group changes. */
  private nav() {
    let group: string | undefined;
    return routes.map((route) => {
      const label = route.group !== group && route.group ? html`<p class="fd-nav-label">${route.group}</p>` : nothing;
      group = route.group;
      return html`${label}${this.navItem(route)}`;
    });
  }

  private mobileNav() {
    let group: string | undefined;
    return routes.map((route) => {
      const label = route.group !== group && route.group ? html`<p class="fd-mobile-nav-label">${route.group}</p>` : nothing;
      group = route.group;
      return html`${label}<a class="fd-mobile-nav-item" href=${route.path} aria-current=${route === this.route ? 'page' : nothing}><span>${route.label}</span><fd-icon icon=${route.icon}></fd-icon></a>`;
    });
  }

  protected override render() {
    return html`
      <div class="fd-app" data-sidebar="expanded">
        <aside class="fd-sidebar" aria-label="Ember">
          <div class="fd-sidebar-head">
            <a class="fd-brand" href="/overview"><span class="fd-brand-mark">${mark}</span><span class="fd-brand-name">Ember</span></a>
            <button class="fd-btn fd-sidebar-toggle" type="button" data-variant="ghost" data-size="lg" data-icon-only data-fd-sidebar-toggle aria-label="Collapse sidebar"><fd-icon icon="panel-left"></fd-icon></button>
          </div>
          <div class="fd-sidebar-body">
            <nav class="fd-nav" aria-label="Main">${this.nav()}</nav>
          </div>
          <div class="fd-sidebar-foot">
            <a class="fd-account" href="/settings" aria-label="Account, ${ACCOUNT.email}"><span class="fd-account-avatar" aria-hidden="true">${ACCOUNT.initials}</span><span class="fd-account-email">${ACCOUNT.email}</span></a>
          </div>
        </aside>

        <div class="fd-main">
          <header class="fd-topbar">
            <a class="fd-topbar-brand" data-only="mobile" href="/overview" aria-label="Ember overview">${mark}</a>
            <span class="fd-topbar-title">Quarry Labs</span>
            <div class="fd-topbar-actions">
              <button class="fd-btn" type="button" data-icon-only data-fd-tweaks-open data-fd-tooltip="Tweaks" aria-label="Tweaks" aria-expanded="false"><fd-icon icon="sliders-horizontal"></fd-icon></button>
              <a class="fd-btn" data-variant="ghost" data-only="desktop" href="https://docs.ember.dev"><fd-icon icon="book-open"></fd-icon><span>Docs</span></a>
              <a class="fd-btn" data-only="desktop" href="/settings"><fd-icon icon="user"></fd-icon><span>Your account</span></a>
              <button class="fd-btn" type="button" data-icon-only data-only="mobile" data-fd-mobile-nav aria-controls="ember-mobile-nav" aria-expanded="false" aria-label="Open menu"><fd-icon icon="menu"></fd-icon></button>
            </div>
          </header>

          ${this.screenFor(this.route)}
        </div>

        <div class="fd-mobile-nav" id="ember-mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" data-state="closed" hidden>
          <a class="fd-mobile-nav-account" href="/settings"><span>${ACCOUNT.email}</span><span class="fd-account-avatar" aria-hidden="true">${ACCOUNT.initials}</span></a>
          <div class="fd-mobile-nav-section">${this.mobileNav()}</div>
        </div>

        <button class="fd-fab fd-app-fab fd-chat-launcher" type="button" data-fd-chat-toggle="ember-chat" data-fd-tooltip="Chat with support" data-placement="left" aria-label="Chat with support"><span class="fd-chat-launcher-icon" data-role="open"><fd-icon icon="message-circle"></fd-icon></span><span class="fd-chat-launcher-icon" data-role="close"><fd-icon icon="chevron-down"></fd-icon></span><span class="fd-chat-launcher-badge" hidden></span></button>
        <section class="fd-chat" id="ember-chat" data-mode="panel" data-state="closed" data-fd-chat-demo aria-label="Ember support"></section>
      </div>
    `;
  }
}

customElements.define('app-shell', AppShell);
