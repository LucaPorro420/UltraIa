import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de UltraIa — rate limiting + security headers + logging.
 *
 * Rate limiting: sliding window counter per IP (in-memory, resets on restart).
 * For production, use Redis-backed rate limiting (Upstash, Cloudflare KV).
 *
 * Security headers: OWASP 2026 baseline.
 */

/* ------------------------------------------------------------------ */
/* Rate Limiting                                                       */
/* ------------------------------------------------------------------ */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

/** Clean up expired entries every 5 minutes. */
let lastCleanup = Date.now();
function cleanupRateLimits() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

/** Per-route rate limits (requests per minute). */
const ROUTE_LIMITS: Record<string, number> = {
  '/api/auth/login': 10,
  '/api/auth/register': 5,
  '/api/chat': 30,
  '/api/omag': 10,
  '/api/goal': 10,
  '/api/loop/trigger': 5,
  '/api/bridge/message': 10,
  '/api/publications': 30,
};

function getRateLimit(pathname: string): number {
  if (ROUTE_LIMITS[pathname]) return ROUTE_LIMITS[pathname];
  for (const [prefix, limit] of Object.entries(ROUTE_LIMITS)) {
    if (pathname.startsWith(prefix + '/')) return limit;
  }
  if (pathname.startsWith('/api/')) return 60;
  return 0;
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = getRateLimit(pathname);
  if (limit === 0) return { allowed: true, remaining: Infinity, resetAt: 0 };

  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/* ------------------------------------------------------------------ */
/* Middleware                                                           */
/* ------------------------------------------------------------------ */

export function middleware(request: NextRequest) {
  const startTime = performance.now();
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Rate limiting
  cleanupRateLimits();
  // M03 FIX: Only trust x-forwarded-for when behind a known proxy (TRUST_PROXY env).
  // Without this, attackers can set a fake IP per request and bypass all rate limits.
  const trustProxy = process.env.TRUST_PROXY === '1';
  const ip = trustProxy
    ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? '127.0.0.1')
    : '127.0.0.1';

  const { allowed, remaining, resetAt } = checkRateLimit(ip, pathname);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'rate_limited', retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetAt.toString(),
        },
      },
    );
  }

  const response = NextResponse.next();

  if (getRateLimit(pathname) > 0) {
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetAt.toString());
  }

  response.headers.set('X-Request-Start', startTime.toString());

  // Security headers (OWASP 2026 baseline)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  // M08 CSRF: Validate Origin/Referer on state-changing methods.
  // Prevents cross-site request forgery without requiring CSRF tokens.
  const method = request.method.toUpperCase();
  if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
    if (pathname.startsWith('/api/')) {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const host = request.headers.get('host');
      // Allow requests without Origin (same-origin, non-CORS, curl) or with matching Origin/Referer.
      if (origin) {
        try {
          const originHost = new URL(origin).host;
          if (host && originHost !== host) {
            return NextResponse.json({ error: 'CSRF: origin mismatch' }, { status: 403 });
          }
        } catch {
          return NextResponse.json({ error: 'CSRF: invalid origin' }, { status: 403 });
        }
      } else if (referer) {
        try {
          const refererHost = new URL(referer).host;
          if (host && refererHost !== host) {
            return NextResponse.json({ error: 'CSRF: referer mismatch' }, { status: 403 });
          }
        } catch {
          // Invalid referer — allow (could be a privacy-restricted browser)
        }
      }
    }
  }

  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_HSTS === '1') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  // M06/M07 FIX: CSP aligned with next.config.ts strict allowlists (no wildcard HTTPS).
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https://image.pollinations.ai https://*.pollinations.ai https://images.meigen.ai https://www.meigen.ai https://i.ytimg.com https://d1s1y0ui543e5o.cloudfront.net",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' ws://localhost:* wss://localhost:* https://image.pollinations.ai https://text.pollinations.ai https://*.pollinations.ai https://www.meigen.ai https://api.meigen.ai",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
