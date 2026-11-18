# Palettes and the tweak panel — build brief

Fire's whole look is now driven by variables. This work adds (a) fifteen colour palettes that recolour the entire
system, neutrals included, (b) tone controls that bend the chosen palette, and (c) a floating **Tweaks** panel where
someone can play with palette, tone, density, corners, type, contrast, motion and texture, live, on any page.

**The current look is the default and must not change.** With no saved tweaks, every page renders exactly as it does
today: no attribute, no inline style, no flash.

Read first: `DESIGN.md`, `fire/tokens.css` (all of it), `fire/js/core.js`, `docs/_ref/VOCABULARY.md`,
`fire/components/forms.css` (segmented, slider, switch markup), `docs/buttons.html` (docs page pattern).

## Files you own (create; touch nothing else)
| File | What |
|---|---|
| `fire/js/palettes.js` | The palette data and the colour engine. Pure ES module, no DOM, importable from Node and the browser. |
| `scripts/build-palettes.mjs` | Imports `fire/js/palettes.js`, writes `fire/palettes.css`. `node scripts/build-palettes.mjs` |
| `fire/palettes.css` | Generated. One `[data-palette="name"] { … }` block per palette. Header comment says it is generated. |
| `fire/components/tweaks.css` | The panel. Private-property prefix `--_tw-`. |
| `fire/js/tweaks.js` | The panel's behaviour and the tweak state. |
| `docs/tweaks.html` | Docs page "Theming and tweaks". |

The lead wires these into `fire/fire.css`, `fire/fire.js`, the docs chrome and the templates afterwards. Do not edit
`tokens.css`; if you need a token changed, say so in your report. Do not use browser tools (the lead reviews visually);
do run Node to test the engine.

## 1. Palettes

A palette is set with `data-palette="name"` on `<html>` or on any subtree. It overrides these tokens, each as
`light-dark(light, dark)` so `data-theme` keeps working inside it:

`--fd-ink`, `--fd-ink-inverse`, `--fd-wash`, `--fd-ink-wash`, `--fd-bg`, `--fd-bg-sunken`, `--fd-surface`,
`--fd-surface-raised`, `--fd-surface-inverse`, `--fd-scrim`, `--fd-thumb`, `--fd-line-faint`, `--fd-line`,
`--fd-line-strong`, `--fd-accent`, `--fd-accent-hover`, `--fd-accent-contrast`, `--fd-accent-text`, `--fd-accent-glow`.

