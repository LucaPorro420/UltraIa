import { z } from 'zod';
import { assertStrongPassword, createSession, createWorkspace, hashPassword, prisma, verifyPassword } from '@ultraia/core';

const credentialsSchema = z.object({
  email: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/login — login REST para clientes sin cookies (app móvil Expo).
 * Body: { email: string (email o username), password: string }.
 * Respuesta: { token, expiresAt, user } — el token se envía en header
 * `x-ultraia-session` (o Authorization: Bearer) en las siguientes peticiones.
 */
export async function POST(req: Request) {
  const parsed = credentialsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });

  const identifier = parsed.data.email;
  const user = identifier.includes('@')
    ? await prisma.user.findUnique({ where: { email: identifier } })
    : await prisma.user.findFirst({ where: { name: identifier } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return Response.json({ error: 'Invalid email/username or password' }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(prisma, user.id);
  return Response.json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}