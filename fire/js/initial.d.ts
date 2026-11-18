// Types of fire/js/initial.js: the drawn mark of a name's first letter. Pure functions, no DOM: import them in a
// server, a build step or an email template (`fire-design/fire/js/initial.js`). shell.js re-exports the last three,
// and fire.d.ts types them as shell.initialMark, shell.initialRows and shell.initialTone.
import type { InitialTone } from '../fire.js';

export type { InitialTone };

/** The tones a name can map to, in order. */
export declare const INITIAL_TONES: readonly InitialTone[];
/** The character a name is drawn from: its first letter or digit, upper-cased (an empty string for no name). */
export declare function initialChar(name?: string | null): string;
/** The glyph of a name as seven strings of five "0" / "1" cells, for a table-based email. */
export declare function initialRows(name?: string | null): string[];
/** A tone for a name: the same name always gives the same one (an FNV-1a hash of the lower-cased name). */
export declare function initialTone(name?: string | null): InitialTone;
/** The mark as an SVG string. `label: true` names it after `name`, a string names it that; none leaves it decorative. */
export declare function initialMark(name?: string | null, options?: { label?: boolean | string }): string;
