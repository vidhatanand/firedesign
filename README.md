# Fire

A design system for developer, agent and AI products: consoles, playgrounds, catalogs, logs, billing, documentation and chat-style agent screens. Plain CSS and small ES modules, with no framework and no build step.

Every value is a variable, so the whole system can be retuned: fifteen palettes, tone controls, twelve type sets, density, corners and motion, live from a Tweaks panel.

## Start

```bash
npm run dev
```

Then open http://127.0.0.1:4747/docs/index.html.

- **Docs** (`/docs/index.html`): every component, live, with a "Markup" view to copy from.
- **Templates** (`/templates/index.html`): 21 full screens for a fictional product, Ember, built only from Fire components.
- **Tweaks**: the button in the top bar of any page. Pick a palette, bend its tone, switch the typeface, change density, corners, contrast, motion and texture. Choices are saved and follow you across pages.

## Read next

| If you are | Read |
|---|---|
| Building a product with Fire | [GUIDE.md](GUIDE.md): adding Fire to a project, building a screen, layout, theming, and what to do when Fire does not have what you need |
| Adding to or changing Fire itself | [DESIGN.md](DESIGN.md): the contract every contribution follows |
| Looking up a class or attribute | [docs/_ref/VOCABULARY.md](docs/_ref/VOCABULARY.md) |
| Asking for a component or an extension | GUIDE.md section 7, then the "Component or extension request" issue template |

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
- Density, contrast, text size: `data-density="compact|spacious"`, `data-contrast="high"`, `data-text-size="sm|lg"`.
- Character: `--fd-radius-scale`, `--fd-space-scale`, `--fd-motion`, `--fd-texture`, `--fd-hairline` and `--fd-font-display` each retune the whole system from one value.

**Layout**

Structure decides width. Place things with `fd-stack`, `fd-row`, `fd-grid` and `fd-column`, tuned by `data-gap`, `data-min`, `data-cols` and `data-span`. Forms, settings rows, tables and dialogs bring their own widths. Markup never sets a width, a height or a pixel value.

**Behaviour**

```js
import { init, setTheme, setDensity, overlays, tweaks } from './fire/fire.js';

init(container);                          // after inserting markup; safe to call again
setTheme('dark');
overlays.toast({ title: 'Key created' });
tweaks.set({ palette: 'midnight', corners: 1.5 });
```

Components report changes with bubbling events: `fd:change`, `fd:select`, `fd:open`, `fd:close`, `fd:submit`, `fd:copy`.

## What is here

| Path | What |
|---|---|
| `fire/` | The system itself; the only folder a product ships. |
| `fire/tokens.css` | Global values: the ink ladder, surfaces, accent, status tones, type, space, sizes, radius, shadows, motion. Light and dark through `light-dark()`. |
| `fire/palettes.css` | Fifteen palettes, generated from `fire/js/palettes.js`. |
| `fire/typefaces.css`, `fire/fonts/` | Twelve type sets and their font files (17 families, SIL Open Font License; licences in `fire/fonts/licenses/`). |
| `fire/base.css` | Reset, type roles, links, focus, icons, layout and motion primitives. |
| `fire/components/*.css` | One file per family. Each declares its own `--fd-<component>-*` values at the top; rules contain no raw sizes or timings. |
| `fire/layout.css` | Layout attributes: `data-gap`, `data-min`, `data-cols`, `data-span`. |
| `fire/js/*.js` | Behaviour per family as ES modules, plus `core.js` (shared helpers), `icons.js` (272 Lucide icons), `palettes.js` (palette data and the tone engine) and `tweaks.js` (the Tweaks panel). |
| `fire/boot.js` | A small plain script for `<head>` that restores the saved theme and tweaks before the first paint. |
| `fire/fire.css`, `fire/fire.js` | Everything in one import each. |
| `docs/` | The documentation site: 17 pages. Start at `docs/index.html`. |
| `templates/` | 21 screens for Ember: the app, sign-in, onboarding, a support page and a documentation site. Start at `templates/index.html`. |
| `scripts/` | `serve.py` (dev server), `audit.mjs` (checks), `build-palettes.mjs` (regenerates and checks the palettes), `build-icons.mjs` (regenerates the icon set), `style-diff.html` (compares computed styles of two builds). |
| `.github/ISSUE_TEMPLATE/` | The component or extension request form. |

## Families

Buttons · Forms · Navigation · App shell · Overlays · Tables and data · Cards and feedback · Charts · Code and logs · Agent and AI · Chat · Documentation · Texture and frame · Skeletons and loading · Theming and tweaks. Each has a page in `docs/` showing every variant, size and state.

## Checks

```bash
npm run audit
```

It reports unknown icons, classes and tokens, broken links and duplicate ids. It also reports raw values in component styles (`literals`) and pixel values or widths in markup (`inline`); both must be zero.

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
