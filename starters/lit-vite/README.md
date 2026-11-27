# Fire starter: Lit + Vite

The default starter for a new Fire app. [Lit](https://lit.dev) components that render to the light DOM, Vite,
TypeScript, no other framework. Copy this folder and you have an app shell, a router that a product with a few
hundred routes can keep (parameters, guards, screens loaded on first visit, not-found, a base path), three real
screens, a production build split per route, and the checks that prove the screens match Fire's own templates.

## What it shows

| Screen | Path | Shows |
|---|---|---|
| Overview | `/overview` | skeleton loading, an area chart and sparklines, a stats grid, a table, a first-visit dialog |
| Activity logs | `/logs` | search, filters, a date range, sort, row selection, bulk and row-menu actions, toasts with Undo, table states, a detail sheet |
| Settings | `/settings` | tabs kept in the URL, one dirty-tracked form, features as switches with Done · Undo, disabled-with-a-reason controls, delete confirmed on the page, a Demo state band (`?state=ready\|loading\|error\|member`), menus, a confirm dialog |
| Elements | `/elements` | Fire's elements (`fd-chart`, `fd-code`, `fd-icon`, `fd-texture`) driven by Lit properties; behind a guard |
| A request | `/logs/:id` | the logs screen with that request open in its detail sheet (a route parameter) |
| Not found | any other path | Fire's 404 page (`templates/not-found.html`), inside the shell, with the address kept |

The three screens are the `.fd-page` of Fire's `templates/overview.html`, `logs.html` and `settings.html`, converted
to Lit. The shell is `templates/shell-static.html` (go-to keys, the running-now pill, the service status, the shortcut sheet and the command palette; the starter has no Decisions page). The sample data is Ember's, kept as it is.

On a phone (below 640px) the screens are reached from the tab bar (`fd-tabbar`, in `src/shell/app-shell.ts`): one item per route and a More button (`data-fd-mobile-nav`) that opens the menu sheet. `index.html` declares `data-fd-surface="app"`, so the markup lint knows which parts suit the page.

States: `?state=` on `/overview` (`loading`, `empty`, `error`) and `/logs` (`loaded`, `loading`, `empty`, `error`, `no-results`) opens the screen in that state; any other value is ignored. A screen reads it with `askedState()` (`src/lib/page-state.ts`, through the router) and renders its blocks from a typed `PageState`.
Retry on the error state is wired: the overview shows the skeleton and then the data, the logs reload.

A change of screen is one view transition: `AppShell.show` wraps it in Fire's `transition()`, so the sidebar and top bar hold
still and the screen fades. A browser without View Transitions, or a visitor who asks for reduced motion, sees the screen swap at once.

## Routing

The route table is `src/routes.ts`; the router is `src/lib/router.ts` (about 240 lines, no dependency).

```ts
{ path: '/logs/:id', tag: 'screen-logs', load: () => import('./screens/logs/screen'),
  title: ({ params }) => `Request ${params.id}`, guard: allow('logs:read') }
```

| Field | What it does |
|---|---|
| `path` | `/logs`, `/logs/:id` (a parameter), `/docs/*` (the rest of the path, in `params['*']`), `*` (anything: not-found). The first route that matches wins, so put `/logs/new` before `/logs/:id`. A trailing slash is ignored. |
| `tag`, `load` | The custom element and the `import()` that defines it. Each screen is its own chunk, fetched on the first visit, or earlier when a link to it is hovered or focused. `load` is left out only for the status screens, which are in the shell's chunk. |
| `title` | The document title (`Title · Ember`), a string or a function of the context. A screen may refine it as it renders (settings names its tab). |
| `guard` | `(context) => true \| '/somewhere'`, may be async. The context has `route`, `params`, `query`, `path` and `session`. A path redirects there and replaces the history entry; more than 8 redirects in a row stop with a console error. |
| `label`, `icon`, `group`, `keys`, `keywords` | Only for routes in the navigation: the sidebar, the tab bar and the command palette list the routes that have a label. A detail page has none, and keeps its parent marked (the current item is the one whose path the address starts with). |
| `{ path, redirect }` | An address that moved: `{ path: '/', redirect: '/overview' }`. |

A screen gets `params` and `query` (a `URLSearchParams`) as properties, so do not use those names for anything
else. `ParamsOf<'/logs/:id'>` types them. `routeQuery()` still reads `?state=` where a screen needs it before it
is given its properties. Two routes with the same tag share the element: `/logs` to `/logs/:id` sets `params` on
the logs screen, which opens the sheet, and the router leaves focus and scroll to the screen. Navigate in code with
`navigate('/logs/req_8f3a21')` or `navigate(path, { replace: true })`, and write every link to an app path with
`href('/logs')`, so that it carries the base path.

What a page load would have done, the router does after each new screen: it sets the title, moves focus to the
screen's `h1` (or its `main`) so that keyboard and screen-reader users start on the new page, scrolls to the top
(or back to where the visitor was, on Back and Forward), and announces the title through a polite live region the
shell owns. The first load does none of the focus or the announcement. The heading is focused without a ring: it
is not something to press, and Chromium counts focus moved by script as keyboard focus after a key press, so Fire's
ring would otherwise be drawn around the page title. The router calls Fire's `focusQuiet(el)` for this; use it for
any heading or region your own code focuses, and leave a button, link or field to be focused as usual, since those
keep their ring. While a screen's module loads, the current
screen stays, and Fire's page bar (`texture.pagebar`) shows when that takes over 150 ms. A module that fails to load
shows Fire's error page with Try again; when the browser is online, the likely cause is a deploy that replaced the
hashed files, so it offers Reload first. Offline, it says so. WebKit remembers a module that failed for the life of the
page, so when Try again fails a second time while online, the router reloads the page.

**Base path.** To serve the app under a prefix, build it with Vite's `base`: `vite build --base /app/` (or `base` in
`vite.config.ts`). `main.ts` passes `import.meta.env.BASE_URL` to `startRouter`, so links, matching and asset URLs
all follow the one setting. Two apps under `/app` and `/admin` are two builds with two bases; a link from one to the
other is outside the base and is a normal page load. The route table stays as it is: paths are inside the app.

