import { prisma, rejectPublication } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

/** POST /api/publications/[id]/reject — rechazo humano del paquete (DRAFT → REJECTED). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const pub = await prisma.publication.findUnique({ where: { id } });
  if (!pub) return new Response('Not found', { status: 404 });
  if (pub.creadoPorId && pub.creadoPorId !== user.id && user.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const estado = await rejectPublication(prisma, id);
    return Response.json({ id, estado });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 409 });
  }
}