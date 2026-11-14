# Fire — design contract

Fire is a design system for developer, agent and AI products: consoles, playgrounds, catalogs, logs, billing, and chat-style agent interfaces. It is plain CSS and small ES modules, with no framework and no build step.

This file is the contract. Anyone adding to Fire, human or model, follows it exactly.

## 1. The look, in eight rules

1. **One ink.** Every neutral is the ink colour at an opacity (`--fd-a1` … `--fd-a88`). Fills, hovers, muted text and borders all come from this ladder, so they stay right on any surface and invert for dark mode by themselves. Never write a grey hex.
2. **One accent, used sparingly.** The accent appears on: the primary button, the active nav item (as an 8% wash with accent text), links, focus rings, switches that are on, the lead chart series, and small "this is live/new" marks. Nothing else. A screen that is mostly accent is wrong.
3. **Hairlines, not boxes.** Structure comes from 1px lines (`--fd-line-faint`) and the page frame, not from cards inside cards. A card is used when something is an object (a provider, a plan, a key). Sections of a page are separated by full-width hairlines.
4. **An off-white page with white objects on it.** `--fd-bg` is the page. `--fd-surface` (white) is for inputs, cards, table bodies. Floating things use `--fd-surface-raised` and a shadow that includes its own 1px ring.
5. **Weight 450 is the house weight.** Labels, buttons, nav and card titles are 450. Headings and figures are 500. Body is 400. 600 only for emphasis inside prose. Never 700.
6. **Two voices: sans and mono.** The interface face is Geist (weights 400, 450, 500); the mono face is Geist Mono. Change faces only through `--fd-font-sans`, `--fd-font-mono` and `--fd-font-display` (headings), or with a type set: `data-type="editorial"` (`fire/typefaces.css`; eleven sets beside the default). Mono (`.fd-mono`, `.fd-eyebrow`) is for identifiers, keys, paths, endpoints, units, table headers and small uppercase eyebrows. It gives the product its technical character. Prose is never mono.
7. **Soft controls.** The default button and the filter trigger are a borderless 4% ink wash with a 10px radius, 36px tall. Inputs are white with an 8% ink inside line and an 8px radius. The primary button is the only control with depth (inner shade plus tinted contact shadows).
8. **Everything moves a little.** Hover changes colour in 160ms. Pressing scales to 98%. Thumbs slide with a slight spring. Menus scale in from their anchor. Content rises 8px on entrance. Nothing bounces, nothing loops unless it is reporting live work.

## 2. Tokens

Every value is a variable. Global tokens live in `fire/tokens.css`; values that belong to one component live in a `:root {}` block at the top of that component's file, named `--fd-<component>-<what>` (`--fd-avatar-md`, `--fd-dialog-w-sm`). Component rules never contain a raw `px`, `rem`, `ms` or `s` value, a letter-spacing or a decimal line height: `node scripts/audit.mjs` checks this (`literals`) and must report none. Add a token if one is missing and say so.

