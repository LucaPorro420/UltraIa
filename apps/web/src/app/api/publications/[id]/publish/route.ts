import { prisma, markPublished, markFailed } from '@ultraia/core';
import { createDefaultPublishers, publishToAll, buildBilingualMetadata } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { sanitizeError } from '@/lib/server/sanitize-error';

/** POST /api/publications/[id]/publish — publica ahora el paquete (fail-soft sin tokens). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const pub = await prisma.publication.findUnique({ where: { id } });
  if (!pub) return new Response('Not found', { status: 404 });
  if (pub.estado !== 'APPROVED') {
    return Response.json({ error: `Solo se publican paquetes APPROVED (estado: ${pub.estado})` }, { status: 409 });
  }
  if (pub.creadoPorId && pub.creadoPorId !== user.id && user.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  const paquete = JSON.parse(pub.paqueteJson) as { media?: string[]; contenido?: string };
  const videoPath = paquete.media?.find((m) => /\.(mp4|mov|webm)$/i.test(m));
  const metadata = { ...buildBilingualMetadata(pub.tema, pub.caption) };

  try {
    const resultado = await publishToAll(createDefaultPublishers({ includeZernio: true }), {
      videoPath,
      metadata,
    });
    if (resultado.some((r) => r.ok)) {
      await markPublished(prisma, id, resultado);
      return Response.json({ id, estado: 'PUBLISHED', resultado });
    }
    const razon = resultado.map((r) => r.error).filter(Boolean).join(' | ') || 'sin token o sin video';
    await markFailed(prisma, id, razon);
    return Response.json({ id, estado: 'FAILED', error: razon, resultado }, { status: 502 });
  } catch (err) {
    await markFailed(prisma, id, sanitizeError(err));
    return Response.json({ id, estado: 'FAILED', error: sanitizeError(err) }, { status: 502 });
  }
}