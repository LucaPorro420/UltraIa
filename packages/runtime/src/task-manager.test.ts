import { describe, expect, it, vi } from 'vitest';
import { UltraEventBus } from './event-bus';
import { TaskManager } from './task-manager';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('TaskManager', () => {
  it('runs a task through QUEUED→RUNNING→COMPLETED with events', async () => {
    const bus = new UltraEventBus();
    const events: string[] = [];
    bus.on('task.*', (_, topic) => {
      events.push(topic);
    });
    const tm = new TaskManager(bus);
    const task = tm.create('build');
    const result = await tm.submit(task, async () => 'done');
    expect(result).toBe('done');
    expect(tm.get(task.id)?.status).toBe('COMPLETED');
    expect(tm.get(task.id)?.result).toBe('done');
    expect(events).toContain('task.created');
    expect(events).toContain('task.started');
    expect(events).toContain('task.completed');
    expect(tm.counts()).toMatchObject({ queued: 0, running: 0, completed: 1 });
  });

  it('marks FAILED and emits task.failed when the body throws', async () => {
    const bus = new UltraEventBus();
    const failed = vi.fn();
    bus.on('task.failed', failed);
    const tm = new TaskManager(bus);
    const task = tm.create('render');
    await expect(tm.submit(task, async () => { throw new Error('gpu gone'); })).rejects.toThrow('gpu gone');
    expect(tm.get(task.id)?.status).toBe('FAILED');
    expect(tm.get(task.id)?.error).toContain('gpu gone');
    expect(failed).toHaveBeenCalled();
  });

  it('refuses to run a task that is not QUEUED', async () => {
    const tm = new TaskManager(new UltraEventBus());
    const task = tm.create('x');
    await tm.submit(task, async () => 1);
    await expect(tm.submit(task, async () => 2)).rejects.toThrow(/COMPLETED/);
  });

  it('rejects double submission of the same task', async () => {
    const tm = new TaskManager(new UltraEventBus());
    const task = tm.create('x');
    const gate = deferred<void>();
    const first = tm.submit(task, async () => {
      await gate.promise;
      return 1;
    });
    await expect(tm.submit(task, async () => 2)).rejects.toThrow(/already submitted/);
    gate.resolve();
    await first;
  });

  it('cancels a running task cooperatively (aborts the signal)', async () => {
    const tm = new TaskManager(new UltraEventBus());
    const task = tm.create('long');
    const started = deferred<void>();
    const gate = deferred<void>();
    let aborted = false;
    const run = tm.submit(task, async (signal) => {
      signal.addEventListener('abort', () => (aborted = true));
      started.resolve();
      await gate.promise;
      if (signal.aborted) throw new Error('aborted');
      return 'ok';
    });
    await started.promise;
    expect(tm.cancel(task.id)).toBe(true);
    gate.resolve();
    await expect(run).rejects.toThrow('aborted');
    expect(aborted).toBe(true);
    expect(tm.get(task.id)?.status).toBe('CANCELLED');
  });

  it('keeps CANCELLED when cancelled before the body starts', async () => {
    const tm = new TaskManager(new UltraEventBus(), { concurrency: 1 });
    const blocker = tm.create('blocker');
    const gate = deferred<void>();
    const blockRun = tm.submit(blocker, async () => {
      await gate.promise;
      return 0;
    });
    await delay(5);
    const victim = tm.create('victim');
    const run = tm.submit(victim, async () => 'never');
    await delay(5);
    expect(tm.cancel(victim.id)).toBe(true);
    gate.resolve();
    await blockRun;
    await expect(run).rejects.toThrow(/cancelled/);
    expect(tm.get(victim.id)?.status).toBe('CANCELLED');
  });

  it('pause and resume flip state flags', async () => {
    const tm = new TaskManager(new UltraEventBus());
    const task = tm.create('p');
    const gate = deferred<void>();
    const run = tm.submit(task, async () => {
      await gate.promise;
      return 0;
    });
    await delay(10);
    expect(tm.pause(task.id)).toBe(true);
    expect(tm.get(task.id)?.status).toBe('PAUSED');
    expect(tm.resume(task.id)).toBe(true);
    expect(tm.get(task.id)?.status).toBe('RUNNING');
    gate.resolve();
    await run;
  });

  it('retry re-queues a failed task', async () => {
    const tm = new TaskManager(new UltraEventBus());
    const task = tm.create('flaky');
    let calls = 0;
    await tm.submit(task, async () => {
      calls += 1;
      if (calls === 1) throw new Error('first time');
      return 'second time ok';
    }).catch(() => undefined);
    expect(tm.get(task.id)?.status).toBe('FAILED');
    expect(tm.retry(task.id)).toBe(true);
    const result = await tm.submit(task, async () => {
      calls += 1;
      return `attempt ${calls}`;
    });
    expect(result).toBe('attempt 2');
    expect(tm.get(task.id)?.attempt).toBe(2);
  });

  it('schedules by priority when concurrency is exhausted', async () => {
    const tm = new TaskManager(new UltraEventBus(), { concurrency: 1 });
    const order: string[] = [];
    const gate = deferred<void>();

    const first = tm.create('first', { priority: 1 });
    const second = tm.create('second', { priority: 5 });
    const third = tm.create('third', { priority: 3 });

    const p1 = tm.submit(first, async () => {
      await gate.promise;
      order.push('first');
    });
    await delay(5);
    const p2 = tm.submit(second, async () => {
      order.push('second');
    });
    const p3 = tm.submit(third, async () => {
      order.push('third');
    });
    gate.resolve();
    await Promise.all([p1, p2, p3]);
    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('runs up to concurrency tasks in parallel', async () => {
    const tm = new TaskManager(new UltraEventBus(), { concurrency: 2 });
    const running = vi.fn();
    const tasks = Array.from({ length: 4 }, (_, i) => tm.create(`t${i}`));
    const gate = deferred<void>();
    const runs = tasks.map((t, i) =>
      tm.submit(t, async () => {
        running(i);
        await gate.promise;
        return i;
      }),
    );
    await delay(10);
    expect(running).toHaveBeenCalledTimes(2);
    gate.resolve();
    await Promise.all(runs);
    expect(tm.counts().completed).toBe(4);
  });

  it('tracks progress and logs', async () => {
    const tm = new TaskManager(new UltraEventBus());
    const task = tm.create('upload');
    const gate = deferred<void>();
    const run = tm.submit(task, async () => {
      tm.updateProgress(task.id, 0.5);
      tm.log(task.id, 'halfway');
      await gate.promise;
      return 'up';
    });
    await delay(10);
    expect(tm.get(task.id)?.progress).toBe(0.5);
    expect(tm.get(task.id)?.logs.some((l) => l.message === 'halfway')).toBe(true);
    gate.resolve();
    await run;
  });

  it('calls onFailure and emits events for failed tasks', async () => {
    const bus = new UltraEventBus();
    const onFailure = vi.fn();
    const tm = new TaskManager(bus, { onFailure });
    const task = tm.create('boom', { module: 'video' });
    await tm.submit(task, async () => { throw new Error('nope'); }).catch(() => undefined);
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ id: task.id }), expect.any(Error));
    expect(tm.list({ module: 'video' })).toHaveLength(1);
  });

  it('remove and clearFinished manage the store', async () => {
    const tm = new TaskManager(new UltraEventBus());
    const a = tm.create('a');
    const b = tm.create('b');
    await tm.submit(a, async () => 1);
    expect(tm.remove(b.id)).toBe(true);
    expect(tm.remove(a.id)).toBe(true);
    expect(tm.clearFinished()).toBe(0);
    const c = tm.create('c');
    await tm.submit(c, async () => 1);
    expect(tm.clearFinished()).toBe(1);
  });
});