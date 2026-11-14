# Tokenising brief

Goal: no raw length, time or type metric left in component styles, so the whole system can be retuned from variables
(and from the tweak panel). This is a **value-preserving refactor**: after your change every element must compute to
exactly the same style as before. The lead compares computed styles of every element against the previous build.

## The check
`node scripts/audit.mjs` has a `literals` check. It flags declarations in `fire/components/*.css` and `fire/base.css`
that still contain a raw `px`, `rem`, `ms` or `s` value, a `letter-spacing` in `em`, or a unitless decimal `line-height`.
`0` and relative units (`%`, `em` elsewhere, `ch`, `fr`, `dvh`, `vw`, `deg`, `turn`) are fine. At-rule conditions
(`@media (max-width: 640px)`) cannot use variables and are exempt. Your files must reach **zero** `literals` findings.
See all of them for one file with:

```bash
node scripts/audit.mjs --json | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));(d.findings||d).filter(f=>f.check==='literals'&&f.file.endsWith(process.argv[1])).forEach(f=>console.log(f.line+': '+f.message))" forms.css
```

## Where a value goes
1. **An existing global token, when the meaning matches** (`fire/tokens.css`; read it fully first). Meaning matters more
   than the number:
   - spacing between or around things → `--fd-space-*` (2 `0-5`, 4 `1`, 6 `1-5`, 8 `2`, 10 `2-5`, 12 `3`, 14 `3-5`, 16 `4`, 20 `5`, 24 `6`, 32 `8`, 40 `10`, 48 `12`, 64 `16`, 80 `20`, 96 `24`)
   - a rule, edge, ring or 1px divider → `--fd-hairline`
   - an icon's box → `--fd-icon-xs` 12, `--fd-icon-sm` 14, `--fd-icon` 16, `--fd-icon-lg` 20, `--fd-icon-xl` 24
   - a control's height → `--fd-control-xs|sm|md|lg|xl` (24, 28, 36, 40, 44); a table or list row → `--fd-row`
   - corner radii → `--fd-radius-*` (4, 6, 8, 10, 12, 16, 20, full)
   - type → `--fd-text-*` with the matching `--fd-lh-*`; tracking → `--fd-ls-*`; reading line heights → `--fd-lh-prose`, `--fd-lh-prose-sm`, `--fd-lh-code`
   - transitions → `--fd-dur-1…5`; looping animations → `--fd-loop-spin|shimmer|pulse|blink|dots`; sibling delay → `--fd-stagger`
   - layout → `--fd-sidebar-w`, `--fd-rail-w`, `--fd-topbar-h`, `--fd-panel-w`, `--fd-subnav-w`, `--fd-gutter`, `--fd-content-max`
   Do NOT borrow a token just because the number is equal: a 28px avatar is not `--fd-control-sm` (that shrinks in
   compact density) and a 16px gap is not `--fd-icon`.
2. **Arithmetic on tokens**, when the value is derived: `calc(var(--fd-control-md) - var(--fd-space-1))`, a nested radius
   `calc(var(--fd-radius-lg) - var(--fd-space-0-5))`, a negative `calc(var(--fd-space-2) * -1)`.
3. **A component token**, for everything else. Declare it once in a `:root { … }` block at the top of the component's own
   file, right after the header comment, named `--fd-<component>-<what>` with a short comment, grouped by component:

   ```css
   /* ---------- Tokens ---------- */
   :root {
     /* avatar */
     --fd-avatar-sm: 20px;
     --fd-avatar-md: 28px;      /* default */
     /* dialog */
     --fd-dialog-w-sm: 400px;
     --fd-dialog-w-md: 480px;
   }
   ```
   Rules read the token (`width: var(--fd-avatar-md)`), including where a private property is assigned
   (`--_c-s: var(--fd-avatar-md)`). One token per distinct meaning; reuse it wherever the same thing recurs in that
   family. Prefer a handful of well-named tokens (sizes, widths, max-heights, offsets, timings) over one token per line:
   if ten rules use 2px as "optical nudge", that is one `--fd-<family>-nudge`.
   Type that has no global token (a 10px tile initial, a 12.5px code size) becomes a component token too.
   Two kinds of component token must keep following the global scales, so the tweak panel can retune them:
   - a **corner radius** with no global match: `--fd-code-radius-token: calc(3px * var(--fd-radius-scale));`
   - a **transition or animation duration or delay** with no global match: `--fd-toast-life: calc(4000ms * var(--fd-motion));`
     (looping animations use the `--fd-loop-*` tokens or a plain component token; they do not multiply by `--fd-motion`).
   Sizes, widths, offsets and type sizes are plain values.

## Rules
- Keep every computed value identical. `calc()` must give the same number: `34px` → `calc(var(--fd-control-md) - var(--fd-space-0-5))` is right only if the original really was "control minus 2".
- Do not rename classes, change selectors, reorder rules or touch behaviour. Do not edit `fire/tokens.css`, other families' files, HTML, JS or docs.
- Private custom properties keep their family prefix (`--_f-`, `--_c-`, …; DESIGN.md §3). Values assigned to them are covered by the check too.
- `var(--x, 12px)` fallbacks count as literals: point the fallback at a token.
- Values inside `url("data:…")` are not checked. Leave them.
- Comments stay accurate: update a comment that names a value you replaced.
- When done: `node scripts/audit.mjs` shows 0 `literals` findings for your files and no new findings of other kinds.

## Final report (short)
Per file: findings before → after, the component tokens you added (name = value), and any place where you were unsure the
replacement is value-identical (file:line and why).
