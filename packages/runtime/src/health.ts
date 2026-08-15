import type { HealthReport, HealthResult, HealthStatus } from './types';
import type { UltraEventBus } from './event-bus';
import type { UltraLogger } from './logger';

export interface HealthCheckDefinition {
  name: string;
  /** Failing a critical check makes the whole system unhealthy. */
  critical?: boolean;
  /** Per-check timeout in ms. Default 5000. */
  timeoutMs?: number;
  run: () => Promise<HealthResult> | HealthResult;
}

export interface HealthManagerOptions {
  defaultTimeoutMs?: number;
}

/**
 * Aggregate health checks (database, core, AI provider, local API, modules,
 * filesystem, resources, runtime — whatever the host registers). A single
 * failing check never blocks the others; the report carries per-check detail.
 */
export class HealthManager {
  private readonly checks = new Map<string, HealthCheckDefinition>();
  private readonly defaultTimeoutMs: number;
  private lastReport?: HealthReport;

  constructor(
    private readonly events?: UltraEventBus,
    private readonly logger?: UltraLogger,
    options: HealthManagerOptions = {},
  ) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 5000;
  }

  register(def: HealthCheckDefinition): void {
    if (this.checks.has(def.name)) throw new Error(`health check already registered: ${def.name}`);
    this.checks.set(def.name, { ...def });
  }

  unregister(name: string): boolean {
    return this.checks.delete(name);
  }

  listChecks(): string[] {
    return [...this.checks.keys()];
  }

  async runOne(name: string): Promise<HealthResult | undefined> {
    const def = this.checks.get(name);
    if (!def) return undefined;
    const started = Date.now();
    const timeoutMs = def.timeoutMs ?? this.defaultTimeoutMs;
    try {
      const result = await Promise.race([
        Promise.resolve(def.run()),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`health check timed out after ${timeoutMs}ms`)), timeoutMs),
        ),
      ]);
      return { ...result, durationMs: Date.now() - started };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, detail: message, durationMs: Date.now() - started };
    }
  }

  async runAll(): Promise<HealthReport> {
    const checks: HealthReport['checks'] = {};
    const criticalFailures: string[] = [];
    const degraded: string[] = [];
    for (const name of this.checks.keys()) {
      const result = (await this.runOne(name)) ?? { ok: false, detail: 'missing', durationMs: 0 };
      checks[name] = result;
      if (!result.ok) {
        if (this.checks.get(name)?.critical) criticalFailures.push(name);
        else degraded.push(name);
      }
    }
    const status: HealthStatus =
      criticalFailures.length > 0 ? 'unhealthy' : degraded.length > 0 ? 'degraded' : 'healthy';
    const report: HealthReport = { status, at: new Date().toISOString(), checks, criticalFailures, degraded };
    const changed = this.lastReport?.status !== report.status;
    this.lastReport = report;
    this.events?.emit('health.report', report);
    if (changed) {
      this.events?.emit('health.changed', report);
      if (report.status !== 'healthy') {
        this.logger?.warn('SYSTEM', `health: ${report.status}`, {
          critical: criticalFailures,
          degraded,
        });
      }
    }
    return report;
  }

  getLastReport(): HealthReport | undefined {
    return this.lastReport;
  }
}