Everything else (the ink ladder `--fd-a*`, text steps, fills, accent washes, focus ring, the primary button's shadow)
already re-derives on `[data-palette]` in `tokens.css`. Status colours, syntax colours and chart colours 2+ stay fixed.

How the neutrals work, so you tint them correctly: `--fd-wash` is the colour whose alpha steps make every fill and
border-ish tint (`#000` light / `#fff` dark by default); `--fd-ink-wash` is the colour whose alpha steps make text
(`#262626` / `#fff`). A tinted palette gives both a little of the neutral hue (very dark, low chroma in light mode; very
light in dark mode) so greys read as warm stone, cool slate and so on, instead of dead grey on a tinted page.

Reference lightness for the default (OKLCH L, light / dark), which every palette should stay close to so contrast and
the hairline structure survive: bg .982 / .145 · bg-sunken .967 / .115 · surface 1.0 / .19 · surface-raised 1.0 / .225 ·
line-faint .946 / .24 · line .931 / .285 · line-strong .868 / .36 · ink .27 / .97. Neutral chroma is small: about
.004–.012 on surfaces in light mode, up to about .02 in dark mode and on lines. "Midnight" and "Paper" may go further
(see below). Surfaces stay lighter than the page in both modes; in light mode `--fd-surface` may be pure white or a
barely tinted white.

### The fifteen
`ember` is the default and its values are the literals in `tokens.css` today, byte for byte. The others are designed:
give each a clear character, not just a different accent on the same grey.

| Name | Neutrals | Accent | Label on accent | Character |
|---|---|---|---|---|
| `ember` | pure grey | orange `#fa5d19` | white | The default. |
| `volt` | warm stone (hue ≈ 95) | electric lime `#b8f02c` | near-black | High-energy, terminal. Accent text on neutral must be a dark olive in light mode (AA). |
| `iris` | cool slate-violet (≈ 285) | indigo-violet `#6a5cff` | white | Calm, product-y. |
| `ocean` | blue-grey (≈ 250) | blue `#1f6feb` | white | Familiar developer blue. |
| `forest` | green-grey (≈ 155) | green `#1f9d55` | white | Quiet, operational. |
| `graphite` | pure neutral, slightly cooler and higher contrast than ember | the ink itself (`#262626` / `#f5f5f5`) | inverse | Monochrome. No colour anywhere. |
| `rose` | warm pink-grey (≈ 10) | rose `#e5386d` | white | Warm, consumer. |
| `honey` | cream (≈ 85) | amber `#f5a50b` | near-black | Friendly, warm. Accent text darkens to a brown-amber in light mode. |
| `plum` | purple-grey (≈ 320) | magenta-purple `#a03cc8` | white | Rich, night-time. |
| `lagoon` | teal-grey (≈ 200) | teal `#0e9aa0` | white | Fresh, data-y. |
| `paper` | sepia paper: noticeably cream page (chroma ≈ .015–.02, hue ≈ 85), warm brown-black ink | cobalt ink `#2b4bd6` | white | Editorial. The strongest neutral tint in light mode. |
| `clay` | sand (≈ 60) | terracotta `#c2552d` | white | Earthy, muted. |
| `mint` | cool pale grey-green (≈ 170) | mint `#3ddc97` | near-black | Light and airy. Accent text is a deep green in light mode. |
| `glacier` | icy blue (≈ 230) | sky `#0ea5e9` | white (check contrast; use near-black if white fails 4.5:1) | Crisp. |
| `midnight` | navy: in dark mode a clearly blue-black page (L ≈ .16, chroma ≈ .03, hue ≈ 265) with blue-tinted lines; cool in light mode | periwinkle `#7c9cff` dark / `#4f6ef7` light | white in light, near-black in dark | The strongest neutral tint in dark mode. |

Rules the engine enforces for every palette, in both modes, and that your Node test prints:
- `--fd-accent-text` on `--fd-bg`, on `--fd-surface` and on the 8% accent wash over each ≥ 4.5:1 (darken in light mode / lighten in dark mode until it passes).
- `--fd-accent-contrast` on `--fd-accent` ≥ 4.5:1: the label the table asks for while it passes, otherwise the other of white and the tinted near-black.
- `--fd-ink` on `--fd-bg` ≥ 12:1.
- `--fd-accent-hover` is the accent moved about .03–.04 L (darker in light mode, lighter in dark mode).
- `--fd-accent-glow` is a darker, more saturated accent at about .3 alpha (see the existing accent blocks in `tokens.css`).
- Dark-mode accents are a little lighter than light-mode ones, as in the existing blocks.
- Output colours as hex (alpha colours as `rgb(r g b / a)`), gamut-mapped into sRGB by reducing chroma, not by clipping channels.

### Engine (`fire/js/palettes.js`)
Suggested exports (keep them; internals are yours):
```js
export const PALETTES            // ordered: [{ name, label, note, tokens: { '--fd-bg': ['#f9f9f9', '#0a0a0a'], … } }, …]
export const DEFAULT_PALETTE = 'ember'
export const TONE_DEFAULT = { hue: 0, vivid: 100, light: 0, warmth: 0 }
export function toneTokens(tokens, tone)   // → the same map, transformed; identity when tone equals TONE_DEFAULT
export function cssValue([light, dark])    // → 'light-dark(#…, #…)'
export function contrast(a, b)             // WCAG ratio
```
Each palette holds its full resolved token map (light, dark). Author them however is cleanest (a compact spec expanded
by a function at module load is fine), but `ember` must equal the `tokens.css` literals exactly.

**Tone** bends whichever palette is selected, as a transform on its resolved colours in OKLCH/OKLab, so that zero tone
is exactly the palette:
- `hue` (−180…180°): rotates the accent group (`accent`, `accent-hover`, `accent-text`, `accent-glow`).
- `vivid` (0…150 %): scales the accent group's chroma. 0 is a grey accent.
- `light` (−12…12): shifts the accent's lightness by that many hundredths of L.
- `warmth` (−100…100): tints the neutral group (page, surfaces, lines, ink, washes) towards blue (negative) or
  yellow-orange (positive) by adding to OKLab a/b, scaled so ±100 is a clearly tinted but still neutral-looking page
  (about ±.018 chroma on the page in light mode, a bit more in dark mode and on lines; proportionally less on the
  whitest surface).
After any tone change the engine re-applies the contrast rules above (accent text AA, label on accent).

## 2. Tweak state and behaviour (`fire/js/tweaks.js`)

State (defaults in brackets), stored as JSON in `localStorage['fd-tweaks']`, only the non-default keys:

| Key | Values | Applied as |
|---|---|---|
| `palette` | palette name [`ember`] | `data-palette` on `<html>`; removed for `ember` |
| `tone` | `{ hue, vivid, light, warmth }` [zero] | when not default: the toned token map written as inline custom properties on `<html>` (`light-dark()` values); removed when default |
| `theme` | `system` · `light` · `dark` | use `setTheme` from core (it already persists) |
| `density` | `compact` · [`comfortable`] · `spacious` | use `setDensity` from core |
| `corners` | 0…2, step .125 [1] | inline `--fd-radius-scale` |
| `lines` | [1] · 1.5 · 2 | inline `--fd-hairline: 1.5px` |
| `display` | [`sans`] · `mono` · `serif` | inline `--fd-font-display`: `var(--fd-font-mono)` or `ui-serif, "New York", "Iowan Old Style", "Palatino Linotype", Georgia, serif` |
| `textSize` | `sm` · [`md`] · `lg` | `data-text-size` on `<html>` (removed for md) |
| `contrast` | [`default`] · `high` | `data-contrast="high"` on `<html>` |
| `motion` | `off` 0 · [`default`] 1 · `slow` 1.75 | inline `--fd-motion` |
| `texture` | 0…1.5, step .05 [1] | inline `--fd-texture` |

- Saved tweaks are applied **synchronously when the module is evaluated** (before `ready`), so there is no flash.
- Default state leaves no trace: no attributes, no inline properties.
- Exports: `init(root = document)`, `open()`, `close()`, `toggle()`, `get()` (full state), `set(partial)`, `reset()`.
  Every change fires `fd:change` on `document.documentElement` with `detail: { name: 'tweaks', value: state }`.
- Triggers: any `[data-fd-tweaks-open]` element toggles the panel (set its `aria-expanded`). If `<html>` has
  `data-fd-tweaks` and the page has no trigger, `init` adds a floating launcher button (bottom-left, 40px round,
  `sliders-horizontal` icon, label "Tweaks").
- The panel element is built by JS once, appended to `<body>`, and reused. It is **not modal**: the page stays usable
  so changes can be watched. `Escape` closes it when focus is inside; focus returns to the trigger. The header is a
  drag handle on desktop (pointer events, clamped to the viewport; position kept for the session).
- "Copy CSS" copies a ready-to-paste block: a comment with the attributes to set on `<html>`, then `:root { … }` with
  every overridden custom property (toned palette colours included). "Copy theme" copies the same look as a theme
  record (JSON, `contract/theme.schema.json`; `toTheme()`, from `fire/js/theme.js` `toThemeRecord`). "Reset" returns
  everything to default.
- Follow `core.js` conventions (`on`, `once`, `emit`, `copyText`, `icon` from `./icons.js`). No dependencies. Check
  icon names exist in `fire/js/icons.js` (`ICONS`).

## 3. The panel (`fd-tweaks`) — design

A compact instrument panel, not a settings page. It should feel like the tool palette of a design app: dense, precise,
mono labels, instant.

- **Frame**: `position: fixed`, 16px from the right, below the top bar (`calc(var(--fd-topbar-h) + var(--fd-space-2))`
  from the top), 328px wide, max height `calc(100dvh - top - 16px)`, `--fd-surface-raised`, `--fd-radius-2xl`,
  `--fd-shadow-xl`, `z-index: var(--fd-z-popover)`. Body scrolls; header and footer stay. Opens with the standard
  floating-surface motion (opacity + scale from .96, origin top right). Below 640px it becomes a bottom sheet: full
  width, top corners rounded, max height 72dvh, slides up, with a grab bar.
- **Header** (44px): `sliders-horizontal` icon, "Tweaks" (label weight), a quiet "Reset" text button that is disabled
  when everything is default, and a close icon button.
- **Sections**, separated by full-width faint hairlines, each headed by a mono uppercase eyebrow (`fd-eyebrow` look):
  1. **Theme** — segmented: Light · Dark · System (icons `sun`, `moon`, `monitor` + labels).
  2. **Palette** — a 5 × 3 grid of swatches. Each swatch is a button (`role="radio"` in a `radiogroup`): a 40px-tall
     tile with `--fd-radius-md` painted with *that palette's own* page colour for the current theme, a hairline edge in
     its own line colour, a 14px accent dot and a short 2px ink bar beside it (a miniature of "page, ink, accent"); the
     palette's name underneath in 11px. Set `data-palette` on the swatch so its tokens resolve by themselves. Hover
     lifts the edge; selected has a 1.5px accent ring (in its own accent) and the name in full text colour. Arrow keys
     move through the grid.
  3. **Tone** — four sliders, each a row: label left, mono value right (`+24°`, `120%`, `−3`, `warm 40` / `cool 20` /
     `0`), slider underneath. The hue track shows a hue sweep; the warmth track goes blue → neutral → amber; vividness
     goes grey → accent. Double-click a slider (or click its value) to return it to default. A changed value is shown
     in accent text.
  4. **Shape** — Density: segmented Compact · Default · Spacious. Corners: slider with value like `1.25×`, the ends
     labelled with a square and a round corner glyph. Lines: segmented 1 · 1.5 · 2.
  5. **Type** — Headings: segmented Sans · Mono · Serif (each label set in its own face). Text size: segmented
     S · M · L. High contrast: switch.
  6. **Motion and texture** — Motion: segmented Off · Default · Slow. Texture: slider `0%…150%`.
- **Footer**: "Copy CSS" (default button, small, copy icon, swaps to "Copied" for 1.4s using the system's
  `data-fd-copy`-style done state), "Copy theme" beside it (the same pattern, `braces` icon, copies the theme record)
  and a one-line mono summary of the state (`ember · comfortable · 1×`).
- Controls inside the panel are small (`data-size="sm"` where the system has it) and reuse the system's own
  components: `fd-segmented`, `fd-slider`, `fd-switch`, `fd-btn`. Read their markup contracts in the forms / nav /
  button CSS and JS headers; build the same markup so the existing modules drive them, and call the family `init` on the
  panel if a module needs it (import from `./forms.js`, `./nav.js`). Do not restyle those components from `tweaks.css`
  beyond track backgrounds for the tone sliders and sizing.
- `tweaks.css` follows `docs/_ref/TOKENISE.md`: **no raw px/rem/ms values in rules**. Global tokens where the meaning
  fits, otherwise `--fd-tweaks-*` component tokens in a `:root {}` block at the top of the file. `node scripts/audit.mjs`
  must show 0 `literals` findings for `tweaks.css` and no errors from your files.
- Correct in light and dark, at 375px, by keyboard, and under every palette (the panel itself recolours with the page).

## 4. Docs page (`docs/tweaks.html`)

`<body class="doc" data-page="tweaks">`, eyebrow "Foundations", title "Theming and tweaks". Follow DESIGN.md §7 and the
structure of `docs/buttons.html` (load `docs.js` before `../fire/fire.js`). Sections:
1. **Tweaks panel** — what it is, a button `data-fd-tweaks-open` that opens it, and how to add it to a product
   (`data-fd-tweaks` on `<html>`, or your own trigger; the JS API).
2. **Palettes** — a gallery: fifteen cards in a responsive grid, each a subtree with `data-palette="name"` and its own
   page background, showing a tiny real composition built from Fire components (a primary button, a default button, a
   badge, an input, an active nav item or a link, a line of muted text) plus the palette name and its one-line
   character. A second specimen shows three of them forced dark (`data-theme="dark"` on the card).
3. **Tone** — what each of the four controls does and what the engine guarantees (contrast rules).
4. **Scales** — the character variables: `--fd-space-scale`, `--fd-radius-scale`, `--fd-motion`, `--fd-texture`,
   `--fd-hairline`, `--fd-font-display`, `data-density`, `data-contrast`, `data-text-size`, with a `.doc-table` of
   name, default, what it changes; and two or three live specimens that set a variable on a subtree by `style`
   attribute (sharp vs round corners; compact vs spacious) to show the effect.
5. **Make your own palette** — the token list a palette sets, a code sample of a custom `[data-palette="brand"]` block,
   and the note that washes, text steps and rings derive by themselves.
Realistic Ember content, sentence case, no lorem ipsum.

## Report back (short)
The palette table as built (name, light bg / accent / accent text, dark bg / accent / accent text, measured contrast
ratios), any palette where a rule could not be met, the markup contract of the panel, and anything you want the lead to
change in `tokens.css` or the wiring.
