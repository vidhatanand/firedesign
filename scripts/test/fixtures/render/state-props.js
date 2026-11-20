// A framework's render of state.html: form state through properties, focus in script instead of autofocus, one custom
// property through data-fd-vars and one set on the element directly. <html data-wrong> renders a different state.
document.addEventListener('DOMContentLoaded', () => {
  const q = (s) => document.querySelector(s);
  const wrong = 'wrong' in document.documentElement.dataset;
  q('.fd-input').value = 'api';
  q('.fd-check input').checked = !wrong;
  q('.fd-select').value = 'us';
  q('.fd-textarea').value = wrong ? 'Ship it!' : 'Ship it.';
  q('.fd-disclosure').open = true;
  q('.fd-meter').style.setProperty('--fd-i', wrong ? '3' : '2');
  q('.fd-input').focus();
});
