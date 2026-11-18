/* The catalogue page for people: contract/index.json (the file `fire find` reads), filtered in the browser.
 * Filters live in the address so a link can be shared: ?q=approve&surface=phone&kind=component&data=list.
 * Each filter takes one value (a Fire chip nav, single select); the values on offer are whatever the index contains. */
import { icon } from '../fire/js/icons.js';
import { init } from '../fire/fire.js';

const SURFACES = ['app', 'website', 'phone', 'email'];
const LABEL = { app: 'App', website: 'Website', phone: 'Phone', email: 'Email' };
const KIND_ICON = { component: 'box', pattern: 'blocks', layout: 'columns-3', section: 'newspaper', template: 'monitor', module: 'braces' };
const KIND_ORDER = ['component', 'pattern', 'layout', 'section', 'template', 'module'];
const FACETS = [['surface', 'Surface'], ['kind', 'Kind'], ['data', 'Data shape']];
const cap = (s) => (LABEL[s] || s.charAt(0).toUpperCase() + s.slice(1));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const href = (docs) => (docs.startsWith('docs/') ? docs.slice(5) : `../${docs}`);

const $ = (id) => document.getElementById(id);
const state = { q: '', surface: '', kind: '', data: '' };
let entries = [];

function readUrl() {
  const p = new URLSearchParams(location.search);
  for (const k of Object.keys(state)) state[k] = p.get(k) || '';
}
function writeUrl() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) if (v) p.set(k, v);
  const qs = p.toString();
  history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);
}

/** A simple match, as `fire find` does it in spirit: every word of the query must appear; name and aka count most. */
function score(e, q) {
  if (!q.length) return 1;
  const name = words(`${e.id} ${e.name}`), aka = words(e.aka.join(' ')), rest = words(`${e.job} ${e.use} ${e.family}`);
  let total = 0;
  for (const w of q) {
    let s = 0;
    if (name.includes(w)) s = 10;
    else if (name.some((n) => n.startsWith(w))) s = 6;
    else if (aka.some((n) => n.startsWith(w))) s = 5;
    else if (aka.some((n) => n.includes(w))) s = 4;
    else if (rest.some((n) => n.startsWith(w))) s = 2;
    else return 0;
    total += s;
  }
  return total;
}
const passes = (e, skip) => (skip === 'surface' || !state.surface || e.surfaces.includes(state.surface)) &&
  (skip === 'kind' || !state.kind || e.kind === state.kind) && (skip === 'data' || !state.data || e.data.includes(state.data));

function chip(value, label) {
  return `<button class="fd-chip" type="button" data-value="${esc(value)}" aria-pressed="false"><span>${esc(label)}</span> <span class="fd-chip-count"></span></button>`;
}

function values(facet) {
  const seen = new Set(entries.flatMap((e) => (facet === 'surface' ? e.surfaces : facet === 'kind' ? [e.kind] : e.data)));
  const list = [...seen];
  if (facet === 'surface') return [...SURFACES.filter((s) => seen.has(s)), ...list.filter((s) => !SURFACES.includes(s)).sort()];
  if (facet === 'kind') return list.sort((a, b) => (KIND_ORDER.indexOf(a) + 1 || 99) - (KIND_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b));
  return list.sort();
}
// The chips are built once; later renders only change counts and aria-pressed, so focus stays on the chip that was used.
function buildFacets() {
  const box = $('cat-facets');
  box.innerHTML = FACETS.map(([f, label]) => `<div class="doc-cat-facet"><p class="fd-eyebrow" id="cat-f-${f}">${label}</p>
    <div class="fd-chip-nav" role="group" aria-labelledby="cat-f-${f}" data-facet="${f}">${[chip('', 'All'), ...values(f).map((v) => chip(v, cap(v)))].join('')}</div></div>`).join('');
  box.addEventListener('fd:change', (ev) => {
    const strip = ev.target.closest('[data-facet]');
    if (!strip) return;
    state[strip.dataset.facet] = ev.detail.item.dataset.value;
    render();
  });
  init(box);
}
function renderChips(q) {
  for (const [f] of FACETS) {
    const pool = entries.filter((e) => passes(e, f) && score(e, q));
    for (const b of document.querySelectorAll(`[data-facet="${f}"] .fd-chip`)) {
      const v = b.dataset.value;
      b.setAttribute('aria-pressed', String(state[f] === v));
      b.querySelector('.fd-chip-count').textContent = v ? pool.filter((e) => (f === 'surface' ? e.surfaces.includes(v) : f === 'kind' ? e.kind === v : e.data.includes(v))).length : pool.length;
    }
  }
}

function row(e) {
  const tags = SURFACES.filter((s) => e.surfaces.includes(s)).concat(e.surfaces.filter((s) => !SURFACES.includes(s)));
  return `<li class="fd-list-row">
    <span class="fd-list-lead">${icon(KIND_ICON[e.kind] || 'box')}</span>
    <div class="fd-list-body"><a class="fd-list-link fd-list-title" href="${esc(href(e.docs))}">${esc(e.name)}</a><span class="fd-list-desc">${esc(e.job)}</span></div>
    <span class="fd-list-meta">${esc(cap(e.kind))}</span>
    <span class="fd-list-trail" role="group" aria-label="Surfaces">${tags.map((s) => `<span class="fd-badge">${esc(cap(s))}</span>`).join('')}</span>
  </li>`;
}

function render() {
  const q = [...new Set(words(state.q))];
  const hits = entries.map((e) => ({ e, s: passes(e) ? score(e, q) : 0 })).filter((x) => x.s)
    .sort((a, b) => (q.length ? b.s - a.s : 0) || a.e.name.localeCompare(b.e.name) || a.e.kind.localeCompare(b.e.kind));
  $('cat-list').innerHTML = hits.map((x) => row(x.e)).join('');
  $('cat-list').hidden = !hits.length;
  $('cat-empty').hidden = !!hits.length;
  const active = Object.entries(state).filter(([, v]) => v).length;
  $('cat-count').textContent = `${hits.length} of ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}${active ? ' match' : ''}`;
  $('cat-clear').hidden = !active;
  // Empty: when the surface is what hides them, say how many exist for other surfaces.
  const elsewhere = state.surface && !hits.length ? entries.filter((e) => passes(e, 'surface') && score(e, q)).length : 0;
  $('cat-empty-text').textContent = elsewhere
    ? `${elsewhere} ${elsewhere === 1 ? 'entry matches' : 'entries match'} for other surfaces. Choose All under Surface to see ${elsewhere === 1 ? 'it' : 'them'}.`
    : 'Try other words, or clear a filter.';
  renderChips(q);
  writeUrl();
}

async function start() {
  readUrl();
  const input = $('cat-q');
  input.value = state.q;
  let res;
  try {
    res = await fetch(new URL('../contract/index.json', import.meta.url));
    if (!res.ok) throw new Error(String(res.status));
    entries = (await res.json()).entries;
  } catch (error) {
    $('cat-count').textContent = 'The catalogue did not load.';
    $('cat-error').hidden = false;
    return;
  }
  buildFacets();
  input.addEventListener('input', () => { state.q = input.value.trim(); render(); });
  $('cat-clear').addEventListener('click', () => { for (const k of Object.keys(state)) state[k] = ''; input.value = ''; render(); input.focus(); });
  window.addEventListener('popstate', () => { readUrl(); input.value = state.q; render(); });
  render();
}
start();
