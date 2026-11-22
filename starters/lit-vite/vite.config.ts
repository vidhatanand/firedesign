import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite';
import { firstPaintFont } from './scripts/first-font.mjs';
import theme from './src/fire-theme.attributes.json';

/**
 * What the page needs that Vite does not do by itself.
 *  1. The theme's <html> attributes (data-palette, data-density, ...) go into index.html at build time, so the
 *     first paint already has them (spec H1). They come from theme.json through scripts/prepare.mjs.
 *  2. A strict Content Security Policy in the production build (spec P1): no inline styles or scripts.
 *     Vite's dev server injects <style> elements, so the policy is only added to `vite build`.
 *  3. In the production build, a preload of the one font file the first paint needs: the theme's interface face
 *     at the regular weight, found from what `fire slim` reports (.fire-slim/slim.json and its fire.css).
 *  4. In the production build, boot.js at the end of <head>, after the stylesheet Vite adds there (spec H5): it
 *     waits for that stylesheet, so nothing in the body is styled without it.
 * And the production build uses the slim Fire that scripts/prepare.mjs writes with `fire slim` (.fire-slim/: only
 * the parts, modules and fonts this app uses); `npm run dev` keeps the whole of Fire.
 *
 * The app's path prefix is Vite's `base` (`vite build --base /app/`); the router reads it as
 * import.meta.env.BASE_URL, so links, matching and asset URLs all follow it.
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

const slim = (file: string) => decodeURIComponent(new URL(`./.fire-slim/${file}`, import.meta.url).pathname);

/** boot.js, moved to the end of <head>. */
function bootLast(html: string) {
  const tag = /[ \t]*<script src="[^"]*fire\/boot\.js"><\/script>\r?\n/.exec(html)?.[0];
  if (!tag) throw new Error('index.html: no boot.js script to put after the stylesheets');
  return html.replace(tag, '').replace(/[ \t]*<\/head>/, (end) => tag + end);
}

function fireHtml(): Plugin {
  let base = '/';
  return {
    name: 'fire-html',
    configResolved(config) { base = config.base; },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const onHtml = Object.entries(theme as Record<string, string>).map(([name, value]) => ` ${name}="${value}"`).join('');
        const policy = ctx.server ? '' : `    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n`;
        const tags: HtmlTagDescriptor[] = [];
        const font = ctx.bundle && firstPaintFont(slim(''));
        const asset = font && Object.values(ctx.bundle!).find((out) => out.type === 'asset' && out.originalFileNames.some((name) => name.endsWith(`/${font}`)));
        if (asset) tags.push({ tag: 'link', injectTo: 'head', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: base + asset.fileName, crossorigin: true } });
        else if (ctx.bundle) this.warn('no font to preload: fire slim reports no Latin regular face for the theme');
        const out = html.replace('<html lang="en">', `<html lang="en"${onHtml}>`).replace('<!-- csp -->\n', policy);
        return { html: ctx.server ? out : bootLast(out), tags };
      },
    },
  };
}

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
    // Fire's shared chunk is about 590 kB before gzip. The size budgets in package.json ("fire": { "budget" }),
    // which `npm run check` enforces, are the limit that counts.
    chunkSizeWarningLimit: 650,
    // dist/.vite/manifest.json: the chunks each route needs. scripts/check.mjs reads it for the size budget.
    manifest: true,
    rolldownOptions: {
      output: {
        // Each screen is a chunk of its own through its import() in src/routes.ts, named after its folder. Lit,
        // Fire and src/lib (what screens import from the app) go in shared chunks of their own, so a change to one
        // screen changes that screen's file and the entry's (which names it), and no other file name.
        codeSplitting: {
          groups: [
            { name: 'lit', test: /[\\/]node_modules[\\/](?:lit|lit-html|lit-element|@lit[\\/]reactive-element)[\\/]/, priority: 3 },
            { name: 'fire', test: /[\\/](?:\.fire-slim[\\/]fire\.js|fire[\\/](?:fire\.js|elements\.js|js[\\/]))/, priority: 2 },
            { name: 'app', test: /[\\/]src[\\/]lib[\\/]/, priority: 1 },
          ],
        },
        chunkFileNames: (chunk) => `assets/${/[\\/]screens[\\/]([\w-]+)[\\/]/.exec(chunk.facadeModuleId ?? '')?.[1] ?? '[name]'}-[hash].js`,
      },
    },
  },
}));
