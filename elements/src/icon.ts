import { html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import type { IconName } from '../../fire/fire.js';
import { ICONS, icon } from './fire.js';
import { FireElement, type RootAttribute } from './fire-element.js';

const warned = new Set<string>();

/**
 * One of Fire's icons (a Lucide subset). The element is the icon's root, as `svg.fd-icon` is for the markup form:
 * it carries `class="fd-icon"`, `data-icon`, `data-size` and `aria-hidden="true"`, so every `.fd-icon` rule applies
 * to it, direct-child rules such as `.fd-btn > .fd-icon` included. Inside it, an SVG drawn from Fire's sprite fills
 * it (fire/base.css). Use it in framework code, where an `<i data-icon>` that replaces itself would break the
 * framework's reconciliation. The icon is decorative: name the control that holds it.
 *
 * An unknown name draws nothing and logs a warning, as the markup form does.
 *
 * @summary An icon from Fire's set, safe to render from a framework.
 * @tagname fd-icon
 */
export class FdIcon extends FireElement {
  /** Icon name from Fire's set, for example `search` (the markup form's `data-icon`). */
  @property({ reflect: true })
  icon?: IconName;

  /** Size in px: 12, 14, 16 (the default), 20, 24 or 32 (the markup form's `data-size`). */
  @property({ reflect: true })
  size?: '12' | '14' | '16' | '20' | '24' | '32';

  /** @internal */
  protected override rootClass(): string {
    return 'fd-icon';
  }

  /** @internal */
  protected override rootAttributes(): Record<string, RootAttribute> {
    return { 'data-icon': this.icon, 'data-size': this.size, 'aria-hidden': 'true' };
  }

  /** @internal A new name draws a new SVG. */
  protected override structure(): string {
    return this.icon ?? '';
  }

  /** @internal */
  protected override markup(): TemplateResult {
    return html`<svg aria-hidden="true" focusable="false"></svg>`;
  }

  /** @internal The drawing comes from Fire's own icon(), which also puts the sprite on the page. */
  protected override prepare(): void {
    const svg = this.querySelector(':scope > svg');
    const name = this.icon;
    if (!svg || !name) return;
    if (!(name in ICONS)) {
      if (!warned.has(name)) {
        warned.add(name);
        console.warn('[fire] unknown icon', name);
      }
      return;
    }
    const template = document.createElement('template');
    template.innerHTML = icon(name);
    svg.replaceChildren(...(template.content.firstElementChild?.childNodes ?? []));
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fd-icon')) customElements.define('fd-icon', FdIcon);

declare global {
  interface HTMLElementTagNameMap {
    'fd-icon': FdIcon;
  }
}
