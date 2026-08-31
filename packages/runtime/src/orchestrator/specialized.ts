/**
 * specialized.ts — Specialized orchestrators for autonomous local development
 *
 * Each orchestrator has a specific role and uses the optimal local model.
 * No API keys, no tokens, no cost.
 *
 * Roles:
 * - Planner: Analyzes tasks and generates step-by-step plans
 * - Coder: Implements code based on plans
 * - Verifier: Generates tests and validates implementations
 */

import { z } from 'zod';
import type { OllamaRouter, TaskType, GenerateResult } from '../adapters/ollama-router';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface Task {
  readonly id: string;
  readonly description: string;
  readonly context?: string;
  readonly files?: string[];
  readonly constraints?: string[];
}

export interface PlanStep {
  readonly id: string;
  readonly description: string;
  readonly files: string[];
  readonly type: 'create' | 'modify' | 'delete' | 'test';
}

export interface Plan {
  readonly taskId: string;
  readonly steps: PlanStep[];
  readonly rationale: string;
  readonly estimatedMinutes: number;
}

export interface CodeResult {
  readonly filePath: string;
  readonly content: string;
  readonly action: 'create' | 'modify';
  readonly description: string;
}

export interface TestResult {
  readonly testFile: string;
  readonly content: string;
  readonly testCount: number;
}

export interface OrchestratorResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly durationMs: number;
  readonly model: string;
}

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

export const TaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  context: z.string().optional(),
  files: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
});

export const PlanStepSchema = z.object({
  id: z.string(),
  description: z.string(),
  files: z.array(z.string()),
  type: z.enum(['create', 'modify', 'delete', 'test']),
});

export const PlanSchema = z.object({
  taskId: z.string(),
  steps: z.array(PlanStepSchema),
  rationale: z.string(),
  estimatedMinutes: z.number(),
});

/* ------------------------------------------------------------------ */
/* Base Orchestrator                                                   */
/* ------------------------------------------------------------------ */

abstract class BaseOrchestrator {
  protected readonly router: OllamaRouter;
  protected readonly taskType: TaskType;

  constructor(router: OllamaRouter, taskType: TaskType) {
    this.router = router;
    this.taskType = taskType;
  }

  protected async generate(
    prompt: string,
    opts: { temperature?: number; maxTokens?: number } = {},
  ): Promise<GenerateResult> {
    return this.router.generate(prompt, {
      task: this.taskType,
      ...opts,
    });
  }
}

/* ------------------------------------------------------------------ */
/* Planner Orchestrator                                                */
/* ------------------------------------------------------------------ */

export class PlannerOrchestrator extends BaseOrchestrator {
  constructor(router: OllamaRouter) {
    super(router, 'plan');
  }

  /**
   * Analyze a task and generate a step-by-step plan.
   */
  async plan(task: Task): Promise<OrchestratorResult<Plan>> {
    const start = Date.now();

    const prompt = this.buildPlanPrompt(task);
    const result = await this.generate(prompt, { maxTokens: 2048 });

    try {
      const plan = this.parsePlan(result.text, task.id);
      return {
        success: true,
        data: plan,
        durationMs: Date.now() - start,
        model: result.model,
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse plan: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        model: result.model,
      };
    }
  }

  private buildPlanPrompt(task: Task): string {
    const context = task.context ?? 'No additional context.';
    const files = task.files?.length
      ? `Related files: ${task.files.join(', ')}`
      : 'No related files specified.';
    const constraints = task.constraints?.length
      ? `Constraints:\n${task.constraints.map((c) => `- ${c}`).join('\n')}`
      : 'No special constraints.';

    return `You are a software architect. Analyze the following task and create a detailed implementation plan.

## Task
${task.description}

## Context
${context}

## ${files}

## ${constraints}

## Requirements
- Break the task into 3-7 concrete steps
- Each step should result in a specific file being created or modified
- Steps should be ordered by dependency (foundational first)
- Include a test step at the end
- Estimate total time in minutes

## Output Format (JSON)
{
  "taskId": "${task.id}",
  "steps": [
    {
      "id": "step-1",
      "description": "What this step does",
      "files": ["path/to/file.ts"],
      "type": "create|modify|delete|test"
    }
  ],
  "rationale": "Why this approach",
  "estimatedMinutes": 30
}

Respond ONLY with the JSON plan. No other text.`;
  }

