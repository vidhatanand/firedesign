# Changes

What changed in each release, and what a product using Fire needs to do. Newest first. A product records the tag it vendors (for example in `docs/fire/REQUESTS.md`) and reads every entry after it before refreshing.

## 0.8.0 — unreleased

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
