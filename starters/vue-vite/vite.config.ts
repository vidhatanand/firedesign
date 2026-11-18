import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fireVueOptions } from 'fire-design/vue';
import themeAttributes from './src/fire-theme.json';

/** The look's attributes (data-palette, data-density, …) go on <html> in index.html (EXPORT H3). */
const htmlAttributes = (): Plugin => ({
  name: 'fire-html-attributes',
  transformIndexHtml: (html) => html.replace('<html lang="en">', () => `<html lang="en"${Object.entries(themeAttributes).map(([k, v]) => ` ${k}="${v}"`).join('')}>`),
});

/** The production build runs under a strict Content Security Policy (EXPORT P1): no inline script, no inline style.
 *  The development server injects <style> elements for CSS (P2), so the policy is only added to the build. */
const csp = (): Plugin => ({
  name: 'fire-csp',
  apply: 'build',
  transformIndexHtml: () => [{
    tag: 'meta',
    attrs: {
      'http-equiv': 'Content-Security-Policy',
      content: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
    },
    injectTo: 'head-prepend',
  }],
});

export default defineConfig({
  // fireVueOptions: `fd-` tags are custom elements, and whitespace between inline elements is kept (EXPORT C8, T1).
  plugins: [vue(fireVueOptions()), htmlAttributes(), csp()],
  build: {
    // Vite's default CSS target lowers light-dark(), which breaks color-scheme overrides.
    cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5'],
    // Small files stay files: `data:` URLs would need their own CSP source.
    assetsInlineLimit: 0,
  },
});
