import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ResourceManager, CpuUsageSampler, MemoryUsageCollector, type ResourceCollector } from './resource-manager';
import { UltraEventBus } from './event-bus';
import type { ResourceSnapshot, UltraModule } from './types';

function fakeCollector(name: string, usage: number): ResourceCollector {
  return { name, collect: () => ({ usage, label: name }) };
}

function snapshot(samples: Record<string, number>): ResourceSnapshot {
  return {
    at: new Date().toISOString(),
    samples: Object.fromEntries(Object.entries(samples).map(([k, v]) => [k, { usage: v, label: k }])),
  };
}

const heavyInactive: UltraModule = {
  id: 'video',
  name: 'Video',
  version: '1.0.0',
  description: '',
  category: 'video',
  capabilities: ['video.generate'],
  status: 'installed',
  weight: 'HEAVY',
  lazy: true,
};

const lightActive: UltraModule = {
  id: 'chat',
  name: 'Chat',
  version: '1.0.0',
  description: '',
  category: 'ai',
  capabilities: ['ai.chat'],
  status: 'active',
  weight: 'LIGHT',
};

describe('ResourceManager', () => {
  it('requires at least one collector', () => {
    expect(() => new ResourceManager([])).toThrow(/collector/);
  });

  it('collects from all collectors and degrades a failing one', async () => {
    const broken: ResourceCollector = {
      name: 'gpu',
      collect: () => {
        throw new Error('gpu driver gone');
      },
    };
    const manager = new ResourceManager([fakeCollector('cpu', 0.2), broken]);
    const snapshot = await manager.collect();
    expect(snapshot.samples.cpu.usage).toBe(0.2);
    expect(snapshot.samples.gpu.usage).toBe(0);
  });

  it('evaluates NORMAL/WARNING/CRITICAL levels', () => {
    const manager = new ResourceManager([fakeCollector('cpu', 0)]);
    expect(manager.evaluate(snapshot({ cpu: 0.1, memory: 0.4 })).level).toBe('NORMAL');
    expect(manager.evaluate(snapshot({ cpu: 0.75, memory: 0.4 })).level).toBe('WARNING');
    expect(manager.evaluate(snapshot({ cpu: 0.4, memory: 0.9 })).level).toBe('CRITICAL');
    const report = manager.evaluate(snapshot({ cpu: 0.9 }));
    expect(report.perResource.cpu.level).toBe('CRITICAL');
  });

  it('suggests unloading inactive HEAVY/GPU modules only on CRITICAL', () => {
    const manager = new ResourceManager([fakeCollector('cpu', 0)]);
    const modules = [heavyInactive, lightActive];
    const normal = manager.evaluate(snapshot({ cpu: 0.4 }), modules);
    expect(normal.unloadSuggestions).toEqual([]);
    const critical = manager.evaluate(snapshot({ cpu: 0.95 }), modules);
    expect(critical.unloadSuggestions).toEqual(['video']);
    const activeHeavy = manager.evaluate(snapshot({ cpu: 0.95 }), [
      { ...heavyInactive, status: 'active' },
      lightActive,
    ]);
    expect(activeHeavy.unloadSuggestions).toEqual([]);
  });

  it('supports custom thresholds', () => {
    const manager = new ResourceManager([fakeCollector('cpu', 0.5)], undefined, {
      warningAt: 0.4,
      criticalAt: 0.6,
    });
    expect(manager.evaluate(snapshot({ cpu: 0.5 })).level).toBe('WARNING');
    expect(manager.evaluate(snapshot({ cpu: 0.7 })).level).toBe('CRITICAL');
  });

  it('polls on start and emits resource events', async () => {
    const bus = new UltraEventBus();
    const events: string[] = [];
    bus.on('resource.*', (_, topic) => {
      events.push(topic);
    });
    const manager = new ResourceManager([fakeCollector('cpu', 0.95)], bus, { pollMs: 20 });
    manager.start();
    await new Promise((r) => setTimeout(r, 60));
    manager.stop();
    expect(events).toContain('resource.updated');
    expect(events).toContain('resource.critical');
    expect(manager.getLastReport()?.level).toBe('CRITICAL');
  });

  it('start is idempotent and stop clears the timer', async () => {
    const manager = new ResourceManager([fakeCollector('cpu', 0.1)], new UltraEventBus(), { pollMs: 5 });
    manager.start();
    manager.start();
    await new Promise((r) => setTimeout(r, 25));
    manager.stop();
    const before = manager.getLastReport()?.at;
    await new Promise((r) => setTimeout(r, 25));
    expect(manager.getLastReport()?.at).toBe(before);
  });
});

describe('CpuUsageSampler', () => {
  it('returns 0 usage on first sample and 0..1 afterwards', () => {
    const sampler = new CpuUsageSampler();
    expect(sampler.collect().usage).toBe(0);
    const second = sampler.collect();
    expect(second.usage).toBeGreaterThanOrEqual(0);
    expect(second.usage).toBeLessThanOrEqual(1);
  });
});

describe('MemoryUsageCollector', () => {
  it('returns a bounded fraction', () => {
    const collector = new MemoryUsageCollector();
    const sample = collector.collect();
    expect(sample.usage).toBeGreaterThan(0);
    expect(sample.usage).toBeLessThan(1);
  });
});