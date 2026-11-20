# Fire architecture: one system for plain pages, Lit, React and Next.js, and Vue

Status: decided for 0.6 by the Fire maintainer (18 Nov 2026), built in v0.6.0, and kept true to the system as it is in
0.8.0 (see CHANGELOG.md for what each release added; section 10 is what 0.8 added). Every work package follows this
file. Where a package needs a choice this file does not make, it makes the smallest choice that keeps every rule below,
and says so in its report.

## 1. What does not change

- **Fire's HTML and CSS are the contract.** Classes `fd-*`, variants and states through `data-*` and ARIA, tokens
  `--fd-*`. A screen written in Fire markup looks right before any script runs. No release from 0.6 to 0.8 renames or
  removes a class, attribute, token, event or export.
- **`fire/` stays copyable.** A product can still copy `fire/` into its public folder and load three files
  (`boot.js`, `fire.css`, `fire.js`). Built files that live in `fire/` are committed, so copying needs no build.
- **Strict CSP.** No `style` attribute in any markup Fire ships or generates: docs, templates, starters, generated
  code, element templates, JSX (`style={…}` is a `style` attribute). Custom properties travel as `data-fd-vars`.
  No `eval`, no inline event handlers, no inline `<script>` in generated pages except `type="application/json"`.
- **No raw values in component styles**, as the audit enforces today.
- **Behaviour modules keep working as they are**: delegated listeners on `document`, `init(root)` idempotent,
  `fd:*` events.

## 2. Repository layout

```
fire/
  fire.css, fire.js    everything in one import each; fire.d.ts: hand-written types for the fire.js exports, the fd:* event map and the theme record
  boot.js              a classic script for <head>: restores the saved look before the first paint
  transitions.css      the opt-in page-transition rule (0.8); not imported by fire.css
  components/*.css     one file per family, including site.css (websites, 0.8) and transitions.css (named regions, 0.8)
  js/*.js              behaviour per family; core.js, icons.js, theme.js (the theme record, pure ES module: Node and browser),
                       palettes.js, palette-rules.js, typefaces.js, fonts.js, looks.js, initial.js, site.js, filters.js,
                       transitions.js, each with a .d.ts where it is exported
  email/email.js       renderEmail() for transactional email and newsletters (0.7), with examples.mjs
  elements.js          BUILT, committed: Fire's custom elements with Lit bundled in
  elements.d.ts        BUILT, committed: their types (HTMLElementTagNameMap included)
  LICENSE-lit.txt      Lit's BSD-3-Clause licence, because elements.js bundles it
elements/src/*.ts      Lit + TypeScript source of the custom elements
contract/
  fire-contract.json   GENERATED: every global token with tier, type, group, default, and the named breakpoints
  theme.schema.json    JSON Schema of the theme record
  catalog.json         GENERATED: components, modules, classes, attribute values, elements, events, icons, tokens, templates, cards
  index.json           GENERATED: one compact entry per part (what `fire find` and the Catalogue page read)
  pictures/<kind>/<id>.png  GENERATED: a picture of every index entry except the modules (section 10); in the repository, not in the package
  catalog.schema.json  JSON Schema of catalog.json
  cards/<id>.json      HAND-WRITTEN: one card per component, pattern, layout or section (judgement fields); cards/templates/<name>.json: one per template
  custom-elements.json GENERATED: Custom Elements Manifest of elements/src
  fonts.json           the vetted font catalogue (0.7); fingerprints.json: what the near-duplicate gate compares
  looks/<name>.json    theme records, one per palette; looks/named/<name>.json: the eight named looks (0.7)
wrappers/react/        GENERATED components + hand-written hooks, with .d.ts
wrappers/vue/          a plugin (isCustomElement, the v-fire directive) and GlobalComponents types
docs/                  the documentation site; docs/_ref/ holds the class reference (CLASSES.md, generated) and the vocabulary
templates/             42 Ember screens, templates/media/ the placeholder pictures
spec/
  ARCHITECTURE.md      this file
  EXPORT.md            how Fire markup is written in each framework (the exporter's specification)
  export-map.json      the same rules as data
starters/
  lit-vite/            the default
  next/
  vue-vite/
scripts/
  build.mjs            runs every generator below; `--check` fails when a committed output is stale
  build-elements.mjs   elements/src → fire/elements.js, fire/elements.d.ts, contract/custom-elements.json
  build-contract.mjs   tokens.css + theme.js → contract/fire-contract.json
  build-catalog.mjs    CSS + module headers + VOCABULARY + cards + manifest → contract/catalog.json
  build-index.mjs      the catalogue → contract/index.json (what `fire find` searches)
  build-classes.mjs    the catalogue → docs/_ref/CLASSES.md
  build-pictures.mjs   index entries + docs specimens → contract/pictures (section 10)
  build-palettes.mjs, build-typefaces.mjs   palettes.css and typefaces.css from their specs; `--check` holds every contrast rule
  build-wrappers.mjs, build-wrappers-vue.mjs   custom-elements.json → wrappers
  find.mjs             `fire find`: search the parts by what they are for
  gate.mjs             the near-duplicate gate (fingerprint.mjs holds its fingerprints); fonts.mjs: adds a catalogue font to a product; looks-check.mjs: renders every look
  lint-markup.mjs      lints product or board markup against catalog.json, names and structure (runs in any project)
  lib/structure.mjs    the structural rules on a tree of plain objects: the lint and the review share them
  lint-css.mjs         lints a product's CSS and tokens against fire-contract.json (section 7)
  render-equal.mjs     compares a reference page and a candidate page (structure, computed styles, pixels)
  fire.mjs             the `fire` command: find, lint, lint-css, render-equal, slim, review
  review.mjs           `fire review`: every screen in a browser, a gallery, structure and composition checks
  slim.mjs             writes a Fire trimmed to a product's source: stylesheet, behaviour entry, fonts, report
  build-slim-map.mjs   GENERATES contract/slim-map.json: each component's stylesheet, module and what its module builds
  audit.mjs            Fire's own source audit
  test/*.test.mjs      node --test, no dependencies beyond devDependencies
```

