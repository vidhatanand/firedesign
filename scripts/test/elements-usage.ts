// Type check of fire/elements.d.ts (run by elements.test.mjs with tsc --noEmit). Not executed.
import { FdChart, FdCode, FdIcon, FdTexture, FireElement, type FdChartData } from '../../fire/elements.js';
// The entry for an app with its own Lit has the same types (package.json "exports": "./elements/lit").
import { FdChart as LitChart, FdIcon as LitIcon } from 'fire-design/elements/lit';

const chart = document.createElement('fd-chart');
const asChart: FdChart = chart;
chart.type = 'area';
chart.height = 240;
chart.legend = true;
chart.data = { labels: ['Mon', 'Tue'], yFormat: (v: number) => `${v} req`, series: [{ name: 'Requests', values: [3, null] }] };
const spark: FdChartData = [3, 5, 4, 8];
chart.data = spark;
chart.data = { segments: [{ label: '/scrape', value: 4210, tone: 'info' }], caption: 'Credits' };
chart.data = { start: '2026-10-18', tones: ['success', null, 'danger'], legend: { success: 'Passed' } };
// @ts-expect-error not a chart type
chart.type = 'pie';
// @ts-expect-error series values are numbers
chart.data = { series: [{ name: 'x', values: ['1'] }] };
chart.addEventListener('fd:select', (event) => event.detail.index);
chart.addEventListener('fd:change', (event) => event.detail.value);
await chart.updateComplete;
chart.requestUpdate();

const icon = document.querySelector('fd-icon');
if (icon) {
  const asIcon: FdIcon = icon;
  asIcon.icon = 'search';
  asIcon.size = '20';
  // @ts-expect-error not an icon name
  asIcon.icon = 'serch';
  // @ts-expect-error sizes are the documented steps
  asIcon.size = '18';
}

const code: FdCode = document.createElement('fd-code');
code.code = 'npm install fire-design';
code.language = 'bash';
code.copy = true;
// @ts-expect-error collapse is a height in px
code.collapse = 'tall';

const field: FdTexture = document.createElement('fd-texture');
field.pattern = 'waves';
field.marks = 'dots';
field.inline = true;
// @ts-expect-error tones are named
field.tone = 'red';

const base: FireElement = asChart;
base.remove();

const litIcon: LitIcon = document.createElement('fd-icon');
litIcon.icon = 'zap';
const sameChart: LitChart = asChart;
void sameChart;
