# Building a product with Fire

This guide is for anyone, person or AI agent, who is building real screens with Fire. It covers how to add Fire to a project, how to build a screen, the rules that keep a product consistent, and what to do when Fire does not have what you need.

Read in this order: this guide, then the live docs (`npm run dev`, open `/docs/index.html`), then `DESIGN.md` when you are about to add something to the system itself.

## 1. What Fire gives you

| You need | Where it is |
|---|---|
| Every component, with markup to copy | `docs/*.html` (each specimen has a "Markup" view) |
| Full screens to start from | `templates/*.html` (42: app screens, decisions, settings, audit, status pages, sign-in split or centred, onboarding, ten website pages, a docs site, the shell as plain markup) |
| The part for a job | `npx fire find "<what you need>"` (section 8), the Catalogue page (`docs/catalogue.html`, with a picture of each part), or `contract/catalog.json` and `contract/index.json` |
| The list of every class and attribute | `docs/_ref/CLASSES.md` (generated, complete); `docs/_ref/VOCABULARY.md` explains the common ones |
| The rules of the system | `DESIGN.md` |
| The styles and behaviour themselves | `fire/` (the only folder a product ships) |

## 2. Add Fire to a project

Fire is plain CSS and ES modules. There is no build step and no package to install.

1. Copy the `fire/` folder into the project (or add this repository as a git submodule and point at its `fire/` folder). Do not edit files inside it; see section 7 for how to change the system.
2. Load it on every page:

```html
<link rel="stylesheet" href="/fire/fire.css">
<script src="/fire/boot.js"></script>              <!-- after the stylesheets, before first paint: restores saved theme and tweaks, applies data-fd-vars -->
<script type="module" src="/fire/fire.js"></script>
```

   Keep `boot.js` in `<head>`, after every stylesheet link (your own too). A classic script waits for the stylesheets before it, so the body is not parsed, and cannot be styled, without them. Before them, Chromium can style the page too early when you move between pages in a tab, and buttons fade in from link blue. A page without `boot.js` needs another classic script there, with no `async` or `defer`; a module script does not wait.
3. Serve over HTTP. ES modules do not load from `file://`.
4. Copy `GUIDE.md`, `WRITING.md`, `AGENT-RULES.md`, `docs/_ref/VOCABULARY.md` and `docs/_ref/CLASSES.md` into the project too (for example into `fire-docs/`), so that people and agents working there can read the rules and look up class names without opening this repository.

**With a framework.** Fire's markup is the same in every framework; what changes is how a framework writes some attributes, owns some elements, and hears Fire's events. Start from a starter, which is already wired and proven to render exactly like Fire's own templates:

| Framework | Starter | Package entry |
|---|---|---|
| Lit (the default for a new app) | `starters/lit-vite` | `fire-design/elements` |
| React and Next.js | `starters/next` | `fire-design/react`: `FireIcon`, `FireChart`, `FireCode`, `FireTexture`, `useFire`, `useFireEvent`, `loadFire` and the exporter's helpers `jsonForScript`, `ccAttr`, `ccText`, `ccTruthy` (`spec/EXPORT.md` section 0) |
| Vue | `starters/vue-vite` | `fire-design/vue`: the plugin (default export, `Fire`), the `v-fire` directive (`fireDirective`), `fireRouter()`, `fireVueOptions()` for `vite.config` and `isFireElement()` |

Depend on Fire by tag (`"fire-design": "github:vidhatanand/firedesign#v0.12.4"`). `spec/EXPORT.md` lists every rule for writing Fire markup in each framework (presence attributes, `<template>` and JSON data, icons, events, when to call `init`, server rendering and hydration, strict CSP); follow it, or let an exporter that implements it write the code. Fire's custom elements (`fd-icon`, `fd-chart`, `fd-code`, `fd-texture`) exist for the four components that build their own DOM; each element is its component's root, so Fire's CSS applies unchanged. Without a framework, everything below still applies:

**The Lit starter is the place to start an app.** Add a screen as a route in `src/routes.ts` with
`load: () => import(…)` and import it nowhere else, so the build gives it its own file. Write links to app pages with
`href()`. Replace `src/lib/session.ts` with your sign-in and permissions; guards read it. The starter's README lists
what your host must do: answer every app path with `index.html`, cache the hashed files as immutable, never cache
`index.html`, send the content-security policy as a header, and compress.

**Production builds are trimmed.** `npx fire slim src index.html --out .fire-slim --theme theme.json` reads your source
and writes a Fire with only the stylesheets, behaviour modules, palette and fonts it uses, with a report of what was
kept and why. Point the production build at that folder (the starters do it with one alias) and keep the whole of
Fire in development. A class name built from a string at run time cannot be seen: `fire slim --report` lists them, and
`--include` keeps what they make. `fire slim --check` fails in CI when the output is stale, and `--verify <build>` fails
when a build still carries something the report dropped. See `docs/frameworks.html#slim` for measured sizes.

