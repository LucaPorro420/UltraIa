import { describe, expect, it, vi } from 'vitest';
import { ModuleRegistry } from './module-registry';
import { UltraEventBus } from './event-bus';
import type { UltraModule } from './types';

const base: UltraModule = {
  id: 'video',
  name: 'Video Generator',
  version: '0.1.0',
  description: 'Generates videos',
  category: 'video',
  capabilities: ['video.generate', 'video.export'],
  status: 'available',
  weight: 'HEAVY',
  lazy: true,
};

describe('ModuleRegistry', () => {
  it('registers and retrieves modules', () => {
    const registry = new ModuleRegistry();
    registry.register(base);
    expect(registry.get('video')).toMatchObject({ id: 'video', capabilities: ['video.generate', 'video.export'] });
    expect(registry.count()).toBe(1);
  });

  it('rejects invalid ids and versions', () => {
    const registry = new ModuleRegistry();
    expect(() => registry.register({ ...base, id: 'BAD ID' })).toThrow(/invalid module id/);
    expect(() => registry.register({ ...base, id: 'x' })).toThrow(/invalid module id/);
    expect(() => registry.register({ ...base, version: 'latest' })).toThrow(/invalid module version/);
  });

  it('rejects duplicate registration', () => {
    const registry = new ModuleRegistry();
    registry.register(base);
    expect(() => registry.register({ ...base })).toThrow(/already registered/);
  });

  it('discovers by capability without loading anything', () => {
    const registry = new ModuleRegistry();
    registry.register(base);
    registry.register({
      ...base,
      id: 'audio',
      category: 'audio',
      capabilities: ['audio.generate'],
    });
    expect(registry.findByCapability('video.generate').map((m) => m.id)).toEqual(['video']);
    expect(registry.hasCapability('video', 'video.export')).toBe(true);
    expect(registry.hasCapability('video', 'nope')).toBe(false);
    expect(registry.capabilityMap()['video.generate']).toEqual(['video']);
  });

  it('searches across id, name, description and capabilities', () => {
    const registry = new ModuleRegistry();
    registry.register(base);
    expect(registry.search('video').map((m) => m.id)).toEqual(['video']);
    expect(registry.search('generates videos').map((m) => m.id)).toEqual(['video']);
    expect(registry.search('export').map((m) => m.id)).toEqual(['video']);
    expect(registry.search('zzz')).toEqual([]);
    expect(registry.search('')).toEqual([]);
  });

  it('groups by category', () => {
    const registry = new ModuleRegistry();
    registry.register(base);
    registry.register({ ...base, id: 'audio', category: 'audio' });
    expect(registry.listByCategory('audio')).toHaveLength(1);
  });

  it('tracks status transitions and emits events', () => {
    const bus = new UltraEventBus();
    const status = vi.fn();
    bus.on('module.status', status);
    const registry = new ModuleRegistry(bus);
    registry.register(base);
    expect(registry.setStatus('video', 'active')).toBe(true);
    expect(registry.get('video')?.status).toBe('active');
    expect(status).toHaveBeenCalledWith({ id: 'video', status: 'active' }, 'module.status');
    expect(registry.setStatus('missing', 'active')).toBe(false);
  });

  it('unregisters and emits events', () => {
    const bus = new UltraEventBus();
    const gone = vi.fn();
    bus.on('module.unregistered', gone);
    const registry = new ModuleRegistry(bus);
    registry.register(base);
    expect(registry.unregister('video')).toBe(true);
    expect(registry.unregister('video')).toBe(false);
    expect(gone).toHaveBeenCalledTimes(1);
  });

  it('describe returns a compact capability view', () => {
    const registry = new ModuleRegistry();
    registry.register(base);
    expect(registry.describe('video')).toEqual({
      id: 'video',
      name: 'Video Generator',
      version: '0.1.0',
      category: 'video',
      status: 'available',
      capabilities: ['video.generate', 'video.export'],
    });
    expect(registry.describe('missing')).toBeUndefined();
  });
});