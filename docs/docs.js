/* Docs chrome: builds the sidebar and top bar around <main class="doc-main">,
 * and turns every .doc-specimen[data-code] into a live example with a code view. */
import { setTheme, getTheme, copyText, ready } from '../fire/js/core.js';
import { icon, upgradeIcons } from '../fire/js/icons.js';

const PAGES = [
  ['Start', [
    ['index', 'Overview', 'flame'],
    ['catalogue', 'Catalogue', 'search'],
    ['foundations', 'Foundations', 'swatch-book'],
    ['signature', 'Texture & frame', 'grid-3x3'],
    ['tweaks', 'Theming & tweaks', 'sliders-horizontal'],
    ['looks', 'Looks', 'palette'],
    ['frameworks', 'Frameworks & checks', 'blocks'],
    ['writing', 'Writing', 'pencil'],
  ]],
  ['Components', [
    ['buttons', 'Buttons', 'mouse-pointer-click'],
    ['forms', 'Forms', 'text-cursor-input'],
    ['navigation', 'Navigation', 'compass'],
    ['shell', 'App shell', 'panel-left'],
    ['overlays', 'Overlays', 'layers'],
    ['data', 'Tables & data', 'table'],
    ['content', 'Cards & feedback', 'layout-grid'],
    ['decisions', 'Decisions', 'list-checks'],
    ['charts', 'Charts', 'chart-column'],
    ['code', 'Code & logs', 'braces'],
    ['agent', 'Agent & AI', 'wand-sparkles'],
    ['documentation', 'Documentation', 'book-open'],
    ['chat', 'Chat', 'message-circle'],
    ['email', 'Email', 'mail'],
    ['transitions', 'Page transitions', 'route'],
    ['skeletons', 'Skeletons & loading', 'loader'],
    ['elements', 'Custom elements', 'blocks'],
  ]],
  ['Website', [
    ['site', 'Site foundation', 'globe'],
    ['site-sections', 'Sections', 'layout-list'],
  ]],
  ['Templates', [
    ['../templates/index', 'All screens', 'monitor'],
  ]],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Pretty-print a specimen's markup for the code view. */
function format(html) {
  const lines = html.replace(/\s+data-fd-bound="[^"]*"/g, '').replace(/\s+data-frame(?:-[a-z]+(?:="[^"]*")?|="[^"]+")(?=[\s>\/])/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).filter((l, i, a) => l.trim() || (a[i - 1] || '').trim());
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}

