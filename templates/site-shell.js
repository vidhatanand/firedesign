/* Ember website shell for the site templates (site-home, site-pricing, site-customers, site-changelog, and in 0.8
 * the publishing pages site-blog, site-post, site-resources, site-report, site-research, site-newsletter).
 *
 *   <html lang="en" data-fd-surface="website">
 *   <body data-site-shell data-active="home|pricing|customers|changelog|blog|resources|post|newsletter|report|research"
 *         [data-header="inline|centered"] [data-footer="columns|compact|wordmark"] [data-footer-signup]>
 *
 * A page inside a section of the site (post and newsletter under Blog, report and research under Resources) marks
 * its section's header link aria-current="true". data-footer-signup adds the newsletter sign-up column to the
 * columns footer (a .fd-site-footer-signup holding the one sign-up form, fire/js/site.js).
 *     <main> …section.fd-site-section… </main>
 *     <script type="module" src="../fire/fire.js"></script>
 *     <script type="module" src="./site-shell.js"></script>
 *
 * On load the page's <main> moves into div.fd-site between the site header and the site footer, written once here, so
 * the four pages link to each other through the same chrome, with a skip link (fd-skip) to the main first in <body>. The bare page stays hidden until then
 * (body[data-site-shell=""] in fire/components/site.css, the way docs-shell.js does it), and is shown anyway after a
 * moment if this script never runs. Or call it yourself:
 *
 *   import { mountSite } from './site-shell.js';
 *   mountSite({ active: 'pricing', header: 'inline', footer: 'columns' });
 *
 * renderHeader(options), renderFooter(options) and renderSignup() return the markup as strings (no DOM needed).
 * Links are relative to templates/. Ids: site-nav (the header's links), site-menu-product (the Product menu).
 */
import { EMBER_MARK, addSkipLink } from './shell.js';

export const PAGES = [
  { id: 'home', label: 'Home', href: 'site-home.html' },
  { id: 'pricing', label: 'Pricing', href: 'site-pricing.html' },
  { id: 'customers', label: 'Customers', href: 'site-customers.html' },
  { id: 'changelog', label: 'Changelog', href: 'site-changelog.html' },
  { id: 'blog', label: 'Blog', href: 'site-blog.html' },
  { id: 'resources', label: 'Resources', href: 'site-resources.html' },
];
/** Pages that sit inside a section of the site: the section's link is current while they are open. */
export const SECTION_OF = { post: 'blog', newsletter: 'blog', report: 'resources', research: 'resources' };
const href = (id) => PAGES.find((p) => p.id === id)?.href || '#';

const PRODUCT = [
  { icon: 'globe', label: 'Scrape', href: 'site-home.html#endpoints' },
  { icon: 'workflow', label: 'Crawl', href: 'site-home.html#endpoints' },
  { icon: 'braces', label: 'Extract', href: 'site-home.html#endpoints' },
  { icon: 'radar', label: 'Monitor', href: 'site-home.html#endpoints' },
];

const COLUMNS = [
  { label: 'Product', links: [['Endpoints', 'site-home.html#endpoints'], ['Pricing', href('pricing')], ['Changelog', href('changelog')], ['Playground', 'playground.html']] },
  { label: 'Developers', links: [['Docs', 'docs-home.html'], ['API reference', 'docs-api.html'], ['Guides', 'docs-guide.html'], ['Status', 'status.html']] },
  { label: 'Read', links: [['Blog', href('blog')], ['Resources', href('resources')], ['Research', 'site-research.html'], ['Newsletter', 'site-newsletter.html']] },
  { label: 'Company', links: [['Customers', href('customers')], ['Support', 'support.html'], ['Sign in', 'auth.html']] },
];

const i = (name) => `<i data-icon="${name}"></i>`;
const current = (id, active) => (id === active ? ' aria-current="page"' : SECTION_OF[active] === id ? ' aria-current="true"' : '');

export function brand() {
  return `<a class="fd-brand" href="${href('home')}" aria-label="Ember home"><span class="fd-brand-mark">${EMBER_MARK}</span><span class="fd-brand-name">Ember</span></a>`;
}

export function renderHeader({ active = '', layout = 'inline' } = {}) {
  const menu = PRODUCT.map((p) => `<a class="fd-menu-item" role="menuitem" href="${p.href}">${i(p.icon)}${p.label}</a>`).join('');
  const link = (id, label, url = href(id)) => `<li><a class="fd-site-header-link" href="${url}"${current(id, active)}>${label}</a></li>`;
  return `<header class="fd-site-header" data-layout="${layout}">
  <div class="fd-site-container"><div class="fd-site-header-bar">
    ${brand()}
    <nav class="fd-site-header-nav" id="site-nav" aria-label="Main">
      <ul class="fd-site-header-links">
        <li><button class="fd-site-header-link" type="button" data-fd-menu="site-menu-product" aria-haspopup="menu" aria-expanded="false">Product${i('chevron-down')}</button>
          <div class="fd-menu" id="site-menu-product" popover role="menu">${menu}</div></li>
        ${link('docs', 'Docs', 'docs-home.html')}
        ${link('pricing', 'Pricing')}
        ${link('customers', 'Customers')}
        ${link('blog', 'Blog')}
        ${link('resources', 'Resources')}
        ${link('changelog', 'Changelog')}
        <li data-sheet><a class="fd-site-header-link" href="auth.html">Sign in</a></li>
      </ul>
    </nav>
    <div class="fd-site-header-actions">
      <a class="fd-btn" data-variant="ghost" href="auth.html">Sign in</a>
      <a class="fd-btn" data-variant="primary" href="auth.html">Start free</a>
      <button class="fd-btn fd-site-header-toggle" type="button" data-variant="ghost" data-icon-only aria-expanded="false" aria-controls="site-nav" aria-label="Menu">${i('menu')}${i('x')}</button>
    </div>
  </div></div>
</header>`;
}