**What a product replaces.** `src/lib/session.ts` is a stand-in that is signed in and allowed everything (for trying
the guard, `sessionStorage['ember-deny'] = 'elements:view'` takes a permission away). Replace it with your own:
read the session from your API or cookie before `startRouter`, call `setSession()` after sign-in and sign-out, and
send a signed-out visitor to your sign-in page with a guard (`signedIn ? true : `/sign-in?next=${path}``). There is
no API client: a screen fetches its own data in `connectedCallback` and shows Fire's loading, empty and error states
(see `?state=` above). Delete the demo routes and screens, keep `screen-not-found`, `screen-no-access` and
`screen-load-error` (`src/shell/status.ts`), and change their words.

## Start

```sh
npm install
npm run dev        # http://127.0.0.1:5173, with hot reload
npm run build      # typecheck, then a production build in dist/
npm run check      # the full check, see below
npm run review     # build, then look at every screen: .fire-review/index.html
```

`npm install` gets the Fire release in `package.json`. In Fire's repository, `npm install --no-save ../..` tries the
starter against your working copy instead, without changing `package.json` or the lockfile.

## Start a new project from it

1. Copy this folder out of the Fire repository. Its `package.json` already depends on the release,
   `"fire-design": "github:vidhatanand/firedesign#v0.14.0"`, locked in `package-lock.json`.
2. `npm ci`, then `npm run dev`. Delete the `check` script: it compares against templates in Fire's repository.
3. Choose your look: edit `theme.json` (a Fire theme record: palette, type, dials) and run `npm run dev` or
   `npm run build`. `scripts/prepare.mjs` turns it into `src/fire-theme.css` and puts the attributes it needs on
   `<html>` in `index.html`. Fire's `contract/looks/*.json` are ready-made records.

