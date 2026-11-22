# Changes

What changed in each release, and what a product using Fire needs to do. Newest first. A product records the tag it vendors (for example in `docs/fire/REQUESTS.md`) and reads every entry after it before refreshing.

## 0.12.3 — 22 Nov 2026

**`boot.js` goes after the stylesheets.** Before them, Chromium can style a page without Fire's CSS when someone
moves between pages in a tab, and the buttons then fade in from link blue for 160 ms. No class, attribute value,
token, event or behaviour export changed.

### What a product needs to do

Refreshing Fire does not fix a page: its `<head>` has to change.

- **A page with `boot.js`:** move its `<script>` after every stylesheet link in `<head>`. The saved theme is still on
  `<html>` before the first paint: that paint waits for the stylesheets anyway.
- **A page without `boot.js`:** add it there, or another classic script with no `async` or `defer`. A module or
  deferred script does not prevent the fade.
- **A Vite app:** Vite adds the built stylesheet at the end of `<head>`, so the script has to move at build time: copy
  `bootLast` from `starters/lit-vite/vite.config.ts` or `starters/vue-vite/vite.config.ts`.
- **A Next app on the starter's layout:** nothing. Next already puts its stylesheets first.

### Fixed

- The templates, the docs, the setup in `GUIDE.md` and `README.md`, and the Lit and Vue builds have that order.
  `spec/EXPORT.md` H5 and N2 state it, and `scripts/test/load-order.test.mjs` and each starter's check hold it.
- The template listing and the Blank template's card no longer say to copy a template: templates are references, read
  and built fresh (0.12.1 missed these two).
- The image ground's contrast test measures at rest. It could read a button's colour part of the way through a
  transition and fail, or pass, on a colour that is not the button's.

## 0.12.2 — 22 Nov 2026

**render-equal compares an sRGB colour by what it is, not how it is written (R16).** Only the check, its spec and its
tests changed: no class, attribute value, token, event or behaviour export changed.

### Fixed

- `rgb(38 38 38 / 0.67)` and `color-mix(in srgb, #262626 67%, transparent)` were reported as a style difference with no
  pixel difference. They are equal now in the colour properties, in `box-shadow`, and in a gradient of one colour at
  any alphas. A gradient of two colours is still compared as written: the notation changes how it interpolates.
- A check can now fail that passed before: two `color(srgb …)` colours one channel level apart are different (two
  decimals used to hide up to 2.55 levels).
- `spec/export-map.json` `renderEqual.rules` adds `R16`.

## 0.12.1 — 20 Nov 2026

**When Fire has nothing close, an agent builds the component to Fire's standard and proposes it.** This is the owner's
rule, drafted with Facet. Templates are references to read, never starters. A component Fire lacks is built with `x-`
classes and recorded as a proposal that Fire adopts or declines, so Fire learns from what products had to build. Only
documents changed: no class, attribute value, token, event, behaviour export or check changed.

### Changed

- **`AGENT-RULES.md` section 6**, in order:
  1. Search first (`fire find`; in Facet, `search_components`).
  2. Compose or customise what Fire has.
  3. If nothing is close, build the component to Fire's standard:
     - an `x-<name>` root and `x-<name>-<part>` parts;
     - Fire tokens only, `data-*` variants and ARIA states;
     - every state, light and dark, phone and keyboard;
     - its CSS in `fire-local.css`, never touching an `fd-` class or token.
  4. Record it as a proposal: a card in Fire's format, the markup, the CSS and what you searched. In Facet, use
     `propose_component` and `data-proposal="<id>"`.
  5. Fire adopts it as an `fd-` component in a release, or declines it with a reason.
- **Templates are references, never starters.** `AGENT-RULES.md` section 1 and `GUIDE.md` section 3 now say to read the
  nearest template and build each screen fresh in its structure, never to copy a template file and edit it. The shell
  is still copied once.
- `GUIDE.md` section 7 follows the same steps. A proposal gains "What you searched" and "The component" (card, markup,
  CSS) and drops "Stopgap in use".
- **Proposals are internal.** A proposal carries the component itself and is never posted publicly. In Facet,
  `propose_component` records it; elsewhere it goes at the top of the project's `docs/fire/REQUESTS.md`, and the owner
  is told. The public issue template (`.github/ISSUE_TEMPLATE/component-request.md`) is removed.
- The pointer a product copies into its agent instructions now says: "When Fire has nothing close, build to Fire's
  standard with `x-` classes in `fire-local.css`, and propose it in `docs/fire/REQUESTS.md`."

### For products refreshing from 0.12.0

- In your agent instructions, replace "Gaps in Fire go in `docs/fire/REQUESTS.md`. Stopgap styles go in
  `fire-local.css`." with the line above. The old line points at the same files, so leaving it does no harm.
- Each stopgap in `fire-local.css` is now a proposal: add what you searched and a card to its open request, in
  `docs/fire/REQUESTS.md`, not as an issue in Fire's repository.

### Known limits

- `search_components` and `propose_component` are Facet's tools, on a Facet branch not yet deployed. Until they ship,
  an agent in Facet files the request as it would anywhere else.

## 0.12.0 — 20 Nov 2026

**An exporter can prove its output against Fire.** `render-equal` now applies every normalisation the export spec
lists, says which in data, and captures each page under its own Content Security Policy. The starters install the
release they ship in, so `npm ci` works in one outside Fire's repository. These are what Facet's exporter checks before
it exports against a Fire tag. No class, attribute value, token, event or behaviour export was removed or renamed; in
`fire/` only the version number changed.

### Added

- **`renderEqual.rules`** in `spec/export-map.json`: the ids of the section 16 normalisations `scripts/render-equal.mjs`
  applies, R1 to R15 (`RULES` in the script; a test holds the two equal). A tool may rely on every id listed.
- **Four normalisations `render-equal` did not apply:**
  - R2: whitespace is dropped where the browser drops it (at the start and end of a block, beside a block-level
    sibling, in a flex or grid container), and whitespace-only text the browser does not draw (inside a hidden
    element, between table parts) is absent; between two inline boxes a space is drawn, so it is compared. Text in
    `<pre>` is compared as it is, and a no-break space is not whitespace.
  - R5: form state through properties: `value` of an input, textarea and select, `checked` of a checkbox or radio,
    `selected` of an option, `open` of a details or dialog, reported as `property` differences. Those attributes and a
    textarea's text are not compared.
  - R6: `autofocus` is ignored.
  - R7: `data-fd-vars` is not compared as an attribute; the custom properties it set are, by computed value, as
    `style` differences named after the property.
- R8: `#fd-icon-sprite` is skipped wherever it sits; it was only left out when it sat outside every Fire node.
- `scripts/pin-starters.mjs`: locks the starters to a release commit, and `--check`.

### Changed

- **`render-equal` captures under each page's own Content Security Policy**; it no longer sets `bypassCSP`. The
  stylesheet that freezes animations and the one that hides the shell for the R15 shot are constructed stylesheets
  (`document.adoptedStyleSheets`), which `style-src` does not block (checked in Chromium, Firefox and WebKit). A run
  whose freeze did not apply stops with an error (exit 2). R13 says so.
- **The starters depend on `github:vidhatanand/firedesign#v0.12.0`**, locked in their `package-lock.json` as an
  installed package, instead of `file:../..`. A copied starter needs no change to its dependency. In Fire's repository,
  `npm install --no-save ../..` in a starter tries it against the working copy.
- The Vue and Next starters run `lint:markup`, `lint:css` and `review` from `node_modules/fire-design/scripts`; they
  used `../../scripts`, which a copied starter does not have. The Lit starter's check takes the reference templates
  from Fire's repository when the installed Fire does not ship them.

### Fixed

- The Lit starter's recovery codes (settings, in a dialog) had four spaces of template indentation on three lines
  inside their `<pre>`. `render-equal` passed it while it trimmed all text; R2 compares `<pre>` text as it is and
  found it.

### For products refreshing from 0.11.0

- Nothing to change in markup, styles or scripts.
- If you run `render-equal`, it now reports four things it passed before: a space between two inline elements that
  one side has and the other lacks (it is drawn), a different `<pre>` text, a different form state set through a
  property, and a different custom property from `data-fd-vars`. A page now loads under its own policy, so what that
  policy blocks (fonts or images from another origin) is blocked in the comparison too.
- If you copied a starter, nothing changes. To take the lock, set `fire-design` to
  `github:vidhatanand/firedesign#v0.12.0` and run `npm install`.

### Known limits

- R2 follows the box each text sits in, not the whole CSS whitespace algorithm: a space at the end of one inline
  element and another at the start of the next are two spaces to `render-equal` and one to the browser.
- Facet's B9 (`<cc-component>`) reads a root part's `element` from the catalogue, which most components do not have
  yet. Facet's lint refuses `<cc-component>` on Fire boards, so nothing reaches it; the facts come in a later release.

## 0.11.0 — 20 Nov 2026

**Fire carries no tool's format.** Fire is a design system that tools adapt. Since 0.6 it also wrote itself in one
tool's format, and its own build ran that tool's command line: when the tool changed, Fire's checks broke with nothing
in Fire changed. The adapter now lives with the tool. No class, attribute value, token, event or behaviour export was
removed or renamed; styles and behaviour are those of 0.10.2.

