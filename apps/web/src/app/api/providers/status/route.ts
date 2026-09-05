import { getCurrentUser } from '@/lib/server/context';
import { providerStatus } from '@ultraia/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const providers = providerStatus();
  return Response.json({
    ok: true,
    providers,
    summary: {
      total: providers.length,
      available: providers.filter((provider) => provider.available).length,
      degraded: providers.filter((provider) => provider.status === 'degraded').length,
      unavailable: providers.filter((provider) => provider.status === 'unavailable').length,
    },
    timestamp: new Date().toISOString(),
  }, { headers: { 'cache-control': 'no-store' } });
}

