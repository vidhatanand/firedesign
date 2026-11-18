'use client';
// Loads Fire in the browser only, after hydration (spec N1, L5), and runs init(document) again after every route
// change (L3). Fire's init skips what it has already seen.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function FireRuntime() {
  const pathname = usePathname();
  useEffect(() => {
    let live = true;
    import('fire-design').then((fire) => { if (live) fire.init(document); });
    return () => { live = false; };
  }, [pathname]);
  return null;
}
