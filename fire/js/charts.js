/* Fire charts — SVG charts, sparklines, donuts, heat grids and ranked bars.
 *
 * Declarative
 *   <div class="fd-chart" data-fd-chart="line|area|bar|stacked" data-height="240" data-legend data-grid="dashed|solid|none">
 *     <script type="application/json">{
 *       "labels": ["Nov 08", "Nov 09"],               x tick labels ("" = no tick; thinned automatically)
 *       "titles": ["Nov 08, 2026", ...],               optional tooltip headings (default: the label)
 *       "series": [{ "name": "Credits", "values": [3, 4], "tone": "danger" }],   up to 6, series 1 is the accent
 *       "yFormat": "number|compact|percent|ms|credits",
 *       "threshold": { "value": 2, "label": "Concurrency limit: 2", "tone": "danger" },
 *       "live": true,                                  pulsing end-point dot on line series
 *       "unit": "browsers", "yMin": 0|"auto", "yMax": 100, "xTitle": "Day", "label": "aria-label override",
 *       "empty": { "title": "...", "description": "..." }, "state": "loading|empty"
 *     }</script>
 *   </div>
 *   data-state="loading|empty" on the element works too (loading needs no JSON).
 *
 * Programmatic
 *   charts.render(el, config)      draw (or redraw) a chart
 *   charts.update(el, patch)       merge into the current config and redraw without the entrance animation
 *   charts.toggleSeries(el, index, visible?)
 *   charts.sparkline(el) / charts.donut(el) / charts.heatgrid(el)     redraw after changing data-* or JSON
 *   charts.formatValue(value, format, long)
 *
 * Standalone legend:  <div class="fd-legend" data-for="#chart-id"> <button class="fd-legend-item" data-s="1" aria-pressed="true">…</button> </div>
 * (or data-legend on the chart renders its own). Clicking an item toggles that series.
 *
 * Interaction: pointer, touch-drag or ←/→/Home/End (chart focused) move a crosshair that snaps to the nearest x.
 *
 * Events (bubble from the chart element)
 *   fd:hover   { index, label, values }                   the active point changed (pointer or keyboard)
 *   fd:select  { index, label, values }                   click / tap / Enter on the active point
 *   fd:change  { value: seriesName, index, visible }      a legend toggle
 *
 * Quadrant: points placed on two axes, split into four corners by a midpoint on each.
 *   <div class="fd-chart" data-fd-chart="quadrant" data-height="360" data-labels="none">
 *     <script type="application/json">{
 *       "x": { "label": "Credits per call", "min": 0, "max": 10, "mid": 4, "format": "number" },   y is the same; min and max
 *       "y": { "label": "Success rate", "min": 90, "max": 100, "mid": 97, "format": "percent" },   default to the data, mid to the centre
 *       "corners": { "topLeft": "Cheap and reliable", "topRight": { "label": "Worth the cost", "tone": "success" },
 *                    "bottomLeft": "Cheap and flaky", "bottomRight": "Costly and flaky" },     a string, or { label, tone }
 *       "size": { "label": "Calls", "format": "compact" },             optional: what a point's size means
 *       "points": [{ "name": "/scrape", "x": 1, "y": 99.4, "size": 120000, "tone": "accent", "href": "/endpoints/scrape" }],
 *       "label": "aria-label override", "empty": { "title": "...", "description": "..." }, "state": "loading|empty"
 *     }</script>
 *   </div>
 *   Every point is a link (with href) or a button and takes focus; ←/→/↑/↓ move to the nearest point in that direction.
 *   Hover or focus shows a tooltip with both values. data-labels="none" hides the names beside the points.
 *   Below 520px of width the plot gives way to a list grouped by corner, with the same names, values and links.
 *   charts.quadrant(el, config?)   draw (or redraw) from a config, or from the element's JSON when none is given
 *   Events: fd:hover { index, name, x, y } the active point changed · fd:select { index, name, x, y, href } click or Enter
 *
 * Accessibility: the plot is role="img" with an aria-label and is focusable; a visually hidden <table> carries the
 * data and a polite live region announces the active point while navigating by keyboard.
 *
 * Colour comes from CSS (data-s="1…6" / data-tone) so themes and accents switch without re-rendering.
 */
import { once, emit, reducedMotion, clamp, id as uid } from './core.js';

const NS = 'http://www.w3.org/2000/svg';
const states = new WeakMap();
const live = new Set();

/* ---------- small helpers ---------- */
const r2 = (n) => Math.round(n * 100) / 100;
/* "--a:1;--b:2px" onto an element through the CSSOM. */
const setStyle = (node, text) => {
  for (const pair of String(text).split(';')) {
    const at = pair.indexOf(':');
    if (at > 0) node.style.setProperty(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
  }
};
const svg = (tag, attrs, parent) => {
  const node = document.createElementNS(NS, tag);
  if (attrs) {
    for (const k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'style') setStyle(node, attrs[k]); // never a style attribute: it would need style-src 'unsafe-inline'
      else node.setAttribute(k, attrs[k]);
    }
  }
  if (parent) parent.append(node);
  return node;
};
const html = (tag, cls, text, parent) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  if (parent) parent.append(node);
  return node;
};
const slot = (i) => (i % 6) + 1;
const finite = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
/* Remove everything a renderer drew, but keep the JSON config script so a redraw can re-read it. */
const clearDrawn = (el) => [...el.children].forEach((c) => { if (!c.matches('script[type="application/json"]')) c.remove(); });
const scan = (root, sel) => {
  const out = [...root.querySelectorAll(sel)];
  if (root.matches?.(sel)) out.unshift(root);
  return out;
};
function readJSON(el) {
  const node = el.querySelector(':scope > script[type="application/json"]');
  if (!node) return {};
  try { return JSON.parse(node.textContent || '{}'); } catch (error) { console.warn('[fire] chart JSON is invalid', error); return {}; }
}

/* ---------- number formatting ---------- */
const nfCache = new Map();
function fmtNum(v, digits = 2) {
  let nf = nfCache.get(digits);
  if (!nf) nfCache.set(digits, (nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: digits })));
  return nf.format(Object.is(v, -0) ? 0 : v);
}
const UNITS = [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']];
function compact(v) {
  const a = Math.abs(v);
  for (let i = 0; i < UNITS.length; i++) {
    const [size, suffix] = UNITS[i];
    if (a >= size) {
      let s = Number((a / size).toFixed(1));
      if (s >= 1000 && i > 0) return `${v < 0 ? '-' : ''}${Number((a / UNITS[i - 1][0]).toFixed(1))}${UNITS[i - 1][1]}`;
      return `${v < 0 ? '-' : ''}${s}${suffix}`;
    }
  }
  return fmtNum(v, 1);
}
const milliseconds = (v) => (Math.abs(v) >= 1000 ? `${Number((v / 1000).toFixed(2))}s` : `${fmtNum(v, 0)}ms`);
const FORMATS = {
  number: { axis: (v) => fmtNum(v, 2), long: (v) => fmtNum(v, 2) },
  compact: { axis: compact, long: (v) => fmtNum(v, 2) },
  credits: { axis: compact, long: (v) => fmtNum(v, 2) },
  percent: { axis: (v) => `${fmtNum(v, 1)}%`, long: (v) => `${fmtNum(v, 1)}%` },
  ms: { axis: milliseconds, long: milliseconds },
};
/** Format a value with a named format ("number", "compact", "percent", "ms", "credits") or a custom function. */
export function formatValue(value, format = 'number', long = false) {
  if (value == null) return '–';
  if (typeof format === 'function') return String(format(value, long));
  const f = FORMATS[format] || FORMATS.number;
  return (long ? f.long : f.axis)(value);
}

/* ---------- scales ---------- */
function niceStep(raw) {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}
function niceScale(lo, hi, maxTicks, integer) {
  if (!(hi > lo)) hi = lo + (integer ? 4 : 1);
  let step = niceStep((hi - lo) / Math.max(1, maxTicks - 1));
  if (integer) step = Math.max(1, Math.round(step));
  const nlo = Math.floor(lo / step + 1e-9) * step;
  const nhi = Math.ceil(hi / step - 1e-9) * step;
  const ticks = [];
  for (let v = nlo, k = 0; v <= nhi + step * 1e-6 && k < 12; k++, v = nlo + k * step) ticks.push(Number(v.toFixed(10)));
  return { lo: ticks[0], hi: ticks[ticks.length - 1], ticks };
}

/* Measure one character of the tick font, so label widths are exact instead of guessed. */
function measureChar(root) {
  const t = svg('text', { class: 'fd-chart-tick', x: 0, y: 0, 'aria-hidden': 'true' }, root);
  t.textContent = '0000000000';
  let w = 0;
  try { w = t.getComputedTextLength() / 10; } catch { /* detached */ }
  t.remove();
  return w > 3 ? w : 6.6;
}

/* ---------- entrance (draw / grow) when the element scrolls into view ---------- */
const io = typeof IntersectionObserver === 'function'
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        if (entry.target.dataset.enter === 'pending') entry.target.dataset.enter = 'run';
      }
    }, { threshold: 0.15 })
  : null;
function armEnter(el) {
  if (el.dataset.enter) return;
  if (reducedMotion() || !io) { el.dataset.enter = 'done'; return; }
  el.dataset.enter = 'pending';
  io.observe(el);
}
/* A redraw must never replay the entrance. */
function settleEnter(el) {
  if (el.dataset.enter === 'run') el.dataset.enter = 'done';
}

/* ==========================================================================
   Cartesian charts: line, area, bar, stacked
   ========================================================================== */
