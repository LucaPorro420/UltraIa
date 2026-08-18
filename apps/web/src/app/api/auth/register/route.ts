import { z } from 'zod';
import { assertStrongPassword, createSession, createWorkspace, hashPassword, prisma } from '@ultraia/core';

const registerSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/register — registro REST para clientes sin cookies (app móvil Expo).
 * Body: { name?, email, password }.
 * Respuesta: { token, expiresAt, user } — misma sesión que el login.
 */
export async function POST(req: Request) {
  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });

  try {
    assertStrongPassword(parsed.data.password);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Weak password' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return Response.json({ error: 'An account with this email already exists' }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name || null,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  await createWorkspace(prisma, { ownerId: user.id, name: `${user.name ?? user.email}'s workspace` });

  const { token, expiresAt } = await createSession(prisma, user.id);
  return Response.json(
    {
      token,
      expiresAt: expiresAt.toISOString(),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
    { status: 201 },
  );
}