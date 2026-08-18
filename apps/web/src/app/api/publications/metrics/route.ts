import { computeChannelKpis, fetchChannelAnalytics, mergeAnalyticsIntoKpis } from '@ultraia/core';
import { prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

/**
 * GET /api/publications/metrics — KPIs por canal (AutoPub F5). Requiere ADMIN.
 * Query opcional: ?platform=youtube&channelId=UC_xxx → fusiona analytics reales
 * (YouTube Data API v3 keyless-first con YOUTUBE_API_KEY; resto fail-soft con razón).
 * Sin query → comportamiento previo (solo KPIs de la cola).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get('platform') as
      | 'youtube'
      | 'tiktok'
      | 'x'
      | 'instagram'
      | 'threads'
      | 'telegram'
      | null;
    const channelId = url.searchParams.get('channelId') ?? undefined;

    const kpis = await computeChannelKpis(prisma);
    if (!platform) return Response.json({ ok: true, ...kpis });

    const analytics = await fetchChannelAnalytics({ platform, channelId });
    const kpisConAnalytics = mergeAnalyticsIntoKpis(kpis, [analytics]);
    return Response.json({ ok: true, ...kpisConAnalytics, analytics });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}