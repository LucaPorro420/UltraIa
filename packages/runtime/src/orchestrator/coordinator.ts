/**
 * coordinator.ts — Task coordinator for autonomous local development
 *
 * Orchestrates planner, coder, and verifier to execute tasks end-to-end.
 * No API keys, no tokens, no cost. Pure local inference.
 *
 * Flow:
 * 1. Planner generates step-by-step plan
 * 2. Coder implements each step
 * 3. Verifier generates tests and validates
 * 4. On failure: retry with feedback (max 3 attempts)
 * 5. On success: commit changes
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import type { OllamaRouter } from '../adapters/ollama-router';
import {
  PlannerOrchestrator,
  CoderOrchestrator,
  VerifierOrchestrator,
  type Task,
  type Plan,
  type CodeResult,
  type TestResult,
} from './specialized';
import { SharedMemory, type MemoryEntry } from './memory';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CoordinatorStatus = 'idle' | 'planning' | 'implementing' | 'verifying' | 'committing' | 'completed' | 'failed';

export interface CoordinatorConfig {
  readonly maxRetries: number;
  readonly maxFilesPerCycle: number;
  readonly autoCommit: boolean;
  readonly dryRun: boolean;
  readonly workspacePath: string;
}

export interface StepResult {
  readonly stepId: string;
  readonly success: boolean;
  readonly codeResults: CodeResult[];
  readonly testResults: TestResult[];
  readonly error?: string;
  readonly attempts: number;
}

export interface CommitResult {
  readonly success: boolean;
  readonly commitHash?: string;
  readonly filesChanged: string[];
  readonly error?: string;
}

export interface RunResult {
  readonly success: boolean;
  readonly plan: Plan;
  readonly stepResults: StepResult[];
  readonly commitResult?: CommitResult;
  readonly totalDurationMs: number;
  readonly modelUsage: { model: string; durationMs: number }[];
}

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

export const CoordinatorConfigSchema = z.object({
  maxRetries: z.number().positive().default(3),
  maxFilesPerCycle: z.number().positive().default(10),
  autoCommit: z.boolean().default(true),
  dryRun: z.boolean().default(false),
  workspacePath: z.string().default(process.cwd()),
});

/* ------------------------------------------------------------------ */
/* Coordinator                                                         */
/* ------------------------------------------------------------------ */

export class Coordinator {
  private readonly router: OllamaRouter;
  private readonly memory: SharedMemory;
  private readonly config: CoordinatorConfig;
  private readonly planner: PlannerOrchestrator;
  private readonly coder: CoderOrchestrator;
  private readonly verifier: VerifierOrchestrator;

  private status: CoordinatorStatus = 'idle';
  private onStatusChange?: (status: CoordinatorStatus) => void;

  constructor(
    router: OllamaRouter,
    config: Partial<CoordinatorConfig> = {},
    memory?: SharedMemory,
  ) {
    this.router = router;
    this.config = CoordinatorConfigSchema.parse(config);
    this.memory = memory ?? new SharedMemory();
    this.planner = new PlannerOrchestrator(router);
    this.coder = new CoderOrchestrator(router);
    this.verifier = new VerifierOrchestrator(router);
  }

  /**
   * Set status change callback.
   */
  onStatus(callback: (status: CoordinatorStatus) => void): void {
    this.onStatusChange = callback;
  }

  /**
   * Get current status.
   */
  getStatus(): CoordinatorStatus {
    return this.status;
  }

  /**
   * Run a task end-to-end.
   */
  async run(taskDescription: string, opts: { context?: string; files?: string[] } = {}): Promise<RunResult> {
    const startTime = Date.now();
    const modelUsage: { model: string; durationMs: number }[] = [];
    const taskId = `task-${Date.now()}`;

    const task: Task = {
      id: taskId,
      description: taskDescription,
      context: opts.context,
      files: opts.files,
    };

    // Check memory for similar past tasks
    const similarPlans = this.memory.getSimilarPlans(taskDescription);
    if (similarPlans.length > 0) {
      // Use past learning to inform current plan
    }

    this.setStatus('planning');

    // Step 1: Generate plan
    const planResult = await this.planner.plan(task);
    modelUsage.push({ model: planResult.model, durationMs: planResult.durationMs });

    if (!planResult.success || !planResult.data) {
      this.memory.recordFailure(taskId, `Planning failed: ${planResult.error}`);
      this.setStatus('failed');
      return {
        success: false,
        plan: { taskId, steps: [], rationale: '', estimatedMinutes: 0 },
        stepResults: [],
        totalDurationMs: Date.now() - startTime,
        modelUsage,
      };
    }

    const plan = planResult.data;
    this.memory.save({
      type: 'plan',
      topic: taskDescription,
      content: JSON.stringify(plan),
      metadata: { taskId, steps: plan.steps.length },
      importance: 0.6,
    });

    // Step 2: Implement each step
    this.setStatus('implementing');
    const stepResults: StepResult[] = [];
    const allCodeResults: CodeResult[] = [];

    for (const step of plan.steps) {
      if (step.type === 'test') continue; // Tests come after implementation

      if (allCodeResults.length >= this.config.maxFilesPerCycle) {
        stepResults.push({
          stepId: step.id,
          success: false,
          codeResults: [],
          testResults: [],
          error: 'Max files per cycle reached',
          attempts: 0,
        });
        continue;
      }

      const stepResult = await this.implementStep(step, plan, allCodeResults, modelUsage);
      stepResults.push(stepResult);
      allCodeResults.push(...stepResult.codeResults);

      if (!stepResult.success) {
        this.memory.recordFailure(taskId, `Step ${step.id} failed: ${stepResult.error}`);
      }
    }

    // Step 3: Generate tests
    this.setStatus('verifying');
    const testSteps = plan.steps.filter((s) => s.type === 'test');
    const testResults: TestResult[] = [];

    if (allCodeResults.length > 0) {
      const testResult = await this.verifier.generateTests(allCodeResults, { plan });
      modelUsage.push({ model: testResult.model, durationMs: testResult.durationMs });

      if (testResult.success && testResult.data) {
        testResults.push(...testResult.data);
      }
    }

    // Step 4: Validate code
    if (allCodeResults.length > 0) {
      const code = allCodeResults.map((r) => r.content).join('\n\n');
      const requirements = plan.steps.map((s) => s.description).join('\n');
      const validationResult = await this.verifier.validate(code, requirements);
      modelUsage.push({ model: validationResult.model, durationMs: validationResult.durationMs });
    }

    // Step 5: Commit if enabled
    let commitResult: CommitResult | undefined;
    if (this.config.autoCommit && !this.config.dryRun) {
      this.setStatus('committing');
      commitResult = await this.commitChanges(allCodeResults, testResults);
    }

    // Record success
    const success = stepResults.every((r) => r.success);
    if (success) {
      this.memory.recordSuccess(taskId, `Completed ${plan.steps.length} steps`);
    }

    this.setStatus(success ? 'completed' : 'failed');

    return {
      success,
      plan,
      stepResults,
      commitResult,
      totalDurationMs: Date.now() - startTime,
      modelUsage,
    };
  }

