//! Capability `batch-executor` — parallel fan-out/fan-in task execution.
// Pure, deterministic, keyless. Plans parallel execution of independent tasks,
// tracks results, handles partial failures. Based on Google ADK ParallelAgent
// pattern and Fan-Out/Fan-In orchestration.
import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';

export interface BatchTask {
  id: string;
  name: string;
  description: string;
  /** Task inputs as key-value pairs. */
  inputs?: Record<string, string>;
  /** Estimated duration in ms. */
  estimatedMs: number;
  /** Agent or capability to execute. */
  agent?: string;
  /** Dependencies: task IDs that must complete first. */
  dependsOn: string[];
  status: TaskStatus;
  /** Result after completion. */
  result?: string;
  /** Error message if failed. */
  error?: string;
  /** Actual duration in ms. */
  actualMs?: number;
  /** Max retry attempts (default 0 = no retry). */
  maxRetries: number;
  /** Current retry count. */
  retryCount: number;
  /** Timeout in ms (0 = no timeout). */
  timeoutMs: number;
  /** Priority (higher = runs first in wave). */
  priority: number;
}

export interface BatchPlan {
  id: string;
  name: string;
  tasks: BatchTask[];
  /** Execution waves: groups of tasks that can run in parallel. */
  waves: string[][];
  totalEstimatedMs: number;
  criticalPathMs: number;
  createdAt: string;
}

export interface BatchStats {
  totalTasks: number;
  completed: number;
  failed: number;
  skipped: number;
  pending: number;
  totalMs: number;
  parallelEfficiency: number; // 0-1, how much time was saved by parallelism
}

// ── Planning ─────────────────────────────────────────────────────────────────

/** Input type for planBatch — required fields are name; everything else optional. */
export interface BatchTaskInput {
  id?: string;
  name: string;
  description?: string | undefined;
  inputs?: Record<string, string>;
  estimatedMs?: number;
  agent?: string;
  dependsOn?: string[];
  maxRetries?: number;
  timeoutMs?: number;
  priority?: number;
}

let _idCounter = 0;

export function planBatch(name: string, tasks: BatchTaskInput[]): BatchPlan {
  const id = `batch-${++_idCounter}`;
  const fullTasks: BatchTask[] = tasks.map((t, i) => ({
    id: t.id || `task-${i}`,
    name: t.name,
    description: t.description ?? '',
    inputs: t.inputs,
    estimatedMs: t.estimatedMs ?? 1000,
    agent: t.agent,
    dependsOn: t.dependsOn ?? [],
    status: 'pending' as TaskStatus,
    maxRetries: t.maxRetries ?? 0,
    retryCount: 0,
    timeoutMs: t.timeoutMs ?? 0,
    priority: t.priority ?? 0,
  }));

  // Topological sort into waves (Kahn's algorithm)
  const waves = computeWaves(fullTasks);

  // Critical path: longest chain of dependencies
  const criticalPathMs = computeCriticalPath(fullTasks);

  // Total estimated time if all sequential
  const totalEstimatedMs = fullTasks.reduce((sum, t) => sum + t.estimatedMs, 0);

  return {
    id,
    name,
    tasks: fullTasks,
    waves,
    totalEstimatedMs,
    criticalPathMs,
    createdAt: new Date().toISOString(),
  };
}

function computeWaves(tasks: BatchTask[]): string[][] {
  const waves: string[][] = [];
  const completed = new Set<string>();
  const remaining = [...tasks];

  while (remaining.length > 0) {
    const wave: string[] = [];
    for (let i = remaining.length - 1; i >= 0; i--) {
      const task = remaining[i];
      if (task.dependsOn.every(d => completed.has(d))) {
        wave.push(task.id);
        remaining.splice(i, 1);
      }
    }
    if (wave.length === 0) {
      // Circular dependency: add remaining as a single wave
      waves.push(remaining.map(t => t.id));
      break;
    }
    // Sort wave by priority (higher first)
    wave.sort((a, b) => {
      const ta = tasks.find(t => t.id === a);
      const tb = tasks.find(t => t.id === b);
      return (tb?.priority ?? 0) - (ta?.priority ?? 0);
    });
    waves.push(wave);
    for (const id of wave) completed.add(id);
  }
  return waves;
}

function computeCriticalPath(tasks: BatchTask[]): number {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const memo = new Map<string, number>();

  function longestPath(taskId: string): number {
    if (memo.has(taskId)) return memo.get(taskId)!;
    const task = taskMap.get(taskId);
    if (!task) return 0;
    let maxDep = 0;
    for (const dep of task.dependsOn) {
      maxDep = Math.max(maxDep, longestPath(dep));
    }
    const total = maxDep + task.estimatedMs;
    memo.set(taskId, total);
    return total;
  }

  let maxPath = 0;
  for (const task of tasks) {
    maxPath = Math.max(maxPath, longestPath(task.id));
  }
  return maxPath;
}

// ── Execution Tracking ───────────────────────────────────────────────────────

export function markTaskComplete(plan: BatchPlan, taskId: string, result: string, actualMs?: number): BatchPlan {
  const task = plan.tasks.find(t => t.id === taskId);
  if (!task) return plan;
  task.status = 'completed';
  task.result = result;
  task.actualMs = actualMs;
  return plan;
}

export function markTaskFailed(plan: BatchPlan, taskId: string, error: string): BatchPlan {
  const task = plan.tasks.find(t => t.id === taskId);
  if (!task) return plan;
  task.error = error;
  if (task.retryCount < task.maxRetries) {
    task.retryCount++;
    task.status = 'retrying';
    task.error = `[retry ${task.retryCount}/${task.maxRetries}] ${error}`;
  } else {
    task.status = 'failed';
  }
  return plan;
}

