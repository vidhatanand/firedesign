/* Fire site — behaviour for the Website family (CSS in components/site.css).
 *
 * Markup contract
 *  Header        header.fd-site-header > .fd-site-header-bar holding nav.fd-site-header-nav#id and
 *                button.fd-site-header-toggle[aria-expanded][aria-controls=id] (shown below desktop).
 *                The toggle opens the nav as a full-width sheet: data-state="open" on the .fd-site-header,
 *                data-open on the nav. Escape closes it and returns focus to the toggle; following a link,
 *                clicking outside or the site growing to desktop width closes it too. fd:open / fd:close on the header.
 *                data-scrolled is set on the .fd-site-header once the top of its .fd-site has scrolled out of view
 *                (a sentinel span[data-fd-site-sentinel] is added at the start of the .fd-site to watch).
 *                A link may open a menu: a .fd-site-header-link with data-fd-menu="menuId" and a .fd-menu (overlays.js).
 *                Order: in the DOM the nav sits between the brand and the actions (the toggle is the last action), so at
 *                desktop Tab goes brand, links, actions. While the sheet is open, Tab goes brand, actions, menu button,
 *                then the links in the sheet, then on past the header (site.js moves focus to keep that order).
 *  Logos         .fd-site-logos[data-layout="marquee"] .fd-site-logos-track > ul.fd-site-logos-list: the list is copied
 *                once after itself (aria-hidden, inert) and the track gets data-cloned, which starts the strip.
 *                Under reduced motion nothing is copied and the strip is a wrapping row.
 *                button.fd-site-logos-pause[aria-pressed] stops and starts it (data-paused on the track).
 *  Pricing       .fd-site-pricing holding an .fd-segmented whose items carry data-value="monthly|yearly" (any names):
 *                choosing one sets data-period on the section to that value; an element inside it that carries
 *                its own data-period is shown when the two are equal and gets hidden otherwise. fd:change { value: period } on the .fd-site-pricing.
 *  Compare       .fd-site-compare holding .fd-tabs.fd-site-compare-tabs (one tab per plan column, in table order;
 *                no aria-controls) and .fd-site-compare-table: choosing a tab sets data-show="n" (1-based) on the
 *                section, which shows that plan's column on a phone. fd:change { value: n } on the .fd-site-compare.
 *
 * Events (bubbling): fd:open / fd:close (the header's sheet), fd:change (pricing period, compare column).
 * API: init(root), openHeader(header), closeHeader(header, { focus }), setPeriod(section, period), showPlan(section, n)
 */
import { $, $$, on, once, emit, reducedMotion, focusables } from './core.js';

const doc = document;
const scope = (root, sel) => [...(root instanceof Element && root.matches(sel) ? [root] : []), ...$$(sel, root)];

/* ---------- Header ---------- */
const navOf = (header) => {
  const toggle = $('.fd-site-header-toggle', header);
  return (toggle && doc.getElementById(toggle.getAttribute('aria-controls') || '')) || $('.fd-site-header-nav', header);
};

export function openHeader(header) {
  if (!header || header.dataset.state === 'open') return;
  const toggle = $('.fd-site-header-toggle', header);
  const nav = navOf(header);
  header.dataset.state = 'open';
  nav?.setAttribute('data-open', '');
  toggle?.setAttribute('aria-expanded', 'true');
  emit(header, 'fd:open');
}

export function closeHeader(header, { focus = false } = {}) {
  if (!header || header.dataset.state !== 'open') return;
  const toggle = $('.fd-site-header-toggle', header);
  delete header.dataset.state;
  navOf(header)?.removeAttribute('data-open');
  toggle?.setAttribute('aria-expanded', 'false');
  if (focus) toggle?.focus();
  emit(header, 'fd:close');
}

const toggleHidden = (header) => {
  const toggle = $('.fd-site-header-toggle', header);
  return !toggle || getComputedStyle(toggle).display === 'none';
};

function setupHeader(header) {
  if (!once(header, 'site-header')) return;
  const site = header.closest('.fd-site');
  // Close the sheet when the site grows past it.
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => { if (header.dataset.state === 'open' && toggleHidden(header)) closeHeader(header); }).observe(site || header);
  }
  // Scrolled: watch a sentinel at the top of the site.
  if (site && typeof IntersectionObserver === 'function') {
    let sentinel = $(':scope > [data-fd-site-sentinel]', site);
    if (!sentinel) {
      sentinel = doc.createElement('span');
      sentinel.setAttribute('data-fd-site-sentinel', '');
      sentinel.setAttribute('aria-hidden', 'true');
      site.prepend(sentinel);
    }
    new IntersectionObserver(([entry]) => {
      const top = entry.rootBounds ? entry.rootBounds.top : 0;
      header.toggleAttribute('data-scrolled', !entry.isIntersecting && entry.boundingClientRect.top < top);
    }).observe(sentinel);
  }
}