- Behaviour attaches through `data-fd-*` attributes with listeners on `document`, so most components work on markup inserted later. After rendering new markup that contains icons, charts, textures or sliders, call `init(root)`:

```js
import { init } from '/fire/fire.js';
init(containerElement);   // safe to call more than once
```

- **Rendering on a server.** Copy the shell from `templates/shell-static.html`: it is the whole shell as plain markup, with no `shell.js`. Per page the server changes the title, which nav item is current, the hero and the bands. A page that should carry little script can render icons as inline SVG (the paths are `ICONS` in `fire/js/icons.js`) and load single modules, for example only `fire/js/shell.js` for the sidebar and the phone menu; each module works on its own.
- **Modules with no DOM** run in Node and on a server, and have their own package entries: `fire-design/theme` (`expandTheme`, `themeToCss`, `paletteFrom`, `validateTheme`: section 6), `fire-design/email` (`renderEmail()`, HTML and text in the product's look: `docs/email.html`), `fire-design/initial` (`initialMark()` and the other first-letter helpers), `fire-design/looks` (`LOOKS` and `getLook()`: the eight named looks as theme records) and `fire-design/fonts` (the font catalogue, as JSON). `fire-design/contract`, `/catalog` and `/index` are the token contract, the catalogue and the search index as JSON.
- **Strict Content Security Policy.** The stylesheets need `style-src 'self'` and `font-src 'self'`; the frame's marks are `data:` images, so allow `img-src 'self' data:`. No Fire script writes a `style` attribute (skeletons, the file-upload list, chat, charts, agent blocks, the shell and Tweaks included), so `style-src 'unsafe-inline'` is not needed. Markup and scripts pass custom properties as `data-fd-vars="--fd-i:2;--value:0.4"`; Fire sets them with `setProperty` and removes the attribute. Only names that start with `--` are accepted, so the attribute cannot set a real property. `fire/boot.js` applies them while the page is parsed, so the first paint is already right; without it the modules apply them a frame later, and with no script at all they are not applied, so a page that must work without script should not depend on one.

- **Page transitions** are off until a page asks. On a multi-page site, do three things: link `fire/transitions.css` after `fire.css` (`fire-design/transitions.css` in a package), put `data-fd-transition="fade"` on `<html>` (or `slide`, a phone drill-down), and mark the module scripts that build the page `blocking="render"`, because Chromium drops the transition when a page paints before its scripts have run. The sidebar, top bar, tab bar and site header then hold still and only the page changes. In a single-page app call `transition(() => render(route))` instead and skip all three steps. A browser without View Transitions, a visitor who asks for reduced motion and the motion dial at "none" all navigate as usual. Firefox has no cross-document transitions, and Safari is not verified (`docs/transitions.html`).

- To change an icon after the page has drawn, call `setIcon(el, 'pause')` (exported from `fire/fire.js`) or set `data-icon` on the drawn icon.
- Components report changes with bubbling events: `fd:change` (`detail.value`), `fd:select`, `fd:open`, `fd:close`, `fd:submit`, `fd:copy`, and `fd:filter`, `fd:commit`, `fd:hold` and `fd:undo` where those parts are used (the others are in `contract/catalog.json`). Listen for these to update your own state; write state back through the same attributes the docs show (`aria-selected`, `aria-pressed`, `data-state`, `hidden`).

## 3. Build a screen

**Plan the app first.** Before the first screen, map every screen to a template (a list is `logs.html`, a form is `form.html`, one record is `record.html`, settings is `settings.html`), and fix one page head, one form pattern and one way to show a list for the whole app. Write the plan where everyone building reads it. Valid parts composed without a plan give three page heads and forms squeezed into grids; nothing in a lint can put that right afterwards.

1. **Read the nearest template, then build fresh.** Open `templates/index.html` and read the screen closest to what you need: its regions, its page head, its states. Then write your screen in that structure, each component from its own markup in the docs. A template is a reference to read, never a file to copy and edit. `templates/blank.html` is the empty app screen. A single task outside the app (sign in, a second step, consent, a result) is a centred screen: follow `templates/auth-centered.html`. Fire has templates for the screens products repeat: decisions and a single decision case, answering from an email link without signing in, a record hub (one team on one page), settings, an audit log, a status page and its admin, and a shared proof page. A public site follows `templates/site-home.html`, `site-pricing.html`, `site-customers.html`, `site-changelog.html` or one of the six for publishing (section 5, "A public website"). Each template that has states (39 of the 42) opens every one of them (loading, empty, error, no access, and its own) from its Demo state band, from `?state=` in the address, or with the control its card names, so you can see each one before you build yours; its card in `contract/cards/templates/` lists them. The three starters open the overview and logs states the same way. Ask `npx fire find` before you build a screen of your own: it may already be one of these.
2. **Take the shell once.** The shell is the one part you take as it is, not a screen: `templates/shell.js` builds the sidebar, top bar, menus and command palette for the demo product (each starter has its own). Copy it into your project once and change its navigation, account and labels to your own. The page itself is:

```html
<body data-shell data-active="logs">
<main class="fd-page">
  <div class="fd-frame">
    <section class="fd-band fd-page-hero"> … title and one-line description … </section>
    <section class="fd-band"> … content … </section>
  </div>
</main>
</body>
```

3. **Fill each band with components from the docs.** Find the component in `docs/`, open its "Markup" view, paste, and change the content. Do not retype components from memory.
4. **Add every state.** A screen is not finished with only the happy path: add the empty state, the loading state (skeletons), the error state and disabled states. The templates show each one.
5. **Check it** (section 6).

### On a phone

Three to five main destinations go in a tab bar at the bottom of the screen: `fd-tabbar` as a direct child of `fd-app`, with an `fd-tabbar-item` per destination (an icon and an `fd-tabbar-label`, `aria-current="page"` on the current one). If there are more, make the last item a "More" button with `data-fd-mobile-nav` and `aria-controls` pointing at the menu sheet, and the sheet opens from the bar. The bar shows only below 640px. While it shows, the page and the floating parts (support button, chat, toasts, the keys hint) leave room for it through `--fd-tabbar-space`; do not add padding of your own. Copy the markup from `docs/shell.html#tabbar`; the three starters have it.

### Say where a page is used

Every part belongs to one or more surfaces: app, website, phone or email (the `surfaces` of its card). Put `data-fd-surface="app|website|phone|email"` on `<html>`, or on one element for a part of a page, and the markup lint warns (`surface-mismatch`) when a part does not suit it, naming the part the card suggests instead. A phone page accepts app parts. A value other than those four is an error. `--surface <name>` sets the surface for files that declare none, and `--no-surface` turns the rule off. A warning is advice, not an error: the exit code does not change. Declare it on every page you write; the templates and starters do.

## 4. Rules for product code

These keep a product looking like one product. They apply to people and to AI agents equally.

1. **Only Fire classes.** Every class in your markup starts with `fd-` and exists in `CLASSES.md`. No page-specific stylesheets and no `<style>` blocks.
2. **No pixel values in markup, and no `style` attributes.** Pass a token to a component parameter (`data-fd-vars="--fd-panel-w: var(--fd-size-xl)"`), a relative value (`72%`) or a unitless number (`--value: 0.62`) with `data-fd-vars`, never with `style`. Custom properties are set from JS with `setProperty`, so pages work under a strict Content Security Policy. Nothing else.
3. **Structure decides width.** Never set a width or a height on an element. Place things with a stack, a row, a grid or a column (section 5), and let components bring their own sizes.
4. **Variants are attributes.** Use `data-variant`, `data-size`, `data-tone` and `data-state` as the docs show. Do not override a component's look from outside.
5. **State is native or ARIA.** `disabled`, `aria-current="page"`, `aria-selected`, `aria-expanded`, `aria-busy`, `aria-invalid`, `hidden`. The styles read these; do not add state classes.
6. **One accent, used sparingly.** The primary button, the active nav item, links, focus, switches that are on, the lead chart series. One primary button per view.
7. **Icons** are `<i data-icon="name"></i>` with a Lucide name that exists in `fire/js/icons.js`. Never emoji.
8. **Words.** Follow [WRITING.md](WRITING.md). In short: write only what the layout does not already say, one job per element, inside the word budgets. Sentence case. Buttons are verb plus object ("Create key"). Empty states say what will appear and offer the action. Errors say what happened and what to change. Identifiers, keys, paths and units are mono.

## 5. Layout

| To do this | Use |
|---|---|
| Things one above another | `fd-stack` |
| Things side by side | `fd-row` (`data-wrap`, `data-justify="between\|end\|center"`, `data-align="start\|end\|baseline\|stretch"`); `fd-grow` on the child that takes the leftover space |
| A field with a button beside it (search, filter) | `fd-row` with `data-align="end"`, so the button lines up with the input and not with the label |
| Equal columns that fill the width | `fd-grid` with `data-min="md"` (narrowest column) and `data-cols="3"` (most columns) |
| One child across several columns | `data-span="2"` (or `full`) on the child |
| A narrow block on a wide page | `fd-column` (`data-size="xs\|sm\|md\|lg\|xl"`, `data-align="center"`) |
| Space between children | `data-gap="3"` on the parent (space steps 0 to 24) |
| A form | `fd-form` or `fd-form-cols`: they stop at a readable width by themselves (`data-size="sm\|lg\|full"`). Fields fill the form or one column |
| A short control | `data-fit` on the input, input group or select; it sizes to its content (the input's `size` attribute) |
| A setting with a control | `fd-setting`: text, control, and anything else underneath at full width |
| Table column widths | `data-col="fit\|sm\|md\|lg\|fill"` on the header cell |
| A main area with a side panel | `fd-split` |

Grids, stacks and rows nest freely. If you are about to write a width, you are missing one of the rows above.

### Forms

**Choose the control from the kind of value, never from how the server stores it.** A person should never type something they could pick, and should never see JSON, `0` or `1`, or a list of allowed words in a hint.

| The value is | Use | Never |
|---|---|---|
| Yes or no | `fd-switch` (takes effect at once) or `fd-checkbox` (saved with the form) | A text box holding `0` or `1`, `on` or `off` |
| One of 2 to 4 options | `fd-segmented` (in a form, each item is a label around a native radio, so it posts) or `fd-radio` | A text box with the options listed in its hint |
| One of many options | `fd-select`, or `fd-combobox` when the list is long | The same |
| Several of a fixed set | An `fd-checkbox` group or `fd-choice` cards | A comma-separated text box |
| A number with a unit | `fd-number`, or an `fd-input-group` with the unit as an affix | A bare text box with the unit only in the label |
| A list of free values (URLs, domains, emails) | `fd-tag-input` | A JSON array, or a comma-separated text box |
| Names with values (scopes, headers, labels) | `fd-pairs` | A JSON object |
| A secret | `fd-secret`; to type a new one, `fd-secret` with `data-mode="entry"` | A plain text input |
| One date | `fd-datefield`: typed or picked from a calendar; it posts `YYYY-MM-DD`; `data-min-date` and `data-max-date` | `<input type="date">`, or a text box with the format in the hint |
| A reporting period, with what to compare it with | `fd-period` (a filter trigger) opening an `fd-daterange` with `fd-daterange-compare` | Two date fields and a checkbox |
| A colour (a brand or a series) | `fd-color`: a picker and a hex box, with its contrast on the page; `fd-swatch` to show one | A bare text box for a hex code |
| A destructive action | Its own page or section with `fd-confirm-inline`: the person types the name before the red button works | A dialog that holds a form, or a button that deletes at once |
| A control that is off | `fd-reason` around it: the control is `aria-disabled="true"` and a line says why and who can turn it on | A disabled control with no word of explanation |
| One-time codes shown once (recovery codes) | `fd-codes`, with Copy all and Download | A text area, or a list the person screenshots |
| Raw configuration, for experts only | `fd-codefield` with `data-fd-json` | An ordinary text area |

A checkbox group posts one field per ticked box under the same name (`methods=email&methods=passkey`). If your server rejects repeated names, give each box its own name (`methods.email`, `methods.passkey`).

All of these post in a plain form. `fd-tag-input`, `fd-pairs` and `fd-codefield` each wrap one named text area: without script the text area is the field (one value per line, or `name = value` per line), and with `fire/js/forms.js` it becomes the full control and posts the same shape, or JSON with `data-format="json"`. So a server that stores a list or a map as JSON does not need to show JSON to anyone.

**A long create or edit form** is a column of `fd-form-section`s inside `<form class="fd-form" data-size="full">`: each section has a title and one line on the left and its fields on a white surface on the right. Start from `templates/form.html`. Do not lay a long form out as a full-width two-column grid of fields on the bare page: fields become too wide to read and nothing groups them.

**Heading levels.** Each level is one step, so two levels never look the same:

| Level | Class |
|---|---|
| The page | The hero's `fd-display` |
| A section of the page | `fd-h2`, or `fd-form-section-title` in a form |
| A card | `fd-title` inside `fd-card-heading` |
| A setting or a field | `fd-setting-title` (it steps down to label size by itself inside a card or a form section) and `fd-field-label` |

Never give a card title `fd-h3` and put `fd-setting` rows inside it at their page size: that is two headings of one size. Inside a card the setting rows are already the smaller size.

**A value shown in a field's shape** (a sample in a preview, something read-only) is `<span class="fd-input">…</span>`; it lines up with real inputs.

**Decisions.** When a person decides what a system or an agent may do, use the decisions family (`docs/decisions.html`) and not a dialog with two buttons. Show the brief (`fd-decision`: what changes, who it touches, the evidence, who signs), keep the reason as the person's own words (`fd-draft` offers an agent's draft, which stays the agent's until the person uses it), and name each button for its effect (`fd-commit`). A commit that can be taken back waits a few seconds with Undo (`data-fd-hold`, or `data-fd-hold-in="toast"` so the page can move on). `fd-queue` works through what waits, `fd-preview` shows what a change will touch before it is committed, and `fd-states` gives a screen one state at a time: loading, ready, empty, error, no access. Start from `templates/decisions.html` or `templates/decision-case.html`.

### Lists and tables

A toolbar above a list is `fd-toolbar`: a search, the filters, an end group. It wraps by itself, and on a phone the filters become one row that scrolls sideways. For up to three fields people change all the time, use `fd-filter` chips. For more, use `fd-filters`: one Filter button, a menu that searches fields and values together, and a chip for each filter that is set. Give it `data-fd-for="#table"` and it hides the rows itself (each row carries `data-<field>`); add `data-fd-url` to keep the set in the address; listen for `fd:filter` when the page filters its own data. Start from `templates/audit.html` (`docs/data.html#combined`).

### A public website

A site is not an app screen with a wide column. Wrap the page in `fd-site` (a size container: every section measures it, not the viewport) and build it from sections: `fd-site-header`, then any of `fd-site-hero`, `-logos`, `-features`, `-split`, `-stats`, `-steps`, `-quote`, `-pricing`, `-compare`, `-faq`, `-cta`, `-posts` and `-article`, then `fd-site-footer`. Each is a `section.fd-site-section` with one `fd-site-container` and one `fd-site-head` (eyebrow, title, lead, one or two buttons), and its `data-layout` picks a structure. Start from the nearest template (`templates/site-*.html`: home, pricing, customers and changelog, and for publishing blog, post, resources, report, research and newsletter; `templates/site-shell.js` writes the shared header and footer) and copy a section from `docs/site-sections.html`.

- **Foundation** (`docs/site.html`): four named breakpoints (phone below 640px, tablet to 899px, desktop from 900px, wide from 1200px); fluid type (`fd-site-display` for the hero, then `-title`, `-heading` and `-lead`); `data-rhythm="tight|loose"` and `data-rule` for the space between sections; and `data-ground="page|sunken|raised|inverse|accent|texture|image"`. Two neighbours on the same ground share one rhythm.
- **Compose, do not decorate.** Fire ships no block library, and a section variant differs in structure, never in skin. Vary a site by its look (palette, type set, signature texture, dials, the eight named looks) and by which sections you choose and in what order. If two sites must differ, change the look and the composition; do not ask for, or write, a variant that only changes how a section is painted.
- **Everything inside a section is an ordinary Fire component:** buttons, `fd-table`, `fd-accordion`, `fd-feature-list`, `fd-segmented`, a product specimen in `fd-site-shot`. Write facts with units ("842 ms median", "1,000 free credits a month"), start-align, give one thing in a section the most weight, and use the accent once at most.
- **Behaviour** is `fire/js/site.js`: the header's menu sheet below desktop, the logo strip's pause button, the pricing period switch, the compare table's plan tabs, a listing's filters and pages, the sign-up form's states, an article's rail and note links, and Copy link. Nothing animates on scroll.
- **Declare it**: `data-fd-surface="website"` on `<html>`, so the lint checks the parts you used.

- **Reading pages.** A post, a newsletter issue, a report or a paper is one `fd-site-article`, not a hero followed by prose. `plain` is one column, `aside` adds a rail for contents and key facts (a long paper), `cover` puts the head over a wide frame (a report's front page). Start from `site-post`, `site-report` or `site-research`. Fire has no part for the rest because it already has one: key facts are `fd-kv` in the head, findings are `fd-site-features` as a list, a pull quote is `fd-site-quote` marked `data-breakout`, tags are `fd-tag`, and "cite this" is `fd-copy-field`. Notes are `fd-site-notes` and references `fd-site-refs`. The text is `fd-prose` with `data-size="lg"`.
- **A public listing** (a blog, a library, releases) is `fd-site-posts` with its tools bar, not a new block: entries carry `data-kind` and `data-tags`, controls marked `data-filter` narrow them, `fd-site-posts-count` says how many, `data-page-size` pages them and `data-address` keeps the state in the address. Give it an `fd-empty` for no matches. Start from `site-blog` or `site-resources`.
- **One sign-up form.** The call to action, the footer's sign-up column and an article's foot hold the same form, with `invalid`, `busy`, `sent`, `subscribed` and `failed` states in `data-state`. Cancel its `fd:submit` to send the address yourself, then call `setSignup(form, state)`. Do not build another email form. A newsletter issue is `renderEmail()` with the `section`, `story` and `list` blocks.
- **Pictures.** The site's own art goes in `fd-site-media`: `alt`, the picture's own `width` and `height`, and `data-ratio` to crop it. A picture a visitor supplies goes in `fd-doc-frame` with `data-fd-src`, which checks its address. Put text on a picture only on the image ground (`data-ground="image"` with an `fd-site-backdrop`, for a hero or a call to action band), which keeps 4.5:1 whatever the picture; anywhere else keep the text beside the picture, not over it. The look treats the pictures: choose `imagery` (natural, mono, duotone or wash) with the look, and set `data-treatment` on one picture only when it must differ, such as a product screenshot that stays natural. The ten pictures in `templates/media/` are generated placeholders; replace them with your own.

## 6. Theming and checks

**Theme and character.** Everything visual is a variable.

- `data-theme="light|dark"` on `<html>` or any subtree; omit it to follow the system.
- `data-palette="volt"` (fifteen palettes; see `docs/tweaks.html`) recolours neutrals and accent together. A brand palette is one CSS block that sets about twenty variables; the page shows how.
- `data-type="editorial"` (twelve type sets, all open source) changes the heading, interface and mono faces together.
- `data-density="compact|spacious"`, `data-contrast="high"`, `data-text-size="sm|lg"`.
- **Four structural dials** change how a page is built, not its colours: `data-surfaces="flat|outlined"`, `data-elevation="none|lifted"`, `data-controls="outlined|filled"`, `data-headings="upper|mono"`. The first value of each is the default and needs no attribute. They work through semantic tokens, so paint your own objects, fields, secondary controls and small labels with those tokens (`DESIGN.md` section 2). A fifth, `data-imagery="natural|mono|duotone|wash"`, is not structure: it treats the pictures of a site (section 5, "A public website").
- **The signature** is one set of dials for the generated textures and frame marks: `data-signature-field`, `-mark`, `-cell`, `-ramp`, `-marks` and `-intensity` on `<html>` (`docs/signature.html`). `data-signature="own"` on one texture keeps its own options.
- **A type set** can be a name, or a spec in the theme record: families from the font catalogue (`contract/fonts.json`, 53 open-licensed families), a heading weight and tracking, heading case, tabular figures. `validateTheme()` enforces the pairing rules. To use a family Fire does not ship, run `node node_modules/fire-design/scripts/fonts.mjs add "<family>"`: it copies or downloads the files and writes the `@font-face` and a metric-matched fallback into `./fonts/fonts.css`; import that after `fire.css`.
- **The theme record** holds all of it as one JSON object: `palette`, `tone`, `type`, `dials` (corners, density, lines, text size, contrast, motion, texture, the four structural dials and imagery), `signature` and `brand`. Tweaks' "Copy theme" writes one; `fire/email/email.js` reads the same record, so an email matches the app.
- **The brand** is set once. Put `<script type="application/json" data-fd-brand>{ "name": "Quarry Labs", "mark": "/brand/mark.svg", "logo": "/brand/logo.svg", "logoDark": "/brand/logo-dark.svg", "href": "/" }</script>` on the page, or call `shell.setBrand({ name, mark, logo, logoDark, href })`, and every `fd-brand` shows it. Without a `mark`, the mark is the name's first letter as a dot-matrix initial. Put the same object in the theme record as `brand` and `tweaks.set(fromThemeRecord(record))` applies it. Pictures are the page's own addresses, https addresses or `data:` images; another host's picture needs `hosts` in `setBrand()`. `renderEmail({ brand: { name, logo } })` takes the same name and logo. A logo upload is `fd-dropzone` with `data-layout="logo"`.
- **Start from a look.** Fire ships eight named looks, each a complete theme record (`contract/looks/named`, shown on `docs/looks.html`). Open any page with `?look=operator` to try one, pick the nearest in the Tweaks panel's Looks row, tune it, then keep the result with Copy theme.
- **Your product's look is the default.** Declare it on `<html>` (`<html data-palette="graphite" data-type="editorial">`). The Tweaks panel and `fire/boot.js` treat the page's own palette and type set as the default: the page keeps them on load, Reset returns to them, and only what someone changes away from them is saved and restored on the next page. A product on Ember and Geist declares nothing. (`boot.js` notes the declared values in `data-fd-default-palette` / `data-fd-default-type` before it puts a saved look back; do not write those yourself.)
- **Contrast is built in.** Every text step that carries information reaches 4.5:1 in every palette, light and dark, and the label on the accent and on status fills does too. Use `fd-muted` / `--fd-text-3` or stronger for anything someone reads; `--fd-text-4` is for placeholders and disabled text only. Make quiet things quiet with size, weight and case, not a fainter colour.
- **Translated pages.** Fire's scripts write a few interface labels themselves (show and hide on a secret field, the sidebar and phone menu buttons, Copied, calendar months). Translate them with `data-label-<key>` on the component or any ancestor, or one dictionary for the page: `<script type="application/json" data-fd-labels>{"menu.open": "Menü öffnen"}</script>`. The keys are listed on `docs/writing.html`.
- The Tweaks panel lets you try palettes, tone, typefaces, density, corners and motion on your real screens. Any `[data-fd-tweaks-open]` button opens it. Use "Copy CSS" to keep a look you like, then paste it after `fire.css`. Remove the trigger before shipping if end users should not have it.

**Checks a project can run.** These ship in the package and read only the catalogue:

- `node node_modules/fire-design/scripts/lint-markup.mjs "src/**/*.{html,tsx,jsx,vue,ts}"` reports unknown `fd-` classes, elements and icons, `data-*` values a component does not define, `style` attributes and props, raw colours and pixel sizes in markup, icon-only buttons without a name, and `<i data-icon>` in React or Vue code. It exits 1 on any error. A part that does not suit the page's `data-fd-surface` is a warning, which does not change the exit code (section 3, "Say where a page is used"). `--json` prints `errors`, `warnings` and the findings, each with a `severity`.
- The same lint checks structure, from facts on the cards that `CLASSES.md` shows beside each part: `missing-part` (a callout without its icon), `wrong-element` (`fd-select` on the `<select>` and not on the `<label>` around it), `wrong-parent` (an `fd-form-section` that is not a child of `fd-form`; a text field inside `fd-setting-text`), `missing-attribute`, `forbidden-attribute` (`hidden` on a menu) and `missing-child` are errors; `bare-control` (a native select, table, fieldset or text field with no Fire class and no Fire wrapper) is a warning. It reports only what the file shows: it cannot see a part that a template expression or a child component adds, or the parent of a component's top element.
- `node node_modules/fire-design/scripts/lint-css.mjs src --prefix acme` (or `npx fire lint-css`) checks a product's own CSS and tokens against the token contract (section 7, "Your own CSS and tokens"). It reads `.css`, `<style>` blocks and `css` templates, and exits 1 on any error.
- `node node_modules/fire-design/scripts/render-equal.mjs --ref <reference page> --cand <your page> --cand-root ".fd-page"` proves a screen renders like its reference (a Fire template, a design board): Fire nodes, computed styles and pixels, at 1440 and 375 wide, light and dark, in Chromium, WebKit and Firefox. It needs `playwright-core`, `pixelmatch` and `pngjs`.

- `npx fire review --serve dist --spa --routes /,/logs,/settings` (or `--base <url>`; the options also live in `package.json` under `fire.review`) opens every screen in a browser at 1440 and 375, light and dark. It writes a gallery to `.fire-review/index.html`, runs the structural rules above on the rendered page, where nothing is hidden from them, and checks composition: `overflow-x`, `offscreen-control`, `one-h1`, `one-page-head`, `one-primary`, `nested-surface`, `wide-field`, `unstyled-control`, `console-error`, `failed-request` and `empty-main` are errors, `stretched-button` a warning. It exits 1 on an error. The starters run it inside `npm run check`. It needs `playwright-core`. It cannot judge hierarchy, rhythm, or whether a screen follows its template: open the gallery and look.

**Checks before you call a screen done.**

- `fire review` reports 0 errors, and you have looked at every picture in its gallery.
- Light and dark, at 1440px and 375px wide. Nothing overflows at 320px.
- Keyboard only: every control reachable and operable, focus always visible.
- Every state present: empty, loading, error, disabled.
- In the Fire repository, `npm run audit` must report no errors and no `literals` or `inline` findings. Copy `scripts/audit.mjs` into a project to run the same checks on its pages.

## 7. When Fire does not have what you need

This will happen. How you handle it decides whether the product stays consistent, so follow the steps in order.

**Step 1: search first.** Search by what the thing does, not by what you would call it: `npx fire find "<what it does>"` searches every component, pattern and template by its job and other names, and `VOCABULARY.md` explains the common ones. Read the cards and the template pages. Most "missing" components exist under another name (a "pill" is a badge, a "drawer" is a sheet, a "wizard" is steps). Templates are references to read, never starters.

**Step 2: compose or customise.** Most new things are arrangements of existing components, or an existing component with one of its variants and states: a card with a table inside it, a setting row with a secret field. Build it from parts with the layout primitives. This needs no proposal.

**Step 3: decide whether it is a gap.** It is a gap in the system when nothing is close, or when any of these is true:

- You wanted to write a custom class, a `<style>` block, a pixel value or a width to make it work.
- An existing component needs a variant, size, tone or state it does not have.
- A token is missing (a colour, a size, a duration) and you reached for a raw value.
- You have built the same arrangement for the second time. It should become a named pattern.
- A component cannot be operated by keyboard or reads wrongly to a screen reader in your case.
- The same need will plainly come up on other screens or in other products.

**Step 4: build it to Fire's standard.** When nothing is close, build the component yourself, the way Fire would (`DESIGN.md` is the standard):

- An `x-<name>` root class and `x-<name>-<part>` parts; variants and sizes as `data-*` attributes, states as ARIA states, as Fire's own components do.
- Every value from a Fire token: no raw colours or lengths, no `url()`, no `@import`.
- Every state (empty, loading, error, disabled), light and dark, phone and desktop, keyboard and screen reader.
- Its CSS in one file named `fire-local.css`, loaded after `fire.css`, with the proposal's link in a comment above its rules.
- Never style or override an `fd-` class or a `--fd-` token, never edit files inside `fire/`, and never copy a Fire component and modify the copy.

**Step 5: propose it, then continue.** Never build a one-off silently, and do not stop the product work. Record the component so Fire can adopt it. A proposal carries the component itself, and it is internal: never post one publicly, as an issue in Fire's repository or anywhere else. In Facet, `propose_component` records it, and every board that uses it marks the root with `data-proposal="<id>"`. Elsewhere, add it as a new entry at the top of `docs/fire/REQUESTS.md` in your project and tell the project owner. A proposal contains:

| Field | What to write |
|---|---|
| Kind | New component · new variant, size or state · new token · new pattern (arrangement) · bug or accessibility fix |
| What you were building | The screen and the user's task, in two sentences |
| What is missing | The thing, named by what it does |
| What you searched | The queries you ran (`fire find`, the docs, the templates), and for each near Fire entry one sentence on why it does not fit |
| The component | A card in Fire's format (`contract/cards/README.md`), the markup and the CSS, with `x-` names |
| Where else it applies | Other screens or products that would use it |
| Where it is used | File and line of each use |
| Evidence | A screenshot or a link to the screen |

**Step 6: when Fire answers.** A proposal is sent, then adopted or declined. Adopted, it ships as an `fd-` component in a release: update `fire/`, replace the `x-` component with Fire's, and delete its rules from `fire-local.css`. Declined, the answer says why: follow it (often: compose these parts instead), or keep the component as your own. An empty `fire-local.css` is the goal.

**Your own CSS and tokens.** Fire is constrained at the edge, not closed. A product may add its own tokens and rules under these limits, and `lint-css` enforces them:

- Your custom properties start with your own prefix (`--acme-`), declared with `--prefix acme` or `"fire": { "prefix": "acme" }` in `package.json`. `--fd-` is Fire's: do not define a name that starts with it. Setting a Fire token that is not a palette colour, a font or a dial (a scale or derived token) is a warning: change the look through a theme record instead.
- A token of yours that repeats a Fire token (the same colour, length, duration, easing, font, weight or z-index) is an error: use Fire's. An alias that carries a role Fire lacks and is re-defined (per scope or per colour scheme) is fine.
- Write a colour only inside a token definition, take sizes and durations from tokens, and never restyle an `fd-` class beyond where it sits: ask for a variant, or style a class of your own (`x-`) on a wrapper.
- Run `npx fire lint-css src --prefix acme`. Errors fail; warnings print. Fire's own stylesheets are checked by `npm run audit`, not by this.

**For whoever maintains Fire.** Every proposal gets an answer: adopted as an `fd-` component in a release, or declined with a reason. One is adopted when the need is real on more than one screen and cannot be met by composition. The new part follows `DESIGN.md` exactly: tokens only, the naming rules, every state, light and dark, phone and desktop, keyboard operation, a docs section with live specimens, an entry in `VOCABULARY.md`, and a clean `npm run audit`.

## 8. Instructions for an AI agent working in a project

The rules an agent follows are in [AGENT-RULES.md](AGENT-RULES.md). They are kept in one file, in Fire, so that updating Fire updates the rules and the project's own instruction file never has to change.

**Search before you compose.** Run `npx fire find "<what you need>"` (or `node node_modules/fire-design/scripts/find.mjs "<what you need>"`). It ranks Fire's components, patterns, templates and modules by what each is for, using the job and other names on every card, and prints the one to open. Narrow it with `--surface app|website|phone|email`, `--data record|list|series|form|text` and `--kind component|pattern|section|template|module` (a layout counts as a component); `--json` is for scripts. Each result lists its surfaces, and with `--surface` a line says when a clearly better match belongs to another surface. `--json` also gives each result's `picture`: the path of a PNG in `contract/pictures/` (modules have none), which an agent can open to see the part before it chooses. Only when nothing fits, go to step 1 of section 7. To add a part to Fire itself, it must pass the near-duplicate gate (`node scripts/gate.mjs --probe <page>`) or its card must declare a `relation` to the part it resembles.

Copy `AGENT-RULES.md` into the project beside this guide, then put this pointer in the project's agent instructions (`AGENTS.md`, `CLAUDE.md`) and adjust the three paths:

```markdown
## Interface: the Fire design system

- For any interface work, read and follow `docs/fire/AGENT-RULES.md` first. It names the other files to read.
- Fire is in `public/fire`. Never edit it.
- When Fire has nothing close, build to Fire's standard with `x-` classes in `fire-local.css`, and propose it in `docs/fire/REQUESTS.md`.
```

Keep the project's instruction file for what only the project knows: its layouts, its helpers, its security policy. Do not copy Fire's rules into it; a copy goes stale the next time Fire changes.