## Folder layout

```
index.html                 loads boot.js (classic script, after the stylesheet in the build) and src/main.ts
theme.json                 the look of the app (a theme record)
scripts/prepare.mjs        theme.json -> src/fire-theme.css; copies boot.js into public/fire
scripts/check.mjs          npm run check
scripts/lint.mjs           npm run lint:markup, npm run lint:css
scripts/first-font.mjs     finds the font file the first paint needs (vite.config.ts preloads it)
src/main.ts                imports, in order: Fire's CSS, the theme, Fire's elements, Fire's behaviours, the shell;
                           then starts the router
src/routes.ts              the route table
src/app.css                the one rule that hides the custom elements from layout
src/lib/fire-light.ts      FireLight: the base class of every component
src/lib/router.ts          the router
src/lib/session.ts         the session the guards read (a stand-in to replace)
src/shell/app-shell.ts     sidebar, top bar, phone menu, and the current screen (the router's outlet)
src/shell/status.ts        not-found, no-access and the load error
src/screens/<name>/        screen.ts (state and events) and view.ts (the Fire markup); each folder is one chunk
```

## How a component is written

```ts
import { html } from 'lit';
import { FireLight } from '../../lib/fire-light';

export class ScreenExample extends FireLight {
  protected override render() {
    return html`
      <div class="fd-frame">
        <button class="fd-btn" data-variant="primary" @click=${() => alert('hi')}>Save</button>
        <div class="fd-menu" id="m" popover @fd:select=${(e: CustomEvent) => console.log(e.detail.value)}>…</div>
      </div>`;
  }
}
customElements.define('screen-example', ScreenExample);
```

`FireLight` renders into the element itself (`createRenderRoot() { return this; }`) so Fire's global CSS and its
`document`-level listeners reach the markup, and it calls Fire's `init(this)` after every render. Add a route to
`src/routes.ts` with `load: () => import('./screens/example/screen')`; do not import the screen anywhere else, or
it stops being a chunk of its own.

**Testing signed-in screens.** In a Playwright test, set the session cookie on the context. Chromium refuses a
`__Host-` cookie given as a `url` on `http://`, even on localhost and even with `secure: true` (Playwright fails with
"Invalid cookie fields"); give it `domain` and `path` instead:
`await context.addCookies([{ name: '__Host-session', value, domain: 'localhost', path: '/', secure: true }])`. The
cookie is then stored and sent to `http://localhost:<port>`. Seen in Chromium (Playwright 1.64.1); not tried in WebKit
or Firefox. `fire review` does this for you: put the cookie in `fire.review.setup.cookie` as `"__Host-session=<value>"`
and the signed-in screens are reviewed.

## How the check works

`npm run check` builds for production, prints the size of every chunk and checks the budgets (see below), serves
the build and Fire's repository on free ports, then:

1. **render-equal** compares each screen's `.fd-page` with its Fire template: structure, computed styles and pixels,
   at 1440 and 375 wide, light and dark, in Chromium, WebKit and Firefox.
2. A **browser run** on the production build visits every route by URL and by clicking, and fails on any console
   error, uncaught error, failed request or Content Security Policy violation. It also tries search, the row menu
   with its toast, the detail sheet, tabs, a confirm dialog, the elements and the phone menu. Then it proves the
   router: a deep link to `/logs/:id`, the guard's redirect, not-found, Back and Forward restoring scroll and focus,
   the title and the live region, route chunks fetched only on a visit or a hover, and a blocked chunk showing the
   error state until Try again loads it.
3. **lint-markup** checks `src/` against Fire's catalogue with `--surface app` (`npm run lint:markup` runs it alone), and **lint-css** checks the starter's own CSS and tokens against Fire's token contract (`npm run lint:css`).
4. **fire review** opens every screen of the production build and fails on an error (see "Review every screen" below).

