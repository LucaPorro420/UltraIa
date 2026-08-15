import { describe, expect, it, vi } from 'vitest';
import { HealthManager } from './health';
import { UltraEventBus } from './event-bus';

const ok = () => ({ ok: true });

describe('HealthManager', () => {
  it('reports healthy when all checks pass', async () => {
    const manager = new HealthManager();
    manager.register({ name: 'db', critical: true, run: ok });
    manager.register({ name: 'core', run: ok });
    const report = await manager.runAll();
    expect(report.status).toBe('healthy');
    expect(report.checks.db.ok).toBe(true);
    expect(report.criticalFailures).toEqual([]);
    expect(report.degraded).toEqual([]);
  });

  it('reports degraded when a non-critical check fails', async () => {
    const manager = new HealthManager();
    manager.register({ name: 'db', critical: true, run: ok });
    manager.register({ name: 'ai-provider', run: () => ({ ok: false, detail: 'no key' }) });
    const report = await manager.runAll();
    expect(report.status).toBe('degraded');
    expect(report.degraded).toEqual(['ai-provider']);
    expect(report.criticalFailures).toEqual([]);
  });

  it('reports unhealthy when a critical check fails', async () => {
    const manager = new HealthManager();
    manager.register({ name: 'db', critical: true, run: () => ({ ok: false, detail: 'down' }) });
    manager.register({ name: 'core', run: ok });
    const report = await manager.runAll();
    expect(report.status).toBe('unhealthy');
    expect(report.criticalFailures).toEqual(['db']);
  });

  it('times out slow checks and continues with the rest', async () => {
    const manager = new HealthManager(undefined, undefined, { defaultTimeoutMs: 30 });
    manager.register({
      name: 'slow',
      critical: true,
      run: () => new Promise((r) => setTimeout(() => r({ ok: true }), 200)),
    });
    manager.register({ name: 'fast', run: ok });
    const report = await manager.runAll();
    expect(report.checks.slow.ok).toBe(false);
    expect(report.checks.slow.detail).toContain('timed out');
    expect(report.checks.fast.ok).toBe(true);
    expect(report.status).toBe('unhealthy');
  });

  it('isolates a throwing check', async () => {
    const manager = new HealthManager();
    manager.register({ name: 'boom', run: () => { throw new Error('crash'); } });
    manager.register({ name: 'fine', run: ok });
    const report = await manager.runAll();
    expect(report.checks.boom.ok).toBe(false);
    expect(report.checks.boom.detail).toBe('crash');
    expect(report.status).toBe('degraded');
  });

  it('supports async checks and rejects duplicate registration', async () => {
    const manager = new HealthManager();
    manager.register({ name: 'async', run: async () => ({ ok: true, detail: 'yes' }) });
    expect(() => manager.register({ name: 'async', run: ok })).toThrow(/already registered/);
    expect(await manager.runOne('async')).toMatchObject({ ok: true, detail: 'yes' });
    expect(await manager.runOne('missing')).toBeUndefined();
    expect(manager.unregister('async')).toBe(true);
    expect(manager.listChecks()).toEqual([]);
  });

  it('emits health.changed only on status transitions', async () => {
    const bus = new UltraEventBus();
    const changed = vi.fn();
    bus.on('health.changed', changed);
    const manager = new HealthManager(bus);
    manager.register({ name: 'db', critical: true, run: ok });
    await manager.runAll();
    await manager.runAll();
    expect(changed).toHaveBeenCalledTimes(1);
    const getLastReport = manager.getLastReport();
    expect(getLastReport?.status).toBe('healthy');
  });
});