import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de UltraIa — logging de requests + performance tracking.
 *
 * QUÉ HACE: intercepta cada request antes de llegar al handler.
 * PARA QUÉ: observabilidad sin tocar cada route handler individualmente.
 * POR QUÉ: Next.js 15 recomienda middleware ligero (sin DB, sin IO pesado);
 * el logging real de alto volumen va en after() o en un logger dedicado.
 *
 * Patrón 2026: middleware como "gatekeeper" de métricas + security headers.
 */

const START = Symbol.for('start-time');

export function middleware(request: NextRequest) {
  const startTime = performance.now();
  const { pathname } = request.nextUrl;

  // Skip logging for static assets and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Performance timing header (capturado por observability tools)
  response.headers.set('X-Request-Start', startTime.toString());

  // Security headers (OWASP 2026 baseline)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Request logging — estructurado para captura por log aggregator
  const duration = performance.now() - startTime;
  console.log(JSON.stringify({
    level: 'info',
    msg: 'request',
    method: request.method,
    pathname,
    duration_ms: Math.round(duration * 100) / 100,
    ua: request.headers.get('user-agent')?.slice(0, 100) ?? 'unknown',
    ts: new Date().toISOString(),
  }));

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
