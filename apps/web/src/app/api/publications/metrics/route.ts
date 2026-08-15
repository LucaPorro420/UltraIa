import { computeChannelKpis } from '@ultraia/core';
import { prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

/** GET /api/publications/metrics — KPIs por canal (AutoPub F5). Requiere ADMIN. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  try {
    const kpis = await computeChannelKpis(prisma);
    return Response.json({ ok: true, ...kpis });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}