/* Fire custom elements: fd-icon, fd-chart, fd-code, fd-texture. BUILT by scripts/build-elements.mjs from elements/src
 * (TypeScript, Lit): edit the source and rebuild, never this file. Fire's modules are imported from ./js/ and shared
 * with fire/fire.js. Bundles Lit 3.3.3 (https://lit.dev), Copyright Google LLC, BSD-3-Clause: see fire/LICENSE-lit.txt. */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t4, e6, o7) {
    if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t4, this.t = e6;
  }
  get styleSheet() {
    let t4 = this.o;
    const s4 = this.t;
    if (e && void 0 === t4) {
      const e6 = void 0 !== s4 && 1 === s4.length;
      e6 && (t4 = o.get(s4)), void 0 === t4 && ((this.o = t4 = new CSSStyleSheet()).replaceSync(this.cssText), e6 && o.set(s4, t4));
    }
    return t4;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t4) => new n("string" == typeof t4 ? t4 : t4 + "", void 0, s);
var S = (s4, o7) => {
  if (e) s4.adoptedStyleSheets = o7.map((t4) => t4 instanceof CSSStyleSheet ? t4 : t4.styleSheet);
  else for (const e6 of o7) {
    const o8 = document.createElement("style"), n5 = t.litNonce;
    void 0 !== n5 && o8.setAttribute("nonce", n5), o8.textContent = e6.cssText, s4.appendChild(o8);
  }
};
var c = e ? (t4) => t4 : (t4) => t4 instanceof CSSStyleSheet ? ((t5) => {
  let e6 = "";
  for (const s4 of t5.cssRules) e6 += s4.cssText;
  return r(e6);
})(t4) : t4;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t4, s4) => t4;
var u = { toAttribute(t4, s4) {
  switch (s4) {
    case Boolean:
      t4 = t4 ? l : null;
      break;
    case Object:
    case Array:
      t4 = null == t4 ? t4 : JSON.stringify(t4);
  }
  return t4;
}, fromAttribute(t4, s4) {
  let i7 = t4;
  switch (s4) {
    case Boolean:
      i7 = null !== t4;
      break;
    case Number:
      i7 = null === t4 ? null : Number(t4);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t4);
      } catch (t5) {
        i7 = null;
      }
  }
  return i7;
} };
var f = (t4, s4) => !i2(t4, s4);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t4) {
    this._$Ei(), (this.l ??= []).push(t4);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t4, s4 = b) {
    if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t4) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t4, s4), !s4.noAccessor) {
      const i7 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t4, i7, s4);
      void 0 !== h3 && e2(this.prototype, t4, h3);
    }
  }
  static getPropertyDescriptor(t4, s4, i7) {
    const { get: e6, set: r5 } = h(this.prototype, t4) ?? { get() {
      return this[s4];
    }, set(t5) {
      this[s4] = t5;
    } };
    return { get: e6, set(s5) {
      const h3 = e6?.call(this);
      r5?.call(this, s5), this.requestUpdate(t4, h3, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t4) {
    return this.elementProperties.get(t4) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t4 = n2(this);
    t4.finalize(), void 0 !== t4.l && (this.l = [...t4.l]), this.elementProperties = new Map(t4.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t5 = this.properties, s4 = [...r2(t5), ...o2(t5)];
      for (const i7 of s4) this.createProperty(i7, t5[i7]);
    }
    const t4 = this[Symbol.metadata];
    if (null !== t4) {
      const s4 = litPropertyMetadata.get(t4);
      if (void 0 !== s4) for (const [t5, i7] of s4) this.elementProperties.set(t5, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t5, s4] of this.elementProperties) {
      const i7 = this._$Eu(t5, s4);
      void 0 !== i7 && this._$Eh.set(i7, t5);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s4) {
    const i7 = [];
    if (Array.isArray(s4)) {
      const e6 = new Set(s4.flat(1 / 0).reverse());
      for (const s5 of e6) i7.unshift(c(s5));
    } else void 0 !== s4 && i7.push(c(s4));
    return i7;
  }
  static _$Eu(t4, s4) {
    const i7 = s4.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t4 ? t4.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t4) => this.enableUpdating = t4), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t4) => t4(this));
  }
  addController(t4) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t4), void 0 !== this.renderRoot && this.isConnected && t4.hostConnected?.();
  }
  removeController(t4) {
    this._$EO?.delete(t4);
  }
  _$E_() {
    const t4 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
    for (const i7 of s4.keys()) this.hasOwnProperty(i7) && (t4.set(i7, this[i7]), delete this[i7]);
    t4.size > 0 && (this._$Ep = t4);
  }
  createRenderRoot() {
    const t4 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t4, this.constructor.elementStyles), t4;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t4) => t4.hostConnected?.());
  }
  enableUpdating(t4) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t4) => t4.hostDisconnected?.());
  }
  attributeChangedCallback(t4, s4, i7) {
    this._$AK(t4, i7);
  }
  _$ET(t4, s4) {
    const i7 = this.constructor.elementProperties.get(t4), e6 = this.constructor._$Eu(t4, i7);
    if (void 0 !== e6 && true === i7.reflect) {
      const h3 = (void 0 !== i7.converter?.toAttribute ? i7.converter : u).toAttribute(s4, i7.type);
      this._$Em = t4, null == h3 ? this.removeAttribute(e6) : this.setAttribute(e6, h3), this._$Em = null;
    }
  }
  _$AK(t4, s4) {
    const i7 = this.constructor, e6 = i7._$Eh.get(t4);
    if (void 0 !== e6 && this._$Em !== e6) {
      const t5 = i7.getPropertyOptions(e6), h3 = "function" == typeof t5.converter ? { fromAttribute: t5.converter } : void 0 !== t5.converter?.fromAttribute ? t5.converter : u;
      this._$Em = e6;
      const r5 = h3.fromAttribute(s4, t5.type);
      this[e6] = r5 ?? this._$Ej?.get(e6) ?? r5, this._$Em = null;
    }
  }
  requestUpdate(t4, s4, i7, e6 = false, h3) {
    if (void 0 !== t4) {
      const r5 = this.constructor;
      if (false === e6 && (h3 = this[t4]), i7 ??= r5.getPropertyOptions(t4), !((i7.hasChanged ?? f)(h3, s4) || i7.useDefault && i7.reflect && h3 === this._$Ej?.get(t4) && !this.hasAttribute(r5._$Eu(t4, i7)))) return;
      this.C(t4, s4, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t4, s4, { useDefault: i7, reflect: e6, wrapped: h3 }, r5) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t4) && (this._$Ej.set(t4, r5 ?? s4 ?? this[t4]), true !== h3 || void 0 !== r5) || (this._$AL.has(t4) || (this.hasUpdated || i7 || (s4 = void 0), this._$AL.set(t4, s4)), true === e6 && this._$Em !== t4 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t4));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t5) {
      Promise.reject(t5);
    }
    const t4 = this.scheduleUpdate();
    return null != t4 && await t4, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t6, s5] of this._$Ep) this[t6] = s5;
        this._$Ep = void 0;
      }
      const t5 = this.constructor.elementProperties;
      if (t5.size > 0) for (const [s5, i7] of t5) {
        const { wrapped: t6 } = i7, e6 = this[s5];
        true !== t6 || this._$AL.has(s5) || void 0 === e6 || this.C(s5, void 0, i7, e6);
      }
    }
    let t4 = false;
    const s4 = this._$AL;
    try {
      t4 = this.shouldUpdate(s4), t4 ? (this.willUpdate(s4), this._$EO?.forEach((t5) => t5.hostUpdate?.()), this.update(s4)) : this._$EM();
    } catch (s5) {
      throw t4 = false, this._$EM(), s5;
    }
    t4 && this._$AE(s4);
  }
  willUpdate(t4) {
  }
  _$AE(t4) {
    this._$EO?.forEach((t5) => t5.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t4)), this.updated(t4);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t4) {
    return true;
  }
  update(t4) {
    this._$Eq &&= this._$Eq.forEach((t5) => this._$ET(t5, this[t5])), this._$EM();
  }
  updated(t4) {
  }
  firstUpdated(t4) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t4) => t4;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t4) => t4 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t4) => null === t4 || "object" != typeof t4 && "function" != typeof t4;
