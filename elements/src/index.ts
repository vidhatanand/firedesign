/* Fire's custom elements: import 'fire-design/elements' (or load fire/elements.js) to register them.
 * Each renders Fire's markup form inside itself and enhances it with Fire's own modules (fire/js/*.js), which
 * stay separate files, so a page that also loads fire/fire.js shares one copy of each module. */
export { FireElement, type FireInit, type RootAttribute } from './fire-element.js';
export { FdIcon } from './icon.js';
export { FdChart, type FdChartType, type FdChartData } from './chart.js';
export { FdCode } from './code.js';
export { FdTexture } from './texture.js';
