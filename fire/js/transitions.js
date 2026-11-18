/* Fire transitions — page-to-page motion with the browser's View Transitions, as progressive enhancement.
 * The stylesheet (components/transitions.css) does the moving; this module chooses the kind and the direction, and
 * runs a same-document change (a single-page app's route) inside a view transition.
 *
 *   transition(() => render(route))                       the update runs inside document.startViewTransition
 *   transition(update, { kind: 'slide', direction: 'back' })
 *   await transition(update)                              resolves when the DOM update is done (not when the motion ends)
 *
 * `update` may return a promise. Where View Transitions do not exist, motion is reduced, or the motion dial is at
 * "none", `update` is simply called and the promise resolves when it has finished. If `update` throws or rejects,
 * so does the promise. With a view transition `update` runs a frame later, as the browser decides; without one it
 * runs at once.
 *
 *   kind        "fade" (default) | "slide" | "none"      written to data-fd-transition on <html> for the duration, whether or
 *                                                         not the page has the attribute; removed (or put back) afterwards
 *   direction   "forward" | "back"                       written to data-fd-direction on <html> for the duration
 *
 * Both attributes are put back as they were when the motion ends (a page without data-fd-transition is back to none of
 * it, so its regions are named only while the transition runs). A newer transition replaces an older one.
 *
 * Cross-document (plain links) needs no call: init() listens for the page events the browser fires and
 *   - reads `data-fd-transition="fade|slide|none"` on <html> (the page's default kind; fade when absent);
 *   - reads the same attribute on a clicked link, for that one navigation (carried to the next page through
 *     sessionStorage key "fd-transition", used once and only if fresh);
 *   - sets data-fd-direction="back" on <html> for the length of the transition when the navigation moved to an
 *     earlier history entry (Navigation API; a browser without it reads every move as forward);
 *   - skips the transition when the kind is "none" or motion is off.
 * The page-reveal listener must exist before the first render. Chromium also drops a cross-document transition, with a
 * console error, when the page paints before its deferred scripts have run, so mark the module scripts that start the
 * page `blocking="render"` (the Ember templates do). WebKit paints a page whose shell is not built yet without it, so use it there too. Firefox has no cross-document transitions.
 *
 * Attributes: data-fd-transition (on <html> or on <a>), data-fd-direction (written by this module).
 * Events: none. Exports: transition, init, TRANSITION_KINDS, motionAllowed.
 */
export const TRANSITION_KINDS = ['fade', 'slide', 'none'];
const KEY = 'fd-transition';
const FRESH = 4000;   // a link's override travels to the next page for at most this long (ms)
const isKind = (value) => TRANSITION_KINDS.includes(value);

/** True when a motion is allowed: the visitor has not asked for reduced motion and the motion dial is not at "none". */
export function motionAllowed() {
  if (typeof document === 'undefined') return false;
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const dial = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fd-motion'));
    return !(dial === 0);
  } catch { return true; }
}

let current = 0;    // the transition that owns <html>'s attributes right now
let base = null;    // the attributes before the first of the running transitions

const readAttrs = (root) => ({ kind: root.getAttribute('data-fd-transition'), direction: root.getAttribute('data-fd-direction') });
function writeAttrs(root, { kind, direction }) {
  for (const [attr, value] of [['data-fd-transition', kind], ['data-fd-direction', direction]]) {
    if (value === null) root.removeAttribute(attr); else root.setAttribute(attr, value);
  }
}

/** Run `update` inside a view transition when the browser has them and motion is allowed; otherwise just run it. */
export async function transition(update, { kind, direction } = {}) {
  const root = typeof document === 'undefined' ? null : document.documentElement;
  const useKind = isKind(kind) ? kind : null;
  if (!root || typeof document.startViewTransition !== 'function' || !motionAllowed() || useKind === 'none' || (!useKind && root.dataset.fdTransition === 'none')) {
    return void (await update());
  }
  base ??= readAttrs(root);
  const mine = ++current;
  // The stylesheet names its regions only under data-fd-transition, so a page that never asked gets them just for now.
  root.setAttribute('data-fd-transition', useKind ?? (isKind(root.dataset.fdTransition) ? root.dataset.fdTransition : 'fade'));
  if (direction === 'back' || direction === 'forward') root.setAttribute('data-fd-direction', direction);
  const restore = () => {
    if (current !== mine) return;   // a newer transition owns the attributes now
    writeAttrs(root, base);
    base = null;
  };
  let view;
  try { view = document.startViewTransition(() => update()); } catch (error) { restore(); throw error; }
  view.finished.then(restore, restore);
  view.ready?.catch?.(() => {});   // a skipped or aborted transition is not an error for the caller
  await view.updateCallbackDone;
}

/* ---------- Cross-document: link override, direction, none ---------- */
let override = null;   // { kind, at } from the last click on a link with data-fd-transition

function direction(activation) {
  if (activation?.navigationType !== 'traverse') return 'forward';
  const from = activation.from?.index, to = activation.entry?.index;
  return typeof from === 'number' && typeof to === 'number' && to < from ? 'back' : 'forward';
}

function readStored() {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const stored = JSON.parse(raw || 'null');
    return stored && isKind(stored.kind) && Date.now() - stored.at < FRESH ? stored.kind : null;
  } catch { return null; }
}

function onClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest('a[data-fd-transition]') : null;
  const kind = link?.getAttribute('data-fd-transition');
  override = link && isKind(kind) && !link.target ? { kind, at: Date.now() } : null;
}

function onPageSwap(event) {
  const fresh = override && Date.now() - override.at < FRESH ? override.kind : null;
  override = null;
  try {
    if (fresh) sessionStorage.setItem(KEY, JSON.stringify({ kind: fresh, at: Date.now() })); else sessionStorage.removeItem(KEY);
  } catch { /* storage blocked: the link's override is dropped, the page's default applies */ }
  if (fresh === 'none') event.viewTransition?.skipTransition();
}

function onPageReveal(event) {
  const view = event.viewTransition;
  const stored = readStored();
  if (!view) return;
  const root = document.documentElement;
  const kind = stored || (isKind(root.dataset.fdTransition) ? root.dataset.fdTransition : 'fade');
  if (kind === 'none' || !motionAllowed()) { view.skipTransition(); return; }
  const was = readAttrs(root);
  root.setAttribute('data-fd-transition', kind);
  root.setAttribute('data-fd-direction', direction(globalThis.navigation?.activation));
  const restore = () => writeAttrs(root, was);
  view.finished.then(restore, restore);
}

/** Listen for the page events once. Idempotent; `root` is accepted for the shape of every module's init and unused. */
export function init(root = document) {
  void root;
  if (typeof window === 'undefined' || window.__fdTransitions) return;
  window.__fdTransitions = true;
  document.addEventListener('click', onClick, true);
  window.addEventListener('pageswap', onPageSwap);
  window.addEventListener('pagereveal', onPageReveal);
}

if (typeof window !== 'undefined') init();
