/* Fire skeleton markup — the filled markup of every skeleton preset, as a string.
 *
 * Pure ES module: no DOM, importable from Node and from the browser (`fire-design/skeleton`). texture.js fills an empty
 * preset with exactly this markup when its script runs; a build step, a server or a Lit, Vue or React template can
 * write the same markup into the first HTML instead, so a skeleton draws before any script has run. Widths are
 * written as data-fd-vars (fire/boot.js applies them while the page is parsed; core.js a frame later).
 *
 *   skeleton('table', { rows: 5, cols: 4 })
 *     → '<div class="fd-skeleton-table" data-rows="5" data-cols="4" aria-hidden="true">…</div>'
 *   skeletonParts('list', { rows: 3 })        the inside only, for an element you write yourself
 *   skeletonApp({ preset: 'list', tabbar: 5 })
 *     → the first-load app skeleton (.fd-skeleton-app): sidebar, top bar, page head and one filled preset
 *
 * Presets (SKELETON_PRESETS) and their options (out-of-range numbers are clamped, anything else uses the default):
 *   text     lines 1–24 (3)                      table   rows 1–40 (5), cols 1–8 (4)
 *   card     –                                   stat    count 1–6 (4)
 *   grid     count 1–24 (4)                      chart   variant "bars" (else a line)
 *   list     rows 1–24 (4)                       thread  –
 *   form     count 1–12 (3)                      hero    –
 *   page     –
 * skeleton() also carries the preset's data-rows / data-cols / data-count / data-lines / data-variant, and
 * aria-hidden="true" on every preset except text (a text skeleton sits inside a region that is aria-busy).
 *
 * skeletonApp(options):
 *   preset   one of the presets above for the page's content region (default "table"); options for it in `rows`,
 *            `cols`, `count`, `lines`, `variant`
 *   nav      the sidebar's nav rows, 1–12 (6)
 *   tabbar   0, or 3–5: the phone tab bar's items, when the app has one (fd-tabbar)
 *   sidebar  "expanded" (default) | "collapsed": the shell's data-sidebar
 *   label    the status's name for assistive technology (default "Loading")
 */

export const SKELETON_PRESETS = Object.freeze(['text', 'card', 'grid', 'table', 'stat', 'chart', 'list', 'thread', 'form', 'hero', 'page']);

const int = (value, fallback, min, max) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};
const LIMITS = {
  text: { lines: [3, 1, 24] },
  grid: { count: [4, 1, 24] },
  table: { rows: [5, 1, 40], cols: [4, 1, 8] },
  stat: { count: [4, 1, 6] },
  list: { rows: [4, 1, 24] },
  form: { count: [3, 1, 12] },
};
/** The preset's numeric options, clamped, with their defaults. */
function counts(name, options) {
  const out = {};
  for (const [key, [fallback, min, max]] of Object.entries(LIMITS[name] || {})) out[key] = int(options[key], fallback, min, max);
  return out;
}

const block = (cls = 'fd-skeleton', attrs = '') => `<span class="${cls}"${attrs}></span>`;
const w = (value) => ` data-fd-vars="--_sk-w:${value}"`;
// A fixed width is one of skeleton.css's --fd-skeleton-w-<n> tokens, never a pixel value: the markup this module
// writes goes into a page's static HTML, where the markup lint (no-raw-px) and Fire's own rules allow no raw size.
const wide = (n) => w(`var(--fd-skeleton-w-${n})`);
const widths = [62, 44, 78, 54, 70, 38, 86, 48, 66, 58];
const pick = (i, j = 0) => widths[(i * 3 + j * 7) % widths.length];
const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
const textLines = (lines) => `<div class="fd-skeleton-text" data-lines="${lines}">${repeat(lines, () => '<span></span>')}</div>`;