| Group | Tokens |
|---|---|
| Surfaces | `--fd-bg`, `--fd-bg-sunken`, `--fd-surface`, `--fd-surface-raised`, `--fd-surface-inverse`, `--fd-scrim` |
| Text | `--fd-text`, `--fd-text-2` (72%, descriptions), `--fd-text-3` (56%, meta), `--fd-text-4` (40%, placeholder/disabled), `--fd-text-5` (24%, sidebar section labels), `--fd-text-inverse` |
| Lines | `--fd-line-faint` (structure), `--fd-line` (controls, table rules), `--fd-line-strong` (hover) |
| Fills | `--fd-fill`, `--fd-fill-hover`, `--fd-fill-active`, `--fd-fill-subtle`, `--fd-fill-disabled`, and the raw ladder `--fd-a1…a88` |
| Accent | `--fd-accent`, `--fd-accent-hover`, `--fd-accent-contrast`, `--fd-accent-text`, washes `--fd-accent-4/8/12/16/24/40` |
| Status | `--fd-{success,warning,danger,info,violet}-{solid,text,bg,line}` |
| Type | sizes `--fd-text-{display,3xl,h1,h2,h3,xl,title,lg,compose,md,sm,xs,2xs,3xs,4xs,stat}` with matching `--fd-lh-*`; reading line heights `--fd-lh-{prose,prose-sm,code}`; tracking `--fd-ls-{display,lg,body,tag,caps,tight}`; weights `--fd-weight-{regular,label,medium,semibold}`; `--fd-font-sans`, `--fd-font-mono`, `--fd-font-display` (headings; the sans by default), `--fd-weight-display` (heading weight) |
| Space | `--fd-space-{0,0-5,1,1-5,2,2-5,3,3-5,4,5,6,8,10,12,16,20,24}` (4px grid, each multiplied by `--fd-space-scale`) |
| Size | `--fd-size-{4xs 24,3xs 48,2xs 64,xs 96,sm 160,md 240,lg 320,xl 400,2xl 480,3xl 560,4xl 640,5xl 768,6xl 960,phone 375}`: a shared ladder of lengths for components and grid minimums. Markup does not set widths |
| Icons | `--fd-icon-{xs 12,sm 14}`, `--fd-icon` 16, `--fd-icon-{lg 20,xl 24}` |
| Radius | `xs 4` · `sm 6` · `md 8` · `lg 10` (controls) · `xl 12` (cards, popovers) · `2xl 16` (dialogs) · `3xl 20` · `full` |
| Controls | `--fd-control-{xs 24,sm 28,md 36,lg 40,xl 44}`, `--fd-control-px`, `--fd-row` (44), `--fd-row-px` |
| Layout | `--fd-sidebar-w 256`, `--fd-rail-w 64`, `--fd-topbar-h 64`, `--fd-panel-w 320`, `--fd-subnav-w 280`, `--fd-gutter 24/16`, `--fd-content-max 1140` |
| Shadow | `--fd-shadow-{xs,sm,md,lg,xl,thumb,inset,accent}`, `--fd-ring`, `--fd-ring-inset` |
| Motion | `--fd-dur-{1 100,2 160,3 220,4 320,5 520}` (each multiplied by `--fd-motion`), loops `--fd-loop-{spin,shimmer,pulse,blink,dots}`, `--fd-stagger`, `--fd-ease-{out,in-out,in,emphasized,spring}`, `--fd-press-scale` |
| Character | `--fd-space-scale`, `--fd-radius-scale`, `--fd-motion`, `--fd-texture`, `--fd-hairline`, `--fd-font-display`: one number or family each, and the whole system follows |
| Layers | `--fd-z-{sticky,topbar,sidebar,overlay,dialog,popover,toast,tooltip}` |

Theming: tokens use `light-dark()`. `data-theme="dark|light"` works on `<html>` or any subtree. `data-palette="name"` (`fire/palettes.css`, fifteen of them; `ember` is the default and needs no attribute) recolours neutrals and accent together; `data-type="name"` (`fire/typefaces.css`, twelve type sets; `geist` is the default) changes the heading, interface and mono faces together; `data-accent` swaps only the accent. `data-density="compact|spacious"` changes controls, rows and the space scale; `data-contrast="high"` strengthens muted text and lines; `data-text-size="sm|lg"` scales all type. Components must look right in all combinations without theme-specific selectors. If you need a different value per theme, make a token with `light-dark()`.

The neutrals are alpha steps of two colours: `--fd-wash` (fills and tints) and `--fd-ink-wash` (text). A palette sets those two, the page and surface colours, the three line colours and the accent; every other step derives from them. The **Tweaks** panel (`fire/js/tweaks.js`, any `[data-fd-tweaks-open]` button, or `data-fd-tweaks` on `<html>` for a floating launcher) changes palette, tone, typeface, theme, density, corners, lines, text size, contrast, motion and texture live, and remembers them; `fire/boot.js`, a small classic script for `<head>`, puts the saved look back before the first paint. See `docs/tweaks.html`.

## 3. Naming and structure

