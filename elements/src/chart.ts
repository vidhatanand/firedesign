import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { charts } from './fire.js';
import type { ChartConfig, ChartFormat, ChartTone, DonutConfig, HeatgridConfig, StripConfig } from '../../fire/fire.js';
import { FireElement, type FireInit, type RootAttribute } from './fire-element.js';
import { json, syncConfig } from './json.js';

/** The chart an `fd-chart` draws: the four cartesian types, or a sparkline, donut or heat grid. */
export type FdChartType = 'line' | 'area' | 'bar' | 'stacked' | 'sparkline' | 'donut' | 'heatgrid';
/** The data an `fd-chart` takes, by type: a cartesian config, sparkline values, a donut or a heat grid (or strip). */
export type FdChartData = ChartConfig | number[] | DonutConfig | HeatgridConfig | StripConfig;

const CARTESIAN = new Set(['line', 'area', 'bar', 'stacked']);

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
export class FdChart extends FireElement {
  /** @internal */
  protected static override fire: FireInit[] = [charts.init];

  /** Chart type: `line` (default), `area`, `bar`, `stacked`, `sparkline`, `donut` or `heatgrid` (the markup form's `data-fd-chart`, or its class for the other three). */
  @property({ reflect: true })
  type: FdChartType = 'line';

  /** Variant of a type: `bars` for a sparkline (`data-type="bars"`), `progress` for a donut (a progress ring, `data-type="progress"`), `strip` for a heat grid (`data-variant="strip"`). */
  @property({ reflect: true })
  variant?: 'bars' | 'progress' | 'strip';

  /** The chart's data: a `ChartConfig` for the cartesian types, an array of numbers for a sparkline, a `DonutConfig`, a `HeatgridConfig` or (strip) a `StripConfig`. As an attribute, JSON. */
  @property({ attribute: 'data', converter: json })
  data?: FdChartData;

  /** Height in px. Cartesian: the plot, 80 to 900 (default 240). Sparkline: the drawing (default from CSS, 24). */
  @property({ type: Number })
  height?: number;

  /** Sparkline: width in px (default from CSS, 80). */
  @property({ type: Number })
  width?: number;

  /** Cartesian: show the built-in legend, whose items toggle series. */
  @property({ type: Boolean })
  legend = false;

  /** Cartesian: grid lines, `dashed` (default), `solid` or `none`. */
  @property()
  grid?: 'dashed' | 'solid' | 'none';

  /** Cartesian: `loading` (a skeleton; needs no data) or `empty` (the empty state). */
  @property()
  state?: 'loading' | 'empty';

  /** Accessible name override (all types); a progress ring also shows it as its caption. */
  @property()
  label?: string;

  /** Cartesian: value format when the data gives none, `number`, `compact`, `percent`, `ms` or `credits`. */
  @property({ attribute: 'y-format' })
  yFormat?: ChartFormat;

  /** Sparkline: values as text, `3,5,4,8`, when `data` is not set. */
  @property()
  values?: string;

  /** Sparkline: fill the area under the line. */
  @property({ type: Boolean })
  area = false;

  /** Sparkline: mark the last point. */
  @property({ type: Boolean })
  dot = false;

  /** Sparkline: lower is better, so a falling trend is coloured as good. */
  @property({ type: Boolean })
  invert = false;

  /** Sparkline: take the width of its container and redraw when it changes. */
  @property({ type: Boolean })
  fluid = false;

  /** Sparkline and progress ring: a fixed tone instead of the trend colour or the accent. */
  @property()
  tone?: ChartTone;

  /** Donut: diameter in px (default 144, progress 96). Heat grid: cell size, `sm`, `md` (default) or `lg`. */
  @property()
  size?: string;

  /** Donut: ring thickness in px. */
  @property({ type: Number })
  thickness?: number;

  /** Progress ring: the value. */
  @property({ type: Number })
  value?: number;

  /** Progress ring: the maximum (default 100). */
  @property({ type: Number })
  max?: number;

