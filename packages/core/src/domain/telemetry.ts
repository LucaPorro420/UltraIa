import type { Db } from '../db/client';
import type { SafeChatTelemetry } from '../ai/contracts';

const WINDOW_MS = 60 * 60 * 1000;

function aggregateWindow(at = Date.now()): Date {
  return new Date(Math.floor(at / WINDOW_MS) * WINDOW_MS);
}

/** Persists only allowlisted counters; prompts, outputs, headers, and credentials never enter the DB. */
export async function recordChatTelemetry(
  db: Db,
  telemetry: SafeChatTelemetry,
  at = Date.now(),
): Promise<void> {
  const windowStart = aggregateWindow(at);
  const failureCount = telemetry.outcome === 'failure' ? 1 : 0;
  const cacheHits = telemetry.cacheHit ? 1 : 0;
  await db.$transaction([
    db.providerTelemetry.upsert({
      where: { windowStart_provider_strategy: { windowStart, provider: telemetry.provider, strategy: telemetry.strategy } },
      create: {
        windowStart,
        provider: telemetry.provider,
        strategy: telemetry.strategy,
        requestCount: 1,
        failureCount,
        cacheHits,
        fallbackCount: telemetry.fallbackCount,
        totalLatencyMs: Math.round(telemetry.latencyMs),
      },
      update: {
        requestCount: { increment: 1 },
        failureCount: { increment: failureCount },
        cacheHits: { increment: cacheHits },
        fallbackCount: { increment: telemetry.fallbackCount },
        totalLatencyMs: { increment: Math.round(telemetry.latencyMs) },
      },
    }),
    db.chatTelemetry.upsert({
      where: {
        windowStart_provider_strategy_modelTier: {
          windowStart,
          provider: telemetry.provider,
          strategy: telemetry.strategy,
          modelTier: telemetry.modelTier,
        },
      },
      create: {
        windowStart,
        provider: telemetry.provider,
        strategy: telemetry.strategy,
        modelTier: telemetry.modelTier,
        requestCount: 1,
        failureCount,
        cacheHits,
        fallbackCount: telemetry.fallbackCount,
        totalLatencyMs: Math.round(telemetry.latencyMs),
      },
      update: {
        requestCount: { increment: 1 },
        failureCount: { increment: failureCount },
        cacheHits: { increment: cacheHits },
        fallbackCount: { increment: telemetry.fallbackCount },
        totalLatencyMs: { increment: Math.round(telemetry.latencyMs) },
      },
    }),
  ]);
}

export async function getChatTelemetry(
  db: Db,
  opts: { since?: Date; provider?: string; strategy?: string } = {},
) {
  return db.chatTelemetry.findMany({
    where: {
      windowStart: opts.since ? { gte: opts.since } : undefined,
      provider: opts.provider,
      strategy: opts.strategy,
    },
    orderBy: { windowStart: 'asc' },
  });
}

