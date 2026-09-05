import {
  safeChatTelemetrySchema,
  type SafeChatTelemetry,
  type TelemetryAggregate,
  type ProviderStrategy,
} from './contracts';

const WINDOW_MS = 60 * 60 * 1000;

function windowStart(at: number): string {
  return new Date(Math.floor(at / WINDOW_MS) * WINDOW_MS).toISOString();
}

export class TelemetryAggregator {
  private readonly rows = new Map<string, TelemetryAggregate>();

  record(input: SafeChatTelemetry, at = Date.now()): TelemetryAggregate {
    const telemetry = safeChatTelemetrySchema.parse(input);
    const rowKey = `${windowStart(at)}:${telemetry.provider}:${telemetry.strategy}`;
    const previous = this.rows.get(rowKey) ?? {
      windowStart: windowStart(at),
      provider: telemetry.provider,
      strategy: telemetry.strategy,
      requestCount: 0,
      failureCount: 0,
      cacheHits: 0,
      fallbackCount: 0,
      totalLatencyMs: 0,
    };
    const next = {
      ...previous,
      requestCount: previous.requestCount + 1,
      failureCount: previous.failureCount + (telemetry.outcome === 'failure' ? 1 : 0),
      cacheHits: previous.cacheHits + (telemetry.cacheHit ? 1 : 0),
      fallbackCount: previous.fallbackCount + telemetry.fallbackCount,
      totalLatencyMs: previous.totalLatencyMs + telemetry.latencyMs,
    };
    this.rows.set(rowKey, next);
    return next;
  }

  summary(opts: { since?: number; provider?: string; strategy?: ProviderStrategy } = {}): TelemetryAggregate[] {
    const since = opts.since ?? 0;
    return [...this.rows.values()]
      .filter((row) => {
        const at = Date.parse(row.windowStart);
        return at >= since && (!opts.provider || row.provider === opts.provider) && (!opts.strategy || row.strategy === opts.strategy);
      })
      .sort((a, b) => a.windowStart.localeCompare(b.windowStart) || a.provider.localeCompare(b.provider));
  }

  clear(): void {
    this.rows.clear();
  }
}

export const telemetryAggregator = new TelemetryAggregator();

