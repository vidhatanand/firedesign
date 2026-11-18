# Rules for an AI agent building with Fire

These are the rules an AI agent follows when it builds or changes an interface in a product that uses Fire. They live in Fire, not in the product, so that updating Fire updates the rules.

**For the product's owner.** Copy this file into the project beside `GUIDE.md`, `WRITING.md` and `VOCABULARY.md`, then put this pointer in the project's agent instructions (`AGENTS.md`, `CLAUDE.md`). Adjust the three paths once; after that the pointer never needs to change.

```markdown
## Interface: the Fire design system

- For any interface work, read and follow `docs/fire/AGENT-RULES.md` first. It names the other files to read.
- Fire is in `public/fire`. Never edit it.
- Gaps in Fire go in `docs/fire/REQUESTS.md`. Stopgap styles go in `fire-local.css`.
```

Anything the project's own instructions say more specifically (its layouts, its helpers, its security policy) wins over this file.

## 1. Read before you write

| Before you | Read, in the folder this file is in |
|---|---|
| Build or change any screen | `GUIDE.md` |
| Write any text that appears on a screen | `WRITING.md` |
| Use a class or an attribute | `VOCABULARY.md` (if it is not listed there, it does not exist) |
| Pick a component, pattern or template | Run `npx fire find "<what you need>"` first (or `node node_modules/fire-design/scripts/find.mjs "<what you need>"`; `--surface`, `--data` and `--kind` narrow it). It searches the cards by job and other names. Search with `--surface` set to where the page is used. Then read the chosen entry's `useWhen` and `avoidWhen` in `contract/catalog.json` and open its `example`; `--json` gives the path of its picture, which you can open |
| Build a public website | `GUIDE.md` section 5, "A public website", then `docs/site.html` and `docs/site-sections.html` (articles, listings, sign-up and pictures are there too) |
| Add your own CSS or tokens | `GUIDE.md` section 7, "Your own CSS and tokens" |
| Write Fire markup in Lit, React, Next.js or Vue | `spec/EXPORT.md` in the Fire package, and the matching starter in `starters/` |
| Add to Fire itself | `DESIGN.md`, in the Fire repository |

Copy markup from the Fire docs pages or the nearest template. Do not write components from memory. Run `fire find` before you compose a pattern or a screen: Fire may already have it, under another name.

## 2. Always

1. Use only `fd-` classes and attribute values that the vocabulary lists. A value Fire does not define does nothing, and nothing warns you.
2. No custom CSS, no `<style>` blocks, no `style` attributes in markup (a custom property goes in `data-fd-vars="--name: value"`, and Fire sets it with `setProperty`, so pages work under a strict CSP), no pixel values, and no widths or heights in markup. Lay out with `fd-stack`, `fd-row`, `fd-grid`, `fd-column`, `data-gap`, `data-cols` and `data-span`.
3. Never edit the project's copy of Fire, and never copy a Fire component and change the copy.
4. Build every state: empty, loading, error, disabled.
5. A button that does something dangerous or irreversible goes on its own page or section with `fd-confirm-inline`; a decision someone can take back waits a few seconds with Undo (`GUIDE.md` section 5, "Decisions"). A control that is off says why (`fd-reason`).
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

## 3. Forms

1. Choose each control from the kind of value, using the table in `GUIDE.md` section 5, "Forms". Yes or no is a switch or a checkbox. One of a few is a segmented control or radios. One of many is a select. A list is a tag input. Names with values are a pairs editor.
2. Nobody types a choice, `0` or `1`, or JSON. Raw code appears only in `fd-codefield`, and only where an expert really needs it.
3. Do not write one helper that renders any setting as a text box. Each setting gets the control that fits it.
4. A long create or edit form is a column of `fd-form-section`s. Start from `templates/form.html`.
5. A hint never lists the allowed answers. If you are about to write one that does, the control is wrong.

## 4. Text

1. Write only what the layout, a label or a value does not already say. One job per element.
2. Stay inside the word budgets in `WRITING.md` section 3. If a text is over, split it or move the detail to a tooltip, a link or the docs.
3. Buttons are a verb, or a verb and its object. Placeholders are realistic examples.
4. Empty states say what will appear and how. Errors say what happened and what to do. Success says what is now true, without "successfully".
5. Sentence case. Digits with units. Identifiers in mono. No exclamation marks, and no "please", "simply", "just", "easily" or "Oops".
6. Do not add sentences "to be safe". Add help only for money, security, something that cannot be undone, or a mistake a careful first-time user would make.

## 5. Before you say it is done

1. Open every screen you touched in a browser. Check light and dark, 1440px and 375px wide, and keyboard use.
2. Ask: does it look like a product, or like a database form? If the second, it is not done.
3. Run the checklist in `WRITING.md` section 9 on each screen.
4. Run Fire's markup lint on every file you changed (`node node_modules/fire-design/scripts/lint-markup.mjs <files>`, or `scripts/lint-markup.mjs` inside the Fire repository) and fix every finding, warnings included; never silence one with a `style` attribute. If you wrote CSS or tokens, run `lint-css` too (`npx fire lint-css <files> --prefix <yours>`) and fix every error. In the Fire repository, also run `scripts/audit.mjs`: no errors and nothing under `literals`, `inline` or `attrs`.
5. Say plainly what you checked and what you did not.

## 6. When Fire does not have what you need

Follow `GUIDE.md` section 7, in order:

1. Look again in the vocabulary, by what the thing does and not by what you would call it.
2. Compose it from existing components.
3. If it is a real gap, write a request (the fields are in `GUIDE.md` section 7), tell the owner, and carry on with a stopgap that is easy to remove: classes prefixed `x-`, Fire tokens only, in the project's stopgap file.
4. Never build a one-off silently.

In the Fire repository: a new pattern or template must pass the near-duplicate gate (`node scripts/gate.mjs --probe <page>`) or declare a `relation` in its card (`variantOf` or `distinctFrom`, with one sentence on when to use it instead).

While you work, raise chances to improve Fire the same way: an arrangement you built twice, a variant you wished existed, a token you had to approximate, anything awkward to use.
