import { prisma, registrarFeedback } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

/**
 * POST /api/publications/[id]/feedback — señal post-publicación (AutoPub F5).
 * Body: { rating: 'GOOD' | 'BAD', critique?: string }. ADMIN o creador.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  const pub = await prisma.publication.findUnique({ where: { id } });
  if (!pub) return new Response('Not found', { status: 404 });
  if (user.role !== 'ADMIN' && pub.creadoPorId !== user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const body = (await _req.json().catch(() => null)) as { rating?: string; critique?: string } | null;
  if (!body || (body.rating !== 'GOOD' && body.rating !== 'BAD')) {
    return new Response('rating debe ser GOOD o BAD', { status: 400 });
  }

  try {
    const senales = await registrarFeedback(prisma, id, {
      rating: body.rating,
      critique: body.critique ?? '',
    });
    return Response.json({ ok: true, senales });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}