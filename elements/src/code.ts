import { html, nothing, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { code, upgradeIcons } from './fire.js';
import { FireElement, type FireInit, type RootAttribute } from './fire-element.js';

/**
 * A Fire code block that highlights the text it is given. The element is the block's root: it carries
 * `class="fd-codeblock"` and the markup form's data-* attributes, renders the block's internals (an optional header
 * or copy button, then `<pre class="fd-codeblock-body"><code data-lang="…">`), puts `code` in it as text and lets
 * Fire's code module tokenise it into lines, so it looks and behaves exactly like the markup form. Unlike the markup
 * form inside a framework, Fire never rewrites text nodes the framework owns: changing `code` (or any attribute)
 * renders the internals afresh.
 *
 * Languages: `json`, `bash`, `javascript`, `typescript`, `python` and their aliases (`sh`, `curl`, `js`, `ts`, `py`, …);
 * any other name shows plain text.
 *
 * @summary A highlighted code block, safe to render from a framework.
 * @tagname fd-code
 */
export class FdCode extends FireElement {
  /** @internal */
  // init binds the page-wide handlers (copy, wrap, expand) and enhances the block the first time; enhanceCodeblock
  // enhances it again after each fresh render, which init's once-per-block guard would skip.
  protected static override fire: FireInit[] = [upgradeIcons, code.init, (root) => code.enhanceCodeblock(root as HTMLElement)];

  /** The code, as text (never HTML). As an attribute, the text itself. */
  @property()
  code = '';

  /** Language for highlighting (the markup form's `data-lang` on `<code>`; `lang` is HTML's own attribute). */
  @property()
  language?: string;

  /** Show line numbers (`data-lines`). */
  @property({ type: Boolean })
  lines = false;

  /** Lines to highlight, `3,5-7` (`data-highlight`). */
  @property()
  highlight?: string;

  /** Collapse to this height in px with a "Show all N lines" button when the code is taller (`data-collapse`). */
  @property({ type: Number })
  collapse?: number;

  /** Soft-wrap long lines (`data-wrap`). */
  @property({ type: Boolean })
  wrap = false;

  /** A file name shown in a header above the code (`.fd-codeblock-file`). */
  @property()
  filename?: string;

  /** Add a copy button: in the header when there is a file name, otherwise floating in the corner. */
  @property({ type: Boolean })
  copy = false;

  /** @internal The module tokenises once per block, so every change renders the block afresh. */
  protected override structure(): string {
    return JSON.stringify([this.code, this.language, this.lines, this.highlight, this.collapse, this.wrap, this.filename, this.copy]);
  }

  /** @internal */
  protected override rootClass(): string {
    return 'fd-codeblock';
  }

  /** @internal */
  protected override rootAttributes(): Record<string, RootAttribute> {
    return { 'data-lines': this.lines, 'data-highlight': this.highlight, 'data-collapse': this.collapse, 'data-wrap': this.wrap };
  }

  /** @internal The block's internals: the optional header or copy button, then the code. */
  protected override markup(): TemplateResult {
    const copy = html`<button class="fd-codeblock-copy" aria-label="Copy code"><i data-icon="copy"></i></button>`;
    const head = this.filename
      ? html`<div class="fd-codeblock-head"><span class="fd-codeblock-file"><i data-icon="file-code"></i>${this.filename}</span>${this.copy ? html`<div class="fd-codeblock-actions">${copy}</div>` : nothing}</div>`
      : this.copy ? copy : nothing;
    return html`${head}<pre class="fd-codeblock-body"><code data-lang=${ifDefined(this.language)}></code></pre>`;
  }

  /** @internal */
  protected override prepare(): void {
    const node = this.querySelector(':scope > .fd-codeblock-body > code');
    if (node) node.textContent = this.code;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fd-code')) customElements.define('fd-code', FdCode);

declare global {
  interface HTMLElementTagNameMap {
    'fd-code': FdCode;
  }
}
