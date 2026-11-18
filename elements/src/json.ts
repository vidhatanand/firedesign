import type { ComplexAttributeConverter } from 'lit';

/** Attribute converter for data given as JSON in an attribute (plain pages); invalid JSON warns and gives undefined. */
export const json: ComplexAttributeConverter<unknown> = {
  fromAttribute(value: string | null): unknown {
    if (value == null || value === '') return undefined;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('[fire] element data is not valid JSON', error);
      return undefined;
    }
  },
};

/** Keep `<script type="application/json">` as the root's first child holding `data`, as the markup form carries it. */
export function syncConfig(root: Element, data: unknown): void {
  let node = root.querySelector(':scope > script[type="application/json"]');
  if (data == null) {
    node?.remove();
    return;
  }
  if (!node) {
    node = document.createElement('script');
    node.setAttribute('type', 'application/json');
    root.prepend(node);
  }
  node.textContent = JSON.stringify(data);
}
