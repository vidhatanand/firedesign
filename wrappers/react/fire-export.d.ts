/* Types of wrappers/react/fire-export.js (hand-written). */

/** JSON for a <script type="application/json">: "<" escaped, so "</script>" cannot end the element (M2, N5). */
export declare const jsonForScript: (value: unknown) => string;
/** A Facet whole-hole attribute value: false, null, undefined → no attribute; true → ""; else a string (B4). */
export declare const ccAttr: (v: unknown) => string | undefined;
/** A Facet text hole: null, undefined and booleans → ""; else a string (B3, B5). */
export declare const ccText: (v: unknown) => string;
/** Facet truthiness: like JavaScript, except that an empty list is false (B2, B6). */
export declare const ccTruthy: (v: unknown) => boolean;
