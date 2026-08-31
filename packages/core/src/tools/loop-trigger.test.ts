/**
 * Tests for loop-trigger.ts — domain pure, no real execution.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateTriggerInput,
  selectMode,
  executeTrigger,
  type TriggerInput,
  type TriggerResult,
} from './loop-trigger';

/* ------------------------------------------------------------------ */
/* validateTriggerInput                                                */
/* ------------------------------------------------------------------ */

describe('validateTriggerInput', () => {
  it('accepts minimal valid input', () => {
    const input = validateTriggerInput({
      task: 'Add a dark mode toggle to settings',
      userId: 'user-1',
    });
    expect(input.task).toBe('Add a dark mode toggle to settings');
    expect(input.mode).toBe('auto');
    expect(input.userId).toBe('user-1');
  });

  it('accepts explicit mode', () => {
    const input = validateTriggerInput({
      task: 'Implement the login page',
      mode: 'p-p',
      userId: 'u2',
    });
    expect(input.mode).toBe('p-p');
  });

  it('accepts agentId for goal mode', () => {
    const input = validateTriggerInput({
      task: 'Write a blog post about AI',
      mode: 'goal',
      agentId: 'bp-guionista',
      userId: 'u3',
    });
    expect(input.agentId).toBe('bp-guionista');
  });

  it('throws on empty task', () => {
    expect(() =>
      validateTriggerInput({ task: '', userId: 'u1' }),
    ).toThrow();
  });

  it('throws on task too short (< 10 chars)', () => {
    expect(() =>
      validateTriggerInput({ task: 'short', userId: 'u1' }),
    ).toThrow();
  });

  it('throws on missing userId', () => {
    expect(() =>
      validateTriggerInput({ task: 'This is a valid task description' }),
    ).toThrow();
  });

  it('throws on invalid mode', () => {
    expect(() =>
      validateTriggerInput({
        task: 'Valid task description',
        mode: 'invalid',
        userId: 'u1',
      }),
    ).toThrow();
  });

  it('trims whitespace from task', () => {
    const input = validateTriggerInput({
      task: '  Add dark mode  ',
      userId: 'u1',
    });
    expect(input.task).toBe('Add dark mode');
  });
});

/* ------------------------------------------------------------------ */
/* selectMode                                                          */
/* ------------------------------------------------------------------ */

describe('selectMode', () => {
  it('returns p-p for dev keywords', () => {
    expect(selectMode('Fix the login bug in auth.ts')).toBe('p-p');
    expect(selectMode('Add a new component for settings')).toBe('p-p');
    expect(selectMode('Refactor the database queries')).toBe('p-p');
    expect(selectMode('Implement the dashboard page')).toBe('p-p');
  });

  it('returns goal for content keywords', () => {
    expect(selectMode('Write a blog post about machine learning')).toBe('goal');
    expect(selectMode('Research the latest AI trends')).toBe('goal');
    expect(selectMode('Summarize the meeting notes for the team')).toBe('goal');
    expect(selectMode('Write an article about web development')).toBe('goal');
  });

  it('defaults to p-p for ambiguous tasks', () => {
    expect(selectMode('Make it better')).toBe('p-p');
    expect(selectMode('Improve performance')).toBe('p-p');
  });
});

/* ------------------------------------------------------------------ */
/* executeTrigger                                                      */
/* ------------------------------------------------------------------ */

