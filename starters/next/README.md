# Fire on Next.js (App Router)

A Next.js 16 starter for Fire 0.6: React 19, TypeScript, server-rendered Fire markup, Fire's behaviour loaded in the
browser, and a strict Content Security Policy with a nonce. It follows `spec/EXPORT.md`, and `npm run check` proves
that its screens render the same as Fire's templates.

## What it shows

- **The app shell** (`app/app-shell.tsx`), converted from `templates/shell-static.html`: sidebar with go-to keys
  (`data-fd-keys="g l"`), top bar (running-now pill, service status, search, shortcut sheet), phone menu, the
  running-now popover, the shortcut sheet and the command palette, plus the support launcher and chat panel every
  Ember screen has. The nav lists this starter's three routes only. Navigation uses `next/link`, so route changes are
  client-side and Fire's `init` runs again after each one.
- **Three screens**, each the `.fd-page` of a template converted to JSX:
  `/overview` (`templates/overview.html`), `/logs` (`templates/logs.html`) and `/settings` (`templates/settings.html`,
  with the tab from `?tab=` rendered on the server; `?state=` (loading, error, member) is applied in the browser, as
  the template does). Each `page.tsx` is a server component holding plain Fire markup;
  a small client component (`*-screen.tsx`) renders the `<main class="fd-page">` and runs the screen's behaviour
  (`*-behaviour.ts`, the template's page script in TypeScript) once Fire has loaded.
- **Fire's behaviours**: menus, filters, tabs, segmented controls, table selection and row actions, dialogs, sheets,
  toasts, charts, copy buttons, the tweaks panel.
- **Fire events the React way**: `/logs` handles `fd:select` (row actions, bulk actions, the row menu) and `fd:change`
  (filters, the state switch) with `useFireEvent` from `fire-design/react`.
- **The look from a theme record**: `scripts/prepare-fire.mjs` turns `contract/looks/ocean.json` into
  `app/fire-theme.css` with `themeToCss` and its `<html>` attributes into `app/fire-look.ts`. Pick another look with
  `FIRE_LOOK=<name>`. It also copies `boot.js` to `public/fire/`. It runs before `dev`, `build` and the check.

- **A page transition**: each screen's `<main>` sits in React 19.3's `<ViewTransition>` (stable in the App Router, no flag) and
  `<html>` carries `data-fd-transition="fade"`, so the sidebar and top bar hold still and the page fades on a route
  change. React writes `vt-*` attributes into the server HTML; `render-equal` ignores them (R14).

## Start a project from it

1. Copy this folder.
2. In `package.json`, replace `"fire-design": "file:../.."` with `"fire-design": "github:vidhatanand/firedesign#v0.7.0"`,
   and delete the `check` script (it compares against the templates in Fire's repository).
3. `npm install`, then `npm run dev`. `next.config.ts` sets Turbopack's root only when Fire is linked from outside the
   project, and its rewrites only serve the templates' `*.html` links: remove them when your screens use routes.

## The rules to remember (spec/EXPORT.md)

- **Markup in JSX**: `className`, `htmlFor`, `tabIndex={0}`, booleans bare (`hidden`, never `hidden=""`), presence
  attributes as `data-block=""`, `defaultValue` / `defaultChecked` for fields Fire writes (never controlled), `{' '}`
  where HTML has whitespace between inline elements, `<pre>` text as one string literal. No `style` prop: custom
  properties go in `data-fd-vars`, and an element that has one carries `suppressHydrationWarning` (A1–A17, F1–F7, T1–T2, N4).
- **Icons**: never `<i data-icon>` in JSX. Write the SVG Fire draws (`<svg className="fd-icon" data-icon="x"
  aria-hidden="true"><use href="#i-x" /></svg>`) or use `FireIcon`; the root layout renders the sprite (I2, N8).
- **JSON in a script**: `dangerouslySetInnerHTML={{ __html: jsonForScript(data) }}` (M2, N5).
- **Fire loads after hydration, in the browser**: `app/fire-runtime.tsx` imports `fire-design` in an effect and runs
  `init(document)` after each route change (N1, L3, L5). Fire's elements and `fire-design/react` belong in client
  components (N7). Markup Fire fills (secrets, code blocks, charts) is rendered once; change its `key`, or use the
  element, when it must change (O2).
- **boot.js** is a blocking `<script src="/fire/boot.js" nonce={nonce}>` in the root layout's `<head>`, and `<html>`
  carries `suppressHydrationWarning` (N2, N3).
- **CSP**: `proxy.ts` makes a nonce per request: `script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self'` in
  production (P3). Never inject a `<style>` element; a look is a stylesheet file (H1).
- **CSS**: `import 'fire-design/css'` then the theme stylesheet in `app/layout.tsx` (N6, H4). The `browserslist` in
  `package.json` keeps Turbopack from lowering `light-dark()` (with Next's default targets it rewrites it into
  `--lightningcss-light/dark` variables resolved where a token is defined, which breaks `color-scheme` overrides such
  as `.fd-qr`).

## The check

`npm run check` (in this repository):

1. builds for production with Ember's look (`FIRE_LOOK=ember`, into `.next-check`), so the screens compare with the
   templates on the same palette, and puts the starter's own look back afterwards;
2. serves the build (`next start`) and the repository (static files), each on a free port;
3. loads every screen in Chromium, WebKit and Firefox: no console error or warning, no CSP violation, the served
   HTML has a strict policy, a blocking `boot.js` with the nonce, the nonce on every inline script and the hidden
   sprite; then a row action fires `fd:select` and shows a toast, a client-side route change gets `init`, a settings
   tab switches, the What's new dialog opens;
4. loads every screen on `next dev` and fails on any hydration warning (in the browser console or forwarded by Next
   to its terminal); two mismatches planted in the server HTML must be reported, which proves it would catch one;
5. runs `render-equal.mjs` for each screen against `templates/<name>.html` (`.fd-page`), at 1440 and 375 wide,
   light and dark, in the three engines (36 runs);
6. runs `lint-markup.mjs` and `lint-css.mjs` over `app/`.

Every server is closed before it exits; reports and pixel diffs go to `.check/`. Options: `--engines`, `--widths`,
`--themes`, `--screens`, `--skip-build`, `--skip-dev`, `--skip-render`.

One allowance remains, from the spec (P1): in WebKit, the CSP report Playwright's WebKit makes for every `<select>`
under a strict `style-src` (with its console error) is set aside and counted; any other violation fails.