Three things to know when it fails or when you change a screen:

- The templates are Ember's, so the comparison uses a second build with Ember's look (in `.check/dist`), policy
  included: render-equal bypasses a page's policy for its own freeze stylesheet, and the browser run tests the policy.
- Both sides run timers (skeletons clear after 600 ms, the overview's first-visit dialog opens at 800 ms);
  render-equal waits until each page is quiet before it compares (spec R13).
- render-equal itself treats ids that Fire numbers (`fd-area-13`) by the element they point at, and SVG coordinates
  within half a pixel as equal (spec R9, R10): a chart takes a new number each time it is drawn, and the reference
  page draws it more often. Everything else, and every pixel, counts.

Options: `--only logs`, `--engines chromium`, `--widths 1440`, `--themes light`, `--skip-build`, and
`--diff-dir .check/diff` to keep the JSON reports and diff images.

## Review every screen

`npm run review` builds the app, then `fire review` opens every route in `package.json` (`"fire": { "review" }`),
each `?state=` its screen supports, a request deep link and the not-found and no-access pages, at 1440 and 375 wide,
light and dark: 76 captures. It writes `.fire-review/index.html` (ignored by git), a contact sheet with one row per
screen, its four pictures side by side, and the findings under it, each with a picture of the element. Look at it
before every release; it takes a minute. `npm run check` runs the same review as its last step.

It fails on what a rendered page shows and markup alone does not: a page that runs past the edge of a phone, a
control cut off, no `h1` or two, two page heads, more than one primary button in a view, a form section in a
multi-column grid or a card in a card, a native control no Fire style reached, a console error or a failed request,
an empty main region. A button stretched across its column is a warning. It cannot judge taste, hierarchy, the words,
or whether a screen follows the right template: that is what the person looking at the gallery is for. Add a route
there when you add one to `src/routes.ts`.

## Rules to remember (from `spec/EXPORT.md`)

- **Light DOM only.** Fire's listeners sit on `document`; inside a shadow root they cannot see the target (L6).
- **No `style`.** Not as an attribute, not `styleMap`. Custom properties go in `data-fd-vars="--value: 0.4"` (A14).
  Never inject a `<style>` at run time: the production CSP is `style-src 'self'` (P1, H1).
- **No `<i data-icon>`.** Fire replaces the `<i>` with an SVG behind Lit's back. Use `<fd-icon icon="home">` when the
  name can change, or the SVG form `<svg class="fd-icon" data-icon="home" aria-hidden="true"><use href="#i-home"></use></svg>` (I1, I2).
- **Data that changes goes to an element.** Charts, code and textures are drawn from `.data` / `.code` properties
  (`<fd-chart .data=${config}>`), not rewritten JSON (C3). Import `fire-design/elements/lit` before the first render (C1): it is Fire's elements on this app's own Lit, so the page loads Lit once.
- **Fire owns what it writes.** Write the starting value of `aria-expanded`, `hidden` on panels, `data-state`, and
  never bind them to state that changes (O1). Containers Fire fills (secrets, code blocks, JSON trees, chart plots,
  `.fd-ascii`) are rendered once; use `keyed()` or an element to change their content (O2).
- **Rows Fire sorts and selects stay in the DOM** as static markup. Show and hide them (`tr.hidden`), do not render
  them from an array (see `src/screens/logs/screen.ts`).
- **A bare `<table>` goes in `.fd-table-wrap > .fd-table-scroll`** (M7).
- **Events** are `@fd:select=${…}`, `@fd:change=${…}`. Call `event.preventDefault()` to cancel one (V1, V4).
- **After new markup** arrives by any other way than Lit (`innerHTML`), call `init(container)` (L4).
- **Routes**: the shell creates one element per screen and `FireLight` runs `init` after it renders (L3). A new
  route needs nothing else.

- **CSS target.** Fire's tokens use `light-dark()` (Chrome 123, Firefox 120, Safari 17.5). `vite.config.ts` sets
  `build.cssTarget` to those browsers. With Vite's default target the CSS minifier rewrites `light-dark()` into a
  custom-property toggle, and an element that sets `color-scheme: light` in a dark page (the QR code) turns dark.

## Going to production

`npm run build` writes `dist/`. What the build does by itself:

- **Minified and hashed.** Every script, stylesheet and font has a content hash in its name.
- **Split per route.** Each screen is a chunk (`assets/logs-….js`), fetched on the first visit. Lit, Fire and
  `src/lib` are three shared chunks: changing a screen changes that screen's file and the entry's, nothing else, so
  a returning visitor keeps the rest cached.
- **Slim Fire.** `fire slim` keeps the parts, modules and fonts the app uses (see Fire's frameworks page).
- **One font preloaded.** The theme's interface face at the regular weight, found from `fire slim`'s report; the
  other faces download when a page uses them.
- **The policy** as a `<meta>` tag, and the theme's attributes on `<html>`.

Sizes, measured with this starter (kB, gzip as the check computes it; fonts are the same 2 files, 52.5 kB):

| | Before (0.9.0, one script) | Now |
|---|---|---|
| JavaScript for the first route | 221.6 | 196.5 (entry 5.3, `src/lib` 1.8, Lit 5.7, Fire 178.2, overview 5.4) |
| Route chunks | (all in the one script) | logs 8.9, settings 21.8, elements 1.1 |
| CSS | 98.0 | 98.0 |
| Requests for the first route | 6 | 10 (the page, boot.js, 5 scripts, CSS, 2 fonts) |

Fire's behaviour chunk is most of it: Fire's `init()` reaches every module it keeps, so it cannot be split per
route from here. `npm run check` fails when a budget in `package.json` is exceeded:

```json
"fire": { "budget": { "initialJs": 205, "routeJs": 25, "css": 105 } }
```

`initialJs` is the entry, its static imports and the first route's chunk; `routeJs` the largest route chunk; `css`
the stylesheets. They are set a little above what the starter measures: lower them as your product allows, and
raise them only on purpose. `FIRST_ROUTE` in `scripts/check.mjs` names your landing screen's module.

What the host must do:

1. **Answer every app path with `index.html`** (status 200), so a deep link or a reload of `/logs/req_8f3a21` works.
   Files that exist (`/assets/…`, `/fire/…`) are served as they are; a missing file under `/assets/` is a 404, not
   `index.html`, or a stale chunk would load HTML as a script.
2. **Cache `/assets/*` for a year as immutable** (`Cache-Control: public, max-age=31536000, immutable`): their names
   change when their content does.
3. **Never cache `index.html`** (`Cache-Control: no-cache`), nor `/fire/boot.js`, whose name has no hash.
4. **Send the content-security policy as a header.** The `<meta>` tag is the starter's stand-in; a header also
   covers what a meta tag cannot (`frame-ancestors`). Copy the policy from `vite.config.ts`.
5. **Compress with Brotli** (gzip as the fallback) for scripts, stylesheets, HTML and JSON. Fonts are compressed
   already.

For example, nginx (with the Brotli module):

```nginx
location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; try_files $uri =404; }
location / {
  add_header Cache-Control "no-cache";
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
  try_files $uri /index.html;
}
brotli on; brotli_types text/css text/javascript application/json image/svg+xml;
```

Under a base path, put the same rules under `/app/` and build with `--base /app/`.

What was tested: the check serves the build from a small Node server that answers unknown paths with
`index.html`, in Chromium (the router) and in Chromium, WebKit and Firefox (the screens). The router was also
used by keyboard in WebKit and Firefox (Playwright's builds, not Safari), and a build with `--base /app/` in
Chromium. No real host, CDN or Brotli setup was tested, and the nginx example above is
untested: check your host's own documentation for the same five rules.
