/* Fire's custom elements share this base. Source of fire/elements.js (scripts/build-elements.mjs builds it).
 *
 * The rules (spec/ARCHITECTURE.md section 5): light DOM, no shadow root and no styles of its own. Each element is its
 * component's root: it carries the root class and the markup form's data-* attributes, renders the component's
 * internals inside itself, and hands itself to Fire's behaviour module, which draws exactly what it draws for the
 * markup form on a plain page. Fire's CSS then styles both forms alike, direct-child rules included.
 */
import { LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';

/** A Fire behaviour entry point: `init(root)` from one of fire/js/*.js, idempotent. */
export type FireInit = (root?: ParentNode) => void;

/** A root attribute value: a string or number is written, `true` writes an empty attribute, `false` or nothing removes it. */
export type RootAttribute = string | number | boolean | null | undefined;

/**
 * Base class of Fire's custom elements. The element is its component's root: it adds the root class (never removing
 * a class the page set, and adding it back after each update if a framework replaced `class`), writes the markup
 * form's data-* attributes from its properties, renders the internals the markup form would hold, runs Fire's
 * behaviour modules on itself, and redraws when a property changes.
 *
 * A subclass gives `rootClass()`, `rootAttributes()`, the internals (`markup()`, optional), the Fire modules that
 * enhance it (`static fire`), a `structure()` string (when it changes, the internals are rendered afresh and
 * enhanced again), `prepare()` to fill what the template does not carry, and `refresh()` to redraw in place.
 */
export abstract class FireElement extends LitElement {
  /** @internal Fire `init` functions run on the element after a fresh render, in order. */
  protected static fire: FireInit[] = [];

  #structure: string | undefined;
  #fresh = true;
  /** The root class this element added itself (a class the page set is never taken away). */
  #addedClass: string | undefined;
  /** Root attributes this element wrote, so it removes only those. */
  #written = new Set<string>();

  /** @internal Light DOM: Fire's global stylesheet styles the element and what it renders. */
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  /** @internal The component's root class, for example `fd-chart`. */
  protected abstract rootClass(): string;

  /** @internal The markup form's attributes on the root (data-*, aria-hidden), from the element's properties. */
  protected rootAttributes(): Record<string, RootAttribute> {
    return {};
  }

  /** @internal The component's internals before Fire's module has run; nothing when the module draws them all. */
  protected markup(): TemplateResult | typeof nothing {
    return nothing;
  }

  /** @internal What the internals depend on structurally; a change renders them afresh. */
  protected structure(): string {
    return '';
  }

  /** @internal After a fresh render, before Fire's modules run: fill what the template does not carry. */
  protected prepare(): void {}

  /** @internal Redraw in place after a property change that kept the structure. */
  protected refresh(_changed: PropertyValues): void {}

  override connectedCallback(): void {
    super.connectedCallback();
    this.#root();
  }

  /** @internal */
  protected override render(): unknown {
    const structure = this.structure();
    this.#fresh = structure !== this.#structure;
    this.#structure = structure;
    return keyed(structure, this.markup());
  }

  /** @internal */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.#root();
    if (this.#fresh) {
      this.prepare();
      for (const init of (this.constructor as typeof FireElement).fire) init(this);
    } else {
      this.refresh(changed);
    }
  }

  /** Make the element its component's root: the class, then the attributes. */
  #root(): void {
    const name = this.rootClass();
    if (this.#addedClass && this.#addedClass !== name) {
      this.classList.remove(this.#addedClass);
      this.#addedClass = undefined;
    }
    if (!this.classList.contains(name)) {
      this.classList.add(name);
      this.#addedClass = name;
    }
    for (const [attr, value] of Object.entries(this.rootAttributes())) {
      if (value == null || value === false) {
        if (this.#written.delete(attr)) this.removeAttribute(attr);
        continue;
      }
      const text = value === true ? '' : String(value);
      if (this.getAttribute(attr) !== text) this.setAttribute(attr, text);
      this.#written.add(attr);
    }
  }
}
