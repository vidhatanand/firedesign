// Fire's styles: its stylesheet first, then the look from theme.json (it must come after, spec H3), then ours.
import 'fire-design/css';
import './fire-theme.css';
import './app.css';

// Fire's elements (fd-icon, fd-chart, fd-code, fd-texture) register themselves on import. Do this before the first
// render (spec C1): a property set on an element that is not defined yet would be lost.
import 'fire-design/elements';

// Fire's behaviours. Importing it runs `init(document)` once the page is ready; components call `init` again
// after they render (see lib/fire-light.ts).
import 'fire-design';

// The shell is the router's outlet. No screen is imported here: src/routes.ts loads each one when it is first
// visited, so each is its own chunk.
import type { AppShell } from './shell/app-shell';
import './shell/app-shell';
import { startRouter } from './lib/router';
import { routes } from './routes';

void startRouter({
  routes,
  outlet: document.querySelector<AppShell>('app-shell')!,
  base: import.meta.env.BASE_URL, // Vite's `base` (vite.config.ts): the one place the app's path prefix is set
  title: (title) => `${title} · Ember`,
});
