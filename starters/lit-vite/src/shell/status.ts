import { html, nothing, type TemplateResult } from 'lit';
import { FireLight } from '../lib/fire-light';
import { href, retry, type Params } from '../lib/router';

/**
 * The screens the router shows when there is no screen to show: an unknown address, a guard that said no, and a
 * screen whose module failed to load. The markup is Fire's full-page states (templates/not-found.html). They live in
 * the shell's chunk, so they show even when nothing else can load.
 */
const icon = (name: string) => html`<svg class="fd-icon" data-icon=${name} aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const page = (label: string, body: TemplateResult, tone?: string) => html`
  <main class="fd-page">
    <div class="fd-frame">
      <section class="fd-band" data-pad="none" data-grow aria-label=${label}>
        <div class="fd-empty" data-size="lg" data-tone=${tone ?? nothing}>${body}</div>
      </section>
    </div>
  </main>`;
const home = () => html`<a class="fd-btn" data-variant="primary" data-size="lg" href=${href('/overview')}>${icon('home')}<span>Back to overview</span></a>`;

class ScreenNotFound extends FireLight {
  static override properties = { params: { attribute: false } };
  declare params: Params;

  protected override render() {
    return page('Page not found', html`
      <div class="fd-empty-art"><div class="fd-ascii" data-fd-ascii="rain" aria-hidden="true"></div></div>
      <div class="fd-stack" data-gap="3"><p class="fd-eyebrow">404</p><h1 class="fd-h1">This page moved or never existed</h1></div>
      <p class="fd-empty-text">The link may be old, or the page may have been renamed. Head back to your overview or search for what you need.</p>
      <div class="fd-empty-actions">
        ${home()}
        <button class="fd-btn" type="button" data-size="lg" data-fd-command-open="ember-command">${icon('search')}<span>Search</span><kbd class="fd-kbd">⌘K</kbd></button>
      </div>
      <code class="fd-empty-hint">/${this.params?.['*'] ?? ''}</code>`);
  }
}

class ScreenNoAccess extends FireLight {
  protected override render() {
    return page('No access', html`
      <div class="fd-empty-art"><div class="fd-ascii" data-fd-ascii="halftone" aria-hidden="true"></div></div>
      <span class="fd-empty-icon">${icon('shield-alert')}</span>
      <div class="fd-stack" data-gap="3"><p class="fd-eyebrow">403</p><h1 class="fd-h1">You don't have access to this page</h1></div>
      <p class="fd-empty-text">Your role in Quarry Labs doesn't include it. Ask an owner for access.</p>
      <div class="fd-empty-actions">${home()}</div>`, 'warning');
  }
}

/**
 * A screen's module did not load. Offline: Retry. Online, the likely cause is a deploy that replaced the hashed
 * files this page was built with, so Reload (the new version) comes first.
 */
class ScreenLoadError extends FireLight {
  protected override render() {
    const offline = !navigator.onLine;
    const again = (primary: boolean) => html`<button class="fd-btn" type="button" data-size="lg" data-variant=${primary ? 'primary' : 'outline'} data-action="retry" @click=${retry}>${icon('refresh-cw')}<span>Try again</span></button>`;
    return offline
      ? page("You're offline", html`
        <div class="fd-empty-art"><div class="fd-ascii" data-fd-ascii="waves" aria-hidden="true"></div></div>
        <span class="fd-empty-icon">${icon('wifi-off')}</span>
        <h1 class="fd-h1">You're offline</h1>
        <p class="fd-empty-text">Ember can't reach the network, so this page didn't load. Try again when you're back online.</p>
        <div class="fd-empty-actions">${again(true)}</div>`, 'warning')
      : page("This page didn't load", html`
        <div class="fd-empty-art"><div class="fd-ascii" data-fd-ascii="grid" aria-hidden="true"></div></div>
        <span class="fd-empty-icon">${icon('circle-alert')}</span>
        <h1 class="fd-h1">This page didn't load</h1>
        <p class="fd-empty-text">Ember may have been updated since you opened it. Reload to get the new version, or try again.</p>
        <div class="fd-empty-actions">
          <button class="fd-btn" type="button" data-variant="primary" data-size="lg" data-action="reload" @click=${() => location.reload()}>${icon('rotate-cw')}<span>Reload</span></button>
          ${again(false)}
        </div>`, 'danger');
  }
}

customElements.define('screen-not-found', ScreenNotFound);
customElements.define('screen-no-access', ScreenNoAccess);
customElements.define('screen-load-error', ScreenLoadError);
