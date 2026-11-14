# Reference measurements

Computed styles read from the reference app at 1452px wide on 2026-11-14. Fire's tokens and components are set to these
values. Sizes are `font-size / line-height`, `w` is weight, colours are the ink (#262626) at an opacity.

## Type roles
| Role | Size | Weight | Tracking | Colour |
|---|---|---|---|---|
| Page hero title | 40 / 44 | 500 | -0.4px | ink |
| Hero description | 16 / 24 | 400 | 0 | 72% |
| Screen title without hero (catalog, agent) | 32 / 36 | 500 | -0.32px | ink |
| Section title | 20 / 28 | 450 | -0.1px | ink |
| Card or group title, empty-state title | 16 / 24 | 450 | 0 | ink |
| Row title, button, filter label | 14 / 20 | 450 | 0 | ink |
| Body | 14 / 20 | 400 | 0.14px | ink |
| Description under a title | 13 / 20 | 400 | 0 | 72% (some 64%, 56%) |
| Meta, counts, page info | 13 / 20 | 400 | 0 | 56% |
| Faint sub-line | 13 / 20 | 400 | 0 | 48% or 40% |
| Sidebar item | 13 / 20 | 400 | 0 | 72%; icon 15px at 56% |
| Sidebar section label | 11 / 16.5, uppercase | 500 | 0.55px | black 24% |
| "NEW" tag | 9 / 13.5, uppercase | 500 | 0.025em | white on accent |
| Segmented item, tab, chip | 13 / 20 | 450 (chip 400, active 500) | 0 | 56% resting, ink selected |
| Stat figure | 24 / 32 | 500 | -0.24px | ink |
| Stat label | mono 12 / 16 uppercase, or sans 14 / 20 | 400 | 0 | 56% |
| Table header | mono 12 / 16 uppercase | 400 | 0.72px | 48% |
| Mono small (keys) | 13 / 20 | 500 | 0 | ink or accent |
| Mono extra small (prices, badges) | 12 / 16 | 400 | 0 | accent or 72% |
| Composer | 15 / 24 | 400 | 0 | placeholder 32% |

Faces: Suisse Int'l (interface) and Geist Mono (mono). Fire uses Geist for the interface; see `fire/fonts/README.md`.
Accent text is the same orange as the fill (#fa5d19).

## Objects
- **Input**: 36 tall, padding 8 × 12, radius 8, white, inside line black 8%. Hover: line 12% and a 2% wash. Focus: accent line 1.25px, no halo.
- **Secondary button / filter**: 36 tall, padding 0 × 12, gap 6–8, radius 10, black 4% → 6% hover → 7% pressed, press scale 0.99.
- **Square icon button**: 40, radius 8, black 4%, icon at 64% → ink on hover.
- **Segmented**: track radius 10, padding 2, black 4% with an inset shadow; item padding 6 × 12 (34 tall), radius 8; selected item white with a faint 1px edge and `0 1px 2px` at 5%.
- **Catalog card**: page-coloured (not white), 1px faint edge, radius 12, padding 20. Tile 40, radius 8. Arrow 16px at 32%. Description 16px below the head. Foot: 14px above a faint line, then 10px. Free-credits pill 20 tall, padding 0 × 8.
  Hover: edge accent 20%, fill accent 4%, arrow moves 2px up-right and turns accent; all over 200ms.
- **Stat tile**: padding 24; label, 12px gap, figure, 8px gap, sub-line. Tiles are joined by hairlines.
- **Sidebar**: item 36 tall, radius 10, 4px apart, press scale 0.98. Credits card radius 12, black 3%, padding 14; its dark button turns accent on hover. Account row 40 tall, radius 12, accent 8% on hover; avatar 28, radius 8.
- **Switch**: 44 × 24, track black 16% off, thumb 20 white with `0 1px 2px` at 5%, 200ms.
- **Composer**: radius 16, 1px black 12%, shadow `0 1px 2px` 3% + `0 8px 24px -12px` 8%.
- **Agent stack on a button**: tiles overlap by 3px and fan out to +3px on hover over 200ms; the label swaps to "Copied" in place.
