# Cards

A card is the judgement about one component that cannot be generated from the source: when to use it, when not to,
and what it is called elsewhere. `contract/cards/<component id>.json` holds one card; `scripts/build-catalog.mjs`
merges it into the component's entry in `contract/catalog.json`, where the lint, the wrappers, Facet and agents read it.
`card.schema.json` is the format. Component ids, roots, classes and attribute values come from the build, never from a card.

```
node scripts/build-catalog.mjs                  fails when a component has no card, or a card is wrong
node scripts/build-catalog.mjs --allow-missing  builds anyway; contract/cards/_missing.json lists what still needs a card
node scripts/build-catalog.mjs --check          fails when catalog.json (and _missing.json, with --allow-missing) is stale
```

`_missing.json` is generated: do not edit it. Each entry has the component id, its family and the docs section that
shows it. Write the card from that section's prose and the component's CSS header.

## Fields

Every field is required except `relation`; a list with nothing to say is `[]`.

| Field | What it holds |
|---|---|
| `id` | The component id in `catalog.json`; the file is `<id>.json`. |
| `job` | One sentence ending in a full stop, at most 140 characters, that starts with a verb a person would say: "Start an action or confirm a choice with one press." |
| `purpose` | What it is and how it behaves, in plain prose, at most 500 characters. No promotion: say what it does. |
| `useWhen` | Situations that call for it, each one sentence. At least one. |
| `avoidWhen` | Situations that look like a fit and are not. Each has `when` and `instead`: a component id, or a short instruction when no component fits. |
| `aka` | Other names people and other design systems use (search terms): "modal" for a dialog. |
| `surfaces` | Where it is used: `app`, `website`, `phone`, `email`, always in that order. At least one. List a surface only where the part is right as it is: the markup lint (`surface-mismatch`), `fire find --surface`, the Catalogue page and the Facet export all read it. A part that is right only on a phone lists only `phone`; a phone page also accepts parts that list `app`. |
| `data` | The shape of data it shows or collects: `record`, `list`, `series`, `form`, `text`, `none`. At least one. |
| `states` | Conditions it can be in. Each has `name` and `how`: the attribute, class or call that sets it, as written in markup. |
| `variants` | Attribute values that change the look or role. Each has `attribute`, `value` (an empty string for an attribute set with no value) and `useWhen`. The build fails when the attribute or value is not one the CSS defines for the component. |
| `parts` | The classes that make the component up, each with its `role`, and optionally its structure (below). The build fails when a class does not belong to the component. |
| `related` | Ids of components often used with it or mistaken for it. The build fails on an unknown id. |
| `keyboard` | Keys the component handles: `keys` and `does`. |
| `example` | The docs section whose specimen shows it, as `docs/<page>.html#<section id>`. The build fails when the section does not exist. |
| `relation` | Optional. Declares that this part looks like another and is not a duplicate, so the near-duplicate gate (`scripts/gate.mjs`) lets the pair stand: exactly one of `variantOf` (a form of the other) or `distinctFrom` (looks alike, a different thing), a component id, and `because`, one sentence on when to use this one instead. |
| `provenance` | Repository paths the card was written from. At least one. |
| `since` | The Fire version that introduced the component, as `major.minor.patch`; read it from the git tags. |

## Structure (0.10)

An entry of `parts` may also say how the part fits: `scripts/lib/structure.mjs` turns these facts into the markup lint's
structure rules (and the same rules run on a rendered page), and `docs/_ref/CLASSES.md` and `fire find` show them. The
entry whose `class` is the root describes the root. Each fact must hold for every specimen in Fire's docs, templates and
starters, and rest on Fire's CSS or behaviour: a grid column for the part, a selector such as `.fd-select > select`, a
module that queries it. When in doubt, leave it out: a rule that reports a correct page is worse than none.

