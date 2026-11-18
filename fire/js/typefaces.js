/* Fire typefaces — the type sets the Tweaks panel offers, and the type set spec a theme record may write.
 *
 * The twelve named sets are defined here as specs (the same shape a theme record's `type` takes); the styles in
 * fire/typefaces.css ([data-type="name"]) and the catalogue module fire/js/fonts.js are GENERATED from them and from
 * contract/fonts.json by scripts/build-typefaces.mjs. Edit a set here, run `node scripts/build-typefaces.mjs`, and the
 * CSS follows.
 *
 * The type set spec (the theme record's `type`, besides a set's name):
 *   { display?, sans?, mono?,                      families from the catalogue, contract/fonts.json
 *     displayWeight?,                              100…900, inside the display family's weights
 *     displayTracking?,                            -0.1…0.3, in em, for every heading level
 *     headingCase?: "sentence" | "upper",          upper → data-heading-case="upper"
 *     figures?: "proportional" | "tabular" }       tabular → data-figures="tabular"
 *   Pairing rules (checkTypeSpec): at most two families plus a mono; an interface (sans) family has an x-height ratio
 *   of at least INTERFACE_MIN_XHEIGHT (0.5); a family marked display-only cannot be the interface face; the mono is a
 *   mono. A family that is not in the catalogue is allowed (a licensed face), with a note: Fire cannot check it.
 *
 * API
 *   DEFAULT_TYPEFACE, TYPEFACES, getTypeface(name)     the named sets, in display order
 *   TYPE_SPEC_KEYS                                     the keys a spec may have
 *   FONT_FAMILIES, INTERFACE_MIN_XHEIGHT, VOICES       the catalogue (generated: fire/js/fonts.js)
 *   getFamily(name)                                    a catalogue entry, or undefined
 *   fontStack(family, voice)                           the CSS stack: "Family", "Family Fallback", system-ui, …
 *   fallbackFace(family)                               the @font-face of its metric-matched fallback, or null
 *   checkTypeSpec(spec, { path, legacy })              → { errors, notes } (legacy: rules a built-in set is excused)
 *   typeSpecTokens(spec)                               → { tokens, attributes, faces } for a spec
 */
import { FONT_FAMILIES, FONT_STACKS, INTERFACE_MIN_XHEIGHT, VOICES } from './fonts.js';

export { FONT_FAMILIES, INTERFACE_MIN_XHEIGHT, VOICES };
export const DEFAULT_TYPEFACE = 'geist';

/* The heading sizes a wide or condensed face needs so it reads like the default at the same step: [size, line height]. */
const STEP_UP = { display: ['3.25rem', '3.25rem'], h1: ['2.5rem', '2.5rem'], h2: ['1.875rem', '2rem'], h3: ['1.5rem', '1.75rem'] };
const STEP_ROOM = { display: ['2.75rem', '3rem'], h1: ['2.25rem', '2.5rem'], h2: ['1.75rem', '2rem'], h3: ['1.375rem', '1.75rem'] };
const STEP_DOWN = { display: ['2rem', '2.5rem'], h1: ['1.625rem', '2.125rem'], h2: ['1.25rem', '1.75rem'], h3: ['1.0625rem', '1.5rem'] };

/* name, label, note: what the Tweaks panel shows. spec: the type set spec. sizes: heading sizes with the comment the
   CSS gives them. legacy: the pairing rules this built-in set was drawn before and is excused. */
