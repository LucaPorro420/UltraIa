// model-cache.test.ts — Compact behavior contract for ModelResponseCache
import { describe, it, expect, beforeEach } from 'vitest';
import { ModelResponseCache } from './model-cache';

describe('ModelResponseCache', () => {
  let cache: ModelResponseCache;

  beforeEach(() => {
    cache = new ModelResponseCache({ ttlMs: 60_000, maxSize: 3 });
  });

  // Core behavior: miss → null, set → hit
  it('miss returns null; set makes hit', () => {
    expect(cache.get('s', 'm', 'mod')).toBeNull();
    cache.set('s', 'm', 'mod', 'resp');
    expect(cache.get('s', 'm', 'mod')).toEqual({ response: 'resp', hit: true });
  });

  // Boundary: different inputs → different keys
  it('different model/key produces different entry', () => {
    cache.set('s', 'm', 'a', 'r1');
    cache.set('s', 'm', 'b', 'r2');
    expect(cache.get('s', 'm', 'a')?.response).toBe('r1');
    expect(cache.get('s', 'm', 'b')?.response).toBe('r2');
  });

  // Boundary: capacity eviction (maxSize=3)
  it('evicts oldest when full', () => {
    [1, 2, 3, 4].forEach(i => cache.set(`s${i}`, 'm', 'mod', `r${i}`));
    expect(cache.get('s1', 'm', 'mod')).toBeNull(); // evicted
    expect(cache.get('s4', 'm', 'mod')?.response).toBe('r4');
  });

  // Boundary: TTL expiry
  it('expires after ttlMs', async () => {
    const c = new ModelResponseCache({ ttlMs: 10 });
    c.set('s', 'm', 'mod', 'r');
    await new Promise(r => setTimeout(r, 15));
    expect(c.get('s', 'm', 'mod')).toBeNull();
  });

  // Utility: stats and clear
  it('stats tracks size; clear empties', () => {
    cache.set('s', 'm', 'mod', 'r');
    expect(cache.stats().size).toBe(1);
    cache.clear();
    expect(cache.stats().size).toBe(0);
  });
});
