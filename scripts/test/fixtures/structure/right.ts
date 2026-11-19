// The same templates written right: no finding. A part may come from a hole: the callout below takes its icon from one.
import { html } from 'lit';

export const expiring = (when: string) => html`<div class="fd-callout" data-tone="warning" role="note">
  <i class="fd-callout-icon" data-icon="triangle-alert"></i>
  <div class="fd-callout-content"><p class="fd-callout-body">Your card expires ${when}.</p></div>
</div>`;

export const custom = (icon: unknown) => html`<div class="fd-callout" role="note">${icon}<div class="fd-callout-content"><p class="fd-callout-body">Saved.</p></div></div>`;

export const profile = (name: string) => html`<form class="fd-form">
  <section class="fd-form-section"><div class="fd-form-section-head"><h2 class="fd-form-section-title">Profile</h2></div><div class="fd-form-section-body"><p>${name}</p></div></section>
</form>`;

// A section on its own: its parent is not in this template, so the lint leaves it to the rendered page.
export const section = html`<section class="fd-form-section"><div class="fd-form-section-head"><h2 class="fd-form-section-title">Billing</h2></div><div class="fd-form-section-body"><p>Plan</p></div></section>`;

export const role = (onChange: (e: Event) => void) => html`<label class="fd-select"><select aria-label="Role" @change=${onChange}><option>Owner</option></select></label>`;

export const menu = (items: unknown) => html`<div class="fd-menu" id="acct-menu" role="menu" popover>${items}</div>`;

export const notifications = html`<div class="fd-card">
  <div class="fd-field" role="group" aria-labelledby="notify-l"><span class="fd-field-label" id="notify-l">Notifications</span></div>
  <div class="fd-table-wrap"><div class="fd-table-scroll"><table class="fd-table" aria-label="Keys"><tr><td>Key</td></tr></table></div></div>
</div>`;
