/* Fire boot — optional, and the only script that is not a module.
 *
 *   <script src="fire/boot.js"></script>      in <head>, before the stylesheet
 *
 * Module scripts run after the first paint, so a saved theme, density or set of tweaks would flash in.
 * This runs first and puts the saved look on <html> straight away: the theme and density that core.js
 * remembers, and the attributes and custom properties that tweaks.js last applied. It reads only
 * localStorage and writes only to <html>; without it everything still works, a frame later.
 *
 * The page's own look (data-palette, data-type written in its markup) is the default tweaks.js returns to.
 * Before a saved palette or type set replaces it, the page's value is kept in data-fd-default-palette /
 * data-fd-default-type (empty when the page declared none), so tweaks.js can still tell what the page asked for.
 *
 * It also applies data-fd-vars (see the second block) while the page is parsed. */
(function () {
  try {
    var root = document.documentElement;
    var store = window.localStorage;
    var saved = { 'data-theme': store.getItem('fd-theme'), 'data-density': store.getItem('fd-density'), 'data-accent': store.getItem('fd-accent') };
    var boot = JSON.parse(store.getItem('fd-tweaks-boot') || 'null') || {};
    var keep = { 'data-palette': 'data-fd-default-palette', 'data-type': 'data-fd-default-type' };
    var name;
    for (name in saved) if (saved[name]) root.setAttribute(name, saved[name]);
    for (name in boot.attrs) {
      if (!/^data-[a-z-]+$/.test(name)) continue;
      if (keep[name] && !root.hasAttribute(keep[name])) root.setAttribute(keep[name], root.getAttribute(name) || '');
      root.setAttribute(name, String(boot.attrs[name]));
    }
    for (name in boot.props) if (/^--fd-[a-z0-9-]+$/.test(name)) root.style.setProperty(name, String(boot.props[name]));
  } catch (error) { /* private mode or a damaged entry: start from the default look */ }
})();

/* Custom properties from markup, without a style attribute (a strict Content Security Policy blocks those).
 * data-fd-vars="--value: 0.4; --fd-i: 2" is copied onto its element with setProperty as the parser inserts it, so a
 * bar, a panel or a staggered row is already right in the first paint. Only custom properties are accepted: the
 * attribute cannot set a real property. core.js does the same for pages that do not load this file, a frame later. */
(function () {
  if (typeof MutationObserver === 'undefined') return;
  function apply(el) {
    var pairs = el.getAttribute('data-fd-vars').split(';');
    for (var i = 0; i < pairs.length; i++) {
      var at = pairs[i].indexOf(':');
      var prop = pairs[i].slice(0, at).trim();
      if (at > 0 && prop.slice(0, 2) === '--') el.style.setProperty(prop, pairs[i].slice(at + 1).trim());
    }
    el.removeAttribute('data-fd-vars');
  }
  function sweep(node) {
    if (node.nodeType !== 1) return;
    if (node.hasAttribute('data-fd-vars')) apply(node);
    var found = node.querySelectorAll('[data-fd-vars]');
    for (var i = 0; i < found.length; i++) apply(found[i]);
  }
  new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      if (record.type === 'attributes') { if (record.target.hasAttribute('data-fd-vars')) apply(record.target); }
      else for (var j = 0; j < record.addedNodes.length; j++) sweep(record.addedNodes[j]);
    }
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-fd-vars'] });
  window.__fdVars = true;   // core.js leaves the watching to this file
})();
