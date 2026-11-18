// Types of fire/js/palettes.js: the palette data and the colour engine. Pure functions, no DOM: importable from Node
// and from the browser (`fire-design/fire/js/palettes.js`). The palette and theme types live in fire.d.ts.
import type { ContrastToken, LightDark, Palette, PaletteFullSpec, PaletteName, PaletteToken, Tone, ThemeTone } from '../fire.js';

/** A resolved token map: token name → [light, dark]. */
export type TokenMap = Record<string, LightDark>;
/** A colour as the engine reads it: "#rgb", "#rrggbb" or "rgb(r g b / a)". */
export type ColorInput = string;
/** Linear-free sRGB channels, each 0…1. */
export type Rgb = [r: number, g: number, b: number];

/** Parse '#rgb', '#rrggbb' or 'rgb(r g b / a)'. Throws on anything else. */
export declare function parse(color: string): { rgb: Rgb; alpha: number };
/** Channels (+ alpha) → '#rrggbb', or 'rgb(r g b / a)' when alpha is below 1. */
export declare function format(rgb: readonly number[], alpha?: number): string;
/** Any colour (or channels) → [L, C, h] in OKLCH. */
export declare function toOklch(color: string | readonly number[]): [L: number, C: number, h: number];
/** [L, C, h] → '#rrggbb', gamut-mapped by reducing chroma. */
export declare function oklch(L: number, C: number, h: number, alpha?: number): string;
/** WCAG 2 relative luminance (alpha is ignored). */
export declare function luminance(color: string | readonly number[]): number;
/** WCAG 2 contrast ratio of two opaque colours. */
export declare function contrast(a: string | readonly number[], b: string | readonly number[]): number;

/** The token names a palette sets, in order. */
export declare const PALETTE_TOKENS: PaletteToken[];
/** The lines high contrast replaces. */
export declare const CONTRAST_TOKENS: ContrastToken[];
/** The 8% accent wash (--fd-accent-8) laid over an opaque background. */
export declare function washOver(accent: string, bg: string, amount?: number): string;
/** The near-black label tinted toward an accent's hue that reaches 4.5:1 on it. */
export declare const nearBlack: (accent: string) => string;
/** The colour with its OKLCH L moved by dL (chroma and hue kept, gamut-mapped). */
export declare const shift: (hex: string, dL: number) => string;
/** A compact spec (the full spec form) → a palette object, on ember's lightness structure. */
export declare function expandSpec(spec: PaletteFullSpec): Palette;

/** 'ember'. */
export declare const DEFAULT_PALETTE: 'ember';
/** The presets, ember first. */
export declare const PALETTES: Palette[];
/** The palette object (ember when the name is unknown). */
export declare const getPalette: (name: PaletteName | (string & {})) => Palette;
/** A palette's token map; with { contrast: 'high' } its high-contrast lines replace the normal ones. */
export declare function paletteTokens(name: PaletteName | (string & {}), options?: { contrast?: 'default' | 'high' }): TokenMap;
/** [light, dark] → a CSS value: 'light-dark(#…, #…)', or one value when both are equal. */
export declare function cssValue(pair: LightDark): string;

/** { hue: 0, vivid: 100, light: 0, warmth: 0 }. */
export declare const TONE_DEFAULT: Readonly<Tone>;
/** The allowed range of each tone dial. */
export declare const TONE_RANGE: Readonly<Record<keyof Tone, readonly [min: number, max: number]>>;
/** True when every dial of the tone is at its default (missing dials count as default). */
export declare const isDefaultTone: (tone?: ThemeTone) => boolean;
/** Bend a resolved token map by a tone. A default tone returns an identical copy. */
export declare function toneTokens(tokens: TokenMap, tone?: ThemeTone): TokenMap;

/** The least contrast the focus ring keeps against every ground it sits on (WCAG 1.4.11). */
export declare const FOCUS_MIN: number;
/** The focus ring's colour: the accent while it reaches FOCUS_MIN on every ground, else the accent text, else the ink. */
export declare function focusOf(accent: ColorInput, accentText: ColorInput, ink: ColorInput, grounds: ColorInput[]): string;
/** What a focused control sits on in one mode (0 light, 1 dark): the page, the well, the surfaces, the fill on each, and the accent wash. */
export declare function focusGrounds(tokens: TokenMap, mode: 0 | 1): string[];
