# Fire

A design system for developer, agent and AI products: consoles, playgrounds, catalogs, logs, billing, documentation and chat-style agent screens. Plain CSS and small ES modules, with no framework and no build step.

Every value is a variable, so the whole system can be retuned: fifteen palettes, tone controls, twelve type sets, density, corners and motion, live from a Tweaks panel.

## Start

```bash
npm run dev
```

Then open http://127.0.0.1:4747/docs/index.html.

- **Docs** (`/docs/index.html`): every component, live, with a "Markup" view to copy from.
- **Templates** (`/templates/index.html`): 32 full screens for a fictional product, Ember, built only from Fire components.
- **Tweaks**: the button in the top bar of any page. Pick a palette, bend its tone, switch the typeface, change density, corners, contrast, motion and texture. Choices are saved and follow you across pages.

## Read next

| If you are | Read |
|---|---|
| Building a product with Fire | [GUIDE.md](GUIDE.md): adding Fire to a project, building a screen, layout, theming, and what to do when Fire does not have what you need |
| Writing the words on a screen | [WRITING.md](WRITING.md): how to write labels, buttons, help text, empty states and errors so the interface stays clean and useful |
| Setting up an AI agent to build with Fire | [AGENT-RULES.md](AGENT-RULES.md): the rules, and the three-line pointer for a project's `AGENTS.md` |
| Adding to or changing Fire itself | [DESIGN.md](DESIGN.md): the contract every contribution follows |
| Looking up a class or attribute | [docs/_ref/VOCABULARY.md](docs/_ref/VOCABULARY.md) |
| Updating a product to a newer Fire | [CHANGELOG.md](CHANGELOG.md): what changed in each release and what to check |
| Asking for a component or an extension | GUIDE.md section 7, then the "Component or extension request" issue template |

## What Fire ships

Fire's HTML and CSS are the contract. Everything else is built on them, generated from one source, and checked in CI (`npm run check`).

| Part | Where | What it is for |
|---|---|---|
| Styles and behaviour | `fire/` | Copy it, or depend on `fire-design`. Plain CSS and ES modules, no build needed to use them. |
| Theme record | `fire/js/theme.js`, `contract/theme.schema.json`, `contract/looks/` | A product's whole look as one JSON object: palette, tone, type, dials and signature; `paletteFrom()` makes a palette from an accent or brand colours that passes every contrast rule. |
| Looks: fonts and dials | `contract/fonts.json`, `fire/typefaces.css`, `scripts/fonts.mjs`, `fire/tokens.css` | A catalogue of 53 open-licensed font families and twelve type sets; `fonts.mjs add "<family>"` puts a family in a product. Four structural dials (surfaces, elevation, controls, headings) and the signature dials (texture field, mark, cell, ramp, frame marks, intensity) restyle every component. |
| Email | `fire/email/email.js`, `docs/email.html` | `renderEmail()` writes a transactional email, HTML and text, in the product's look. |
| Contract | `contract/fire-contract.json` | Every global token with its type, tier (input, scale, derived), default and Facet role. |
| Catalogue and cards | `contract/catalog.json`, `contract/cards/` | 163 components, patterns and layouts, and 3 modules, with their classes, allowed values, events and a card each: job, when to use, when not, other names; a card per template in `contract/cards/templates/`. |
| Find | `scripts/find.mjs`, `contract/index.json` | `npx fire find "<what you need>"` ranks the parts by what they are for: 198 entries, no network. What agents search first. |
| Gate | `scripts/gate.mjs`, `contract/fingerprints.json` | Compares every component, pattern and template with its peers and fails a near-duplicate unless a card declares a `relation`. `--probe <page>` checks a candidate. |
| Custom elements | `fire/elements.js` (Lit), `fire/elements.d.ts` | `fd-icon`, `fd-chart`, `fd-code`, `fd-texture` for frameworks; each is its component's root. |
| Types | `fire/fire.d.ts` | Every export of `fire.js`, the `fd:*` events, the theme record. |
| Framework packages | `wrappers/react`, `wrappers/vue` | `fire-design/react` and `fire-design/vue`. |
| Starters | `starters/lit-vite`, `starters/next`, `starters/vue-vite` | Wired apps, each proven to render like Fire's templates in three engines. |
| Export rules | `spec/EXPORT.md`, `spec/export-map.json` | How Fire markup is written in each framework; what an exporter implements. |
| Checks | `scripts/lint-markup.mjs`, `scripts/render-equal.mjs` | Run in any project: lint markup against the catalogue; prove a screen renders like its reference. |
| Facet | `facet/` | Fire as a Facet design system: content, the files to carry, the theme record. |

