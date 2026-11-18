/* Types of wrappers/react/hooks.js (hand-written). */
import type { RefObject } from 'react';
import type { FireEventMap } from '../../fire/fire.js';

/** fire.js (`import('fire-design')`), imported once on first use. Client only. */
export declare function loadFire(): Promise<typeof import('../../fire/fire.js')>;
/** Runs Fire's `init(ref.current)` after every commit of the component (EXPORT.md L1, L2). Client only. */
export declare function useFire(ref: RefObject<ParentNode | null>): void;
/** Listens for the Fire event `type` on `ref.current` (the element or an ancestor of the one that fires), with the
 *  event typed from FireEventMap: `useFireEvent(ref, 'fd:select', (e) => e.detail.action)` (EXPORT.md V1, V4). */
export declare function useFireEvent<K extends keyof FireEventMap>(
  ref: RefObject<EventTarget | null>,
  type: K,
  handler: (event: FireEventMap[K]) => void,
): void;
