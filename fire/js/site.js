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
 * Added in 0.8 (publishing)
 *  Listing       section.fd-site-posts whose entries (.fd-site-posts-item) carry data-kind="report" and data-tags="pricing
 *                monitoring" (space separated). Controls with data-filter="<name>" anywhere in the section filter them:
 *                an .fd-chip-nav or .fd-tabs (its chosen item's data-value), a select, or an .fd-search. The names are
 *                kind (matches data-kind), q (words in the entry's text) and any other name (matches one of data-tags).
 *                "all" or "" is no filter. .fd-site-posts-count[data-noun] (a plural noun) says "12 of 48 resources" (it is
 *                role="status", so the count is announced politely). When nothing matches, the section's .fd-empty
 *                after the list is shown (list and paging hidden); a [data-clear] button in it clears every filter.
 *                data-page-size="12" on the section pages the matches: an empty nav.fd-pagination after the list is
 *                filled with numbered page buttons, or a button[data-more] shows the next page under the last. A
 *                page change scrolls to the tools (or the list) and moves focus to the first entry of the new page.
 *                data-address on the section keeps the filters and the page in the address (?kind=report&topic=pricing
 *                &q=…&page=2): a choice pushes an entry, typing replaces it, and Back restores the listing.
 *                fd:change { value: { kind, q, …, page }, shown, total } on the section after each change.
 *  Sign-up       form.fd-site-cta-form holding an input[type=email] (in fd-site-cta, .fd-site-footer-signup or an
 *                article's foot). data-state on the form is the state: (none) idle · invalid · busy · sent ·
 *                subscribed · failed. Submitting checks the address (forms.js validateControl: aria-invalid and the
 *                .fd-field-error), then sets busy (aria-busy on the button, the input read-only) and fires fd:submit
 *                { value } on the form. Cancel it to send the address yourself and call setSignup(form, 'sent' |
 *                'subscribed' | 'failed'); left alone, a form with an action posts there, and one without (a specimen)
 *                shows sent. sent and subscribed show the .fd-site-cta-done[data-state="sent|subscribed"] line (role
 *                status) in place of the field; failed keeps the field and puts the input's data-error-failed text
 *                (or "Couldn't subscribe you just now. Try again in a minute.") in the error line as an alert.
 *                fd:change { value: state } on the form. A form written with data-state shows that state on init.
 *  Article       details.fd-disclosure.fd-site-article-aside (the rail of data-layout="aside") is open while the site is
 *                desktop wide (its summary hidden) and a closed disclosure above the text below that; a link chosen in
 *                it closes it. Footnotes: a.fd-site-notes-ref[href="#note-1"][id="ref-1"] in the text and
 *                a.fd-site-notes-back[href="#ref-1"] in the note: following either moves focus to the other end
 *                (the note's li gets tabindex="-1"), so Back and the back link return the reader to their place.
 *  Copy link     button[data-fd-copy-link] (optionally ="https://…") copies that address, else the page's canonical
 *                link or its address without the hash; the button shows Copied and the copy is announced (code.js
 *                copied()). fd:copy { value } on the button.
 *
 * Events (bubbling): fd:open / fd:close (the header's sheet), fd:change (pricing period, compare column, listing,
 *   sign-up state), fd:submit (sign-up, cancelable), fd:copy (copy link).
 * API: init(root), openHeader(header), closeHeader(header, { focus }), setPeriod(section, period), showPlan(section, n),
 *      filterPosts(section, filters, { page, push, replace, focus, silent }), setSignup(form, state, { silent })
 */
import { $, $$, on, once, emit, reducedMotion, focusables, copyText, label, focusQuiet } from './core.js';
import { validateControl } from './forms.js';
import { copied } from './code.js';
import { upgradeIcons } from './icons.js';

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

/* ---------- Listing ---------- */
const NONE = new Set(['', 'all']);
const POSTS = new WeakMap();   // section -> { filters, page }
const itemsOf = (section) => $$('.fd-site-posts-item', $('.fd-site-posts-list', section) || section).filter((el) => el.closest('.fd-site-posts') === section);
const controlsOf = (section) => $$('[data-filter]', section).filter((el) => el.closest('.fd-site-posts') === section);
const words = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9%$.]+/).filter(Boolean);

function controlValue(control) {
  if (control.matches('select')) return control.value;
  if (control.matches('.fd-search')) return $('.fd-search-input', control)?.value.trim() || '';
  const chosen = $('[aria-pressed="true"], [aria-selected="true"], [aria-current="true"], [aria-current="page"]', control);
  return chosen ? (chosen.dataset.value ?? '') : '';
}
function setControl(control, value) {
  const v = value ?? '';
  if (control.matches('select')) { control.value = [...control.options].some((o) => o.value === v) ? v : (control.options[0]?.value ?? ''); return; }
  if (control.matches('.fd-search')) { const input = $('.fd-search-input', control); if (input && input.value !== v) input.value = v; return; }
  const items = $$('[data-value]', control);
  const target = items.find((i) => i.dataset.value === v) || items.find((i) => NONE.has(i.dataset.value)) || items[0];
  for (const item of items) {
    const attr = item.hasAttribute('aria-selected') ? 'aria-selected' : item.hasAttribute('aria-current') ? 'aria-current' : 'aria-pressed';
    if (attr === 'aria-current') { if (item === target) item.setAttribute(attr, 'true'); else item.removeAttribute(attr); }
    else item.setAttribute(attr, String(item === target));
  }
}
const readFilters = (section) => Object.fromEntries(controlsOf(section).map((c) => [c.dataset.filter, controlValue(c)]));

function matches(item, filters) {
  for (const [name, value] of Object.entries(filters)) {
    if (NONE.has(value ?? '')) continue;
    if (name === 'kind') { if (item.dataset.kind !== value) return false; }
    else if (name === 'q') {
      const text = words(item.textContent + ' ' + (item.dataset.tags || '') + ' ' + (item.dataset.kind || '')).join(' ');
      if (!words(value).every((w) => text.includes(w))) return false;
    } else if (!(item.dataset.tags || '').split(/\s+/).includes(value)) return false;
  }
  return true;
}

function pagesHTML(section, page, count) {
  const nav = label(section, 'posts.pages', 'Pages');
  const btn = (n, text, aria, disabled = false, current = false) => `<button class="${text ? 'fd-btn' : 'fd-pagination-page'}" type="button" data-page="${n}"${text ? ' data-variant="ghost" data-size="sm"' : ''} aria-label="${aria}"${current ? ' aria-current="page"' : ''}${disabled ? ' disabled' : ''}>${text || n}</button>`;
  const shown = [];
  for (let n = 1; n <= count; n++) if (n === 1 || n === count || Math.abs(n - page) <= 1) shown.push(n);
  let last = 0;
  const list = shown.map((n) => { const gap = n - last > 1 ? '<span class="fd-pagination-gap" aria-hidden="true">…</span>' : ''; last = n; return gap + btn(n, '', `${label(section, 'posts.page', 'Page')} ${n}`, false, n === page); }).join('');
  return `${btn(page - 1, `<i data-icon="chevron-left"></i><span>${label(section, 'posts.previous', 'Previous')}</span>`, label(section, 'posts.previous-page', 'Previous page'), page <= 1)}`
    + `<div class="fd-pagination-pages" role="group" aria-label="${nav}">${list}</div>`
    + `${btn(page + 1, `<span>${label(section, 'posts.next', 'Next')}</span><i data-icon="chevron-right" data-nudge></i>`, label(section, 'posts.next-page', 'Next page'), page >= count)}`;
}

/** Filter and page a listing. filters: { kind, q, <tag name>: value }; omitted keys keep the controls' values. */
export function filterPosts(section, filters = {}, { page = 1, push = false, replace = false, focus = false, silent = false } = {}) {
  if (!section) return;
  for (const control of controlsOf(section)) if (control.dataset.filter in filters) setControl(control, filters[control.dataset.filter]);
  const current = readFilters(section);
  const items = itemsOf(section);
  const list = $('.fd-site-posts-list', section);
  const matched = items.filter((item) => matches(item, current));
  const size = Number(section.dataset.pageSize) || 0;
  const pager = $$('.fd-pagination', section).find((el) => el.closest('.fd-site-posts') === section);
  const more = $$('[data-more]', section).find((el) => el.closest('.fd-site-posts') === section);
  const count = size ? Math.max(1, Math.ceil(matched.length / size)) : 1;
  const at = Math.min(Math.max(1, Number(page) || 1), count);
  const from = size && pager ? (at - 1) * size : 0;
  const to = size ? at * size : matched.length;
  const before = new Set(items.filter((i) => !i.hidden));
  items.forEach((item) => { item.hidden = true; });
  matched.slice(from, to).forEach((item) => { item.hidden = false; });
  const empty = $$('.fd-empty', section).find((el) => el.closest('.fd-site-posts') === section && list && (list.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING));
  const none = items.length > 0 && matched.length === 0;
  if (empty) empty.hidden = !none;
  if (list) list.hidden = none;
  if (pager) {
    pager.hidden = !size || count <= 1 || none;
    if (!pager.hidden) {
      pager.dataset.variant ||= 'numbered';
      pager.innerHTML = pagesHTML(section, at, count);
      upgradeIcons(pager);
    }
  }
  if (more) more.hidden = !size || to >= matched.length || none;
  const counter = $$('.fd-site-posts-count', section).find((el) => el.closest('.fd-site-posts') === section);
  if (counter) {
    const noun = counter.dataset.noun || label(section, 'posts.noun', 'entries');
    const text = matched.length === items.length ? `${items.length} ${noun}` : `${matched.length} ${label(section, 'posts.of', 'of')} ${items.length} ${noun}`;
    if (counter.textContent !== text) counter.textContent = text;
  }
  const state = { filters: current, page: at };
  POSTS.set(section, state);
  if ((push || replace) && section.hasAttribute('data-address')) {
    const url = new URL(location.href);
    for (const control of controlsOf(section)) url.searchParams.delete(control.dataset.filter);
    url.searchParams.delete('page');
    for (const [name, value] of Object.entries(current)) if (!NONE.has(value)) url.searchParams.set(name, value);
    if (at > 1) url.searchParams.set('page', String(at));
    if (url.href !== location.href) history[push ? 'pushState' : 'replaceState']({ fdPosts: true }, '', url);
  }
  if (focus) {
    const fresh = matched.slice(from, to).find((i) => focus === 'more' ? !before.has(i) : true);
    const link = fresh && $('.fd-site-posts-title a, a[href]', fresh);
    if (focus !== 'more') {
      const top = $$('.fd-site-posts-tools', section).find((el) => el.closest('.fd-site-posts') === section) || list;
      top?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'instant' : 'smooth' });
    }
    link?.focus({ preventScroll: focus !== 'more' ? true : false });
  }
  if (!silent) emit(section, 'fd:change', { value: { ...current, page: at }, shown: matched.length, total: items.length });
}

