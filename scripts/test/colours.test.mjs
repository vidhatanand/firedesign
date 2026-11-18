// node --test scripts/test/colours.test.mjs : status and chart colours that follow the palette.
//   - ember's status and chart colours are the tokens.css literals and a fixed point of the engine
//   - every preset, a sweep of generated palettes and a sample of toned maps meet the status and chart rules
//   - a tone in the accent's colour family moves away from it (forest/success, rose/danger, ocean/info)
//   - the colour-blind simulation (Machado et al. 2009, severity 1.0) behaves: white and black stay, rows sum to 1
//   - the tokens flow: palettes.css, expandTheme/themeToCss, toneTokens
//   - fd-chart data-marks="dash": series 2–6 dashed, series 1 solid, dashed swatches in the legend; the docs section
//     renders without errors or sideways scroll at 375
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import {
  PALETTES, PALETTE_TOKENS, STATUS_TOKENS, CHART_TOKENS, COLOUR_TOKENS, STATUS_HUES, COLOUR_RULES, CVD,
  deriveColours, deltaE, simulate, toneTokens, getPalette, toOklch, contrast,
} from '../../fire/js/palettes.js';
import { colourFailures, measureColours } from '../../fire/js/palette-rules.js';
import { paletteFrom, expandTheme, themeToCss } from '../../fire/js/theme.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('PALETTE_TOKENS ends with the status and chart colours; every palette sets all of them', () => {
  assert.deepEqual(PALETTE_TOKENS.slice(-COLOUR_TOKENS.length), COLOUR_TOKENS);
  assert.equal(STATUS_TOKENS.length, 24);
  assert.equal(CHART_TOKENS.length, 6);
  for (const p of PALETTES) for (const k of PALETTE_TOKENS) assert.equal(p.tokens[k]?.length, 2, `${p.name} ${k}`);
});

test('ember: status and chart colours are the tokens.css literals and what the engine derives', () => {
  const ember = getPalette('ember');
  const css = fs.readFileSync(path.join(ROOT, 'fire/tokens.css'), 'utf8');
  for (const [k, lit] of [['--fd-success-solid', 'light-dark(#2fb457, #4ccd75)'], ['--fd-danger-fill', 'light-dark(#de2f25, #d63c2f)'], ['--fd-chart-3', 'light-dark(#00786d, #00c5b6)']]) {
    assert.ok(css.includes(`${k}: ${lit};`), `${k} literal in tokens.css`);
    assert.equal(`light-dark(${ember.tokens[k].join(', ')})`, lit);
  }
  const derived = deriveColours(ember.tokens).tokens;
  for (const k of COLOUR_TOKENS) assert.deepEqual(derived[k], ember.tokens[k], k);
  // Ember's status colours are 0.7's, unchanged.
  assert.deepEqual(ember.tokens['--fd-danger-solid'], ['#e5372b', '#f05545']);
  assert.deepEqual(ember.tokens['--fd-chart-1'], ember.tokens['--fd-accent']);
  assert.deepEqual(ember.tokens['--fd-chart-2'], ember.tokens['--fd-ink']);
  // 0.7's set (blue, violet, green, amber) misses the rules it is now held to.
  const old = ['#fa5d19', '#262626', '#2a6dfb', '#8a5cf6', '#2fb457', '#e8a917'];
  assert.ok(colourFailures({ ...ember.tokens, ...Object.fromEntries(CHART_TOKENS.map((k, i) => [k, [old[i], ember.tokens[k][1]]])) }, { modes: [0] }).length > 0);
});

test('every preset meets the status and chart rules, light and dark; no light-scheme series is olive', () => {
  for (const p of PALETTES) {
    for (let i = 3; i <= 6; i++) {
      const [, C, h] = toOklch(p.tokens[`--fd-chart-${i}`][0]);
      assert.ok(!(h >= COLOUR_RULES.chart.yellow[0] && h <= COLOUR_RULES.chart.yellow[1]), `${p.name} series ${i} light hue ${h.toFixed(0)}`);
      assert.ok(C >= COLOUR_RULES.chart.chroma - 1e-6, `${p.name} series ${i} chroma ${C}`);
    }
    assert.deepEqual(colourFailures(p.tokens, { name: p.name }), [], p.name);
    for (const m of [0, 1]) {
      const { chart } = measureColours(p.tokens, m);
      assert.ok([p.tokens['--fd-accent'][m], p.tokens['--fd-accent-text'][m]].includes(chart.series[0]), `${p.name}: series 1 leads with the accent`);
    }
  }
});

