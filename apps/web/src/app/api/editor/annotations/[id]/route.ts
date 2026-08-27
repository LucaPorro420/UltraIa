import { prisma, getAnnotation, resolveAnnotation, reopenAnnotation, setAnnotationVisible, deleteAnnotation } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

/** PATCH /api/editor/annotations/[id] - acciones: resolve | reopen | visible. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const json = (await req.json().catch(() => ({}))) as { action?: string; visible?: boolean };

  const action = json.action;
  if (action === 'resolve') {
    await resolveAnnotation(prisma, id, user.id, user.role);
  } else if (action === 'reopen') {
    await reopenAnnotation(prisma, id);
  } else if (action === 'visible') {
    await setAnnotationVisible(prisma, id, !!json.visible);
  } else {
    return new Response('Accion invalida (resolve|reopen|visible)', { status: 400 });
  }

  const ann = await getAnnotation(prisma, id);
  return Response.json(ann);
}

/** DELETE /api/editor/annotations/[id] - borra (autor o ADMIN). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const ok = await deleteAnnotation(prisma, id, { userId: user.id, role: user.role });
  if (!ok) return new Response('Forbidden', { status: 403 });
  return new Response(null, { status: 204 });
}
