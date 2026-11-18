import { html } from 'lit';
const t = (a: number) => html`
  <div class="fd-nope ${a}"
       style=${styleMap(a)}
       data-variant="primary">
    <fd-icon name="nada"></fd-icon>
    <b class="fd-bad-nested">${html`<i class="fd-also-bad"></i>`}</b>
  </div>`;
const notLit = `<div class="fd-ignored">`;
