// The helpers every Fire export shares (spec/EXPORT.md section 0, principle 5). Defined here and nowhere else.

/** JSON for a <script type="application/json">: "<" escaped, so "</script>" cannot end the element. */
export const jsonForScript = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');
/** A Facet whole-hole attribute value: false, null, undefined → no attribute; true → ""; else a string. */
export const ccAttr = (v: unknown): string | undefined => (v === false || v == null ? undefined : v === true ? '' : String(v));
/** A Facet text hole: null, undefined and booleans → ""; else a string. */
export const ccText = (v: unknown): string => (v == null || typeof v === 'boolean' ? '' : String(v));
/** Facet truthiness: like JavaScript, except that an empty list is false. */
export const ccTruthy = (v: unknown): boolean => (Array.isArray(v) ? v.length > 0 : Boolean(v));
