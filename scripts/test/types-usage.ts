/* Type-checks fire/fire.d.ts: correct calls must compile and every @ts-expect-error line must be an error.
 * node_modules/.bin/tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext \
 *   --lib es2022,dom,dom.iterable --skipLibCheck false scripts/test/types-usage.ts fire/fire.d.ts */
import {
  init, $, $$, on, emit, icon, setIcon, ICONS, setTheme, position, copyText,
  charts, overlays, forms, data, chat, tweaks, texture, code, nav,
} from '../../fire/fire.js';
import type {
  ChartConfig, ChartTone, ChartFormat, ChartSeries, ChartThreshold, DonutConfig, HeatgridConfig, StripConfig,
  ThemeRecord, ThemeModule, PaletteSpec, FireEventMap, TweaksState,
} from '../../fire/fire.js';

init();
init(document.body);

// core
const chartEl = $<HTMLDivElement>('#usage-chart');
const buttons: HTMLButtonElement[] = $$('button');
const off: () => void = on(document, 'click', '[data-action]', (event: MouseEvent, target: Element) => { void event; void target; });
off();
const placed = chartEl ? position(buttons[0]!, chartEl, { placement: 'bottom-end', offset: 4 }) : null;
const side: 'top' | 'bottom' | 'left' | 'right' | undefined = placed?.side;
void side;
const copiedOk: Promise<boolean> = copyText('hello');
void copiedOk;
setTheme('dark');
emit(document.body, 'fd:copy', { value: 'x' });
const svg: string = icon('search', { size: 16 });
setIcon(buttons[0]!, 'check');
const pathMarkup: string = ICONS.home;
void svg; void pathMarkup;

// charts
const tone: ChartTone = 'danger';
const format: ChartFormat = 'compact';
const series: ChartSeries = { name: 'Credits', values: [3, null, 4], tone };
const threshold: ChartThreshold = { value: 2, label: 'Concurrency limit: 2', tone: 'warning' };
const config: ChartConfig = {
  type: 'area', labels: ['Nov 08', ''], titles: ['Nov 08, 2026', 'Nov 09, 2026'], series: [series], yFormat: format,
  threshold, live: true, unit: 'browsers', yMin: 'auto', yMax: 100, xTitle: 'Day', label: 'Credits per day',
  empty: { title: 'Nothing yet' }, height: 240, legend: true,
};
const donutConfig: DonutConfig = { segments: [{ label: '/scrape', value: 4210, tone: 'info' }], figure: '12,480', caption: 'Credits', format: 'compact', legend: true };
const heat: HeatgridConfig = { start: '2026-06-29', values: [0, 12], unit: 'requests' };
const strip: StripConfig = { start: '2026-10-18', tones: ['success', 'danger', null], legend: { success: 'No problem found' }, none: 'Not run', hrefs: [null] };
void donutConfig; void heat; void strip;
if (chartEl) {
  const same: HTMLDivElement = charts.render(chartEl, config);
  charts.update(same, { yFormat: (v, long) => (long ? `${v} credits` : v) });
  charts.toggleSeries(same, 0, false);
}
const formatted: string = charts.formatValue(1520, 'compact');
void formatted;

// overlays
const toastId: string = overlays.toast({ title: 'Key copied', tone: 'success', action: { label: 'Undo', onClick: () => false } });
overlays.toast.dismiss(toastId);
overlays.toast.promise(Promise.resolve(3), { loading: 'Saving…', success: (n) => `Saved ${n}` });
const menu: HTMLElement | null = overlays.openMenu('row-actions', { focus: 'last', placement: 'bottom-end' });
overlays.closeDialog('#create-key', 'confirm');
const unregister: () => void = overlays.command.register([{ label: 'Open settings', group: 'Navigate', icon: 'settings', shortcut: 'G S' }]);
unregister();
void menu;

// forms, data, nav, code, texture
const pairs: Array<[string, string]> = forms.parsePairs('read:runs = Read your runs');
const problem = forms.jsonProblem('{');
const line: number | undefined = problem?.line;
void pairs; void line;
const table = $<HTMLTableElement>('table');
if (table) data.sortTable(table, 1, 'descending');
nav.setStep(document.createElement('ol'), 2);
const tokens = code.tokenize('const a = 1', 'js');
const firstType: string | undefined = tokens[0]?.t;
void firstType;
texture.pagebar.start();
const art: string = texture.renderText('terrain', { cols: 40, rows: 8, ramp: 'soft' });
void art;

