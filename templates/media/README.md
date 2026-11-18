# Placeholder pictures

Ten photographs generated as placeholders for Fire's website templates and docs specimens. They are not Fire's art
and not a product's: replace them with your product's own pictures. They are calm, low in saturation and free of
people, text and logos, with a large quiet area for a headline, so they show how a picture behaves in a section
under each look (natural, mono, duotone, wash) and behind text (the image ground).

| File | Pixels | Shape | What it shows |
|---|---|---|---|
| `coast.jpg` | 1536 × 1024 | 3:2 | a shoreline from above, water meeting pale sand on a diagonal |
| `concrete.jpg` | 1536 × 1024 | 3:2 | a board-formed concrete wall with a hard raking shadow at the end |
| `desk.jpg` | 1536 × 1024 | 3:2 | a notebook, a pencil and a cup on a desk by a window, at the end |
| `field.jpg` | 1536 × 1024 | 3:2 | ploughed farmland from above, parallel lines |
| `fog.jpg` | 1536 × 1024 | 3:2 | a line of poles going into fog |
| `paper.jpg` | 1536 × 1024 | 3:2 | stacked paper sheets seen edge-on, shallow focus |
| `ridge.jpg` | 1536 × 1024 | 3:2 | a mountain ridge in haze under a large empty sky |
| `leaves.jpg` | 1024 × 1536 | 2:3 | a branch of leaves against a plain wall |
| `stair.jpg` | 1024 × 1536 | 2:3 | a concrete stairwell seen from below, light from above |
| `stone.jpg` | 1254 × 1254 | 1:1 | layered rock strata, close |

## How they are referenced

- Templates (`templates/*.html`): `./media/<name>.jpg`. Docs specimens (`docs/*.html`): `../templates/media/<name>.jpg`.
- Every `<img>` carries `alt` (empty for a backdrop, which is decoration), and the picture's own `width` and
  `height`, so the browser reserves its place before it loads; `fd-site-media[data-ratio]` crops it to the section's
  shape. `fire/` holds no pictures, and nothing in `fire/` refers to this folder.
- Each file is a JPEG under 450 KB, at the size it was generated. When you replace one, keep it at least 1440 pixels
  on its long side for a backdrop, and set `width` and `height` to its new size.
