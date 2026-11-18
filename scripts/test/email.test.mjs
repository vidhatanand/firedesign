// node --test scripts/test/ : fire/email (renderEmail).
//   snapshot  the sign-in email for ember and a generated palette is docs/assets/email/signin-<look>.{html,txt}
//             (node fire/email/build-examples.mjs rewrites them; the docs page frames them)
//   contrast  every text colour the email uses is 4.5:1 on the ground it sits on, light and dark, for all 15 presets,
//             their high-contrast form, and generated palettes
//   resources no script, stylesheet link, web font, css url() or remote image; the logo is the only src
//   structure lang and dir, role="presentation" on every table, real headings, Outlook button, preheader, dark block
//   safety    values are escaped, unsafe URLs and bad blocks throw
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderEmail, emailColors, isRtl } from '../../fire/email/email.js';
import { THEMES, BRAND, signIn } from '../../fire/email/examples.mjs';
import { examples } from '../../fire/email/build-examples.mjs';
import { PALETTES, contrast } from '../../fire/js/palettes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const shown = (name) => fs.readFileSync(path.join(ROOT, 'docs/assets/email', name), 'utf8');
const one = (extra = {}, theme = THEMES.ember) => renderEmail({ theme, ...signIn(extra) });
const text = (blocks) => renderEmail({ brand: BRAND, blocks });

test('snapshot: the committed examples are a fresh render', () => {
  for (const [name, body] of Object.entries(examples())) assert.equal(shown(name), body, `docs/assets/email/${name} is stale: run node fire/email/build-examples.mjs`);
});

test('the text alternative carries every block', () => {
  const t = one().text;
  assert.match(t, /^Sign in to Ember\n\n/);
  assert.match(t, /Sign in to Ember:\nhttps:\/\/app\.ember\.example\/auth\/verify\?token=7f3a91c0/);
  assert.match(t, /Your code: 482 913/);
  assert.match(t, /Requested from: Chrome on macOS\nLocation: Lisbon, Portugal\nTime: 18 Nov 2026, 09:41 UTC/);
  assert.match(t, /Not you\?\nIgnore this email/);
  assert.match(t, /\n-- \nEmber, Inc\.[^\n]*\nPrivacy: https:\/\/ember\.example\/privacy\nHelp centre: https:\/\/ember\.example\/help\n$/);
  assert.ok(!/[<>]|&amp;/.test(t), 'no markup in the text part');
  assert.match(text([{ type: 'text', text: ['Read the ', { text: 'terms', href: 'https://ember.example/terms' }, '.'] }]).text, /^Read the terms \(https:\/\/ember\.example\/terms\)\.\n$/);
});

