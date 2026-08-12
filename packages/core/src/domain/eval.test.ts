import { describe, expect, it } from 'vitest';
import { judgeResponse, regressionGate, weightedScore } from './eval';
import type { AiGateway } from '../ai/gateway';

const rubric = [
  { criterion: 'Correctness', weight: 0.6, description: 'Answer is factually correct' },
  { criterion: 'Usefulness', weight: 0.4, description: 'Answer directly helps the user' },
];

describe('judgeResponse', () => {
  it('parses judge output with a fake gateway', async () => {
    const gateway: AiGateway = {
      async generateStructured<T>(): Promise<T> {
        return { score: 0.85, notes: 'Good coverage' } as unknown as T;
      },
      async chatText() {
        return '';
      },
    };
    const result = await judgeResponse(gateway, {
      rubric,
      userInput: 'What is 2+2?',
      agentOutput: '4',
    });
    expect(result.score).toBeCloseTo(0.85);
    expect(result.notes).toBe('Good coverage');
  });
});

describe('weightedScore', () => {
  it('clamps scores to [0,1]', () => {
    expect(weightedScore(rubric, { score: 1.2, notes: '' })).toBe(1);
    expect(weightedScore(rubric, { score: -0.1, notes: '' })).toBe(0);
    expect(weightedScore(rubric, { score: 0.5, notes: '' })).toBe(0.5);
  });
});

describe('regressionGate', () => {
  const base = { currentPassRate: 1, proposedPassRate: 1 };

  it('accepts improvements', () => {
    const d = regressionGate({ currentAvgScore: 0.7, proposedAvgScore: 0.8, ...base });
    expect(d.pass).toBe(true);
  });

  it('accepts equal scores', () => {
    const d = regressionGate({ currentAvgScore: 0.7, proposedAvgScore: 0.7, ...base });
    expect(d.pass).toBe(true);
  });

  it('rejects small regressions beyond tolerance', () => {
    const d = regressionGate({ currentAvgScore: 0.8, proposedAvgScore: 0.7, ...base });
    expect(d.pass).toBe(false);
  });

  it('accepts regressions within tolerance', () => {
    const d = regressionGate({ currentAvgScore: 0.8, proposedAvgScore: 0.77, ...base });
    expect(d.pass).toBe(true);
  });

  it('rejects scores below the minimum even when equal', () => {
    const d = regressionGate({ currentAvgScore: 0.5, proposedAvgScore: 0.5, ...base, minScore: 0.6 });
    expect(d.pass).toBe(false);
  });
});
