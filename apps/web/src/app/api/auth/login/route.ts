import { z } from 'zod';
import { assertStrongPassword, createSession, createWorkspace, hashPassword, prisma, verifyPassword } from '@ultraia/core';
import { isLockedOut, recordFailedAttempt, clearAttempts, getClientIp } from '@/lib/server/brute-force';

const credentialsSchema = z.object({
  email: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/login — login REST para clientes sin cookies (app móvil Expo).
 * Body: { email: string (email o username), password: string }.
 * Respuesta: { token, expiresAt, user } — el token se envía en header
 * `x-ultraia-session` en las siguientes peticiones.
 * M04 FIX: brute-force lockout — 5 failures per IP → 15 min lockout.
 */
export async function POST(req: Request) {
  const parsed = credentialsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });

  const ip = getClientIp(req);
  const identifier = parsed.data.email;

  // M04: check brute-force lockout
  const lockCheck = isLockedOut(ip, identifier);
  if (lockCheck.locked) {
    const retryAfterSec = Math.ceil(lockCheck.retryAfterMs / 1000);
    return Response.json(
      { error: `Too many failed attempts. Try again in ${retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  const user = identifier.includes('@')
    ? await prisma.user.findUnique({ where: { email: identifier } })
    : await prisma.user.findFirst({ where: { name: identifier } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    // M04: record failed attempt
    const result = recordFailedAttempt(ip, identifier);
    if (result.locked) {
      const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
      return Response.json(
        { error: `Account locked due to too many failed attempts. Try again in ${retryAfterSec}s.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }
    return Response.json({ error: 'Invalid email/username or password' }, { status: 401 });
  }

  // M04: clear failed attempts on success
  clearAttempts(ip, identifier);

  const { token, expiresAt } = await createSession(prisma, user.id);
  return Response.json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}