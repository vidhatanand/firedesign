/* Fire email — a transactional email from a theme record and structured content.
 *
 * Pure ES module: no DOM, no dependencies, importable from Node and from the browser. Products send sign-in links,
 * invitations, receipts and alerts; this renders one message, as HTML and as plain text, in the product's own look.
 *
 * Inline styles are right here, and only here. Mail clients drop <link> and most of <style>, ignore custom
 * properties and variables, and strip classes in places; the one place a style is certain to survive is the
 * style attribute on the element. So this module writes every style inline, resolves every colour to an opaque
 * #rrggbb through the theme record (fire/js/theme.js) and the palette rules (fire/js/palette-rules.js), and keeps a
 * <style> block only for dark mode, which a client that ignores it simply does not apply. The rest of Fire never
 * uses a style attribute. fire/email/ is outside the audit's inline check (scripts/audit.mjs reads docs/ and
 * templates/ for it), and the page of examples shows each email in a frame, never as markup of the docs page.
 *
 * API
 *   renderEmail({ theme, brand, preheader, blocks, locale })  → { html, text }
 *     theme      a theme record (contract/theme.schema.json); omitted, Fire's default look. Invalid → throws.
 *     brand      { name, logoUrl? }  the sender. logoUrl is https, the only remote image the email loads; without
 *                it a square in the accent colour carries the name's first letter, drawn in the markup.
 *                The theme record's brand shape works too: `logo` is an alias of logoUrl (logoUrl wins), and the
 *                other fields (mark, logoDark, href) are ignored.
 *     preheader  the line a mailbox shows beside the subject (hidden in the message itself)
 *     blocks     the content, in order (below)
 *     locale     a BCP 47 tag, default "en": sets lang and, for Arabic, Hebrew, Persian and Urdu, dir="rtl".
 *                Every word in the email is the caller's; nothing here is translated.
 *   emailColors(theme)  → { light, dark }: the opaque colours the email uses, each { page, card, sunk, line, ink,
 *                         muted: { page, card, sunk }, accent, onAccent, link }  (the tests check their contrast)
 *   isRtl(locale)
 *
 * Blocks (an unknown type, a missing field or an unsafe URL throws a TypeError naming the block)
 *   { type: 'heading', text, level?: 1 | 2 }          level defaults to 1 for the first heading, then 2
 *   { type: 'text', text, tone?: 'muted' }            text is a string, or an array of strings and { text, href }
 *   { type: 'button', label, href, fallback?: string | false }   fallback is the sentence above the plain link under the
 *                                                     button (default "Or paste this link into your browser:")
 *   { type: 'code', value, label? }                   a one-time code in a large monospace box
 *   { type: 'keyValue', rows: [{ label, value, mono? }] }
 *   { type: 'divider' }
 *   { type: 'note', text, title? }                    a quiet aside: "If you did not ask for this, ignore it"
 *   { type: 'footer', lines?: string[], links?: [{ label, href }] }   rendered below the card; several are joined
 *   Added in 0.8 for a newsletter issue:
 *   { type: 'section', title }                        a labelled rule that opens a group of stories ("Shipped")
 *   { type: 'story', title, text, href, kind?, label? }   one item of an issue: an optional kind label ("Release"), a
 *                                                     title that links to href, one paragraph, and a link line (label,
 *                                                     default "Read more") that names where it goes
 *   { type: 'list', items, ordered?: boolean }        a short list; each item is a string or an array of runs
 *   href: https, http, mailto or tel. Everything else is escaped.
 *
 * Mail-client rules this follows: presentation tables (role="presentation") and a 560px column (a conditional
 * table holds the width in Outlook); lang on <html>; a real h1 and h2; link text that names its destination
 * (the caller's label, and the address itself under a button); system font stacks, no web fonts; the button is an
 * Outlook VML roundrect with a padded table cell for every other client; colour-scheme meta and a
 * prefers-color-scheme block; text is 4.5:1 or better on its ground in both schemes (muted text is Fire's
 * --fd-text-3 step, composited on the ground it sits on); no image but the logo, and no script.
 */
import { expandTheme } from '../js/theme.js';
import { paletteTokens, DEFAULT_PALETTE, parse, format } from '../js/palettes.js';
import { TEXT_LADDER, over } from '../js/palette-rules.js';