### Removed

- **The Facet adapter**: `scripts/build-facet.mjs`, its test, the generated `facet/` folder (`content.json`,
  `extras.json`, `theme.json`, `README.md`) and the `npm run build:facet` script. Fire's build no longer runs Facet's
  command-line tool, and no longer looks for `$FACET_CLI` or a Facet folder beside the repository.
- **The Facet colour role on the token contract**: `facetRole` on a token, and the top-level `facet` key with its
  `roles`, in `contract/fire-contract.json`.
- The last copy of all of it is at tag `v0.10.2`. A tool that read `facet/` or `facetRole` now reads the neutral files
  below, which are unchanged.

### Added

- `contract/fire-contract.json` names the default look: `"defaultLook": "contract/looks/ember.json"`, the theme record
  the token defaults describe. It is `DEFAULT_RECORD` of `fire/js/theme.js` as data.
- A test holds two facts a tool relies on (`scripts/test/standalone.test.mjs`; `spec/ARCHITECTURE.md` section 8): the
  folder `fire/` is a complete install, with nothing in it loading a file from outside it; and the default look is the
  default theme record.
- `AGENT-RULES.md`: the lint does not follow markup into a helper that wraps what it is given; for markup composed
  through helpers the review is the authority.

### Fixed

- `GUIDE.md` and `spec/EXPORT.md`: five table rows had unescaped `|` inside code spans, so they had too many cells
  and rendered wrongly (markdownlint MD056).

### Unchanged, for tools

- `contract/catalog.json`, `contract/fire-contract.json` (the tokens, without the roles), the theme record
  (`fire/js/theme.js`, `contract/theme.schema.json`, `contract/looks/`), the cards and `docs/_ref/CLASSES.md`.
- `spec/EXPORT.md` and `spec/export-map.json`, every key included, and the `fire-export` helpers.

### For products refreshing from 0.10.2

- Nothing to change in markup, styles or scripts.
- If a script of yours read `facet/` or `facetRole`, read the files above instead, or take the adapter from `v0.10.2`.

## 0.10.2 — 20 Nov 2026

**The checks catch a field dropped into a setting row.** A product put a text input in a setting's text column: the
input ran the width of the card and its button lined up with the middle of the text. Both checks passed it. No class,
attribute value, token, event or export was removed or renamed.

### Added

- **A structure fact, `excludes`** (with `instead`, one sentence on what to write): a part that may hold none of some
  classes, at any depth (`contract/cards/README.md`). `fd-setting-text` now holds no `fd-input`, `fd-textarea`,
  `fd-select`, `fd-field`, `fd-input-group`, `fd-input-pair`, `fd-codefield`, `fd-tag-input`, `fd-number`, `fd-secret`
  or `fd-search`. `fire lint` and `fire review` report one as `wrong-parent`, and `CLASSES.md` shows the fact.
- **`fire review`: `wide-field`** (an error, at 900px and wider): a text field, textarea or select wider than the
  widest form measure, 768px. A table, `fd-form[data-size="full"]`, a search, a toolbar, a composer, a code field and
  a public site's sections are left alone.
- `AGENT-RULES.md` section 3, rule 6: a value to type is a field inside an `fd-form`, never an `fd-setting`.

### For products refreshing from 0.10.1

- `fire lint` reports a field inside `fd-setting-text`; move it into a field in a form, as the finding says.
- `fire review` reports a field wider than 768px. Put it in an `fd-form`, or give the form `data-size="full"` where it
  really needs the whole width.

### Known limits

- `wide-field` was measured on Fire's 42 templates and every state their cards list, in Chromium, where it reports
  nothing. A product with a deliberately wide field outside the cases above will see it.

## 0.10.1 — 19 Nov 2026

**`fire review` can review signed-in screens whose session is a `__Host-` cookie.** Nothing else changed.

### Fixed

- `fire review` set every `setup.cookie` by its url. A browser refuses a `__Host-` or `__Secure-` cookie given by an
  `http://` url, even on localhost ("Invalid cookie fields"), so a screen behind such a session never loaded. Those
  cookies are now set by domain and path and marked secure, which a browser accepts for localhost. Found by the first
  product to run the review signed in.

### Added

- `setup.cookie` also takes an object (`{ name, value, httpOnly, sameSite, secure, domain, path, url }`), alone or in
  a list beside `"name=value"` strings. `scripts/review.mjs` exports `cookieFor`.

### For products refreshing from 0.10.0

- Remove any workaround that rewrites the cookie before calling the review.

## 0.10.0 — 19 Nov 2026

**The checks look at structure and at the rendered screen, not only at names.** The first product built on the Lit
starter passed every lint and shipped screens that were composed badly. This release closes that gap. No class,
attribute value, token, event or export was removed or renamed.

### Added

- **`fire lint` checks structure.** The cards now carry facts about each part (`required`, `or`, `element`, `parent`,
  `inside`, `notInside`, `attrs`, `contains`, and a `skeleton` on the root; `contract/cards/README.md`), on 59 of the
  184 components, each backed by Fire's CSS or behaviour. Six new errors: `missing-part` (a callout without
  `fd-callout-icon`), `wrong-element` (`fd-select` on the `<select>`), `wrong-parent` (an `fd-form-section` that is not
  a child of `fd-form`; an `fd-table` outside its wrap), `missing-attribute`, `forbidden-attribute` (`hidden` on a menu,
  which never opens) and `missing-child`. One new warning: `bare-control`, a native select, table, fieldset or text
  field with no Fire class and no Fire wrapper. The rules live in `scripts/lib/structure.mjs` (`fire-design/structure`).
- **`CLASSES.md` shows the structure**: after each part, whether it is required, the element it goes on and where it
  may sit, and a `Write:` line to copy for the main components. `fire find` prints the same line.
- **`fire review`** (`scripts/review.mjs`, `npm run review`; `docs/frameworks.html#review`). It opens every screen of a
  product in a browser at 1440 and 375, light and dark, and:
  - writes a gallery (`.fire-review/index.html`): every screen as a row, its findings beneath, a crop of each element;
  - runs the structural rules on the rendered page, where no template expression or child component hides anything;
  - checks composition: `overflow-x`, `offscreen-control`, `one-h1`, `one-page-head`, `one-primary`,
    `nested-surface`, `unstyled-control`, `console-error`, `failed-request` and `empty-main` (errors) and
    `stretched-button` (a warning).
  Options on the command line or in `package.json` under `fire.review`. It exits 1 on an error. The three starters run
  it inside `npm run check`. It needs `playwright-core`.
- **`focusQuiet(el)`** (`fire/js/core.js`): moves focus to a heading, a title or a region without the keyboard ring; a
  button, link or field keeps its ring. Fire's own modules use it (a dialog with no field, list and detail, preview
  results, footnotes), and so do the Lit starter's router and the three starters' settings tabs.
- **A fieldset reset** in `fire/base.css` (`fieldset`, `legend`), and a rule that gives a legend at the head of a
  stacked fieldset the stack's gap. `<fieldset disabled>` disables every Fire form control inside it
  (`docs/forms.html#reason`, "A disabled group").
- **Agent rules** (`AGENT-RULES.md`): "Plan the app before the first screen" (map every screen to a template; one page
  head, one form pattern, one list), rules 18 to 23 on interaction (row actions in the row, buttons at their natural
  width, a form in one column, empty states inside their container, no bare native control, `focusQuiet`), and
  `fire review` as the first step before a screen is called done. `GUIDE.md` sections 3 and 6 say the same.
- The Lit starter's README: testing signed-in screens with a `__Host-` cookie, and why the page title is focused
  without a ring.

### Changed

- **The grouped segmented control scrolls on a phone** (under 640px) and drops its group labels there; the hairlines
  still mark the groups. Before, it could not scroll and was cut off.
- A dialog or sheet with no field still puts focus on its title, now without a ring on it.
- `templates/provider.html`: the not-found state's title is the page's `h1`.

### For products refreshing from 0.9.x

- **`fire lint` will report new errors in code that linted clean.** Each one marks a screen that renders wrong: fix the
  markup as the `fix` line says. The rules cannot be switched off for a line or a file.
- Add `fire review` to your check. Start with the routes in `package.json` under `fire.review` (see the Lit starter),
  fix its errors, then look at the gallery before each release.
- If you focus a heading or region by script, call `focusQuiet(el)` in place of `el.focus()`.
- If you carry a stopgap that resets `<fieldset>`, remove it.
- Copy the new `AGENT-RULES.md`, `GUIDE.md` and `docs/_ref/CLASSES.md` into the project.

### Known limits

- The static lint reports only what a file shows. A part added by a template expression or a child component is never
  reported missing, and the parent of a component's top element is unknown to it. `fire review` sees both.
