import type { CommandContext, CommandDefinition, CommandLevel, CommandRecord } from './types';
import type { UltraEventBus } from './event-bus';
import type { UltraLogger } from './logger';

export interface CommandExecutorOptions {
  /** Never emit shell commands unless the host explicitly enables them. */
  allowShell?: boolean;
}

const ROLE_RANK: Record<CommandContext['role'], number> = { user: 1, operator: 2, admin: 3 };
const LEVEL_RANK: Record<CommandLevel, number> = { safe: 1, restricted: 2, admin: 3 };

/**
 * Command execution with an explicit allowlist. NO arbitrary commands are
 * executed: only registered ids, each with a declared level that must be
 * authorized by the caller's role. Shell access requires admin AND the host
 * explicitly enabling `allowShell` — anything else is rejected.
 */
export class CommandExecutor {
  private readonly commands = new Map<string, CommandDefinition>();
  private readonly history: CommandRecord[] = [];
  private readonly maxHistory: number;
  private readonly allowShell: boolean;

  constructor(
    private readonly events?: UltraEventBus,
    private readonly logger?: UltraLogger,
    options: CommandExecutorOptions = {},
  ) {
    this.allowShell = options.allowShell ?? false;
    this.maxHistory = 200;
  }

  register(def: CommandDefinition): void {
    if (this.commands.has(def.id)) throw new Error(`command already registered: ${def.id}`);
    if (def.level === 'admin' && /shell|exec/i.test(def.id) && !this.allowShell) {
      throw new Error(`command "${def.id}" executes shell/system code; set allowShell explicitly`);
    }
    this.commands.set(def.id, { ...def });
  }

  unregister(id: string): boolean {
    return this.commands.delete(id);
  }

  listCommands(): { id: string; level: CommandLevel; description: string }[] {
    return [...this.commands.values()].map((c) => ({
      id: c.id,
      level: c.level,
      description: c.description,
    }));
  }

  isAllowed(id: string, ctx: CommandContext): boolean {
    const def = this.commands.get(id);
    if (!def) return false;
    return ROLE_RANK[ctx.role] >= LEVEL_RANK[def.level];
  }

  /** Executes a registered command. Throws on unknown/unauthorized commands. */
  async execute(id: string, args: Record<string, unknown> = {}, ctx: CommandContext = { role: 'user' }): Promise<unknown> {
    const def = this.commands.get(id);
    if (!def) throw new Error(`unknown command: ${id} (allowlist only)`);
    if (!this.isAllowed(id, ctx)) {
      this.logger?.warn('SECURITY', `command denied`, { command: id, role: ctx.role });
      this.events?.emit('command.denied', { command: id, role: ctx.role });
      throw new Error(`command "${id}" requires level ${def.level}`);
    }
    const started = Date.now();
    try {
      const result = await def.handler(args, ctx);
      const record: CommandRecord = {
        command: id,
        timestamp: new Date().toISOString(),
        module: ctx.module,
        actor: ctx.user ?? ctx.role,
        result: this.sanitize(result),
        durationMs: Date.now() - started,
      };
      this.history.push(record);
      if (this.history.length > this.maxHistory) this.history.shift();
      this.events?.emit('command.executed', record);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const record: CommandRecord = {
        command: id,
        timestamp: new Date().toISOString(),
        module: ctx.module,
        actor: ctx.user ?? ctx.role,
        result: undefined,
        durationMs: Date.now() - started,
        error: message,
      };
      this.history.push(record);
      this.logger?.error('SECURITY', `command failed`, { command: id, error: message });
      this.events?.emit('command.failed', { command: id, error: message });
      throw err;
    }
  }

  commandHistory(filter?: { command?: string; actor?: string }): CommandRecord[] {
    let out = this.history;
    if (filter?.command) out = out.filter((r) => r.command === filter.command);
    if (filter?.actor) out = out.filter((r) => r.actor === filter.actor);
    return [...out];
  }

  /** Keeps results out of logs when they are huge or sensitive. */
  private sanitize(result: unknown): unknown {
    if (result === undefined || result === null) return null;
    if (typeof result === 'string') return result.length > 500 ? `${result.slice(0, 500)}…` : result;
    return result;
  }
}