function buildChrome() {
  const body = document.body;
  const current = body.dataset.page || 'index';
  const side = document.createElement('aside');
  side.className = 'doc-side';
  side.innerHTML = `
    <a class="doc-brand" href="index.html">
      <svg class="doc-brand-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5c.6 3.2-.7 5-2.3 6.700C8 11 6.500 12.800 6.500 15.500a5.500 5.500 0 0 0 11 0c0-1.700-.6-3-1.400-4.200-.5 1.300-1.200 2-2.100 2.400.5-3.600-.3-8.200-2-11.200Z"/></svg>
      Fire <small>0.14</small>
    </a>
    <nav class="doc-nav">${PAGES.map(([group, items]) => `
      <p class="doc-nav-group fd-eyebrow">${group}</p>
      ${items.map(([slug, label, ic]) => `<a href="${slug}.html"${slug === current ? ' aria-current="page"' : ''}>${icon(ic)}${label}</a>`).join('')}`).join('')}
    </nav>`;
  const scrim = document.createElement('div');
  scrim.className = 'doc-scrim';
  const main = document.querySelector('.doc-main');
  const wrap = document.createElement('div');
  wrap.style.minWidth = '0';
  const top = document.createElement('header');
  top.className = 'doc-top';
  const theme = getTheme();
  top.innerHTML = `
    <button class="fd-btn doc-menu-btn" data-icon-only aria-label="Open navigation">${icon('menu')}</button>
    <span class="doc-top-title">fire / ${current}</span>
    <button class="fd-btn doc-tweaks-btn" type="button" data-fd-tweaks-open aria-expanded="false">${icon('sliders-horizontal')}<span>Tweaks</span></button>
    <div class="fd-btn-group" role="group" aria-label="Theme">
      ${[['light', 'sun'], ['dark', 'moon'], ['system', 'monitor']].map(([t, ic]) => `<button class="fd-btn" data-icon-only data-theme-pick="${t}" aria-label="${t} theme" aria-pressed="${theme === t}">${icon(ic)}</button>`).join('')}
    </div>`;
  main.before(wrap);
  wrap.append(top, main);
  // Skip to content (fd-skip): first in <body>, to the page's main, which takes focus with no ring.
  if (!main.id) main.id = 'main';
  if (!main.hasAttribute('tabindex')) main.tabIndex = -1;
  const skip = document.createElement('a');
  skip.className = 'fd-skip';
  skip.href = `#${main.id}`;
  skip.textContent = 'Skip to content';
  body.prepend(skip, side, scrim);

  top.addEventListener('click', (e) => {
    const t = e.target.closest('[data-theme-pick]');
    if (t) { setTheme(t.dataset.themePick); top.querySelectorAll('[data-theme-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b === t))); }
    if (e.target.closest('.doc-menu-btn')) body.toggleAttribute('data-nav-open');
  });
  scrim.addEventListener('click', () => body.removeAttribute('data-nav-open'));
  // The Tweaks panel can change the theme too: keep the top bar's theme buttons in step.
  document.documentElement.addEventListener('fd:theme', (e) => {
    top.querySelectorAll('[data-theme-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themePick === e.detail.theme)));
  });
}

function buildCode() {
  document.querySelectorAll('.doc-specimen[data-code]').forEach((spec) => {
    const source = spec.querySelector(':scope > template[data-source]');
    const html = format(source ? source.innerHTML : spec.dataset.source || spec.innerHTML);
    const details = document.createElement('details');
    details.className = 'doc-code';
    details.innerHTML = `<summary>${icon('chevron-right')}<span>Markup</span><button class="fd-btn doc-code-copy" data-size="xs" data-variant="ghost" type="button">Copy</button></summary><pre><code>${esc(html)}</code></pre>`;
    details.querySelector('.doc-code-copy').addEventListener('click', async (e) => {
      e.preventDefault();
      const btn = e.currentTarget;
      if (await copyText(html)) { btn.textContent = 'Copied'; setTimeout(() => (btn.textContent = 'Copy'), 1400); }
    });
    if (spec.parentElement.classList.contains('doc-pair')) {
      // Keep a specimen and its code view in one grid cell.
      const cell = document.createElement('div');
      cell.className = 'doc-cell';
      spec.before(cell);
      cell.append(spec, details);
    } else {
      spec.after(details);
    }
  });
}

function buildToc() {
  const hero = document.querySelector('.doc-hero');
  const sections = [...document.querySelectorAll('.doc-section[id]')];
  if (!hero || sections.length < 3 || hero.querySelector('.doc-toc')) return;
  const toc = document.createElement('nav');
  toc.className = 'doc-toc';
  toc.setAttribute('aria-label', 'On this page');
  toc.innerHTML = sections.map((s) => `<a href="#${s.id}">${s.querySelector('h2')?.textContent ?? s.id}</a>`).join('');
  hero.append(toc);
}

// Surface tags next to each section heading: where the part the section teaches is used. Read from contract/index.json (the
// cards' own `surfaces`), so they cannot drift. The tags sit beside the h2, not in it, so the "On this page" list and the
// anchors are unchanged. A section that teaches several parts shows the surfaces any of them has.
const SURFACE_ORDER = ['app', 'website', 'phone', 'email'];
const SURFACE_LABEL = { app: 'App', website: 'Website', phone: 'Phone', email: 'Email' };
async function buildSurfaceTags() {
  const page = `${document.body.dataset.page || 'index'}.html`;
  let entries;
  try {
    const res = await fetch(new URL('../contract/index.json', import.meta.url));
    if (!res.ok) return;
    entries = (await res.json()).entries;
  } catch { return; }          // opened from a file, or offline: the pages read fine without tags
  const bySection = new Map();
  for (const e of entries) {
    if (e.kind === 'template' || !e.docs.startsWith(`docs/${page}#`)) continue;
    const id = e.docs.slice(e.docs.indexOf('#') + 1);
    bySection.set(id, new Set([...(bySection.get(id) || []), ...e.surfaces]));
  }
  for (const [id, set] of bySection) {
    const head = document.getElementById(id)?.querySelector(':scope > .doc-section-head');
    if (!head || head.querySelector('.doc-surfaces')) continue;
    const tags = document.createElement('span');
    tags.className = 'doc-surfaces';
    tags.setAttribute('role', 'group');
    tags.setAttribute('aria-label', 'Surfaces');
    tags.innerHTML = SURFACE_ORDER.filter((x) => set.has(x)).map((x) => `<span class="fd-badge">${SURFACE_LABEL[x]}</span>`).join('');
    head.querySelector('h2, h3')?.after(tags);
  }
}

// Capture specimen source before Fire's behaviours mutate the DOM.
document.querySelectorAll('.doc-specimen[data-code]').forEach((spec) => { if (!spec.querySelector(':scope > template[data-source]')) spec.dataset.source = spec.innerHTML; });
ready(() => { buildChrome(); buildCode(); buildToc(); upgradeIcons(); buildSurfaceTags(); });
