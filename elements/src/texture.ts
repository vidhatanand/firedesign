import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { texture } from './fire.js';
import { FireElement, type FireInit, type RootAttribute } from './fire-element.js';

/**
 * A Fire generative field: terrain, waves, orbit, rain, grid, flame, halftone, spark, contour, stipple or bars, drawn in characters, dots, squares, plus signs or dashes. The element is
 * the field's root: it carries the markup form's `class="fd-ascii"`, `data-fd-ascii="…"`,
 * the other `data-*` attributes and `aria-hidden="true"`, and Fire's texture module draws its canvas inside it and owns
 * its size, colour and animation (12 fps on a shared frame loop, paused off screen, one still frame under reduced
 * motion). Being the field keeps Fire's layering rule, which puts a field between its container's background and its
 * content, working as it does for the markup form. Changing a property re-reads the settings and redraws.
 *
 * The field fills its nearest positioned ancestor, or flows at the field height with `inline`. It is decorative.
 *
 * @summary A generative texture field, safe to render from a framework.
 * @tagname fd-texture
 */
export class FdTexture extends FireElement {
  /** @internal */
  protected static override fire: FireInit[] = [texture.init];

  /** The field: `terrain`, `waves`, `orbit`, `rain`, `grid`, `flame`, `halftone`, `spark`, `contour`, `stipple`, `bars` or a registered name (`data-fd-ascii`). A page signature field, when set, wins over it unless `signature` is `own`; left out, it is that field, else `terrain`. */
  @property()
  pattern?: string;

  /** Ink: `neutral` (default), `accent`, `contrast` or `strong` (`data-tone`). */
  @property()
  tone?: 'neutral' | 'accent' | 'contrast' | 'strong';

  /** Fade out toward an edge: `left`, `right`, `top`, `bottom`, `x`, `y` or `radial` (`data-fade`). */
  @property()
  fade?: 'left' | 'right' | 'top' | 'bottom' | 'x' | 'y' | 'radial';

  /** The mark: `chars` (default), `dots` (halftone discs), `squares`, `plus` or `dashes` (`data-style`). A page signature mark, when set, wins over it unless `signature` is `own`. */
  @property()
  marks?: 'chars' | 'dots' | 'squares' | 'plus' | 'dashes';

  /** Character ramp: `default`, `soft`, `dense`, `glyph`, `rain`, or a literal ramp such as ` .:-=+*#` (`data-ramp`). */
  @property()
  ramp?: string;

  /** Cell size in px, `7x12` (default) or `8` for square (`data-cell`). */
  @property()
  cell?: string;

  /** Seed, a number or a string; defaults to the pattern name, so a page always looks the same (`data-seed`). */
  @property()
  seed?: string;

  /** `true` or `false`; waves, orbit, rain and flame animate by default (`data-animate`; `animate` is a DOM method). */
  @property()
  animated?: 'true' | 'false';

  /** Time multiplier, default 1 (`data-speed`). */
  @property({ type: Number })
  speed?: number;

  /** Luminance multiplier, default 1 (`data-intensity`); a set page signature intensity wins unless `signature` is `own`. */
  @property({ type: Number })
  intensity?: number;

  /** Characters near the pointer step up the ramp (`data-interactive`). */
  @property({ type: Boolean })
  interactive = false;

  /** `x,y` in 0..1, the centre for orbit, flame, halftone and spark (`data-origin`). */
  @property()
  origin?: string;

  /** Terrain: the side that rises, `right` (default) or `left` (`data-side`). */
  @property()
  side?: 'left' | 'right';

  /** Grid: `flat` (default) or `perspective` (`data-variant`). */
  @property()
  variant?: 'flat' | 'perspective';

  /** `blob` clips the field to a soft, noisy disc (`data-shape`). */
  @property()
  shape?: 'blob';

  /** `own` pins the field to its own pattern, marks, ramp, cell and intensity, whatever the page's signature dials say (`data-signature`). */
  @property()
  signature?: 'own';

  /** Flow in the page at the field height instead of filling the positioned ancestor (`data-inline`). */
  @property({ type: Boolean })
  inline = false;

  /** @internal */
  protected override rootClass(): string {
    return 'fd-ascii';
  }

  /** @internal The markup form's attributes, read by the module. */
  protected override rootAttributes(): Record<string, RootAttribute> {
    return {
      'aria-hidden': 'true',
      'data-fd-ascii': this.pattern,
      'data-tone': this.tone,
      'data-fade': this.fade,
      'data-style': this.marks,
      'data-ramp': this.ramp,
      'data-cell': this.cell,
      'data-seed': this.seed,
      'data-animate': this.animated,
      'data-speed': this.speed,
      'data-intensity': this.intensity,
      'data-interactive': this.interactive,
      'data-origin': this.origin,
      'data-side': this.side,
      'data-variant': this.variant,
      'data-shape': this.shape,
      'data-signature': this.signature,
      'data-inline': this.inline,
    };
  }

  /** @internal The module re-reads the attributes and redraws. */
  protected override refresh(_changed: PropertyValues): void {
    texture.render(this);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fd-texture')) customElements.define('fd-texture', FdTexture);

declare global {
  interface HTMLElementTagNameMap {
    'fd-texture': FdTexture;
  }
}