export const TYPEFACES = [
  { name: 'geist', label: 'Geist', note: 'Neutral and precise. The default.',
    spec: { display: 'Geist', sans: 'Geist', mono: 'Geist Mono' } },
  { name: 'grotesk', label: 'Grotesk', note: 'Quirky and technical: Space Grotesk with Space Mono.',
    spec: { display: 'Space Grotesk', sans: 'Space Grotesk', mono: 'Space Mono', displayWeight: 500, displayTracking: -0.03 }, legacy: ['interface-x-height'] },
  { name: 'editorial', label: 'Editorial', note: 'A soft, old-style serif for headings over a crisp sans.',
    spec: { display: 'Fraunces', sans: 'Instrument Sans', mono: 'Geist Mono', displayWeight: 500, displayTracking: -0.02 } },
  { name: 'book', label: 'Book', note: 'Serif throughout, like a well-set page.',
    spec: { display: 'Newsreader', sans: 'Newsreader', mono: 'Geist Mono', displayWeight: 500, displayTracking: -0.015 }, legacy: ['interface-x-height'] },
  { name: 'atelier', label: 'Atelier', note: 'Bricolage Grotesque: hand-cut, characterful, a little odd.',
    spec: { display: 'Bricolage Grotesque', sans: 'Bricolage Grotesque', mono: 'Geist Mono', displayWeight: 600, displayTracking: -0.03 } },
  { name: 'poster', label: 'Poster', note: 'Tall, condensed, heavy headings, like a billboard.',
    spec: { display: 'Big Shoulders Display', sans: 'Archivo', mono: 'Geist Mono', displayWeight: 800, displayTracking: 0 },
    sizes: STEP_UP, sizesNote: 'A condensed face reads a size smaller, so headings step up.' },
  { name: 'terminal', label: 'Terminal', note: 'Everything in JetBrains Mono.',
    spec: { display: 'JetBrains Mono', sans: 'JetBrains Mono', mono: 'JetBrains Mono', displayWeight: 500, displayTracking: -0.04 } },
  { name: 'pixel', label: 'Pixel', note: 'Bitmap headings over a mono interface.',
    spec: { display: 'Pixelify Sans', sans: 'Geist Mono', mono: 'Geist Mono', displayWeight: 500, displayTracking: 0 } },
  { name: 'matrix', label: 'Matrix', note: 'Dot-matrix headings, like a departure board.',
    spec: { display: 'Doto', sans: 'Geist', mono: 'Geist Mono', displayWeight: 800, displayTracking: 0 },
    sizes: STEP_ROOM, sizesNote: 'Dots need room to read as letters.' },
  { name: 'cyber', label: 'Cyber', note: 'Squared, sci-fi lettering: Oxanium.',
    spec: { display: 'Oxanium', sans: 'Oxanium', mono: 'JetBrains Mono', displayWeight: 600, displayTracking: 0 } },
  { name: 'loud', label: 'Loud', note: 'Wide, rounded, unmissable headings: Unbounded.',
    spec: { display: 'Unbounded', sans: 'Manrope', mono: 'Geist Mono', displayWeight: 600, displayTracking: -0.03 },
    sizes: STEP_DOWN, sizesNote: 'A wide face reads a size larger, so headings step down.' },
  { name: 'gallery', label: 'Gallery', note: 'Art-house: Syne headings, DM Sans and DM Mono.',
    spec: { display: 'Syne', sans: 'DM Sans', mono: 'DM Mono', displayWeight: 700, displayTracking: -0.03 } },
].map((t) => ({ ...t, display: t.spec.display, sans: t.spec.sans, mono: t.spec.mono }));
export const getTypeface = (name) => TYPEFACES.find((t) => t.name === name) ?? TYPEFACES[0];

/* ==========================================================================
   The catalogue and the spec
   ========================================================================== */