const parts = {
  text: ({ lines }) => repeat(lines, () => '<span></span>'),
  card: () =>
    `<div class="fd-skeleton-card-head">${block('fd-skeleton-tile')}<div class="fd-skeleton-card-titles">${block('fd-skeleton-title', w('58%'))}${block('fd-skeleton-title', ` data-size="label"${w('34%')}`)}</div></div>`
    + textLines(2)
    + `<div class="fd-skeleton-card-foot">${block('fd-skeleton-title', ` data-size="mono"${w('28%')}`)}${block('fd-skeleton-title', ` data-size="mono"${w('24%')}`)}</div>`,
  grid: ({ count }) => repeat(count, (i) => `<div class="fd-skeleton-card" data-fd-vars="--fd-i:${i}">${parts.card()}</div>`),
  table: ({ rows, cols }) => {
    const cells = (r, head) => repeat(cols, (c) => `<span class="fd-skeleton-table-cell">${block('fd-skeleton', w(`${head ? 24 + ((c * 13) % 22) : pick(r, c)}%`))}</span>`);
    return `<div class="fd-skeleton-table-head">${cells(0, true)}</div>${repeat(rows, (r) => `<div class="fd-skeleton-table-row" data-fd-vars="--fd-i:${r}">${cells(r + 1, false)}</div>`)}`;
  },
  stat: ({ count }) => repeat(count, (i) => `<div class="fd-skeleton-stat-tile" data-fd-vars="--fd-i:${i}">${block('fd-skeleton-title', ` data-size="eyebrow"${w(`${36 + (i * 11) % 24}%`)}`)}${block('fd-skeleton-title', ` data-size="stat"${w(`${48 + (i * 17) % 26}%`)}`)}${block('fd-skeleton-title', ` data-size="caption"${w(`${54 + (i * 7) % 20}%`)}`)}</div>`),
  chart: () =>
    `<div class="fd-skeleton-chart-head"><div class="fd-skeleton-chart-titles">${block('fd-skeleton-title', w('44%'))}${block('fd-skeleton-title', ` data-size="caption"${w('28%')}`)}</div>${block('fd-skeleton-title', ` data-size="stat"${wide(72)}`)}</div>`
    + `<div class="fd-skeleton-chart-body"><div class="fd-skeleton-chart-y">${repeat(5, () => block())}</div>`
    + '<div class="fd-skeleton-chart-plot"><span class="fd-skeleton-chart-area"></span><span class="fd-skeleton-chart-line"></span></div>'
    + `<div class="fd-skeleton-chart-x">${repeat(6, () => block())}</div></div>`,
  list: ({ rows }) => repeat(rows, (r) => `<div class="fd-skeleton-list-row" data-fd-vars="--fd-i:${r}">${block('fd-skeleton-avatar')}<div class="fd-skeleton-list-text">${block('fd-skeleton-title', ` data-size="label"${w(`${pick(r, 1) - 10}%`)}`)}${block('fd-skeleton-title', ` data-size="caption"${w(`${pick(r, 2) - 4}%`)}`)}</div>${block('fd-skeleton-button', ' data-size="sm"')}</div>`),
  thread: () =>
    `<div class="fd-skeleton-thread-user">${textLines(2)}</div>`
    + `<div class="fd-skeleton-thread-reply" data-fd-vars="--fd-i:1">${textLines(3)}`
    + `<div class="fd-skeleton-thread-tool">${block('fd-skeleton-tile', ' data-size="16"')}${block('fd-skeleton-title', ` data-size="mono"${wide(96)}`)}${block('fd-skeleton-title', ` data-size="mono"${wide(140)}`)}<span class="fd-grow"></span>${block('fd-skeleton-title', ` data-size="caption"${wide(44)}`)}</div>`
    + `${textLines(2)}</div>`,
  form: ({ count }) =>
    repeat(count, (i) => `<div class="fd-skeleton-form-field" data-fd-vars="--fd-i:${i}">${block('fd-skeleton-title', ` data-size="label"${w(`${22 + (i * 9) % 18}%`)}`)}<div class="fd-skeleton-form-control">${block('fd-skeleton', w(`${30 + (i * 13) % 26}%`))}</div>${block('fd-skeleton-title', ` data-size="caption"${w(`${46 + (i * 11) % 24}%`)}`)}</div>`)
    + `<div class="fd-skeleton-form-actions">${block('fd-skeleton-button', wide(76))}${block('fd-skeleton-button', wide(112))}</div>`,
  hero: () => `${block('fd-skeleton-title', ` data-size="display"${w('38%')}`)}${block('fd-skeleton-title', ` data-size="lead"${w('56%')}`)}`,
  page: () => {
    const rail = repeat(9, (i) => (i === 3 || i === 6 ? '<span class="fd-skeleton-page-sep"></span>' : '') + block('fd-skeleton-tile', ' data-size="20"'));
    return `<div class="fd-skeleton-page-rail">${block('fd-skeleton-tile', ' data-size="24"')}<div class="fd-skeleton-page-icons">${rail}</div>${block('fd-skeleton-avatar', ' data-size="24"')}</div>`
      + `<div class="fd-skeleton-page-main"><div class="fd-skeleton-page-top">${block('fd-skeleton-button', wide(148))}<span class="fd-grow"></span>${block('fd-skeleton-button', ' data-square')}${block('fd-skeleton-button', ' data-square')}${block('fd-skeleton-button', wide(84))}</div>`
      + `<div class="fd-skeleton-page-body"><div class="fd-skeleton-hero">${parts.hero()}</div>`
      + `<div class="fd-skeleton-page-toolbar"><div class="fd-skeleton-form-control" data-search>${block('fd-skeleton', w('44%'))}</div>${block('fd-skeleton-button', wide(132))}${block('fd-skeleton-button', wide(120))}<span class="fd-grow"></span>${block('fd-skeleton-button', wide(108))}</div>`
      + `<div class="fd-skeleton-table" data-rows="6" data-cols="5">${parts.table({ rows: 6, cols: 5 })}</div></div></div>`;
  },
};

