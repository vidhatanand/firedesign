# Changes

What changed in each release, and what a product using Fire needs to do. Newest first. A product records the tag it vendors (for example in `docs/fire/REQUESTS.md`) and reads every entry after it before refreshing.

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
