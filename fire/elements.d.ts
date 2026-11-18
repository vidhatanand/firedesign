/* Types of fire/elements.js (import 'fire-design/elements'). BUILT by scripts/build-elements.mjs from elements/src:
 * edit the source and rebuild, never this file. Data and event types come from fire.d.ts. */
import type { ChartConfig, ChartFormat, ChartTone, DonutConfig, HeatgridConfig, IconName, StripConfig } from './fire.js';

/** The part of Lit's ReactiveElement that Fire's elements expose (Lit is bundled into elements.js). */
declare abstract class LitElement extends HTMLElement {
  /** Resolves (to true) once the element has rendered the latest property changes. */
  readonly updateComplete: Promise<boolean>;
  /** Schedule a render, for example after mutating an object held in a property. */
  requestUpdate(name?: PropertyKey, oldValue?: unknown): void;
  connectedCallback(): void;
  disconnectedCallback(): void;
  attributeChangedCallback(name: string, old: string | null, value: string | null): void;
}

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
export declare abstract class FireElement extends LitElement {
    #private;
    connectedCallback(): void;
}

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
export declare class FdIcon extends FireElement {
    /** Icon name from Fire's set, for example `search` (the markup form's `data-icon`). */
    icon?: IconName;
    /** Size in px: 12, 14, 16 (the default), 20, 24 or 32 (the markup form's `data-size`). */
    size?: '12' | '14' | '16' | '20' | '24' | '32';
}
declare global {
    interface HTMLElementTagNameMap {
        'fd-icon': FdIcon;
    }
}

/** The chart an `fd-chart` draws: the four cartesian types, or a sparkline, donut or heat grid. */
export type FdChartType = 'line' | 'area' | 'bar' | 'stacked' | 'sparkline' | 'donut' | 'heatgrid';
/** The data an `fd-chart` takes, by type: a cartesian config, sparkline values, a donut or a heat grid (or strip). */
export type FdChartData = ChartConfig | number[] | DonutConfig | HeatgridConfig | StripConfig;
/**
 * A Fire chart drawn from data given as a property: line, area, bar and stacked charts, sparklines, donuts and
 * progress rings, heat grids and strips. The element is the chart's root: it carries the root class of its type
 * (`fd-chart`, `fd-sparkline`, `fd-donut` or `fd-heatgrid`) and the markup form's data-* attributes, holds the data
 * as the markup form's `<script type="application/json">`, and Fire's charts module draws the chart inside it, so it
 * looks and behaves exactly like the markup form. Setting `data` (or any attribute) redraws it, without the entrance
 * animation. Changing `type` to another kind of chart (say from `line` to `donut`) is not supported: render a new
 * element (in React or Vue, give it a new `key`).
 *
 * Attributes mirror the markup form's `data-*` attributes; each applies to the types named. A function in the data
 * (a custom `yFormat`) is kept for cartesian charts, which are drawn from the object itself; the other types are
 * drawn from the JSON, so their formats are names.
 *
 * @summary A chart drawn from data, safe to render from a framework.
 * @tagname fd-chart
 * @fires fd:hover - The active point changed (pointer or keyboard). Cartesian and strip: `{ index, label, values }` or `{ index, label, tone, name, href }`; heat grid: `{ index, date, value }`.
 * @fires fd:select - A point was clicked, tapped or chosen with Enter. Cartesian: `{ index, label, values }`; strip: `{ index, label, tone, name, href }`.
 * @fires fd:change - A legend item toggled a series: `{ value: seriesName, index, visible }`.
 */