var u2 = Array.isArray;
var d2 = (t4) => u2(t4) || "function" == typeof t4?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t4) => (i7, ...s4) => ({ _$litType$: t4, strings: i7, values: s4 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t4, i7) {
  if (!u2(t4) || !t4.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i7) : i7;
}
var N = (t4, i7) => {
  const s4 = t4.length - 1, e6 = [];
  let n5, l3 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c4 = v;
  for (let i8 = 0; i8 < s4; i8++) {
    const s5 = t4[i8];
    let a3, u3, d3 = -1, f3 = 0;
    for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n5 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n5 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a3 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n5 = void 0);
    const x2 = c4 === p2 && t4[i8 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e6.push(a3), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x2) : s5 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [V(t4, l3 + (t4[s4] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e6];
};
var S2 = class _S {
  constructor({ strings: t4, _$litType$: i7 }, e6) {
    let r5;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u3 = t4.length - 1, d3 = this.parts, [f3, v2] = N(t4, i7);
    if (this.el = _S.createElement(f3, e6), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t5 = this.el.content.firstChild;
      t5.replaceWith(...t5.childNodes);
    }
    for (; null !== (r5 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r5.nodeType) {
        if (r5.hasAttributes()) for (const t5 of r5.getAttributeNames()) if (t5.endsWith(h2)) {
          const i8 = v2[a3++], s4 = r5.getAttribute(t5).split(o3), e7 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l3, name: e7[2], strings: s4, ctor: "." === e7[1] ? I : "?" === e7[1] ? L : "@" === e7[1] ? z : H }), r5.removeAttribute(t5);
        } else t5.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r5.removeAttribute(t5));
        if (y2.test(r5.tagName)) {
          const t5 = r5.textContent.split(o3), i8 = t5.length - 1;
          if (i8 > 0) {
            r5.textContent = s2 ? s2.emptyScript : "";
            for (let s4 = 0; s4 < i8; s4++) r5.append(t5[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r5.append(t5[i8], c3());
          }
        }
      } else if (8 === r5.nodeType) if (r5.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t5 = -1;
        for (; -1 !== (t5 = r5.data.indexOf(o3, t5 + 1)); ) d3.push({ type: 7, index: l3 }), t5 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t4, i7) {
    const s4 = l2.createElement("template");
    return s4.innerHTML = t4, s4;
  }
};
function M(t4, i7, s4 = t4, e6) {
  if (i7 === E) return i7;
  let h3 = void 0 !== e6 ? s4._$Co?.[e6] : s4._$Cl;
  const o7 = a2(i7) ? void 0 : i7._$litDirective$;
  return h3?.constructor !== o7 && (h3?._$AO?.(false), void 0 === o7 ? h3 = void 0 : (h3 = new o7(t4), h3._$AT(t4, s4, e6)), void 0 !== e6 ? (s4._$Co ??= [])[e6] = h3 : s4._$Cl = h3), void 0 !== h3 && (i7 = M(t4, h3._$AS(t4, i7.values), h3, e6)), i7;
}
var R = class {
  constructor(t4, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t4, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t4) {
    const { el: { content: i7 }, parts: s4 } = this._$AD, e6 = (t4?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e6;
    let h3 = P.nextNode(), o7 = 0, n5 = 0, r5 = s4[0];
    for (; void 0 !== r5; ) {
      if (o7 === r5.index) {
        let i8;
        2 === r5.type ? i8 = new k(h3, h3.nextSibling, this, t4) : 1 === r5.type ? i8 = new r5.ctor(h3, r5.name, r5.strings, this, t4) : 6 === r5.type && (i8 = new Z(h3, this, t4)), this._$AV.push(i8), r5 = s4[++n5];
      }
      o7 !== r5?.index && (h3 = P.nextNode(), o7++);
    }
    return P.currentNode = l2, e6;
  }
  p(t4) {
    let i7 = 0;
    for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t4, s4, i7), i7 += s4.strings.length - 2) : s4._$AI(t4[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t4, i7, s4, e6) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t4, this._$AB = i7, this._$AM = s4, this.options = e6, this._$Cv = e6?.isConnected ?? true;
  }
  get parentNode() {
    let t4 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t4?.nodeType && (t4 = i7.parentNode), t4;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t4, i7 = this) {
    t4 = M(this, t4, i7), a2(t4) ? t4 === A || null == t4 || "" === t4 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t4 !== this._$AH && t4 !== E && this._(t4) : void 0 !== t4._$litType$ ? this.$(t4) : void 0 !== t4.nodeType ? this.T(t4) : d2(t4) ? this.k(t4) : this._(t4);
  }
  O(t4) {
    return this._$AA.parentNode.insertBefore(t4, this._$AB);
  }
  T(t4) {
    this._$AH !== t4 && (this._$AR(), this._$AH = this.O(t4));
  }
  _(t4) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t4 : this.T(l2.createTextNode(t4)), this._$AH = t4;
  }
  $(t4) {
    const { values: i7, _$litType$: s4 } = t4, e6 = "number" == typeof s4 ? this._$AC(t4) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
    if (this._$AH?._$AD === e6) this._$AH.p(i7);
    else {
      const t5 = new R(e6, this), s5 = t5.u(this.options);
      t5.p(i7), this.T(s5), this._$AH = t5;
    }
  }
  _$AC(t4) {
    let i7 = C.get(t4.strings);
    return void 0 === i7 && C.set(t4.strings, i7 = new S2(t4)), i7;
  }
  k(t4) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s4, e6 = 0;
    for (const h3 of t4) e6 === i7.length ? i7.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i7[e6], s4._$AI(h3), e6++;
    e6 < i7.length && (this._$AR(s4 && s4._$AB.nextSibling, e6), i7.length = e6);
  }
  _$AR(t4 = this._$AA.nextSibling, s4) {
    for (this._$AP?.(false, true, s4); t4 !== this._$AB; ) {
      const s5 = i3(t4).nextSibling;
      i3(t4).remove(), t4 = s5;
    }
  }
  setConnected(t4) {
    void 0 === this._$AM && (this._$Cv = t4, this._$AP?.(t4));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t4, i7, s4, e6, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t4, this.name = i7, this._$AM = e6, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
  }
  _$AI(t4, i7 = this, s4, e6) {
    const h3 = this.strings;
    let o7 = false;
    if (void 0 === h3) t4 = M(this, t4, i7, 0), o7 = !a2(t4) || t4 !== this._$AH && t4 !== E, o7 && (this._$AH = t4);
    else {
      const e7 = t4;
      let n5, r5;
      for (t4 = h3[0], n5 = 0; n5 < h3.length - 1; n5++) r5 = M(this, e7[s4 + n5], i7, n5), r5 === E && (r5 = this._$AH[n5]), o7 ||= !a2(r5) || r5 !== this._$AH[n5], r5 === A ? t4 = A : t4 !== A && (t4 += (r5 ?? "") + h3[n5 + 1]), this._$AH[n5] = r5;
    }
    o7 && !e6 && this.j(t4);
  }
  j(t4) {
    t4 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t4 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t4) {
    this.element[this.name] = t4 === A ? void 0 : t4;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t4) {
    this.element.toggleAttribute(this.name, !!t4 && t4 !== A);
  }
};
var z = class extends H {
  constructor(t4, i7, s4, e6, h3) {
    super(t4, i7, s4, e6, h3), this.type = 5;
  }
  _$AI(t4, i7 = this) {
    if ((t4 = M(this, t4, i7, 0) ?? A) === E) return;
    const s4 = this._$AH, e6 = t4 === A && s4 !== A || t4.capture !== s4.capture || t4.once !== s4.once || t4.passive !== s4.passive, h3 = t4 !== A && (s4 === A || e6);
    e6 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t4), this._$AH = t4;
  }
  handleEvent(t4) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t4) : this._$AH.handleEvent(t4);
  }
};
var Z = class {
  constructor(t4, i7, s4) {
    this.element = t4, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s4;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t4) {
    M(this, t4);
  }
};
var j = { M: h2, P: o3, A: n3, C: 1, L: N, R, D: d2, V: M, I: k, H, N: L, U: z, B: I, F: Z };
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t4, i7, s4) => {
  const e6 = s4?.renderBefore ?? i7;
  let h3 = e6._$litPart$;
  if (void 0 === h3) {
    const t5 = s4?.renderBefore ?? null;
    e6._$litPart$ = h3 = new k(i7.insertBefore(c3(), t5), t5, void 0, s4 ?? {});
  }
  return h3._$AI(t4), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t4 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t4.firstChild, t4;
  }
  update(t4) {
    const r5 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t4), this._$Do = D(r5, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ??= []).push("4.2.2");