/* Single quotes: the stacks sit inside style="…". */
const SANS = "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace";
const WIDTH = 560;
const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi', 'dv', 'ug']);
const SCHEMES = ['light', 'dark'];
const FILLER = '&#847;&zwnj;&nbsp;'.repeat(60);

export const isRtl = (locale = 'en') => RTL.has(String(locale).toLowerCase().split(/[-_]/)[0]);

/* ---------- text safety ---------- */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
/* One line: control characters, line and paragraph separators and bidirectional overrides become spaces. */
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g;
const oneLine = (s) => String(s).replace(CONTROL, ' ').replace(/ {2,}/g, ' ').trim();
/* A paragraph: the same, but newlines are kept as line breaks. */
const para = (s) => String(s).replace(/\r\n?/g, '\n').split('\n').map(oneLine).join('\n').trim();
/* A run inside a paragraph keeps the space at its edges. */
const run = (s) => String(s).replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(CONTROL, ' ').replace(/ {2,}/g, ' ')).join('\n');
const html = (s) => esc(s).replace(/\n/g, '<br>');

function fail(index, type, message) {
  throw new TypeError(`[email] block ${index} (${type}): ${message}`);
}
function needText(v, index, type, field) {
  if (typeof v !== 'string' || !v.trim()) fail(index, type, `${field} must be a non-empty string`);
  return v;
}
function safeUrl(v, index, type, field, { schemes = ['https:', 'http:', 'mailto:', 'tel:'] } = {}) {
  needText(v, index, type, field);
  let u;
  try { u = new URL(v); } catch { fail(index, type, `${field} is not an absolute URL`); }
  if (!schemes.includes(u.protocol)) fail(index, type, `${field} must use ${schemes.map((s) => s.slice(0, -1)).join(', ')}`);
  return u.href.replace(/[\u0000- ]/g, encodeURIComponent);
}

/* ---------- colours ---------- */
const hex = (c) => format(parse(c).rgb);

/** The palette's tokens as the record sets them, as [light, dark] pairs: a named palette from the presets, a generated
 *  or toned one from the record's own tokens. */
function resolveTokens(theme) {
  const { tokens, attributes } = expandTheme(theme ?? {});
  const level = attributes['data-contrast'] === 'high' ? 'high' : 'default';
  return { ...paletteTokens(attributes['data-palette'] || DEFAULT_PALETTE, { contrast: level }), ...tokens, level };
}

/** The opaque colours of the email, in each scheme. Muted text is --fd-text-3 composited on the ground it sits on. */
export function emailColors(theme) {
  const t = resolveTokens(theme);
  const ladder = TEXT_LADDER[t.level];
  const out = {};
  SCHEMES.forEach((scheme, m) => {
    const at = (k) => hex(t[k][m]);
    const ground = { page: at('--fd-bg'), card: at('--fd-surface'), sunk: at('--fd-bg-sunken') };
    const step = ladder['--fd-text-3'];
    const muted = Object.fromEntries(Object.entries(ground).map(([g, c]) => [g, over(at(step.base), step.alpha[m], c)]));
    out[scheme] = { ...ground, line: at('--fd-line'), ink: at('--fd-ink'), muted, accent: at('--fd-accent'), onAccent: at('--fd-accent-contrast'), link: at('--fd-accent-text') };
  });
  return out;
}

function fonts(theme) {
  const type = typeof theme?.type === 'string' ? theme.type : 'geist';
  if (type === 'terminal') return { body: MONO, head: MONO };
  if (type === 'book') return { body: SERIF, head: SERIF };
  if (type === 'editorial') return { body: SANS, head: SERIF };
  return { body: SANS, head: SANS };
}

