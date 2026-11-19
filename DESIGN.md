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
| Text | `--fd-text`, `--fd-text-2` (72%, descriptions), `--fd-text-3` (67% light / 56% dark: meta, labels, headers, counts, keys), `--fd-text-4` (placeholders, disabled text and decorative icons only), `--fd-text-5` (never text: rules, dots), `--fd-text-inverse`. Text through `--fd-text-3` reaches 4.5:1 on every background in every palette and `--fd-text-4` 3:1; `node scripts/build-palettes.mjs --check` enforces it |
| Lines | `--fd-line-faint` (structure), `--fd-line` (controls, table rules), `--fd-line-strong` (hover) |
| Fills | `--fd-fill`, `--fd-fill-hover`, `--fd-fill-active`, `--fd-fill-subtle`, `--fd-fill-disabled`, and the raw ladder `--fd-a1…a88` |
| Accent | `--fd-accent`, `--fd-accent-hover`, `--fd-accent-contrast`, `--fd-accent-text`, washes `--fd-accent-4/8/12/16/24/40` |
| Status | `--fd-{success,warning,danger,info,violet}-{solid,text,bg,line,fill,contrast}`: `-solid` for dots, lines and marks, `-fill` with its `-contrast` label (4.5:1) wherever text or an icon sits on the tone. Every palette derives its own tones and its six chart series (`--fd-chart-1…6`) from its accent, ink and page; ember's are the reference. The build checks the series for 3:1 contrast, for distance in normal and in simulated colour-blind vision, and for no olive in the light scheme |
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

Theming: tokens use `light-dark()`. `data-theme="dark|light"` works on `<html>` or any subtree. `data-palette="name"` (`fire/palettes.css`, fifteen of them; `ember` is the default and needs no attribute) recolours neutrals and accent together; `data-type="name"` (`fire/typefaces.css`, twelve type sets; `geist` is the default) changes the heading, interface and mono faces together; `data-accent` swaps only the accent. `data-density="compact|spacious"` changes controls, rows and the space scale; `data-contrast="high"` strengthens muted text and lines; `data-text-size="sm|lg"` scales all type. Four structural dials change how a page is built, not its colours: `data-surfaces="flat|outlined"` (objects tinted without edges, or page and surface one colour with drawn edges), `data-elevation="none|lifted"`, `data-controls="outlined|filled"` (the secondary controls; the primary keeps its depth) and `data-headings="upper|mono"` (the small labels). A fifth dial, `data-imagery="natural|mono|duotone|wash"`, is not structure: it treats the pictures of a site, and only `fd-site-media` and the image ground read it. The four set semantic tokens (`--fd-surface-edge`, `--fd-surface-flush`, `--fd-surface-head`, `--fd-field`, `--fd-control-bg`, `--fd-control-edge`, `--fd-shadow-object`, `--fd-eyebrow-*`): a component paints objects, fields, secondary controls and small labels with those tokens, never with a dial selector. Components must look right in all combinations without theme-specific selectors. If you need a different value per theme, make a token with `light-dark()`.

The neutrals are alpha steps of two colours: `--fd-wash` (fills and tints) and `--fd-ink-wash` (text). A palette sets those two, the page and surface colours, the three line colours and the accent; every other step derives from them. The **Tweaks** panel (`fire/js/tweaks.js`, any `[data-fd-tweaks-open]` button, or `data-fd-tweaks` on `<html>` for a floating launcher) changes the named look, palette, tone, typeface, theme, density, corners, lines, text size, contrast, motion, texture, the four structural dials, the signature and how pictures are treated live, and remembers them; `fire/boot.js`, a small classic script for `<head>`, puts the saved look back before the first paint. See `docs/tweaks.html`.

## 3. Naming and structure

