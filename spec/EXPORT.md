# Writing Fire markup in Lit, React and Next.js, and Vue (the exporter's specification)

Status: current with the release in `package.json`. This file is the specification that the starters prove with `render-equal.mjs` and that Facet's
exporter implements. `spec/export-map.json` holds the same rules as data, with the same rule ids. Prose is short. Each
rule gives the Fire markup, what each target writes, and the reason. The rules were set in 0.6 and have not changed
since. 0.7 and 0.8 added event names (section 8), Fire-owned attributes and containers (O1, O2), a lifecycle row for
page transitions (L8), render-equal rules R14 and R15, and section 17 (W1 to W4: the surface, the tab bar, a screen's
states and website sections).

**Targets and pinned versions.** The rules were checked against these versions:

| Target | Versions |
|---|---|
| Plain HTML | Fire markup as written in the docs and templates |
| Lit | lit 3.3.3, built with Vite 8 or esbuild |
| React | React and React DOM 19.3.1; Next.js 16.4.6, App Router, Turbopack |
| Vue | Vue 3.5.45; Vite 8.3.8 with @vitejs/plugin-vue 6.0.11; single-page app, no server rendering |

**Verification tags.** A tag in brackets says how a rule was checked. Rules tagged `[A]` are assumptions that the
starters must prove. The experiments ran in a lab outside the repository, under the session's scratchpad in
`06/spec-lab/`. The lab is temporary, so the starters re-prove the rules.

| Tag | Experiment |
|---|---|
| E1 | React: 72 markup cases rendered with `renderToStaticMarkup` and with `createRoot` (development build) in Chromium. Compared the DOM, the property probes and the warnings. |
| E2 | React: 42 HTML and 40 SVG attribute renames rendered on the server, with no warnings. |
| E3 | React: `renderToString`, then `hydrateRoot`, with Fire's real `boot.js` and `fire.js`, in 9 orders. Watched for hydration errors and recoverable errors. |
| E4 | React: Fire changes the DOM, then React renders again. Covers a drawn icon, a secret, tabs, a keyed remount and a growing list. |
| E5 | React: a controlled input whose value is set in code and given an `input` event. Vue: `v-model` in the same situation. |
| E6 | Vue: 47 single-file-component cases built with Vite. Three builds (production, `whitespace: 'preserve'`, no `isCustomElement`) ran in Chromium. The cases were also rendered with `@vue/server-renderer`. |
| E7 | Vue: a `v-fire` directive (`mounted` and `updated` hooks) with Fire's modules. Covers re-rendering, removal with `v-if` and a keyed remount. |
| E8 | Lit: 22 template cases with `render()` (development build), plus Fire alongside it (menu state, icons, events). |
| E9 | Next.js: a production build and a development server. Covers a `proxy.ts` nonce policy, `boot.js` in `<head>`, Fire loaded in a client effect, re-init after a route change, hydration warnings with and without `suppressHydrationWarning`, and namespaced JSX under SWC. |
| E10 | Strict policy (`script-src 'self'; style-src 'self'`) on the Vue production build and on the Lit page with Fire running. |
| E11 | A sprite marked `hidden`, with `<use>` references to it, rendered in Chromium, Firefox and WebKit. |
| E12 | Vue `compileTemplate` output for `v-for` with a `$index` alias, and for `@fd:select`. |
| R | Read from Fire's source (`fire/js/*.js`) or from Facet's (`vendor/facet/src`), not run. |

## 0. Principles

1. **Same DOM.** Each target produces the DOM the plain markup produces, before Fire runs and after it runs.
   The differences that `render-equal` must normalise are listed in section 16.
2. **Fire owns what it writes.** After `init`, the attributes and children that Fire writes belong to Fire (section 10).
   A framework writes their first value and never binds them to state.
3. **No `style`, in any form.** That means no `style` attribute, JSX `style={…}`, Vue `:style` or `v-show`, or Lit
   `styleMap`. Custom properties go in `data-fd-vars`.
4. **Data that changes goes to an element.** If a Fire component draws itself from data and the data changes after
   mount, use its element (`fd-chart`, `fd-code`, `fd-texture`, `fd-icon`). A key remount is the second choice.
5. **Helpers the exporter emits.** The exporter writes one helper module per export (`fire-export.js`, or `.ts`). It
   holds the four functions below and is the only place where they are defined:

```js
/** JSON for a <script type="application/json">: "<" escaped, so "</script>" cannot end the element. */
export const jsonForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
/** A Facet whole-hole attribute value: false, null, undefined → no attribute; true → ""; else a string. */
export const ccAttr = (v) => (v === false || v == null ? undefined : v === true ? '' : String(v));
/** A Facet text hole: null, undefined and booleans → ""; else a string. */
export const ccText = (v) => (v == null || typeof v === 'boolean' ? '' : String(v));
/** Facet truthiness: like JavaScript, except that an empty list is false. */
export const ccTruthy = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));
```

In Lit, `ccAttr` is wrapped as `ccAttr(v) ?? nothing`. In Vue, `undefined` already removes the attribute.

## 1. Attributes