`spec/ARCHITECTURE.md` explains how the parts fit; [CHANGELOG.md](CHANGELOG.md) says what changed.

## Use it

```html
<script src="fire/boot.js"></script>
<link rel="stylesheet" href="fire/fire.css">
<script type="module" src="fire/fire.js"></script>

<div class="fd-stack fd-column" data-gap="4">
  <div class="fd-field">
    <label class="fd-field-label" for="name">Key name</label>
    <input class="fd-input" id="name" value="production-crawler">
  </div>
  <div class="fd-row" data-justify="end">
    <button class="fd-btn" type="button">Cancel</button>
    <button class="fd-btn" data-variant="primary" type="button">
      <i data-icon="plus"></i><span>Create key</span>
    </button>
  </div>
</div>
```

Serve the folder over HTTP; ES modules do not load from `file://`.

**Look**

- Theme: `data-theme="light|dark"` on `<html>` or any subtree; omit it to follow the system.
- Palette: `data-palette="volt"` recolours neutrals and accent together. Fifteen are included; `ember` is the default and needs no attribute. `data-accent` swaps only the accent.
- Typeface: `data-type="editorial"` changes the heading, interface and mono faces together. Twelve sets are included, all open source; `geist` is the default.
- Structure: `data-surfaces="flat|outlined"`, `data-elevation="none|lifted"`, `data-controls="outlined|filled"`, `data-headings="upper|mono"`. The signature (the generated textures and frame marks) has its own `data-signature-*` dials.
- Density, contrast, text size: `data-density="compact|spacious"`, `data-contrast="high"`, `data-text-size="sm|lg"`.
- Character: `--fd-radius-scale`, `--fd-space-scale`, `--fd-motion`, `--fd-texture`, `--fd-hairline` and `--fd-font-display` each retune the whole system from one value.

**Layout**

Structure decides width. Place things with `fd-stack`, `fd-row`, `fd-grid` and `fd-column`, tuned by `data-gap`, `data-min`, `data-cols` and `data-span`. Forms, settings rows, tables and dialogs bring their own widths. Markup never sets a width, a height, a pixel value or a `style` attribute.

**Behaviour**

```js
import { init, setTheme, setDensity, overlays, tweaks } from './fire/fire.js';

init(container);                          // after inserting markup; safe to call again
setTheme('dark');
overlays.toast({ title: 'Key created' });
tweaks.set({ palette: 'midnight', corners: 1.5 });
```

Components report changes with bubbling events: `fd:change`, `fd:select`, `fd:open`, `fd:close`, `fd:submit`, `fd:copy`, and for decisions `fd:commit`, `fd:hold` and `fd:undo`.

**Pages a server renders**

- `templates/shell-static.html` is the whole app shell as plain markup, with no shell script. Per page the server changes the title, the current nav item and the content.
- `templates/auth-centered.html` is the centred screen (`fd-screen`) for one task on a page of its own: sign in, a second step, consent, a result.
- A one-time-code field works in a plain form: put one named input inside `fd-otp`. Without script it is an ordinary field; with it, the boxes appear and a hidden input carries the code.
- Under a strict Content Security Policy the stylesheets need `style-src 'self'`, `font-src 'self'` and `img-src 'self' data:`. No Fire script or page writes a `style` attribute, so `'unsafe-inline'` is not needed. A custom property is passed as `data-fd-vars="--value: 0.4"`, and `fire/boot.js` applies it before the first paint.

## What is here

