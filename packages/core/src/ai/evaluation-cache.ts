import { createHash } from 'node:crypto';

export interface EvaluationCacheInput {
  agentVersionId: string;
  model: string;
  systemPrompt: string;
  guardrails: string[];
  rubric: unknown;
  input: string;
  evaluatorMode?: string;
}

export interface CachedEvaluation {
  actualOutput: string;
  score: number;
  notes: string;
  verdict: string;
  createdAt: number;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function evaluationCacheKey(input: EvaluationCacheInput): string {
  return createHash('sha256').update(stable(input), 'utf8').digest('hex');
}

export class EvaluationCache {
  private readonly entries = new Map<string, CachedEvaluation>();

  constructor(private readonly ttlMs = 24 * 60 * 60 * 1000) {}

  get(key: string, now = Date.now()): CachedEvaluation | null {
    const value = this.entries.get(key);
    if (!value || now - value.createdAt > this.ttlMs) {
      if (value) this.entries.delete(key);
      return null;
    }
    return { ...value };
  }

  set(key: string, value: Omit<CachedEvaluation, 'createdAt'>, now = Date.now()): void {
    this.entries.set(key, { ...value, createdAt: now });
  }

  clear(): void {
    this.entries.clear();
  }
}

export const evaluationCache = new EvaluationCache();

