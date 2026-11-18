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

import './shell/app-shell';
import './screens/overview/screen';
import './screens/logs/screen';
import './screens/settings/screen';
import './screens/elements/screen';

import { startRouter } from './lib/router';
startRouter();
