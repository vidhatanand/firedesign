/* Fire custom elements: fd-icon, fd-chart, fd-code, fd-texture. BUILT by scripts/build-elements.mjs from elements/src
 * (TypeScript, Lit): edit the source and rebuild, never this file. Fire's modules are imported from ../../fire/js/ and shared
 * with fire/fire.js. Imports Lit from the app (import 'lit'): an app that has Lit 3 loads one copy of it. A page with no build step loads
 * fire/elements.js, which bundles Lit. */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// elements/src/fire-element.ts
import { LitElement, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";
var FireElement = class extends LitElement {
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
    return nothing;
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
    return keyed(structure, this.markup());
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

// elements/src/icon.ts
import { html } from "lit";
import { property } from "lit/decorators.js";

// elements/src/fire.ts
import * as chartsModule from "../../fire/js/charts.js";
import * as codeModule from "../../fire/js/code.js";
import * as textureModule from "../../fire/js/texture.js";
import * as iconsModule from "../../fire/js/icons.js";
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
    return html`<svg aria-hidden="true" focusable="false"></svg>`;
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
  property({ reflect: true })
], FdIcon.prototype, "icon", 2);
__decorateClass([
  property({ reflect: true })
], FdIcon.prototype, "size", 2);
if (typeof customElements !== "undefined" && !customElements.get("fd-icon")) customElements.define("fd-icon", FdIcon);

