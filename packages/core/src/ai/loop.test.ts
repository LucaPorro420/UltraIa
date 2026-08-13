import { describe, expect, it } from 'vitest';
import { refineLoop } from './loop';

describe('refineLoop', () => {
  it('stops early when the judge accepts', async () => {
    const result = await refineLoop<string>({
      generate: async (attempt) => `v${attempt}`,
      judge: async (candidate) => ({ ok: candidate === 'v2', critique: candidate === 'v2' ? '' : 'not there yet' }),
      maxIters: 5,
    });
    expect(result.result).toBe('v2');
    expect(result.attempts).toBe(2);
    expect(result.converged).toBe(true);
    expect(result.history).toHaveLength(2);
  });

  it('returns the last candidate and reports non-convergence after maxIters', async () => {
    const result = await refineLoop<number>({
      generate: async (attempt) => attempt,
      judge: async () => ({ ok: false, critique: 'still wrong' }),
      maxIters: 3,
    });
    expect(result.result).toBe(3);
    expect(result.attempts).toBe(3);
    expect(result.converged).toBe(false);
    expect(result.history.every((h) => h.ok === false)).toBe(true);
  });

  it('feeds prior critique back into generation', async () => {
    const critiques: string[] = [];
    await refineLoop<string>({
      generate: async (_attempt, prior) => {
        critiques.push(prior);
        return 'done';
      },
      judge: async (_, attempt) => ({ ok: attempt === 2, critique: attempt === 2 ? '' : 'refine' }),
      maxIters: 3,
    });
    expect(critiques[0]).toBe('');
    expect(critiques[1]).toBe('refine');
  });
});
