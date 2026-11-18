# Changes

What changed in each release, and what a product using Fire needs to do. Newest first. A product records the tag it vendors (for example in `docs/fire/REQUESTS.md`) and reads every entry after it before refreshing.

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
