/* Fire's React hooks (fire-design/react), hand-written. Client only: effects never run on a server.
 *
 *   useFire(ref)                          init(ref.current) after every commit of the component (EXPORT.md L1, L2)
 *   useFireEvent(ref, 'fd:select', fn)    listen for a Fire event on the element or an ancestor (V1; JSX cannot name
 *                                         an event with a colon)
 *
 * fire.js is imported on first use, inside an effect, so it never runs before hydration (L5) or on a server. */
'use client';
import { useEffect, useRef } from 'react';

let fire = null;
/** fire.js, imported once. On first import it also runs init(document) and draws the icon sprite. */
export const loadFire = () => (fire ??= import('../../fire/fire.js'));

/** Runs Fire's `init` on the ref's subtree after each commit (no dependency list: lists, keys and conditions that insert
 *  Fire markup are enhanced; `init` skips what it has already seen). */
export function useFire(ref) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    let live = true;
    loadFire().then((f) => { if (live && root.isConnected) f.init(root); });
    return () => { live = false; };
  });
}

/** Adds `handler` for the Fire event `type` on `ref.current`. The latest handler is always called, the listener is added
 *  once per element, and it runs synchronously in the event, so `event.preventDefault()` cancels Fire's default (V4). */
export function useFireEvent(ref, type, handler) {
  const latest = useRef(handler);
  const bound = useRef(null);
  useEffect(() => {
    latest.current = handler;
    const target = ref.current ?? null;
    if (bound.current && bound.current.target === target && bound.current.type === type) return;
    bound.current?.off();
    bound.current = null;
    if (!target) return;
    const listener = (event) => latest.current(event);
    target.addEventListener(type, listener);
    bound.current = { target, type, off: () => target.removeEventListener(type, listener) };
  });
  useEffect(() => () => { bound.current?.off(); bound.current = null; }, []);
}
