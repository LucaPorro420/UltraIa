import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlannerOrchestrator, CoderOrchestrator, VerifierOrchestrator, createPlanner, createCoder, createVerifier } from './specialized';
import type { OllamaRouter } from '../adapters/ollama-router';
import type { Task, PlanStep } from './specialized';

function createMockRouter(): OllamaRouter {
  return {
    route: vi.fn().mockReturnValue({ model: 'test', temperature: 0.1, topP: 0.9, maxTokens: 1024, timeout: 30000 }),
    generate: vi.fn(),
    generateStream: vi.fn(),
    health: vi.fn(),
    hasModel: vi.fn(),
  } as unknown as OllamaRouter;
}

describe('PlannerOrchestrator', () => {
  let router: OllamaRouter;
  let planner: PlannerOrchestrator;

  beforeEach(() => {
    router = createMockRouter();
    planner = new PlannerOrchestrator(router);
  });

  it('generates a valid plan from JSON response', async () => {
    vi.mocked(router.generate).mockResolvedValueOnce({
      text: JSON.stringify({
        taskId: 'task-1',
        steps: [
          { id: 'step-1', description: 'Create schema', files: ['schema.ts'], type: 'create' },
          { id: 'step-2', description: 'Implement logic', files: ['logic.ts'], type: 'create' },
        ],
        rationale: 'Schema first, then implementation',
        estimatedMinutes: 20,
      }),
      model: 'phi3',
      durationMs: 1000,
    });

    const task: Task = { id: 'task-1', description: 'Create a validation tool' };
    const result = await planner.plan(task);

    expect(result.success).toBe(true);
    expect(result.data?.steps).toHaveLength(2);
    expect(result.data?.steps[0].files).toEqual(['schema.ts']);
  });

  it('handles plan wrapped in markdown code block', async () => {
    vi.mocked(router.generate).mockResolvedValueOnce({
      text: '```json\n{"taskId":"t1","steps":[],"rationale":"test","estimatedMinutes":10}\n```',
      model: 'phi3',
      durationMs: 500,
    });

    const result = await planner.plan({ id: 't1', description: 'test' });
    expect(result.success).toBe(true);
  });

  it('fails on invalid JSON', async () => {
    vi.mocked(router.generate).mockResolvedValueOnce({
      text: 'This is not JSON at all',
      model: 'phi3',
      durationMs: 500,
    });

    const result = await planner.plan({ id: 't1', description: 'test' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to parse plan');
  });

  it('builds prompt with context and constraints', async () => {
    vi.mocked(router.generate).mockResolvedValueOnce({
      text: '{"taskId":"t1","steps":[],"rationale":"","estimatedMinutes":5}',
      model: 'phi3',
      durationMs: 500,
    });

    await planner.plan({
      id: 't1',
      description: 'test task',
      context: 'Additional context',
      files: ['file1.ts'],
      constraints: ['Must use Zod'],
    });

    const prompt = vi.mocked(router.generate).mock.calls[0][0] as string;
    expect(prompt).toContain('Additional context');
    expect(prompt).toContain('file1.ts');
    expect(prompt).toContain('Must use Zod');
  });
});

describe('CoderOrchestrator', () => {
  let router: OllamaRouter;
  let coder: CoderOrchestrator;

  beforeEach(() => {
    router = createMockRouter();
    coder = new CoderOrchestrator(router);
  });

  it('implements code from structured response', async () => {
    vi.mocked(router.generate).mockResolvedValueOnce({
      text: `// FILE: src/validator.ts
// CONTENT:
export function validateEmail(email: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}`,
      model: 'deepseek-coder',
      durationMs: 2000,
    });

    const step: PlanStep = {
      id: 'step-1',
      description: 'Create email validator',
      files: ['src/validator.ts'],
      type: 'create',
    };

    const result = await coder.implement(step);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].filePath).toBe('src/validator.ts');
    expect(result.data?.[0].content).toContain('validateEmail');
  });

  it('handles unstructured response by using first file', async () => {
    vi.mocked(router.generate).mockResolvedValueOnce({
      text: 'export function foo() { return 42; }',
      model: 'deepseek-coder',
      durationMs: 1000,
    });

    const step: PlanStep = {
      id: 'step-1',
      description: 'Create foo',
      files: ['src/foo.ts'],
      type: 'create',
    };

    const result = await coder.implement(step);
    expect(result.success).toBe(true);
    expect(result.data?.[0].filePath).toBe('src/foo.ts');
  });

  it('includes existing code in context', async () => {
    vi.mocked(router.generate).mockResolvedValueOnce({
      text: '{"filePath":"test.ts","content":"code"}',
      model: 'deepseek-coder',
      durationMs: 1000,
    });

    const step: PlanStep = {
      id: 'step-1',
      description: 'Modify existing',
      files: ['test.ts'],
      type: 'modify',
    };

    await coder.implement(step, { existingCode: 'existing code here' });

    const prompt = vi.mocked(router.generate).mock.calls[0][0] as string;
    expect(prompt).toContain('existing code here');
  });
});

describe('VerifierOrchestrator', () => {
  let router: OllamaRouter;
  let verifier: VerifierOrchestrator;

  beforeEach(() => {
    router = createMockRouter();
    verifier = new VerifierOrchestrator(router);
  });

  it('generates tests from code', async () => {
    vi.mocked(router.generate).mockResolvedValueOnce({
      text: `// FILE: src/validator.test.ts
// TEST_COUNT: 2
import { describe, it, expect } from 'vitest';
import { validateEmail } from './validator';

describe('validateEmail', () => {
  it('valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });
  it('invalid email', () => {
    expect(validateEmail('invalid')).toBe(false);
  });
});`,
      model: 'codellama',
      durationMs: 1500,
    });

    const codeResults = [
      { filePath: 'src/validator.ts', content: 'export function validateEmail...', action: 'create' as const, description: 'test' },
    ];

    const result = await verifier.generateTests(codeResults);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].testCount).toBe(2);
  });

  it('validates code against requirements', async () => {
    vi.mocked(router.generate).mockResolvedValueOnce({
      text: JSON.stringify({ valid: true, issues: [] }),
      model: 'codellama',
      durationMs: 800,
    });

    const result = await verifier.validate('code here', 'requirements here');
    expect(result.success).toBe(true);
    expect(result.data?.valid).toBe(true);
  });

  it('detects validation issues', async () => {
    vi.mocked(router.generate).mockResolvedValueOnce({
      text: JSON.stringify({ valid: false, issues: ['Missing error handling', 'No types'] }),
      model: 'codellama',
      durationMs: 800,
    });

    const result = await verifier.validate('bad code', 'good requirements');
    expect(result.success).toBe(true);
    expect(result.data?.valid).toBe(false);
    expect(result.data?.issues).toHaveLength(2);
  });
});

describe('Factory functions', () => {
  it('createPlanner returns PlannerOrchestrator', () => {
    const router = createMockRouter();
    expect(createPlanner(router)).toBeInstanceOf(PlannerOrchestrator);
  });

  it('createCoder returns CoderOrchestrator', () => {
    const router = createMockRouter();
    expect(createCoder(router)).toBeInstanceOf(CoderOrchestrator);
  });

  it('createVerifier returns VerifierOrchestrator', () => {
    const router = createMockRouter();
    expect(createVerifier(router)).toBeInstanceOf(VerifierOrchestrator);
  });
});