export declare class FdChart extends FireElement {
    #private;
    /** Chart type: `line` (default), `area`, `bar`, `stacked`, `sparkline`, `donut` or `heatgrid` (the markup form's `data-fd-chart`, or its class for the other three). */
    type: FdChartType;
    /** Variant of a type: `bars` for a sparkline (`data-type="bars"`), `progress` for a donut (a progress ring, `data-type="progress"`), `strip` for a heat grid (`data-variant="strip"`). */
    variant?: 'bars' | 'progress' | 'strip';
    /** The chart's data: a `ChartConfig` for the cartesian types, an array of numbers for a sparkline, a `DonutConfig`, a `HeatgridConfig` or (strip) a `StripConfig`. As an attribute, JSON. */
    data?: FdChartData;
    /** Height in px. Cartesian: the plot, 80 to 900 (default 240). Sparkline: the drawing (default from CSS, 24). */
    height?: number;
    /** Sparkline: width in px (default from CSS, 80). */
    width?: number;
    /** Cartesian: show the built-in legend, whose items toggle series. */
    legend: boolean;
    /** Cartesian: grid lines, `dashed` (default), `solid` or `none`. */
    grid?: 'dashed' | 'solid' | 'none';
    /** Cartesian: `loading` (a skeleton; needs no data) or `empty` (the empty state). */
    state?: 'loading' | 'empty';
    /** Accessible name override (all types); a progress ring also shows it as its caption. */
    label?: string;
    /** Cartesian: value format when the data gives none, `number`, `compact`, `percent`, `ms` or `credits`. */
    yFormat?: ChartFormat;
    /** Sparkline: values as text, `3,5,4,8`, when `data` is not set. */
    values?: string;
    /** Sparkline: fill the area under the line. */
    area: boolean;
    /** Sparkline: mark the last point. */
    dot: boolean;
    /** Sparkline: lower is better, so a falling trend is coloured as good. */
    invert: boolean;
    /** Sparkline: take the width of its container and redraw when it changes. */
    fluid: boolean;
    /** Sparkline and progress ring: a fixed tone instead of the trend colour or the accent. */
    tone?: ChartTone;
    /** Donut: diameter in px (default 144, progress 96). Heat grid: cell size, `sm`, `md` (default) or `lg`. */
    size?: string;
    /** Donut: ring thickness in px. */
    thickness?: number;
    /** Progress ring: the value. */
    value?: number;
    /** Progress ring: the maximum (default 100). */
    max?: number;
    /** Donut: value format when the data gives none (a name, as in `yFormat`). */
    format?: ChartFormat;
}
declare global {
    interface HTMLElementTagNameMap {
        'fd-chart': FdChart;
    }
}

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
export declare class FdCode extends FireElement {
    /** The code, as text (never HTML). As an attribute, the text itself. */
    code: string;
    /** Language for highlighting (the markup form's `data-lang` on `<code>`; `lang` is HTML's own attribute). */
    language?: string;
    /** Show line numbers (`data-lines`). */
    lines: boolean;
    /** Lines to highlight, `3,5-7` (`data-highlight`). */
    highlight?: string;
    /** Collapse to this height in px with a "Show all N lines" button when the code is taller (`data-collapse`). */
    collapse?: number;
    /** Soft-wrap long lines (`data-wrap`). */
    wrap: boolean;
    /** A file name shown in a header above the code (`.fd-codeblock-file`). */
    filename?: string;
    /** Add a copy button: in the header when there is a file name, otherwise floating in the corner. */
    copy: boolean;
}
declare global {
    interface HTMLElementTagNameMap {
        'fd-code': FdCode;
    }
}

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
export declare class FdTexture extends FireElement {
    /** The field: `terrain`, `waves`, `orbit`, `rain`, `grid`, `flame`, `halftone`, `spark`, `contour`, `stipple`, `bars` or a registered name (`data-fd-ascii`). A page signature field, when set, wins over it unless `signature` is `own`; left out, it is that field, else `terrain`. */
    pattern?: string;
    /** Ink: `neutral` (default), `accent`, `contrast` or `strong` (`data-tone`). */
    tone?: 'neutral' | 'accent' | 'contrast' | 'strong';
    /** Fade out toward an edge: `left`, `right`, `top`, `bottom`, `x`, `y` or `radial` (`data-fade`). */
    fade?: 'left' | 'right' | 'top' | 'bottom' | 'x' | 'y' | 'radial';
    /** The mark: `chars` (default), `dots` (halftone discs), `squares`, `plus` or `dashes` (`data-style`). A page signature mark, when set, wins over it unless `signature` is `own`. */
    marks?: 'chars' | 'dots' | 'squares' | 'plus' | 'dashes';
    /** Character ramp: `default`, `soft`, `dense`, `glyph`, `rain`, or a literal ramp such as ` .:-=+*#` (`data-ramp`). */
    ramp?: string;
    /** Cell size in px, `7x12` (default) or `8` for square (`data-cell`). */
    cell?: string;
    /** Seed, a number or a string; defaults to the pattern name, so a page always looks the same (`data-seed`). */
    seed?: string;
    /** `true` or `false`; waves, orbit, rain and flame animate by default (`data-animate`; `animate` is a DOM method). */
    animated?: 'true' | 'false';
    /** Time multiplier, default 1 (`data-speed`). */
    speed?: number;
    /** Luminance multiplier, default 1 (`data-intensity`); a set page signature intensity wins unless `signature` is `own`. */
    intensity?: number;
    /** Characters near the pointer step up the ramp (`data-interactive`). */
    interactive: boolean;
    /** `x,y` in 0..1, the centre for orbit, flame, halftone and spark (`data-origin`). */
    origin?: string;
    /** Terrain: the side that rises, `right` (default) or `left` (`data-side`). */
    side?: 'left' | 'right';
    /** Grid: `flat` (default) or `perspective` (`data-variant`). */
    variant?: 'flat' | 'perspective';
    /** `blob` clips the field to a soft, noisy disc (`data-shape`). */
    shape?: 'blob';
    /** `own` pins the field to its own pattern, marks, ramp, cell and intensity, whatever the page's signature dials say (`data-signature`). */
    signature?: 'own';
    /** Flow in the page at the field height instead of filling the positioned ancestor (`data-inline`). */
    inline: boolean;
}
declare global {
    interface HTMLElementTagNameMap {
        'fd-texture': FdTexture;
    }
}
