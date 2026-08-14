import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SKILL_ORDER, runSkill } from './skills';

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
}));

vi.mock('ai', () => ({
  generateText: mocks.generateText,
}));

vi.mock('../ai/llm', () => ({
  resolveModel: vi.fn(() => ({ mock: true })),
}));

beforeEach(() => {
  mocks.generateText.mockReset();
  mocks.generateText.mockResolvedValue({ text: 'artifact output' });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('runSkill', () => {
  it('runs each pipeline skill in order with its own system prompt', async () => {
    for (const kind of SKILL_ORDER) {
      await runSkill(kind, { task: 'build a landing page' });
    }
    expect(mocks.generateText).toHaveBeenCalledTimes(SKILL_ORDER.length);
    const systems = mocks.generateText.mock.calls.map((c) => c[0].system);
    expect(systems[0]).toMatch(/Planning skill/);
    expect(systems[1]).toMatch(/Build skill/);
    expect(systems[2]).toMatch(/Test\/QA skill/);
    expect(systems[3]).toMatch(/Review skill/);
    expect(systems[4]).toMatch(/Ship\/Release skill/);
    expect(systems[5]).toMatch(/Simplify\/Refactor skill/);
  });

  it('passes the task and optional context into the prompt', async () => {
    await runSkill('build', { task: 'create a chat widget', context: 'stack: next.js' });
    const { prompt } = mocks.generateText.mock.calls[0][0];
    expect(prompt).toContain('Task:');
    expect(prompt).toContain('create a chat widget');
    expect(prompt).toContain('stack: next.js');
    expect(prompt).toContain('Produce the build artifact now.');
  });

  it('omits the context block when none is provided', async () => {
    await runSkill('review', { task: 'audit the api' });
    const { prompt } = mocks.generateText.mock.calls[0][0];
    expect(prompt).not.toContain('Context:');
    expect(prompt).toContain('audit the api');
  });

  it('returns the generated artifact text', async () => {
    const out = await runSkill('plan', { task: 'x' });
    expect(out).toBe('artifact output');
  });

  it('rejects invalid skill kinds', async () => {
    await expect(runSkill('plan', { task: '  ' })).rejects.toThrow();
  });
});