export function markTaskSkipped(plan: BatchPlan, taskId: string): BatchPlan {
  const task = plan.tasks.find(t => t.id === taskId);
  if (!task) return plan;
  task.status = 'skipped';
  return plan;
}

export function getReadyTasks(plan: BatchPlan): BatchTask[] {
  return plan.tasks.filter(t => {
    if (t.status !== 'pending' && t.status !== 'retrying') return false;
    return t.dependsOn.every(d => {
      const dep = plan.tasks.find(tt => tt.id === d);
      return dep && dep.status === 'completed';
    });
  });
}

export function getTimedOutTasks(plan: BatchPlan, nowMs: number): BatchTask[] {
  return plan.tasks.filter(t => {
    if (t.status !== 'running') return false;
    if (t.timeoutMs <= 0) return false;
    if (!t.actualMs) return false;
    return nowMs > t.timeoutMs;
  });
}

export function exportPlan(plan: BatchPlan): string {
  return JSON.stringify(plan, null, 2);
}

export function importPlan(json: string): BatchPlan | null {
  try {
    const plan = JSON.parse(json) as BatchPlan;
    if (!plan.id || !plan.tasks || !plan.waves) return null;
    return plan;
  } catch {
    return null;
  }
}

export function getBatchStats(plan: BatchPlan): BatchStats {
  const completed = plan.tasks.filter(t => t.status === 'completed').length;
  const failed = plan.tasks.filter(t => t.status === 'failed').length;
  const skipped = plan.tasks.filter(t => t.status === 'skipped').length;
  const pending = plan.tasks.filter(t => t.status === 'pending').length;
  const totalMs = plan.tasks
    .filter(t => t.actualMs != null)
    .reduce((sum, t) => sum + t.actualMs!, 0);
  const seqMs = plan.totalEstimatedMs;
  const parallelEfficiency = seqMs > 0 ? Math.max(0, 1 - plan.criticalPathMs / seqMs) : 0;

  return {
    totalTasks: plan.tasks.length,
    completed,
    failed,
    skipped,
    pending,
    totalMs,
    parallelEfficiency,
  };
}

// ── Tool Schema ──────────────────────────────────────────────────────────────

export const batchExecutorSchema = z.object({
  action: z.enum(['plan', 'ready', 'complete', 'fail', 'skip', 'stats', 'reset', 'export', 'import']),
  planId: z.string().optional(),
  planName: z.string().optional().describe('Name for new batch plan'),
  tasks: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().default(''),
    inputs: z.record(z.string()).optional(),
    estimatedMs: z.number().default(1000),
    agent: z.string().optional(),
    dependsOn: z.array(z.string()).default([]),
    maxRetries: z.number().default(0),
    timeoutMs: z.number().default(0),
    priority: z.number().default(0),
  })).optional().describe('Tasks for plan action'),
  taskId: z.string().optional().describe('Task ID for complete/fail/skip'),
  result: z.string().optional().describe('Result for complete action'),
  error: z.string().optional().describe('Error for fail action'),
  actualMs: z.number().optional().describe('Actual duration for complete action'),
  planJson: z.string().optional().describe('JSON for import action'),
});

export type BatchExecutorInput = z.input<typeof batchExecutorSchema>;

// ── Plans Store ──────────────────────────────────────────────────────────────

const _plans = new Map<string, BatchPlan>();

export async function batchExecutorTool(input: BatchExecutorInput): Promise<unknown> {
  switch (input.action) {
    case 'plan': {
      if (!input.tasks?.length || !input.planName) return { error: 'planName and tasks required' };
      const plan = planBatch(input.planName, input.tasks);
      _plans.set(plan.id, plan);
      return plan;
    }
    case 'ready': {
      if (!input.planId) return { error: 'planId required' };
      const plan = _plans.get(input.planId);
      if (!plan) return { error: 'plan not found' };
      return getReadyTasks(plan);
    }
    case 'complete': {
      if (!input.planId || !input.taskId) return { error: 'planId and taskId required' };
      const plan = _plans.get(input.planId);
      if (!plan) return { error: 'plan not found' };
      markTaskComplete(plan, input.taskId, input.result || '', input.actualMs);
      return getBatchStats(plan);
    }
    case 'fail': {
      if (!input.planId || !input.taskId) return { error: 'planId and taskId required' };
      const plan = _plans.get(input.planId);
      if (!plan) return { error: 'plan not found' };
      markTaskFailed(plan, input.taskId, input.error || 'unknown error');
      return getBatchStats(plan);
    }
    case 'skip': {
      if (!input.planId || !input.taskId) return { error: 'planId and taskId required' };
      const plan = _plans.get(input.planId);
      if (!plan) return { error: 'plan not found' };
      markTaskSkipped(plan, input.taskId);
      return getBatchStats(plan);
    }
    case 'stats': {
      if (!input.planId) return { error: 'planId required' };
      const plan = _plans.get(input.planId);
      if (!plan) return { error: 'plan not found' };
      return getBatchStats(plan);
    }
    case 'reset': {
      _plans.clear();
      return { ok: true, message: 'All plans cleared' };
    }
    case 'export': {
      if (!input.planId) return { error: 'planId required' };
      const plan = _plans.get(input.planId);
      if (!plan) return { error: 'plan not found' };
      return { json: exportPlan(plan) };
    }
    case 'import': {
      if (!input.planJson) return { error: 'planJson required' };
      const plan = importPlan(input.planJson);
      if (!plan) return { error: 'invalid plan JSON' };
      _plans.set(plan.id, plan);
      return plan;
    }
  }
}
