/* Fire typefaces — the type sets the Tweaks panel offers. The styles are in fire/typefaces.css
 * ([data-type="name"]); this is the list, in display order, with the family each voice uses. */
export const DEFAULT_TYPEFACE = 'geist';
export const TYPEFACES = [
  { name: 'geist', label: 'Geist', note: 'Neutral and precise. The default.', display: 'Geist', sans: 'Geist', mono: 'Geist Mono' },
  { name: 'grotesk', label: 'Grotesk', note: 'Quirky and technical: Space Grotesk with Space Mono.', display: 'Space Grotesk', sans: 'Space Grotesk', mono: 'Space Mono' },
  { name: 'editorial', label: 'Editorial', note: 'A soft, old-style serif for headings over a crisp sans.', display: 'Fraunces', sans: 'Instrument Sans', mono: 'Geist Mono' },
  { name: 'book', label: 'Book', note: 'Serif throughout, like a well-set page.', display: 'Newsreader', sans: 'Newsreader', mono: 'Geist Mono' },
  { name: 'atelier', label: 'Atelier', note: 'Bricolage Grotesque: hand-cut, characterful, a little odd.', display: 'Bricolage Grotesque', sans: 'Bricolage Grotesque', mono: 'Geist Mono' },
  { name: 'poster', label: 'Poster', note: 'Tall, condensed, heavy headings, like a billboard.', display: 'Big Shoulders Display', sans: 'Archivo', mono: 'Geist Mono' },
  { name: 'terminal', label: 'Terminal', note: 'Everything in JetBrains Mono.', display: 'JetBrains Mono', sans: 'JetBrains Mono', mono: 'JetBrains Mono' },
  { name: 'pixel', label: 'Pixel', note: 'Bitmap headings over a mono interface.', display: 'Pixelify Sans', sans: 'Geist Mono', mono: 'Geist Mono' },
  { name: 'matrix', label: 'Matrix', note: 'Dot-matrix headings, like a departure board.', display: 'Doto', sans: 'Geist', mono: 'Geist Mono' },
  { name: 'cyber', label: 'Cyber', note: 'Squared, sci-fi lettering: Oxanium.', display: 'Oxanium', sans: 'Oxanium', mono: 'JetBrains Mono' },
  { name: 'loud', label: 'Loud', note: 'Wide, rounded, unmissable headings: Unbounded.', display: 'Unbounded', sans: 'Manrope', mono: 'Geist Mono' },
  { name: 'gallery', label: 'Gallery', note: 'Art-house: Syne headings, DM Sans and DM Mono.', display: 'Syne', sans: 'DM Sans', mono: 'DM Mono' },
];
export const getTypeface = (name) => TYPEFACES.find((t) => t.name === name) ?? TYPEFACES[0];
