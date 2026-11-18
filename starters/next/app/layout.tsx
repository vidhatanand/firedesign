// The root layout (a server component): Fire's CSS and the look, boot.js before first paint, the icon sprite, the app
// shell, and the client component that loads Fire after hydration (spec/EXPORT.md section 11).
import 'fire-design/css';
import './fire-theme.css'; // themeToCss output (H1), after Fire's CSS
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { AppShell } from './app-shell';
import { theme } from './fire-look';
import { FireRuntime } from './fire-runtime';
import { FireSprite } from './fire-sprite';

export const metadata: Metadata = { title: 'Ember', icons: { icon: '/fire/favicon.svg' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    // boot.js rewrites <html>'s attributes before React hydrates (saved theme, density, tweaks): N3.
    <html lang="en" {...theme} suppressHydrationWarning>
      <head>
        {/* Classic and blocking, so the saved look is on <html> in the first paint (N2). Not next/script. */}
        <script src="/fire/boot.js" nonce={nonce} />
      </head>
      <body>
        <FireSprite />
        <AppShell>{children}</AppShell>
        <FireRuntime />
      </body>
    </html>
  );
}
