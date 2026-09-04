/**
 * ============================================================================
 * MIDDLEWARE — La seguridad del sitio (el guardia en la puerta)
 * ============================================================================
 *
 * [EN] This file is like a security guard that checks EVERY request before it
 * reaches the website. It runs on every page load and API call.
 *
 * [ES] Este archivo es como un guardia de seguridad que revisa CADA solicitud
 * antes de que llegue al sitio web. Se ejecuta en cada carga de página y
 * llamada a la API.
 *
 * [EN] What it does:
 *   1. Rate limiting — prevents spam (max requests per minute per IP)
 *   2. Security headers — tells browsers how to protect the page
 *   3. Nonce CSP — prevents malicious scripts from running
 *   4. CSRF protection — stops fake requests from other websites
 *
 * [ES] Qué hace:
 *   1. Límite de velocidad — previene spam (máx solicitudes por minuto por IP)
 *   2. Headers de seguridad — le dice a los navegantes cómo proteger la página
 *   3. Nonce CSP — impide que scripts maliciosos se ejecuten
 *   4. Protección CSRF — detiene solicitudes falsas de otros sitios web
 */

// [EN] NextResponse is how Next.js sends answers back to the browser.
// [ES] NextResponse es cómo Next.js envía respuestas de vuelta al navegador.
import { NextResponse } from 'next/server';
// [EN] NextRequest is the incoming request (what the user's browser is asking for).
// [ES] NextRequest es la solicitud entrante (lo que el navegador del usuario está pidiendo).
import type { NextRequest } from 'next/server';

// ============================================================================
// NONCE GENERATOR — Generador de código secreto por página
// ============================================================================

/**
 * [EN] Generate a random "nonce" (number used once) for each page visit.
 * [ES] Generar un "nonce" (número usado una vez) para cada visita de página.
 *
 * [EN] The nonce is like a temporary password that proves the scripts on this
 * page are legitimate. Without it, the browser would block our own code.
 *
 * [ES] El nonce es como una contraseña temporal que demuestra que los scripts
 * de esta página son legítimos. Sin él, el navegador bloquearía nuestro
 * propio código.
 */
