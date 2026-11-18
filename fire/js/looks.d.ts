// Types of fire/js/looks.js: the named looks, each a complete theme record. GENERATED data (scripts/build-contract.mjs
// writes looks.js from contract/looks/named/*.json); these declarations are written by hand.
import type { LookName, ThemeRecord } from '../fire.js';

/** A named look: a complete theme record with a label and a one-sentence note on its character. */
export interface Look {
  name: LookName;
  label: string;
  note: string;
  record: ThemeRecord;
}
/** The shipped looks, in display order. */
export declare const LOOKS: readonly Look[];
/** Their names. */
export declare const LOOK_NAMES: readonly LookName[];
/** The look with that name, or undefined. */
export declare const getLook: (name: string) => Look | undefined;