// chat
const ctrl = chat.get('support-chat');
ctrl?.add({ author: 'ai', text: 'Hi', blocks: [{ type: 'notice', tone: 'info', text: 'Heads up' }] });
ctrl?.setAgent({ kind: 'human', name: 'Maya Okafor' });

// tweaks
const state: TweaksState = tweaks.set({ palette: 'volt', tone: { hue: 20 } });
void state;

// events
document.addEventListener('fd:select', (e) => {
  const index: number | undefined = e.detail.index;
  const value: string | string[] | undefined = e.detail.value;
  void index; void value;
});
document.body.addEventListener('fd:change', (e) => {
  const v = e.detail.value;
  void v;
  if ('source' in e.detail && e.detail.source === 'sort') {
    const direction: 'ascending' | 'descending' | 'none' = e.detail.sort.direction;
    void direction;
  }
  if ('kind' in e.detail) {
    const kind: string = e.detail.kind;
    void kind;
  }
});
chartEl?.addEventListener('fd:hover', (e) => { const i: number = e.detail.index; void i; });
document.addEventListener('fd:open', (e) => { const trigger = e.detail?.trigger; void trigger; });
document.addEventListener('fd:theme', (e) => { const theme: 'light' | 'dark' | 'system' = e.detail.theme; void theme; });
type ChangeDetail = FireEventMap['fd:change']['detail'];
const tweakChange: ChangeDetail = { name: 'tweaks', value: tweaks.get() };
void tweakChange;

// theme record
const record: ThemeRecord = {
  contract: 'fire/1',
  palette: { from: 'accent', accent: '#1f6feb', neutral: 'cool' },
  tone: { hue: 0, vivid: 100, light: 0, warmth: 0 },
  type: { display: 'Fraunces', sans: 'Instrument Sans', mono: 'Geist Mono' },
  dials: { corners: 1, density: 'comfortable', lines: 1, textSize: 'md', contrast: 'default', motion: 'default', texture: 1 },
};
const named: ThemeRecord = { palette: 'graphite', type: 'editorial' };
const full: PaletteSpec = { hue: 95, tint: [0.007, 0.009], ink: { c: 0.012 }, accent: ['#b8f02c', '#c6f63f'], on: 'dark' };
const brand: PaletteSpec = { from: 'brand', colors: ['#14342b', '#f2c14e'] };
void record; void named; void full; void brand;
declare const theme: ThemeModule;
const expanded = theme.expandTheme(record);
const css: string = theme.themeToCss(named, { selector: ':root' });
const checked: { ok: boolean; errors: string[] } = theme.validateTheme({});
const accentPair = theme.paletteFrom(full).tokens['--fd-accent'];
void expanded.notes; void css; void checked; void accentPair;

/* ---------- wrong usage must be rejected ---------- */

// @ts-expect-error unknown top-level field in a theme record
const badRecord: ThemeRecord = { contract: 'fire/1', colour: 'red' };
// @ts-expect-error unknown dial
const badDial: ThemeRecord = { dials: { sparkle: 2 } };
// @ts-expect-error density is a fixed set
const badDensity: ThemeRecord = { dials: { density: 'huge' } };
// @ts-expect-error palette names are the 15 presets
const badPalette: ThemeRecord = { palette: 'neon' };
// @ts-expect-error an accent spec needs its accent colour
const badSpec: PaletteSpec = { from: 'accent' };
void badRecord; void badDial; void badDensity; void badPalette; void badSpec;

document.addEventListener('fd:select', (e) => {
  // @ts-expect-error fd:select has no such detail property
  void e.detail.selectedIndex;
});
document.addEventListener('fd:dirty', (e) => {
  // @ts-expect-error dirty is a boolean
  const dirty: string = e.detail.dirty;
  void dirty;
});

// @ts-expect-error unknown chart tone
const badTone: ChartTone = 'purple';
// @ts-expect-error unknown chart format
const badFormat: ChartFormat = 'currency';
void badTone; void badFormat;
// @ts-expect-error series values are numbers
const badSeries: ChartSeries = { values: ['3'] };
void badSeries;

// @ts-expect-error the index must be a number
if (chartEl) charts.toggleSeries(chartEl, '0');
// @ts-expect-error unknown icon name
icon('serch');
// @ts-expect-error a toast tone is a fixed set
overlays.toast({ title: 'x', tone: 'error' });
// @ts-expect-error setTheme takes light, dark or system
setTheme('sepia');
// @ts-expect-error fd:copy detail needs a string value
emit(document.body, 'fd:copy', { value: 3 });