  private parsePlan(text: string, taskId: string): Plan {
    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const steps = Array.isArray(parsed.steps)
      ? (parsed.steps as Record<string, unknown>[]).map((s, i) => ({
          id: String(s.id ?? `step-${i + 1}`),
          description: String(s.description ?? ''),
          files: Array.isArray(s.files) ? (s.files as string[]) : [],
          type: (['create', 'modify', 'delete', 'test'].includes(String(s.type))
            ? s.type
            : 'create') as PlanStep['type'],
        }))
      : [];

    return {
      taskId: parsed.taskId ? String(parsed.taskId) : taskId,
      steps,
      rationale: String(parsed.rationale ?? ''),
      estimatedMinutes: typeof parsed.estimatedMinutes === 'number' ? parsed.estimatedMinutes : 30,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Coder Orchestrator                                                  */
/* ------------------------------------------------------------------ */

export class CoderOrchestrator extends BaseOrchestrator {
  constructor(router: OllamaRouter) {
    super(router, 'code');
  }

  /**
   * Implement code for a single plan step.
   */
  async implement(
    step: PlanStep,
    context: { existingCode?: string; plan?: Plan } = {},
  ): Promise<OrchestratorResult<CodeResult[]>> {
    const start = Date.now();

    const prompt = this.buildCodePrompt(step, context);
    const result = await this.generate(prompt, { maxTokens: 4096 });

    try {
      const codeResults = this.parseCodeResults(result.text, step);
      return {
        success: true,
        data: codeResults,
        durationMs: Date.now() - start,
        model: result.model,
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse code: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        model: result.model,
      };
    }
  }

  private buildCodePrompt(step: PlanStep, context: { existingCode?: string; plan?: Plan }): string {
    const existing = context.existingCode
      ? `\n## Existing Code\n\`\`\`typescript\n${context.existingCode}\n\`\`\``
      : '';

    const planContext = context.plan
      ? `\n## Overall Plan\n${context.plan.steps.map((s) => `- ${s.description}`).join('\n')}`
      : '';

    return `You are an expert TypeScript developer. Implement the following step.

## Step
${step.description}

## Files to Create/Modify
${step.files.join('\n')}
${existing}
${planContext}

## Requirements
- Write clean, typed TypeScript code
- Include proper imports and exports
- Add JSDoc comments for public APIs
- Follow SOLID principles
- Handle errors appropriately
- Use Zod for runtime validation where needed

## Output Format
For each file, output:
\`\`\`typescript
// FILE: path/to/file.ts
// CONTENT:
[your code here]
\`\`\`

Respond with ONLY the code blocks. No other text.`;
  }

  private parseCodeResults(text: string, step: PlanStep): CodeResult[] {
    const results: CodeResult[] = [];
    const fileBlocks = text.matchAll(/\/\/ FILE: (.+?)\n\/\/ CONTENT:\n([\s\S]*?)(?=\n\/\/ FILE:|$)/g);

    for (const match of fileBlocks) {
      const filePath = match[1].trim();
      const content = match[2].trim();

      if (filePath && content) {
        results.push({
          filePath,
          content,
          action: step.type === 'create' ? 'create' : 'modify',
          description: step.description,
        });
      }
    }

    // If no structured blocks found, treat entire response as single file
    if (results.length === 0 && step.files.length > 0) {
      results.push({
        filePath: step.files[0],
        content: text.trim(),
        action: step.type === 'create' ? 'create' : 'modify',
        description: step.description,
      });
    }

    return results;
  }
}

/* ------------------------------------------------------------------ */
/* Verifier Orchestrator                                               */
/* ------------------------------------------------------------------ */

export class VerifierOrchestrator extends BaseOrchestrator {
  constructor(router: OllamaRouter) {
    super(router, 'test');
  }

  /**
   * Generate tests for implemented code.
   */
  async generateTests(
    codeResults: CodeResult[],
    context: { plan?: Plan } = {},
  ): Promise<OrchestratorResult<TestResult[]>> {
    const start = Date.now();

    const prompt = this.buildTestPrompt(codeResults, context);
    const result = await this.generate(prompt, { maxTokens: 3000 });

    try {
      const testResults = this.parseTestResults(result.text);
      return {
        success: true,
        data: testResults,
        durationMs: Date.now() - start,
        model: result.model,
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse tests: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        model: result.model,
      };
    }
  }

  /**
   * Validate code against requirements.
   */
  async validate(
    code: string,
    requirements: string,
  ): Promise<OrchestratorResult<{ valid: boolean; issues: string[] }>> {
    const start = Date.now();

    const prompt = `You are a code reviewer. Validate the following code against the requirements.

## Code
\`\`\`typescript
${code}
\`\`\`

## Requirements
${requirements}

## Output Format (JSON)
{
  "valid": true/false,
  "issues": ["issue 1", "issue 2"]
}

Respond ONLY with the JSON. No other text.`;

    const result = await this.generate(prompt, { maxTokens: 1024 });

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      const parsed = JSON.parse(jsonMatch[0]) as { valid?: boolean; issues?: string[] };
      return {
        success: true,
        data: {
          valid: Boolean(parsed.valid),
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        },
        durationMs: Date.now() - start,
        model: result.model,
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse validation: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        model: result.model,
      };
    }
  }

  private buildTestPrompt(codeResults: CodeResult[], _context: { plan?: Plan }): string {
    const codeSnippets = codeResults
      .map((r) => `// File: ${r.filePath}\n${r.content}`)
      .join('\n\n');

    return `You are an expert test writer. Generate comprehensive unit tests for the following code.

## Code to Test
\`\`\`typescript
${codeSnippets}
\`\`\`

## Requirements
- Use Vitest (describe/it/expect)
- Test happy paths and edge cases
- Mock external dependencies
- Include at least 3 tests per function
- Test error handling

## Output Format
For each test file, output:
\`\`\`typescript
// FILE: path/to/file.test.ts
// TEST_COUNT: N
[your test code here]
\`\`\`

Respond with ONLY the code blocks. No other text.`;
  }

  private parseTestResults(text: string): TestResult[] {
    const results: TestResult[] = [];
    const fileBlocks = text.matchAll(
      /\/\/ FILE: (.+?)\n\/\/ TEST_COUNT: (\d+)\n([\s\S]*?)(?=\n\/\/ FILE:|$)/g,
    );

    for (const match of fileBlocks) {
      const testFile = match[1].trim();
      const testCount = parseInt(match[2], 10);
      const content = match[3].trim();

      if (testFile && content) {
        results.push({
          testFile,
          content,
          testCount: isNaN(testCount) ? 1 : testCount,
        });
      }
    }

    return results;
  }
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

export function createPlanner(router: OllamaRouter): PlannerOrchestrator {
  return new PlannerOrchestrator(router);
}

export function createCoder(router: OllamaRouter): CoderOrchestrator {
  return new CoderOrchestrator(router);
}

export function createVerifier(router: OllamaRouter): VerifierOrchestrator {
  return new VerifierOrchestrator(router);
}
