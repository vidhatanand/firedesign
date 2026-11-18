// Strict Content Security Policy with a nonce per request (spec/EXPORT.md P3, spec/export-map.json next.proxy).
// Next reads the policy from the request headers and puts the nonce on its own scripts; the root layout puts it on
// boot.js. No 'unsafe-inline' for scripts or styles in production: Fire sets custom properties through CSSOM
// (data-fd-vars), which a policy does not block. Development adds what Next's dev server needs.
import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const dev = process.env.NODE_ENV === 'development';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self'${dev ? " 'unsafe-inline'" : ''}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = { matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico|fire/).*)' }] };
