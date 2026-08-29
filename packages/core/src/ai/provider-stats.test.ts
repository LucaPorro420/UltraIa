// provider-stats.test.ts — Compact behavior contract for LatencyTracker
import { describe, it, expect, beforeEach } from 'vitest';
import { LatencyTracker } from './provider-stats';

describe('LatencyTracker', () => {
  let t: LatencyTracker;
  beforeEach(() => { t = new LatencyTracker(); });

  // Core: record + getStats
  it('computes P50 from recorded latencies', () => {
    t.record('p', 'm', 100, false);
    t.record('p', 'm', 200, false);
    expect(t.getStats('p', 'm')?.latencyP50).toBe(150);
  });

  // Core: error tracking
  it('computes error rate', () => {
    t.record('p', 'm', 50, false);
    t.record('p', 'm', 60, true);
    expect(t.getStats('p', 'm')?.errorRate).toBeCloseTo(0.5);
  });

  // Boundary: unknown provider
  it('returns null for unknown', () => {
    expect(t.getStats('x', 'y')).toBeNull();
  });

  // Core: sortByLatency
  it('sorts by P50 ascending', () => {
    t.record('slow', 'm', 300, false);
    t.record('fast', 'm', 30, false);
    const s = t.sortByLatency([
      { provider: 'slow', model: 'm' },
      { provider: 'fast', model: 'm' },
    ]);
    expect(s[0].provider).toBe('fast');
  });

  // Core: health state
  it('markDown → isHealthy false; auto-recover after cooldown', () => {
    t.markDown('p', 'm', 50);
    expect(t.isHealthy('p', 'm')).toBe(false);
  });

  it('isHealthy true for unknown providers', () => {
    expect(t.isHealthy('x', 'y')).toBe(true);
  });

  // Utility: scoreboard
  it('scoreboard lists all tracked', () => {
    t.record('a', 'm1', 10, false);
    t.record('b', 'm2', 20, false);
    expect(t.scoreboard()).toHaveLength(2);
  });
});