function normalize(config, el) {
  const cfg = { ...config };
  const type = cfg.type || el.dataset.fdChart || 'line';
  cfg.type = ['line', 'area', 'bar', 'stacked'].includes(type) ? type : 'line';
  const series = (Array.isArray(cfg.series) ? cfg.series : []).slice(0, 6).map((s, i) => ({
    name: s.name ?? `Series ${i + 1}`,
    tone: s.tone || null,
    values: (Array.isArray(s.values) ? s.values : []).map(finite),
  }));
  let labels = (Array.isArray(cfg.labels) ? cfg.labels : []).map((l) => (l == null ? '' : String(l)));
  const n = Math.max(labels.length, ...series.map((s) => s.values.length), 0);
  while (labels.length < n) labels.push('');
  for (const s of series) while (s.values.length < n) s.values.push(null);
  cfg.series = series;
  cfg.labels = labels;
  cfg.height = clamp(Number(cfg.height ?? el.dataset.height) || 240, 80, 900);
  cfg.yFormat = cfg.yFormat || el.dataset.yFormat || 'number';
  cfg.threshold = cfg.threshold && finite(cfg.threshold.value) != null ? { ...cfg.threshold, value: Number(cfg.threshold.value) } : null;
  return cfg;
}

function create(el) {
  once(el, 'chart');
  const st = {
    el, raw: {}, config: null, type: 'line', hidden: new Set(), w: 0, layout: null, active: -1,
    cursor: null, legendKey: '', timer: 0, touchTimer: 0, cw: 6.6,
  };
  st.plot = html('div', 'fd-chart-plot');
  st.tip = html('div', 'fd-chart-tooltip');
  st.tip.setAttribute('aria-hidden', 'true');
  st.status = html('div', 'fd-sr-only');
  st.status.setAttribute('aria-live', 'polite');
  st.table = html('table', 'fd-sr-only');
  el.append(st.plot, st.tip, st.status, st.table);
  states.set(el, st);
  live.add(el);
  bindPlot(el, st);

  if (typeof ResizeObserver === 'function') {
    st.ro = new ResizeObserver(() => {
      clearTimeout(st.timer);
      st.timer = setTimeout(() => {
        if (!el.isConnected) { st.ro.disconnect(); live.delete(el); return; }
        const w = Math.floor(st.plot.clientWidth);
        if (w && w !== st.w) draw(el, st);
      }, 80);
    });
    st.ro.observe(el);
  }
  return st;
}

/** Draw (or redraw) a chart from a config object. */
export function render(el, config = {}) {
  if ((config.type || el.dataset.fdChart) === 'quadrant') return quadrant(el, config);
  el.classList.add('fd-chart');
  const st = states.get(el) || create(el);
  st.raw = { ...config };
  st.config = normalize(st.raw, el);
  st.type = st.config.type;
  st.hidden = new Set([...st.hidden].filter((i) => i < st.config.series.length));
  if (config.type) el.dataset.fdChart = config.type;
  buildMeta(el, st);
  buildLegend(el, st);
  armEnter(el);
  draw(el, st);
  watchFonts();
  return el;
}

/** Merge a patch into the current config and redraw (no entrance animation). */
export function update(el, patch = {}) {
  const quad = quadStates.get(el);
  if (quad?.raw) {
    const next = { ...quad.raw, ...patch };
    if ('points' in patch && !('state' in patch)) delete next.state;
    return quadrant(el, next);
  }
  const st = states.get(el);
  if (!st) return render(el, patch);
  const next = { ...st.raw, ...patch };
  if (('series' in patch || 'labels' in patch) && !('state' in patch)) { delete next.state; delete next.loading; }
  settleEnter(el);
  return render(el, next);
}

/** Show or hide one series (what a legend click does). */
export function toggleSeries(el, index, visible) {
  const st = states.get(el);
  if (!st || !st.config.series[index]) return;
  const show = visible ?? st.hidden.has(index);
  if (!show && st.config.series.length - st.hidden.size <= 1) return; // never hide the last series
  if (show) st.hidden.delete(index); else st.hidden.add(index);
  settleEnter(el);
  syncLegends(el, st);
  draw(el, st);
  emit(el, 'fd:change', { value: st.config.series[index].name, index, visible: show });
}

function resolveState(st) {
  const cfg = st.config;
  const wanted = cfg.state || (cfg.loading ? 'loading' : '');
  if (wanted === 'loading') return 'loading';
  if (wanted === 'empty') return 'empty';
  const any = cfg.series.some((s) => s.values.some((v) => v != null));
  return cfg.labels.length && any ? 'ready' : 'empty';
}

function typeName(type) { return { line: 'Line', area: 'Area', bar: 'Bar', stacked: 'Stacked bar' }[type]; }

function buildMeta(el, st) {
  const cfg = st.config;
  const names = cfg.series.map((s) => s.name).join(', ');
  const first = cfg.labels.find(Boolean);
  const last = [...cfg.labels].reverse().find(Boolean);
  const range = first && last && first !== last ? ` from ${first} to ${last}` : '';
  st.label = cfg.label || el.dataset.label || `${typeName(st.type)} chart of ${names || 'no data'}${range}`;
  // Accessible table
  const t = st.table;
  t.replaceChildren();
  if (!cfg.labels.length) return;
  html('caption', '', cfg.label || el.dataset.label || `${names} data`, t);
  const head = html('tr', '', null, html('thead', '', null, t));
  const corner = html('th', '', cfg.xTitle || 'Period', head);
  corner.scope = 'col';
  for (const s of cfg.series) html('th', '', s.name, head).scope = 'col';
  const body = html('tbody', '', null, t);
  cfg.labels.forEach((label, i) => {
    const row = html('tr', '', null, body);
    html('th', '', (cfg.titles && cfg.titles[i]) || label || String(i + 1), row).scope = 'row';
    for (const s of cfg.series) html('td', '', formatValue(s.values[i], cfg.yFormat, true), row);
  });
}

/* Legend: built-in (data-legend) and standalone (.fd-legend[data-for]) share state. */
function legendShape(type) { return type === 'bar' || type === 'stacked' ? 'square' : 'line'; }
function buildLegend(el, st) {
  const cfg = st.config;
  const want = cfg.legend ?? (el.hasAttribute('data-legend') && el.getAttribute('data-legend') !== 'false');
  const key = JSON.stringify([!!want, st.type, cfg.series.map((s) => [s.name, s.tone])]);
  if (key === st.legendKey) return;
  st.legendKey = key;
  st.legend?.remove();
  st.legend = null;
  if (!want || !cfg.series.length) return;
  const box = html('div', 'fd-legend');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Series');
  cfg.series.forEach((s, i) => {
    const item = html('button', 'fd-legend-item', null, box);
    item.type = 'button';
    item.dataset.s = slot(i);
    if (s.tone) item.dataset.tone = s.tone;
    item.dataset.series = i;
    item.setAttribute('aria-pressed', String(!st.hidden.has(i)));
    const sw = html('span', 'fd-legend-swatch', null, item);
    sw.dataset.shape = legendShape(st.type);
    html('span', '', s.name, item);
  });
  st.plot.after(box);
  st.legend = box;
}
function syncLegends(el, st) {
  const linked = el.id ? [...document.querySelectorAll(`.fd-legend[data-for="#${CSS.escape(el.id)}"]`)] : [];
  const boxes = [st.legend, ...linked].filter(Boolean);
  for (const box of boxes) {
    [...box.querySelectorAll('.fd-legend-item')].forEach((item, k) => {
      const i = item.dataset.series != null ? Number(item.dataset.series) : k;
      item.setAttribute('aria-pressed', String(!st.hidden.has(i)));
    });
  }
}

/* ---------- drawing ---------- */
function draw(el, st) {
  const cfg = st.config;
  if (!cfg) return;
  const H = cfg.height;
  const w = Math.floor(st.plot.clientWidth);
  if (w < 40) return; // hidden or not laid out yet; the ResizeObserver redraws when it is
  st.w = w;
  settleEnter(el);
  hideTip(st, true);
  st.layout = null;
  st.cursor = null;
  st.active = -1;
  st.plot.style.height = `${H}px`;
  const state = resolveState(st);
  el.dataset.state = state;
  if (state === 'loading') el.setAttribute('aria-busy', 'true'); else el.removeAttribute('aria-busy');
  for (const a of ['role', 'tabindex', 'aria-label']) st.plot.removeAttribute(a);

  if (state === 'loading') {
    drawLoading(st, w, H);
    st.plot.setAttribute('role', 'status');
    st.plot.setAttribute('aria-label', 'Loading chart');
    return;
  }
  if (state === 'empty') {
    drawEmpty(st);
    return;
  }
  drawCartesian(el, st, w, H);
  st.plot.setAttribute('role', 'img');
  st.plot.setAttribute('tabindex', '0');
  st.plot.setAttribute('aria-label', st.label);
}

function drawEmpty(st) {
  const cfg = st.config;
  const box = html('div', 'fd-chart-empty');
  box.style.height = `${cfg.height}px`;
  html('p', 'fd-chart-empty-title', cfg.empty?.title || 'No activity in this date range', box);
  html('p', 'fd-chart-empty-text', cfg.empty?.description || 'Try a different date range, endpoint, or API key.', box);
  st.plot.replaceChildren(box);
}

function drawLoading(st, w, H) {
  const box = html('div', 'fd-chart-loading');
  box.style.height = `${H}px`;
  const grid = html('div', 'fd-chart-skel-grid', null, box);
  for (let i = 0; i < 4; i++) html('i', '', null, grid);
  const heights = [38, 62, 46, 74, 55, 84, 52, 68, 41, 77, 58, 88, 48, 66, 36, 72, 54, 81, 45, 63];
  if (st.type === 'line' || st.type === 'area') {
    const count = 14;
    const pts = [];
    for (let i = 0; i < count; i++) pts.push(`${r2((i / (count - 1)) * 100)}% ${100 - heights[i]}%`);
    const area = html('div', 'fd-chart-skel-area', null, box);
    area.style.clipPath = `polygon(${pts.join(', ')}, 100% 100%, 0% 100%)`;
  } else {
    const bars = html('div', 'fd-chart-skel-bars', null, box);
    const count = clamp(Math.floor(w / 30), 6, 36);
    for (let i = 0; i < count; i++) html('i', 'fd-chart-skel-bar', null, bars).style.setProperty('--_ch-h', `${heights[i % heights.length]}%`);
  }
  st.plot.replaceChildren(box);
}