test('a tone whose family holds the accent moves at least 0.10 away from it; hues stay in range', () => {
  for (const [name, tone] of [['forest', 'success'], ['mint', 'success'], ['rose', 'danger'], ['ocean', 'info'], ['midnight', 'info'], ['honey', 'warning']]) {
    const t = getPalette(name).tokens;
    for (const m of [0, 1]) {
      const d = Math.min(deltaE(t['--fd-accent'][m], t[`--fd-${tone}-solid`][m]), deltaE(t['--fd-accent'][m], t[`--fd-${tone}-fill`][m]));
      assert.ok(d >= 0.1 - 1e-6, `${name} ${tone} ${m}: ${d}`);
    }
  }
  for (const p of PALETTES) {
    for (const tone of Object.keys(STATUS_HUES)) {
      for (const m of [0, 1]) {
        const h = toOklch(p.tokens[`--fd-${tone}-solid`][m])[2];
        const [a, b] = STATUS_HUES[tone].range;
        assert.ok(h >= a - 0.5 && h <= b + 0.5, `${p.name} ${tone} hue ${h}`);
      }
    }
  }
  // Danger never turns orange enough to read as warning: it stays at least 30° from ember's warning.
  for (const p of PALETTES) assert.ok(toOklch(p.tokens['--fd-danger-solid'][0])[2] < 50);
});

test('generated palettes (accents round the wheel, brand sets) and toned maps meet the rules', () => {
  let n = 0;
  // Three lightnesses of accent, turned round the wheel in 30° steps, under three neutral options.
  for (const neutral of ['tinted', 'pure', 'warm']) {
    for (let h = 0; h < 360; h += 30) {
      for (const hex of ['#e5386d', '#1f9d55', '#f5d90b'].map((c) => hueTurn(c, h))) {
        const p = paletteFrom({ from: 'accent', accent: hex, neutral });
        assert.deepEqual(colourFailures(p.tokens, { name: `${hex} ${neutral}` }), [], `${hex} ${neutral}`);
        n++;
      }
    }
  }
  for (const colors of [['#14342b', '#f2c14e'], ['#ff5a00', '#111111'], ['#7b2cbf'], ['#00a6a6', '#2b2d42', '#ef233c']]) {
    assert.deepEqual(colourFailures(paletteFrom({ from: 'brand', colors }).tokens, { name: colors.join('+') }), []);
    n++;
  }
  for (const p of PALETTES) {
    for (const tone of [{ hue: 120 }, { hue: -60, vivid: 140 }, { vivid: 30, warmth: 60 }]) {
      assert.deepEqual(colourFailures(toneTokens(p.tokens, tone), { name: `${p.name} ${JSON.stringify(tone)}` }), []);
    }
  }
  assert.ok(n > 100);
});

