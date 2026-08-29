import { describe, it, expect, vi } from 'vitest';
import { RequestQueue } from './request-queue';

describe('RequestQueue', () => {
  it('executes a request and returns its result', async () => {
    const q = new RequestQueue(2);
    const result = await q.enqueue(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });

  it('respects max concurrency', async () => {
    const q = new RequestQueue(1);
    let running = 0;
    let maxRunning = 0;

    const task = () => new Promise<string>(r => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      setTimeout(() => { running--; r('done'); }, 10);
    });

    await Promise.all([q.enqueue(task), q.enqueue(task), q.enqueue(task)]);
    expect(maxRunning).toBe(1);
  });

  it('deduplicates concurrent requests with same key', async () => {
    const q = new RequestQueue(2);
    let callCount = 0;
    const task = () => new Promise<string>(r => {
      callCount++;
      setTimeout(() => r(`result-${callCount}`), 10);
    });

    const [a, b] = await Promise.all([
      q.enqueue(task, 'NORMAL', 'dedup-key'),
      q.enqueue(task, 'NORMAL', 'dedup-key'),
    ]);

    expect(a).toBe(b);
    expect(callCount).toBe(1);
    expect(q.stats.deduplicated).toBe(1);
  });

  it('prioritizes CRITICAL over NORMAL', async () => {
    const q = new RequestQueue(1);
    const order: string[] = [];

    // Block with first request
    const blocker = q.enqueue(() => new Promise<string>(r => {
      setTimeout(() => { order.push('blocker'); r('done'); }, 20);
    }), 'NORMAL');

    // These should queue up
    const normal = q.enqueue(() => Promise.resolve('normal'), 'NORMAL');
    const critical = q.enqueue(() => Promise.resolve('critical'), 'CRITICAL');

    await blocker;
    // Critical should run before normal
    const [c, n] = await Promise.all([critical, normal]);
    expect(c).toBe('critical');
    expect(n).toBe('normal');
  });

  it('reports accurate stats', async () => {
    const q = new RequestQueue(2);
    expect(q.stats).toEqual({
      queueLength: 0,
      running: 0,
      maxConcurrent: 2,
      deduplicated: 0,
    });

    await q.enqueue(() => Promise.resolve('ok'));
    expect(q.stats.running).toBe(0);
  });
});
