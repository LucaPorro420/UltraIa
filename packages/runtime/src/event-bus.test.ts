import { describe, expect, it, vi } from 'vitest';
import { UltraEventBus } from './event-bus';

describe('UltraEventBus', () => {
  it('delivers payloads to listeners', () => {
    const bus = new UltraEventBus();
    const handler = vi.fn();
    bus.on('task.completed', handler);
    bus.emit('task.completed', { id: '1' });
    expect(handler).toHaveBeenCalledWith({ id: '1' }, 'task.completed');
  });

  it('off() unsubscribes and returns a disposer', () => {
    const bus = new UltraEventBus();
    const handler = vi.fn();
    const dispose = bus.on('a', handler);
    bus.emit('a');
    dispose();
    bus.emit('a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('once fires a single time', () => {
    const bus = new UltraEventBus();
    const handler = vi.fn();
    bus.once('b', handler);
    bus.emit('b');
    bus.emit('b');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports wildcard patterns', () => {
    const bus = new UltraEventBus();
    const all = vi.fn();
    const modules = vi.fn();
    bus.on('*', all);
    bus.on('module.*', (payload, topic) => {
      modules(payload, topic);
    });
    bus.emit('module.started', { id: 'video' });
    bus.emit('task.done');
    expect(all).toHaveBeenCalledTimes(2);
    expect(modules).toHaveBeenCalledTimes(1);
    expect(modules).toHaveBeenCalledWith({ id: 'video' }, 'module.started');
  });

  it('isolates a throwing handler without breaking others', () => {
    const bus = new UltraEventBus();
    const bad = vi.fn(() => { throw new Error('handler blew up'); });
    const good = vi.fn();
    bus.on('x', bad);
    bus.on('x', good);
    expect(() => bus.emit('x')).not.toThrow();
    expect(good).toHaveBeenCalled();
  });

  it('await emitAsync and isolates async rejections', async () => {
    const bus = new UltraEventBus();
    const bad = vi.fn(async () => { throw new Error('async boom'); });
    const good = vi.fn(async () => { /* ok */ });
    bus.on('y', bad);
    bus.on('y', good);
    await expect(bus.emitAsync('y')).resolves.toBeUndefined();
    expect(good).toHaveBeenCalled();
  });

  it('tracks listener counts and totals', () => {
    const bus = new UltraEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('t1', a);
    bus.on('t1', b);
    bus.on('t2', a);
    bus.on('module.*', a);
    expect(bus.listenerCount('t1')).toBe(2); // direct only; 'module.*' does not match 't1'
    expect(bus.listenerCount('module.started')).toBe(1); // wildcard match
    expect(bus.totalListeners()).toBe(4);
    bus.clear();
    expect(bus.totalListeners()).toBe(0);
  });

  it('counts emitted events', () => {
    const bus = new UltraEventBus();
    bus.emit('a');
    bus.emit('a');
    bus.emit('b');
    expect(bus.totalEmitted()).toBe(3);
  });
});