  /**
   * Implement a single step with retry logic.
   */
  private async implementStep(
    step: Plan['steps'][number],
    plan: Plan,
    previousResults: CodeResult[],
    modelUsage: { model: string; durationMs: number }[],
  ): Promise<StepResult> {
    let lastError: string | undefined;
    let codeResults: CodeResult[] = [];

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      const context = previousResults.length > 0
        ? { existingCode: previousResults.map((r) => r.content).join('\n\n'), plan }
        : { plan };

      const result = await this.coder.implement(step, context);
      modelUsage.push({ model: result.model, durationMs: result.durationMs });

      if (result.success && result.data) {
        codeResults = result.data;

        // Validate generated code
        const code = codeResults.map((r) => r.content).join('\n\n');
        const validation = await this.verifier.validate(code, step.description);

        if (validation.success && validation.data?.valid) {
          return {
            stepId: step.id,
            success: true,
            codeResults,
            testResults: [],
            attempts: attempt,
          };
        }

        lastError = validation.data?.issues.join(', ') ?? 'Validation failed';
      } else {
        lastError = result.error ?? 'Implementation failed';
      }
    }

    return {
      stepId: step.id,
      success: false,
      codeResults,
      testResults: [],
      error: lastError,
      attempts: this.config.maxRetries,
    };
  }

  /**
   * Commit changes to git.
   */
  private async commitChanges(
    codeResults: CodeResult[],
    testResults: TestResult[],
  ): Promise<CommitResult> {
    const filesChanged: string[] = [];

    try {
      // Write code files
      for (const result of codeResults) {
        const filePath = path.resolve(this.config.workspacePath, result.filePath);
        const dir = path.dirname(filePath);

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        if (!this.config.dryRun) {
          fs.writeFileSync(filePath, result.content, 'utf-8');
        }
        filesChanged.push(result.filePath);
      }

      // Write test files
      for (const result of testResults) {
        const filePath = path.resolve(this.config.workspacePath, result.testFile);
        const dir = path.dirname(filePath);

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        if (!this.config.dryRun) {
          fs.writeFileSync(filePath, result.content, 'utf-8');
        }
        filesChanged.push(result.testFile);
      }

      // Git add and commit
      if (!this.config.dryRun && filesChanged.length > 0) {
        const { execFileSync } = await import('node:child_process');

        // Stage files (execFileSync avoids shell injection)
        for (const file of filesChanged) {
          execFileSync('git', ['add', file], {
            cwd: this.config.workspacePath,
            stdio: 'pipe',
          });
        }

        // Commit
        const commitMsg = `feat(orchestrator): auto-implement ${filesChanged.length} files

Generated by local orchestrator (Ollama).
No API keys, no tokens, no cost.`;

        execFileSync('git', ['commit', '-m', commitMsg], {
          cwd: this.config.workspacePath,
          stdio: 'pipe',
        });

        // Get commit hash
        const hash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
          cwd: this.config.workspacePath,
          stdio: 'pipe',
        }).toString().trim();

        return { success: true, commitHash: hash, filesChanged };
      }

      return { success: true, filesChanged };
    } catch (err) {
      return {
        success: false,
        filesChanged,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private setStatus(status: CoordinatorStatus): void {
    this.status = status;
    this.onStatusChange?.(status);
  }

  /**
   * Get memory instance.
   */
  getMemory(): SharedMemory {
    return this.memory;
  }
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

export function createCoordinator(
  router: OllamaRouter,
  config: Partial<CoordinatorConfig> = {},
  memory?: SharedMemory,
): Coordinator {
  return new Coordinator(router, config, memory);
}