- Block class `fd-<block>`; parts `fd-<block>-<part>`. Flat, no nesting deeper than block → part.
- Variants and sizes are data attributes on the block: `data-variant`, `data-size`, `data-tone` (`neutral|accent|success|warning|danger|info|violet`), `data-state`.
- State comes from native and ARIA attributes, and CSS selects on them: `:disabled`, `[aria-current="page"]`, `[aria-selected="true"]`, `[aria-expanded="true"]`, `[aria-pressed="true"]`, `[aria-busy="true"]`, `[aria-invalid="true"]`, `[data-state="open"]`, `[hidden]`.
- Component-private custom properties start with `--_` plus the family's prefix (`--_b-` button, `--_s-` shell, `--_n-` nav, `--_f-` forms, `--_o-` overlays, `--_d-` data, `--_c-` content, `--_k-` code, `--_a-` agent, `--_cht-` chat, `--_ch-` charts, `--_tx-` texture, `--_sk-` skeleton, `--_doc-` documentation, `--_tw-` tweaks, `--_l-` layout primitives in base, `--_site-` website, `--_tr-` page transitions). Custom properties inherit, so an unprefixed name set on a container leaks into every component inside it. To set another family's private property (for example a button's radius from a form rule), use that family's prefix.
- **Structure decides width; markup never sets one.** Things are placed with `fd-stack`, `fd-row`, `fd-grid` and `fd-column` (a block that fills its container up to a readable width; `data-size="xs|sm|md|lg|xl"`, `data-align="center"`). Components bring their own widths: a form's measure (`fd-form`, `fd-form-cols`; `data-size="sm|lg|full"`), a control sized to its content (`data-fit`), a setting's control column (`data-control="wide"`), a table's columns (`th[data-col="fit|sm|md|lg|fill"]`), a placeholder's length (`fd-table-skeleton[data-size]`), a dialog's or sheet's `data-size`. When something needs a width that structure does not give it, add a grid, a column or a size variant on the component, with its value as a component token. There are no width or height attributes.
- **Layout attributes** (`fire/layout.css`, loaded last) tune structure only: `data-gap` / `data-gap-x` (space steps), `data-min` (narrowest grid column, size steps), `data-cols` (most grid columns) and `data-span` (columns a grid child covers; `full`). An inline `style` may only pass a token to a component parameter (`--fd-panel-w: var(--fd-size-xl)`), a relative value (`72%`, `20ch`) or a unitless number (`--value: 0.62`, `--fd-i: 2`). `node scripts/audit.mjs` reports pixel values and width or height attributes in templates and docs under `inline`; it must report none. `--fd-gap`, `--fd-min` and `--fd-cols` are registered as non-inheriting, so a gap on a stack is not the gap of the rows inside it.
- Use logical properties where direction matters (`padding-inline`, `margin-inline-start`, `inset-inline`).
- Responsive behaviour uses container queries (`.fd-cq` or a named container on the component) before media queries. The breakpoints have names, and `contract/fire-contract.json` lists them as `breakpoints`: phone below 640px, tablet 640 to 899px (the sidebar collapses to a drawer), desktop from 900px, wide from 1200px. Measure a container where you can (the app shell, the docs kit, `.fd-site`), so a part behaves the same inside a board or a specimen as on its own page; use a media query only when no container exists.
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
- **Page transitions** are opt in and progressive: nothing is named, and nothing moves, until a page sets `data-fd-transition` on `<html>`. The chrome holds still and only the page changes; a view-transition name is never given inside a specimen (`.fd-app[data-contained]`, `.doc-specimen`, `[inert]`), and a name is unique on a page. The names are all in `fire/components/transitions.css`; a fixed part that must not fade with the page is added there. A browser without View Transitions, reduced motion and motion "none" navigate as usual.
- **Keyboard**: every component is fully operable by keyboard with the standard ARIA pattern for its role (menu, tabs, listbox, dialog, switch, slider, combobox, disclosure).

## 5. JavaScript

- ES modules in `fire/js/`. Each exports `init(root = document)`, is idempotent, and auto-runs from `fire/fire.js`. Import helpers from `./core.js` (`on`, `once`, `emit`, `position`, `autoUpdate`, `rove`, `trapFocus`, `focusables`, `copyText`, `ensureId`, `reducedMotion`, `ready`, `setTheme`…) and `icon` from `./icons.js`. Read `core.js` before writing a module.
- Behaviour attaches through `data-fd-*` attributes and ARIA, using delegated listeners on `document`, so markup inserted later works without re-init where possible.
- State is written to the DOM (`data-state`, `hidden`, ARIA). Changes fire bubbling events: `fd:open`, `fd:close`, `fd:change` (`detail.value`), `fd:select`, and the ones a family adds (`fd:filter`, `fd:commit`, `fd:hold`, `fd:undo`, `fd:accept`, `fd:copy`, `fd:submit`, `fd:files`, `fd:keys`...). Each is listed with its `detail` in `contract/catalog.json`.
- Floating surfaces use the native Popover API (`popover="auto"` or `"manual"`) for top-layer and light dismiss, positioned with `position()` from core. Modals use native `<dialog>` and `showModal()`.
- No dependencies, no globals except what a module explicitly documents, no inline styles except computed geometry (positions, sizes, CSS custom properties for values).
- A module documents its markup contract in a header comment. Plain functions that run with no DOM (`fire/js/theme.js`, `fire/js/initial.js`, `fire/email/email.js`) and a helper with no markup of its own (`fire/js/transitions.js`) are modules too: each gets a card in the catalogue.
- Custom elements (`fire/elements.js`) exist only where a component builds its own DOM (`fd-icon`, `fd-chart`, `fd-code`, `fd-texture`). Each is its component's root and renders the same DOM as the markup form. A component whose markup the author writes is not a custom element.

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

A screen is done when, as well as the above: every control matches the kind of value it holds (`GUIDE.md` section 5, "Forms": nobody types a choice, a yes or no, a list or JSON); each heading level is a visible step from the one above it; a long form sits in `fd-form-section`s on a surface; and someone has looked at it in a browser. Every attribute value used in markup is one the vocabulary lists: an attribute Fire does not define does nothing, silently.

A new component, pattern or template is admitted when it is not a near-duplicate of one Fire has, or when its card says how it differs: a `relation` (`variantOf` or `distinctFrom`) with one sentence on when to use it instead. `node scripts/gate.mjs` compares structure, look and job against every peer and runs in `scripts/build.mjs`; `node scripts/gate.mjs --probe <page>` checks a candidate first. Before you add anything, run `npx fire find` for what it does.

**Surfaces.** A card's `surfaces` (`app`, `website`, `phone`, `email`) is the single source of where a part belongs. The markup lint (`surface-mismatch`, against `data-fd-surface` on the page), `fire find --surface`, the Catalogue page, the surface tags beside each docs heading and the Facet export all read it, so it has to be honest: list a surface only where the part is right as it is, and a part that is right only on a phone lists only `phone`. A phone page also accepts parts that list `app`. The order is fixed: app, website, phone, email. A template declares its surface on `<html>`, has a card, and, where it has states, opens each from `?state=`.

**Filters.** Up to three fields people change all the time are `fd-filter` chips; more than three are one `fd-filters`. A page that filters rows uses `data-fd-for` and the `fd:filter` event, and does not draw a chip row of its own.

**Pictures.** `contract/index.json` has a picture for every entry but the modules (`contract/pictures/<kind>/<id>.png`, the rule in its `pictures` field). `node scripts/build-pictures.mjs` renders them from the first docs specimen that holds the part (a template: its first screen); a new entry is picked up with no change, and `build.mjs --check` fails when an entry has no picture or a picture has no entry.

Every dial must reach your component. Paint objects, fields, secondary controls and small labels with the semantic tokens in `fire/tokens.css`, never with a dial selector or a raw palette step: `--fd-surface-edge`, `--fd-surface-flush` and `--fd-surface-head` for an object's edge, its flush fill and its head strip; `--fd-field` and `--fd-field-hover` inside an input; `--fd-control-bg`, `--fd-control-bg-hover`, `--fd-control-bg-active`, `--fd-control-edge` and `--fd-control-edge-hover` for a secondary control; `--fd-shadow-object` for the drop of an object; and `--fd-eyebrow-font`, `--fd-eyebrow-case`, `--fd-eyebrow-ls`, `--fd-eyebrow-ls-tight`, `--fd-eyebrow-weight`, `--fd-section-label-font` and `--fd-section-label-ls` for small labels.

## 9. Websites

A public site is built from a grammar, not a block library: a layout foundation (`fire/components/site.css`, `docs/site.html`) and section types (`docs/site-sections.html`), each a catalogue entry of kind `section`.

- **A section brings layout and rhythm only.** Every control, list, table and card inside it is an existing Fire component.
- **Variants differ in structure, never in decoration.** A variant is a `data-layout` that places the parts differently (a hero's `start`, `split`, `stack` and `center`), never one that changes how the same placement looks. Do not add a gradient, a glow, an icon in a tinted square, a drop-shadowed row of three cards or a pill above every headline. A site is told apart by its look (palette, type set, signature texture, dials) and by how its sections are composed.
- **The container is the measure.** Every section measures `.fd-site` (a size container), never the viewport, with the named breakpoints of section 3. Type is fluid between a phone floor and a wide ceiling through `--fd-fluid-*` and follows `data-text-size` and the type set. Block padding is `--fd-site-rhythm`; two neighbours on one ground share one rhythm.
- **Grounds** are `page`, `sunken`, `raised`, `inverse`, `accent`, `texture` and `image`. Text is 4.5:1 on each, measured at the densest signature; on `image` the scrim holds it whatever the picture.
- **Pictures are the site's own art, treated by the look.** A picture is an `fd-site-media` with `alt`, `width` and `height` (the lint warns `img-attrs`); a picture a visitor supplies is an `fd-doc-frame`, whose address is checked. Text goes over a picture only on the image ground. Treatments (`natural`, `mono`, `duotone`, `wash`) are CSS filters and blend layers, never script, and the `imagery` dial in the theme record sets them. The pictures in `templates/media/` are generated placeholders.
- **Reading pages and listings reuse what Fire has.** `fd-site-article` is the one section for long text; a listing is `fd-site-posts` with a tools bar of existing controls; key facts are `fd-kv`, findings the features list, pull quotes the quote section.
- **No scroll-driven motion**: no entrance on scroll, no parallax. What moves is what Fire's components already move, the logo strip (which has a pause button) and the header's scrolled state.
- **A new section** has a docs specimen at desktop width and its most changed variant again at phone width, a card of kind `section` with `surfaces` `website`, and a place in the composed page on `docs/site-sections.html`. It must pass the near-duplicate gate like any other part.
