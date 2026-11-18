// Types of fire/email/email.js: a transactional email from a theme record and structured content. Pure, no DOM
// (`fire-design/email`, or `fire-design/fire/email/email.js`).
import type { ThemeRecord } from '../fire.js';

/** The sender. Without a logoUrl a square in the accent colour carries the name's first letter. */
export interface EmailBrand {
  name: string;
  /** https only: the one remote image the email loads. */
  logoUrl?: string;
}
/** A run of text: a string, or a link. */
export type EmailRun = string | { text: string; href: string };
/** The blocks of a message. An unknown type, a missing field or an unsafe URL throws a TypeError naming the block. */
export type EmailBlock =
  | { type: 'heading'; text: string; /** 1 for the first heading, then 2. */ level?: 1 | 2 }
  | { type: 'text'; text: EmailRun | EmailRun[]; tone?: 'muted' }
  | { type: 'button'; label: string; href: string; /** The sentence above the plain link under the button; false hides it. */ fallback?: string | false }
  | { type: 'code'; value: string; label?: string }
  | { type: 'keyValue'; rows: Array<{ label: string; value: string | number; mono?: boolean }> }
  | { type: 'divider' }
  | { type: 'note'; text: string; title?: string }
  | { type: 'footer'; lines?: string[]; links?: Array<{ label: string; href: string }> };

export interface EmailOptions {
  /** A theme record; omitted, Fire's default look. Invalid throws. */
  theme?: ThemeRecord;
  brand: EmailBrand;
  /** The line a mailbox shows beside the subject. */
  preheader?: string;
  /** The content, in order; not empty. */
  blocks: EmailBlock[];
  /** A BCP 47 tag, default "en": sets lang and, for Arabic, Hebrew, Persian and Urdu, dir="rtl". */
  locale?: string;
}

/** The opaque colours of one scheme (each "#rrggbb"). */
export interface EmailScheme {
  page: string;
  card: string;
  sunk: string;
  line: string;
  ink: string;
  /** --fd-text-3 composited on the ground it sits on. */
  muted: { page: string; card: string; sunk: string };
  accent: string;
  onAccent: string;
  link: string;
}

/** Render one message as HTML and as plain text. Throws a TypeError for a bad brand, blocks, locale or URL. */
export declare function renderEmail(options: EmailOptions): { html: string; text: string };
/** The opaque colours the email uses, in each scheme. */
export declare function emailColors(theme?: ThemeRecord): { light: EmailScheme; dark: EmailScheme };
/** True for a locale written right to left (ar, he, fa, ur, …). */
export declare function isRtl(locale?: string): boolean;
