import { describe, expect, it } from 'vitest';
import { deduplicateFeedback, normalizeFeedback } from './feedback';

describe('feedback learning signals', () => {
  it('keeps ambiguous feedback pending', () => {
    expect(normalizeFeedback({ rating: 'BAD', critique: 'wrong' }).status).toBe('PENDING');
  });

  it('normalizes and deduplicates equivalent critiques', () => {
    const result = deduplicateFeedback([
      { rating: 'BAD', critique: '  Answer   is wrong. ', source: 'a' },
      { rating: 'BAD', critique: 'answer is wrong.', source: 'b' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBe(2);
    expect(result[0].sources).toEqual(['a', 'b']);
    expect(result[0].status).toBe('APPROVED');
  });
});