| Id | Fire markup | Lit (`html```) | React / Next.js (JSX) | Vue (template) | Why | Check |
|---|---|---|---|---|---|---|
| A1 | `class="fd-card"` | same | `className="fd-card"` | same | React warns on `class` on HTML elements. On a custom element React 19 accepts both. | E1 |
| A2 | `for="name"` | same | `htmlFor="name"` | same | React warns on `for` | E1 |
| A3 | HTML booleans present: `hidden`, `disabled`, `checked`†, `open`, `inert`, `readonly`, `required`, `autofocus`‡, `multiple`, `novalidate`, `formnovalidate` | same (static) | the prop with no value: `hidden`, `disabled`, `inert`, `readOnly`, `required`, `multiple`, `noValidate`, `formNoValidate`, `open` | same (static) | **React treats `hidden=""` (an empty string) as false and drops it.** Never write `=""` on these in JSX. | E1, E6, E8 |
| A4 | A boolean that depends on state | `?hidden=${c}` | `hidden={c}` | `:hidden="c"` | Each form gives `attr=""` or no attribute | E1, E6, E8 |
| A5 | `aria-*` with `"true"` or `"false"` | same, or `aria-expanded=${String(c)}` | `aria-expanded="true"`, or `aria-expanded={c}` (a boolean becomes the string) | same, or `:aria-expanded="c"` | All three write the strings `"true"` and `"false"` | E1, E6, E8 |
| A6 | `aria-label=""` and other empty values | same | `aria-label=""` | same | Kept as-is | E1, E6 |
| A7 | A presence attribute: `data-block`, `data-icon-only`, `data-interactive`, `data-fd-validate` and any `data-*` written with no value | `data-block` (static) | **`data-block=""`** | `data-block` (static) | In JSX a bare `data-block` means `true` and renders `data-block="true"`. `false` renders `"false"`, which still matches `[data-block]`. | E1, E6, E8 |
| A8 | A presence attribute that depends on state | `?data-block=${c}` | `data-block={c ? '' : undefined}` | `:data-block="c ? '' : null"` | `data-x={false}` and `:data-x="false"` still render the attribute | E1, E6, E8 |
| A9 | `data-*` with a value | `data-gap="3"`, or `data-gap=${n}` | `data-gap="3"`, or `data-gap={n}` | `data-gap="3"`, or `:data-gap="n"` | Numbers become strings | E1, E6 |
| A10 | An attribute that is sometimes absent | `data-x=${v ?? nothing}`, or `ifDefined(v)` | `data-x={v}` (`undefined` or `null` drops it) | `:data-x="v"` (`undefined` or `null` drops it) | **In Lit, `undefined` and `null` render `data-x=""`** | E8, E1, E6 |
| A11 | `tabindex="0"` | same | `tabIndex={0}` | same | React warns on `tabindex` | E1 |
| A12 | `popover`, `popover="manual"` | same | **`popover=""`**, `popover="manual"` | same | React drops `popover` written as a boolean (`true`) and warns | E1, E6, E8 |
| A13 | `popovertarget="id"`, `popovertargetaction="toggle"` | same | `popoverTarget="id"`, `popoverTargetAction="toggle"` | same | React warns on the lowercase name | E1, E6, E8 |
| A14 | `data-fd-vars="--value: 0.4"` (never `style`) | same, or `data-fd-vars=${'--value: ' + v}` | same, or `data-fd-vars={`--value: ${v}`}`, plus `suppressHydrationWarning` when the element is server-rendered (N4) | same, or `:data-fd-vars="'--value: ' + v"` | Fire copies the pairs with `setProperty` and removes the attribute. A new value from the framework is applied again (Fire's MutationObserver). | E3, E9, E6, E8 |
| A15 | Other HTML attributes written in camelCase in JSX | same | `autoComplete`, `autoCapitalize`, `spellCheck`, `contentEditable`, `inputMode`, `enterKeyHint`, `maxLength`, `minLength`, `colSpan`, `rowSpan`, `dateTime`, `encType`, `formAction`, `crossOrigin`, `referrerPolicy`, `fetchPriority`, `srcSet`, `accessKey`, `useMap`, `charSet`, `httpEquiv`, `acceptCharset`, `allowFullScreen`, `playsInline`, `noModule`, `itemProp`, `itemScope`, `itemType`, `cellPadding`, `cellSpacing` (full table in `export-map.json`) | same | React warns on the lowercase names. Server HTML keeps the camelCase spelling, which the parser lowercases. | E2 |
| A16 | `role`, `id`, `name`, `type`, `href`, `title`, `lang` and other plain names | same | same | same | No change | E1 |
| A17 | `style="…"` | not allowed | not allowed | not allowed (`v-show` included: it writes `style="display: none"`) | Strict CSP and Fire's rule. Use `hidden`, or `v-if`. | rule |
| A18 | `onclick="…"` and other inline handlers | not allowed (use `@click`) | not allowed (use `onClick`) | not allowed (use `@click`) | Strict CSP | rule |
| A19 | `hidden="until-found"` | same | **unsupported**: React renders `hidden=""` | same | React treats `hidden` as a boolean. Fire does not use this value. | E1 |

† `checked` on an input that is not controlled is F2. ‡ `autofocus`: React renders the attribute on the server but
calls `focus()` on the client without writing it, so the client DOM has no attribute (R6).

## 2. Text and whitespace

| Id | Fire markup | Lit | React | Vue | Why | Check |
|---|---|---|---|---|---|---|
| T1 | Whitespace between inline elements: `<a>guide</a>` + newline + `<span>` | kept as written | write `{' '}` where the HTML has whitespace with a newline between elements. A space on the same line is kept. | set `compilerOptions.whitespace: 'preserve'` in the Vue plugin (V0) | JSX drops whitespace that contains a newline. Vue's default `condense` mode drops it between elements. `preserve` keeps one space. | E1, E6, E8 |
| T2 | `<pre>` with line breaks | same | `<pre>{'line 1\n  line 2'}</pre>`: one string literal | same | JSX joins the lines of a `<pre>` with single spaces | E1, E6 |
| T3 | Entities: `&nbsp;`, `&rarr;`, `&amp;` | same | same (JSX decodes named entities) | same | Same text nodes in all three | E1, E6 |
| T4 | HTML comments | kept | dropped (`{/* */}`) | dropped in production | `render-equal` ignores comments | E1, E6 |
| T5 | Text from a value | `${v}` | `{v}` | `{{ v }}` | Lit and Vue print `true` and `false` as words. React prints nothing for booleans. Text from Facet holes goes through `ccText` (B3). | E1, E6, E8 |

## 3. Form fields (a field that is not controlled is the default)

Fire's markup describes a field's starting value. Section 10 lists the fields whose value Fire writes, which a
controlled field would fight.

| Id | Fire markup | Lit | React | Vue | Why | Check |
|---|---|---|---|---|---|---|
| F1 | `<input value="hello">` | same, or `value=${v}` (an attribute, so the default value) | `defaultValue="hello"` | same, or `:value="v"` (Vue also writes the attribute) | `defaultValue` writes the `value` attribute. Lit `.value=${v}` sets only the property, so no attribute. | E1, E6, E8 |
| F2 | `<input type="checkbox" checked>` | same, or `?checked=${c}` | `defaultChecked` | same, or `:checked="c"` | `defaultChecked` writes `checked=""` | E1, E6, E8 |
| F3 | `<select>` … `<option value="b" selected>` | same, or `?selected=${…}` on the option | `<select defaultValue="b">` (an array when `multiple`) and no `selected` on options | same, or `:selected="v === 'b'"` on the option; **never `:value` on the `<select>`** | React's `defaultValue` writes `selected=""` on the matching option. JSX `selected` on an option renders on the server but not on the client, and warns. Vue `:value` on a select writes `value="b"` on the select and nothing on the options. | E1, E6, E8 |
| F4 | `<textarea rows="3">text</textarea>` | static text, or `.value=${v}` (no text child) | `defaultValue={'text'}` (renders the text child) | static text, or `{{ v }}` inside the element | Lit warns about expressions inside `<textarea>`. Vue `:value` on a textarea writes a stray `value` attribute. | E1, E6, E8 |
| F5 | `<input type="range" min="0" max="10" step="1" value="4">` | same | `min`, `max`, `step`, then `defaultValue="4"` | same | React writes `min` and `max` before `type` and `value`, so the attribute order differs (R3) but the value is the same | E1, E6 |
| F6 | `<input type="hidden" name value>` | same | `defaultValue` | same | Same as F1 | E1 |
| F7 | A field that a framework controls | `.value=${v}` with `@input` | `value` plus `onChange` | `v-model` | Only on fields that Fire never writes (O3). React ignores a value that Fire sets in code: the `input` event Fire sends does not reach `onChange`, and React later puts its own value back. Vue's `v-model` follows the event. | E5 |

## 4. Elements that frameworks treat specially

| Id | Fire markup | Lit | React | Vue | Why | Check |
|---|---|---|---|---|---|---|
| M1 | `<template data-result>[…]</template>` (row and source templates, JSON data) | static inside `html``` is fine. With data: `<template data-result .innerHTML=${json}></template>`. **No expressions inside a `<template>`** (Lit throws). | `<template data-result="" dangerouslySetInnerHTML={{ __html: json }} />` | `<template data-result v-html="json"></template>` | Children that React or Vue render go into `childNodes`, not `.content`, so Fire reads nothing. Setting `innerHTML` fills `.content`. A static template in Vue fills `.content` only when the compiler turns it into a string, which is not reliable. | E1, E6, E8 |
| M2 | `<script type="application/json">{…}</script>` inside a component (charts, `fd-json`, chat render, doc try) | static, or `<script type="application/json">${jsonForScript(v)}</script>` | `<script type="application/json" dangerouslySetInnerHTML={{ __html: jsonForScript(v) }} />` | `<component is="script" type="application/json" v-text="jsonForScript(v)"></component>` | React children text with `</script` inside is escaped differently on the server and the client. Hydration then fails and the tree is rebuilt. Vue drops `<script>` from templates silently in production and fails the development build. With data that changes, use the element (C3). | E1, E3, E6, E8 |
| M3 | `<script type="application/json" data-fd-labels>` (the page dictionary) | in `index.html` | in the root layout's `<head>` (N3) | in `index.html` | It is a page-level script that Fire reads once (X2) | E9 |
| M4 | `<dialog class="fd-dialog">` (never `open`) | same | same | same | Fire opens it with `showModal` (`[data-fd-dialog-open]`, `overlays.openDialog(ref)`). Never bind `open`, which opens it as a non-modal dialog. | E1, R |
| M5 | `<details class="fd-accordion-item">` with `open` to start open | `?open=${c}` only for the start value | `open` (once) | `open` | Fire writes `open` and `data-state` when the user toggles. Listen for `fd:change` `{open, value}`. | E1, R |
| M6 | `<input type="range">`, `<select>`, `<textarea>` | F5, F3, F4 | F5, F3, F4 | F5, F3, F4 | | |
| M7 | `.fd-table-wrap > table.fd-table` | **write `.fd-table-wrap > .fd-table-scroll > table`** | same | same | Fire wraps a bare table in `.fd-table-scroll` with `replaceWith`. A framework would later remove the table from a parent it is no longer in, and crash. | R (`data.js` setupTable) |
| M8 | `.fd-prose > table` | write `<div class="fd-doc-table" tabindex="0" role="region" aria-label="(caption, or Table)">` around the table | same (`tabIndex={0}`) | same | Same reason: `docsite.js` builds this wrapper with `before` and `append` | R |
| M9 | A submenu (`.fd-menu` opened from a menu item) | write it inside its parent `.fd-menu` | same | same | When the submenu is outside its parent, Fire moves it there with `append` as it opens | R |

## 5. SVG inside icons, charts and brand marks

| Id | Fire markup | Lit | React | Vue | Check |
|---|---|---|---|---|---|
| S1 | `viewBox`, `d`, `x`, `y`, `width`, `height`, `fill`, `stroke`, `aria-hidden`, `data-*` | same | same | same | E1 |
| S2 | Hyphenated presentation attributes: `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `fill-rule`, `clip-path`, `text-anchor`, `dominant-baseline` and the 33 others in `export-map.json` | same | camelCase: `strokeWidth`, `strokeLinecap`, … (hyphenated names render but warn) | same | E1, E2 |
| S3 | `<use href="#i-x">` | same | `href="#i-x"` | same | E1 |
| S4 | `xlink:href`, `xml:space` | same | `xlinkHref`, `xmlSpace` (prefer `href`) | same | E1, E2 |
| S5 | `<svg>` written inside `html``` | the HTML parser puts it in the SVG namespace, so the `svg` tag function is not needed | — | — | E8 |
| S6 | Never write a `style` attribute on SVG. Colour comes from `currentColor` and Fire's tokens, through CSS. | | | | rule |

## 6. Icons

`<i data-icon="name">` must not reach React, Vue or Lit code. Fire **replaces** the `<i>` with an `<svg>`:

- React removing it later crashes the whole root: `removeChild … not a child`. Renaming it is ignored. [E4]
- Vue removing it with `v-if` throws during the update, and the old icon stays on screen. [E7]
- In Lit, a `data-icon=${name}` binding on the `<i>` goes stale. A static `<i>` survives, but the lint rejects it to keep one rule. [E8]

Write one of the two forms below in every framework. `lint-markup` rejects `<i data-icon>` in `.jsx`, `.tsx`, `.vue`
and Lit templates (ARCHITECTURE section 7).

| Id | Form | Markup | Use |
|---|---|---|---|
| I1 | **Element** | `<fd-icon icon="search"></fd-icon>`, with `size` (12, 14, 16, 20, 24, 32) for Fire's `data-size`. Other attributes stay on the element, which is the icon's root (`class="fd-icon"`, `data-icon`, `aria-hidden="true"`). The names are those in `contract/custom-elements.json`: the attribute is `icon`, not `name`, and the lint reports `<fd-icon name>`, which draws nothing. | Icons whose name changes, or anywhere a component is easier to write |
| I2 | **Static SVG**: exactly what Fire draws for `<i data-icon="search">` | `<svg class="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search"></use></svg>` | Fixed icons. Server-rendered HTML. |

How I2 is built from `<i data-icon="N" data-size="S" class="C" …rest>`:

- **Class**: `class="fd-icon C"` (Fire writes `"fd-icon "` with a trailing space when `C` is empty, so R4 compares the class list).
- **Attributes**: `data-size="S"` only when it is given, then `data-icon="N" aria-hidden="true"`. Every other attribute
  of the `<i>` is then copied unchanged (`aria-label`, `role`, `id`, and `aria-hidden` itself if the `<i>` had one, which
  replaces the default).
- **Child**: one child, `<use href="#i-N"></use>`.
- **JSX**: `<svg className="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search" /></svg>`.
- **Changing the name**: change `data-icon` and `href` together. Fire's observer also corrects `href` from `data-icon`. [E4]

**The sprite.** I2 draws from `#fd-icon-sprite`, which `fire.js` (icons.js) adds to `<body>` when it loads. On a page
rendered on the server, the icons are blank until then. For a correct first paint, the root layout renders the sprite
itself. Fire then skips adding its own, because `injectSprite` checks for the id [R]. The `hidden` attribute is how the
sprite stays out of layout without a `style` attribute. [E11]

```jsx
// app/fire-sprite.tsx: a server component; icons.js only touches the DOM inside guarded functions (typed by icons.d.ts)
import { ICONS } from 'fire-design/fire/js/icons.js';
const symbols = Object.entries(ICONS).map(([n, p]) => `<symbol id="i-${n}" viewBox="0 0 24 24">${p}</symbol>`).join('');
export function FireSprite() {
  return <svg id="fd-icon-sprite" hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: symbols }} />;
}
```

The full sprite is needed, not only the icons the page uses: `setIcon` and Fire's own components draw any name. [A]
That the full sprite renders in Next without warnings is for the starter to prove.

## 7. Fire's custom elements (`fd-icon`, `fd-chart`, `fd-code`, `fd-texture`)

| Id | Rule | Lit | React | Vue | Check |
|---|---|---|---|---|---|
| C1 | **Registration before first render.** `import 'fire-design/elements'` once, at the entry point, in the browser only. Registering twice does nothing. | `import 'fire-design/elements'` in `main.ts` | use `fire-design/react` (its components register the elements in the browser only); or `import('fire-design/elements')` in an effect. **Not a static import at the top of a client module in Next**: client components are rendered on the server too, and `elements.js` touches `HTMLElement` and `document` as it loads, which crashes the server render. | in `main.ts` before `app.mount()` | E1, E6, Next starter |
| C2 | **Attributes**: strings and numbers that the manifest lists as attributes | `label="Sales"` | `label="Sales"` (rendered on the server too) | `label="Sales"` | E1, E6 |
| C3 | **Properties**: data (`.data` on `fd-chart`, `.code` on `fd-code`) | `.data=${obj}` (an instance property set before the upgrade is applied when the element defines itself) | the wrapper `<FireChart data={obj} />` (`@lit/react`), or a ref: `ref.current.data = obj` in an effect | `:data="obj"` when the element is registered (C1). `:data.prop="obj"` or `.data="obj"` sets the property even before registration. | E1, E6, E8 |
| C4 | What goes wrong without C1 | — | React 19 writes `data="[object Object]"` as an attribute when the property does not exist yet | Vue writes `data="[object Object]"` | E1, E6 |
| C5 | Server rendering | — | strings, numbers and `true` become attributes; objects and functions are left out. The element draws on the client. | (no server rendering) | E1 |
| C6 | `class` | `class` | `className` or `class` (both work on custom elements) | `class` | E1 |
| C7 | **Typing** | `HTMLElementTagNameMap` from `fire/elements.d.ts` | `wrappers/react` components carry their prop types. Writing `<fd-chart>` directly in TSX needs `declare module 'react' { namespace JSX { interface IntrinsicElements { 'fd-chart': … } } }`, which the wrappers export. | `wrappers/vue` declares `GlobalComponents` for the `fd-` tags | [A] |
| C8 | Vue compiler option | — | — | `vue({ template: { compilerOptions: { isCustomElement: (t) => t.startsWith('fd-') } } })` in `vite.config`. `app.config.compilerOptions` affects only templates compiled at run time, not single-file components. Without the option the production DOM is the same, but Vue looks the tags up as components first (and warns in development). | E6 |

## 8. Events (`fd:*`)

Fire's events bubble and can be cancelled: `fd:open`, `fd:close`, `fd:change`, `fd:select`, `fd:copy`, `fd:submit`,
`fd:stop`, `fd:action`, `fd:files`, `fd:invalid`, `fd:valid`, `fd:dirty`, `fd:confirm`, `fd:rotate`, `fd:hover`,
`fd:theme`, `fd:accent`, and since 0.7 `fd:accept`, `fd:commit`, `fd:hold`, `fd:undo`, `fd:download`, `fd:keys`, and since
0.8 `fd:filter`. Each is listed with its `detail` in `catalog.json`.

| Id | Lit | React | Vue | Check |
|---|---|---|---|---|
| V1 | `@fd:select=${(e) => …}` on any element | `useFireEvent(ref, 'fd:select', fn)` on the element or an ancestor; or a ref and `addEventListener` in an effect | `@fd:select="fn"` on any element | E8, E9, E6, E12 |
| V2 | — | **`onfd:select={…}` does not compile in Next** (SWC: "JSX Namespace is disabled"). esbuild accepts it. | `v-on="{ 'fd:select': fn }"` works too | E9, E6 |
| V3 | — | `{...{ 'onfd:select': fn }}` works on **custom elements only**, on the client (React 19 adds a listener named after the prop). On a `<div>` it does nothing. Use V1. | — | E1 |
| V4 | Cancelling: `e.preventDefault()` in the handler, in every target. React handlers attached through `useFireEvent` run synchronously in the event, so `preventDefault` works. | | | R |
| V5 | `@fd:select` on a Vue **component** is a component emit, not a DOM listener. Put it on an element. | | | [A] |

## 9. Lifecycle: when `init(root)` runs

`fire.js` runs `init(document)` once, when it is first imported (after `DOMContentLoaded`). `init` does nothing the
second time for an element it has already seen (`once`, keyed on the element). The forms and texture modules also
enhance markup inserted later, through their own observers. Everything else needs `init(root)` after new markup arrives.

| Id | When | Lit | React | Vue | Check |
|---|---|---|---|---|---|
| L1 | After the first mount | the light-DOM base calls `init(this)` in `firstUpdated()` (or `updated()`). It need not wait for child elements' `updateComplete`: an `fd-chart` that `init` reaches before its first update draws from its properties when that update runs, the same drawing as when `init` runs after. | `useFire(ref)`: `init(ref.current)` in `useEffect` | `v-fire` directive: `mounted(el) { init(el) }` | E4, E7 |
| L2 | After an update that inserts or replaces Fire markup: lists, `key` changes, `v-if`, routes | `updated()` calls `init(this)` again, at once (as L1) | `useFire` runs after every commit of its component (no dependency list) | `updated(el) { init(el) }` | E4, E7 |
| L3 | After a route change | a router outlet calls `init(outlet)` after it renders | the client component in the root layout runs `init(document)` in an effect keyed on `usePathname()` | `router.afterEach(() => nextTick(() => init(document)))` [A] | E9 |
| L4 | After inserting HTML by hand (`innerHTML`, `insertAdjacentHTML`) | `init(container)` | same | same | R |
| L5 | Never before hydration | — | Fire running before `hydrateRoot` changes the server markup. React then rebuilds the tree on the client, and Fire's changes are lost (the `<i>` comes back undrawn). | — | E3 |
| L6 | Light DOM only | Fire's listeners are delegated on `document` and use `event.target.closest(…)`. Inside a shadow root the target is retargeted, so Fire markup must live in light DOM: `createRenderRoot() { return this; }`. A component's host element inside `.fd-page` is a node of its own for `render-equal` (R12): either each screen renders its own `.fd-page` and the hosts take `display: contents` (the Lit starter), or the check runs `render-equal --transparent '<host selectors>'`. | | | R, [A] |
| L7 | Teardown | Fire has no destroy function. Removed elements stop mattering because the listeners are delegated. | | | R |
| L8 | A route change that moves as one page (0.8; opt in) | `transition(() => …)` from `fire-design` wraps the render of the route, and the router's handler awaits it | `data-fd-transition="fade"` written once on `<html>` (N3) and a `<ViewTransition>` around each screen (React 19.3, Next App Router). No call to `transition()`: it is for a client router. R14 makes `render-equal` ignore the `vt-*` attributes React writes. | `router.beforeResolve` opens `transition()` with an update that lets the navigation go on, and `afterEach` and `onError` end it | Lit, Next and Vue starters. Chromium only. |

## 10. Ownership: what Fire writes, and what the framework must leave alone

**O1. Attributes Fire owns after init.** These are `id`, `role`, `tabindex`, `type` (on buttons), `popover`, `hidden`
(panels, sub-navigation, dialog steps), `inert`, `data-state`, `aria-expanded`, `aria-selected`, `aria-checked`,
`aria-pressed`, `aria-current`, `aria-controls`, `aria-labelledby`, `aria-describedby`, `aria-haspopup`, `aria-busy`,
`aria-invalid`, `aria-value*`, `aria-activedescendant`, and `aria-label` (where the trigger has none). Fire also writes
its own `data-*` attributes: `data-fd-*`, `data-indicator`, `data-thumb`, `data-overflow`, `data-enter`, `data-side`,
`data-align`, `data-active`, `data-ready`, `data-value` on secrets and comboboxes, and since 0.8 `data-period` and
`data-show` (pricing and compare sections), `data-scrolled` (the site header), `data-cloned` and `data-paused` (the logo
strip). `data-fd-transition` and `data-fd-direction` on `<html>` are Fire's while `transition()` runs (L8).

- **Rule**: write the value the Fire markup shows (for example `aria-expanded="false"`), and never bind it to state that changes.
- **Changing Fire's state**: use Fire's API (`overlays.openDialog`, `openMenu`, `setTheme`, `setIcon`), or click the
  trigger, or remount with a new `key`.
- **Why it is safe**: React, Vue and Lit write an attribute only when their own value changes. Fire's `aria-expanded="true"`
  survived a re-render in all three. [E3, E7, E8]

**O2. Containers Fire fills.** Render their children once and never change them. To show new content, change the
container's `key` (`:key` in Vue, `keyed()` in Lit) and let L2 run `init`, or use the element.

| Fire component | What Fire does to the children | Use instead when the content changes |
|---|---|---|
| `i[data-icon]` | replaces it with an `<svg>` | I1 or I2 (section 6) |
| `.fd-secret`, `.fd-copy-field` | rewrites `.fd-secret-value` into the masked start and end. **A framework text update writes the full secret back unmasked.** [E4] | `key={value}` |
| `.fd-codeblock` `code` | replaces `innerHTML` with highlighted lines | `<fd-code .code>` |
| `.fd-json` | replaces `innerHTML` with the tree, which removes its JSON script | `key` |
| `[data-fd-chart]`, `.fd-sparkline`, `.fd-donut`, `.fd-heatgrid` | appends the plot, legend and table, or clears everything except the JSON script | `<fd-chart .data>` |
| `[data-fd-ascii]`, `.fd-glyph`, `.fd-braille`, `.fd-dots`, `.fd-skeleton-*` presets | appends a canvas or frames, or fills itself when empty | `<fd-texture>`, or leave the container empty |
| `.fd-diff` | removes `.fd-diff-src` and builds the head and body | `key` |
| `.fd-otp`, `[data-fd-tag-input]`, `[data-fd-pairs]`, `[data-fd-combobox]` | removes the authored input or textarea and builds boxes, tokens or rows plus a hidden carrier | `key`, and read `fd:change` |
| `.fd-slider` | inserts an `<output>` after the input and appends tick marks | `key` when `data-labels` changes |
| `.fd-kv-value[data-copy]` | moves its children into `.fd-kv-text` and adds a button | `key` |
| `.fd-endpoint-path`, `.fd-doc-endpoint-url` | rewrites the text into parameter spans | `key` |
| `[data-fd-daterange]` | rebuilds `.fd-calendar` on **every** `init` | leave `.fd-calendar` empty |
| `.fd-progress` (`data-steps`) | replaces `.fd-progress-steps` when the count changes | leave it empty |
| `.fd-chat`, `.fd-chat-log`, `.fd-chat-msg`, `.fd-thread[data-fd-demo]`, `[data-fd-playground] tbody` | builds or rewrites the conversation and the rows | give the data through JSON (M2) and use `key` |
| `.fd-command` | moves items when filtering and replaces label children with `<mark>` | static items, or `key` |
| `.fd-log` | appends the jump button and replaces message text with `<mark>` while filtering | append lines only, never edit them |
| `.fd-tabs`, `.fd-segmented`, `.fd-toc` | appends or prepends an indicator, thumb or marker | items may change: no crash, and `init` on update keeps it right [E4] |
| `.fd-checkbox-box`, `.fd-choice-mark` | inserts the check SVG when there is none | leave empty |
| `.fd-prose` headings, `.fd-toc-list[data-fd-doc-toc]` | adds anchors and fills the list | static content |
| `.fd-filters[data-fd-for]` (0.8) | adds the search, the chip list, the Clear button and a live region inside it; sets `hidden` (and `data-fd-hid`) on the rows or items of its target and on `[data-fd-none]` | render every row once as static markup, each with its `data-<field>`; to filter your own data, listen for `fd:filter` and call `matches()` |
| `.fd-site-posts` with `data-filter` controls (0.8) | sets `hidden` on entries, on the list, on the `.fd-empty` and on the pager; fills an empty `nav.fd-pagination` with page buttons; writes the text of `.fd-site-posts-count` | render every entry once, with an empty `nav.fd-pagination`; set a listing from script with `filterPosts()` |
| `.fd-site-logos[data-layout="marquee"]` (0.8) | copies the list after itself (`aria-hidden`, `inert`) and sets `data-cloned` | render the list once |
| `.fd-brand` (0.8) | fills the mark, the name or the logo image from `data-fd-brand` or `setBrand()`; without a `mark` it draws the name's initial | render each `.fd-brand` once, with the name as its text; change the brand with `setBrand()`; the JSON script follows M2 |
| `.fd-doc-frame[data-fd-src]` (0.8) | fills `.fd-doc-frame-media` with an `<img>` or a placeholder tile and writes `data-state` | render the figure with `data-fd-src`, `data-fd-alt` and an empty media; change the picture with `setPicture(frame, url)` |

**O3. Fields Fire writes.** Never make these controlled in React (F7): use `defaultValue` or `defaultChecked` and read
`fd:change` or the submitted form. In Vue, prefer `@fd:change` over `v-model` on these. The fields are:

- **Search and filters**: `.fd-search-input` (clear), `[data-fd-filter-list]` search.
- **Number and sliders**: `.fd-number` (step buttons), `.fd-slider` (tick click).
- **Segmented control**: `.fd-segmented` radios.
- **Built-up inputs**: `.fd-otp` boxes, the field and carrier in `[data-fd-tag-input]`, the `[data-fd-combobox]` input
  (set to the label), the `[data-fd-pairs]` rows.
- **Composers**: `.fd-composer` and the chat composer (cleared after send).
- **Overlays**: the `.fd-command` input, `[data-fd-confirm-input]`, and dialog forms that have `data-reset`.
- **Selection**: `input[data-fd-checkall]` and the table row checks (`.checked`), `input[data-indeterminate]`.
- **Secrets**: `.fd-secret` in entry mode (switches `type` between `password` and `text`).

## 11. Next.js: server rendering and hydration

| Id | Rule | Check |
|---|---|---|
| N1 | Server components render plain Fire markup (sections 1 to 6) and no Fire script. Fire's modules load **in the browser only, after hydration**: a client component calls `import('fire-design')` inside `useEffect` (L5). | E3, E9 |
| N2 | `boot.js` is a classic, blocking `<script src>` in the root layout's `<head>`, served from `public/fire/boot.js` (copied from `node_modules/fire-design/fire/boot.js` before the build), with the request's `nonce`. It runs before the body is parsed, so the saved theme, density and tweaks are on `<html>` in the first paint. Do not use `next/script` here: `beforeInteractive` does not block parsing. | E9 (served HTML: no `async`, nonce present); `next/script` behaviour [A] |
| N3 | `<html>` carries the theme attributes and `suppressHydrationWarning`, because `boot.js` rewrites its attributes before React hydrates. Without it, development logs an attribute mismatch. Next 16's development server logs **attribute** mismatches to the browser console, but **text and structure** mismatches only to its overlay and its terminal (as `[browser] …` lines): a hydration check must read both. | E9, Next starter |
| N4 | Every server-rendered element with `data-fd-vars` carries `suppressHydrationWarning`. `boot.js` moves the value into a custom property and removes the attribute before hydration. The warning is only for development and does not cause a re-render. As N3, a check reads the console and the dev server's output. | E3, E9 |
| N5 | JSON scripts use `dangerouslySetInnerHTML` with `jsonForScript` (M2). Children text that holds `</script` makes hydration fail. | E3 |
| N6 | Fire's CSS: `import 'fire-design/css'` in `app/layout.tsx`. Turbopack follows the `@import`s and the font URLs, and emits `<link>` tags. TypeScript 6 and 7 reject the side-effect import without a declaration: `declare module 'fire-design/css';` (or the package gives `./css` a `types` entry). Turbopack lowers `light-dark()` like Vite does (P5): give the app a browserslist of the browsers that understand it, `"browserslist": ["chrome >= 123", "edge >= 123", "firefox >= 120", "safari >= 17.5"]` in `package.json`. | E9, Next starter |
| N7 | Elements (`fd-chart` and the others) and `wrappers/react` are used in client components only. `fire-design/elements` registers on import and needs `customElements` and `document`, so it is never imported statically, even in a client module (C1): use `fire-design/react`, or `import('fire-design/elements')` in an effect. | Next starter |
| N8 | The sprite: `<FireSprite />` in the root layout's `<body>` (section 6). `fire-design/fire/js/icons.js` is typed by `fire/js/icons.d.ts` (`ICONS`, `icon`, `upgradeIcons`, `initIcons`, `setIcon`). `@types/react` lists `hidden` for HTML elements only, so the `<svg hidden>` needs `declare module 'react' { interface SVGAttributes<T> { hidden?: boolean } }` until it does. | E11, Next starter |

```tsx
// app/layout.tsx (server component)
import 'fire-design/css';
import './fire-theme.css';                       // themeToCss output (H1); after Fire's CSS
import { headers } from 'next/headers';
import { FireRuntime } from './fire-runtime';
import { FireSprite } from './fire-sprite';
import { jsonForScript } from './fire-export';
import labels from './labels.json';
import { theme } from './theme';                 // { 'data-palette': 'ember', … } from expandTheme(record).attributes

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" {...theme} suppressHydrationWarning>
      <head>
        <script src="/fire/boot.js" nonce={nonce} />
        <script type="application/json" data-fd-labels="" dangerouslySetInnerHTML={{ __html: jsonForScript(labels) }} />
      </head>
      <body>
        <FireSprite />
        {children}
        <FireRuntime />
      </body>
    </html>
  );
}
```

```tsx
// app/fire-runtime.tsx: loads Fire after hydration and runs init again after every route change
'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
export function FireRuntime() {
  const pathname = usePathname();
  useEffect(() => {
    let live = true;
    import('fire-design').then((fire) => { if (live) fire.init(document); });
    return () => { live = false; };
  }, [pathname]);
  return null;
}
```

## 12. The theme record

| Id | Target | How a look is applied | Check |
|---|---|---|---|
| H1 | All | A build step runs `themeToCss(record, { selector })` from `fire-design/theme` and **writes a `.css` file**. The page loads it after `fire.css`, so its tokens win at equal specificity. `expandTheme(record).attributes` (`data-palette`, `data-density`, …) go on `<html>`. Never inject a `<style>` element at run time: a strict CSP blocks it. | [A] (`theme.js` is built by the theme package) |
| H2 | Plain | `<link rel="stylesheet" href="fire/fire.css"><link rel="stylesheet" href="theme.css">`, with the attributes written on `<html>` | [A] |
| H3 | Lit, Vue (Vite) | `import 'fire-design/css'; import './fire-theme.css';` in `main.ts`, with the attributes on `<html>` in `index.html` | [A] |
| H4 | Next.js | The import pair in `app/layout.tsx`, with the attributes spread on `<html>` (N3). Turbopack keeps import order for CSS. The browserslist of N6 keeps `light-dark()` in the theme file as written. | order [A] |
| H5 | All | A look chosen at run time (Tweaks, a user setting) goes through Fire's own API (`setTheme`, `setDensity`, and `tweaks.js`). `boot.js` restores it before the first paint. The page's own attributes stay the defaults. | R |

## 13. Strict Content Security Policy

| Id | Target | Policy and rule | Check |
|---|---|---|---|
| P1 | Plain, Lit and Vue production builds | `script-src 'self'; style-src 'self'` works. Vite's build emits external module scripts and stylesheet links only. Fire's custom properties use CSSOM `setProperty`, which a CSP does not block. JSON data scripts are not executed and need no nonce. **WebKit artefact**: Playwright's WebKit reports every `<select>` under a strict `style-src` as a `style-src-attr` violation (empty sample) with a console error that begins "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline'", even on a bare page holding only a `<select>`. A starter's CSP check may ignore that report, by that exact message only, in WebKit only. | E10, starters |
| P2 | Vite development server | Injects `<style>` elements for CSS, so development needs `style-src 'unsafe-inline'`. Production does not. | [A] |
| P3 | Next.js | `proxy.ts` makes a nonce per request and sets `Content-Security-Policy: script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self'; …` on the request (for Next to read) and on the response. Next adds the nonce to its own scripts, and the layout adds it to `boot.js`. Routes become dynamic. Development also needs `'unsafe-eval'` and `style-src 'unsafe-inline'`. | E9 (production: no violations with `style-src 'self'`; development policy [A]) |
| P4 | All | Generated code never holds `style`, `:style`, `v-show`, `styleMap`, inline handlers, `eval`, or inline `<script>` other than `type="application/json"`. | rule |
| P5 | Lit, Vue (Vite) | P1's companion: `build.cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5']` in `vite.config`, the browsers that understand `light-dark()`. With Vite's default CSS target, lightningcss lowers every `light-dark()` into a custom-property toggle that follows the page's theme only, so a `color-scheme` override (a light-only QR figure in a dark page) turns dark. Next.js and Turbopack lower CSS through their own browserslist: the Next starter must check the same figure. | Lit starter; Next [A] |

## 14. Translations

| Id | Rule | Check |
|---|---|---|
| X1 | `data-label-<key>="…"` on a component or an ancestor (or on `<html>` for the page) is an ordinary `data-*` attribute in every target. Fire reads it each time it writes a label, so changing it later takes effect the next time Fire writes that label. | R |
| X2 | The page dictionary `<script type="application/json" data-fd-labels>` must be in the document **before** Fire's first label is written. Fire parses it once. Put it in `index.html` (Lit, Vue, plain) or in the root layout's `<head>` (Next, N3, with `data-fd-labels=""` in JSX). To switch language at run time, reload, or use `data-label-*` on `<html>`. | E9, R |

## 15. Facet board constructs

The board format was read from Facet's runtime (`vendor/facet/src/runtime/render.ts`, `logic.ts`, `components.ts`,
`cli/board-rules.ts`). The Facet session confirmed B6 and B8–B13 against that runtime on 18 Nov 2026; their rows say what it added.

| Id | Board | Lit | React | Vue | Check |
|---|---|---|---|---|---|
| B1 | Repeat: `<cc-for list="{{items}}" as="item">…</cc-for>`. `null` renders nothing; anything that is not a list is an error; `$index` is in scope. | `${(v.items ?? []).map((item, $index) => html`…`)}` (by position, as the board renders) | `{(v.items ?? []).map((item, $index) => <Fragment key={$index}>…</Fragment>)}` | `<template v-for="(item, $index) in (items ?? [])" :key="$index">…</template>` | R, E12 (`$index` is a local in Vue) |
| B2 | Condition: `<cc-if value="{{empty}}">…</cc-if>` | `${ccTruthy(v.empty) ? html`…` : nothing}` | `{ccTruthy(v.empty) ? <>…</> : null}` (never `&&`, which renders `0`) | `<template v-if="ccTruthy(empty)">…</template>` | R |
| B3 | A text hole `{{a.b}}`, or holes mixed with text | `${ccText(v.a?.b)}` | `{ccText(v.a?.b)}` | `{{ ccText(a?.b) }}` | R, T5 |
| B4 | A whole-hole attribute `attr="{{x}}"` | `attr=${ccAttr(v.x) ?? nothing}` | `attr={ccAttr(v.x)}` (renamed per A1–A15) | `:attr="ccAttr(x)"` | R |
| B5 | A mixed attribute `attr="a {{x}} b"` | `attr="a ${ccText(v.x)} b"` | ``attr={`a ${ccText(v.x)} b`}`` | ``:attr="`a ${ccText(x)} b`"`` | R |
| B6 | `value`, `checked` and `selected` with a whole hole: the board keeps the live property in step (Facet's `LIVE_PROPERTIES`), like a controlled field | `.value=${ccText(v.x)}`, `.checked=${ccTruthy(v.x)}`, `.selected=${ccTruthy(v.x)}` | `value={ccText(v.x)}` with the board's input handler as `onChange`, or `readOnly` when there is none; `checked={ccTruthy(v.x)}`; `selected` on `<option>` becomes the `<select>`'s `value` | `:value="ccText(x)"` with `@input`; `:checked="ccTruthy(x)"`; `:selected="ccTruthy(x)"` | R, confirmed by Facet |
| B7 | An event `onClick="{{save}}"`. The name is lowercased; `doubleclick` becomes `dblclick`; `onfd:select` listens for `fd:select`. The handler is called with `(event, loopLocals)`. | `@click=${(e) => logic.save(e, { item, $index })}` | `onClick={(e) => logic.save(e, { item, $index })}`; `fd:*` events through V1 | `@click="(e) => logic.save(e, { item, $index })"` | R |
| B8 | A sibling board: `<cc-import name="Card" item-count="{{n}}">`. Attribute names go from kebab case to camel case (Facet's `propName`); function values are bound to the parent board's logic, so they pass as callbacks. | a light-DOM element `<app-card .itemCount=${v.n}>`. The tag prefix is the exporter's setting, default `app-`; a product sets its own (`ts-`, `as-`); `fd-` is Fire's only. | `<Card itemCount={v.n} />` | `<Card :item-count="n" />` | R, confirmed by Facet |
| B9 | A design-system component: `<cc-component name="Button" variant="primary" disabled="{{busy}}" on-click="{{save}}">Save</cc-component>` | The Fire markup the component's entry in `contract/catalog.json` gives (props to the root's `data-*` attributes; a Facet card's `api` has no markup mapping): `<button class="fd-btn" type="button" data-variant="primary" ?disabled=${v.busy} @click=…>Save</button>` | `<button className="fd-btn" type="button" data-variant="primary" disabled={!!v.busy} onClick=…>Save</button>` | `<button class="fd-btn" type="button" data-variant="primary" :disabled="!!busy" @click=…>Save</button>` | R, confirmed by Facet. Boards on a Fire system should mostly use Fire markup directly; a `<cc-component>` from a system with no catalogue mapping makes the board refused for export, naming the component. |
| B10 | Logic: `class Board extends BoardLogic(props, tweaks)` with `state`, `values()` (default `{...tweaks, ...props, ...state}`), `setState(update)`, `mounted()`; reserved names `constructor`, `values`, `setState`, `mounted` | a `LitElement` (light DOM) that holds `logic = new Board(props, tweaks)`; `setState` calls `requestUpdate()`; `mounted()` runs in `firstUpdated` | `useBoard(Board, props, tweaks)`: the instance lives in `useRef`, and `setState` bumps a counter; `mounted()` runs in `useEffect([])` | `useBoard` with a `shallowRef` version; `mounted()` runs in `onMounted` | R, confirmed by Facet |
| B11 | Sample data: only the literal initial `state` object | moved to `<Name>.sample.(ts\|js)` and imported as the starting state, so a product replaces one file. Literals computed inside `values()` are logic and stay in the view. When `state` is not a literal object the exporter refuses the board rather than guessing. | same | same | R, confirmed by Facet |
| B12 | Tweaks: `data-tweaks` on the logic script | component props with the tweak defaults, except `$size` (the board's frame size, not a prop) | same | same | R, confirmed by Facet |
| B13 | `<cc-head>` styles and links (Facet's runtime hoists them into the document head) | Dropped. Fire's CSS and the theme record style the screen; a board with its own `<cc-head>` CSS is refused for export, with the reason, and Facet warns about such styles on a contract system. | | | R, confirmed by Facet |

`v` is the result of `logic.values()` for this render (a local `const v` in React and Lit). Vue templates read the
values directly, as the setup returns them. A hole path `a.b` is written as `a?.b`. This differs from the board's
`readKey` only for inherited properties, which board data does not use.

## 16. What `render-equal` must normalise for these rules to hold

| Id | Normalisation | Comes from |
|---|---|---|
| R1 | Ignore comments, including the markers React, Vue and Lit leave (`<!-- -->`, `<!--[-->`, `<!--?lit$…$-->`). | T4 |
| R2 | Text outside `<pre>` and `<textarea>`: collapse runs of whitespace to one space, and treat whitespace-only text between block or flex children as absent. | T1 |
| R3 | Compare attributes as a set, not in order. Names are compared in lowercase. | F5, A15 |
| R4 | Compare `class` as a set of tokens. | I2 |
| R5 | Compare form state through properties (`value`, `checked`, `selected`, `open`), not through the `value` or `checked` attributes or a textarea's text child. | F1–F4 |
| R6 | Ignore `autofocus`. | A3 |
| R7 | `data-fd-vars` is gone once Fire has run. Compare the custom properties it set, through computed styles. | A14 |
| R8 | Ignore `#fd-icon-sprite` (where it sits and whether it is `hidden`), and the framework's root and wrapper elements. | I2, N8 |
| R9 | Ids that Fire generates (`core.js` `id()`: `fd-area-d`, `fd-dialog-title-a`, an `fd-` prefix and a base-36 counter), ids that only `url(#…)` or `href="#…"` inside the same `<svg>` reference, and the frameworks' generated ids: renamed in the document order of the elements that carry them, with every reference (`for`, `aria-controls`, `aria-labelledby`, `aria-describedby` and the other id lists, `popovertarget`, `href="#…"`, `url(#…)` in attributes and computed styles). The element pointed to is compared, not the id string. | O1 |
| R10 | SVG geometry: `x`, `y`, `width`, `height`, `cx`, `cy`, `r`, `rx`, `ry`, `x1`…`y2` and the numbers in `d`, `points`, `transform` and `viewBox` are equal within 0.5 px (a chart redrawn at a plot a fraction of a pixel wider). | charts |
| R11 | Margins count only when the two boxes (relative to the root) differ by more than 0.5 px. Chromium can report a stale computed `auto` margin after a late layout change while the box is in place. | Vue starter |
| R12 | `--transparent <selector>` (repeatable) treats matching elements as wrappers, inside Fire nodes too: a component's host element. | L6 |
| R13 | Capture a settled page: wait until there has been no DOM mutation, no change of the root's box and no pending timeout of 2 s or less for 400 ms (up to the ready timeout), so a chart redrawn after load or a skeleton swapped at 600 ms is captured in its final state on both sides. Wait only for Fire's own (`fd-`) elements to be defined: a framework's (Next's `next-route-announcer`) may never be. The page's Content Security Policy is bypassed for the capture (the freeze stylesheet is inline); the policy is checked by the starters' own browser pass. | starters |
| R14 | Ignore React's view-transition bookkeeping attributes (`vt-*`: `vt-name`, `vt-update`, `vt-enter`, `vt-exit`, `vt-share`). React 19.3's `<ViewTransition>` writes them into the server HTML and adds no element; they are not Fire markup. | Next starter |
| R15 | The pixel shot is of the root alone: for the shot only, on both sides, every element that is neither the root, inside it, nor one of its ancestors (the fixed phone tab bar, the support button, a toast) is made `visibility: hidden` and restored afterwards; layout is untouched and the root's own fixed or sticky descendants stay. The comparison is of the root; the shell around it belongs to the product. Structure and computed style are unchanged. | starters |