/* ---------- html ---------- */
function render(theme, brand, preheader, blocks, locale) {
  const colors = emailColors(theme);
  const c = colors.light;
  const f = fonts(theme);
  const corners = theme?.dials?.corners ?? 1;
  const radius = Math.round(12 * corners);
  const buttonRadius = Math.round(8 * corners);
  const lang = esc(locale);
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  const start = dir === 'rtl' ? 'right' : 'left';
  const end = dir === 'rtl' ? 'left' : 'right';
  const name = oneLine(brand.name);

  const p = (inner, { muted = false, size = 15, last = false } = {}) =>
    `<p class="${muted ? 'fe-mu-card' : 'fe-ink'}" style="margin:0 0 ${last ? 0 : 16}px;font-family:${f.body};font-size:${size}px;line-height:1.6;color:${muted ? c.muted.card : c.ink}">${inner}</p>`;
  const link = (href, label, extra = '') => `<a class="fe-link" href="${esc(href)}" style="color:${c.link};text-decoration:underline${extra}">${esc(label)}</a>`;
  const spans = (parts) => (Array.isArray(parts) ? parts : [parts]).map((part) => (typeof part === 'string' ? html(run(part)) : link(part.href, oneLine(part.text)))).join('');

  let firstHeading = true;
  let inSection = false;
  let title = '';
  const footers = [];
  const body = [];
  blocks.forEach((b, i) => {
    switch (b.type) {
      case 'heading': {
        const level = b.level ?? (firstHeading ? 1 : 2);
        if (level !== 1 && level !== 2) fail(i, 'heading', 'level must be 1 or 2');
        const text = oneLine(needText(b.text, i, 'heading', 'text'));
        if (firstHeading) title = text;
        firstHeading = false;
        body.push(`<h${level} class="fe-ink" style="margin:0 0 16px;font-family:${f.head};font-size:${level === 1 ? 24 : 18}px;font-weight:600;line-height:1.3;color:${c.ink}">${esc(text)}</h${level}>`);
        break;
      }
      case 'text': {
        if (typeof b.text === 'string') needText(b.text, i, 'text', 'text');
        else if (!Array.isArray(b.text) || !b.text.length) fail(i, 'text', 'text must be a string or an array of strings and { text, href }');
        const parts = (Array.isArray(b.text) ? b.text : [b.text]).map((part) => {
          if (typeof part === 'string') return part;
          if (!part || typeof part !== 'object') fail(i, 'text', 'each part must be a string or { text, href }');
          return { text: needText(part.text, i, 'text', 'part.text'), href: safeUrl(part.href, i, 'text', 'part.href') };
        });
        body.push(p(spans(parts), { muted: b.tone === 'muted', size: b.tone === 'muted' ? 14 : 15 }));
        break;
      }
      case 'button': {
        const label = oneLine(needText(b.label, i, 'button', 'label'));
        const href = safeUrl(b.href, i, 'button', 'href');
        const width = Math.max(160, Math.min(WIDTH - 120, Math.round(label.length * 9 + 56)));
        const vml = `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(href)}" style="height:46px;v-text-anchor:middle;width:${width}px" arcsize="${buttonRadius ? Math.min(50, Math.round(buttonRadius / 46 * 100)) : 0}%" stroke="f" fillcolor="${c.accent}"><w:anchorlock/><center style="color:${c.onAccent};font-family:${SANS};font-size:15px;font-weight:bold">${esc(label)}</center></v:roundrect><![endif]-->`;
        const cell = `<!--[if !mso]><!--><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="fe-btn" bgcolor="${c.accent}" style="background-color:${c.accent};border-radius:${buttonRadius}px"><a class="fe-btn-text" href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-family:${f.body};font-size:15px;font-weight:600;line-height:18px;color:${c.onAccent};text-decoration:none;border-radius:${buttonRadius}px">${esc(label)}</a></td></tr></table><!--<![endif]-->`;
        body.push(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr><td>${vml}${cell}</td></tr></table>`);
        if (b.fallback !== false) {
          const lead = typeof b.fallback === 'string' ? b.fallback : 'Or paste this link into your browser:';
          body.push(p(`${esc(oneLine(lead))}<br>${link(href, href, ';word-break:break-all')}`, { muted: true, size: 13 }));
        }
        break;
      }
      case 'code': {
        const value = oneLine(needText(b.value, i, 'code', 'value'));
        const label = b.label ? oneLine(b.label) : '';
        body.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr><td class="fe-sunk fe-line" align="center" bgcolor="${c.sunk}" style="background-color:${c.sunk};border:1px solid ${c.line};border-radius:${buttonRadius}px;padding:18px 16px">` +
          (label ? `<div class="fe-mu-sunk" style="margin:0 0 6px;font-family:${f.body};font-size:13px;line-height:1.4;color:${c.muted.sunk}">${esc(label)}</div>` : '') +
          `<div class="fe-ink" style="font-family:${MONO};font-size:28px;font-weight:600;letter-spacing:6px;line-height:1.2;color:${c.ink}">${esc(value)}</div></td></tr></table>`);
        break;
      }
      case 'keyValue': {
        if (!Array.isArray(b.rows) || !b.rows.length) fail(i, 'keyValue', 'rows must be a non-empty array of { label, value }');
        const rows = b.rows.map((r, j) => {
          if (!r || typeof r !== 'object') fail(i, 'keyValue', `row ${j} must be { label, value }`);
          return { label: oneLine(needText(r.label, i, 'keyValue', `rows[${j}].label`)), value: oneLine(needText(String(r.value ?? ''), i, 'keyValue', `rows[${j}].value`)), mono: !!r.mono };
        });
        body.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">${rows.map((r, j) =>
          `<tr><td class="fe-mu-card fe-line" valign="top" style="padding:10px 12px 10px 0;${j ? `border-top:1px solid ${c.line};` : ''}font-family:${f.body};font-size:14px;line-height:1.5;color:${c.muted.card};text-align:${start}">${esc(r.label)}</td>` +
          `<td class="fe-ink fe-line" valign="top" style="padding:10px 0;${j ? `border-top:1px solid ${c.line};` : ''}font-family:${r.mono ? MONO : f.body};font-size:14px;line-height:1.5;color:${c.ink};text-align:${end}">${esc(r.value)}</td></tr>`).join('')}</table>`);
        break;
      }
      case 'divider':
        body.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr><td class="fe-rule" height="1" bgcolor="${c.line}" style="height:1px;font-size:0;line-height:0;background-color:${c.line}">&nbsp;</td></tr></table>`);
        break;
      case 'note': {
        const text = para(needText(b.text, i, 'note', 'text'));
        const noteTitle = b.title ? oneLine(b.title) : '';
        body.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr><td class="fe-sunk fe-bar" bgcolor="${c.sunk}" style="background-color:${c.sunk};border-${start}:3px solid ${c.accent};border-radius:${buttonRadius}px;padding:14px 16px">` +
          (noteTitle ? `<div class="fe-ink" style="margin:0 0 4px;font-family:${f.body};font-size:14px;font-weight:600;line-height:1.5;color:${c.ink}">${esc(noteTitle)}</div>` : '') +
          `<div class="fe-mu-sunk" style="font-family:${f.body};font-size:14px;line-height:1.6;color:${c.muted.sunk}">${html(text)}</div></td></tr></table>`);
        break;
      }
      case 'section': {
        const text = oneLine(needText(b.title, i, 'section', 'title'));
        body.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 20px"><tr><td class="fe-mu-card fe-line" style="padding:0 0 8px;border-bottom:1px solid ${c.line};font-family:${f.body};font-size:12px;font-weight:600;letter-spacing:1px;line-height:1.4;text-transform:uppercase;color:${c.muted.card};text-align:${start}"><h2 style="margin:0;font:inherit;letter-spacing:inherit;color:inherit">${esc(text)}</h2></td></tr></table>`);
        inSection = true;
        break;
      }
      case 'story': {
        const title = oneLine(needText(b.title, i, 'story', 'title'));
        const text = para(needText(b.text, i, 'story', 'text'));
        const href = safeUrl(b.href, i, 'story', 'href');
        const kind = b.kind ? oneLine(b.kind) : '';
        const more = oneLine(b.label ?? 'Read more');
        body.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px"><tr><td style="text-align:${start}">` +
          (kind ? `<div class="fe-mu-card" style="margin:0 0 4px;font-family:${f.body};font-size:12px;font-weight:600;letter-spacing:1px;line-height:1.4;text-transform:uppercase;color:${c.muted.card}">${esc(kind)}</div>` : '') +
          `<h${inSection ? 3 : 2} style="margin:0 0 6px;font-family:${f.head};font-size:17px;font-weight:600;line-height:1.35"><a class="fe-ink" href="${esc(href)}" style="color:${c.ink};text-decoration:none">${esc(title)}</a></h${inSection ? 3 : 2}>` +
          `<p class="fe-ink" style="margin:0 0 8px;font-family:${f.body};font-size:15px;line-height:1.6;color:${c.ink}">${html(text)}</p>` +
          `<p style="margin:0;font-family:${f.body};font-size:14px;line-height:1.5">${link(href, more)}</p></td></tr></table>`);
        break;
      }
      case 'list': {
        if (!Array.isArray(b.items) || !b.items.length) fail(i, 'list', 'items must be a non-empty array');
        const items = b.items.map((item, j) => {
          const parts = Array.isArray(item) ? item : [item];
          if (!parts.length) fail(i, 'list', `items[${j}] is empty`);
          return parts.map((part) => {
            if (typeof part === 'string') return needText(part, i, 'list', `items[${j}]`);
            if (!part || typeof part !== 'object') fail(i, 'list', `items[${j}] must be a string or an array of strings and { text, href }`);
            return { text: needText(part.text, i, 'list', `items[${j}].text`), href: safeUrl(part.href, i, 'list', `items[${j}].href`) };
          });
        });
        const tag = b.ordered ? 'ol' : 'ul';
        body.push(`<${tag} class="fe-ink" style="margin:0 0 20px;padding-${start}:22px;font-family:${f.body};font-size:15px;line-height:1.6;color:${c.ink}">${items.map((parts, j) =>
          `<li style="margin:${j ? 6 : 0}px 0 0">${spans(parts)}</li>`).join('')}</${tag}>`);
        break;
      }
      case 'footer': {
        const lines = (b.lines ?? []).map((l) => para(needText(l, i, 'footer', 'lines[]')));
        const links = (b.links ?? []).map((l, j) => ({ label: oneLine(needText(l?.label, i, 'footer', `links[${j}].label`)), href: safeUrl(l.href, i, 'footer', `links[${j}].href`) }));
        footers.push({ lines, links });
        break;
      }
      default:
        fail(i, String(b?.type), 'unknown block type (heading, text, button, code, keyValue, divider, note, footer, section, story, list)');
    }
  });

  const footLines = footers.flatMap((x) => x.lines).map((l) => `<div>${html(l)}</div>`);
  const footLinks = footers.flatMap((x) => x.links).map((l) => `<a class="fe-link" href="${esc(l.href)}" style="color:${c.link};text-decoration:underline">${esc(l.label)}</a>`);
  const foot = [...footLines, footLinks.length ? `<div style="margin-top:6px">${footLinks.join(' &middot; ')}</div>` : ''].join('');

  const mark = brand.logoUrl
    ? `<img src="${esc(brand.logoUrl)}" alt="${esc(name)}" height="32" style="display:block;height:32px;width:auto;max-width:240px;border:0;outline:none;text-decoration:none">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="fe-mark" width="32" height="32" align="center" valign="middle" bgcolor="${c.accent}" style="width:32px;height:32px;background-color:${c.accent};border-radius:${buttonRadius}px;font-family:${f.head};font-size:17px;font-weight:700;line-height:32px;color:${c.onAccent};text-align:center">${esc([...name][0]?.toUpperCase() ?? '')}</td>` +
      `<td class="fe-ink" valign="middle" style="padding-${start}:10px;font-family:${f.head};font-size:17px;font-weight:600;line-height:1.2;color:${c.ink}">${esc(name)}</td></tr></table>`;

  const d = colors.dark;
  const dark = `@media (prefers-color-scheme:dark){` +
    `.fe-page{background-color:${d.page}!important}.fe-card{background-color:${d.card}!important;border-color:${d.line}!important}` +
    `.fe-sunk{background-color:${d.sunk}!important}.fe-line{border-color:${d.line}!important}.fe-rule{background-color:${d.line}!important}` +
    `.fe-ink{color:${d.ink}!important}.fe-mu-page{color:${d.muted.page}!important}.fe-mu-card{color:${d.muted.card}!important}.fe-mu-sunk{color:${d.muted.sunk}!important}` +
    `.fe-link{color:${d.link}!important}.fe-btn,.fe-mark{background-color:${d.accent}!important}.fe-btn-text{color:${d.onAccent}!important}.fe-mark{color:${d.onAccent}!important}.fe-bar{border-color:${d.accent}!important}}`;

  const pre = oneLine(preheader ?? '');
  return `<!doctype html>
<html lang="${lang}" dir="${dir}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(title || name)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>:root{color-scheme:light dark;supported-color-schemes:light dark}body{margin:0;padding:0}${dark}</style>
</head>
<body class="fe-page" style="margin:0;padding:0;background-color:${c.page}">
${pre ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${c.page}">${esc(pre)}${FILLER}</div>\n` : ''}<table role="presentation" class="fe-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.page}" style="background-color:${c.page}"><tr><td align="center" style="padding:32px 16px">
<!--[if mso]><table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${WIDTH}px">
<tr><td style="padding:0 4px 20px;text-align:${start}">${mark}</td></tr>
<tr><td class="fe-card fe-line" bgcolor="${c.card}" style="background-color:${c.card};border:1px solid ${c.line};border-radius:${radius}px;padding:32px 28px;text-align:${start}">${body.join('\n')}</td></tr>
${foot ? `<tr><td class="fe-mu-page" align="center" style="padding:20px 8px 0;font-family:${f.body};font-size:12px;line-height:1.6;color:${c.muted.page}">${foot}</td></tr>\n` : ''}</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>
`;
}

/* ---------- plain text ---------- */
function renderText(blocks) {
  const out = [];
  const foot = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading': out.push(oneLine(b.text)); break;
      case 'text': out.push((Array.isArray(b.text) ? b.text : [b.text]).map((x) => (typeof x === 'string' ? run(x) : `${oneLine(x.text)} (${new URL(x.href).href})`)).join('')); break;
      case 'button': out.push(`${oneLine(b.label)}:\n${new URL(b.href).href}`); break;
      case 'code': out.push(b.label ? `${oneLine(b.label)}: ${oneLine(b.value)}` : oneLine(b.value)); break;
      case 'keyValue': out.push(b.rows.map((r) => `${oneLine(r.label)}: ${oneLine(String(r.value))}`).join('\n')); break;
      case 'divider': out.push('----'); break;
      case 'note': out.push((b.title ? `${oneLine(b.title)}\n` : '') + para(b.text)); break;
      case 'section': out.push(`${oneLine(b.title).toUpperCase()}\n${'='.repeat(Math.min(60, [...oneLine(b.title)].length))}`); break;
      case 'story': out.push(`${b.kind ? `${oneLine(b.kind)}: ` : ''}${oneLine(b.title)}\n${para(b.text)}\n${oneLine(b.label ?? 'Read more')}: ${new URL(b.href).href}`); break;
      case 'list': out.push(b.items.map((item, j) => `${b.ordered ? `${j + 1}.` : '-'} ${(Array.isArray(item) ? item : [item]).map((x) => (typeof x === 'string' ? run(x) : `${oneLine(x.text)} (${new URL(x.href).href})`)).join('').replace(/\s+/g, ' ').trim()}`).join('\n')); break;
      case 'footer': foot.push(...(b.lines ?? []).map(para), ...(b.links ?? []).map((l) => `${oneLine(l.label)}: ${new URL(l.href).href}`)); break;
      default: break;
    }
  }
  return `${out.join('\n\n')}${foot.length ? `\n\n-- \n${foot.join('\n')}` : ''}\n`;
}

/** Render one transactional email. */
export function renderEmail({ theme, brand, preheader = '', blocks, locale = 'en' } = {}) {
  if (!brand || typeof brand.name !== 'string' || !oneLine(brand.name)) throw new TypeError('[email] brand.name is required');
  if (!Array.isArray(blocks) || !blocks.length) throw new TypeError('[email] blocks must be a non-empty array');
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(locale)) throw new TypeError('[email] locale must be a BCP 47 tag such as "en" or "pt-BR"');
  const b = { name: brand.name, logoUrl: brand.logoUrl ?? brand.logo };
  if (b.logoUrl != null) b.logoUrl = safeUrl(b.logoUrl, 'brand', 'logo', brand.logoUrl != null ? 'logoUrl' : 'logo', { schemes: ['https:'] });
  const out = render(theme, b, preheader, blocks, locale);   // validates every block before the text part reads them
  return { html: out, text: renderText(blocks) };
}
