# Building a product with Fire

This guide is for anyone, person or AI agent, who is building real screens with Fire. It covers how to add Fire to a project, how to build a screen, the rules that keep a product consistent, and what to do when Fire does not have what you need.

Read in this order: this guide, then the live docs (`npm run dev`, open `/docs/index.html`), then `DESIGN.md` when you are about to add something to the system itself.

## 1. What Fire gives you

| You need | Where it is |
|---|---|
| Every component, with markup to copy | `docs/*.html` (each specimen has a "Markup" view) |
| Full screens to start from | `templates/*.html` (app screens, sign-in split or centred, onboarding, a docs site, the shell as plain markup) |
| The list of every class and attribute | `docs/_ref/VOCABULARY.md` |
| The rules of the system | `DESIGN.md` |
| The styles and behaviour themselves | `fire/` (the only folder a product ships) |

## 2. Add Fire to a project

Fire is plain CSS and ES modules. There is no build step and no package to install.

1. Copy the `fire/` folder into the project (or add this repository as a git submodule and point at its `fire/` folder). Do not edit files inside it; see section 7 for how to change the system.
2. Load it on every page:

```html
<script src="/fire/boot.js"></script>              <!-- before first paint: restores saved theme and tweaks, applies data-fd-vars -->
<link rel="stylesheet" href="/fire/fire.css">
<script type="module" src="/fire/fire.js"></script>
```

3. Serve over HTTP. ES modules do not load from `file://`.
4. Copy `GUIDE.md`, `WRITING.md`, `AGENT-RULES.md` and `docs/_ref/VOCABULARY.md` into the project too (for example into `fire-docs/`), so that people and agents working there can read the rules and look up class names without opening this repository.

**With a framework (React, Vue, Svelte, server templates).** Fire is class names and data attributes, so it works in any of them. Render the same markup the docs show. Two things to know:

- Behaviour attaches through `data-fd-*` attributes with listeners on `document`, so most components work on markup inserted later. After rendering new markup that contains icons, charts, textures or sliders, call `init(root)`:

```js
import { init } from '/fire/fire.js';
init(containerElement);   // safe to call more than once
```

- **Rendering on a server.** Copy the shell from `templates/shell-static.html`: it is the whole shell as plain markup, with no `shell.js`. Per page the server changes the title, which nav item is current, the hero and the bands. A page that should carry little script can render icons as inline SVG (the paths are `ICONS` in `fire/js/icons.js`) and load single modules, for example only `fire/js/shell.js` for the sidebar and the phone menu; each module works on its own.
- **Strict Content Security Policy.** The stylesheets need `style-src 'self'` and `font-src 'self'`; the frame's marks are `data:` images, so allow `img-src 'self' data:`. No Fire script writes a `style` attribute (skeletons, the file-upload list, chat, charts, agent blocks, the shell and Tweaks included), so `style-src 'unsafe-inline'` is not needed. Markup and scripts pass custom properties as `data-fd-vars="--fd-i:2;--value:0.4"`; Fire sets them with `setProperty` and removes the attribute. Only names that start with `--` are accepted, so the attribute cannot set a real property. `fire/boot.js` applies them while the page is parsed, so the first paint is already right; without it the modules apply them a frame later, and with no script at all they are not applied, so a page that must work without script should not depend on one.

- To change an icon after the page has drawn, call `setIcon(el, 'pause')` (exported from `fire/fire.js`) or set `data-icon` on the drawn icon.
- Components report changes with bubbling events: `fd:change` (`detail.value`), `fd:select`, `fd:open`, `fd:close`, `fd:submit`, `fd:copy`. Listen for these to update your own state; write state back through the same attributes the docs show (`aria-selected`, `aria-pressed`, `data-state`, `hidden`).

## 3. Build a screen

