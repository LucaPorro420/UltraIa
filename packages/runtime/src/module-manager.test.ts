import { describe, expect, it, vi } from 'vitest';
import { ModuleRegistry } from './module-registry';
import { ModuleManager } from './module-manager';
import { UltraEventBus } from './event-bus';
import type { UltraModule } from './types';

const video: UltraModule = {
  id: 'video',
  name: 'Video',
  version: '1.0.0',
  description: 'Video module',
  category: 'video',
  capabilities: ['video.generate'],
  status: 'available',
  weight: 'HEAVY',
  lazy: true,
};

function make(overrides: Partial<UltraModule> = {}): UltraModule {
  return { ...video, ...overrides };
}

function setup(modules: UltraModule[] = [video]) {
  const bus = new UltraEventBus();
  const registry = new ModuleRegistry(bus);
  for (const m of modules) registry.register(m);
  return { bus, registry };
}

describe('ModuleManager', () => {
  it('loads lazily only when requested (loader not called at construction)', async () => {
    const { registry } = setup();
    const loader = vi.fn().mockResolvedValue({ start: vi.fn(), stop: vi.fn() });
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, { loader });
    expect(loader).not.toHaveBeenCalled();
    expect(registry.get('video')?.status).toBe('available');
    await manager.load('video');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(registry.get('video')?.status).toBe('installed');
    expect(manager.isLoaded('video')).toBe(true);
  });

  it('load is idempotent', async () => {
    const { registry } = setup();
    const loader = vi.fn().mockResolvedValue({});
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, { loader });
    await manager.load('video');
    await manager.load('video');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('start auto-loads (lazy) and calls handle.start', async () => {
    const { registry, bus } = setup();
    const started = vi.fn();
    const events: string[] = [];
    bus.on('module.*', (_, topic) => {
      events.push(topic);
    });
    const manager = new ModuleManager(registry, bus, undefined, {
      loader: async () => ({ start: started }),
    });
    await manager.start('video');
    expect(started).toHaveBeenCalled();
    expect(registry.get('video')?.status).toBe('active');
    expect(events).toContain('module.loaded');
    expect(events).toContain('module.started');
    await manager.start('video'); // already active → no-op
    expect(started).toHaveBeenCalledTimes(1);
  });

  it('marks error state when loading fails and blocks further loads', async () => {
    const { registry } = setup();
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, {
      loader: async () => {
        throw new Error('import failed');
      },
    });
    await expect(manager.load('video')).rejects.toThrow('import failed');
    expect(registry.get('video')?.status).toBe('error');
    await expect(manager.start('video')).rejects.toThrow(/error state/);
  });

  it('stop and unload free the handle', async () => {
    const { registry } = setup();
    const stop = vi.fn();
    const unload = vi.fn();
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, {
      loader: async () => ({ start: vi.fn(), stop, unload }),
    });
    await manager.start('video');
    await manager.stop('video');
    expect(stop).toHaveBeenCalled();
    expect(registry.get('video')?.status).toBe('installed');
    expect(manager.isLoaded('video')).toBe(true);
    await manager.unload('video');
    expect(unload).toHaveBeenCalled();
    expect(registry.get('video')?.status).toBe('available');
    expect(manager.isLoaded('video')).toBe(false);
  });

  it('unload auto-stops an active module first', async () => {
    const { registry } = setup();
    const stop = vi.fn();
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, {
      loader: async () => ({ start: vi.fn(), stop }),
    });
    await manager.start('video');
    await manager.unload('video');
    expect(stop).toHaveBeenCalled();
    expect(registry.get('video')?.status).toBe('available');
  });

  it('restart = stop + start', async () => {
    const { registry } = setup();
    const start = vi.fn();
    const stop = vi.fn();
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, {
      loader: async () => ({ start, stop }),
    });
    await manager.start('video');
    await manager.restart('video');
    expect(stop).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(2);
    expect(registry.get('video')?.status).toBe('active');
  });

  it('rejects disabled modules', async () => {
    const { registry } = setup([make({ status: 'disabled' })]);
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, { loader: vi.fn() });
    await expect(manager.load('video')).rejects.toThrow(/disabled/);
  });

  it('rejects unknown modules', async () => {
    const { registry } = setup();
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, { loader: vi.fn() });
    await expect(manager.load('ghost')).rejects.toThrow(/not registered/);
  });

  it('rejects concurrent loads of the same module', async () => {
    const { registry } = setup();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, {
      loader: async () => {
        await gate;
        return {};
      },
    });
    const first = manager.load('video');
    await expect(manager.load('video')).rejects.toThrow(/already loading/);
    release();
    await first;
  });

  it('stopAll stops every active module (reverse order)', async () => {
    const { registry } = setup([video, make({ id: 'audio' }), make({ id: 'web' })]);
    const stopped: string[] = [];
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, {
      loader: async (m) => ({ stop: () => void stopped.push(m.id) }),
    });
    await manager.start('video');
    await manager.start('audio');
    await manager.start('web');
    const result = await manager.stopAll();
    expect(result).toEqual(['web', 'audio', 'video']);
    expect(stopped).toEqual(['web', 'audio', 'video']);
  });

  it('health delegates to the loaded handle', async () => {
    const { registry } = setup();
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, {
      loader: async () => ({ health: async () => ({ ok: true, detail: 'fine' }) }),
    });
    await manager.load('video');
    expect(await manager.health('video')).toEqual({ ok: true, detail: 'fine' });
    expect(await manager.health('audio')).toEqual({ ok: false, detail: 'not loaded' });
  });

  it('recoverError clears the error state', async () => {
    const { registry } = setup();
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, {
      loader: async () => {
        throw new Error('boom');
      },
    });
    await manager.load('video').catch(() => undefined);
    expect(manager.recoverError('video')).toBe(true);
    expect(registry.get('video')?.status).toBe('available');
    expect(manager.recoverError('video')).toBe(false);
  });

  it('requires a loader to load', async () => {
    const { registry } = setup();
    const manager = new ModuleManager(registry, new UltraEventBus());
    await expect(manager.load('video')).rejects.toThrow(/no loader/);
  });

  it('status returns describe + loaded flag', async () => {
    const { registry } = setup();
    const manager = new ModuleManager(registry, new UltraEventBus(), undefined, { loader: vi.fn() });
    expect(await manager.status('video')).toMatchObject({ id: 'video', loaded: false, status: 'available' });
    expect(await manager.status('ghost')).toBeUndefined();
  });
});