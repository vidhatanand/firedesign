# Building a template screen

Templates are full Ember app screens assembled ONLY from Fire components. They prove the system and are the starting point people copy.

## Read first
1. `DESIGN.md` (contract) and `docs/_ref/VOCABULARY.md`.
2. `templates/blank.html` and `templates/shell.js` (how a page mounts the shell: `<body data-shell data-active="…">` + your content in `<main>`). `templates/shell-static.html` is the same shell as plain markup, for pages a server renders; `templates/auth-centered.html` is the centred screen for a single task outside the shell.
3. The docs pages are the source of truth for markup. Open the ones you need and copy their markup patterns exactly (class names, parts, data attributes): `docs/shell.html` (frame, bands, page hero, page head, toolbar, split, panels), `docs/navigation.html`, `docs/forms.html`, `docs/overlays.html`, `docs/data.html`, `docs/content.html`, `docs/charts.html`, `docs/code.html`, `docs/agent.html`, `docs/signature.html` (textures), `docs/skeletons.html`, `docs/buttons.html`. When unsure how a component is marked up, grep its class in `fire/components/*.css` and `fire/js/*.js`. Never invent a class that has no CSS.

## Rules
- A template is one HTML file in `templates/`. It links `../fire/fire.css`, loads `../fire/fire.js` and `./shell.js` as modules, and nothing else. No extra CSS files, no CDN, no frameworks.
- No `<style>` blocks and no new classes. Layout comes from the shell primitives (`fd-frame`, `fd-band`, `fd-page-hero`, `fd-page-head`, `fd-toolbar`, `fd-split`, `fd-panel`), base primitives (`fd-stack`, `fd-row`, `fd-grid`, `fd-grow` with `--fd-gap` / `--fd-min` custom properties) and the components. A `style` attribute may set only custom properties or a width/max-width. If something truly cannot be built, say so in your report instead of hacking it.
- Page structure: `fd-frame` wraps everything; each horizontal section is an `fd-band`. Most screens start with an `fd-page-hero` band (display title, one-line description, `terrain` texture in `fd-page-hero-art`) or a compact `fd-page-head`.
- One primary button per screen. Accent stays rare (see DESIGN.md §1).
- Content is for **Ember**, a web-data and agent API: realistic, specific, internally consistent (team "Quarry Labs", user maya@quarry.dev, plan Hobby, 1,520 of 3,000 credits left, resets Nov 23, today is Nov 14 2026; endpoints /search /scrape /interact /parse /crawl /map /extract /agent). No lorem ipsum, no real company logos (letter or glyph tiles), sentence case, mono for identifiers.
- Every screen shows real states, switchable in place where it makes sense: a small page-level inline `<script type="module">` may wire demo behaviour (switch tabs, toggle an empty/loading/loaded state, open a dialog, simulate a run) using Fire's exported APIs (`import { … } from '../fire/fire.js'`). Keep it short and readable.
- Loading: where data would load, include the matching pre-built skeleton and reveal content with `setLoading` (see `docs/skeletons.html`) on first paint for ~600ms, so the screen demonstrates the swap. Respect reduced motion.
- Entrance: give the first bands `class="fd-rise"` with `data-fd-vars="--fd-i:n"` for a short stagger (at most 4 elements).
- Must work at 1440px, 1024px and 375px wide, in light and dark, with the sidebar expanded or collapsed. Nothing may overflow horizontally at 375px: wide tables use `data-stack` or scroll inside their wrap.
- Accessibility: one `<h1>`, headings in order, labels on icon buttons, real `<button>`/`<a>`.
- Do not edit any file except the ones assigned to you. Do not use browser tools; a reviewer checks rendering. Check your HTML is well formed and that every `data-icon` name exists in `fire/js/icons.js`.

## Final report (short)
Files written; what each screen contains; any component gap you hit (something you needed that Fire lacks); anything you are unsure renders correctly.
