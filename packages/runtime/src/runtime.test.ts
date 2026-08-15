import { describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { UltraRuntime } from './runtime';

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ultraia-runtime-'));
}

describe('UltraRuntime', () => {
  it('boots, registers system modules and reports healthy', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    expect(runtime.stateName).toBe('stopped');
    await runtime.start();
    expect(runtime.stateName).toBe('running');
    const status = runtime.status();
    expect(status.modules.some((m) => m.id === 'system')).toBe(true);
    expect(status.modules.some((m) => m.id === 'memory')).toBe(true);
    const health = await runtime.healthReport();
    expect(health.status).toBe('healthy');
    expect(runtime.registry.count()).toBe(2);
    await runtime.stop();
    expect(runtime.stateName).toBe('stopped');
  });

  it('start is idempotent', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    await runtime.start();
    expect(runtime.stateName).toBe('running');
    await runtime.stop();
  });

  it('registers host modules as metadata only (nothing loads at boot)', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    const loader = vi.fn();
    runtime.registerModules([
      { id: 'video', name: 'Video', version: '1.0.0', description: 'Video gen', category: 'video', capabilities: ['video.generate'], weight: 'HEAVY' },
    ]);
    await runtime.start();
    expect(runtime.registry.get('video')?.status).toBe('available');
    expect(loader).not.toHaveBeenCalled();
    await runtime.stop();
  });

  it('starts a lazy module only through the module.start command (operator+)', async () => {
    const started = vi.fn();
    const runtime = UltraRuntime.create({
      root: tmpRoot(),
      projectRoot: tmpRoot(),
      loader: async () => ({ start: started }),
    });
    runtime.registerModules([
      { id: 'audio', name: 'Audio', version: '1.0.0', description: 'Audio gen', category: 'audio', capabilities: ['audio.generate'] },
    ]);
    await runtime.start();
    await expect(runtime.commands.execute('module.start', { id: 'audio' }, { role: 'user' })).rejects.toThrow();
    await runtime.commands.execute('module.start', { id: 'audio' }, { role: 'operator' });
    expect(runtime.registry.get('audio')?.status).toBe('active');
    await runtime.commands.execute('module.stop', { id: 'audio' }, { role: 'operator' });
    expect(runtime.registry.get('audio')?.status).toBe('installed');
    await runtime.stop();
  });

  it('system commands expose status, capabilities and memory without loading modules', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    const status = await runtime.commands.execute('system.status', {}, { role: 'user' });
    expect(status).toMatchObject({ state: 'running', version: '0.1.0' });
    const capabilities = await runtime.commands.execute('system.capabilities', {}, { role: 'user' });
    expect(capabilities).toMatchObject({ 'system.status': ['system'], 'memory.store': ['memory'] });
    const health = await runtime.commands.execute('system.health', {}, { role: 'user' });
    expect(health).toMatchObject({ status: 'healthy' });
    await runtime.stop();
  });

  it('stores ERROR memory when a task fails (learning signal)', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    const task = runtime.tasks.create('render', { module: 'video' });
    await runtime.tasks.submit(task, async () => { throw new Error('gpu oom'); }).catch(() => undefined);
    const errors = runtime.memory.search({ types: ['ERROR'], limit: 5 });
    expect(errors.some((e) => e.content.includes('gpu oom'))).toBe(true);
    await runtime.stop();
  });

  it('stopAll + memory persist on stop', async () => {
    const root = tmpRoot();
    const runtime = UltraRuntime.create({ root, projectRoot: tmpRoot(), loader: async () => ({}) });
    runtime.registerModules([
      { id: 'web', name: 'Web', version: '1.0.0', description: 'Builder', category: 'web', capabilities: ['web.create'] },
    ]);
    await runtime.start();
    await runtime.modules.start('web');
    expect(runtime.registry.get('web')?.status).toBe('active');
    await runtime.stop();
    expect(runtime.registry.get('web')?.status).toBe('installed');
    expect(runtime.status().state).toBe('stopped');
  });

  it('restart cycles state', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    await runtime.restart();
    expect(runtime.stateName).toBe('running');
    await runtime.stop();
  });

  it('tracked status includes tasks and memory counts', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    const task = runtime.tasks.create('x');
    await runtime.tasks.submit(task, async () => 1);
    const status = runtime.status();
    expect(status.tasks.completed).toBe(1);
    expect(status.memory.entries).toBe(0);
    await runtime.stop();
  });

  it('keeps a memory log sink tail for the Shell status bar', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    runtime.logger.info('SYSTEM', 'hello from test');
    expect(runtime.memoryLogs.tail(1)[0].message).toBe('hello from test');
  });
});