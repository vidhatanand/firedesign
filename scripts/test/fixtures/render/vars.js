// What Fire's core.js applyVars does with data-fd-vars: copy each custom property onto the element with
// style.setProperty (allowed under style-src 'self'), then remove the attribute.
document.addEventListener('DOMContentLoaded', () => {
  for (const el of document.querySelectorAll('[data-fd-vars]')) {
    for (const pair of el.getAttribute('data-fd-vars').split(';')) {
      const at = pair.indexOf(':');
      const name = pair.slice(0, at).trim();
      if (at > 0 && name.startsWith('--')) el.style.setProperty(name, pair.slice(at + 1).trim());
    }
    el.removeAttribute('data-fd-vars');
  }
});
