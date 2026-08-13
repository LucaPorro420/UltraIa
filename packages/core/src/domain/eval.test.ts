import { describe, expect, it } from 'vitest';
import { guardrailsBlock } from '../ai/llm';
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

  it('computes the weight-weighted average from criterion scores', () => {
    const judgment = {
      score: 0.5,
      notes: '',
      criterionScores: [
        { criterion: 'Correctness', score: 1 },
        { criterion: 'Usefulness', score: 0 },
      ],
    };
    // (1*0.6 + 0*0.4) / (0.6 + 0.4) = 0.6
    expect(weightedScore(rubric, judgment)).toBeCloseTo(0.6);
  });

  it('falls back to the overall score when no criterion scores are provided', () => {
    expect(weightedScore(rubric, { score: 0.42, notes: '' })).toBeCloseTo(0.42);
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

  it('rejects pass-rate regressions beyond tolerance', () => {
    const d = regressionGate({
      currentAvgScore: 0.8,
      proposedAvgScore: 0.8,
      currentPassRate: 1,
      proposedPassRate: 0.8,
    });
    expect(d.pass).toBe(false);
  });

  it('accepts pass-rate drops within tolerance', () => {
    const d = regressionGate({
      currentAvgScore: 0.8,
      proposedAvgScore: 0.8,
      currentPassRate: 1,
      proposedPassRate: 0.97,
    });
    expect(d.pass).toBe(true);
  });
});

describe('guardrailsBlock', () => {
  it('returns empty string when there are no guardrails', () => {
    expect(guardrailsBlock([])).toBe('');
  });

  it('formats a numbered guardrails section', () => {
    expect(guardrailsBlock(['Be honest', 'Stay on topic'])).toBe(
      '\n\n## Guardrails\n1. Be honest\n2. Stay on topic',
    );
  });
});