function bindHeader() {
  on(doc, 'click', '.fd-site-header-toggle', (event, toggle) => {
    const header = toggle.closest('.fd-site-header');
    if (header.dataset.state === 'open') closeHeader(header); else openHeader(header);
  });
  // A link in the sheet closes it (a menu trigger does not).
  on(doc, 'click', '.fd-site-header-nav a', (event, link) => {
    const header = link.closest('.fd-site-header');
    if (header?.dataset.state === 'open') closeHeader(header);
  });
  doc.addEventListener('click', (event) => {
    for (const header of $$('.fd-site-header[data-state="open"]')) {
      if (event.target instanceof Node && !header.contains(event.target) && !event.target.closest?.('.fd-menu')) closeHeader(header);
    }
  });
  // While the sheet is open its links follow the menu button in tab order, whatever their place in the DOM.
  doc.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target instanceof Element ? event.target : null;
    const header = target?.closest('.fd-site-header[data-state="open"]');
    if (!header) return;
    const nav = navOf(header);
    const toggle = $('.fd-site-header-toggle', header);
    if (!nav || !toggle || target.closest('.fd-menu')) return;
    const all = focusables(header).filter((el) => !el.closest('.fd-menu'));
    const inNav = all.filter((el) => nav.contains(el));
    const rest = all.filter((el) => !nav.contains(el));
    const order = [...rest.slice(0, rest.indexOf(toggle) + 1), ...inNav, ...rest.slice(rest.indexOf(toggle) + 1)];
    const at = order.indexOf(target);
    if (at < 0) return;
    const next = order[at + (event.shiftKey ? -1 : 1)];
    if (next) { event.preventDefault(); next.focus(); return; }
    if (!event.shiftKey) {
      // Past the last link: the first focusable after the header.
      const page = focusables(doc.body);
      const after = page.find((el) => !header.contains(el) && (header.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING));
      if (after) { event.preventDefault(); after.focus(); }
    } else if (order[0] && target === order[0]) {
      // Before the brand: what comes before the header.
      const page = focusables(doc.body);
      const before = page.filter((el) => !header.contains(el) && (header.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)).pop();
      if (before) { event.preventDefault(); before.focus(); }
    }
  });
  doc.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('.fd-menu')) return;   // the menu closes first
    const header = target?.closest('.fd-site-header[data-state="open"]') || $('.fd-site-header[data-state="open"]');
    if (!header) return;
    closeHeader(header, { focus: header.contains(doc.activeElement) || doc.activeElement === doc.body });
  });
}

/* ---------- Logos marquee ---------- */
function setupMarquee(track) {
  if (!once(track, 'site-marquee')) return;
  const list = $(':scope > .fd-site-logos-list', track);
  if (!list || reducedMotion() || track.hasAttribute('data-cloned')) return;
  const copy = list.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  track.append(copy);
  track.setAttribute('data-cloned', '');
}

function bindPause() {
  on(doc, 'click', '.fd-site-logos-pause', (event, button) => {
    const track = $('.fd-site-logos-track', button.closest('.fd-site-logos') || doc);
    const paused = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(paused));
    track?.toggleAttribute('data-paused', paused);
  });
}

/* ---------- Pricing period ---------- */
export function setPeriod(section, period, { silent = false } = {}) {
  if (!section || !period) return;
  const changed = section.dataset.period !== period;
  section.dataset.period = period;
  for (const el of $$('[data-period]', section)) {
    if (el === section) continue;
    el.hidden = el.dataset.period !== period;
  }
  if (changed && !silent) emit(section, 'fd:change', { value: period });
}

const chosen = (control) => $('.fd-segmented-item[aria-checked="true"], .fd-segmented-item[aria-pressed="true"], .fd-segmented-item > input:checked', control);
const valueOf = (item) => item && (item.dataset.value ?? item.value ?? item.closest('.fd-segmented-item')?.dataset.value);

/* ---------- Compare column ---------- */
export function showPlan(section, n, { silent = false } = {}) {
  if (!section) return;
  const value = String(n);
  if (section.dataset.show === value) return;
  section.dataset.show = value;
  if (!silent) emit(section, 'fd:change', { value: Number(n) });
}

function bindChoices() {
  doc.addEventListener('fd:change', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches('.fd-site-pricing .fd-segmented')) {
      const value = event.detail?.value ?? valueOf(event.detail?.item);
      if (value) setPeriod(target.closest('.fd-site-pricing'), value);
    } else if (target.matches('.fd-site-compare-tabs')) {
      const tabs = $$('.fd-tab', target);
      const index = tabs.indexOf(event.detail?.item);
      if (index >= 0) showPlan(target.closest('.fd-site-compare'), index + 1);
    }
  });
  // A segmented control made of labelled radios (a posted form) reports through `change`.
  on(doc, 'change', '.fd-site-pricing .fd-segmented input[type="radio"]', (event, input) => {
    if (input.checked) setPeriod(input.closest('.fd-site-pricing'), input.value);
  });
}

/* ---------- init ---------- */
let bound = false;
export function init(root = doc) {
  if (!bound) { bound = true; bindHeader(); bindPause(); bindChoices(); }
  scope(root, '.fd-site-header').forEach(setupHeader);
  scope(root, '.fd-site-logos[data-layout="marquee"] .fd-site-logos-track').forEach(setupMarquee);
  for (const section of scope(root, '.fd-site-pricing')) {
    if (!once(section, 'site-pricing')) continue;
    const control = $('.fd-segmented', section);
    const value = control && valueOf(chosen(control));
    if (value) setPeriod(section, value, { silent: true });
  }
  for (const section of scope(root, '.fd-site-compare')) {
    if (!once(section, 'site-compare')) continue;
    const tabs = $$('.fd-site-compare-tabs .fd-tab', section);
    const index = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    if (index >= 0) showPlan(section, index + 1, { silent: true });
  }
}