`package.json` is a real package: `name` "fire-design", `exports` for `.` (fire/fire.js), `./css` (fire/fire.css),
`./boot` (fire/boot.js), `./transitions.css`, `./elements`, `./theme` (fire/js/theme.js), `./react`, `./vue`,
`./email`, `./initial`, `./looks`, `./fonts` (contract/fonts.json), `./contract`, `./catalog`, `./index`, and `./fire/*`
for direct file access; `bin` is `fire` (scripts/fire.mjs). Development dependencies are pinned to exact versions. Consumers in other repositories depend on it by git tag (`github:vidhatanand/firedesign#v0.10.2`); the
starters in this repository use `file:../..`.

## 3. The theme record (the source of a Fire design system)

A product's look is one JSON record. Tweaks, Imprim's branding, other tools and agents all read and write it; Fire's
expander turns it into tokens. Version 1. 0.6 had `contract`, `palette`, `tone`, `type` and seven dials; `fire` came in 0.6.2, the
structural dials and `signature` in 0.7, and `imagery` and `brand` in 0.8:

```json
{
  "contract": "fire/1",
  "fire": "0.8.0",
  "palette": "ember",
  "tone": { "hue": 0, "vivid": 100, "light": 0, "warmth": 0 },
  "type": "geist",
  "dials": { "corners": 1, "density": "comfortable", "lines": 1, "textSize": "md",
             "contrast": "default", "motion": "default", "texture": 1,
             "surfaces": "objects", "elevation": "soft", "controls": "soft", "headings": "sentence",
             "imagery": "natural" },
  "signature": { "field": "auto", "mark": "auto", "cell": "auto", "ramp": "auto", "marks": "crosses", "intensity": 1 },
  "brand": { "name": "Quarry Labs", "logo": "/brand/logo.svg" }
}
```

- `palette` is a palette name, or a spec: `{ "from": "accent", "accent": "#1f6feb", "neutral": "cool" }`, or
  `{ "from": "brand", "colors": ["#14342b", "#f2c14e"] }`, or the full spec form `palettes.js` uses internally
  (hue, tint, ink, accent, on, L). `neutral` is `pure`, `cool`, `warm` or a hue in degrees.
- `fire` (0.6.2) is the release the record was written against, so tools and products can pin the expander by it.
- `type` is a type set name, or a spec (0.7): `display`, `sans` and `mono` families from the font catalogue
  (`contract/fonts.json`), `displayWeight`, `displayTracking`, `headingCase` and `figures`. `validateTheme()` enforces
  the pairing rules, and `expandTheme()` writes each family's metric-matched fallback face.
