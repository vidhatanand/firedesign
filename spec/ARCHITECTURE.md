# Fire 0.6 architecture: one system for plain pages, Lit, React and Next.js, Vue, and Facet

Status: decided for 0.6 by the Fire maintainer (18 Nov 2026). Every 0.6 work package follows this file. Where a
package needs a choice this file does not make, it makes the smallest choice that keeps every rule below, and says so
in its report.

## 1. What does not change

- **Fire's HTML and CSS are the contract.** Classes `fd-*`, variants and states through `data-*` and ARIA, tokens
  `--fd-*`. A screen written in Fire markup looks right before any script runs. Nothing in 0.6 renames or removes a
  class, attribute, token, event or export.
- **`fire/` stays copyable.** A product can still copy `fire/` into its public folder and load three files
  (`boot.js`, `fire.css`, `fire.js`). Built files that live in `fire/` are committed, so copying needs no build.
- **Strict CSP.** No `style` attribute in any markup Fire ships or generates: docs, templates, starters, generated
  code, element templates, JSX (`style={…}` is a `style` attribute). Custom properties travel as `data-fd-vars`.
  No `eval`, no inline event handlers, no inline `<script>` in generated pages except `type="application/json"`.
- **No raw values in component styles**, as the audit enforces today.
- **Behaviour modules keep working as they are**: delegated listeners on `document`, `init(root)` idempotent,
  `fd:*` events.

## 2. Repository layout added in 0.6

```
fire/
  fire.d.ts            hand-written types for fire.js exports, the fd:* event map and the theme record
  elements.js          BUILT, committed: Fire's custom elements with Lit bundled in
  elements.d.ts        BUILT, committed: their types (HTMLElementTagNameMap included)
  js/theme.js          the theme record → tokens expander (pure ES module: Node and browser)
  LICENSE-lit.txt      Lit's BSD-3-Clause licence, because elements.js bundles it
elements/src/*.ts      Lit + TypeScript source of the custom elements
contract/
  fire-contract.json   GENERATED: every global token with tier, type, group, default and Facet role
  theme.schema.json    JSON Schema of the theme record
  catalog.json         GENERATED: components, classes, attribute values, elements, events, icons, tokens, cards
  catalog.schema.json  JSON Schema of catalog.json
  cards/<id>.json      HAND-WRITTEN: one card per component, pattern or template (judgement fields)
  custom-elements.json GENERATED: Custom Elements Manifest of elements/src
  looks/<name>.json    theme records for named looks (one per existing palette in 0.6)
wrappers/react/        GENERATED components + hand-written hooks, with .d.ts
wrappers/vue/          a plugin (isCustomElement, the v-fire directive) and GlobalComponents types
spec/
  ARCHITECTURE.md      this file
  EXPORT.md            how Fire markup is written in each framework (the exporter's specification)
  export-map.json      the same rules as data
starters/
  lit-vite/            the default
  next/
  vue-vite/
facet/                 GENERATED: Fire as a Facet design system (content.json and extras)
scripts/
  build.mjs            runs every generator below; `--check` fails when a committed output is stale
  build-elements.mjs   elements/src → fire/elements.js, fire/elements.d.ts, contract/custom-elements.json
  build-contract.mjs   tokens.css + theme.js → contract/fire-contract.json
  build-catalog.mjs    CSS + module headers + VOCABULARY + cards + manifest → contract/catalog.json
  build-wrappers.mjs   custom-elements.json → wrappers/react
  build-facet.mjs      contract + catalog + WRITING.md → facet/
  lint-markup.mjs      lints product or board markup against catalog.json (runs in any project)
  render-equal.mjs     compares a reference page and a candidate page (structure, computed styles, pixels)
  test/*.test.mjs      node --test, no dependencies beyond devDependencies
```

`package.json` becomes a real package: `name` "fire-design", `exports` for `.` (fire/fire.js), `./css`
(fire/fire.css), `./boot` (fire/boot.js), `./elements`, `./theme` (fire/js/theme.js), `./react`, `./vue`,
`./contract`, `./catalog`, and `./fire/*` for direct file access. Development dependencies are pinned to exact
versions. Consumers in other repositories depend on it by git tag (`github:vidhatanand/firedesign#v0.6.0`); the
starters in this repository use `file:../..`.

## 3. The theme record (the source of a Fire design system)

A product's look is one JSON record. Tweaks, Imprim's branding, Facet and agents all read and write it; Fire's
expander turns it into tokens. Version 1:

```json
{
  "contract": "fire/1",
  "palette": "ember",
  "tone": { "hue": 0, "vivid": 100, "light": 0, "warmth": 0 },
  "type": "geist",
  "dials": { "corners": 1, "density": "comfortable", "lines": 1, "textSize": "md",
             "contrast": "default", "motion": "default", "texture": 1 }
}
```

- `palette` is a palette name, or a spec: `{ "from": "accent", "accent": "#1f6feb", "neutral": "cool" }`, or
  `{ "from": "brand", "colors": ["#14342b", "#f2c14e"] }`, or the full spec form `palettes.js` uses internally
  (hue, tint, ink, accent, on, L). `neutral` is `pure`, `cool`, `warm` or a hue in degrees.
- `type` is a type set name, or `{ "display": "…", "sans": "…", "mono": "…" }` naming families that the page loads.
- Every field is optional; a missing field is Fire's default. Unknown fields are an error.
- `fire/js/theme.js` exports: `expandTheme(record)` → `{ tokens: { name: [light, dark] | value }, attributes:
  { 'data-palette': …, 'data-density': … }, notes: [what the engine adjusted] }`; `themeToCss(record, { selector })`
  → a stylesheet string (a file a strict CSP allows); `paletteFrom(spec)` → a palette; `validateTheme(record)` →
  `{ ok, errors }`; `toThemeRecord(tweaksState)` and `fromThemeRecord(record)` to and from the Tweaks state.
