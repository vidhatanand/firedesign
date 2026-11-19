# Fire starter: Lit + Vite

The default starter for a new Fire app. [Lit](https://lit.dev) components that render to the light DOM, Vite,
TypeScript, no other framework. Copy this folder and you have an app shell, a router, three real screens and the
checks that prove they match Fire's own templates.

## What it shows

| Screen | Path | Shows |
|---|---|---|
| Overview | `/overview` | skeleton loading, an area chart and sparklines, a stats grid, a table, a first-visit dialog |
| Activity logs | `/logs` | search, filters, a date range, sort, row selection, bulk and row-menu actions, toasts with Undo, table states, a detail sheet |
| Settings | `/settings` | tabs kept in the URL, one dirty-tracked form, features as switches with Done · Undo, disabled-with-a-reason controls, delete confirmed on the page, a Demo state band (`?state=ready\|loading\|error\|member`), menus, a confirm dialog |
| Elements | `/elements` | Fire's elements (`fd-chart`, `fd-code`, `fd-icon`, `fd-texture`) driven by Lit properties |

The three screens are the `.fd-page` of Fire's `templates/overview.html`, `logs.html` and `settings.html`, converted
to Lit. The shell is `templates/shell-static.html` (go-to keys, the running-now pill, the service status, the shortcut sheet and the command palette; the starter has no Decisions page). The sample data is Ember's, kept as it is.

On a phone (below 640px) the screens are reached from the tab bar (`fd-tabbar`, in `src/shell/app-shell.ts`): one item per route and a More button (`data-fd-mobile-nav`) that opens the menu sheet. `index.html` declares `data-fd-surface="app"`, so the markup lint knows which parts suit the page.

States: `?state=` on `/overview` (`loading`, `empty`, `error`) and `/logs` (`loaded`, `loading`, `empty`, `error`, `no-results`) opens the screen in that state; any other value is ignored. A screen reads it with `askedState()` (`src/lib/page-state.ts`, through the router) and renders its blocks from a typed `PageState`.
Retry on the error state is wired: the overview shows the skeleton and then the data, the logs reload.

A route change is one view transition: `AppShell.onRoute` wraps it in Fire's `transition()`, so the sidebar and top bar hold
still and the screen fades. A browser without View Transitions, or a visitor who asks for reduced motion, sees the screen swap at once.

## Start

```sh
npm install
npm run dev        # http://127.0.0.1:5173, with hot reload
npm run build      # typecheck, then a production build in dist/
npm run check      # the full check, see below
```

## Start a new project from it

1. Copy this folder out of the Fire repository.
2. In `package.json`, change `"fire-design": "file:../.."` to `"fire-design": "github:vidhatanand/firedesign#v0.8.1"`.
3. `npm install`, then `npm run dev`.
4. Choose your look: edit `theme.json` (a Fire theme record: palette, type, dials) and run `npm run dev` or
   `npm run build`. `scripts/prepare.mjs` turns it into `src/fire-theme.css` and puts the attributes it needs on
   `<html>` in `index.html`. Fire's `contract/looks/*.json` are ready-made records.

## Folder layout

```
index.html                 loads boot.js (classic script, first) and src/main.ts
theme.json                 the look of the app (a theme record)
scripts/prepare.mjs        theme.json -> src/fire-theme.css; copies boot.js into public/fire
scripts/check.mjs          npm run check
scripts/lint.mjs           npm run lint:markup, npm run lint:css
src/main.ts                imports, in order: Fire's CSS, the theme, Fire's elements, Fire's behaviours, the components
src/app.css                the one rule that hides the custom elements from layout
src/lib/fire-light.ts      FireLight: the base class of every component
src/lib/router.ts          the route table and a 25-line router
src/shell/app-shell.ts     sidebar, top bar, phone menu, and the current screen
src/screens/<name>/        screen.ts (state and events) and view.ts (the Fire markup)
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
`document`-level listeners reach the markup, and it calls Fire's `init(this)` after every render. Add the screen to
`routes` in `src/lib/router.ts` and import it in `src/main.ts`.

## How the check works

`npm run check` builds for production, serves the build and Fire's repository on free ports, then:

1. **render-equal** compares each screen's `.fd-page` with its Fire template: structure, computed styles and pixels,
   at 1440 and 375 wide, light and dark, in Chromium, WebKit and Firefox.
2. A **browser run** on the production build visits every route by URL and by clicking, and fails on any console
   error, uncaught error, failed request or Content Security Policy violation. It also tries search, the row menu
   with its toast, the detail sheet, tabs, a confirm dialog, the elements and the phone menu.
3. **lint-markup** checks `src/` against Fire's catalogue with `--surface app` (`npm run lint:markup` runs it alone), and **lint-css** checks the starter's own CSS and tokens against Fire's token contract (`npm run lint:css`).

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

## Rules to remember (from `spec/EXPORT.md`)

- **Light DOM only.** Fire's listeners sit on `document`; inside a shadow root they cannot see the target (L6).
- **No `style`.** Not as an attribute, not `styleMap`. Custom properties go in `data-fd-vars="--value: 0.4"` (A14).
  Never inject a `<style>` at run time: the production CSP is `style-src 'self'` (P1, H1).
- **No `<i data-icon>`.** Fire replaces the `<i>` with an SVG behind Lit's back. Use `<fd-icon icon="home">` when the
  name can change, or the SVG form `<svg class="fd-icon" data-icon="home" aria-hidden="true"><use href="#i-home"></use></svg>` (I1, I2).
- **Data that changes goes to an element.** Charts, code and textures are drawn from `.data` / `.code` properties
  (`<fd-chart .data=${config}>`), not rewritten JSON (C3). Import `fire-design/elements` before the first render (C1).
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
- **Production hosting**: send the policy in `vite.config.ts` as a `Content-Security-Policy` header as well as the
  `<meta>` tag, and answer every route path with `index.html`.

- **CSS target.** Fire's tokens use `light-dark()` (Chrome 123, Firefox 120, Safari 17.5). `vite.config.ts` sets
  `build.cssTarget` to those browsers. With Vite's default target the CSS minifier rewrites `light-dark()` into a
  custom-property toggle, and an element that sets `color-scheme: light` in a dark page (the QR code) turns dark.

## Sizes

A production build carries Fire's whole stylesheet and all its type sets: 23 font files, 625 kB. `npm run build` prints the
current JavaScript and CSS sizes; they grew in 0.8 with the website and filter code, which the starter does not use. A
product that uses one type set can drop the others from `fire/typefaces.css`, which removes most of the font weight. The
JavaScript holds two copies of Lit: Fire's own (bundled in `fire-design/elements`) and the app's.
