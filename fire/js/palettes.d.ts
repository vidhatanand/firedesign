// Types of fire/js/palettes.js: the palette data and the colour engine. Pure functions, no DOM: importable from Node
// and from the browser (`fire-design/fire/js/palettes.js`). The palette and theme types live in fire.d.ts.
import type { ChartToken, ContrastToken, LightDark, Palette, PaletteFullSpec, PaletteName, PaletteToken, StatusTone, StatusToken, Tone, ThemeTone } from '../fire.js';

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

/** The token names a palette sets, in order: its twenty colours, then the status and chart colours derived from them. */
export declare const PALETTE_TOKENS: PaletteToken[];
/** 'success', 'warning', 'danger', 'info'. */
export declare const STATUS_TONES: StatusTone[];
/** 'solid', 'text', 'bg', 'line', 'fill', 'contrast'. */
export declare const STATUS_PARTS: Array<'solid' | 'text' | 'bg' | 'line' | 'fill' | 'contrast'>;
/** --fd-<tone>-<part> for every tone and part. */
export declare const STATUS_TOKENS: StatusToken[];
/** --fd-chart-1 … --fd-chart-6. */
export declare const CHART_TOKENS: ChartToken[];
/** STATUS_TOKENS then CHART_TOKENS. */
export declare const COLOUR_TOKENS: Array<StatusToken | ChartToken>;

/** OKLab [L, a, b] of a colour. */
export declare const oklab: (color: string | readonly number[]) => [L: number, a: number, b: number];
/** Distance of two colours in OKLab (0…about 0.5; ×100 is the scale most tools print). */
export declare const deltaE: (a: string, b: string) => number;
/** A colour-vision deficiency the chart rules simulate. */
export type Deficiency = 'protanopia' | 'deuteranopia' | 'tritanopia';
/** Machado, Oliveira & Fernandes (2009) severity 1.0 matrices, applied to linear sRGB. */
export declare const CVD: Readonly<Record<Deficiency, number[][]>>;
/** Channels as a reader with that deficiency sees them ('normal' returns them unchanged). */
export declare function simulateRgb(rgb: readonly number[], kind: Deficiency | 'normal'): number[];
/** A colour as a reader with that deficiency sees it, as '#rrggbb'. */
export declare const simulate: (color: string, kind: Deficiency | 'normal') => string;
/** The status and chart rules (ΔE in OKLab). */
export declare const COLOUR_RULES: Readonly<{
  text: number;
  label: number;
  lineFloor: number;
  separation: Readonly<{ family: number; other: number }>;
  chart: Readonly<{
    contrast: number; normal: Readonly<{ all: number; adjacent: number }>; cvd: Readonly<{ all: number; adjacent: number }>;
    chroma: number; yellow: readonly [from: number, to: number]; sameHue: Readonly<{ within: number; chroma: number; normal: number }>;
  }>;
}>;
/** Each tone's family (an accent there is that colour) and the range its hue may move in, OKLCH degrees. */
export declare const STATUS_HUES: Readonly<Record<StatusTone, Readonly<{ family: [number, number]; range: [number, number] }>>>;
/** The chart template: series 3–6 as a hue turn from the accent, a lightness [light, dark] and a chroma. */
export declare const CHART_SERIES: ReadonlyArray<Readonly<{ turn: number; L: [light: number, dark: number]; C: number }>>;
/** The checked fallback hues (Okabe & Ito). */
export declare const CHART_FALLBACK: readonly string[];
/** Where a light-scheme series in the yellow band is steered: [ochre, green] hues. */
export declare const CHART_STEER: readonly [ochre: number, green: number];
/** The worst distances of a chart set in one mode. */
export interface ChartWorst {
  contrast: number;
  normal: number;
  normalAdjacent: number;
  cvd: number;
  cvdAdjacent: number;
  /** The worst colour-blind pair, as "3–4 deuteranopia". */
  cvdWhere: string;
  /** The least chroma of series 3–6. */
  chroma: number;
  /** The least hue difference of two chromatic series. */
  hueGap: number;
  /** Series (3–6) in the yellow band in the light scheme. */
  yellow: number[];
}
/** How far a chart set is from the rules in one mode: the summed shortfall (0 when it passes) and the worst pairs. */
export declare function chartShortfall(colours: string[], grounds: string[], labs?: number[][][], mode?: 0 | 1): { short: number; worst: ChartWorst };
/** One mode of a derived chart set. */
export interface ChartReport {
  colours: string[];
  /** The series (3–6) the engine moved from the template. */
  moved: number[];
  moves: Array<[dh: number, dL: number]>;
  /** True when the template could not be made to pass and the fallback set is used. */
  fallback: boolean;
  passes: boolean;
  worst: ChartWorst;
}
/** The status and chart colours of a palette's twenty colours, with what moved and why. */
export declare function deriveColours(tokens: TokenMap): { tokens: Record<StatusToken | ChartToken, LightDark>; notes: string[]; chart: [light: ChartReport, dark: ChartReport] };
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
