import { prisma, publishDue } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

/**
 * POST /api/publications/publish-due — dispara la publicación programada (calendario).
 * Publica todas las APPROVED con scheduledAt <= now usando los adapters default
 * (fail-soft sin tokens → FAILED con razón). Requiere rol ADMIN.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  try {
    const res = await publishDue(prisma);
    return Response.json({ ...res, ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}