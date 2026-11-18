// Types of fire/js/theme.js: the theme record and its expander. Pure, no DOM (`fire-design/theme`, or
// `fire-design/fire/js/theme.js`). The record, palette and dial types live in fire.d.ts; ThemeModule there describes
// the same functions as one interface.
import type {
  ContrastLevel, ControlsSetting, Density, ElevationSetting, ExpandedTheme, GeneratedPalette, HeadingsSetting, LineWeight,
  MotionSetting, PaletteSpec, SignatureField, SignatureMark, SignatureMarks, SurfacesSetting, TextSize, ThemeDials,
  ThemeRecord, ThemeSignature, ThemeValidation, Tone, TweaksPatch, RampName, TypeSetName,
} from '../fire.js';

export type {
  ExpandedTheme, GeneratedPalette, PaletteSpec, ThemeDials, ThemeRecord, ThemeSignature, ThemeValidation, TweaksPatch,
};

/** 'fire/1'. */
export declare const CONTRACT: 'fire/1';
/** The Fire release this module belongs to (a test keeps it equal to package.json). */
export declare const FIRE_VERSION: string;
/** Every dial at its default. */
export declare const DIAL_DEFAULTS: Readonly<Required<ThemeDials>>;
/** The structural dials and their choices (the first is the default). */
export declare const STRUCTURE_CHOICES: Readonly<{
  surfaces: readonly SurfacesSetting[];
  elevation: readonly ElevationSetting[];
  controls: readonly ControlsSetting[];
  headings: readonly HeadingsSetting[];
}>;
/** The structural dials → their attribute on <html>. */
export declare const STRUCTURE_ATTRIBUTES: Readonly<{ surfaces: 'data-surfaces'; elevation: 'data-elevation'; controls: 'data-controls'; headings: 'data-headings' }>;
/** The dials that take a choice. */
export declare const DIAL_CHOICES: Readonly<{
  density: readonly Density[];
  lines: readonly LineWeight[];
  textSize: readonly TextSize[];
  contrast: readonly ContrastLevel[];
  motion: readonly MotionSetting[];
  surfaces: readonly SurfacesSetting[];
  elevation: readonly ElevationSetting[];
  controls: readonly ControlsSetting[];
  headings: readonly HeadingsSetting[];
}>;
/** The dials that take a range. */
export declare const DIAL_RANGES: Readonly<{ corners: readonly [min: number, max: number]; texture: readonly [min: number, max: number] }>;
/** The signature at its default. */
export declare const SIGNATURE_DEFAULT: Readonly<Required<ThemeSignature>>;
export declare const SIGNATURE_CHOICES: Readonly<{
  field: readonly SignatureField[];
  mark: readonly SignatureMark[];
  ramp: readonly ('auto' | RampName)[];
  marks: readonly SignatureMarks[];
}>;
export declare const SIGNATURE_RANGES: Readonly<{ cell: readonly [min: number, max: number]; intensity: readonly [min: number, max: number] }>;
/** The signature dials → their data-signature-* attribute on <html>. */
export declare const SIGNATURE_ATTRIBUTES: Readonly<Record<keyof ThemeSignature, string>>;
/** motion setting → the --fd-motion value (0, 1, 1.75). */
export declare const MOTION: Readonly<Record<MotionSetting, number>>;
/** The type voices → their custom property. */
export declare const FONT_TOKENS: Readonly<{ display: '--fd-font-display'; sans: '--fd-font-sans'; mono: '--fd-font-mono' }>;
/** The dials that write a custom property → its name. */
export declare const DIAL_TOKENS: Readonly<{ corners: '--fd-radius-scale'; lines: '--fd-hairline'; motion: '--fd-motion'; texture: '--fd-texture' }>;
/** Every token a record can set. */
export declare const INPUT_TOKENS: readonly string[];
/** The neutral temperatures a { from: 'accent' } spec accepts (or a hue in degrees). */
export declare const NEUTRALS: readonly ['pure', 'cool', 'warm', 'tinted'];
/** The labels a { from: 'accent' } spec accepts. */
export declare const LABELS: readonly ['white', 'dark'];
/** The full record of Fire's default look. */
export declare const DEFAULT_RECORD: Readonly<{ contract: 'fire/1'; palette: 'ember'; tone: Readonly<Tone>; type: Extract<TypeSetName, 'geist'>; dials: Readonly<Required<ThemeDials>> }>;

/** Check a record against the schema's rules and Fire's palette and type set lists. */
export declare function validateTheme(record: unknown): ThemeValidation;
/** A palette spec in any of its three forms → a palette in the presets' form, held to the presets' rules. Throws on an invalid spec. */
export declare function paletteFrom(spec: PaletteSpec): GeneratedPalette;
/** A record → the tokens, attributes and fallback @font-face rules that make the look. Throws on an invalid record. */
export declare function expandTheme(record?: ThemeRecord): ExpandedTheme;
/** A record → a stylesheet: the tokens on `selector` (default ':root'), the attributes to set in its comment. Load it after fire.css. */
export declare function themeToCss(record?: ThemeRecord, options?: { selector?: string }): string;
/** The Tweaks state (tweaks.get()) → a full record. The theme (light / dark / system) is the viewer's and is dropped; `signature` only when not the default. */
export declare function toThemeRecord(state?: TweaksPatch): ThemeRecord;
/** A record → the Tweaks state it describes (for tweaks.set()). Throws for a palette spec or font families (use themeToCss). */
export declare function fromThemeRecord(record?: ThemeRecord): TweaksPatch;
