/* Fire docsite — behaviour for the Documentation family (CSS in components/docsite.css).
 *
 * Markup contract
 *  Nav groups      .fd-doc-nav-item[aria-expanded][aria-controls=subId] + .fd-doc-nav-sub#subId
 *                  Height animates; open groups persist in localStorage ("fd-doc-nav-open", keyed by
 *                  data-key or the sub's id). A group holding the current page always starts open.
 *                  The current item (aria-current="page") is scrolled into view inside .fd-doc-nav-scroll.
 *  Nav sheet       [data-fd-doc-nav-open] (the breadcrumb bar, a menu button) opens a left .fd-sheet that
 *                  borrows the .fd-doc-nav-scroll of the nearest .fd-doc; closing gives it back.
 *  Contents        .fd-toc-list[data-fd-doc-toc] inside a .fd-doc-toc is filled from the article's
 *                  .fd-prose > h2/h3 when empty (nav.js does the scrollspy and the sliding marker).
 *                  .fd-doc-otp-list (the small-screen "On this page" disclosure) gets the same links.
 *  Anchors         .fd-prose > h2/h3/h4, .fd-doc-params-title, .fd-doc-release-title and .fd-doc-param
 *                  get an id (from their text) and an .fd-doc-anchor; clicking it copies the URL and
 *                  shows "Link copied". Prose tables are wrapped in .fd-doc-table so they scroll.
 *  Copy page       [data-fd-doc-copy-page] copies the article as Markdown and swaps its .fd-btn-swap label.
 *                  .fd-menu[data-fd-doc-copy-menu] items: data-value="copy-md | view-md | open-ai | mcp".
 *  Setup card      .fd-doc-setup-tiles > .fd-doc-setup-tile[data-value] ↔ .fd-doc-setup-panel[data-value]
 *                  (tabs pattern: arrows, Home, End). fd:change { value } on the .fd-doc-setup.
 *  API panels      .fd-doc-panel[data-kind="request"][data-lang][data-example] with panes
 *                  .fd-codeblock-body[data-value=lang][data-example]. Pickers are menus:
 *                  .fd-menu[data-fd-doc-picker="lang|example"][data-for=panelId] with menuitemradio items.
 *                  The language follows (and drives) the code family's "lang" tab group.
 *                  .fd-doc-panel[data-kind="response"] gets data-at-end when its code is scrolled to the end.
 *  Endpoint        .fd-doc-endpoint-url: `{params}` are wrapped in .fd-doc-endpoint-param. Copy is the global
 *                  [data-fd-copy] behaviour of fire.js.
 *  Helpful         .fd-doc-helpful with [data-fd-doc-vote="yes|no"], .fd-doc-helpful-thanks[hidden],
 *                  form.fd-doc-helpful-form[hidden]. fd:change { value: "yes" | "no" | "sent" }.
 *  Zoom            .fd-doc-frame[data-zoom] > .fd-doc-frame-media opens a dialog with a copy of the media. A frame that
 *                  loads its own picture (below) zooms only while the picture is shown.
 *  Picture (0.8)   <figure class="fd-doc-frame" data-fd-src="https://cdn.ember.dev/runs/8f2a91.png" data-fd-alt="…"
 *                  [data-fd-hosts="cdn.ember.dev *.ember-usercontent.com"] [data-fd-data] [data-ratio="wide|photo|square"] [data-zoom]>
 *                  <div class="fd-doc-frame-media"></div> [<figcaption class="fd-doc-frame-caption">…</figcaption>] </figure>
 *                  The address goes through safeImageUrl() (content.js) with data-fd-hosts (and data-fd-data to allow
 *                  data: images); only an address that passes is requested. The media is filled with an <img> and, for
 *                  every state but "loaded", a .fd-doc-frame-placeholder tile (icon and one line). The frame reserves its
 *                  space with an aspect ratio (16:9; data-ratio) and states itself in data-state="empty | loading | loaded
 *                  | failed | refused" (aria-busy while loading), firing fd:change { value: state } on the figure. Words
 *                  of the tile are Fire's labels frame.empty "No picture", frame.refused "This address isn't allowed" and
 *                  frame.failed "The picture didn't load" (the page dictionary, or data-label-frame-empty, -refused
 *                  and -failed on the figure or an ancestor). setPicture(frame, url) points it at another
 *                  address ("" or null: empty).
 *  Try it          dialog.fd-doc-try[data-params="#selector"] > form[data-fd-doc-try-form] with an empty
 *                  [data-fd-doc-try-fields] (generated from the .fd-doc-params[data-in="body|query|path"] rows
 *                  inside data-params), input[data-fd-doc-try-key], .fd-doc-try-result[hidden] holding
 *                  .fd-doc-try-meta and .fd-json, and <script type="application/json" data-fd-doc-try-response>.
 *                  Submitting validates, shows a busy Send button, then the scripted response. fd:change { value: status }.
 *  Changelog       .fd-doc-changelog-filters (an fd-chip-nav) filters .fd-doc-release[data-tags] by data-value.
 *  Search          .fd-command[data-fd-doc-search] items with data-fd-doc-text show a matched-text snippet
 *                  in their hint while you type.
 *
 * Events (bubbling): fd:open / fd:close (nav groups), fd:change (see above), fd:copy { value } (copy page, anchors).
 * API: init(root), buildToc(scope), toMarkdown(article), setNavGroup(button, open), openNavSheet(trigger),
 *      selectSetup(tile), setPanelLang(panel, lang), setPanelExample(panel, example), setPicture(frame, url)
 */
import { $, $$, once, emit, copyText, ensureId, position, reducedMotion, label } from './core.js';
import { icon } from './icons.js';
import { openDialog, closeDialog, toast } from './overlays.js';
import { selectTab, renderJSON } from './code.js';
import { refresh as refreshNav } from './nav.js';
import { toggle as toggleDetails, safeImageUrl } from './content.js';