// node_modules/lit-html/directive.js
var e4 = (t4) => (...e6) => ({ _$litDirective$: t4, values: e6 });
var i5 = class {
  constructor(t4) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t4, e6, i7) {
    this._$Ct = t4, this._$AM = e6, this._$Ci = i7;
  }
  _$AS(t4, e6) {
    return this.update(t4, e6);
  }
  update(t4, e6) {
    return this.render(...e6);
  }
};

// node_modules/lit-html/directive-helpers.js
var { I: t3 } = j;
var m2 = {};
var p3 = (o7, t4 = m2) => o7._$AH = t4;

// node_modules/lit-html/directives/keyed.js
var i6 = e4(class extends i5 {
  constructor() {
    super(...arguments), this.key = A;
  }
  render(r5, t4) {
    return this.key = r5, t4;
  }
  update(r5, [t4, e6]) {
    return t4 !== this.key && (p3(r5), this.key = t4), e6;
  }
});

// elements/src/fire-element.ts
var FireElement = class extends i4 {
  static {
    /** @internal Fire `init` functions run on the element after a fresh render, in order. */
    this.fire = [];
  }
  #structure;
  #fresh = true;
  /** The root class this element added itself (a class the page set is never taken away). */
  #addedClass;
  /** Root attributes this element wrote, so it removes only those. */
  #written = /* @__PURE__ */ new Set();
  /** @internal Light DOM: Fire's global stylesheet styles the element and what it renders. */
  createRenderRoot() {
    return this;
  }
  /** @internal The markup form's attributes on the root (data-*, aria-hidden), from the element's properties. */
  rootAttributes() {
    return {};
  }
  /** @internal The component's internals before Fire's module has run; nothing when the module draws them all. */
  markup() {
    return A;
  }
  /** @internal What the internals depend on structurally; a change renders them afresh. */
  structure() {
    return "";
  }
  /** @internal After a fresh render, before Fire's modules run: fill what the template does not carry. */
  prepare() {
  }
  /** @internal Redraw in place after a property change that kept the structure. */
  refresh(_changed) {
  }
  connectedCallback() {
    super.connectedCallback();
    this.#root();
  }
  /** @internal */
  render() {
    const structure = this.structure();
    this.#fresh = structure !== this.#structure;
    this.#structure = structure;
    return i6(structure, this.markup());
  }
  /** @internal */
  updated(changed) {
    super.updated(changed);
    this.#root();
    if (this.#fresh) {
      this.prepare();
      for (const init of this.constructor.fire) init(this);
    } else {
      this.refresh(changed);
    }
  }
  /** Make the element its component's root: the class, then the attributes. */
  #root() {
    const name = this.rootClass();
    if (this.#addedClass && this.#addedClass !== name) {
      this.classList.remove(this.#addedClass);
      this.#addedClass = void 0;
    }
    if (!this.classList.contains(name)) {
      this.classList.add(name);
      this.#addedClass = name;
    }
    for (const [attr, value] of Object.entries(this.rootAttributes())) {
      if (value == null || value === false) {
        if (this.#written.delete(attr)) this.removeAttribute(attr);
        continue;
      }
      const text = value === true ? "" : String(value);
      if (this.getAttribute(attr) !== text) this.setAttribute(attr, text);
      this.#written.add(attr);
    }
  }
};

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t4 = o5, e6, r5) => {
  const { kind: n5, metadata: i7 } = r5;
  let s4 = globalThis.litPropertyMetadata.get(i7);
  if (void 0 === s4 && globalThis.litPropertyMetadata.set(i7, s4 = /* @__PURE__ */ new Map()), "setter" === n5 && ((t4 = Object.create(t4)).wrapped = true), s4.set(r5.name, t4), "accessor" === n5) {
    const { name: o7 } = r5;
    return { set(r6) {
      const n6 = e6.get.call(this);
      e6.set.call(this, r6), this.requestUpdate(o7, n6, t4, true, r6);
    }, init(e7) {
      return void 0 !== e7 && this.C(o7, void 0, t4, e7), e7;
    } };
  }
  if ("setter" === n5) {
    const { name: o7 } = r5;
    return function(r6) {
      const n6 = this[o7];
      e6.call(this, r6), this.requestUpdate(o7, n6, t4, true, r6);
    };
  }
  throw Error("Unsupported decorator location: " + n5);
};
function n4(t4) {
  return (e6, o7) => "object" == typeof o7 ? r4(t4, e6, o7) : ((t5, e7, o8) => {
    const r5 = e7.hasOwnProperty(o8);
    return e7.constructor.createProperty(o8, t5), r5 ? Object.getOwnPropertyDescriptor(e7, o8) : void 0;
  })(t4, e6, o7);
}

