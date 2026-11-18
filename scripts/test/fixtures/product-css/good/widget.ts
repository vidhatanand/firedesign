import { LitElement, css, html } from 'lit';

export class AcmeWidget extends LitElement {
  static styles = css`
    :host { display: block; padding: var(--fd-space-3); }
    .row { display: flex; gap: var(--fd-space-2); ${extra()} }
    .label { color: var(--acme-ink); font-size: var(--fd-text-sm); width: ${width}px; }
    ${mixin}
    .gap { margin: ${gap}; transition: opacity var(--fd-dur-2); }
  `;
  render() { return html`<div class="row"><span class="label">Credits</span></div>`; }
}
