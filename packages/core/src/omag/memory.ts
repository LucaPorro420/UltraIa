import type { Entity, MediaField } from './mediafield';

export interface ErrorRecord {
  errorType: string;
  scene?: string;
  cause: string;
  solution: string;
}

export class WorkingMemory {
  private current: MediaField | null = null;

  set(field: MediaField): void {
    this.current = structuredClone(field);
  }

  get(): MediaField | null {
    return this.current ? structuredClone(this.current) : null;
  }

  clear(): void {
    this.current = null;
  }
}

export class CharacterMemory {
  private snapshots = new Map<string, Record<string, unknown>>();

  remember(entity: Entity): void {
    this.snapshots.set(entity.id, {
      identity: entity.identity,
      appearance: entity.appearance,
      personality: entity.personality,
      voice: entity.voice,
      state: entity.state,
    });
  }

  recall(id: string): Record<string, unknown> | undefined {
    return this.snapshots.get(id);
  }

  ids(): string[] {
    return [...this.snapshots.keys()];
  }
}

export class SceneMemory {
  private scenes: Array<{ id: string; summary: string; time: number }> = [];

  push(sceneId: string, summary: string, time: number): void {
    this.scenes.push({ id: sceneId, summary, time });
  }

  list(): Array<{ id: string; summary: string; time: number }> {
    return [...this.scenes];
  }
}

export class StyleMemory {
  private style: Record<string, unknown> = {};

  merge(patch: Record<string, unknown>): void {
    this.style = { ...this.style, ...patch };
  }

  get(): Record<string, unknown> {
    return { ...this.style };
  }
}

export class ErrorMemory {
  private records: ErrorRecord[] = [];

  record(error: ErrorRecord): void {
    this.records.push(error);
  }

  all(): ErrorRecord[] {
    return [...this.records];
  }

  patterns(): Array<{ errorType: string; count: number; solutions: string[] }> {
    const byType = new Map<string, { count: number; solutions: Set<string> }>();
    for (const r of this.records) {
      const entry = byType.get(r.errorType) ?? { count: 0, solutions: new Set<string>() };
      entry.count += 1;
      entry.solutions.add(r.solution);
      byType.set(r.errorType, entry);
    }
    return [...byType.entries()].map(([errorType, v]) => ({ errorType, count: v.count, solutions: [...v.solutions] }));
  }
}