// elements/src/fire.ts
import * as chartsModule from "./js/charts.js";
import * as codeModule from "./js/code.js";
import * as textureModule from "./js/texture.js";
import * as iconsModule from "./js/icons.js";
var charts = chartsModule;
var code = codeModule;
var texture = textureModule;
var icon2 = iconsModule.icon;
var ICONS2 = iconsModule.ICONS;
var upgradeIcons2 = iconsModule.upgradeIcons;

// elements/src/icon.ts
var warned = /* @__PURE__ */ new Set();
var FdIcon = class extends FireElement {
  /** @internal */
  rootClass() {
    return "fd-icon";
  }
  /** @internal */
  rootAttributes() {
    return { "data-icon": this.icon, "data-size": this.size, "aria-hidden": "true" };
  }
  /** @internal A new name draws a new SVG. */
  structure() {
    return this.icon ?? "";
  }
  /** @internal */
  markup() {
    return b2`<svg aria-hidden="true" focusable="false"></svg>`;
  }
  /** @internal The drawing comes from Fire's own icon(), which also puts the sprite on the page. */
  prepare() {
    const svg = this.querySelector(":scope > svg");
    const name = this.icon;
    if (!svg || !name) return;
    if (!(name in ICONS2)) {
      if (!warned.has(name)) {
        warned.add(name);
        console.warn("[fire] unknown icon", name);
      }
      return;
    }
    const template = document.createElement("template");
    template.innerHTML = icon2(name);
    svg.replaceChildren(...template.content.firstElementChild?.childNodes ?? []);
  }
};
__decorateClass([
  n4({ reflect: true })
], FdIcon.prototype, "icon", 2);
__decorateClass([
  n4({ reflect: true })
], FdIcon.prototype, "size", 2);
if (typeof customElements !== "undefined" && !customElements.get("fd-icon")) customElements.define("fd-icon", FdIcon);