// elements/src/chart.ts
import { property as property2 } from "lit/decorators.js";

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
    this.hideLabels = false;
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
    return { cartesian: "fd-chart", quadrant: "fd-chart", sparkline: "fd-sparkline", donut: "fd-donut", heatgrid: "fd-heatgrid" }[this.#family];
  }
  /** @internal Every name is listed for every type, so switching type removes what no longer applies. */
  rootAttributes() {
    const family = this.#family;
    const cartesian = family === "cartesian";
    const quad = family === "quadrant";
    const spark = family === "sparkline";
    const donut = family === "donut";
    const heat = family === "heatgrid";
    return {
      "data-fd-chart": cartesian || quad ? this.type : void 0,
      "data-labels": quad && this.hideLabels ? "none" : void 0,
      "data-type": spark && this.variant === "bars" || donut && this.variant === "progress" ? this.variant : void 0,
      "data-variant": heat && this.variant === "strip" ? "strip" : void 0,
      "data-values": spark ? Array.isArray(this.data) ? this.data.join(",") : this.values : void 0,
      "data-height": cartesian || quad || spark ? this.height : void 0,
      "data-width": spark ? this.width : void 0,
      "data-legend": cartesian && this.legend,
      "data-grid": cartesian ? this.grid : void 0,
      "data-state": cartesian || quad ? this.state : void 0,
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
    if (family === "quadrant") {
      charts.quadrant(this, this.#config());
      charts.init(this);
      return;
    }
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
      case "quadrant":
        charts.quadrant(this, this.#config());
        break;
      default:
        charts.render(this, this.#config());
    }
  }
};
__decorateClass([
  property2({ reflect: true })
], FdChart.prototype, "type", 2);
__decorateClass([
  property2({ reflect: true })
], FdChart.prototype, "variant", 2);
__decorateClass([
  property2({ attribute: "data", converter: json })
], FdChart.prototype, "data", 2);
__decorateClass([
  property2({ type: Number })
], FdChart.prototype, "height", 2);
__decorateClass([
  property2({ type: Number })
], FdChart.prototype, "width", 2);
__decorateClass([
  property2({ type: Boolean })
], FdChart.prototype, "legend", 2);
__decorateClass([
  property2()
], FdChart.prototype, "grid", 2);
__decorateClass([
  property2({ type: Boolean, attribute: "hide-labels" })
], FdChart.prototype, "hideLabels", 2);
__decorateClass([
  property2()
], FdChart.prototype, "state", 2);
__decorateClass([
  property2()
], FdChart.prototype, "label", 2);
__decorateClass([
  property2({ attribute: "y-format" })
], FdChart.prototype, "yFormat", 2);
__decorateClass([
  property2()
], FdChart.prototype, "values", 2);
__decorateClass([
  property2({ type: Boolean })
], FdChart.prototype, "area", 2);
__decorateClass([
  property2({ type: Boolean })
], FdChart.prototype, "dot", 2);
__decorateClass([
  property2({ type: Boolean })
], FdChart.prototype, "invert", 2);
__decorateClass([
  property2({ type: Boolean })
], FdChart.prototype, "fluid", 2);
__decorateClass([
  property2()
], FdChart.prototype, "tone", 2);
__decorateClass([
  property2()
], FdChart.prototype, "size", 2);
__decorateClass([
  property2({ type: Number })
], FdChart.prototype, "thickness", 2);
__decorateClass([
  property2({ type: Number })
], FdChart.prototype, "value", 2);
__decorateClass([
  property2({ type: Number })
], FdChart.prototype, "max", 2);
__decorateClass([
  property2()
], FdChart.prototype, "format", 2);
if (typeof customElements !== "undefined" && !customElements.get("fd-chart")) customElements.define("fd-chart", FdChart);

// elements/src/code.ts
import { html as html2, nothing as nothing2 } from "lit";
import { property as property3 } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
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
    const copy = html2`<button class="fd-codeblock-copy" aria-label="Copy code"><i data-icon="copy"></i></button>`;
    const head = this.filename ? html2`<div class="fd-codeblock-head"><span class="fd-codeblock-file"><i data-icon="file-code"></i>${this.filename}</span>${this.copy ? html2`<div class="fd-codeblock-actions">${copy}</div>` : nothing2}</div>` : this.copy ? copy : nothing2;
    return html2`${head}<pre class="fd-codeblock-body"><code data-lang=${ifDefined(this.language)}></code></pre>`;
  }
  /** @internal */
  prepare() {
    const node = this.querySelector(":scope > .fd-codeblock-body > code");
    if (node) node.textContent = this.code;
  }
};
__decorateClass([
  property3()
], FdCode.prototype, "code", 2);
__decorateClass([
  property3()
], FdCode.prototype, "language", 2);
__decorateClass([
  property3({ type: Boolean })
], FdCode.prototype, "lines", 2);
__decorateClass([
  property3()
], FdCode.prototype, "highlight", 2);
__decorateClass([
  property3({ type: Number })
], FdCode.prototype, "collapse", 2);
__decorateClass([
  property3({ type: Boolean })
], FdCode.prototype, "wrap", 2);
__decorateClass([
  property3()
], FdCode.prototype, "filename", 2);
__decorateClass([
  property3({ type: Boolean })
], FdCode.prototype, "copy", 2);
if (typeof customElements !== "undefined" && !customElements.get("fd-code")) customElements.define("fd-code", FdCode);

// elements/src/texture.ts
import { property as property4 } from "lit/decorators.js";
var FdTexture = class extends FireElement {
  constructor() {
    super(...arguments);
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
      "data-signature": this.signature,
      "data-inline": this.inline
    };
  }
  /** @internal The module re-reads the attributes and redraws. */
  refresh(_changed) {
    texture.render(this);
  }
};
__decorateClass([
  property4()
], FdTexture.prototype, "pattern", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "tone", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "fade", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "marks", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "ramp", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "cell", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "seed", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "animated", 2);
__decorateClass([
  property4({ type: Number })
], FdTexture.prototype, "speed", 2);
__decorateClass([
  property4({ type: Number })
], FdTexture.prototype, "intensity", 2);
__decorateClass([
  property4({ type: Boolean })
], FdTexture.prototype, "interactive", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "origin", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "side", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "variant", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "shape", 2);
__decorateClass([
  property4()
], FdTexture.prototype, "signature", 2);
__decorateClass([
  property4({ type: Boolean })
], FdTexture.prototype, "inline", 2);
if (typeof customElements !== "undefined" && !customElements.get("fd-texture")) customElements.define("fd-texture", FdTexture);
export {
  FdChart,
  FdCode,
  FdIcon,
  FdTexture,
  FireElement
};
