# Fire

A design system for developer, agent and AI products: consoles, playgrounds, catalogs, logs, billing and chat-style agent screens. Plain CSS and small ES modules, no framework and no build step.

```bash
npm run dev
```

Then open http://127.0.0.1:4747/docs/index.html. The docs are live: every specimen is the real component, with a "Markup" view to copy from, and switches for theme, accent and density in the top bar.

## What is here

| Path | What |
|---|---|
| `fire/tokens.css` | Every value: the ink ladder, surfaces, accent, status tones, type, space, radius, shadows, motion, layout. Light and dark through `light-dark()`. |
| `fire/base.css` | Reset, type roles, links, focus, icons, layout and motion primitives. |
| `fire/components/*.css` | One file per family: button, shell, nav, forms, overlays, data, content, charts, code, agent, texture, skeleton. |
| `fire/js/*.js` | Behaviour per family as ES modules, plus `core.js` (shared helpers) and `icons.js` (a Lucide subset). |
| `fire/fire.css`, `fire/fire.js` | Everything in one import each. |
| `docs/` | The documentation site. Start at `docs/index.html`. |
| `templates/` | Sixteen full screens for a fictional product, Ember, built only from Fire components. Start at `templates/index.html`. |
| `DESIGN.md` | The contract: the eight rules, tokens, naming, interaction rules, JS conventions, the quality bar. Read it before adding anything. |
| `scripts/` | `serve.py` (dev server), `audit.mjs` (checks icons, tokens, class names, ids, links), `build-icons.mjs` (regenerates the icon set). |

## Use it

```html
<link rel="stylesheet" href="fire/fire.css">
<script type="module" src="fire/fire.js"></script>

<button class="fd-btn" data-variant="primary">
  <i data-icon="plus"></i><span>New monitor</span>
</button>
```

- Theme: `data-theme="light|dark"` on `<html>` or any subtree; omit it to follow the system.
- Accent: `data-accent="ember|volt|iris|ocean|forest|ink"`.
- Density: `data-density="compact"`.
- From script: `import { setTheme, setAccent, setDensity, toast, init } from './fire/fire.js'`. Call `init(root)` after inserting markup.

Serve the folder over HTTP; ES modules do not load from `file://`.

## Families

Buttons · Forms · Navigation · App shell · Overlays · Tables and data · Cards and feedback · Charts · Code and logs · Agent and AI · Texture and frame · Skeletons and loading. Each has a page in `docs/` showing every variant, size and state.

## Checks

```bash
npm run audit
```

## Credits

The interface face is Geist and the mono face is Geist Mono, both under the SIL Open Font License (licence in `fire/fonts/`). `fire/fonts/README.md` explains the choice and how to swap in a licensed face. Icons are a subset of Lucide, ISC License (`fire/LICENSE-lucide.txt`). The interaction patterns were studied from well-made developer consoles; no third-party brand assets, names or artwork are included.