- `dials` also holds the four structural dials (0.7: `surfaces`, `elevation`, `controls`, `headings`), each an
  attribute on `<html>` that `tokens.css` turns into semantic tokens, and `imagery` (below). `signature` (0.7) is the one
  set of dials for generated textures and frame marks; each field is `auto` unless set.
- `brand` (0.8) is `{ name, mark, logo, logoDark, href }`: not CSS and not a token. `expandTheme()` returns it
  untouched as `brand`, `themeToCss()` ignores it, `validateTheme()` refuses an unsafe picture address in it, and
  `tweaks.set(fromThemeRecord(record))` hands it to the shell's `setBrand()`. `renderEmail()` reads the same name and logo.
- `dials.imagery` (0.8) is `natural`, `mono`, `duotone` or `wash`: how a site's pictures are treated. It is carried like the structural dials, as `data-imagery` on `<html>` (none for `natural`), and each named look sets one.
- Every field is optional; a missing field is Fire's default. Unknown fields are an error.
- `fire/js/theme.js` exports: `expandTheme(record)` → `{ tokens: { name: [light, dark] | value }, attributes:
  { 'data-palette': …, 'data-density': … }, faces, notes: [what the engine adjusted], brand? }`; `themeToCss(record, { selector })`
  → a stylesheet string (a file a strict CSP allows); `paletteFrom(spec)` → a palette; `validateTheme(record)` →
  `{ ok, errors, notes }`; `toThemeRecord(tweaksState)` and `fromThemeRecord(record)` to and from the Tweaks state.
  The module also exports the defaults and choices (`CONTRACT`, `FIRE_VERSION`, `DEFAULT_RECORD`, `DIAL_*`,
  `SIGNATURE_*`, `INPUT_TOKENS`) so a tool can read what a record may hold.
- Every palette `paletteFrom` returns passes the same checks as the 15 presets (`build-palettes.mjs --check`): text
  4.5:1, label on accent 4.5:1 on fill and hover, accent text 4.5:1, and the status and chart colours derived from it (section 10). When a requested colour cannot pass, the engine
  moves it the least and lists the change in `notes`.

## 4. The contract file and the catalogue

**`contract/fire-contract.json`** lists every global token: `{ name, type, tier, group, default }`, and the
four named breakpoints as `breakpoints` (phone below 640px, tablet 640 to 899px, desktop from 900px, wide from 1200px).
Tiers: `input` (set by a theme record: the palette's colour inputs, fonts, dials), `scale` (type, space, radius,
shadow, motion, sizes, status tones, chart and code colours: values may change, steps may not be added or renamed),
`derived` (computed by Fire, never authored).

**`contract/catalog.json`** is what agents, the lint, the wrappers and other tools read. Facts are generated from the
source; judgement comes from the cards. Shape (see `catalog.schema.json`):

```
{ "fire": "0.8.0",
  "components": [{ "id": "button", "name": "Button", "family": "Buttons", "kind": "component|pattern|layout|section",
                   "root": "fd-btn", "classes": ["fd-btn", …],
                   "attributes": { "data-variant": ["primary", "outline", …], "data-size": ["xs", "sm", "lg", "xl"] },
                   "partAttributes": { … }, "stateAttributes": { … },
                   "element": null, "events": ["fd:change"], "docs": "docs/buttons.html#variants",
                   "card": { …the card… } }],
  "modules": [{ "id": "email", "name": "Email", "module": "fire/email/email.js", "exports": [ … ], "docs": "…", "card": { … } }],
  "classes": { "fd-btn": "button", … },          // every class → its component id
  "elements": [ …from custom-elements.json… ],
  "events": { "fd:select": "detail shape", … },
  "globalAttributes": { "data-gap": [ … ], "data-fd-surface": [ … ], … },   // attributes that no one component owns
  "icons": ["home", …], "tokens": ["--fd-bg", …],
  "templates": [{ "path": "templates/logs.html", "job": "…" }] }
```

