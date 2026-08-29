// provider-stats.ts — Latency tracking + health state for model providers.
// Deterministic, keyless, zero deps.

export interface ProviderStats {
  provider: string;
  model: string;
  latencyP50: number;
  latencyP95: number;
  errorRate: number;
  totalRequests: number;
  lastUsed: number;
  status: 'healthy' | 'degraded' | 'down';
  lastHealthCheck: number;
}

export class LatencyTracker {
  private stats = new Map<string, { latencies: number[]; errors: number; total: number; lastUsed: number }>();
  private health = new Map<string, { status: string; until: number }>();

  record(provider: string, model: string, ms: number, error: boolean) {
    const k = `${provider}:${model}`;
    const e = this.stats.get(k) ?? { latencies: [], errors: 0, total: 0, lastUsed: 0 };
    e.latencies.push(ms);
    if (e.latencies.length > 50) e.latencies.shift();
    if (error) e.errors++;
    e.total++;
    e.lastUsed = Date.now();
    this.stats.set(k, e);
  }

  getStats(provider: string, model: string): ProviderStats | null {
    const e = this.stats.get(`${provider}:${model}`);
    if (!e) return null;
    const s = [...e.latencies].sort((a, b) => a - b);
    const h = this.health.get(`${provider}:${model}`);
    const median = (arr: number[]) => {
      const m = Math.floor(arr.length / 2);
      return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
    };
    return {
      provider, model,
      latencyP50: median(s),
      latencyP95: s[Math.floor(s.length * 0.95)] ?? 0,
      errorRate: e.total > 0 ? e.errors / e.total : 0,
      totalRequests: e.total,
      lastUsed: e.lastUsed,
      status: (h?.status as any) ?? 'healthy',
      lastHealthCheck: h?.until ?? 0,
    };
  }

  sortByLatency<T extends { provider: string; model: string }>(c: T[]): T[] {
    return [...c].sort((a, b) => (this.getStats(a.provider, a.model)?.latencyP50 ?? Infinity) - (this.getStats(b.provider, b.model)?.latencyP50 ?? Infinity));
  }

  markDown(provider: string, model: string, cooldownMs = 300_000) {
    this.health.set(`${provider}:${model}`, { status: 'down', until: Date.now() + cooldownMs });
  }

  isHealthy(provider: string, model: string): boolean {
    const h = this.health.get(`${provider}:${model}`);
    if (!h) return true;
    if (h.status === 'down' && Date.now() < h.until) return false;
    this.health.delete(`${provider}:${model}`);
    return true;
  }

  scoreboard(): ProviderStats[] {
    return [...this.stats.keys()].map(k => {
      const [p, m] = k.split(':');
      return this.getStats(p, m)!;
    }).filter(Boolean);
  }
}

export const latencyTracker = new LatencyTracker();
