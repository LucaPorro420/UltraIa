import { prisma, getSessionUser, slugifyPrompt } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { getStudioCloud, MIME_BY_EXT, resolveAssetBytes } from '@/lib/server/studio-assets';

/**
 * GET /api/assets/[id]/download — descarga el binario con Content-Disposition.
 * Auth: header/cookie O `?session=<token>` (móvil, loop-108).
 * Cloud primero (durable); proxy a la URL externa como fallback.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string | null = null;
  const qs = new URL(req.url).searchParams.get('session');
  if (qs) {
    const u = await getSessionUser(prisma, qs);
    if (u) userId = u.id;
  }
  if (!userId) {
    const u = await getCurrentUser(req);
    userId = u?.id ?? null;
  }
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const asset = await prisma.generatedAsset.findFirst({ where: { id, userId } });
  if (!asset) return new Response('Not found', { status: 404 });

  const resolved = await resolveAssetBytes(asset, getStudioCloud());
  if (!resolved) return new Response('Binary unavailable', { status: 410 });

  const seedPart = typeof asset.seed === 'number' ? `-${asset.seed}` : '';
  let ext = asset.cloudPath?.split('.').pop()?.toLowerCase() ?? '';
  if (!MIME_BY_EXT[ext]) {
    ext = Object.entries(MIME_BY_EXT).find(([, mime]) => mime === resolved.mime)?.[0] ?? 'bin';
  }
  const fileName = `${slugifyPrompt(asset.prompt)}${seedPart}.${ext}`;

  return new Response(Buffer.from(resolved.bytes), {
    headers: {
      'Content-Type': resolved.mime,
      'Content-Length': String(resolved.bytes.byteLength),
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