- Only four parts are marked required (the callout's icon; the checkbox, radio and switch marks). Most facts say where
  a part must sit.
- `fire review` has run in Chromium only. It cannot judge hierarchy, rhythm, or whether a screen follows its template.
- A disabled fieldset was compared with disabled controls in Chromium only. Script that reads `el.disabled` on a
  control inside a disabled fieldset gets `false`.

## 0.9.1 — 19 Nov 2026

**Fire is public and under the MIT License.** No class, attribute value, token, event or export was added, removed or
renamed; the styles and behaviour are those of 0.9.0.

### Added

- **`LICENSE`** (MIT) and **`NOTICE`** at the root and in the package, and `"license": "MIT"` in `package.json`. The
  fonts (SIL Open Font License), the Lucide icons (ISC) and Lit (BSD 3-Clause) keep their own licences, which ship
  beside them in `fire/`.
- README: the slim build, its package entries (`/slim`, `/slim-map`), and the Lit starter's router and budgets.

### Changed

- The repository `github.com/vidhatanand/firedesign` is public. A product can depend on Fire by tag from a public
  clone or CI with no access token.
- The repository's history was rewritten before it was made public. Every tag keeps its name and its content, and
  every commit id is new.
- Nine template cards (`contract/cards/templates/`) named their sources by a path on one machine; `provenance` now
  names the product and the screen.
- `scripts/build-facet.mjs` and its test look for Facet's command-line tool in `$FACET_CLI`, then beside the
  repository (`../design-kit/dist/cli.js`), not at a fixed path.

### For products refreshing from 0.9.0

- Nothing to change in markup, styles or scripts.
- A lock file that records a Fire commit id (npm does for a `github:` dependency) holds an id that no longer exists:
  reinstall the dependency to record the new one. A fresh clone replaces an old clone of Fire.
- A product that vendors Fire takes `LICENSE` and `NOTICE` with the copy.

## 0.9.0 — 19 Nov 2026

**A production build carries only the Fire a product uses.** No class, attribute value, token, event or export was
removed or renamed.

### Added

- **`fire slim`** (`scripts/slim.mjs`, `npm run slim`; `docs/frameworks.html#slim`). It reads a product's source
  (HTML, JSX, Vue, Lit templates) and its theme record, and writes a trimmed Fire into a folder: one stylesheet in
  Fire's cascade order, a behaviour entry that imports and initialises only the modules needed (with the same
  `init()` and the same exports, so importing a dropped module fails the build), the font files of the theme's type
  set, and `slim.json`, a report of what was kept, the file and line that needed it, what was dropped and the sizes.
  - A part is kept when its class, element or attribute is in the source, when a function of its module is imported
    from `fire-design`, or when a kept module builds it at run time (a date field's popover, a copy button's toast).
    That map is `contract/slim-map.json`, generated from Fire's own sources by `scripts/build-slim-map.mjs` in the
    build, so it cannot go stale.
  - `--level family` keeps whole stylesheets; `--level component` also drops the rules of unused components inside
    them. `--theme theme.json` keeps one palette and one type set. A product that ships the Tweaks panel keeps every
    palette, type set and dial.
  - `--include` keeps named parts regardless, for class names built at run time; `--report` lists every such
    expression with its file and line. `--check` fails when the output is stale (for CI). `--verify <build dir>`
    fails when a production build still holds a rule or a module the report dropped.
- **The three starters build with it.** `npm run build` runs `fire slim` and aliases `fire-design` and
  `fire-design/css` to the trimmed folder; development keeps the whole of Fire. Each starter's check builds the slim
  production app and still matches Fire's templates on all 36 render comparisons, which is the proof that nothing a
  screen needs was dropped. `vite build --mode full` and `FIRE_SLIM=0 next build` build with the whole of Fire.
- Measured on production builds (gzip): a one-page product with a button, a field and a toast goes from 125 kB of
  CSS, 192 kB of behaviour and 610 kB of fonts to 22 kB, 65 kB and 82 kB. The starters save less (CSS 125 to 95 kB,
  behaviour 241 to 219 kB in the Lit starter) because their shells carry the Tweaks panel and the support chat, which
  keep every palette, type set and font.