  /** Donut: value format when the data gives none (a name, as in `yFormat`). */
  @property()
  format?: ChartFormat;

  /** Whether this element has drawn a chart yet. */
  #drawn = false;

  get #family(): 'cartesian' | 'sparkline' | 'donut' | 'heatgrid' {
    return CARTESIAN.has(this.type) ? 'cartesian' : (this.type as 'sparkline' | 'donut' | 'heatgrid');
  }

  /** @internal */
  protected override rootClass(): string {
    return { cartesian: 'fd-chart', sparkline: 'fd-sparkline', donut: 'fd-donut', heatgrid: 'fd-heatgrid' }[this.#family];
  }

  /** @internal Every name is listed for every type, so switching type removes what no longer applies. */
  protected override rootAttributes(): Record<string, RootAttribute> {
    const family = this.#family;
    const cartesian = family === 'cartesian';
    const spark = family === 'sparkline';
    const donut = family === 'donut';
    const heat = family === 'heatgrid';
    return {
      'data-fd-chart': cartesian ? this.type : undefined,
      'data-type': (spark && this.variant === 'bars') || (donut && this.variant === 'progress') ? this.variant : undefined,
      'data-variant': heat && this.variant === 'strip' ? 'strip' : undefined,
      'data-values': spark ? (Array.isArray(this.data) ? this.data.join(',') : this.values) : undefined,
      'data-height': cartesian || spark ? this.height : undefined,
      'data-width': spark ? this.width : undefined,
      'data-legend': cartesian && this.legend,
      'data-grid': cartesian ? this.grid : undefined,
      'data-state': cartesian ? this.state : undefined,
      'data-y-format': cartesian ? this.yFormat : undefined,
      'data-area': spark && this.area,
      'data-dot': spark && this.dot,
      'data-invert': spark && this.invert,
      'data-fluid': spark && this.fluid,
      'data-tone': spark || donut ? this.tone : undefined,
      'data-size': donut || heat ? this.size : undefined,
      'data-thickness': donut ? this.thickness : undefined,
      'data-value': donut ? this.value : undefined,
      'data-max': donut ? this.max : undefined,
      'data-format': donut ? this.format : undefined,
      'data-label': this.label,
    };
  }

  /** @internal Charts of another type are drawn afresh. */
  protected override structure(): string {
    return `${this.#family}|${this.variant ?? ''}`;
  }

  /** @internal The config the markup form would read: the data, and data-state when the data names no state. */
  #config(): ChartConfig {
    const config: ChartConfig = this.data && !Array.isArray(this.data) ? { ...(this.data as ChartConfig) } : {};
    const state = this.dataset.state;
    if (!config.state && state && state !== 'ready') config.state = state as ChartConfig['state'];
    return config;
  }

  /** @internal */
  protected override prepare(): void {
    // Another type: take away what the previous chart drew (its config script included).
    if (this.#drawn) [...this.children].forEach((child) => child.remove());
    this.#drawn = true;
    const family = this.#family;
    if (family === 'sparkline' || (family === 'donut' && this.variant === 'progress')) return;
    syncConfig(this, this.data);
    // Cartesian charts are drawn from the object, so a custom yFormat function survives; charts.init skips them after.
    if (family === 'cartesian') charts.render(this, this.#config());
  }

  /** @internal */
  protected override refresh(_changed: PropertyValues): void {
    switch (this.#family) {
      case 'sparkline':
        charts.sparkline(this);
        break;
      case 'donut':
        if (this.variant !== 'progress') syncConfig(this, this.data);
        charts.donut(this);
        break;
      case 'heatgrid':
        syncConfig(this, this.data);
        charts.heatgrid(this);
        break;
      default:
        syncConfig(this, this.data);
        charts.render(this, this.#config());
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fd-chart')) customElements.define('fd-chart', FdChart);

declare global {
  interface HTMLElementTagNameMap {
    'fd-chart': FdChart;
  }
}
