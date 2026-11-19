// The five mistakes in Lit templates; holes inside a part do not hide a part missing beside it.
import { html } from 'lit';

export const expiring = (when: string) => html`<div class="fd-callout" data-tone="warning" role="note">
  <div class="fd-callout-content"><p class="fd-callout-body">Your card expires ${when}.</p></div>
</div>`;

export const profile = (name: string) => html`<div class="fd-grid">
  <section class="fd-form-section"><div class="fd-form-section-head"><h2 class="fd-form-section-title">Profile</h2></div><div class="fd-form-section-body"><p>${name}</p></div></section>
</div>`;

export const role = (onChange: (e: Event) => void) => html`<select class="fd-select" aria-label="Role" @change=${onChange}><option>Owner</option></select>`;

export const menu = (items: unknown) => html`<div class="fd-menu" id="acct-menu" role="menu" hidden>${items}</div>`;

export const notifications = html`<div class="fd-card">
  <fieldset><legend>Notifications</legend></fieldset>
  <table><tr><td>Key</td></tr></table>
  <table class="fd-table" aria-label="Keys"><tr><td>Key</td></tr></table>
</div>`;
