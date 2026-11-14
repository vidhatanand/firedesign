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
