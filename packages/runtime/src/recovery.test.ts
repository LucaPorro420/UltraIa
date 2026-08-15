import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Recovery } from './recovery';
import { UltraEventBus } from './event-bus';

describe('Recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('recovers a module after a failure with backoff', async () => {
    const bus = new UltraEventBus();
    const recovered = vi.fn();
    bus.on('module.recovered', recovered);
    const recovery = new Recovery(bus);
    recovery.setPolicy('video', { maxAttempts: 2, backoffMs: 10 });
    const retry = vi.fn().mockResolvedValueOnce(undefined);
    const promise = recovery.onFailure('video', new Error('crash'), retry);
    await vi.advanceTimersByTimeAsync(10);
    expect(await promise).toBe(true);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(recovered).toHaveBeenCalledTimes(1);
    expect(recovery.attemptsFor('video')).toBe(0); // marked healthy
  });

  it('exhausts attempts and reports recovery-exhausted', async () => {
    const bus = new UltraEventBus();
    const exhausted = vi.fn();
    bus.on('module.recovery-exhausted', exhausted);
    const recovery = new Recovery(bus);
    recovery.setPolicy('video', { maxAttempts: 1, backoffMs: 5 });
    const retry = vi.fn().mockRejectedValue(new Error('still down'));
    const promise = recovery.onFailure('video', new Error('first crash'), retry);
    await vi.advanceTimersByTimeAsync(5);
    // retry failed → second onFailure → backoff again → exhausted
    await vi.advanceTimersByTimeAsync(5);
    expect(await promise).toBe(false);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(exhausted).toHaveBeenCalled();
    expect(recovery.attemptsFor('video')).toBe(2);
    expect(recovery.recentHistory().some((h) => h.recovered === false)).toBe(true);
  });

  it('honors the ignore action', async () => {
    const recovery = new Recovery(new UltraEventBus());
    recovery.setPolicy('audio', { action: 'ignore' });
    const retry = vi.fn();
    expect(await recovery.onFailure('audio', new Error('nope'), retry)).toBe(false);
    expect(retry).not.toHaveBeenCalled();
  });

  it('emits module.failure on the first capture', async () => {
    const bus = new UltraEventBus();
    const failure = vi.fn();
    bus.on('module.failure', failure);
    const recovery = new Recovery(bus);
    recovery.setPolicy('x', { maxAttempts: 1, backoffMs: 5, action: 'ignore' });
    await recovery.onFailure('x', 'string error', vi.fn());
    expect(failure).toHaveBeenCalledWith(
      expect.objectContaining({ moduleId: 'x', error: 'string error' }),
      'module.failure',
    );
  });

  it('markHealthy resets the failure counter', async () => {
    const recovery = new Recovery(new UltraEventBus());
    recovery.setPolicy('x', { maxAttempts: 3, backoffMs: 5, action: 'ignore' });
    await recovery.onFailure('x', new Error('a'), vi.fn());
    await recovery.onFailure('x', new Error('b'), vi.fn());
    expect(recovery.attemptsFor('x')).toBe(2);
    recovery.markHealthy('x');
    expect(recovery.attemptsFor('x')).toBe(0);
  });

  it('uses default policy when none is set', async () => {
    const recovery = new Recovery(new UltraEventBus());
    expect(recovery.getPolicy('anything')).toEqual({ maxAttempts: 2, backoffMs: 1000, action: 'restart' });
  });
});