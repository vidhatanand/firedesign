# Fire Vue starter

Vue 3.5, Vite 8, vue-router and TypeScript, with Fire's design system, a look applied from a theme record, and a strict
Content Security Policy. It shows three of Ember's screens (Overview, Activity logs, Settings) inside Ember's app shell,
written as Vue single-file components from Fire's own templates, and proves the rules in `spec/EXPORT.md` for Vue.

## What it shows

- **The shell** (`src/layouts/AppShell.vue`): sidebar, top bar and phone menu from `templates/shell-static.html`. The
  navigation is data; its icons are `<fd-icon>` elements, because their names come from data. The three screens are
  router links, and `RouterLink` sets the `aria-current="page"` that Fire's nav styles read.
- **Three screens** (`src/pages/`): the `.fd-page` of `templates/overview.html`, `logs.html` and `settings.html`, with
  Ember's sample data kept. Menus, filters, tabs, segmented controls, table selection and row actions, dialogs, toasts,
  charts, copy buttons and secrets all work: Fire runs them from the markup, and `v-fire` runs Fire on the page.
- **Events the Vue way**: `@fd:select` on the logs table (row actions and bulk actions show toasts), `@fd:change` on the
  settings screen. `event.detail` is typed, from `fire-design`'s `FireEventMap`.
- **A look from a theme record**: `look.json` is a theme record (Fire's forest look with rounder corners).
  `npm run theme` turns it into `src/fire-theme.css` with `themeToCss` and writes the `<html>` attributes to
  `src/fire-theme.json`. `main.ts` imports the stylesheet after `fire-design/css`; `vite.config.ts` puts the attributes
  on `<html>`. Nothing is injected at run time.
- **A strict policy**: the production build carries `script-src 'self'; style-src 'self'` in a `<meta>` (send the same
  policy as a header in production). The development server needs `style-src 'unsafe-inline'`, so the meta is only
  added to the build.

## Start a new project from it

1. Copy this folder.
2. In `package.json`, replace `"fire-design": "file:../.."` with `"fire-design": "github:vidhatanand/firedesign#v0.6.2"`.
3. `npm install`, then `npm run dev` (it runs `npm run theme` first), or `npm run build`.
4. Remove `scripts/check.mjs` and the `check` script if you do not compare against Fire's templates. Keep
   `npm run lint:markup`.

To change the look, edit `look.json` (or copy another record from `fire-design/contract/looks`) and run `npm run theme`.

## `npm run check`

Builds for production with the `ember` look (the templates use Ember's palette, so the starter's own look would differ
on both sides) and with `VITE_FIRE_STATIC=1` (the screens stay in the state their markup is written in; otherwise they
simulate a first load with timers). It serves the build and Fire's repository root, then for each screen runs
`render-equal`: `.fd-page` of the template against `.fd-page` of the route, at 1440 and 375 wide, light and dark, in
Chromium, WebKit and Firefox. It loads each screen in Chromium and fails on a CSP violation or a console message, and
runs `lint-markup` on `src`. It restores the starter's look and closes every server before it exits.

Two things differ on purpose: the templates are served **without their inline demo scripts** (they simulate loading and
Ember's demo logic, which the app replaces), and links between the three screens are router paths (`/settings`, not
`settings.html`). The check needs the Fire repository (`../..`), `playwright-core`, `pixelmatch` and `pngjs` from it.

## Rules to remember (`spec/EXPORT.md`)

- **Icons**: never `<i data-icon>` (Fire replaces it, which breaks Vue's updates). Use `<fd-icon icon="home">` when the
  name is data, or the static SVG `<svg class="fd-icon" data-icon="home" aria-hidden="true"><use href="#i-home"></use></svg>`.
- **JSON for Fire** (a chart's data): `<component is="script" type="application/json" v-text="json">` with
  `jsonForScript(value)` from `src/fire-export.ts`. A plain `<script>` in a template is dropped.
- **No `style`**: no `style` attribute, `:style` or `v-show`. Use `hidden` and `v-if`. Custom properties go in `data-fd-vars`.
- **Fire owns what it writes**: `aria-expanded`, `data-state`, `id`, `role`, `hidden` on panels and the rest of O1 are
  written once and never bound. Change them through Fire's API (`overlays`, `texture.setLoading`, …) or remount with a `:key`.
- **Containers Fire fills** (secrets, charts, code blocks, tabs): render their children once. For data that changes, use
  `<fd-chart :data>` or `<fd-code :code>`.
- **Events**: `@fd:select` on an element, never on a component (a component's `@event` is an emit).
- **Compiler options**: `fireVueOptions()` in `vite.config.ts` sets `isCustomElement` for `fd-` tags and
  `whitespace: 'preserve'`. Keep it, or text between inline elements loses its space.
- **Fire runs on new markup**: `v-fire` on a container runs `init` on mount and on each update; `app.use(Fire, { router })`
  runs it after each route change.
- **Registration first**: `import 'fire-design/elements'` in `main.ts` before `mount`.
- **TypeScript**: `fire-design/vue` declares the `fd-` tags, the `v-fire` directive and typed `@fd:*` handlers.
  The `paths` entry for `vue` in `tsconfig.json` is only needed because `fire-design` is linked from `../..`; drop it
  once the dependency is installed from GitHub.
