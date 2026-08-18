import { prisma, approvePublication, rejectPublication } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

/** POST /api/publications/[id]/approve — aprobación humana del paquete (DRAFT → APPROVED). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const pub = await prisma.publication.findUnique({ where: { id } });
  if (!pub) return new Response('Not found', { status: 404 });
  if (pub.creadoPorId && pub.creadoPorId !== user.id && user.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const estado = await approvePublication(prisma, id);
    return Response.json({ id, estado });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 409 });
  }
}