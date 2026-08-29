/**
 * GET /api/health/providers — Estado de salud de los providers de IA.
 *
 * Retorna el scoreboard del LatencyTracker: P50/P95, error rate, status
 * de cada provider:modelo. Sin auth — para dashboards internos.
 */
import { NextResponse } from 'next/server';
import { latencyTracker } from '@ultraia/core';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const scoreboard = latencyTracker.scoreboard();

  return NextResponse.json(
    {
      ok: true,
      providers: scoreboard,
      summary: {
        total: scoreboard.length,
        healthy: scoreboard.filter((s) => s.status === 'healthy').length,
        degraded: scoreboard.filter((s) => s.status === 'degraded').length,
        down: scoreboard.filter((s) => s.status === 'down').length,
      },
      timestamp: new Date().toISOString(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