const legal = (status = true) => `<div class="fd-site-footer-legal"><span>© 2026 Ember Labs, Inc.</span><div class="fd-row"><a href="support.html">Privacy</a><a href="support.html">Terms</a><a href="support.html">DPA</a>${status ? `<a class="fd-service-status" data-status="operational" href="status.html" data-fd-tooltip="All systems operational">${i('activity')}<span class="fd-service-status-label">All systems operational</span></a>` : ''}</div></div>`;

/** The newsletter sign-up as a footer column: the same form as fd-site-cta split and an article's foot. */
export function renderSignup({ id = 'footer-signup' } = {}) {
  return `<div class="fd-site-footer-signup"><p class="fd-site-footer-col-title" id="${id}-title">Newsletter</p><p class="fd-site-footer-text">What shipped and what we measured, on the first Tuesday of each month.</p>`
    + `<form class="fd-site-cta-form" action="#" novalidate aria-labelledby="${id}-title"><div class="fd-field"><label class="fd-field-label fd-sr-only" for="${id}-email">Work email</label><div class="fd-row" data-gap="2"><input class="fd-input" id="${id}-email" name="email" type="email" required autocomplete="email" placeholder="dana@quarry.dev" data-error-type="Use a full address, like dana@quarry.dev."><button class="fd-btn" data-variant="primary" type="submit">Subscribe</button></div><p class="fd-field-error" id="${id}-error" hidden></p></div>`
    + `<p class="fd-site-cta-done" role="status" data-state="sent" hidden>${i('circle-check')}<span>Check your inbox to confirm. The next issue goes out Dec 1.</span></p>`
    + `<p class="fd-site-cta-done" role="status" data-state="subscribed" hidden>${i('info')}<span>That address is already subscribed. The next issue goes out Dec 1.</span></p></form></div>`;
}

export function renderFooter({ layout = 'columns', signup = false } = {}) {
  if (layout === 'compact') {
    const links = [['Docs', 'docs-home.html'], ['Pricing', href('pricing')], ['Customers', href('customers')], ['Blog', href('blog')], ['Resources', href('resources')], ['Status', 'status.html'], ['Privacy', 'support.html'], ['Terms', 'support.html']]
      .map(([label, url]) => `<a href="${url}">${label}</a>`).join('');
    return `<footer class="fd-site-footer" data-layout="compact"><div class="fd-site-container">${brand()}<div class="fd-site-footer-legal"><nav class="fd-row" data-wrap aria-label="Footer">${links}</nav><span>© 2026 Ember Labs, Inc.</span></div></div></footer>`;
  }
  const cols = COLUMNS.map((c) => `<nav class="fd-site-footer-col" aria-label="${c.label}"><p class="fd-site-footer-col-title">${c.label}</p>${c.links.map(([label, url]) => `<a href="${url}">${label}</a>`).join('')}</nav>`).join('');
  const wordmark = layout === 'wordmark' ? '<p class="fd-site-footer-wordmark" aria-hidden="true">Ember</p>' : '';
  const form = signup && layout === 'columns' ? renderSignup() : '';
  return `<footer class="fd-site-footer" data-layout="${layout}"><div class="fd-site-container"><div class="fd-site-footer-brand">${brand()}<p class="fd-site-footer-text">Web data for agents, and for the people who build them.</p></div><div class="fd-site-footer-cols">${cols}</div>${form}${legal()}${wordmark}</div></footer>`;
}

/** Wrap the page's <main> in the site shell. Returns the .fd-site element. */
export function mountSite({ active, header, footer, signup } = {}) {
  const body = document.body;
  const existing = body.querySelector(':scope > .fd-site');
  if (existing) return existing;
  const id = active ?? body.dataset.active ?? '';
  const main = body.querySelector('main') || document.createElement('main');
  const t = document.createElement('template');
  t.innerHTML = `<div class="fd-site">${renderHeader({ active: id, layout: header ?? body.dataset.header ?? 'inline' })}<template data-slot></template>${renderFooter({ layout: footer ?? body.dataset.footer ?? 'columns', signup: signup ?? body.hasAttribute('data-footer-signup') })}</div>`;
  const site = t.content.firstElementChild;
  site.querySelector('template[data-slot]').replaceWith(main);
  body.prepend(site);
  addSkipLink(main);
  body.setAttribute('data-site-shell', 'mounted');

  // fire.js initialises the document once on load; if that already happened, initialise the new markup.
  if (document.documentElement.hasAttribute('data-fd-ready')) {
    import('../fire/fire.js')
      .then((fire) => fire.init(site))
      .catch((error) => console.error('[ember] site shell init failed', error));
  }
  return site;
}

if (typeof document !== 'undefined' && document.body?.hasAttribute('data-site-shell') && document.body.dataset.siteShell !== 'mounted') {
  mountSite();
}
