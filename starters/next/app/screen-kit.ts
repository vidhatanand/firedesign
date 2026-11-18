// What a screen's client component uses to run its behaviour: the template's page script, ported to TypeScript, run
// once Fire has loaded (after hydration, spec L5), and torn down when the route unmounts (client-side navigation).
// The screens' markup is server-rendered and React never re-renders it, so the behaviour may work on the DOM the
// way the templates do (the DOM is Fire markup, and Fire owns what it writes: spec O1, O2).
import { useEffect, useRef } from 'react';
import { loadFire } from 'fire-design/react';

export type Fire = Awaited<ReturnType<typeof loadFire>>;

export interface Kit {
  fire: Fire;
  /** Aborted on unmount: every listener a behaviour adds is removed with it. */
  signal: AbortSignal;
  /** addEventListener with the kit's signal. */
  on<E extends Event = Event>(target: EventTarget, type: string, listener: (event: E) => void, options?: AddEventListenerOptions): void;
  /** setTimeout that is cleared on unmount. */
  later(fn: () => void, ms: number): void;
}

/** The first element matching `sel`; the screens' markup is fixed, so a missing element is a bug worth a throw. */
export function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`no element matches ${sel}`);
  return el;
}
/** The first element matching `sel`, or null. */
export const $maybe = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel);
/** Every element matching `sel`. */
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => [...root.querySelectorAll<T>(sel)];
/** HTML-escape text for the few places the templates build markup from data. */
export const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Runs `start` once per mount, when Fire has loaded; its return value (if any) runs on unmount, after the listeners and
 *  timers it made through the kit are gone. */
export function useBehaviour(start: (kit: Kit) => void | (() => void)) {
  const latest = useRef(start);
  useEffect(() => {
    const begin = latest.current;
    const controller = new AbortController();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let stop: void | (() => void);
    loadFire().then((fire) => {
      if (controller.signal.aborted) return;
      stop = begin({
        fire,
        signal: controller.signal,
        on: (target, type, listener, options) => target.addEventListener(type, listener as EventListener, { ...options, signal: controller.signal }),
        later: (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); },
      });
    });
    return () => {
      controller.abort();
      timers.forEach(clearTimeout);
      if (typeof stop === 'function') stop();
    };
  }, []);
}
