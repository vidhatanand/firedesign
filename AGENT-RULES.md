# Rules for an AI agent building with Fire

These are the rules an AI agent follows when it builds or changes an interface in a product that uses Fire. They live in Fire, not in the product, so that updating Fire updates the rules.

**For the product's owner.** Where Fire is installed as a package, this file is at `node_modules/fire-design/AGENT-RULES.md` with everything it names beside it. Where Fire is copied in, copy this file into the project beside `GUIDE.md`, `WRITING.md`, `VOCABULARY.md` and `CLASSES.md`. Then put this pointer in the project's agent instructions (`AGENTS.md`, `CLAUDE.md`). Adjust the paths once; after that the pointer never needs to change. The last line is your permission for agents to file public issues: leave out "Agents may file these" and an agent shows you the proposal instead.

```markdown
## Interface: the Fire design system

- For any interface work, use the `fire` skill if you have it; otherwise read and follow `docs/fire/AGENT-RULES.md` first. It names the other files to read.
- Fire is in `public/fire`. Never edit it.
- Every screen follows a Fire reference screen. Say which one before you build.
- When Fire has nothing close, build to Fire's standard with `x-` classes in `fire-local.css`, and file it as an issue on Fire's repository with `fire propose`. Agents may file these; nothing about this product goes in one.
```

Anything the project's own instructions say more specifically (its layouts, its helpers, its security policy) wins over this file.

## 1. Read before you write

| Before you | Read, in the folder this file is in |
|---|---|
| Build or change any screen | `GUIDE.md` |
| Write any text that appears on a screen | `WRITING.md` |
| Use a class or an attribute | `CLASSES.md`, the complete generated list (if it is not listed there, it does not exist). For each component it says which parts are required, which element a class goes on, where a part may sit, and gives a `Write:` line to copy. `VOCABULARY.md` explains the common ones |
| Build any screen | The list of reference screens, `skills/fire/screens.md` in the Fire package, from top to bottom. Choose the nearest by the person's task and the shape of the data, not by its name; open its picture (`contract/pictures/template/<id>.png`), then read `templates/<id>.html`. Say which screen yours follows before you build it |
| Pick a component or pattern | Run `npx fire find "<what you need>"` first (or `node node_modules/fire-design/scripts/find.mjs "<what you need>"`; `--surface`, `--data` and `--kind` narrow it). It searches the cards by job and other names. Search with `--surface` set to where the page is used. Then read the chosen entry's `useWhen` and `avoidWhen` in `contract/catalog.json` and open its `example`; `--json` gives the path of its picture, which you can open |
| Build a public website | `GUIDE.md` section 5, "A public website", then `docs/site.html` and `docs/site-sections.html` (articles, listings, sign-up and pictures are there too) |
| Add your own CSS or tokens | `GUIDE.md` section 7, "Your own CSS and tokens" |
| Write Fire markup in Lit, React, Next.js or Vue | `spec/EXPORT.md` in the Fire package, and the matching starter in `starters/` |
| Add to Fire itself | `DESIGN.md`, in the Fire repository |

Copy each component's markup from the Fire docs pages. Do not write components from memory. Run `fire find` before you compose a pattern or a screen: Fire may already have it, under another name.

### Plan the app before the first screen