/** The colour turned by h degrees of OKLCH hue (a quick sweep of accents). */
function hueTurn(hex, h) {
  const [L, C, h0] = toOklch(hex);
  const rgbOf = (L2, a, b) => {
    const l = (L2 + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L2 - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L2 - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  };
  let c = C;
  for (;;) {
    const rad = ((h0 + h) % 360) * Math.PI / 180;
    const lin = rgbOf(L, c * Math.cos(rad), c * Math.sin(rad));
    if (lin.every((v) => v >= 0 && v <= 1) || c < 0.01) {
      return `#${lin.map((v) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055))).toString(16).padStart(2, '0')).join('')}`;
    }
    c -= 0.01;
  }
}

test('the colour-blind simulation: Machado 2009 severity 1.0 keeps white and black; red and green meet under deuteranopia', () => {
  for (const kind of Object.keys(CVD)) {
    for (const row of CVD[kind]) assert.ok(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-3, `${kind} row sums to 1`);
    assert.equal(simulate('#ffffff', kind), '#ffffff');
    assert.equal(simulate('#000000', kind), '#000000');
  }
  assert.ok(deltaE(simulate('#e5372b', 'deuteranopia'), simulate('#2fb457', 'deuteranopia')) < deltaE('#e5372b', '#2fb457') / 2);
  assert.equal(simulate('#2a6dfb', 'normal'), '#2a6dfb');
});

test('the tokens flow: palettes.css, expandTheme and themeToCss, toneTokens', () => {
  const css = fs.readFileSync(path.join(ROOT, 'fire/palettes.css'), 'utf8');
  const block = (name) => css.slice(css.indexOf(`[data-palette="${name}"] {`), css.indexOf('}', css.indexOf(`[data-palette="${name}"] {`)));
  assert.match(block('ember'), /--fd-chart-1: var\(--fd-accent\);/);
  assert.match(block('forest'), /--fd-success-solid: light-dark\(#[0-9a-f]{6}, #[0-9a-f]{6}\);/);
  assert.ok(block('forest').includes(`--fd-success-solid: light-dark(${getPalette('forest').tokens['--fd-success-solid'].join(', ')});`));
  // Volt's lime is not 3:1 on its light page: its series 1 is the accent text, written out.
  assert.ok(block('volt').includes(`--fd-chart-1: light-dark(${getPalette('volt').tokens['--fd-accent-text'][0]}`));
  const e = expandTheme({ palette: { from: 'accent', accent: '#1f9d55' } });
  for (const k of COLOUR_TOKENS) assert.equal(e.tokens[k].length, 2, k);
  assert.match(themeToCss({ palette: 'rose', tone: { hue: 20 } }), /--fd-danger-solid: light-dark\(/);
  // A zero tone copies the colours; a tone re-derives them from the toned palette.
  assert.deepEqual(toneTokens(getPalette('ocean').tokens)['--fd-info-solid'], getPalette('ocean').tokens['--fd-info-solid']);
  const turned = toneTokens(getPalette('ocean').tokens, { hue: 120 });
  assert.notDeepEqual(turned['--fd-chart-3'], getPalette('ocean').tokens['--fd-chart-3']);
  assert.ok(contrast(turned['--fd-chart-3'][0], turned['--fd-bg'][0]) >= 3);
});

/* ---------- In the browser ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let server, browser, base;
test.before(async () => {
  server = createServer(async (req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    try { res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(file)); }
    catch { res.writeHead(404).end('not found'); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
test.after(async () => { await browser?.close(); server?.close(); });

test('fd-chart data-marks="dash": series 2–6 dashed, series 1 solid, dashed legend swatches; the section fits at 375', async () => {
  for (const width of [1440, 375]) {
    const p = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${base}/docs/foundations.html#status-chart`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const chart = document.querySelector('[data-colours-specimen="ember-dash"] .fd-chart');
      const plain = document.querySelector('[data-colours-specimen="forest"] .fd-chart');
      const lines = [...chart.querySelectorAll('.fd-chart-line')].map((l) => ({ s: l.closest('[data-s]').dataset.s, dash: getComputedStyle(l).strokeDasharray, len: l.getAttribute('pathLength') }));
      return {
        marks: chart.dataset.marks,
        lines,
        plainDash: [...plain.querySelectorAll('.fd-chart-line')].map((l) => getComputedStyle(l).strokeDasharray),
        swatches: [...chart.querySelectorAll('.fd-legend-swatch')].map((s) => s.dataset.shape),
        rows: document.querySelectorAll('#colour-palettes .fx-pal-row').length,
        table: document.querySelectorAll('#colour-distances tbody tr').length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    assert.deepEqual(errors, []);
    assert.equal(r.overflow, 0, `no sideways scroll at ${width}`);
    assert.equal(r.marks, 'dash');
    for (const l of r.lines) {
      if (l.s === '1') { assert.ok(['none', '1px', '1'].includes(l.dash) || l.len === '1', `series 1 is solid (${l.dash})`); }
      else { assert.ok(/\d/.test(l.dash) && l.len === null, `series ${l.s} dashed (${l.dash})`); }
    }
    assert.equal(new Set(r.lines.filter((l) => l.s !== '1').map((l) => l.dash)).size, 5, 'five different dashes');
    assert.ok(r.plainDash.every((d) => !/\d+(px)?,? \d/.test(d) || d === '1px'), 'a chart without data-marks has no dash');
    assert.deepEqual(r.swatches, ['dash', 'dash', 'dash', 'dash', 'dash', 'dash']);
    assert.equal(r.rows, PALETTES.length);
    assert.equal(r.table, PALETTES.length);
    await p.close();
  }
});
