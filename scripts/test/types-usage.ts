/* Type-checks fire/fire.d.ts: correct calls must compile and every @ts-expect-error line must be an error.
 * node_modules/.bin/tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext \
 *   --lib es2022,dom,dom.iterable --skipLibCheck false scripts/test/types-usage.ts fire/fire.d.ts */
import {
  init, $, $$, on, emit, icon, setIcon, ICONS, setTheme, position, copyText,
  charts, overlays, forms, data, chat, tweaks, texture, code, nav, content, shell,
} from '../../fire/fire.js';
import type {
  ChartConfig, ChartTone, ChartFormat, ChartSeries, ChartThreshold, DonutConfig, HeatgridConfig, StripConfig,
  ThemeRecord, ThemeModule, PaletteSpec, FireEventMap, TweaksState, QuadrantConfig, TypeSpec, ToastHoldOptions,
} from '../../fire/fire.js';
import {
  expandTheme, themeToCss, validateTheme, paletteFrom, toThemeRecord, fromThemeRecord, FIRE_VERSION, DIAL_DEFAULTS,
  STRUCTURE_CHOICES, SIGNATURE_DEFAULT, DEFAULT_RECORD,
} from '../../fire/js/theme.js';
import { PALETTES, paletteTokens, contrast, toneTokens, TONE_DEFAULT } from '../../fire/js/palettes.js';
import { checkTypeSpec, typeSpecTokens, TYPEFACES, FONT_FAMILIES } from '../../fire/js/typefaces.js';
import { paletteFailures, TEXT_MIN } from '../../fire/js/palette-rules.js';
import { initialMark, initialTone, initialRows, INITIAL_TONES } from '../../fire/js/initial.js';
import { renderEmail, emailColors, isRtl } from '../../fire/email/email.js';
import { icon as iconDirect } from '../../fire/js/icons.js';

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
  const value: string | string[] | number | undefined = e.detail.value;
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
// A modeless sheet: swap the content, busy until the run has loaded.
document.addEventListener('fd:open', (e) => { const swap: boolean | undefined = e.detail?.swap; void swap; e.detail?.wait?.(fetch('/v1/runs/run_8f2a91')); e.detail?.wait?.(() => Promise.resolve()); });
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

// toast: Done · Undo, held; command.records
const undoable: string = overlays.toast({
  title: 'Key revoked',
  undo: async () => { await Promise.resolve(); },
  undone: 'Key restored',
  undoneDescription: 'It works again.',
});
const heldId: string = overlays.toast.hold({
  title: 'Cancelling run_8f2a91', seconds: 10, tone: 'danger', target: document.body, detail: { value: 'cancel' },
  onCommit: (id, cause) => { const c: 'time' | 'pagehide' = cause; void id; void c; },
  onUndo: (id) => { void id; },
});
const holdOptions: ToastHoldOptions = { title: 'Sending', seconds: 5 };
overlays.toast.hold(holdOptions);
void undoable; void heldId;
const stopRecords: () => void = overlays.command.records({
  group: 'Runs', min: 2, delay: 160, limit: 5,
  search: async (query, { signal }) => { void signal.aborted; return [{ id: query, label: `Run ${query}`, href: '/runs/1' }]; },
});
stopRecords();

// content: hold, queue, page states, reopen
const holdEl = document.createElement('div');
const committed: Promise<boolean> = content.hold(holdEl, { seconds: 10, label: 'Cancelling run_8f2a91', value: 'cancel' });
void committed;
content.cancelHold(holdEl);
content.reopen(document.createElement('form'));
content.select(document.createElement('div'), { focus: false });
const nextItem: HTMLElement | null = content.removeItem(document.createElement('div'));
void nextItem;
content.setState(document.createElement('div'), 'loading');

// shell
shell.setInitial(document.createElement('span'), 'Quarry Labs');
shell.syncRunning();
shell.setServiceStatus(document.createElement('div'), 'degraded', 'Slow crawls');
const mark: string = shell.initialMark('Quarry Labs', { label: true });
void mark;

