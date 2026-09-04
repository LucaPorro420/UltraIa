import { prisma, slugifyPrompt } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { getStudioCloud, MIME_BY_EXT, resolveAssetBytes } from '@/lib/server/studio-assets';
import { verifyDownloadToken } from '@/lib/server/download-token';

/**
 * GET /api/assets/[id]/download — descarga el binario con Content-Disposition.
 * Auth: header/cookie O `?dl=<token>&assetId=<id>` (HMAC-signed, 60s TTL).
 * H04 FIX: session tokens removed from URLs — use short-lived download tokens instead.
 * Cloud primero (durable); proxy a la URL externa como fallback.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string | null = null;

  const sp = new URL(req.url).searchParams;
  const dlToken = sp.get('dl');
  if (dlToken) {
    const u = await getCurrentUser(req);
    if (u) {
      const result = verifyDownloadToken(dlToken, id, u.id);
      if (result.valid) userId = u.id;
    }
  }
  if (!userId) {
    const u = await getCurrentUser(req);
    userId = u?.id ?? null;
  }
  if (!userId) return new Response('Unauthorized', { status: 401 });

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
