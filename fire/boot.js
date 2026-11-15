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
 * data-fd-default-type (empty when the page declared none), so tweaks.js can still tell what the page asked for. */
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