// code, data, forms helpers
const logEl = document.createElement('div');
const errorRow: HTMLElement | null = code.firstError(logEl, { focus: false });
code.showLine(logEl, 42, { hash: true });
void errorRow;
data.setGroupOpen(document.createElement('tbody'), true);
data.selectOption(document.createElement('ul'), 'a');
data.showDetail(document.createElement('div'), 'run_1', { focus: true });
data.showList(document.createElement('div'));
const iso: string | null = forms.parseDateText('Nov 18, 2026');
const hex: string | null = forms.normalizeHex('14342b');
const checks = forms.colorChecks(document.createElement('div'), '#14342b');
const worst: 'pass' | 'warn' | 'fail' | undefined = checks[0]?.level;
const progress = forms.confirmProgress('ember-p', 'ember-prod');
if (progress.state === 'mismatch') { const at: number = progress.at; void at; }
void iso; void hex; void worst;
const dateOk: boolean = forms.checkDateField(document.createElement('div'), { show: true, commit: true });
void dateOk;

// charts: quadrant and its config
const quadrantConfig: QuadrantConfig = {
  x: { label: 'Effort', min: 0, max: 10 },
  y: { label: 'Impact', min: 0, max: 10 },
  points: [{ name: 'Retries', x: 3, y: 8 }, { name: 'Cache', x: 7, y: 4, tone: 'success', href: '#cache' }],
};
const quadrantEl = $<HTMLDivElement>('#quadrant');
if (quadrantEl) {
  const same: HTMLDivElement = charts.quadrant(quadrantEl, quadrantConfig);
  charts.render(same, quadrantConfig);
  charts.update(same, { points: [] });
}

// texture and tweaks
const markStyles: readonly string[] = texture.MARKS;
const attr: string = texture.SIGNATURE_ATTRIBUTES.field;
const asRecord: ThemeRecord = tweaks.toTheme();
void markStyles; void attr; void asRecord;

// theme module by path: type spec, signature, dials, the structural dials
const spec: TypeSpec = { display: 'Fraunces', sans: 'Instrument Sans', mono: 'Geist Mono', displayWeight: 600, displayTracking: -0.02, headingCase: 'upper', figures: 'tabular' };
const brandLook: ThemeRecord = {
  contract: 'fire/1',
  fire: FIRE_VERSION,
  palette: { from: 'accent', accent: '#1f6feb', neutral: 'tinted', on: 'white' },
  tone: { hue: 10 },
  type: spec,
  dials: { corners: 0.5, density: 'compact', lines: 1.5, contrast: 'high', motion: 'slow', texture: 0.5, surfaces: 'flat', elevation: 'lifted', controls: 'outlined', headings: 'mono' },
  signature: { field: 'terrain', mark: 'dots', cell: 8, ramp: 'soft', marks: 'corners', intensity: 1.2 },
};
const looked = expandTheme(brandLook);
const faces: string[] = looked.faces;
const sheet: string = themeToCss(brandLook, { selector: '.brand' });
const verdict = validateTheme(brandLook);
const verdictNotes: string[] = verdict.notes;
const generated = paletteFrom({ from: 'brand', colors: ['#14342b'] });
const generatedSpec: number = generated.spec.hue;
const roundTrip = toThemeRecord(fromThemeRecord({ palette: 'volt', signature: { field: 'waves' } }));
const surfaces: readonly string[] = STRUCTURE_CHOICES.surfaces;
const corners: number = DIAL_DEFAULTS.corners;
const fieldDefault: string = SIGNATURE_DEFAULT.field;
const defaultLook: string = DEFAULT_RECORD.palette;
void faces; void sheet; void verdictNotes; void generatedSpec; void roundTrip; void surfaces; void corners; void fieldDefault; void defaultLook;