Valid parts do not make a coherent app. Decide these once, write them where everyone building the app reads them (the project's spec or its agent instructions), and follow them on every screen.

1. Map every screen to the Fire template it follows before you build any of them: a list of records (`logs.html`), a create or edit form (`form.html`), one record (`record.html`), settings (`settings.html`), keys and secrets (`api-keys.html`), an audit trail (`audit.html`), a dashboard (`overview.html`), usage and billing (`usage.html`). `skills/fire/screens.md` lists all of them with when to use each, and `npx fire find --kind template "<what the screen is for>"` searches them. A screen with no template is a gap: say so before you build it.
2. One page head for the whole app: the same structure, the same place for the title, the description and the primary action. One form pattern. One way to show a list. Never a second.
3. Build each screen fresh in its template's structure: the same regions (page head, toolbar, table or sections, foot) in the same order, each written from the components' own markup. A template is a reference to read, never a file to copy and edit. Do not assemble a page layout from loose parts.
4. When several people or agents build at once, they share this plan and one shell. Nobody starts a screen before the plan exists.

## 2. Always

1. Use only `fd-` classes and attribute values that the vocabulary lists. A value Fire does not define does nothing, and nothing warns you.
2. No custom CSS, no `<style>` blocks, no `style` attributes in markup (a custom property goes in `data-fd-vars="--name: value"`, and Fire sets it with `setProperty`, so pages work under a strict CSP), no pixel values, and no widths or heights in markup. Lay out with `fd-stack`, `fd-row`, `fd-grid`, `fd-column`, `data-gap`, `data-cols` and `data-span`.
3. Never edit the project's copy of Fire, and never copy a Fire component and change the copy.
4. Build every state: empty, loading, error, disabled. Loading keeps the shell and the page head and shows a skeleton shaped like the content (a table for a table, a list for a list); the first load is `fd-skeleton-app` in the static HTML. Never a bare box of bars for a whole page (`GUIDE.md` section 3, "Loading a page").
5. A button that does something dangerous or irreversible goes on its own page or section with `fd-confirm-inline`; removing or revoking one item of a list or table asks in its own row with `fd-confirm-row`; a decision someone can take back waits a few seconds with Undo (`GUIDE.md` section 5, "Decisions"). A control that is off says why (`fd-reason`).
6. One primary button per view. One step between heading levels: page, section, card, field (`GUIDE.md` section 5, "Heading levels").
7. Declare the surface: `data-fd-surface="app|website|phone|email"` on `<html>`. A part whose card does not include it gets a `surface-mismatch` warning; use the part the warning names, or leave it out. Search with `fire find --surface`.
8. A public site is composed from Fire's section types inside `fd-site`. Never write or ask for a section variant that only changes how it is painted, and never a block of your own: vary a site by its look and by which sections you compose.
9. On a phone, main destinations are an `fd-tabbar`, three to five items. Do not add padding or offsets for it; `--fd-tabbar-space` does that.
10. Your own tokens carry your prefix, never `--fd-`. Never add a token that repeats a Fire token (a colour, length, duration or weight Fire has): use Fire's. Never restyle an `fd-` class; ask for a variant.
11. Page transitions are opt in. Add them only when asked, with the three steps in `GUIDE.md` section 2, or `transition()` in a single-page app.
12. Start a screen from its template. A template with states opens each from `?state=` (its card lists them): copy that state's markup instead of drawing it again.
13. Filter by up to three fields with `fd-filter` chips; by more than three with one `fd-filters`. Do not build a row of your own.
14. A public listing (a blog, a library, releases) is `fd-site-posts` with its tools bar, `data-kind`, `data-tags` and `data-filter`. Do not write a new block for it.
15. Never set text over a picture except on the image ground (`data-ground="image"`), which keeps it readable. Everywhere else the text sits beside the picture.
16. Every `<img>` on a site has `alt` (empty for decoration), `width` and `height`. The lint warns `img-attrs` when one is missing.
17. Write `fd-` classes and Fire attribute values as whole strings. The production build is trimmed to what the source uses (`fire slim`), and a name built at run time (`fd-badge-${tone}`) cannot be seen: write the full names, or add the component to `fire.slim.include` in `package.json`.
18. An action on a row lives in the row: a row menu or an icon button in the last cell. Never a button per row outside the table, and never an identifier in a button's label.
19. A button keeps its natural width (put it in an `fd-row`). A full-width button is for a phone, or for the one action of a narrow sign-in card (`data-block`).
20. A form is one column. An `fd-form-section` is a direct child of `fd-form`, never inside a grid or a narrow column, and a form never sits loose beside a card.
21. An empty state sits inside the container it empties (the table's frame, the card), not loose on the page.
22. A native `<select>`, `<table>` or `<fieldset>` is never bare: a select sits in `<label class="fd-select">`, a table in `.fd-table-wrap > .fd-table-scroll`. To turn off a group of controls, use `<fieldset disabled>` with a `<legend>` and say why beside it.
23. Move focus by script to a heading, a title or a region with `focusQuiet(el)`, never `el.focus()` with a `tabindex`: a heading must not show the keyboard ring. Buttons, links and fields are focused as usual.

## 3. Forms

1. Choose each control from the kind of value, using the table in `GUIDE.md` section 5, "Forms". Yes or no is a switch or a checkbox. One of a few is a segmented control or radios. One of many is a select. A list is a tag input. Names with values are a pairs editor.
2. Nobody types a choice, `0` or `1`, or JSON. Raw code appears only in `fd-codefield`, and only where an expert really needs it.
3. Do not write one helper that renders any setting as a text box. Each setting gets the control that fits it.
4. A long create or edit form is a column of `fd-form-section`s. Start from `templates/form.html`.
5. A hint never lists the allowed answers. If you are about to write one that does, the control is wrong.
6. A value to type is a field (label, the input with its button in an `fd-row data-align="end"`, hint) inside an `fd-form`, which stops at a readable width. It is never an `fd-setting`: a setting row is a title, a description and one control on the right, and its text column holds no input.

## 4. Text

1. Write only what the layout, a label or a value does not already say. One job per element.
2. Stay inside the word budgets in `WRITING.md` section 3. If a text is over, split it or move the detail to a tooltip, a link or the docs.
3. Buttons are a verb, or a verb and its object. Placeholders are realistic examples.
4. Empty states say what will appear and how. Errors say what happened and what to do. Success says what is now true, without "successfully".
5. Sentence case. Digits with units. Identifiers in mono. No exclamation marks, and no "please", "simply", "just", "easily" or "Oops".
6. Do not add sentences "to be safe". Add help only for money, security, something that cannot be undone, or a mistake a careful first-time user would make.

## 5. Before you say it is done

1. Run `npx fire review` (the starters run it inside `npm run check`; `docs/frameworks.html#review` has the options). It opens every screen at 1440px and 375px, light and dark, checks structure and composition on the rendered page, and writes a gallery (`.fire-review/index.html`). Fix every error.
2. Open the gallery and look at every screen, then try the keyboard. The checks cannot judge hierarchy, rhythm, or whether a screen follows its template: someone has to look.
3. Ask: does it look like a product, or like a database form? If the second, it is not done.
4. Run the checklist in `WRITING.md` section 9 on each screen.
5. Run Fire's markup lint on every file you changed (`node node_modules/fire-design/scripts/lint-markup.mjs <files>`, or `scripts/lint-markup.mjs` inside the Fire repository) and fix every finding, warnings included; never silence one with a `style` attribute. It checks names and structure (a missing part, a class on the wrong element, a part in the wrong place). "0 errors" means the markup it can see is valid; it does not mean the screen is good, and it cannot see what a template expression or a child component adds: `fire review` does. That includes a helper that wraps what it is given: markup passed into a function such as `row(label, control)` is checked on its own, not in the place the helper puts it. For markup composed through helpers, the review is the authority, not the lint. If you wrote CSS or tokens, run `lint-css` too (`npx fire lint-css <files> --prefix <yours>`) and fix every error. In the Fire repository, also run `scripts/audit.mjs`: no errors and nothing under `literals`, `inline` or `attrs`.
6. Say plainly what you checked and what you did not.

## 6. When Fire does not have what you need

Follow `GUIDE.md` section 7, in order:

1. Search first, by what the thing does: Fire's index (`npx fire find`; in Facet, `search_components`, templates included). Read the cards and the template pages. Templates are references to read, never starters.
2. Compose or customise existing components with their variants and states.
3. If nothing is close, build the component to Fire's standard: an `x-<name>` root class and `x-<name>-<part>` parts, Fire tokens only (no raw colours or lengths), `data-*` variants, ARIA states, every state, light and dark, phone and keyboard. Its CSS goes in the project's `fire-local.css`. Never style or override an `fd-` class or token.
4. Propose it as an issue on Fire's repository (`GUIDE.md` section 7). `npx fire propose new <slug>` writes the file to fill: what you were building, what you searched (the queries, and for each near Fire entry one sentence on why it does not fit), a card in Fire's format (`contract/cards/README.md`), the markup and the CSS. `npx fire propose check <file>` says what is missing or private, and `npx fire propose send <file>` files it.
5. The issue is public. It describes the component, never the product: no product, company or person's name, no file paths, no private addresses, no keys, no screenshot of a real screen. Example data is Ember's. File it when the project's instructions allow agents to; otherwise show the owner the file. Tell the owner what you filed.
6. Never build a one-off silently. Fire answers on the issue: adopted as `fd-…` in a release, or declined with a reason. When one is adopted, replace the `x-` component with Fire's.

In the Fire repository: a new pattern or template must pass the near-duplicate gate (`node scripts/gate.mjs --probe <page>`) or declare a `relation` in its card (`variantOf` or `distinctFrom`, with one sentence on when to use it instead).

While you work, raise chances to improve Fire the same way: an arrangement you built twice, a variant you wished existed, a token you had to approximate, anything awkward to use.