1. **Start from the nearest template.** Open `templates/index.html`, pick the screen closest to what you need, and copy it. `templates/blank.html` is the empty app screen. A single task outside the app (sign in, a second step, consent, a result) is a centred screen: start from `templates/auth-centered.html`.
2. **Keep the shell, replace the content.** `templates/shell.js` builds the sidebar, top bar, menus and command palette for the demo product. Copy it into your project and change its navigation, account and labels to your own. The page itself is:

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

## 4. Rules for product code

These keep a product looking like one product. They apply to people and to AI agents equally.

1. **Only Fire classes.** Every class in your markup starts with `fd-` and exists in `VOCABULARY.md`. No page-specific stylesheets and no `<style>` blocks.
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
| Things side by side | `fd-row` (`data-wrap`, `data-justify="between|end|center"`, `data-align="start|end|baseline|stretch"`); `fd-grow` on the child that takes the leftover space |
| A field with a button beside it (search, filter) | `fd-row` with `data-align="end"`, so the button lines up with the input and not with the label |
| Equal columns that fill the width | `fd-grid` with `data-min="md"` (narrowest column) and `data-cols="3"` (most columns) |
| One child across several columns | `data-span="2"` (or `full`) on the child |
| A narrow block on a wide page | `fd-column` (`data-size="xs|sm|md|lg|xl"`, `data-align="center"`) |
| Space between children | `data-gap="3"` on the parent (space steps 0 to 24) |
| A form | `fd-form` or `fd-form-cols`: they stop at a readable width by themselves (`data-size="sm|lg|full"`). Fields fill the form or one column |
| A short control | `data-fit` on the input, input group or select; it sizes to its content (the input's `size` attribute) |
| A setting with a control | `fd-setting`: text, control, and anything else underneath at full width |
| Table column widths | `data-col="fit|sm|md|lg|fill"` on the header cell |
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

## 6. Theming and checks

**Theme and character.** Everything visual is a variable.

- `data-theme="light|dark"` on `<html>` or any subtree; omit it to follow the system.
- `data-palette="volt"` (fifteen palettes; see `docs/tweaks.html`) recolours neutrals and accent together. A brand palette is one CSS block that sets about twenty variables; the page shows how.
- `data-type="editorial"` (twelve type sets, all open source) changes the heading, interface and mono faces together.
- `data-density="compact|spacious"`, `data-contrast="high"`, `data-text-size="sm|lg"`.
- **Your product's look is the default.** Declare it on `<html>` (`<html data-palette="graphite" data-type="editorial">`). The Tweaks panel and `fire/boot.js` treat the page's own palette and type set as the default: the page keeps them on load, Reset returns to them, and only what someone changes away from them is saved and restored on the next page. A product on Ember and Geist declares nothing. (`boot.js` notes the declared values in `data-fd-default-palette` / `data-fd-default-type` before it puts a saved look back; do not write those yourself.)
- **Contrast is built in.** Every text step that carries information reaches 4.5:1 in every palette, light and dark, and the label on the accent and on status fills does too. Use `fd-muted` / `--fd-text-3` or stronger for anything someone reads; `--fd-text-4` is for placeholders and disabled text only. Make quiet things quiet with size, weight and case, not a fainter colour.
- **Translated pages.** Fire's scripts write a few interface labels themselves (show and hide on a secret field, the sidebar and phone menu buttons, Copied, calendar months). Translate them with `data-label-<key>` on the component or any ancestor, or one dictionary for the page: `<script type="application/json" data-fd-labels>{"menu.open": "Menü öffnen"}</script>`. The keys are listed on `docs/writing.html`.
- The Tweaks panel lets you try palettes, tone, typefaces, density, corners and motion on your real screens. Any `[data-fd-tweaks-open]` button opens it. Use "Copy CSS" to keep a look you like, then paste it after `fire.css`. Remove the trigger before shipping if end users should not have it.

**Checks before you call a screen done.**

- Light and dark, at 1440px and 375px wide. Nothing overflows at 320px.
- Keyboard only: every control reachable and operable, focus always visible.
- Every state present: empty, loading, error, disabled.
- In the Fire repository, `npm run audit` must report no errors and no `literals` or `inline` findings. Copy `scripts/audit.mjs` into a project to run the same checks on its pages.

## 7. When Fire does not have what you need

This will happen. How you handle it decides whether the product stays consistent, so follow the steps in order.

**Step 1: look again.** Search `VOCABULARY.md` and the docs for the thing by what it does, not by what you would call it. Most "missing" components exist under another name (a "pill" is a badge, a "drawer" is a sheet, a "wizard" is steps).

**Step 2: compose.** Most new things are arrangements of existing components: a card with a table inside it, a setting row with a secret field. Build it from parts with the layout primitives. This needs no request.

**Step 3: decide whether it is a gap.** It is a gap in the system, and worth a request, when any of these is true:

- You wanted to write a custom class, a `<style>` block, a pixel value or a width to make it work.
- An existing component needs a variant, size, tone or state it does not have.
- A token is missing (a colour, a size, a duration) and you reached for a raw value.
- You have built the same arrangement for the second time. It should become a named pattern.
- A component cannot be operated by keyboard or reads wrongly to a screen reader in your case.
- The same need will plainly come up on other screens or in other products.

**Step 4: file a request, then continue.** Do not stop the product work, and do not quietly build a one-off.

File an issue in the Fire repository using the "Component or extension request" template (`.github/ISSUE_TEMPLATE/component-request.md`). If you cannot reach the repository, add the same fields as a new entry at the top of `REQUESTS.md` in your project and tell the project owner. A request contains:

| Field | What to write |
|---|---|
| Kind | New component · new variant, size or state · new token · new pattern (arrangement) · bug or accessibility fix |
| What you were building | The screen and the user's task, in two sentences |
| What is missing | The thing, named by what it does |
| What you tried | Which existing components you looked at and why they do not fit |
| Proposed shape | Markup sketch using Fire's naming (`fd-<block>`, `data-variant`, …), the variants and states it needs, how it behaves on a phone and by keyboard |
| Where else it applies | Other screens or products that would use it |
| Stopgap in use | What you did in the meantime (see below), with file and line |
| Evidence | A screenshot or a link to the screen |

**Step 5: use a stopgap that is easy to remove.** Until the request is answered:

- Prefer the closest existing component, even if it is not perfect.
- If you must write styles, put them in one file named `fire-local.css`, loaded after `fire.css`. Use the prefix `x-` for classes (never `fd-`), use only Fire tokens for every value, and put the request's link in a comment above each rule.
- Never edit files inside `fire/`, and never copy a Fire component and modify the copy.

**Step 6: when the request ships,** update `fire/`, replace the stopgap with the real component, and delete its rules from `fire-local.css`. An empty `fire-local.css` is the goal.

**For whoever maintains Fire.** A request is accepted when the need is real on more than one screen and cannot be met by composition. The new part follows `DESIGN.md` exactly: tokens only, the naming rules, every state, light and dark, phone and desktop, keyboard operation, a docs section with live specimens, an entry in `VOCABULARY.md`, and a clean `npm run audit`.

## 8. Instructions for an AI agent working in a project

The rules an agent follows are in [AGENT-RULES.md](AGENT-RULES.md). They are kept in one file, in Fire, so that updating Fire updates the rules and the project's own instruction file never has to change.

Copy `AGENT-RULES.md` into the project beside this guide, then put this pointer in the project's agent instructions (`AGENTS.md`, `CLAUDE.md`) and adjust the three paths:

```markdown
## Interface: the Fire design system

- For any interface work, read and follow `docs/fire/AGENT-RULES.md` first. It names the other files to read.
- Fire is in `public/fire`. Never edit it.
- Gaps in Fire go in `docs/fire/REQUESTS.md`. Stopgap styles go in `fire-local.css`.
```

Keep the project's instruction file for what only the project knows: its layouts, its helpers, its security policy. Do not copy Fire's rules into it; a copy goes stale the next time Fire changes.