function fromAddress(section) {
  const params = new URLSearchParams(location.search);
  const filters = {};
  for (const control of controlsOf(section)) filters[control.dataset.filter] = params.get(control.dataset.filter) ?? '';
  return { filters, page: Number(params.get('page')) || 1 };
}

function setupPosts(section) {
  if (!once(section, 'site-posts') || POSTS.has(section)) return;   // a page script may have filtered it first
  if (!controlsOf(section).length && !section.dataset.pageSize) return;
  if (section.hasAttribute('data-address')) {
    const { filters, page } = fromAddress(section);
    filterPosts(section, filters, { page, silent: true });
  } else filterPosts(section, {}, { silent: true });
}

function bindPosts() {
  const sectionOf = (el) => el.closest('.fd-site-posts');
  doc.addEventListener('fd:change', (event) => {
    const control = event.target instanceof Element ? event.target.closest('[data-filter]') : null;
    const section = control && sectionOf(control);
    if (!section || control.closest('.fd-site-posts') !== section || event.target === section) return;
    if (control.matches('.fd-search')) filterPosts(section, {}, { replace: true });
    else filterPosts(section, {}, { push: true });
  });
  on(doc, 'change', 'select[data-filter]', (event, select) => { const section = sectionOf(select); if (section) filterPosts(section, {}, { push: true }); });
  on(doc, 'click', '.fd-site-posts [data-page]', (event, button) => {
    const section = sectionOf(button);
    if (!section || button.disabled) return;
    filterPosts(section, {}, { page: Number(button.dataset.page), push: true, focus: true });
  });
  on(doc, 'click', '.fd-site-posts [data-more]', (event, button) => {
    const section = sectionOf(button);
    const state = section && POSTS.get(section);
    if (state) filterPosts(section, {}, { page: state.page + 1, focus: 'more' });
  });
  on(doc, 'click', '.fd-site-posts .fd-empty [data-clear]', (event, button) => {
    const section = sectionOf(button);
    if (!section) return;
    filterPosts(section, Object.fromEntries(controlsOf(section).map((c) => [c.dataset.filter, ''])), { push: true });
    const first = controlsOf(section)[0];
    ($('[aria-pressed="true"], [aria-selected="true"], [aria-current]', first) || $('input, select', first) || first)?.focus?.();
  });
  addEventListener('popstate', () => {
    for (const section of $$('.fd-site-posts[data-address]')) {
      if (!POSTS.has(section)) continue;
      const { filters, page } = fromAddress(section);
      filterPosts(section, filters, { page });
    }
  });
}

