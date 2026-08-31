import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Coordinator, createCoordinator } from './coordinator';
import type { OllamaRouter } from '../adapters/ollama-router';
import { SharedMemory } from './memory';

function createMockRouter(): OllamaRouter {
  return {
    route: vi.fn().mockReturnValue({ model: 'test', temperature: 0.1, topP: 0.9, maxTokens: 1024, timeout: 30000 }),
    generate: vi.fn(),
    generateStream: vi.fn(),
    health: vi.fn(),
    hasModel: vi.fn(),
  } as unknown as OllamaRouter;
}

describe('Coordinator', () => {
  let router: OllamaRouter;
  let coordinator: Coordinator;
  let memory: SharedMemory;

  beforeEach(() => {
    router = createMockRouter();
    memory = new SharedMemory();
    coordinator = new Coordinator(router, { autoCommit: false, dryRun: true }, memory);
  });

  it('starts in idle state', () => {
    expect(coordinator.getStatus()).toBe('idle');
  });

  it('records plan in memory', async () => {
    // Mock planner response
    vi.mocked(router.generate)
      .mockResolvedValueOnce({
        text: JSON.stringify({
          taskId: 'task-1',
          steps: [{ id: 'step-1', description: 'Create file', files: ['test.ts'], type: 'create' }],
          rationale: 'Test plan',
          estimatedMinutes: 10,
        }),
        model: 'phi3',
        durationMs: 1000,
      })
      // Mock coder response
      .mockResolvedValueOnce({
        text: '// FILE: test.ts\n// CONTENT:\nexport const x = 1;',
        model: 'deepseek-coder',
        durationMs: 2000,
      })
      // Mock verifier validation
      .mockResolvedValueOnce({
        text: JSON.stringify({ valid: true, issues: [] }),
        model: 'codellama',
        durationMs: 500,
      })
      // Mock test generation
      .mockResolvedValueOnce({
        text: '// FILE: test.test.ts\n// TEST_COUNT: 1\ndescribe("test", () => {});',
        model: 'codellama',
        durationMs: 800,
      })
      // Mock final validation
      .mockResolvedValueOnce({
        text: JSON.stringify({ valid: true, issues: [] }),
        model: 'codellama',
        durationMs: 300,
      });

    const result = await coordinator.run('Create a test file');

    expect(result.success).toBe(true);
    expect(result.plan.steps.length).toBeGreaterThan(0);

    // Check memory has plan
    const plans = memory.query({ type: 'plan' });
    expect(plans.length).toBeGreaterThan(0);
  });

  it('reports failure when planning fails', async () => {
    vi.mocked(router.generate).mockResolvedValueOnce({
      text: 'Not valid JSON',
      model: 'phi3',
      durationMs: 500,
    });

    const result = await coordinator.run('Invalid task');
    expect(result.success).toBe(false);
    expect(result.stepResults).toHaveLength(0);
  });

  it('tracks model usage', async () => {
    vi.mocked(router.generate)
      .mockResolvedValueOnce({
        text: JSON.stringify({
          taskId: 't1',
          steps: [],
          rationale: '',
          estimatedMinutes: 5,
        }),
        model: 'phi3',
        durationMs: 1000,
      });

    const result = await coordinator.run('Simple task');
    expect(result.modelUsage.length).toBeGreaterThan(0);
    expect(result.modelUsage[0].model).toBe('phi3');
  });

  it('respects maxRetries', async () => {
    const shortRetryCoordinator = new Coordinator(
      router,
      { autoCommit: false, dryRun: true, maxRetries: 2 },
      memory,
    );

    // Plan succeeds
    vi.mocked(router.generate)
      .mockResolvedValueOnce({
        text: JSON.stringify({
          taskId: 't1',
          steps: [{ id: 's1', description: 'step', files: ['f.ts'], type: 'create' }],
          rationale: '',
          estimatedMinutes: 5,
        }),
        model: 'phi3',
        durationMs: 500,
      })
      // Coder fails validation every time
      .mockResolvedValue({
        text: 'bad code',
        model: 'deepseek-coder',
        durationMs: 500,
      })
      .mockResolvedValue({
        text: JSON.stringify({ valid: false, issues: ['error'] }),
        model: 'codellama',
        durationMs: 300,
      });

    const result = await shortRetryCoordinator.run('Failing task');
    const failedSteps = result.stepResults.filter((r) => !r.success);
    expect(failedSteps.length).toBeGreaterThan(0);
    expect(failedSteps[0].attempts).toBeLessThanOrEqual(2);
  });

  it('status changes during execution', async () => {
    const statuses: string[] = [];
    coordinator.onStatus((s) => statuses.push(s));

    vi.mocked(router.generate)
      .mockResolvedValueOnce({
        text: JSON.stringify({
          taskId: 't1',
          steps: [],
          rationale: '',
          estimatedMinutes: 1,
        }),
        model: 'phi3',
        durationMs: 100,
      });

    await coordinator.run('Quick task');

    expect(statuses).toContain('planning');
    expect(statuses).toContain('implementing');
    expect(statuses).toContain('completed');
  });

  it('getMemory returns memory instance', () => {
    expect(coordinator.getMemory()).toBe(memory);
  });
});

describe('createCoordinator', () => {
  it('returns a Coordinator instance', () => {
    const router = createMockRouter();
    const coord = createCoordinator(router);
    expect(coord).toBeInstanceOf(Coordinator);
  });
});