const GROUNDS = ['page', 'card', 'sunk'];
function checkColors(c, label) {
  for (const scheme of ['light', 'dark']) {
    const k = c[scheme];
    const pairs = [
      ['ink on card', k.ink, k.card], ['ink on page', k.ink, k.page], ['ink on sunk', k.ink, k.sunk],
      ['link on card', k.link, k.card], ['link on page', k.link, k.page],
      ['button text on accent', k.onAccent, k.accent],
      ...GROUNDS.map((g) => [`muted on ${g}`, k.muted[g], k[g]]),
    ];
    for (const [what, fg, bg] of pairs) {
      assert.match(fg + bg, /^#[0-9a-f]{6}#[0-9a-f]{6}$/, `${label} ${scheme} ${what}: opaque hex`);
      assert.ok(contrast(fg, bg) >= 4.5, `${label} ${scheme} ${what}: ${contrast(fg, bg).toFixed(2)}:1`);
    }
  }
}

test('contrast: every preset, normal and high contrast, is 4.5:1 for every text pair in both schemes', () => {
  for (const p of PALETTES) {
    checkColors(emailColors({ palette: p.name }), p.name);
    checkColors(emailColors({ palette: p.name, dials: { contrast: 'high' } }), `${p.name}/high`);
  }
});

test('contrast: generated and toned palettes', () => {
  for (const accent of ['#1f6feb', '#e11d48', '#14b8a6', '#f2c14e', '#6d28d9', '#222222']) {
    checkColors(emailColors({ palette: { from: 'accent', accent, neutral: 'warm' } }), accent);
  }
  checkColors(emailColors({ palette: { from: 'brand', colors: ['#14342b', '#f2c14e'] } }), 'brand');
  checkColors(emailColors({ palette: 'volt', tone: { hue: 40, vivid: 120, warmth: 30 } }), 'toned volt');
});

test('colours follow the theme record', () => {
  const ember = emailColors(THEMES.ember);
  assert.equal(ember.light.accent, '#fa5d19');
  assert.equal(ember.light.page, '#f9f9f9');
  assert.equal(ember.dark.page, '#0a0a0a');
  assert.equal(emailColors(THEMES.generated).light.accent, '#1f6feb');
  assert.equal(emailColors().light.accent, ember.light.accent, 'no theme is the default look');
  assert.ok(one().html.includes('#fa5d19') && !one().html.includes('#1f6feb'));
  assert.ok(one({}, THEMES.generated).html.includes('#1f6feb'));
  assert.throws(() => emailColors({ palette: 'nope' }), /palette/);
});

test('resources: nothing loads but the logo', () => {
  for (const t of Object.values(THEMES)) {
    const { html } = renderEmail({ theme: t, ...signIn() });
    assert.ok(!/<(script|link|iframe|object|embed|video|audio|form|input)\b/i.test(html));
    assert.ok(!/@import|@font-face|url\(|var\(|--fd-/.test(html), 'no web fonts, css urls or custom properties');
    assert.ok(!/<img\b/i.test(html), 'no logo, no image: the initial is drawn');
    assert.ok(!/\ssrc=/i.test(html));
  }
  const logo = 'https://cdn.ember.example/logo.png';
  const { html } = one({ brand: { name: 'Ember', logoUrl: logo } });
  assert.deepEqual([...html.matchAll(/\ssrc="([^"]*)"/g)].map((m) => m[1]), [logo]);
  assert.equal([...html.matchAll(/<img\b/g)].length, 1);
  assert.match(html, /<img [^>]*alt="Ember"/);
  assert.throws(() => one({ brand: { name: 'Ember', logoUrl: 'http://x.example/l.png' } }), /https/);
  assert.throws(() => one({ brand: { name: 'Ember', logoUrl: 'data:image/png;base64,AA' } }), /https/);
});

test('structure', () => {
  const { html } = one();
  assert.match(html, /^<!doctype html>\n<html lang="en" dir="ltr"/);
  assert.match(html, /<meta name="color-scheme" content="light dark">/);
  assert.match(html, /@media \(prefers-color-scheme:dark\)/);
  assert.equal([...html.matchAll(/<h1[ >]/g)].length, 1);
  assert.match(html, /<h1 [^>]*>Sign in to Ember<\/h1>/);
  const tables = [...html.matchAll(/<table\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(tables.length >= 6);
  for (const t of tables) assert.match(t, /role="presentation"/);
  assert.match(html, /max-width:560px/);
  assert.match(html, /<v:roundrect[^>]*href="https:\/\/app\.ember\.example\/auth\/verify\?token=7f3a91c0"/);
  assert.match(html, /<!--\[if !mso\]><!-->/);
  assert.match(html, />Your sign-in link for Ember expires in 15 minutes\./, 'preheader');
  assert.match(html, /<title>Sign in to Ember<\/title>/);
  assert.ok(!/font-family:[^;"]*"/.test(html) && !/@font-face/.test(html), 'system stacks, and no double quote inside a style attribute');
  assert.match(html, /<td [^>]*>E<\/td>/, 'the drawn initial');
  // Every style is inline; the only <style> is the one dark-mode block.
  assert.equal([...html.matchAll(/<style>/g)].length, 1);
  assert.ok(![...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].some((m) => /^[^@:]*\.fe-[a-z-]+\{[^}]*\}(?!.*@media)/.test(m[1].replace(/^:root\{[^}]*\}body\{[^}]*\}/, ''))), 'the style block holds only dark rules');
  assert.equal(html.match(/<link text|<a [^>]*>[^<]*<\/a>/g).every((a) => /href="https:/.test(a)), true);
});

test('locale, rtl, headings and link text', () => {
  assert.match(renderEmail({ brand: BRAND, locale: 'ar', blocks: [{ type: 'heading', text: 'مرحبا' }] }).html, /<html lang="ar" dir="rtl"/);
  assert.match(renderEmail({ brand: BRAND, locale: 'pt-BR', blocks: [{ type: 'heading', text: 'Olá' }] }).html, /lang="pt-BR" dir="ltr"/);
  assert.ok(isRtl('he-IL') && !isRtl('en'));
  const { html } = text([{ type: 'heading', text: 'A' }, { type: 'heading', text: 'B' }, { type: 'heading', text: 'C', level: 1 }]);
  assert.deepEqual([...html.matchAll(/<h([12])\b/g)].map((m) => m[1]), ['1', '2', '1']);
  // A link in text says where it goes: the caller's words; a button's address is printed beneath it.
  const { html: h2 } = text([{ type: 'text', text: ['See ', { text: 'the billing page', href: 'https://ember.example/billing' }] }, { type: 'button', label: 'Open billing', href: 'https://ember.example/billing', fallback: 'Paste it:' }]);
  assert.match(h2, />the billing page<\/a>/);
  assert.match(h2, /Paste it:<br><a [^>]*>https:\/\/ember\.example\/billing<\/a>/);
  assert.ok(!text([{ type: 'button', label: 'Go', href: 'https://ember.example/x', fallback: false }]).html.includes('paste'));
});

test('safety: escaping and validation', () => {
  const evil = `<img src=x onerror=alert(1)> "quoted" & 'single'`;
  const out = renderEmail({ brand: { name: evil }, preheader: evil, blocks: [
    { type: 'heading', text: evil }, { type: 'text', text: `${evil}\nsecond line` }, { type: 'code', value: evil, label: evil },
    { type: 'keyValue', rows: [{ label: evil, value: evil }] }, { type: 'note', text: evil, title: evil },
    { type: 'footer', lines: [evil], links: [{ label: evil, href: 'https://ember.example/?a=1&b="2"' }] },
  ] });
  assert.ok(!/<img\b/.test(out.html), 'markup in a value is text');
  assert.ok(out.html.includes('&lt;img src=x onerror=alert(1)&gt; &quot;quoted&quot; &amp; &#39;single&#39;'));
  assert.ok(out.html.includes('href="https://ember.example/?a=1&amp;b=%222%22"'), 'attributes are escaped');
  assert.match(out.html, /second line/);
  const hdr = text([{ type: 'heading', text: 'Line one\r\nBcc: x@y.example' }]);
  assert.ok(!/<h1[^>]*>[^<]*\n/.test(hdr.html), 'a heading is one line');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', '/relative', 'ftp://x.example/', '']) {
    assert.throws(() => text([{ type: 'button', label: 'Go', href: bad }]), /\[email\] block 0 \(button\)/, bad);
  }
  assert.throws(() => text([{ type: 'unknown' }]), /unknown block type/);
  assert.throws(() => text([{ type: 'heading' }]), /text must be/);
  assert.throws(() => text([{ type: 'keyValue', rows: [] }]), /rows/);
  assert.throws(() => renderEmail({ brand: BRAND, blocks: [] }), /blocks/);
  assert.throws(() => renderEmail({ blocks: [{ type: 'divider' }] }), /brand\.name/);
  assert.throws(() => renderEmail({ brand: BRAND, locale: 'x"y', blocks: [{ type: 'divider' }] }), /locale/);
  assert.throws(() => renderEmail({ theme: { palette: 'nope' }, brand: BRAND, blocks: [{ type: 'divider' }] }), /palette/);
});

test('the card (fire/email/email.card.json) is valid against the card schema and names real components and docs', async () => {
  const { default: Ajv2020 } = await import('ajv/dist/2020.js');
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/cards/card.schema.json'), 'utf8'));
  const card = JSON.parse(fs.readFileSync(path.join(ROOT, 'fire/email/email.card.json'), 'utf8'));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  assert.ok(validate(card), JSON.stringify(validate.errors));
  const ids = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/catalog.json'), 'utf8')).components.map((c) => c.id));
  for (const a of card.avoidWhen) if (/^[a-z-]+$/.test(a.instead)) assert.ok(ids.has(a.instead), a.instead);
  const [file, id] = card.example.split('#');
  assert.ok(new RegExp(`<section class="doc-section"[^>]*\\sid="${id}"`).test(fs.readFileSync(path.join(ROOT, file), 'utf8')));
});