- **The Lit starter has a production router** (`starters/lit-vite/src/lib/router.ts`, 243 lines, no dependency;
  the table is `src/routes.ts`). Paths take parameters (`/logs/:id`); a route loads its screen on first visit
  (`load: () => import(…)`) and prefetches it when its link is hovered or focused; guards may be async and return
  true or a path to redirect to, with the session in `src/lib/session.ts` to replace; an unknown address shows a
  not-found screen; a base path lets an app live under a prefix (Vite's `base` is the one setting). After each
  navigation the title is set and announced, focus moves to the new screen's heading, and scroll goes to the top or
  is restored on back and forward. While a screen loads the current one stays and Fire's page bar shows; a screen
  that fails to load shows an error with Try again.
- **The Lit starter's build splits per route**, with Lit, Fire and the starter's own library in stable shared files,
  and preloads the interface font. Its check prints every file's size, fails when a budget in `package.json`
  (`fire.budget`: first-route script, largest route, stylesheet) is exceeded, and proves the routing: a deep link,
  the guard, not-found, back and forward, lazy loading, the title, a failed load. The script for the first route
  goes from 221.6 kB gzipped in one file to 196.5 kB in five; Fire's behaviour is 178 kB of that and loads whole
  (see "Known limits"). The starter's README has "Going to production": what the host must do.
- **`fire slim` understands Fire loaded by a file path** (`/fire/fire.js`, `../fire/fire.js`, `…/fire/js/<name>.js`,
  `import()` of either, and a namespace import read through its members), as it does imports from `fire-design`. A
  namespace used where no member can be read keeps every module, and the report says where. `slim.json` gains
  `loadedBy` (package, path, both or none). A product that loads Fire by path must point that path at the slim
  output.

### Changed

- `scripts/lint-markup.mjs` exports its tokeniser (`scanSource`, `HOLE`) for `fire slim`.

### Removed

- Three one-off refactoring scripts whose work is finished (`layout-pass`, `tokenise-pass`, `scope-private-props`)
  and five build briefs of releases 0.1 to 0.4 in `docs/_ref/`. One unused keyframe and three unused component
  tokens (`--fd-site-h`, `--fd-site-media-min`, `--fd-decision-part-min`). None was public: no class, documented
  token or export went.

### Known limits

- Behaviour is trimmed by module, not by function: one field keeps the whole forms module, one toast the whole
  overlays module. Splitting those modules would save more and is not done.
- Fire's behaviour loads in one piece on the first route, even with routes split: its `init()` reaches every module
  the build kept. Loading a module with the first screen that needs it would need a change in `fire slim`.
- Under `style-src 'self'`, WebKit logs a `style-src-attr` report for every `<select>` element, with or without Fire
  (a bare page does the same). Nothing is refused and nothing renders differently; seen in Playwright's WebKit, not
  checked in Safari.
- Fire's own templates wire their demonstration behaviour with an inline module script, so a template page served
  as it is does not run under `script-src 'self'`. The starters, which are what a product copies, do.
- The router's steps in the Lit starter's check run in Chromium only; a failed screen load was not tested in real
  Safari, and no real host or CDN was tested.
- A value written from an expression (`data-variant=${…}`) keeps every variant's rules.
- With `--theme`, a saved Tweaks look or `?look=` cannot bring back a palette or type set the build dropped.
- The comparison of Fire's own templates at component level ran in Chromium only; the starters' checks ran in all
  three browsers.

## 0.8.1 — 19 Nov 2026

**The documents catch up with 0.8, and one boundary is made consistent.** No class, attribute value, token, event or
export was removed or renamed.

- **Documents.** Every docs page and every written document was read against the code. No page states an earlier
  release as the present any more (`docs/frameworks.html` said "Fire 0.6", `docs/index.html` "0.4",
  `spec/ARCHITECTURE.md` and `spec/EXPORT.md` "Fire 0.6", the starters version 0.6.0).
  - `docs/frameworks.html` lists every check and command (`fire find`, `fire lint` with surfaces, `fire lint-css`,
    `fire render-equal` with rules R14 and R15, the gate, the looks and palette checks, pictures, `CLASSES.md`) and
    every entry of the package.
  - `docs/index.html` covers apps, websites, phones and email, with a "Where to start" table by surface.
  - `docs/tweaks.html` no longer says status and chart colours stay fixed (they follow the palette since 0.8.0), and
    its theme record table has `fire`, `signature`, `brand` and every dial.
  - New docs sections: "Dashes" on `docs/charts.html`, "Surfaces" on `docs/catalogue.html`; each named look shows
    its picture treatment on `docs/looks.html`; the toolbar's wrapping on `docs/shell.html`.
  - `spec/ARCHITECTURE.md` describes the system as built (layout, the 17 package entries, the theme record, the
    catalogue's kinds and surfaces, the checks). `spec/EXPORT.md` and `spec/export-map.json` add what 0.7 and 0.8
    mean for an exporter: seven more events, the attributes Fire sets itself, five more containers Fire rewrites,
    page transitions per framework (L8), and surfaces, the tab bar, template states and website sections (W1 to W4,
    `pages` in the map).
  - `contract/cards/README.md` covers template cards, the kind `section`, the order of `surfaces` and the optional
    `relation`; `README.md` and `GUIDE.md` list every package entry.
- **Phone boundary.** Twenty-one older rules and two scripts counted a width of exactly 640px as a phone, while the
  named breakpoints (phone below 640px) and everything built in 0.8 count it as a tablet. They now agree: phone
  rules apply below 640px (`max-width: 639.98px`). Only a window or container exactly 640px wide changes. The Facet
  export's `tablet` breakpoint is 640px, not 641px.
- **Starters.** Versions and READMEs say what the starters are now (the tab bar, `data-fd-surface="app"`, the
  checks they run).
- **One command for the version.** `node scripts/version.mjs <x.y.z>` (`npm run release:version`) writes the
  version in every place that states it (30 places: the package, the theme module, the named looks, the export map,
  every dependency example, the starters), and `node scripts/build.mjs --check` fails when any of them, or the
  changelog entry, is left behind.

## 0.8.0 — 19 Nov 2026

Fire now covers public websites and phone apps as well as app screens. A site is built from a layout foundation and
fifteen section types, including an article page and a filtered listing, and its pictures follow the look. A table with many
fields gets one combined filter. A phone gets a tab bar, a page can move to the next without redrawing its chrome, and every
part says which surface it belongs to (app, website, phone or email), so a search, a lint and the Catalogue page can
keep a part out of a page it does not suit. A product's own CSS and tokens get a check, status and chart colours
follow each palette, and a picture of every part is searchable. No class, attribute value, token, event or export was
removed or renamed: every class and attribute value in 0.7.0's catalogue is still there, and a product that copies
`fire/` keeps working. A few things look or behave differently on purpose; read "Changed" before you refresh.

### Added

**Websites** (`docs/site.html`, `docs/site-sections.html`; CSS `fire/components/site.css`, behaviour `fire/js/site.js`)

- The foundation: `fd-site` (a size container that every section measures, so a site renders the same inside a board
  or a docs specimen as on its own page), `fd-site-section`, `fd-site-container` (`data-width="narrow|full"`) and one
  section head, `fd-site-head` with `fd-site-eyebrow`, `fd-site-title`, `fd-site-lead` and `fd-site-head-actions`.
- Four named breakpoints, also in the contract as `breakpoints` in `contract/fire-contract.json`: phone below 640px,
  tablet 640 to 899px, desktop from 900px, wide from 1200px.
- Fluid type that grows with the container (`fd-site-display`, `-title`, `-heading`, `-lead`; tokens `--fd-fluid-*`). It
  follows the type set and `data-text-size`.
- Section rhythm (`data-rhythm="tight|loose"`, `data-rule`) and six grounds (`data-ground="page|sunken|raised|inverse|accent|texture"`),
  each with text at 4.5:1.
  A seventh ground, `image`, is under "Pictures".
- Fifteen section types, each with variants that differ in structure: `fd-site-header`, `-hero`, `-logos`, `-features`,
  `-split`, `-stats`, `-steps`, `-quote`, `-pricing`, `-compare`, `-faq`, `-cta`, `-footer`, `-posts` and `-article`. They are the
  new catalogue kind `section`. Fire ships no block library: a section brings layout and rhythm, and every control,
  table and card inside it is an existing Fire component.
- `fire/js/site.js` runs the header's menu sheet below desktop, the logo strip's pause button, the pricing period switch
  and the compare table's plan tabs. Nothing on a site animates on scroll: no entrance effects, no parallax.
- The rule that keeps a site from looking generated is on `docs/site.html#generated`: vary a site by its look
  (palette, type set, signature, dials) and by how its sections are composed, never by a decorative variant.
- Ten website templates: `site-home`, `site-pricing`, `site-customers` and `site-changelog`, and the six for publishing
  listed under "Publishing", with their shared header and footer in `templates/site-shell.js` (`mountSite()`,
  `renderHeader()`, `renderFooter()`). `templates/index.html` now groups the 42 screens by surface: in the app, signed-out and system pages, public pages read from a link, website,
  documentation site.

**Publishing** (`docs/site-sections.html#article`, `#posts`, `#cta`; CSS `fire/components/site.css`, behaviour `fire/js/site.js`, email `fire/email/email.js`)

- `fd-site-article` is the section for long text: a head (breadcrumb, eyebrow, title, standfirst, `fd-site-authors`, date,
  actions), an optional cover, the body, and a foot of ruled rows (notes, references, cite this, tags, copy link, the
  authors, a sign-up). `data-layout="plain"` is one reading column; `aside` adds a sticky rail for the contents, key
  facts and the download (`data-side="start|end"`), which becomes a disclosure below desktop; `cover` spans the head over
  a wide frame, like a report's front page.
- The text is `fd-prose` with the new `data-size="lg"` (18/30, a 68ch measure, headings a step larger). A figure, table or
  pull quote marked `data-breakout` runs wider than the measure. Footnotes are an `fd-site-notes-ref` in the text and an
  `fd-site-notes` list below, each with a back link; following either end moves focus to the other, so the reader finds
  their place again. `fd-site-refs` sets references with a hanging indent. A button with `data-fd-copy-link` copies the
  page's link and announces it (`fd:copy`).
- `fd-site-posts` is now also a listing. Entries carry `data-kind` and `data-tags`; the tools bar (`fd-site-posts-tools`)
  holds existing controls (a chip nav or tabs, a select, a search), each marked `data-filter`, and `fd-site-posts-count`
  says "12 of 48 resources" in a polite live region. When nothing matches, the `fd-empty` after the list shows with a
  `[data-clear]` button. `data-page-size` pages the matches with numbered buttons or a `[data-more]` Show more button, and
  `data-address` keeps the filters and the page in the address (`?kind=report&topic=pricing&q=…&page=2`), so Back restores
  the listing. `fd:change` reports `{ value, shown, total }`; `filterPosts()` sets a listing from script. New parts:
  `fd-site-posts-kind`, `-meta`, `-cover` (a cover drawn in type) and a list layout with no date rail.
- One sign-up form in three places: the call to action (`fd-site-cta`, `data-layout="split"`, with a consent line), a
  sign-up column in the footer (`fd-site-footer-signup`) and an article's foot. `data-state` on the form is `invalid`,
  `busy`, `sent`, `subscribed` or `failed` (idle has none). Submitting fires a cancelable `fd:submit { value }`: cancel it,
  send the address yourself and call `setSignup(form, state)`. A form with an `action` posts there. The three messages are
  the label keys `signup.required`, `signup.invalid` and `signup.failed`; the listing's are the eight `posts.*` keys.
- `renderEmail()` takes three more blocks, `section` (a labelled rule), `story` (a kind label, a linked title, a paragraph
  and a link line) and `list`, eleven blocks in all, and `fire/email/examples.mjs` has a newsletter issue
  (`docs/assets/email/newsletter-ember.html` and `.txt`).
- Six templates: `site-blog`, `site-post` (an article with the `cover` layout), `site-resources`, `site-report`,
  `site-research` and `site-newsletter`. Fire adds no part for what it already has: key facts are `fd-kv`, findings the
  features list, a pull quote the quote section, and cite this the copy field (`GUIDE.md` section 5).
- The media of an `fd-doc-frame` can be an `iframe` (`--fd-doc-embed-h` tall) as well as a picture; the newsletter page
  shows its issue that way.

**Pictures** (`docs/site.html#pictures`, `docs/tweaks.html#imagery`; CSS `fire/components/site.css`)

- `fd-site-media` is a figure around one `img`, which carries `alt` and its own `width` and `height` so its place is held
  before it loads. `data-ratio="wide|photo|square|portrait|tall"` crops it, `data-position="start|center|end"` keeps a side
  and `data-frame` gives it the media frame's hairline and radius. It goes in the media slots of the hero, split, features and
  posts sections and in an article's cover and text. A picture a visitor supplies still goes in `fd-doc-frame`, which
  checks its address.
- The image ground, `data-ground="image"`: a picture behind a section in `fd-site-backdrop`, with `data-scrim="dark|light"`
  (dark by default). Text keeps 4.5:1 whatever the picture, by construction: the section takes the scheme of its scrim, and
  from desktop the head and its actions keep to one column under a scrim at full strength; below desktop the picture is a
  band above the text. It is built for head-led sections, the hero and the call to action band.
- Four treatments, `data-treatment="natural|mono|duotone|wash"`, made with CSS filters and blend layers and no script. The
  `imagery` dial sets one for every picture that names none: `data-imagery` on `<html>`, `dials.imagery` in the theme
  record (the default, `natural`, writes no attribute) and a Pictures row in Tweaks. Each named look sets its own:
  `steady` and `hearth` natural, `clear` and `folio` mono, `marquee` and `operator` duotone, `gentle` and `instrument` wash.
- `templates/media/` holds ten generated placeholder pictures, which a product replaces with its own (`templates/media/README.md`).
  `site-home`, `site-customers`, `site-blog` and `site-post` use five of them.
- The lint warns `img-attrs` for an `<img>` inside `fd-site` without `alt` (`alt=""` is right for decoration) or without both
  `width` and `height`.

**Filters** (`docs/data.html#combined`; CSS `fire/components/data.css`, behaviour `fire/js/filters.js`)

- `fd-filters` is one Filter button for a table or list with many fields. Its menu has a search that finds fields and values
  together ("fail" offers Status: Failed in one step), and each field opens a panel of values with counts. A field's
  `data-kind` is `one`, `many`, `date` (presets and a custom range), `text` (contains) or `flag`; `data-op="not"` makes it
  "is not". What is set shows as chips that read as a sentence: the operator flips "is" and "is not", the value reopens its
  panel. Below 640px the menu is a bottom sheet in two steps. The button's key is `F` (`data-fd-key`).
- `data-fd-for="#table"` makes it hide the rows that do not match (each row carries `data-<field>`); `data-fd-url` keeps the
  set in the address. `fd:filter` reports `{ filters, source }`, `getFilters`, `setFilters` and `clearFilters` read and
  write the set, and `matches()` tests a record for a page that filters its own data. The 23 `filters.*` label keys are on
  `docs/writing.html`.
- The rule: up to three fields people change all the time stay `fd-filter` chips; more than three use `fd-filters`. The
  `audit` template now uses it, with a search and a period beside it.
- `fd-toolbar` wraps on purpose (see "Changed"), and `fd-toolbar-filters` is an optional wrapper around its filters.

**Phone** (`docs/shell.html#tabbar`)

- `fd-tabbar`: three to five destinations at the bottom of the screen, as a direct child of `fd-app`. Items are
  `fd-tabbar-item` with `fd-tabbar-label`; `fd-tabbar-badge` shows a count and `data-dot` a new mark. An item
  with `data-fd-mobile-nav` is "More" and opens the menu sheet. It shows only below 640px.
- `--fd-tabbar-space` is the room the bar takes. The page, the support button, chat, toasts, the keys hint and the
  Tweaks button already leave it free.

**Page transitions, opt in** (`docs/transitions.html`; `fire/components/transitions.css`, `fire/transitions.css`, `fire/js/transitions.js`)

- The sidebar, top bar, tab bar, documentation bars, site header and support button hold still, and only the page
  changes: `fade`, `slide` (a phone drill-down that reverses on back and mirrors in right-to-left) or `none`.
- A multi-page site opts in with three steps: link `fire/transitions.css` after `fire.css` (it is exported as
  `fire-design/transitions.css`), put `data-fd-transition="fade"` on `<html>`, and mark the module scripts that build
  the page `blocking="render"`. A single-page app calls `transition(update, { kind, direction })` and needs none of the three.
  One link can choose its own kind with `data-fd-transition` on the `<a>`.
- A page that does not ask gets no names and no transition. Reduced motion and the motion dial at "none" turn it off.
  All 42 templates and the three starters opt in.

**Tagging by surface** (`docs/catalogue.html`)

- `data-fd-surface="app|website|phone|email"` on `<html>` or any element says where a page is used. The lint reports
  `surface-mismatch` (a warning) for a part whose card does not include that surface; `--surface <name>` sets it for
  files that declare none and `--no-surface` turns the rule off. A phone page accepts app parts.
- `npx fire find` lists each result's surfaces, and `--surface` also says when a clearly better match belongs to another surface.
- The Catalogue page (`docs/catalogue.html`) filters every part, pattern and template by surface, kind, data shape and words (the
  filters are in the address, so a link can be shared), and can show a picture of each. Each docs section carries its surface tags. The Facet export carries surfaces.

**Checks**

- `fire lint-css` (`scripts/lint-css.mjs`, `npm run lint:css`) checks a product's CSS and tokens against
  `contract/fire-contract.json`: unknown or reserved `--fd-` tokens, a product token that repeats a Fire token,
  raw colours, sizes and durations, and restyling of an `fd-` class. A product declares its prefix with `--prefix` or
  `"fire": { "prefix": "acme" }` in `package.json`. The rules are in `docs/frameworks.html#own-css`. The three starters run it.
- lint-markup's JSON output gains a `warnings` count and findings can have severity `warning`.

**Templates**

- Every one of the 42 templates has a card in `contract/cards/templates/`. The 39 that have states beyond the default open
  each from `?state=`, from the screen's Demo state band, or with the control its card names (the header's menu button,
  Copy link); the card lists them with how to set each one. `blank`, `docs-home` and `shell-static` have none.
- The overview and logs screens of the three starters read `?state=` too, through a typed page state (`loading`, `empty`,
  `error` on overview; `loaded`, `loading`, `empty`, `error`, `no-results` on logs; any other value is ignored), and each
  starter's check opens the empty, error and no-results views.

**Colours** (`docs/foundations.html`)

- Every palette derives its own success, warning, danger and info and its six chart series from its accent, ink and
  page. Tones keep their meaning and keep a distance from the accent; chart series are checked for 3:1 contrast, for
  distance in normal vision and under simulated protanopia, deuteranopia and tritanopia, and for no olive in the light
  scheme. `node scripts/build-palettes.mjs --check` holds every palette and toned palette to the rules.
- `data-marks="dash"` on `fd-chart` gives line series 2 to 6 a dash each, so colour is not the only cue. The legend
  and the tooltip show the same dash.

**Small parts**

- `fd-screen-foot`: the legal row of a centred screen (copyright, Terms, Privacy, language).
- A picture frame for a picture a person supplied: `fd-doc-frame` with `data-fd-src`, `data-fd-alt`, `data-fd-hosts`
  (hosts besides the page's own that may serve it), `data-fd-data` and `data-ratio="wide|photo|square"`. The address is
  checked with `safeImageUrl()` first; `setPicture(frame, url)` points a frame at another. It keeps its shape while the
  picture loads and shows a tile for no address, a refused address and a failed load. The three tile texts are the
  label keys `frame.empty`, `frame.refused` and `frame.failed`.
- `data-fd-brand` (JSON in a `<script type="application/json">`, or as an attribute) and `setBrand({ name, mark, logo,
  logoDark, href })` set the product's brand once and fill every `fd-brand` on the page.
- A logo field: `fd-dropzone` with `data-layout="logo"`: a preview, a hint, Upload and Remove, a size and type check,
  and `fd:files` to run your own upload and `setFileProgress()` to show it.
- One menu for every row: put `data-fd-flags="paused admin"` on a row or its opener, and mark menu items
  `data-fd-when`, `data-fd-unless` and `data-fd-else="disable"`. Items that do not apply are hidden when the menu
  opens, and a menu with nothing left stays shut with `aria-disabled="true"` on its opener.
- Icons `wrench` and `calendar-check` (274 in all).
- The theme record takes `brand: { name, mark, logo, logoDark, href }`, and `renderEmail()` accepts `brand.logo` (the
  older `logoUrl` still works and wins when both are given), so an app, a site and an email carry one brand.

**For agents**

- Every entry of the search index except the modules has a picture, `contract/pictures/<kind>/<id>.png` (226 files,
  about 9 MB). `contract/index.json` names the rule in `pictures`, `npx fire find --json` returns each result's
  `picture`, and `npm run build:pictures` renders them again. `node scripts/build.mjs --check` fails when an entry has
  no picture or a picture has no entry.
  The pictures are in the repository and are left out of the installed package, which stays under 2 MB; there a
  result has no `picture`.
- `docs/_ref/CLASSES.md` lists every class with its parts, attributes, values, state and events. It is generated from
  the catalogue (`node scripts/build-classes.mjs`, part of the build), so it is always complete; `VOCABULARY.md`
  explains the common parts in prose.
- The catalogue lists 184 components, patterns, layouts and sections (154, 10, 5 and 15), up from 163, and 4 modules, up
  from 3 (`transitions` is new). `contract/index.json` has 230 entries, and the size check on it allows 30,000 tokens.
- **Starters**: each has the tab bar, `data-fd-surface="app"` on `<html>`, lint-css beside the markup lint in its check
  (and `--surface app` on the markup lint), and the page transition (Lit and Vue call `transition()`, Next wraps each
  screen in React's `<ViewTransition>`; rule R14 in `spec/EXPORT.md` ignores the `vt-*` attributes React writes). Fire's
  typings now cover what they call, so they cast less. They render like the templates; rule R15 makes the pixel
  comparison look at the screen's root alone, so a fixed tab bar or a toast around it does not count.

### Changed

- **Ember's chart series 3 to 6** are now teal, magenta, green and blue (they were blue, violet, green and amber), so
  they stay apart for every reader. Series 1 and 2 and every Ember status colour are unchanged. A product that drew the
  four colours by hand to match a chart should read them from `--fd-chart-3` to `--fd-chart-6`.
- **Every other palette now has its own status and chart colours.** Until 0.7 only Ember's were defined and the other
  fourteen palettes inherited them. Under volt, forest, midnight and the rest, `fd-badge`, `fd-status`, `fd-callout`,
  `fd-banner`, toasts and charts change colour a little, in the direction of the palette.
- **`fd-frame` and `fd-crosshair` belong to the `page` component** in the catalogue; they were listed under the app
  shell. The classes are the same.
- **Card `surfaces` changed on 23 cards** (19 of them in which surfaces they list), so `fire find --surface` and the
  `surface-mismatch` warning answer differently. The visible changes: `decision`, `delta`, `icon`, `initial`,
  `inline-code`, `prose`, `text` and `type` no longer list `email` (an email is written by `renderEmail()`, not by
  those classes; only the email, initial-helpers and theme-record modules list it now); `doc-frame` is now app, website and phone; `commit`, `decision`, `log`, `panel`, `split`, `sheet` and
  `toolbar` add `website`; `doc`, `form-section` and `table` add `phone`; `mobile-nav` adds `app`.
- **lint-markup's JSON** output has a `warnings` count beside `errors`, and a finding's `severity` can be `"warning"`
  (it was always `"error"`). Warnings never change the exit code.
- **The index** has a `pictures` field and the kind `section`. The theme record's schema has `brand`; `validateTheme()`
  rejects an unsafe picture address in it. The contract has `breakpoints`. The `fire` command has `lint-css`, and the
  package exports `fire-design/transitions.css`. `scripts/lint-css.mjs` is in the package files.
- **The top bar's menu button** is hidden below 640px when a tab bar has a "More" item, because the sheet opens from the bar.
- **`fd:select`** from a menu also carries `row`, the opener's row.
- **`fd-toolbar` wraps on purpose.** It is CSS only and needs no markup change, and it measures its nearest container (the
  page in an app; put it in `fd-cq` elsewhere). A toolbar with a search, an end group and filters stays on one line while
  they fit. When they do not, the search and the end group share the first line and the filters move together to the
  second; how wide "fits" is depends on whether there are one, two, three or four-or-more filters (780, 940, 1,110 and
  1,280px). Below 640px the search takes a line, the filters become one row that scrolls sideways with a fade, then the end
  group. Every `fd-toolbar` in a product changes this way, `templates/logs.html` included: its three filters now scroll
  on a phone instead of wrapping.
- **The `audit` template's toolbar** uses `fd-filters` (who, kind, target, access changes, source) in place of two filter
  chips and the row of applied filters under them.
- **Fire's own audit** (`npm run audit`) no longer counts relative colour syntax that starts from a token, such as
  `oklch(from var(--fd-accent) …)`, as a raw colour; the colour is derived from the palette.
- **Phone screens**: parts that sit at the bottom of the screen (the support button, chat, toasts, the keys hint) rise
  by `--fd-tabbar-space`, which is 0 on a page without a tab bar.

### Not verified

- Page transitions are verified in Chromium. Firefox has no cross-document transitions, so pages there load as before;
  `transition()` in Firefox was not tried. Safari was not verified: in WebKit's test build the incoming page did not
  paint during a transition, so treat Safari as unsupported until you have tried it.
- The tab bar's spacing for the home indicator (`env(safe-area-inset-bottom)`) was checked in a narrow browser, not on
  a real iPhone.
- Nothing new was tried with a screen reader: the tab bar, the site header's menu sheet, the logo strip's pause
  button, the pricing period switch and the logo field follow the ARIA patterns, and that is all that is claimed.
- The picture treatments' blend modes (`mono`, `duotone`, `wash`) and the image ground's scrim were checked in Chromium
  only, and the placeholder pictures were looked at under the eight named looks, not under every palette.
- The combined filter, the article's note links, the sign-up form's states and the listing's live count follow the ARIA
  patterns and were not tried with a screen reader either.
- As before, the rest of Fire was reviewed in Chromium only; Safari and Firefox are untested.

### Decided against

- Thin wrappers for React 18 and older. The React package needs React 19, which `peerDependencies` says.

### For products refreshing from 0.7

Check the screens in "Changed", then:

- **Status and chart colours.** Look at charts, badges and banners under any palette but Ember. If you had set status
  colours to match the old values, remove them; they now follow the palette.
- **Tab bar.** A product that built its own bottom bar for phones replaces it with `fd-tabbar` and drops its own
  padding for the page and the floating parts.
- **Icons and menus.** The stopgaps for the icons `wrench` and `calendar-check` and for per-row menu items (Assay R10)
  can go: use the icons and `data-fd-flags` with `data-fd-when` and `data-fd-unless`.
- **Brand.** Replace the brand code that swaps a logo in the shell with `data-fd-brand` or `setBrand()`, and give
  `renderEmail()` the same `brand`.
- **Surface.** Put `data-fd-surface` on `<html>` and run the markup lint; fix each `surface-mismatch` or leave the part
  out of that page. If you read card `surfaces` yourself, read them again.
- **Your own CSS.** Run `npx fire lint-css src --prefix <yours>`. Errors are a token of yours that repeats a Fire token,
  a `--fd-` name Fire does not define, a raw colour. Warnings are the rest; none fails a run.
- **Page transitions.** Opt in with the three steps if you want them. A page that does not is unchanged.
- **Websites.** A product site built by hand should compare its header, hero, pricing and footer with the sections
  before it adds another variant. A blog, a library, a report or a newsletter page starts from the matching `site-*`
  template: `site-post` is an `fd-site-article` with the `cover` layout, and `site-blog` and `site-resources` are
  `fd-site-posts` listings.
- **Pictures.** Give every `<img>` on a site `alt` and its own `width` and `height` (the lint warns `img-attrs`), put the
  site's own art in `fd-site-media`, and replace the placeholders in `templates/media/` before you copy a template. Text
  over a picture goes on the image ground only.
- **Tables with many filters.** Replace a row of four or more filter chips with `fd-filters` and `data-fd-for`.
- **Toolbars.** Check each `fd-toolbar` at 375px and between 640px and 1,100px wide. A toolbar copied from `templates/logs.html`
  or `templates/audit.html` should take the template's new markup.
- If your code reads lint-markup's JSON, read `warnings` and `severity`. If you copy `templates/`, take
  `data-fd-surface` and `data-fd-transition` on `<html>` and `blocking="render"` on the module scripts with it.

## 0.7.0 — 19 Nov 2026

Fire gains what products built beside it: decisions with an Undo, grouped and live data, forms for dates, colours and
dangerous actions, email, a vetted font catalogue, dials for a product's structure and signature, nine new or rebuilt
screens, and tools that let an agent find a part by its job and refuse a near-duplicate. No class, attribute value,
token, event or export was removed or renamed: every class and attribute value in 0.6.2's catalogue is still there,
and a product that copies `fire/` keeps working. A few things look or behave differently on purpose; read "Changed"
before you refresh.

### Added

**Decisions and page states** (`docs/decisions.html`, `docs/content.html#page-states`)

- `fd-decision`: the brief, with `fd-decision-lead`, `-facts`, `-parts`, `-quote`, `-outcome` (`data-tone`) and
  `-actions`. `fd-delta` shows a value before and after. `fd-impact` says how much a change will touch.
- `fd-draft`: words an agent wrote, which stay the agent's until the person uses them (`data-fd-draft="use|discard"`;
  `fd:accept`).
- `fd-commit`: a reason with a word budget and buttons named for their effect (`data-verb`). `data-fd-hold` waits
  before it goes and `data-fd-hold-in="toast"` waits in a toast. `fd-commit-lock` says who can decide when the viewer
  cannot. Events `fd:commit`, `fd:hold`, `fd:undo`.
- `fd-hold`: a countdown with Undo (`data-seconds`), and `hold()` and `cancelHold()`.
- `fd-preview` (edit, see what it touches, commit; it goes `stale` when a field changes), `fd-queue` (what waits, one
  case at a time, beside the list; list then case on a phone) and `fd-states` (one state for a screen or section:
  `loading`, `ready`, `empty`, `filtered`, `error`, `no-access`, `not-found`, `off`, `expired`; `setState()` and
  `data-fd-set-state`).
- Toasts: `toast({ undo })` adds Undo and lasts 8 seconds; `toast.hold()` holds a send with a ring and Undo. Ctrl+Z or
  Cmd+Z outside a text field presses the newest Undo.

**Data**

- Grouped rows: `fd-table-group` with a `fd-table-group-head` row (title, count, toggle, `data-collapsible`, a
  checkbox that selects the group, sorting within each group). (Touchstone R12, Assay R9)
- Steps: `data-state="running|failed|waiting|skipped"` per step, `data-variant="tracker"`, `fd-step-owner` and
  `fd-step-action`. (Assay R4)
- List and detail: `fd-list-detail` (a list beside the record; one pane at a time on a phone, with a back button), and
  `fd-list` as a listbox with `data-value` and `fd:change`. (Assay R4)
- Log anchors: `data-lines` numbers the rows, `#L42` links to one, `data-anchor` prefixes them, and
  `data-action="first-error"` jumps to the first error; `fd:select` reports a chosen line. (Assay R4)
- Small items: `fd-stat-delta` with `data-tone="neutral"` and `data-dir="flat"`, `fd-status-note`, `fd-empty-meta`,
  and `fd-bars-was` and `fd-bars-mark` for a bar with the previous value.

**Forms** (`docs/forms.html`, `docs/overlays.html#period`)

- `fd-datefield`: one date, typed or picked; it posts `YYYY-MM-DD`; `data-min-date` and `data-max-date`. (Touchstone R11)
- `fd-period` with `fd-daterange-compare`: a period and what to compare it with (`none`, `previous`, `year`), and the
  presets `lastmonth`, `quarter` and `year`.
- `fd-color` and `fd-swatch`: a colour from a picker or a hex code, with its contrast on the page and against the
  accent; `fd-swatch` shows a colour that is content. (Fragmatic)
- `fd-confirm-inline`: type a name on the page before a destructive button works (`data-confirm`). (Assay R9)
- `fd-reason`: a control that is off, with why and who can turn it on.
- `fd-codes`: one-time recovery codes with Copy all and Download (`fd:download`).

**Charts and shell**

- Quadrant chart: `data-fd-chart="quadrant"` and `charts.quadrant()`, with a list by corner on a phone. (Fragmatic)
- `fd-initial` and `data-fd-initial`: an organisation's first letter as a dot-matrix mark. `initialMark()`,
  `initialRows()` and `initialTone()` in `fire/js/initial.js` run on a server. (Imprim)
- Reading column: `fd-band[data-column="xs|sm|md|lg|xl"]`. Frame marks: `data-marks="crosses|dots|corners"` on
  `fd-frame` and `fd-band`.
- Go-to keys: `data-fd-keys="g l"` on any control, a hint while a key is waiting (`fd-nav-key`, `fd-keys-hint`) and the
  shortcut sheet (`fd-shortcuts`). Event `fd:keys`.
- Palette records: `command.records({ group, search })` adds found records to the command palette, with a
  `fd-command-note` for searching and for errors.
- `fd-running`: the top bar's count of work in progress, with a popover list. `fd-service-status`
  (`data-status="operational|degraded|outage|maintenance"`): an icon when normal, a labelled pill when not.
  `setServiceStatus()`.

**Email** (`docs/email.html`)

- `fire/email/email.js`: `renderEmail({ theme, brand, preheader, blocks, locale })` returns an HTML part and a text part
  in the product's look: opaque colours, a 560px table layout, dark mode, an Outlook button and right-to-left
  locales. (Imprim)

**Templates**

- Eight new screens: `decisions`, `decision-case`, `answer` (approve or decline from an email link), `record` (one team
  on one page), `audit`, `status-admin`, `status` (the public page) and `proof` (a shared result). The `settings`
  template is rebuilt: nine in all. Each has a card in `contract/cards/templates/`. `templates/index.html` lists
  all 32 screens.
- The states of these nine screens open from `?state=` or from the screen's Demo state band, so a state can be linked
  and checked.

**Looks**

- Type sets: a vetted font catalogue of 53 open-licensed families (`contract/fonts.json`) with measured metrics and a
  metric-matched fallback face. A theme record's `type` can name families, a heading weight and tracking, heading case
  and tabular figures; `validateTheme()` enforces the pairing rules. `node scripts/fonts.mjs add "<family>"` puts a
  family's files in your product.
- Signature dials: one theme setting restyles every texture, glyph, loader and frame. `data-signature-field`, `-mark`,
  `-cell`, `-ramp`, `-marks` and `-intensity` on `<html>`; new fields (`halftone`, `spark`, `contour`, `stipple`,
  `bars`), marks (`dots`, `squares`, `plus`, `dashes`) and ramps. `data-signature="own"` pins an instance.
- Four structural dials: `data-surfaces="flat|outlined"`, `data-elevation="none|lifted"`,
  `data-controls="outlined|filled"` and `data-headings="upper|mono"`. Each has a Tweaks control and a theme record
  field, and each is checked for contrast in every palette.
- Named looks: eight complete theme records in `contract/looks/named` (steady, operator, folio, hearth, instrument,
  marquee, gentle, clear), far apart in palette, type and structure. Tweaks has a Looks row that applies one whole;
  `?look=<name>` puts a shipped look on a page before first paint; `docs/looks.html` shows each look on three real
  screens. `scripts/looks-check.mjs` renders real screens under every look and 40 random theme records and checks
  console errors, overflow, text contrast and focus rings.

**For agents**

- `npx fire find "<what you need>"` searches parts by what they are for (`--surface`, `--data`, `--kind`, `--limit`,
  `--json`) over `contract/index.json`: 198 entries (components, patterns, templates, layouts and modules).
- The catalogue lists modules (`fire/email/email.js`, `fire/js/initial.js`, `fire/js/theme.js`), each with a card. It
  now holds 163 components, patterns and layouts, up from 142.
- The near-duplicate gate: `node scripts/gate.mjs` compares every component, pattern and template and fails a pair that
  does the same job in nearly the same way, unless a card declares a `relation` (`variantOf` or `distinctFrom`, with
  `because`). `--probe <page>` checks a candidate before you add it. `scripts/build.mjs` runs it.

### Changed

- **Settings template rebuilt.** One panel at a time, a side navigation grouped by owner, `?tab=` to open one, and
  loading, error and member states. A product that copied `templates/settings.html` should compare it with the new one.
- **Phone top bar.** A healthy service is not shown below 640px, the team switch keeps only its tile below 420px, and
  below 360px a service problem outranks the running count.
- **Right-to-left.** The bar on a selected row now sits on the start side.
- **Label keys.** There are 71 keys, all listed in `fire/js/core.js` and `docs/writing.html`; 34 were documented
  before. A translated page needs the new ones: `datefield.*`, `color.*`, `confirm.*`, `keys.*`, `running.count`,
  `status.*`, `log.line`, `period.versus`, `toast.*`, `commit.*`, `hold.*` and `draft.used`.
- **Small labels, fields, secondary controls and objects read semantic tokens** (`--fd-eyebrow-*`, `--fd-field`,
  `--fd-control-*`, `--fd-surface-edge`, `--fd-shadow-object`), so the structural dials reach them. The default look
  is unchanged. A product stylesheet that recolours these must set the same tokens, or a dial will not reach it.
- **Events.** `fd:select` now also fires for log lines, list-detail rows and queue items; `fd:change` for a listbox and
  for `fd-states`; `fd:open` and `fd:close` for table groups. A generic handler must check the element and `detail`.
- **Narrow screens.** Log level chips wrap, callout bodies break long words, horizontal steps hide inactive labels on a
  phone, and `data-fit` on `fd-number` wins inside a field.
- **Keys.** `/` focuses a search that carries `data-fd-search-hotkey`, and `g` then a letter follows a `data-fd-keys`
  control. Keys are ignored while a field has focus.

- **Focus ring.** `--fd-focus` is now a palette token: the accent where it reaches 3:1 on every ground a control sits
  on, else the accent text. Ember's light-mode ring and input focus line are the darker orange (`#be4000`); Volt's are
  olive. Input, search and code-field focus lines use `--fd-focus`. Four text colours that the look sweep measured
  under 4.5:1 are fixed (the announcement tag, the snippet prompt, the account avatar, an accent secret value).
- **Types.** `fire/fire.d.ts` declares every export and event of 0.7, and `theme`, `palettes`, `typefaces`, `fonts`,
  `palette-rules`, `initial`, `looks` and `email` have their own declarations. New package entries: `fire-design/email`,
  `/initial`, `/looks`, `/fonts`. A test fails when a declaration and the runtime differ.
- **Starters** are converted from the rebuilt settings template and the new shell, and each passes its check again.

### For products refreshing from 0.6.x

Check the screens in "Changed", then delete the stopgaps these parts replace, each with the request it closes:

- **Touchstone R11:** the native `<input type="date">` on two pages becomes `fd-datefield`.
- **Touchstone R12:** `tr[data-group-head]` in one `tbody` becomes `tbody.fd-table-group` with `fd-table-group-head`.
- **Assay R4:** your list-and-detail layout, selected row and phone back step become `fd-list-detail`; log line
  numbers and "jump to first error" become `data-lines` and `data-action="first-error"`; live step state becomes
  `data-state` on `fd-step`. Secret entry (0.5.0) is `fd-secret` with `data-mode="entry"`: drop the password inputs.
- **Assay R9:** the held action with Undo becomes `fd-hold` or `toast.hold()`; preview then commit becomes
  `fd-preview` with `fd-impact`; type-the-name on the page becomes `fd-confirm-inline`; group rows as above.
- **Assay R10:** the history strip is `fd-heatgrid` with `data-variant="strip"` (0.5.0). Per-row menu items are still
  yours, and the icons `wrench` and `calendar-check` are not in Fire.
- **Fragmatic:** the colour control becomes `fd-color` with `fd-swatch`; the quadrant becomes
  `data-fd-chart="quadrant"`.
- **Imprim:** the branded email layout becomes `renderEmail()`, and the generated brand-initial mark becomes
  `data-fd-initial`.

Then add the new label keys to a translated page, remove local `overflow-wrap` and 320px overflow fixes, check that
your own bindings for Ctrl+Z, `/` and `g` still work, run `npx fire find` before you write a new pattern, and keep your
look as a theme record, which now takes `type`, `signature` and the four structural dials. Run the markup lint over
your source.

## 0.6.2 — 18 Nov 2026

**Facet export on Facet's new schema.** `facet/content.json` carries all 142 components with full cards and a
`contract` field holding the theme record (`facet/theme.json`), and uses everything Facet now accepts: colour roles
`raised`, `sunken` and `on-success`, `on-warning`, `on-danger`, `on-info` with their pairings at 4.5:1 in both
themes; all 16 type steps with Fire's rem sizes and line heights, and tabular figures on `stat`; all 29 sizes; every
shadow with all five layers, light and dark. `extras.json` lists `contract/custom-elements.json` and marks the two
files Facet reads as `ds/catalog.json` and `ds/custom-elements.json`. The build asks `$FACET_CLI`, else Facet's
design kit, else the old vendored Facet, and writes the 100-component variant only if Facet's checker rejects the
full one. The README lists the misfits that remain.

## 0.6.1 — 18 Nov 2026

- **Docs**: a Frameworks & checks page: the three starters and how to start from one, the React and Vue packages
  and custom elements, the rules from `spec/EXPORT.md` a developer must remember, the catalogue and cards and how an
  agent searches them, the markup lint and render-equal with real command lines, and the Facet export.
- **Theme record**: an optional `"fire"` field names the Fire release a record was written against; Facet stores a
  contract system's record as its `contract` field and pins the expander by it. `FIRE_VERSION` is exported from
  `fire/js/theme.js`; Copy theme, the looks and `facet/theme.json` write it.
- **Facet export**: `scripts/build-facet.mjs` builds the richest export the installed Facet accepts: all components
  with full cards and the `contract` field first, else the 100-component fallback. `facet/extras.json` and the README
  record which variant was written and which Facet build validated it. Today's Facet accepts the fallback; the full
  export follows by rebuilding once Facet's new schema lands.
- `spec/EXPORT.md`: Facet confirmed the board rules B6 and B8–B13.
- Starters, docs and GUIDE depend on `github:vidhatanand/firedesign#v0.6.1`.

## 0.6.0 — 18 Nov 2026

Fire becomes one system for plain pages, Lit, React and Next.js, Vue, and Facet. Its HTML and CSS stay the
contract: no class, attribute, token, event or export was removed or renamed, and a product that copies `fire/` keeps
working unchanged. Read `spec/ARCHITECTURE.md` for how the parts fit.

### Added

- **Theme record** (`contract/theme.schema.json`, `fire/js/theme.js`): a product's look as one JSON object (palette,
  tone, type set, dials). `expandTheme`, `themeToCss`, `validateTheme`, `toThemeRecord` and `fromThemeRecord`;
  `paletteFrom()` builds a palette from an accent or one to three brand colours that passes every contrast rule the
  presets pass, and notes anything it moved. Tweaks gains "Copy theme". `contract/looks/` holds a record per palette.
- **Contract** (`contract/fire-contract.json`): every global token with type, tier (input, scale, derived), group,
  defaults and its Facet role.
- **Catalogue and cards** (`contract/catalog.json`, `contract/cards/`): 142 components with their classes, the
  values each attribute takes (tied to evidence for that component), state attributes, events, elements, icons,
  tokens and templates, and a card for every component: job, purpose, when to use, when not and what instead,
  other names, surfaces, data, states, variants, keyboard and an example. Agents search the cards before composing.
- **Custom elements** (`fire/elements.js`, Lit 3.3.3 bundled; `fire/LICENSE-lit.txt`): `fd-icon`, `fd-chart`,
  `fd-code`, `fd-texture`, for the four components that build their own DOM. Each element is its component's root,
  renders the same DOM and pixels as the markup form, and shares Fire's modules with `fire.js`.
- **Types**: `fire/fire.d.ts` (every export, the `fd:*` event map, the theme record), `fire/elements.d.ts`,
  `fire/js/icons.d.ts`, `fire/fire.css.d.ts`.
- **`fire-design/react`**: `FireIcon`, `FireChart`, `FireCode`, `FireTexture` (typed props and event props),
  `useFire`, `useFireEvent`, and the exporter's helpers. **`fire-design/vue`**: the plugin, the `v-fire` directive,
  a router hook, `fireVueOptions()` for `vite.config`, and typed elements and events.
- **Starters** (`starters/lit-vite`, the default; `starters/next`; `starters/vue-vite`): the shell and three
  screens converted from Fire's templates, a theme record, a strict Content Security Policy, and `npm run check`,
  which proves each screen renders like the template in Chromium, WebKit and Firefox, at 1440 and 375, light and
  dark, with the lint clean and no CSP violations (and clean hydration in Next.js).
- **Export rules** (`spec/EXPORT.md`, `spec/export-map.json`): how Fire markup is written in each framework,
  verified against the pinned versions; what an exporter (Facet's) implements.
- **Checks that run in any project**: `scripts/lint-markup.mjs` (markup against the catalogue: HTML, JSX/TSX, Vue,
  Lit templates) and `scripts/render-equal.mjs` (a page against its reference: structure, computed styles, pixels).
- **Facet** (`facet/`): Fire as a Facet design system: `content.json` (accepted by Facet's own check), the files
  Facet carries with their hashes and the token aliases, and the theme record.
- **`npm run check`** runs every generator in check mode, the audit, the palette rules and 120+ tests.

### Changed

- `package.json` is a real package (`fire-design`) with `exports` for every part, and pinned development tools.
- Charts redraw on every font load, so a chart drawn after navigation is measured with the real font.
- The docs overview's width switcher passes names, not pixel widths, and the German secret field on the Writing page names its buttons in its own language (both found by the new markup lint).

### For products refreshing from 0.5.x

Nothing to change in existing markup. To adopt the new parts: run the markup lint over your source and fix what it
reports; in a framework app, follow `spec/EXPORT.md` (or start from the matching starter); keep your look as a theme
record (Tweaks, "Copy theme").

## 0.5.1 — 18 Nov 2026

Fixes and small extensions requested by Touchstone, Assay, Imprim and Fragmatic. No class or attribute was removed or renamed.

### Check after refreshing

- **Text contrast.** Every text step that carries information now reaches 4.5:1 in every palette, light and dark. Muted text (`--fd-text-3`) is darker in light mode, and labels that used the faintest steps (sidebar group labels, table headers, segmented and chip counts, stat subs, meta lines, captions) now use muted text. Look at your screens once: hierarchy should still read, but quiet text is visibly stronger.
- **Label on the accent.** Text on the accent fill reaches 4.5:1. Where white cannot, the label is a near-black tinted to the accent: Ember's primary button is now dark text on orange, and its hover gets lighter. The same applies to forest, rose, lagoon, iris, ocean, clay and midnight in one or both modes. Link-coloured text (`--fd-accent-text`) is darker where it was under 4.5:1 (Ember's light mode).
- **Status fills.** The danger button, solid badges and tone tiles use new `--fd-<tone>-fill` and `--fd-<tone>-contrast` tokens: danger, info and violet fills are slightly deeper so white reaches 4.5:1; success and warning keep their colour with a dark label. `--fd-<tone>-solid` is unchanged for dots, lines and charts.
- **Compact page head.** `.fd-page-head-title` is now the h2 step (it was card-title size), set in the display face. Use the page's `h1` for it. `fd-page-head[data-size="sm"]` keeps the old size.
- **Textareas** honour `rows` and now get the vertical padding they were meant to have, so a textarea with `rows` is taller than before.
- **Dialogs and sheets** open with focus on `[autofocus]`, else the first form field, else the title; never on a footer action. Remove `tabindex="-1" autofocus` stopgaps on sheet titles if you added them.
- **`fd:select`** now also fires for `[data-action]` buttons outside a table, with `{ action, value: [], row: null, wrap: null }`. Remove per-page click listeners you added for toolbar actions such as "Clear filters", and make sure a generic `fd:select` handler checks `detail.action`.

### Added

- `td|th[data-stack="hide"]` drops a column, and `[data-stack-only]` shows an element, only while a table is stacked; both follow the table's own breakpoint. Replaces `data-only` on table cells. (Assay R2)
- `fd-table-foot-info`: the styled left slot of the table foot. (Assay, Fragmatic)
- `data-only="desktop|mobile"` works outside `.fd-app`, on the viewport's 900px. (Fragmatic)
- Titles and headings wrap long unbroken names (branches, test ids). Remove local `overflow-wrap` rules. (Assay R11)
- `setIcon(el, name)` from `fire/fire.js`, and a drawn icon redraws when its `data-icon` changes. (Fragmatic)
- Fire's own interface labels can be translated from the page: `data-label-<key>` on a component or an ancestor, or one dictionary in `<script type="application/json" data-fd-labels>`. 34 keys, listed on `docs/writing.html`. (Imprim)
- `scripts/build-palettes.mjs --check` enforces the contrast rules for 15 palettes, both modes, both contrast levels and 7,530 tones. `scripts/test/` holds the first behaviour test (`node --test scripts/test/label.test.mjs`).

### Fixed

- A toast made while a dialog closes is measured correctly in WebKit. (Touchstone R62)
- No ResizeObserver loop errors in WebKit from tabs, segmented controls and table scrollers. (Touchstone R63)
- A doc frame placeholder grows with taller content in WebKit. Remove the `aspect-ratio: auto` stopgap. (Touchstone R61)
- `fd:close` also fires for a dialog that page script opened with `showModal()`. (Assay R7)
- A copy button keeps focus when the clipboard is refused. (Fragmatic)
- `summary` counts as focusable for focus traps and first focus.

### Still open

Grouped table heading rows, a single date field, the held action with Undo, steps with live state and other requests in the plan for 0.7.

## 0.5.0 — 17 Nov 2026

Pipeline graph, day strip, secret entry, strict-CSP styles (`data-fd-vars`, no `style` attributes anywhere), and fixes from Touchstone and Assay.
