# Changes

What changed in each release, and what a product using Fire needs to do. Newest first. A product records the tag it vendors (for example in `docs/fire/REQUESTS.md`) and reads every entry after it before refreshing.

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