function drawCartesian(el, st, W, H) {
  const cfg = st.config;
  const type = st.type;
  const isBar = type === 'bar' || type === 'stacked';
  const stacked = type === 'stacked';
  const n = cfg.labels.length;
  const vis = [];
  cfg.series.forEach((s, i) => { if (!st.hidden.has(i)) vis.push({ s, i }); });

  /* Domain */
  let maxV = -Infinity;
  let minV = Infinity;
  let integers = cfg.yFormat !== 'percent';
  const seeInt = (v) => { if (!Number.isInteger(v)) integers = false; };
  if (stacked) {
    for (let k = 0; k < n; k++) {
      let sum = 0;
      for (const { s } of vis) { const v = s.values[k]; if (v != null) { sum += v; seeInt(v); } }
      maxV = Math.max(maxV, sum); minV = Math.min(minV, sum);
    }
  } else {
    for (const { s } of vis) for (const v of s.values) if (v != null) { maxV = Math.max(maxV, v); minV = Math.min(minV, v); seeInt(v); }
  }
  if (!Number.isFinite(maxV)) { maxV = 0; minV = 0; }
  const th = cfg.threshold ? cfg.threshold.value : null;
  if (th != null) { maxV = Math.max(maxV, th); minV = Math.min(minV, th); seeInt(th); }
  const lo0 = cfg.yMin === 'auto' ? minV : Number.isFinite(Number(cfg.yMin)) && cfg.yMin != null ? Number(cfg.yMin) : Math.min(0, minV);
  const hi0 = Number.isFinite(Number(cfg.yMax)) && cfg.yMax != null ? Number(cfg.yMax) : Math.max(maxV, lo0);

  const top = th != null ? 22 : 12;
  const bottom = 28;
  const plotH = Math.max(40, H - top - bottom);
  let maxTicks = clamp(Math.floor(plotH / 44) + 1, 2, 6);
  if (W < 420) maxTicks = Math.min(maxTicks, 4);
  const scale = niceScale(lo0, hi0, maxTicks, integers);
  const { lo, hi } = scale;

  const root = svg('svg', { class: 'fd-chart-svg', width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true', focusable: 'false' });
  st.plot.replaceChildren(root);
  const cw = (st.cw = measureChar(root));

  const tickText = scale.ticks.map((t) => formatValue(t, cfg.yFormat));
  const labelW = Math.ceil(Math.max(...tickText.map((s) => s.length)) * cw);
  const left = labelW + 12;
  const right = 12;
  const plotW = Math.max(40, W - left - right);
  const bottomY = top + plotH;
  const yAt = (v) => top + (1 - (v - lo) / (hi - lo)) * plotH;
  const band = plotW / Math.max(n, 1);
  const xAt = isBar ? (i) => left + band * (i + 0.5) : (i) => left + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const pitch = isBar ? band : n > 1 ? plotW / (n - 1) : plotW;

  /* Grid, baseline, y labels */
  const gridLayer = svg('g', null, root);
  const thY = th != null ? yAt(th) : null;
  scale.ticks.forEach((t, k) => {
    const y = Math.round(yAt(t)) + 0.5;
    if (k === 0) svg('path', { class: 'fd-chart-baseline', d: `M${left} ${y}H${left + plotW}` }, gridLayer);
    else if (thY == null || Math.abs(y - 0.5 - thY) > 1) svg('path', { class: 'fd-chart-grid', d: `M${left} ${y}H${left + plotW}` }, gridLayer);
    const text = svg('text', { class: 'fd-chart-tick', x: left - 10, y: r2(yAt(t)), dy: '0.35em', 'text-anchor': 'end' }, gridLayer);
    text.textContent = tickText[k];
  });

  /* X labels, thinned so they never collide */
  const lens = cfg.labels.filter(Boolean).map((l) => l.length);
  const minGap = (lens.length ? Math.max(...lens) : 1) * cw + 20;
  let lastX = -Infinity;
  for (let i = 0; i < n; i++) {
    if (!cfg.labels[i]) continue;
    const x = xAt(i);
    if (x - lastX < minGap) continue;
    lastX = x;
    const tw = cfg.labels[i].length * cw;
    const cx = clamp(x, tw / 2 + 2, W - tw / 2 - 2);
    const text = svg('text', { class: 'fd-chart-tick', x: r2(cx), y: bottomY + 18, 'text-anchor': 'middle' }, gridLayer);
    text.textContent = cfg.labels[i];
  }

  /* Threshold */
  if (th != null) {
    const y = Math.round(thY) + 0.5;
    const tone = cfg.threshold.tone || null;
    svg('path', { class: 'fd-chart-threshold', 'data-tone': tone, d: `M${left} ${y}H${left + plotW}` }, gridLayer);
    let label = cfg.threshold.label || `Limit: ${formatValue(th, cfg.yFormat, true)}`;
    if ((label.length + 1) * (cw + 0.8) > plotW - 8) label = `Limit: ${formatValue(th, cfg.yFormat, true)}`;
    const t = svg('text', { class: 'fd-chart-threshold-label', 'data-tone': tone, x: left + plotW, y: y - 6, 'text-anchor': 'end' }, gridLayer);
    t.textContent = label;
  }

  /* Series */
  const bandRect = isBar ? svg('rect', { class: 'fd-chart-band', x: 0, y: top, width: 0, height: plotH, rx: 2, hidden: '' }, root) : null;
  const seriesLayer = svg('g', null, root);
  const geo = { band, group: 0, bars: [] };
  if (isBar) {
    const m = stacked ? 1 : vis.length;
    const gap = clamp(Math.round(band * 0.3), 2, 16);
    const maxBar = 36;
    const groupW = Math.max(1, Math.floor(Math.min(band - gap, m * maxBar + (m - 1) * 2)));
    const barW = Math.max(1, Math.floor((groupW - (m - 1) * 2) / m));
    const usedW = m * barW + (m - 1) * 2;
    for (let k = 0; k < n; k++) {
      const col = svg('g', { class: 'fd-chart-col', style: `--_ch-i:${k}` }, seriesLayer);
      const x0 = Math.round(left + band * k + (band - usedW) / 2);
      if (stacked) {
        const segs = vis.filter(({ s }) => s.values[k] != null && s.values[k] > lo);
        let acc = 0;
        segs.forEach(({ s, i }, idx) => {
          const v = s.values[k];
          const y1 = Math.round(yAt(acc + v));
          const y0 = Math.round(yAt(acc));
          acc += v;
          const isTop = idx === segs.length - 1;
          const h = Math.max(1, y0 - y1 - (isTop ? 0 : 1)); // 1px seam between segments
          svg('path', { class: 'fd-chart-bar', 'data-s': slot(i), 'data-tone': s.tone, d: barPath(x0, y0 - h, barW, h, isTop ? 3 : 0) }, col);
        });
      } else {
        vis.forEach(({ s, i }, j) => {
          const v = s.values[k];
          if (v == null || v <= lo) return;
          const y1 = Math.round(yAt(v));
          const h = Math.max(1, bottomY - y1);
          svg('path', { class: 'fd-chart-bar', 'data-s': slot(i), 'data-tone': s.tone, d: barPath(x0 + j * (barW + 2), bottomY - h, barW, h, 3) }, col);
        });
      }
    }
    geo.group = usedW;
  } else {
    for (const { s, i } of [...vis].reverse()) {
      const g = svg('g', { 'data-s': slot(i), 'data-tone': s.tone }, seriesLayer);
      const segments = [];
      let cur = [];
      s.values.forEach((v, k) => {
        if (v == null) { if (cur.length) segments.push(cur); cur = []; } else cur.push([xAt(k), yAt(v)]);
      });
      if (cur.length) segments.push(cur);
      const gradId = type === 'area' ? uid('fd-area') : null;
      if (gradId) {
        const defs = svg('defs', null, g);
        const grad = svg('linearGradient', { id: gradId, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        svg('stop', { class: 'fd-chart-stop', offset: 0, 'stop-opacity': 0.12 }, grad);
        svg('stop', { class: 'fd-chart-stop', offset: 1, 'stop-opacity': 0 }, grad);
      }
      for (const seg of segments) {
        if (seg.length === 1) { svg('circle', { class: 'fd-chart-point', cx: r2(seg[0][0]), cy: r2(seg[0][1]), r: 3 }, g); continue; }
        const d = seg.map(([x, y], k) => `${k ? 'L' : 'M'}${r2(x)} ${r2(y)}`).join('');
        if (gradId) svg('path', { class: 'fd-chart-area', fill: `url(#${gradId})`, d: `M${r2(seg[0][0])} ${bottomY}${d.replace('M', 'L')}L${r2(seg[seg.length - 1][0])} ${bottomY}Z` }, g);
        svg('path', { class: 'fd-chart-line', pathLength: 1, d }, g);
      }
    }
  }

  /* Live end-points */
  if (cfg.live && !isBar) {
    const liveLayer = svg('g', { class: 'fd-chart-live' }, root);
    for (const { s, i } of vis) {
      let k = n - 1;
      while (k >= 0 && s.values[k] == null) k--;
      if (k < 0) continue;
      const g = svg('g', { 'data-s': slot(i), 'data-tone': s.tone }, liveLayer);
      const cx = r2(xAt(k));
      const cy = r2(yAt(s.values[k]));
      svg('circle', { class: 'fd-chart-live-ring', cx, cy, r: 4 }, g);
      svg('circle', { class: 'fd-chart-live-dot', cx, cy, r: 3 }, g);
    }
  }

  /* Cursor: crosshair + dots (lines) or a band (bars) */
  const cursor = svg('g', { class: 'fd-chart-cursor', hidden: '' }, root);
  const cur = { g: cursor, band: bandRect, line: null, dots: [] };
  if (!isBar) {
    cur.line = svg('line', { class: 'fd-chart-crosshair', x1: 0, x2: 0, y1: top, y2: bottomY }, cursor);
    for (const { s, i } of vis) cur.dots.push({ i, s, node: svg('circle', { class: 'fd-chart-dot', 'data-s': slot(i), 'data-tone': s.tone, r: 3 }, cursor) });
  }
  st.cursor = cur;
  st.layout = { n, isBar, left, top, plotW, plotH, bottomY, xAt, yAt, band, vis, groupW: geo.group };
  armEnter(el);
}

function barPath(x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h);
  if (r < 1) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return `M${x} ${y + h}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h}Z`;
}

/* ---------- interaction ---------- */
function indexAt(st, clientX) {
  const L = st.layout;
  const rect = st.plot.getBoundingClientRect();
  const px = clientX - rect.left;
  if (L.isBar) return clamp(Math.floor((px - L.left) / L.band), 0, L.n - 1);
  if (L.n === 1) return 0;
  return clamp(Math.round(((px - L.left) / L.plotW) * (L.n - 1)), 0, L.n - 1);
}

function pointData(st, i) {
  const cfg = st.config;
  const rows = st.layout.vis.map(({ s, i: si }) => ({
    slot: slot(si), tone: s.tone, name: s.name, raw: s.values[i],
    value: formatValue(s.values[i], cfg.yFormat, true) + (cfg.unit && s.values[i] != null ? ` ${cfg.unit}` : ''),
  }));
  let total = null;
  if (st.type === 'stacked' && rows.length > 1) {
    const sum = rows.reduce((a, r) => a + (r.raw || 0), 0);
    total = formatValue(sum, cfg.yFormat, true) + (cfg.unit ? ` ${cfg.unit}` : '');
  }
  const label = (cfg.titles && cfg.titles[i]) || cfg.labels[i] || `Point ${i + 1}`;
  return { label, rows, total };
}

function setActive(el, st, i, { announce = false } = {}) {
  const L = st.layout;
  if (!L || !st.cursor) return;
  i = clamp(i, 0, L.n - 1);
  const changed = i !== st.active;
  st.active = i;
  const cur = st.cursor;
  const x = L.xAt(i);
  cur.g.removeAttribute('hidden');
  if (L.isBar) {
    cur.band.removeAttribute('hidden');
    cur.band.setAttribute('x', r2(L.left + L.band * i));
    cur.band.setAttribute('width', r2(L.band));
  } else {
    const cx = Math.round(x) + 0.5;
    cur.line.setAttribute('x1', cx);
    cur.line.setAttribute('x2', cx);
    for (const d of cur.dots) {
      const v = d.s.values[i];
      d.node.toggleAttribute('hidden', v == null);
      if (v != null) { d.node.setAttribute('cx', r2(x)); d.node.setAttribute('cy', r2(L.yAt(v))); }
    }
  }
  const data = pointData(st, i);
  if (changed) {
    buildTip(st, data);
    const detail = { index: i, label: data.label, values: data.rows.map((r) => ({ name: r.name, value: r.raw })) };
    emit(el, 'fd:hover', detail);
  }
  placeTip(st, x);
  if (announce) st.status.textContent = `${data.label}: ${data.rows.map((r) => `${r.name} ${r.value}`).join(', ')}${data.total ? `, total ${data.total}` : ''}`;
}

function buildTip(st, data) {
  const tip = st.tip;
  tip.replaceChildren();
  html('div', 'fd-chart-tooltip-title', data.label, tip);
  const shape = st.layout.isBar ? 'square' : 'line';
  for (const r of data.rows) {
    const row = html('div', 'fd-chart-tooltip-row', null, tip);
    const sw = html('span', 'fd-chart-tooltip-swatch', null, row);
    sw.dataset.shape = shape;
    sw.dataset.s = r.slot;
    if (r.tone) sw.dataset.tone = r.tone;
    html('span', 'fd-chart-tooltip-value', r.value, row);
    html('span', 'fd-chart-tooltip-name', r.name, row);
  }
  if (data.total) {
    const row = html('div', 'fd-chart-tooltip-row', null, tip);
    row.dataset.total = '';
    html('span', 'fd-chart-tooltip-swatch', null, row).style.visibility = 'hidden';
    html('span', 'fd-chart-tooltip-value', data.total, row);
    html('span', 'fd-chart-tooltip-name', 'Total', row);
  }
}

function placeTip(st, x) {
  const tip = st.tip;
  const L = st.layout;
  const first = tip.dataset.state !== 'open';
  if (first) tip.dataset.snap = '';
  const W = st.w;
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const side = L.isBar ? L.band / 2 + 6 : 14;
  let tx = x + side;
  if (tx + tw > W - 4) tx = x - side - tw;
  tx = clamp(tx, 4, Math.max(4, W - tw - 4));
  const ty = clamp(L.top, 0, Math.max(0, st.config.height - th));
  tip.style.translate = `${Math.round(tx)}px ${Math.round(ty)}px`;
  if (first) {
    void tip.offsetWidth; // commit the snap before the tooltip fades in
    tip.dataset.state = 'open';
    requestAnimationFrame(() => tip.removeAttribute('data-snap'));
  }
}

function hideTip(st, immediate = false) {
  st.active = -1;
  if (immediate) st.tip.dataset.snap = '';
  st.tip.dataset.state = 'closed';
  if (immediate) requestAnimationFrame(() => st.tip.removeAttribute('data-snap'));
  if (st.cursor) { st.cursor.g.setAttribute('hidden', ''); st.cursor.band?.setAttribute('hidden', ''); }
}

function bindPlot(el, st) {
  const plot = st.plot;
  const move = (event) => {
    if (!st.layout) return;
    clearTimeout(st.touchTimer);
    setActive(el, st, indexAt(st, event.clientX));
  };
  plot.addEventListener('pointerenter', move);
  plot.addEventListener('pointermove', move);
  plot.addEventListener('pointerdown', move);
  plot.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch') { st.touchTimer = setTimeout(() => hideTip(st), 1400); return; }
    hideTip(st);
  });
  plot.addEventListener('pointercancel', () => hideTip(st));
  plot.addEventListener('click', () => {
    if (!st.layout || st.active < 0) return;
    const data = pointData(st, st.active);
    emit(el, 'fd:select', { index: st.active, label: data.label, values: data.rows.map((r) => ({ name: r.name, value: r.raw })) });
  });
  plot.addEventListener('keydown', (event) => {
    const L = st.layout;
    if (!L) return;
    const at = st.active < 0 ? L.n - 1 : st.active;
    let next = null;
    if (event.key === 'ArrowLeft') next = st.active < 0 ? L.n - 1 : at - 1;
    else if (event.key === 'ArrowRight') next = st.active < 0 ? L.n - 1 : at + 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = L.n - 1;
    else if (event.key === 'Escape') { hideTip(st); st.status.textContent = ''; return; }
    else if (event.key === 'Enter' || event.key === ' ') {
      if (st.active >= 0) { event.preventDefault(); plot.click(); }
      return;
    }
    if (next == null) return;
    event.preventDefault();
    setActive(el, st, next, { announce: true });
  });
  plot.addEventListener('focus', () => {
    if (st.layout && plot.matches(':focus-visible') && st.active < 0) setActive(el, st, st.layout.n - 1, { announce: true });
  });
  plot.addEventListener('blur', () => hideTip(st));
}

/* ==========================================================================
   Sparkline
   <span class="fd-sparkline" data-values="3,5,4,8" [data-type="bars"] [data-area] [data-dot] [data-tone] [data-invert]
         [data-width="80"] [data-height="24"] [data-fluid] [data-label="..."]></span>
   No data-tone: colour follows the trend (up = success, down = danger; data-invert flips it for "lower is better").
   ========================================================================== */
export function sparkline(el) {
  const values = (el.dataset.values || '').split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite);
  const fluid = el.hasAttribute('data-fluid');
  // Size comes from data-width/data-height when given, otherwise from the laid-out box (CSS default 80 x 24).
  const w = Number(el.dataset.width) || Math.round(el.clientWidth) || 80;
  const h = Number(el.dataset.height) || Math.round(el.clientHeight) || 24;
  if (el.dataset.width && !fluid) el.style.setProperty('--_ch-w', `${w}px`);
  if (el.dataset.height) el.style.setProperty('--_ch-h', `${h}px`);
  el.replaceChildren();
  if (!values.length) { el.removeAttribute('role'); return; }
  const first = values[0];
  const last = values[values.length - 1];
  const dir = last > first ? 1 : last < first ? -1 : 0;
  el.dataset.trend = dir === 0 ? 'flat' : (dir > 0) === !el.hasAttribute('data-invert') ? 'good' : 'bad';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', el.dataset.label || `Trend from ${fmtNum(first, 2)} to ${fmtNum(last, 2)} over ${values.length} points`);

  const root = svg('svg', { class: 'fd-sparkline-svg', viewBox: `0 0 ${w} ${h}`, 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'none' }, el);
  const pad = 2.5;
  const min = el.dataset.type === 'bars' ? 0 : Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (el.dataset.type === 'bars') {
    const n = values.length;
    const gap = n > 1 ? (w / n > 5 ? 2 : 1) : 0;
    const bw = Math.max(1, Math.floor((w - gap * (n - 1)) / n));
    const used = bw * n + gap * (n - 1);
    const x0 = Math.floor((w - used) / 2);
    values.forEach((v, i) => {
      const bh = span > 0 ? Math.max(2, Math.round(((v - min) / span) * (h - 1))) : Math.round(h / 2);
      const x = x0 + i * (bw + gap);
      const y = h - bh;
      const r = Math.min(1, bw / 2, bh);
      svg('path', { class: 'fd-sparkline-bar', 'data-last': i === n - 1 ? '' : null, d: r < 0.5 ? `M${x} ${y}h${bw}v${bh}h${-bw}Z` : `M${x} ${h}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}H${x + bw - r}A${r} ${r} 0 0 1 ${x + bw} ${y + r}V${h}Z` }, root);
    });
    return;
  }
  const xAt = (i) => (values.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (values.length - 1));
  const yAt = (v) => (span > 0 ? pad + (1 - (v - min) / span) * (h - pad * 2) : h / 2);
  const pts = values.map((v, i) => [r2(xAt(i)), r2(yAt(v))]);
  if (pts.length > 1) {
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
    if (el.hasAttribute('data-area')) {
      const gid = uid('fd-spark');
      const grad = svg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, svg('defs', null, root));
      svg('stop', { class: 'fd-sparkline-stop', offset: 0, 'stop-opacity': 0.12 }, grad);
      svg('stop', { class: 'fd-sparkline-stop', offset: 1, 'stop-opacity': 0 }, grad);
      svg('path', { d: `M${pts[0][0]} ${h}${d.replace('M', 'L')}L${pts[pts.length - 1][0]} ${h}Z`, fill: `url(#${gid})` }, root);
    }
    svg('path', { class: 'fd-sparkline-line', d }, root);
  }
  if (el.hasAttribute('data-dot') || pts.length === 1) {
    const [x, y] = pts[pts.length - 1];
    svg('circle', { class: 'fd-sparkline-dot', cx: x, cy: y, r: 2 }, root);
  }
}