function presetName(name) {
  const short = String(name ?? '').replace(/^fd-skeleton-/, '');
  if (!SKELETON_PRESETS.includes(short)) throw new TypeError(`skeleton: unknown preset "${name}" (one of ${SKELETON_PRESETS.join(', ')})`);
  return short;
}

/** The inside of a preset: what texture.js writes into an empty .fd-skeleton-<name>. */
export function skeletonParts(name, options = {}) {
  const short = presetName(name);
  return parts[short]({ ...counts(short, options), variant: options.variant });
}

/** A whole preset element, filled. */
export function skeleton(name, options = {}) {
  const short = presetName(name);
  const n = counts(short, options);
  const attrs = Object.entries(n).map(([key, value]) => ` data-${key}="${value}"`).join('')
    + (short === 'chart' && options.variant === 'bars' ? ' data-variant="bars"' : '')
    + (short === 'text' ? '' : ' aria-hidden="true"');
  return `<div class="fd-skeleton-${short}"${attrs}>${skeletonParts(short, options)}</div>`;
}

const escapeAttr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The first-load app skeleton: the app shell's geometry, written into a page's static HTML. */
export function skeletonApp(options = {}) {
  const { preset = 'table', label = 'Loading', sidebar = 'expanded' } = options;
  const tabs = options.tabbar ? int(options.tabbar, 5, 3, 5) : 0;
  const nav = int(options.nav, 6, 1, 12);
  const side = sidebar === 'collapsed' ? ' data-sidebar="collapsed"' : '';
  return `<div class="fd-skeleton-app"${side} role="status" aria-label="${escapeAttr(label)}">`
    + '<div class="fd-skeleton-app-side" aria-hidden="true"><span class="fd-skeleton-app-brand"></span>'
    + `<span class="fd-skeleton-app-nav">${repeat(nav, () => '<i></i>')}</span><span class="fd-skeleton-app-account"></span></div>`
    + '<div class="fd-skeleton-app-main" aria-hidden="true"><span class="fd-skeleton-app-top"><i></i><i></i><i></i><i></i></span>'
    + `<div class="fd-skeleton-app-page"><span class="fd-skeleton-app-head"></span>${skeleton(preset, options)}</div></div>`
    + (tabs ? `<span class="fd-skeleton-app-tabbar" aria-hidden="true">${repeat(tabs, () => '<i></i>')}</span>` : '')
    + '</div>';
}
