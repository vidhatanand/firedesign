# Forms for structured values — build brief (0.4.0)

> Written for Fire 0.4.0 and kept as a record. The current table of controls is `GUIDE.md` section 5, "Forms"; `fd-datefield`, `fd-period`, `fd-color`, `fd-confirm-inline`, `fd-reason` and `fd-codes` came later (0.7.0).

## Why
A product built with Fire (server-rendered pages, plain form posts, a strict Content Security Policy) produced
admin forms that showed raw JSON in text areas, typed-in option names ("off, optional or required" as a hint under a
text box), `0` / `1` for yes or no, and long forms with no surface or hierarchy. The cause on Fire's side:

1. Fire has no control for **a list of values** or **a set of name and value pairs** that works in a plain form.
   `fd-tag-input` needs script and posts only through `data-name`; there is no pairs editor at all.
2. Fire has no pattern for **a long create or edit form**: sections, a surface, a heading scale.
3. A field shown as a **static value** (`<span class="fd-input">`) does not centre its text.
4. Nothing shows what a **raw code field** should look like when raw JSON really is the right input.

This brief adds those. All of it must work in three situations: with no script (a plain, usable form), with
`fire/js/forms.js` loaded, and under a strict CSP (**no `style="…"` attribute in any markup the script writes**; use
classes, data attributes, or the CSSOM `el.style.setProperty`).

Read first: `DESIGN.md`, `docs/_ref/TOKENISE.md` (no raw px / rem / ms in rules; component tokens in the file's
`:root` block), `docs/_ref/VOCABULARY.md`, `WRITING.md` §3–4, `fire/js/core.js`, and in `fire/js/forms.js` the header
comment plus the existing one-time code (`setupOtp`, its hidden "carrier" input and reset handling) and tag input
(`setupTagInput`, `syncHidden`, `addTags`, `setTags`) code, which the new work extends in the same style.

## 1. List field: `fd-tag-input` in a plain form

```html
<div class="fd-tag-input" data-fd-tag-input [data-format="json"] [data-mono] [data-pattern="^https://"] [data-max="10"]>
  <textarea name="redirect_uris" id="f-redirects" rows="3" placeholder="https://app.example.com/callback">https://app.example.com/callback
https://app.example.com/silent</textarea>
</div>
```

- **Without script** it is an ordinary text area, one value per line: `.fd-tag-input > textarea:only-child` looks
  like `fd-textarea` (the container shows no second border).
- **With script** `setupTagInput` takes the text area out, builds the tokens and the `.fd-tag-input-field` input as
  today, and adds **one** hidden input with the text area's `name`.
  - Default format: the values joined with a newline, exactly what the plain text area would have posted, so the
    server parses one shape with or without script.
  - `data-format="json"`: a JSON array of strings. The text area's initial content may then also be a JSON array.
  - Carry over from the text area: `id` (to the field input, so the label still points at it), `placeholder`,
    `disabled`, `readonly`, `aria-describedby`, `aria-invalid`, and `required` (the field input is `required` only
    while there are no values, so native validation says "fill this in" on an empty list).
  - A form `reset` restores the initial values and the carrier.
- The existing contract (`data-name`, `data-value`, repeated hidden inputs) keeps working unchanged.

## 2. Pairs editor: `fd-pairs` (new)

For a set of name and value pairs: scopes with descriptions, headers, labels, environment variables.

```html
<div class="fd-pairs" data-fd-pairs [data-format="json"] data-key-label="Scope" data-value-label="What people see"
     [data-key-placeholder="read:runs"] [data-value-placeholder="Read your runs"] [data-add-label="Add scope"] [data-mono="key"]>
  <textarea name="scopes" id="f-scopes" rows="4">read:runs = Read your runs
write:runs = Start and stop runs</textarea>
</div>
```

- **Without script**: an ordinary text area, one `name = value` per line (split on the first `=`).
- **With script**: the text area is replaced by
  ```
  .fd-pairs-head      two column labels (data-key-label, data-value-label); visually quiet (the eyebrow style)
  .fd-pairs-row       <input class="fd-input fd-pairs-key"> <input class="fd-input fd-pairs-value">
                      <button class="fd-btn" data-variant="ghost" data-icon-only aria-label="Remove <key>">x icon</button>
  .fd-pairs-add       <button class="fd-btn" data-variant="ghost" data-size="sm">plus icon + data-add-label ("Add row")</button>
  one hidden input    the text area's name; value is the same `name = value` lines, or a JSON object with data-format="json"
  ```
  - Each row's inputs get `aria-label`s built from the column labels ("Scope 2", "What people see for read:runs").
  - An empty editor shows one empty row. Rows with an empty key are left out of the value.
  - A key used twice marks both key inputs `aria-invalid="true"`; the group gets `data-invalid`.
  - Enter in a value input adds a row below and focuses its key. Backspace in an empty key of an empty row removes
    the row and focuses the row above. Removing a row focuses the next row's key (or the add button).
  - `data-mono="key"`, `"value"` or `"both"` sets those inputs in the mono face (identifiers).
  - Carries `id` (first key input), `disabled`, `readonly`, `aria-describedby`; `reset` restores the initial pairs.
  - Fires `fd:change` with `detail.value` as an object. Exports `pairsValue(el)` and `setPairs(el, object)`.
  - On a narrow container (below about 480px) a row stacks: key above value, the remove button beside the key.

