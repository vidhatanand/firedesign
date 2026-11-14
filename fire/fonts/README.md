# Fonts

| Role | Face | Licence |
|---|---|---|
| Interface | Geist (variable, 100–900). Fire uses 400 body, 450 labels and controls, 500 headings. | SIL OFL 1.1, `LICENSE-geist.txt` |
| Code, identifiers, eyebrows | Geist Mono (variable, 100–900), the mono face the reference app uses | SIL OFL 1.1, `LICENSE-geist.txt` |

## Why Geist

The look Fire follows was drawn for Suisse Int'l, a commercial face. Twelve open-source faces were measured against it
(Inter, Geist, Hanken Grotesk, Host Grotesk, Instrument Sans, Albert Sans, Schibsted Grotesk, Mona Sans, Onest, Public
Sans, Figtree, DM Sans). Geist is the closest: flat terminals and closed apertures like Suisse, vertical stems of 4.66px
against 4.76px at 40px/500, and line widths within 2%. Display sizes are tracked at -0.02em and 16px reading text at
-0.006em so lines set to the same width as the reference. Inter is about 5% wider; Instrument Sans matches the widths
but has more open, angular letterforms.

## Using a licensed face instead

Put the web font files here, declare them (see `suisse.css` for a ready template), import that file in `fire/fire.css`
after `tokens.css`, and put the family first in `--fd-font-sans`. Every component reads the token. If the new face is
narrower or wider, adjust `--fd-ls-display` and `--fd-ls-lg` in `fire/tokens.css`.

## Type sets

`fire/typefaces.css` adds eleven sets beside the default, chosen for character, not neutrality. Each is one attribute,
`data-type="name"`, and changes the heading, interface and mono faces together. A font file is downloaded only when a
set that uses it is on the page.

| Set | Headings | Interface | Mono |
|---|---|---|---|
| `geist` (default) | Geist | Geist | Geist Mono |
| `grotesk` | Space Grotesk | Space Grotesk | Space Mono |
| `editorial` | Fraunces | Instrument Sans | Geist Mono |
| `book` | Newsreader | Newsreader | Geist Mono |
| `atelier` | Bricolage Grotesque | Bricolage Grotesque | Geist Mono |
| `poster` | Big Shoulders Display | Archivo | Geist Mono |
| `terminal` | JetBrains Mono | JetBrains Mono | JetBrains Mono |
| `pixel` | Pixelify Sans | Geist Mono | Geist Mono |
| `matrix` | Doto | Geist | Geist Mono |
| `cyber` | Oxanium | Oxanium | JetBrains Mono |
| `loud` | Unbounded | Manrope | Geist Mono |
| `gallery` | Syne | DM Sans | DM Mono |

All seventeen added families are under the SIL Open Font License 1.1; each licence is in `licenses/`. The files are the
Latin subsets published by Fontsource (variable where the family has a variable font; Space Mono and DM Mono are static).
Languages outside Latin fall back to the system font.