/* ---------- Sign-up ---------- */
const SIGNUP = ['invalid', 'busy', 'sent', 'subscribed', 'failed'];
const emailOf = (form) => $('input[type="email"]', form);

/** Show a sign-up form in one of its states: '' (idle), invalid, busy, sent, subscribed, failed. */
export function setSignup(form, state = '', { silent = false } = {}) {
  if (!form) return;
  const value = SIGNUP.includes(state) ? state : '';
  const input = emailOf(form);
  const button = $('button[type="submit"], button:not([type])', form);
  const field = input?.closest('.fd-field');
  const error = field && $('.fd-field-error', field);
  const hint = field && $('.fd-field-hint', field);
  const done = ['sent', 'subscribed'].includes(value);
  const changed = (form.dataset.state || '') !== value;
  if (value) form.dataset.state = value; else delete form.dataset.state;
  for (const child of form.children) {
    if (child.matches('.fd-site-cta-done')) child.hidden = child.dataset.state ? child.dataset.state !== value : value !== 'sent';
    else child.hidden = done;
  }
  if (button) { if (value === 'busy') button.setAttribute('aria-busy', 'true'); else button.removeAttribute('aria-busy'); }
  if (input) input.readOnly = value === 'busy';
  if (value === 'failed' && error && input) {
    const message = input.dataset.errorFailed || label(form, 'signup.failed', 'Couldn’t subscribe you just now. Try again in a minute.');
    error.innerHTML = `<i data-icon="circle-alert"></i><span></span>`;
    error.lastElementChild.textContent = message;
    error.setAttribute('role', 'alert');
    error.hidden = false;
    upgradeIcons(error);
    input.removeAttribute('aria-invalid');
  } else if (value === 'invalid' && input) {
    checkDomain(form, input);
    if (validateControl(input)) {
      input.setAttribute('aria-invalid', 'true');
      if (error && error.hidden) { error.hidden = false; if (!error.textContent.trim()) error.textContent = input.dataset.errorType || label(form, 'signup.invalid', 'Use a full address, like dana@quarry.dev.'); }
    }
    error?.removeAttribute('role');
  } else if (error && value !== 'invalid') {
    if (value !== 'busy' || error.getAttribute('role') === 'alert') { error.hidden = true; error.removeAttribute('role'); }
    if (value !== 'busy') input?.removeAttribute('aria-invalid');
  }
  if (hint) hint.hidden = !!(error && !error.hidden);
  if (changed && !silent) emit(form, 'fd:change', { value: value || 'idle' });
}

