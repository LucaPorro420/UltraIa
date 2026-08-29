// model-cache.ts — LRU response cache for LLM outputs.
// Fail-soft: returns null on miss/expiry. No external deps.

export class ModelResponseCache {
  private cache = new Map<string, { response: string; timestamp: number }>();
  private ttlMs: number;
  private maxSize: number;

  constructor(opts: { ttlMs?: number; maxSize?: number } = {}) {
    this.ttlMs = opts.ttlMs ?? Number(process.env.ULTRAIA_CACHE_TTL_MS || 300_000);
    this.maxSize = opts.maxSize ?? Number(process.env.ULTRAIA_CACHE_MAX_SIZE || 1000);
  }

  private key(system: string, messages: string, model: string): string {
    let h = 0;
    const s = `${model}:${system}:${messages}`;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return `c${Math.abs(h).toString(36)}`;
  }

  get(system: string, messages: string, model: string): { response: string; hit: boolean } | null {
    const e = this.cache.get(this.key(system, messages, model));
    if (!e || Date.now() - e.timestamp > this.ttlMs) {
      if (e) this.cache.delete(this.key(system, messages, model));
      return null;
    }
    return { response: e.response, hit: true };
  }

  set(system: string, messages: string, model: string, response: string): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
    this.cache.set(this.key(system, messages, model), { response, timestamp: Date.now() });
  }

  stats() { return { size: this.cache.size, maxSize: this.maxSize, ttlMs: this.ttlMs }; }
  clear() { this.cache.clear(); }
}

export const modelCache = new ModelResponseCache();
