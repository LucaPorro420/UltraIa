import { describe, expect, it, vi } from 'vitest';
import { CommandExecutor } from './command-executor';
import { UltraEventBus } from './event-bus';

describe('CommandExecutor', () => {
  it('executes only registered commands (allowlist)', async () => {
    const executor = new CommandExecutor();
    const handler = vi.fn().mockReturnValue(42);
    executor.register({ id: 'calc', level: 'safe', description: 'calc', handler });
    expect(await executor.execute('calc', {}, { role: 'user' })).toBe(42);
    expect(handler).toHaveBeenCalledWith({}, { role: 'user' });
    await expect(executor.execute('rm -rf /', {}, { role: 'admin' })).rejects.toThrow(/unknown command/);
  });

  it('enforces role vs level (user < operator < admin)', async () => {
    const executor = new CommandExecutor();
    executor.register({ id: 'sys.reboot', level: 'admin', description: 'reboot', handler: () => 'ok' });
    await expect(executor.execute('sys.reboot', {}, { role: 'user' })).rejects.toThrow(/requires level admin/);
    await expect(executor.execute('sys.reboot', {}, { role: 'operator' })).rejects.toThrow(/requires level admin/);
    expect(await executor.execute('sys.reboot', {}, { role: 'admin' })).toBe('ok');
    expect(executor.isAllowed('sys.reboot', { role: 'admin' })).toBe(true);
    expect(executor.isAllowed('sys.reboot', { role: 'user' })).toBe(false);
    expect(executor.isAllowed('nope', { role: 'admin' })).toBe(false);
  });

  it('restricted commands require operator or admin', async () => {
    const executor = new CommandExecutor();
    executor.register({ id: 'module.stop', level: 'restricted', description: 'stop', handler: () => 1 });
    await expect(executor.execute('module.stop')).rejects.toThrow();
    expect(await executor.execute('module.stop', {}, { role: 'operator' })).toBe(1);
  });

  it('refuses shell/exec admin commands unless allowShell is set', () => {
    const executor = new CommandExecutor();
    expect(() =>
      executor.register({ id: 'system.exec', level: 'admin', description: 'shell', handler: () => 0 }),
    ).toThrow(/allowShell/);
    const open = new CommandExecutor(undefined, undefined, { allowShell: true });
    expect(() =>
      open.register({ id: 'system.exec', level: 'admin', description: 'shell', handler: () => 0 }),
    ).not.toThrow();
    expect(() =>
      open.register({ id: 'system.exec', level: 'admin', description: 'shell', handler: () => 0 }),
    ).toThrow(/already registered/);
  });

  it('rejects duplicate registrations and unregisters', () => {
    const executor = new CommandExecutor();
    executor.register({ id: 'a', level: 'safe', description: 'a', handler: () => 0 });
    expect(() => executor.register({ id: 'a', level: 'safe', description: 'a', handler: () => 0 })).toThrow(/already registered/);
    expect(executor.unregister('a')).toBe(true);
    expect(executor.unregister('a')).toBe(false);
  });

  it('records history with duration and errors, and sanitizes long results', async () => {
    const executor = new CommandExecutor();
    executor.register({ id: 'slow', level: 'safe', description: 'slow', handler: async () => 'x'.repeat(600) });
    executor.register({ id: 'boom', level: 'safe', description: 'boom', handler: async () => { throw new Error('kaboom'); } });
    await executor.execute('slow', {}, { role: 'user', user: 'ana' });
    await executor.execute('boom', {}, { role: 'user', user: 'ana' }).catch(() => undefined);
    const history = executor.commandHistory({ actor: 'ana' });
    expect(history).toHaveLength(2);
    expect(history[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(history[0].result).toHaveLength(501); // 500 + ellipsis
    expect(history[1].error).toBe('kaboom');
    expect(executor.commandHistory({ command: 'slow' })).toHaveLength(1);
  });

  it('emits command.executed and command.denied events', async () => {
    const bus = new UltraEventBus();
    const executed = vi.fn();
    const denied = vi.fn();
    bus.on('command.executed', executed);
    bus.on('command.denied', denied);
    const executor = new CommandExecutor(bus);
    executor.register({ id: 'ping', level: 'safe', description: 'ping', handler: () => 'pong' });
    await executor.execute('ping', {}, { role: 'user' });
    executor.register({ id: 'top', level: 'admin', description: 'top', handler: () => 0 });
    await executor.execute('top', {}, { role: 'user' }).catch(() => undefined);
    expect(executed).toHaveBeenCalledTimes(1);
    expect(denied).toHaveBeenCalledTimes(1);
  });

  it('lists commands with levels', () => {
    const executor = new CommandExecutor();
    executor.register({ id: 'safe1', level: 'safe', description: 'd', handler: () => 0 });
    executor.register({ id: 'admin1', level: 'admin', description: 'e', handler: () => 0 });
    const list = executor.listCommands();
    expect(list).toHaveLength(2);
    expect(list.find((c) => c.id === 'safe1')?.level).toBe('safe');
  });
});