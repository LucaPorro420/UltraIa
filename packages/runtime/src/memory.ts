import { createHash, randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MemoryEntry, MemoryReport, MemoryType } from './types';
import type { UltraEventBus } from './event-bus';
import type { UltraLogger } from './logger';

export interface MemoryPersistence {
  save(entries: MemoryEntry[]): Promise<void>;
  load(): Promise<MemoryEntry[]>;
}

/** JSON-file persistence under .ultraia/memory/entries.json. */
export class JsonFileMemoryPersistence implements MemoryPersistence {
  constructor(private readonly file: string) {}

  async save(entries: MemoryEntry[]): Promise<void> {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(entries, null, 2), 'utf8');
  }

  async load(): Promise<MemoryEntry[]> {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      return JSON.parse(raw) as MemoryEntry[];
    } catch {
      return [];
    }
  }
}

export interface MemoryStoreInput {
  type: MemoryType;
  source: string;
  content: string;
  importance?: number;
  confidence?: number;
  projectId?: string;
  moduleId?: string;
}

export interface MemoryManagerOptions {
  /** Minimum importance to persist a memo (lower ones are transient). Default 0.3. */
  persistThreshold?: number;
  /** Max entries kept. Default 2000. */
  maxEntries?: number;
  /** Recency half-life in ms. Default 7 days. */
  halfLifeMs?: number;
  persistence?: MemoryPersistence;
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function newId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Structured runtime memory. Stores meaningful facts only (importance-gated,
 * content-deduplicated) and never dumps everything into any request — retrieval
 * is scored and capped. A MemoryReport aggregates a session/task at close time.
 */
export class MemoryManager {
  private entries = new Map<string, MemoryEntry>();
  private readonly persistThreshold: number;
  private readonly maxEntries: number;
  private readonly halfLifeMs: number;
  private readonly persistence?: MemoryPersistence;
  private dirty = false;

  constructor(
    private readonly events?: UltraEventBus,
    private readonly logger?: UltraLogger,
    options: MemoryManagerOptions = {},
  ) {
    this.persistThreshold = options.persistThreshold ?? 0.3;
    this.maxEntries = options.maxEntries ?? 2000;
    this.halfLifeMs = options.halfLifeMs ?? 7 * 24 * 60 * 60 * 1000;
    this.persistence = options.persistence;
  }

  async init(): Promise<void> {
    if (!this.persistence) return;
    const loaded = await this.persistence.load();
    for (const entry of loaded) this.entries.set(entry.id, entry);
  }

  store(input: MemoryStoreInput): MemoryEntry {
    const now = new Date().toISOString();
    const importance = Math.min(1, Math.max(0, input.importance ?? 0.5));
    const confidence = Math.min(1, Math.max(0, input.confidence ?? 0.7));
    const hash = hashContent(input.content);
    const existing = [...this.entries.values()].find((e) => e.hash === hash);
    if (existing) {
      existing.updatedAt = now;
      existing.importance = Math.max(existing.importance, importance);
      existing.confidence = Math.max(existing.confidence, confidence);
      this.dirty = true;
      return existing;
    }
    const entry: MemoryEntry = {
      id: newId(),
      type: input.type,
      source: input.source,
      content: input.content,
      importance,
      confidence,
      createdAt: now,
      updatedAt: now,
      projectId: input.projectId,
      moduleId: input.moduleId,
      hash,
    };
    this.entries.set(entry.id, entry);
    this.dirty = true;
    this.evictIfNeeded();
    this.events?.emit('memory.updated', { id: entry.id, type: entry.type, importance: entry.importance });
    this.logger?.debug('MEMORY', `stored ${entry.type}`, { importance: entry.importance });
    return entry;
  }

  get(id: string): MemoryEntry | undefined {
    return this.entries.get(id);
  }

  list(): MemoryEntry[] {
    return [...this.entries.values()];
  }

  count(): number {
    return this.entries.size;
  }

  remove(id: string): boolean {
    const ok = this.entries.delete(id);
    if (ok) this.dirty = true;
    return ok;
  }

  clear(): void {
    this.entries.clear();
    this.dirty = true;
  }

  /** Retrieval scoring: keyword match + importance + recency decay. */
  score(entry: MemoryEntry, query?: string): number {
    let score = entry.importance;
    const ageMs = Date.now() - new Date(entry.updatedAt).getTime();
    score *= Math.pow(0.5, ageMs / this.halfLifeMs);
    if (query) {
      const q = query.toLowerCase();
      const haystack = `${entry.content} ${entry.source} ${entry.type}`.toLowerCase();
      const matches = q.split(/\s+/).filter((token) => haystack.includes(token)).length;
      if (matches > 0) score += 0.25 * matches;
    }
    return score;
  }

  search(opts: { query?: string; types?: MemoryType[]; importanceMin?: number; limit?: number } = {}): MemoryEntry[] {
    const limit = opts.limit ?? 20;
    let out = this.list();
    if (opts.types) out = out.filter((e) => opts.types!.includes(e.type));
    if (opts.importanceMin !== undefined) out = out.filter((e) => e.importance >= opts.importanceMin!);
    return out
      .map((e) => ({ e, s: this.score(e, opts.query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.e);
  }

  /** Aggregated report for a session/project close. */
  generateReport(opts: { projectId?: string; includeLowImportance?: boolean } = {}): MemoryReport {
    const min = opts.includeLowImportance ? 0 : this.persistThreshold;
    const entries = this.list().filter(
      (e) => e.importance >= min && (opts.projectId === undefined || e.projectId === opts.projectId),
    );
    const sections: MemoryReport['sections'] = {};
    for (const entry of entries) {
      (sections[entry.type] ??= []).push(entry.content);
    }
    const learnings = sections['LEARNING'] ?? [];
    const recommendations = learnings.slice(0, 5);
    return {
      projectId: opts.projectId,
      createdAt: new Date().toISOString(),
      sections,
      recommendations,
      entryCount: entries.length,
    };
  }

  async persist(): Promise<void> {
    if (!this.persistence || !this.dirty) return;
    const persistent = this.list().filter((e) => e.importance >= this.persistThreshold);
    await this.persistence.save(persistent);
    this.dirty = false;
  }

  /** Sync convenience for callers that are not async-aware. */
  persistSync(): void {
    void this.persist();
  }

  private evictIfNeeded(): void {
    if (this.entries.size <= this.maxEntries) return;
    const ranked = this.list()
      .map((e) => ({ e, s: this.score(e) }))
      .sort((a, b) => a.s - b.s);
    const overflow = this.entries.size - this.maxEntries;
    for (let i = 0; i < overflow && i < ranked.length; i++) {
      this.entries.delete(ranked[i].e.id);
    }
    this.logger?.warn('MEMORY', `evicted ${overflow} low-score memories`);
  }
}