// elements/src/json.ts
var json = {
  fromAttribute(value) {
    if (value == null || value === "") return void 0;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("[fire] element data is not valid JSON", error);
      return void 0;
    }
  }
};
function syncConfig(root, data) {
  let node = root.querySelector(':scope > script[type="application/json"]');
  if (data == null) {
    node?.remove();
    return;
  }
  if (!node) {
    node = document.createElement("script");
    node.setAttribute("type", "application/json");
    root.prepend(node);
  }
  node.textContent = JSON.stringify(data);
}

// elements/src/chart.ts
var CARTESIAN = /* @__PURE__ */ new Set(["line", "area", "bar", "stacked"]);
var FdChart = class extends FireElement {
  constructor() {
    super(...arguments);
    this.type = "line";
    this.legend = false;
    this.area = false;
    this.dot = false;
    this.invert = false;
    this.fluid = false;
    /** Whether this element has drawn a chart yet. */
    this.#drawn = false;
  }
  static {
    /** @internal None: `prepare()` runs `charts.init` itself, so that it can tell whether it drew. */
    this.fire = [];
  }
  #drawn;
  get #family() {
    return CARTESIAN.has(this.type) ? "cartesian" : this.type;
  }
  /** Whether the chart reads its data from a JSON script (a sparkline and a progress ring read attributes). */
  get #scripted() {
    return this.#family !== "sparkline" && !(this.#family === "donut" && this.variant === "progress");
  }
  /** @internal */
  rootClass() {
    return { cartesian: "fd-chart", sparkline: "fd-sparkline", donut: "fd-donut", heatgrid: "fd-heatgrid" }[this.#family];
  }
  /** @internal Every name is listed for every type, so switching type removes what no longer applies. */
  rootAttributes() {
    const family = this.#family;
    const cartesian = family === "cartesian";
    const spark = family === "sparkline";
    const donut = family === "donut";
    const heat = family === "heatgrid";
    return {
      "data-fd-chart": cartesian ? this.type : void 0,
      "data-type": spark && this.variant === "bars" || donut && this.variant === "progress" ? this.variant : void 0,
      "data-variant": heat && this.variant === "strip" ? "strip" : void 0,
      "data-values": spark ? Array.isArray(this.data) ? this.data.join(",") : this.values : void 0,
      "data-height": cartesian || spark ? this.height : void 0,
      "data-width": spark ? this.width : void 0,
      "data-legend": cartesian && this.legend,
      "data-grid": cartesian ? this.grid : void 0,
      "data-state": cartesian ? this.state : void 0,
      "data-y-format": cartesian ? this.yFormat : void 0,
      "data-area": spark && this.area,
      "data-dot": spark && this.dot,
      "data-invert": spark && this.invert,
      "data-fluid": spark && this.fluid,
      "data-tone": spark || donut ? this.tone : void 0,
      "data-size": donut || heat ? this.size : void 0,
      "data-thickness": donut ? this.thickness : void 0,
      "data-value": donut ? this.value : void 0,
      "data-max": donut ? this.max : void 0,
      "data-format": donut ? this.format : void 0,
      "data-label": this.label
    };
  }
  /** @internal Charts of another type are drawn afresh. */
  structure() {
    return `${this.#family}|${this.variant ?? ""}`;
  }
  /**
   * @internal The config the markup form would read: the data, and the `state` property when the data names no state.
   * Never the element's own `data-state`: charts.js writes the state it drew there (`ready`, `empty`), so reading it
   * back would keep a chart drawn before its data arrived empty for good.
   */
  #config() {
    const config = this.data && !Array.isArray(this.data) ? { ...this.data } : {};
    if (!config.state && this.state) config.state = this.state;
    return config;
  }
  /**
   * @internal A fresh render: the chart is drawn from the element's properties, whenever Fire's `init` ran. A
   * component that calls `init(parent)` before this element's first update (Lit's `firstUpdated`, Vue's `mounted`)
   * makes charts.js draw it early from what the element had written by then, and mark it as seen; drawing it here
   * again makes the result the same as when `init` runs after.
   */
  prepare() {
    if (this.#drawn) [...this.children].forEach((child) => child.remove());
    this.#drawn = true;
    const family = this.#family;
    if (this.#scripted) syncConfig(this, this.data);
    if (family === "cartesian") {
      charts.render(this, this.#config());
      charts.init(this);
      return;
    }
    const watch = new MutationObserver(() => {
    });
    watch.observe(this, { childList: true });
    charts.init(this);
    const drew = watch.takeRecords().length > 0;
    watch.disconnect();
    if (!drew) this.#draw();
  }
  /** @internal */
  refresh(_changed) {
    if (this.#scripted) syncConfig(this, this.data);
    this.#draw();
  }
  /** @internal Draw (again) from the attributes and the config script, which are in step with the properties. */
  #draw() {
    switch (this.#family) {
      case "sparkline":
        charts.sparkline(this);
        break;
      case "donut":
        charts.donut(this);
        break;
      case "heatgrid":
        charts.heatgrid(this);
        break;
      default:
        charts.render(this, this.#config());
    }
  }
};
__decorateClass([
  n4({ reflect: true })
], FdChart.prototype, "type", 2);
__decorateClass([
  n4({ reflect: true })
], FdChart.prototype, "variant", 2);
__decorateClass([
  n4({ attribute: "data", converter: json })
], FdChart.prototype, "data", 2);
__decorateClass([
  n4({ type: Number })
], FdChart.prototype, "height", 2);
__decorateClass([
  n4({ type: Number })
], FdChart.prototype, "width", 2);
__decorateClass([
  n4({ type: Boolean })
], FdChart.prototype, "legend", 2);
__decorateClass([
  n4()
], FdChart.prototype, "grid", 2);
__decorateClass([
  n4()
], FdChart.prototype, "state", 2);
__decorateClass([
  n4()
], FdChart.prototype, "label", 2);
__decorateClass([
  n4({ attribute: "y-format" })
], FdChart.prototype, "yFormat", 2);
__decorateClass([
  n4()
], FdChart.prototype, "values", 2);
__decorateClass([
  n4({ type: Boolean })
], FdChart.prototype, "area", 2);
__decorateClass([
  n4({ type: Boolean })
], FdChart.prototype, "dot", 2);
__decorateClass([
  n4({ type: Boolean })
], FdChart.prototype, "invert", 2);
__decorateClass([
  n4({ type: Boolean })
], FdChart.prototype, "fluid", 2);
__decorateClass([
  n4()
], FdChart.prototype, "tone", 2);
__decorateClass([
  n4()
], FdChart.prototype, "size", 2);
__decorateClass([
  n4({ type: Number })
], FdChart.prototype, "thickness", 2);
__decorateClass([
  n4({ type: Number })
], FdChart.prototype, "value", 2);
__decorateClass([
  n4({ type: Number })
], FdChart.prototype, "max", 2);
__decorateClass([
  n4()
], FdChart.prototype, "format", 2);
if (typeof customElements !== "undefined" && !customElements.get("fd-chart")) customElements.define("fd-chart", FdChart);

// node_modules/lit-html/directives/if-defined.js
var o6 = (o7) => o7 ?? A;

// elements/src/code.ts
var FdCode = class extends FireElement {
  constructor() {
    super(...arguments);
    this.code = "";
    this.lines = false;
    this.wrap = false;
    this.copy = false;
  }
  static {
    /** @internal */
    // init binds the page-wide handlers (copy, wrap, expand) and enhances the block the first time; enhanceCodeblock
    // enhances it again after each fresh render, which init's once-per-block guard would skip.
    this.fire = [upgradeIcons2, code.init, (root) => code.enhanceCodeblock(root)];
  }
  /** @internal The module tokenises once per block, so every change renders the block afresh. */
  structure() {
    return JSON.stringify([this.code, this.language, this.lines, this.highlight, this.collapse, this.wrap, this.filename, this.copy]);
  }
  /** @internal */
  rootClass() {
    return "fd-codeblock";
  }
  /** @internal */
  rootAttributes() {
    return { "data-lines": this.lines, "data-highlight": this.highlight, "data-collapse": this.collapse, "data-wrap": this.wrap };
  }
  /** @internal The block's internals: the optional header or copy button, then the code. */
  markup() {
    const copy = b2`<button class="fd-codeblock-copy" aria-label="Copy code"><i data-icon="copy"></i></button>`;
    const head = this.filename ? b2`<div class="fd-codeblock-head"><span class="fd-codeblock-file"><i data-icon="file-code"></i>${this.filename}</span>${this.copy ? b2`<div class="fd-codeblock-actions">${copy}</div>` : A}</div>` : this.copy ? copy : A;
    return b2`${head}<pre class="fd-codeblock-body"><code data-lang=${o6(this.language)}></code></pre>`;
  }
  /** @internal */
  prepare() {
    const node = this.querySelector(":scope > .fd-codeblock-body > code");
    if (node) node.textContent = this.code;
  }
};
__decorateClass([
  n4()
], FdCode.prototype, "code", 2);
__decorateClass([
  n4()
], FdCode.prototype, "language", 2);
__decorateClass([
  n4({ type: Boolean })
], FdCode.prototype, "lines", 2);
__decorateClass([
  n4()
], FdCode.prototype, "highlight", 2);
__decorateClass([
  n4({ type: Number })
], FdCode.prototype, "collapse", 2);
__decorateClass([
  n4({ type: Boolean })
], FdCode.prototype, "wrap", 2);
__decorateClass([
  n4()
], FdCode.prototype, "filename", 2);
__decorateClass([
  n4({ type: Boolean })
], FdCode.prototype, "copy", 2);
if (typeof customElements !== "undefined" && !customElements.get("fd-code")) customElements.define("fd-code", FdCode);

// elements/src/texture.ts
var FdTexture = class extends FireElement {
  constructor() {
    super(...arguments);
    this.pattern = "terrain";
    this.interactive = false;
    this.inline = false;
  }
  static {
    /** @internal */
    this.fire = [texture.init];
  }
  /** @internal */
  rootClass() {
    return "fd-ascii";
  }
  /** @internal The markup form's attributes, read by the module. */
  rootAttributes() {
    return {
      "aria-hidden": "true",
      "data-fd-ascii": this.pattern,
      "data-tone": this.tone,
      "data-fade": this.fade,
      "data-style": this.marks,
      "data-ramp": this.ramp,
      "data-cell": this.cell,
      "data-seed": this.seed,
      "data-animate": this.animated,
      "data-speed": this.speed,
      "data-intensity": this.intensity,
      "data-interactive": this.interactive,
      "data-origin": this.origin,
      "data-side": this.side,
      "data-variant": this.variant,
      "data-shape": this.shape,
      "data-inline": this.inline
    };
  }
  /** @internal The module re-reads the attributes and redraws. */
  refresh(_changed) {
    texture.render(this);
  }
};
__decorateClass([
  n4()
], FdTexture.prototype, "pattern", 2);
__decorateClass([
  n4()
], FdTexture.prototype, "tone", 2);
__decorateClass([
  n4()
], FdTexture.prototype, "fade", 2);
__decorateClass([
  n4()
], FdTexture.prototype, "marks", 2);
__decorateClass([
  n4()
], FdTexture.prototype, "ramp", 2);
__decorateClass([
  n4()
], FdTexture.prototype, "cell", 2);
__decorateClass([
  n4()
], FdTexture.prototype, "seed", 2);
__decorateClass([
  n4()
], FdTexture.prototype, "animated", 2);
__decorateClass([
  n4({ type: Number })
], FdTexture.prototype, "speed", 2);
__decorateClass([
  n4({ type: Number })
], FdTexture.prototype, "intensity", 2);
__decorateClass([
  n4({ type: Boolean })
], FdTexture.prototype, "interactive", 2);
__decorateClass([
  n4()
], FdTexture.prototype, "origin", 2);
__decorateClass([
  n4()
], FdTexture.prototype, "side", 2);
__decorateClass([
  n4()
], FdTexture.prototype, "variant", 2);
__decorateClass([
  n4()
], FdTexture.prototype, "shape", 2);
__decorateClass([
  n4({ type: Boolean })
], FdTexture.prototype, "inline", 2);
if (typeof customElements !== "undefined" && !customElements.get("fd-texture")) customElements.define("fd-texture", FdTexture);
export {
  FdChart,
  FdCode,
  FdIcon,
  FdTexture,
  FireElement
};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
lit-html/directive.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directive-helpers.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/keyed.js:
@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/if-defined.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
