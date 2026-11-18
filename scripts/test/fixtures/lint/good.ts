import { html, LitElement } from 'lit';
class A extends LitElement {
  render() {
    const n = this.n < 3 ? 1 : 2;
    return html`<div class="fd-table ${this.cls}" data-density="compact">
      <button class="fd-btn" data-icon-only aria-label="x"><fd-icon icon="x"></fd-icon></button>
      <span class="fd-badge fd-${this.tone}" data-tone=${this.tone}>${html`<b class="fd-btn">y</b>`}</span>
    </div>`;
  }
}
