import { z } from 'zod';
import { getSessionUser, prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { getStudioCloud, resolveAssetBytes } from '@/lib/server/studio-assets';

/**
 * Auth del GET: header/cookie (web) O `?session=<token>` — la app móvil abre
 * imágenes/audio/vídeo en el navegador del sistema, donde no puede mandar
 * headers (loop-108). PATCH/DELETE siguen por getCurrentUser estándar.
 */
async function getUserForRead(req: Request): Promise<{ id: string } | null> {
  const sp = new URL(req.url).searchParams;
  const qs = sp.get('session');
  if (qs) {
    const u = await getSessionUser(prisma, qs);
    if (u) return { id: u.id };
  }
  const u = await getCurrentUser(req);
  return u ? { id: u.id } : null;
}

/** GET /api/assets/[id] — sirve el binario durable (cloud) o por-proxy la URL externa. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserForRead(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const asset = await prisma.generatedAsset.findFirst({ where: { id, userId: user.id } });
  if (!asset) return new Response('Not found', { status: 404 });

  const resolved = await resolveAssetBytes(asset, getStudioCloud());
  if (!resolved) {
    // Último recurso: redirigir a la URL externa si sigue viva.
    if (asset.url && !asset.url.startsWith('/')) return Response.redirect(asset.url, 302);
    return new Response('Binary unavailable', { status: 410 });
  }
  return new Response(Buffer.from(resolved.bytes), {
    headers: {
      'Content-Type': resolved.mime,
      'Content-Length': String(resolved.bytes.byteLength),
      'Cache-Control': 'private, max-age=3600',
      'X-Ultraia-Source': resolved.source,
    },
  });
}

const patchSchema = z.object({
  prompt: z.string().min(1).max(2000).optional(),
  meta: z.record(z.unknown()).optional(),
});

/** PATCH /api/assets/[id] — modifica prompt/metadata (p.ej. filtros CSS aplicados). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const asset = await prisma.generatedAsset.findFirst({ where: { id, userId: user.id } });
  if (!asset) return new Response('Not found', { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.prompt !== undefined) data.prompt = parsed.data.prompt;
  if (parsed.data.meta !== undefined) {
    // Merge superficial sobre metaJson existente (no destruye filtros previos).
    const current = asset.metaJson ? (JSON.parse(asset.metaJson) as Record<string, unknown>) : {};
    data.metaJson = JSON.stringify({ ...current, ...parsed.data.meta });
  }
  const updated = await prisma.generatedAsset.update({ where: { id }, data });
  return Response.json({ id: updated.id, metaJson: updated.metaJson, prompt: updated.prompt });
}

/** DELETE /api/assets/[id] — borra la fila y su binario en cloud (fail-soft). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const asset = await prisma.generatedAsset.findFirst({ where: { id, userId: user.id } });
  if (!asset) return new Response('Not found', { status: 404 });

  if (asset.cloudPath) {
    try {
      await getStudioCloud().remove(asset.cloudPath);
    } catch {
      // Fail-soft: el binario huérfano no bloquea el borrado lógico.
    }
  }
  await prisma.generatedAsset.delete({ where: { id } });
  return Response.json({ ok: true });
}
