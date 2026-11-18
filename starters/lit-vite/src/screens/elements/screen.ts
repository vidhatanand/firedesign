import { html } from 'lit';
import { overlays, type ChartConfig, type IconName } from 'fire-design';
import { FireLight } from '../../lib/fire-light';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ICONS: IconName[] = ['home', 'bell', 'key-round', 'chart-column', 'settings'];
const SNIPPET = `import 'fire-design/elements';

// In a template: the element draws from the property.
html\`<fd-chart type="area" .data=\${config}></fd-chart>\``;

/** Seven days of made-up credit use. */
const sample = (): ChartConfig => ({
  labels: DAYS,
  yFormat: 'number',
  series: [{ name: 'Credits used', values: DAYS.map(() => 40 + Math.round(Math.random() * 160)) }],
});

/**
 * Fire's custom elements, which draw themselves from properties. Where plain markup would be rewritten by Fire
 * behind Lit's back (a chart replaced by its plot, an icon replaced by an SVG), use the element instead: Lit sets
 * a property and the element redraws. The three screens use the markup forms, to match Fire's own templates.
 */
export class ScreenElements extends FireLight {
  static override properties = { config: { state: true }, icon: { state: true } };
  declare config: ChartConfig;
  declare icon: IconName;

  constructor() {
    super();
    this.config = sample();
    this.icon = ICONS[0];
  }

  private newData = (): void => { this.config = sample(); };
  private nextIcon = (): void => { this.icon = ICONS[(ICONS.indexOf(this.icon) + 1) % ICONS.length]; };
  private picked = (event: HTMLElementEventMap['fd:select']): void => {
    overlays.toast({ title: `${event.detail.label}: ${event.detail.values?.[0]?.value ?? 0} credits`, tone: 'neutral' });
  };

  protected override render() {
    return html`
      <main class="fd-page">
        <div class="fd-frame">
          <section class="fd-band fd-page-hero fd-rise">
            <div class="fd-page-hero-art" aria-hidden="true"><fd-texture pattern="orbit" tone="accent" fade="left"></fd-texture></div>
            <h1 class="fd-display">Elements</h1>
            <p class="fd-page-hero-desc">fd-chart, fd-code, fd-icon and fd-texture, drawn from Lit properties.</p>
          </section>

          <section class="fd-band" aria-label="Chart">
            <div class="fd-stack" data-gap="4">
              <div class="fd-row" data-justify="between" data-align="start">
                <h2 class="fd-title">Credits used · Last 7 days</h2>
                <button class="fd-btn" type="button" @click=${this.newData}><span>New data</span></button>
              </div>
              <fd-chart type="area" height="240" legend label="Credits used per day" .data=${this.config} @fd:select=${this.picked}></fd-chart>
            </div>
          </section>

          <section class="fd-band" aria-label="Code and icons">
            <div class="fd-stack" data-gap="4">
              <h2 class="fd-title">Code</h2>
              <fd-code language="typescript" filename="chart.ts" copy lines .code=${SNIPPET}></fd-code>
              <h2 class="fd-title">Icon</h2>
              <div class="fd-row" data-gap="3" data-align="start">
                <fd-icon icon=${this.icon} size="24"></fd-icon>
                <code class="fd-mono">${this.icon}</code>
                <button class="fd-btn" type="button" @click=${this.nextIcon}><span>Next icon</span></button>
              </div>
            </div>
          </section>
        </div>
      </main>
    `;
  }
}

customElements.define('screen-elements', ScreenElements);