**A card** (`contract/cards/<id>.json`) holds what cannot be generated: `job` (one sentence, a user's verb),
`purpose` (≤ 500 characters), `useWhen`, `avoidWhen` (each with what to use `instead`), `aka` (other names people
use), `surfaces` (app, website, phone, email), `data` (record, list, series, form, text, none), `states`,
`variants` (each with `attribute`, `value`, `useWhen`), `parts`, `related`, `keyboard`, `example` (docs anchor),
`provenance`, `since`, and an optional `relation` (`variantOf` or `distinctFrom`, with `because`) for a part that
looks like another one (section 7). `surfaces` is the one place where a part's surfaces are kept (section 10). A
template has a card in `contract/cards/templates/<name>.json`, and a website template lists its `sections`. A module
(`email`, `initial-helpers`, `theme-record`, `transitions`) has a card and no class. The catalogue build fails when a
component has no card or a card lacks a required field; `contract/cards/README.md` is the field guide.

## 5. The elements package (Lit + TypeScript)

Fire's behaviour stays in its modules. Custom elements exist where framework rendering and Fire's DOM-building
behaviour would otherwise fight: components that build their own DOM from data. They are four, and 0.7 and 0.8 added none:

| Element | Wraps | Why an element |
|---|---|---|
| `fd-icon` | icons.js | `<i data-icon>` is replaced by an SVG, which breaks React and Vue reconciliation |
| `fd-chart` | charts.js (line, area, bar, stacked, donut, sparkline, heat grid and strip) | data as a property; redraws on change |
| `fd-code` | code.js highlighting | highlights text it is given, instead of rewriting a framework's text nodes |
| `fd-texture` | texture.js generative fields | owns its canvas and animation lifecycle |

Rules: light DOM (`createRenderRoot() { return this; }`), no shadow DOM, no static styles (Fire's CSS styles them),
the existing renderer functions are imported and reused (no reimplementation), attributes mirror Fire's existing
`data-*` names where they exist, properties accept data (`.data` for charts, `.code` for code), every public
attribute, property and event is documented with JSDoc so the manifest is complete, and each element renders the same
DOM the existing markup form produces, so CSS and the render-equality check treat both forms alike. A `FireElement`
base class holds the shared rules for future elements. Elements are registered by importing `fire-design/elements`
(or `fire/elements.js`); registering twice is a no-op.

## 6. Frameworks

- **Plain pages**: as today, plus `fire/elements.js` if a page uses an element.
- **Lit (the default for new apps)**: Fire markup inside `html```, events as `@fd:select=${…}`, elements with
  property bindings. Components extend nothing of Fire's; Fire's CSS is global, so Lit components render to light DOM
  (`createRenderRoot() { return this; }`) or adopt Fire's stylesheet.
- **React 19 and Next.js**: markup in JSX per `spec/EXPORT.md`; `wrappers/react` gives typed components for the
  elements (`@lit/react`), `useFire(ref)` (calls `init` after every commit) and `useFireEvent(ref, 'fd:select', fn)`
  (JSX cannot name an event with a colon). Fire's modules and elements load in the browser only, after hydration
  (a client component in Next.js; importing `fire-design/elements` at the top of a module breaks server
  rendering); server rendering emits plain Fire markup, with the icon sprite and `boot.js` in the document.
- **Vue 3**: markup in templates per `spec/EXPORT.md`; `wrappers/vue` installs a `v-fire` directive (calls `init` on
  mount and update) and a router hook, and declares element types. `isCustomElement` and `whitespace: 'preserve'`
  go in the Vue plugin's `template.compilerOptions` in `vite.config` (`fireVueOptions()`), because
  `app.config.compilerOptions` does not reach single-file components.
- **Every bundler**: keep `light-dark()` as written. Vite's `build.cssTarget` and Next.js's browserslist must target
  Chrome 123, Edge 123, Firefox 120 and Safari 17.5 or later, or the CSS minifier lowers `light-dark()` and
  `color-scheme` overrides stop working (spec rules P5 and N6).

## 7. Checks

- **`lint-markup.mjs`** reads `catalog.json` (not Fire's source), so it runs in any project: unknown `fd-` classes,
  attribute values a component does not define, unknown `fd-` elements and icon names, `style` attributes and
  `style` props, raw colours and pixel sizes in markup, icon-only buttons without a name, `<i data-icon>` in framework
  code (use `fd-icon` or the SVG form). Inputs: `.html`, `.jsx`, `.tsx`, `.vue`, and Lit `html``` templates in
  `.ts`/`.js`. Output: text or JSON; exit code 1 on any error. Two rules are warnings and never change the exit code:
  `surface-mismatch` and `img-attrs` (an `<img>` inside `fd-site` without `alt`, or without `width` and `height`).
- **`lint-css.mjs`** (0.8) reads `fire-contract.json` only, so it runs in any project. It checks a product's own
  stylesheets, `<style>` blocks and `css` templates: unknown or reserved `--fd-` tokens, a product token that repeats a
  Fire token, raw colours, sizes and durations, restyling of an `fd-` class. Eleven rules, four of them errors; the
  product declares its prefix with `--prefix` or `fire.prefix` in `package.json`. Exit code 1 on any error.
  `lint-markup.mjs` gained the warning `surface-mismatch` (section 10) in 0.8, and its JSON output counts `warnings`.
  In 0.10 it gained the structural rules (`missing-part`, `wrong-element`, `wrong-parent`, `missing-attribute`,
  `forbidden-attribute`, `missing-child`, and the warning `bare-control`), from the structure facts on the cards'
  parts. `scripts/lib/structure.mjs` holds them; `review.mjs` runs the same rules on the rendered page.
- **`gate.mjs`** (0.7) compares every component, pattern, layout, section and template with its peers, by structure, look
  and job, and fails a near-duplicate unless a card declares a `relation`. `--probe <page>` checks a candidate first.
  `build.mjs` runs it without the look comparison; `npm run gate` adds it.
- **`build.mjs --check`** fails when any committed output is stale: palettes, type sets, elements, contract, catalogue,
  index, `docs/_ref/CLASSES.md`, and wrappers; it also fails when an index entry has no picture or a picture has
  no entry (section 10).
- **`render-equal.mjs`** compares a reference page (Fire markup, a design board) with a candidate (the exported
  screen running in its framework): the Fire nodes' structure (framework wrappers, comments and framework attributes
  ignored), their computed styles, and a pixel comparison with animations frozen, at 1440 and 375 wide, light and
  dark. Output JSON with every difference; exit code 1 beyond the tolerance. Fire runs it on every starter; an exporter can run
  it on every export. What it must normalise for the rules in `spec/EXPORT.md` to hold is its section 16 (R1 to R15).

## 8. Other tools

Fire writes no tool's own format. A tool that adapts Fire reads neutral data: `contract/fire-contract.json` (the
tokens), `contract/catalog.json` (the parts and their cards), the theme record and its schema, and
`spec/EXPORT.md` with `spec/export-map.json` (the rules an exporter follows). The exporter, its board templates and
its checks live with the tool, not here.

## 9. Verification for every package

`npm run check` runs `node scripts/build.mjs --check`, `node scripts/audit.mjs` (ERROR=0, nothing under literals,
inline, attrs), `node scripts/build-palettes.mjs --check` and `node --test scripts/test/*.test.mjs`; `npm run check:full`
adds the gate and the looks check (`scripts/looks-check.mjs`, which renders real screens under every look). Each starter
has its own `npm run check`. The maintainer reviews every diff and looks at every changed screen.

## 10. Added in 0.8

**The surface model.** Where a part belongs is one fact, kept in one place: the `surfaces` of its card (`app`,
`website`, `phone`, `email`, always in that order). `build-catalog.mjs` carries it into `catalog.json`, `build-index.mjs`
into `index.json`, and everything else reads it from there: `fire find --surface`, the Catalogue page (`docs/catalogue.html`,
filters kept in the address), the surface tags beside each docs heading, and `lint-markup.mjs`. A page
or an element declares where it is used with `data-fd-surface` (a global attribute with no CSS, listed by the
catalogue in `globalAttributes`); the lint reports `surface-mismatch` for a part whose card does not list that surface,
names the card's alternative, treats `phone` as accepting `app`, and says nothing where nothing is declared. Every
template (the index apart) and starter declares one. A card must be honest: the audit that fixed 23 cards removed `email` from eight
components, because an email is written by `renderEmail()`, and added `website` or `phone` where the part is used there.

**The website family.** `fire/components/site.css` and `fire/js/site.js` add a foundation and section types, as a family
of their own. A section is `section.fd-site-section.fd-site-<type>` inside
`fd-site`, a size container named `fd-site`: every section measures the container, so a site renders the same inside a
design board or a docs specimen. The catalogue kind is `section`, with family Website in `scripts/lib/catalog-assign.mjs`; the
gate compares sections like any other part. Breakpoints are named (phone, tablet, desktop, wide) in the
`fire/tokens.css` header and in the contract's `breakpoints`. Fluid type is computed where it is used (`:root`, `.fd-site` and
`[data-type]`), so a subtree with its own type set gets its own steps. There are no block variants that only change
decoration; that rule is `DESIGN.md` section 9. There are fifteen section types: the fifteenth, `fd-site-article`, is the reading
page, and `fd-site-media` (a component) holds a picture. The `image` ground puts a picture behind a section and sets the text in
the scheme of its scrim, so the text keeps 4.5:1 by construction. The treatments (`natural`, `mono`, `duotone`, `wash`) are CSS
filters and blend layers chosen by the `imagery` dial, which the theme record, `fire/js/theme.js` and the Tweaks panel carry.

