import { getCurrentUser } from '@/lib/server/context';
import { getChatTelemetry, prisma, telemetryAggregator } from '@ultraia/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const hours = Math.min(168, Math.max(1, Number(url.searchParams.get('hours') ?? 24) || 24));
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  let rows = telemetryAggregator.summary({ since: since.getTime() });
  try {
    const persisted = await getChatTelemetry(prisma, { since });
    rows = persisted.map((row) => ({
      windowStart: row.windowStart.toISOString(),
      provider: row.provider,
      strategy: row.strategy as typeof rows[number]['strategy'],
      requestCount: row.requestCount,
      failureCount: row.failureCount,
      cacheHits: row.cacheHits,
      fallbackCount: row.fallbackCount,
      totalLatencyMs: row.totalLatencyMs,
    }));
  } catch {
    // In-memory telemetry remains a safe fallback when the database is unavailable.
  }
  const totalRequests = rows.reduce((sum, row) => sum + row.requestCount, 0);
  const totalLatencyMs = rows.reduce((sum, row) => sum + row.totalLatencyMs, 0);
  return Response.json({
    ok: true,
    windowHours: hours,
    rows,
    totals: {
      requests: totalRequests,
      failures: rows.reduce((sum, row) => sum + row.failureCount, 0),
      cacheHits: rows.reduce((sum, row) => sum + row.cacheHits, 0),
      fallbacks: rows.reduce((sum, row) => sum + row.fallbackCount, 0),
      averageLatencyMs: totalRequests ? Math.round(totalLatencyMs / totalRequests) : 0,
    },
  }, { headers: { 'cache-control': 'no-store' } });
}