function initSparkline(el) {
  if (!once(el, 'spark')) return;
  sparkline(el);
  if (el.hasAttribute('data-fluid') && typeof ResizeObserver === 'function') {
    let w = 0;
    new ResizeObserver(() => {
      const next = Math.round(el.clientWidth);
      if (next && next !== w) { w = next; sparkline(el); }
    }).observe(el);
  }
}

/* ==========================================================================
   Donut
   <div class="fd-donut" data-size="144" data-thickness="8">
     <script type="application/json">{ "segments": [{ "label": "/scrape", "value": 4210, "tone"?: "info" }],
        "figure"?: "12,480", "caption"?: "Credits", "format"?: "compact", "legend"?: true }</script>
   </div>
   Progress ring: <div class="fd-donut" data-type="progress" data-value="72" data-max="100" data-label="Success rate" data-size="96"></div>
   ========================================================================== */
export function donut(el) {
  const progress = el.dataset.type === 'progress';
  const cfg = progress ? {} : readJSON(el);
  const size = Number(el.dataset.size) || (progress ? 96 : 144);
  const t = Number(el.dataset.thickness) || (size < 100 ? 6 : 8);
  el.style.setProperty('--_ch-size', `${size}px`);
  el.style.setProperty('--_ch-t', `${t}px`);
  el.toggleAttribute('data-compact', size < 72);
  const format = cfg.format || el.dataset.format || 'number';
  let segments;
  if (progress) {
    const max = Number(el.dataset.max) || 100;
    const value = clamp(Number(el.dataset.value) || 0, 0, max);
    segments = [{ label: el.dataset.label || '', value, tone: el.dataset.tone || null }];
    cfg.total = max;
    cfg.figure = cfg.figure ?? `${Math.round((value / max) * 100)}%`;
    cfg.caption = el.dataset.label || '';
  } else {
    segments = (cfg.segments || []).slice(0, 6).map((s) => ({ label: s.label ?? '', value: Math.max(0, Number(s.value) || 0), tone: s.tone || null }));
  }
  const sum = segments.reduce((a, s) => a + s.value, 0);
  const total = progress ? cfg.total : sum;
  const radius = (size - t) / 2;
  const circ = 2 * Math.PI * radius;
  const mid = size / 2;

  settleEnter(el);
  clearDrawn(el);
  const ring = html('div', 'fd-donut-ring', null, el);
  ring.setAttribute('role', 'img');
  const summary = progress ? `${cfg.figure}${cfg.caption ? ` ${cfg.caption}` : ''}` : `${segments.map((s) => `${s.label} ${formatValue(s.value, format, true)}`).join(', ') || 'No data'}`;
  ring.setAttribute('aria-label', el.dataset.ariaLabel || `Donut chart: ${summary}`);
  const root = svg('svg', { class: 'fd-donut-svg', viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true', focusable: 'false' }, ring);
  svg('circle', { class: 'fd-donut-track', cx: mid, cy: mid, r: radius }, root);
  const center = html('div', 'fd-donut-center', null, ring);
  const figure = html('span', 'fd-donut-figure', cfg.figure ?? formatValue(sum, format, true), center);
  const caption = html('span', 'fd-donut-caption', cfg.caption ?? 'Total', center);
  const base = { figure: figure.textContent, caption: caption.textContent };

  const drawn = segments.filter((s) => s.value > 0 && total > 0);
  const gap = drawn.length > 1 ? clamp(t * 0.4, 2.5, 5) : 0;
  let acc = 0;
  const segNodes = [];
  segments.forEach((s, i) => {
    if (!(s.value > 0 && total > 0)) { segNodes.push(null); return; }
    const len = (s.value / total) * circ;
    // Progress arcs have round caps, which add half the thickness at each end.
    const dash = progress ? Math.max(0.01, len - t) : Math.max(0.5, len - gap);
    const startAt = progress ? t / 2 : acc + gap / 2;
    const node = svg('circle', {
      class: 'fd-donut-seg', 'data-s': slot(i), 'data-tone': s.tone, cx: mid, cy: mid, r: radius,
      'stroke-dasharray': `${r2(dash)} ${r2(circ)}`, 'stroke-dashoffset': r2(-startAt),
      transform: `rotate(-90 ${mid} ${mid})`, style: `--_ch-i:${i};--_ch-circ:${r2(circ)}px`,
    }, root);
    segNodes.push(node);
    acc += len;
  });

  const items = [];
  if (!progress && cfg.legend !== false && el.dataset.legend !== 'false') {
    const list = html('ul', 'fd-donut-legend', null, el);
    segments.forEach((s, i) => {
      const li = html('li', 'fd-donut-legend-item', null, list);
      li.dataset.s = slot(i);
      if (s.tone) li.dataset.tone = s.tone;
      html('span', 'fd-donut-legend-swatch', null, li);
      html('span', 'fd-donut-legend-label', s.label, li);
      html('span', 'fd-donut-legend-value', formatValue(s.value, format, true), li);
      html('span', 'fd-donut-legend-share', sum > 0 ? `${fmtNum((s.value / sum) * 100, 1)}%` : '0%', li);
      items.push(li);
    });
  }

  const activate = (i) => {
    if (i == null || i < 0) {
      el.removeAttribute('data-active');
      for (const n of [...segNodes, ...items]) n?.removeAttribute('data-active');
      figure.textContent = base.figure;
      caption.textContent = base.caption;
      return;
    }
    el.dataset.active = i;
    segNodes.forEach((n, k) => n && (k === i ? n.setAttribute('data-active', '') : n.removeAttribute('data-active')));
    items.forEach((n, k) => (k === i ? n.setAttribute('data-active', '') : n.removeAttribute('data-active')));
    figure.textContent = formatValue(segments[i].value, format, true);
    caption.textContent = segments[i].label;
  };
  if (!progress) {
    segNodes.forEach((n, i) => { if (n) { n.addEventListener('pointerenter', () => activate(i)); n.addEventListener('pointerleave', () => activate(-1)); } });
    items.forEach((n, i) => { n.addEventListener('pointerenter', () => activate(i)); n.addEventListener('pointerleave', () => activate(-1)); });
  }
  armEnter(el);
}

function initDonut(el) {
  if (!once(el, 'donut')) return;
  donut(el);
}

/* ==========================================================================
   Heat grid
   <div class="fd-heatgrid" data-size="sm|md|lg">
     <script type="application/json">{ "start": "2026-06-29", "values": [0, 12, ...], "unit": "requests", "summary"?: "..." }</script>
   </div>
   One value per day, starting on `start` (any weekday). Columns are weeks, rows Monday to Sunday.
   ← → move by week, ↑ ↓ by day while the grid is focused.

   Strip: one row of days, each in a tone, with no axis (an outcome per day, not an amount):
   <div class="fd-heatgrid" data-variant="strip" data-size="sm|md">
     <script type="application/json">{ "start": "2026-10-18", "tones": ["success", "danger", null, ...],
       "legend": { "success": "No problem found", "danger": "Problem found" }, "none"?: "Not run",
       "hrefs"?: ["/results/2026-10-18", ...], "titles"?: ["Round 41", ...], "label"?: "...", "summary"?: "..." }</script>
   </div>
   A tone per point (neutral|muted|accent|success|warning|danger|info|violet; null = nothing that day), named by
   `legend`. The foot shows the legend and `summary` when either is given (not at data-size="sm", for a table cell). ← → Home End walk the days; the tooltip
   names the day and its legend entry only. A point with an href is a link: click it, or press Enter while it is
   active. Click and Enter fire fd:select { index, label, tone, name, href }. The aria-label counts each tone.
   ========================================================================== */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const utc = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
const dayLabel = (ms) => { const d = new Date(ms); return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}, ${d.getUTCFullYear()}`; };

const STRIP_TONES = ['neutral', 'muted', 'accent', 'success', 'warning', 'danger', 'info', 'violet'];

function heatstrip(el, cfg) {
  const tones = (cfg.tones || []).map((t) => (STRIP_TONES.includes(t) ? t : null));
  const n = tones.length;
  const legend = cfg.legend && typeof cfg.legend === 'object' ? cfg.legend : {};
  const hrefs = Array.isArray(cfg.hrefs) ? cfg.hrefs : [];
  const DAY = 86400000;
  const start = cfg.start ? utc(cfg.start) : null;
  const title = (i) => cfg.titles?.[i] ?? (start != null ? dayLabel(start + i * DAY) : `Point ${i + 1}`);
  const name = (t) => (t ? legend[t] ?? t : cfg.none ?? 'No data');

  settleEnter(el);
  clearDrawn(el);
  el.style.setProperty('--_ch-points', n);
  const grid = html('div', 'fd-heatgrid-grid', null, el);
  grid.setAttribute('role', 'img');
  grid.setAttribute('tabindex', '0');
  const order = [...Object.keys(legend).filter((t) => STRIP_TONES.includes(t)), ...STRIP_TONES.filter((t) => !(t in legend)), null];
  const counts = order.map((t) => [t, tones.filter((x) => x === t).length]).filter(([, c]) => c);
  const span = start != null && n ? ` from ${dayLabel(start)} to ${dayLabel(start + (n - 1) * DAY)}` : '';
  const noun = start != null ? (n === 1 ? 'day' : 'days') : (n === 1 ? 'point' : 'points');
  grid.setAttribute('aria-label', cfg.label || el.dataset.label || `${n} ${noun}${span}. ${counts.map(([t, c]) => `${name(t)}: ${c}`).join(', ')}`);

  const cells = tones.map((t, i) => {
    const cell = html(hrefs[i] ? 'a' : 'span', 'fd-heatgrid-cell', null, grid);
    if (hrefs[i]) { cell.href = hrefs[i]; cell.tabIndex = -1; }
    cell.dataset.k = i;
    if (t) cell.dataset.tone = t; else cell.dataset.none = '';
    cell.style.setProperty('--_ch-wk', i);
    return cell;
  });

  const keys = Object.keys(legend).filter((t) => STRIP_TONES.includes(t));
  if ((keys.length || cfg.summary) && el.dataset.size !== 'sm') {
    const foot = html('div', 'fd-heatgrid-foot', null, el);
    if (cfg.summary) html('span', 'fd-heatgrid-summary', cfg.summary, foot);
    if (keys.length) {
      const box = html('div', 'fd-legend', null, foot);
      for (const t of keys) {
        const item = html('span', 'fd-legend-item', null, box);
        item.dataset.tone = t;
        html('span', 'fd-legend-swatch', null, item).dataset.shape = 'square';
        html('span', '', legend[t], item);
      }
    }
  }

  const tip = html('div', 'fd-chart-tooltip', null, el);
  tip.setAttribute('aria-hidden', 'true');
  const status = html('div', 'fd-sr-only', null, el);
  status.setAttribute('aria-live', 'polite');
  // A table ignores the 1px box of fd-sr-only, so it sits in a wrapper that does not.
  const table = html('table', '', null, html('div', 'fd-sr-only', null, el));
  html('caption', '', cfg.label || el.dataset.label || 'Each day', table);
  const head = html('tr', '', null, html('thead', '', null, table));
  html('th', '', start != null ? 'Date' : 'Point', head).scope = 'col';
  html('th', '', 'Result', head).scope = 'col';
  const body = html('tbody', '', null, table);
  tones.forEach((t, i) => { const row = html('tr', '', null, body); html('th', '', title(i), row).scope = 'row'; html('td', '', name(t), row); });

  let active = -1;
  const detail = (i) => ({ index: i, label: title(i), tone: tones[i], name: name(tones[i]), href: hrefs[i] || null });
  const show = (i, announce = false) => {
    const cell = cells[i];
    if (!cell) return;
    cells.forEach((c) => c.removeAttribute('data-active'));
    cell.setAttribute('data-active', '');
    active = i;
    const first = tip.dataset.state !== 'open';
    tip.replaceChildren();
    html('div', 'fd-chart-tooltip-title', title(i), tip);
    const row = html('div', 'fd-chart-tooltip-row', null, tip);
    if (tones[i]) { const sw = html('span', 'fd-chart-tooltip-swatch', null, row); sw.dataset.shape = 'square'; sw.dataset.tone = tones[i]; }
    html('span', 'fd-chart-tooltip-value', name(tones[i]), row);
    if (first) tip.dataset.snap = '';
    const host = el.getBoundingClientRect();
    const box = cell.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const tx = clamp(box.left - host.left + box.width / 2 - tw / 2, 0, Math.max(0, host.width - tw));
    // Above the day unless that leaves the viewport: a strip in a table cell has no room below its row.
    const ty = box.top - th - 8 >= 0 ? box.top - host.top - th - 8 : box.top - host.top + box.height + 8;
    tip.style.translate = `${Math.round(tx)}px ${Math.round(ty)}px`;
    if (first) { void tip.offsetWidth; tip.dataset.state = 'open'; requestAnimationFrame(() => tip.removeAttribute('data-snap')); }
    if (announce) status.textContent = `${title(i)}: ${name(tones[i])}${hrefs[i] ? '. Press Enter to open.' : ''}`;
    emit(el, 'fd:hover', detail(i));
  };
  const hide = () => {
    tip.dataset.state = 'closed';
    cells.forEach((c) => c.removeAttribute('data-active'));
    active = -1;
  };
  grid.addEventListener('pointerover', (event) => {
    const cell = event.target.closest?.('.fd-heatgrid-cell[data-k]');
    if (cell) show(Number(cell.dataset.k));
  });
  grid.addEventListener('pointerleave', hide);
  grid.addEventListener('blur', hide);
  grid.addEventListener('focus', () => { if (grid.matches(':focus-visible') && n && active < 0) show(n - 1, true); });
  grid.addEventListener('click', (event) => {
    const cell = event.target.closest?.('.fd-heatgrid-cell[data-k]');
    if (cell) emit(el, 'fd:select', detail(Number(cell.dataset.k)));
  });
  grid.addEventListener('keydown', (event) => {
    if (!n) return;
    let next = null;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const rtl = getComputedStyle(grid).direction === 'rtl';
      const step = (event.key === 'ArrowRight') !== rtl ? 1 : -1;
      next = clamp(active < 0 ? n - 1 : active + step, 0, n - 1);
    } else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = n - 1;
    else if (event.key === 'Escape') { hide(); return; }
    else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      if (hrefs[active]) cells[active].click(); else emit(el, 'fd:select', detail(active));
      return;
    }
    if (next == null) return;
    event.preventDefault();
    show(next, true);
  });
  armEnter(el);
}

export function heatgrid(el) {
  const cfg = readJSON(el);
  if (el.dataset.variant === 'strip') { heatstrip(el, cfg); return; }
  const values = (cfg.values || []).map((v) => Math.max(0, Number(v) || 0));
  const unit = cfg.unit || 'events';
  const start = cfg.start ? utc(cfg.start) : Date.UTC(2026, 0, 5);
  const dow = (new Date(start).getUTCDay() + 6) % 7; // Monday = 0
  const weeks = Math.max(1, Math.ceil((dow + values.length) / 7));
  const DAY = 86400000;

  settleEnter(el);
  clearDrawn(el);
  el.style.setProperty('--_ch-weeks', weeks);
  const scroll = html('div', 'fd-heatgrid-scroll', null, el);
  const grid = html('div', 'fd-heatgrid-grid', null, scroll);
  grid.setAttribute('role', 'img');
  grid.setAttribute('tabindex', '0');
  const total = values.reduce((a, b) => a + b, 0);
  const lastMs = start + (values.length - 1) * DAY;
  grid.setAttribute('aria-label', cfg.label || el.dataset.label || `Activity, ${weeks} weeks, ${fmtNum(total, 0)} ${unit} from ${dayLabel(start)} to ${dayLabel(lastMs)}`);
  grid.style.setProperty('--_ch-weeks', weeks);

  // Levels from the quartiles of the non-zero days, so one spike does not wash everything else out.
  const nz = values.filter((v) => v > 0).sort((a, b) => a - b);
  const q = (p) => (nz.length ? nz[Math.min(nz.length - 1, Math.floor(p * (nz.length - 1) + 0.5))] : 0);
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  const level = (v) => (v <= 0 ? 0 : v <= q1 ? 1 : v <= q2 ? 2 : v <= q3 ? 3 : 4);

  // Month labels: the week whose Monday starts a new month, at least three columns apart, never in the last two.
  const months = [];
  for (let w = 0; w < weeks; w++) {
    const monday = start - dow * DAY + w * 7 * DAY;
    const m = new Date(monday).getUTCMonth();
    if (!months.length || months[months.length - 1].m !== m) months.push({ w, m });
  }
  if (months.length > 1 && months[1].w - months[0].w < 3) months.shift();
  for (const { w, m } of months) {
    if (w > weeks - 3) continue;
    const label = html('span', 'fd-heatgrid-month', MONTHS[m], grid);
    label.style.setProperty('--_ch-wk', w);
  }
  [0, 2, 4].forEach((d) => { const l = html('span', 'fd-heatgrid-day', DAYS[d], grid); l.style.setProperty('--_ch-dy', d); });

  const cells = [];
  const slots = weeks * 7;
  for (let k = 0; k < slots; k++) {
    const idx = k - dow;
    const w = Math.floor(k / 7);
    const d = k % 7;
    const cell = html('span', 'fd-heatgrid-cell', null, grid);
    cell.style.setProperty('--_ch-wk', w);
    cell.style.setProperty('--_ch-dy', d);
    if (idx < 0 || idx >= values.length) { cell.dataset.empty = ''; cells.push(null); continue; }
    cell.dataset.l = level(values[idx]);
    cell.dataset.k = idx;
    cells.push(cell);
  }

  const foot = html('div', 'fd-heatgrid-foot', null, el);
  html('span', 'fd-heatgrid-summary', cfg.summary ?? `${fmtNum(total, 0)} ${unit} in ${weeks} weeks`, foot);
  const legend = html('span', 'fd-heatgrid-legend', null, foot);
  legend.setAttribute('aria-hidden', 'true');
  html('span', '', 'Less', legend);
  for (let l = 0; l <= 4; l++) html('span', 'fd-heatgrid-swatch', null, legend).dataset.l = l;
  html('span', '', 'More', legend);

  const tip = html('div', 'fd-chart-tooltip', null, el);
  tip.setAttribute('aria-hidden', 'true');
  const status = html('div', 'fd-sr-only', null, el);
  status.setAttribute('aria-live', 'polite');
  const table = html('table', 'fd-sr-only', null, el);
  html('caption', '', `Daily ${unit}`, table);
  const head = html('tr', '', null, html('thead', '', null, table));
  html('th', '', 'Date', head).scope = 'col';
  html('th', '', unit, head).scope = 'col';
  const body = html('tbody', '', null, table);
  values.forEach((v, i) => { const row = html('tr', '', null, body); html('th', '', dayLabel(start + i * DAY), row).scope = 'row'; html('td', '', fmtNum(v, 0), row); });

  let active = -1;
  const show = (idx, announce = false) => {
    const cell = cells[idx + dow];
    if (!cell) return;
    cells.forEach((c) => c && c.removeAttribute('data-active'));
    cell.setAttribute('data-active', '');
    active = idx;
    const first = tip.dataset.state !== 'open';
    tip.replaceChildren();
    html('div', 'fd-chart-tooltip-title', dayLabel(start + idx * DAY), tip);
    const row = html('div', 'fd-chart-tooltip-row', null, tip);
    html('span', 'fd-chart-tooltip-value', fmtNum(values[idx], 0), row);
    html('span', 'fd-chart-tooltip-name', unit, row);
    if (first) tip.dataset.snap = '';
    const host = el.getBoundingClientRect();
    const box = cell.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let tx = box.left - host.left + box.width / 2 - tw / 2;
    tx = clamp(tx, 0, Math.max(0, host.width - tw));
    let ty = box.top - host.top - th - 8;
    if (ty < -4 && box.top - host.top + box.height + 8 + th <= host.height + 40) ty = box.top - host.top + box.height + 8;
    tip.style.translate = `${Math.round(tx)}px ${Math.round(ty)}px`;
    if (first) { void tip.offsetWidth; tip.dataset.state = 'open'; requestAnimationFrame(() => tip.removeAttribute('data-snap')); }
    if (announce) status.textContent = `${dayLabel(start + idx * DAY)}: ${fmtNum(values[idx], 0)} ${unit}`;
    emit(el, 'fd:hover', { index: idx, date: dayLabel(start + idx * DAY), value: values[idx] });
  };
  const hide = () => {
    tip.dataset.state = 'closed';
    cells.forEach((c) => c && c.removeAttribute('data-active'));
    active = -1;
  };
  grid.addEventListener('pointerover', (event) => {
    const cell = event.target.closest?.('.fd-heatgrid-cell[data-k]');
    if (cell) show(Number(cell.dataset.k));
  });
  grid.addEventListener('pointerleave', hide);
  grid.addEventListener('blur', hide);
  grid.addEventListener('focus', () => { if (grid.matches(':focus-visible') && values.length && active < 0) show(values.length - 1, true); });
  scroll.addEventListener('scroll', hide, { passive: true });
  grid.addEventListener('keydown', (event) => {
    if (!values.length) return;
    const step = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[event.key];
    let next = null;
    if (step != null) next = clamp((active < 0 ? values.length - 1 : active + step), 0, values.length - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = values.length - 1;
    else if (event.key === 'Escape') { hide(); return; }
    if (next == null) return;
    event.preventDefault();
    show(next, true);
  });
  armEnter(el);
}

function initHeatgrid(el) {
  if (!once(el, 'heat')) return;
  heatgrid(el);
}

/* ==========================================================================
   Quadrant (documented in the header)
   ========================================================================== */
const quadStates = new WeakMap();
const CORNERS = [['topLeft', 'tl'], ['topRight', 'tr'], ['bottomLeft', 'bl'], ['bottomRight', 'br']];

function quadAxis(raw, values, fallbackLabel) {
  const a = raw && typeof raw === 'object' ? raw : {};
  const nums = values.filter((v) => v != null);
  let min = finite(a.min);
  let max = finite(a.max);
  if (min == null) min = nums.length ? Math.min(...nums) : 0;
  if (max == null) max = nums.length ? Math.max(...nums) : 1;
  if (!(max > min)) max = min + 1;
  const mid = clamp(finite(a.mid) ?? (min + max) / 2, min, max);
  return { label: a.label ?? fallbackLabel, min, max, mid, format: a.format || 'number' };
}

function quadNormalize(config) {
  const cfg = { ...config };
  const points = (Array.isArray(cfg.points) ? cfg.points : [])
    .map((p) => ({ name: String(p?.name ?? ''), x: finite(p?.x), y: finite(p?.y), size: finite(p?.size), tone: p?.tone || null, href: p?.href || null }))
    .filter((p) => p.x != null && p.y != null);
  cfg.points = points;
  cfg.x = quadAxis(cfg.x, points.map((p) => p.x), 'X');
  cfg.y = quadAxis(cfg.y, points.map((p) => p.y), 'Y');
  const corners = {};
  for (const [key, short] of CORNERS) {
    const c = cfg.corners?.[key];
    corners[short] = typeof c === 'string' ? { label: c, tone: null } : { label: c?.label ?? '', tone: c?.tone || null };
  }
  cfg.corners = corners;
  cfg.size = cfg.size && typeof cfg.size === 'object' ? { label: cfg.size.label ?? 'Size', format: cfg.size.format || 'number' } : null;
  return cfg;
}

const quadFrac = (v, axis) => clamp((v - axis.min) / (axis.max - axis.min), 0, 1);
const pct = (f) => `${r2(f * 100)}%`;
function quadCorner(cfg, p) {
  return `${p.y >= cfg.y.mid ? 't' : 'b'}${p.x >= cfg.x.mid ? 'r' : 'l'}`;
}
function quadReadout(cfg, p) {
  const rows = [
    [cfg.x.label, formatValue(p.x, cfg.x.format, true)],
    [cfg.y.label, formatValue(p.y, cfg.y.format, true)],
  ];
  if (cfg.size && p.size != null) rows.push([cfg.size.label, formatValue(p.size, cfg.size.format, true)]);
  return rows;
}

/** Draw (or redraw) a quadrant chart from `config`, or from the element's JSON when none is given. */
export function quadrant(el, config) {
  el.classList.add('fd-chart');
  el.dataset.fdChart = 'quadrant';
  const raw = { ...(config ?? readJSON(el)) };
  if (!raw.state && !quadStates.has(el) && ['loading', 'empty'].includes(el.dataset.state)) raw.state = el.dataset.state;
  const cfg = quadNormalize(raw);
  cfg.height = clamp(Number(raw.height ?? el.dataset.height) || 360, 160, 900);
  cfg.labels = (raw.labels ?? el.dataset.labels) !== 'none' && raw.labels !== false;
  clearDrawn(el);
  const state = raw.state === 'loading' ? 'loading' : raw.state === 'empty' || !cfg.points.length ? 'empty' : 'ready';
  el.dataset.state = state;
  if (state === 'loading') el.setAttribute('aria-busy', 'true'); else el.removeAttribute('aria-busy');
  const label = raw.label || el.dataset.label || `Quadrant chart of ${cfg.points.length} points by ${cfg.x.label} and ${cfg.y.label}`;
  setStyle(el, `--_q-h:${cfg.height}px`);

  if (state !== 'ready') {
    const box = html('div', 'fd-chart-empty', null, el);
    if (state === 'loading') {
      box.className = 'fd-chart-loading';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-label', 'Loading chart');
      const grid = html('div', 'fd-chart-skel-grid', null, box);
      for (let k = 0; k < 4; k++) html('i', '', null, grid);
    } else {
      html('p', 'fd-chart-empty-title', raw.empty?.title || 'Nothing to place yet', box);
      html('p', 'fd-chart-empty-text', raw.empty?.description || 'Points appear here once there is data for both axes.', box);
    }
    setStyle(box, `height:${cfg.height}px`);
    quadStates.set(el, { cfg, raw });
    return el;
  }

  const frame = html('div', 'fd-quadrant-frame', null, el);
  frame.setAttribute('role', 'group');
  frame.setAttribute('aria-label', label);

  /* axes: min, mid and max ticks along each, and the title */
  const yAxis = html('div', 'fd-quadrant-axis', null, frame);
  yAxis.dataset.axis = 'y';
  yAxis.setAttribute('aria-hidden', 'true');
  const xAxis = html('div', 'fd-quadrant-axis', null, frame);
  xAxis.dataset.axis = 'x';
  xAxis.setAttribute('aria-hidden', 'true');
  for (const [axis, host, name] of [[cfg.x, xAxis, 'x'], [cfg.y, yAxis, 'y']]) {
    for (const [at, value] of [['min', axis.min], ['mid', axis.mid], ['max', axis.max]]) {
      const f = name === 'x' ? quadFrac(value, axis) : 1 - quadFrac(value, axis);
      if (at === 'mid' && (f < 0.16 || f > 0.84)) continue; // too close to an end tick to read
      const tick = html('span', 'fd-quadrant-tick', formatValue(value, axis.format), host);
      tick.dataset.at = at;
      setStyle(tick, `--_q-at:${r2(f)}`);
    }
    html('span', 'fd-quadrant-axis-title', axis.label, host);
  }

  const plot = html('div', 'fd-quadrant-plot', null, frame);
  setStyle(plot, `--_q-mx:${r2(quadFrac(cfg.x.mid, cfg.x))};--_q-my:${r2(1 - quadFrac(cfg.y.mid, cfg.y))}`);
  for (const [, short] of CORNERS) {
    const c = cfg.corners[short];
    const cell = html('div', 'fd-quadrant-cell', null, plot);
    cell.dataset.corner = short;
    cell.setAttribute('aria-hidden', 'true');
    if (c.tone) cell.dataset.tone = c.tone;
    if (c.label) html('span', 'fd-quadrant-corner', c.label, cell);
  }

  const sizes = cfg.points.map((p) => p.size).filter((v) => v != null);
  const maxSize = sizes.length ? Math.max(...sizes) : 0;
  const nodes = cfg.points.map((p, index) => {
    const node = html(p.href ? 'a' : 'button', 'fd-quadrant-point', null, plot);
    if (p.href) node.href = p.href; else node.type = 'button';
    if (p.tone) node.dataset.tone = p.tone;
    const fx = quadFrac(p.x, cfg.x);
    const fy = 1 - quadFrac(p.y, cfg.y);
    if (fx > 0.7) node.dataset.side = 'start';
    if (fy < 0.08) node.dataset.edge = 'top';
    const s = p.size != null && maxSize > 0 ? Math.sqrt(Math.max(0, p.size) / maxSize) : 0.3;
    setStyle(node, `--_q-x:${r2(fx)};--_q-y:${r2(fy)};--_q-s:${r2(s)};--_q-z:${Math.round((1 - s) * 10)}`);
    node.dataset.corner = quadCorner(cfg, p);
    html('span', 'fd-quadrant-dot', null, node);
    if (cfg.labels) html('span', 'fd-quadrant-name', p.name, node);
    const readout = quadReadout(cfg, p).map(([k, v]) => `${k} ${v}`).join(', ');
    node.setAttribute('aria-label', `${p.name}: ${readout}`);
    return node;
  });

  /* the phone fallback: a list grouped by corner */
  const list = html('div', 'fd-quadrant-list', null, el);
  html('p', 'fd-quadrant-key', [cfg.x.label, cfg.y.label, cfg.size?.label].filter(Boolean).join(' · '), list);
  for (const [, short] of CORNERS) {
    const members = cfg.points.map((p, i) => [p, i]).filter(([p]) => quadCorner(cfg, p) === short);
    if (!members.length) continue;
    const group = html('section', 'fd-quadrant-group', null, list);
    group.dataset.corner = short;
    const c = cfg.corners[short];
    if (c.tone) group.dataset.tone = c.tone;
    const head = html('h4', 'fd-quadrant-group-label', c.label || 'Points', group);
    html('span', 'fd-quadrant-group-count', String(members.length), head);
    const ul = html('ul', 'fd-quadrant-rows', null, group);
    for (const [p, i] of members) {
      const li = html('li', '', null, ul);
      const row = html(p.href ? 'a' : 'div', 'fd-quadrant-row', null, li);
      if (p.href) row.href = p.href;
      if (p.tone) row.dataset.tone = p.tone;
      html('span', 'fd-quadrant-row-name', p.name, row);
      html('span', 'fd-quadrant-row-values', quadReadout(cfg, p).map(([, v]) => v).join(' · '), row);
      row.dataset.index = i;
    }
    group.setAttribute('aria-label', c.label || 'Points');
  }

  /* tooltip and keyboard */
  const tip = html('div', 'fd-chart-tooltip', null, el);
  tip.setAttribute('aria-hidden', 'true');
  let active = -1;
  const hide = () => {
    active = -1;
    tip.dataset.state = 'closed';
    nodes.forEach((n) => n.removeAttribute('data-active'));
  };
  const show = (i) => {
    const p = cfg.points[i];
    const node = nodes[i];
    if (!p || !node) return;
    const changed = i !== active;
    active = i;
    nodes.forEach((n, k) => n.toggleAttribute('data-active', k === i));
    tip.replaceChildren();
    html('div', 'fd-chart-tooltip-title', p.name, tip);
    for (const [k, v] of quadReadout(cfg, p)) {
      const row = html('div', 'fd-chart-tooltip-row', null, tip);
      html('span', 'fd-chart-tooltip-value', v, row);
      html('span', 'fd-chart-tooltip-name', k, row);
    }
    const box = el.getBoundingClientRect();
    const at = node.getBoundingClientRect();
    const cx = at.left - box.left + at.width / 2;
    const cy = at.top - box.top + at.height / 2;
    const first = tip.dataset.state !== 'open';
    if (first) tip.dataset.snap = '';
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let tx = cx + at.width / 2 + 6;
    if (tx + tw > box.width - 4) tx = cx - at.width / 2 - 6 - tw;
    tx = clamp(tx, 4, Math.max(4, box.width - tw - 4));
    const ty = clamp(cy - th / 2, 0, Math.max(0, box.height - th));
    tip.style.translate = `${Math.round(tx)}px ${Math.round(ty)}px`;
    if (first) {
      void tip.offsetWidth;
      tip.dataset.state = 'open';
      requestAnimationFrame(() => tip.removeAttribute('data-snap'));
    }
    if (changed) emit(el, 'fd:hover', { index: i, name: p.name, x: p.x, y: p.y });
  };
  const nearest = (from, dir) => {
    const a = nodes[from].getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best = -1;
    let bestScore = Infinity;
    nodes.forEach((n, k) => {
      if (k === from) return;
      const b = n.getBoundingClientRect();
      const dx = b.left + b.width / 2 - ax;
      const dy = b.top + b.height / 2 - ay;
      const along = dir === 'right' ? dx : dir === 'left' ? -dx : dir === 'down' ? dy : -dy;
      const across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      if (along <= 1) return;
      const score = along + across * 2;
      if (score < bestScore) { bestScore = score; best = k; }
    });
    return best;
  };
  const onOver = (event) => { const i = nodes.indexOf(event.target.closest?.('.fd-quadrant-point')); if (i >= 0) show(i); };
  const onOut = (event) => { const n = event.target.closest?.('.fd-quadrant-point'); if (n && n !== document.activeElement) hide(); };
  const onFocus = (event) => { const i = nodes.indexOf(event.target); if (i >= 0) show(i); };
  const onBlur = (event) => { if (nodes.includes(event.target) && !nodes.includes(event.relatedTarget)) hide(); };
  const KEYS = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' };
  const onKey = (event) => {
    const i = nodes.indexOf(event.target);
    if (i < 0) return;
    if (event.key === 'Escape') { hide(); return; }
    const dir = KEYS[event.key];
    if (!dir) return;
    const next = nearest(i, dir);
    event.preventDefault();
    if (next >= 0) nodes[next].focus();
  };
  const onClick = (event) => {
    const i = nodes.indexOf(event.target.closest?.('.fd-quadrant-point'));
    if (i < 0) return;
    const p = cfg.points[i];
    emit(el, 'fd:select', { index: i, name: p.name, x: p.x, y: p.y, href: p.href });
  };
  plot.addEventListener('pointerover', onOver);
  plot.addEventListener('pointerout', onOut);
  plot.addEventListener('focusin', onFocus);
  plot.addEventListener('focusout', onBlur);
  plot.addEventListener('keydown', onKey);
  plot.addEventListener('click', onClick);
  quadStates.set(el, { cfg, raw });
  return el;
}

function initQuadrant(el) {
  if (quadStates.has(el)) return;
  quadrant(el);
}

/* ==========================================================================
   Ranked bars (pure CSS; JS only arms the entrance when scrolled into view)
   <ul class="fd-bars">
     <li class="fd-bars-row" data-fd-vars="--value: 0.62"><span class="fd-bars-label">/scrape</span>
       <span class="fd-bars-track"><span class="fd-bars-fill"></span></span><span class="fd-bars-value">12,480</span></li>
   </ul>
   ========================================================================== */
function initBars(el) {
  if (!once(el, 'bars')) return;
  armEnter(el);
}

/* ---------- init ---------- */
function initChart(el) {
  if (!once(el, 'chart')) return;
  if (el.dataset.fdChart === 'quadrant') { initQuadrant(el); return; }
  const cfg = readJSON(el);
  if (!cfg.state && el.dataset.state && el.dataset.state !== 'ready') cfg.state = el.dataset.state;
  render(el, cfg);
}

let bound = false;
function bindGlobal() {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (event) => {
    const item = event.target instanceof Element ? event.target.closest('.fd-legend-item') : null;
    if (!item || (item.tagName !== 'BUTTON' && !item.hasAttribute('role'))) return;
    const box = item.closest('.fd-legend');
    if (!box) return;
    const host = box.dataset.for ? document.querySelector(box.dataset.for) : box.closest('.fd-chart');
    if (!host || !states.has(host)) {
      // A legend that is not wired to a chart still behaves like a toggle, so it can be shown on its own.
      if (item.tagName === 'BUTTON' && !box.dataset.for) item.setAttribute('aria-pressed', String(item.getAttribute('aria-pressed') === 'false'));
      return;
    }
    const items = [...box.querySelectorAll('.fd-legend-item')];
    const index = item.dataset.series != null ? Number(item.dataset.series) : items.indexOf(item);
    toggleSeries(host, index);
  });
  document.fonts?.addEventListener?.('loadingdone', relayoutForFonts);
  watchFonts();
}

/* Fonts change tick widths, so every drawn chart is laid out again each time fonts finish loading: not only the page's
   first fonts, because in a single-page app a chart is often drawn later, while the fonts its labels use are still
   loading. Both signals are used (`loadingdone`, and `ready` for the loads under way when a chart is drawn: engines
   differ in which arrives); a relayout runs only when more faces have loaded since the last one, so they never draw
   twice for the same fonts. */
let fontsLoaded = -1;
let fontsAwaited = null;
function relayoutForFonts() {
  let loaded = 0;
  document.fonts.forEach((face) => { if (face.status === 'loaded') loaded++; });
  if (loaded === fontsLoaded) return;
  fontsLoaded = loaded;
  for (const el of live) { const st = states.get(el); if (st && el.isConnected && st.config) draw(el, st); }
}
function watchFonts() {
  const ready = document.fonts?.ready;
  if (!ready || ready === fontsAwaited) return;
  fontsAwaited = ready;
  ready.then(relayoutForFonts);
}

export function init(root = document) {
  scan(root, '[data-fd-chart]').forEach(initChart);
  scan(root, '.fd-sparkline').forEach(initSparkline);
  scan(root, '.fd-donut').forEach(initDonut);
  scan(root, '.fd-heatgrid').forEach(initHeatgrid);
  scan(root, '.fd-bars').forEach(initBars);
  bindGlobal();
}