**Publishing and the combined filter.** `site.js` runs a posts listing (filters, count, pages, the address), the one sign-up
form in three places (`setSignup()`, a cancelable `fd:submit`) and an article's rail and note links. `fire/js/filters.js` is the
combined filter, `fd-filters`, built on the menu, sub-menu, popover and sheet of `overlays.js`: the markup lists the fields and
their values once, the DOM holds the state (`aria-checked`, `data-op`), and `fd:filter` reports the set. `fd-toolbar` wraps by
container queries and `:has()`, with no markup change. The email module gained the blocks `section`, `story` and `list`.

**Page transitions.** Opt in, with no cost to a page that does not ask. `fire/components/transitions.css` is part of
`fire.css` but gives `view-transition-name` only under `:root[data-fd-transition]`, so a page without the attribute has
no named regions and no extra stacking contexts. The cross-document `@view-transition { navigation: auto }` rule is in
a separate file, `fire/transitions.css`, not imported by `fire.css`: linking it is the site's opt in, together with the
attribute and `blocking="render"` on the module scripts (Chromium drops a cross-document transition when a page
paints before its deferred scripts have run). `fire/js/transitions.js` reads the kind, writes `data-fd-direction` from
the Navigation API and exports `transition()` for single-page apps, which sets the attribute only while it runs.
Firefox has no cross-document transitions. Verified in Chromium; Safari is not verified. React 19.3's `<ViewTransition>`
writes `vt-*` attributes into the server HTML: `spec/EXPORT.md` rule R14 makes `render-equal` ignore them.

