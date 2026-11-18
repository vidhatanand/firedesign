'use client';
// A shell navigation link: a Next <Link> (client-side navigation; FireRuntime runs init after each route change) that
// carries aria-current="page" on the current route, as the server-rendered shell in templates/shell-static.html does.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function NavLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const current = usePathname() === href;
  return <Link className={className} href={href} aria-current={current ? 'page' : undefined}>{children}</Link>;
}