/* A mailbox needs a domain with a dot in it: the browser's email check accepts dana@quarry. */
function checkDomain(form, input) {
  const v = input.value.trim();
  const bad = v && v.includes('@') && !/@[^@\s]+\.[^@\s.]+$/.test(v);
  input.setCustomValidity(bad ? (input.dataset.errorType || label(form, 'signup.invalid', 'Use a full address, like dana@quarry.dev.')) : '');
}

function bindSignup() {
  doc.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('.fd-site-cta-form')) return;
    const input = emailOf(form);
    if (!input) return;
    event.preventDefault();
    if (form.dataset.state === 'busy') return;
    if (input.dataset.errorType === undefined && !input.hasAttribute('data-error-required')) input.dataset.errorRequired = label(form, 'signup.required', 'Enter your email address.');
    if (!input.required) input.required = true;
    checkDomain(form, input);
    if (!validateControl(input)) { setSignup(form, 'invalid'); input.focus(); return; }
    setSignup(form, 'busy');
    const value = input.value.trim();
    if (!emit(form, 'fd:submit', { value })) return;
    const action = form.getAttribute('action');
    if (action && action !== '#') { HTMLFormElement.prototype.submit.call(form); return; }
    requestAnimationFrame(() => setSignup(form, 'sent'));
  });
  on(doc, 'input', '.fd-site-cta-form input[type="email"]', (event, input) => {
    const form = input.closest('.fd-site-cta-form');
    if (['invalid', 'failed'].includes(form?.dataset.state)) { checkDomain(form, input); validateControl(input); if (input.getAttribute('aria-invalid') !== 'true') setSignup(form, ''); }
  });
}