**Starters.** Each starter has the phone tab bar (`fd-tabbar`, in its shell), declares `data-fd-surface="app"` on `<html>`,
runs `lint-css` beside `lint-markup --surface app` in its check, and opts into page transitions: the Lit and Vue starters
call `transition()` on a route change, the Next starter wraps each screen in `<ViewTransition>` and sets
`data-fd-transition="fade"`. The overview and logs screens of each starter read `?state=` into a typed page state, so a starter opens the same
state views as the templates, and each starter's check opens them. `spec/EXPORT.md` rule R15 makes the pixel comparison of
`render-equal` a shot of the root alone: the fixed tab bar, the support button and a toast around it are hidden for the shot, on
both sides.

**Pictures.** `contract/index.json` has a top-level `pictures` rule (`path` with `{kind}` and `{id}`, and `none`, the
kinds without one). `build-pictures.mjs` renders each entry in Chromium from the first docs specimen that holds the part
(a template: its first screen), light theme, default look, animations frozen and the clock fixed, and writes an
indexed PNG; `--check`, which `build.mjs` runs, fails on a missing or an extra file and compares no pixels, because
renders differ between machines. `fire find --json` resolves the rule and returns `picture`. The pictures (226 files,
about 9 MB) are in the repository and are left out of the package (`"!contract/pictures"` in `files`), which stays under
2 MB; an installed `fire find --json` gives no `picture`.

**Colours per palette.** Status and chart colours are derived from each palette's accent, ink and page by
`deriveColours()` in `fire/js/palettes.js`, written to `palettes.css`, and held by the rules in `fire/js/palette-rules.js`
(contrast, distance from the accent, and chart series told apart in normal and in simulated protanopia, deuteranopia and
tritanopia). Ember's values are the reference and are what `tokens.css` holds, except chart series 3 to 6.