- Block class `fd-<block>`; parts `fd-<block>-<part>`. Flat, no nesting deeper than block → part.
- Variants and sizes are data attributes on the block: `data-variant`, `data-size`, `data-tone` (`neutral|accent|success|warning|danger|info|violet`), `data-state`.
- State comes from native and ARIA attributes, and CSS selects on them: `:disabled`, `[aria-current="page"]`, `[aria-selected="true"]`, `[aria-expanded="true"]`, `[aria-pressed="true"]`, `[aria-busy="true"]`, `[aria-invalid="true"]`, `[data-state="open"]`, `[hidden]`.
- Component-private custom properties start with `--_` plus the family's prefix (`--_b-` button, `--_s-` shell, `--_n-` nav, `--_f-` forms, `--_o-` overlays, `--_d-` data, `--_c-` content, `--_k-` code, `--_a-` agent, `--_cht-` chat, `--_ch-` charts, `--_tx-` texture, `--_sk-` skeleton, `--_doc-` documentation, `--_tw-` tweaks, `--_l-` layout primitives in base). Custom properties inherit, so an unprefixed name set on a container leaks into every component inside it. To set another family's private property (for example a button's radius from a form rule), use that family's prefix.
- **Structure decides width; markup never sets one.** Things are placed with `fd-stack`, `fd-row`, `fd-grid` and `fd-column` (a block that fills its container up to a readable width; `data-size="xs|sm|md|lg|xl"`, `data-align="center"`). Components bring their own widths: a form's measure (`fd-form`, `fd-form-cols`; `data-size="sm|lg|full"`), a control sized to its content (`data-fit`), a setting's control column (`data-control="wide"`), a table's columns (`th[data-col="fit|sm|md|lg|fill"]`), a placeholder's length (`fd-table-skeleton[data-size]`), a dialog's or sheet's `data-size`. When something needs a width that structure does not give it, add a grid, a column or a size variant on the component, with its value as a component token. There are no width or height attributes.
- **Layout attributes** (`fire/layout.css`, loaded last) tune structure only: `data-gap` / `data-gap-x` (space steps), `data-min` (narrowest grid column, size steps), `data-cols` (most grid columns) and `data-span` (columns a grid child covers; `full`). An inline `style` may only pass a token to a component parameter (`--fd-panel-w: var(--fd-size-xl)`), a relative value (`72%`, `20ch`) or a unitless number (`--value: 0.62`, `--fd-i: 2`). `node scripts/audit.mjs` reports pixel values and width or height attributes in templates and docs under `inline`; it must report none. `--fd-gap`, `--fd-min` and `--fd-cols` are registered as non-inheriting, so a gap on a stack is not the gap of the rows inside it.
- Use logical properties where direction matters (`padding-inline`, `margin-inline-start`, `inset-inline`).
- Responsive behaviour uses container queries (`.fd-cq` or a named container on the component) before media queries. Breakpoints when a media query is needed: 640px (phone), 900px (tablet / sidebar collapses to a drawer), 1200px.
- Icons: `<i data-icon="name"></i>` in markup (upgraded to an inline `<svg class="fd-icon">` by `fire/js/icons.js`), or `icon('name')` in JS. Names are Lucide names; the available set is the keys of `ICONS` in `fire/js/icons.js`. Icons are 16px with a 1.5 stroke; 14px inside small controls. Never use emoji as icons.

## 4. Interaction rules

- **Hover**: colour or fill change only, `--fd-dur-2`. Cards may lift their border to `--fd-line-strong` and reveal a corner arrow; they do not jump.
- **Press**: `scale: var(--fd-press-scale)` on buttons, nav items, chips and cards that are links.
- **Focus**: `box-shadow: var(--fd-ring)` on `:focus-visible` only. Inputs swap their inside line for a 1.25px accent line instead; interactive cards use the inset ring. Never remove focus without replacing it.
- **Disabled**: `--fd-fill-disabled` background, `--fd-text-4` text, `cursor: not-allowed`. No opacity tricks on text.
- **Loading**: keep layout; swap content for a spinner or skeleton. Buttons use `aria-busy="true"`.
- **Open/close**: floating surfaces animate `opacity` and `scale` from 0.96 with `transform-origin` at the anchor side (`data-side`), `--fd-dur-3 --fd-ease-out` in, `--fd-dur-2` out. Dialogs and sheets use `--fd-dur-4 --fd-ease-emphasized`.
- **Touch**: targets are at least 40px (tokens grow automatically under `pointer: coarse`). Hover-only affordances must have a visible or focusable equivalent.
- **Reduced motion**: `--fd-motion` becomes 0, so every duration collapses through the tokens. Do not add animation that ignores the tokens.
- **Keyboard**: every component is fully operable by keyboard with the standard ARIA pattern for its role (menu, tabs, listbox, dialog, switch, slider, combobox, disclosure).

## 5. JavaScript

- ES modules in `fire/js/`. Each exports `init(root = document)`, is idempotent, and auto-runs from `fire/fire.js`. Import helpers from `./core.js` (`on`, `once`, `emit`, `position`, `autoUpdate`, `rove`, `trapFocus`, `focusables`, `copyText`, `ensureId`, `reducedMotion`, `ready`, `setTheme`…) and `icon` from `./icons.js`. Read `core.js` before writing a module.
- Behaviour attaches through `data-fd-*` attributes and ARIA, using delegated listeners on `document`, so markup inserted later works without re-init where possible.
- State is written to the DOM (`data-state`, `hidden`, ARIA). Changes fire bubbling events: `fd:open`, `fd:close`, `fd:change` (`detail.value`), `fd:select`.
- Floating surfaces use the native Popover API (`popover="auto"` or `"manual"`) for top-layer and light dismiss, positioned with `position()` from core. Modals use native `<dialog>` and `showModal()`.
- No dependencies, no globals except what a module explicitly documents, no inline styles except computed geometry (positions, sizes, CSS custom properties for values).
- A module documents its markup contract in a header comment.

## 6. Voice

The full guide to interface text is `WRITING.md`: how to decide what to write, word budgets per element, help text, empty states, errors and agent messages. The summary:

Sentence case everywhere except mono eyebrows (uppercase). Name things by what they do. Buttons are verb + object ("Start scraping", "Copy referral link"). Empty states say what will appear and give the action. Errors say what happened and what to change. Numbers use tabular figures and thousands separators; identifiers, keys, paths and units are mono. Dates are short ("Nov 23", "Feb 10, 2026 4:29 PM").

Demo content is for a fictional developer platform called **Ember** (a web-data and agent API): teams, API keys, credits, endpoints `/search` `/scrape` `/crawl` `/extract` `/agent`, monitors, runs, logs, providers. Do not use real company logos or names other than as plain text in sample data; draw provider marks as simple letter or glyph tiles.

## 7. Docs pages

Every component family has a page in `docs/` built like `docs/buttons.html` (read it first):

```html
<body class="doc" data-page="<slug>">
<main class="doc-main">
  <header class="doc-hero"><p class="fd-eyebrow">Components</p><h1 class="fd-display">…</h1><p class="doc-lede">…</p></header>
  <section class="doc-section" id="…">
    <div class="doc-section-head"><h2 class="fd-h3">…</h2><p>…</p></div>
    <div class="doc-specimen" data-code> …live markup… </div>
    <ul class="doc-notes"><li>…</li></ul>
  </section>
</main>
```

- `docs.js` adds the sidebar, top bar (theme, accent, density switches), an on-page table of contents, and a "Markup" code view under each `.doc-specimen[data-code]`. Load `docs.js` **before** `../fire/fire.js`.
- Specimen options: `data-layout="stack|center|grid|bleed"`, `data-surface="surface|sunken"`, `data-height style="--h:420px"`.
- Other helpers: `.doc-pair` (two specimens side by side), `.doc-notes`, `.doc-do` (do / don't), `.doc-table` (API table), `.doc-sub` (sub-heading).
- Show every variant, size and state, including hover-independent states (disabled, loading, invalid, empty, selected, open). Use realistic Ember content, never lorem ipsum. Each section gets one or two sentences that explain when to use the thing, not what it is.
- Do not add page-specific CSS files. Lay demos out with the primitives (`.fd-stack`, `.fd-row`, `.fd-grid`, `.fd-column`) and the layout attributes (`data-gap`, `data-min`, `data-cols`, `data-span`). To show a component in a narrow container or at a set height, put the docs-only `data-frame="lg"` / `data-frame-h="md"` on it (size steps; `docs.css`); the code view leaves them out. No pixel values and no width attributes in markup.

## 8. Quality bar

A component is done when: it is correct in light and dark, under at least the ember, volt and midnight palettes, in compact and spacious density, with corners at 0 and 2, at 1440px and 375px; it is operable by keyboard; nothing overflows at 320px; hover, focus-visible, active, disabled and loading states exist where they apply; text never touches an edge; and numbers align.