const doc = document;
const HAS_POPOVER = typeof HTMLElement === 'function' && typeof HTMLElement.prototype.showPopover === 'function';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const scope = (root, sel) => [...(root instanceof Element && root.matches(sel) ? [root] : []), ...$$(sel, root)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function duration(el, name) {
  if (reducedMotion()) return 0;
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
}
const easing = (el, name, fallback) => getComputedStyle(el).getPropertyValue(name).trim() || fallback;

/** Text of an element without injected anchors, icons and screen-reader extras. */
function textOf(el) {
  if (!el) return '';
  const clone = el.cloneNode(true);
  clone.querySelectorAll('.fd-doc-anchor, svg, i[data-icon], .fd-sr-only, .fd-menu-item-desc, button').forEach((n) => n.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
function uniqueId(base) {
  let id = base;
  let n = 2;
  while (doc.getElementById(id)) id = `${base}-${n++}`;
  return id;
}

/* ==========================================================================
   Nav groups
   ========================================================================== */
const NAV_KEY = 'fd-doc-nav-open';
const navAnimations = new WeakMap();
const subOf = (button) => {
  const id = button.getAttribute('aria-controls');
  return (id && doc.getElementById(id)) || (button.nextElementSibling?.matches('.fd-doc-nav-sub') ? button.nextElementSibling : null);
};
const groupKey = (button) => button.dataset.key || button.getAttribute('aria-controls') || textOf(button);
function openKeys() {
  try { return new Set(JSON.parse(store.get(NAV_KEY) || '[]')); } catch { return new Set(); }
}
function persistGroup(button, open) {
  const keys = openKeys();
  if (open) keys.add(groupKey(button)); else keys.delete(groupKey(button));
  store.set(NAV_KEY, keys.size ? JSON.stringify([...keys]) : null);
}

/** Open or close a nav group from its trigger. */
export function setNavGroup(button, open, { animate = true, persist = true } = {}) {
  const sub = subOf(button);
  if (!sub) return;
  const wasOpen = button.getAttribute('aria-expanded') === 'true' && !sub.hidden;
  button.setAttribute('aria-expanded', String(open));
  if (persist) persistGroup(button, open);
  if (wasOpen === open) return;
  navAnimations.get(sub)?.cancel();
  const ms = animate ? duration(sub, '--fd-dur-4') : 0;
  const ease = easing(sub, '--fd-ease-emphasized', 'ease-out');
  if (open) {
    sub.hidden = false;
    if (ms && sub.animate) {
      const h = sub.scrollHeight;
      navAnimations.set(sub, sub.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: ms, easing: ease }));
    }
  } else if (ms && sub.animate) {
    const anim = sub.animate([{ height: `${sub.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: ms * 0.75, easing: ease });
    navAnimations.set(sub, anim);
    anim.onfinish = () => { if (button.getAttribute('aria-expanded') === 'false') sub.hidden = true; };
  } else {
    sub.hidden = true;
  }
  emit(button, open ? 'fd:open' : 'fd:close', { value: groupKey(button) });
}

function setupNav(nav) {
  if (!once(nav, 'doc-nav')) return;
  const keys = openKeys();
  $$('.fd-doc-nav-item[aria-expanded]', nav).forEach((button) => {
    if (button.tagName === 'BUTTON') button.type = 'button';
    const sub = subOf(button);
    if (!sub) return;
    const holdsCurrent = !!sub.querySelector('[aria-current="page"]');
    const open = holdsCurrent || keys.has(groupKey(button)) || button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(open));
    sub.hidden = !open;
  });
  revealCurrent(nav);
}

/** Scroll the current item into the middle third of its scroller, without moving the page. */
function revealCurrent(nav) {
  const scroller = nav.matches('.fd-doc-nav-scroll') ? nav : nav.querySelector('.fd-doc-nav-scroll');
  const item = scroller?.querySelector('.fd-doc-nav-item[aria-current="page"]');
  if (!scroller || !item || !item.offsetParent) return;
  requestAnimationFrame(() => {
    const s = scroller.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    if (r.top >= s.top + 8 && r.bottom <= s.bottom - 8) return;
    scroller.scrollTop += r.top - s.top - scroller.clientHeight / 3;
  });
}

/* ==========================================================================
   Nav sheet (phones and tablets)
   ========================================================================== */
const sheetHome = new WeakMap();   // sheet -> { nav, scroll }

function navSheet(shell) {
  let sheet = $(':scope > .fd-doc-sheet', shell);
  if (sheet) return sheet;
  sheet = doc.createElement('dialog');
  sheet.className = 'fd-sheet fd-doc-sheet';
  sheet.dataset.side = 'left';
  sheet.setAttribute('aria-label', 'Documentation navigation');
  const brand = $('.fd-doc-top .fd-brand', shell)?.cloneNode(true);
  sheet.innerHTML = `<div class="fd-sheet-head"><div class="fd-sheet-bar"><span class="fd-sheet-title"></span><button class="fd-btn fd-sheet-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close navigation">${icon('x')}</button></div></div><div class="fd-sheet-body"></div>`;
  const title = $('.fd-sheet-title', sheet);
  if (brand) { brand.removeAttribute('id'); title.append(brand); } else title.textContent = 'Documentation';
  shell.append(sheet);
  sheet.addEventListener('fd:close', (event) => {
    if (event.target !== sheet) return;
    const home = sheetHome.get(sheet);
    if (home?.scroll && home.nav) home.nav.prepend(home.scroll);
    sheetHome.delete(sheet);
  });
  return sheet;
}

/** Open the nav of the nearest .fd-doc in a left sheet. */
export function openNavSheet(trigger) {
  const shell = trigger.closest('.fd-doc') || $('.fd-doc');
  const nav = shell && $('.fd-doc-body > .fd-doc-nav', shell);
  const scroll = nav && $(':scope > .fd-doc-nav-scroll', nav);
  if (!scroll) return null;
  const sheet = navSheet(shell);
  sheetHome.set(sheet, { nav, scroll });
  $('.fd-sheet-body', sheet).append(scroll);
  const dialog = openDialog(sheet, { trigger });
  const body = $('.fd-sheet-body', sheet);
  body.scrollTop = 0;
  requestAnimationFrame(() => {
    const item = scroll.querySelector('.fd-doc-nav-item[aria-current="page"]');
    if (!item) return;
    const b = body.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    if (r.bottom > b.bottom - 8) body.scrollTop += r.top - b.top - body.clientHeight / 3;
  });
  return dialog;
}

/* ==========================================================================
   Contents (TOC) and heading anchors
   ========================================================================== */
const ANCHORED = '.fd-prose > h2, .fd-prose > h3, .fd-prose > h4, .fd-doc-params-title, .fd-doc-release-title';

function articleFor(el) {
  const sel = el.dataset?.fdDocToc;
  if (sel && sel !== '' && sel !== 'auto') { const t = doc.querySelector(sel); if (t) return t; }
  const content = el.closest('.fd-doc-content, .fd-doc-main, .fd-doc');
  return content?.querySelector('.fd-doc-article') || el.closest('.fd-doc-article');
}
function tocHeadings(article) {
  return $$('.fd-prose > h2, .fd-prose > h3', article)
    .filter((h) => !h.closest('.fd-doc-step-body, .fd-doc-tabs, .fd-doc-foot, [data-toc="false"]'));
}

/** Fill empty contents lists ([data-fd-doc-toc]) and "On this page" disclosures from the article headings. */
export function buildToc(root = doc) {
  scope(root, '.fd-toc-list[data-fd-doc-toc]').forEach((list) => {
    if ($('.fd-toc-item', list)) return;
    const article = articleFor(list);
    if (!article) return;
    anchorHeadings(article);
    const heads = tocHeadings(article);
    const html = heads.map((h) => `<a class="fd-toc-item" href="#${esc(h.id)}"${h.tagName === 'H3' ? ' data-level="2"' : ''}>${esc(textOf(h))}</a>`).join('');
    list.insertAdjacentHTML('beforeend', html);
    const toc = list.closest('.fd-toc');
    if (toc && !heads.length) toc.hidden = true;
    refreshNav(list);
    requestAnimationFrame(() => dispatchEvent(new Event('scroll')));
  });
  scope(root, '.fd-doc-otp-list').forEach((list) => {
    if (list.children.length) return;
    const article = list.closest('.fd-doc-article') || articleFor(list);
    if (!article) return;
    anchorHeadings(article);
    const heads = tocHeadings(article);
    list.innerHTML = heads.map((h) => `<a href="#${esc(h.id)}"${h.tagName === 'H3' ? ' data-level="2"' : ''}>${esc(textOf(h))}</a>`).join('');
    if (!heads.length) list.closest('.fd-doc-otp')?.setAttribute('hidden', '');
  });
}

function anchorHeadings(root) {
  scope(root, ANCHORED).forEach((h) => {
    if (h.querySelector(':scope > .fd-doc-anchor')) return;
    if (!h.id) h.id = uniqueId(slugify(textOf(h)));
    h.insertAdjacentHTML('beforeend', anchorHTML(h.id, textOf(h)));
  });
  scope(root, '.fd-doc-param').forEach((item) => {
    const head = $(':scope > .fd-schema-head', item);
    if (!head || $(':scope > .fd-doc-anchor', head)) return;
    if (!item.id) {
      const section = item.closest('.fd-doc-params');
      const prefix = section?.dataset.in ? `${section.dataset.in}-` : 'param-';
      item.id = uniqueId(prefix + slugify(textOf($('.fd-schema-name', item))));
    }
    head.insertAdjacentHTML('afterbegin', anchorHTML(item.id, textOf($('.fd-schema-name', item))));
  });
}
const anchorHTML = (id, label) => `<a class="fd-doc-anchor" href="#${esc(id)}" data-fd-tooltip="Copy link" aria-label="Copy link to ${esc(label)}">${icon('link')}</a>`;

let flash;
let flashTimer;
/** A short-lived tooltip (e.g. "Link copied") above `anchor`. */
function flashTip(anchor, text) {
  if (!flash?.isConnected) {
    flash = doc.createElement('div');
    flash.className = 'fd-tooltip';
    flash.setAttribute('role', 'status');
    if (HAS_POPOVER) flash.setAttribute('popover', 'manual');
    flash.dataset.state = 'closed';
    doc.body.append(flash);
  }
  clearTimeout(flashTimer);
  flash.textContent = text;
  flash.dataset.measuring = 'true';
  try { if (HAS_POPOVER && !flash.matches(':popover-open')) flash.showPopover(); } catch { /* not connected */ }
  position(anchor, flash, { placement: 'top', offset: 6 });
  flash.getBoundingClientRect();
  delete flash.dataset.measuring;
  flash.dataset.state = 'open';
  flashTimer = setTimeout(() => {
    flash.dataset.state = 'closed';
    setTimeout(() => { try { if (flash.dataset.state === 'closed' && HAS_POPOVER) flash.hidePopover(); } catch { /* closed */ } }, 200);
  }, 1200);
}

async function onAnchor(event, anchor) {
  event.preventDefault();
  const id = decodeURIComponent(anchor.getAttribute('href').slice(1));
  const target = doc.getElementById(id);
  const url = new URL(location.href);
  url.hash = id;
  if (await copyText(url.href)) {
    anchor.dataset.state = 'done';
    setTimeout(() => { delete anchor.dataset.state; }, 1400);
    flashTip(anchor, 'Link copied');
    emit(anchor, 'fd:copy', { value: url.href });
  }
  try { history.replaceState(history.state, '', `#${id}`); } catch { /* sandboxed */ }
  target?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
}

function wrapTables(root) {
  scope(root, '.fd-prose > table').forEach((table) => {
    const wrap = doc.createElement('div');
    wrap.className = 'fd-doc-table';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', textOf(table.querySelector('caption')) || 'Table');
    table.before(wrap);
    wrap.append(table);
  });
}

/* ==========================================================================
   Copy page as Markdown
   ========================================================================== */
const abs = (href) => { try { return new URL(href, location.href).href; } catch { return href; } };
function inlineMd(node) {
  let out = '';
  for (const n of node.childNodes) {
    if (n.nodeType === 3) { out += n.textContent.replace(/\s+/g, ' '); continue; }
    if (n.nodeType !== 1 || n.matches('.fd-doc-anchor, svg, i[data-icon], button, .fd-sr-only, script, template')) continue;
    const tag = n.tagName;
    const inner = inlineMd(n);
    if (tag === 'CODE' || tag === 'KBD' || n.matches('.fd-schema-name, .fd-schema-type')) out += `\`${n.textContent.trim()}\``;
    else if (tag === 'A') out += `[${inner.trim()}](${abs(n.getAttribute('href') || '')})`;
    else if (tag === 'STRONG' || tag === 'B') out += `**${inner.trim()}**`;
    else if (tag === 'EM' || tag === 'I') out += `_${inner.trim()}_`;
    else if (tag === 'BR') out += '\n';
    else if (tag === 'INPUT' && n.type === 'checkbox') out += n.checked ? '[x] ' : '[ ] ';
    else out += inner;
  }
  return out;
}
const clean = (s) => s.replace(/[ \t]+\n/g, '\n').replace(/ {2,}/g, ' ').trim();
function codeText(code) {
  const lines = $$('.fd-codeblock-line', code);
  return lines.length ? lines.map((l) => l.textContent).join('\n') : code.textContent.replace(/^\n/, '').replace(/\s+$/, '');
}
const fence = (text, lang = '') => `\`\`\`${lang}\n${text}\n\`\`\``;

function listMd(list, depth = 0) {
  const ordered = list.tagName === 'OL';
  return $$(':scope > li', list).map((li, i) => {
    const marker = ordered ? `${i + 1}.` : '-';
    const pad = '  '.repeat(depth);
    const own = [];
    const nested = [];
    for (const child of li.childNodes) {
      if (child.nodeType === 1 && (child.tagName === 'UL' || child.tagName === 'OL')) nested.push(listMd(child, depth + 1));
      else if (child.nodeType === 1 && child.tagName === 'P') own.push(inlineMd(child));
      else if (child.nodeType === 1) own.push(inlineMd({ childNodes: [child] }));
      else own.push(child.textContent.replace(/\s+/g, ' '));
    }
    return `${pad}${marker} ${clean(own.join(' '))}${nested.length ? `\n${nested.join('\n')}` : ''}`;
  }).join('\n');
}
function tableMd(table) {
  const rows = $$('tr', table).map((tr) => $$('th, td', tr).map((c) => clean(inlineMd(c)).replace(/\|/g, '\\|')));
  if (!rows.length) return '';
  const head = rows[0];
  return [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.slice(1).map((r) => `| ${r.join(' | ')} |`)].join('\n');
}
function paramsMd(container, depth = 0) {
  return $$(':scope > .fd-schema-item', container).map((item) => {
    const pad = '  '.repeat(depth);
    const name = textOf($('.fd-schema-name', item));
    const meta = [textOf($('.fd-schema-type', item)), textOf($('.fd-doc-param-in', item)), $('.fd-schema-req', item) ? 'required' : ''].filter(Boolean).join(', ');
    const def = $('.fd-schema-default', item) ? ` ${clean(inlineMd($('.fd-schema-default', item)))}.` : '';
    const desc = $$(':scope > .fd-schema-desc', item).map((p) => clean(inlineMd(p))).join(' ');
    const values = $$(':scope > .fd-schema-enum .fd-schema-value', item).map((v) => `\`${v.textContent.trim()}\``).join(', ');
    const kids = $(':scope > .fd-schema-children', item);
    return `${pad}- \`${name}\`${meta ? ` (${meta})` : ''}: ${desc}${def}${values ? ` One of ${values}.` : ''}${kids ? `\n${paramsMd(kids, depth + 1)}` : ''}`;
  }).join('\n');
}

function blockMd(el) {
  if (el.nodeType === 3) return clean(el.textContent);
  if (el.nodeType !== 1 || el.hidden || el.matches('script, template, style, .fd-doc-anchor, .fd-doc-ask, .fd-doc-foot, .fd-doc-otp, .fd-doc-copy, .fd-menu, dialog, [data-md="skip"]')) return '';
  const tag = el.tagName;
  if (/^H[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${textOf(el)}`;
  if (el.matches('.fd-doc-params-title, .fd-doc-release-title')) return `## ${textOf(el)}`;
  if (el.matches('.fd-codeblock')) {
    const panes = $$(':scope > .fd-codeblock-body', el);
    const tabs = $$('.fd-codeblock-tab', el);
    return panes.map((p) => {
      const code = $('code', p);
      const label = tabs.find((t) => t.dataset.value === p.dataset.value)?.textContent.trim();
      return `${label && panes.length > 1 ? `**${label}**\n\n` : ''}${fence(codeText(code || p), code?.dataset.lang || '')}`;
    }).join('\n\n');
  }
  if (el.matches('.fd-snippet')) return fence(textOf($('.fd-snippet-text', el)), 'bash');
  if (el.matches('.fd-callout')) {
    const title = textOf($('.fd-callout-title', el));
    const body = clean(inlineMd($('.fd-callout-body', el) || el));
    return `> ${title ? `**${title}** ` : ''}${body}`;
  }
  if (el.matches('.fd-doc-frame')) {
    const img = $('img', el);
    const cap = textOf($('.fd-doc-frame-caption', el));
    return img ? `![${cap || img.alt}](${abs(img.getAttribute('src'))})` : cap ? `_${cap}_` : '';
  }
  if (el.matches('.fd-doc-cards')) {
    return $$(':scope > *', el).map((c) => {
      const title = textOf($('.fd-doc-card-title, .fd-title', c)) || textOf(c);
      const text = textOf($('.fd-doc-card-text, .fd-card-text', c));
      return `- ${c.getAttribute('href') ? `[${title}](${abs(c.getAttribute('href'))})` : `**${title}**`}${text ? `: ${text}` : ''}`;
    }).join('\n');
  }
  if (el.matches('.fd-doc-steps')) {
    return $$(':scope > .fd-doc-step', el).map((s, i) => `### ${i + 1}. ${textOf($('.fd-doc-step-title', s))}\n\n${children($('.fd-doc-step-body', s) || s)}`).join('\n\n');
  }
  if (el.matches('.fd-doc-tabs')) {
    return $$('.fd-tab', el).map((tab) => {
      const panel = doc.getElementById(tab.getAttribute('aria-controls') || '');
      return panel ? `**${textOf(tab)}**\n\n${children(panel)}` : '';
    }).filter(Boolean).join('\n\n');
  }
  if (el.matches('.fd-doc-setup')) {
    const title = textOf($('.fd-doc-setup-title', el));
    const rows = $$('.fd-doc-setup-tile', el).map((tile) => {
      const panel = $(`.fd-doc-setup-panel[data-value="${tile.dataset.value}"]`, el);
      const cmd = textOf($('.fd-snippet-text', panel || el));
      return `- **${textOf($('.fd-doc-setup-name', tile))}**${cmd ? `: \`${cmd}\`` : ''}`;
    });
    return `**${title}**\n\n${rows.join('\n')}`;
  }
  if (el.matches('.fd-doc-params')) return `## ${textOf($('.fd-doc-params-title', el))}\n\n${paramsMd($('.fd-schema', el) || el)}`;
  if (el.matches('.fd-doc-endpoint')) return fence(textOf($('.fd-doc-endpoint-path', el)).replace(/\s+/g, ' '), 'http');
  if (el.matches('.fd-doc-api-side')) return '';
  if (el.matches('.fd-doc-table')) return tableMd($('table', el));
  // Plain Markdown elements, after the components that reuse their tags (steps are an <ol>).
  if (tag === 'P') return clean(inlineMd(el));
  if (tag === 'UL' || tag === 'OL') return listMd(el);
  if (tag === 'PRE') return fence(codeText($('code', el) || el), $('code', el)?.dataset.lang || '');
  if (tag === 'BLOCKQUOTE') return children(el).split('\n').map((l) => `> ${l}`).join('\n');
  if (tag === 'HR') return '---';
  if (tag === 'TABLE') return tableMd(el);
  if (tag === 'DL') return $$(':scope > dt', el).map((dt) => `- **${textOf(dt)}**: ${clean(inlineMd(dt.nextElementSibling || dt))}`).join('\n');
  if (tag === 'DETAILS') return `**${textOf($('summary', el))}**\n\n${children($(':scope > :not(summary)', el) || el)}`;
  return children(el);
}
function children(el) {
  if (!el) return '';
  const blocks = [...el.childNodes].map(blockMd).filter((s) => s && s.trim());
  return blocks.join('\n\n');
}

/** The article as Markdown: title, lead, then every block in reading order. */
export function toMarkdown(article) {
  if (!article) return '';
  const title = textOf($('.fd-doc-title', article)) || textOf($('h1', article));
  const lead = textOf($('.fd-doc-lead', article));
  const body = [...article.children]
    .filter((c) => !c.matches('.fd-doc-head, .fd-doc-otp, .fd-doc-foot'))
    .map((c) => (c.matches('.fd-doc-api') ? [$('.fd-doc-endpoint', c), $('.fd-doc-api-body', c)].map((x) => (x ? blockMd(x) : '')).join('\n\n') : blockMd(c)))
    .filter(Boolean).join('\n\n');
  return `${title ? `# ${title}\n\n` : ''}${lead ? `${lead}\n\n` : ''}${body}`.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

const articleOf = (el) => el.closest('.fd-doc-article')
  || (el.closest('.fd-menu')?.dataset.for && doc.getElementById(el.closest('.fd-menu').dataset.for))
  || el.closest('.fd-doc')?.querySelector('.fd-doc-article')
  || $('.fd-doc-article');

async function copyPage(button) {
  const md = toMarkdown(articleOf(button));
  if (!md || !(await copyText(md))) return;
  const group = button.closest('.fd-doc-copy') || button;
  [group, button].forEach((el) => { el.dataset.state = 'done'; });
  clearTimeout(button.fdDocTimer);
  button.fdDocTimer = setTimeout(() => [group, button].forEach((el) => { delete el.dataset.state; }), 1400);
  emit(button, 'fd:copy', { value: md });
}

async function onCopyMenu(item, value) {
  const article = articleOf(item);
  const md = toMarkdown(article);
  const title = textOf($('.fd-doc-title', article)) || 'this page';
  if (value === 'copy-md') {
    if (await copyText(md)) toast({ title: 'Page copied as Markdown', description: `${md.split('\n').length.toLocaleString()} lines, ready to paste.`, tone: 'success' });
  } else if (value === 'view-md') {
    const url = URL.createObjectURL(new Blob([md], { type: 'text/plain;charset=utf-8' }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else if (value === 'open-ai') {
    const prompt = `Read the Ember docs page "${title}" below and help me use it.\n\n${md}`;
    if (await copyText(prompt)) toast({ title: 'Prompt copied', description: 'Paste it into your assistant to ask about this page.', tone: 'success' });
  } else if (value === 'mcp') {
    if (await copyText('https://mcp.ember.dev/v2/mcp')) toast({ title: 'MCP server URL copied', description: 'Add it to your agent as a remote MCP server.', tone: 'success' });
  } else return;
  emit(item, 'fd:copy', { value });
}

/* ==========================================================================
   Setup card
   ========================================================================== */
const setupTiles = (setup) => $$('.fd-doc-setup-tile', setup);
const setupPanelOf = (setup, tile) => doc.getElementById(tile.getAttribute('aria-controls') || '') || $(`.fd-doc-setup-panel[data-value="${tile.dataset.value}"]`, setup);

/** Select a tile of an .fd-doc-setup and show its panel. */
export function selectSetup(tile, { focus = false, silent = false } = {}) {
  const setup = tile.closest('.fd-doc-setup');
  if (!setup) return;
  const already = tile.getAttribute('aria-selected') === 'true';
  setupTiles(setup).forEach((t) => {
    const on = t === tile;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = setupPanelOf(setup, t);
    if (panel) panel.hidden = !on;
  });
  if (focus) tile.focus();
  if (!already && !silent) emit(setup, 'fd:change', { value: tile.dataset.value, item: tile });
}

function setupSetup(setup) {
  if (!once(setup, 'doc-setup')) return;
  const list = $('.fd-doc-setup-tiles', setup);
  list?.setAttribute('role', 'tablist');
  const tiles = setupTiles(setup);
  tiles.forEach((tile) => {
    tile.setAttribute('role', 'tab');
    if (tile.tagName === 'BUTTON') tile.type = 'button';
    const panel = setupPanelOf(setup, tile);
    if (panel) {
      tile.setAttribute('aria-controls', ensureId(panel, 'fd-doc-setup-panel'));
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', ensureId(tile, 'fd-doc-setup-tile'));
    }
  });
  const current = tiles.find((t) => t.getAttribute('aria-selected') === 'true') || tiles[0];
  if (current) selectSetup(current, { silent: true });
}

/* ==========================================================================
   API request / response panels
   ========================================================================== */
const LANG_KEY = 'fd-code-tab:lang';
const requestPanels = () => $$('.fd-doc-panel[data-kind="request"]');
const pickerMenus = (panel, kind) => $$(`.fd-menu[data-fd-doc-picker="${kind}"]`).filter((m) => m.dataset.for === panel.id);

function applyPanel(panel) {
  const panes = $$(':scope > .fd-codeblock-body', panel);
  const example = panel.dataset.example;
  const fits = (p) => !example || !p.dataset.example || p.dataset.example === example;
  const show = panes.find((p) => p.dataset.value === panel.dataset.lang && fits(p)) || panes.find(fits) || panes[0];
  panes.forEach((p) => { p.hidden = p !== show; });
}
function syncPicker(panel, kind, value) {
  pickerMenus(panel, kind).forEach((menu) => {
    let label = '';
    $$('[role="menuitemradio"]', menu).forEach((item) => {
      const on = item.dataset.value === value;
      item.setAttribute('aria-checked', String(on));
      if (on) label = textOf($('.fd-menu-item-label', item) || item);
    });
    $$(`[data-fd-menu="${menu.id}"] [data-fd-menu-value]`).forEach((slot) => { if (label) slot.textContent = label; });
  });
}

/** Show a request panel in `lang`. With persist, the choice also drives every code group on the page. */
export function setPanelLang(panel, lang, { persist = true } = {}) {
  if (!$(`:scope > .fd-codeblock-body[data-value="${lang}"]`, panel)) return false;
  const changed = panel.dataset.lang !== lang;
  panel.dataset.lang = lang;
  applyPanel(panel);
  syncPicker(panel, 'lang', lang);
  if (persist) {
    store.set(LANG_KEY, lang);
    $$('.fd-codeblock').forEach((block) => {
      if (block === panel) return;
      if (block.matches('.fd-doc-panel[data-kind="request"]')) setPanelLang(block, lang, { persist: false });
      else if ((block.dataset.sync || 'lang') === 'lang' && $('.fd-codeblock-tabs', block)) selectTab(block, lang, { persist: false });
    });
    if (changed) emit(panel, 'fd:change', { value: lang });
  }
  return true;
}
/** Show a request panel's named example. */
export function setPanelExample(panel, example) {
  panel.dataset.example = example;
  applyPanel(panel);
  syncPicker(panel, 'example', example);
  emit(panel, 'fd:change', { value: example });
}

function setupPanel(panel) {
  if (!once(panel, 'doc-panel')) return;
  ensureId(panel, 'fd-doc-panel');
  if (panel.dataset.kind === 'request') {
    const stored = store.get(LANG_KEY);
    const first = $(':scope > .fd-codeblock-body[data-value]', panel)?.dataset.value;
    const lang = (stored && $(`:scope > .fd-codeblock-body[data-value="${stored}"]`, panel)) ? stored : panel.dataset.lang || first;
    if (!panel.dataset.example) panel.dataset.example = $(':scope > .fd-codeblock-body[data-example]', panel)?.dataset.example || '';
    panel.dataset.lang = lang || '';
    applyPanel(panel);
    syncPicker(panel, 'lang', panel.dataset.lang);
    if (panel.dataset.example) syncPicker(panel, 'example', panel.dataset.example);
  }
  if (panel.dataset.kind === 'response') {
    panel.addEventListener('scroll', (event) => { if (event.target.matches?.('.fd-codeblock-body')) updateFade(panel); }, { capture: true, passive: true });
    updateFade(panel);
  }
}
function updateFade(panel) {
  const pane = $$(':scope > .fd-codeblock-body', panel).find((p) => !p.hidden);
  const end = !pane || pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 4;
  panel.toggleAttribute('data-at-end', end);
}

/* ==========================================================================
   Helpful vote, zoom, endpoint, changelog, search snippets
   ========================================================================== */
function vote(button) {
  const box = button.closest('.fd-doc-helpful');
  if (!box) return;
  const value = button.dataset.fdDocVote;
  box.dataset.state = 'voted';
  box.dataset.value = value;
  const thanks = $('.fd-doc-helpful-thanks', box);
  const form = $('.fd-doc-helpful-form', box);
  if (thanks) {
    const text = $('[data-fd-doc-thanks-text]', thanks) || thanks;
    text.textContent = value === 'yes' ? 'Thanks for letting us know.' : 'Thanks. What was missing or wrong?';
    thanks.hidden = false;
  }
  if (form && value === 'no') {
    form.hidden = false;
    $('textarea', form)?.focus();
  } else {
    thanks?.setAttribute('tabindex', '-1');
    thanks?.focus({ preventScroll: true });
  }
  emit(box, 'fd:change', { value });
}
async function sendFeedback(form) {
  const box = form.closest('.fd-doc-helpful');
  const send = $('button[type="submit"]', form);
  const area = $('textarea', form);
  if (area && !area.value.trim()) { area.setAttribute('aria-invalid', 'true'); area.focus(); return; }
  area?.removeAttribute('aria-invalid');
  send?.setAttribute('aria-busy', 'true');
  await wait(700);
  send?.removeAttribute('aria-busy');
  form.hidden = true;
  const thanks = box && $('.fd-doc-helpful-thanks', box);
  if (thanks) {
    ($('[data-fd-doc-thanks-text]', thanks) || thanks).textContent = 'Sent. The docs team reads every note.';
    thanks.setAttribute('tabindex', '-1');
    thanks.focus({ preventScroll: true });
  }
  if (box) emit(box, 'fd:change', { value: 'sent' });
}

let zoomDialog;
function openZoom(media) {
  const frame = media.closest('.fd-doc-frame');
  if (!zoomDialog?.isConnected) {
    zoomDialog = doc.createElement('dialog');
    zoomDialog.className = 'fd-dialog fd-doc-zoom';
    zoomDialog.setAttribute('aria-label', 'Image');
    zoomDialog.innerHTML = `<div class="fd-doc-zoom-body"></div>`;
    doc.body.append(zoomDialog);
  }
  const body = $('.fd-doc-zoom-body', zoomDialog);
  const shown = media.firstElementChild?.cloneNode(true);
  if (!shown) return;
  shown.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  shown.querySelectorAll('.fd-ascii').forEach((n) => n.remove());
  const caption = textOf($('.fd-doc-frame-caption', frame));
  body.replaceChildren();
  body.insertAdjacentHTML('beforeend', `<button class="fd-btn fd-doc-zoom-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close">${icon('x')}</button>`);
  body.append(shown);
  if (caption) body.insertAdjacentHTML('beforeend', `<p class="fd-doc-zoom-caption">${esc(caption)}</p>`);
  zoomDialog.setAttribute('aria-label', caption || 'Image');
  openDialog(zoomDialog, { trigger: media });
}
function setupZoom(frame) {
  if (!once(frame, 'doc-zoom')) return;
  syncZoom(frame);
}
const zoomable = (media) => { const f = media.closest('.fd-doc-frame'); return !f.hasAttribute('data-fd-src') || f.dataset.state === 'loaded'; };
/* A zoomable frame opens its media as a button. A frame with its own picture is one only while the picture shows. */
function syncZoom(frame) {
  const media = $('.fd-doc-frame-media', frame);
  if (!media || !frame.hasAttribute('data-zoom')) return;
  if (frame.hasAttribute('data-fd-src') && frame.dataset.state !== 'loaded') {
    media.removeAttribute('tabindex');
    media.removeAttribute('role');
    media.removeAttribute('aria-label');
    return;
  }
  media.tabIndex = 0;
  media.setAttribute('role', 'button');
  media.setAttribute('aria-label', `Enlarge: ${textOf($('.fd-doc-frame-caption', frame)) || $('img', media)?.alt || 'image'}`);
}

/* ---------- Picture: an address that passed the allow-list, a tile when it did not ---------- */
const PICTURE_TEXT = {
  empty: (frame) => label(frame, 'frame.empty', 'No picture'),
  refused: (frame) => label(frame, 'frame.refused', "This address isn't allowed"),
  failed: (frame) => label(frame, 'frame.failed', "The picture didn't load"),
};
const PICTURE_ICON = { empty: 'image', refused: 'shield-alert', failed: 'image' };
function pictureState(frame, state) {
  frame.dataset.state = state;
  if (state === 'loading') frame.setAttribute('aria-busy', 'true'); else frame.removeAttribute('aria-busy');
  syncZoom(frame);
  emit(frame, 'fd:change', { value: state });
}
function pictureTile(frame, state) {
  const media = $('.fd-doc-frame-media', frame);
  $('.fd-doc-frame-placeholder', media)?.remove();
  if (!PICTURE_TEXT[state]) return;
  const text = PICTURE_TEXT[state](frame);
  media.insertAdjacentHTML('beforeend', `<div class="fd-doc-frame-placeholder" role="img" aria-label="${esc(`${frame.dataset.fdAlt || ''} ${text}`.trim())}">${icon(PICTURE_ICON[state])}<span>${esc(text)}</span></div>`);
}
/** Point a picture frame at an address. It is checked first; "" or null shows the empty tile. */
export function setPicture(frame, url) {
  if (!frame) return;
  if (url !== undefined) frame.setAttribute('data-fd-src', url ?? '');
  const media = $('.fd-doc-frame-media', frame) || frame.insertAdjacentElement('afterbegin', Object.assign(doc.createElement('div'), { className: 'fd-doc-frame-media' }));
  $('img', media)?.remove();
  const raw = (frame.getAttribute('data-fd-src') || '').trim();
  if (!raw) { pictureTile(frame, 'empty'); pictureState(frame, 'empty'); return; }
  const safe = safeImageUrl(raw, { hosts: (frame.dataset.fdHosts || '').split(/[\s,]+/).filter(Boolean), data: frame.hasAttribute('data-fd-data') });
  if (!safe) { pictureTile(frame, 'refused'); pictureState(frame, 'refused'); return; }
  pictureTile(frame, null);
  const img = doc.createElement('img');
  img.alt = frame.dataset.fdAlt || textOf($('.fd-doc-frame-caption', frame)) || '';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  let settled = false;
  const done = (ok) => {
    if (settled || img.parentNode !== media) return;
    settled = true;
    if (!ok) { img.remove(); pictureTile(frame, 'failed'); }
    pictureState(frame, ok ? 'loaded' : 'failed');
  };
  img.addEventListener('load', () => done(true), { once: true });
  img.addEventListener('error', () => done(false), { once: true });
  media.prepend(img);
  pictureState(frame, 'loading');
  img.src = safe;
  if (img.complete && img.naturalWidth) done(true);
}

function setupEndpoint(url) {
  if (!once(url, 'doc-endpoint') || url.children.length) return;
  url.innerHTML = esc(url.textContent).replace(/\{[^}]+\}/g, (m) => `<span class="fd-doc-endpoint-param">${m}</span>`);
}

function filterReleases(nav, value) {
  const root = nav.closest('.fd-doc-changelog');
  if (!root) return;
  let shown = 0;
  $$('.fd-doc-release', root).forEach((rel) => {
    const tags = (rel.dataset.tags || '').split(/\s+/);
    const on = value === 'all' || tags.includes(value);
    rel.hidden = !on;
    if (on) shown += 1;
  });
  const empty = $('.fd-doc-releases-empty', root);
  if (empty) empty.hidden = shown > 0;
}

function snippet(text, q) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return null;
  const start = Math.max(0, text.lastIndexOf(' ', Math.max(0, i - 28)) + 1);
  const end = Math.min(text.length, i + q.length + 48);
  return `${start > 0 ? '…' : ''}${esc(text.slice(start, i))}<mark class="fd-doc-hit">${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length, end))}${end < text.length ? '…' : ''}`;
}
function onSearchInput(input) {
  const palette = input.closest('.fd-command[data-fd-doc-search]');
  if (!palette) return;
  const q = input.value.trim();
  $$('.fd-command-item[data-fd-doc-text]', palette).forEach((item) => {
    const hint = $('.fd-command-item-hint', item);
    if (!hint) return;
    if (hint.dataset.fdDocHint === undefined) hint.dataset.fdDocHint = hint.innerHTML;
    const label = item.dataset.label || textOf($('.fd-command-item-label', item));
    const html = q.length >= 2 && !label.toLowerCase().includes(q.toLowerCase()) ? snippet(item.dataset.fdDocText, q) : null;
    hint.innerHTML = html || hint.dataset.fdDocHint;
    hint.classList.toggle('fd-mono', !html && hint.dataset.fdDocMono === '');
  });
}

/* ==========================================================================
   Try it — a scripted playground in a sheet
   ========================================================================== */
function paramRows(source) {
  return $$('.fd-doc-params[data-in="body"], .fd-doc-params[data-in="query"], .fd-doc-params[data-in="path"]', source)
    .flatMap((section) => $$(':scope > .fd-schema > .fd-doc-param', section).filter((item) => item.dataset.try !== 'false').map((item) => ({
      where: section.dataset.in,
      name: textOf($('.fd-schema-name', item)),
      type: textOf($('.fd-schema-type', item)).toLowerCase(),
      required: !!$('.fd-schema-req', item),
      def: textOf($('.fd-schema-default code', item)),
      values: $$(':scope > .fd-schema-enum .fd-schema-value', item).map((v) => v.textContent.trim()),
      hint: textOf($(':scope > .fd-schema-desc', item)).split(/(?<=\.)\s/)[0],
      example: item.dataset.example || '',
    })));
}
function fieldHTML(p, form) {
  const id = `${form.id}-${p.where}-${slugify(p.name)}`;
  const req = p.required ? ' <span class="fd-schema-req">required</span>' : '';
  const hint = p.hint ? `<p class="fd-field-hint" id="${id}-hint">${esc(p.hint)}</p>` : '';
  const described = p.hint ? ` aria-describedby="${id}-hint"` : '';
  const name = esc(p.name);
  if (p.type.includes('boolean')) {
    return `<label class="fd-checkbox"><input type="checkbox" name="${name}" data-type="boolean"${p.def === 'true' ? ' checked' : ''}${described}><span class="fd-checkbox-box"></span><span class="fd-checkbox-text"><span class="fd-checkbox-label fd-mono">${name}</span>${p.hint ? `<span class="fd-checkbox-desc" id="${id}-hint">${esc(p.hint)}</span>` : ''}</span></label>`;
  }
  if (p.values.length && p.type.includes('[]')) {
    const defs = p.def.replace(/[[\]"']/g, '').split(',').map((s) => s.trim());
    return `<fieldset class="fd-field"><legend class="fd-field-label fd-mono">${name}${req}</legend><div class="fd-doc-try-checks">${p.values.map((v) => `<label class="fd-checkbox"><input type="checkbox" name="${name}" value="${esc(v)}" data-type="list"${defs.includes(v) ? ' checked' : ''}><span class="fd-checkbox-box"></span><span class="fd-checkbox-text"><span class="fd-checkbox-label fd-mono">${esc(v)}</span></span></label>`).join('')}</div>${hint}</fieldset>`;
  }
  const head = `<div class="fd-field-head"><label class="fd-field-label" for="${id}"><span class="fd-mono">${name}</span>${req}</label></div>`;
  const error = p.required ? `<p class="fd-field-error" id="${id}-error" hidden>Enter a value for ${name}.</p>` : '';
  if (p.values.length) {
    return `<div class="fd-field">${head}<label class="fd-select" data-block><select id="${id}" name="${name}"${described}>${p.values.map((v) => `<option${v === p.def.replace(/"/g, '') ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>${hint}</div>`;
  }
  if (p.type.includes('object') || p.type.includes('[]')) {
    return `<div class="fd-field">${head}<textarea class="fd-textarea" data-mono rows="3" id="${id}" name="${name}" data-type="json" placeholder="${esc(p.def || (p.type.includes('[]') ? '[]' : '{}'))}"${described}></textarea>${hint}</div>`;
  }
  const number = /integer|number/.test(p.type);
  const value = p.example || (p.def && !p.def.startsWith('{') ? p.def.replace(/"/g, '') : '');
  return `<div class="fd-field">${head}<input class="fd-input" data-mono id="${id}" name="${name}" type="${number ? 'number' : p.type.includes('uri') ? 'url' : 'text'}"${number ? ' data-type="number"' : ''} value="${esc(value)}"${p.required ? ' required' : ''} autocomplete="off" spellcheck="false"${p.hint ? ` aria-describedby="${id}-hint${p.required ? ` ${id}-error` : ''}"` : ''}>${hint}${error}</div>`;
}
function setupTry(sheet) {
  if (!once(sheet, 'doc-try')) return;
  const form = $('form[data-fd-doc-try-form]', sheet);
  const fields = form && $('[data-fd-doc-try-fields]', form);
  if (!form) return;
  ensureId(form, 'fd-doc-try-form');
  form.noValidate = true;
  if (fields && !fields.children.length) {
    const source = (sheet.dataset.params && doc.querySelector(sheet.dataset.params)) || doc;
    fields.innerHTML = paramRows(source).map((p) => fieldHTML(p, form)).join('');
  }
}
function readForm(form) {
  const body = {};
  for (const el of form.elements) {
    if (!el.name || el.matches('[data-fd-doc-try-key]')) continue;
    if (el.dataset.type === 'boolean') body[el.name] = el.checked;
    else if (el.dataset.type === 'list') { body[el.name] ||= []; if (el.checked) body[el.name].push(el.value); }
    else if (el.dataset.type === 'number') { if (el.value !== '') body[el.name] = Number(el.value); }
    else if (el.dataset.type === 'json') { if (el.value.trim()) { try { body[el.name] = JSON.parse(el.value); } catch { body[el.name] = el.value; } } }
    else if (el.value !== '') body[el.name] = el.value;
  }
  return body;
}
async function runTry(form) {
  const sheet = form.closest('.fd-doc-try');
  const send = $$('button[type="submit"]', sheet).find((b) => !b.form || b.form === form);
  if (send?.getAttribute('aria-busy') === 'true') return;
  // Validate the required fields first.
  let invalid = null;
  $$('input[required]', form).forEach((input) => {
    const bad = !input.value.trim() || (input.type === 'url' && !/^https?:\/\/\S+\.\S+/.test(input.value.trim()));
    input.setAttribute('aria-invalid', String(bad));
    const error = doc.getElementById(`${input.id}-error`);
    if (error) { error.hidden = !bad; if (bad) error.textContent = input.value.trim() ? 'Enter a full URL, starting with https://.' : `Enter a value for ${input.name}.`; }
    if (bad && !invalid) invalid = input;
  });
  if (invalid) { invalid.focus(); return; }
  const result = $('.fd-doc-try-result', sheet);
  const key = $('[data-fd-doc-try-key]', form)?.value.trim();
  const body = readForm(form);
  send?.setAttribute('aria-busy', 'true');
  if (result) result.setAttribute('aria-busy', 'true');
  const started = performance.now();
  await wait(reducedMotion() ? 300 : 900 + Math.round(Math.random() * 500));
  const elapsed = ((performance.now() - started) / 1000 + 0.4).toFixed(2);
  send?.removeAttribute('aria-busy');
  if (!result) return;
  let status = 200;
  let data;
  if (!key) {
    status = 401;
    data = { success: false, error: 'Unauthorized: add an API key in the Authorization field. Keys start with em-.' };
  } else {
    try { data = JSON.parse($('script[data-fd-doc-try-response]', sheet)?.textContent || '{}'); } catch { data = {}; }
    const url = body.url || body.query;
    if (data?.data?.metadata && url) { data.data.metadata.sourceURL = url; data.data.metadata.url = url; }
    if (data?.data && Array.isArray(body.formats) && body.formats.length) {
      for (const f of ['markdown', 'html', 'rawHtml', 'links', 'screenshot']) if (f in data.data && !body.formats.includes(f)) delete data.data[f];
    }
  }
  const meta = $('.fd-doc-try-meta', result);
  if (meta) {
    const ok = status < 400;
    meta.innerHTML = `<span class="fd-status" data-variant="pill" data-size="sm" data-tone="${ok ? 'success' : 'danger'}">${status} ${ok ? 'OK' : 'Unauthorized'}</span><span><span class="fd-mono">${elapsed} s</span></span>${ok ? '<span><span class="fd-mono">1</span> credit</span>' : ''}`;
  }
  const json = $('.fd-json', result);
  if (json) renderJSON(json, data, { depth: 2, truncate: 72 });
  result.hidden = false;
  result.removeAttribute('aria-busy');
  result.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  emit(sheet, 'fd:change', { value: status });
}

/* ==========================================================================
   Delegation (bound once)
   ========================================================================== */
function onClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const group = target.closest('.fd-doc-nav-item[aria-expanded]');
  if (group) { event.preventDefault(); setNavGroup(group, group.getAttribute('aria-expanded') !== 'true'); return; }

  const opener = target.closest('[data-fd-doc-nav-open]');
  if (opener) { event.preventDefault(); openNavSheet(opener); return; }

  // A link chosen in the nav sheet or the "On this page" disclosure closes it.
  const sheetLink = target.closest('.fd-doc-sheet a[href]');
  if (sheetLink) { const sheet = sheetLink.closest('.fd-doc-sheet'); if (sheet?.open) closeDialog(sheet); }
  const otpLink = target.closest('.fd-doc-otp-list > a');
  if (otpLink) { const details = otpLink.closest('details'); if (details?.open) toggleDetails(details, false); }

  const anchor = target.closest('.fd-doc-anchor');
  if (anchor) { onAnchor(event, anchor); return; }

  const copyBtn = target.closest('[data-fd-doc-copy-page]');
  if (copyBtn) { copyPage(copyBtn); return; }

  const tile = target.closest('.fd-doc-setup-tile');
  if (tile) { selectSetup(tile); return; }

  const voteBtn = target.closest('[data-fd-doc-vote]');
  if (voteBtn) { vote(voteBtn); return; }

  const media = target.closest('.fd-doc-frame[data-zoom] .fd-doc-frame-media');
  if (media && zoomable(media) && !target.closest('a, button:not(.fd-doc-frame-play)')) { openZoom(media); }
}

function onKeydown(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const tile = target.closest('.fd-doc-setup-tile');
  if (tile) {
    const tiles = setupTiles(tile.closest('.fd-doc-setup'));
    const i = tiles.indexOf(tile);
    const rtl = getComputedStyle(tile).direction === 'rtl';
    const next = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 1, ArrowUp: -1 }[event.key];
    let to = null;
    if (next) to = tiles[(i + next + tiles.length) % tiles.length];
    else if (event.key === 'Home') to = tiles[0];
    else if (event.key === 'End') to = tiles[tiles.length - 1];
    if (to) { event.preventDefault(); selectSetup(to, { focus: true }); }
    return;
  }
  if ((event.key === 'Enter' || event.key === ' ') && target.matches('.fd-doc-frame[data-zoom] .fd-doc-frame-media') && zoomable(target)) {
    event.preventDefault();
    openZoom(target);
  }
}

function onSelect(event) {
  const item = event.target instanceof Element ? event.target : null;
  const menu = item?.closest('.fd-menu');
  if (!menu) return;
  const value = event.detail?.value ?? item.dataset.value;
  if (menu.matches('[data-fd-doc-copy-menu]')) { onCopyMenu(item, value); return; }
  const kind = menu.dataset.fdDocPicker;
  const panel = kind && doc.getElementById(menu.dataset.for || '');
  if (!panel) return;
  if (kind === 'lang') setPanelLang(panel, value);
  else if (kind === 'example') setPanelExample(panel, value);
}

function onChange(event) {
  const el = event.target instanceof Element ? event.target : null;
  if (!el) return;
  // A language tab chosen in any synced code group moves every request panel with it.
  if (el.matches('.fd-codeblock:not(.fd-doc-panel)') && (el.dataset.sync || 'lang') === 'lang' && event.detail?.value) {
    requestPanels().forEach((p) => setPanelLang(p, event.detail.value, { persist: false }));
  }
  if (el.matches('.fd-doc-panel[data-kind="response"]')) requestAnimationFrame(() => updateFade(el));
  if (el.matches('.fd-doc-changelog-filters')) filterReleases(el, event.detail?.value || 'all');
}

function onSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.matches('[data-fd-doc-try-form]')) { event.preventDefault(); runTry(form); }
  else if (form.matches('.fd-doc-helpful-form')) { event.preventDefault(); sendFeedback(form); }
}

function onResize() {
  $$('.fd-doc-sheet[open]').forEach((sheet) => {
    const home = sheetHome.get(sheet);
    if (home?.nav && getComputedStyle(home.nav).display !== 'none') closeDialog(sheet);
  });
}

function bindGlobal() {
  if (!once(doc, 'fd-docsite')) return;
  doc.addEventListener('click', onClick);
  doc.addEventListener('keydown', onKeydown);
  doc.addEventListener('fd:select', onSelect);
  doc.addEventListener('fd:change', onChange);
  doc.addEventListener('submit', onSubmit);
  doc.addEventListener('input', (event) => {
    const t = event.target;
    if (t instanceof Element && t.matches('.fd-command-input')) onSearchInput(t);
    if (t instanceof Element && t.matches('.fd-doc-try [aria-invalid="true"]') && t.value.trim()) {
      t.setAttribute('aria-invalid', 'false');
      const error = doc.getElementById(`${t.id}-error`);
      if (error) error.hidden = true;
    }
  });
  addEventListener('resize', onResize, { passive: true });
}

/* ==========================================================================
   Init
   ========================================================================== */
export function init(root = doc) {
  bindGlobal();
  wrapTables(root);
  scope(root, '.fd-doc-article').forEach(anchorHeadings);
  scope(root, '.fd-prose').forEach((p) => { if (!p.closest('.fd-doc-article')) anchorHeadings(p); });
  buildToc(root);
  scope(root, '.fd-doc-nav').forEach(setupNav);
  scope(root, '.fd-doc-setup').forEach(setupSetup);
  scope(root, '.fd-doc-panel').forEach(setupPanel);
  scope(root, '.fd-doc-frame[data-fd-src]').forEach((frame) => { if (once(frame, 'doc-picture')) setPicture(frame); });
  scope(root, '.fd-doc-frame[data-zoom]').forEach(setupZoom);
  scope(root, '.fd-doc-endpoint-url').forEach(setupEndpoint);
  scope(root, '.fd-doc-try').forEach(setupTry);
  scope(root, '.fd-doc-changelog-filters').forEach((nav) => {
    if (!once(nav, 'doc-changelog')) return;
    const current = $('[aria-pressed="true"], [aria-current]', nav);
    if (current) filterReleases(nav, current.dataset.value || 'all');
  });
  $$('.fd-command[data-fd-doc-search] .fd-command-item-hint.fd-mono', root === doc ? doc : root).forEach((h) => { h.dataset.fdDocMono = ''; });
}