- Every palette `paletteFrom` returns passes the same checks as the 15 presets (`build-palettes.mjs --check`): text
  4.5:1, label on accent 4.5:1 on fill and hover, accent text 4.5:1. When a requested colour cannot pass, the engine
  moves it the least and lists the change in `notes`.

## 4. The contract file and the catalogue

**`contract/fire-contract.json`** lists every global token: `{ name, type, tier, group, default, facetRole? }`.
Tiers: `input` (set by a theme record: the palette's colour inputs, fonts, dials), `scale` (type, space, radius,
shadow, motion, sizes, status tones, chart and code colours: values may change, steps may not be added or renamed),
`derived` (computed by Fire, never authored). It carries the Facet role mapping: background ← `--fd-bg`, surface ←
`--fd-surface`, text ← `--fd-ink`, muted ← opaque `--fd-text-3` on the page, primary ← `--fd-accent`, on-primary ←
`--fd-accent-contrast`, border ← `--fd-line`, focus ← `--fd-focus`, success/warning/danger/info ←
`--fd-<tone>-fill` with `--fd-<tone>-contrast`, link ← `--fd-accent-text`; `accent` is left to Facet.

**`contract/catalog.json`** is what agents, the lint, the wrappers and Facet read. Facts are generated from the
source; judgement comes from the cards. Shape (see `catalog.schema.json`):

```
{ "fire": "0.6.0",
  "components": [{ "id": "button", "name": "Button", "family": "Buttons", "kind": "component|pattern|template|layout",
                   "root": "fd-btn", "classes": ["fd-btn", …],
                   "attributes": { "data-variant": ["primary", "outline", …], "data-size": ["xs", "sm", "lg", "xl"] },
                   "element": null, "events": ["fd:change"], "docs": "docs/buttons.html#variants",
                   "card": { …the card… } }],
  "classes": { "fd-btn": "button", … },          // every class → its component id
  "elements": [ …from custom-elements.json… ],
  "events": { "fd:select": "detail shape", … },
  "icons": ["home", …], "tokens": ["--fd-bg", …],
  "templates": [{ "path": "templates/logs.html", "job": "…" }] }
```

**A card** (`contract/cards/<id>.json`) holds what cannot be generated: `job` (one sentence, a user's verb),
`purpose` (≤ 500 characters), `useWhen`, `avoidWhen` (each with what to use `instead`), `aka` (other names people
use), `surfaces` (app, website, phone, email), `data` (record, list, series, form, text, none), `states`,
`variants` (each with `attribute`, `value`, `useWhen`), `parts`, `related`, `keyboard`, `example` (docs anchor),
`provenance`, `since`. The catalogue build fails when a component has no card or a card lacks a required field.

## 5. The elements package (Lit + TypeScript)

Fire's behaviour stays in its modules. Custom elements exist where framework rendering and Fire's DOM-building
behaviour would otherwise fight: components that build their own DOM from data. In 0.6:

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
  elements (`@lit/react`), `useFire(ref)` (calls `init` on mount) and `useFireEvent(ref, 'fd:select', fn)` (JSX cannot
  name an event with a colon). Fire's modules load in the browser only (a client component in Next.js); server
  rendering emits plain Fire markup.
- **Vue 3**: markup in templates per `spec/EXPORT.md`; `wrappers/vue` installs `isCustomElement` for `fd-` tags and a
  `v-fire` directive (calls `init` on mount), and declares element types.

## 7. Checks

- **`lint-markup.mjs`** reads `catalog.json` (not Fire's source), so it runs in any project: unknown `fd-` classes,
  attribute values a component does not define, unknown `fd-` elements and icon names, `style` attributes and
  `style` props, raw colours and pixel sizes in markup, icon-only buttons without a name, `<i data-icon>` in framework
  code (use `fd-icon` or the SVG form). Inputs: `.html`, `.jsx`, `.tsx`, `.vue`, and Lit `html``` templates in
  `.ts`/`.js`. Output: text or JSON; exit code 1 on any error.
- **`render-equal.mjs`** compares a reference page (Fire markup, a Facet board) with a candidate (the exported
  screen running in its framework): the Fire nodes' structure (framework wrappers, comments and framework attributes
  ignored), their computed styles, and a pixel comparison with animations frozen, at 1440 and 375 wide, light and
  dark. Output JSON with every difference; exit code 1 beyond the tolerance. Fire runs it on every starter; Facet runs
  it on every export.

## 8. Facet

`scripts/build-facet.mjs` writes `facet/`: a Facet design-system `content.json` that passes Facet's
`validateContent` (colour roles from the mapping above, typography, space, radius, shadow, motion, components from the
cards with `api` for `<cc-component>`, voice from WRITING.md, pairings), plus the extras Facet will carry: the Fire
stylesheet and fonts, `fire/fire.js` and `fire/elements.js`, the contract file and the catalogue. Facet owns the
exporter, board templates in its board format, running Fire's checks before an export is offered, and recording
which board revision each exported screen implements.

## 9. Verification for every 0.6 package

`node scripts/audit.mjs` (ERROR=0, nothing under literals, inline, attrs), `node scripts/build-palettes.mjs --check`,
`node scripts/build.mjs --check` once it exists, `node --test scripts/test/*.test.mjs`, and the package's own checks.
The maintainer reviews every diff and looks at every changed screen.
