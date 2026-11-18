'use client';
// A shell navigation link: a Next <Link> (client-side navigation; FireRuntime runs init after each route change) that
// carries aria-current="page" on the current route, as the server-rendered shell in templates/shell-static.html does,
// and its go-to keys (data-fd-keys="g l": Fire clicks the link, so the route change stays client-side).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function NavLink({ href, className, keys, children }: { href: string; className: string; keys?: string; children: ReactNode }) {
  const current = usePathname() === href;
  return <Link className={className} data-fd-keys={keys} href={href} aria-current={current ? 'page' : undefined}>{children}</Link>;
}