| Path | What |
|---|---|
| `GUIDE.md`, `WRITING.md`, `AGENT-RULES.md` | How to build a product with Fire, how to write its interface text, and the rules an AI agent follows. |
| `fire/` | The system itself; the only folder a product ships. |
| `fire/tokens.css` | Global values: the ink ladder, surfaces, accent, status tones, type, space, sizes, radius, shadows, motion. Light and dark through `light-dark()`. |
| `fire/palettes.css` | Fifteen palettes, generated from `fire/js/palettes.js`. |
| `fire/typefaces.css`, `fire/fonts/` | Twelve type sets and their font files (17 families, SIL Open Font License; licences in `fire/fonts/licenses/`). |
| `fire/base.css` | Reset, type roles, links, focus, icons, layout and motion primitives. |
| `fire/components/*.css` | One file per family. Each declares its own `--fd-<component>-*` values at the top; rules contain no raw sizes or timings. |
| `fire/layout.css` | Layout attributes: `data-gap`, `data-min`, `data-cols`, `data-span`. |
| `fire/js/*.js` | Behaviour per family as ES modules, plus `core.js` (shared helpers), `icons.js` (272 Lucide icons), `initial.js` (the first-letter mark, no DOM), `palettes.js` (palette data and the tone engine), `palette-rules.js` (the contrast rules every palette meets), `theme.js` (the theme record) and `tweaks.js` (the Tweaks panel). |
| `fire/email/` | `email.js`: transactional email as HTML and text. |
| `fire/boot.js` | A small plain script for `<head>` that restores the saved theme and tweaks before the first paint. |
| `fire/fire.css`, `fire/fire.js` | Everything in one import each. |
| `docs/` | The documentation site: 22 pages. Start at `docs/index.html`. |
| `templates/` | 32 screens for Ember: the app, a long create form, decisions, settings, an audit log, status pages, a record hub, sign-in (split and centred), onboarding, a support page, a documentation site, and the shell as plain markup. Each state of the newer ones opens with `?state=`. Start at `templates/index.html`. |
| `scripts/` | `serve.py` (dev server), `fire.mjs` (the `fire` command: `find`, `lint`, `render-equal`), `find.mjs` (search the parts), `gate.mjs` (the near-duplicate gate), `fonts.mjs` (add a catalogue font to a product), `audit.mjs` (checks), `build.mjs` (every generator, and `--check`), `build-palettes.mjs` (regenerates the palettes and checks every contrast rule), `build-typefaces.mjs` (type sets from the font catalogue), `build-index.mjs` (the search index), `build-icons.mjs` (regenerates the icon set), `style-diff.html` (compares computed styles of two builds), `test/` (behaviour tests: `node --test scripts/test/*.test.mjs`). |
| `.github/ISSUE_TEMPLATE/` | The component or extension request form. |

## Families

Buttons · Forms · Navigation · App shell · Overlays · Tables and data · Cards and feedback · Decisions · Charts · Code and logs · Agent and AI · Chat · Documentation · Texture and frame · Skeletons and loading · Email · Theming and tweaks. Each has a page in `docs/` showing every variant, size and state.

## Checks

```bash
npm run audit
```

It reports unknown icons, classes and tokens, broken links and duplicate ids. It also reports raw values in component styles (`literals`) and pixel values, widths or `style` attributes in markup (`inline`); both must be zero.

```bash
node scripts/build-palettes.mjs --check
```

It verifies every palette and tone against the contrast rules.

To confirm that a refactor changed nothing visible, keep a copy of the previous commit beside the working tree and compare computed styles page by page:

```bash
mkdir -p .baseline && git archive HEAD | tar -x -C .baseline
```

Then open `/scripts/style-diff.html?base=/.baseline&pages=templates/logs.html,docs/forms.html`.

## Browser support

Fire uses `light-dark()`, `color-mix()`, `@property`, container queries, the Popover API and `<dialog>`. That means current Chrome, Edge, Safari and Firefox. It has been reviewed in Chromium only; Safari and Firefox are untested.

## Credits

The default interface face is Geist and the mono face is Geist Mono; the other type sets use Space Grotesk, Space Mono, Fraunces, Instrument Sans, Newsreader, Bricolage Grotesque, Big Shoulders Display, Archivo, JetBrains Mono, Pixelify Sans, Doto, Oxanium, Unbounded, Manrope, Syne, DM Sans and DM Mono. All are under the SIL Open Font License 1.1 (licences in `fire/fonts/`). `fire/fonts/README.md` explains the choice and how to swap in a licensed face. Icons are a subset of Lucide, ISC License (`fire/LICENSE-lucide.txt`). The interaction patterns were studied from well-made developer consoles; no third-party brand assets, names or artwork are included.