## 3. Code field: `fd-codefield` (new)

For the cases where raw code really is the input (an expert's config override). It must look like code, not prose.

```html
<div class="fd-codefield" [data-fd-json]>
  <div class="fd-codefield-head"><span class="fd-codefield-lang">JSON</span>
    [<button class="fd-btn" type="button" data-variant="ghost" data-size="xs" data-fd-codefield-format>Format</button>]</div>
  <textarea class="fd-codefield-input" name="config" id="f-config" rows="8" spellcheck="false" autocapitalize="off">{}</textarea>
</div>
```

- A sunken well (`--fd-bg-sunken`), mono at the code size and line height the code family uses, hairline edge, the
  input's own focus treatment on `:focus-within`, a quiet header with the language in the eyebrow style. Tab inserts
  two spaces when the script is loaded (Escape then Tab leaves the field, for keyboard users).
- `data-fd-json`: on blur and on submit, parse the value. If it fails, set `aria-invalid="true"` on the text area
  and write a plain message into the enclosing `.fd-field`'s `.fd-field-error` (create it if missing):
  "This isn't valid JSON: <the parser's reason>, line N." Clear both as soon as it parses. "Format" pretty-prints
  valid JSON with two spaces. Without script it is a plain text area.

## 4. Form sections: `fd-form-section` (new)

The pattern for a long create or edit form.

```html
<form class="fd-form" data-size="full" method="post">
  <section class="fd-form-section">
    <header class="fd-form-section-head">
      <h2 class="fd-form-section-title">Callbacks</h2>
      <p class="fd-form-section-desc">Where this app receives people and events.</p>
    </header>
    <div class="fd-form-section-body"> …fd-field, fd-form-cols, fd-form-row, fd-setting… </div>
  </section>
  <section class="fd-form-section"> … </section>
  <div class="fd-form-actions"> … </div>
</form>
```

- Wide container: two columns. The head is a narrow left column (about 280px, a component token) that stays at the
  top of its section; the body is the right column, **a white surface** (`--fd-surface`, hairline ring,
  `--fd-radius-xl`, padding `--fd-space-6`), a column of fields with `--fd-space-5` between them, and no wider than
  the form measure plus its padding. Sections sit `--fd-space-8` apart.
- Narrow container (below about 720px; use a container query on `.fd-form`): the head stacks above the body.
- `fd-form-section[data-layout="stack"]` stacks at every width.
- Heading scale, so levels never collide: the page title is the hero; **`fd-form-section-title` is the title size
  (`--fd-text-title`, weight medium)**; field labels stay `--fd-text-md` at label weight; `fd-form-section-desc` is
  small and `--fd-text-3`.
- Inside the body, `fd-form-cols` fills the body, `fd-form-row` rows are separated by the usual hairline, and a
  `.fd-form-actions` placed inside a body aligns to its end. The sticky variant of `fd-form-actions` keeps working.

## 5. A value shown in a field's shape

`<span class="fd-input">dana@example.com</span>` (a sample in a preview, a read-only value) must sit on the same
baseline as a real input: `:where(span, div, output).fd-input` centres its content vertically, truncates with an
ellipsis, and is not focusable. Same for `data-size` variants.

## 6. Docs (`docs/forms.html`)

Add, near the top (after the page's first section), a section **Choosing a control** (`id="choosing"`): a
`doc-table` (the kind of value → the control → never) and one live do-and-don't pair (`doc-do`) showing the same four
settings as text boxes with the options in hints and JSON in a text area, next to the right controls.

| The value is | Use | Never |
|---|---|---|
| Yes or no | `fd-switch` (immediate) or `fd-checkbox` (saved with the form) | A text box holding `0` or `1`, `on` or `off` |
| One of 2 to 4 options | `fd-segmented` or `fd-radio` | A text box with the options listed in its hint |
| One of many options | `fd-select`, or `fd-combobox` when the list is long | The same |
| Several of a fixed set | `fd-checkbox` group or `fd-choice` cards | A comma-separated text box |
| A number with a unit | `fd-number` or an `fd-input-group` with a unit affix | A bare text box; a unit only in the label |
| A list of free values (URLs, domains, emails) | `fd-tag-input` | A JSON array or a comma-separated text box |
| Names with values (scopes, headers, labels) | `fd-pairs` | A JSON object |
| A secret | `fd-secret` | A plain text input |
| Raw configuration for experts | `fd-codefield` with `data-fd-json` | An ordinary text area |

Then add a specimen section for each new thing (list field in a plain form, pairs, code field, form sections, static
value), each with `data-code`, notes (`doc-notes`) and the no-script behaviour stated. Follow the page's existing
structure and DESIGN.md §7; no pixel values, widths or `style` attributes in markup; realistic Ember content.

## Acceptance
- `node scripts/audit.mjs`: `ERROR=0`, and `icons classes ids links tokens literals inline` all 0.
- `node --check fire/js/forms.js`. No `style="` inside any string the new code writes.
- The script is idempotent (`once`), uses delegated listeners where it can, and leaves existing components alone.
- Report: the markup contracts as built, what you tested in Node with a DOM stand-in, and what needs a browser.