function generateNonce(): string {
  // [EN] Create 16 random bytes (numbers between 0-255).
  // [ES] Crear 16 bytes aleatorios (números entre 0-255).
  const bytes = new Uint8Array(16);
  // [EN] Fill them with cryptographic randomness (truly unpredictable).
  // [ES] Llenarlos con aleatoriedad criptográfica (verdaderamente impredecible).
  crypto.getRandomValues(bytes);
  // [EN] Convert to a short string (base64url = safe for URLs).
  // [ES] Convertir a una cadena corta (base64url = seguro para URLs).
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ============================================================================
// RATE LIMITING — Límite de velocidad (anti-spam)
// ============================================================================

// [EN] Each entry tracks: how many requests + when the window resets.
// [ES] Cada entrada rastrea: cuántas solicitudes + cuándo se reinicia la ventana.
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// [EN] The "memory" that remembers who's been making requests.
// [ES] La "memoria" que recuerda quién ha estado haciendo solicitudes.
const rateLimitMap = new Map<string, RateLimitEntry>();

// [EN] How long each "window" lasts: 60 seconds = 1 minute.
// [ES] Cuánto dura cada "ventana": 60 segundos = 1 minuto.
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * [EN] Remove old entries from memory so it doesn't grow forever.
 * [ES] Eliminar entradas viejas de la memoria para que no crezca para siempre.
 */
let lastCleanup = Date.now();
function cleanupRateLimits() {
  const now = Date.now();
  // [EN] Only clean up every 5 minutes (don't waste time cleaning too often).
  // [ES] Solo limpiar cada 5 minutos (no perder tiempo limpiando muy seguido).
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  // [EN] Delete entries that have expired.
  // [ES] Eliminar entradas que han expirado.
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

/**
 * [EN] How many requests each page allows per minute.
 * [ES] Cuántas solicitudes permite cada página por minuto.
 *
 * [EN] Lower numbers = more protection. Login is strict (10/min) because
 * hackers try to guess passwords.
 *
 * [ES] Números más bajos = más protección. Login es estricto (10/min) porque
 * los hackers intentan adivinar contraseñas.
 */
const ROUTE_LIMITS: Record<string, number> = {
  '/api/auth/login': 10,        // [EN] Login: 10 intentos por minuto / [ES] Login: 10 intentos por minuto
  '/api/auth/register': 5,      // [EN] Registro: 5 por minuto / [ES] Registro: 5 por minuto
  '/api/chat': 30,              // [EN] Chat con IA: 30 por minuto / [ES] Chat con IA: 30 por minuto
  '/api/omag': 10,              // [EN] Generación de video: 10 por minuto / [ES] Generación de video: 10 por minuto
  '/api/goal': 10,              // [EN] Meta-agente: 10 por minuto / [ES] Meta-agente: 10 por minuto
  '/api/loop/trigger': 5,       // [EN] Loop automático: 5 por minuto / [ES] Loop automático: 5 por minuto
  '/api/bridge/message': 10,    // [EN] Puente código-chat: 10 por minuto / [ES] Puente código-chat: 10 por minuto
  '/api/publications': 30,      // [EN] Publicaciones: 30 por minuto / [ES] Publicaciones: 30 por minuto
};

/**
 * [EN] Find the right limit for a URL. If not listed, default to 60/min.
 * [ES] Encontrar el límite correcto para una URL. Si no está listada, usar 60/min por defecto.
 */
function getRateLimit(pathname: string): number {
  if (ROUTE_LIMITS[pathname]) return ROUTE_LIMITS[pathname];
  for (const [prefix, limit] of Object.entries(ROUTE_LIMITS)) {
    if (pathname.startsWith(prefix + '/')) return limit;
  }
  // [EN] Default for any API route not listed: 60 requests per minute.
  // [ES] Predeterminado para cualquier API no listada: 60 solicitudes por minuto.
  if (pathname.startsWith('/api/')) return 60;
  return 0; // [EN] Non-API pages have no limit. / [ES] Las páginas que no son API no tienen límite.
}

/**
 * [EN] Check if this IP has exceeded the limit for this page.
 * [ES] Verificar si esta IP ha excedido el límite para esta página.
 */
function checkRateLimit(ip: string, pathname: string): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = getRateLimit(pathname);
  if (limit === 0) return { allowed: true, remaining: Infinity, resetAt: 0 };

  // [EN] Create a unique key: "IP:page" (e.g., "192.168.1.1:/api/auth/login").
  // [ES] Crear una clave única: "IP:página" (ej., "192.168.1.1:/api/auth/login").
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  // [EN] First request or window expired: start a new count.
  // [ES] Primera solicitud o ventana expirada: empezar un nuevo conteo.
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  // [EN] Over the limit: BLOCK this request.
  // [ES] Sobre el límite: BLOQUEAR esta solicitud.
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // [EN] Under the limit: count it and allow.
  // [ES] Bajo el límite: contarlo y permitir.
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ============================================================================
// MAIN MIDDLEWARE — El guardia principal
// ============================================================================

/**
 * [EN] This function runs on EVERY request to the website. It's the gatekeeper.
 * [ES] Esta función se ejecuta en CADA solicitud al sitio web. Es el guardián.
 */
export function middleware(request: NextRequest) {
  const startTime = performance.now();
  const { pathname } = request.nextUrl;

  // [EN] Skip rate limiting for static files (images, CSS, JS bundles).
  // [ES] Saltar límite de velocidad para archivos estáticos (imágenes, CSS, bundles JS).
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // --- RATE LIMITING ---
  cleanupRateLimits();

  // [EN] Get the user's IP address. We use the "real" IP, not a fake one.
  // [ES] Obtener la dirección IP del usuario. Usamos la IP "real", no una falsa.
  const trustProxy = process.env.TRUST_PROXY === '1';
  const ip = trustProxy
    ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? '127.0.0.1')
    : '127.0.0.1';

  const { allowed, remaining, resetAt } = checkRateLimit(ip, pathname);

  // [EN] If over the limit, return error 429 (Too Many Requests).
  // [ES] Si está sobre el límite, devolver error 429 (Demasiadas Solicitudes).
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

  // [EN] Create the response (the answer we'll send back).
  // [ES] Crear la respuesta (la respuesta que enviaremos de vuelta).
  const response = NextResponse.next();

  // [EN] Add headers so the user knows how many requests they have left.
  // [ES] Agregar headers para que el usuario sepa cuántas solicitudes le quedan.
  if (getRateLimit(pathname) > 0) {
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetAt.toString());
  }

  response.headers.set('X-Request-Start', startTime.toString());

  // --- NONCE FOR CSP ---
  // [EN] Generate a unique nonce for this request. It proves our scripts are safe.
  // [ES] Generar un nonce único para esta solicitud. Demuestra que nuestros scripts son seguros.
  const nonce = generateNonce();
  response.cookies.set('__Secure-nonce', nonce, {
    httpOnly: true,  // [EN] JavaScript can't read this cookie / [ES] JavaScript no puede leer este cookie
    secure: process.env.NODE_ENV === 'production',  // [EN] HTTPS only in production / [ES] Solo HTTPS en producción
    sameSite: 'strict',  // [EN] Don't send to other sites / [ES] No enviar a otros sitios
    path: '/',
    maxAge: 60,  // [EN] Expires in 60 seconds (same as CSP) / [ES] Expira en 60 segundos
  });

  // --- SECURITY HEADERS ---
  // [EN] These headers tell the browser how to protect this page.
  // [ES] Estos headers le dicen al navegador cómo proteger esta página.
  response.headers.set('X-Content-Type-Options', 'nosniff');  // [EN] Don't guess file types / [ES] No adivinar tipos de archivo
  response.headers.set('X-Frame-Options', 'DENY');  // [EN] Don't put us in a frame (clickjacking) / [ES] No ponernos en un frame (clickjacking)
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');  // [EN] Limit referrer info / [ES] Limitar info de referer
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');  // [EN] Disable camera/mic/location / [ES] Deshabilitar cámara/mic/ubicación
  response.headers.set('X-XSS-Protection', '0');  // [EN] Old XSS protection is dangerous, disable it / [ES] La protección XSS vieja es peligrosa, deshabilitarla
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');  // [EN] Isolate from other tabs / [ES] Aislar de otras pestañas
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');  // [EN] Block cross-origin resources / [ES] Bloquear recursos de otros orígenes

  // --- CSRF PROTECTION ---
  // [EN] Check that POST/PUT/DELETE requests come from OUR site, not a hacker's site.
  // [ES] Verificar que las solicitudes POST/PUT/DELETE vienen de NUESTRO sitio, no del sitio de un hacker.
  const method = request.method.toUpperCase();
  if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
    if (pathname.startsWith('/api/')) {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const host = request.headers.get('host');
      // [EN] If there's an Origin header, check it matches our host.
      // [ES] Si hay un header Origin, verificar que coincida con nuestro host.
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
          // [EN] Invalid referer — allow (could be a privacy-restricted browser).
          // [ES] Referer inválido — permitir (podría ser un navegador con privacidad restringida).
        }
      }
    }
  }

  // --- HTTPS ENFORCEMENT ---
  // [EN] In production, force HTTPS (secure connection).
  // [ES] En producción, forzar HTTPS (conexión segura).
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_HSTS === '1') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',  // [EN] 2 years of HTTPS / [ES] 2 años de HTTPS
    );
  }

  // --- CONTENT SECURITY POLICY (CSP) ---
  // [EN] The most important security header. Tells the browser EXACTLY what
  // code is allowed to run on this page.
  // [ES] El header de seguridad más importante. Le dice al navegador EXACTAMENTE
  // qué código está permitido ejecutar en esta página.
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",  // [EN] By default, only load from our own site / [ES] Por defecto, solo cargar de nuestro sitio
      `script-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,  // [EN] Scripts: only with our nonce / [ES] Scripts: solo con nuestro nonce
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",  // [EN] CSS: our site + Google Fonts / [ES] CSS: nuestro sitio + Google Fonts
      "img-src 'self' data: https://image.pollinations.ai https://*.pollinations.ai https://images.meigen.ai https://www.meigen.ai https://i.ytimg.com https://d1s1y0ui543e5o.cloudfront.net",  // [EN] Images: allowed sources / [ES] Imágenes: fuentes permitidas
      "font-src 'self' data: https://fonts.gstatic.com",  // [EN] Fonts: our site + Google Fonts / [ES] Fuentes: nuestro sitio + Google Fonts
      "connect-src 'self' ws://localhost:* wss://localhost:* https://image.pollinations.ai https://text.pollinations.ai https://*.pollinations.ai https://www.meigen.ai https://api.meigen.ai",  // [EN] Network connections: allowed / [ES] Conexiones de red: permitidas
      "frame-ancestors 'none'",  // [EN] No one can put us in a frame / [ES] Nadie puede ponernos en un frame
      "base-uri 'self'",  // [EN] Base URL must be our site / [ES] URL base debe ser nuestro sitio
      "form-action 'self'",  // [EN] Forms can only submit to our site / [ES] Formularios solo pueden enviar a nuestro sitio
    ].join('; '),
  );

  return response;
}

// [EN] Which paths this middleware runs on (everything except static files).
// [ES] En qué rutas se ejecuta esto (todo excepto archivos estáticos).
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