## 17. Pages: surface, tab bar, states and websites (0.8)

These are about a page, not an attribute. They add no new way of writing markup: each says which of the rules above
applies.

| Id | Rule | Lit | React | Vue | Check |
|---|---|---|---|---|---|
| W1 | **Surface.** `data-fd-surface="app|website|phone|email"` on `<html>`, or on one element, is an ordinary `data-*` attribute with a value (A9). Fire has no script for it; the markup lint reads it and warns `surface-mismatch` for a part whose card does not list it. Run the lint with `--surface app` for files that declare none. | in `index.html` | a static prop on `<html>` in the root layout, beside `suppressHydrationWarning` (N3) | in `index.html` | starters |
| W2 | **Phone tab bar.** `nav.fd-tabbar` is a direct child of `.fd-app` and holds `a.fd-tabbar-item` with an icon and `fd-tabbar-label`; the last item may be a "More" button: `button.fd-tabbar-item[data-fd-mobile-nav][aria-controls][aria-expanded="false"]`. The router link sets `aria-current="page"`; `aria-expanded` is Fire's (O1). An icon that comes from data is an `fd-icon` (I1). | `data-fd-mobile-nav` | `data-fd-mobile-nav=""` (A7) | `data-fd-mobile-nav` | starters |
| W3 | **A screen's states** (loading, empty, error, no results) are blocks of markup. The framework chooses one from a typed state that it reads from the address (`?state=`); it does not run the template's inline demo script, which is a specimen. `fd-states` is the Fire form: `data-state` shows the child with the matching `data-when`; `data-state` is Fire's (O1), so write the first value, change it with `setState()`, or remount with a `key`. | the route's `PageState` selects the template | `searchParams` on the server page selects the blocks | the route's query selects them with `v-if` | starters: each check opens the empty, error and no-results views and asserts which block shows |
| W4 | **Website sections are plain markup**: `section.fd-site-section.fd-site-<type>` with one `.fd-site-container`, inside `.fd-site`; `data-layout`, `data-ground` and the rest are ordinary `data-*` attributes. There is no element for a section. What Fire changes in a section is the O2 rows for the listing, the logo strip, `.fd-brand` and the picture frame, and the sign-up form's `data-state` (O1), and after hydration it inserts one `span[data-fd-site-sentinel]` at the start of `.fd-site` (the header's scrolled state). Every `<img>` inside `.fd-site` carries `alt`, `width` and `height` (the lint warns `img-attrs`). Call `init(root)` after rendering one (L1, L2). | as the rules above | same | same | R. No starter builds a site: these are read from `fire/js/site.js`, not run in a framework. |