| Field | What it says | Rule |
|---|---|---|
| `required` | `true`: the part must be inside the root whenever the root is. | `missing-part` |
| `or` | With `required`: other classes that fill the same place (`fd-icon` for the callout's icon). | |
| `element` | The tags the class works on: `["label"]`. | `wrong-element` |
| `parent` | Its parent element must carry one of these classes. | `wrong-parent` |
| `inside` | An ancestor must carry one of these classes. | `wrong-parent` |
| `notInside` | No ancestor may carry one of these classes. | `wrong-parent` |
| `attrs` | `{ "name": true }` it must carry the attribute, `"value"` with that value, `false` it must not (`hidden` on a menu). | `missing-attribute`, `forbidden-attribute` |
| `contains` | It must hold a direct child with one of these tags (`["select"]`); the class on such an element itself is `wrong-element`. | `missing-child` |
| `skeleton` | On the root's entry only: one line of markup with the required structure, quoted in the lint's fixes, `CLASSES.md` and `fire find`. | |

The build fails when a fact names a class that is not Fire's, when `or` comes without `required`, when the root is its
own required part, when a skeleton sits on another entry, or when a skeleton does not carry its root or breaks a rule.
The schema rejects any other field. `data-static-demo` (an overlay drawn in place in the docs) is exempt from `element`
and `attrs`.

## Kinds, templates and pictures

A card also exists for each kind of entry the catalogue lists: component, pattern, layout and `section`. The kind is not in the card; the build assigns it. A website section (`site-hero`, `site-posts`, `site-article` and the others) has an ordinary card with `surfaces: ["website"]`, and its variants are the values of its `data-layout`.

A template has a card in `contract/cards/templates/<name>.json`, one for each file in `templates/`, with the same fields except `variants`, `parts`, `related` and `keyboard`. `example` is the template's path. `states` lists every state the screen has and how to reach it: `?state=<name>`, the screen's Demo state band, or the control that opens it. A screen with no states beyond the default says so in one `default` state. The ten website templates add `sections`, a list of `{ section, variant, why }`: which sections the page is composed of, in order, and why each variant. A template card may carry a `relation` too.

A picture of each entry is not a card field: `contract/pictures/<kind>/<id>.png` is rendered from the part's first docs specimen (`npm run build:pictures`), and the build fails when an entry has none. The pictures are in the repository and are left out of the installed package.

## Writing rules

- Short and specific. A person or an agent picks a component from `job`, `useWhen` and `avoidWhen` alone.
- Facts come from the docs page and the CSS header; do not invent behaviour. Where docs and CSS disagree, fix the docs first.
- No marketing words (powerful, seamless, beautiful, modern). Fire's `WRITING.md` rules apply.
- Name the neighbour in `avoidWhen.instead`, so a wrong pick leads to the right component.

## Example

`contract/cards/button.json` (shortened to two variants and one part):

```json
{
  "id": "button",
  "job": "Start an action or confirm a choice with one press.",
  "purpose": "The native button in Fire's soft style: a quiet fill that darkens on hover, with one primary per view. Variants and sizes are data attributes; loading, held and disabled come from aria-busy, aria-pressed, aria-expanded and disabled.",
  "useWhen": ["An action runs on this page and nothing navigates: save, create, send, copy, retry."],
  "avoidWhen": [{ "when": "The action is a link to another page, or sits inside a sentence.", "instead": "btn-text" }],
  "aka": ["action", "CTA", "icon button", "submit"],
  "surfaces": ["app", "website", "phone"],
  "data": ["none"],
  "states": [{ "name": "loading", "how": "aria-busy=\"true\"; keeps the width and shows a spinner" }],
  "variants": [
    { "attribute": "data-variant", "value": "primary", "useWhen": "The one action the view exists for; at most one per view." },
    { "attribute": "data-icon-only", "value": "", "useWhen": "The button holds only an icon; it needs aria-label or data-fd-tooltip." }
  ],
  "parts": [{ "class": "fd-btn", "role": "The button; a button, a or input element." }],
  "related": ["btn-group", "dialog"],
  "keyboard": [{ "keys": "Enter, Space", "does": "Activates the button." }],
  "example": "docs/buttons.html#variants",
  "provenance": ["docs/buttons.html", "fire/components/button.css"],
  "since": "0.1.0"
}
```

The complete cards are `button.json`, `table.json` and `dialog.json`.
