/* fire-design/react: Fire for React 19 and Next.js (spec/ARCHITECTURE.md section 6, spec/EXPORT.md).
 *   FireIcon, FireChart, FireCode, FireTexture   the custom elements as components (GENERATED: elements.js)
 *   useFire, useFireEvent, loadFire             hooks (hooks.js)
 *   jsonForScript, ccAttr, ccText, ccTruthy     the exporter's helpers (fire-export.js; safe on a server)
 * ESM with types, no build step. react and @lit/react are optional peer dependencies of fire-design. */
export { FireChart, FireCode, FireIcon, FireTexture } from './elements.js';
export { loadFire, useFire, useFireEvent } from './hooks.js';
export { ccAttr, ccText, ccTruthy, jsonForScript } from './fire-export.js';
