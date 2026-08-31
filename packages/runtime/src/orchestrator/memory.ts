/**
 * memory.ts — Shared memory system for autonomous orchestrators
 *
 * Stores plans, successes, failures, and lessons learned.
 * Enables learning from past executions to improve future ones.
 *
 * No external dependencies. Pure in-memory with optional file persistence.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type MemoryType = 'plan' | 'success' | 'failure' | 'lesson' | 'context';

export interface MemoryEntry {
  readonly id: string;
  readonly type: MemoryType;
  readonly topic: string;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
  readonly timestamp: number;
  readonly importance: number; // 0-1, higher = more important
}

export interface MemoryQuery {
  readonly topic?: string;
  readonly type?: MemoryType;
  readonly minImportance?: number;
  readonly limit?: number;
  readonly afterTimestamp?: number;
}

export interface MemoryStats {
  readonly total: number;
  readonly byType: Record<MemoryType, number>;
  readonly recentSuccess: number;
  readonly recentFailure: number;
  readonly successRate: number;
}

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

export const MemoryEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['plan', 'success', 'failure', 'lesson', 'context']),
  topic: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()),
  timestamp: z.number(),
  importance: z.number().min(0).max(1),
});

export const MemoryQuerySchema = z.object({
  topic: z.string().optional(),
  type: z.enum(['plan', 'success', 'failure', 'lesson', 'context']).optional(),
  minImportance: z.number().min(0).max(1).optional(),
  limit: z.number().positive().optional(),
  afterTimestamp: z.number().optional(),
});

/* ------------------------------------------------------------------ */
/* SharedMemory                                                        */
/* ------------------------------------------------------------------ */

export class SharedMemory {
  private entries: MemoryEntry[] = [];
  private nextId = 1;
  private readonly persistPath?: string;

  constructor(opts: { persistPath?: string } = {}) {
    this.persistPath = opts.persistPath;
    if (this.persistPath) {
      this.load();
    }
  }

  /**
   * Save a memory entry.
   */
  save(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): MemoryEntry {
    const fullEntry: MemoryEntry = {
      ...entry,
      id: `mem-${this.nextId++}`,
      timestamp: Date.now(),
    };

    this.entries.push(fullEntry);
    this.persist();
    return fullEntry;
  }

  /**
   * Query memory entries.
   */
  query(q: MemoryQuery = {}): MemoryEntry[] {
    let results = [...this.entries];

    if (q.topic) {
      const topicLower = q.topic.toLowerCase();
      results = results.filter((e) => e.topic.toLowerCase().includes(topicLower));
    }

    if (q.type) {
      results = results.filter((e) => e.type === q.type);
    }

    if (q.minImportance !== undefined) {
      results = results.filter((e) => e.importance >= q.minImportance!);
    }

    if (q.afterTimestamp !== undefined) {
      results = results.filter((e) => e.timestamp > q.afterTimestamp!);
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (q.limit !== undefined) {
      results = results.slice(0, q.limit);
    }

    return results;
  }

  /**
   * Get a specific entry by ID.
   */
  get(id: string): MemoryEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  /**
   * Delete a memory entry.
   */
  delete(id: string): boolean {
    const initialLength = this.entries.length;
    this.entries = this.entries.filter((e) => e.id !== id);
    const deleted = this.entries.length < initialLength;
    if (deleted) this.persist();
    return deleted;
  }

  /**
   * Get memory statistics.
   */
  stats(): MemoryStats {
    const byType: Record<MemoryType, number> = {
      plan: 0,
      success: 0,
      failure: 0,
      lesson: 0,
      context: 0,
    };

    for (const entry of this.entries) {
      byType[entry.type]++;
    }

    const recentWindow = 24 * 60 * 60 * 1000; // 24 hours
    const recentEntries = this.entries.filter(
      (e) => Date.now() - e.timestamp < recentWindow,
    );
    const recentSuccess = recentEntries.filter((e) => e.type === 'success').length;
    const recentFailure = recentEntries.filter((e) => e.type === 'failure').length;
    const totalRecent = recentSuccess + recentFailure;

    return {
      total: this.entries.length,
      byType,
      recentSuccess,
      recentFailure,
      successRate: totalRecent > 0 ? recentSuccess / totalRecent : 0,
    };
  }

  /**
   * Get lessons learned for a topic.
   */
  getLessons(topic: string): string[] {
    return this.query({ type: 'lesson', topic, limit: 10 }).map((e) => e.content);
  }

  /**
   * Get similar past plans for a topic.
   */
  getSimilarPlans(topic: string): MemoryEntry[] {
    return this.query({ type: 'plan', topic, limit: 5 });
  }

  /**
   * Record a success.
   */
  recordSuccess(topic: string, content: string, metadata: Record<string, unknown> = {}): MemoryEntry {
    return this.save({
      type: 'success',
      topic,
      content,
      metadata,
      importance: 0.7,
    });
  }

  /**
   * Record a failure.
   */
  recordFailure(topic: string, content: string, metadata: Record<string, unknown> = {}): MemoryEntry {
    return this.save({
      type: 'failure',
      topic,
      content,
      metadata,
      importance: 0.8, // Failures are important to remember
    });
  }

  /**
   * Record a lesson learned.
   */
  recordLesson(topic: string, content: string, metadata: Record<string, unknown> = {}): MemoryEntry {
    return this.save({
      type: 'lesson',
      topic,
      content,
      metadata,
      importance: 0.9, // Lessons are very important
    });
  }

  /**
   * Clear all memory.
   */
  clear(): void {
    this.entries = [];
    this.persist();
  }

  /**
   * Export all entries as JSON.
   */
  export(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Import entries from JSON.
   */
  import(json: string): number {
    try {
      const parsed = JSON.parse(json) as MemoryEntry[];
      let imported = 0;
      for (const entry of parsed) {
        if (MemoryEntrySchema.safeParse(entry).success) {
          this.entries.push(entry);
          imported++;
        }
      }
      this.persist();
      return imported;
    } catch {
      return 0;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Persistence                                                         */
  /* ------------------------------------------------------------------ */

  private persist(): void {
    if (!this.persistPath) return;

    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.persistPath, this.export(), 'utf-8');
    } catch {
      // Fail-soft: memory still works in-memory
    }
  }

  private load(): void {
    if (!this.persistPath) return;

    try {
      if (fs.existsSync(this.persistPath)) {
        const data = fs.readFileSync(this.persistPath, 'utf-8');
        this.import(data);
      }
    } catch {
      // Start with empty memory
    }
  }
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

let defaultMemory: SharedMemory | null = null;

export function getDefaultMemory(): SharedMemory {
  if (!defaultMemory) {
    defaultMemory = new SharedMemory();
  }
  return defaultMemory;
}

export function createSharedMemory(opts: { persistPath?: string } = {}): SharedMemory {
  return new SharedMemory(opts);
}
