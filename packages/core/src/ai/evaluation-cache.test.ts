import { describe, expect, it } from 'vitest';
import { EvaluationCache, evaluationCacheKey } from './evaluation-cache';

describe('evaluation cache', () => {
  const input = {
    agentVersionId: 'v1',
    model: 'model',
    systemPrompt: 'system',
    guardrails: ['be precise'],
    rubric: [{ criterion: 'correctness', weight: 1 }],
    input: 'hello',
  };

  it('creates deterministic keys independent of object key order', () => {
    expect(evaluationCacheKey(input)).toBe(evaluationCacheKey({ ...input, rubric: [{ weight: 1, criterion: 'correctness' }] }));
    expect(evaluationCacheKey(input)).not.toBe(evaluationCacheKey({ ...input, input: 'different' }));
  });

  it('expires entries according to the freshness policy', () => {
    const cache = new EvaluationCache(10);
    cache.set('k', { actualOutput: 'out', score: 1, notes: 'ok', verdict: 'PASS' }, 100);
    expect(cache.get('k', 109)?.verdict).toBe('PASS');
    expect(cache.get('k', 111)).toBeNull();
  });
});

