import type { LogCategory } from './types';
import type { UltraLogger } from './logger';

export type EventHandler = (payload: unknown, topic: string) => void | Promise<void>;

const WILDCARD = '*';

function topicMatches(pattern: string, topic: string): boolean {
  if (pattern === WILDCARD || pattern === topic) return true;
  if (pattern.endsWith('.*')) return topic.startsWith(pattern.slice(0, -1));
  if (pattern.includes(WILDCARD)) {
    const [head, tail] = pattern.split(WILDCARD);
    return topic.startsWith(head) && topic.endsWith(tail);
  }
  return false;
}

interface WildcardEntry {
  pattern: string;
  handler: EventHandler;
}

/**
 * In-process pub/sub for module-to-module communication. Topics support the
 * `module.*` wildcard (handlers are matched against the emitted topic). A
 * throwing handler never breaks other handlers or the emitter — the error is
 * logged and isolated (observable, recoverable).
 */
export class UltraEventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly wildcardHandlers = new Set<WildcardEntry>();
  private readonly logger?: UltraLogger;
  private emitted = 0;

  constructor(logger?: UltraLogger) {
    this.logger = logger;
  }

  on(topic: string, handler: EventHandler): () => void {
    if (topic.includes(WILDCARD)) {
      this.wildcardHandlers.add({ pattern: topic, handler });
    } else {
      if (!this.handlers.has(topic)) this.handlers.set(topic, new Set());
      this.handlers.get(topic)!.add(handler);
    }
    return () => this.off(topic, handler);
  }

  once(topic: string, handler: EventHandler): () => void {
    const wrapped: EventHandler = (payload, t) => {
      this.off(topic, wrapped);
      return handler(payload, t);
    };
    return this.on(topic, wrapped);
  }

  off(topic: string, handler: EventHandler): void {
    if (topic.includes(WILDCARD)) {
      for (const entry of this.wildcardHandlers) {
        if (entry.pattern === topic && entry.handler === handler) {
          this.wildcardHandlers.delete(entry);
        }
      }
      return;
    }
    const set = this.handlers.get(topic);
    if (set) {
      set.delete(handler);
      if (set.size === 0) this.handlers.delete(topic);
    }
  }

  private matchingHandlers(topic: string): EventHandler[] {
    const targets: EventHandler[] = [];
    const direct = this.handlers.get(topic);
    if (direct) targets.push(...direct);
    for (const entry of this.wildcardHandlers) {
      if (topicMatches(entry.pattern, topic)) targets.push(entry.handler);
    }
    return targets;
  }

  /** Synchronous emit. Async handlers are invoked but not awaited (fire-and-forget). */
  emit(topic: string, payload?: unknown): void {
    this.emitted++;
    for (const handler of this.matchingHandlers(topic)) {
      try {
        const result = handler(payload, topic);
        if (result instanceof Promise) {
          result.catch((err: unknown) => this.logHandlerError(topic, err));
        }
      } catch (err) {
        this.logHandlerError(topic, err);
      }
    }
  }

  /** Async emit: awaits every handler (sequential). Errors are isolated. */
  async emitAsync(topic: string, payload?: unknown): Promise<void> {
    this.emitted++;
    for (const handler of this.matchingHandlers(topic)) {
      try {
        await handler(payload, topic);
      } catch (err) {
        this.logHandlerError(topic, err);
      }
    }
  }

  listenerCount(topic: string): number {
    let count = this.handlers.get(topic)?.size ?? 0;
    for (const entry of this.wildcardHandlers) {
      if (topicMatches(entry.pattern, topic)) count += 1;
    }
    return count;
  }

  totalListeners(): number {
    let count = 0;
    for (const set of this.handlers.values()) count += set.size;
    return count + this.wildcardHandlers.size;
  }

  totalEmitted(): number {
    return this.emitted;
  }

  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }

  private logHandlerError(topic: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.logger?.error('SYSTEM' as LogCategory, `event handler failed on ${topic}`, { error: message });
  }
}