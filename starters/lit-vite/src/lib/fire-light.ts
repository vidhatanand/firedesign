import { LitElement, type PropertyValues } from 'lit';
import { init } from 'fire-design';
import type { FireElement } from 'fire-design/elements';

const ELEMENTS = 'fd-chart, fd-code, fd-icon, fd-texture';

/**
 * The base class of every component in this starter.
 *
 * Fire's CSS is global and its behaviours listen on `document`, so Fire markup has to live in the light DOM:
 * `createRenderRoot()` returns the element itself instead of a shadow root (spec L6).
 *
 * Fire's behaviours enhance markup once it exists, so `init(this)` runs after every render: the first one (L1) and
 * each update that may have inserted new Fire markup (L2, and routes: L3). `init` skips what it has already seen.
 */
export class FireLight extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override updated(_changed?: PropertyValues): void {
    // Let Fire's own elements finish their first draw before `init` looks at the tree. An fd-chart that is
    // connected but not drawn yet already carries `data-fd-chart`, and `init` would draw it as an empty chart.
    const drawing = [...this.querySelectorAll<FireElement>(ELEMENTS)].map((el) => el.updateComplete);
    Promise.all(drawing).then(() => init(this));
  }
}
