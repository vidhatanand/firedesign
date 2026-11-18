/* Fire initial mark — a drawn mark from a name's first letter, for the places a logo is missing.
 *
 * A dot-matrix glyph on a 5×7 grid: lit dots take the current colour, unlit ones stay faint, so the mark reads
 * as a small display. The same name always gives the same glyph and the same tone, so an organisation keeps its
 * mark on every screen. Pure functions, no DOM: import them in a server, a build step or an email template.
 *
 *   initialMark("Quarry Labs")                      → '<svg class="fd-initial" …>' (decorative; colour = currentColor)
 *   initialMark("Quarry Labs", { label: true })     → the same with role="img" and aria-label="Quarry Labs"
 *   initialMark(name, { label: "Quarry" })          → a label of your own
 *   initialRows("Quarry Labs")                      → seven strings of five "0" / "1" cells, for a table-based email
 *   initialTone("Quarry Labs")                      → "accent" | "info" | "violet" | "success" | "warning" | "neutral"
 *   INITIAL_TONES                                   the tones a name can map to, in order
 *
 * In markup the mark is drawn by fire/js/shell.js from data-fd-initial; see components/shell.css.
 *
 * Glyphs: A–Z and 0–9 (accents are dropped: "Élan" draws an E); any other first character draws a diamond.
 * The tone is a hash (FNV-1a) of the lower-cased name over INITIAL_TONES; danger is never used, because red
 * reads as a fault.
 */

// Seven rows to a glyph, one base-32 digit to a row, the five bits of a row read left to right.
const FONT = {
  0: 'ehjlphe', 1: '4c4444e', 2: 'eh1248v', 3: 'v2421he', 4: '26aiv22', 5: 'vgu11he', 6: '68guhhe', 7: 'v124888', 8: 'ehhehhe', 9: 'ehhf12c',
  A: 'ehhvhhh', B: 'uhhuhhu', C: 'ehggghe', D: 'uhhhhhu', E: 'vgguggv', F: 'vgguggg', G: 'ehgnhhf', H: 'hhhvhhh', I: 'e44444e', J: '72222ic',
  K: 'hikokih', L: 'ggggggv', M: 'hrllhhh', N: 'hhpljhh', O: 'ehhhhhe', P: 'uhhuggg', Q: 'ehhhlid', R: 'uhhukih', S: 'fgge11u', T: 'v444444',
  U: 'hhhhhhe', V: 'hhhhha4', W: 'hhhllla', X: 'hha4ahh', Y: 'hhha444', Z: 'v1248gv',
};
const OTHER = '04evve4'; // a diamond, for any other first character

export const INITIAL_TONES = ['accent', 'info', 'violet', 'success', 'warning', 'neutral'];

const clean = (name) => String(name ?? '').normalize('NFD').replace(/\p{M}/gu, '').trim();
/** The character a name is drawn from: its first letter or digit, upper-cased (an empty string for no name). */
export function initialChar(name) {
  const s = clean(name);
  const letter = s.match(/[\p{L}\p{N}]/u);
  return (letter ? letter[0] : s[0] || '').toUpperCase();
}

/** The glyph of a name as seven strings of five "0" / "1" cells. */
export function initialRows(name) {
  const glyph = FONT[initialChar(name)] || OTHER;
  return [...glyph].map((digit) => parseInt(digit, 32).toString(2).padStart(5, '0'));
}

/** A tone for a name: the same name always gives the same one. */
export function initialTone(name) {
  let h = 0x811c9dc5;
  for (const ch of clean(name).toLowerCase()) h = Math.imul(h ^ ch.codePointAt(0), 0x01000193) >>> 0;
  return INITIAL_TONES[h % INITIAL_TONES.length];
}

// Each dot is a circle drawn as two arcs, so a whole mark is two short paths.
const dot = (cx, cy) => `M${(cx - 0.42).toFixed(2)} ${cy}a.42 .42 0 1 0 .84 0a.42 .42 0 1 0-.84 0`;

/** The mark as an SVG string. `label`: true names it after `name`, a string names it that, none leaves it decorative. */
export function initialMark(name, { label } = {}) {
  const lit = [];
  const unlit = [];
  initialRows(name).forEach((row, y) => [...row].forEach((cell, x) => (cell === '1' ? lit : unlit).push(dot(x + 0.5, y + 0.5))));
  const text = label === true ? String(name ?? '').trim() || 'Unnamed' : label;
  const a11y = text ? ` role="img" aria-label="${String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"` : ' aria-hidden="true"';
  return `<svg class="fd-initial" viewBox="-1 0 7 7" fill="currentColor"${a11y}><path opacity=".16" d="${unlit.join('')}"/><path d="${lit.join('')}"/></svg>`;
}
