/**
 * M04 FIX: Brute-force lockout for auth endpoints.
 *
 * Tracks failed login/register attempts per IP + identifier.
 * Locks after MAX_ATTEMPTS failures within WINDOW_MS.
 * In-memory (resets on restart) — for production, use Redis/DB.
 */

interface AttemptEntry {
  count: number;
  lockedUntil: number;
}

const attempts = new Map<string, AttemptEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minute lockout

/** Clean up expired entries every 5 minutes. */
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [key, entry] of attempts) {
    if (now > entry.lockedUntil && now - entry.lockedUntil > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}

function key(ip: string, identifier: string): string {
  return `${ip}:${identifier.toLowerCase().trim()}`;
}

/** Check if an IP+identifier is currently locked out. */
export function isLockedOut(ip: string, identifier: string): { locked: boolean; retryAfterMs: number } {
  cleanup();
  const entry = attempts.get(key(ip, identifier));
  if (!entry) return { locked: false, retryAfterMs: 0 };
  const now = Date.now();
  if (now < entry.lockedUntil) {
    return { locked: true, retryAfterMs: entry.lockedUntil - now };
  }
  return { locked: false, retryAfterMs: 0 };
}

/** Record a failed attempt. Returns true if now locked out. */
export function recordFailedAttempt(ip: string, identifier: string): { locked: boolean; retryAfterMs: number } {
  cleanup();
  const k = key(ip, identifier);
  const now = Date.now();
  const entry = attempts.get(k);

  if (!entry || now > entry.lockedUntil + WINDOW_MS) {
    // New window or window expired
    attempts.set(k, { count: 1, lockedUntil: 0 });
    return { locked: false, retryAfterMs: 0 };
  }

  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    return { locked: true, retryAfterMs: LOCKOUT_MS };
  }
  return { locked: false, retryAfterMs: 0 };
}

/** Clear failed attempts on successful login. */
export function clearAttempts(ip: string, identifier: string): void {
  attempts.delete(key(ip, identifier));
}

/** Get client IP from request headers. */
export function getClientIp(req: Request): string {
  const trustProxy = process.env.TRUST_PROXY === '1';
  if (trustProxy) {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? '127.0.0.1';
  }
  return '127.0.0.1';
}