// palettes, typefaces, palette rules, initial, email, icons: modules importable by path
const emberTokens = paletteTokens('ember', { contrast: 'high' });
const ratio: number = contrast(emberTokens['--fd-bg']![0], emberTokens['--fd-ink']![0]);
const failures: string[] = paletteFailures(PALETTES[0]!.tokens);
const bent = toneTokens(emberTokens, { hue: 20 });
const typeProblems: string[] = checkTypeSpec(spec).errors;
const typeTokens: Record<string, string> = typeSpecTokens(spec).tokens;
const firstSet: string | undefined = TYPEFACES[0]?.name;
const geist = FONT_FAMILIES['Geist'];
void ratio; void failures; void bent; void typeProblems; void typeTokens; void firstSet; void geist; void TEXT_MIN; void TONE_DEFAULT;
const initialToneName: string = initialTone('Quarry Labs');
const rows: string[] = initialRows('Quarry Labs');
const svgMark: string = initialMark('Quarry Labs', { label: 'Quarry' });
void initialToneName; void rows; void svgMark; void INITIAL_TONES;
const mail = renderEmail({
  theme: brandLook,
  brand: { name: 'Ember', logoUrl: 'https://ember.example/logo.png' },
  preheader: 'Your sign-in link',
  locale: 'pt-BR',
  blocks: [
    { type: 'heading', text: 'Sign in' },
    { type: 'text', text: ['Open ', { text: 'the dashboard', href: 'https://ember.example' }, '.'], tone: 'muted' },
    { type: 'button', label: 'Sign in', href: 'https://ember.example/in', fallback: false },
    { type: 'code', value: '482 193', label: 'Your code' },
    { type: 'keyValue', rows: [{ label: 'Plan', value: 'Team' }, { label: 'Key', value: 'em_live_…', mono: true }] },
    { type: 'divider' },
    { type: 'note', text: 'If you did not ask for this, ignore it.', title: 'Not you?' },
    { type: 'footer', lines: ['Ember, Inc.'], links: [{ label: 'Help', href: 'mailto:help@ember.example' }] },
  ],
});
const html: string = mail.html;
const textPart: string = mail.text;
const accentOnLight: string = emailColors(brandLook).light.accent;
const rtl: boolean = isRtl('ar');
const drawn: string = iconDirect('search');
void html; void textPart; void accentOnLight; void rtl; void drawn;

// typed listeners for the events added in 0.7
document.addEventListener('fd:accept', (e) => { const text: string = e.detail.value; void text; });
document.addEventListener('fd:hold', (e) => { const seconds: number = e.detail.seconds; const toastId: string | undefined = e.detail.toast; void seconds; void toastId; });
document.addEventListener('fd:undo', (e) => { const value: string | null = e.detail.value; void value; });
document.addEventListener('fd:commit', (e) => {
  const cause: 'time' | 'pagehide' | undefined = e.detail.cause;
  const reason: string | undefined = e.detail.reason;
  const drafted: 'used' | 'edited' | null | undefined = e.detail.drafted;
  void cause; void reason; void drafted;
});
document.addEventListener('fd:keys', (e) => { const keys: string = e.detail.keys; void keys; });
document.addEventListener('fd:download', (e) => { const name: string = e.detail.filename; const body: string = e.detail.value; void name; void body; });
document.addEventListener('fd:copy', (e) => { const copied: string = e.detail.value; void copied; });
document.addEventListener('fd:select', (e) => {
  // table, queue, list-detail, log line, quadrant: one shape with optional fields
  const row: HTMLElement | null | undefined = e.detail.row;
  const item: HTMLElement | undefined = e.detail.item;
  if (typeof e.detail.value === 'number') { const logLine: number = e.detail.value; void logLine; }
  if (e.detail.x !== undefined) { const x: number = e.detail.x; void x; }
  void row; void item;
});
document.addEventListener('fd:change', (e) => {
  const d = e.detail;
  if ('previous' in d) { const state: string = d.previous; void state; }                                  // content setState
  if ('valid' in d) { const ok: boolean = d.valid; const value: string = d.value; void ok; void value; } // date and colour fields
  if ('source' in d && d.source === 'view') { const view: 'list' | 'detail' = d.value; void view; }
});
document.addEventListener('fd:open', (e) => { const value = e.detail?.value; if (value instanceof FormData) void value.get('x'); });

/* ---------- wrong usage must be rejected ---------- */

// @ts-expect-error toast.hold needs a countdown in seconds, not a string
overlays.toast.hold({ title: 'x', seconds: 'ten' });
// @ts-expect-error undo is a function
overlays.toast({ title: 'x', undo: true });
// @ts-expect-error a page state is a fixed set
content.setState(holdEl, 'busy');
// @ts-expect-error a service status is a fixed set
shell.setServiceStatus(holdEl, 'down');
// @ts-expect-error heading case is sentence or upper
const badCase: TypeSpec = { headingCase: 'title' };
// @ts-expect-error a signature field is a fixed set
const badField: ThemeRecord = { signature: { field: 'lava' } };
// @ts-expect-error the email needs a brand
renderEmail({ blocks: [{ type: 'divider' }] });
// @ts-expect-error an email block has a known type
renderEmail({ brand: { name: 'Ember' }, blocks: [{ type: 'banner' }] });
document.addEventListener('fd:hold', (e) => {
  // @ts-expect-error seconds is a number
  const seconds: string = e.detail.seconds;
  void seconds;
});
void badCase; void badField;


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