export const TYPE_SPEC_KEYS = Object.freeze(['display', 'sans', 'mono', 'displayWeight', 'displayTracking', 'headingCase', 'figures']);
const VOICE_KEYS = Object.freeze({ display: '--fd-font-display', sans: '--fd-font-sans', mono: '--fd-font-mono' });
const TRACKING_RANGE = [-0.1, 0.3];
const WEIGHT_RANGE = [100, 900];
const HEADING_CASES = ['sentence', 'upper'];
const FIGURES = ['proportional', 'tabular'];
const HEADING_LEVELS = ['display', 'h1', 'h2', 'h3'];
/* A family name, quoted in CSS: letters, digits, spaces and . _ & + ' - (no quotes, slashes or braces). */
export const FAMILY = /^[\p{L}\p{N}][\p{L}\p{N} '._&+-]{0,63}$/u;

export const getFamily = (name) => (Object.hasOwn(FONT_FAMILIES, name) ? FONT_FAMILIES[name] : undefined);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const q = (v) => JSON.stringify(v);
const list = (a) => a.map(q).join(', ');
const names = (role) => Object.keys(FONT_FAMILIES).filter((n) => FONT_FAMILIES[n].roles.includes(role));

/** The CSS stack for a family: its metric-matched fallback face (if the catalogue has one), then the system stack its
 *  kind needs. A family the catalogue does not know gets the stack of the voice it is used for. */
export function fontStack(family, voice = 'sans') {
  const f = getFamily(family);
  if (!f) return `"${family}", ${voice === 'mono' ? FONT_STACKS.mono : FONT_STACKS.sans}`;
  return `"${family}", ${f.core ? '' : `"${family} Fallback", `}${FONT_STACKS[f.stack]}`;
}

/** The @font-face of a family's fallback: a local system font made to occupy the web font's space. null for a family
 *  the catalogue does not know, and for Geist and Geist Mono (tokens.css declares them and gives them no fallback). */
export function fallbackFace(family) {
  const f = getFamily(family);
  if (!f || f.core) return null;
  const k = f.fallback;
  return `@font-face { font-family: "${family} Fallback"; src: local("${k.local}"); size-adjust: ${k.size}%; ascent-override: ${k.ascent}%; descent-override: ${k.descent}%; line-gap-override: ${k.gap}%; }`;
}

/** Check a type set spec: its shape, then the pairing rules for the families the catalogue knows. `legacy` lists the
 *  rules a built-in set is excused ('interface-x-height'). → { errors, notes }, paths starting at `path`. */
export function checkTypeSpec(spec, { path: P = '/type', legacy = [] } = {}) {
  const errors = [];
  const notes = [];
  if (!isObj(spec)) { errors.push(`${P}: must be a type set name or { display, sans, mono } families`); return { errors, notes }; }
  for (const k of Object.keys(spec)) if (!TYPE_SPEC_KEYS.includes(k)) errors.push(`${P}/${k}: unknown field (one of ${TYPE_SPEC_KEYS.join(', ')})`);
  const slots = Object.keys(VOICE_KEYS).filter((k) => spec[k] !== undefined);
  if (!slots.length) errors.push(`${P}: name at least one of display, sans, mono`);
  for (const k of slots) if (typeof spec[k] !== 'string' || !FAMILY.test(spec[k])) errors.push(`${P}/${k}: must be a font family name (letters, digits, spaces and . _ & + ' -, up to 64)`);
  const valid = (k) => typeof spec[k] === 'string' && FAMILY.test(spec[k]);

  // The pairing rules, for the families the catalogue knows.
  if (valid('display')) {
    const f = getFamily(spec.display);
    if (f && !f.roles.includes('display')) errors.push(`${P}/display: ${q(spec.display)} is not a heading face in the catalogue (its roles: ${f.roles.join(', ')})`);
  }
  if (valid('sans')) {
    const f = getFamily(spec.sans);
    if (f && !f.roles.includes('interface')) {
      const advice = `interface faces include ${names('interface').filter((n) => !FONT_FAMILIES[n].roles.includes('mono')).slice(0, 6).join(', ')}`;
      if (f.displayOnly) errors.push(`${P}/sans: ${q(spec.sans)} is marked display-only, so it cannot be the interface face (use it as display; ${advice})`);
      else if (f.metrics.xHeightRatio < INTERFACE_MIN_XHEIGHT) {
        if (!legacy.includes('interface-x-height')) errors.push(`${P}/sans: ${q(spec.sans)} has an x-height ratio of ${f.metrics.xHeightRatio}; an interface face needs at least ${INTERFACE_MIN_XHEIGHT} to stay legible at 13 and 14px (use it as display; ${advice})`);
      } else errors.push(`${P}/sans: ${q(spec.sans)} is not an interface face in the catalogue (its roles: ${f.roles.join(', ')})`);
    }
  }
  if (valid('mono')) {
    const f = getFamily(spec.mono);
    if (f && !f.roles.includes('mono')) errors.push(`${P}/mono: ${q(spec.mono)} is not a mono face (monos: ${names('mono').join(', ')})`);
  }
  // At most two families plus a mono: the families other than the mono slot's own are display and sans.
  if (new Set(['display', 'sans'].filter(valid).map((k) => spec[k])).size > 2) errors.push(`${P}: at most two families plus a mono`);

  if (spec.displayWeight !== undefined) {
    const w = spec.displayWeight;
    if (!Number.isInteger(w) || w < WEIGHT_RANGE[0] || w > WEIGHT_RANGE[1]) errors.push(`${P}/displayWeight: must be a whole number from ${WEIGHT_RANGE[0]} to ${WEIGHT_RANGE[1]}`);
    else if (valid('display')) {
      const f = getFamily(spec.display);
      if (f && f.variable && (w < f.weightRange[0] || w > f.weightRange[1])) errors.push(`${P}/displayWeight: ${q(spec.display)} spans ${f.weightRange[0]} to ${f.weightRange[1]}, not ${w}`);
      if (f && !f.variable && !f.weights.includes(w)) errors.push(`${P}/displayWeight: ${q(spec.display)} has only the weights ${f.weights.join(', ')}, not ${w}`);
    }
  }
  const t = spec.displayTracking;
  if (t !== undefined && !(typeof t === 'number' && Number.isFinite(t) && t >= TRACKING_RANGE[0] && t <= TRACKING_RANGE[1])) errors.push(`${P}/displayTracking: must be a number of em from ${TRACKING_RANGE[0]} to ${TRACKING_RANGE[1]}`);
  if (spec.headingCase !== undefined && !HEADING_CASES.includes(spec.headingCase)) errors.push(`${P}/headingCase: must be one of ${list(HEADING_CASES)}`);
  if (spec.figures !== undefined && !FIGURES.includes(spec.figures)) errors.push(`${P}/figures: must be one of ${list(FIGURES)}`);

  // What the page must load: the families Fire does not ship itself; and a note for each family it cannot check.
  const used = [...new Set(slots.filter(valid).map((k) => spec[k]))];
  const unknown = used.filter((n) => !getFamily(n));
  const toLoad = used.filter((n) => !getFamily(n)?.shipped);
  if (toLoad.length) notes.push(`The page must load ${toLoad.join(', ')} (an @font-face for each${toLoad.some((n) => getFamily(n)) ? '; node scripts/fonts.mjs add "<family>" fetches a catalogue family\'s files' : ''}): Fire ships only the families of its type sets.`);
  if (unknown.length) notes.push(`${unknown.join(', ')} ${unknown.length > 1 ? 'are' : 'is'} not in the font catalogue (contract/fonts.json): Fire cannot check the pairing or match a fallback to ${unknown.length > 1 ? 'them' : 'it'}.`);
  return { errors, notes };
}

/** A valid spec → the font and heading tokens, the attributes and the fallback @font-face rules it needs. A key left
 *  out writes nothing, so the default (or the set around it) stays. */
export function typeSpecTokens(spec) {
  const tokens = {};
  const attributes = {};
  const faces = [];
  for (const [voice, token] of Object.entries(VOICE_KEYS)) {
    if (!spec[voice]) continue;
    tokens[token] = fontStack(spec[voice], voice);
    const face = fallbackFace(spec[voice]);
    if (face && !faces.includes(face)) faces.push(face);
  }
  if (spec.displayWeight !== undefined) tokens['--fd-weight-display'] = String(spec.displayWeight);
  if (spec.displayTracking !== undefined) for (const l of HEADING_LEVELS) tokens[`--fd-ls-${l}`] = `${spec.displayTracking + 0}em`;
  if (spec.headingCase === 'upper') attributes['data-heading-case'] = 'upper';
  if (spec.figures === 'tabular') attributes['data-figures'] = 'tabular';
  return { tokens, attributes, faces };
}
