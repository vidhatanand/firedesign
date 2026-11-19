import { defineConfig, type Plugin } from 'vite';
import theme from './src/fire-theme.attributes.json';

/**
 * Two things the page needs that Vite does not do by itself.
 *  1. The theme's <html> attributes (data-palette, data-density, ...) go into index.html at build time, so the
 *     first paint already has them (spec H1). They come from theme.json through scripts/prepare.mjs.
 *  2. A strict Content Security Policy in the production build (spec P1): no inline styles or scripts.
 *     Vite's dev server injects <style> elements, so the policy is only added to `vite build`.
 * And the production build uses the slim Fire that scripts/prepare.mjs writes with `fire slim` (.fire-slim/: only
 * the parts, modules and fonts this app uses); `npm run dev` keeps the whole of Fire.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function fireHtml(): Plugin {
  return {
    name: 'fire-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const onHtml = Object.entries(theme as Record<string, string>).map(([name, value]) => ` ${name}="${value}"`).join('');
        const policy = ctx.server ? '' : `    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n`;
        return html.replace('<html lang="en">', `<html lang="en"${onHtml}>`).replace('<!-- csp -->\n', policy);
      },
    },
  };
}

const slim = (file: string) => decodeURIComponent(new URL(`./.fire-slim/${file}`, import.meta.url).pathname);

export default defineConfig(({ command, mode }) => ({
  plugins: [fireHtml()],
  // `vite build --mode full` builds with the whole of Fire (to compare). fire-design/elements stays as it is: it
  // shares Fire's module files with the slim entry. Fire's wrappers load
  // fire.js by a relative path (../../fire/fire.js), so that is pointed at the slim entry too.
  resolve: command === 'build' && mode !== 'full' ? { alias: [
    { find: /^fire-design$/, replacement: slim('fire.js') },
    { find: /^fire-design\/css$/, replacement: slim('fire.css') },
    { find: /^(?:\.\.\/)+fire\/fire\.js$/, replacement: slim('fire.js') },
  ] } : {},
  server: { host: '127.0.0.1' },
  build: {
    target: 'es2022',
    // Fire's tokens use light-dark(), which Chrome 123, Firefox 120 and Safari 17.5 understand. Vite's default CSS
    // target is older, so lightningcss would rewrite every light-dark() into a custom-property toggle that follows
    // the page's theme only, and a `color-scheme: light` on one element (the QR code in a dark page) would be ignored.
    cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5'],
  },
}));