describe('executeTrigger', () => {
  const mockPivCycle = vi.fn().mockResolvedValue({
    status: 'completed' as const,
    output: 'Plan written, 3 files changed',
    filesChanged: ['src/app.ts', 'src/auth.ts', 'tests/auth.test.ts'],
  });

  const mockGoalCycle = vi.fn().mockResolvedValue({
    status: 'completed' as const,
    output: 'Blog post created successfully',
  });

  const baseInput: TriggerInput = {
    task: 'Add dark mode toggle to settings page',
    mode: 'auto',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes dev task to PIVR pipeline', async () => {
    const result = await executeTrigger(baseInput, {
      runPivCycle: mockPivCycle,
      runGoalCycle: mockGoalCycle,
    });

    expect(mockPivCycle).toHaveBeenCalledOnce();
    expect(mockGoalCycle).not.toHaveBeenCalled();
    expect(result.status).toBe('completed');
    expect(result.pipeline).toBe('piv');
    expect(result.taskId).toMatch(/^trigger-/);
    expect(result.filesChanged).toEqual([
      'src/app.ts',
      'src/auth.ts',
      'tests/auth.test.ts',
    ]);
  });

  it('routes content task to goal pipeline', async () => {
    const input: TriggerInput = {
      task: 'Write a blog post about AI trends',
      mode: 'auto',
      userId: 'user-1',
    };

    const result = await executeTrigger(input, {
      runPivCycle: mockPivCycle,
      runGoalCycle: mockGoalCycle,
    });

    expect(mockGoalCycle).toHaveBeenCalledOnce();
    expect(mockPivCycle).not.toHaveBeenCalled();
    expect(result.pipeline).toBe('goal');
  });

  it('respects explicit p-p mode', async () => {
    const input: TriggerInput = {
      task: 'Write a blog post about AI',
      mode: 'p-p',
      userId: 'user-1',
    };

    const result = await executeTrigger(input, {
      runPivCycle: mockPivCycle,
      runGoalCycle: mockGoalCycle,
    });

    expect(mockPivCycle).toHaveBeenCalledWith('Write a blog post about AI', { mode: 'p-p' });
    expect(mockGoalCycle).not.toHaveBeenCalled();
  });

  it('respects explicit goal mode', async () => {
    const input: TriggerInput = {
      task: 'Fix the login bug',
      mode: 'goal',
      agentId: 'bp-guionista',
      userId: 'user-1',
    };

    const result = await executeTrigger(input, {
      runPivCycle: mockPivCycle,
      runGoalCycle: mockGoalCycle,
    });

    expect(mockGoalCycle).toHaveBeenCalledWith('Fix the login bug', 'bp-guionista');
    expect(mockPivCycle).not.toHaveBeenCalled();
  });

  it('handles PIVR pipeline error', async () => {
    const failingPiv = vi.fn().mockResolvedValue({
      status: 'error' as const,
      output: '',
      error: 'loop_piv.py exited with code 1',
    });

    const result = await executeTrigger(baseInput, {
      runPivCycle: failingPiv,
      runGoalCycle: mockGoalCycle,
    });

    expect(result.status).toBe('error');
    expect(result.error).toBe('loop_piv.py exited with code 1');
  });

  it('handles goal pipeline error', async () => {
    const failingGoal = vi.fn().mockResolvedValue({
      status: 'error' as const,
      output: '',
      error: 'Agent not found',
    });

    const input: TriggerInput = {
      task: 'Write a blog post about AI',
      mode: 'auto',
      userId: 'user-1',
    };

    const result = await executeTrigger(input, {
      runPivCycle: mockPivCycle,
      runGoalCycle: failingGoal,
    });

    expect(result.status).toBe('error');
    expect(result.error).toBe('Agent not found');
  });

  it('generates unique taskIds', async () => {
    const r1 = await executeTrigger(baseInput, {
      runPivCycle: mockPivCycle,
      runGoalCycle: mockGoalCycle,
    });
    const r2 = await executeTrigger(baseInput, {
      runPivCycle: mockPivCycle,
      runGoalCycle: mockGoalCycle,
    });

    expect(r1.taskId).not.toBe(r2.taskId);
  });

  it('includes summary in result', async () => {
    const result = await executeTrigger(baseInput, {
      runPivCycle: mockPivCycle,
      runGoalCycle: mockGoalCycle,
    });

    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(0);
  });
});
