import { randomBytes } from 'node:crypto';
import type { Task, TaskLogEntry, TaskPriority, TaskStatus } from './types';
import type { UltraEventBus } from './event-bus';

export interface TaskManagerOptions {
  /** Max concurrent RUNNING tasks. Default 4. */
  concurrency?: number;
  /** Handler called when a task fails (feeds the learning loop / recovery). */
  onFailure?: (task: Task, error: unknown) => void;
}

export interface TaskSubmitOptions {
  priority?: TaskPriority;
  module?: string;
}

function newId(): string {
  return randomBytes(8).toString('hex');
}

function now(): string {
  return new Date().toISOString();
}

interface SlotWait {
  priority: TaskPriority;
  resolve: () => void;
}

/**
 * Central task system. Every complex operation becomes a task with
 * QUEUED/RUNNING/PAUSED/COMPLETED/FAILED/CANCELLED states, priority-aware
 * scheduling (highest priority first), cooperative cancellation via
 * AbortSignal and a full log. Pause/resume are cooperative: the body decides
 * how to react to status changes.
 */
export class TaskManager {
  private readonly tasks = new Map<string, Task>();
  private readonly concurrency: number;
  private running = 0;
  private readonly queue: SlotWait[] = [];
  private readonly onFailure?: (task: Task, error: unknown) => void;
  private readonly executing = new Set<string>();
  private readonly submitted = new Set<string>();
  private readonly controllers = new Map<string, AbortController>();

  constructor(private readonly events: UltraEventBus, options: TaskManagerOptions = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? 4);
    this.onFailure = options.onFailure;
  }

  create<TResult = unknown>(type: string, opts: TaskSubmitOptions = {}): Task<TResult> {
    const task: Task<TResult> = {
      id: newId(),
      type,
      module: opts.module,
      status: 'QUEUED',
      priority: opts.priority ?? 3,
      progress: 0,
      attempt: 0,
      logs: [],
      createdAt: now(),
    };
    this.tasks.set(task.id, task as Task);
    this.events.emit('task.created', { id: task.id, type: task.type });
    return task;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  list(filter?: { status?: TaskStatus; module?: string; type?: string }): Task[] {
    let out = [...this.tasks.values()];
    if (filter?.status) out = out.filter((t) => t.status === filter.status);
    if (filter?.module) out = out.filter((t) => t.module === filter.module);
    if (filter?.type) out = out.filter((t) => t.type === filter.type);
    return out.sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));
  }

  counts(): { queued: number; running: number; failed: number; completed: number } {
    return {
      queued: this.list({ status: 'QUEUED' }).length,
      running: this.list({ status: 'RUNNING' }).length,
      failed: this.list({ status: 'FAILED' }).length,
      completed: this.list({ status: 'COMPLETED' }).length,
    };
  }

  /** Runs a task body. Refuses unless the task is QUEUED. */
  async submit<TResult = unknown>(taskOrId: Task | string, body: (signal: AbortSignal) => Promise<TResult>): Promise<TResult> {
    const task = typeof taskOrId === 'string' ? this.tasks.get(taskOrId) : taskOrId;
    if (!task) throw new Error(`task not found: ${String(taskOrId)}`);
    if (task.status !== 'QUEUED') {
      throw new Error(`task ${task.id} is ${task.status}, not QUEUED`);
    }
    const controller = new AbortController();
    this.controllers.set(task.id, controller);
    const signal = controller.signal;
    const run = async (): Promise<TResult> => {
      await this.waitForSlot(task.priority);
      try {
        if (this.executing.has(task.id)) throw new Error(`task ${task.id} already executing`);
        if (task.status === 'CANCELLED') throw new Error(`task ${task.id} cancelled`);
        this.executing.add(task.id);
        task.status = 'RUNNING';
        task.attempt += 1;
        task.startedAt = now();
        this.events.emit('task.started', { id: task.id, type: task.type, attempt: task.attempt });
        const result = await body(signal);
        task.status = 'COMPLETED';
        task.progress = 1;
        task.result = result;
        task.completedAt = now();
        this.log(task.id, 'completed');
        this.events.emit('task.completed', { id: task.id, type: task.type, result });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (task.status !== 'CANCELLED') {
          task.status = 'FAILED';
          task.error = message;
          task.completedAt = now();
          this.log(task.id, `failed: ${message}`);
          this.events.emit('task.failed', { id: task.id, type: task.type, error: message });
          this.onFailure?.(task, err);
        }
        throw err;
      } finally {
        this.executing.delete(task.id);
        this.submitted.delete(task.id);
        this.controllers.delete(task.id);
        this.running -= 1;
        void this.ensurePump();
      }
    };
    if (this.submitted.has(task.id)) throw new Error(`task ${task.id} already submitted`);
    this.submitted.add(task.id);
    const runPromise = run();
    void this.ensurePump();
    return runPromise;
  }

  /** Pops the highest-priority waiter. */
  private nextWaiter(): SlotWait | undefined {
    let bestIndex = -1;
    let bestPriority = -1;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority > bestPriority) {
        bestPriority = this.queue[i].priority;
        bestIndex = i;
      }
    }
    if (bestIndex === -1) return undefined;
    const [waiter] = this.queue.splice(bestIndex, 1);
    return waiter;
  }

  private async ensurePump(): Promise<void> {
    while (this.running < this.concurrency) {
      const waiter = this.nextWaiter();
      if (!waiter) break;
      this.running += 1;
      queueMicrotask(waiter.resolve);
    }
  }

  private async waitForSlot(priority: TaskPriority): Promise<void> {
    return new Promise<void>((resolve) => {
      this.queue.push({ priority, resolve });
    });
  }

  pause(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'RUNNING') return false;
    task.status = 'PAUSED';
    this.events.emit('task.paused', { id: task.id });
    return true;
  }

  resume(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'PAUSED') return false;
    task.status = 'RUNNING';
    this.events.emit('task.resumed', { id: task.id });
    return true;
  }

  /** Cooperative cancellation: aborts the task signal and flags CANCELLED. */
  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
    task.status = 'CANCELLED';
    task.completedAt = now();
    this.controllers.get(id)?.abort();
    this.events.emit('task.cancelled', { id: task.id });
    return true;
  }

  /** Re-queues a FAILED task (attempt counter keeps growing). */
  retry(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'FAILED') return false;
    task.status = 'QUEUED';
    task.error = undefined;
    task.progress = 0;
    this.events.emit('task.queued', { id: task.id });
    return true;
  }

  updateProgress(id: string, progress: number): boolean {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'RUNNING') return false;
    task.progress = Math.min(1, Math.max(0, progress));
    this.events.emit('task.progress', { id: task.id, progress: task.progress });
    return true;
  }

  log(id: string, message: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.logs.push({ at: now(), message });
    this.events.emit('task.log', { id: task.id, message });
  }

  remove(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || task.status === 'RUNNING') return false;
    return this.tasks.delete(id);
  }

  clearFinished(): number {
    let removed = 0;
    for (const [id, task] of this.tasks) {
      if (task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED') {
        this.tasks.delete(id);
        removed += 1;
      }
    }
    return removed;
  }
}