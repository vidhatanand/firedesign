// Types of fire/js/palette-rules.js: the contrast and structure rules every palette meets, as functions. Pure, no DOM
// (`fire-design/fire/js/palette-rules.js`).
import type { TokenMap } from './palettes.js';

/** The text steps the ladder measures. */
export type TextStep = '--fd-text' | '--fd-text-2' | '--fd-text-3' | '--fd-text-4';
/** How tokens.css mixes one text step: `base` at `alpha` ([light, dark]) over the ground. */
export interface LadderStep {
  base: string;
  alpha: readonly [light: number, dark: number];
}
/** TEXT_LADDER: the fill, and each text step per contrast level. */
export interface TextLadder {
  fill: LadderStep;
  default: Readonly<Record<TextStep, LadderStep>>;
  high: Readonly<Record<TextStep, LadderStep>>;
}
/** 0 is light mode, 1 dark. */
export type ModeIndex = 0 | 1;
/** One text step's worst ratio over every ground. */
export interface TextMeasure {
  worst: number;
  /** The ground it was worst on ("bg", "fill/raised", "wash/surface", …). */
  where: string;
  alpha: number;
}
/** What checkText returns for one mode. */
export interface TextRow {
  default: Record<TextStep, TextMeasure>;
  high: Record<TextStep, TextMeasure>;
}
/** What measure returns for one mode: the ratios and the accent hover's move in L. */
export interface MeasureRow {
  mode: 'light' | 'dark';
  textBg: number;
  textSurface: number;
  textWash: number;
  label: number;
  labelHover: number;
  ink: number;
  hoverDL: number;
}
export interface RuleOptions {
  ladder?: TextLadder;
  modes?: ModeIndex[];
}

/** 4.5: text that carries information. */
export declare const TEXT_MIN: number;
/** 3: --fd-text-4 (placeholders, disabled text, decoration). */
export declare const FAINT_MIN: number;
/** The grounds text sits on. */
export declare const BASES: string[];
/** Short names of BASES. */
export declare const BASE_SHORT: Record<string, string>;
export declare const TEXT_STEPS: TextStep[];
export declare const TEXT_LADDER: TextLadder;
/** `fg` at `alpha` over the opaque `bg`, composited in sRGB. */
export declare function over(fg: string, alpha: number, bg: string): string;
/** Each text step's worst contrast over every ground, in one mode and contrast level. */
export declare function measureText(tokens: TokenMap, m: ModeIndex, level: 'default' | 'high', ladder?: TextLadder): Record<TextStep, TextMeasure>;
/** The text rules for one palette map; calls fail(message) per violation. */
export declare function checkText(tokens: TokenMap, name: string, context: string | undefined, fail: (message: string) => void, options?: RuleOptions): TextRow[];
/** The accent, ink and structure rules (structure only with no `context`); returns the ratios, one row per mode. */
export declare function measure(tokens: TokenMap, name: string, context: string | undefined, fail: (message: string) => void, options?: { modes?: ModeIndex[] }): MeasureRow[];
/** Every violation of a palette's token map, as messages. [] when it passes. */
export declare function paletteFailures(tokens: TokenMap, options?: { name?: string; modes?: ModeIndex[] }): string[];
/** The least contrast --fd-focus keeps against every ground. */
export declare const FOCUS_MIN: number;

/** One status tone's measurements in one mode. */
export interface StatusMeasure {
  /** -text's worst ratio on the page, the well, the surfaces and its own -bg over them. */
  text: number;
  /** -contrast on -fill. */
  label: number;
  /** -line over the page, against the page. */
  line: number;
  /** The least ΔE (OKLab) of -solid and -fill from the accent. */
  apart: number;
  /** The ΔE it must reach. */
  need: number;
  /** True when the accent's hue is in the tone's family. */
  family: boolean;
  hue: number;
  inRange: boolean;
}
/** The status and chart measurements of one palette map in one mode. */
export declare function measureColours(tokens: TokenMap, m: ModeIndex): {
  status: Record<'success' | 'warning' | 'danger' | 'info', StatusMeasure>;
  chart: { series: string[]; short: number; worst: import('./palettes.js').ChartWorst; lead: boolean };
};
/** Every violation of the status and chart rules, as messages. [] when it passes. */
export declare function colourFailures(tokens: TokenMap, options?: { name?: string; modes?: ModeIndex[] }): string[];
