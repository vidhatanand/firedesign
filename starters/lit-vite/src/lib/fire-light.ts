import { LitElement, type PropertyValues } from 'lit';
import { init } from 'fire-design';

/**
 * The base class of every component in this starter.
 *
 * Fire's CSS is global and its behaviours listen on `document`, so Fire markup has to live in the light DOM:
 * `createRenderRoot()` returns the element itself instead of a shadow root (spec L6).
 *
 * Fire's behaviours enhance markup once it exists, so `init(this)` runs after every render: the first one (L1) and
 * each update that may have inserted new Fire markup (L2, and routes: L3). `init` skips what it has already seen.
 * Fire's own elements (fd-chart, fd-code, …) draw from their properties whenever `init` runs, so it does not wait
 * for them.
 */
export class FireLight extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override updated(_changed?: PropertyValues): void {
    init(this);
  }
}
