import type { LogCategory, LogEntry, LogLevel } from './types';

export interface LogSink {
  write(entry: LogEntry): void;
}

export interface ConsoleSinkOptions {
  json?: boolean;
}

/** Console sink. In JSON mode emits one JSON object per line (machine-parseable). */
export class ConsoleLogSink implements LogSink {
  constructor(private readonly opts: ConsoleSinkOptions = {}) {}

  write(entry: LogEntry): void {
    if (this.opts.json) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry));
      return;
    }
    const meta = entry.meta && Object.keys(entry.meta).length > 0 ? ` ${JSON.stringify(entry.meta)}` : '';
    const module = entry.module ? ` [${entry.module}]` : '';
    // eslint-disable-next-line no-console
    console.log(`${entry.at} ${entry.level.padEnd(5)} ${entry.category.padEnd(8)}${module} ${entry.message}${meta}`);
  }
}

/** In-memory sink, primarily for tests and for the Shell status view. */
export class MemoryLogSink implements LogSink {
  readonly entries: LogEntry[] = [];

  write(entry: LogEntry): void {
    this.entries.push(entry);
  }

  clear(): void {
    this.entries.length = 0;
  }

  tail(n: number): LogEntry[] {
    return this.entries.slice(-n);
  }

  byCategory(category: LogCategory): LogEntry[] {
    return this.entries.filter((e) => e.category === category);
  }
}

export interface UltraLoggerOptions {
  minLevel?: LogLevel;
  sinks?: LogSink[];
}

const LEVEL_ORDER: Record<LogLevel, number> = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };

/**
 * Structured logger with fixed categories (SYSTEM/MODULE/AI/TASK/SECURITY/MEMORY/INSTALL).
 * Never throws: a failing sink is swallowed and reported to the next sink.
 */
export class UltraLogger {
  private readonly minLevel: number;
  private readonly sinks: LogSink[];

  constructor(private readonly options: UltraLoggerOptions = {}) {
    this.minLevel = LEVEL_ORDER[options.minLevel ?? 'INFO'];
    this.sinks = options.sinks ?? [new ConsoleLogSink()];
  }

  private emit(level: LogLevel, category: LogCategory, message: string, module?: string, meta?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < this.minLevel) return;
    const entry: LogEntry = {
      at: new Date().toISOString(),
      level,
      category,
      message,
      module,
      meta,
    };
    for (const sink of this.sinks) {
      try {
        sink.write(entry);
      } catch {
        // Logging must never take down the runtime.
      }
    }
  }

  debug(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    this.emit('DEBUG', category, message, undefined, meta);
  }

  info(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    this.emit('INFO', category, message, undefined, meta);
  }

  warn(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    this.emit('WARN', category, message, undefined, meta);
  }

  error(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    this.emit('ERROR', category, message, undefined, meta);
  }

  /** Logger scoped to a module (pre-fills the module field). */
  child(module: string): UltraLogger {
    const base = this;
    return new Proxy(this, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function') return value;
        return (...args: unknown[]) => {
          const level = prop as LogLevel;
          const [category, message, meta] = args as [LogCategory, string, Record<string, unknown>?];
          base.emit(level, category, message, module, meta);
        };
      },
    });
  }
}