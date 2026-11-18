/* The exporter's helper module (spec/EXPORT.md section 0.5, spec/export-map.json `helpers`): the only place these four
 * functions are defined. A Facet export writes its own copy as fire-export.js (or .ts); React code can import them
 * from fire-design/react. Pure functions: safe in server components. */

/** JSON for a <script type="application/json">: "<" escaped, so "</script>" cannot end the element. */
export const jsonForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
/** A Facet whole-hole attribute value: false, null, undefined → no attribute; true → ""; else a string. */
export const ccAttr = (v) => (v === false || v == null ? undefined : v === true ? '' : String(v));
/** A Facet text hole: null, undefined and booleans → ""; else a string. */
export const ccText = (v) => (v == null || typeof v === 'boolean' ? '' : String(v));
/** Facet truthiness: like JavaScript, except that an empty list is false. */
export const ccTruthy = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));
