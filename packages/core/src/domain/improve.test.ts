import { describe, expect, it } from 'vitest';
import { proposeImprovement } from './improve';
import type { AiGateway } from '../ai/gateway';

const fakeGateway: AiGateway = {
  async generateStructured<T>(): Promise<T> {
    return {
      suggestedSystemPrompt: 'You are a concise assistant that always verifies numbers before answering.',
      changeSummary: 'Added a verification step after two BAD feedback reports about wrong calculations.',
    } as unknown as T;
  },
  async chatText() {
    return '';
  },
};

describe('proposeImprovement', () => {
  const base = {
    taskDescription: 'Help with math homework',
    currentSystemPrompt: 'You are a math helper.',
    rubric: ['Correctness'],
    guardrails: ['No cheating on exams'],
  };

  it('requires signals before proposing', async () => {
    await expect(proposeImprovement(fakeGateway, { ...base, signals: { critiques: [], failedCases: [] } })).rejects.toThrow(
      'No improvement signals',
    );
  });

  it('proposes an improvement from critiques', async () => {
    const proposal = await proposeImprovement(fakeGateway, {
      ...base,
      signals: { critiques: ['Gave wrong answer for 2+2'], failedCases: [] },
    });
    expect(proposal.suggestedSystemPrompt.length).toBeGreaterThan(10);
    expect(proposal.changeSummary).toContain('verification');
  });

  it('proposes from failed eval cases', async () => {
    const proposal = await proposeImprovement(fakeGateway, {
      ...base,
      signals: {
        critiques: [],
        failedCases: [{ input: '2+2', output: '5', notes: 'Incorrect math' }],
      },
    });
    expect(proposal.changeSummary.length).toBeGreaterThan(5);
  });
});