## 18. Verified, and left to the starters

- **Confirmed from `contract/custom-elements.json`**: the `fd-icon` and `fd-chart` attribute names (I1, C2).
- **Verified by experiment** (E1–E12): every rule in sections 1–6 and 8; C1–C6 and C8; L1, L2, L3 (Next), L5; O1;
  O2 for icons, secrets, tabs and keyed remounts; O3's React and Vue behaviour; N1–N6; P1, and P3 in production; X2 in
  Next; the sprite marked `hidden`.
- **Read from source, not run** (R): M7–M9, the rest of O2 (including the 0.8 rows), L4, L6, L7, W4, X1, B1–B13
  (Facet's runtime).
- **Exercised by the starters since 0.8**: W1 (the lint runs with `--surface app`), W2 (the tab bar is in each shell and
  in the render-equal comparison; the Lit check presses More), W3 (the `?state=` checks) and R14 and R15 (the Next
  starter and the pixel shots). L8 is in all three starters, but no check asserts the motion; it was seen in Chromium.
- **Assumptions the starters must prove** [A]:
  - C7, the typing.
  - L3 for Lit and Vue routers.
  - L6 inside a shadow root.
  - N2's `next/script` claim.
  - N7, N8.
  - H1–H4: the theme files and CSS order. These wait on `theme.js`.
  - P2, and P3's development policy.
  - V5.
  - Vue with server rendering (Nuxt) is out of scope. `@vue/server-renderer` writes nothing for `v-text` on
    `<component is="script">` and escapes quotes inside script text [E6]. Such pages should use element properties for data.