/* ---------- Article ---------- */
const DESKTOP = 900;
function setupAside(aside) {
  if (!once(aside, 'site-aside')) return;
  const site = aside.closest('.fd-site') || doc.documentElement;
  let wide = null;
  const apply = () => {
    const now = site.getBoundingClientRect().width >= DESKTOP;
    if (now === wide) return;
    wide = now;
    aside.open = now;
    aside.dataset.state = now ? 'open' : 'closed';
  };
  apply();
  if (typeof ResizeObserver === 'function') new ResizeObserver(apply).observe(site);
}

function bindArticle() {
  on(doc, 'click', '.fd-site-article-aside a[href^="#"]', (event, link) => {
    const aside = link.closest('.fd-site-article-aside');
    if (aside?.open && $(':scope > summary', aside)?.checkVisibility?.()) { aside.open = false; aside.dataset.state = 'closed'; }
  });
  on(doc, 'click', 'a.fd-site-notes-ref, a.fd-site-notes-back', (event, link) => {
    const target = doc.getElementById(decodeURIComponent((link.getAttribute('href') || '').slice(1)));
    if (!target) return;
    requestAnimationFrame(() => focusQuiet(target));
  });
  on(doc, 'click', 'button[data-fd-copy-link]', async (event, button) => {
    const canonical = $('link[rel="canonical"]')?.href;
    const value = button.dataset.fdCopyLink || canonical || location.href.split('#')[0];
    if (!(await copyText(value))) return;
    copied(button);
    emit(button, 'fd:copy', { value });
  });
}

/* ---------- init ---------- */
let bound = false;
export function init(root = doc) {
  if (!bound) { bound = true; bindHeader(); bindPause(); bindChoices(); bindPosts(); bindSignup(); bindArticle(); }
  scope(root, '.fd-site-posts').forEach(setupPosts);
  scope(root, 'form.fd-site-cta-form').forEach((form) => { if (once(form, 'site-signup') && form.dataset.state) setSignup(form, form.dataset.state, { silent: true }); });
  scope(root, 'details.fd-site-article-aside').forEach(setupAside);
  scope(root, '.fd-site-notes > li[id]').forEach((li) => { if (!li.hasAttribute('tabindex')) li.setAttribute('tabindex', '-1'); });
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
