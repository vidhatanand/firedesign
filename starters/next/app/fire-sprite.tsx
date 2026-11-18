// The icon sprite, rendered on the server so icons (the static SVG form, spec I2) draw in the first paint. fire.js
// finds #fd-icon-sprite and does not add its own. `hidden` keeps it out of layout without a style attribute (N8).
import { ICONS } from 'fire-design/fire/js/icons.js';

const symbols = Object.entries(ICONS).map(([n, p]) => `<symbol id="i-${n}" viewBox="0 0 24 24">${p}</symbol>`).join('');

export function FireSprite() {
  return <svg id="fd-icon-sprite" hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: symbols }} />;
}
