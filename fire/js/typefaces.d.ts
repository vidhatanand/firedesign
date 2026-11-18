// Types of fire/js/typefaces.js: the type sets the Tweaks panel offers, and the type set spec a theme record may
// write. Pure, no DOM (`fire-design/fire/js/typefaces.js`). The catalogue comes from fonts.js (generated).
import type { FontFamily, TypeSetName, TypeSpec, TypeSpecKey } from '../fire.js';

export { FONT_FAMILIES, INTERFACE_MIN_XHEIGHT, VOICES } from './fonts.js';

/** Heading sizes a wide or condensed face needs: [size, line height] per level. */
export type HeadingSizes = Record<'display' | 'h1' | 'h2' | 'h3', [size: string, lineHeight: string]>;
/** One named type set. */
export interface Typeface {
  name: TypeSetName;
  label: string;
  note: string;
  spec: TypeSpec;
  /** spec.display, spec.sans and spec.mono, for the panel. */
  display?: string;
  sans?: string;
  mono?: string;
  sizes?: HeadingSizes;
  sizesNote?: string;
  /** The pairing rules this built-in set is excused ('interface-x-height'). */
  legacy?: string[];
}

/** 'geist'. */
export declare const DEFAULT_TYPEFACE: 'geist';
/** The twelve named sets, in display order. */
export declare const TYPEFACES: Typeface[];
/** The named set (the default when unknown). */
export declare const getTypeface: (name: TypeSetName | (string & {})) => Typeface;
/** The keys a spec may have. */
export declare const TYPE_SPEC_KEYS: readonly TypeSpecKey[];
/** What a family name must match: letters, digits, spaces and . _ & + ' -, up to 64. */
export declare const FAMILY: RegExp;
/** A catalogue entry, or undefined. */
export declare const getFamily: (name: string) => FontFamily | undefined;
/** The CSS stack for a family: its metric-matched fallback face, then the system stack its kind needs. */
export declare function fontStack(family: string, voice?: 'display' | 'sans' | 'mono'): string;
/** The @font-face of a family's metric-matched fallback, or null (unknown family, Geist, Geist Mono). */
export declare function fallbackFace(family: string): string | null;
/** Check a type set spec: its shape, then the pairing rules for the families the catalogue knows. */
export declare function checkTypeSpec(spec: unknown, options?: { path?: string; legacy?: string[] }): { errors: string[]; notes: string[] };
/** A valid spec → the font and heading tokens, the attributes and the fallback @font-face rules it needs. */
export declare function typeSpecTokens(spec: TypeSpec): { tokens: Record<string, string>; attributes: Record<string, string>; faces: string[] };
