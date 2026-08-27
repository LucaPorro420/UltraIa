import { prisma, createAnnotation, listAnnotations } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import type { AnnotationKind, AnnotationEstado } from '@ultraia/core';

/** GET /api/editor/annotations?page=&kind=&estado=&visibleOnly=1 - lista anotaciones. */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const page = url.searchParams.get('page') ?? undefined;
  const kind = (url.searchParams.get('kind') ?? undefined) as AnnotationKind | undefined;
  const estado = (url.searchParams.get('estado') ?? undefined) as AnnotationEstado | undefined;
  const visibleOnly = url.searchParams.get('visibleOnly') === '1';

  const items = await listAnnotations(prisma, { page, kind, estado, visibleOnly });
  return Response.json({ items });
}

/** POST /api/editor/annotations - crea una anotacion (nota|peticion|texto). */
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const json = await req.json().catch(() => null);
  if (!json || typeof json !== 'object') return new Response('Invalid JSON', { status: 400 });

  try {
    const created = await createAnnotation(prisma, { ...json, creadoPorId: user.id });
    return Response.json(created, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Bad request';
    return new Response(msg, { status: 400 });
  }
}
